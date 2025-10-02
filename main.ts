import { App, Plugin, PluginSettingTab, Setting, TFile, moment } from 'obsidian';

interface DailyNoteRolloverSettings {
	targetSectionHeading: string;
}

const DEFAULT_SETTINGS: DailyNoteRolloverSettings = {
	targetSectionHeading: '## Tasks'
}

export default class DailyNoteRolloverPlugin extends Plugin {
	settings: DailyNoteRolloverSettings;
	private hasRunOnLoad = false;

	async onload() {
		await this.loadSettings();
		console.log('Loading Daily Note Rollover plugin');

		// Add settings tab
		this.addSettingTab(new DailyNoteRolloverSettingTab(this.app, this));

		// Add command to manually trigger rollover
		this.addCommand({
			id: 'rollover-unchecked-items',
			name: 'Move unchecked items from yesterday to today',
			callback: () => {
				this.rolloverUncheckedItems();
			}
		});

		// Run on plugin load
		this.app.workspace.onLayoutReady(() => {
			this.rolloverUncheckedItems();
			this.hasRunOnLoad = true;
		});

		// Watch for new daily note creation
		this.registerEvent(
			this.app.vault.on('create', async (file) => {
				if (file instanceof TFile && this.isDailyNote(file) && file.name === moment().format(this.getDailyNoteFormat()) + '.md') {
					// Only run if this wasn't already run on load
					if (this.hasRunOnLoad) {
						await this.rolloverUncheckedItems();
					}
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
		const dailyNotesPlugin = this.app.internalPlugins?.plugins?.['daily-notes'];
		let format = 'YYYY-MM-DD';

		if (dailyNotesPlugin?.instance?.options?.format) {
			format = dailyNotesPlugin.instance.options.format;
		}

		return format;
	}

	async rolloverUncheckedItems() {
		const yesterdayNote = await this.getYesterdayNote();
		const todayNote = await this.getTodayNote();

		if (!yesterdayNote) {
			console.log('No daily note found for yesterday');
			return;
		}

		if (!todayNote) {
			console.log('No daily note found for today');
			return;
		}

		// Read yesterday's note
		const yesterdayContent = await this.app.vault.read(yesterdayNote);
		const uncheckedItems = this.extractUncheckedItems(yesterdayContent);

		if (uncheckedItems.length === 0) {
			console.log('No unchecked items found in yesterday\'s note');
			return;
		}

		// Read today's note
		const todayContent = await this.app.vault.read(todayNote);

		// Append unchecked items to today's note
		const newContent = this.appendUncheckedItems(todayContent, uncheckedItems);
		await this.app.vault.modify(todayNote, newContent);

		console.log(`Moved ${uncheckedItems.length} unchecked items to today's note`);
	}

	extractUncheckedItems(content: string): string[] {
		const lines = content.split('\n');
		const uncheckedItems: string[] = [];

		for (const line of lines) {
			// Match unchecked items: - [ ] or * [ ] or + [ ]
			if (line.trim().match(/^[-*+]\s+\[\s\]/)) {
				uncheckedItems.push(line);
			}
		}

		return uncheckedItems;
	}

	appendUncheckedItems(todayContent: string, uncheckedItems: string[]): string {
		const targetHeading = this.settings.targetSectionHeading;
		const lines = todayContent.split('\n');

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
			if (!newContent.endsWith('\n')) {
				newContent += '\n';
			}
			newContent += '\n' + targetHeading + '\n';
			newContent += uncheckedItems.join('\n') + '\n';
			return newContent;
		}

		// Insert unchecked items after the target heading
		// Skip any existing content until we find an empty line or another heading
		while (insertIndex < lines.length && lines[insertIndex].trim() !== '' && !lines[insertIndex].trim().match(/^#+\s/)) {
			insertIndex++;
		}

		// Insert the unchecked items
		lines.splice(insertIndex, 0, ...uncheckedItems);

		return lines.join('\n');
	}

	async getYesterdayNote(): Promise<TFile | null> {
		const yesterday = moment().subtract(1, 'days');
		return this.getDailyNote(yesterday);
	}

	async getTodayNote(): Promise<TFile | null> {
		const today = moment();
		return this.getDailyNote(today);
	}

	async getDailyNote(date: moment.Moment): Promise<TFile | null> {
		// @ts-ignore - Access internal daily notes plugin
		const dailyNotesPlugin = this.app.internalPlugins?.plugins?.['daily-notes'];

		let format = 'YYYY-MM-DD';
		let folder = '';

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
		const fileName = date.format(format) + '.md';
		const filePath = folder ? `${folder}/${fileName}` : fileName;

		const file = this.app.vault.getAbstractFileByPath(filePath);

		if (file instanceof TFile) {
			return file;
		}

		return null;
	}

	isDailyNote(file: TFile): boolean {
		// @ts-ignore - Access internal daily notes plugin
		const dailyNotesPlugin = this.app.internalPlugins?.plugins?.['daily-notes'];

		let format = 'YYYY-MM-DD';
		let folder = '';

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
			const expectedFolder = folder.endsWith('/') ? folder : folder + '/';
			if (!file.path.startsWith(expectedFolder)) {
				return false;
			}
		}

		// Check if the filename matches today's or yesterday's format
		const today = moment().format(format) + '.md';
		const yesterday = moment().subtract(1, 'days').format(format) + '.md';

		return file.name === today || file.name === yesterday;
	}

	onunload() {
		console.log('Unloading Daily Note Rollover plugin');
	}
}

class DailyNoteRolloverSettingTab extends PluginSettingTab {
	plugin: DailyNoteRolloverPlugin;

	constructor(app: App, plugin: DailyNoteRolloverPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Target section heading')
			.setDesc('The heading in your daily note template where unchecked tasks should be inserted (e.g., "## Tasks" or "## Todo")')
			.addText(text => text
				.setPlaceholder('## Tasks')
				.setValue(this.plugin.settings.targetSectionHeading)
				.onChange(async (value) => {
					this.plugin.settings.targetSectionHeading = value;
					await this.plugin.saveSettings();
				}));
	}
}
