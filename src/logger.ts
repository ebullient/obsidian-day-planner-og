import type { DayPlannerSettings } from "./settings";

export default class Logger {
    private static instance: Logger;
    settings: DayPlannerSettings;

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    updateSettings(settings: DayPlannerSettings) {
        this.settings = settings;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    logDebug(message: string, ...optionalParams: any[]): void {
        if (!this.settings || this.settings.debug) {
            console.debug("(DP)", message, ...optionalParams);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    logInfo(message: string, ...optionalParams: any[]): void {
        console.info("(DP)", message, ...optionalParams);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    logError(message: string, ...optionalParams: any[]): void {
        console.error("(DP)", message, ...optionalParams);
    }
}
