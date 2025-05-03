import { FeatureBase } from "./base-feature.mjs";

export class ShieldFeatureOptions extends FeatureBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    const requiredInteger = { required: true, nullable: false, initial: 0 };
    const requiredString = { required: true, nullable: false, initial: "" };
    
    schema.craftMacro = new fields.StringField({ ...requiredString, initial: "" });
    schema.increaseDefense = new fields.StringField({ ...requiredString, initial: "physical", choices: {
      physical: "UTOPIA.DamageTypes.physical",
      energy: "UTOPIA.DamageTypes.energy",
      psyche: "UTOPIA.DamageTypes.psyche",
      chill: "UTOPIA.DamageTypes.chill",
      heat: "UTOPIA.DamageTypes.heat",
    }});
    schema.increaseBlock = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.increaseDodge = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.slots = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.spellDiscount = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.hands = new fields.NumberField({ ...requiredInteger, initial: 1 });

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
  }
}