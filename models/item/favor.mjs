import UtopiaItemBase from "../base-item.mjs";

export class Favor extends UtopiaItemBase {
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "UTOPIA.Items.Favor"];

  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
      
    //schema.always = new fields.BooleanField({ required: true, nullable: false, initial: true }),
    schema.conditions = new fields.SetField( new fields.StringField({ required: false, nullable: true, choices: {
      always: "UTOPIA.Items.Favor.always",
      hostile: "UTOPIA.Items.Favor.hostile",
      neutral: "UTOPIA.Items.Favor.neutral",
      friendly: "UTOPIA.Items.Favor.friendly",
      detectedHostile: "UTOPIA.Items.Favor.detectedHostile",
      detectedNeutral: "UTOPIA.Items.Favor.detectedNeutral",
      detectedFriendly: "UTOPIA.Items.Favor.detectedFriendly",
      detectedByHostile: "UTOPIA.Items.Favor.detectedByHostile",
      detectedByNeutral: "UTOPIA.Items.Favor.detectedByNeutral",
      detectedByFriendly: "UTOPIA.Items.Favor.detectedByFriendly",
    }}), { initial: ['always'] });
    
    const returns = {};
    const allOptions = {
      ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.traits"))).reduce((acc, [key, value]) => {
        acc[key] = { ...value, group: "UTOPIA.TRAITS.GroupName" };
        return acc;
      }, {}),
      ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.subtraits"))).reduce((acc, [key, value]) => {
        acc[key] = { ...value, group: "UTOPIA.SUBTRAITS.GroupName" };
        return acc;
      }, {}),
      ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.specialtyChecks"))).reduce((acc, [key, value]) => {
        acc[key] = { ...value, group: "UTOPIA.SPECIALTY_CHECKS.GroupName" };
        return acc;
      }, {}),
    }
    
    schema.check = new fields.StringField({ required: true, nullable: false, initial: "agi", choices: allOptions });
    schema.checks = new fields.SetField(schema.check, { initial: [] });
    
    schema.target = new fields.StringField({
      required: true,
      nullable: false,
      initial: "self",
      choices: {
        self: "UTOPIA.Items.Favor.self",
        targeted: "UTOPIA.Items.Favor.targeted",
      }
    });
    schema.value = new fields.NumberField({ required: true, nullable: false, initial: 1 });

    return schema;
  }

  migrateData(source) {
    if (source.always) {
      source.conditions = [...source.conditions, 'always'];
    }
    return source;
  }

  get headerFields() {
    return [
      ...super.headerFields,
      {
        field: this.schema.fields.checks,
        stacked: true,
        editable: true,
        options:  Object.entries(this.schema.fields.check.options.choices).map(([key, value]) => {
          return {
            ...value,
            value: key,
          };
        })
      },
      {
        field: this.schema.fields.value,
        stacked: false,
        editable: true,
      },
    ]
  }

  get attributeFields() {
    return [
      {
        field: this.schema.fields.conditions,
        stacked: true,
        editable: true,
      },
      {
        field: this.schema.fields.target,
        stacked: true,
        editable: true
      }
    ]
  }

  getSheetContext(context) {
    return {
      checks: this.schema.fields.check.options,
      conditions: this.schema.fields.conditions.choices,
      targets: this.schema.fields.target.choices,
    };
  }
}