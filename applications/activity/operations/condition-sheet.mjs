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

  async _prepareContext(options) {
    const context = super._prepareContext(options);
    context.keys = await this.document.system.runFunction(this.operation, "keys", this.document.parent);
    console.log("ConditionSheet._prepareContext", context.keys);
    return context;
  }

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
  }

  static async _removeCondition(event, target) { 
    const index = target.dataset.condition;
    await this.document.system.runFunction(this.operation, "removeCondition", parseInt(index));
    await this.document.render({ renderOperation: this.operation, force: true });
    await this.close();
  }
} 