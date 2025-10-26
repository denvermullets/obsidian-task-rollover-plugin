import { type App, TFile, TFolder, moment } from "obsidian";
import { getInternalPlugin } from "./util";
export function getDailyNoteFormat(app: App): string {
  const dailyNotesPlugin = getInternalPlugin({ id: "daily-notes", app: this.app });

  let format = "YYYY-MM-DD";
  if (dailyNotesPlugin?.instance?.options?.format) {
    format = dailyNotesPlugin.instance.options.format;
  }
  return format;
}

export function isDailyNote(app: App, file: TFile): boolean {
  const dailyNotesPlugin = getInternalPlugin({ id: "daily-notes", app: this.app });

  let format = "YYYY-MM-DD";
  let folder = "";

  const options = dailyNotesPlugin.instance.options;
  if (options.format) format = options.format;
  if (options.folder) folder = options.folder;

  if (folder) {
    const expectedFolder = folder.endsWith("/") ? folder : folder + "/";
    if (!file.path.startsWith(expectedFolder)) return false;
  }

  const today = moment().format(format) + ".md";
  const yesterday = moment().subtract(1, "days").format(format) + ".md";
  return file.name === today || file.name === yesterday;
}

async function getDailyNote(app: App, date: moment.Moment): Promise<TFile | null> {
  const dailyNotesPlugin = getInternalPlugin({ id: "daily-notes", app: this.app });

  let format = "YYYY-MM-DD";
  let folder = "";

  if (dailyNotesPlugin?.instance?.options) {
    const options = dailyNotesPlugin.instance.options;
    if (options.format) format = options.format;
    if (options.folder) folder = options.folder;
  }

  const fileName = date.format(format) + ".md";
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  const file = app.vault.getAbstractFileByPath(filePath);
  return file instanceof TFile ? file : null;
}

export function getDailyNoteFolder(app: App): string {
  const dailyNotesPlugin = getInternalPlugin({ id: "daily-notes", app: this.app });

  let folder = "";

  if (dailyNotesPlugin?.instance?.options?.folder) {
    folder = dailyNotesPlugin.instance.options.folder;
  }

  return folder;
}

export const getTodayNote = (app: App) => getDailyNote(app, moment());

export async function getMostRecentDailyNote(app: App): Promise<TFile | null> {
  const folder = getDailyNoteFolder(app);
  const format = getDailyNoteFormat(app);

  // Get all files in the daily notes folder
  const folderPath = folder || "/";
  const abstractFolder = app.vault.getAbstractFileByPath(folderPath);

  if (!abstractFolder || !(abstractFolder instanceof TFolder)) {
    return null;
  }

  interface FileAndDate {
    file: TFile;
    date: moment.Moment;
  }

  const today = moment().format(format) + ".md";
  const files = abstractFolder.children
    .filter(
      (file: TFile) => file instanceof TFile && file.extension === "md" && file.name !== today
    )
    .map((file: TFile) => {
      // Try to parse the date from the filename
      const nameWithoutExt = file.name.replace(".md", "");
      const parsedDate = moment(nameWithoutExt, format, true);
      return {
        file,
        date: parsedDate.isValid() ? parsedDate : null,
      };
    })
    .filter((item: FileAndDate) => item.date !== null)
    .sort((a: FileAndDate, b: FileAndDate) => b.date.valueOf() - a.date.valueOf());

  return files.length > 0 ? files[0].file : null;
}
