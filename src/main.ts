import {
  Plugin,
  TAbstractFile,
  Vault,
  WorkspaceLeaf,
  debounce
} from 'obsidian';
import { DayPlannerSettingsTab } from './settings-tab';
import { DayPlannerSettings, DayPlannerMode, NoteForDate, NoteForDateQuery } from './settings';
import StatusBar from './status-bar';
import Progress from './progress';
import PlannerMarkdown from './planner-md';
import DayPlannerFile from './file';
import Parser from './parser';
import { VIEW_TYPE_TIMELINE } from './constants';
import TimelineView from './timeline-view';
import { PlanSummaryData } from './plan-data';
import { appHasDailyNotesPluginLoaded } from 'obsidian-daily-notes-interface';


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
          on(name: "status-change", callback: () => any): EventRef;
        };
      };
    };
  }
  interface Plugin {
    onConfigFileChange: () => void;
    handleConfigFileChange(): Promise<void>;
  }
}

export default class DayPlanner extends Plugin {
  settings: DayPlannerSettings;
  device: string;
  vault: Vault;
  file: DayPlannerFile;
  plannerMD: PlannerMarkdown;
  parser: Parser;
  statusBar: StatusBar;
  notesForDatesQuery: NoteForDateQuery;
  timelineView: TimelineView;
  interval: number;

  get syncPlugin() {
    return this.app.internalPlugins.getPluginById("sync");
  }

  async onload() {
    console.log("Loading Day Planner plugin v" + this.manifest.version);
    this.vault = this.app.vault;
    this.settings = Object.assign(new DayPlannerSettings(), await this.loadData());
    this.notesForDatesQuery = new NoteForDateQuery();
    this.file = new DayPlannerFile(this.vault, this.settings);

    const syncEnabled = this.syncPlugin?.instance != undefined;
    this.device = syncEnabled
      ? (this.syncPlugin.instance.deviceName.length > 0
        ? this.syncPlugin.instance.deviceName
        : this.syncPlugin.instance.getDefaultDeviceName())
      : "Unknown";
    console.debug("DPOG: Device/Writer:", this.settings.mode, this.device, this.settings.writer, this.isWriter());

    const progress = new Progress();
    this.parser = new Parser(this.settings);
    this.plannerMD = new PlannerMarkdown(this.app.workspace, this.settings, this.file, this.parser, progress);

    this.statusBar = new StatusBar(
      this.settings,
      this.addStatusBarItem(),
      this.app.workspace,
      progress,
      new PlannerMarkdown(this.app.workspace, this.settings, this.file, this.parser, progress),
      this.file
    );
    this.statusBar.initStatusBar();
    this.registerEvent(this.app.vault.on('modify', this.codeMirror, ''));

    this.addCommand({
      id: 'app:add-to-note',
      name: 'Add a Day Planner template for today to the current note',
      callback: () => this.modeGuard(async () => await this.insertDayPlannerIntoCurrentNote(true)),
      hotkeys: []
    });

    this.addCommand({
      id: 'app:link-to-note',
      name: 'Link today\'s Day Planner to the current note',
      callback: () => this.modeGuard(async () => await this.insertDayPlannerIntoCurrentNote(false)),
      hotkeys: []
    });

    this.addCommand({
      id: 'app:unlink-from-note',
      name: 'Unlink today\'s Day Planner from its note',
      callback: () => this.modeGuard(async () => await this.unlinkDayPlanner()),
      hotkeys: []
    });

    this.addCommand({
      id: 'app:show-timeline',
      name: 'Show the Day Planner Timeline',
      callback: () => this.initLeaf(),
      hotkeys: []
    });

    this.addCommand({
      id: 'app:show-today-note',
      name: 'Show today\'s Day Planner',
      callback: () => this.app.workspace.openLinkText(this.file.todayPlannerFilePath(), '', true),
      hotkeys: []
    });

    this.addCommand({
      id: 'app:set-as-writer',
      name: `Set current device '${this.device}' as writer`,
      callback: async () => {
        this.settings.writer = this.device;
        this.save();
      },
      hotkeys: []
    });

    this.registerView(
      VIEW_TYPE_TIMELINE,
      (leaf: WorkspaceLeaf) =>
        (this.timelineView = new TimelineView(leaf, this.settings))
    );

    this.addSettingTab(new DayPlannerSettingsTab(this.app, this));
    this.setTicker();
  }

