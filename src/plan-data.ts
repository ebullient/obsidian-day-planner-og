import Logger from "./logger";
import type { ActiveConfig } from "./settings";

export class PlanSummaryData {
    iAmWriter: boolean;
    empty: boolean;
    invalid: boolean;
    items: PlanItem[];
    past: PlanItem[];
    current: PlanItem;
    next: PlanItem;

    constructor(items: PlanItem[], iAmWriter: boolean) {
        this.iAmWriter = iAmWriter;
        this.empty = items.length < 1;
        this.invalid = false;
        this.items = items;
        this.past = [];
    }

    addItem(item: PlanItem) {
        this.items.push(item);
        this.empty = false;
    }

    calculate(now: Date): void {
        try {
            this.items.sort((a, b) => a.time.getTime() - b.time.getTime());
            if (this.items.length === 0) {
                this.empty = true;
                return;
            }
            this.items.forEach((item, i) => {
                const next = this.items[i + 1];
                if (
                    item.time < now &&
                    (item.isEnd || (next && now < next.time))
                ) {
                    this.current = item;
                    if (item.isEnd) {
                        item.isPast = true;
                        this.past.push(item);
                    }
                    this.next = item.isEnd ? null : next;
                } else if (item.time < now) {
                    item.isPast = true;
                    this.past.push(item);
                }
                if (next) {
                    const m = window.moment;
                    const untilNext = m
                        .duration(m(next.time).diff(m(item.time)))
                        .asMinutes();
                    item.durationMins = untilNext;
                }
            });
        } catch (error) {
            Logger.getInstance().logError("error updating item status", error);
        }
    }

    isCurrent(item: PlanItem) {
        return item === this.current;
    }

    activeItems() {
        return this.items.filter((item) => !item.hidden);
    }
}

export class PlanItem {
    line: number;
    charIndex: number;
    status: string;
    isPast: boolean;
    isBreak: boolean;
    isEnd: boolean;
    time: Date;
    durationMins: number;
    rawTime: string;
    text: string;
    raw: string;
    hidden: boolean;

    constructor(
        matchIndex: number,
        charIndex: number,
        status: string,
        isBreak: boolean,
        isEnd: boolean,
        time: Date,
        rawTime: string,
        text: string,
        raw: string,
        hidden: boolean,
    ) {
        this.line = matchIndex;
        this.charIndex = charIndex;
        this.status = status;
        this.isBreak = isBreak;
        this.isEnd = isEnd;
        this.time = time;
        this.rawTime = rawTime;
        this.text = text;
        this.raw = raw;
        this.hidden = hidden;
    }
}

export class PlanItemFactory {
    private config: ActiveConfig;

    constructor(config: ActiveConfig) {
        this.config = config;
    }

    getPlanItem(
        matchIndex: number,
        charIndex: number,
        status: string,
        isBreak: boolean,
        isEnd: boolean,
        time: Date,
        rawTime: string,
        text: string,
        raw: string,
    ) {
        const displayText = this.getDisplayText(isBreak, isEnd, text);
        const hidden =
            status && this.config.current().hideTimelineValues.includes(status);
        return new PlanItem(
            matchIndex,
            charIndex,
            status,
            isBreak,
            isEnd,
            time,
            rawTime,
            displayText,
            raw,
            hidden,
        );
    }

    getDisplayText(isBreak: boolean, isEnd: boolean, text: string) {
        const settings = this.config.current();
        if (isBreak && settings.correctLabels) {
            return settings.breakLabel;
        }
        if (isEnd && settings.correctLabels) {
            return settings.endLabel;
        }
        return text;
    }
}
