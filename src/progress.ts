import { moment } from "obsidian";
import Logger from "./logger";
import { momentFn } from "./moment";
import type { PlanItem } from "./plan-data";

export default class Progress {
    getProgress(current: PlanItem, next: PlanItem) {
        try {
            const now = new Date();
            const nowMoment = momentFn(now);
            const currentMoment = momentFn(current.time);
            const nextMoment = momentFn(next.time);
            const diff = moment.duration(nextMoment.diff(currentMoment));
            const fromStart = moment.duration(nowMoment.diff(currentMoment));
            const untilNext = moment.duration(nextMoment.diff(nowMoment));
            const percentageComplete =
                (fromStart.asMinutes() / diff.asMinutes()) * 100;
            const minsUntilNext = untilNext.asMinutes().toFixed(0);
            return {
                percentageComplete,
                minsUntilNext,
            };
        } catch (error) {
            Logger.getInstance().logError(
                "error updating progress",
                current,
                next,
                error,
            );
            return {
                percentageComplete: 0,
                minsUntilNext: 30,
            };
        }
    }

    progressMarkdown(current: PlanItem, next: PlanItem) {
        try {
            const { percentageComplete } = this.getProgress(current, next);
            const completeCount = Math.floor(20 * (percentageComplete / 100));
            return (
                new Array(completeCount).join("->") +
                new Array(20 - completeCount).join("_ ")
            );
        } catch (error) {
            Logger.getInstance().logError(
                "error updating markdown",
                current,
                next,
                error,
            );
        }
    }
}
