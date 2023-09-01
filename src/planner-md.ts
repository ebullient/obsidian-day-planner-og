import { MarkdownView, Workspace } from 'obsidian';
import { DAY_PLANNER_DEFAULT_CONTENT } from './constants';
import type DayPlannerFile from './file';
import type Parser from './parser';
import type { PlanItem, PlanSummaryData } from './plan-data';
import type Progress from './progress';
import { DayPlannerSettings, NoteForDateQuery} from './settings';

export default class PlannerMarkdown {
    workspace: Workspace;
    dayPlannerLastEdit: number;
    settings: DayPlannerSettings;
    file: DayPlannerFile;
    parser: Parser;
    progress: Progress;
    noteForDateQuery: NoteForDateQuery;
    
    constructor(workspace: Workspace, settings: DayPlannerSettings, file: DayPlannerFile, parser: Parser, progress: Progress){
        this.workspace = workspace;
        this.settings = settings;
        this.file = file;
        this.parser = parser;
        this.progress = progress;
        this.noteForDateQuery = new NoteForDateQuery();
    }
    
    async insertPlanner() {
        const filePath = this.file.todayPlannerFilePath();
        const fileContents = (await this.file.getFileContents(filePath)).split('\n');
        const view = this.workspace.getActiveViewOfType(MarkdownView);
        const currentLine = view.editor.getCursor().line;
        const insertResult = [...fileContents.slice(0, currentLine), ...DAY_PLANNER_DEFAULT_CONTENT.split('\n'), ...fileContents.slice(currentLine)];
        this.file.updateFile(filePath, insertResult.join('\n'));
    }

    async parseDayPlanner():Promise<PlanSummaryData> {
        try {
            const filePath = this.file.todayPlannerFilePath();
            const fileContent = (await this.file.getFileContents(filePath)).split('\n');

            const planData = await this.parser.parseMarkdown(fileContent);
            return planData;
        } catch (error) {
            console.log(error)
        }
    }
    
    async updateDayPlannerMarkdown(planSummary: PlanSummaryData) {
        if((this.dayPlannerLastEdit + 6000) > new Date().getTime()) {
            return;
        }
        try {
            const filePath = this.file.todayPlannerFilePath();
            const fileContents = (await this.file.getFileContents(filePath));
            const fileContentsArr = fileContents.split('\n');

            planSummary.calculate();
            if(planSummary.empty){
                return;
            }
            const results = planSummary.items.map((item) => {
                const result = this.updateItemCompletion(item, item.isPast);
                return {index: item.matchIndex, replacement: result};
            });

            results.forEach(result => {
                fileContentsArr[result.index] = result.replacement;
            });

            const newContents = fileContentsArr.join('\n');
            if(fileContents !== newContents) {
                this.file.updateFile(filePath, newContents);
            }
        } catch (error) {
            console.log(error);
        }
    }

    private updateItemCompletion(item: PlanItem, complete: boolean) {
        let check = this.check(complete);
        //Override to use current (user inputted) state if plugin setting is enabled
        if(!this.settings.completePastItems) {
            check = this.check(item.isCompleted);
        }
        return `- [${check}] ${item.rawTime} ${item.text}`;
    }

    private check(check: boolean) {
        return check ? 'x' : ' ';
    }

    checkIsDayPlannerEditing(){
        const view = this.workspace.getActiveViewOfType(MarkdownView);
        if(view == null){
            return;
        }
        const viewState = view.getState();
        const path = this.file.todayPlannerFilePath();
        if(path && viewState.file === path){
            this.dayPlannerLastEdit = new Date().getTime();
        }
    }
}