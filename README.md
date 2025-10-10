# Daily Note Rollover Plugin

An Obsidian plugin that automatically moves unchecked items from yesterday's daily note to today's daily note, and optionally integrates with GitHub to track PR reviews and comments.

## Why?

Well, I used a plugin that did this and it didn't work so I let Claude Code go nuts with it. I opted to add more integration stuff since I will probably be the only person to ever use this. A common problem I have is notification fatigue, especially with Github, so this should help prioritize at a glance for me.

<img width="864" height="628" alt="Screenshot 2025-10-01 at 10 28 41 PM" src="https://github.com/user-attachments/assets/eadeeee2-24c6-4113-970d-c36eaf5c4691" />
<img width="1007" height="914" alt="image" src="https://github.com/user-attachments/assets/f17506a9-55d7-4f2c-82bf-b0e2f15cabf1" />

## Features

- Automatically moves unchecked checkbox items from yesterday's note to today's note
- Runs on app load and when creating a new daily note
- Manual command available: "Move unchecked items from yesterday to today"
- Supports multiple daily note formats (YYYY-MM-DD, DD-MM-YYYY, etc.)
- Moves previous notes to an 'archive' folder (customizable)
- **GitHub Integration**: Track PR review requests and new comments on your PRs
- Track PR Labels if you want to follow a certain Label on your Repos

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
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start compilation in watch mode
4. Reload Obsidian to load the plugin
5. Make changes and reload to see them take effect

## Building

- `npm run build` - Builds the plugin for production
- `npm run dev` - Builds the plugin and watches for changes

## Configuration

### Task Rollover Settings

1. Go to Settings → Daily Note Rollover
2. Configure the **Target section heading** where unchecked tasks should be inserted (default: `## Tasks`)
   - This heading should exist in your daily note template
   - If it doesn't exist, the plugin will create it

### GitHub Integration Setup

The plugin can automatically add GitHub PR information to your daily notes, including:

- PRs where you've been requested as a reviewer
- New comments on your PRs (since yesterday)

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
     - Format: `owner/repo1, owner/repo2`
     - Example: `facebook/react, microsoft/vscode`
   - **GitHub section heading**: Customize where PR info appears (default: `## GitHub PRs`)

#### What Gets Added to Your Daily Note:

The plugin will add checkable task items like:

- `- [ ] Review requested: [Add new feature X](https://github.com/owner/repo/pull/123)`
- `- [ ] 3 new comments on your PR: [Fix bug Y](https://github.com/owner/repo/pull/456)`

These items are inserted at the section heading you specify, making it easy to track your GitHub activity alongside your daily tasks.

## How it Works

### Task Rollover

The plugin looks for unchecked items (lines starting with `- [ ]`, `* [ ]`, or `+ [ ]`) in yesterday's daily note and inserts them into today's note at your specified section heading.

### GitHub Integration

When enabled, the plugin queries the GitHub API to:

1. Find all open PRs where you've been requested as a reviewer
2. Check your authored PRs for new comments since yesterday
3. Add these as task items in your daily note

## Supported Daily Note Formats

- `YYYY-MM-DD` (e.g., 2024-01-15)
- `YYYY-MM-DD-dddd` (e.g., 2024-01-15-Monday)
- `DD-MM-YYYY` (e.g., 15-01-2024)
- `MM-DD-YYYY` (e.g., 01-15-2024)
- `YYYYMMDD` (e.g., 20240115)

The plugin also checks for notes in a "Daily Notes" folder.

## License

MIT
