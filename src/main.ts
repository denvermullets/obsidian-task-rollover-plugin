import { isCalloutHeader } from "./util";
import { Plugin, TFile, moment } from "obsidian";
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
import { fetchGitHubPRs } from "./github";
import { CALLOUT_PREFIX } from "./constants";
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
    if (!todayNote) return;
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

  onunload() {
    logger.info("Unloading Daily Note Rollover plugin");
  }
}
