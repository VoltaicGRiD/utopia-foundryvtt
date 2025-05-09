import { DamageHandler } from "../../system/damage.mjs";
import { isNumeric } from "../../system/helpers/isNumeric.mjs";
import UtopiaItemBase from "../base-item.mjs";

const fields = foundry.data.fields;

export class Gear extends foundry.abstract.TypeDataModel {
  prepareBaseData() {
    this.equippable = true;
    this.augmentable = true;
  }

  /** @override */
  static defineSchema() {
    const schema = {};
      
    schema.prototype = new fields.BooleanField({ 
      required: true,
      nullable: false,
      initial: false,
    });

    schema.type = new fields.StringField({
      required: true,
      nullable: false,
      initial: "fastWeapon",
    });

    schema.features = new fields.ObjectField({
      required: true,
      nullable: false,
      initial: {},
    });

    schema.activations = new fields.ObjectField({
      required: true,
      nullable: false,
      initial: {},
    });

    return schema;
  }  

  getRollData() {
    const rollData = {};
    if (Object.keys(this.features).length > 0) {
      Object.values(this.features).forEach((feature) => {
        for (const key of feature.keys) {
          if (key.key === "range") {
            rollData["range"] = rollData["range"] || {};
            rollData["range"]["close"] = feature.output.value.split('/')[0].trim();
            rollData["range"]["far"] = feature.output.value.split('/')[1].trim();
          }
          else {
            rollData[key.key] = feature.output.value;
          }
        }
      });
    }

    // Mark ranged if either close or far range is greater than 3
    if (rollData.range && (rollData.range.close > 3 || rollData.range.far > 3)) {
      rollData.ranged = true;
    }

    return rollData;
  }

