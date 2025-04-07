import UtopiaItemBase from "../base-item.mjs";
import { SchemaArrayField } from "../fields/schema-set-field.mjs";

export class Kit extends UtopiaItemBase {

  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "UTOPIA.Items.Kit"]


  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
      
    schema.points = new fields.NumberField({ required: true, nullable: false, initial: 1 });

    // TODO - Look into changing this
    // In theory, we want the attributes to be ActiveEffects, but there may be reason
    // to implement them via a trigger system instead.
    schema.attributes = new SchemaArrayField(new fields.SchemaField({
        key: new fields.StringField({ required: true, nullable: false, label: "UTOPIA.Items.Kit.FIELDS.attributes.FIELDS.key.label" }),
        value: new fields.StringField({ required: true, nullable: false, label: "UTOPIA.Items.Kit.FIELDS.attributes.FIELDS.value.label" }),
        name: new fields.StringField({ required: true, nullable: false, label: "UTOPIA.Items.Kit.FIELDS.attributes.FIELDS.name.label" }),
        hasChoices: new fields.BooleanField({ required: true, nullable: false, initial: false, label: "UTOPIA.Items.Kit.FIELDS.attributes.FIELDS.hasChoices.label" }),
        choiceSet: new fields.StringField({ required: false, nullable: true, initial: null, label: "UTOPIA.Items.Kit.FIELDS.attributes.FIELDS.choiceSet.label" }),
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
      }
    ]
  }

  get attributeFields() {
    return [
      {
        field: this.schema.fields.attributes,
        stacked: true,
        editable: true,
        columns: 2,
        choices: [
          ...this.attributes.map(a => {
            return a.choiceSet;
          })
        ]
      }
    ]
  }
}