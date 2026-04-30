import { moment } from "obsidian";

type MomentFactory = (date?: Date | string | number) => moment.Moment;

export const momentFn = ("default" in moment
    ? moment.default
    : moment) as unknown as MomentFactory;
