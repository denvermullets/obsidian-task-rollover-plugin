import { App, Modal, Setting } from "obsidian";

export type RecapType = "monthly" | "yearly";

export interface RecapSelection {
  type: RecapType;
  month: number;
  year: number;
}

export class RecapModal extends Modal {
  private recapType: RecapType = "monthly";
  private month: number;
  private year: number;
  private onSubmit: (selection: RecapSelection) => void;
  private monthSetting: Setting | null = null;

  constructor(app: App, onSubmit: (selection: RecapSelection) => void) {
    super(app);
    this.onSubmit = onSubmit;

    const now = new Date();
    this.month = now.getMonth();
    this.year = now.getFullYear();
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: "Generate GitHub Recap" });

    const infoEl = contentEl.createEl("p", {
      text: "Monthly recaps take ~15 seconds. Yearly recaps take ~3 minutes due to GitHub API rate limits.",
      cls: "setting-item-description",
    });
    infoEl.style.marginBottom = "1em";

    new Setting(contentEl).setName("Recap type").addDropdown((dropdown) => {
      dropdown.addOption("monthly", "Monthly");
      dropdown.addOption("yearly", "Yearly");
      dropdown.setValue(this.recapType);
      dropdown.onChange((value) => {
        this.recapType = value as RecapType;
        this.updateMonthVisibility();
      });
    });

    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    this.monthSetting = new Setting(contentEl).setName("Month").addDropdown((dropdown) => {
      months.forEach((month, index) => {
        dropdown.addOption(index.toString(), month);
      });
      dropdown.setValue(this.month.toString());
      dropdown.onChange((value) => {
        this.month = parseInt(value);
      });
    });

    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      years.push(y);
    }

    new Setting(contentEl).setName("Year").addDropdown((dropdown) => {
      years.forEach((year) => {
        dropdown.addOption(year.toString(), year.toString());
      });
      dropdown.setValue(this.year.toString());
      dropdown.onChange((value) => {
        this.year = parseInt(value);
      });
    });

    new Setting(contentEl).addButton((btn) =>
      btn
        .setButtonText("Generate")
        .setCta()
        .onClick(() => {
          this.close();
          this.onSubmit({ type: this.recapType, month: this.month, year: this.year });
        })
    );
  }

  private updateMonthVisibility() {
    if (this.monthSetting) {
      this.monthSetting.settingEl.style.display = this.recapType === "monthly" ? "" : "none";
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
