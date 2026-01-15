import { App, ButtonComponent, PluginSettingTab, Setting } from "obsidian";
import type DailyNoteRolloverPlugin from "./main";
import { arrayMove } from "./util";

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

    new Setting(this.containerEl)
      .setName("Task extraction sections to skip")
      .setDesc("Allows setting a list of sections that should be ignored during auto rollover")
      .addButton((button: ButtonComponent) => {
        button
          .setTooltip("Add excluded section")
          .setButtonText("+")
          .setCta()
          .onClick(async () => {
            this.plugin.settings.skippedTaskExtractionSections.push("");
            await this.plugin.saveSettings();
            this.display();
          });
      });

    this.plugin.settings.skippedTaskExtractionSections.forEach((excludedSection, index) => {
      const s = new Setting(containerEl)
        .addSearch((cb) => {
          cb.setPlaceholder("Section")
            .setValue(excludedSection)
            .onChange(async (newFolder) => {
              this.plugin.settings.skippedTaskExtractionSections[index] = newFolder;
              await this.plugin.saveSettings();
            });
        })
        .addExtraButton((cb) => {
          cb.setIcon("up-chevron-glyph")
            .setTooltip("Move up")
            .onClick(async () => {
              arrayMove(this.plugin.settings.skippedTaskExtractionSections, index, index - 1);
              await this.plugin.saveSettings();
              this.display();
            });
        })
        .addExtraButton((cb) => {
          cb.setIcon("down-chevron-glyph")
            .setTooltip("Move down")
            .onClick(async () => {
              arrayMove(this.plugin.settings.skippedTaskExtractionSections, index, index + 1);
              await this.plugin.saveSettings();
              this.display();
            });
        })
        .addExtraButton((cb) => {
          cb.setIcon("cross")
            .setTooltip("Delete")
            .onClick(async () => {
              this.plugin.settings.skippedTaskExtractionSections.splice(index, 1);
              await this.plugin.saveSettings();
              this.display();
            });
        });
      s.infoEl.remove();
    });

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
      .setDesc(
        'Subfolder name for archived notes (e.g., "archive" or "old-notes"). Will be created relative to your daily notes folder.'
      )
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

      containerEl.createEl("h3", { text: "GitHub Recap" });

      new Setting(containerEl)
        .setName("Recap file path")
        .setDesc("Where to save the GitHub recap file")
        .addText((text) =>
          text
            .setPlaceholder("GitHub Recap.md")
            .setValue(this.plugin.settings.githubRecapFilePath)
            .onChange(async (value) => {
              this.plugin.settings.githubRecapFilePath = value;
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Include all repositories")
        .setDesc("When disabled, only includes activity from configured repositories above")
        .addToggle((toggle) =>
          toggle.setValue(this.plugin.settings.githubRecapAllRepos).onChange(async (value) => {
            this.plugin.settings.githubRecapAllRepos = value;
            await this.plugin.saveSettings();
          })
        );
    }
  }
}
