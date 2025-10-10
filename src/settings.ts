import { App, PluginSettingTab, Setting } from "obsidian";
import type DailyNoteRolloverPlugin from "./main";

export default class DailyNoteRolloverSettingTab extends PluginSettingTab {
  plugin: DailyNoteRolloverPlugin;

  constructor(app: App, plugin: DailyNoteRolloverPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Task Rollover Settings" });

    new Setting(containerEl)
      .setName("Target section heading")
      .setDesc('Where unchecked tasks are inserted (e.g., "## Tasks")')
      .addText((text) =>
        text
          .setPlaceholder("## Tasks")
          .setValue(this.plugin.settings.targetSectionHeading)
          .onChange(async (value) => {
            this.plugin.settings.targetSectionHeading = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Archive folder name")
      .setDesc('Subfolder name for archived notes (e.g., "archive" or "old-notes"). Will be created relative to your daily notes folder.')
      .addText((text) =>
        text
          .setPlaceholder("archive")
          .setValue(this.plugin.settings.archiveFolderName)
          .onChange(async (value) => {
            this.plugin.settings.archiveFolderName = value;
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("h2", { text: "GitHub Integration" });

    new Setting(containerEl)
      .setName("Enable GitHub integration")
      .setDesc("Add GitHub PR notifications to your daily notes")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableGithubIntegration).onChange(async (value) => {
          this.plugin.settings.enableGithubIntegration = value;
          await this.plugin.saveSettings();
          this.display();
        })
      );

    if (this.plugin.settings.enableGithubIntegration) {
      new Setting(containerEl)
        .setName("GitHub personal access token")
        .setDesc('Create a token with "repo" scope')
        .addText((text) => {
          const input = text
            .setPlaceholder("ghp_...")
            .setValue(this.plugin.settings.githubToken)
            .onChange(async (value) => {
              this.plugin.settings.githubToken = value;
              await this.plugin.saveSettings();
            }).inputEl;
          input.type = "password";
          return text;
        });

      new Setting(containerEl).setName("GitHub username").addText((text) =>
        text
          .setPlaceholder("octocat")
          .setValue(this.plugin.settings.githubUsername)
          .onChange(async (value) => {
            this.plugin.settings.githubUsername = value;
            await this.plugin.saveSettings();
          })
      );

      new Setting(containerEl)
        .setName("Repositories to monitor")
        .setDesc('Comma-separated (e.g., "owner/repo1, owner/repo2" or URLs)')
        .addTextArea((text) =>
          text
            .setPlaceholder("owner/repo1, owner/repo2")
            .setValue(this.plugin.settings.githubRepos)
            .onChange(async (value) => {
              this.plugin.settings.githubRepos = value;
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl).setName("GitHub section heading").addText((text) =>
        text
          .setPlaceholder("## GitHub PRs")
          .setValue(this.plugin.settings.githubSectionHeading)
          .onChange(async (value) => {
            this.plugin.settings.githubSectionHeading = value;
            await this.plugin.saveSettings();
          })
      );

      new Setting(containerEl).setName("Open PRs section heading").addText((text) =>
        text
          .setPlaceholder("## My Open PRs")
          .setValue(this.plugin.settings.githubOpenPRsHeading)
          .onChange(async (value) => {
            this.plugin.settings.githubOpenPRsHeading = value;
            await this.plugin.saveSettings();
          })
      );

      new Setting(containerEl)
        .setName("Tracked labels")
        .setDesc('Comma-separated list of labels to monitor (e.g., "urgent, bug, needs-attention")')
        .addTextArea((text) =>
          text
            .setPlaceholder("urgent, bug, needs-attention")
            .setValue(this.plugin.settings.githubTrackedLabels)
            .onChange(async (value) => {
              this.plugin.settings.githubTrackedLabels = value;
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Labeled PRs section heading")
        .setDesc("Where labeled PRs appear (only if tracked labels is set)")
        .addText((text) =>
          text
            .setPlaceholder("## Labeled PRs")
            .setValue(this.plugin.settings.githubLabeledPRsHeading)
            .onChange(async (value) => {
              this.plugin.settings.githubLabeledPRsHeading = value;
              await this.plugin.saveSettings();
            })
        );
    }
  }
}
