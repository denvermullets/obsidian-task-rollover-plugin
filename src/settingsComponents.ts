import { ButtonComponent, ExtraButtonComponent, SearchComponent, Setting } from "obsidian";
import DailyNoteRolloverPlugin from "./main";
import { arrayMove } from "./util";

export const sortableListField = ({
  settingsContainer,
  plugin,
  display,
  settings,
  name,
  description,
  tooltip,
}: {
  settingsContainer: HTMLElement;
  plugin: DailyNoteRolloverPlugin;
  settings: string[];
  display: () => void;
  name: string;
  description: string;
  tooltip: string;
}) => {
  new Setting(settingsContainer)
    .setName(name)
    .setDesc(description)
    .addButton((button: ButtonComponent) => {
      button
        .setTooltip(tooltip)
        .setButtonText("+")
        .setCta()
        .onClick(async () => {
          settings.push("");
          await plugin.saveSettings();
          display();
        });
    });
  settings.forEach((value, index) => {
    const s = new Setting(settingsContainer)
      .addSearch((cb: SearchComponent) => {
        cb.setPlaceholder("Section")
          .setValue(value)
          .onChange(async (newSetting: string) => {
            settings[index] = newSetting;
            await plugin.saveSettings();
          });
      })
      .addExtraButton((cb: ExtraButtonComponent) => {
        cb.setIcon("up-chevron-glyph")
          .setTooltip("Move up")
          .onClick(async () => {
            arrayMove(settings, index, index - 1);
            await plugin.saveSettings();
            display();
          });
      })
      .addExtraButton((cb: ExtraButtonComponent) => {
        cb.setIcon("down-chevron-glyph")
          .setTooltip("Move down")
          .onClick(async () => {
            arrayMove(settings, index, index + 1);
            await plugin.saveSettings();
            display();
          });
      })
      .addExtraButton((cb: ExtraButtonComponent) => {
        cb.setIcon("cross")
          .setTooltip("Delete")
          .onClick(async () => {
            settings.splice(index, 1);
            await plugin.saveSettings();
            display();
          });
      });
    s.infoEl.remove();
  });
};
