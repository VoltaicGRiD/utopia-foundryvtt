import { FeatureBase } from "./base-feature.mjs";

export class WeaponFeatureOptions extends FeatureBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    const requiredInteger = { required: true, nullable: false, initial: 0 };
    const requiredString = { required: true, nullable: false, initial: "" };
    
    schema.craftMacro = new fields.StringField({ ...requiredString, initial: "" });
    schema.craftingOptionSet = new fields.StringField({ ...requiredString, initial: "none" });
    schema.handheld = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.hands = new fields.NumberField({ ...requiredInteger, initial: 1 });
    schema.equippable = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.slots = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.damage = new fields.StringField({ ...requiredString, validate: (value) => {
      return Roll.validate(value);
    }})
    schema.damageType = new fields.StringField({ ...requiredString, initial: "physical" });
    schema.meleeDamageModifierTrait = new fields.StringField({ ...requiredString, initial: "none" })
    schema.meleeDamageModifierTraitChoice = new fields.BooleanField({ required: true, nullable: false, initial: true });
    schema.rangedDamageModifierTrait = new fields.StringField({ ...requiredString, initial: "none" })
    schema.rangedDamageModifierTraitChoice = new fields.BooleanField({ required: true, nullable: false, initial: true });
    schema.damageTemplate = new fields.StringField({ ...requiredString, initial: "none" });
    schema.reach = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.closeRange = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.farRange = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.accuracyFavor = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.accuracyTrait = new fields.StringField({ ...requiredString, initial: "default" });
    schema.ignoreSHP = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.ignoreDefense = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.staminaCostIncrease = new fields.NumberField({ ...requiredInteger, initial: 1 });
    schema.reduceStamina = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.reduceStaminaPercentage = new fields.NumberField({ ...requiredInteger, initial: 100 });
    schema.shpPercentage = new fields.NumberField({ ...requiredInteger, initial: 100 });
    schema.dhpPercentage = new fields.NumberField({ ...requiredInteger, initial: 100 });
    schema.objectPercentage = new fields.NumberField({ ...requiredInteger, initial: 100 });
    schema.blindingActions = new fields.NumberField({ ...requiredInteger, initial: 6 });
    schema.blindingTrait = new fields.StringField({ ...requiredString, initial: "for" });
    schema.blindingDuration = new fields.NumberField({ ...requiredInteger, initial: 1 }); // Rounds (until beginning of user's next turn)
    schema.confusingActions = new fields.NumberField({ ...requiredInteger, initial: 6 });
    schema.confusingTrait = new fields.StringField({ ...requiredString, initial: "for" });
    schema.confusingDuration = new fields.NumberField({ ...requiredInteger, initial: 1 }); // Rounds (until beginning of user's next turn)
    schema.blastingLineWidth = new fields.NumberField({ ...requiredInteger, initial: 1 });
    schema.blastingAccuracyRequired = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.boomingConeDegrees = new fields.NumberField({ ...requiredInteger, initial: 90 });
    schema.boomingAccuracyRequired = new fields.BooleanField({ ...requiredString, initial: false });
    schema.armed = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.rechargeAfter = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.rechargeTrait = new fields.StringField({ ...requiredString, initial: "none" });
    schema.rechargeActions = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.returnDamage = new fields.StringField({ ...requiredInteger, initial: "0" });
    schema.returnDamageType = new fields.StringField({ ...requiredString, initial: "physical" });
    schema.nonLethal = new fields.BooleanField({ required: true, nullable: false, initial: false });

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
  }
}