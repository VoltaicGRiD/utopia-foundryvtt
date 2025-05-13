import { UtopiaItem } from "../documents/item.mjs";

export default class UtopiaItemBase extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["UTOPIA.Items"];
  
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};

    schema.description = new fields.StringField({ required: true, nullable: false, initial: "" });
    schema.formula = new fields.StringField({ required: true, nullable: true, initial: "", validate: (v) => Roll.validate(v) });
    schema.tags = new fields.SetField(new fields.StringField({ required: true, nullable: false, initial: "" }), { initial: [] });
    schema.favors = new fields.ObjectField({ required: true, nullable: false, initial: {} });
    schema.material = new fields.NumberField({ required: true, nullable: false, initial: 0 });
    schema.refinement = new fields.NumberField({ required: true, nullable: false, initial: 0 });
    schema.power = new fields.NumberField({ required: true, nullable: false, initial: 0 });
    schema.equipped = new fields.BooleanField({ required: true, nullable: false, initial: false });
    
    schema.origin = new fields.DocumentUUIDField({ required: false, nullable: true, initial: null });

    return schema;
  }

  get headerFields() {
    return [
      {
        field: this.schema.fields.tags,
        stacked: true,
        editable: true,
      },
    ]
  }

  prepareDerivedData() {
    super.prepareDerivedData();

    Hooks.callAll("prepareItemData", this);
  }
}