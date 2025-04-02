import UtopiaItemBase from "../base-item.mjs";
import { UtopiaSchemaField } from "../fields/schema-field.mjs";


export class Talent extends UtopiaItemBase {
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "UTOPIA.Items.Talent"];

  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
      
    schema.body = new fields.NumberField({ required: true, nullable: false, initial: 0 });
    schema.mind = new fields.NumberField({ required: true, nullable: false, initial: 0 });
    schema.soul = new fields.NumberField({ required: true, nullable: false, initial: 0 });

    schema.options = new fields.SchemaField({
      // TODO: choices: new fields.SetField(new EffectChoiceField(), { initial: [] }),
      choices: new fields.SetField(new fields.StringField({ required: true, nullable: false, initial: "" }), { initial: [] }),
      category: new fields.StringField({ required: true, nullable: false, initial: "" }),
    });

    schema.selectedOption = new fields.StringField({ required: true, nullable: false, initial: "" });

    schema.flexibility = new UtopiaSchemaField({
      enabled: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      body: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      mind: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      soul: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      category: new fields.StringField({ required: true, nullable: false, initial: "subspecies", choices: {
        "subspecies": "UTOPIA.Items.Talent.FlexibilityCategory.SubSpecies",
        "speciesFirst": "UTOPIA.Items.Talent.FlexibilityCategory.SpeciesFirst",
        "speciesSecond": "UTOPIA.Items.Talent.FlexibilityCategory.SpeciesSecond",
        "speciesAll": "UTOPIA.Items.Talent.FlexibilityCategory.SpeciesAll",
        "generalPurpose": "UTOPIA.Items.Talent.FlexibilityCategory.GeneralPurpose",
      }}),
      tier: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    })

    schema.macro = new fields.DocumentUUIDField({ type: "Macro" });
    schema.grants = new fields.SetField(new fields.DocumentUUIDField({ type: "Item" }), { initial: [] });

    return schema;
  }

  get headerFields() {
    return [
      ...super.headerFields,
      {
        field: this.schema.fields.body,
        stacked: false,
        editable: true,
      },
      {
        field: this.schema.fields.mind,
        stacked: false,
        editable: true,
      },
      {
        field: this.schema.fields.soul,
        stacked: false,
        editable: true,
      },
    ]
  }

  get attributeFields() {
    return [
      {
        field: this.schema.fields.options.fields.choices,
        stacked: true,
        editable: true,
      },
      {
        field: this.schema.fields.options.fields.category,
        stacked: true,
        editable: true,
      },
      {
        field: this.schema.fields.macro,
        stacked: true,
        editable: true,
      },
      {
        field: this.schema.fields.grants,
        stacked: true,
        editable: true,
      },
      {
        field: this.schema.fields.flexibility,
        stacked: true,
        editable: true,
        columns: 6
      }
    ]
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    
    this.cost = this.body + this.mind + this.soul;

    if (this.options.choices.size === 1) {
      this.options.choices = new Set(Array.from(this.options.choices)[0].split(",").map(c => c.trim()));[[]]
    }
  }
}