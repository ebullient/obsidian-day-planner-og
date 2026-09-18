import { ItemView, type WorkspaceLeaf } from "obsidian";
import { mount, unmount } from "svelte";
import { VIEW_TYPE_TIMELINE } from "./constants";
import type { PlanSummaryData } from "./plan-data";
import type { ActiveConfig } from "./settings";
import Timeline from "./timeline.svelte";
import {
    createTimelineColorSignature,
    createTimelineRenderColorSchemes,
    timelineColorsNeedUpdate,
} from "./timeline-colors";
import {
    now,
    planSummary,
    type TimelineRenderColorSchemes,
    timelineColorSchemes,
    timelineColors,
    timelineHoverColors,
} from "./timeline-store";

export default class TimelineView extends ItemView {
    private config: ActiveConfig;
    private onOpenCallback: () => void;
    private renderColors: TimelineRenderColorSchemes;
    private colorSignature: string;

    component: Record<string, unknown>;

    constructor(
        leaf: WorkspaceLeaf,
        config: ActiveConfig,
        onOpenCallback: () => void,
    ) {
        super(leaf);
        this.config = config;
        this.onOpenCallback = onOpenCallback;
    }

    getViewType(): string {
        return VIEW_TYPE_TIMELINE;
    }

    getDisplayText(): string {
        return "Timeline";
    }

    getIcon() {
        return this.config.current().timelineIcon;
    }

    update(summaryData: PlanSummaryData) {
        const settings = this.config.current();
        const colorSignature = createTimelineColorSignature(
            settings.timelineColors,
        );
        if (
            timelineColorsNeedUpdate(
                this.renderColors,
                this.colorSignature,
                colorSignature,
                summaryData.items.length,
            )
        ) {
            this.renderColors = createTimelineRenderColorSchemes(
                settings.timelineColors,
                summaryData.items.length,
            );
            this.colorSignature = colorSignature;
            timelineColorSchemes.set(this.renderColors);
            timelineColors.set(this.renderColors.light.colors);
            timelineHoverColors.set(this.renderColors.light.hoverColors);
        }
        planSummary.set(summaryData);
        now.set(new Date());
    }

    async onOpen() {
        const settings = this.config.current();
        this.component = mount(Timeline, {
            target: this.contentEl,
            props: {
                zoomLevel: settings.timelineZoomLevel || 4,
                rootEl: this.contentEl,
                settings: settings,
            },
        });
        this.onOpenCallback();
    }

    async onClose() {
        void unmount(this.component);
    }
}
