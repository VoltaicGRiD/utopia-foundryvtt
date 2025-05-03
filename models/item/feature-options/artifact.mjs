import { FeatureBase } from "./base-feature.mjs";

export class ArtifactFeatureOptions extends FeatureBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    const requiredInteger = { required: true, nullable: false, initial: 0 };
    const requiredString = { required: true, nullable: false, initial: "" };
    
    schema.craftMacro = new fields.StringField({ ...requiredString, initial: "" });
    schema.damage = new fields.SchemaField({
      formula: new fields.StringField({ required: true, nullable: false, initial: "0", validate: (value) => {
        return Roll.validate(value);
      }}),
      save: new fields.StringField({ required: true, nullable: false, initial: "none" }),
      template: new fields.StringField({ required: true, nullable: false, initial: "none" }),
    });
    schema.spelltech = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.activation = new fields.SchemaField({
      cost: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      duration: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      feature: new fields.StringField({ ...requiredString, initial: "none" }),
    });
    schema.spellBomb = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.travelDistance = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.verticalTravel = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.waterTravel = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.airTravel = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.versatileBuff = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.minorCastingBuff = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.modestCastingBuff = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.majorCastingBuff = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.shroudedBuff = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.areaOfEffect = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.remoteActivation = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.capacity = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.increaseSubtrait = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.resistLastDamage = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.resistDamageType = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.resistAllDamage = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.consumableCraftingStation = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.itemCraftingStation = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.landSpeedBoost = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.waterSpeedBoost = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.airSpeedBoost = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.grantsFlight = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.spellDiscount = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.slots = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.preventSpellcasting = new fields.BooleanField({ required: true, nullable: false, initial: false });
    
    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
  }
}