import { App, Modal, Setting } from "obsidian";

export interface RecapSelection {
  month: number;
  year: number;
}

export class RecapModal extends Modal {
  private month: number;
  private year: number;
  private onSubmit: (selection: RecapSelection) => void;

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

    new Setting(contentEl).setName("Month").addDropdown((dropdown) => {
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
          this.onSubmit({ month: this.month, year: this.year });
        })
    );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
