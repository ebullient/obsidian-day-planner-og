export class DayPlannerSettings {
    customFolder = "Day Planners";
    debug = false;
    mode: DayPlannerMode = DayPlannerMode.File;
    mermaid = false;
    completePastItems = true;
    circularProgress = false;
    nowAndNextInStatusBar = false;
    showTaskNotification = false;
    timelineZoomLevel = 4;
    timelineIcon = "calendar-with-checkmark";
    plannerLabel = "Day Planner";
    breakLabel = "BREAK";
    endLabel = "END";
    markCurrent = false;
    correctLabels = true;
    writer: string = undefined;
    preserveValues = "-";
    hideTimelineValues = "";
    timelineColorBegin: string;
    timelineColorEnd: string;
    timelineHoverColorBegin: string;
    timelineHoverColorEnd: string;
    lineColor: string;
    autoResumeScroll = true;
    autoResumeScrollDelay = 3000;
    newDayStartsAt = 0;
    activePlan: ActivePlan = {};
}

export interface ActiveConfig {
    current(): DayPlannerSettings;
}

export interface ActivePlan {
    notePath?: string;
    anchorDate?: number;
}

export class OldSettings extends DayPlannerSettings {
    notesToDates?: NoteForDate[];
}

/**
 * Migrates old notesToDates format to new activePlan format.
 * Returns the migrated activePlan if old data exists, undefined otherwise.
 */
export function migrateToActivePlan(settings: OldSettings): boolean {
    if (!settings.notesToDates) {
        return false;
    }

    // Find active note for today (using old logic)
    const activeNote = new NoteForDateQuery().active(settings.notesToDates);
    if (activeNote) {
        // Convert old date string to anchor date with newDayStartsAt hour
        const oldDate = new Date(activeNote.date); // "Fri Oct 24 2025" → Date object
        const anchor = new Date(oldDate);
        anchor.setHours(settings.newDayStartsAt, 0, 0, 0);

        settings.activePlan = {
            notePath: activeNote.notePath,
            anchorDate: anchor.getTime(),
        };
    }

    // delete notesToDates, return true (Save)
    delete settings.notesToDates;
    return true;
}

// Deprecated
export class NoteForDate {
    notePath: string;
    date: string;

    constructor(notePath: string, date: string) {
        this.notePath = notePath;
        this.date = date;
    }
}

// Deprecated
export class NoteForDateQuery {
    exists(source: NoteForDate[]): boolean {
        return source && this.active(source) !== undefined;
    }

    active(source: NoteForDate[]): NoteForDate {
        const now = new Date().toDateString();
        return source?.filter((ntd) => ntd.date === now)[0];
    }
}

export enum DayPlannerMode {
    File = "File",
    Command = "Command",
    Daily = "Daily",
}
