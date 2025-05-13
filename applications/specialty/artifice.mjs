import { gatherItems } from '../../system/helpers/gatherItems.mjs';
import { isNumeric } from '../../system/helpers/isNumeric.mjs';
import { getTextContrast } from '../../system/helpers/textContrast.mjs';
import { parseFeature } from '../../system/init/features.mjs';

const { api } = foundry.applications;

/**
 * Class representing the Artifice Sheet.
 * Extends the Foundry ApplicationV2 with Handlebars mixin.
 */
export class ArtificeSheet extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  // Class properties
  actor = null;

  selected = {};
  features = {};
  type = "fastWeapon";

  artifactFeatures = {};
  artifact = {
    activations: {},
    passive: {},
  }

  constructor(options = {}) {
    super(options);
    if (options.actor) {
      this.actor = options.actor;
    }
  }

  // Default options for the application.
  static DEFAULT_OPTIONS = {
    classes: ["utopia", "artifice"],
    position: {
      width: 870,
      height: 800,
    },
    actions: {
      delete: this._delete,
      craft: this._craft,
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

  getStackLimits() {
    return {
      crude: 10,
      common: 20,
      extraordinary: 30,
      rare: 40,
      legendary: 50,
      mythic: 60,
    }
  }

  getDefaults() {
    switch (this.type) {
      case "fastWeapon":
        return {
          hands: 1,
          actions: 1,
          slots: 3,
        }
      case "moderateWeapon":
        return {
          hands: 1,
          actions: 2,
          slots: 3,
        }
      case "slowWeapon":
        return {
          hands: 1,
          actions: 3,
          slots: 3,
        }
      case "shields":
        return {
          hands: 1,
          actions: 1,
          slots: 3,
        }
      case "headArmor":
        return {
          hands: 0,
          actions: 0,
          slots: 3,
        }
      case "chestArmor":
        return {
          hands: 0,
          actions: 0,
          slots: 3,
        }
      case "handsArmor":
        return {
          hands: 0,
          actions: 0,
          slots: 3,
        }
      case "feetArmor":
        return {
          hands: 0,
          actions: 0,
          slots: 3,
        }
      case "consumable":
        return {
          hands: 1,
          actions: 2,
          slots: 3,
        }
      case "equippableArtifact":
        return {
          hands: 1,
          actions: 0,
          slots: 1,
        }
      case "handheldArtifact":
        return {
          hands: 1,
          actions: 0,
          slots: 1,
        }
      case "ammunitionArtifact":
        return {
          hands: 1,
          actions: 0,
          slots: 1,
        }
    }
  }

  getRollData() {
    const rollData = {};
    if (Object.keys(this.selected).length > 0) {
      Object.values(this.selected).forEach((feature) => {
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

  /**
   * Prepares the context for rendering the sheet.
   * @param {object} options - Options passed to the sheet.
   * @returns {object} The prepared context.
   */
  async _prepareContext(options) {
    this.features = CONFIG.UTOPIA.FEATURES[this.type] || CONFIG.UTOPIA.FEATURES["fastWeapon"];
    this.features = Object.entries(this.features || {}).reduce((acc, [key, value]) => {
      acc[key] = {
        ...value,
        stacks: 1,
      };
      return acc;
    }, {});

    if (["equippableArtifact", "handheldArtifact", "ammunitionArtifact"].includes(this.type)) {
      const active = CONFIG.UTOPIA.FEATURES["activeArtifact"];
      this.artifactFeatures.active = Object.entries(active).reduce((acc, [key, value]) => {
        acc[key] = {
          ...value,
          stacks: 1,
        };
        return acc;
      }, {});
      const passive = CONFIG.UTOPIA.FEATURES["passiveArtifact"];
      this.artifactFeatures.passive = Object.entries(passive).reduce((acc, [key, value]) => {
        acc[key] = {
          ...value,
          stacks: 1,
        };
        return acc;
      }, {});
      this.artifactFeatures.activations = CONFIG.UTOPIA.FEATURES["artifactActivations"];
    };

    const defaults = this.getDefaults();

    var slots = defaults.slots || 3;
    var actions = defaults.actions || 1;
    var hands = defaults.hands || 1;

    let attributes = {};
    if (Object.keys(this.selected).length > 0) {
      this.selected = Object.entries(this.selected).reduce((acc, [key, value]) => {
        const feature = parseFeature(value);
        const data = this.handleFeature(feature);
        slots = data.slots || slots;
        actions = data.actions || actions;
        hands = data.hands || hands;

        const handledFeature = data.feature;
        const keys = data.keys || [];
        
        if (handledFeature) {
          acc[key] = {
            ...handledFeature,
            keys,
            stacks: handledFeature.stacks || 1,
          };
        }
        return acc;
      }, {});
    }

    for (const [id, activation] of Object.entries(this.artifact.activations)) {
      const activationFeature = activation.activation;
      const activationActives = activation.features || [];
      
      for (const [key, feature] of Object.entries(activation.features)) {
        const featureData = parseFeature(feature);
        const data = this.handleFeature(feature);
        slots = data.slots || slots;
        actions = data.actions || actions;
        hands = data.hands || hands;

        const handledFeature = data.feature;
        const keys = data.keys || [];
        
        if (handledFeature) {
          this.artifact.activations[id].features[key] = {
            ...handledFeature,
            keys,
            stacks: handledFeature.stacks || 1,
          };
        }
      }
    }

    for (const [id, feature] of Object.entries(this.artifact.passive)) {
      const featureData = parseFeature(feature);
      const data = this.handleFeature(feature);
        slots = data.slots || slots;
        actions = data.actions || actions;
        hands = data.hands || hands;

        const handledFeature = data.feature;
        const keys = data.keys || [];

      if (handledFeature) {
        this.artifact.passive[id] = {
          ...handledFeature,
          keys,
          stacks: handledFeature.stacks || 1,
        };
      }
    }

    let totalRP = 0;
    let variableRPFeatures = [];

    if (["equippableArtifact", "handheldArtifact", "ammunitionArtifact"].includes(this.type)) {
      totalRP = Object.values(this.artifact.activations).reduce((acc, activation) => {
        const activationMult = activation.activation.activation.costMultiplier || 1;
        const activationRP = Object.values(activation.features).reduce((acc, feature) => {
          const featureRP = typeof feature.output.cost.RP !== "string" ? feature.output.cost.RP : 0;
          return acc + featureRP;
        }, 0);
        return acc + (activationRP * activationMult);
      }, 0);

      totalRP += Object.values(this.artifact.passive).reduce((acc, feature) => {
        const featureRP = typeof feature.output.cost.RP !== "string" ? feature.output.cost.RP : 0;
        return acc + featureRP;
      }, 0);

      // If any of the selected features have a string value for RP, we need to parse it
      variableRPFeatures = Object.values(this.selected).filter((feature) => typeof feature.output.cost.RP === "string" && feature.output.cost.RP.includes("@"));
    }
    else {
      totalRP = Object.values(this.selected)
      .map((feature) => typeof feature.output.cost.RP !== "string" ? feature.output.cost.RP : 0)
      .reduce((acc, value) => acc + value, 0);
      
      // If any of the selected features have a string value for RP, we need to parse it
      variableRPFeatures = Object.values(this.selected).filter((feature) => typeof feature.output.cost.RP === "string" && feature.output.cost.RP.includes("@"));
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
      componentCosts = Object.values(this.selected).reduce((acc, feature) => {
        ["material", "refinement", "power"].forEach((key) => {
          if (feature.output.cost[key]) {
            acc[key] = acc[key] || 0;
            acc[key] += feature.output.cost[key];
          }
        });
        return acc;
      }, {});
    }

    const artifice = {
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

    const context = {
      features: this.features,
      artifactFeatures: this.artifactFeatures,
      selected: this.selected,
      artifice,
      rollData,
      artifact: this.artifact,
      types: ["fastWeapon", "moderateWeapon", "slowWeapon", "shields", "headArmor", "chestArmor", "handsArmor", "feetArmor", "consumable", "equippableArtifact", "handheldArtifact", "ammunitionArtifact"],
      type: this.type,
      isArtifact: ["equippableArtifact", "handheldArtifact", "ammunitionArtifact"].includes(this.type), 
    }

    console.log("ArtificeSheet | _prepareContext | context", context);

    return context;
  }

  _onRender(context, options) {
    this.element.querySelector(".window-content").style.position = "relative";
    if (options.isFirstRender) {
      const div = document.createElement("div");
      div.classList.add("artifice-craft-div");
      const button = document.createElement("button");
      button.dataset.action = "craft";
      button.classList.add("artifice-craft-button");
      button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="height: 512px; width: 512px;"><defs><filter id="shadow-3" height="300%" width="300%" x="-100%" y="-100%"><feFlood flood-color="rgba(255, 0, 0, 1)" result="flood"></feFlood><feComposite in="flood" in2="SourceGraphic" operator="atop" result="composite"></feComposite><feGaussianBlur in="composite" stdDeviation="15" result="blur"></feGaussianBlur><feOffset dx="5" dy="5" result="offset"></feOffset><feComposite in="SourceGraphic" in2="offset" operator="over"></feComposite></filter></defs><g class="" transform="translate(0,1)" style=""><g><path d="M413.375 69.906L336.937 191.47L328.687 158.78L298.469 247.75L361.124 218.375L361.344 247.813L488.374 196.875L417.561 194.905L465.343 126.219L391.873 165.469L413.373 69.905Z" class="" fill="#0097f8" fill-opacity="1"></path><path d="M210.22 102.094L178.22 116.5L195.094 172.156L17.281 252.186L29.845 280.062L207.656 200L238.062 249.47L287.375 227.28L266.031 156.937L210.221 102.094Z" class="selected" fill="#000000" fill-opacity="1" filter="url(#shadow-3)" stroke="#fff8f8" stroke-opacity="1" stroke-width="8"></path><path d="M197.593 266.78L197.593 287.125L108.687 287.125C124.681 325.932 159.912 352.555 197.593 361.405L197.593 394.375L256.155 394.375C244.037 424.903 222.65 450.059 197.685 471.969L172.22 471.969L172.22 490.655L456.56 490.655L456.56 471.97L429.154 471.97C400.42 450.075 379.099 424.952 367.529 394.375L431.187 394.375L431.187 365.187C450.935 358.192 470.687 345.677 490.437 328.5C470.625 310.977 451.207 301.25 431.187 296.562L431.187 266.782L197.594 266.782Z" class="" fill="#000000" fill-opacity="1"></path></g></g></svg>`;
      div.append(button);
      this.element.append(div);
    }

    this.element.querySelector("select[name='type']").addEventListener("change", (event) => {
      this.type = event.target.value;
      this.selected = {};
      this.render(true);
    });

    this.element.querySelectorAll("tr[data-drag]").forEach((row) => {
      row.addEventListener("dragstart", (event) => {
        event.stopPropagation();
        event.dataTransfer.setData("text/plain", JSON.stringify(row.dataset.id));
      });
    });

    this.element.querySelector("[data-drop]").addEventListener("drop", (event) => {
      event.preventDefault();
      const data = event.dataTransfer.getData("text/plain");
      const id = JSON.parse(data);

      if (["equippableArtifact", "handheldArtifact", "ammunitionArtifact"].includes(this.type)) {
        const isActive = this.artifactFeatures.active[id] || false;
        const isPassive = this.artifactFeatures.passive[id] || false;
        const isActivation = this.artifactFeatures.activations[id] || false;

        const feature = this.artifactFeatures.active[id] || this.artifactFeatures.passive[id] || this.artifactFeatures.activations[id];
        if (feature) {
          if (isActivation) {
            this.artifact.activations[id] = {
              activation: feature,
              features: {},
            };
          }

          if (isActive) {
            const dropzone = event.target.closest("[data-drop]").dataset.dropzone;
            if (Object.keys(this.artifact.activations).includes(dropzone)) {
              const activation = this.artifact.activations[dropzone];
              if (activation) {
                if (feature) {
                  const newID = foundry.utils.randomID(16);
                  activation.features[newID] = feature;
                }
              }
            }
          }

          if (isPassive) {
            const newID = foundry.utils.randomID(16);
            this.artifact.passive[newID] = feature;
          }

          return this.render(true);
        }
      }

      const feature = structuredClone(this.features[id]);
      if (feature) {
        const featuresToAdd = [feature];

        for (const requirements of Object.values(this.selected)) {
          if (requirements.incompatible && requirements.incompatible.includes(id)) {
            ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.IncompatibleFeature"));
            return;
          }
        }

        if (feature.requires) {
          for (const requirement of feature.requires) {
            const requiredFeature = this.features[requirement];
            let alreadyPresent = false;
            for (const feature of Object.values(this.selected)) {
              if (feature.name === requiredFeature.name) {
                // Feature is already present, continue
                alreadyPresent = true;
              }
            }
            if (!alreadyPresent) {
              // Feature is not present, add it to the list of features to add
              featuresToAdd.push(requiredFeature);
            }
          }
        }

        for (const feature of featuresToAdd) {
          const id = foundry.utils.randomID(16);
          this.selected[id] = feature;
        }

        return this.render(true);
      }
    });

    this.element.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", (event) => {
        const id = input.dataset.id;

        if (["equippableArtifact", "handheldArtifact", "ammunitionArtifact"].includes(this.type)) {
          for (const [activationId, activation] of Object.entries(this.artifact.activations)) {
            if (activation.features[id]) {
              const feature = activation.features[id];
              if (feature) {
                const value = event.target.value;
                this.artifact.activations[activationId].features[id].stacks = isNumeric(value) ? parseInt(value) : 1;
          
                return this.render(true);
              }
            }
          }

          for (const [id, feature] of Object.entries(this.artifact.passive)) {
            if (feature) {
              const value = event.target.value;
              this.artifact.passive[id].stacks = isNumeric(value) ? parseInt(value) : 1;
              
              return this.render(true);
            }
          }
        }

        const feature = this.selected[id];
        if (feature) {
          const value = event.target.value;
          this.selected[id].stacks = isNumeric(value) ? parseInt(value) : 1;
          this.render(true);
        }
      });
    });
  }

  static async _delete(event, target) {
    event.preventDefault();
    const id = target.dataset.id;
    const feature = this.selected[id];
    if (feature) {
      for (const requirements of Object.values(this.selected)) {
        // Check if any selected features require the feature being deleted
        if (requirements.requires && requirements.requires.includes(feature.key)) {
          ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.RequiredFeature"));
          return;
        }
      }

      delete this.selected[id];
      this.render(true);
    }
  }

  static async _craft(event, target) {
    if (!this.actor && !game.user.isGM && !game.user.character) {
      console.warn("No actor found for attack operation.");
      return;
    }

    if (game.settings.get("utopia", "targetRequired") && game.user.targets.size === 0 && !game.user.isGM) {
      ui.notifications.warn(game.i18n.localize("UTOPIA.Activity.Attack.NoTargets"));
      return;
    }

    var flags = {};

    // We need to iterate through all of our features, 
    // and go through the process of assigning values to things that don't have them
    for (const [id, feature] of [...Object.entries(this.selected), ...Object.entries(this.artifact.passive)]) {
      if (feature.flag) {
        flags = {...flags, ...feature.flag };
      }

      if (feature.options) {
        if (Array.isArray(feature.options)) {
          for (const option of feature.options) {
            if (feature.handler === "distributed" || feature.handler === "Xd4") {
              const optionKey = Object.values(option)[0].key;
              const options = Object.entries(option).map(([key, option]) => {
                return {
                  key: option.key,
                  label: game.i18n.localize(option.name),
                  value: option.value,
                };
              });

              const container = document.createElement("div");
              const amount = document.createElement("span");
              amount.innerText = `${game.i18n.localize("UTOPIA.ArtificeSheet.DistributedAmount")}: ${feature.stacks}`;
              container.append(amount);
              const inputContainer = document.createElement("div");
              inputContainer.style.display = "flex";
              inputContainer.style.flexDirection = "row";
              inputContainer.style.gap = "5px";
              inputContainer.style.marginBottom = "10px";
              inputContainer.style.marginTop = "10px";
              inputContainer.style.alignItems = "center";
              for (const option of options) {
                const label = document.createElement("label");
                label.innerHTML = `<input type="number" name="${option.key}" data-key="${option.value}"> ${game.i18n.localize(option.label)}`;
                label.style.width = "60px";
                inputContainer.append(label);
              }
              container.append(inputContainer);

              let response;
              try {
                response = await foundry.applications.api.DialogV2.prompt({
                  window: { title: `Distribute stacks for ${game.i18n.localize(feature.name)}` },
                  content: container.outerHTML,
                  ok: {
                    label: "Submit",
                    callback: (event, button, dialog) => dialog,
                  }
                });
              } catch (error) {
                console.error("Error in dialog:", error);
                return;
              }

              if (response) {
                const featureKey = feature.keys.find((k) => k.key === feature.parentKey ? `${feature.parentKey}.${optionKey}` : optionKey);
                let keys = this.selected[id].keys.filter((k) => k.key !== featureKey.key);
                if (feature.handler === "Xd4")
                  keys = [];
                if (featureKey) {
                  response.querySelectorAll("input").forEach((input) => {
                    if (parseInt(input.value) > 0) {
                      if (feature.handler === "distributed") {
                        keys.push({
                          display: `${input.name.capitalize()} ${feature.key.capitalize()}`,
                          key: `${feature.key}.${input.name}`,
                          value: parseInt(input.value) || 0,
                          specialLabel: featureKey.specialLabel || false,
                        })
                      }
                      else {
                        keys.push({
                          parts: [{
                            display: `${feature.parentKey.capitalize()} ${feature.key.capitalize()}`,
                            key: `${feature.parentKey}.${feature.key}`, // Formula key
                            value: `${parseInt(input.value)}d4` || 0,
                          }, {
                            display: `${input.name.capitalize()}`,
                            key: `${feature.parentKey}.${optionKey}`, // Type key
                            value: input.dataset.key || 0,
                          }]
                        })
                      }
                    }
                  })
                  this.selected[id].keys = keys;
                }
              }
            }
            else {
              const optionKey = Object.values(option)[0].key;
              const options = Object.entries(option).map(([key, value]) => {
                return {
                  label: game.i18n.localize(value.name),
                  value: value.value,
                };
              });

              const select = foundry.applications.fields.createSelectInput({
                name: "select",
                options,
                type: "single",
                autofocus: true,
                required: true,
              })

              let response;
              try {
                response = await foundry.applications.api.DialogV2.prompt({
                  window: { title: `Select a value for ${game.i18n.localize(feature.name)}` },
                  content: select.outerHTML,
                  ok: {
                    label: "Submit",
                    callback: (event, button, dialog) => button.form.elements.select.value,
                  }
                });
              } catch (error) {
                console.error("Error in dialog:", error);
                return;
              }
              
              if (response) {
                const selectedOption = options.find((option) => option.value === response);
                if (selectedOption) {
                  this.selected[id].output.selectedOption = response;
                  let key = this.selected[id].parentKey ? `${this.selected[id].parentKey}.${optionKey}` : optionKey;
                  if (!key) {
                    key = this.selected[id].key;
                  }
                  this.selected[id].keys.find((k) => k.key === key).value = selectedOption.value;
                }
              }
            }
          }
        }
        else if (Object.keys(feature.options).length > 1) {
          if (feature.handler === "distributed" || feature.handler === "Xd4") {
            const optionKey = Object.values(feature.options)[0].key;
            const options = Object.entries(feature.options).map(([key, option]) => {
              return {
                key: option.key,
                label: game.i18n.localize(option.name),
                value: option.value,
              };
            });

            const container = document.createElement("div");
            const amount = document.createElement("span");
            amount.innerText = `${game.i18n.localize("UTOPIA.ArtificeSheet.DistributedAmount")}: ${feature.stacks}`;
            container.append(amount);
            const inputContainer = document.createElement("div");
            inputContainer.style.display = "flex";
            inputContainer.style.flexDirection = "row";
            inputContainer.style.gap = "5px";
            inputContainer.style.marginBottom = "10px";
            inputContainer.style.marginTop = "10px";
            inputContainer.style.alignItems = "center";
            for (const option of options) {
              const label = document.createElement("label");
              label.innerHTML = `<input type="number" name="${option.key}" data-key="${option.value}"> ${game.i18n.localize(option.label)}`;
              label.style.width = "60px";
              inputContainer.append(label);
            }
            container.append(inputContainer);

            let response;
            try {
              response = await foundry.applications.api.DialogV2.prompt({
                window: { title: `Distribute stacks for ${game.i18n.localize(feature.name)}` },
                content: container.outerHTML,
                ok: {
                  label: "Submit",
                  callback: (event, button, dialog) => dialog,
                }
              });
            } catch (error) {
              console.error("Error in dialog:", error);
              return;
            }

            if (response) {
              const featureKey = feature.keys.find((k) => k.key === feature.parentKey ? `${feature.parentKey}.${optionKey}` : optionKey);
              let keys = this.selected[id].keys.filter((k) => k.key !== featureKey.key);
              if (feature.handler === "Xd4")
                keys = [];
              if (featureKey) {
                response.querySelectorAll("input").forEach((input) => {
                  if (parseInt(input.value) > 0) {
                    if (feature.handler === "distributed") {
                      keys.push({
                        display: `${input.name.capitalize()} ${feature.key.capitalize()}`,
                        key: `${feature.key}.${input.name}`,
                        value: parseInt(input.value) || 0,
                        specialLabel: featureKey.specialLabel || false,
                      })
                    }
                    else {
                      keys.push({
                        parts: [{
                          display: `${feature.parentKey.capitalize()} ${feature.key.capitalize()}`,
                          key: `${feature.parentKey}.${feature.key}`, // Formula key
                          value: `${parseInt(input.value)}d4` || 0,
                        }, {
                          display: `${input.name.capitalize()}`,
                          key: `${feature.parentKey}.${optionKey}`, // Type key
                          value: input.dataset.key || 0,
                        }]
                      })
                    }
                  }
                })
                this.selected[id].keys = keys;
              }
            }
          }
          else {
            const optionKey = Object.values(feature.options)[0].key;
            const options = Object.entries(feature.options).map(([key, value]) => {
              return {
                label: game.i18n.localize(value.name),
                value: value.value,
              };
            });

            const select = foundry.applications.fields.createSelectInput({
              name: "select",
              options,
              type: "single",
              autofocus: true,
              required: true,
            })

            let response;
            try {
              response = await foundry.applications.api.DialogV2.prompt({
                window: { title: `Select a value for ${game.i18n.localize(feature.name)}` },
                content: select.outerHTML,
                ok: {
                  label: "Submit",
                  callback: (event, button, dialog) => button.form.elements.select.value,
                }
              });
            } catch (error) {
              console.error("Error in dialog:", error);
              return;
            }
            
            if (response) {
              const selectedOption = options.find((option) => option.value === response);
              if (selectedOption) {
                this.selected[id].output.selectedOption = response;
                let key = this.selected[id].parentKey ? `${this.selected[id].parentKey}.${optionKey}` : optionKey;
                if (!key) {
                  key = this.selected[id].key;
                }
                this.selected[id].keys.find((k) => k.key === key).value = selectedOption.value;
              }
            }
          }
        }

        if (feature.crafting) {
          const type = feature.crafting.type;
          const limit = feature.stacks || 1;
          const key = feature.crafting.key

          const items = (await gatherItems({ type, gatherFolders: false, gatherFromActor: true })).filter(i => i.system[key] && i.system[key] <= limit);
          if (items.length > 0) {
            const options = items.map((item) => {
              return {
                label: item.name,
                value: item.uuid,
              };
            })

            const select = foundry.applications.fields.createSelectInput({
              name: "select",
              options,
              type: "single",
              autofocus: true,
              required: true,
            })

            let response;
            try {
              response = await foundry.applications.api.DialogV2.prompt({
                window: { title: `Select a ${type.capitalize()} for ${game.i18n.localize(feature.name)}` },
                content: select.outerHTML,
                ok: {
                  label: "Submit",
                  callback: (event, button, dialog) => button.form.elements.select.value,
                }
              });
            } catch (error) {
              console.error("Error in dialog:", error);
              return;
            }

            if (response) {
              feature.crafting.item = response;
            }
          }
          else {
            ui.notifications.error(game.i18n.localize("UTOPIA.ArtificeSheet.NoAvailableCraftings"));
            return;
          }          
        }
      }
    }

    for (const [id, feature] of Object.entries(this.selected)) {
      if (feature.conditions) {
        let fulfilled = false;

        for (const condition of feature.conditions) {
          const outputKey = condition.outputKey;
          const key = condition.key;
          const value = condition.value;
          const comparison = condition.comparison || "==";
          const output = condition.output || false;

          for (const [flag, flagValue] of Object.entries(flags)) {
            if (flag === key) {
              let conditionMet = false;
              switch (comparison) {
                case "==":
                  conditionMet = flagValue == value;
                  break;
                case "!=":
                  conditionMet = flagValue != value;
                  break;
                case ">=":
                  conditionMet = flagValue >= value;
                  break;
                case "<=":
                  conditionMet = flagValue <= value;
                  break;
                case ">":
                  conditionMet = flagValue > value;
                  break;
                case "<":
                  conditionMet = flagValue < value;
                  break;
              }
              if (conditionMet) {
                this.selected[id].keys.find(k => k.key === (feature.parentKey ? `${feature.parentKey}.${outputKey}` : outputKey)).value = output;
                fulfilled = true;
              }
            }
          }
        }

        if (!fulfilled) {
          const defaultCondition = feature.conditions.find((condition) => condition.default);
          this.selected[id].keys.find(k => k.key === (feature.parentKey ? `${feature.parentKey}.${defaultCondition.outputKey}` : defaultCondition.outputKey)).value = defaultCondition.output;
          fulfilled = true;
        }
      }
    }

    // Create the item and put it in the game's world
    if (game.user.isGM) {
      const item = await Item.create({
        name: "New Gear",
        type: "gear",
        system: {
          crafter: game.user.character || game.actors[0],
          type: this.type,
          features: ["equippableArtifact", "handheldArtifact", "ammunitionArtifact"].includes(this.type) ? this.artifact.passive : this.selected,
          activations: this.artifact.activations,
        }
      });
    }

    const actor = game.user.character || this.actor;
  }

  handleFeature(feature) {
    const keys = [];

    const output = feature.output || feature;
    let handledOptions = false;
    if (feature.value && output.value && typeof output.value !== "boolean") {
      keys.push({
        display: output.display,
        key: output.key,
        value: output.value === "distributed" ? "Distributed" : output.value,
        specialLabel: output.specialLabel || false,
      });
      if (output.value === "distributed") {
        handledOptions = true;
      }
    }
    else if (!feature.value && !output.value && output.options) {
      keys.push({
        display: output.display,            
        key: output.key,
        value: feature.handler === "distributed" ? "Distributed" : Object.keys(output.options).length > 1 ? "Variable" : Object.values(output.options)[0].value,
        specialLabel: output.specialLabel || false,
      })
      handledOptions = true;
    }
    
    if (Object.keys(output.options).length > 0 && !handledOptions) {
      if (Object.keys(output.options).length === 1) {
        const option = Object.values(output.options)[0];
        keys.push({
          display: option.display,
          key: output.parentKey ? `${option.parentKey}.${option.key}` : option.key,
          value: option.value,
          specialLabel: option.specialLabel || false,
        });
      }
      else {
        const option = Object.values(output.options)[0];
        keys.push({
          display: option.display,
          key: option.parentKey ? `${option.parentKey}.${option.key}` : option.key,
          value: feature.handler === "distributed" ? "Distributed" : "Variable",
          specialLabel: option.specialLabel || false,
        });
      }
    }

    if (feature.conditions) {
      keys.push({
        display: output.display,
        key: feature.parentKey ? `${feature.parentKey}.${feature.conditions[0].outputKey}` : feature.conditions[0].outputKey,
        value: feature.conditions[0].output,
        specialLabel: output.specialLabel || false,
      })
    }
    
    if (keys.length === 0) {
      keys.push({
        display: output.display,
        key: output.key,
        value: "",
        specialLabel: output.specialLabel || false,
      })
    }

    let { slots, actions, hands } = this.getDefaults();

    if (feature.output.key === "slots") 
      slots = feature.output.value;
    if (feature.output.key === "actions")
      actions = feature.output.value;
    if (feature.output.key === "hands")
      hands = feature.output.value;

    return {feature, keys, slots, actions, hands};
  }
}
