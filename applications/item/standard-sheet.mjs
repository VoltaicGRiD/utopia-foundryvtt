import { DragDropItemV2 } from "../base/drag-drop-enabled-itemv2.mjs"

export class ItemSheet extends DragDropItemV2 {
  static PARTS = {
    header: {
      template: "systems/utopia/templates/item/header.hbs",
      scrollable: ['.item-header']
    },
    tabs: {
      template: "systems/utopia/templates/tabs.hbs",
    },
    attributes: {
      template: "systems/utopia/templates/item/attributes.hbs",
    },
    description: {
      template: "systems/utopia/templates/item/description.hbs",
    },
    effects: {
      template: "systems/utopia/templates/effects.hbs",
    }
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(DragDropItemV2.DEFAULT_OPTIONS, {
    actions: {

    },
    position: {
      height: 500,
      width: 750
    },
  });

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ["header", "tabs", "attributes", "description", "effects"];
    if (["favor"].includes(this.item.type)) {
      options.parts = ["header", "tabs", "attributes"];
      options.position= {
        width: 500,
        height: 400
      };
    }
    if (["kit"].includes(this.item.type)) {
      options.parts = ["header", "tabs", "attributes"];
      options.position= {
        width: 1000,
        height: 400
      };
    }
  }

  async _prepareContext(options) {
    const context = super._prepareContext(options);

    context.tabs = super._getTabs(options.parts);
    context.position = options.position;
      
    console.log(context);

    return context;
  }
}