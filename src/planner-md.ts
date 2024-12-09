import { MarkdownView, type Workspace } from "obsidian";
import { DAY_PLANNER_DEFAULT_CONTENT } from "./constants";
import type DayPlannerFile from "./file";
import type Parser from "./parser";
import { PlanSummaryData } from "./plan-data";
import type Progress from "./progress";
import { type DayPlannerSettings, NoteForDateQuery } from "./settings";

export default class PlannerMarkdown {
    workspace: Workspace;
    dayPlannerLastEdit: number;
    settings: DayPlannerSettings;
    file: DayPlannerFile;
    parser: Parser;
    progress: Progress;
    noteForDateQuery: NoteForDateQuery;

    constructor(
        workspace: Workspace,
        settings: DayPlannerSettings,
        file: DayPlannerFile,
        parser: Parser,
        progress: Progress,
    ) {
        this.workspace = workspace;
        this.settings = settings;
        this.file = file;
        this.parser = parser;
        this.progress = progress;
        this.noteForDateQuery = new NoteForDateQuery();
    }

    async insertPlanner() {
        const filePath = this.file.todayPlannerFilePath();
        const view = this.workspace.getActiveViewOfType(MarkdownView);
        const currentLine = view.editor.getCursor().line;
        await this.file.processFile(filePath, (content) => {
            const split = content.split("\n");
            const insertResult = [
                ...split.slice(0, currentLine),
                ...DAY_PLANNER_DEFAULT_CONTENT.split("\n"),
                ...split.slice(currentLine),
            ];
            return insertResult.join("\n");
        });
    }

    // Combine parse and update in a single function (lock file once.)
    async processDayPlanner(iAmWriter: boolean): Promise<PlanSummaryData> {
        try {
            await this.file.prepareFile();
            const filePath = this.file.todayPlannerFilePath();
            const summary = new PlanSummaryData([], iAmWriter);
            const now = new Date();

            // Read and update file contents
            await this.file.processFile(filePath, (content) =>
                this.parser.parseContent(content, summary, now),
            );

            return summary;
        } catch (error) {
            console.log(error);
        }
    }

    checkIsDayPlannerEditing() {
        const view = this.workspace.getActiveViewOfType(MarkdownView);
        if (view == null) {
            return;
        }
        const viewState = view.getState();
        const path = this.file.todayPlannerFilePath();
        if (path && viewState.file === path) {
            this.dayPlannerLastEdit = new Date().getTime();
        }
    }
}
