import { BaseOperation } from "../base-operation.mjs";

export class heal extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();
    
    return {
      heal: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField({ required: true, nullable: false, blank: false, initial: "heal" }),
        formula: new foundry.data.fields.StringField({ required: true, nullable: false, blank: false, initial: "1d4" }),
        hitpoints: new foundry.data.fields.StringField({ required: true, nullable: false, blank: false, initial: "SHP" }),
        ...baseActivity
      })
    }
  }

  static async getChoices(activity) {
    return {
      surface: "SHP",
      deep: "DHP",

      ...activity.operations.reduce((acc, operation) => {
        if (operation.type === "selectOption") {
          acc[operation.id] = `Inherit from ${operation.name}`;
        }
        return acc;
      }, {})    }
  }

  static async execute(activity, operation, options = {}) {
    const actor = activity.parent;
    const target = game.user.targets.first().actor;
    const formula = operation.formula;
    const hitpoints = operation.hitpoints.toLowerCase();

    if (!target || !formula || !hitpoints) {
      return false;
    }

    let modifiedFormula = formula.replace(/(#[a-zA-Z0-9]+)/g, (match) => {
      const operation = activity.system.operations.find(op => op.key === match.replace('#', ''));
      return operation ? operation.value : match;
    });

    const resultRoll = await new Roll(modifiedFormula, actor.getRollData()).evaluate();
    resultRoll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `${game.i18n.localize("Utopia.Items.Activity.Operation.Heal")} ${hitpoints})}`,
      rollMode: game.settings.get("core", "rollMode"),
    });
    const resultTotal = resultRoll.total;

    if (resultTotal) {
      await target.update({
        [`system.hitpoints.${hitpoints}.value`]: Math.min(target.system.hitpoints[hitpoints].value + resultTotal, target.system.hitpoints[hitpoints].max)
      });
    }

    return true;
  }
}