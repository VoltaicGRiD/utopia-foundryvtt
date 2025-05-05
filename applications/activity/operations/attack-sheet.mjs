import { OperationSheet } from "../operation-sheet.mjs";

export class AttackSheet extends OperationSheet {
  constructor(options = {}) {
    super(options);
  }

  static DEFAULT_OPTIONS = {
    actions: {
      addDamage: this._addDamage,
      removeDamage: this._removeDamage
    },
  };

  static PARTS = {
    ...super.PARTS,
    operation: {
      template: "systems/utopia/templates/activity/operations/attack.hbs",
      scrollable: ['.effects-list']
    }
  }    

  static async _addDamage(event, target) {
    await this.document.system.runFunction(this.operation, "addDamage");
    await this.document.render({ renderOperation: this.operation, force: true });
    await this.close();
    // const button = this.element.querySelector("button[data-action='addDamage']");
    // button.dataset.action = "reloadDamages";
    // button.innerHTML = `<i class="fas fa-sync"></i> ${game.i18n.localize("UTOPIA.Items.Activity.Operation.Damage.ReloadDamages")}`;    
  }

  static async _removeDamage(event, target) { 
    const index = target.dataset.damage;
    await this.document.system.runFunction(this.operation, "removeDamage", parseInt(index));
    await this.document.render({ renderOperation: this.operation, force: true });
    await this.close();
  }
}
  