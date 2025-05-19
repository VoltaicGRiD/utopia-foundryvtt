import { SpellcraftSheet } from "../specialty/spellcraft.mjs";

const { api, sheets } = foundry.applications;

export class SpellSheet extends api.HandlebarsApplicationMixin(
  sheets.ItemSheetV2
) {
  constructor(options = {}) {
    super(options);
  }

  static DEFAULT_OPTIONS = {
    classes: ["utopia", "spell-sheet"],
    position: {
      width: 500,
      height: 600,
    },
    actions: {
      image: this._image,
      cast: this._cast,
      edit: this._edit,
      save: this._save,
    },
    form: {
      submitOnChange: true,
    },
    tag: "form",
    window: {
      title: "UTOPIA.SheetLabels.spell",
    },
  };

  static PARTS = {
    details: {
      template: "systems/utopia/templates/item/special/spell.hbs",
    },
  };

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ["details"];
  }

  async _prepareContext(options) {
    var context = {
      editable: this.isEditable,
      owner: this.document.isOwner,
      limited: this.document.limited,
      item: this.item,
      system: this.item.system,
      config: CONFIG.UTOPIA,
      tabs: this._getTabs(options.parts),
      name: this.item.name,
    };

    context.features = this.item.system.parsedFeatures?.map(feature => {
      return { ...feature, variables: this.item.system.featureSettings[feature.id], id: feature.id };
    }) ?? [];

    if (context.features.length === 0) {
      context.features = this.item.system.features ?? {};
    }
    
    console.log(context);

    return context;
  }

  _prepareSubmitData(event, form, formData) {
    const submitData = super._prepareSubmitData(event, form, formData);
    delete submitData["system.features"];
    return submitData;
  }

  async _preparePartContext(partId, context) {
    switch (partId) {
      case 'details':
        context.tab = context.tabs[partId];
        break;
      default:
    }
    return context;
  }

  _getTabs(parts) {
    const tabGroup = 'primary';
  
    // Default tab for first time it's rendered this session
    if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = 'details';
  
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: '',
        group: tabGroup,
        // Matches tab property to
        id: '',
        // FontAwesome Icon, if you so choose
        icon: '',
        // Run through localization
        label: 'UTOPIA.Items.Tabs.',
      };
  
      switch (partId) {
        case 'details':
          tab.id = 'details';
          tab.label += 'Details';
          break;
        default:
      }
  
      // This is what turns on a single tab
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = 'active';
  
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  async _onRender(context, options) {
    super._onRender(context, options);

    const textVariables = this.element.querySelectorAll("input[class='feature-variable-text']");
    textVariables.forEach(v => {
      v.addEventListener("change", async (event) => {
        const featureItem = event.target.closest("li");
        const featureId = featureItem.dataset.id;
        const variableId = event.target.dataset.variable;
        const value = event.target.value;
        const feature = this.item.system.features[featureId];

        const variable = feature.system.variables[variableId];
        variable.value = value;

        await this.item.update({
          [`system.featureSettings.${featureId}.${variable.name}`]: variable
        })
        
        this.render();
      });
    });

    const numVariables = this.element.querySelectorAll("input[type='number']");
    numVariables.forEach(v => {
      v.addEventListener("change", async (event) => {
        const featureItem = event.target.closest("li");
        const featureId = featureItem.dataset.id;
        const variableId = event.target.dataset.variable;
        const value = event.target.value;
        const feature = this.item.system.features[featureId];

        const variable = feature.system.variables[variableId];
        variable.value = parseInt(value);

        await this.item.update({
          [`system.featureSettings.${featureId}.${variable.name}`]: variable
        });

        this.render();
      });
    });

    const optVariables = this.element.querySelectorAll(".feature-variable-options");
    optVariables.forEach(v => {
      v.addEventListener("click", async (event) => {
        const featureItem = event.target.closest("li");
        const featureId = featureItem.dataset.id;
        const variableId = event.target.dataset.variable;
        const feature = this.item.system.features[featureId];
        const name = feature.system.variables[variableId].name;
        let options = [];
        if (Array.isArray(feature.system.variables[variableId].options)) {
          options = feature.system.variables[variableId].options;
        }
        else {
          options = feature.system.variables[variableId].options.split(',');
        }
        const variable = feature.system.variables[variableId];
        const value = feature.system.variables[variableId].value || options[0];
        const description = feature.system.variables[variableId].description || "No description provided.";
        const template = await renderTemplate(
          'systems/utopia/templates/dialogs/variable-options.hbs', 
          {name: name, description: description, options: options, selected: value}
        );

        new api.DialogV2({
          window: {title: `Options for ${name}`},
          content: template,
          buttons: [{
            action: "save",
            label: "Save",
            default: true,
            callback: (event, button, dialog) => button.form.elements["variable-option"].value
          }],
          submit: async result => {
            event.target.style.backgroundColor = "#90c96b";
            event.target.style.color = "#000";
            event.target.innerHTML = `&#x2713`;

            variable.value = result;

            await this.item.update({
              [`system.featureSettings.${featureId}.${name}`]: variable
            });
          }
        }).render(true);
      });
    });

    const formulaDown = this.element.querySelectorAll(".formula-down");
    formulaDown.forEach(f => {
      f.addEventListener("click", async (event) => {
        const featureId = event.target.dataset.feature;
        const feature = this.selected[featureId];
        let currentFormula = feature.currentFormula;
        const options = Object.values(feature.formulaOptions)[0];

        if (currentFormula === 0) return;
        else currentFormula--;

        this.selected[featureId].currentFormula = currentFormula;
        this.selected[featureId].customFormula = true;
        
        this.render();
      });
    });

    const formulaUp = this.element.querySelectorAll(".formula-up");
    formulaUp.forEach(f => {
      f.addEventListener("click", async (event) => {
        const featureId = event.target.dataset.feature;
        const feature = this.selected[featureId];
        let currentFormula = feature.currentFormula;
        const options = Object.values(feature.formulaOptions)[0];

        if (currentFormula === options.length - 1) return;
        else currentFormula++;

        this.selected[featureId].currentFormula = currentFormula;
        this.selected[featureId].customFormula = true;

        this.render();
      });
    });
  }

  static async _edit(event, target) {
    let spellcraft = await new SpellcraftSheet().render(true);
    spellcraft.addSpell(this.item);
  }
  
  static async _save(event, target) {
    await this.submit();
  }

  static async _cast(event, target) {
    await this.item.use();
  }
}
