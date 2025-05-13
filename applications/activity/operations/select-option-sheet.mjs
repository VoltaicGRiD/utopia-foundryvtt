import { OperationSheet } from "../operation-sheet.mjs";

export class SelectOptionSheet extends OperationSheet {
  constructor(options = {}) {
    super(options);
  }

  static DEFAULT_OPTIONS = {
    actions: {
      addOption: this._addOption,
      removeOption: this._removeOption
    },
  };

  static PARTS = {
    ...super.PARTS,
    operation: {
      template: "systems/utopia/templates/activity/operations/select-option.hbs",
      scrollable: []
    }
  }    

  static async _addOption(event, target) {
    await this.document.system.runFunction(this.operation, "addOption");
    await this.document.render({ renderOperation: this.operation, force: true });
    await this.close();
    // const button = this.element.querySelector("button[data-action='addOption']");
    // button.dataset.action = "reloadOptions";
    // button.innerHTML = `<i class="fas fa-sync"></i> ${game.i18n.localize("UTOPIA.Items.Activity.Operation.Option.ReloadOptions")}`;    
  }

  static async _removeOption(event, target) { 
    const index = target.dataset.option;
    await this.document.system.runFunction(this.operation, "removeOption", parseInt(index));
    await this.document.render({ renderOperation: this.operation, force: true });
    await this.close();
  }
}
  