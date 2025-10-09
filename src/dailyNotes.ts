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

export const getTodayNote = (app: any) => getDailyNote(app, moment());
export const getYesterdayNote = (app: any) => getDailyNote(app, moment().subtract(1, "days"));
