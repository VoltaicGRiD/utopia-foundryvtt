import { DragDropItemV2 } from "../base/drag-drop-enabled-itemv2.mjs";
import { FeatureBuilder } from "../specialty/feature-builder.mjs";

export class GearFeatureSheet extends DragDropItemV2 {
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
    classes: ["utopia", "gear-feature-sheet"],
    position: {
      width: 1300,
      height: 800,
    },
    actions: {
      openBuilder: this._openBuilder,
    },
    window: {
      title: "UTOPIA.SheetLabels.featureBuilder",
    },
  };

  static PARTS = {
    content: {
      template: "systems/utopia/templates/item/special/gear-feature.hbs",
      scrollable: [".options-display", ".classification-container"],
    },
  };

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ["content"];
  }

  async _prepareContext(options) {
    this.attributes = this.item.system.builderClassifications ?? {};
    this.shared = this.attributes.shared ?? {};

    const context = {
      attributes: this.attributes,
      shared: this.shared,
      simulation: await this.simulateData(),
      editable: this.isEditable,
      owner: this.document.isOwner,
      limited: this.document.limited,
      item: this.item,
      system: this.item.system,
      config: CONFIG.UTOPIA,
    }

    console.log(context);

    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);
  }

  static async _openBuilder(event, target) {
    const sheet = new FeatureBuilder({ 
      editingFeature: this.item,
      attributes: this.attributes,
      shared: this.shared,
      name: this.item.name,
    });

    await sheet.render(true);
    this.close();
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
}