# Daily Note Rollover Plugin

[![Release Obsidian plugin](https://github.com/denvermullets/obsidian-task-rollover-plugin/actions/workflows/release.yml/badge.svg)](https://github.com/denvermullets/obsidian-task-rollover-plugin/actions/workflows/release.yml)

An Obsidian plugin that automatically moves unchecked items from yesterday's daily note to today's, with optional GitHub integration for tracking PRs and generating activity recaps.

<img width="943" height="987" alt="Screenshot 2026-01-15 at 9 38 35 AM" src="https://github.com/user-attachments/assets/abc68d2b-dbbd-40a5-b624-5d6627e0c762" />
<img width="982" height="1124" alt="image" src="https://github.com/user-attachments/assets/5354e103-b455-49f9-b5d0-83000c091f17" />



## Features

- **Task Rollover**: Automatically moves unchecked items from yesterday's note to today's
- **GitHub PR Tracking**: Track review requests, your open/merged PRs, and labeled PRs
- **GitHub Recap**: Generate monthly or yearly summaries of your GitHub activity
- Supports multiple daily note formats and Obsidian callout syntax
- Configurable section skipping and archive folder

## Installation

1. Download `main.js` and `manifest.json` from the latest release
2. Create `.obsidian/plugins/daily-task-rollover/` in your vault
3. Copy the files into that folder and enable the plugin

## Configuration

### Task Rollover

- **Target section heading**: Where unchecked tasks are inserted (default: `## Tasks`)
- **Sections to skip**: Exclude specific sections from rollover
- **Archive folder**: Where processed notes are moved (default: `archive`)

### GitHub Integration

1. Enable GitHub integration in settings
2. Create a [Personal Access Token](https://github.com/settings/tokens) with `repo` scope
3. Configure:
   - **GitHub token & username**
   - **Repositories to monitor**: Comma-separated list (e.g., `owner/repo1, owner/repo2`)
   - **Section headings**: Where PRs appear in your daily note
   - **Tracked labels**: Labels to monitor across repos (optional)

### GitHub Recap

Generate a summary of your GitHub activity with the command: **"Generate GitHub Recap"**

Options:

- **Monthly or Yearly**: Choose the time period
- **All repos or configured repos only**: Toggle in settings

The recap includes:

- PRs opened, merged, and reviewed
- Review comments and issues
- Top 5 repositories by contribution
- Full list of PRs submitted (collapsible by month)

Respects GitHub API rate limits with automatic retry handling.

## Sample Templates

See the [sample/](sample/) directory for example daily note templates:

- Standard markdown headings
- Minimalist `#### ->` prefix style
- Obsidian callout syntax with custom CSS

## Development

```bash
yarn install
yarn dev      # Watch mode
yarn build    # Production build
```

## Releasing

```bash
yarn release-patch  # Bumps version, commits, tags, and pushes
```

```bash
# Bump version
yarn version --patch  # or --minor, --major

# Push changes and tags
git push && git push origin v$(node scripts/get-version.mjs)
```

## License

MIT
