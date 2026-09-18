import { test, expect, describe, beforeEach } from "vitest";
import { COLORS } from "../src/constants";
import {
    DayPlannerSettings,
    DayPlannerMode,
    OldSettings,
    copyTimelineColorScheme,
    migrateSettings,
    migrateToActivePlan,
    migrateTimelineColors,
    resetTimelineColorSchemes,
    setTimelineColor,
    TIMELINE_COLOR_KEYS,
} from "../src/settings";
import Parser from "../src/parser";
import { mockDate } from "./mocks/date";

describe("Day Planner Settings defaults", () => {
    let settings: DayPlannerSettings = undefined;

    beforeEach(() => {
        settings = new DayPlannerSettings();
    });

    test("Custom Folder", () => {
        expect(settings.customFolder).toBe('Day Planners');
    });

    test("Mode", () => {
        expect(settings.mode).toBe(DayPlannerMode.File);
    });

    test("Timeline color schemes have independent eight-value shapes", () => {
        expect(settings.timelineColors.light).toEqual({
            lineColor: COLORS.lineColor,
            nowLineColor: COLORS.nowLineColor,
            nowLineTextColor: COLORS.nowLineTextColor,
            timelineColorBegin: COLORS.timelineColorBegin,
            timelineColorEnd: COLORS.timelineColorEnd,
            timelineHoverColorBegin: COLORS.timelineHoverColorBegin,
            timelineHoverColorEnd: COLORS.timelineHoverColorEnd,
            timelineTextColor: COLORS.timelineTextColor,
        });
        expect(settings.timelineColors.dark).toEqual(
            settings.timelineColors.light,
        );

        settings.timelineColors.light.timelineTextColor = "#123456";
        expect(settings.timelineColors.dark.timelineTextColor).toBe(
            COLORS.timelineTextColor,
        );
    });

    test("Update BREAK settings should work fine", () => {
        settings.breakLabel = '*BREAK.*';
        settings.endLabel = '[(END)]';

        const parser = new Parser({ current: () => settings });

        const breakItem = parser.parseLine(0, `- [ ] 13:00 ${settings.breakLabel}`);
        const endItem = parser.parseLine(0, `- [ ] 13:00 ${settings.endLabel}`);

        expect(breakItem.isBreak).toBeTruthy();
        expect(endItem.isEnd).toBeTruthy();
    });

    test("migrateToActivePlan converts matching date", () => {
        const oldSettings = new OldSettings();
        oldSettings.newDayStartsAt = 4;

        const today = new Date("2025-10-25T10:00:00Z");
        const unmock = mockDate(today);

        oldSettings.notesToDates = [
            {
                notePath: "chronicles/2025/2025-10-25.md",
                date: today.toDateString(),
            },
        ];

        const result = migrateToActivePlan(oldSettings);
        unmock();

        expect(result).toBe(true);
        expect(oldSettings.notesToDates).toBeUndefined();
        expect(oldSettings.activePlan.notePath).toBe(
            "chronicles/2025/2025-10-25.md",
        );
        const anchor = new Date(oldSettings.activePlan.anchorDate);
        expect(anchor.getHours()).toBe(4);
        expect(anchor.getDate()).toBe(25);
    });

    test("migrateToActivePlan clears notes without match", () => {
        const oldSettings = new OldSettings();
        const today = new Date("2025-10-25T10:00:00Z");
        const unmock = mockDate(today);

        oldSettings.notesToDates = [
            {
                notePath: "chronicles/2025/2025-10-24.md",
                date: new Date("2025-10-24T00:00:00Z").toDateString(),
            },
        ];

        const result = migrateToActivePlan(oldSettings);
        unmock();

        expect(result).toBe(true);
        expect(oldSettings.notesToDates).toBeUndefined();
        expect(oldSettings.activePlan.notePath).toBeUndefined();
        expect(oldSettings.activePlan.anchorDate).toBeUndefined();
    });

    test("migrateToActivePlan no legacy data", () => {
        const oldSettings = new OldSettings();
        oldSettings.notesToDates = [];

        const result = migrateToActivePlan(oldSettings);

        // notesToDates is always removed, even when empty
        expect(result).toBe(true);
        expect(oldSettings.notesToDates).toBeUndefined();
        expect(oldSettings.activePlan).toEqual({});
    });

    test("migrateSettings runs active-plan and Timeline color migrations together", () => {
        const oldSettings = new OldSettings();
        oldSettings.notesToDates = [];
        oldSettings.timelineColorBegin = "#123456";

        expect(migrateSettings(oldSettings, COLORS)).toBe(true);
        expect(oldSettings.notesToDates).toBeUndefined();
        expect(oldSettings.timelineColors.light.timelineColorBegin).toBe(
            "#123456",
        );
        expect(oldSettings.timelineColors.dark.timelineColorBegin).toBe(
            "#123456",
        );
    });

    test("migrateTimelineColors copies legacy values to both schemes", () => {
        const settings = new DayPlannerSettings();
        settings.timelineColorBegin = "#123456";
        settings.timelineHoverColorEnd = "";

        expect(migrateTimelineColors(settings, COLORS)).toBe(true);
        expect(settings.timelineColors.light.timelineColorBegin).toBe("#123456");
        expect(settings.timelineColors.dark.timelineColorBegin).toBe("#123456");
        expect(settings.timelineColors.light.timelineHoverColorEnd).toBe(
            COLORS.timelineHoverColorEnd,
        );
        expect(settings.timelineColors.dark.timelineTextColor).toBe(
            COLORS.timelineTextColor,
        );
        expect(settings.timelineColorBegin).toBeUndefined();
        expect(settings.timelineHoverColorEnd).toBeUndefined();
    });

    test("migrateTimelineColors is idempotent after migration", () => {
        const settings = new DayPlannerSettings();
        settings.timelineColors.light.lineColor = "";

        expect(migrateTimelineColors(settings, COLORS)).toBe(false);
        expect(settings.timelineColors.light.lineColor).toBe("");
    });

    test("migrateTimelineColors is idempotent after legacy migration", () => {
        const settings = new DayPlannerSettings();
        settings.timelineColorBegin = "#123456";

        expect(migrateTimelineColors(settings, COLORS)).toBe(true);
        expect(migrateTimelineColors(settings, COLORS)).toBe(false);
    });

    test("setTimelineColor updates both schemes", () => {
        setTimelineColor(settings, "lineColor", "#123456");

        expect(settings.timelineColors.light.lineColor).toBe("#123456");
        expect(settings.timelineColors.dark.lineColor).toBe("#123456");
        expect(settings.lineColor).toBeUndefined();
    });

    test("Timeline color controls cover all eight scheme values", () => {
        expect(TIMELINE_COLOR_KEYS).toEqual([
            "lineColor",
            "nowLineColor",
            "nowLineTextColor",
            "timelineColorBegin",
            "timelineColorEnd",
            "timelineHoverColorBegin",
            "timelineHoverColorEnd",
            "timelineTextColor",
        ]);
    });

    test("resetTimelineColorSchemes restores both schemes", () => {
        settings.timelineColors.light.timelineTextColor = "#123456";
        settings.timelineColors.dark.timelineTextColor = "#654321";
        settings.timelineColors.light.nowLineColor = "#123456";
        settings.timelineColors.dark.nowLineTextColor = "#654321";

        resetTimelineColorSchemes(settings, COLORS);

        expect(settings.timelineColors.light.timelineTextColor).toBe(
            COLORS.timelineTextColor,
        );
        expect(settings.timelineColors.dark.timelineTextColor).toBe(
            COLORS.timelineTextColor,
        );
        expect(settings.timelineColors.light.nowLineColor).toBe(
            COLORS.nowLineColor,
        );
        expect(settings.timelineColors.dark.nowLineTextColor).toBe(
            COLORS.nowLineTextColor,
        );
    });

    test("copyTimelineColorScheme copies all light values to dark", () => {
        settings.timelineColors.light = {
            lineColor: "#111111",
            nowLineColor: "#121212",
            nowLineTextColor: "#131313",
            timelineColorBegin: "#222222",
            timelineColorEnd: "#333333",
            timelineHoverColorBegin: "#444444",
            timelineHoverColorEnd: "#555555",
            timelineTextColor: "#666666",
        };
        const originalLight = { ...settings.timelineColors.light };

        copyTimelineColorScheme(settings);

        expect(settings.timelineColors.light).toEqual(originalLight);
        expect(settings.timelineColors.dark).toEqual(originalLight);
    });

    test("copyTimelineColorScheme fills defaults for older partial schemes", () => {
        const partialScheme = settings.timelineColors.light as Partial<
            typeof settings.timelineColors.light
        >;
        delete partialScheme.nowLineColor;
        delete partialScheme.nowLineTextColor;

        copyTimelineColorScheme(settings);

        expect(settings.timelineColors.dark.nowLineColor).toBe(
            COLORS.nowLineColor,
        );
        expect(settings.timelineColors.dark.nowLineTextColor).toBe(
            COLORS.nowLineTextColor,
        );
    });
});
