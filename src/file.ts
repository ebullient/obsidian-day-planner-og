import { normalizePath, type Vault } from "obsidian";
import {
    appHasDailyNotesPluginLoaded,
    getDailyNoteSettings,
} from "obsidian-daily-notes-interface";
import { DAY_PLANNER_DEFAULT_CONTENT } from "./constants";
import Logger from "./logger";
import MomentDateRegex from "./moment-date-regex";
import { type ActiveConfig, DayPlannerMode } from "./settings";

export default class DayPlannerFile {
    vault: Vault;
    config: ActiveConfig;
    momentDateRegex: MomentDateRegex;

    constructor(vault: Vault, activeConfig: ActiveConfig) {
        this.vault = vault;
        this.config = activeConfig;
        this.momentDateRegex = new MomentDateRegex();
    }

    async createDailyNote(anchorDate: Date): Promise<string | null> {
        if (
            this.config.current().mode === DayPlannerMode.Daily &&
            appHasDailyNotesPluginLoaded()
        ) {
            // Use Obsidian's daily notes plugin
            const { folder, format } = getDailyNoteSettings();
            const filename = `${this.momentDateRegex.getMoment(anchorDate, format)}.md`;
            const path = normalizePath(`${folder}/${filename}`);

            return (await this.vault.adapter.exists(path)) ? path : null; // Daily note doesn't exist yet
        }
        if (this.config.current().mode === DayPlannerMode.File) {
            // Fallback: Day Planner creates its own daily note
            // Use anchor date for filename
            const dateStr = this.momentDateRegex.getMoment(
                anchorDate,
                "YYYYMMDD",
            );
            const fileName = `Day Planner-${dateStr}.md`;
            const path = `${this.config.current().customFolder}/${fileName}`;

            await this.createFolderIfNotExists(
                this.config.current().customFolder,
            );
            await this.createFileIfNotExists(path);

            return path;
        }

        // CommandMode or missing daily notes plugin
        return null;
    }

    async createFolderIfNotExists(path: string) {
        try {
            const normalizedPath = normalizePath(path);
            const folderExists = await this.vault.adapter.exists(
                normalizedPath,
                false,
            );
            if (!folderExists) {
                await this.vault.createFolder(normalizedPath);
            }
        } catch (error) {
            Logger.getInstance().logError("error creating folder", path, error);
        }
    }

    async createFileIfNotExists(fileName: string) {
        try {
            const normalizedFileName = normalizePath(fileName);
            if (!(await this.vault.adapter.exists(normalizedFileName, false))) {
                await this.vault.create(
                    normalizedFileName,
                    DAY_PLANNER_DEFAULT_CONTENT,
                );
            }
        } catch (error) {
            Logger.getInstance().logError(
                "file does not exist",
                fileName,
                error,
            );
        }
    }

    async processFile(
        filename: string,
        handler: (fileContents: string) => string,
    ) {
        try {
            return await this.vault.adapter.process(filename, handler);
        } catch (error) {
            Logger.getInstance().logError(
                "error processing file",
                filename,
                error,
            );
        }
    }
}
