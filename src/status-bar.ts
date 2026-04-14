import type { Workspace } from "obsidian";
import type DayPlannerFile from "./file";
import Logger from "./logger";
import type { PlanItem, PlanSummaryData } from "./plan-data";
import type PlannerMarkdown from "./planner-md";
import type Progress from "./progress";
import type { ActiveConfig } from "./settings";

export default class StatusBar {
    config: ActiveConfig;
    file: DayPlannerFile;
    statusBar: HTMLElement;
    statusBarAdded: boolean;
    statusBarText: HTMLSpanElement;
    statusBarTextContent!: Text;
    nextText: HTMLSpanElement;
    nextTextContent!: Text;
    statusBarProgress: HTMLDivElement;
    statusBarCurrentProgress: HTMLDivElement;
    circle: HTMLDivElement;
    workspace: Workspace;
    progress: Progress;
    plannerMD: PlannerMarkdown;
    card: HTMLDivElement;
    cardCurrent: HTMLElement;
    cardCurrentLabel!: HTMLElement;
    cardCurrentDetail!: Text;
    cardNext: HTMLElement;
    cardNextLabel!: HTMLElement;
    cardNextDetail!: Text;
    currentTime: string;

    constructor(
        config: ActiveConfig,
        statusBar: HTMLElement,
        workspace: Workspace,
        progress: Progress,
        plannerMD: PlannerMarkdown,
        file: DayPlannerFile,
    ) {
        this.config = config;
        this.statusBar = statusBar;
        this.workspace = workspace;
        this.progress = progress;
        this.plannerMD = plannerMD;
        this.file = file;
    }

    initStatusBar() {
        if (this.statusBarAdded) {
            return;
        }
        const status = this.statusBar.createEl("div", {
            cls: "day-planner",
            title: "View the planner",
            prepend: true,
        });

        this.setupCard(status);

        this.statusBarText = status.createEl("span", {
            cls: ["status-bar-item-segment", "day-planner-status-bar-text"],
        });
        const nowLabel = this.statusBarText.createEl("strong");
        nowLabel.textContent = "Now";
        this.statusBarTextContent = document.createTextNode("");
        this.statusBarText.appendChild(this.statusBarTextContent);

        this.setupCircularProgressBar(status);
        this.setupHorizontalProgressBar(status);

        this.nextText = status.createEl("span", {
            cls: ["status-bar-item-segment", "day-planner-status-bar-text"],
        });
        const nextLabel = this.nextText.createEl("strong");
        nextLabel.textContent = "Next";
        this.nextTextContent = document.createTextNode("");
        this.nextText.appendChild(this.nextTextContent);

        this.setupStatusBarEvents(status);
        this.statusBarAdded = true;
    }

    private setupStatusBarEvents(status: HTMLDivElement) {
        status.onClickEvent(async () => {
            try {
                const settings = this.config.current();
                const fileName = settings.activePlan.notePath;
                if (fileName) {
                    await this.workspace.openLinkText(fileName, "", false);
                }
            } catch (error) {
                Logger.getInstance().logError(
                    "error opening file from status bar",
                    this.file,
                    error,
                );
            }
        });
        status.on("mouseenter", ".day-planner", () => {
            this.show(this.card);
        });

        status.on("mouseleave", ".day-planner", () => {
            this.hide(this.card);
        });
    }

    async refreshStatusBar(planSummary: PlanSummaryData) {
        if (!planSummary.empty && !planSummary.invalid) {
            this.updateProgress(planSummary.current, planSummary.next);
            this.show(this.statusBar);
        } else {
            this.hide(this.statusBar);
        }
        return planSummary;
    }

    hide(el: HTMLElement) {
        if (el) {
            el.addClass("hide");
        }
    }

    show(el: HTMLElement) {
        if (el) {
            el.removeClass("hide");
        }
    }

    hideProgress() {
        this.hide(this.statusBarProgress);
        this.hide(this.circle);
        this.hide(this.nextText);
    }

    private updateProgress(current: PlanItem, next: PlanItem) {
        const settings = this.config.current();
        if (!current || !next || current.isEnd) {
            this.hideProgress();
            this.statusBarTextContent.textContent = ` ${settings.endLabel}`;
            return;
        }
        const { percentageComplete, minsUntilNext } = this.progress.getProgress(
            current,
            next,
        );
        if (settings.circularProgress) {
            this.hide(this.statusBarProgress);
            this.progressCircle(percentageComplete, current);
        } else {
            this.hide(this.circle);
            this.progressBar(percentageComplete, current);
        }
        this.statusText(minsUntilNext, current, next, percentageComplete);
    }

