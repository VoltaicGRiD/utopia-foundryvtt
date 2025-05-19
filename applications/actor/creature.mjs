import { DragDropActorV2 } from "../base/drag-drop-enabled-actorv2.mjs";

export class Creature extends DragDropActorV2 {
  static PARTS = {
    header: {
      template: "systems/utopia/templates/actor/creature/header.hbs",
      scrollable: ['.actor-header']
    },
    tabs: {
      template: "systems/utopia/templates/tabs.hbs",
    },
    attributes: {
      template: "systems/utopia/templates/actor/attributes.hbs",
    },
    equipment: {
      template: "systems/utopia/templates/actor/equipment.hbs",
    },
    spellbook: {
      template: "systems/utopia/templates/actor/spellbook.hbs",
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
    classes: ["utopia", "actor-sheet", "creature"],
    actions: {
      toggleMode: this._toggleMode,
      increaseStack: this._increaseStack,
      decreaseStack: this._decreaseStack,
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

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.tabs = super._getTabs(options.parts);
    context.position = options.position;
    context.isPlay = this._mode === this.constructor.MODES.PLAY;
      
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
      editButton.type = "button";
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
  
  static async _increaseStack(event, target) {
    const itemId = target.dataset.documentId;
    const item = this.actor.items.get(itemId);
    await (item.update({
      "system.stacks": item.system.stacks + 1
    }))
  }

  static async _decreaseStack(event, target) {
    const itemId = target.dataset.documentId;
    const item = this.actor.items.get(itemId);
    await (item.update({
      "system.stacks": item.system.stacks - 1
    }))

    if (item.system.stacks <= 0) {
      await item.delete();
    }
  }
}