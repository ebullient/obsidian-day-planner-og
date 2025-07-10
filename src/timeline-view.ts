import chroma from "chroma-js";
import { ItemView, type WorkspaceLeaf } from "obsidian";
import { mount, type SvelteComponent, unmount } from "svelte";
import { COLORS, VIEW_TYPE_TIMELINE } from "./constants";
import type { PlanSummaryData } from "./plan-data";
import type { DayPlannerSettings } from "./settings";
import Timeline from "./timeline.svelte";
import {
    now,
    planSummary,
    timelineColors,
    timelineHoverColors,
} from "./timeline-store";

export default class TimelineView extends ItemView {
    private settings: DayPlannerSettings;
    private colors: string[];
    component: SvelteComponent;
    hoverColors: string[];

    constructor(
        leaf: WorkspaceLeaf,
        settings: DayPlannerSettings,
        summaryData: PlanSummaryData,
    ) {
        super(leaf);
        this.settings = settings;
        planSummary.set(summaryData);
    }

    getViewType(): string {
        return VIEW_TYPE_TIMELINE;
    }

    getDisplayText(): string {
        return "Day Planner Timeline";
    }

    getIcon() {
        return this.settings.timelineIcon;
    }

    update(summaryData: PlanSummaryData) {
        if (!this.colors || summaryData.items.length !== this.colors.length) {
            // recalculate colors if the number of items has changed
            const colorFrom =
                this.settings.timelineColorBegin || COLORS.timelineColorBegin;
            const colorTo =
                this.settings.timelineColorEnd || COLORS.timelineColorEnd;

            const hoverFrom =
                this.settings.timelineHoverColorBegin ||
                COLORS.timelineHoverColorBegin;
            const hoverTo =
                this.settings.timelineHoverColorEnd ||
                COLORS.timelineHoverColorEnd;

            this.colors = chroma
                .scale([colorFrom, colorTo])
                .mode("lch")
                .colors(summaryData.items.length, "hex");
            this.hoverColors = chroma
                .scale([hoverFrom, hoverTo])
                .mode("lch")
                .colors(summaryData.items.length, "hex");
            timelineColors.set(this.colors);
            timelineHoverColors.set(this.hoverColors);
        }
        planSummary.set(summaryData);
        now.set(new Date());
    }

    async onOpen() {
        this.component = mount(Timeline, {
            target: this.contentEl,
            props: {
                lineColor: this.settings.lineColor || COLORS.lineColor,
                zoomLevel: this.settings.timelineZoomLevel || 4,
                rootEl: this.contentEl,
            },
        });
    }

    async onClose() {
        unmount(this.component);
    }
}