  async onunload() {
    if (this.interval) {
      console.debug("DPOG: Clearing ticker");
      window.clearInterval(this.interval);
    }
  }

  async handleConfigFileChange() {
    await super.handleConfigFileChange();
    this.settings = Object.assign(this.settings, await this.loadData());
    this.parser.updateSettings(this.settings);
    const hasNote = await this.file.hasTodayNote();
    console.log("DPOG: update Device/Writer:", this.settings.mode, this.device, this.settings.writer, this.isWriter(), hasNote);
  }

  isWriter(): boolean {
    return this.device === "Unknown" || !this.settings.writer
      || this.settings.writer === this.device;
  }

  setTicker() {
    if (this.interval) {
      console.debug("DPOG: Clearing ticker");
      window.clearInterval(this.interval);
      this.interval = undefined;
    }
    console.log("DPOG: set Ticker with Device/Writer:", this.device, this.settings.writer, this.isWriter());
    this.interval = window.setInterval(() => this.tick(), 2000);
  }

  async tick() {
    try {
      if (await this.file.hasTodayNote()) {
        // console.debug('DPOG: Active note found, starting file processing')
        const planSummary = await this.plannerMD.processDayPlanner(this.isWriter());
        await this.statusBar.refreshStatusBar(planSummary)
        this.timelineView && this.timelineView.update(planSummary);
      } else if (this.settings.mode == DayPlannerMode.Daily && appHasDailyNotesPluginLoaded()) {
        // console.debug('DPOG: Clearing status bar & timeline in case daily note was deleted')
        const planSummary = new PlanSummaryData([], this.isWriter());
        await this.statusBar.refreshStatusBar(planSummary)
        this.timelineView && this.timelineView.update(planSummary);
      } else {
        // console.debug('DPOG: No active note, skipping file processing')
      }
    } catch (error) {
      console.log(error);
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

  modeGuard(command: () => any): void {
    if (this.settings.mode !== DayPlannerMode.Command) {
      new Notification('Day Planner plugin in File mode', { silent: true, body: 'Switch to Command mode in settings to use this command' });
      return;
    } else {
      command();
    }
  }

  async insertDayPlannerIntoCurrentNote(insertTemplate: boolean) {
    try {
      const view = this.app.workspace.activeLeaf.view;
      const filePath = view.getState().file;
      const dayPlannerExists = this.notesForDatesQuery.exists(this.settings.notesToDates);
      const activeDayPlannerPath = this.notesForDatesQuery.active(this.settings.notesToDates)?.notePath;

      this.settings.notesToDates = this.settings.notesToDates || [];
      if (dayPlannerExists && activeDayPlannerPath !== filePath) {
        new Notification('Day Planner exists', { silent: true, body: `A Day Planner for today already exists in ${activeDayPlannerPath}` });
        return;
      } else if (!dayPlannerExists) {
        this.settings.notesToDates = [new NoteForDate(filePath, new Date().toDateString())];
      } else if (!this.settings.notesToDates) {
        this.settings.notesToDates = [];
      }
      await this.save();

      if (insertTemplate) {
        this.plannerMD.insertPlanner();
      }
    } catch (error) {
      console.error(error);
    }
  }

  async unlinkDayPlanner() {
    try {
      const activePlanner = this.notesForDatesQuery.active(this.settings.notesToDates);
      if (!activePlanner) {
        new Notification('No Day Planner found', { silent: true, body: 'No Day Planner found for today' });
        return;
      }
      this.settings.notesToDates = this.settings.notesToDates || [];
      this.settings.notesToDates.remove(activePlanner);
      await this.save();

      this.statusBar.hide(this.statusBar.statusBar);
      this.timelineView && this.timelineView.update(new PlanSummaryData([], this.isWriter()));
      new Notification('Day Planner reset',
        { silent: true, body: `The Day Planner for today has been dissociated from ${activePlanner.notePath} and can be added to another note` });
    } catch (error) {
      console.error(error);
    }
  }

  async save() {
    await this.saveData(this.settings);
  }

  codeMirror = (file: TAbstractFile) => {
    if (this.file.hasTodayNote()) {
      // console.log('Active note found, starting CodeMirror monitoring')
      this.plannerMD.checkIsDayPlannerEditing();
    } else {
      // console.log('No active note, skipping CodeMirror monitoring')
    }
  }
}