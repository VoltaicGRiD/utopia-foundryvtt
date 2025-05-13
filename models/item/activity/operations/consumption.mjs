import { UtopiaChatMessage } from "../../../../documents/chat-message.mjs";
import { BaseOperation } from "../base-operation.mjs";

// ! TODO - Should probably be more generic and not just for consumption
export class consumption extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();

    return {
      consumption: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField({ required: true, nullable: false, blank: false, initial: "consumption" }),
        component: new foundry.data.fields.StringField({ required: true, nullable: false, blank: true }),
        rarity: new foundry.data.fields.StringField({ required: true, nullable: false, blank: true }),
        restoration: new foundry.data.fields.StringField({ required: true, nullable: false, blank: true }),
        useRarityValue: new foundry.data.fields.BooleanField({ required: true, nullable: false, initial: false }),
        amount: new foundry.data.fields.StringField({ required: true, nullable: false, blank: true }),
        ...baseActivity,
      })
    }
  }

  static async getChoices(activity) {
    const choices = {
      component: {
        ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.components"))).reduce((acc, [key, value]) => {
          acc[key] = game.i18n.localize(value.label);
          return acc;
        }, {}),

        ...activity.operations.reduce((acc, operation) => {
          if (operation.type === "selectOption") {
            acc[operation.id] = `Inherit from ${operation.name}`;
          }
          return acc;
        }, {})
      },
      rarity: {
        ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.rarities"))).reduce((acc, [key, value]) => {
          acc[key] = game.i18n.localize(value.label);
          return acc;
        }, {}),

        ...activity.operations.reduce((acc, operation) => {
          if (operation.type === "selectOption") {
            acc[operation.id] = `Inherit from ${operation.name}`;
          }
          return acc;
        }, {})
      }
    };

    return choices;
  }

  static async execute(activity, operation, options = {}) {
    const actor = activity.parent;
    const restoration = operation.restoration;
    const useRarityValue = operation.useRarityValue;
    const amount = operation.amount;
    
    let rarity = operation.rarity;
    if (activity.system.operations.find(op => op.id === rarity)) {
      rarity = activity.system.operations.find(op => op.id === rarity).value;
    }

    let component = operation.component;
    if (activity.system.operations.find(op => op.id === component)) {
      component = activity.system.operations.find(op => op.id === component).value;
    }

    if (!actor) {
      return false;
    }

    let modifiedAmount = amount.replace(/(#[a-zA-Z0-9]+)/g, (match) => {
      const operation = activity.system.operations.find(op => op.key === match.replace('#', ''));
      return operation ? operation.value : match;
    });

    const components = JSON.parse(game.settings.get("utopia", "advancedSettings.components"));
    const rarities = JSON.parse(game.settings.get("utopia", "advancedSettings.rarities"));
    const rarityValue = rarities[rarity].value;

    const amountRoll = await new Roll(modifiedAmount, { ...actor.getRollData(), ...useRarityValue ? { rarityValue } : {} }).evaluate();
    if (amountRoll.total < 0) {
      ui.notifications.error(game.i18n.localize("UTOPIA.Items.Activity.Messages.ErrorNegative"));
      return false;
    }
    const amountTotal = amountRoll.total;

    const modifiedRestoration = restoration.replace(/(#[a-zA-Z0-9]+)/g, (match) => {
      const operation = activity.system.operations.find(op => op.key === match.replace('#', ''));
      return operation ? operation.value : match;
    });

    const restorationRoll = await new Roll(modifiedRestoration, { ...actor.getRollData(), ...useRarityValue ? { rarityValue } : {} }).evaluate();

    const actorComponents = actor.system.components[component][rarity].available || {};
    if (!actorComponents) {
      ui.notifications.error(game.i18n.localize("UTOPIA.Items.Activity.Messages.ErrorNoComponent"));
      return false;
    }
    if (actorComponents < amountTotal) {
      ui.notifications.error(game.i18n.localize("UTOPIA.Items.Activity.Messages.ErrorNotEnough"));
      return false;
    }

    await actor.update({
      [`system.components.${component}.${rarity}.available`]: actorComponents - amountTotal,
      [`system.stamina.value`]: Math.min(actor.system.stamina.value + restorationRoll.total, actor.system.stamina.max)
    });

    UtopiaChatMessage.create({
      content: game.i18n.format("UTOPIA.Items.Activity.Messages.Consumption", {
        actorName: actor.name,
        component: game.i18n.localize(components[component].label),
        rarity: game.i18n.localize(rarities[rarity].label),
        amount: amountTotal,
        restoration: restorationRoll.total,
      }),
      speaker: ChatMessage.getSpeaker({ actor }),
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    });

    return true;
  }
}