import type { Plugin } from "obsidian";

export interface DailyNoteRolloverSettings {
  targetSectionHeading: string;
  archiveFolderName: string;
  githubToken: string;
  githubUsername: string;
  githubRepos: string;
  githubSectionHeading: string;
  githubOpenPRsHeading: string;
  enableGithubIntegration: boolean;
}

export const DEFAULT_SETTINGS: DailyNoteRolloverSettings = {
  targetSectionHeading: "## Tasks",
  archiveFolderName: "archive",
  githubToken: "",
  githubUsername: "",
  githubRepos: "",
  githubSectionHeading: "## GitHub PRs",
  githubOpenPRsHeading: "## My Open PRs",
  enableGithubIntegration: false,
};

export type PluginWithSettings<T> = Plugin & { settings: T };
