# Daily Note Rollover Plugin

An Obsidian plugin that automatically moves unchecked items from yesterday's daily note to today's daily note, and optionally integrates with GitHub to track PR reviews and comments.

## Why?

Well, I used a plugin that did this and it didn't work so I let Claude Code go nuts with it. I opted to add more integration stuff since I will probably be the only person to ever use this. A common problem I have is notification fatigue, especially with Github, so this should help prioritize at a glance for me.

<img width="864" height="628" alt="Screenshot 2025-10-01 at 10 28 41 PM" src="https://github.com/user-attachments/assets/eadeeee2-24c6-4113-970d-c36eaf5c4691" />
<img width="1214" height="1104" alt="Screenshot 2025-10-10 at 11 19 39 AM" src="https://github.com/user-attachments/assets/b9e6d110-5de8-4099-aa07-59cf15287dcb" />

## Features

- Automatically moves unchecked checkbox items from yesterday's note to today's note
- Runs on app load and when creating a new daily note
- Manual command available: "Move unchecked items from yesterday to today"
- Supports multiple daily note formats (YYYY-MM-DD, DD-MM-YYYY, etc.)
- Supports Obsidian callout syntax for section headings (e.g., `>[!info]`)
- Configurable section skipping - exclude specific sections from automatic rollover
- Moves previous notes to an 'archive' folder (customizable)
- **GitHub Integration**: Track PR review requests, your own open/merged PRs with activity indicators, and labeled PRs from monitored repos

## Installation

### Manual Installation

1. Download `main.js` and `manifest.json` from the latest release
2. Create a folder in your vault's `.obsidian/plugins/` directory called `daily-task-rollover`
3. Copy the downloaded files into that folder
4. Reload Obsidian
5. Enable the plugin in Settings → Community Plugins

#### Optional

In this repo I've include some template files in `/sample`.

1. `sample/DailyTemplateGithub_default.md` is the one that works with just straight defaults in our settings
2. the other 2 are the templates that I personally am using day to day

### Development

1. Clone this repository into your vault's `.obsidian/plugins/` folder
2. Run `yarn install` to install dependencies
3. Run `yarn dev` to start compilation in watch mode
4. Reload Obsidian to load the plugin
5. Make changes and reload to see them take effect

> Consider using Obsidian hot reload plugin for better dev experience https://discordapp.com/channels/979539930869010452/1257773276835479572/1426609118436790314

## Building

- `yarn build` - Builds the plugin for production
- `yarn dev` - Builds the plugin and watches for changes

## Configuration

### Task Rollover Settings

1. Go to Settings → Daily Note Rollover
2. Configure the **Target section heading** where unchecked tasks should be inserted (default: `## Tasks`)
   - This heading should exist in your daily note template
   - If it doesn't exist, the plugin will create it
   - Supports standard markdown headings (e.g., `## Tasks`) or callout syntax (e.g., `>[!info]`)
3. Configure **Task extraction sections to skip** to exclude specific sections from rollover
   - Add section headings (one per line) that you want to skip
   - Tasks under these headings won't be moved to today's note
   - Default: `#### -> Personal tasks`
   - Use the + button to add new excluded sections, and drag/reorder with arrows
4. Set **Archive folder name** for where processed notes are moved (default: `archive`)

### GitHub Integration Setup

The plugin can automatically add GitHub PR information to your daily notes, including:

- PRs where you've been requested as a reviewer
- Your own open PRs (with activity indicators for PRs updated in the last 24 hours)
- Your recently merged PRs (automatically checked off)
- PRs with specific labels you're tracking across monitored repos

#### Setup Steps:

1. **Enable GitHub Integration**

   - Go to Settings → Daily Note Rollover → GitHub Integration
   - Toggle on "Enable GitHub integration"

2. **Create a GitHub Personal Access Token**

   - Visit [https://github.com/settings/tokens](https://github.com/settings/tokens)
   - Click "Generate new token (classic)"
   - Give it a descriptive name (e.g., "Obsidian Daily Notes")
   - Select the `repo` scope (this gives access to repositories)
   - Click "Generate token"
   - Copy the token (you won't be able to see it again!)

3. **Configure Plugin Settings**
   - **GitHub personal access token**: Paste the token you just created
   - **GitHub username**: Enter your GitHub username
   - **Repositories to monitor**: Enter a comma-separated list of repositories you want to track
     - Format: `owner/repo1, owner/repo2` or full GitHub URLs
     - Example: `facebook/react, microsoft/vscode` or `https://github.com/facebook/react`
   - **GitHub section heading**: Where PR review requests appear (default: `## GitHub PRs`)
   - **Open PRs section heading**: Where your own open/merged PRs appear (default: `## My Open PRs`)
   - **Tracked labels**: Comma-separated list of labels to monitor (e.g., `urgent, bug, needs-attention`)
   - **Labeled PRs section heading**: Where labeled PRs appear (default: `## Labeled PRs`)

#### What Gets Added to Your Daily Note:

The plugin will add task items organized by type:

**Review Requests** (in GitHub PRs section):
- `- [ ] Review requested: [Add new feature X](https://github.com/owner/repo/pull/123)`

**Your Open PRs** (in My Open PRs section):
- `- [ ] [Fix bug Y](https://github.com/owner/repo/pull/456)` - no recent activity
- `- [ ] 🔥 [Implement feature Z](https://github.com/owner/repo/pull/789) *(activity since yesterday)*` - updated in last 24 hours
- `- [x] ✅ [Update docs](https://github.com/owner/repo/pull/321) *(merged)*` - recently merged (pre-checked!)

**Labeled PRs** (in Labeled PRs section):
- `- [ ] [Critical bug](https://github.com/owner/repo/pull/111)` - matches your tracked labels

These items are inserted at their respective section headings, making it easy to track your GitHub activity alongside your daily tasks.

## How it Works

### Task Rollover

The plugin looks for unchecked items (lines starting with `- [ ]`, `* [ ]`, or `+ [ ]`) in yesterday's daily note and inserts them into today's note at your specified section heading.

### GitHub Integration

When enabled, the plugin queries the GitHub API to:

1. **Search for review requests**: Finds all open PRs where you've been requested as a reviewer
2. **Track your open PRs**: Fetches all open PRs from monitored repos authored by you
   - Checks if they've been updated in the last 24 hours (shows 🔥 indicator if yes)
3. **Track your merged PRs**: Checks recently closed PRs to find ones you authored that were merged in the last 24 hours (shows ✅ and automatically checks them off)
4. **Track labeled PRs**: Filters PRs from monitored repos that match your tracked labels (excludes PRs where you're already the author or reviewer)

All PR information is added as task items in their respective sections in your daily note.

## Supported Daily Note Formats

- `YYYY-MM-DD` (e.g., 2024-01-15)
- `YYYY-MM-DD-dddd` (e.g., 2024-01-15-Monday)
- `DD-MM-YYYY` (e.g., 15-01-2024)
- `MM-DD-YYYY` (e.g., 01-15-2024)
- `YYYYMMDD` (e.g., 20240115)

The plugin also checks for notes in a "Daily Notes" folder.

## License

MIT
