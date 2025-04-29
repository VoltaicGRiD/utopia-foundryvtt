import { BaseOperation } from "./base-activity.mjs";

const fields = foundry.data.fields;

export class attack extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();

    const damageTypes = {
      ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
        acc[key] = { ...value, group: "UTOPIA.DAMAGE_TYPES.GroupName" };
        return acc;
      }, {}),
    };

    return {
      attack: new fields.SchemaField({
        type: new fields.StringField({ required: true, nullable: false, blank: false, initial: "attack" }),
        formula: new fields.StringField({ required: true, nullable: false, blank: false, initial: "1d4" }),
        damageType: new fields.StringField({ required: true, nullable: false, blank: false, initial: "physical", choices: damageTypes }),
        penetrate: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        nonLethal: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        ...baseActivity
      })
    }
  }
}