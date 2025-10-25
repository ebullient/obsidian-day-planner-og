import {
    debounce,
    MarkdownView,
    Plugin,
    type TAbstractFile,
    type Vault,
    type WorkspaceLeaf,
} from "obsidian";
import { VIEW_TYPE_TIMELINE } from "./constants";
import DayPlannerFile from "./file";
import Logger from "./logger";
import Parser from "./parser";
import { PlanSummaryData } from "./plan-data";
import PlannerMarkdown from "./planner-md";
import Progress from "./progress";
import {
    type ActiveConfig,
    DayPlannerMode,
    DayPlannerSettings,
    migrateToActivePlan,
    type OldSettings,
} from "./settings";
import { DayPlannerSettingsTab } from "./settings-tab";
import StatusBar from "./status-bar";
import TimelineView from "./timeline-view";

declare global {
    interface Window {
        dayPlanner: {
            resolvePath?: (path: string) => string;
        };
    }
}

declare module "obsidian" {
    interface App {
        internalPlugins: {
            getPluginById(id: "sync"): {
                _loaded: boolean;
                instance: Events & {
                    deviceName: string;
                    getDefaultDeviceName(): string;
                    getStatus():
                        | "error"
                        | "paused"
                        | "syncing"
                        | "uninitialized"
                        | "synced";
                    on(
                        name: "status-change",
                        callback: () => unknown,
                    ): EventRef;
                };
            };
        };
    }
    interface Plugin {
        onConfigFileChange: () => void;
        handleConfigFileChange(): Promise<void>;
    }
}

export default class DayPlanner extends Plugin implements ActiveConfig {
    settings: DayPlannerSettings;
    device: string;
    vault: Vault;
    file: DayPlannerFile;
    plannerMD: PlannerMarkdown;
    parser: Parser;
    statusBar: StatusBar;
    timelineView: TimelineView;
    interval: number;

    current = () => this.settings;

    get syncPlugin() {
        return this.app.internalPlugins.getPluginById("sync");
    }

    async onload() {
        this.settings = Object.assign(
            new DayPlannerSettings(),
            await this.loadData(),
        );

        // MIGRATION: Handle old notesToDates field
        if (migrateToActivePlan(this.settings as OldSettings)) {
            await this.save();
        }

        Logger.getInstance().updateSettings(this);

        Logger.getInstance().logInfo(
            `Loading Day Planner plugin v${this.manifest.version}`,
        );

        this.vault = this.app.vault;
        this.parser = new Parser(this);
        this.file = new DayPlannerFile(this.vault, this);

        this.registerEvent(this.app.vault.on("modify", this.codeMirror, ""));

        this.addCommand({
            id: "app:add-to-note",
            name: "Add a Day Planner template for today to the current note",
            callback: () =>
                this.modeGuard(
                    async () =>
                        await this.insertDayPlannerIntoCurrentNote(true),
                ),
            hotkeys: [],
        });

        this.addCommand({
            id: "app:link-to-note",
            name: "Link today's Day Planner to the current note",
            callback: () =>
                this.modeGuard(
                    async () =>
                        await this.insertDayPlannerIntoCurrentNote(false),
                ),
            hotkeys: [],
        });

        this.addCommand({
            id: "app:unlink-from-note",
            name: "Unlink today's Day Planner from its note",
            callback: () =>
                this.modeGuard(async () => await this.unlinkDayPlanner()),
            hotkeys: [],
        });

        this.addCommand({
            id: "app:show-timeline",
            name: "Show the Day Planner Timeline",
            callback: () => this.initLeaf(),
            hotkeys: [],
        });

        this.addCommand({
            id: "app:show-today-note",
            name: "Show today's Day Planner",
            callback: () => {
                if (this.settings.activePlan.notePath) {
                    this.app.workspace.openLinkText(
                        this.settings.activePlan.notePath,
                        "",
                        true,
                    );
                }
            },
            hotkeys: [],
        });

        this.addCommand({
            id: "app:set-as-writer",
            name: "Set current device as writer",
            callback: async () => {
                this.settings.writer = this.device;
                await this.save();
                await this.writerInfo();
            },
            hotkeys: [],
        });

        this.registerView(VIEW_TYPE_TIMELINE, (leaf: WorkspaceLeaf) => {
            this.timelineView = new TimelineView(
                leaf,
                this,
                new PlanSummaryData([], this.isWriter()),
            );
            return this.timelineView;
        });

        this.addSettingTab(new DayPlannerSettingsTab(this.app, this));

        this.register(() => {
            window.dayPlanner = undefined;
        });

        this.app.workspace.onLayoutReady(this.layoutReady);
    }

