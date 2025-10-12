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
  sectionHasContent,
  appendItemsToSection,
  extractUncheckedItemsFromSections,
} from "./sections";
import { fetchGitHubPRs } from "./github";
import { CALLOUT_PREFIX } from "./constants";

export default class DailyNoteRolloverPlugin extends Plugin {
  settings: DailyNoteRolloverSettings;
  private processedNotes = new Set<string>();

  async onload() {
    await this.loadSettings();
    console.log("Loading Daily Note Rollover plugin");

    this.addSettingTab(new DailyNoteRolloverSettingTab(this.app, this));

    this.addCommand({
      id: "rollover-unchecked-items",
      name: "Move unchecked items from yesterday to today",
      callback: () => this.rolloverUncheckedItems(true),
    });

    this.registerEvent(
      this.app.vault.on("create", async (file) => {
        if (
          file instanceof TFile &&
          isDailyNote(this.app, file) &&
          file.name === moment().format(getDailyNoteFormat(this.app)) + ".md"
        ) {
          await this.rolloverUncheckedItems(false);
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

  async rolloverUncheckedItems(forceRollover = false) {
    const todayNote = await getTodayNote(this.app);
    if (!todayNote) return;

    let todayContent = await this.app.vault.read(todayNote);

    if (!forceRollover) {
      const hasTaskSection = sectionHasContent(todayContent, this.settings.targetSectionHeading);
      const hasGithubSection =
        this.settings.enableGithubIntegration &&
        sectionHasContent(todayContent, this.settings.githubSectionHeading);
      const hasOpenPRSection =
        this.settings.enableGithubIntegration &&
        sectionHasContent(todayContent, this.settings.githubOpenPRsHeading);
      const hasLabeledPRSection =
        this.settings.enableGithubIntegration &&
        sectionHasContent(todayContent, this.settings.githubLabeledPRsHeading);

      if (hasTaskSection || hasGithubSection || hasOpenPRSection || hasLabeledPRSection) {
        console.log("Today's note already has content, skipping rollover");
        this.processedNotes.add(todayNote.path);
        return;
      }
    }

    this.processedNotes.add(todayNote.path);

    const mostRecentNote = await getMostRecentDailyNote(this.app);
    let shouldArchive = false;
    if (mostRecentNote) {
      const mostRecentContent = await this.app.vault.read(mostRecentNote);
      const uncheckedItems = await extractUncheckedItemsFromSections({
        content: mostRecentContent,
        settings: this.settings,
        calloutPrefix: isCalloutHeader(this.settings.targetSectionHeading) ? CALLOUT_PREFIX : "",
      });
      if (uncheckedItems.length > 0) {
        todayContent = appendItemsToSection(
          todayContent,
          uncheckedItems,
          this.settings.targetSectionHeading
        );
        console.log(
          `Moved ${uncheckedItems.length} unchecked items from ${mostRecentNote.name} to today's note`
        );
        shouldArchive = true;
      }
    } else {
      console.log("No note found for previous day, check archive.");
    }

    if (this.settings.enableGithubIntegration) {
      const { reviewItems, openPRItems, labeledItems } = await fetchGitHubPRs(this.settings);
      if (reviewItems.length > 0) {
        todayContent = appendItemsToSection(
          todayContent,
          reviewItems,
          this.settings.githubSectionHeading
        );
        console.log(`Added ${reviewItems.length} GitHub PR items to today's note`);
      }
      if (openPRItems.length > 0) {
        todayContent = appendItemsToSection(
          todayContent,
          openPRItems,
          this.settings.githubOpenPRsHeading
        );
        console.log(`Added ${openPRItems.length} open PR items to today's note`);
      }
      if (labeledItems.length > 0) {
        todayContent = appendItemsToSection(
          todayContent,
          labeledItems,
          this.settings.githubLabeledPRsHeading
        );
        console.log(`Added ${labeledItems.length} labeled PR items to today's note`);
      }
    }

    await this.app.vault.modify(todayNote, todayContent);

    if (shouldArchive && mostRecentNote) {
      await this.archiveNote(mostRecentNote);
    }
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
    console.log(`Archived ${note.name} to ${newPath}`);
  }

  onunload() {
    console.log("Unloading Daily Note Rollover plugin");
  }
}