    private progressBar(percentageComplete: number, current: PlanItem) {
        if (current.isBreak) {
            this.statusBarCurrentProgress.addClass("green");
        } else {
            this.statusBarCurrentProgress.removeClass("green");
        }
        this.statusBarCurrentProgress.style.width = `${percentageComplete}%`;
        this.show(this.statusBarProgress);
    }

    private progressCircle(percentageComplete: number, current: PlanItem) {
        if (current.isBreak) {
            this.circle.addClass("green");
        } else {
            this.circle.removeClass("green");
        }
        this.circle.setAttr("data-value", percentageComplete.toFixed(0));
        this.show(this.circle);
    }

    private statusText(
        lastMinsUntil: string,
        current: PlanItem,
        next: PlanItem,
        percentageComplete: number,
    ) {
        const settings = this.config.current();
        const minsUntilNext = lastMinsUntil === "0" ? "1" : lastMinsUntil;
        const minsText = `${minsUntilNext} min${minsUntilNext === "1" ? "" : "s"}`;

        if (settings.nowAndNextInStatusBar) {
            this.statusBarTextContent.textContent = ` ${current.rawTime} ${this.ellipsis(current.text, 10)}`;
            this.nextTextContent.textContent = ` ${next.rawTime} ${this.ellipsis(next.text, 10)}`;
            this.show(this.nextText);
        } else {
            this.hide(this.nextText);
            const statusText = current.isBreak
                ? `${settings.breakLabel} for ${minsText}`
                : `${minsText} left`;
            this.statusBarTextContent.textContent = ` ${statusText}`;
        }
        const currentTaskStatus = `Current Task (${percentageComplete.toFixed(0)}% complete)`;
        const currentTaskTimeAndText = `${current.rawTime} ${current.text}`;
        const nextTask = `Next Task (in ${minsText})`;
        const nextTaskTimeAndText = `${next.rawTime} ${next.text}`;
        this.cardCurrentLabel.textContent = currentTaskStatus;
        this.cardCurrentDetail.textContent = ` ${currentTaskTimeAndText}`;
        this.cardNextLabel.textContent = nextTask;
        this.cardNextDetail.textContent = ` ${nextTaskTimeAndText}`;
        this.taskNotification(
            current,
            currentTaskTimeAndText,
            nextTask,
            nextTaskTimeAndText,
        );
    }

    private taskNotification(
        current: PlanItem,
        currentTaskTimeAndText: string,
        nextTask: string,
        nextTaskText: string,
    ) {
        if (
            this.config.current().showTaskNotification &&
            this.currentTime !== undefined &&
            this.currentTime !== current.time.toUTCString()
        ) {
            new Notification(`Task started, ${currentTaskTimeAndText}`, {
                body: `${nextTask}: ${nextTaskText}`,
                requireInteraction: true,
            });
        }
        this.currentTime = current.time.toUTCString();
    }

    private ellipsis(input: string, limit: number) {
        if (input.length <= limit) {
            return input;
        }
        return `${input.substring(0, limit)}...`;
    }

    private setupHorizontalProgressBar(status: HTMLDivElement) {
        this.statusBarProgress = status.createEl("div", {
            cls: ["status-bar-item-segment", "day-planner-progress-bar"],
        });
        this.statusBarProgress.addClass("hide");
        this.statusBarCurrentProgress = this.statusBarProgress.createEl("div", {
            cls: "day-planner-progress-value",
        });
    }

    private setupCircularProgressBar(status: HTMLDivElement) {
        this.circle = status.createEl("div", {
            cls: ["status-bar-item-segment", "progress-pie day-planner"],
        });
        this.circle.addClass("hide");
    }

    private setupCard(status: HTMLDivElement) {
        this.card = status.createEl("div", { cls: "day-planner-status-card" });
        this.card.addClass("hide");
        this.cardCurrent = this.card.createEl("span");
        this.cardCurrentLabel = this.cardCurrent.createEl("strong");
        this.cardCurrentDetail = document.createTextNode("");
        this.cardCurrent.appendChild(this.cardCurrentDetail);
        this.card.createEl("br");
        this.card.createEl("br");
        this.cardNext = this.card.createEl("span");
        this.cardNextLabel = this.cardNext.createEl("strong");
        this.cardNextDetail = document.createTextNode("");
        this.cardNext.appendChild(this.cardNextDetail);
        this.card.createEl("div", { cls: "arrow-down" });
    }
}
