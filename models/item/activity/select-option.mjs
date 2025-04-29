import { BaseOperation } from "./base-activity.mjs";

const fields = foundry.data.fields;

export class selectOption extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();

    return {
      selectOption: new fields.SchemaField({
        type: new fields.StringField({ required: true, nullable: false, blank: false, initial: "select" }),
        options: new fields.ArrayField(new fields.StringField({ required: true, nullable: false, blank: false })),
        selected: new fields.StringField({ required: true, nullable: false, blank: false, initial: "" }),
        ...baseActivity,
      })
    }
  }
}