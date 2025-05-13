import { BaseOperation } from "../base-operation.mjs";

export class test extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();

    return {
      test: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField({ required: true, nullable: false, blank: false, initial: "test" }),
        executorTest: new foundry.data.fields.StringField({ required: true, nullable: false, blank: true }),
        targetTest: new foundry.data.fields.StringField({ required: true, nullable: false, blank: true }),
        // specification: new foundry.data.fields.StringField({ required: true, nullable: false, blank: true }),
        // favorBonuses: new foundry.data.fields.SchemaField({
        //   enabled: new foundry.data.fields.BooleanField({ required: true, nullable: false, initial: false }),
        //   vsHostile: new foundry.data.fields.NumberField({ required: true, nullable: false, initial: 0 }),
        //   vsNeutral: new foundry.data.fields.NumberField({ required: true, nullable: false, initial: 0 }),
        //   vsFriendly: new foundry.data.fields.NumberField({ required: true, nullable: false, initial: 0 }),
        // }),
        // numericalBonuses: new foundry.data.fields.SchemaField({
        //   enabled: new foundry.data.fields.BooleanField({ required: true, nullable: false, initial: false }),
        //   vsHostile: new foundry.data.fields.NumberField({ required: true, nullable: false, initial: 0 }),
        //   vsNeutral: new foundry.data.fields.NumberField({ required: true, nullable: false, initial: 0 }),
        //   vsFriendly: new foundry.data.fields.NumberField({ required: true, nullable: false, initial: 0 }),
        // }),
        overrideRoll: new foundry.data.fields.SchemaField({
          enabled: new foundry.data.fields.BooleanField({ required: true, nullable: false, initial: false }),
          ifLessThan: new foundry.data.fields.NumberField({ required: true, nullable: false, initial: 10 }),
          setTo: new foundry.data.fields.NumberField({ required: true, nullable: false, initial: 10 }),
          beforeModifiers: new foundry.data.fields.BooleanField({ required: true, nullable: false, initial: true })
        }),
        successfulTargets: new foundry.data.fields.ArrayField(new foundry.data.fields.StringField({ required: true, nullable: false, initial: "" }), { required: true, nullable: false, initial: [] }),
        ...baseActivity,
      })
    }
  }

  static _toObject() {
    return {
      type: "test",
      testType: "",
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

    const dispositions = {
      0: "neutral",
      1: "friendly",
      2: "secret", 
      3: "hostile",
    }

    if (game.user.targets.size > 0) {
      const successfulTargets = [];
      const targets = Array.from(game.user.targets).map(target => target.id);
      for (let i = 0; i < game.user.targets.size; i++) {
        const target = Array.from(game.user.targets)[i];
        const targetActor = target.actor;
        let targetRoll = null;
        if (targetActor) {
          targetRoll = targetActor.check(operation.targetTest, { specification: dispositions[target.document.disposition], ...options })
        }
        const override = {};
        if (operation.overrideRoll.enabled) {
          override.minimum = operation.overrideRoll.ifLessThan,
          override.value = operation.overrideRoll.setTo,
          override.beforeModifiers = operation.overrideRoll.beforeModifiers
        }
        const success = actor.check(operation.executorTest, { specification: dispositions[game.user.character.document.disposition], difficulty: targetRoll.total, override, ...options });
        if (success) {
          successfulTargets.push(target);
        }
      }
      activity.update({
        "system.operations": activity.system.operations.map(op => {
          if (op.id === operation.id) {
            return {
              ...op,
              successfulTargets: successfulTargets.map(target => target.id)
            }
          }
          return op;
        })
      })
      if (successfulTargets.length === game.user.targets.size) {
        ui.notifications.info(game.i18n.localize("UTOPIA.ERRORS.TotalSuccess"));
      }
      else if (successfulTargets.length > 0 && successfulTargets.length < game.user.targets.size) {
        ui.notifications.info(game.i18n.localize("UTOPIA.ERRORS.PartialSuccess"));
      }
      else {
        ui.notifications.info(game.i18n.localize("UTOPIA.ERRORS.TotalFailure"));
      }
      return true;
    }
    else {
      ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.NoTarget"));  
      return false;
    }
  }
}