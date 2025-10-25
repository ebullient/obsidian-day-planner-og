import chroma from "chroma-js";
import { ItemView, type WorkspaceLeaf } from "obsidian";
import { mount, unmount } from "svelte";
import { COLORS, VIEW_TYPE_TIMELINE } from "./constants";
import type { PlanSummaryData } from "./plan-data";
import type { ActiveConfig } from "./settings";
import Timeline from "./timeline.svelte";
import {
    now,
    planSummary,
    timelineColors,
    timelineHoverColors,
} from "./timeline-store";

export default class TimelineView extends ItemView {
    private config: ActiveConfig;
    private colors: string[];
    hoverColors: string[];

    // biome-ignore lint/suspicious/noExplicitAny: Representation of Svelte component
    component: Record<string, any>;

    constructor(
        leaf: WorkspaceLeaf,
        config: ActiveConfig,
        summaryData: PlanSummaryData,
    ) {
        super(leaf);
        this.config = config;
        planSummary.set(summaryData);
    }

    getViewType(): string {
        return VIEW_TYPE_TIMELINE;
    }

    getDisplayText(): string {
        return "Day Planner Timeline";
    }

    getIcon() {
        return this.config.current().timelineIcon;
    }

    update(summaryData: PlanSummaryData) {
        const settings = this.config.current();
        if (!this.colors || summaryData.items.length !== this.colors.length) {
            // recalculate colors if the number of items has changed
            const colorFrom =
                settings.timelineColorBegin || COLORS.timelineColorBegin;
            const colorTo =
                settings.timelineColorEnd || COLORS.timelineColorEnd;

            const hoverFrom =
                settings.timelineHoverColorBegin ||
                COLORS.timelineHoverColorBegin;
            const hoverTo =
                settings.timelineHoverColorEnd || COLORS.timelineHoverColorEnd;

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
        const settings = this.config.current();
        this.component = mount(Timeline, {
            target: this.contentEl,
            props: {
                lineColor: settings.lineColor || COLORS.lineColor,
                zoomLevel: settings.timelineZoomLevel || 4,
                rootEl: this.contentEl,
                settings: settings,
            },
        });
    }

    async onClose() {
        unmount(this.component);
    }
}
