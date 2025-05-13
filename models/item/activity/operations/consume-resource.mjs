import { BaseOperation } from "../base-operation.mjs";

export class consumeResource extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();

    return {
      consumeResource: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField({ required: true, nullable: false, blank: false, initial: "consumeResource" }),
        resource: new foundry.data.fields.StringField({ required: true, nullable: false, blank: true }),
        amount: new foundry.data.fields.StringField({ required: true, nullable: false, blank: true }),
        ...baseActivity,
      })
    }
  }

  static async getChoices(activity) {
    const choices = {
      ...(activity.parent.parent ? await Promise.all(
      activity.parent.parent.items
        .filter(i => i.type === "activity" && i.id !== activity.parent.id)
        .map(async a => {
        return a.system.operations.reduce((acc, operation) => {
          if (operation.type !== "createResource") return acc;
          acc[operation.id] = operation.resourceName;
          return acc;
        }, {});
        })
      ).then(results => results.reduce((acc, curr) => ({ ...acc, ...curr }), {})) : {}),

      ...(await Promise.all(
      activity.operations
        .filter(i => i.type === "createResource")
        .map(async operation => {
        const acc = {};
        acc[operation.id] = operation.resourceName;
        return acc;
        })
      ).then(results => results.reduce((acc, curr) => ({ ...acc, ...curr }), {}))),

      ...activity.operations.reduce((acc, operation) => {
        if (operation.type === "selectOption") {
          acc[operation.id] = `Inherit from ${operation.name}`;
        }
        return acc;
      }, {})    };

    return choices;
  }

  static async execute(activity, operation, options = {}) {
    const actor = activity.parent;
    const resourceId = operation.resource;
    const amount = operation.amount;

    if (!actor || !resourceId || !amount) {
      return false;
    }

    let modifiedFormula = amount.replace(/(#[a-zA-Z0-9]+)/g, (match) => {
      const operation = activity.system.operations.find(op => op.key === match.replace('#', ''));
      return operation ? operation.value : match;
    });

    const resourceActivity = actor.items.filter(i => i.type === "activity" && i.system.operations.some(op => op.id === resourceId))[0];
    if (!resourceActivity) {
      return false;
    }
    
    const amountRoll = await new Roll(modifiedFormula, actor.getRollData()).evaluate();
    if (amountRoll.total < 0) {
      ui.notifications.error(game.i18n.localize("Utopia.Operation.ConsumeResource.ErrorNegative"));
      return false;
    }
    const amountTotal = amountRoll.total;

    const operations = await Promise.all(resourceActivity.system.operations.map(async op => {
      if (op.id === resourceId) {
        const valueRoll = await new Roll(`${op.value} - ${amountTotal}`, actor.getRollData()).evaluate();
        const valueTotal = valueRoll.total;
        if (valueTotal < 0 && !op.negative) {
          ui.notifications.error(game.i18n.localize("Utopia.Operation.ConsumeResource.ErrorNegative"));
          return false;
        }
        return {
          ...op,
          value: valueTotal,
        };
      }
      return op;
    }));

    await resourceActivity.update({
      "system.operations": operations,
    })

    return true;
  }
}