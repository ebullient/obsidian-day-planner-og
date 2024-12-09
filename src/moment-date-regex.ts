import { DATE_REGEX, DEFAULT_DATE_FORMAT } from "./constants";

export default class MomentDateRegex {
    replace(input: string): string {
        const customFolderString = input;

        // A regex to capture multiple matches, each with a target group ({date:YYMMDD}) and date group (YYMMDD)
        // Use matchAll to collect all matches in a single array
        const matches = [...customFolderString.matchAll(DATE_REGEX)];

        // Return the custom folder setting value if no dates are found
        if (matches.length === 0) {
            return input;
        }
        const now = new Date();
        //Transform date matches into moment formatted dates
        const formattedDates = matches.map((m) => {
            //Default to YYYYMMDDHHmm if {{date}} is used
            const dateFormat =
                m.groups.date === "" ? DEFAULT_DATE_FORMAT : m.groups.date;
            return [m.groups.target, this.getMoment(now, dateFormat)];
        });

        //Check to see if any date formatting is needed. If not return the unformatted setting text.
        let output = customFolderString;
        for (const fd of formattedDates) {
            output = output.replace(fd[0], fd[1]);
        }
        return output;
    }

    getMoment(now: Date, dateFormat: string) {
        return window.moment(now).format(dateFormat);
    }
}
