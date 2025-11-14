import Logger from "./logger";
import {
    type PlanItem,
    PlanItemFactory,
    type PlanSummaryData,
} from "./plan-data";
import type { ActiveConfig } from "./settings";

export default class Parser {
    private planItemFactory: PlanItemFactory;
    private PLAN_PARSER_REGEX: RegExp;
    private config: ActiveConfig;
    private PLAN_START: string;
    private PLAN_END: RegExp;
    private PLAN_BREAK: RegExp;

    constructor(config: ActiveConfig) {
        this.config = config;
        this.planItemFactory = new PlanItemFactory(this.config);
        // do not include break/end in the regex match. Keep it simple
        this.PLAN_PARSER_REGEX =
            /^(-?[\s]*\[?(?<completion>.)\]\s*(?<prefix>.*?)(?<hours>\d{1,2}):(?<minutes>\d{2})\s(?<text>.*?))$/i;
        this.updateSettings();
    }

    public updateSettings() {
        const settings = this.config.current();
        this.PLAN_START = `# ${settings.plannerLabel}`;

        const breakSafe = this.sanitize(settings.breakLabel);
        this.PLAN_BREAK = new RegExp(`^${breakSafe}(?=\\b|$)`, "i");

        const endSafe = this.sanitize(settings.endLabel);
        this.PLAN_END = new RegExp(`^${endSafe}(?=\\b|$)`, "i");
    }

    sanitize(input: string): string {
        return input
            .replace(/\./g, "\\.") // escape literal .
            .replace(/\*/g, "\\*") // escape literal *
            .replace(/\(/g, "\\(") // escape literal (
            .replace(/\)/g, "\\)") // escape literal )
            .replace(/\[/g, "\\[") // escape literal [
            .replace(/\]/g, "\\]"); // escape literal ]
    }

    parseContent(content: string, summary: PlanSummaryData, now: Date) {
        let inDayPlanner = false;
        const split = content.split("\n");
        split.forEach((line, i) => {
            if (line.length === 0) {
                return;
            }
            if (inDayPlanner) {
                const item = this.parseLine(i, line);
                if (item) {
                    summary.addItem(item);
                    inDayPlanner = !item.isEnd;
                }
            } else if (line.trim().endsWith(this.PLAN_START)) {
                inDayPlanner = true;
            }
        });

        summary.calculate(now);

        if (!summary.empty && summary.iAmWriter) {
            for (const item of summary.items) {
                const result = this.updateItemCompletion(item, summary);
                split[item.line] = result;
            }
        }
        return split.join("\n");
    }

    parseLine(index: number, line: string): PlanItem | undefined {
        try {
            const match = this.PLAN_PARSER_REGEX.exec(line);
            if (match) {
                // console.log(match);
                const value = match;
                const text = value.groups.text;
                // console.log(text);
                const isBreak = this.matches(text, this.PLAN_BREAK);
                const isEnd = this.matches(text, this.PLAN_END);

                const time = new Date();
                time.setHours(Number.parseInt(value.groups.hours, 10));
                time.setMinutes(Number.parseInt(value.groups.minutes, 10));
                time.setSeconds(0);

                return this.planItemFactory.getPlanItem(
                    index,
                    value.index,
                    value.groups.completion,
                    isBreak,
                    isEnd,
                    time,
                    `${value.groups.hours.padStart(2, "0")}:${value.groups.minutes}`,
                    text,
                    value[0],
                    value.groups.prefix || "",
                );
            }
        } catch (error) {
            Logger.getInstance().logError("error parsing line", line, error);
        }
    }

    private updateItemCompletion(item: PlanItem, summary: PlanSummaryData) {
        let check = item.status; // input status
        if (this.config.current().completePastItems) {
            if (this.config.current().preserveValues.includes(check)) {
                // no-op preserve values
            } else if (item.isPast) {
                check = "x";
            } else if (
                this.config.current().markCurrent &&
                summary.isCurrent(item)
            ) {
                check = "/";
            } else {
                check = " ";
            }
        }

        return `- [${check}] ${item.prefix}${item.rawTime} ${item.text}`;
    }

    private matches(input: string, regex: RegExp): boolean {
        return regex.test(input.trim());
    }

    getAnchorDate(): Date {
        const configDate = this.config.current().activePlan.anchorDate;
        if (configDate) {
            return new Date(configDate);
        }
        const newDayStartsAt = this.config.current().newDayStartsAt;

        // Fallback: compute anchor for current time
        const now = new Date();
        const anchor = new Date(now);
        anchor.setMinutes(0, 0, 0);
        anchor.setHours(newDayStartsAt);

        // If before newDayStartsAt hour, use yesterday
        if (now.getHours() < newDayStartsAt) {
            anchor.setDate(anchor.getDate() - 1);
        }

        return anchor;
    }
}
