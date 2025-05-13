import { BaseOperation } from "../base-operation.mjs";

export class createResource extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();

    return {
      createResource: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField({ required: true, nullable: false, blank: false, initial: "createResource" }),
        resourceName: new foundry.data.fields.StringField({ required: true, nullable: false, blank: true }),
        description: new foundry.data.fields.StringField({ required: true, nullable: false, blank: true }),
        source: new foundry.data.fields.StringField({ required: true, nullable: false, blank: true }),
        maximumFormula: new foundry.data.fields.StringField({ required: true, nullable: false, blank: true }),
        value: new foundry.data.fields.NumberField({ required: true, nullable: false, initial: 0 }),
        startFull: new foundry.data.fields.BooleanField({ required: true, nullable: false, initial: true }),
        negative: new foundry.data.fields.BooleanField({ required: true, nullable: false, initial: false }),
        resetOnRest: new foundry.data.fields.SchemaField({
          enabled: new foundry.data.fields.BooleanField({ required: true, nullable: false, initial: true }),
          // formula: new foundry.data.fields.StringField({ required: true, nullable: false, blank: true }),
        }),
        ...baseActivity,
      })
    }
  }

  static async execute(activity, operation, options = {}) {
    if (activity.getFlag("utopia", "createdResources") && activity.getFlag("utopia", "createdResources").some(r => r.id === operation.id)) {
      return true;
    }

    const actor = activity.parent;

    let modifiedFormula = operation.maximumFormula.replace(/(#[a-zA-Z0-9]+)/g, (match) => {
      const operation = activity.system.operations.find(op => op.key === match.replace('#', ''));
      return operation ? operation.value : match;
    });
    const maxRoll = await new Roll(modifiedFormula, actor.getRollData()).evaluate().total;

    await activity.update({
      "system.operations": activity.system.operations.map(op => {
        if (op.id === operation.id) {
          return {
            ...op,
            value: operation.startFull ? maxRoll : 0,
          };
        }
        return op;
      })
    })

    const createdResources = activity.getFlag("utopia", "createdResources") || [];
    createdResources.push({
      id: operation.id,
    });
    await activity.setFlag("utopia", "createdResources", createdResources);

    return true;
  }
}