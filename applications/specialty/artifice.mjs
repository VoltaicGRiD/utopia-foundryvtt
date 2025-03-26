import { gatherItems } from '../../system/helpers/gatherItems.mjs';
import { isNumeric } from '../../system/helpers/isNumeric.mjs';
import { getTextContrast } from '../../system/helpers/textContrast.mjs';

const { api } = foundry.applications;

/**
 * Class representing the Artifice Sheet.
 * Extends the Foundry ApplicationV2 with Handlebars mixin.
 */
export class ArtificeSheet extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  // Class properties
  selected = {};
  allFeatures = {};
  features = {};
  secretFeatures = {};
  filter = "";
  actor = {};
  items = [];
  featureSettings = {};

  /**
   * Creates an instance of ArtificeSheet.
   * @param {object} options - Options for the sheet.
   */
  constructor(options = {}) {
    super(options);
    this.type = "";
    this.weaponType = "";
    this.armorType = "";
    this.artifactType = "";
  }

  // Default options for the application.
  static DEFAULT_OPTIONS = {
    classes: ["utopia", "artifice"],
    position: {
      width: 870,
      height: 800,
    },
    actions: {
      image: this._image,
      save: this._save,
      chat: this._chat, 
    },
    window: {
      title: "UTOPIA.SheetLabels.artifice",
    },
  };

  // Template parts for the application.
  static PARTS = {
    content: {
      template: "systems/utopia/templates/specialty/artifice.hbs",
      scrollable: [".feature-list"],
    },
  };

  /**
   * Configures render options.
   * @param {object} options - Render options.
   */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ["content"];
  }

  /**
   * Centralized logging method.
   * @param {string} message - The log message.
   * @param {...any} args - Additional data to log.
   */
  _log(message, ...args) {
    console.log(`[ArtificeSheet] ${message}`, ...args);
  }

  /**
   * Centralized error logging method.
   * @param {string} message - The error message.
   * @param {...any} args - Additional data to log.
   */
  _error(message, ...args) {
    console.error(`[ArtificeSheet ERROR] ${message}`, ...args);
  }

  /**
   * Builds a localized choices object from field choices.
   * @param {object} choices - The raw choices from the schema.
   * @returns {object} Localized choices.
   */
  _buildLocalizedChoices(choices) {
    const localized = {};
    Object.entries(choices).forEach(([key, value]) => {
      localized[key] = game.i18n.localize(value);
    });
    return localized;
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
   * Assigns attributes to a feature based on the classification key.
   * If the classification key corresponds to a sub-classification (weapon, armor, or artifact)
   * and mergeShared is true, it will merge the shared attributes.
   *
   * @param {object} feature - The feature to update.
   * @param {string} classificationKey - The key to match.
   * @param {object} [options] - Options for assignment.
   * @param {boolean} [options.mergeShared=false] - Whether to merge with the "shared" classification.
   */
  _assignAttributes(feature, classificationKey, { mergeShared = false } = {}) {
    // Check if the feature has the desired classification.
    if (!feature.system.classifications[classificationKey]) return;

    // If mergeShared is enabled and the classification key is one of the sub-classifications,
    // merge the specific classification with any shared attributes.
    if (
      mergeShared &&
      feature.system.classifications.shared
    ) {
      feature.system.attributes = foundry.utils.mergeObject(
        feature.system.classifications[classificationKey],
        feature.system.classifications.shared
      );
    } else {
      feature.system.attributes = feature.system.classifications[classificationKey];
    }
  }

  /**
   * Prepares the context for rendering the sheet.
   * @param {object} options - Options passed to the sheet.
   * @returns {object} The prepared context.
   */
  async _prepareContext(options) {
    // Gather gear features.
    const features = await gatherItems({ type: "gearFeature", gatherFromActor: false, gatherFolders: false });
    this.features = features;

    // Build localized choice objects.
    const fields = CONFIG.Item.dataModels.gear.schema.fields;
    const types = this._buildLocalizedChoices(fields.type.choices);
    const weaponTypes = this._buildLocalizedChoices(fields.weaponType.choices);
    const armorTypes = this._buildLocalizedChoices(fields.armorType.choices);
    const artifactTypes = this._buildLocalizedChoices(fields.artifactType.choices);

    // If an item is provided, set the type and subtypes.
    const item = options.item ?? null;
    if (item) {
      this.type = item.system.type;
      this.weaponType = item.system.weaponType;
      this.armorType = item.system.armorType;
      this.artifactType = item.system.artifactType;
    }

    // Filter features based on the type.
    let filteredFeatures = [];
    switch (this.type) {
      case "weapon":
        filteredFeatures = features.filter(f =>
          ["fastWeapon", "moderateWeapon", "slowWeapon"].some(r =>
            Object.keys(f.system.classifications).includes(r)
          )
        );
        break;
      case "armor":
        filteredFeatures = features.filter(f =>
          ["headArmor", "chestArmor", "waistArmor", "handsArmor", "feetArmor"].some(r =>
            Object.keys(f.system.classifications).includes(r)
          )
        );
        break;
      case "shield":
        filteredFeatures = features.filter(f =>
          ["shield", "shields"].some(r =>
            Object.keys(f.system.classifications).includes(r)
          )
        );
        break;
      case "consumable":
        filteredFeatures = features.filter(f =>
          ["consumable"].some(r =>
            Object.keys(f.system.classifications).includes(r)
          )
        );
        break;
      case "artifact":
        filteredFeatures = features.filter(f =>
          ["ammunitionArtifact", "equippableArtifact", "handheldArtifact", "artifact"].some(r =>
            Object.keys(f.system.classifications).includes(r)
          )
        );
        break;
      default:
        break;
    }

    // Process selected features: assign attributes.
    const relevantKey = this._getRelevantClassificationKey();
    for (const feature of Object.values(this.selected)) {
      this._assignAttributes(feature, relevantKey);
      const uuid = feature.uuid ?? feature._uuid;
      if (!uuid && this.featureSettings[feature.uuid]) {
        this.featureSettings[feature.uuid].stacks.maximum = feature.system.attributes.maxStacks;
      }
    }

    // Process available features: assign attributes (merge shared for weapons).
    for (const feature of Object.values(this.features)) {
      this._assignAttributes(feature, relevantKey, { mergeShared: (this.type === "weapon") });
    }
    
    // Process stacks for each selected feature.
    for (const feature of Object.values(this.selected)) {
      const uuid = feature.uuid ?? feature._uuid;
      const featureResponse = await this.processStacks(feature, this.featureSettings[uuid].stacks.value);
      feature.system.final = featureResponse;
      this._log("Processed feature stacks:", featureResponse);
    }

    // Update gear attributes based on selected features.
    const gear = await this.updateGear();

    // Process non-selected features: assign attributes.
    for (const feature of Object.values(this.features)) {
      if (!this.selected[feature.uuid]) {
        this._assignAttributes(feature, relevantKey);
      }
    }

    // Build type data for the context.
    const typeData = {
      type: this.type,
      weaponType: this.weaponType,
      armorType: this.armorType,
      artifactType: this.artifactType,
      types: types,
      weaponTypes: weaponTypes,
      armorTypes: armorTypes,
      artifactTypes: artifactTypes,
    };

    const context = {
      features: filteredFeatures,
      featureSettings: this.featureSettings,
      selected: this.selected,
      systemFields: CONFIG.Item.dataModels.gear.schema.fields,
      ...typeData,
      ...gear,
    };

    this._log("Context prepared", context);
    this._log("Sheet instance", this);

    return context;
  }

  /**
   * Prepares additional context for a specific part.
   * @param {string} partId - The part identifier.
   * @param {object} context - The current context.
   * @returns {object} The updated context.
   */
  async _preparePartContext(partId, context) {
    if (partId === "column") {
      // Placeholder for future column-specific context modifications.
    }
    return context;
  }

  /**
   * Sets up event listeners after the sheet is rendered.
   * @param {object} context - The render context.
   * @param {object} options - Render options.
   */
  async _onRender(context, options) {
    // Setup select element change listeners.
    this.element.querySelectorAll("select[data-action='update']").forEach(s => {
      s.addEventListener("change", async (event) => {
        this._update(event, s);
      });
    });

    // Setup drag-and-drop for available features.
    this.element.querySelectorAll(".available-feature").forEach(f => {
      f.draggable = true;
      f.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("text", JSON.stringify({ id: f.dataset.id, type: "feature" }));
      });
    });

    // Setup drag-and-drop for gear items.
    this.element.querySelectorAll(".gear").forEach(s => {
      s.draggable = true;
      s.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("text", JSON.stringify({ id: s.dataset.id, type: "gear" }));
      });
    });

    // Setup hover listeners on features for showing/hiding controls.
    this.element.querySelectorAll(".feature").forEach(f => {
      f.addEventListener("mouseover", () => {
        const list = f.closest("ol");
        if (list.classList.contains("selected-feature-list")) {
          f.querySelector(".remove-feature").classList.remove("hidden");
        }
        if (list.classList.contains("feature-list")) {
          f.querySelector(".favorite-feature").classList.remove("hidden");
        }
      });
      f.addEventListener("mouseout", () => {
        const list = f.closest("ol");
        if (list.classList.contains("selected-feature-list")) {
          f.querySelector(".remove-feature").classList.add("hidden");
        }
        if (list.classList.contains("feature-list")) {
          f.querySelector(".favorite-feature").classList.add("hidden");
        }
      });
    });

    // Setup remove-feature button listeners.
    this.element.querySelectorAll(".remove-feature").forEach(b => {
      b.addEventListener("click", (event) => {
        const id = event.target.closest("li").dataset.id;
        delete this.selected[id];
        this.render();
      });
    });

    // Setup favorite-feature button listeners.
    this.element.querySelectorAll(".favorite-feature").forEach(b => {
      b.addEventListener("click", async (event) => {
        const li = event.target.closest("li");
        const id = li.dataset.id;
        const feature = this.features[id];
        if (feature.favorite === true) {
          await this.removeFavorite(feature);
        } else {
          await this.addFavorite(feature);
        }
        this.render();
      });
    });

    // Setup drag events on the main element for styling.
    this.element.addEventListener("dragover", () => {
      this.element.querySelector('.gear-panel').classList.add("dragging");
    });
    this.element.addEventListener("dragleave", () => {
      this.element.querySelector('.gear-panel').classList.remove("dragging");
    });
    this.element.addEventListener("drop", () => {
      this.element.querySelector('.gear-panel').classList.remove("dragging");
    });

    // Setup scroll listener for feature list.
    const gearFeaturesList = this.element.querySelector('.feature-list');
    const itemHeight = 25;
    const itemGap = 5;
    const scrollAmount = itemHeight + itemGap;
    gearFeaturesList.addEventListener('wheel', (event) => {
      event.preventDefault();
      const delta = Math.sign(event.deltaY);
      gearFeaturesList.scrollBy({ top: delta * scrollAmount, behavior: 'auto' });
    });

    // Setup drag-and-drop for gear panel.
    const gear = this.element.querySelector(".gear-panel");
    gear.addEventListener("dragover", (event) => event.preventDefault());
    gear.addEventListener("drop", async (event) => {
      event.preventDefault();
      const data = JSON.parse(event.dataTransfer.getData("text"));
      if (data.type === "feature") {
        const id = data.id;
        const feature = this.features[id];
        const selectedId = foundry.utils.randomID();
        this.selected[selectedId] = feature;
        const uuid = feature.uuid ?? feature._uuid;
        if (!uuid) return ui.notifications.error("This feature cannot be added to a gear.");
        if (!feature) return ui.notifications.error("This feature does not exist.");

        // Set default feature settings.
        this.featureSettings[uuid] = { 
          stacks: {
            variableName: "stacks",
            variableDescription: "Stacks",
            character: "@",
            kind: "number",
            minimum: 1,
            value: 1
          }
        };
        this.render();
      } else if (data.type === "gear") {
        const id = data.id;
        const gear = this.worldSpells[id];
        if (!gear) return;
        await this.addSpell(gear);
        this.render();
      }
    });

    // Setup input listeners.
    this.element.querySelector("input[name='name']").addEventListener("change", (event) => {
      this.name = event.target.value;
    });
    this.element.querySelectorAll("input[type='number']").forEach(v => {
      v.addEventListener("change", async (event) => {
        const featureItem = event.target.closest("li");
        const featureId = featureItem.dataset.id;
        const feature = this.selected[featureId];
        const uuid = feature.uuid ?? feature._uuid;
        const value = parseInt(event.target.value);
        this.featureSettings[uuid].stacks.value = value;
        this.render();
      });
    });
    this.element.querySelector("input[name='filter']").addEventListener("change", (event) => {
      this.filter = event.target.value;
      this.render();
    });
    this.element.querySelector("textarea[name='flavor']").addEventListener("change", (event) => {
      this.flavor = event.target.value;
      this.render();
    });
  }

  /**
   * Updates the gear based on selected features.
   * @returns {object} An object containing calculated gear attributes.
   */
  async updateGear() {
    const item = new Item({ name: this.name ?? "Unnamed Gear", type: "gear", system: {} });
    const costs = {};
    const relevantKey = this._getRelevantClassificationKey();

    // Merge attributes and costs from each selected feature.
    for (const feature of Object.values(this.selected)) {
      if (feature.system.final) {
        // Merge attributes.
        Object.entries(feature.system.final).forEach(([key, value]) => {
          item.system[key] = value;
        });
        // Merge costs.
        Object.entries(feature.system.costs[relevantKey]).forEach(([key, value]) => {
          costs[key] = value;
        });
      }
    }

    const damage = item.system.damage ?? "N/A";
    const formula = item.system.formula ?? "N/A";
    const close = item.system.closeRange ?? 0;
    const far = item.system.farRange ?? 0;
    const range = `${close}/${far}`;
    const aoe = "N/A";
    const rarityOut = "TODO";

    return { damage, formula, aoe, range, rarity: rarityOut };
  }

  /**
   * Updates a property based on a select input change.
   * @param {Event} event - The change event.
   * @param {HTMLElement} target - The select element.
   */
  async _update(event, target) {
    this[target.name] = target.selectedOptions[0].value;
    this.render(true);
  }

  /**
   * Saves the current gear configuration.
   */
  static async _save() {
    if (Object.keys(this.selected).length === 0) return;

    const { selected, name, duration, range, aoe, flavor, cost } = this;
    const gear = {
      name,
      type: "gear",
      system: {
        features: selected,
        duration,
        range,
        aoe,
        flavor,
        cost,
      },
    };

    this._log("Saving gear", gear);

    if (this.actor && Object.keys(this.actor).length > 0) {
      await this.actor.createEmbeddedDocuments("Item", [gear]);
    } else if (this.items.length === 1) {
      // Update existing gear.
      await this.items[0].update({
        name,
        system: {
          features: selected,
          duration,
          range,
          aoe,
          flavor,
          cost,
        },
      });
    } else {
      const doc = await Item.create(gear);
      await game.packs.get('utopia.items').importDocument(doc);
      await doc.delete();
    }
    this.render();
  }

  /**
   * Filters available features based on the filter input.
   */
  async applyFilter() {
    let terms = this.filter.includes(" ") ? this.filter.split(" ") : [this.filter];
    const availableFeatures = this.features;
    const remainingFeatures = {};

    Object.values(availableFeatures).forEach(feature => {
      if (terms.length === 0 || terms[0] === "") {
        remainingFeatures[feature.uuid] = feature;
      } else {
        // Check if the feature matches the filter terms.
        const matches = terms.map(t => {
          let isInverse = false;
          if (t.startsWith("!")) {
            isInverse = true;
            t = t.substring(1);
          }
          const nameMatch = feature.name.toLowerCase().includes(t.toLowerCase());
          const descriptionMatch = feature.system.description.toLowerCase().includes(t.toLowerCase());
          const variablesMatch = feature.system.variables.length > 0 &&
            Object.values(feature.system.variables).some(v => v.name.toLowerCase().includes(t.toLowerCase()));
          const variableOptionsMatch = Object.values(feature.system.variables).some(v => {
            if (!v.options) return false;
            let options = typeof v.options === "string" ? v.options.split(',') : v.options;
            return options.some(o => o.toLowerCase().includes(t.toLowerCase()));
          });
          const costMatch = feature.cost.toString().toLowerCase().includes(t.toLowerCase());
          const durationMatch = feature.system.modifies === "duration" ?
            feature.system.modifiedDuration.value.toString().toLowerCase().includes(t.toLowerCase()) : false;
          const rangeMatch = feature.system.modifies === "range" ?
            feature.system.modifiedRange.value.toString().toLowerCase().includes(t.toLowerCase()) : false;
          const aoeMatch = feature.system.modifies === "aoe" ?
            feature.system.modifiedAoE.value.toString().toLowerCase().includes(t.toLowerCase()) : false;
          const criteria = [nameMatch, descriptionMatch, variablesMatch, variableOptionsMatch, costMatch, durationMatch, rangeMatch, aoeMatch];
          return isInverse ? !criteria.some(Boolean) : criteria.includes(true);
        });
        if (matches.some(Boolean)) {
          remainingFeatures[feature.uuid] = feature;
        }
      }
    });
    this.remainingFeatures = remainingFeatures;
  }

  /**
   * Parses spell duration and range into human-readable outputs.
   */
  async parseSpell() {
    if (this.duration === 0) {
      this.durationOut = "Instant";
    } else {
      let unit = "seconds";
      if (this.duration >= 6 && this.duration % 6 === 0 && this.duration < 60) {
        this.duration /= 6;
        unit = "turns";
      } else if (this.duration >= 60 && this.duration < 3600) {
        this.duration /= 60;
        unit = "minutes";
      } else if (this.duration >= 3600 && this.duration < 86400) {
        this.duration /= 3600;
        unit = "hours";
      } else if (this.duration >= 86400 && this.duration < 2592000) {
        this.duration /= 86400;
        unit = "days";
      } else if (this.duration >= 2592000 && this.duration < 31536000) {
        this.duration /= 2592000;
        unit = "months";
      } else if (this.duration >= 31536000) {
        this.duration /= 31536000;
        unit = "years";
      }
      this.durationOut = `${this.duration} ${unit}`;
    }
    this.rangeOut = this.range === 0 ? "Touch" : `${this.range}m`;
  }

  /**
   * Adds a spell (gear) to the sheet.
   * @param {object} gear - The gear to add.
   */
  async addSpell(gear) {
    this.items.push(gear);
    if (this.items.length === 1) {
      this.selected = gear.system.features;
      this.name = gear.name;
      this.flavor = gear.system.flavor;
      this.actor = this.actor || gear.actor || game.user.character || (game.canvas.tokens.controlled[0] && game.canvas.tokens.controlled[0].actor);
      this.render();
    } else {
      const gearFeatures = gear.system.features;
      const selectedFeatures = this.selected;
      const newFeatures = {};
      let index = 0;
      // Merge features from new gear and existing selections.
      for (const feature of Object.values(gearFeatures)) {
        newFeatures[`selected-${index}`] = feature;
        index++;
      }
      for (const feature of Object.values(selectedFeatures)) {
        newFeatures[`selected-${index}`] = feature;
        index++;
      }
      this.selected = newFeatures;
      this.render();
    }
  }

  /**
   * Retrieves favorite features for the current user.
   */
  async getFavorites() {
    const favorites = game.user.getFlag('utopia', 'favorites') || {};
    const gearFeatures = favorites["gearFeature"] || [];
    for (const feature of Object.values(this.features)) {
      feature.favorite = gearFeatures.includes(feature._id);
    }
  }

  /**
   * Removes a feature from favorites.
   * @param {object} feature - The feature to remove.
   */
  async removeFavorite(feature) {
    let favorites = game.user.getFlag('utopia', 'favorites') || {};
    if (!favorites["gearFeature"]) favorites["gearFeature"] = [];
    favorites["gearFeature"] = favorites["gearFeature"].filter(f => f !== feature._id);
    await game.user.setFlag('utopia', 'favorites', favorites);
  }

  /**
   * Adds a feature to favorites.
   * @param {object} feature - The feature to add.
   */
  async addFavorite(feature) {
    let favorites = game.user.getFlag('utopia', 'favorites') || {};
    if (!favorites["gearFeature"]) favorites["gearFeature"] = [];
    if (!favorites["gearFeature"].includes(feature._id)) {
      favorites["gearFeature"].push(feature._id);
    }
    await game.user.setFlag('utopia', 'favorites', favorites);
  }

  /**
   * Casts the gear as a temporary item.
   * @param {Event} event - The triggering event.
   * @param {HTMLElement} target - The target element.
   */
  static async _chat(event, target) {
    const system = {}; 
    
    for (const feature of Object.values(this.selected)) {
      const final = await this.processStacks(feature, this.featureSettings[feature.uuid].stacks.value);
      system[feature.name] = final;
    }

    const gear = await Item.create({
      name: this.name,
      type: "gear",
      system: system
    }, { temporary: true });
    
    await gear.use();
  }

  /**
   * Processes feature stacks and calculates simulation values.
   * @param {object} feature - The feature being processed.
   * @param {number} [stackCount=1] - The number of stacks.
   * @returns {object} Simulation results.
   */
  async processStacks(feature, stackCount = 1) {
    const attributes = feature.system.attributes;
    const costs = feature.system.costs[this._getRelevantClassificationKey()];
    let material, refinement, power, cost = 0;
    const componentsPerStack = costs.componentsPerStack ?? true;
    
    if (componentsPerStack) {
      material = (costs.material ?? 0) * stackCount;
      refinement = (costs.refinement ?? 0) * stackCount;
      power = (costs.power ?? 0) * stackCount;
    } else {
      material = costs.material ?? 0;
      refinement = costs.refinement ?? 0;
      power = costs.power ?? 0;
    }

    const costFormula = await new Roll(String(costs.costFormula) ?? "0", { ...attributes, ...costs }).evaluate({ async: true });
    cost = costFormula.total * stackCount;
  
    const simulation = {
      stacks: stackCount,
      material,
      refinement,
      power,
      cost,
    };

    for (const [key, value] of Object.entries(attributes)) {
      if (value && value.length > 0) {
        if (isNumeric(value)) {
          simulation[key] = parseFloat(value) * stackCount;
        } else if (typeof value === "string" && value !== "\u0000" && !isNumeric(value)) {
          try {
            const extraRoll = await new Roll(value, { ...attributes, ...costs }).alter(stackCount, 0).evaluate({ async: true });
            simulation[key] = extraRoll.formula;
          } catch (error) {
            this._error(`Error evaluating roll for attribute ${key}:`, error);
            const extraRoll = await new Roll(value, { ...attributes, ...costs }).evaluate({ async: true });
            simulation[key] = extraRoll.total;
          }
        } else if (typeof value === "number" && !isNaN(value)) {
          simulation[key] = value * stackCount;
        }
      }
    }
  
    return simulation;
  }
}
