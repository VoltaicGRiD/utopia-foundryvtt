import { DragDropActorV2 } from "../base/drag-drop-enabled-actorv2.mjs";

export class NPC extends DragDropActorV2 {
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

    },
    position: {
      height: 800,
      width: 1000
    },
  });

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ["header", "tabs", "attributes", "spellbook", "background", "effects"];
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.tabs = super._getTabs(options.parts);
    context.position = options.position;
    context.isPlay = this.constructor.MODES.EDIT;
      
    console.log(context);

    return context;
  }  
}