    layoutReady = async () => {
        const syncEnabled = this.syncPlugin?.instance !== undefined;
        this.device = syncEnabled
            ? this.syncPlugin.instance.deviceName.length > 0
                ? this.syncPlugin.instance.deviceName
                : this.syncPlugin.instance.getDefaultDeviceName()
            : "Unknown";

        const progress = new Progress();
        this.plannerMD = new PlannerMarkdown(
            this.app.workspace,
            this,
            this.file,
            this.parser,
            progress,
        );

        this.statusBar = new StatusBar(
            this,
            this.addStatusBarItem(),
            this.app.workspace,
            progress,
            new PlannerMarkdown(
                this.app.workspace,
                this,
                this.file,
                this.parser,
                progress,
            ),
            this.file,
        );
        this.statusBar.initStatusBar();

        await this.tick();

        this.setTicker();
        window.dayPlanner = { resolvePath: this.resolvePath.bind(this) };
    };

    async onunload() {
        if (this.interval) {
            Logger.getInstance().logDebug("Clearing ticker");
            window.clearInterval(this.interval);
        }
    }

    async handleConfigFileChange() {
        await super.handleConfigFileChange();
        this.onExternalSettingsChange();
    }

    public onExternalSettingsChange = debounce(
        async () => {
            Logger.getInstance().logInfo("external settings changed");
            this.settings = Object.assign(
                {},
                this.settings,
                await this.loadData(),
            );
            this.parser.updateSettings();
            await this.writerInfo();
        },
        2000,
        true,
    );

    async writerInfo(): Promise<void> {
        Logger.getInstance().logInfo(
            "update Device/Writer:",
            this.device,
            this.isWriter(),
            this.settings.mode,
            this.settings.writer,
            this.settings.activePlan,
        );
    }

    isWriter(): boolean {
        return (
            this.device === "Unknown" ||
            !this.settings.writer ||
            this.settings.writer === this.device
        );
    }

    setTicker() {
        if (this.interval) {
            Logger.getInstance().logDebug("Clearing ticker");
            window.clearInterval(this.interval);
            this.interval = undefined;
        }
        Logger.getInstance().logDebug(
            "set Ticker with Device/Writer:",
            this.device,
            this.settings.writer,
            this.isWriter(),
        );
        this.interval = window.setInterval(() => this.tick(), 2000);
    }

    async tick() {
        try {
            const now = new Date();
            const originalPlan = this.settings.activePlan;

            // Check if activePlan exists and is valid
            if (this.settings.activePlan.notePath) {
                const anchorTime = new Date(
                    this.settings.activePlan.anchorDate,
                );
                const hoursSinceAnchor =
                    (now.getTime() - anchorTime.getTime()) / (1000 * 60 * 60);

                // beyond 24 hours: rotate or expire
                if (hoursSinceAnchor >= 24) {
                    this.settings.activePlan = {};
                }
            }

            // Doesn't exist yet or was beyond 24 hours
            if (
                this.isWriter() &&
                !this.settings.activePlan.notePath &&
                this.settings.mode !== DayPlannerMode.Command
            ) {
                await this.rotateOrCreatePlan();
            }

            if (this.settings.activePlan.notePath) {
                const planSummary = await this.plannerMD.processDayPlanner(
                    this.isWriter(),
                    this.settings.activePlan.notePath,
                );
                await this.statusBar.refreshStatusBar(planSummary);
                this.timelineView?.update(planSummary);
            } else if (this.settings.mode === DayPlannerMode.Daily) {
                // Clear UI - waiting for daily note to be created
                const planSummary = new PlanSummaryData([], this.isWriter());
                await this.statusBar.refreshStatusBar(planSummary);
                this.timelineView?.update(planSummary);
            }

            if (originalPlan.notePath !== this.settings.activePlan.notePath) {
                this.save();
            }
        } catch (error) {
            Logger.getInstance().logError(
                "error refreshing plan (tick)",
                error,
            );
        }
    }

