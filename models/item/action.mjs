import UtopiaItemBase from "../base-item.mjs";
import { UtopiaSchemaField } from "../fields/schema-field.mjs";
import { SchemaArrayField } from "../fields/schema-set-field.mjs";

export class Action extends UtopiaItemBase {

  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "UTOPIA.Items.Action"];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.type = new fields.StringField({ required: false, nullable: false, initial: "turn", choices: {
      "turn": "UTOPIA.Items.Action.Type.turn",
      "interrupt": "UTOPIA.Items.Action.Type.interrupt",
      "free": "UTOPIA.Items.Action.Type.free",
      //"special": "UTOPIA.Items.Action.Type.special",
    }});

    schema.category = new fields.StringField({ required: false, nullable: false, initial: "damage", choices: {
      "damage": "UTOPIA.Items.Action.Category.damage",
      "test": "UTOPIA.Items.Action.Category.test",
      "formula": "UTOPIA.Items.Action.Category.flat",
      "macro": "UTOPIA.Items.Action.Category.macro",
    }});

    const returns = {};
    const allOptions = {
      ...Object.entries(CONFIG.UTOPIA.TRAITS).reduce((acc, [key, value]) => {
        acc[key] = { ...value, group: "UTOPIA.TRAITS.GroupName" };
        return acc;
      }, {}),
      ...Object.entries(CONFIG.UTOPIA.SUBTRAITS).reduce((acc, [key, value]) => {
        acc[key] = { ...value, group: "UTOPIA.SUBTRAITS.GroupName" };
        return acc;
      }, {}),
      ...Object.entries(CONFIG.UTOPIA.SPECIALTY_CHECKS).reduce((acc, [key, value]) => {
        acc[key] = { ...value, group: "UTOPIA.SPECIALTY_CHECKS.GroupName" };
        return acc;
      }, {}),
      ...Object.entries(CONFIG.UTOPIA.DAMAGE_TYPES).reduce((acc, [key, value]) => {
        acc[key] = { ...value, group: "UTOPIA.DAMAGE_TYPES.GroupName" };
        return acc;
      }, {}),
    }

    schema.check = new fields.StringField({ required: true, nullable: false, initial: "agi", choices: allOptions });
    schema.checks = new fields.SetField(schema.check, { initial: [] });
    schema.checkFavor = new fields.BooleanField({ required: true, nullable: false, initial: true });

    const damageTypes = {
      ...Object.entries(CONFIG.UTOPIA.DAMAGE_TYPES).reduce((acc, [key, value]) => {
        acc[key] = { ...value, group: "UTOPIA.DAMAGE_TYPES.GroupName", value: key };
        return acc;
      }, {}),
    }

    schema.damages = new SchemaArrayField(new fields.SchemaField({
      formula: new fields.StringField({ required: false, nullable: false, initial: "1d6" }),
      type: new fields.StringField({ required: false, nullable: false, initial: "physical", options: damageTypes }),
    }), { initial: [] });
    
    schema.validityCheck = new UtopiaSchemaField({
      enabled: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      check: new fields.StringField({ required: true, nullable: false, initial: "agi", choices: allOptions }),
      favor: new fields.BooleanField({ required: true, nullable: false, initial: true }),
      difficulty: new fields.StringField({ required: true, nullable: false, initial: "10", validate: (v) => Roll.validate(v) }),
    });

    schema.resource = new fields.StringField({ required: false, nullable: false });
    schema.consumed = new fields.NumberField({ required: false, nullable: false, initial: 0 });
    schema.macro = new fields.DocumentUUIDField({ required: false, nullable: true });
    schema.actor = new fields.StringField({ required: false, nullable: false, initial: "self", choices: {
      "self": "UTOPIA.Items.Action.Actor.self",
      "target": "UTOPIA.Items.Action.Actor.target",
    }});
    schema.template = new fields.StringField({ required: false, nullable: false, initial: "none", choices: {
      "none": "UTOPIA.Items.Action.Template.none",
      "self": "UTOPIA.Items.Action.Targets.self",
      "target": "UTOPIA.Items.Action.Targets.target",
      "sbt": "UTOPIA.Items.Action.Template.sbt",
      "mbt": "UTOPIA.Items.Action.Template.mbt",
      "lbt": "UTOPIA.Items.Action.Template.lbt",
      "xbt": "UTOPIA.Items.Action.Template.xbt",
      "cone": "UTOPIA.Items.Action.Template.cone",
      "line": "UTOPIA.Items.Action.Template.line",
    }});

    schema.cost = new fields.StringField({ required: false, nullable: true, initial: "1" });
    schema.stamina = new fields.NumberField({ required: false, nullable: false, initial: 0 });
    schema.secret = new fields.BooleanField({ required: true, initial: false });
    
    return schema;
  }

  get headerFields() {
    return [
      ...super.headerFields,
      {
        field: this.schema.fields.type,
        stacked: false,
        editable: true,
      },
      {
        field: this.schema.fields.category,
        stacked: false,
        editable: true,
      },
      {
        field: this.schema.fields.cost,
        stacked: false,
        editable: true,
      },
      {
        field: this.schema.fields.stamina,
        stacked: false,
        editable: true,
      },
      {
        field: this.schema.fields.secret,
        stacked: false,
        editable: true,
      },
    ]
  }

  get attributeFields() {
    const fields = [
      {
        field: this.schema.fields.resource,
        stacked: false,
        editable: true,
      },
      {
        field: this.schema.fields.consumed,
        stacked: false,
        editable: true,
      }
    ];
    switch (this.category) {
      case "damage":
      case "heal": 
        fields.push({
          field: this.schema.fields.damages,
          stacked: true,
          editable: true,
        })
        fields.push({
          field: this.schema.fields.template,
          stacked: true,
          editable: true,
        })
        fields.push({
          field: this.schema.fields.validityCheck,
          stacked: true,
          editable: true,
          options: Object.entries(this.schema.fields.check.options.choices).map(([key, value]) => {
            return {
              ...value,
              value: key,
            };
          })
        })
        break;
      case "test": 
        fields.push({
          field: this.schema.fields.checks,
          stacked: true,
          editable: true,
        })
        fields.push({
          field: this.schema.fields.checkFavor,
          stacked: false,
          editable: true,
        })
        fields.push({
          field: this.schema.fields.formula,
          stacked: true,
          editable: true,
        })
        break;
      case "formula": 
        fields.push({
          field: this.schema.fields.formula,
          stacked: true,
          editable: true,
        })
        break;
      case "macro":
        fields.push({
          field: this.schema.fields.macro,
          stacked: true,
          editable: true,
        })
        fields.push({
          field: this.schema.fields.actor,
          stacked: true,
          editable: true,
        })
        break;
    }
    return fields;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
  }
}