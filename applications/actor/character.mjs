import { DragDropActorV2 } from "../base/drag-drop-enabled-actorv2.mjs";

export class Character extends DragDropActorV2 {
  static PARTS = {
    header: {
      template: "systems/utopia/templates/actor/header.hbs",
      scrollable: ['.actor-header']
    },
    tabs: {
      template: "systems/utopia/templates/tabs.hbs",
    },
    attributes: {
      template: "systems/utopia/templates/actor/attributes.hbs",
    },
    spellbook: {
      template: "systems/utopia/templates/actor/spellbook.hbs",
    },
    equipment: {
      template: "systems/utopia/templates/actor/equipment.hbs",
    },
    background: {
      template: "systems/utopia/templates/actor/background.hbs",
    },
    effects: {
      template: "systems/utopia/templates/effects.hbs",
    }
  }

  static MODES = {
    PLAY: 0,
    EDIT: 1,
  }

  _mode = this.constructor.MODES.PLAY;

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(DragDropActorV2.DEFAULT_OPTIONS, {
    classes: ["utopia", "actor-sheet", "character"],
    actions: {
      toggleMode: this._toggleMode,
    },
    position: {
      height: 800,
      width: 1000
    },
  });

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ["header", "tabs", "attributes", "equipment", "spellbook", "background", "effects"];
  }

  _prepareSubmitData(event, form, formData) {
    const data = super._prepareSubmitData(event, form, formData);
    
    // const biographySelector = form.querySelector("select[name='system.biographyFields']") ?? undefined;
    // if (biographySelector) {
    //   const defaultBiography = ['age', 'height', 'weight', 'edicts', 'anthema', 'motivations', 'phobias'];
    //   const selectedBiography = biographySelector.value.split(',');
    //   const biographyFields = selectedBiography.filter(field => !defaultBiography.includes(field));
    //   data.system.biographyFields = biographyFields;
    // }

    return data;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.tabs = super._getTabs(options.parts);
    context.position = options.position;
    context.components = await this._getComponents(context);
    
    console.log(context);

    return context;
  }  

  _onRender(context, options) {
    super._onRender(context, options);

    console.log(context, options);

    if (context.editable && options.isFirstRender) {
      const headerContainer = this.element.querySelector("header.window-header");
      const spliceLocation = headerContainer.querySelector("h1.window-title");
      const editButton = document.createElement("button");
      editButton.classList.add("edit-mode-button");
      switch (this._mode) {
        case this.constructor.MODES.PLAY:
          editButton.innerHTML = `<span><i class="fas fa-cogs"></i> ${game.i18n.localize("UTOPIA.Actors.EditMode")}</span>`;
          break;
        case this.constructor.MODES.EDIT:
          editButton.innerHTML = `<span><i class="fas fa-circle-play"></i> ${game.i18n.localize("UTOPIA.Actors.PlayMode")}</span>`;
          break;
      }
      editButton.dataset.action = "toggleMode"
      spliceLocation.insertAdjacentElement('afterend', editButton); 
    }
    else {
      const editButton = this.element.querySelector(".edit-mode-button");
      switch (this._mode) {
        case this.constructor.MODES.PLAY:
          editButton.innerHTML = `<span><i class="fas fa-cogs"></i> ${game.i18n.localize("UTOPIA.Actors.EditMode")}</span>`;
          break;
        case this.constructor.MODES.EDIT:
          editButton.innerHTML = `<span><i class="fas fa-circle-play"></i> ${game.i18n.localize("UTOPIA.Actors.PlayMode")}</span>`;
          break;
      }
    }
  }

  static async _toggleMode(event, target) {
    const { MODES } = this.constructor;
    this._mode = this._mode === MODES.PLAY ? MODES.EDIT : MODES.PLAY;
    await this.submit();
    this.render();
  }

  async _getComponents(context) {
    const components = {};

    for (const [component, componentValue] of Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.components")))) {
      components[component] = {
        label: componentValue.label,
        rarities: {}
      };
      for (const [rarity, rarityValue] of Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.rarities")))) {
        components[component].rarities[rarity] = {};
        components[component].rarities[rarity].label = rarityValue.label;
        components[component].rarities[rarity].value = this.actor.system.components[component][rarity].available;
        components[component].rarities[rarity].field = context.systemFields.components.fields[component].fields[rarity];
        components[component].rarities[rarity].name = `system.components.${component}.${rarity}.available`;
      }
    }  
    
    return components;
  }
}