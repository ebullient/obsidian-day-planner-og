import { DEFAULT_SETTINGS } from "./constants";
import type { ActiveConfig } from "./settings";

export default class Logger {
    private static instance: Logger;
    config!: ActiveConfig;

    constructor() {
        this.config = {
            current: () => DEFAULT_SETTINGS,
        };
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    updateSettings(config: ActiveConfig) {
        this.config = config;
    }

    logDebug(message: string, ...optionalParams: unknown[]): void {
        if (this.config.current().debug) {
            console.debug("(DP)", message, ...optionalParams);
        }
    }

    logInfo(message: string, ...optionalParams: unknown[]): void {
        console.debug("(DP)", message, ...optionalParams);
    }

    logError(message: string, ...optionalParams: unknown[]): void {
        console.error("(DP)", message, ...optionalParams);
    }
}
