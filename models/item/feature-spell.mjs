import { getTextContrast, getTextContrastHex } from "../../system/helpers/textContrast.mjs";
import UtopiaItemBase from "../base-item.mjs";
import { UtopiaSchemaField } from "../fields/schema-field.mjs";

export class SpellFeature extends UtopiaItemBase {

  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "UTOPIA.Items.SpellFeature"];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.formula = new fields.StringField({ required: false, nullable: true });

    const artistries = JSON.parse(game.settings.get("utopia", "advancedSettings.artistries"))
    schema.art = new fields.StringField({ required: true, nullable: false, initial: "array", choices: artistries });

    // The PP Cost of the spell feature
    schema.cost = new fields.NumberField({ required: true, nullable: false, initial: 0 })

    schema.costMultiplier = new fields.StringField({ required: false, nullable: true, initial: "flat", choices: {
      "flat": "UTOPIA.MATH.Flat",
      "multiply": "UTOPIA.MATH.Multiply",
      //"divide": "UTOPIA.MATH.divide",
      //"square": "UTOPIA.Items.SpellFeature.CostMultiplier.power",
    } });
    
    // Should only be used if the spell artistry is "Wake", since none of the other features will ever modify the AOE / Direction
    // schema.doesTarget = new fields.StringField({ required: false, nullable: true, initial: "false", choices: {
    //   "false": "No",
    //   "true": "Yes"
    // }});
    schema.doesTarget = new fields.BooleanField({ required: true, nullable: false, initial: false });

    // Don't even need to bother if the "doesTarget" is false
    schema.targetType = new fields.StringField({ required: false, nullable: false, initial: "point", choices: {
      "point": "UTOPIA.Items.SpellFeature.TargetType.Point",
      "template": "UTOPIA.Items.SpellFeature.TargetType.Template",
      "attach": "UTOPIA.Items.SpellFeature.TargetType.Attach",
    } });

    // Only shown if the targetType is "template"
    schema.templateType = new fields.StringField({ required: false, nullable: false, initial: "circle", choices: {
      "circle": "CONTROLS.MeasureCircle",
      "cone": "CONTROLS.MeasureCone",
      "rectangle": "CONTROLS.MeasureRect",
      "ray": "CONTROLS.MeasureRay",
    } });

    // Only used for Cone templates
    schema.templateAngle = new fields.AngleField({ required: false, nullable: true, initial: 90 });

    schema.variables = new fields.ObjectField();

    schema.modifies = new fields.StringField({ required: false, nullable: true, initial: "none", choices: {
      "none": "UTOPIA.Items.SpellFeature.Modifies.None",
      "range": "UTOPIA.Items.SpellFeature.Modifies.Range",
      "duration": "UTOPIA.Items.SpellFeature.Modifies.Duration",
      "aoe": "UTOPIA.Items.SpellFeature.Modifies.AoE",
      //"formula": "UTOPIA.CommonTerms.formula",
    }});

    schema.modifiedAoE = new UtopiaSchemaField({
      value: new fields.NumberField({ required: false, nullable: true, initial: 0 }),
      variable: new fields.StringField({ required: false, nullable: true, initial: "X" }),
      unit: new fields.StringField({ required: false, nullable: true, initial: "meters", choices: {
        "meters": "UTOPIA.Items.SpellFeature.AoE.meters",
      }}),
      measured: new fields.StringField({ required: false, nullable: true, initial: "radius", choices: {
        "radius": "UTOPIA.Items.SpellFeature.AoE.radius",
        "diameter": "UTOPIA.Items.SpellFeature.AoE.diameter",
        "area": "UTOPIA.Items.SpellFeature.AoE.area",
        "volume": "UTOPIA.Items.SpellFeature.AoE.volume",
      }}),
      type: new fields.StringField({ required: false, nullable: true, initial: "point", choices: {
        "point": "UTOPIA.Items.SpellFeature.AoE.point",
        "template": "UTOPIA.Items.SpellFeature.AoE.template",
        "attach": "UTOPIA.Items.SpellFeature.AoE.attach",
      }}),
      shape: new fields.StringField({ required: false, nullable: true, initial: "circle", choices: {
        "circle": "CONTROLS.MeasureCircle",
        "cone": "CONTROLS.MeasureCone",
        "rectangle": "CONTROLS.MeasureRect",
        "ray": "CONTROLS.MeasureRay",
      }}),
    });
    schema.modifiedRange = new UtopiaSchemaField({
      value: new fields.NumberField({ required: false, nullable: true, initial: 0 }),
      variable: new fields.StringField({ required: false, nullable: true, initial: "X" }),
      unit: new fields.StringField({ required: false, nullable: true, initial: "meters", choices: {
        "meters": "UTOPIA.Items.SpellFeature.Range.meters",
        "kilometers": "UTOPIA.Items.SpellFeature.Range.kilometers",
      }})
    });
    schema.modifiedDuration = new UtopiaSchemaField({
      value: new fields.NumberField({ required: false, nullable: true, initial: 0 }),
      variable: new fields.StringField({ required: false, nullable: true, initial: "X" }),
      unit: new fields.StringField({ required: false, nullable: true, initial: "turns", choices: {
        "turns": "UTOPIA.Items.SpellFeature.Duration.turns",
        "minutes": "UTOPIA.Items.SpellFeature.Duration.minutes",
        "hours": "UTOPIA.Items.SpellFeature.Duration.hours",
        "days": "UTOPIA.Items.SpellFeature.Duration.days",
        "months": "UTOPIA.Items.SpellFeature.Duration.months",
        "years": "UTOPIA.Items.SpellFeature.Duration.years",
      }}),
      requirements: new fields.StringField({ required: false, nullable: true, initial: "focus", choices: {
        "none": "UTOPIA.Items.SpellFeature.DurationRequirements.none",
        "focus": "UTOPIA.Items.SpellFeature.DurationRequirements.focus",
        "concentration": "UTOPIA.Items.SpellFeature.DurationRequirements.concentration",
      }}),
      dispelInterruptCost: new fields.NumberField({ required: false, nullable: true, initial: 0 }),
      dispelActionCost: new fields.NumberField({ required: false, nullable: true, initial: 0 }),
    });
    schema.modifiedFormula = new UtopiaSchemaField({
      how: new fields.StringField({ required: false, nullable: true, initial: "add", choices: {
        "add": "UTOPIA.Math.Add",
        "subtract": "UTOPIA.Math.Subtract",
        //"replace": "UTOPIA.CommonTerms.formula.how.replace",
      }}),
      value: new fields.StringField({ required: false, nullable: true, initial: "" }),
      replace: new fields.StringField({ required: false, nullable: true, initial: "" }),
    });

    schema.variableName = new fields.StringField({ required: true, nullable: false, initial: "Variable" });
    schema.variableDescription = new fields.StringField({ required: false, nullable: true, initial: "" });
    schema.character = new fields.StringField({ required: true, nullable: false, initial: "A" });
    schema.kind = new fields.StringField({ required: true, nullable: false, initial: "none", choices: {
      "none": "UTOPIA.Items.SpellFeature.Variables.None",
      "number": "UTOPIA.Items.SpellFeature.Variables.Number",
      "text": "UTOPIA.Items.SpellFeature.Variables.Text",
      "options": "UTOPIA.Items.SpellFeature.Variables.Options",
      "dice": "UTOPIA.Items.SpellFeature.Variables.Dice",
    }});
    schema.dice = new fields.StringField({ required: false, nullable: true, initial: "", validate: ((value, options) => {
      console.log("Validating dice", value);
      return Roll.validate(value);
    })});
    schema.minimum = new fields.NumberField({ required: false, nullable: true, initial: 0 });
    schema.maximum = new fields.NumberField({ required: false, nullable: true, initial: 0 });

    return schema;
  }

  get headerFields() {
    return [
      {
        field: this.schema.fields.tags,
        stacked: true,
        editable: true,
      },
      {
        field: this.schema.fields.art,
        stacked: false,
        editable: true,
      },
      {
        field: this.schema.fields.cost,
        stacked: false,
        editable: true,
      },
      {
        field: this.schema.fields.costMultiplier,
        stacked: false,
        editable: true,
      },
      {
        field: this.schema.fields.modifies,
        stacked: false,
        editable: true,
      }
    ]
  }

  get attributeFields() {
    const fields = [];

    if (this.modifies === "range") {
      fields.push({
        field: this.schema.fields.modifiedRange,
        stacked: false,
        editable: true,
        columns: 3
      })
    }

    if (this.modifies === "duration") {
      fields.push({
        field: this.schema.fields.modifiedDuration,
        stacked: false,
        editable: true,
        columns: 4
      })
    }

    if (this.modifies === "aoe") {
      fields.push({
        field: this.schema.fields.modifiedAoE,
        stacked: false,
        editable: true,
        columns: 4
      })
    }

    if (this.modifies === "formula") {
      fields.push({
        field: this.schema.fields.modifiedFormula,
        stacked: false,
        editable: true,
      })
    }

    fields.push({
      field: this.schema.fields.formula,
      stacked: false,
      editable: true,
    })

    fields.push({
      field: this.schema.fields.doesTarget,
      stacked: false,
      editable: true,
    });

    if (this.doesTarget) {
      fields.push({
        field: this.schema.fields.targetType,
        stacked: false,
        editable: true,
      });
    }
    
    if (this.targetType === "template") {
      fields.push({
        field: this.schema.fields.templateType,
        stacked: false,
        editable: true,
      });
    }

    if (this.targetType === "template" && this.templateType === "cone") {
      fields.push({
        field: this.schema.fields.templateAngle,
        stacked: false,
        editable: true,
      });
    }

    return fields;
  }

  prepareDerivedData() {
    if (this.costMultiplier === "flat") {
      this.costResult = `${this.cost} PP`;
    } else if (this.costMultiplier === "multiply") {
      this.costResult = `${this.cost}X PP`;  
    } 
  }

  get style() {
    const artistries = JSON.parse(game.settings.get("utopia", "advancedSettings.artistries"));
    return {
      background: artistries[this.art].color,
      color: getTextContrastHex(artistries[this.art].color),
      label: artistries[this.art].label,
    }
  }
}