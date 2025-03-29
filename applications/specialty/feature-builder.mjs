import { gatherItems } from "../../system/helpers/gatherItems.mjs";
import { isNumeric } from "../../system/helpers/isNumeric.mjs";

const { api, sheets } = foundry.applications;

export class FeatureBuilder extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.advanced = false;
    this.editingFeature = undefined;
    this.attributes = {};
    this.name = undefined;
    this.shared = {
      incompatibleWith: [],
      requires: []
    };
    this.stats = "";
  }

  static DEFAULT_OPTIONS = {
    classes: ["utopia", "feature-builder"],
    position: {
      width: 1300,
      height: 800,
    },
    actions: {
      toggleAdvanced: () => this.advanced = !this.advanced,
      toggleClassification: this._toggleClassification,
      shareAttribute: this._shareAttribute,
      removeAttribute: this._removeAttribute,
      removeSharedAttribute: this._unshareAttribute,
      saveFeature: this._saveFeature,
    },
    window: {
      title: "UTOPIA.SheetLabels.featureBuilder",
    },
  };

  static PARTS = {
    content: {
      template: "systems/utopia/templates/specialty/feature-builder/builder.hbs",
      scrollable: [".options-display", ".classification-container"],
    },
  };

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ["content"];
  }

  async _prepareContext(options) {
    const existing = await gatherItems({ type: "gearFeature", gatherFromActor: false, gatherFolders: true });

    const featureOptions = {};
    
    if (this.attributes && Object.keys(this.attributes).length > 0) {
      for (const c in this.attributes) {
        let fields = [];
        switch (c) {
          case "fastWeapon":
          case "moderateWeapon":
          case "slowWeapon":
            fields = new CONFIG.Item.dataModels.weaponFeature().schema.fields;
            break;
          case "headArmor":
          case "chestArmor":
          case "waistArmor":
          case "handsArmor":
          case "feetArmor":
            fields = new CONFIG.Item.dataModels.armorFeature().schema.fields;
            break;
          case "equippableArtifact": 
          case "handheldArtifact":
          case "ammunitionArtifact":
            fields = new CONFIG.Item.dataModels.artifactFeature().schema.fields;
            break;
          case "consumable":
            fields = new CONFIG.Item.dataModels.consumableFeature().schema.fields;
            break;
          case "shields": 
            fields = new CONFIG.Item.dataModels.shieldFeature().schema.fields;
            break;
          default:
            break;
        }

        for (const fieldName in fields) {
          const fieldObj = fields[fieldName];
          const fieldType = fieldObj.constructor.name;
        
          // If it's a SchemaField, process all subfields recursively.
          if (fieldType === "SchemaField") {
            processSchemaField(fieldName, fieldObj, c, featureOptions);
          }
          // Otherwise, do the original logic.
          else if (["StringField", "NumberField", "BooleanField"].includes(fieldType)) {
            if (!featureOptions[fieldName]) {
              featureOptions[fieldName] = {
                field: fieldObj,
                type: fieldType,
                classifications: [c],
              };
              if (
                fieldType === "StringField" &&
                fieldObj.choices &&
                fieldObj.choices.length > 0
              ) {
                featureOptions[fieldName].choices = fieldObj.choices;
              }
            } else {
              featureOptions[fieldName].classifications.push(c);
            }
          }
        }
      }
    }

    Object.keys(this.attributes).forEach(c => {
      const priorityOrder = ["maxStacks", "material", "refinement", "power", "costFormula", "componentsPerStack"];
      const sortedKeys = Object.keys(this.attributes[c]).sort((a, b) => {
      if (priorityOrder.includes(a) && priorityOrder.includes(b)) {
        return priorityOrder.indexOf(a) - priorityOrder.indexOf(b);
      } else if (priorityOrder.includes(a)) {
        return -1;
      } else if (priorityOrder.includes(b)) {
        return 1;
      } else {
        return a.localeCompare(b);
      }
      });

      const sortedAttributes = {};
      sortedKeys.forEach(key => {
      sortedAttributes[key] = this.attributes[c][key];
      });

      this.attributes[c] = sortedAttributes;
    });

    const simulation = await this.simulateData();

    const context = {
      existing: existing,
      advanced: this.advanced,
      editable: game.user.isGM,
      attributes: this.attributes,
      shared: this.shared,
      featureOptions: featureOptions,
      simulation: simulation,
      name: this.name,
    }

    console.log(context);

    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);

    for (const attribute in this.shared) {
      for (const classification in this.attributes) {
        if (Object.keys(this.attributes[classification]).includes(attribute)) {
          delete this.attributes[classification][attribute];
        }
      }
    }
    
    // Process editable text inputs and other text-based fields
    const editableElements = this.element.querySelectorAll("[data-editable]");
    editableElements.forEach(element => {
      element.addEventListener("blur", (event) => {
        const targetElement = event.currentTarget;
        // Use 'value' if available (e.g. for input elements) otherwise use innerText.
        const inputValue = targetElement.value !== undefined ? targetElement.value.trim() : targetElement.innerText.trim();
        const dataGroup = targetElement.dataset.type;     // "shared" or a classification like "fastWeapon", etc.
        const attributeKey = targetElement.dataset.attribute;

        // Save value in either the shared or classification-specific attributes.
        if (dataGroup === "shared") {
          this.shared[attributeKey] = inputValue;
        } else {
          if (!this.attributes[dataGroup]) {
            this.attributes[dataGroup] = {};
          }
          this.attributes[dataGroup][attributeKey] = inputValue;
        }

        // Re-render to update the interface.
        this.render(true);
      });
    });

    // Process checkboxes (non-text inputs)
    const checkboxElements = this.element.querySelectorAll("input[type=checkbox]");
    checkboxElements.forEach(checkbox => {
      checkbox.addEventListener("change", (event) => {
        const targetCheckbox = event.currentTarget;
        // For checkboxes, use the checked property.
        const inputValue = targetCheckbox.checked;
        const dataGroup = targetCheckbox.dataset.type;
        const attributeKey = targetCheckbox.dataset.attribute;

        if (dataGroup === "shared") {
          this.shared[attributeKey] = inputValue;
        } else {
          if (!this.attributes[dataGroup]) {
            this.attributes[dataGroup] = {};
          }
          this.attributes[dataGroup][attributeKey] = inputValue;
        }

        this.render(true);
      });
    });

    const editableContainers = this.element.querySelectorAll(".attribute-input-group");
    editableContainers.forEach(container => {
      container.addEventListener("mousedown", (event) => {
        event.stopPropagation();
        if (event.ctrlKey) {
          const dataset = event.currentTarget.dataset;
          if (dataset.type === "classification" || dataset.locked === "true" || !dataset.type || dataset.type.length === 0) 
            return;
          if (dataset.type === "shared")  {
            const attribute = dataset.attribute;
    
            Object.keys(this.attributes).forEach(c => {
              this.attributes[c][attribute] = this.shared[attribute];
            });
        
            delete this.shared[attribute]; 
        
            this.render(true);
          } else {
            const attribute = dataset.attribute;
            const classification = dataset.type;
            
            this.shared[attribute] = this.attributes[classification][attribute];
            Object.keys(this.attributes).forEach(c => {
              delete this.attributes[c][attribute];
            });
            
            this.render(true);
          }
        }
        else if (event.button === 2) {
          const dataset = event.currentTarget.dataset;
          if (dataset.type === "classification" || dataset.locked === "true" || !dataset.type || dataset.type.length === 0) 
            return;
          if (["maxStacks", "material", "refinement", "power", "costFormula", "componentsPerStack"].includes(dataset.attribute)) 
            return;

          if (dataset.type === "shared")  {
            const attribute = dataset.attribute;
            delete this.shared[attribute]; 
            this.render(true);
          } else {
            const attribute = dataset.attribute;
            const classification = dataset.type;   
            delete this.attributes[classification][attribute]; 
            this.render(true);
          }
        }
      });
    });

    const stringTags = this.element.querySelectorAll("string-tags[data-editable]");
    stringTags.forEach(stringTag => {
      var observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList") {
            const tags = stringTag.querySelectorAll(".tag");
            // now "this" refers to the class instance
            const tagsArray = Array.from(tags).map(tag => tag.attributes["data-key"].value);
            const type = stringTag.dataset.type;
            const attribute = stringTag.dataset.attribute;

            if (type === "shared") {
              if (!this.shared[attribute])
                this.shared[attribute] = [];
              this.shared[attribute] = tagsArray;
            }
            else {
              if (!this.attributes[type])
                this.attributes[type] = {};
              if (!this.attributes[type][attribute])
                this.attributes[type][attribute] = [];
              this.attributes[type][attribute] = tagsArray;
            }

            this.render(true);
          }
        });    
      });

      const target = stringTag.querySelector(".tags");
      observer.observe(target, { attributes: false, childList: true, subtree: false });
    })

    const draggables = this.element.querySelectorAll("[draggable=true]");
    draggables.forEach(draggable => { 
      draggable.addEventListener("dragstart", (event) => {
        const type = draggable.dataset.type;
        const id = draggable.dataset.id;
        const value = draggable.dataset.attribute;
        const inputType = draggable.dataset.input;
        event.dataTransfer.setData("text/plain", JSON.stringify({ type, id, value, inputType }));
      });
    });

    const dropPoints = this.element.querySelectorAll("[data-drop]");
    dropPoints.forEach(dropPoint => {
      const type = dropPoint.dataset.drop;
      dropPoint.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      });
      dropPoint.addEventListener("drop", async (event) => {
        event.preventDefault();
        const data = JSON.parse(event.dataTransfer.getData("text/plain"));
        const dataTypes = Array.from(data.type.split(','));
        if (dataTypes.includes(type) || type === "shared") {
          let value = undefined;
          switch (data.inputType) {
            case "BooleanField":
              value = true;
              break;
            case "StringField":
              value = "\0";
              break;
            case "NumberField":
              value = 1;
              break;
            default: 
              break;
          }

          if (type === "shared") {
            if (!this.shared[data.value])
              this.shared[data.value] = value;
            else {
              // Create a copy with a number added to the end of the name
              let newName = _getUniqueName(data.value, this.shared);
              this.shared[newName] = value;
            }
          }
          else {
            if (event.ctrlKey) {
              for (const c in this.attributes) {
                if (!this.attributes[c])
                  this.attributes[c] = {};
                if (!this.attributes[c][data.value]) {
                  this.attributes[c][data.value] = value;
                }
                else {
                  // Create a copy with a number added to the end of the name
                  let newName = _getUniqueName(data.value, this.attributes[c]);
                  this.attributes[c][newName] = value;
                }
              }
            }
            else if (event.altKey) {
              if (!this.attributes[type])
                this.attributes[type] = {};
              if (!this.attributes[type][data.value]) {
                this.attributes[type][data.value] = value;
              }
              else {
                // Create a copy with a number added to the end of the name
                let newName = _getUniqueName(data.value, this.attributes[type]);
                this.attributes[type][newName] = value;
              }
            } 
            else {
              const proceed = await foundry.applications.api.DialogV2.confirm({
                content: game.i18n.localize("UTOPIA.FeatureBuilder.dropToAll"),
                rejectClose: true,
                modal: true
              });

              if (proceed) {
                for (const c in this.attributes) {
                  if (!this.attributes[c])
                    this.attributes[c] = {};
                  if (!this.attributes[c][data.value]) {
                    this.attributes[c][data.value] = value;
                  }
                  else {
                    // Create a copy with a number added to the end of the name
                    let newName = _getUniqueName(data.value, this.attributes[c]);
                    this.attributes[c][newName] = value;
                  }
                }
              } else {
                if (!this.attributes[type])
                  this.attributes[type] = {};
                if (!this.attributes[type][data.value]) {
                  this.attributes[type][data.value] = value;
                }
                else {
                  // Create a copy with a number added to the end of the name
                  let newName = _getUniqueName(data.value, this.attributes[c]);
                  this.attributes[c][newName] = value;
                }
              }
            }
          }

          await this.render(true);
        }
      });
    });

    const name = this.element.querySelector("#feature-name");
    name.addEventListener("blur", (event) => {
      this.name = name.value.trim();
    });
  }

  static async _toggleClassification(event, target) {
    const attribute = target.dataset.attribute;
    const classification = target.dataset.type;
    if (classification === "classification") {
      if (!this.attributes[attribute]) {
        this.attributes[attribute] = {
            maxStacks: 1,
            material: 0,
            refinement: 0,
            power: 0,
            componentsPerStack: true,
            costFormula: "0"
        };
      } else {
        // Remove it from the attributes object
        delete this.attributes[attribute]; 
      }
    }
    else {
      if (!this.attributes[classification])
        this.attributes[classification] = {};
        this.attributes[classification][attribute] = !this.attributes[classification][attribute] ?? true; 
    }

    this.render(true);
  }

  static async _shareAttribute(event, target) {
    const attribute = target.dataset.attribute;
    const classification = target.dataset.type;
    
    this.shared[attribute] = this.attributes[classification][attribute];
    const classifications = Object.keys(this.attributes).forEach(async c => {
      await new Promise(resolve => {
        delete this.attributes[c][attribute];
        resolve();
      });
    });
    
    this.render(true);
  }

  static async _unshareAttribute(event, target) {
    const attribute = target.dataset.attribute;
    
    Object.keys(this.attributes).forEach(c => {
      this.attributes[c][attribute] = this.shared[attribute];
    });

    await new Promise(resolve => {
      delete this.shared[attribute];
      resolve();
    });

    this.render(true);
  }

  static async _removeAttribute(event, target) {
    const attribute = target.dataset.attribute;
    const classification = target.dataset.type;   

    delete this.attributes[classification][attribute]; 

    this.render(true);
  }

  async simulateAmmunition(attributes) {
    const stackCount = parseFloat(attributes.maxStacks) ?? parseFloat(this.shared.maxStacks) ?? 0;
    const cost = await new Roll(attributes.costFormula ?? this.shared.costFormula ?? "0", {...this.attributes.ammunitionArtifact, ...this.shared}).evaluate({async: true}) * 6;
    return {
      material: (attributes.material ?? this.shared.material ?? 0) * stackCount,
      refinement: (attributes.refinement ?? this.shared.refinement ?? 0) * stackCount,
      power: (attributes.power ?? this.shared.power ?? 0) * stackCount,
      cost: cost
    }
  }

  async simulateData() {
    const simulation = {};

    for (const c of Object.keys(this.attributes)) {
      const attributes = this.attributes[c];

      if (c === "ammunitionArtifact") 
        simulation[c] = await this.simulateAmmunition(this.attributes[c]);
      else {
        // Check if attributes.maxStacks exists, and if its a number, and if its greater than 0
        let stackCount = parseFloat(attributes.maxStacks) ?? parseFloat(this.shared.maxStacks) ?? 0;
        if (isNaN(stackCount) || stackCount <= 0) {
          stackCount = parseFloat(this.shared.maxStacks) ?? 0;
        }
        if (isNaN(stackCount) || stackCount <= 0) {
          stackCount = 10;
        }

        var material, refinement, power = 0;

        const componentsPerStack = (attributes.componentsPerStack ?? this.shared.componentsPerStack ?? true);
        if (componentsPerStack) {
          material = (attributes.material ?? this.shared.material ?? 0) * stackCount;
          refinement = (attributes.refinement ?? this.shared.refinement ?? 0) * stackCount;
          power = (attributes.power ?? this.shared.power ?? 0) * stackCount;
        } else {
          material = attributes.material ?? this.shared.material ?? 0;
          refinement = attributes.refinement ?? this.shared.refinement ?? 0;
          power = attributes.power ?? this.shared.power ?? 0;
        }
        const costFormula = await new Roll(attributes.costFormula ?? this.shared.costFormula ?? "0", {...this.attributes[c], ...this.shared}).evaluate({async: true});
        const cost = costFormula.total * stackCount;

        simulation[c] = {
          stacks: stackCount,
          material: material,
          refinement: refinement,
          power: power,
          cost: cost,
        };

        const attributeExtras = Object.keys(attributes).filter(key => !["maxStacks", "material", "refinement", "power", "costFormula", "componentsPerStack"].includes(key));
        if (attributeExtras.length > 0) {
          for (const extra of attributeExtras) {
            const extraValue = attributes[extra];
            if (parseFloat(extraValue) !== NaN && isNumeric(extraValue)) {
              simulation[c][extra] = parseFloat(extraValue) * stackCount;
            } 
            else if (typeof extraValue === "string" && extraValue.length > 0 && extraValue !== "\u0000" && !isNumeric(extraValue)) {
              try {
                const extraRoll = await new Roll(extraValue, {...this.attributes[c], ...this.shared}).alter(stackCount, 0).evaluate({async: true});
                simulation[c][extra] = extraRoll.formula;
              } catch (error) {
                console.error(`Error evaluating roll for ${extra}:`, error);
                const extraRoll = await new Roll(extraValue, {...this.attributes[c], ...this.shared}).evaluate({async: true});
                const terms = extraRoll.terms.map(term => {
                  if (term.constructor.name === "UtopiaDie") 
                    return `${term.number * stackCount}d${term.faces}`;
                  else 
                    return term.formula
                }).join(" + ");
                simulation[c][extra] = extraRoll.total;
              }
            } else if (typeof extraValue === "number" && !isNaN(extraValue)) {
              simulation[c][extra] = extraValue * stackCount;
            }
          } 
        }

        const sharedExtras = Object.keys(this.shared).filter(key => !["maxStacks", "material", "refinement", "power", "costFormula", "componentsPerStack", "incompatibleWith", "requires"].includes(key));
        if (sharedExtras.length > 0) {
          for (const extra of sharedExtras) {
            const extraValue = this.shared[extra];
            if (parseFloat(extraValue) !== NaN && isNumeric(extraValue)) {
              simulation[c][extra] = parseFloat(extraValue) * stackCount;
            } 
            else if (typeof extraValue === "string" && extraValue.length > 0 && extraValue !== "\u0000" && !isNumeric(extraValue)) {
              try {
                const extraRoll = await new Roll(extraValue, {...this.attributes[c], ...this.shared}).alter(stackCount, 0).evaluate({async: true});
                simulation[c][extra] = extraRoll.formula;
              } catch (error) {
                console.error(`Error evaluating roll for ${extra}:`, error);
                const extraRoll = await new Roll(extraValue, {...this.attributes[c], ...this.shared}).evaluate({async: true});
                const terms = extraRoll.terms.map(term => {
                  if (term.constructor.name === "UtopiaDie") 
                    return `${term.number * stackCount}d${term.faces}`;
                  else 
                    return term.formula
                }).join(" + ");
                simulation[c][extra] = extraRoll.total;
              }
            } else if (typeof extraValue === "number" && !isNaN(extraValue)) {
              simulation[c][extra] = extraValue * stackCount;
            } 
          } 
        }
      }
    }
  
    return simulation;
  }

  static async _saveFeature(event, target) {
    const name = this.element.querySelector("#feature-name").value.trim();
    await api.DialogV2.prompt({
      window: { title: game.i18n.localize("UTOPIA.SheetLabels.featureBuilder.description") },
      content: `<textarea name="description" id="description" rows="10" cols="50"></textarea>`,
      ok: {
        label: "Save Description",
        icon: "fas fa-check",
        callback: async (event, button, dialog) => {
          const description = button.form.elements.description.value;

          let itemFolderId = "";
          itemFolderId = game.items.folders.find(f => f.name === "Gear Features")?.id ?? "";
          if (itemFolderId.length === 0) {
            await Folder.create({name: "Gear Features", type: "Item"});
            itemFolderId = game.items.folders.find(f => f.name === "Gear Features")?.id ?? "";
          }

          // Add all attributes that are the same between classifications to the shared attributes
          // and remove them from the classification attributes
          const attributeKeys = [];

          Object.keys(this.attributes).forEach(classification => {
            Object.keys(this.attributes[classification]).forEach(attribute => {
              if (!attributeKeys.includes(attribute)) {
                attributeKeys.push(attribute);
              }
            });
          });

          attributeKeys.forEach(attribute => {
            const values = Object.keys(this.attributes).map(classification => {
              return this.attributes[classification][attribute];
            });

            if (values.every(value => value === values[0])) {
              this.shared[attribute] = values[0];
              Object.keys(this.attributes).forEach(classification => {
                delete this.attributes[classification][attribute];
              });
            }
          });
          

          const attributes = {}
          attributes.shared = this.shared;
          Object.keys(this.attributes).forEach(c => {
            attributes[c] = this.attributes[c];
          });

          if (this.document !== undefined) {
            const data = {
              ["name"]: name,
              ["folder"]: itemFolderId,
              ["system.description"]: description,
              ["system.classifications"]: attributes,
            }

            await this.document.update(data);
          } 
          else {
            const feature = {
              name: name,
              type: "gearFeature",
              folder: itemFolderId,
              system: {
                classifications: attributes
              }
            };

            await Item.create(feature);
          }
        }
      }
    });

    this.render(true);
  }
}

