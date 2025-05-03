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
      context.features = await Promise.all(this.item.system.features?.map(async (feature) => {
        const featureItem = await fromUuid(feature);
        return featureItem;
      })) ?? [];
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

    // const variables = this.element.querySelectorAll("input.variable-input");
    // variables.forEach(v => {
    //   v.addEventListener("change", (event) => {
    //     const featureId = event.target.dataset.feature;
    //     const variableId = event.target.dataset.variable;
    //     const value = event.target.value;

    //     this.item.update({
    //       [`system.featureSettings.${featureId}.${variableId}`]: value
    //     });
    //   });
    // });
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
