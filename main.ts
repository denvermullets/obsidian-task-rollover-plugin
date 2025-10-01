import { Plugin, TFile, moment } from 'obsidian';

export default class DailyNoteRolloverPlugin extends Plugin {
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
					await this.rolloverUncheckedItems();
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
		// Try common daily note formats
		const formats = [
			'YYYY-MM-DD',
			'YYYY-MM-DD-dddd',
			'DD-MM-YYYY',
			'MM-DD-YYYY',
			'YYYYMMDD'
		];

		for (const format of formats) {
			const fileName = date.format(format) + '.md';
			const file = this.app.vault.getAbstractFileByPath(fileName);

			if (file instanceof TFile) {
				return file;
			}

			// Try in Daily Notes folder
			const dailyNotesFolder = 'Daily Notes';
			const fileInFolder = this.app.vault.getAbstractFileByPath(`${dailyNotesFolder}/${fileName}`);

			if (fileInFolder instanceof TFile) {
				return fileInFolder;
			}
		}

		return null;
	}

	isDailyNote(file: TFile): boolean {
		// Check if filename matches common daily note patterns
		const formats = [
			/^\d{4}-\d{2}-\d{2}\.md$/,
			/^\d{4}-\d{2}-\d{2}-.+\.md$/,
			/^\d{2}-\d{2}-\d{4}\.md$/,
			/^\d{8}\.md$/
		];

		return formats.some(pattern => pattern.test(file.name));
	}

	onunload() {
		console.log('Unloading Daily Note Rollover plugin');
	}
}
