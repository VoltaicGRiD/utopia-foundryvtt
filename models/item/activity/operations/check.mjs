import { BaseOperation } from "../base-operation.mjs";

export class check extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();

    return {
      check: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField({ required: true, nullable: false, blank: false, initial: "check" }),
        check: new foundry.data.fields.StringField({ required: true, nullable: false, blank: true }),
        overrideRoll: new foundry.data.fields.SchemaField({
          enabled: new foundry.data.fields.BooleanField({ required: true, nullable: false, initial: false }),
          ifLessThan: new foundry.data.fields.NumberField({ required: true, nullable: false, initial: 10 }),
          setTo: new foundry.data.fields.NumberField({ required: true, nullable: false, initial: 10 }),
          beforeModifiers: new foundry.data.fields.BooleanField({ required: true, nullable: false, initial: true })
        }),
        ...baseActivity,
      })
    }
  }

  static _toObject() {
    return {
      type: "check",
      checkType: "",
      ...BaseOperation._toObject()
    }
  }

  static getChoices(activity) {
    return {
      traits: {
        name: game.i18n.localize("UTOPIA.TRAITS.GroupName"), 
        choices: Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.traits"))).reduce((acc, [key, value]) => {
          acc[key] = {
            group: game.i18n.localize("UTOPIA.TRAITS.GroupName"), 
            label: value.label
          }
          return acc;
        }, {}),
      },
        
      subtraits: {
        name: game.i18n.localize("UTOPIA.SUBTRAITS.GroupName"),
        choices: Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.subtraits"))).reduce((acc, [key, value]) => {
          acc[key] = {
            group: game.i18n.localize("UTOPIA.SUBTRAITS.GroupName"),
            label: value.label
          }
          return acc;
        }, {}),
      },

      specialtyChecks: {
        name: game.i18n.localize("UTOPIA.SPECIALTY_CHECKS.GroupName"),
        choices: Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.specialtyChecks"))).reduce((acc, [key, value]) => {
          acc[key] = {
            group: game.i18n.localize("UTOPIA.SPECIALTY_CHECKS.GroupName"),
            label: value.label
          };
          return acc;
        }, {}),
      },

      other: {
        name: "Other",
        choices: activity.operations.reduce((acc, operation) => {
          if (operation.type === "selectOption") {
            acc[operation.id] = {
              group: "Other",
              label: `Inherit from ${operation.name}`
            };
          };
          return acc;
        }, {}),
      }
    }
  }

  static async execute(activity, operation, options = {}) {
    const actor = activity.parent;

    const override = {};
    if (operation.overrideRoll.enabled) {
      override.minimum = operation.overrideRoll.ifLessThan,
      override.value = operation.overrideRoll.setTo,
      override.beforeModifiers = operation.overrideRoll.beforeModifiers
    }

    await actor.check(operation.check, { override, ...options });

    return true;
  }
}