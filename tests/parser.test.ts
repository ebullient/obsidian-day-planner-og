/**
 * @vitest-environment jsdom
 */
import Moment from "moment";
Object.defineProperty(window, "moment", { value: Moment });

import { test, expect, describe } from "vitest";
import * as fs from 'fs';
import path from 'path';

import Parser from '../src/parser';
import { DayPlannerSettings } from '../src/settings';
import {PlanSummaryData} from "../src/plan-data";

describe('parser', () => {
  test('should return parsed items', async () => {
    const fileContents = fs.readFileSync(path.join(__dirname, 'fixtures/test.md')).toString();

    const settings = new DayPlannerSettings();
    settings.breakLabel = '☕️ COFFEE BREAK';
    settings.endLabel = '🛑 FINISH';
    settings.correctLabels = false;
    settings.markCurrent = true;

    const parser = new Parser(settings);
    const summary = new PlanSummaryData([], true);
    const date = new Date();
    date.setHours(12)
    date.setMinutes(25)
    date.setSeconds(0);

    const updatedContent = parser.parseContent(fileContents, summary, date);
    const updated = updatedContent.split('\n');
    console.log(updated);

    expect(summary.empty).to.be.false;
    expect(summary.invalid).to.be.false;
    expect(summary.items).to.have.lengthOf(9);

    const firstItem = summary.items[0];
    expect(firstItem.status).to.eql('x');
    expect(firstItem.isBreak).to.be.false;
    expect(firstItem.isEnd).to.be.false;
    expect(firstItem.rawTime).to.eql('08:00');
    expect(firstItem.text).to.eql('morning stuff');
    expect(updated[firstItem.line]).to.eql("- [x] 08:00 morning stuff");

    expect(updated[summary.items[1].line]).to.eql("- [x] 09:00 breakfast");
    expect(updated[summary.items[2].line]).to.eql("- [x] 10:00 meeting");

    const fourthItem = summary.items[3];
    expect(fourthItem.status).to.eql('x');
    expect(fourthItem.isBreak).to.be.true;
    expect(fourthItem.isEnd).to.be.false;
    expect(fourthItem.rawTime).to.eql('11:00');
    expect(fourthItem.text.toUpperCase()).to.eql('☕️ COFFEE BREAK');
    expect(updated[fourthItem.line]).to.eql("- [x] 11:00 ☕️ Coffee Break");

    // Completed tasks in the input note are done at this point
    // parsing & computation now happen in one step.

    const fifthItem = summary.items[4];
    expect(fifthItem.status).to.eql(' '); // read in as unchecked
    expect(fifthItem.isPast).to.be.true; // set to true
    expect(fifthItem.isBreak).to.be.false;
    expect(fifthItem.isEnd).to.be.false;
    expect(fifthItem.rawTime).to.eql('11:10');
    expect(fifthItem.text).to.eql('reading');

    expect(updated[fifthItem.line]).to.eql("- [x] 11:10 reading");
    expect(updated[summary.items[5].line]).to.eql("- [/] 12:00 writing");

    // End test date time (12:25)

    const seventhItem = summary.items[6];
    expect(seventhItem.status).to.eql(' ');
    expect(seventhItem.isBreak).to.be.true;
    expect(seventhItem.isEnd).to.be.false;
    expect(seventhItem.rawTime).to.eql('13:00');
    expect(seventhItem.text).to.eql('☕️ COFFEE BREAK');

    expect(updated[seventhItem.line]).to.eql("- [ ] 13:00 ☕️ COFFEE BREAK");
    expect(updated[summary.items[7].line]).to.eql("- [ ] 13:10 meeting");

    const ninthItem = summary.items[8];
    expect(ninthItem.status).to.eql(' ');
    expect(ninthItem.isBreak).to.be.false;
    expect(ninthItem.isEnd).to.be.true;
    expect(ninthItem.rawTime).to.eql('14:00');
    expect(ninthItem.text).to.eql('🛑 Finish');

    expect(updated[ninthItem.line]).to.eql("- [ ] 14:00 🛑 Finish");
  });
});