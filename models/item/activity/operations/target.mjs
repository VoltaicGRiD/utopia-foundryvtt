import { BaseOperation } from "../base-operation.mjs";

export class target extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();
    
    return {
      target: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField({ required: true, nullable: false, blank: false, initial: "target" }),
        // operation: new foundry.data.fields.StringField({ required: true, nullable: false, blank: true }),
        appliesTo: new foundry.data.fields.StringField({ required: true, nullable: false, blank: false, initial: "each" }),
        ...baseActivity
      })
    }
  }

  static async getChoices(activity) {
    return {
      appliesTo: {
        each: game.i18n.localize("UTOPIA.Items.Activity.Target.Each"),
        //all: game.i18n.localize("UTOPIA.Items.Activity.Target.Collective"),
        random: game.i18n.localize("UTOPIA.Items.Activity.Target.Random"),
        ...activity.operations.reduce((acc, operation) => {
          if (operation.type === "selectOption") {
            acc[operation.id] = `Inherit from ${operation.name}`;
          }
          return acc;
        }, {}),
      },
      // operations: activity.operations.reduce((acc, operation) => {
      //   if (!operation.executeImmediately) {
      //     acc[operation.id] = operation.name;
      //   }
      // }, {}),
    }
  }

  static async execute(activity, operation, options = {}) {
    const actor = activity.parent;
    const targets = game.user.targets;
    if (targets.size === 0) {
      ui.notifications.warn(game.i18n.localize("UTOPIA.Items.Activity.Target.NoTargets"));
      return false;
    }

    if (operation.appliesTo === "each") {
      for (const target of targets) {
        await activity.update({
          "system.operationData": foundry.utils.mergeObject(activity.system.operationData, {
            ['target']: target.actor.getRollData(),
          })
        })
        await activity.continueExecutionFrom(operation.id);
      }
    // TODO - Implement this
    // } else if (operation.appliesTo === "all") {
    //   const allTargets = targets.map(t => t.actor);
    //   await activity.update({
    //     "system.operationData": foundry.utils.mergeObject(activity.system.operationData, {
    //       [operation.id]: allTargets.map(t => t.getRollData()),
    //     })
    //   })
    //   await activity.executeOnTarget(operation, { target: targets });
    } else if (operation.appliesTo === "random") {
      const randomTarget = targets[new Roll("1d" + targets.length).roll().total - 1];
      await activity.update({
        "system.operationData": foundry.utils.mergeObject(activity.system.operationData, {
          ['target']: randomTarget.actor.getRollData(),
        })
      })
      await activity.continueExecutionFrom(operation.id);
    }

    return false;
  }
}