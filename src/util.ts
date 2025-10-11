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
