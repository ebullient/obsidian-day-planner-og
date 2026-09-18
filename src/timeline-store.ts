import { writable } from "svelte/store";
import { PlanSummaryData } from "./plan-data";
export interface TimelineRenderColors {
    colors: string[];
    hoverColors: string[];
    lineColor: string;
    nowLineColor: string;
    nowLineTextColor: string;
    textColor: string;
}

export interface TimelineRenderColorSchemes {
    light: TimelineRenderColors;
    dark: TimelineRenderColors;
}

export function emptyTimelineRenderColors(): TimelineRenderColors {
    return {
        colors: [],
        hoverColors: [],
        lineColor: "",
        nowLineColor: "",
        nowLineTextColor: "",
        textColor: "",
    };
}

export const timelineColorSchemes = writable<TimelineRenderColorSchemes>({
    light: emptyTimelineRenderColors(),
    dark: emptyTimelineRenderColors(),
});

export const planSummary = writable(new PlanSummaryData([], false));
export const now = writable(new Date());
export const timelineColors = writable<string[]>([]);
export const timelineHoverColors = writable<string[]>([]);
