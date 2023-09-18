# Day Planner (OG)

This is a fork of the early Obsidian Day Planner plugin written by [James Lynch](https://github.com/lynchjames). 

The [Day Planner Plugin](https://github.com/ivan-lednev/obsidian-day-planner) as it has evolved brings new features like drag-and-drop task creation and a weekly view, etc.

This plugin (OG) retains the function and flavor of the original, while keeping up to date with dependencies and API changes. I have hidden the Mermaid Gantt chart function, as the most wobbly. If you need this capability, we can work together to get that stabilized.

## This plugin will change your notes

The Day Planner plugin manages pomodoro timers from a task list in a Markdown note. 

> When day planner is associated with a note and "Complete past planner items" is enabled, Day planner will update the contents of that note.

This may cause issues if you have the plugin (and that setting) enabled on multiple active devices with sync functionality (of any kind). To avoid this issue, I usually have Day Planner active only one device (e.g. my Desktop). That one device updates the time, and the sync utility handles forwarding and merging the updates to other devices.

**Please try the plugin in a test vault first, and, most importantly, make sure you have your notes backed up in cloud storage or Git.**
    
## Features

- Generate a day planner for you each day or create a day planner in any note you choose.
- Status bar updates on progress with information on your current and next tasks. You can click on the status bar to access the note for today's day planner.
- Timeline view showing your tasks laid out on a vertical timeline.

![Day Planner Demo Image](https://raw.githubusercontent.com/ebullient/obsidian-day-planner-og/main/images/day-planner-note-preview.png)

## Usage

Once installed, the plugin will create a folder called Day Planners in the root of your vault. A note for today will automatically be created with the file name format `Day Planners/Day Planner-YYYYMMDD.md`.

You can choose to use the [Command Mode](#day-planner-mode) instead to add a Day Planner for the current day to any note.

### Day Planner Note

Within the note, you can create a check list with times and tasks which will be automatically be tracked during the day. You can now include headings and other content between tasks. Here is an example:

```markdown
## Day Planner

This is my plan for the day broken into 3 main sections:
1. Morning Prep
2. Reading
3. Afternoon Review

### Morning Prep

This is where I get ready for work and do my usual prep.

- [ ] 09:30 Setup for work
- [ ] 09:45 Review notes from yesterday
- [ ] 10:30 Create new notes for #article review
- [ ] 11:30 BREAK

### Reading

A section of the day dedicated to reading:

1. Articles.
2. Book chapters assigned for the day.
3. Re-reading past notes.
   
- [ ] 12:00 Reading
  - [ ] Article 1
  - [ ] Article 2
  - [ ] Article notes review
- [ ] 12:25 BREAK
- [ ] 12:30 Reading
- [ ] 14:00 BREAK

### Afternoon Review

I use this time to review what I have done earlier in the day and complete any tasks to prepare for the next day.

- [ ] 15:00 Review notes and update daily note [[20201103]]
- [ ] 15:45 Walk
- [ ] 16:30 Reading
- [ ] 17:20 Prep for tomorrow's meetings
- [ ] 18:00 END
```

This is also provided as a file in [day-planner-example.md](https://github.com/lynchjames/obsidian-day-planner/blob/main/examples/day-planner-example.md).

The Day Planner heading and `---` rule are used to identify the extent of the Day Planner. A heading must be used but can be `#`, `##`, `###` or `####`.

The format of the task list items is important as this is what is used to calculate the times of each task and the intervals between tasks. The format used should be:

 `- [ ] HH:mm Task text` 
 
 **24 hour times should be used.** 

 Nested checklist items or bullets are now also supported to capture sub-tasks of a timed task. Timed tasks must be at the top level of the checkbox list.

 `BREAK` and `END` are keywords that define breaks and the end to the time tracking for the tasks. They are not case sensitive so `break` and `end` can also be used. Both `BREAK` and `END` keywords are configurable and can be customized in Day Planner settings tab.

 `END` is used as an item with a time to give an accurate time interval for the last task, *"Prep for tomorrow's meetings"* at 17:00 in this example.

 The note will update automatically: tasks in the past will be checked and marked as complete.

Using the example above, at 14:30 the note would have automatically updated to:

```markdown
## Day Planner

This is my plan for the day broken into 3 main sections:
1. Morning Prep
2. Reading
3. Afternoon Review

### Morning Prep

This is where I get ready for work and do my usual prep.

- [x] 09:30 Setup for work
- [x] 09:45 Review notes from yesterday
- [x] 10:30 Create new notes for #article review
- [x] 11:30 BREAK

### Reading

A section of the day dedicated to reading:

1. Articles.
2. Book chapters assigned for the day.
3. Re-reading past notes.
   
- [x] 12:00 Reading
  - [ ] Article 1
  - [ ] Article 2
  - [ ] Article notes review
- [x] 12:25 BREAK
- [x] 12:30 Reading
- [ ] 14:00 BREAK

### Afternoon Review

I use this time to review what I have done earlier in the day and complete any tasks to prepare for the next day.

- [ ] 15:00 Review notes and update daily note [[20201103]]
- [ ] 15:45 Walk
- [ ] 16:30 Reading
- [ ] 17:20 Prep for tomorrow's meetings
- [ ] 18:00 END
```

### Timeline View

The `Show the Day Planner Timeline` command can be used to add a vertical timeline view display the tasks for today's Day Planner with a line showing the current time.

![Day Planner Timeline](https://raw.githubusercontent.com/ebullient/obsidian-day-planner-og/main/images/day-planner-timeline.png)

### Status Bar

The status bar in Obsidian will also show the current progress on the task or break with the time remaining. Clicking on the status bar item will take you to the Day Planner note.

#### Task Status

The status displayed when there is an active task:

![Task Status](https://raw.githubusercontent.com/ebullient/obsidian-day-planner-og/main/images/task-status.png)

#### Break Status

The status displayed during a break:

![Break Status](https://raw.githubusercontent.com/ebullient/obsidian-day-planner-og/main/images/break-status.png)

#### End Status

The status displayed when the end of the tasks is reached:

![End Status](https://raw.githubusercontent.com/ebullient/obsidian-day-planner-og/main/images/end-status.png)

## Configuration

### Day Planner Mode

There are 2 modes to use the Day Planner plugin:

**File mode**

The plugin automatically generates day planner notes for each day within a Day Planners folder.

**Command mode**

Commands are used to insert a Day Planner for today within any note as well as unlinking the Day Planner for today from its current note.

>Note: To add the Day Planner to the current note you first need to Link the Day Planner to the current note by running either one of the commands "Day Planner: Link today's Day Planner to the current Note" or "Day Planner: Add a Day Planner template for today to the current note" from the command palette.

The Day Planner can be placed anywhere within a note as long as the format provided is used. Only the Day Planner section of the note will be updated as time progresses.

**Daily mode**

The plugin automatically looks for the day planner in daily notes. The Daily notes plugin must be enabled.

### Complete Past Planner Items

You can choose whether the plugin will automatically mark planner items in the past as complete or allow you to tick them off yourself.

### Status Bar - Circular Progress

You can choose to display progress in the status bar with a circular pie chart progress bar to save horizontal space.

![Circular Progress Bar](https://raw.githubusercontent.com/ebullient/obsidian-day-planner-og/main/images/circular-progress.png)

### Status Bar - Now and Next

You can choose to display the time and start of the text for the current and next task.

![Now and Next](https://raw.githubusercontent.com/ebullient/obsidian-day-planner-og/main/images/now-and-next.png)

### Task Notification

You can choose to have an in-app notification display when a new task starts.

### Timeline Zoom Level

This is the zoom level to dispaly the timeline. The higher the number, the more vertical space each task will take up.

## Commands

Using the plugin in command mode, 2 commands are available to link and unlink a Day Planner.

![Plugin Commands](https://raw.githubusercontent.com/ebullient/obsidian-day-planner-og/main/images/commands.png)

## Installing

SOON: This version of the plugin is not yet listed as a Community Plugin.

### Preview with Beta Reviewers Auto-update Tester (BRAT)

1. Install BRAT
    1. Open `Settings` -> `Community Plugins`
    2. Disable safe mode
    3. *Browse*, and search for "BRAT" 
    4. Install the latest version of **Obsidian 42 - BRAT**
2. Open BRAT settings (`Settings` -> `Obsidian 42 - BRAT`)
    1. Scroll to the `Beta Plugin List` section
    2. `Add Beta Plugin`
    3. Specify this repository: `ebullient/obsidian-day-planner-og`
3. Enable the plugin (`Settings` -> `Community Plugins`)

## Manual installation

1. Download the [latest release](https://github.com/ebullient/obsidian-day-planner-og/releases/latest)
2. Extract the obsidian-day-planner-og folder from the zip to your vault's plugins folder: `<vault>/.obsidian/plugins/`  
Note: On some machines the `.obsidian` folder may be hidden. On MacOS you should be able to press `Command+Shift+Dot` to show the folder in Finder.
3. Reload Obsidian
4. If prompted about Safe Mode, you can disable safe mode and enable the plugin.
5. Enable the plugin (`Settings` -> `Community Plugins`)

## For developers

Pull requests are both welcome and appreciated. 😀

If you would like to contribute to the development of this plugin, please follow the guidelines provided in [CONTRIBUTING.md](CONTRIBUTING.md).

