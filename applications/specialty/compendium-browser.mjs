import { gatherItems } from "../../system/helpers/gatherItems.mjs";

const { api } = foundry.applications;

/**
 * A compendium browser for Utopia.
 */
export class CompendiumBrowser extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  actor = null;
  type = "action";
  includeWorld = false;
  includeActor = false;
  search = "";

  constructor(options) {
    super(options);
    this.includeActor = options.includeActor ?? false;
    this.includeWorld = options.includeWorld ?? false;
    this.actor = options.actor ?? null;
    this.type = options.type ?? "action";
    this.search = options.search ?? "";
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['utopia', 'compendium-browser'],
    window: {
      resizeable: true,
      title: `UTOPIA.CompendiumBrowser.Title`,
    },
    position: {
      width: 800,
      height: 900,
    },
    actions: {
      take: this._take,
      takeAndClose: this._takeAndClose,
      view: this._view
    },
  };

  static PARTS = {
    header: {
      template: "systems/utopia/templates/specialty/compendium-browser/header.hbs",
      scrollable: ['.actor-header']
    },
    content: {
      template: "systems/utopia/templates/specialty/compendium-browser/content.hbs",
    },
  }

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ["header", "content"];
  }

  async _prepareContext(options) {
    if (options.isFirstRender) {
      this.type = options.type ?? this.type ?? "action";
    }

    const types = [
      "action", "quirk", "favor", "generic", "gear", "species", "talentTree", "talent", "spell", "gearFeature", "body", "class", "kit"
    ]

    const type = this.type ?? "action";
    const search = this.search;
    const includeWorld = this.includeWorld;
    const includeActor = this.includeActor;

    const items = await gatherItems({ type, gatherFolders: true, gatherFromActor: includeActor, gatherFromWorld: includeWorld });
    
    // Group items by folder, with each folder having its data and an items array.
    const folders = items.reduce((acc, item) => {
      // Use the folder data if available; otherwise, create a default "Uncategorized" folder.
      const folderData = item._folder || { id: "Uncategorized", name: "Uncategorized" };
      const folderId = folderData.id;
      
      // If the folder hasn't been added yet, add it with its metadata and an empty items array.
      if (!acc[folderId]) {
        acc[folderId] = { ...folderData, items: [] };
      }
      
      // Add the current item to the folder's items array.
      acc[folderId].items.push(item);
      
      // Remove all items that don't match the search term.
      if (search && search.length > 0 && !item.name.toLowerCase().includes(search.toLowerCase())) {
        acc[folderId].items.pop();
      }
      return acc;
    }, {});

    const context = {
      isGM: game.user.isGM,
      types,
      type,
      includeWorld,
      includeActor,
      search,
      folders,
      items
    }

    console.log(context);
    
    return context;
  }

  _onRender(options, context) {
    super._onRender(options, context);
    
    this.element.querySelector('select[name="type"]').addEventListener('change', (event) => {
      event.preventDefault();
      const type = event.target.selectedOptions[0].value;
      this.type = type;
      this.render();
    })

    this.element.querySelector('input[name="world"]').addEventListener('change', (event) => {
      event.preventDefault();
      const world = event.target.checked;
      this.includeWorld = world;
      this.render();
    })

    this.element.querySelector('input[name="search"]').addEventListener('change', (event) => {
      event.preventDefault();
      const search = event.target.value;
      this.search = search;
      this.render();
    })

    this.element.querySelector('#search-button').addEventListener('click', (event) => {
      event.preventDefault();
      const search = this.element.querySelector('input[name="search"]').value;
      this.search = search;
      this.render();
    });

    this.element.querySelector('input[type="checkbox"]').addEventListener('change', (event) => {
      event.preventDefault();
      const uuid = event.target.dataset.uuid;
      if (event.target.checked) {
        this.selected = uuid;
      }
    })
  }

  static async _take(event, target) {
    if (this.actor.isOwner || game.user.isGM) {
      const itemUuid = target.dataset.uuid;
      const item = await fromUuid(itemUuid);

      // We need to have specific use-cases based on the item type
      this.actor.canTake(item);

      // TODO localize
      ui.notifications.info(`Item ${item.name} added to ${this.actor.name}`);
    } 
  }

  static async _takeAndClose(event, target) {
    if (this.actor.isOwner || game.user.isGM) {
      const itemUuid = target.dataset.uuid;
      const item = await fromUuid(itemUuid);

      // We need to have specific use-cases based on the item type
      this.actor.canTake(item);

      // TODO localize
      ui.notifications.info(`Item ${item.name} added to ${this.actor.name}`);
    } 

    this.close();
  }

  static async _view(event, target) {
    const uuid = target.dataset.uuid;
    const item = await fromUuid(uuid);
    item.sheet.render(true);
  }
}