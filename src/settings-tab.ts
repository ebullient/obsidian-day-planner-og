import {
  App,
  PluginSettingTab,
  Setting
} from 'obsidian';
import { DayPlannerMode } from './settings';
import MomentDateRegex from './moment-date-regex';
import type DayPlanner from './main';
import { ICONS } from './constants';

export class DayPlannerSettingsTab extends PluginSettingTab {
  momentDateRegex = new MomentDateRegex();
  plugin: DayPlanner;
  constructor(app: App, plugin: DayPlanner) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Day Planner mode')
      .setDesc(this.modeDescriptionContent())
      .addDropdown(dropDown =>
        dropDown
          .addOption(DayPlannerMode[DayPlannerMode.File], "File mode")
          .addOption(DayPlannerMode[DayPlannerMode.Command], "Command mode")
          .addOption(DayPlannerMode[DayPlannerMode.Daily], "Daily mode")
          .setValue(DayPlannerMode[this.plugin.settings.mode] || DayPlannerMode.File.toString())
          .onChange((value: string) => {
            this.plugin.settings.mode = DayPlannerMode[value as keyof typeof DayPlannerMode];
            this.plugin.saveData(this.plugin.settings);
          }));

    new Setting(containerEl)
      .setName('Complete past planner items')
      .setDesc('The plugin will automatically mark checkboxes for tasks and breaks in the past as complete (x)')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.completePastItems)
          .onChange((value: boolean) => {
            this.plugin.settings.completePastItems = value;
            this.plugin.saveData(this.plugin.settings);
          }));

    new Setting(containerEl)
      .setName('Mark in progress planner item')
      .setDesc('The plugin will automatically mark the textbox for the current item as in progress (/)')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.markCurrent)
          .onChange((value: boolean) => {
            this.plugin.settings.markCurrent = value;
            this.plugin.saveData(this.plugin.settings);
          }));

    new Setting(containerEl)
      .setName('Status bar - circular progress')
      .setDesc('Display a circular progress bar in the status bar')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.circularProgress)
          .onChange((value: boolean) => {
            this.plugin.settings.circularProgress = value;
            this.plugin.saveData(this.plugin.settings);
          }));

    new Setting(containerEl)
      .setName('Status bar - now and next')
      .setDesc('Display now and next tasks in the status bar')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.nowAndNextInStatusBar)
          .onChange((value: boolean) => {
            this.plugin.settings.nowAndNextInStatusBar = value;
            this.plugin.saveData(this.plugin.settings);
          }));

    new Setting(containerEl)
      .setName('Task notification')
      .setDesc('Display a notification when a new task is started')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.showTaskNotification)
          .onChange((value: boolean) => {
            this.plugin.settings.showTaskNotification = value;
            this.plugin.saveData(this.plugin.settings);
          }));

    new Setting(containerEl)
      .setName('Timeline zoom level')
      .setDesc('The zoom level to display the timeline. The higher the number, the more vertical space each task will take up.')
      .addSlider(slider =>
        slider
          .setLimits(1, 5, 1)
          .setValue(this.plugin.settings.timelineZoomLevel ?? 4)
          .setDynamicTooltip()
          .onChange((value: number) => {
            this.plugin.settings.timelineZoomLevel = value;
            this.plugin.saveData(this.plugin.settings);
          }));

    new Setting(containerEl)
      .setName('Timeline icon')
      .setDesc('The icon of the timeline pane. Reopen timeline pane or restart obsidian to see the change.')
      .addDropdown(dropdown => {
        ICONS.forEach(icon => dropdown.addOption(icon, icon));
        return dropdown
          .setValue(this.plugin.settings.timelineIcon ?? 'calendar-with-checkmark')
          .onChange((value: string) => {
            this.plugin.settings.timelineIcon = value;
            this.plugin.saveData(this.plugin.settings);
          });
      });

    new Setting(containerEl)
      .setName('Day Planner heading')
      .setDesc('Use this heading text to mark the beginning of the Day Planner.')
      .addText(component =>
        component
          .setValue(this.plugin.settings.plannerLabel ?? "Day Planner")
          .onChange((value: string) => {
            value = value.trim();
            if (value.length > 0) {
              this.plugin.settings.plannerLabel = value
              this.plugin.saveData(this.plugin.settings);
            }
          }));


    new Setting(containerEl)
      .setName('BREAK task label')
      .setDesc('Use this label to mark break between tasks.')
      .addText(component =>
        component
          .setValue(this.plugin.settings.breakLabel ?? "BREAK")
          .onChange((value: string) => {
            this.plugin.settings.breakLabel = value
            this.plugin.saveData(this.plugin.settings);
          }));

    new Setting(containerEl)
      .setName('END task label')
      .setDesc('Use this label to mark the end of all tasks.')
      .addText(component =>
        component
          .setValue(this.plugin.settings.endLabel ?? "END")
          .onChange((value: string) => {
            this.plugin.settings.endLabel = value
            this.plugin.saveData(this.plugin.settings);
          }));


    new Setting(containerEl)
      .setName('Consistent BREAK and END labels')
      .setDesc('Replace BREAK and END task text in your planner with the configured label text (consistency)')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.correctLabels)
          .onChange((value: boolean) => {
            this.plugin.settings.correctLabels = value;
            this.plugin.saveData(this.plugin.settings);
          }));

    new Setting(containerEl)
          .setName('Preserve task values')
          .setDesc("Preserve these values in the schedule, for example '-' for canceled, or '>' for rescheduled.")
          .addText(component =>
            component
              .setValue(this.plugin.settings.preserveValues || "-")
              .onChange((value: string) => {
                if (value.length > 0) {
                    // remove duplicates
                    value = [...new Set(value)].join("").replace('x', "");
                }
                this.plugin.settings.preserveValues = value;
              }));
  }

  private modeDescriptionContent(): DocumentFragment {
    const descEl = document.createDocumentFragment();
    descEl.appendText('Choose between 3 modes to use the Day Planner plugin:');
    descEl.appendChild(document.createElement('br'));
    descEl.appendChild(document.createElement('strong')).appendText('File mode');
    descEl.appendChild(document.createElement('br'));
    descEl.appendText('Plugin automatically generates day planner notes for each day within a Day Planners folder.');
    descEl.appendChild(document.createElement('br'));
    descEl.appendChild(document.createElement('strong')).appendText('Command mode');
    descEl.appendChild(document.createElement('br'));
    descEl.appendText('Command used to insert a Day Planner for today within the current note.');
    descEl.appendChild(document.createElement('br'));
    descEl.appendChild(document.createElement('strong')).appendText('Daily mode');
    descEl.appendChild(document.createElement('br'));
    descEl.appendText('Plugin automatically links to the current daily note. Daily notes plugin must be enabled.');
    descEl.appendChild(document.createElement('br'));
    this.addDocsLink(descEl);
    return descEl;
  }

  private addDocsLink(descEl: DocumentFragment) {
    const a = document.createElement('a');
    a.href = 'https://github.com/ebullient/obsidian-day-planner-og/blob/main/README.md';
    a.text = 'plugin README';
    a.target = '_blank';
    descEl.appendChild(a);
    descEl.appendChild(document.createElement('br'));
  }
}