function _getUniqueName(baseName, collection) {
  let newName = baseName;
  let i = 1;
  while (Object.hasOwn(collection, newName)) {
    newName = `${baseName}_${i}`;
    i++;
  }
  return newName;
}

/**
 * Generate a random dark-mode friendly color (e.g., a lighter HSL).
 */
function getRandomDarkModeColor() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 70 + Math.floor(Math.random() * 30); // 70-100%
  const lightness = 70 + Math.floor(Math.random() * 15);  // 70-85%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Recursively process a SchemaField object and populate the featureOptions.
 * @param {string} prefix - Key path so far (e.g. "damage").
 * @param {object} schemaField - The SchemaField instance with subfields.
 * @param {string} classification - The classification key (e.g. "fastWeapon").
 * @param {object} featureOptions - The object to populate.
 */
function processSchemaField(prefix, schemaField, classification, featureOptions) {
  for (const subField in schemaField.fields) {
    const subFieldObj = schemaField.fields[subField];
    const subFieldType = subFieldObj.constructor.name;
    // Full key path, e.g. "damage.formula", "damage.save", etc.
    const fullKey = `${prefix}.${subField}`;

    if (subFieldType === "SchemaField") {
      // Recurse deeper into nested SchemaFields
      processSchemaField(fullKey, subFieldObj, classification, featureOptions);
    } else if (["StringField", "NumberField", "BooleanField"].includes(subFieldType)) {
      // Normal logic
      if (!featureOptions[fullKey]) {
        featureOptions[fullKey] = {
          field: subFieldObj,
          type: subFieldType,
          classifications: [classification],
          color: getRandomDarkModeColor()
        };
        if (
          subFieldType === "StringField" &&
          subFieldObj.choices &&
          subFieldObj.choices.length > 0
        ) {
          featureOptions[fullKey].choices = subFieldObj.choices;
        }
      } else {
        featureOptions[fullKey].classifications.push(classification);
      }
    }
  }
}
