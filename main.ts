import { App, Plugin, PluginSettingTab, Setting, TFile, moment } from "obsidian";

interface DailyNoteRolloverSettings {
  targetSectionHeading: string;
  githubToken: string;
  githubUsername: string;
  githubRepos: string;
  githubSectionHeading: string;
  githubOpenPRsHeading: string;
  enableGithubIntegration: boolean;
}

const DEFAULT_SETTINGS: DailyNoteRolloverSettings = {
  targetSectionHeading: "## Tasks",
  githubToken: "",
  githubUsername: "",
  githubRepos: "",
  githubSectionHeading: "## GitHub PRs",
  githubOpenPRsHeading: "## My Open PRs",
  enableGithubIntegration: false,
};

export default class DailyNoteRolloverPlugin extends Plugin {
  settings: DailyNoteRolloverSettings;
  private processedNotes = new Set<string>();

  async onload() {
    await this.loadSettings();
    console.log("Loading Daily Note Rollover plugin");

    // Add settings tab
    this.addSettingTab(new DailyNoteRolloverSettingTab(this.app, this));

    // Add command to manually trigger rollover
    this.addCommand({
      id: "rollover-unchecked-items",
      name: "Move unchecked items from yesterday to today",
      callback: () => {
        this.rolloverUncheckedItems(true);
      },
    });

    // Watch for new daily note creation
    this.registerEvent(
      this.app.vault.on("create", async (file) => {
        if (
          file instanceof TFile &&
          this.isDailyNote(file) &&
          file.name === moment().format(this.getDailyNoteFormat()) + ".md"
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

  getDailyNoteFormat(): string {
    // @ts-ignore - Access internal daily notes plugin
    const dailyNotesPlugin = this.app.internalPlugins?.plugins?.["daily-notes"];
    let format = "YYYY-MM-DD";

    if (dailyNotesPlugin?.instance?.options?.format) {
      format = dailyNotesPlugin.instance.options.format;
    }

    return format;
  }

  async rolloverUncheckedItems(forceRollover: boolean = false) {
    const todayNote = await this.getTodayNote();

    if (!todayNote) {
      console.log("No daily note found for today");
      return;
    }

    // Read today's note
    let todayContent = await this.app.vault.read(todayNote);

    // Check if note has already been processed by looking for our section headings with content
    if (!forceRollover) {
      const hasTaskSection = this.sectionHasContent(
        todayContent,
        this.settings.targetSectionHeading
      );
      const hasGithubSection =
        this.settings.enableGithubIntegration &&
        this.sectionHasContent(todayContent, this.settings.githubSectionHeading);
      const hasOpenPRSection =
        this.settings.enableGithubIntegration &&
        this.sectionHasContent(todayContent, this.settings.githubOpenPRsHeading);

      if (hasTaskSection || hasGithubSection || hasOpenPRSection) {
        console.log("Today's note already has content, skipping rollover");
        this.processedNotes.add(todayNote.path);
        return;
      }
    }

    // Mark this note as processed
    this.processedNotes.add(todayNote.path);

    // Process unchecked items from yesterday
    const yesterdayNote = await this.getYesterdayNote();
    if (yesterdayNote) {
      const yesterdayContent = await this.app.vault.read(yesterdayNote);
      const uncheckedItems = this.extractUncheckedItems(yesterdayContent);

      if (uncheckedItems.length > 0) {
        todayContent = this.appendItemsToSection(
          todayContent,
          uncheckedItems,
          this.settings.targetSectionHeading
        );
        console.log(`Moved ${uncheckedItems.length} unchecked items to today's note`);
      }
    }

    // Fetch and add GitHub PR information
    if (this.settings.enableGithubIntegration) {
      const { reviewItems, openPRItems } = await this.fetchGitHubPRs();
      if (reviewItems.length > 0) {
        todayContent = this.appendItemsToSection(
          todayContent,
          reviewItems,
          this.settings.githubSectionHeading
        );
        console.log(`Added ${reviewItems.length} GitHub PR items to today's note`);
      }
      if (openPRItems.length > 0) {
        todayContent = this.appendItemsToSection(
          todayContent,
          openPRItems,
          this.settings.githubOpenPRsHeading
        );
        console.log(`Added ${openPRItems.length} open PR items to today's note`);
      }
    }

    await this.app.vault.modify(todayNote, todayContent);
  }

  sectionHasContent(content: string, sectionHeading: string): boolean {
    const lines = content.split("\n");
    let inSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Found the section heading
      if (line.trim() === sectionHeading.trim()) {
        inSection = true;
        continue;
      }

      // If we're in the section and hit another heading, stop
      if (inSection && line.trim().match(/^#+\s/)) {
        return false;
      }

      // If we're in the section and find non-empty content, return true
      if (inSection && line.trim() !== "") {
        return true;
      }
    }

    return false;
  }

  extractUncheckedItems(content: string): string[] {
    const lines = content.split("\n");
    const uncheckedItems: string[] = [];

    for (const line of lines) {
      // Match unchecked items: - [ ] or * [ ] or + [ ]
      if (line.trim().match(/^[-*+]\s+\[\s\]/)) {
        uncheckedItems.push(line);
      }
    }

    return uncheckedItems;
  }

  appendItemsToSection(todayContent: string, items: string[], targetHeading: string): string {
    const lines = todayContent.split("\n");

    // Find the target section heading
    let insertIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === targetHeading.trim()) {
        insertIndex = i + 1;
        break;
      }
    }

    // If target section not found, append to the end
    if (insertIndex === -1) {
      let newContent = todayContent;
      if (!newContent.endsWith("\n")) {
        newContent += "\n";
      }
      newContent += "\n" + targetHeading + "\n";
      newContent += items.join("\n") + "\n";
      return newContent;
    }

    // Insert items after the target heading
    // Skip any existing content until we find an empty line or another heading
    while (
      insertIndex < lines.length &&
      lines[insertIndex].trim() !== "" &&
      !lines[insertIndex].trim().match(/^#+\s/)
    ) {
      insertIndex++;
    }

    // Insert the items
    lines.splice(insertIndex, 0, ...items);

    return lines.join("\n");
  }

  async getYesterdayNote(): Promise<TFile | null> {
    const yesterday = moment().subtract(1, "days");
    return this.getDailyNote(yesterday);
  }

  async getTodayNote(): Promise<TFile | null> {
    const today = moment();
    return this.getDailyNote(today);
  }

  async getDailyNote(date: moment.Moment): Promise<TFile | null> {
    // @ts-ignore - Access internal daily notes plugin
    const dailyNotesPlugin = this.app.internalPlugins?.plugins?.["daily-notes"];

    let format = "YYYY-MM-DD";
    let folder = "";

    // Get settings from daily notes core plugin if available
    if (dailyNotesPlugin?.instance?.options) {
      const options = dailyNotesPlugin.instance.options;
      if (options.format) {
        format = options.format;
      }
      if (options.folder) {
        folder = options.folder;
      }
    }

    // Build the file path
    const fileName = date.format(format) + ".md";
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    const file = this.app.vault.getAbstractFileByPath(filePath);

    if (file instanceof TFile) {
      return file;
    }

    return null;
  }

  isDailyNote(file: TFile): boolean {
    // @ts-ignore - Access internal daily notes plugin
    const dailyNotesPlugin = this.app.internalPlugins?.plugins?.["daily-notes"];

    let format = "YYYY-MM-DD";
    let folder = "";

    // Get settings from daily notes core plugin if available
    if (dailyNotesPlugin?.instance?.options) {
      const options = dailyNotesPlugin.instance.options;
      if (options.format) {
        format = options.format;
      }
      if (options.folder) {
        folder = options.folder;
      }
    }

    // Check if the file is in the daily notes folder
    if (folder) {
      const expectedFolder = folder.endsWith("/") ? folder : folder + "/";
      if (!file.path.startsWith(expectedFolder)) {
        return false;
      }
    }

    // Check if the filename matches today's or yesterday's format
    const today = moment().format(format) + ".md";
    const yesterday = moment().subtract(1, "days").format(format) + ".md";

    return file.name === today || file.name === yesterday;
  }

  async fetchGitHubPRs(): Promise<{ reviewItems: string[]; openPRItems: string[] }> {
    if (
      !this.settings.enableGithubIntegration ||
      !this.settings.githubToken ||
      !this.settings.githubUsername
    ) {
      return { reviewItems: [], openPRItems: [] };
    }

    const reviewItems: string[] = [];
    const openPRItems: string[] = [];
    const repos = this.settings.githubRepos
      .split(",")
      .map((r) => {
        r = r.trim();
        // Extract owner/repo from URLs like https://github.com/owner/repo
        const match = r.match(/github\.com\/([^\/]+\/[^\/]+)/);
        return match ? match[1] : r;
      })
      .filter((r) => r.length > 0);

    try {
      const yesterday = moment().subtract(1, "days").toISOString();

      // Fetch review requests assigned to you
      const searchQuery = `type:pr state:open review-requested:${this.settings.githubUsername}`;
      const reviewRequests = await this.githubApiRequest(
        `https://api.github.com/search/issues?q=${encodeURIComponent(
          searchQuery
        )}&sort=updated&order=desc`
      );

      if (reviewRequests?.items) {
        for (const pr of reviewRequests.items) {
          reviewItems.push(`- [ ] Review requested: [${pr.title}](${pr.html_url})`);
        }
      }

      // Track PRs with new comments for highlighting
      const prsWithComments = new Set<string>();

      // Fetch PRs you've authored with new comments
      for (const repo of repos) {
        if (!repo.includes("/")) continue;

        const prsResponse = await this.githubApiRequest(
          `https://api.github.com/repos/${repo}/pulls?state=open&per_page=100`
        );

        if (Array.isArray(prsResponse)) {
          for (const pr of prsResponse) {
            // Check if you're the author
            if (pr.user?.login === this.settings.githubUsername) {
              // Fetch comments to see if there are new ones
              const commentsResponse = await this.githubApiRequest(
                `https://api.github.com/repos/${repo}/pulls/${pr.number}/comments?since=${yesterday}`
              );

              const reviewCommentsResponse = await this.githubApiRequest(
                `https://api.github.com/repos/${repo}/issues/${pr.number}/comments?since=${yesterday}`
              );

              const newComments =
                (Array.isArray(commentsResponse) ? commentsResponse.length : 0) +
                (Array.isArray(reviewCommentsResponse) ? reviewCommentsResponse.length : 0);

              if (newComments > 0) {
                reviewItems.push(
                  `- [ ] ${newComments} new comment${newComments > 1 ? "s" : ""} on your PR: [${
                    pr.title
                  }](${pr.html_url})`
                );
                prsWithComments.add(pr.html_url);
              }
            }
          }
        }
      }

      // Add a section for your open PRs and recently merged PRs
      const allPRs = await this.fetchYourOpenAndMergedPRs(repos, yesterday);
      openPRItems.push(...allPRs);

      return { reviewItems, openPRItems };
    } catch (error) {
      console.error("Error fetching GitHub PRs:", error);
      return { reviewItems: [], openPRItems: [] };
    }
  }

  async fetchYourOpenAndMergedPRs(repos: string[], since: string): Promise<string[]> {
    const prItems: string[] = [];

    for (const repo of repos) {
      if (!repo.includes("/")) continue;

      // Fetch open PRs
      const openPRsResponse = await this.githubApiRequest(
        `https://api.github.com/repos/${repo}/pulls?state=open&per_page=100`
      );

      if (Array.isArray(openPRsResponse)) {
        for (const pr of openPRsResponse) {
          if (pr.user?.login === this.settings.githubUsername) {
            // Check if there was activity yesterday
            const hasActivity = new Date(pr.updated_at) >= new Date(since);

            if (hasActivity) {
              prItems.push(`- [ ] 🔥 [${pr.title}](${pr.html_url}) *(activity since yesterday)*`);
            } else {
              prItems.push(`- [ ] [${pr.title}](${pr.html_url})`);
            }
          }
        }
      }

      // Fetch recently merged PRs
      const closedPRsResponse = await this.githubApiRequest(
        `https://api.github.com/repos/${repo}/pulls?state=closed&per_page=100&sort=updated&direction=desc`
      );

      if (Array.isArray(closedPRsResponse)) {
        for (const pr of closedPRsResponse) {
          if (
            pr.user?.login === this.settings.githubUsername &&
            pr.merged_at &&
            new Date(pr.merged_at) >= new Date(since)
          ) {
            prItems.push(`- [x] ✅ [${pr.title}](${pr.html_url}) *(merged)*`);
          }
        }
      }
    }

    return prItems;
  }

  async githubApiRequest(url: string): Promise<any> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.settings.githubToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  }

  onunload() {
    console.log("Unloading Daily Note Rollover plugin");
  }
}

class DailyNoteRolloverSettingTab extends PluginSettingTab {
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
      .setDesc(
        'The heading in your daily note template where unchecked tasks should be inserted (e.g., "## Tasks" or "## Todo")'
      )
      .addText((text) =>
        text
          .setPlaceholder("## Tasks")
          .setValue(this.plugin.settings.targetSectionHeading)
          .onChange(async (value) => {
            this.plugin.settings.targetSectionHeading = value;
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("h2", { text: "GitHub Integration" });

    new Setting(containerEl)
      .setName("Enable GitHub integration")
      .setDesc("Automatically add GitHub PR notifications to your daily notes")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableGithubIntegration).onChange(async (value) => {
          this.plugin.settings.enableGithubIntegration = value;
          await this.plugin.saveSettings();
          this.display(); // Refresh to show/hide other settings
        })
      );

    if (this.plugin.settings.enableGithubIntegration) {
      new Setting(containerEl)
        .setName("GitHub personal access token")
        .setDesc('Create a token at https://github.com/settings/tokens with "repo" scope')
        .addText(
          (text) =>
            (text
              .setPlaceholder("ghp_...")
              .setValue(this.plugin.settings.githubToken)
              .onChange(async (value) => {
                this.plugin.settings.githubToken = value;
                await this.plugin.saveSettings();
              }).inputEl.type = "password")
        );

      new Setting(containerEl)
        .setName("GitHub username")
        .setDesc("Your GitHub username")
        .addText((text) =>
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
        .setDesc('Comma-separated list of repositories (e.g., "owner/repo1, owner/repo2")')
        .addTextArea((text) =>
          text
            .setPlaceholder("owner/repo1, owner/repo2")
            .setValue(this.plugin.settings.githubRepos)
            .onChange(async (value) => {
              this.plugin.settings.githubRepos = value;
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("GitHub section heading")
        .setDesc("The heading where GitHub PR review requests and comments should be inserted")
        .addText((text) =>
          text
            .setPlaceholder("## GitHub PRs")
            .setValue(this.plugin.settings.githubSectionHeading)
            .onChange(async (value) => {
              this.plugin.settings.githubSectionHeading = value;
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Open PRs section heading")
        .setDesc("The heading where your open PRs and recently merged PRs should be inserted")
        .addText((text) =>
          text
            .setPlaceholder("## My Open PRs")
            .setValue(this.plugin.settings.githubOpenPRsHeading)
            .onChange(async (value) => {
              this.plugin.settings.githubOpenPRsHeading = value;
              await this.plugin.saveSettings();
            })
        );
    }
  }
}
