export interface TimelineColorScheme {
    lineColor: string;
    nowLineColor: string;
    nowLineTextColor: string;
    timelineColorBegin: string;
    timelineColorEnd: string;
    timelineHoverColorBegin: string;
    timelineHoverColorEnd: string;
    timelineTextColor: string;
}

export interface TimelineColorSettings {
    light: TimelineColorScheme;
    dark: TimelineColorScheme;
}

export const DEFAULT_TIMELINE_COLOR_SCHEME: TimelineColorScheme = {
    lineColor: "#CAD5CA",
    nowLineColor: "#8b0000",
    nowLineTextColor: "#ffffff",
    timelineColorBegin: "#008183",
    timelineColorEnd: "#4d194d",
    timelineHoverColorBegin: "#83003f",
    timelineHoverColorEnd: "#5d0e2e",
    timelineTextColor: "#ffffff",
};

function defaultTimelineColorScheme(): TimelineColorScheme {
    return {
        ...DEFAULT_TIMELINE_COLOR_SCHEME,
    };
}

export function createDefaultTimelineColorSettings(): TimelineColorSettings {
    return {
        light: defaultTimelineColorScheme(),
        dark: defaultTimelineColorScheme(),
    };
}

export const TIMELINE_COLOR_KEYS: Array<keyof TimelineColorScheme> = [
    "lineColor",
    "nowLineColor",
    "nowLineTextColor",
    "timelineColorBegin",
    "timelineColorEnd",
    "timelineHoverColorBegin",
    "timelineHoverColorEnd",
    "timelineTextColor",
];

type LegacyTimelineColorKey =
    | "lineColor"
    | "timelineColorBegin"
    | "timelineColorEnd"
    | "timelineHoverColorBegin"
    | "timelineHoverColorEnd";

const legacyTimelineColorKeys: LegacyTimelineColorKey[] = [
    "lineColor",
    "timelineColorBegin",
    "timelineColorEnd",
    "timelineHoverColorBegin",
    "timelineHoverColorEnd",
];

export function setTimelineColor(
    settings: DayPlannerSettings,
    key: keyof TimelineColorScheme,
    value: string,
): void {
    settings.timelineColors.light[key] = value;
    settings.timelineColors.dark[key] = value;
}

export function copyTimelineColorScheme(settings: DayPlannerSettings): void {
    settings.timelineColors.dark = {
        ...DEFAULT_TIMELINE_COLOR_SCHEME,
        ...settings.timelineColors.light,
    };
}

export function resetTimelineColorSchemes(
    settings: DayPlannerSettings,
    defaults: TimelineColorScheme,
): void {
    for (const key of TIMELINE_COLOR_KEYS) {
        setTimelineColor(settings, key, defaults[key]);
    }
}

export function migrateTimelineColors(
    settings: DayPlannerSettings,
    defaults: TimelineColorScheme,
): boolean {
    const legacySettings = settings as DayPlannerSettings &
        Partial<Record<LegacyTimelineColorKey, string>>;
    const hasLegacyColors = legacyTimelineColorKeys.some(
        (key) => legacySettings[key] !== undefined,
    );

    if (!hasLegacyColors) {
        return false;
    }

    if (!settings.timelineColors) {
        settings.timelineColors = createDefaultTimelineColorSettings();
    }

    for (const key of legacyTimelineColorKeys) {
        const value = legacySettings[key] || defaults[key];
        settings.timelineColors.light[key] = value;
        settings.timelineColors.dark[key] = value;
        delete legacySettings[key];
    }

    return true;
}

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
    writer?: string = undefined;
    preserveValues = "-";
    hideTimelineValues = "";
    timelineColorBegin?: string;
    timelineColorEnd?: string;
    timelineHoverColorBegin?: string;
    timelineHoverColorEnd?: string;
    lineColor?: string;
    timelineColors: TimelineColorSettings =
        createDefaultTimelineColorSettings();
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

export function migrateSettings(
    settings: DayPlannerSettings,
    defaults: TimelineColorScheme,
): boolean {
    const activePlanChanged = migrateToActivePlan(settings as OldSettings);
    const timelineColorsChanged = migrateTimelineColors(settings, defaults);
    return activePlanChanged || timelineColorsChanged;
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
