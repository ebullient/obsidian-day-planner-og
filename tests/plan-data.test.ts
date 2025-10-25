/**
 * @vitest-environment jsdom
 */
import Moment from "moment";
Object.defineProperty(window, "moment", { value: Moment });

import { test, expect, describe } from "vitest";

import { PlanItemFactory } from '../src/plan-data';
import { DayPlannerSettings } from '../src/settings';

describe('plan-data', () => {
    describe('PlanItemFactory', () => {
        const matchIndex = 1;
        const charIndex = 0;
        const isBreak = false;
        const isEnd = false;
        const time = new Date('2021-04-11T11:10:00.507Z');
        const rawTime = '11:10';
        const text = 'meeting';
        const raw = '- [x] 11:10 meeting';

        test('should generate PlanItem with given text', () => {

            const settings = new DayPlannerSettings();
            const factory = new PlanItemFactory({ current: () => settings });

            const item = factory.getPlanItem(matchIndex, charIndex, 'x', isBreak, isEnd, time, rawTime, text, raw);

            expect(item.line).toEqual(matchIndex);
            expect(item.charIndex).toEqual(charIndex);
            expect(item.status).toEqual('x');
            expect(item.isBreak).toEqual(isBreak);
            expect(item.isEnd).toEqual(isEnd);
            expect(item.time).toEqual(time);
            expect(item.rawTime).toEqual(rawTime);
            expect(item.text).toEqual(text);
            expect(item.raw).toEqual(raw);
        });

        test('should generate PlanItem with break text from settings', () => {
            const settings = new DayPlannerSettings();
            settings.breakLabel = 'Custom Break Label';
            settings.correctLabels = true;

            const factory = new PlanItemFactory({ current: () => settings });

            const isBreakOn = true;
            const item = factory.getPlanItem(matchIndex, charIndex, 'x', isBreakOn, isEnd, time, rawTime, text, raw);

            expect(item.isBreak).toEqual(isBreakOn);
            expect(item.text).toEqual(settings.breakLabel);
        });

        test('should generate PlanItem with end text from settings', () => {
            const settings = new DayPlannerSettings();
            settings.endLabel = 'Custom End Label';
            settings.correctLabels = true;

            const factory = new PlanItemFactory({ current: () => settings });

            const isEndOn = true;
            const item = factory.getPlanItem(matchIndex, charIndex, 'x', isBreak, isEndOn, time, rawTime, text, raw);

            expect(item.isEnd).toEqual(isEndOn);
            expect(item.text).toEqual(settings.endLabel);
        });
    });
});
