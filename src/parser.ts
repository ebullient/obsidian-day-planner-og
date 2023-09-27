import { PlanItem, PlanItemFactory, PlanSummaryData } from './plan-data';
import type { DayPlannerSettings } from './settings';

export default class Parser {
    private planItemFactory: PlanItemFactory;
    private PLAN_PARSER_REGEX: RegExp;
    private settings: DayPlannerSettings;

    constructor(settings: DayPlannerSettings) {
        this.settings = settings;
        this.planItemFactory = new PlanItemFactory(settings);
        // do not include break/end in the regex match. Keep it simple
        this.PLAN_PARSER_REGEX = new RegExp('^(-?[\\s]*\\[?(?<completion>.)\\]\\s*?(?<hours>\\d{1,2}):(?<minutes>\\d{2})\\s(?<text>.*?))$', 'i');
    }

    parseContent(content: string, summary: PlanSummaryData, now: Date) {
        let inDayPlanner = false
        const split = content.split('\n');
        split.forEach((line, i) => {
            if (line.length == 0) {
                return;
            }
            if (inDayPlanner) {
                if (line == '---') {
                    inDayPlanner = false;
                    return;
                }
                const item = this.parseLine(i, line);
                if (item) {
                    summary.addItem(item);
                    inDayPlanner = !item.isEnd;
                }
            } else if (line.endsWith('# Day Planner')) {
                inDayPlanner = true;
            }
        });

        summary.calculate(now);

        if (!summary.empty && summary.iAmWriter) {
            summary.items.forEach((item) => {
                const result = this.updateItemCompletion(item, summary);
                split[item.line] = result;
            });
        }
        return split.join('\n');
    }

    parseLine(index: number, line: string): PlanItem | undefined {
        try {
            const match = this.PLAN_PARSER_REGEX.exec(line);
            if (match) {
                // console.log(match);
                const value = match;
                const text = value.groups.text;
                const isBreak = this.startsWith(text, this.settings.breakLabel);
                const isEnd = this.startsWith(text, this.settings.endLabel);
                const time = new Date();
                time.setHours(parseInt(value.groups.hours))
                time.setMinutes(parseInt(value.groups.minutes))
                time.setSeconds(0);

                return this.planItemFactory.getPlanItem(
                    index,
                    value.index,
                    value.groups.completion,
                    isBreak,
                    isEnd,
                    time,
                    `${value.groups.hours.padStart(2, '0')}:${value.groups.minutes}`,
                    text,
                    value[0]
                );
            }
        } catch (error) {
            console.log(error);
        }
    }

    private updateItemCompletion(item: PlanItem, summary: PlanSummaryData) {
        let check = item.status; // input status
        if (this.settings.completePastItems) {
            if (item.isPast) {
                check = check == '-' ? '-' : 'x'; // allow cancelled
            } else if (this.settings.markCurrent && summary.isCurrent(item)) {
                check = '/';
            } else {
                check = ' ';
            }
        }

        return `- [${check}] ${item.rawTime} ${item.text}`;
    }

    private startsWith(input: any, match: string): boolean {
        return input?.trim().toUpperCase().startsWith(match.toUpperCase());
    }
}
