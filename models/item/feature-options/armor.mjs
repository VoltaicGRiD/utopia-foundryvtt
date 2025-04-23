import { FeatureBase } from "./base-feature.mjs";

export class ArmorFeatureOptions extends FeatureBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    const requiredInteger = { required: true, nullable: false, initial: 0 };
    const requiredString = { required: true, nullable: false, initial: "" };
    
    schema.equippable = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.augmentable = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.slots = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.armorDefenses = new fields.SchemaField({
      ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
        acc[key] = new fields.NumberField({ ...requiredInteger, initial: 0 });
        return acc;
      }
      , {}),
    })
    schema.block = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.dodge = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.breathless = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.weaponlessAttacks = new fields.SchemaField({
      formula: new fields.StringField({ ...requiredString, validate: (value) => {
        return Roll.validate(value);
      }}),
      type: new fields.StringField({ ...requiredString, initial: "physical", choices: {
        physical: "UTOPIA.DamageTypes.physical",
        energy: "UTOPIA.DamageTypes.energy",
        psyche: "UTOPIA.DamageTypes.psyche",
        chill: "UTOPIA.DamageTypes.chill",
        heat: "UTOPIA.DamageTypes.heat",
      }}),
      range: new fields.StringField({ ...requiredString, initial: "0/0" }),
      traits: new fields.ArrayField(new fields.StringField({...requiredString, initial: ""}), { required: true, nullable: false, initial: [] }),
      stamina: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      actionCost: new fields.NumberField({ ...requiredInteger, initial: 0 }),
    });
    schema.shroudedBuff = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.vertical = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.landSpeedBoost = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.waterSpeedBoost = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.airSpeedBoost = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.grantsFlight = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.traitBonusAmount = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.traitBonusTrait = new fields.StringField({ ...requiredString, initial: "none" });
    schema.spellDiscount = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.locked = new fields.SchemaField({
      slot: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      actions: new fields.NumberField({ ...requiredInteger, initial: 0 }),
    });
    schema.preventSpellcasting = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.destroyOnDoubleProtectedDamage = new fields.BooleanField({ required: true, nullable: false, initial: false });

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
  }
}