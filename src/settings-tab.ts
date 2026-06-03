import {
    type App,
    type DropdownComponent,
    type ExtraButtonComponent,
    PluginSettingTab,
    type Setting,
    type SettingDefinitionItem,
    type SettingGroup,
    type TextComponent,
} from "obsidian";
import { COLORS, ICONS } from "./constants";
import Logger from "./logger";
import type DayPlanner from "./main";
import { DayPlannerMode } from "./settings";

export class DayPlannerSettingsTab extends PluginSettingTab {
    plugin: DayPlanner;

    constructor(app: App, plugin: DayPlanner) {
        super(app, plugin);
        this.plugin = plugin;
        this.icon = "calendar-clock";
    }

    getSettingDefinitions(): SettingDefinitionItem[] {
        const iconOptions = Object.fromEntries(
            ICONS.map((icon) => [icon, icon]),
        );

        return [
            {
                name: "Mode",
                desc: this.modeDescriptionContent(),
                render: (setting: Setting, _group: SettingGroup) => {
                    setting.addDropdown((dd: DropdownComponent) =>
                        dd
                            .addOption("File", "File mode")
                            .addOption("Command", "Command mode")
                            .addOption("Daily", "Daily mode")
                            .setValue(this.plugin.settings.mode)
                            .onChange(async (value: string) => {
                                const oldMode = this.plugin.settings.mode;
                                this.plugin.settings.mode =
                                    DayPlannerMode[
                                        value as keyof typeof DayPlannerMode
                                    ];
                                if (oldMode !== this.plugin.settings.mode) {
                                    const notePath =
                                        this.plugin.settings.activePlan
                                            .notePath ?? "(none)";
                                    Logger.getInstance().logDebug(
                                        `Mode changed: ${DayPlannerMode[oldMode]} → ${value}, unlinked: ${notePath}`,
                                    );
                                    this.plugin.settings.activePlan = {};
                                }
                                await this.plugin.saveData(
                                    this.plugin.settings,
                                );
                                await this.plugin.tick();
                            }),
                    );
                },
            },
            {
                name: "File mode folder",
                desc: "The folder where planner files will be automatically created when in file mode.",
                control: {
                    type: "text",
                    key: "customFolder",
                    placeholder: "Day Planners",
                },
            },
            {
                name: "Complete past planner items",
                desc: "Automatically mark checkboxes for tasks and breaks in the past as complete.",
                control: { type: "toggle", key: "completePastItems" },
            },
            {
                name: "Mark in progress planner item",
                desc: "Automatically mark the textbox for the current item as in progress (/).",
                control: { type: "toggle", key: "markCurrent" },
            },
            {
                name: "Task notification",
                desc: "Display a notification when a new task is started.",
                control: { type: "toggle", key: "showTaskNotification" },
            },
            {
                name: "New day start hour",
                desc: "Hour when a new day begins (0–23). Tasks before this hour are attributed to the previous day.",
                control: {
                    type: "number",
                    key: "newDayStartsAt",
                    min: 0,
                    max: 23,
                    placeholder: "0",
                },
            },
            {
                name: "Debug",
                desc: "Enable debug messages.",
                control: { type: "toggle", key: "debug" },
            },
            {
                type: "group",
                heading: "Day planner labels",
                items: [
                    {
                        name: "Planner heading",
                        desc: "Use this heading text to mark the beginning of the planner.",
                        control: {
                            type: "text",
                            key: "plannerLabel",
                            validate: (value: string) => {
                                if (!value.trim()) {
                                    return "Planner heading cannot be empty.";
                                }
                            },
                        },
                    },
                    {
                        name: "Break task label",
                        desc: "Use this label to mark a break between tasks.",
                        control: { type: "text", key: "breakLabel" },
                    },
                    {
                        name: "End task label",
                        desc: "Use this label to mark the end of all tasks.",
                        control: { type: "text", key: "endLabel" },
                    },
                    {
                        name: "Consistent break and end labels",
                        desc: "Replace break and end task text in your planner with the configured label text.",
                        control: { type: "toggle", key: "correctLabels" },
                    },
                    {
                        name: "Preserve task values",
                        desc: "Preserve these values in the schedule, for example '-' for canceled, or '>' for rescheduled.",
                        render: (setting: Setting, _group: SettingGroup) => {
                            setting.addText((component: TextComponent) =>
                                component
                                    .setValue(
                                        this.plugin.settings.preserveValues ||
                                            "-",
                                    )
                                    .onChange(async (v: string) => {
                                        let value = v;
                                        if (value.length > 0) {
                                            value = [...new Set(value)]
                                                .join("")
                                                .replace("x", "");
                                        }
                                        this.plugin.settings.preserveValues =
                                            value;
                                        await this.plugin.saveData(
                                            this.plugin.settings,
                                        );
                                    }),
                            );
                        },
                    },
                ],
            },
            {
                type: "group",
                heading: "Status bar",
                items: [
                    {
                        name: "Circular progress",
                        desc: "Display a circular progress bar in the status bar.",
                        control: { type: "toggle", key: "circularProgress" },
                    },
                    {
                        name: "Now and next",
                        desc: "Display now and next tasks in the status bar.",
                        control: {
                            type: "toggle",
                            key: "nowAndNextInStatusBar",
                        },
                    },
                ],
            },
            {
                type: "group",
                heading: "Timeline",
                items: [
                    {
                        name: "Timeline zoom level",
                        desc: "The zoom level to display the timeline. The higher the number, the more vertical space each task will take up.",
                        control: {
                            type: "slider",
                            key: "timelineZoomLevel",
                            min: 1,
                            max: 5,
                            step: 1,
                        },
                    },
                    {
                        name: "Auto-resume timeline scroll",
                        desc: "Automatically resume timeline scrolling after manual scroll interaction stops.",
                        control: { type: "toggle", key: "autoResumeScroll" },
                    },
                    {
                        name: "Auto-resume scroll delay",
                        desc: "Auto-resume timeline scrolling after manual interaction stops (1000–10000 ms).",
                        control: {
                            type: "number",
                            key: "autoResumeScrollDelay",
                            min: 1000,
                            max: 10000,
                            placeholder: "3000",
                            validate: (value: number) => {
                                if (value < 1000 || value > 10000) {
                                    return `Value must be between 1000–10000 ms (currently ${value} ms).`;
                                }
                            },
                        },
                    },
                    {
                        name: "Hide tasks from the timeline",
                        desc: "Hide tasks with these values from the timeline view; for example '-' for canceled, or '>' for rescheduled.",
                        render: (setting: Setting, _group: SettingGroup) => {
                            setting.addText((component: TextComponent) =>
                                component
                                    .setValue(
                                        this.plugin.settings.hideTimelineValues,
                                    )
                                    .onChange(async (v: string) => {
                                        let value = v;
                                        if (value.length > 0) {
                                            value = [...new Set(value)]
                                                .join("")
                                                .replace("x", "");
                                        }
                                        this.plugin.settings.hideTimelineValues =
                                            value;
                                        await this.plugin.saveData(
                                            this.plugin.settings,
                                        );
                                    }),
                            );
                        },
                    },
                    {
                        name: "Timeline icon",
                        desc: "Timeline pane icon; reopen timeline pane or restart Obsidian to see the change.",
                        control: {
                            type: "dropdown",
                            key: "timelineIcon",
                            defaultValue: "calendar-with-checkmark",
                            options: iconOptions,
                        },
                    },
                ],
            },
            {
                type: "group",
                heading: "Timeline colors",
                items: [
                    {
                        name: "Line color",
                        desc: "Color of the current-time line in the timeline.",
                        control: {
                            type: "color",
                            key: "lineColor",
                            defaultValue: COLORS.lineColor,
                        },
                    },
                    {
                        name: "Timeline gradient start",
                        desc: "Start color of the timeline task gradient.",
                        control: {
                            type: "color",
                            key: "timelineColorBegin",
                            defaultValue: COLORS.timelineColorBegin,
                        },
                    },
                    {
                        name: "Timeline gradient end",
                        desc: "End color of the timeline task gradient.",
                        control: {
                            type: "color",
                            key: "timelineColorEnd",
                            defaultValue: COLORS.timelineColorEnd,
                        },
                    },
                    {
                        name: "Timeline hover gradient start",
                        desc: "Start color of the timeline task gradient on hover.",
                        control: {
                            type: "color",
                            key: "timelineHoverColorBegin",
                            defaultValue: COLORS.timelineHoverColorBegin,
                        },
                    },
                    {
                        name: "Timeline hover gradient end",
                        desc: "End color of the timeline task gradient on hover.",
                        control: {
                            type: "color",
                            key: "timelineHoverColorEnd",
                            defaultValue: COLORS.timelineHoverColorEnd,
                        },
                    },
                    {
                        name: "Reset timeline colors",
                        desc: "Restore all timeline colors to their defaults.",
                        render: (setting: Setting, _group: SettingGroup) => {
                            setting.addExtraButton(
                                (btn: ExtraButtonComponent) =>
                                    btn
                                        .setIcon("reset")
                                        .setTooltip("Reset to default colors")
                                        .onClick(async () => {
                                            this.plugin.settings.lineColor =
                                                COLORS.lineColor;
                                            this.plugin.settings.timelineColorBegin =
                                                COLORS.timelineColorBegin;
                                            this.plugin.settings.timelineColorEnd =
                                                COLORS.timelineColorEnd;
                                            this.plugin.settings.timelineHoverColorBegin =
                                                COLORS.timelineHoverColorBegin;
                                            this.plugin.settings.timelineHoverColorEnd =
                                                COLORS.timelineHoverColorEnd;
                                            await this.plugin.saveData(
                                                this.plugin.settings,
                                            );
                                            this.update();
                                        }),
                            );
                        },
                    },
                ],
            },
            {
                name: "",
                render: (setting: Setting) => {
                    setting.descEl.addClass("day-planner-coffee");
                    setting.descEl
                        .createEl("a", {
                            href: "https://www.buymeacoffee.com/ebullient",
                        })
                        .createEl("img", {
                            attr: {
                                src: "https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=ebullient&button_colour=8e6787&font_colour=ebebeb&font_family=Inter&outline_colour=392a37&coffee_colour=ecc986",
                            },
                        });
                },
            },
        ];
    }

    private modeDescriptionContent(): DocumentFragment {
        return createFragment((el) => {
            el.appendText(
                "Choose between 3 modes to use the Day Planner plugin:",
            );
            const dl = el.createEl("dl");
            for (const [term, desc] of [
                [
                    "File mode",
                    "Automatically generate day planner notes for each day within a configurable folder.",
                ],
                [
                    "Command mode",
                    "Use commands to link or unlink the plugin to a note containing a day planner section.",
                ],
                [
                    "Daily mode",
                    "Automatically link to the current daily note. Daily notes plugin must be enabled.",
                ],
            ] as const) {
                dl.createEl("dt").appendText(term);
                dl.createEl("dd").appendText(desc);
            }
            el.createEl("a", {
                text: "Additional details in the README",
                href: "https://github.com/ebullient/obsidian-day-planner-og/blob/main/README.md",
                attr: { target: "_blank" },
            });
        });
    }
}
