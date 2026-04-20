import {
    type App,
    type ColorComponent,
    PluginSettingTab,
    Setting,
} from "obsidian";
import { COLORS, DEFAULT_SETTINGS, ICONS } from "./constants";
import Logger from "./logger";
import type DayPlanner from "./main";
import MomentDateRegex from "./moment-date-regex";
import { DayPlannerMode, type DayPlannerSettings } from "./settings";

export class DayPlannerSettingsTab extends PluginSettingTab {
    momentDateRegex = new MomentDateRegex();
    plugin: DayPlanner;
    newSettings: DayPlannerSettings;

    constructor(app: App, plugin: DayPlanner) {
        super(app, plugin);
        this.plugin = plugin;
        this.icon = "calendar-clock";
        this.newSettings = DEFAULT_SETTINGS;
    }

    async save() {
        await this.plugin.saveData(this.plugin.settings);
        Logger.getInstance().logDebug("Settings saved");
        await this.plugin.tick();
    }

    hide(): void {
        if (this.newSettings.mode !== this.plugin.settings.mode) {
            const oldMode = DayPlannerMode[this.plugin.settings.mode];
            const newMode = DayPlannerMode[this.newSettings.mode];
            const notePath =
                this.plugin.settings.activePlan.notePath ?? "(none)";
            Logger.getInstance().logDebug(
                `Mode changed: ${oldMode} → ${newMode}, unlinked: ${notePath}`,
            );
            // Clear activePlan synchronously so the next tick picks up the new
            // mode with a clean slate. Do NOT call the async unlinkDayPlanner()
            // here — its deferred save() races with the ticker and overwrites
            // the activePlan the ticker sets for the new mode.
            this.newSettings.activePlan = {};
        }
        Object.assign(this.plugin.settings, this.newSettings);
        void this.save();
    }

