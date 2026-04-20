import {
    type App,
    debounce,
    MarkdownView,
    Notice,
    Plugin,
    type PluginManifest,
    type TAbstractFile,
    type Vault,
    type WorkspaceLeaf,
} from "obsidian";
import { DEFAULT_SETTINGS, VIEW_TYPE_TIMELINE } from "./constants";
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

type ResolvePath = (path: string) => string;

type DayPlannerApi = {
    resolvePath?: ResolvePath;
};

declare global {
    var dayPlanner: DayPlannerApi;
}

declare module "obsidian" {
    interface App {
        internalPlugins: {
            getPluginById(id: "sync"): {
                _loaded: boolean;
                instance: import("obsidian").Events & {
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
                    ): import("obsidian").EventRef;
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
    device: string | undefined;
    vault: Vault;
    file: DayPlannerFile;
    plannerMD: PlannerMarkdown | undefined;
    parser: Parser;
    statusBar: StatusBar | undefined;
    interval: ReturnType<Window["setInterval"]> | undefined;

    current = () => this.settings ?? DEFAULT_SETTINGS;

    get syncPlugin() {
        return this.app.internalPlugins.getPluginById("sync");
    }

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);
        this.vault = this.app.vault;
        this.parser = new Parser(this);
        this.file = new DayPlannerFile(this.vault, this);
        this.settings = DEFAULT_SETTINGS;
    }

