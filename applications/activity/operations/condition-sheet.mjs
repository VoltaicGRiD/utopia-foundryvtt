import { OperationSheet } from "../operation-sheet.mjs";

export class ConditionSheet extends OperationSheet {
  //activity = null; // Reference to the activity this operation belongs to

  constructor(options = {}) {
    super(options);
    //this.activity = options.document || null; // Initialize activity from options
  }

  static DEFAULT_OPTIONS = {
    actions: {
      addCondition: this._addCondition,
      removeCondition: this._removeCondition
    },
  };

  static PARTS = {
    ...super.PARTS,
    operation: {
      template: "systems/utopia/templates/activity/operations/condition.hbs",
      scrollable: ['.effects-list']
    }
  }

  static async _addCondition(event, target) {
    await this.document.system.runFunction(this.operation, "addCondition");
    await this.document.render({ renderOperation: this.operation, force: true });
    await this.close();
    // const button = this.element.querySelector("button[data-action='addCondition']");
    // button.dataset.action = "reloadConditions";
    // button.innerHTML = `<i class="fas fa-sync"></i> ${game.i18n.localize("UTOPIA.Items.Activity.Operation.Condition.ReloadConditions")}`;    
  }

  static async _removeCondition(event, target) { 
    const index = target.dataset.condition;
    await this.document.system.runFunction(this.operation, "removeCondition", parseInt(index));
    await this.document.render({ renderOperation: this.operation, force: true });
    await this.close();
  }
} 