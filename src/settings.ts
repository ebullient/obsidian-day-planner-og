export class DayPlannerSettings {
    customFolder = "Day Planners";
    mode: DayPlannerMode = DayPlannerMode.File;
    mermaid = false;
    notesToDates: NoteForDate[] = [];
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
    timelineColorBegin: string;
    timelineColorEnd: string;
    timelineHoverColorBegin: string;
    timelineHoverColorEnd: string;
    lineColor: string;
}
export class NoteForDate {
    notePath: string;
    date: string;

    constructor(notePath: string, date: string) {
        this.notePath = notePath;
        this.date = date;
    }
}

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
