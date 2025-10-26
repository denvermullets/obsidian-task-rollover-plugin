import { App } from "obsidian";
import { InternalPlugin, InternalPluginNameType } from "obsidian-typings";
import { Section } from "./sections";

interface GetInternalPluginProps<T extends InternalPluginNameType> {
  id: T;
  app: App;
}

export const getInternalPlugin = <T extends InternalPluginNameType>({
  id,
  app,
}: GetInternalPluginProps<T>) => {
  const pluginCheck = app.internalPlugins.getEnabledPluginById(id);

  if (pluginCheck === null || !("plugin" in pluginCheck) || !pluginCheck.plugin.enabled) {
    throw new Error(`Missing plugin, please install & enable ${id} plugin`);
  }
  return pluginCheck.plugin as unknown as InternalPlugin<typeof pluginCheck>;
};

export const arrayMove = <T>(array: T[], fromIndex: number, toIndex: number): void => {
  if (toIndex < 0 || toIndex === array.length) {
    return;
  }
  const temp = array[fromIndex];
  array[fromIndex] = array[toIndex];
  array[toIndex] = temp;
};

export const isCalloutHeader = (header: string) =>
  header.startsWith(">[!") || header.startsWith("> [!");

export const lineHasUncheckedBox = ({ line }: { line: string }): boolean =>
  !!line.trim().match(/^.*[-*+]\s+\[\s\]/)?.length;

export const lineHasCheckedBox = ({ line }: { line: string }): boolean =>
  !!line.trim().match(/^.*[-*+]\s+\[x\]/i)?.length;

export function stripMarkersFromLine({ line }: { line: string }): string {
  const trimmed = line.trim();

  // Match and remove the optional '>' prefix, list marker (-, *, +), and checkbox
  const cleaned = trimmed.replace(/^>?\s*[-*+]\s+\[[x\s]\]\s*/i, "");

  // Preserve the original indentation structure by getting leading whitespace
  const leadingWhitespace = line.match(/^\s*/)?.[0] || "";

  return leadingWhitespace + cleaned;
}