  prepareDerivedData() {
    let slots = 0;
    let actions = 0;
    let hands = 0;

    let totalRP = 0;
    let variableRPFeatures = [];

    // for (const feature of Object.values(this.features)) {
    //   if ((feature.appliesTo && feature.appliesTo === "this") || ["fastWeapon", "moderateWeapon", "slowWeapon"].includes(this.type)) {
    //     for (const key of feature.keys) {
    //       const handlers = {
    //         add: /\+X/g,
    //         subtract: /\-X/g,
    //         multiply: /([0-9]+)X(?!\/)/g, // Ensure it doesn't match '5X/10X'
    //         range: /([0-9]+)X\/([0-9]+)X/g,
    //         multiplyTo: /\*([0-9]+)X/g,
    //         divide: /^\/([0-9]+)X/g, // Ensure it only matches if '/' is the first character
    //         divideFrom: /([0-9]+)\/X/g,
    //         formula: /Xd([0-9]+)/g,
    //         override: /override/g,
    //         distributed: /distributed/g,
    //       };

    //       function handle(data, featureHandler, key, value) {
    //         for (const [handler, regex] of Object.entries(handlers)) {
    //           if (featureHandler.match(regex)) {
    //             if (typeof value === "string" && isNumeric(value)) {
    //               value = parseInt(value);
    //             }
    //             if (!foundry.utils.getProperty(data, key)) {
    //               return foundry.utils.setProperty(data, key, value);
    //             }
    //             const dataValue = foundry.utils.getProperty(data, key);
    //             value = featureHandler.replace(regex, (match, p1, p2) => {
    //               switch (handler) {
    //                 case "add":
    //                   return foundry.utils.setProperty(data, key, dataValue + value);
    //                 case "subtract":
    //                   return foundry.utils.setProperty(data, key, dataValue - value);
    //                 case "multiply":
    //                   return foundry.utils.setProperty(data, key, dataValue * value);
    //                 case "range":
    //                   return foundry.utils.setProperty(data, key, dataValue * value);
    //                 case "multiplyTo":
    //                   return foundry.utils.setProperty(data, key, dataValue * parseInt(p1) || 1);
    //                 case "divide":
    //                   return foundry.utils.setProperty(data, key, dataValue / value);
    //                 case "divideFrom":
    //                   return foundry.utils.setProperty(data, key, value / dataValue);
    //                 case "formula":
    //                   return foundry.utils.setProperty(data, key, value.replace(/d/g, "*") + "d" + p1);
    //                 case "override":
    //                   return foundry.utils.setProperty(data, key, value);
    //                 case "distributed":
    //                   return foundry.utils.setProperty(data, key, dataValue + value);
    //                 default:
    //                   return;
    //               }
    //             });
    //           }
    //         }
    //       }

    //       handle(this, feature.handler, key.key, key.value);
    //     }
    //   }
    // }

    if (["equippableArtifact", "handheldArtifact", "ammunitionArtifact"].includes(this.type)) {
      totalRP = Object.values(this.activations).reduce((acc, activation) => {
        const activationMult = activation.activation.activation.costMultiplier || 1;
        const activationRP = Object.values(activation.features).reduce((acc, feature) => {
          const featureRP = typeof feature.output.cost.RP !== "string" ? feature.output.cost.RP : 0;
          return acc + featureRP;
        }, 0);
        return acc + (activationRP * activationMult);
      }, 0);

      totalRP += Object.values(this.features).reduce((acc, feature) => {
        const featureRP = typeof feature.output.cost.RP !== "string" ? feature.output.cost.RP : 0;
        return acc + featureRP;
      }, 0);

      // If any of the selected features have a string value for RP, we need to parse it
      variableRPFeatures = Object.values(this.features).filter((feature) => typeof feature.output.cost.RP === "string" && feature.output.cost.RP.includes("@"));
    }
    else {
      totalRP = Object.values(this.features)
      .map((feature) => typeof feature.output.cost.RP !== "string" ? feature.output.cost.RP : 0)
      .reduce((acc, value) => acc + value, 0);
      
      // If any of the selected features have a string value for RP, we need to parse it
      variableRPFeatures = Object.values(this.features).filter((feature) => typeof feature.output.cost.RP === "string" && feature.output.cost.RP.includes("@"));
    }

    const rollData = this.getRollData();

    // There are no additional values we need to parse
    if (variableRPFeatures.length > 0) {
      for (const feature of variableRPFeatures) {
        const featureRP = feature.output.cost.RP;

        // If the RP value is a string, we need to parse it
        if (typeof featureRP === "string") {
          const roll = new Roll(featureRP, rollData).evaluateSync();
          totalRP += roll.total;
        }
      }
    }

    const rarities = Object.values(JSON.parse(game.settings.get("utopia", "advancedSettings.rarities")));
    const rarity = rarities.find((r) => totalRP >= r.points.minimum && totalRP <= r.points.maximum) || rarities[0];

    let componentCosts = {}
    if (["equippableArtifact", "handheldArtifact", "ammunitionArtifact"].includes(this.type)) {
      componentCosts.material = Math.max(Math.floor(totalRP / 25), 1);
      componentCosts.refinement = Math.max(Math.floor(totalRP / 40), 1);
      componentCosts.power = Math.max(Math.floor(totalRP / 50), 0);
    }
    else {
      componentCosts = Object.values(this.features).reduce((acc, feature) => {
        ["material", "refinement", "power"].forEach((key) => {
          if (feature.output.cost[key]) {
            acc[key] = acc[key] || 0;
            acc[key] += feature.output.cost[key];
          }
        });
        return acc;
      }, {});
    }

    for (const value of Object.values(this.features).filter(f => f.key === "slots")) {
      slots = parseInt(value.output.value);
    }

    this.artifice = {
      RP: totalRP,
      rarity,
      value: totalRP * rarity.points.multiplier,
      slots,
      actions,
      hands,
      material: componentCosts.material || 0,
      refinement: componentCosts.refinement || 0,
      power: componentCosts.power || 0,
    }

    this.handleFeatures();
  }  

