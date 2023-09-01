import { vi, test, expect, describe } from "vitest";
import { DayPlannerSettings, DayPlannerMode } from '../src/settings';

const settings = new DayPlannerSettings();
describe("Day Planner Settings defaults", () => {

    test("Custom Folder", () => {
        expect(settings.customFolder).toBe('Day Planners');
    });

    test("Mode", () => {
        expect(settings.mode).toBe(DayPlannerMode.File);
    });
});