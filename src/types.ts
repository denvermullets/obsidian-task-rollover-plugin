import type { Plugin } from "obsidian";

export interface DailyNoteRolloverSettings {
  targetSectionHeading: string;
  archiveFolderName: string;
  githubToken: string;
  githubUsername: string;
  githubRepos: string;
  githubRepositories: string[];
  githubSectionHeading: string;
  githubOpenPRsHeading: string;
  githubLabeledPRsHeading: string;
  githubTrackedLabels: string;
  enableGithubIntegration: boolean;
  skippedTaskExtractionSections: string[];
}

export const DEFAULT_SETTINGS: DailyNoteRolloverSettings = {
  targetSectionHeading: "## Tasks",
  archiveFolderName: "archive",
  githubToken: "",
  githubUsername: "",
  githubRepos: "",
  githubRepositories: [],
  githubSectionHeading: "## GitHub PRs",
  githubOpenPRsHeading: "## My Open PRs",
  githubLabeledPRsHeading: "## Labeled PRs",
  githubTrackedLabels: "",
  enableGithubIntegration: false,
  skippedTaskExtractionSections: ["#### -> Personal tasks"],
};

export type PluginWithSettings<T> = Plugin & { settings: T };