  handleFeatures() {
    if (["fastWeapon", "moderateWeapon", "slowWeapon"].includes(this.type)) {
      const damageFeatures = Object.values(this.features).filter(f => f.parentKey === "damage");
      const damages = [];
      for (const keys of [...Object.values(damageFeatures).map(k => k.keys)]) { 
        for (const key of keys) {
          const parts = key.parts;
          damages.push({
            formula: parts.find(k => k.key === "damage.formula").value,
            type: parts.find(k => k.key === "damage.type").value,
          })
        }
      }

      this.damages = damages;
    }
    else if (["headArmor", "chestArmor", "handsArmor", "feetArmor"].includes(this.type)) {
      const armorFeatures = Object.values(this.features).filter(f => f.appliesTo && f.appliesTo === "this");
      for (const feature of armorFeatures) {
        for (const key of feature.keys) {
          this.handle(this, feature.handler, key.key, key.value)
        }
      }
    }
    else if (["shields"].includes(this.type)) {
      const shieldFeatures = Object.values(this.features).filter(f => f.appliesTo && f.appliesTo === "this");
      for (const feature of shieldFeatures) {
        for (const key of feature.keys) {
          this.handle(this, feature.handler, key.key, key.value)
        }
      }
    }
    else if (["consumable"].includes(this.type)) {
      const consumableFeatures = Object.values(this.features).filter(f => f.appliesTo && f.appliesTo === "this");
      for (const feature of consumableFeatures) {
        for (const key of feature.keys) {
          this.handle(this, feature.handler, key.key, key.value)
        }
      }
    }
    else if (["equippableArtifact", "handheldArtifact", "ammunitionArtifact"].includes(this.type)) {
      const artifactFeatures = Object.values(this.features).filter(f => f.appliesTo && f.appliesTo === "this");
      for (const feature of artifactFeatures) {
        for (const key of feature.keys) {
          this.handle(this, feature.handler, key.key, key.value)
        }
      }
    }
  }

  handle(data, featureHandler, key, value) {
    const handlers = {
      add: /\+X/g,
      subtract: /\-X/g,
      multiply: /([0-9]+)X(?!\/)/g, // Ensure it doesn't match '5X/10X'
      range: /([0-9]+)X\/([0-9]+)X/g,
      multiplyTo: /\*([0-9]+)X/g,
      divide: /^\/([0-9]+)X/g, // Ensure it only matches if '/' is the first character
      divideFrom: /([0-9]+)\/X/g,
      formula: /Xd([0-9]+)/g,
      override: /override/g,
      distributed: /distributed/g,
    };

    for (const [handler, regex] of Object.entries(handlers)) {
      if (featureHandler.match(regex)) {
        if (typeof value === "string" && isNumeric(value)) {
          value = parseInt(value);
        }
        if (!foundry.utils.getProperty(data, key)) {
          foundry.utils.setProperty(data, key, "");
        }
        const dataValue = foundry.utils.getProperty(data, key);
        value = featureHandler.replace(regex, (match, p1, p2) => {
          switch (handler) {
            case "add":
              return foundry.utils.setProperty(data, key, dataValue + value);
            case "subtract":
              return foundry.utils.setProperty(data, key, dataValue - value);
            case "multiply":
              return foundry.utils.setProperty(data, key, dataValue * value);
            case "range":
              return foundry.utils.setProperty(data, key, dataValue * value);
            case "multiplyTo":
              return foundry.utils.setProperty(data, key, dataValue * parseInt(p1) || 1);
            case "divide":
              return foundry.utils.setProperty(data, key, dataValue / value);
            case "divideFrom":
              return foundry.utils.setProperty(data, key, value / dataValue);
            case "formula":
              return foundry.utils.setProperty(data, key, value.replace(/d/g, "*") + "d" + p1);
            case "override":
              return foundry.utils.setProperty(data, key, value);
            case "distributed":
              return foundry.utils.setProperty(data, key, dataValue + value);
            default:
              return;
          }
        });
      }
    }
  }

  use() {
    if (["fastWeapon", "moderateWeapon", "slowWeapon"].includes(this.type)) {
      this._useWeapon();
    }    
  }

  _useWeapon() {
    if (game.settings.get("utopia", "targetRequired")) {
      if (game.user.targets.size === 0) {
        ui.notifications.error(game.i18n.localize("UTOPIA.Error.noTarget"));
        return;
      }
    }

    const damages = this.damages;
    if (damages) {
      if (Array.isArray(damages)) {
        const damageHandler = new DamageHandler({ damages, targets: Array.from(game.user.targets), source: this.parent })
      }
    }
  }
}