import { vi, test, expect, describe, beforeEach } from "vitest";
import { DayPlannerSettings, DayPlannerMode } from '../src/settings';
import Parser from "src/parser";

describe("Day Planner Settings defaults", () => {
    let settings: DayPlannerSettings = undefined;

    beforeEach(() => {
        settings = new DayPlannerSettings();
    });

    test("Custom Folder", () => {
        expect(settings.customFolder).toBe('Day Planners');
    });

    test("Mode", () => {
        expect(settings.mode).toBe(DayPlannerMode.File);
    });

    test("Update BREAK settings should work fine", () => {
        const parser = new Parser(settings);
        settings.breakLabel = '*BREAK.*';
        settings.endLabel = '[(END)]';
        parser.updateSettings(settings);
        const breakItem = parser.parseLine(0, `- [ ] 13:00 ${settings.breakLabel}`);
        const endItem = parser.parseLine(0, `- [ ] 13:00 ${settings.endLabel}`);

        expect(breakItem.isBreak).toBeTruthy();
        expect(endItem.isEnd).toBeTruthy();
    });
});