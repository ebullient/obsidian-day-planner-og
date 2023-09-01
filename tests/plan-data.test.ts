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
    const isCompleted = true;
    const isBreak = false;
    const isEnd = false;
    const time = new Date('2021-04-11T11:10:00.507Z');
    const rawTime = '11:10';
    const text = 'meeting';
    const raw = '- [x] 11:10 meeting';

    test('should generate PlanItem with given text', () => {
      const factory = new PlanItemFactory(new DayPlannerSettings());

      const item = factory.getPlanItem(matchIndex, charIndex, isCompleted, isBreak, isEnd, time, rawTime, text, raw);

      expect(item.matchIndex).toEqual(matchIndex);
      expect(item.charIndex).toEqual(charIndex);
      expect(item.isCompleted).toEqual(isCompleted);
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

      const factory = new PlanItemFactory(settings);

      const isBreakOn = true;
      const item = factory.getPlanItem(matchIndex, charIndex, isCompleted, isBreakOn, isEnd, time, rawTime, text, raw);

      expect(item.isBreak).toEqual(isBreakOn);
      expect(item.text).toEqual(settings.breakLabel);
    });

    test('should generate PlanItem with end text from settings', () => {
      const settings = new DayPlannerSettings();
      settings.endLabel = 'Custom End Label';

      const factory = new PlanItemFactory(settings);

      const isEndOn = true;
      const item = factory.getPlanItem(matchIndex, charIndex, isCompleted, isBreak, isEndOn, time, rawTime, text, raw);

      expect(item.isEnd).toEqual(isEndOn);
      expect(item.text).toEqual(settings.endLabel);
    });
  });
});