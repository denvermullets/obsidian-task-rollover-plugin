import { Plugin, TFile, moment, Notice } from "obsidian";
import DailyNoteRolloverSettingTab from "./settings";
import { DEFAULT_SETTINGS, DailyNoteRolloverSettings } from "./types";
import {
  getDailyNoteFormat,
  getDailyNoteFolder,
  getTodayNote,
  getMostRecentDailyNote,
  isDailyNote,
} from "./dailyNotes";
import {
  appendItemsToSection,
  extractUncheckedItemsFromSections,
  getSections,
  convertSectionsToContent,
} from "./sections";
import { fetchGitHubPRs, fetchGitHubRecap, fetchGitHubYearlyRecap } from "./github";
import { RecapModal } from "./recapModal";
import { logger } from "./logger";

export default class DailyNoteRolloverPlugin extends Plugin {
  settings: DailyNoteRolloverSettings;

  async onload() {
    await this.loadSettings();
    logger.info("Loading Daily Note Rollover plugin");

    this.addSettingTab(new DailyNoteRolloverSettingTab(this.app, this));

    this.addCommand({
      id: "rollover-unchecked-items",
      name: "Move unchecked items from yesterday to today",
      callback: () => this.rolloverUncheckedItems(),
    });

    this.addCommand({
      id: "generate-github-recap",
      name: "Generate GitHub Recap",
      callback: () => this.openRecapModal(),
    });

    this.registerEvent(
      this.app.vault.on("create", async (file) => {
        if (
          file instanceof TFile &&
          isDailyNote(this.app, file) &&
          file.name === moment().format(getDailyNoteFormat(this.app)) + ".md"
        ) {
          await this.rolloverUncheckedItems();
        }
      })
    );
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async rolloverUncheckedItems() {
    const todayNote = await getTodayNote(this.app);
    if (!todayNote) {
      logger.error("No note found for today.");
      return;
    }
    let todaysSections = await getSections({ note: todayNote, app: this.app });

    const mostRecentNote = await getMostRecentDailyNote(this.app);

    if (!mostRecentNote) {
      logger.warn("No note found for previous day, check archive.");
      return;
    }

    const mostRecentSections = await getSections({ note: mostRecentNote, app: this.app });

    const skippedSections = this.settings.skippedTaskExtractionSections;

    const uncheckedItems = await extractUncheckedItemsFromSections({
      sections: mostRecentSections,
      skippedSections,
    });

    if (uncheckedItems.length > 0) {
      todaysSections = appendItemsToSection({
        sections: todaysSections,
        items: uncheckedItems,
        targetHeading: this.settings.targetSectionHeading,
      });
      logger.info(
        `Moved ${uncheckedItems.length} unchecked items from ${mostRecentNote.name} to today's note`
      );
    }

    if (this.settings.enableGithubIntegration) {
      const { reviewItems, openPRItems, labeledItems } = await fetchGitHubPRs(this.settings);
      if (reviewItems.length > 0) {
        todaysSections = appendItemsToSection({
          sections: todaysSections,
          items: reviewItems,
          targetHeading: this.settings.githubSectionHeading,
        });
        logger.info(`Added ${reviewItems.length} GitHub PR items to today's note`);
      }
      if (openPRItems.length > 0) {
        todaysSections = appendItemsToSection({
          sections: todaysSections,
          items: openPRItems,
          targetHeading: this.settings.githubOpenPRsHeading,
        });
        logger.info(`Added ${openPRItems.length} open PR items to today's note`);
      }
      if (labeledItems.length > 0) {
        todaysSections = appendItemsToSection({
          sections: todaysSections,
          items: labeledItems,
          targetHeading: this.settings.githubLabeledPRsHeading,
        });
        logger.info(`Added ${labeledItems.length} labeled PR items to today's note`);
      }
    }

    const content = convertSectionsToContent({ sections: todaysSections });
    await this.app.vault.modify(todayNote, content);

    await this.archiveNote(mostRecentNote);
  }

  async archiveNote(note: TFile) {
    const dailyNoteFolder = getDailyNoteFolder(this.app);
    const archiveFolderName = this.settings.archiveFolderName || "archive";
    const archivePath = dailyNoteFolder
      ? `${dailyNoteFolder}/${archiveFolderName}`
      : archiveFolderName;
    const archiveFolder = this.app.vault.getAbstractFileByPath(archivePath);

    if (!archiveFolder) {
      await this.app.vault.createFolder(archivePath);
    }

    const newPath = `${archivePath}/${note.name}`;
    await this.app.fileManager.renameFile(note, newPath);
    logger.info(`Archived ${note.name} to ${newPath}`);
  }

  openRecapModal() {
    if (!this.settings.enableGithubIntegration) {
      logger.error("GitHub integration is not enabled. Please enable it in settings.");
      return;
    }

    new RecapModal(this.app, async (selection) => {
      if (selection.type === "yearly") {
        await this.generateYearlyGitHubRecap(selection.year);
      } else {
        await this.generateGitHubRecap(selection.month, selection.year);
      }
    }).open();
  }

  async generateGitHubRecap(month: number, year: number) {
    const loadingNotice = new Notice("Generating GitHub recap... This may take a few minutes.", 0);

    const stats = await fetchGitHubRecap(this.settings, month, year);
    loadingNotice.hide();

    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const monthName = months[month];
    const generatedDate = moment().format("YYYY-MM-DD");

    let content = `# GitHub Recap - ${monthName} ${year}\n\n`;
    content += `## Summary\n`;
    content += `- **PRs Opened:** ${stats.prsOpened}\n`;
    content += `- **PRs Merged:** ${stats.prsMerged}\n`;
    content += `- **PRs Reviewed:** ${stats.prsReviewed}\n`;
    content += `- **Review Comments:** ${stats.reviewComments}\n`;
    content += `- **Issues Opened:** ${stats.issuesOpened}\n`;
    content += `- **Issues Closed:** ${stats.issuesClosed}\n`;

    if (stats.mostActiveRepo) {
      content += `\n## Most Active Repository\n`;
      content += `\`${stats.mostActiveRepo}\` - ${stats.mostActiveRepoCount} contributions\n`;
    }

    content += `\n---\n*Generated on ${generatedDate}*\n`;

    const filePath = this.settings.githubRecapFilePath || "GitHub Recap.md";
    const existingFile = this.app.vault.getAbstractFileByPath(filePath);

    if (existingFile instanceof TFile) {
      await this.app.vault.modify(existingFile, content);
      logger.info(`Updated GitHub recap at ${filePath}`);
    } else {
      await this.app.vault.create(filePath, content);
      logger.info(`Created GitHub recap at ${filePath}`);
    }

    new Notice("GitHub recap generated!");
  }

  async generateYearlyGitHubRecap(year: number) {
    const loadingNotice = new Notice("Generating yearly GitHub recap... This may take several minutes.", 0);

    const recap = await fetchGitHubYearlyRecap(this.settings, year);
    loadingNotice.hide();

    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const generatedDate = moment().format("YYYY-MM-DD");

    let content = `# GitHub Recap - ${year}\n\n`;

    // Yearly totals
    content += `## Yearly Totals\n`;
    content += `- **PRs Opened:** ${recap.totals.prsOpened}\n`;
    content += `- **PRs Merged:** ${recap.totals.prsMerged}\n`;
    content += `- **PRs Reviewed:** ${recap.totals.prsReviewed}\n`;
    content += `- **Review Comments:** ${recap.totals.reviewComments}\n`;
    content += `- **Issues Opened:** ${recap.totals.issuesOpened}\n`;
    content += `- **Issues Closed:** ${recap.totals.issuesClosed}\n`;

    if (recap.totals.mostActiveRepo) {
      content += `\n## Most Active Repository\n`;
      content += `\`${recap.totals.mostActiveRepo}\` - ${recap.totals.mostActiveRepoCount} contributions\n`;
    }

    // Monthly breakdown table
    content += `\n## Monthly Breakdown\n\n`;
    content += `| Month | PRs Opened | PRs Merged | PRs Reviewed | Review Comments | Issues Opened | Issues Closed |\n`;
    content += `|-------|------------|------------|--------------|-----------------|---------------|---------------|\n`;

    for (const { month, stats } of recap.monthly) {
      content += `| ${months[month]} | ${stats.prsOpened} | ${stats.prsMerged} | ${stats.prsReviewed} | ${stats.reviewComments} | ${stats.issuesOpened} | ${stats.issuesClosed} |\n`;
    }

    // PR list grouped by month
    if (recap.totals.prList.length > 0) {
      content += `\n## Pull Requests Submitted\n\n`;
      for (const { month, stats } of recap.monthly) {
        if (stats.prList.length > 0) {
          content += `### ${months[month]}\n`;
          for (const pr of stats.prList) {
            content += `- [${pr.title}](${pr.url}) - \`${pr.repo}\`\n`;
          }
          content += `\n`;
        }
      }
    }

    content += `---\n*Generated on ${generatedDate}*\n`;

    const filePath = this.settings.githubRecapFilePath || "GitHub Recap.md";
    const existingFile = this.app.vault.getAbstractFileByPath(filePath);

    if (existingFile instanceof TFile) {
      await this.app.vault.modify(existingFile, content);
      logger.info(`Updated GitHub yearly recap at ${filePath}`);
    } else {
      await this.app.vault.create(filePath, content);
      logger.info(`Created GitHub yearly recap at ${filePath}`);
    }

    new Notice("GitHub yearly recap generated!");
  }

  onunload() {
    logger.info("Unloading Daily Note Rollover plugin");
  }
}
