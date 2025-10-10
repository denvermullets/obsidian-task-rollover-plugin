import { TFile, moment } from "obsidian";

export function getDailyNoteFormat(app: any): string {
  // @ts-ignore internal plugin
  const dailyNotesPlugin = app.internalPlugins?.plugins?.["daily-notes"];
  let format = "YYYY-MM-DD";
  if (dailyNotesPlugin?.instance?.options?.format) {
    format = dailyNotesPlugin.instance.options.format;
  }
  return format;
}

export function isDailyNote(app: any, file: TFile): boolean {
  // @ts-ignore internal plugin
  const dailyNotesPlugin = app.internalPlugins?.plugins?.["daily-notes"];

  let format = "YYYY-MM-DD";
  let folder = "";

  if (dailyNotesPlugin?.instance?.options) {
    const options = dailyNotesPlugin.instance.options;
    if (options.format) format = options.format;
    if (options.folder) folder = options.folder;
  }

  if (folder) {
    const expectedFolder = folder.endsWith("/") ? folder : folder + "/";
    if (!file.path.startsWith(expectedFolder)) return false;
  }

  const today = moment().format(format) + ".md";
  const yesterday = moment().subtract(1, "days").format(format) + ".md";
  return file.name === today || file.name === yesterday;
}

export async function getDailyNote(app: any, date: moment.Moment): Promise<TFile | null> {
  // @ts-ignore internal plugin
  const dailyNotesPlugin = app.internalPlugins?.plugins?.["daily-notes"];

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

export function getDailyNoteFolder(app: any): string {
  // @ts-ignore internal plugin
  const dailyNotesPlugin = app.internalPlugins?.plugins?.["daily-notes"];
  let folder = "";

  if (dailyNotesPlugin?.instance?.options?.folder) {
    folder = dailyNotesPlugin.instance.options.folder;
  }

  return folder;
}

export const getTodayNote = (app: any) => getDailyNote(app, moment());

export async function getMostRecentDailyNote(app: any): Promise<TFile | null> {
  const folder = getDailyNoteFolder(app);
  const format = getDailyNoteFormat(app);

  // Get all files in the daily notes folder
  const folderPath = folder || "/";
  const abstractFolder = app.vault.getAbstractFileByPath(folderPath);

  if (!abstractFolder || !(abstractFolder as any).children) {
    return null;
  }

  const today = moment().format(format) + ".md";
  const files = (abstractFolder as any).children
    .filter((file: any) => file instanceof TFile && file.extension === "md" && file.name !== today)
    .map((file: TFile) => {
      // Try to parse the date from the filename
      const nameWithoutExt = file.name.replace(".md", "");
      const parsedDate = moment(nameWithoutExt, format, true);
      return {
        file,
        date: parsedDate.isValid() ? parsedDate : null,
      };
    })
    .filter((item: any) => item.date !== null)
    .sort((a: any, b: any) => b.date.valueOf() - a.date.valueOf());

  return files.length > 0 ? files[0].file : null;
}
