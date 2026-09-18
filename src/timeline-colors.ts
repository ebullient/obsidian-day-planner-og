import chroma from "chroma-js";
import { COLORS } from "./constants";
import {
    TIMELINE_COLOR_KEYS,
    type TimelineColorScheme,
    type TimelineColorSettings,
} from "./settings";
import type {
    TimelineRenderColorSchemes,
    TimelineRenderColors,
} from "./timeline-store";

export function createTimelineRenderColors(
    settings: TimelineColorScheme,
    itemCount: number,
): TimelineRenderColors {
    const colorFrom = settings.timelineColorBegin || COLORS.timelineColorBegin;
    const colorTo = settings.timelineColorEnd || COLORS.timelineColorEnd;
    const hoverFrom =
        settings.timelineHoverColorBegin || COLORS.timelineHoverColorBegin;
    const hoverTo =
        settings.timelineHoverColorEnd || COLORS.timelineHoverColorEnd;

    return {
        colors: chroma
            .scale([colorFrom, colorTo])
            .mode("lch")
            .colors(itemCount, "hex"),
        hoverColors: chroma
            .scale([hoverFrom, hoverTo])
            .mode("lch")
            .colors(itemCount, "hex"),
        lineColor: settings.lineColor || COLORS.lineColor,
        nowLineColor: settings.nowLineColor || COLORS.nowLineColor,
        nowLineTextColor: settings.nowLineTextColor || COLORS.nowLineTextColor,
        textColor: settings.timelineTextColor || COLORS.timelineTextColor,
    };
}

export function createTimelineRenderColorSchemes(
    settings: TimelineColorSettings,
    itemCount: number,
): TimelineRenderColorSchemes {
    return {
        light: createTimelineRenderColors(settings.light, itemCount),
        dark: createTimelineRenderColors(settings.dark, itemCount),
    };
}

export function createTimelineColorSignature(
    settings: TimelineColorSettings,
): string {
    return [settings.light, settings.dark]
        .flatMap((scheme) =>
            TIMELINE_COLOR_KEYS.map((key) => `${key}:${scheme[key]}`),
        )
        .join("|");
}

export function timelineColorsNeedUpdate(
    renderColors: TimelineRenderColorSchemes | undefined,
    previousSignature: string | undefined,
    colorSignature: string,
    itemCount: number,
): boolean {
    return (
        !renderColors ||
        itemCount !== renderColors.light.colors.length ||
        colorSignature !== previousSignature
    );
}
