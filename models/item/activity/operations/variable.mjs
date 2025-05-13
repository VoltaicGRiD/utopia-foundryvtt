import { BaseOperation } from "../base-operation.mjs";

const fields = foundry.data.fields;

export class variable extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();

    return {
      variable: new fields.SchemaField({
        type: new fields.StringField({ required: true, nullable: false, blank: false, initial: "variable" }),
        variableName: new fields.StringField({ required: true, nullable: false, blank: true }),
        key: new fields.StringField({ required: true, nullable: false, blank: true, validate: (v) => !v.startsWith("#") && !v.includes("option") }),
        value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        ...baseActivity
      })
    }
  }

  static async execute(activity, operation, options = {}) {
    const actor = activity.parent;
    const name = operation.name;
    const key = operation.key;

    if (!actor || !name || !key) {
      return false;
    }

    let value;
    try {
      value = await foundry.applications.api.DialogV2.prompt({
        window: { title: `Set the value for ${operation.variableName}` },
        content: '<input name="value" type="number" min="1" step="1" autofocus>',
        ok: {
          label: "Submit Value",
          callback: (event, button, dialog) => button.form.elements.value.valueAsNumber
        }
      });
    } catch {
      console.log(`User did not fill in a value for variable ${operation.name}.`);
      return false;
    }

    const operations = await Promise.all(activity.system.operations.map(op => {
      if (op.id === operation.id) {
        return {
          ...op,
          value: value,
        };
      }
      return op;
    }));

    if (value) {
      await activity.update({
        "system.operations": operations,
      })
    }

    return true;
  }
}