import { App } from "obsidian";
import { InternalPlugin, InternalPluginNameType } from "obsidian-typings";

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

export const isCalloutHeader = (header: string) => header.startsWith(">[!");
