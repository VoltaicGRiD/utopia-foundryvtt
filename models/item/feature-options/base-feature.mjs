import UtopiaItemBase from "../../base-item.mjs";

export class FeatureBase extends UtopiaItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    const requiredInteger = { required: true, nullable: false, initial: 0 };
    const requiredString = { required: true, nullable: false, initial: "" };
    
    Object.keys(JSON.parse(game.settings.get("utopia", "advancedSettings.components"))).map(c => {
      return schema[c] = new fields.NumberField({ ...requiredInteger });
    })

    schema.craftMacro = new fields.DocumentUUIDField({ required: true, nullable: false, initial: "" });

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
  }
}