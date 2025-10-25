import { test, expect, describe, beforeEach } from "vitest";
import { DayPlannerSettings, DayPlannerMode, OldSettings, migrateToActivePlan } from "../src/settings";
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
});
