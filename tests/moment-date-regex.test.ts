/**
 * @vitest-environment jsdom
 */
import Moment from "moment";
Object.defineProperty(window, "moment", { value: Moment });

import { beforeEach, afterEach, test, expect, describe } from "vitest";
import { mockDate } from './mocks/date'

import MomentDateRegex from '../src/moment-date-regex';
const date = new Date(2020, 9, 31, 14, 25, 15);
const momentRegex = new MomentDateRegex();

describe("Date formatting", () => {
    let resetDateMock:() => void;

    beforeEach(async () => {
        resetDateMock = mockDate(date);
    });
    
    test("No date format formatting using standard format", () => {
        const input = 'Zettels/{{date}}';
        const expectedOuput = 'Zettels/20201031';
        
        expect(momentRegex.replace(input)).toEqual(expectedOuput);
    });

    test("YYYYMMDD format", () => {
        const input = 'Zettels/{{date:YYYYMMDD}}';
        const expectedOuput = 'Zettels/20201031';
        
        expect(momentRegex.replace(input)).toEqual(expectedOuput);
    });

    test("Multiple dates", () => {
        const input = 'Zettels/{{date:YYYY}}/{{date:MMM}}/{{date:DD_ddd}}';
        const expectedOuput = 'Zettels/2020/Oct/31_Sat';
        
        expect(momentRegex.replace(input)).toEqual(expectedOuput);
    });

    test("Date path prefixing", () => {
        const input = '{{date:YYYY}}/{{date:MM}}/My Notes';
        const expectedOuput = '2020/10/My Notes';
        
        expect(momentRegex.replace(input)).toEqual(expectedOuput);
    });

    test("Text between date targets", () => {
        const input = '{{date:YYYY}}/Zettels/{{date:MMMM}}';
        const expectedOuput = '2020/Zettels/October';
        
        expect(momentRegex.replace(input)).toEqual(expectedOuput);
    });

    test("Date file name prefixing", () => {
        const input = '{{date:YYYYMMDDHHmm}}-My New Note';
        const expectedOuput = '202010311425-My New Note';
        
        expect(momentRegex.replace(input)).toEqual(expectedOuput);
    });

    afterEach(() => {
        resetDateMock();
    });
});

describe("Non-date input", () => {

    test("Input without dates", () => {
        const input = 'Inbox/New';
        const expectedOuput = 'Inbox/New';
        
        expect(momentRegex.replace(input)).toEqual(expectedOuput);
    });

    test("Input with date format without date target", () => {
        const input = 'Inbox/YYYY';
        const expectedOuput = 'Inbox/YYYY';
        
        expect(momentRegex.replace(input)).toEqual(expectedOuput);
    });

    test("Input with date format and partial date target", () => {
        const input = 'Inbox/{{date:YYYY';
        const expectedOuput = 'Inbox/{{date:YYYY';
        
        expect(momentRegex.replace(input)).toEqual(expectedOuput);
    });
});