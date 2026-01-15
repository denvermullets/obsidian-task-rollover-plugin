# Sample Daily Note Templates

Example templates demonstrating different configurations for the Daily Note Rollover plugin.

## Templates

### [DailyTemplate_default.md](DailyTemplate_default.md)
Basic template using standard markdown headings. Works with default plugin settings. Includes sections for Tasks, GitHub PRs, My Open PRs, Labeled PRs, and Notes.

### [DailyTemplateGithub.md](DailyTemplateGithub.md)
Minimalist template using `#### ->` prefix headings for a cleaner look. Requires custom section heading configuration in settings.

### [DailyTemplateCallout.md](DailyTemplateCallout.md)
Advanced template using Obsidian callout syntax (e.g., `>[!tip]+`, `>[!note]+`) for collapsible, styled sections.

### [DailyTemplateCalloutCustomCss.md](DailyTemplateCalloutCustomCss.md)
Heavily customized callouts with custom icons and colors. Requires the companion CSS snippet.

## Using Custom CSS

To use [DailyTemplateCalloutCustomCss.css](DailyTemplateCalloutCustomCss.css):

1. Copy the CSS file to your vault: `.obsidian/snippets/`
2. Go to Settings → Appearance → CSS snippets
3. Click refresh and toggle the snippet on

See the [official Obsidian CSS snippets documentation](https://help.obsidian.md/Extending+Obsidian/CSS+snippets) for more info.
