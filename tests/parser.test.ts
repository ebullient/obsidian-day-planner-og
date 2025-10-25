/**
 * @vitest-environment jsdom
 */
import * as fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import Parser from '../src/parser';
import { DayPlannerSettings } from '../src/settings';
import { PlanSummaryData } from "../src/plan-data";
import { mockDate } from "./mocks/date";

import Moment from "moment";
Object.defineProperty(window, "moment", { value: Moment });


describe('parser', () => {
    test('should return parsed items', async () => {
        const fileContents = fs.readFileSync(path.join(__dirname, 'fixtures/test.md')).toString();

        const settings = new DayPlannerSettings();
        settings.breakLabel = '☕️ COFFEE BREAK';
        settings.endLabel = '🛑 FINISH';
        settings.correctLabels = false;
        settings.markCurrent = true;

        const parser = new Parser({ current: () => settings});
        const summary = new PlanSummaryData([], true);
        const date = new Date();
        date.setHours(12)
        date.setMinutes(25)
        date.setSeconds(0);

        const updatedContent = parser.parseContent(fileContents, summary, date);
        const updated = updatedContent.split("\n");

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

    test('should parse middle of the note with alternate headers', async () => {
        const fileContents = fs.readFileSync(path.join(__dirname, 'fixtures/test-middle.md')).toString();

        const settings = new DayPlannerSettings();
        settings.plannerLabel = 'The Plan';
        settings.correctLabels = true;
        settings.markCurrent = false;

        const parser = new Parser({ current: () => settings});
        const summary = new PlanSummaryData([], true);
        const date = new Date();
        date.setHours(12)
        date.setMinutes(25)
        date.setSeconds(0);

        const updatedContent = parser.parseContent(fileContents, summary, date);
        const updated = updatedContent.split("\n");

        expect(summary.empty).to.be.false;
        expect(summary.invalid).to.be.false;
        expect(summary.items).to.have.lengthOf(9);

        expect(summary.items[0].text).to.eql('morning stuff');
        expect(summary.items[0].line).to.eql(6);

        expect(updated[summary.items[0].line]).to.eql("- [x] 08:00 morning stuff");
        expect(updated[summary.items[1].line]).to.eql("- [x] 09:00 breakfast");
        expect(updated[summary.items[2].line]).to.eql("- [-] 10:00 meeting");
        expect(updated[summary.items[3].line]).to.eql("- [x] 11:00 BREAK");
        expect(updated[summary.items[4].line]).to.eql("- [x] 11:10 reading");
        expect(updated[summary.items[5].line]).to.eql("- [ ] 12:00 writing");
        expect(updated[summary.items[6].line]).to.eql("- [ ] 13:00 BREAK");
        expect(updated[summary.items[7].line]).to.eql("- [ ] 13:10 meeting");
        expect(updated[summary.items[8].line]).to.eql("- [ ] 14:00 END");
    });

    test("should keep configured values", async () => {
        const fileContents = fs
            .readFileSync(path.join(__dirname, "fixtures/test-keep.md"))
            .toString();

        const settings = new DayPlannerSettings();
        settings.preserveValues = "->";
        settings.markCurrent = true;
        settings.correctLabels = false;
        settings.breakLabel = "☕️ Coffee Break";
        settings.endLabel = "🛑 Finish";

        const parser = new Parser({ current: () => settings});
        const summary = new PlanSummaryData([], true);
        const date = new Date();

        date.setHours(12);
        date.setMinutes(25);
        date.setSeconds(0);

        const updatedContent = parser.parseContent(fileContents, summary, date);
        const updated = updatedContent.split("\n");

        expect(summary.empty).to.be.false;
        expect(summary.invalid).to.be.false;
        expect(summary.items).to.have.lengthOf(6);

        expect(summary.items[0].text).to.eql("morning stuff");
        expect(summary.items[0].line).to.eql(2);

        expect(updated[summary.items[0].line]).to.eql(
            "- [x] 08:00 morning stuff",
        );
        expect(updated[summary.items[1].line]).to.eql("- [-] 09:00 breakfast");
        expect(updated[summary.items[2].line]).to.eql("- [>] 10:00 meeting");
        expect(updated[summary.items[3].line]).to.eql(
            "- [x] 11:00 ☕️ Coffee Break : Reading",
        );
        expect(updated[summary.items[4].line]).to.eql("- [/] 12:10 reading");
        expect(updated[summary.items[5].line]).to.eql(
            "- [ ] 14:00 🛑 Finish : Things",
        );

        expect(summary.items[3].isBreak).to.be.true;
        expect(summary.items[5].isEnd).to.be.true;
    });

    test("preserve out of order", async () => {
        const fileContents = fs
            .readFileSync(path.join(__dirname, "fixtures/test-ooo.md"))
            .toString();

        const settings = new DayPlannerSettings();
        settings.preserveValues = "->";
        settings.markCurrent = true;
        settings.correctLabels = false;

        const parser = new Parser({ current: () => settings});
        const summary = new PlanSummaryData([], true);
        const date = new Date();

        date.setHours(12);
        date.setMinutes(25);
        date.setSeconds(0);

        const updatedContent = parser.parseContent(fileContents, summary, date);
        expect(updatedContent).to.eql(`## Day Planner

- [x] 08:00 morning stuff

### Middle

- [x] 11:00 ☕️ Coffee Break
- [/] 12:10 reading [Markdown](markdown-link)

### Other

- [-] 09:00 breakfast [[wikilink]]
- [>] 10:00 meeting [[wikilink|alias]]
- [ ] 14:00 🛑 Finish
`);

        const updated = updatedContent.split("\n");

        expect(summary.empty).to.be.false;
        expect(summary.invalid).to.be.false;
        expect(summary.items).to.have.lengthOf(6);

        expect(summary.items[0].text).to.eql("morning stuff");
        expect(summary.items[0].line).to.eql(2);

        expect(updated[summary.items[0].line]).to.eql(
            "- [x] 08:00 morning stuff",
        );
        expect(updated[summary.items[1].line]).to.eql(
            "- [-] 09:00 breakfast [[wikilink]]",
        );
        expect(updated[summary.items[2].line]).to.eql(
            "- [>] 10:00 meeting [[wikilink|alias]]",
        );
        expect(updated[summary.items[3].line]).to.eql(
            "- [x] 11:00 ☕️ Coffee Break",
        );
        expect(updated[summary.items[4].line]).to.eql(
            "- [/] 12:10 reading [Markdown](markdown-link)",
        );
        expect(updated[summary.items[5].line]).to.eql("- [ ] 14:00 🛑 Finish");
    });

    test("getAnchorDate with activePlan set", () => {

        const settings = new DayPlannerSettings();
        settings.newDayStartsAt = 4;

        const expectedDate = new Date("2025-10-24T04:00:00Z");
        settings.activePlan = {
            notePath: "test.md",
            anchorDate: expectedDate.toISOString(),
        };

        const parser = new Parser({ current: () => settings});
        const anchor = parser.getAnchorDate();

        // Compare components to avoid timezone issues
        expect(anchor.getUTCFullYear()).to.eql(2025);
        expect(anchor.getUTCMonth()).to.eql(9); // October
        expect(anchor.getUTCDate()).to.eql(24);
        expect(anchor.getUTCHours()).to.eql(4);
        expect(anchor.getUTCMinutes()).to.eql(0);
    });

    test("getAnchorDate fallback - after newDayStartsAt", () => {
        const settings = new DayPlannerSettings();
        settings.newDayStartsAt = 4;

        // No activePlan set, should compute from current time

        // Mock current time: 10 AM on Oct 25
        const mockNow = new Date("2025-10-25T10:00:00");
        const unmock = mockDate(mockNow);

        const parser = new Parser({ current: () => settings});
        const anchor = parser.getAnchorDate();

        // Should be Oct 25 at 04:00 (same day since 10 AM >= 4 AM)
        expect(anchor.getFullYear()).to.eql(2025);
        expect(anchor.getMonth()).to.eql(9); // October (0-indexed)
        expect(anchor.getDate()).to.eql(25);
        expect(anchor.getHours()).to.eql(4);
        expect(anchor.getMinutes()).to.eql(0);

        unmock();
    });

    test("getAnchorDate fallback - before newDayStartsAt", () => {

        const settings = new DayPlannerSettings();
        settings.newDayStartsAt = 4;

        // No activePlan set, should compute from current time
        // Mock current time: 2 AM on Oct 25
        const mockNow = new Date("2025-10-25T02:00:00");
        const unmock = mockDate(mockNow);

        const parser = new Parser({ current: () => settings});
        const anchor = parser.getAnchorDate();

        // Should be Oct 24 at 04:00 (yesterday since 2 AM < 4 AM)
        expect(anchor.getFullYear()).to.eql(2025);
        expect(anchor.getMonth()).to.eql(9); // October (0-indexed)
        expect(anchor.getDate()).to.eql(24);
        expect(anchor.getHours()).to.eql(4);
        expect(anchor.getMinutes()).to.eql(0);

        unmock();
    });
});
