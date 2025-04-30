import UtopiaItemBase from "../base-item.mjs";
import { UtopiaSchemaField } from "../fields/schema-field.mjs";
import { SchemaArrayField } from "../fields/schema-set-field.mjs";

export class Action extends UtopiaItemBase {

  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "UTOPIA.Items.Action"];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.type = new fields.StringField({ required: false, nullable: false, initial: "turn", choices: {
      "current": "UTOPIA.Items.Action.Type.current",
      "turn": "UTOPIA.Items.Action.Type.turn",
      "interrupt": "UTOPIA.Items.Action.Type.interrupt",
      "free": "UTOPIA.Items.Action.Type.free",
      //"special": "UTOPIA.Items.Action.Type.special",
    }});

    schema.category = new fields.StringField({ required: false, nullable: false, initial: "damage", choices: {
      "damage": "UTOPIA.Items.Action.Category.damage",
      "test": "UTOPIA.Items.Action.Category.test",
      "formula": "UTOPIA.Items.Action.Category.formula",
      "utility": "UTOPIA.Items.Action.Category.utility",
      "passive": "UTOPIA.Items.Action.Category.passive",
      "active": "UTOPIA.Items.Action.Category.active",
      "macro": "UTOPIA.Items.Action.Category.macro",
    }});

    schema.isBaseAction = new fields.BooleanField({ required: true, nullable: false, initial: false });

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
      ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
        acc[key] = { ...value, group: "UTOPIA.DAMAGE_TYPES.GroupName" };
        return acc;
      }, {}),
    }

    const statusEffects = {
      ...CONFIG.statusEffects.reduce((acc, effect) => {
        acc[effect.id] = { ...effect };
        return acc;
      }, {})
    }

    schema.toggleActiveEffects = new fields.BooleanField({ required: true, nullable: false, initial: false });

    schema.restoration = new fields.BooleanField({ required: true, nullable: false, initial: true });
    schema.restorationType = new fields.StringField({ required: false, nullable: true, initial: "surface", choices: {
      "surface": "UTOPIA.Items.Action.RestorationType.surface",
      "deep": "UTOPIA.Items.Action.RestorationType.deep",
      "stamina": "UTOPIA.Items.Action.RestorationType.stamina",
    }});

    schema.check = new fields.StringField({ required: true, nullable: false, initial: "agi", choices: allOptions });
    schema.checks = new fields.SetField(schema.check, { initial: [] });
    schema.checkFavor = new fields.BooleanField({ required: true, nullable: false, initial: true });
    schema.checkAgainstTarget = new fields.BooleanField({ required: true, nullable: false, initial: false })
    schema.checkAgainstTrait = new fields.StringField({ required: true, nullable: false, initial: "agi", choices: allOptions });
    schema.applyStatusEffectToTarget = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.statusEffectToApply = new fields.StringField({ required: true, nullable: false, initial: "grappled", choices: statusEffects })

    const damageTypes = {
      ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
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
    schema.range = new fields.StringField({ required: false, nullable: false, initial: "0/0" });
    schema.damageModifier = new fields.StringField({ required: false, nullable: false, initial: "str", choices: allOptions });
    schema.accuracyTrait = new fields.StringField({ required: false, nullable: false, initial: "agi", choices: allOptions });
    schema.template = new fields.StringField({ required: false, nullable: false, initial: "none", choices: {
      "none": "UTOPIA.Items.Action.Template.none",
      "self": "UTOPIA.Items.Action.Template.self",
      "target": "UTOPIA.Items.Action.Template.target",
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

    schema.passive = new fields.SchemaField({
      type: new fields.StringField({ required: true, nullable: false, choices: {
        "meleeRedirect": "UTOPIA.Items.Action.PassiveType.meleeRedirect",
        "rangedRedirect": "UTOPIA.Items.Action.PassiveType.rangedRedirect",
        "travelPlusStunt": "UTOPIA.Items.Action.PassiveType.travelPlusStunt",
        "blockWithWeapon": "UTOPIA.Items.Action.PassiveType.blockWithWeapon", 
        "respondWithAttack": "UTOPIA.Items.Action.PassiveType.respondWithAttack", // Sensed creature attacks + 8 stamina = attack action for interrupt cost
        "attackAllInRange": "UTOPIA.Items.Action.PassiveType.attackAllInRange",
        "reduceAttackActionCost": "UTOPIA.Items.Action.PassiveType.reduceActionCost", // 3 -> min 4; 5 -> min 2; 7 -> min 1
        "ignoreDamageType": "UTOPIA.Items.Action.PassiveType.ignoreDamageType",
      }, initial: "meleeRedirect" }),
      scaling: new fields.SchemaField({
        enabled: new fields.BooleanField({ required: true, initial: false }),
        resource: new fields.StringField({ required: false, nullable: true, choices: {
          "cost": "UTOPIA.Items.Action.ScaleResource.cost",
          "stamina": "UTOPIA.Items.Action.ScaleResource.stamina",
        }, initial: "stamina" }),
        ratio: new fields.SetField(new fields.StringField({ required: false, nullable: true }), { initial: [] }),
      }),
      equipment: new fields.SchemaField({
        enabled: new fields.BooleanField({ required: true, initial: false }),
        mustBeEquipped: new fields.BooleanField({ required: true, initial: true }),
        type: new fields.StringField({ required: true, initial: "weapon", choices: {
          "weapon": "UTOPIA.Items.Action.EquipmentType.weapon",
          "armor": "UTOPIA.Items.Action.EquipmentType.armor",
          "shield": "UTOPIA.Items.Action.EquipmentType.shield",
        }}),
        reduceActionCost: new fields.StringField({ required: true, nullable: false, choices: {
          "scalingRatio": "UTOPIA.Items.Action.ReduceActionCost.scalingRatio",
          "flat": "UTOPIA.Items.Action.ReduceActionCost.flat",
        }, initial: "scalingRatio" }),
        reduceActionCostFlat: new fields.NumberField({ required: false, nullable: true, initial: 0 }),
      }),
      ignoreDamage: new fields.SchemaField({
        ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
          if (value.healing === false) 
            acc[key] = new fields.BooleanField({ required: true, initial: false });
          return acc;
        }, {}),
      })
    });

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
      {
        field: this.schema.fields.toggleActiveEffects,
        stacked: false,
        editable: true,
      }
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
          field: this.schema.fields.damageModifier,
          stacked: true,
          editable: true,
          options: Object.entries(this.schema.fields.check.options.choices).map(([key, value]) => {
            return {
              ...value,
              value: key,
            };
          })
        })
        fields.push({
          field: this.schema.fields.range,
          stacked: true,
          editable: true,
        })
        fields.push({
          field: this.schema.fields.accuracyTrait,
          stacked: true,
          editable: true,
          options: Object.entries(this.schema.fields.check.options.choices).map(([key, value]) => {
            return {
              ...value,
              value: key,
            };
          })
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
      case "passive": 
        fields.push({
          field: this.schema.fields.passive.fields.type,
          stacked: true,
          editable: true,
        });
        fields.push({
          field: this.schema.fields.passive.fields.scaling.fields.enabled,
          stacked: true,
          editable: true,
        });
        if (this.passive.scaling.enabled) {
          fields.push({
            field: this.schema.fields.passive.fields.scaling.fields.resource,
            stacked: true,
            editable: true,
          });
          fields.push({
            field: this.schema.fields.passive.fields.scaling.fields.ratio,
            stacked: true,
            editable: true,
          });
        }
        fields.push({
          field: this.schema.fields.passive.fields.equipment.fields.enabled,
          stacked: true,
          editable: true,
        });
        if (this.passive.equipment.enabled) {
          fields.push({
            field: this.schema.fields.passive.fields.equipment.fields.mustBeEquipped,
            stacked: true,
            editable: true,
          });
          fields.push({
            field: this.schema.fields.passive.fields.equipment.fields.type,
            stacked: true,
            editable: true,
          });
          fields.push({
            field: this.schema.fields.passive.fields.equipment.fields.reduceActionCost,
            stacked: true,
            editable: true,
          });
          if (this.passive.equipment.reduceActionCost === "flat") {
            fields.push({
              field: this.schema.fields.passive.fields.equipment.fields.reduceActionCostFlat,
              stacked: true,
              editable: true,
            });
          }
        }
        if (this.passive.type === "ignoreDamageType") {
          const allDamage = {
            ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
              if (value.healing === false)
                acc[key] = { ...value, group: "UTOPIA.DAMAGE_TYPES.GroupName", value: key };
              return acc;
            }, {})
          }
          for (const [key, value] of Object.entries(allDamage)) { 
            fields.push({
              field: this.schema.fields.passive.fields.ignoreDamage.fields[key],
              stacked: true,
              editable: true,
            });
          }
        }
        break;
      case "utility":
        fields.push({
          field: this.schema.fields.formula,
          stacked: true,
          editable: true,
        }),
        // fields.push({
        //   field: this.schema.fields.validityCheck,
        //   stacked: true,
        //   editable: true,  
        //   options: Object.entries(this.schema.fields.check.options.choices).map(([key, value]) => {
        //     return {
        //       ...value,
        //       value: key,
        //     };
        //   })
        // }),
        fields.push({
          field: this.schema.fields.restoration,
          stacked: true,
          editable: true,
        }),
        fields.push({
          field: this.schema.fields.restorationType,
          stacked: true,
          editable: true,
        });
        break;
    }
    return fields;
  }

  prepareDerivedData() {
    super.prepareDerivedData();

    if (this.parent.parent) { // Owned by an actor
      const system = this.parent.parent.system;

      if (this.isBaseAction && this.parent.name === game.i18n.localize("UTOPIA.Actors.Actions.DeepBreath")) {
        // Get the parent's data for "system.deepBreath"
        this.restoration += system.deepBreath.additionalStamina || {};
      }

      if (this.isBaseAction && this.parent.name === game.i18n.localize("UTOPIA.Actors.Actions.WeaponlessAttack")) {
        // Update this item with the actors weaponless attack data
        this.damages = [{
          formula: system.weaponlessAttacks.formula,
          type: system.weaponlessAttacks.type || "physical",
        }];
        this.range = system.weaponlessAttacks.range || "0/0";
        this.accuracyTrait = system.weaponlessAttacks.traits[0] || "agi";
        this.stamina = system.weaponlessAttacks.stamina || 0;
        this.cost = system.weaponlessAttacks.actionCost || "1";
      }
    }
  }
}