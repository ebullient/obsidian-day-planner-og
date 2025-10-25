import type { ActiveConfig } from "./settings";

export default class Logger {
    private static instance: Logger;
    config: ActiveConfig;

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    updateSettings(config: ActiveConfig) {
        this.config = config;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // biome-ignore lint/suspicious/noExplicitAny: generous for logging any value
    logDebug(message: string, ...optionalParams: any[]): void {
        if (this.config.current().debug) {
            console.debug("(DP)", message, ...optionalParams);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // biome-ignore lint/suspicious/noExplicitAny: generous for logging any value
    logInfo(message: string, ...optionalParams: any[]): void {
        console.info("(DP)", message, ...optionalParams);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // biome-ignore lint/suspicious/noExplicitAny: generous for logging any value
    logError(message: string, ...optionalParams: any[]): void {
        console.error("(DP)", message, ...optionalParams);
    }
}
