import { BaseOperation } from "./base-activity.mjs";

const fields = foundry.data.fields;

export class castSpell extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();

    return {
      castSpell: new fields.SchemaField({
        type: new fields.StringField({ required: true, nullable: false, blank: false, initial: "castSpell" }),
        spell: new fields.DocumentUUIDField({ required: true, nullable: false }),
        stamina: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        ...baseActivity,
      })
    }
  }
}