    async onload() {
        this.settings = Object.assign(
            new DayPlannerSettings(),
            await this.loadData(),
        ) as DayPlannerSettings;

        // MIGRATION: Handle old notesToDates field
        if (migrateToActivePlan(this.settings as OldSettings)) {
            await this.save();
        }

        Logger.getInstance().updateSettings(this);
        this.parser.updateSettings();

        Logger.getInstance().logInfo(
            `Loading Day Planner v${this.manifest.version}`,
        );

        this.registerEvent(this.app.vault.on("modify", this.codeMirror, ""));

        this.addCommand({
            id: "app:add-to-note",
            name: "Add a planner template for today to the current note",
            callback: () =>
                this.modeGuard(
                    async () =>
                        await this.insertDayPlannerIntoCurrentNote(true),
                ),
        });

        this.addCommand({
            id: "app:link-to-note",
            name: "Link today's planner to the current note",
            callback: () =>
                this.modeGuard(
                    async () =>
                        await this.insertDayPlannerIntoCurrentNote(false),
                ),
        });

        this.addCommand({
            id: "app:unlink-from-note",
            name: "Unlink today's planner from its note",
            callback: () =>
                this.modeGuard(async () => await this.unlinkDayPlanner()),
        });

        this.addCommand({
            id: "app:show-timeline",
            name: "Show the timeline",
            callback: () => this.initLeaf(),
        });

        this.addCommand({
            id: "app:show-today-note",
            name: "Show today's planner",
            callback: async () => {
                if (this.settings.activePlan.notePath) {
                    await this.app.workspace.openLinkText(
                        this.settings.activePlan.notePath,
                        "",
                        true,
                    );
                }
            },
        });

        this.addCommand({
            id: "app:set-as-writer",
            name: "Set current device as writer",
            callback: async () => {
                if (this.device) {
                    this.settings.writer = this.device;
                    await this.save();
                    await this.writerInfo();
                }
            },
        });

        this.registerView(VIEW_TYPE_TIMELINE, (leaf: WorkspaceLeaf) => {
            return new TimelineView(leaf, this, () => {
                void this.tick();
            });
        });

        this.addSettingTab(new DayPlannerSettingsTab(this.app, this));

        this.register(() => {
            // eslint-disable-next-line obsidianmd/prefer-active-doc
            globalThis.dayPlanner = {};
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
        // eslint-disable-next-line obsidianmd/prefer-active-doc
        globalThis.dayPlanner = {
            resolvePath: this.resolvePath.bind(this) as ResolvePath,
        };
    };

    onunload() {
        if (this.interval) {
            Logger.getInstance().logDebug("Clearing ticker");
            activeWindow.clearInterval(this.interval);
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
            ) as DayPlannerSettings;
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
            activeWindow.clearInterval(this.interval);
            this.interval = undefined;
        }
        Logger.getInstance().logDebug(
            "set Ticker with Device:",
            this.device,
            "Writer:",
            this.settings.writer,
            this.isWriter(),
            "Current plan:",
            this.settings.activePlan.notePath,
        );
        this.interval = activeWindow.setInterval(() => {
            this.tick().catch((e) =>
                console.error("Day planner tick error", e),
            );
        }, 2000);
    }

    async tick() {
        try {
            const now = new Date();
            const originalPlan = this.settings.activePlan;

            // Check if activePlan exists and is valid
            if (this.settings.activePlan.notePath) {
                const anchorDate = this.settings.activePlan.anchorDate;
                const anchorTime = anchorDate
                    ? new Date(anchorDate)
                    : new Date();
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

            if (
                this.settings.activePlan.notePath &&
                this.plannerMD &&
                this.statusBar
            ) {
                const planSummary =
                    (await this.plannerMD.processDayPlanner(
                        this.isWriter(),
                        this.settings.activePlan.notePath,
                    )) ?? new PlanSummaryData([], this.isWriter());
                await this.statusBar.refreshStatusBar(planSummary);
                this.updateTimelineView(planSummary);
            } else if (this.statusBar) {
                // No active plan — clear UI while waiting
                const planSummary = new PlanSummaryData([], this.isWriter());
                await this.statusBar.refreshStatusBar(planSummary);
                this.updateTimelineView(planSummary);
            }

            if (originalPlan?.notePath !== this.settings.activePlan.notePath) {
                await this.save();
            }
        } catch (error) {
            Logger.getInstance().logError(
                "error refreshing plan (tick)",
                error,
            );
        }
    }

    updateTimelineView(planSummary: PlanSummaryData) {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TIMELINE);
        leaves.forEach((leaf) => {
            if (leaf.view instanceof TimelineView) {
                leaf.view.update(planSummary);
            }
        });
    }

    initLeaf() {
        if (this.app.workspace.getLeavesOfType(VIEW_TYPE_TIMELINE).length > 0) {
            return;
        }
        void this.app.workspace.getRightLeaf(true)?.setViewState({
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
        void command();
    }

    // Daily mode
    async rotateOrCreatePlan() {
        if (!this.plannerMD || !this.statusBar) {
            return;
        }
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
            this.updateTimelineView(planSummary);
        } else {
            // Daily note doesn't exist yet - clear activePlan and UI
            this.settings.activePlan = {};
            await this.save();

            const planSummary = new PlanSummaryData([], this.isWriter());
            await this.statusBar.refreshStatusBar(planSummary);
            this.updateTimelineView(planSummary);
        }
    }

    // Command mode
    async insertDayPlannerIntoCurrentNote(insertTemplate: boolean) {
        try {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!this.settings || !view || !view.file || !this.plannerMD) {
                return;
            }
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
                await this.plannerMD.insertPlanner(filePath);
            }

            // Only set activePlan if it doesn't exist yet
            if (!this.settings.activePlan.notePath) {
                Logger.getInstance().logDebug(
                    "Command mode: linked plan to",
                    filePath,
                );
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

    async unlinkDayPlanner(message?: string) {
        try {
            const notePath = this.settings.activePlan.notePath;

            this.settings.activePlan = {};
            await this.save();

            this.statusBar?.hideAll();
            this.updateTimelineView(new PlanSummaryData([], this.isWriter()));

            if (message) {
                new Notice(message);
            } else if (notePath) {
                new Notice(`Day Planner unlinked from ${notePath}`);
            }
        } catch (error) {
            console.error(error);
        }
    }

    async save() {
        await this.saveData(this.settings);
    }

    codeMirror = (_file: TAbstractFile) => {
        if (this.settings.activePlan.notePath) {
            this.plannerMD?.checkIsDayPlannerEditing(
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
            return file?.path || "";
        }
        return "";
    }
}
