# Daily Note Rollover Plugin

An Obsidian plugin that automatically moves unchecked items from yesterday's daily note to today's daily note.

## Features

- Automatically detects when you open a daily note
- Moves all unchecked checkbox items from yesterday's note to today's note
- Manual command available: "Move unchecked items from yesterday to today"
- Supports multiple daily note formats (YYYY-MM-DD, DD-MM-YYYY, etc.)

## Installation

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create a folder in your vault's `.obsidian/plugins/` directory called `daily-task-rollover`
3. Copy the downloaded files into that folder
4. Reload Obsidian
5. Enable the plugin in Settings → Community Plugins

### Development

1. Clone this repository into your vault's `.obsidian/plugins/` folder
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start compilation in watch mode
4. Reload Obsidian to load the plugin
5. Make changes and reload to see them take effect

## Building

- `npm run build` - Builds the plugin for production
- `npm run dev` - Builds the plugin and watches for changes

## How it Works

The plugin looks for unchecked items (lines starting with `- [ ]`, `* [ ]`, or `+ [ ]`) in yesterday's daily note and appends them to today's daily note under a "Rolled over from yesterday" section.

## Supported Daily Note Formats

- `YYYY-MM-DD` (e.g., 2024-01-15)
- `YYYY-MM-DD-dddd` (e.g., 2024-01-15-Monday)
- `DD-MM-YYYY` (e.g., 15-01-2024)
- `MM-DD-YYYY` (e.g., 01-15-2024)
- `YYYYMMDD` (e.g., 20240115)

The plugin also checks for notes in a "Daily Notes" folder.

## License

MIT
