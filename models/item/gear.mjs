import { isNumeric } from "../../system/helpers/isNumeric.mjs";
import UtopiaItemBase from "../base-item.mjs";

const fields = foundry.data.fields;

export class Gear extends UtopiaItemBase {
  prepareBaseData() {
    this.equippable = true;
    this.augmentable = true;
  }

  /** @override */
  static defineSchema() {
    const schema = super.defineSchema();
      
    schema.type = new fields.StringField({ required: true, nullable: false, initial: "weapon", choices: {
      "weapon": "UTOPIA.Items.Gear.FIELDS.Type.Weapon",
      "shield": "UTOPIA.Items.Gear.FIELDS.Type.Shield",
      "armor": "UTOPIA.Items.Gear.FIELDS.Type.Armor",
      "consumable": "UTOPIA.Items.Gear.FIELDS.Type.Consumable",
      "artifact": "UTOPIA.Items.Gear.FIELDS.Type.Artifact",
    }});

    schema.weaponType = new fields.StringField({ required: false, nullable: true, initial: "fastWeapon", choices: {
      "fastWeapon": "UTOPIA.Items.Gear.FIELDS.WeaponType.Fast",
      "moderateWeapon": "UTOPIA.Items.Gear.FIELDS.WeaponType.Moderate",
      "slowWeapon": "UTOPIA.Items.Gear.FIELDS.WeaponType.Slow",
    }});

    schema.armorType = new fields.StringField({ required: false, nullable: true, initial: "headArmor", choices: {
      "headArmor": "UTOPIA.Items.Gear.FIELDS.ArmorType.Head",
      "neckArmor": "UTOPIA.Items.Gear.FIELDS.ArmorType.Neck",
      "chestArmor": "UTOPIA.Items.Gear.FIELDS.ArmorType.Chest",
      "backArmor": "UTOPIA.Items.Gear.FIELDS.ArmorType.Back",
      "waistArmor": "UTOPIA.Items.Gear.FIELDS.ArmorType.Waist",
      "ringArmor": "UTOPIA.Items.Gear.FIELDS.ArmorType.Ring",
      "handsArmor": "UTOPIA.Items.Gear.FIELDS.ArmorType.Hands",
      "feetArmor": "UTOPIA.Items.Gear.FIELDS.ArmorType.Feet",
    }});

    schema.artifactType = new fields.StringField({ required: false, nullable: true, initial: "handheldArtifact", choices: {
      "handheldArtifact": "UTOPIA.Items.Gear.FIELDS.ArtifactType.Handheld",
      "equippableArtifact": "UTOPIA.Items.Gear.FIELDS.ArtifactType.Equippable",
      "ammunitionArtifact": "UTOPIA.Items.Gear.FIELDS.ArtifactType.Ammunition",
    }});

    schema.equippableArtifactSlot = new fields.StringField({ required: false, nullable: true, initial: "head", choices: {
      "head": "UTOPIA.Items.Gear.FIELDS.EquippableArtifactSlot.Head",
      "neck": "UTOPIA.Items.Gear.FIELDS.EquippableArtifactSlot.Neck",
      "chest": "UTOPIA.Items.Gear.FIELDS.EquippableArtifactSlot.Chest",
      "back": "UTOPIA.Items.Gear.FIELDS.EquippableArtifactSlot.Back",
      "waist": "UTOPIA.Items.Gear.FIELDS.EquippableArtifactSlot.Waist",
      "ring": "UTOPIA.Items.Gear.FIELDS.EquippableArtifactSlot.Ring",
      "hands": "UTOPIA.Items.Gear.FIELDS.EquippableArtifactSlot.Hands",
      "feet": "UTOPIA.Items.Gear.FIELDS.EquippableArtifactSlot.Feet",
    }});

    schema.value = new fields.NumberField({ required: true, nullable: false, initial: 0 });
    schema.features = new fields.ObjectField();
    schema.featureSettings = new fields.ObjectField();

    const components = {};
    Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.components"))).forEach(([component, _]) => {
      components[`${component}`] = new fields.SchemaField({});

      Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.rarities"))).forEach(([rarity, _]) => {
        components[`${component}`].fields[`${rarity}`] = new fields.NumberField({ required: true, nullable: false, initial: 0 });
      });
    });
    console.warn(components);

    schema.craftedFor = new fields.DocumentUUIDField({ required: false, nullable: true, initial: null });

    schema.prototype = new fields.BooleanField({ required: true, nullable: false, initial: true });
    schema.contributedComponents = new fields.SchemaField({});
    for (const [component, componentValue] of Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.components")))) {
      schema.contributedComponents[component] = new fields.SchemaField({});
      for (const [rarity, rarityValue] of Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.rarities")))) {
        schema.contributedComponents[component][rarity] = new fields.NumberField({required: true, nullable: false, initial: 0});
      }
    }  
    
    schema.quantity = new fields.NumberField({ required: true, nullable: false, initial: 1 });

    return schema;
  }  

  static migrateData(source) {
    if (source.weaponType === "fast")
      source.weaponType = "fastWeapon";
    if (source.armorType === "head")
      source.armorType = "headArmor";

    return source;
  }

  prepareDerivedData() {
    super.prepareDerivedData();

    try { this._prepareFeatures(); } catch (err) { console.error(err); }
  }

   /**
   * Determines the relevant classification key based on this.type.
   * @returns {string} The classification key.
   */
   _getRelevantClassificationKey() {
    switch (this.type) {
      case "weapon":
        return this.weaponType;
      case "armor":
        return this.armorType;
      case "artifact":
        return this.artifactType;
      default:
        return this.type;
    }
  }

  /**
 * Updates the gear based on selected features.
 * @returns {object} An object containing calculated gear attributes.
 */
  _prepareFeatures() {
    const costs = {};
    const relevantKey = this._getRelevantClassificationKey();

    // Merge attributes and costs from each selected feature.
    for (const [id, feature] of Object.entries(this.features)) {
      const parsedFeature = this._prepareFeatureTypes(feature);
      const final = this.processStacks(parsedFeature, this.featureSettings[id].stacks.value);
      parsedFeature.system.final = final;
      parsedFeature.variables = this.featureSettings[id];

      if (final) {
        // Merge attributes.
        Object.entries(final).forEach(([key, value]) => {
          if (this[key] !== undefined) {
            // If both values are strings and are a valid roll formula, join them with a plus operator.
            if (typeof this[key] === "string" && typeof value === "string" && Roll.validate(value)) {
              this[key] = `${this[key]} + ${value}`;
            }
            // If both values are strings, and are not a valid roll formula, create an array.
            else if (typeof this[key] === "string" && typeof value === "string") {
              this[key] = [...this[key], value];
            }
            // If both values are numbers, add them.
            else if (typeof this[key] === "number" && typeof value === "number") {
              this[key] += value;
            }
            // If the value is a boolean, set it.
            else if (typeof value === "boolean") {
              this[key] = value;
            }
            // Otherwise, default to the new value.
            else {
              this[key] = value;
            }
          } else {
            this[key] = value;
          }
        });
        // Merge costs.
        Object.entries(parsedFeature.system.costs[relevantKey]).forEach(([key, value]) => {
          if (costs[key] !== undefined) {
            if (typeof costs[key] === "string" && typeof value === "string") {
              costs[key] = `${costs[key]} + ${value}`;
            } else if (typeof costs[key] === "number" && typeof value === "number") {
              costs[key] += value;
            } else {
              costs[key] = value;
            }
          } else {
            costs[key] = value;
          }
        });
      }

      this.attributes ??= [];
      this.attributes.push(parsedFeature.system.final);
    }

    // this.damage = this.damage ?? "N/A";
    // this.formula = this.formula ?? "N/A";
    // this.close = this.closeRange ?? 0;
    // this.far = this.farRange ?? 0;
    this.closeRange ??= 1;
    this.farRange ??= 1;
    this.range = `${this.closeRange}/${this.farRange}`;
    this.aoe = "N/A";
    this.rarityOut = "TODO";
  }

  /**
   * Processes feature stacks and calculates simulation values.
   * @param {object} feature - The feature being processed.
   * @param {number} [stackCount=1] - The number of stacks.
   * @returns {object} Simulation results.
   */
  processStacks(feature, stackCount = 1) {
    const attributes = feature.system.classifications[this._getRelevantClassificationKey()];
    const costs = feature.system.costs[this._getRelevantClassificationKey()];
    let material, refinement, power, cost = 0;
    const componentsPerStack = costs.componentsPerStack ?? true;
    
    // Components per stack indicates whether the components are multiplied by the stack count.
    if (componentsPerStack) {
      material = (costs.material ?? 0) * stackCount;
      refinement = (costs.refinement ?? 0) * stackCount;
      power = (costs.power ?? 0) * stackCount;
    } else {
      material = costs.material ?? 0;
      refinement = costs.refinement ?? 0;
      power = costs.power ?? 0;
    }

    const costFormula = new Roll(String(costs.costFormula) ?? "0", { ...attributes, ...costs }).evaluateSync({ strict: false });
    cost = costFormula.total * stackCount;
  
    const simulation = {
      stacks: stackCount,
      material,
      refinement,
      power,
      cost,
    };

    const flattenedAttributes = foundry.utils.flattenObject(attributes);

    for (const [key, value] of Object.entries(flattenedAttributes)) {
      if (value && (!Array.isArray(value) || value.length > 0 || value === true || value === false)) {
        if (isNumeric(value)) {
          simulation[key] = parseFloat(value) * stackCount;
        } else if (typeof value === "string" && value !== "\u0000" && !isNumeric(value)) {
          try {
            if (Roll.validate(value)) {
              const extraRoll = new Roll(value, { ...attributes, ...costs }).alter(stackCount, 0);
              simulation[key] = extraRoll.formula;
            }
            else {
              simulation[key] = value;
            }
          } catch (error) {
            this._error(`Error evaluating roll for attribute ${key}:`, error);
            const extraRoll = new Roll(value, { ...attributes, ...costs }).evaluateSync({ strict: false });
            simulation[key] = extraRoll.total;
          }
        } else if (typeof value === "number" && !isNaN(value)) {
          simulation[key] = value * stackCount;
        } else if (value === true || value === false) {
          simulation[key] = value;
        }
      } else if (value === true || value === false) {
        simulation[key] = value;
      }
    }
  
    return simulation;
  }

  _prepareFeatureTypes(feature) {
    for (const classification of Object.keys(feature.system.classifications)) {
      if (classification === "shared") continue;

      feature.system.classifications[classification] = foundry.utils.mergeObject( feature.system.classifications[classification], feature.system.classifications["shared"]);
    }

    const parsedFeature = this._prepareFeatureCost(feature);
    return parsedFeature;
  }

  _prepareFeatureCost(feature) {
    feature.system.costs = {};
    for (const classification of Object.keys(feature.system.classifications)) {
      feature.system.costs[classification] = {};

      const costKeys = ["material", "refinement", "power", "costFormula", "componentsPerStack"];
      for (const key of costKeys) {
        feature.system.costs[classification][key] = feature.system.classifications[classification]?.[key] ?? 0;
        delete feature.system.classifications[classification]?.[key];
      }
    }
    
    return feature;
  }
}