    display(): void {
        this.newSettings = JSON.parse(
            JSON.stringify(this.plugin.settings),
        ) as DayPlannerSettings;
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName("Mode")
            .setDesc(this.modeDescriptionContent())
            .addDropdown((dropDown) =>
                dropDown
                    .addOption(DayPlannerMode[DayPlannerMode.File], "File mode")
                    .addOption(
                        DayPlannerMode[DayPlannerMode.Command],
                        "Command mode",
                    )
                    .addOption(
                        DayPlannerMode[DayPlannerMode.Daily],
                        "Daily mode",
                    )
                    .setValue(
                        DayPlannerMode[this.newSettings.mode] ||
                            DayPlannerMode.File.toString(),
                    )
                    .onChange((value: string) => {
                        this.newSettings.mode =
                            DayPlannerMode[
                                value as keyof typeof DayPlannerMode
                            ];
                    }),
            );

        new Setting(containerEl)
            .setName("File mode folder")
            .setDesc(
                "The folder where planner files will be automatically created when in file mode.",
            )
            .addText((text) =>
                text
                    .setValue(this.newSettings.customFolder || "Day Planners")
                    .onChange((value: string) => {
                        this.newSettings.customFolder =
                            value.trim() || "Day Planners";
                    }),
            );

        new Setting(containerEl)
            .setName("Complete past planner items")
            .setDesc(
                "Automatically mark checkboxes for tasks and breaks in the past as complete.",
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.newSettings.completePastItems)
                    .onChange((value: boolean) => {
                        this.newSettings.completePastItems = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Mark in progress planner item")
            .setDesc(
                "Automatically mark the textbox for the current item as in progress (/).",
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.newSettings.markCurrent)
                    .onChange((value: boolean) => {
                        this.newSettings.markCurrent = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Status bar - circular progress")
            .setDesc("Display a circular progress bar in the status bar.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.newSettings.circularProgress)
                    .onChange((value: boolean) => {
                        this.newSettings.circularProgress = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Status bar - now and next")
            .setDesc("Display now and next tasks in the status bar")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.newSettings.nowAndNextInStatusBar)
                    .onChange((value: boolean) => {
                        this.newSettings.nowAndNextInStatusBar = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Task notification")
            .setDesc("Display a notification when a new task is started")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.newSettings.showTaskNotification)
                    .onChange((value: boolean) => {
                        this.newSettings.showTaskNotification = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Timeline zoom level")
            .setDesc(
                "The zoom level to display the timeline. The higher the number, the more vertical space each task will take up.",
            )
            .addSlider((slider) =>
                slider
                    .setLimits(1, 5, 1)
                    .setValue(this.newSettings.timelineZoomLevel ?? 4)
                    .setDynamicTooltip()
                    .onChange((value: number) => {
                        this.newSettings.timelineZoomLevel = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Auto-resume timeline scroll")
            .setDesc(
                "Automatically resume timeline scrolling after manual scroll interaction stops.",
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.newSettings.autoResumeScroll)
                    .onChange((value: boolean) => {
                        this.newSettings.autoResumeScroll = value;
                    }),
            );

        const autoResumeDelaySetting = new Setting(containerEl).setName(
            "Auto-resume scroll delay",
        );

        const updateAutoResumeDelayDesc = () => {
            const currentValue = this.newSettings.autoResumeScrollDelay;
            if (currentValue < 1000 || currentValue > 10000) {
                autoResumeDelaySetting.setDesc(
                    `⚠️ Value must be between 1000-10000ms; currently: ${currentValue}ms`,
                );
            } else {
                autoResumeDelaySetting.setDesc(
                    `Auto-resume timeline scrolling (1000-10000ms) after manual interaction stops; currently: ${currentValue}ms`,
                );
            }
        };

        updateAutoResumeDelayDesc();

        autoResumeDelaySetting.addText((component) =>
            component
                .setValue(this.newSettings.autoResumeScrollDelay.toString())
                .setPlaceholder("3000")
                .onChange((value: string) => {
                    const numValue = Number(value);
                    if (
                        !Number.isNaN(numValue) &&
                        numValue >= 1000 &&
                        numValue <= 10000
                    ) {
                        this.newSettings.autoResumeScrollDelay = numValue;
                    }
                    updateAutoResumeDelayDesc();
                }),
        );

        new Setting(containerEl)
            .setName("Timeline icon")
            .setDesc(
                "Timeline pane icon; reopen timeline pane or restart Obsidian to see the change.",
            )
            .addDropdown((dropdown) => {
                for (const icon of ICONS) {
                    dropdown.addOption(icon, icon);
                }
                return dropdown
                    .setValue(
                        this.newSettings.timelineIcon ??
                            "calendar-with-checkmark",
                    )
                    .onChange((value: string) => {
                        this.newSettings.timelineIcon = value;
                    });
            });

        const pickers: {
            lineColor?: ColorComponent;
            timelineColorBegin?: ColorComponent;
            timelineColorEnd?: ColorComponent;
            timelineHoverColorBegin?: ColorComponent;
            timelineHoverColorEnd?: ColorComponent;
        } = {};

        new Setting(containerEl)
            .setName("Timeline colors")
            .setDesc(
                "Gradient colors for the timeline (line, begin, end, hover begin, hover end, reset).",
            )
            .addColorPicker((colorPicker) => {
                colorPicker
                    .setValue(this.newSettings.lineColor ?? COLORS.lineColor)
                    .onChange((value: string) => {
                        this.newSettings.lineColor = value;
                    });
                pickers.lineColor = colorPicker;
            })
            .addColorPicker((colorPicker) => {
                colorPicker
                    .setValue(
                        this.newSettings.timelineColorBegin ??
                            COLORS.timelineColorBegin,
                    )
                    .onChange((value: string) => {
                        this.newSettings.timelineColorBegin = value;
                    });
                pickers.timelineColorBegin = colorPicker;
            })
            .addColorPicker((colorPicker) => {
                colorPicker
                    .setValue(
                        this.newSettings.timelineColorEnd ??
                            COLORS.timelineColorEnd,
                    )
                    .onChange((value: string) => {
                        this.newSettings.timelineColorEnd = value;
                    });
                pickers.timelineColorEnd = colorPicker;
            })
            .addColorPicker((colorPicker) => {
                colorPicker
                    .setValue(
                        this.newSettings.timelineHoverColorBegin ??
                            COLORS.timelineHoverColorBegin,
                    )
                    .onChange((value: string) => {
                        this.newSettings.timelineHoverColorBegin = value;
                    });
                pickers.timelineHoverColorBegin = colorPicker;
            })
            .addColorPicker((colorPicker) => {
                colorPicker
                    .setValue(
                        this.newSettings.timelineHoverColorEnd ??
                            COLORS.timelineHoverColorEnd,
                    )
                    .onChange((value: string) => {
                        this.newSettings.timelineHoverColorEnd = value;
                    });
                pickers.timelineHoverColorEnd = colorPicker;
            })
            .addExtraButton((button) => {
                button
                    .setTooltip("Reset to default colors")
                    .setIcon("reset")
                    .onClick(() => {
                        this.newSettings.lineColor = COLORS.lineColor;
                        pickers.lineColor?.setValue(COLORS.lineColor);

                        this.newSettings.timelineColorBegin =
                            COLORS.timelineColorBegin;
                        pickers.timelineColorBegin?.setValue(
                            COLORS.timelineColorBegin,
                        );

                        this.newSettings.timelineColorEnd =
                            COLORS.timelineColorEnd;
                        pickers.timelineColorEnd?.setValue(
                            COLORS.timelineColorEnd,
                        );

                        this.newSettings.timelineHoverColorBegin =
                            COLORS.timelineHoverColorBegin;
                        pickers.timelineHoverColorBegin?.setValue(
                            COLORS.timelineHoverColorBegin,
                        );

                        this.newSettings.timelineHoverColorEnd =
                            COLORS.timelineHoverColorEnd;
                        pickers.timelineHoverColorEnd?.setValue(
                            COLORS.timelineHoverColorEnd,
                        );
                    });
            });

        new Setting(containerEl)
            .setName("Planner heading")
            .setDesc(
                "Use this heading text to mark the beginning of the planner.",
            )
            .addText((component) =>
                component
                    .setValue(this.newSettings.plannerLabel ?? "Day Planner")
                    .onChange((v: string) => {
                        const value = v.trim();
                        if (value.length > 0) {
                            this.newSettings.plannerLabel = value;
                        }
                    }),
            );

        new Setting(containerEl)
            .setName("Break task label")
            .setDesc("Use this label to mark a break between tasks.")
            .addText((component) =>
                component
                    .setValue(this.newSettings.breakLabel ?? "BREAK")
                    .onChange((value: string) => {
                        this.newSettings.breakLabel = value;
                    }),
            );

        new Setting(containerEl)
            .setName("End task label")
            .setDesc("Use this label to mark the end of all tasks.")
            .addText((component) =>
                component
                    .setValue(this.newSettings.endLabel ?? "END")
                    .onChange((value: string) => {
                        this.newSettings.endLabel = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Consistent break and end labels")
            .setDesc(
                "Replace break and end task text in your planner with the configured label text (consistency).",
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.newSettings.correctLabels)
                    .onChange((value: boolean) => {
                        this.newSettings.correctLabels = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Preserve task values")
            .setDesc(
                "Preserve these values in the schedule, for example '-' for canceled, or '>' for rescheduled.",
            )
            .addText((component) =>
                component
                    .setValue(this.newSettings.preserveValues || "-")
                    .onChange((v: string) => {
                        let value = v;
                        if (value.length > 0) {
                            // remove duplicates
                            value = [...new Set(value)]
                                .join("")
                                .replace("x", "");
                        }
                        this.newSettings.preserveValues = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Hide tasks from the timeline")
            .setDesc(
                "Hide tasks with these values from the timeline view; for example '-' for canceled, or '>' for rescheduled.",
            )
            .addText((component) =>
                component
                    .setValue(this.newSettings.hideTimelineValues || "-")
                    .onChange((v: string) => {
                        let value = v;
                        if (value.length > 0) {
                            // remove duplicates
                            value = [...new Set(value)]
                                .join("")
                                .replace("x", "");
                        }
                        this.newSettings.hideTimelineValues = value;
                    }),
            );

        new Setting(containerEl)
            .setName("New day start hour")
            .setDesc(
                "Hour when a new day begins; valid values 0-23 (default: 0 (midnight); set to 4 if you work until 3am and want those tasks in the same planner).",
            )
            .addText((text) =>
                text
                    .setPlaceholder("0")
                    .setValue(this.newSettings.newDayStartsAt.toString())
                    .onChange((value: string) => {
                        const numValue = Number.parseInt(value, 10);
                        if (
                            !Number.isNaN(numValue) &&
                            numValue >= 0 &&
                            numValue <= 23
                        ) {
                            this.newSettings.newDayStartsAt = numValue;
                        }
                    }),
            );

        new Setting(containerEl)
            .setName("Debug")
            .setDesc("Enable debug messages")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.newSettings.debug)
                    .onChange((value: boolean) => {
                        this.newSettings.debug = value;
                    }),
            );
    }

    private modeDescriptionContent(): DocumentFragment {
        const descEl = activeDocument.createDocumentFragment();
        descEl.appendText(
            "Choose between 3 modes to use the Day Planner plugin:",
        );
        descEl.appendChild(activeDocument.createElement("br"));
        descEl
            .appendChild(activeDocument.createElement("strong"))
            .appendText("File mode");
        descEl.appendChild(activeDocument.createElement("br"));
        descEl.appendText(
            "Plugin automatically generates day planner notes for each day within a configurable folder.",
        );
        descEl.appendChild(activeDocument.createElement("br"));
        descEl
            .appendChild(activeDocument.createElement("strong"))
            .appendText("Command mode");
        descEl.appendChild(activeDocument.createElement("br"));
        descEl.appendText(
            "Command used to insert a Day Planner for today within the current note.",
        );
        descEl.appendChild(activeDocument.createElement("br"));
        descEl
            .appendChild(activeDocument.createElement("strong"))
            .appendText("Daily mode");
        descEl.appendChild(activeDocument.createElement("br"));
        descEl.appendText(
            "Plugin automatically links to the current daily note. Daily notes plugin must be enabled.",
        );
        descEl.appendChild(activeDocument.createElement("br"));
        this.addDocsLink(descEl);
        return descEl;
    }

    private addDocsLink(descEl: DocumentFragment) {
        const a = activeDocument.createElement("a");
        a.href =
            "https://github.com/ebullient/obsidian-day-planner-og/blob/main/README.md";
        a.text = "plugin README";
        a.target = "_blank";
        descEl.appendChild(a);
        descEl.appendChild(activeDocument.createElement("br"));
    }
}
