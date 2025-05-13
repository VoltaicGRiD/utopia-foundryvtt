import { BaseOperation } from "../base-operation.mjs";

const fields = foundry.data.fields;

export class setFlag extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();

    return {
      setFlag: new fields.SchemaField({
        type: new fields.StringField({ required: true, nullable: false, blank: false, initial: "setFlag" }),
        flag: new fields.StringField({ required: true, nullable: false, blank: true }), 
        value: new fields.StringField({ required: true, nullable: false, blank: true }),
        ...baseActivity
      })
    }
  }

  static async execute(activity, operation, options = {}) {
    const actor = activity.parent;

    if (!actor || !operation.flag || !operation.value) {
      return false;
    }

    let modifiedValue = operation.value.replace(/(#[a-zA-Z0-9]+)/g, (match) => {
      const operation = activity.system.operations.find(op => op.key === match.replace('#', ''));
      return operation ? operation.value : match;
    });

    if ((operation.flag && operation.value) && (operation.flag !== "" && operation.value !== "")) {
      actor.setFlag("utopia", operation.key, modifiedValue);
      return true;
    }
  }
}