    initLeaf() {
        if (this.app.workspace.getLeavesOfType(VIEW_TYPE_TIMELINE).length > 0) {
            return;
        }
        this.app.workspace.getRightLeaf(true).setViewState({
            type: VIEW_TYPE_TIMELINE,
        });
    }

    modeGuard(command: () => Promise<void>): void {
        if (this.settings.mode !== DayPlannerMode.Command) {
            new Notification("Day Planner plugin in File mode", {
                silent: true,
                body: "Switch to Command mode in settings to use this command",
            });
            return;
        }
        command();
    }

    // Daily mode
    async rotateOrCreatePlan() {
        // Compute new anchor for current time
        const newAnchor = this.parser.getAnchorDate();

        // Try to find/create daily note for new anchor
        const dailyNotePath = await this.file.createDailyNote(newAnchor);

        if (dailyNotePath) {
            // Found or can create daily note - update activePlan
            this.settings.activePlan = {
                notePath: dailyNotePath,
                anchorDate: newAnchor.getTime(),
            };
            await this.save();

            // Process the new daily note
            const planSummary = await this.plannerMD.processDayPlanner(
                this.isWriter(),
                dailyNotePath,
            );
            await this.statusBar.refreshStatusBar(planSummary);
            this.timelineView?.update(planSummary);
        } else {
            // Daily note doesn't exist yet - clear activePlan and UI
            this.settings.activePlan = {};
            await this.save();

            const planSummary = new PlanSummaryData([], this.isWriter());
            await this.statusBar.refreshStatusBar(planSummary);
            this.timelineView?.update(planSummary);
        }
    }

    // Command mode
    async insertDayPlannerIntoCurrentNote(insertTemplate: boolean) {
        try {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            const filePath = view.file.path;

            // Check if activePlan already exists for a different file
            if (
                this.settings.activePlan.notePath &&
                this.settings.activePlan.notePath !== filePath
            ) {
                new Notification("Day Planner exists", {
                    silent: true,
                    body: `A Day Planner for today already exists in ${this.settings.activePlan.notePath}`,
                });
                return;
            }

            if (insertTemplate) {
                this.plannerMD.insertPlanner(filePath);
            }

            // Only set activePlan if it doesn't exist yet
            if (!this.settings.activePlan.notePath) {
                // Use parser to compute anchor date (reuses existing logic)
                const anchor = this.parser.getAnchorDate();

                this.settings.activePlan = {
                    notePath: filePath,
                    anchorDate: anchor.getTime(),
                };
                await this.save();
            }
        } catch (error) {
            console.error(error);
        }
    }

    async unlinkDayPlanner() {
        try {
            if (!this.settings.activePlan.notePath) {
                return;
            }

            const notePath = this.settings.activePlan.notePath;

            this.settings.activePlan = {};
            await this.save();

            this.statusBar.hide(this.statusBar.statusBar);
            this.timelineView?.update(new PlanSummaryData([], this.isWriter()));

            new Notification("Day Planner reset", {
                silent: true,
                body: `The Day Planner for today has been dissociated from ${notePath} and can be added to another note`,
            });
        } catch (error) {
            console.error(error);
        }
    }

    async save() {
        await this.saveData(this.settings);
    }

    codeMirror = (_file: TAbstractFile) => {
        if (this.settings.activePlan.notePath) {
            this.plannerMD.checkIsDayPlannerEditing(
                this.settings.activePlan.notePath,
            );
        } else {
            // console.log('No active note, skipping CodeMirror monitoring')
        }
    };

    // Static method to return the current file
    resolvePath(link: string): string {
        if (this.settings.activePlan.notePath) {
            const file = this.app.metadataCache.getFirstLinkpathDest(
                link,
                this.settings.activePlan.notePath,
            );
            return file.path || "";
        }
        return "";
    }
}
