import { ArtificeSheet } from "../specialty/artifice.mjs";
import { SpellcraftSheet } from "../specialty/spellcraft.mjs";

const { api, sheets } = foundry.applications;

export class GearSheet extends api.HandlebarsApplicationMixin(
  sheets.ItemSheetV2
) {
  constructor(options = {}) {
    super(options);
  }

  static DEFAULT_OPTIONS = {
    classes: ["utopia", "gear-sheet"],
    position: {
      width: 500,
      height: 600,
    },
    actions: {
      image: this._image,
      edit: this._edit,
      save: this._save,
    },
    form: {
      submitOnChange: true,
    },
    tag: "form",
    window: {
      title: "UTOPIA.SheetLabels.gear",
    },
  };

  static PARTS = {
    details: {
      template: "systems/utopia/templates/item/special/gear.hbs",
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
      systemFields: this.item.system.schema.fields,
      config: CONFIG.UTOPIA,
      tabs: this._getTabs(options.parts),
      name: this.item.name,
    };

    context.features = this.item.system.parsedFeatures ?? [];
    if (context.features.length === 0) {
      const features = this.item.system?.features ?? [];

      if (features.length > 0) {
        context.features = await Promise.all(this.item.system.features.map(async (feature) => {
          const featureItem = await fromUuid(feature);
          return featureItem;
        }));
      }
    }

    if (context.features.length > 0) {
      for (const feature of context.features) {
        feature.variables = this.item.system.featureSettings[feature._id];
      }
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

    // const numVariables = this.element.querySelectorAll("input[type='number']");
    // numVariables.forEach(v => {
    //   v.addEventListener("change", (event) => {
    //     const featureId = event.target.dataset.feature;
    //     const variableId = event.target.dataset.variable;
    //     const value = event.target.value;

    //     this.item.update({
    //       [`system.features.${featureId}.system.variables.${variableId}.value`]: value
    //     });
    //   });
    // });
  }

  static async _edit(event, target) {
    let artifice = await new ArtificeSheet().render({item: this.item, force: true});
  }
  
  static async _save(event, target) {
    super.submit();
  }

  static async _cast(event, target) {
    await this.item.use();
  }
}
