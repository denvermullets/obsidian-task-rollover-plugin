import { Plugin, TFile, moment } from 'obsidian';

export default class DailyNoteRolloverPlugin extends Plugin {
	private processedNotes: Set<string> = new Set();

	async onload() {
		console.log('Loading Daily Note Rollover plugin');

		// Add command to manually trigger rollover
		this.addCommand({
			id: 'rollover-unchecked-items',
			name: 'Move unchecked items from yesterday to today',
			callback: () => {
				this.rolloverUncheckedItems();
			}
		});

		// Automatically run on daily note creation
		this.registerEvent(
			this.app.workspace.on('file-open', async (file) => {
				if (file && this.isDailyNote(file)) {
					const noteKey = file.path + '-' + moment().format('YYYY-MM-DD');

					// Only process if we haven't already processed this note today
					if (!this.processedNotes.has(noteKey)) {
						this.processedNotes.add(noteKey);
						await this.rolloverUncheckedItems();
					}
				}
			})
		);
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
		// Add a section header if there are unchecked items
		let newContent = todayContent;

		// If the note doesn't end with a newline, add one
		if (!newContent.endsWith('\n')) {
			newContent += '\n';
		}

		// Add section header and unchecked items
		newContent += '\n## Rolled over from yesterday\n';
		newContent += uncheckedItems.join('\n') + '\n';

		return newContent;
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
		if (folder && !file.path.startsWith(folder + '/')) {
			return false;
		}

		// Check if the filename matches today's format
		const expectedFileName = moment().format(format) + '.md';
		return file.name === expectedFileName;
	}

	onunload() {
		console.log('Unloading Daily Note Rollover plugin');
	}
}
