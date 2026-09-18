import { describe, expect, test } from "vitest";
import { COLORS } from "../src/constants";
import type { TimelineColorScheme, TimelineColorSettings } from "../src/settings";
import {
    createTimelineColorSignature,
    createTimelineRenderColors,
    createTimelineRenderColorSchemes,
    timelineColorsNeedUpdate,
} from "../src/timeline-colors";

const customScheme: TimelineColorScheme = {
    lineColor: "#111111",
    nowLineColor: "#121212",
    nowLineTextColor: "#131313",
    timelineColorBegin: "#222222",
    timelineColorEnd: "#333333",
    timelineHoverColorBegin: "#444444",
    timelineHoverColorEnd: "#555555",
    timelineTextColor: "#666666",
};

describe("Timeline color data", () => {
    test("builds independent render values for a scheme", () => {
        const colors = createTimelineRenderColors(customScheme, 3);

        expect(colors.colors).toHaveLength(3);
        expect(colors.hoverColors).toHaveLength(3);
        expect(colors.lineColor).toBe(customScheme.lineColor);
        expect(colors.textColor).toBe(customScheme.timelineTextColor);
        expect(colors.nowLineColor).toBe(customScheme.nowLineColor);
        expect(colors.nowLineTextColor).toBe(customScheme.nowLineTextColor);
    });

    test("falls back to default colors for empty scheme values", () => {
        const colors = createTimelineRenderColors(
            {
                lineColor: "",
                nowLineColor: "",
                nowLineTextColor: "",
                timelineColorBegin: "",
                timelineColorEnd: "",
                timelineHoverColorBegin: "",
                timelineHoverColorEnd: "",
                timelineTextColor: "",
            },
            1,
        );

        expect(colors.lineColor).toBe(COLORS.lineColor);
        expect(colors.textColor).toBe(COLORS.timelineTextColor);
        expect(colors.nowLineColor).toBe(COLORS.nowLineColor);
        expect(colors.nowLineTextColor).toBe(COLORS.nowLineTextColor);
        expect(colors.colors).toHaveLength(1);
        expect(colors.hoverColors).toHaveLength(1);
    });

    test("regenerates derived values when colors change at the same item count", () => {
        const settings: TimelineColorSettings = {
            light: { ...customScheme },
            dark: { ...customScheme, lineColor: "#777777" },
        };
        const initial = createTimelineRenderColorSchemes(settings, 3);
        const initialSignature = createTimelineColorSignature(settings);

        settings.light.timelineColorBegin = "#aaaaaa";
        settings.light.timelineHoverColorEnd = "#bbbbbb";
        settings.light.lineColor = "#cccccc";
        settings.light.timelineTextColor = "#dddddd";

        const updated = createTimelineRenderColorSchemes(settings, 3);

        expect(createTimelineColorSignature(settings)).not.toBe(initialSignature);
        expect(updated.light.colors).not.toEqual(initial.light.colors);
        expect(updated.light.hoverColors).not.toEqual(initial.light.hoverColors);
        expect(updated.light.lineColor).toBe("#cccccc");
        expect(updated.light.textColor).toBe("#dddddd");
        expect(updated.dark).toEqual(initial.dark);
    });

    test("invalidates render colors when the scheme signature changes", () => {
        const settings: TimelineColorSettings = {
            light: { ...customScheme },
            dark: { ...customScheme },
        };
        const renderColors = createTimelineRenderColorSchemes(settings, 3);
        const signature = createTimelineColorSignature(settings);

        expect(
            timelineColorsNeedUpdate(
                renderColors,
                signature,
                signature,
                2,
            ),
        ).toBe(true);
        expect(
            timelineColorsNeedUpdate(renderColors, signature, signature, 3),
        ).toBe(false);
        expect(
            timelineColorsNeedUpdate(renderColors, signature, `${signature}!`, 3),
        ).toBe(true);
    });
});
