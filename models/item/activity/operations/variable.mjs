import { BaseOperation } from "../base-operation.mjs";

const fields = foundry.data.fields;

export class variable extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();

    return {
      variable: new fields.SchemaField({
        type: new fields.StringField({ required: true, nullable: false, blank: false, initial: "variable" }),
        key: new fields.StringField({ required: true, nullable: false, blank: false }), 
        ...baseActivity
      })
    }
  }
}