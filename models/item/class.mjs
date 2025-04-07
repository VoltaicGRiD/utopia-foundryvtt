import UtopiaItemBase from "../base-item.mjs";
import { SchemaArrayField } from "../fields/schema-set-field.mjs";

export class Class extends UtopiaItemBase {

  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "UTOPIA.Items.Class"]

  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
      
    schema.points = new fields.NumberField({ required: true, nullable: false, initial: 1 });
    schema.type = new fields.StringField({ required: true, nullable: false, initial: "martial", choices: {
      martial: "UTOPIA.Items.Class.Type.Martial",
      arcane: "UTOPIA.Items.Class.Type.Arcane",
      support: "UTOPIA.Items.Class.Type.Support",
      innate: "UTOPIA.Items.Class.Type.Innate",
    }});

    schema.grants = new fields.SetField(new fields.DocumentUUIDField({ type: "Item" }), { initial: [] });

    // TODO - Look into changing this
    // In theory, we want the passives to be ActiveEffects, but there may be reason
    // to implement them via a trigger system instead.
    // For Example: the martial class 'Martialist' has a passive that allows it to
    // retarget damage to a different target. This is not something that can be done
    // with an ActiveEffect, but can be done with a trigger system.
    schema.attributes = new SchemaArrayField(new fields.SchemaField({
        key: new fields.StringField({ required: true, nullable: false, label: "UTOPIA.Items.Kit.FIELDS.attributes.FIELDS.key.label" }),
        value: new fields.StringField({ required: true, nullable: false, label: "UTOPIA.Items.Kit.FIELDS.attributes.FIELDS.value.label" }),
      }),
    );

    schema.selectedChoices = new fields.ObjectField();

    return schema;
  }

  get headerFields() {
    return [
      ...super.headerFields,
      {
        field: this.schema.fields.points,
        stacked: false,
        editable: true,
      },
      {
        field: this.schema.fields.type,
        stacked: false,
        editable: true,
      },
    ]
  };

  get attributeFields() {
    return [
      {
        field: this.schema.fields.grants,
        stacked: true,
        editable: true,
      },
      {
        field: this.schema.fields.attributes,
        stacked: true,
        editable: true,
        columns: 2,
        classes: ["flex-sm"] 
      },
    ]
  }
}