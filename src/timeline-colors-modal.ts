import { type App, type ColorComponent, Modal, Setting } from "obsidian";
import { mount, unmount } from "svelte";
import { COLORS } from "./constants";
import {
    copyTimelineColorScheme,
    type DayPlannerSettings,
    resetTimelineColorSchemes,
    type TimelineColorScheme,
} from "./settings";
import TimelineColorPreview from "./timeline-color-preview.svelte";

export type TimelineColorsModalSave = () => Promise<void> | void;

const COLOR_CONTROLS: Array<{
    key: keyof TimelineColorScheme;
    name: string;
    desc: string;
}> = [
    {
        key: "lineColor",
        name: "Timeline rail color",
        desc: "Color of the timeline rail and active event dot.",
    },
    {
        key: "nowLineColor",
        name: "Current-time line color",
        desc: "Color of the current-time line and its label background.",
    },
    {
        key: "nowLineTextColor",
        name: "Current-time text color",
        desc: "Color of the text inside the current-time label.",
    },
    {
        key: "timelineColorBegin",
        name: "Timeline gradient start",
        desc: "Start color of the timeline task gradient.",
    },
    {
        key: "timelineColorEnd",
        name: "Timeline gradient end",
        desc: "End color of the timeline task gradient.",
    },
    {
        key: "timelineHoverColorBegin",
        name: "Timeline hover gradient start",
        desc: "Start color of the timeline task gradient on hover.",
    },
    {
        key: "timelineHoverColorEnd",
        name: "Timeline hover gradient end",
        desc: "End color of the timeline task gradient on hover.",
    },
    {
        key: "timelineTextColor",
        name: "Timeline text color",
        desc: "Color of Timeline text over task backgrounds.",
    },
];

export default class TimelineColorsModal extends Modal {
    private settings: DayPlannerSettings;
    private onSave: TimelineColorsModalSave;
    private previewComponent: Record<string, unknown> | undefined;
    private previewTarget: HTMLElement | undefined;

    constructor(
        app: App,
        settings: DayPlannerSettings,
        onSave: TimelineColorsModalSave,
    ) {
        super(app);
        this.settings = settings;
        this.onSave = onSave;
    }

    onOpen(): void {
        this.setTitle("Timeline colors");
        this.render();
    }

    onClose(): void {
        this.unmountPreview();
        this.contentEl.empty();
    }

    private render(): void {
        this.unmountPreview();
        this.contentEl.empty();

        this.previewTarget = this.contentEl.createDiv({
            cls: "day-planner-timeline-color-preview-container",
        });
        this.previewComponent = mount(TimelineColorPreview, {
            target: this.previewTarget,
            props: { schemes: this.settings.timelineColors },
        });

        this.contentEl.createEl("h3", { text: "Light mode colors" });
        this.renderScheme(this.contentEl, this.settings.timelineColors.light);

        const darkSection = this.contentEl.createEl("details", {
            cls: "day-planner-timeline-colors-dark-section",
        });
        darkSection.createEl("summary", {
            cls: "day-planner-timeline-colors-dark-heading",
            text: "Dark mode colors",
        });
        this.renderScheme(darkSection, this.settings.timelineColors.dark);

        new Setting(this.contentEl)
            .setName("Copy light mode colors to dark mode")
            .setDesc("Use the light-mode colors for both schemes.")
            .addButton((button) =>
                button.setButtonText("Copy").onClick(async () => {
                    copyTimelineColorScheme(this.settings);
                    await this.onSave();
                    this.render();
                }),
            );

        new Setting(this.contentEl)
            .setName("Reset timeline colors")
            .setDesc("Restore all timeline colors to their defaults.")
            .addButton((button) =>
                button.setButtonText("Reset").onClick(async () => {
                    resetTimelineColorSchemes(this.settings, COLORS);
                    await this.onSave();
                    this.render();
                }),
            );
    }

    private renderScheme(
        container: HTMLElement,
        scheme: TimelineColorScheme,
    ): void {
        for (const field of COLOR_CONTROLS) {
            new Setting(container)
                .setName(field.name)
                .setDesc(field.desc)
                .addColorPicker((component: ColorComponent) =>
                    component
                        .setValue(scheme[field.key] || COLORS[field.key])
                        .onChange(async (value: string) => {
                            scheme[field.key] = value;
                            await this.onSave();
                            this.refreshPreview();
                        }),
                );
        }
    }

    private refreshPreview(): void {
        const previewTarget = this.previewTarget;
        if (!previewTarget) {
            return;
        }

        this.unmountPreview();
        this.previewTarget = previewTarget;
        this.previewComponent = mount(TimelineColorPreview, {
            target: previewTarget,
            props: { schemes: this.settings.timelineColors },
        });
    }

    private unmountPreview(): void {
        if (this.previewComponent) {
            void unmount(this.previewComponent);
            this.previewComponent = undefined;
        }
        this.previewTarget = undefined;
    }
}
