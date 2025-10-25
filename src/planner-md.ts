import { MarkdownView, type Workspace } from "obsidian";
import { DAY_PLANNER_DEFAULT_CONTENT } from "./constants";
import type DayPlannerFile from "./file";
import Logger from "./logger";
import type Parser from "./parser";
import { PlanSummaryData } from "./plan-data";
import type Progress from "./progress";
import type { ActiveConfig } from "./settings";

export default class PlannerMarkdown {
    workspace: Workspace;
    dayPlannerLastEdit: number;
    config: ActiveConfig;
    file: DayPlannerFile;
    parser: Parser;
    progress: Progress;

    constructor(
        workspace: Workspace,
        config: ActiveConfig,
        file: DayPlannerFile,
        parser: Parser,
        progress: Progress,
    ) {
        this.workspace = workspace;
        this.config = config;
        this.file = file;
        this.parser = parser;
        this.progress = progress;
    }

    async insertPlanner(filePath: string) {
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
    async processDayPlanner(
        iAmWriter: boolean,
        filePath: string,
    ): Promise<PlanSummaryData> {
        try {
            const summary = new PlanSummaryData([], iAmWriter);
            const now = new Date();

            // Read and update file contents
            await this.file.processFile(filePath, (content) =>
                this.parser.parseContent(content, summary, now),
            );

            return summary;
        } catch (error) {
            Logger.getInstance().logError(
                "error processing file",
                iAmWriter,
                filePath,
                this.file,
                error,
            );
        }
    }

    checkIsDayPlannerEditing(path: string) {
        const view = this.workspace.getActiveViewOfType(MarkdownView);
        if (view == null) {
            return;
        }
        const viewState = view.getState();
        if (path && viewState.file === path) {
            this.dayPlannerLastEdit = Date.now();
        }
    }
}
