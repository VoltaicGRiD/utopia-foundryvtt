import { fitTextToWidth } from "../../system/helpers/fitTextToWidth.mjs";
import { flattenFields } from "../../system/helpers/flattenFields.mjs";

const { api, sheets } = foundry.applications;

export class DragDropItemV2 extends api.HandlebarsApplicationMixin(sheets.ItemSheetV2) {
  constructor(options = {}) {
    super(options);
    this.#dragDrop = this.#createDragDropHandlers();
  }
  
  static DEFAULT_OPTIONS = {
    classes: ["utopia", "item-sheet"],
    actions: {
      image: this._image,
      viewEffect: this._viewEffect,
      createEffect: this._createEffect,
      deleteEffect: this._deleteEffect,
      toggleEffect: this._toggleEffect,      
      schemaSetAdd: this._schemaSetAdd,
      schemaSetRemove: this._schemaSetRemove,
      viewItem: this._viewItem,
      tab: this._tab,
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    position: {
      width: 750,
      height: 750
    },
    window: {
      resizable: true,
    },
    tag: "form",
    dragDrop: [{ dragSelector: '[data-drag]', dropSelector: '[data-drop]' }],
  };

  _prepareContext(options) {
    const headerFields = this.item.system.headerFields;
    headerFields.forEach((field) => {
      const value = foundry.utils.getProperty(this.item, field.field.fieldPath);
      field.value = value;
    });

    var attributeFields = this.item.system.attributeFields || [];
    attributeFields.forEach((field) => {
      const value = foundry.utils.getProperty(this.item, field.field.fieldPath);
      field.value = value;
    });

    return {
      // Ownership
      editable: this.isEditable,
      owner: this.item.isOwner,
      limited: this.item.limited,

      // The item of course
      item: this.item,

      // The item's effects
      effects: this.item.effectCategories,

      // Item's system data
      system: this.item.system,

      // Item flags
      flags: this.item.flags,

      // Global configuration
      config: CONFIG.UTOPIA,

      // Item fields
      fields: this.item.schema.fields,
      systemFields: this.item.system.schema.fields,
      headerFields: headerFields,
      attributeFields: attributeFields,

      // Sizing
      position: this.options.position
    }
  }
  
  static async _image(event) {
    event.preventDefault();
    let file = await new FilePicker({
      type: "image",
      current: this.document.img,
      callback: (path) => {
        this.document.update({
          img: path,
        });
      },
    }).browse();
  }

  async _preparePartContext(partId, context) {
    switch (partId) {
      case 'attributes':
      case 'description':
        context.tab = context.tabs[partId];
        context.enrichedDescription = await TextEditor.enrichHTML(
          this.item.system.description,
          {
            secrets: this.document.isOwner,
            rollData: this.item.getRollData(),
            relativeTo: this.item
          }
        );
        break;
      case 'effects': 
        context.tab = context.tabs[partId];
        break;
      default:
    }
    return context;
  }

  _getTabs(parts) {
    const tabGroup = 'primary';
  
    // Default tab for first time it's rendered this session
    if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = 'attributes';
  
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
        case 'header':
        case 'tabs':
          return tabs;
        case 'attributes':
          tab.id = 'attributes';
          tab.label += 'attributes';
          tab.icon = 'fas fa-fw fa-book';
          break;
        case 'description': 
          tab.id = 'description';
          tab.label += 'Description';
          tab.icon = 'fas fa-fw fa-align-left';
          break;
        case 'effects':
          tab.id = 'effects';
          tab.label += 'effects';
          tab.icon = 'fas fa-fw fa-bolt';
          break;
        default:
      }
  
      // This is what turns on a single tab
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = 'active';
  
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  _onRender(options, context) {
    super._onRender(options, context);
    this.dragDrop.forEach((dd) => dd.bind(this.element));
    this.element.querySelectorAll("input").forEach((input) => {
      input.addEventListener("focus", (event) => {
        event.target.select();
      });
    });

    // Move the tabs element from within the 'window-content' to the 'window' itself
    const tabs = this.element.querySelector(".tabs");
    if (tabs) this.element.prepend(tabs);
    // Remove the original tabs container
    this.element.querySelector('.window-content').querySelectorAll(".tabs-container").forEach((c) => c.remove());

    const nameElement = this.element.querySelector('.item-name');
    fitTextToWidth(nameElement, 12, 24);
    nameElement.addEventListener('input', (event) => {
      const inputElement = event.target;
      fitTextToWidth(inputElement, 12, 24);
    });
    nameElement.addEventListener('blur', (event) => {
      const inputElement = event.target;
      fitTextToWidth(inputElement, 12, 24);
    });
  }

  changeTab(tab, group, {event, navElement, force=false, updatePosition=true}={}) {
    if ( !tab || !group ) throw new Error("You must pass both the tab and tab group identifier");
    if ( (this.tabGroups[group] === tab) && !force ) return;  // No change necessary
    const tabElement = this.element.querySelector(`.tabs > [data-group="${group}"][data-tab="${tab}"]`);
    if ( !tabElement ) throw new Error(`No matching tab element found for group "${group}" and tab "${tab}"`);

    // Update tab navigation
    for ( const t of this.element.querySelectorAll(`.tabs > [data-group="${group}"]`) ) {
      t.classList.toggle("active", t.dataset.tab === tab);
    }

    // Update tab contents
    for ( const section of this.element.querySelectorAll(`.tab[data-group="${group}"]`) ) {
      section.classList.toggle("active", section.dataset.tab === tab);
    }
    this.tabGroups[group] = tab;

    // Update automatic width or height
    if ( !updatePosition ) return;
    const positionUpdate = {};
    if ( this.options.position.width === "auto" ) positionUpdate.width = "auto";
    if ( this.options.position.height === "auto" ) positionUpdate.height = "auto";
    if ( !foundry.utils.isEmpty(positionUpdate) ) this.setPosition(positionUpdate);
  }

  static async _schemaSetAdd(event, target) {
    const container = target.closest("div");
    const name = `system.${container.dataset.name}`;
    const inputs = container.querySelectorAll(".schema-set-input");

    // Gather form inputs into an object
    const value = {};
    for (const input of inputs) {
      const key = input.dataset.field;
      if (input instanceof HTMLSelectElement) {
        value[key] = input.selectedOptions[0].value;
      } else if (input instanceof HTMLInputElement) {
        value[key] = input.value;
      }
    }

    // Get existing data
    let existing = foundry.utils.getProperty(this.item, name);

    // Convert existing data to an array if needed
    if (existing instanceof Set) {
      existing = Array.from(existing);
    } else if (!Array.isArray(existing)) {
      existing = [];
    }

    // Push new data object
    existing.push(value);

    // Update the item so that `traits[0].trait` etc. is available
    await this.item.update({ [name]: existing });
  }

  static async _schemaSetRemove(event, target) {
    const value = target.dataset.value;
    const container = target.closest("div");
    const name = `system.${container.dataset.name}`;
    let existing = foundry.utils.getProperty(this.item, name);

    // Convert existing data to an array if needed
    if (existing instanceof Set) {
      existing = Array.from(existing);
    }

    // Remove the value from the array
    existing = existing.filter((v) => {
      let content = "";
      for (const [key, field] of Object.entries(v)) {
        content += `${v[key]}, `;
      }
      content = content.slice(0, -2);
      return content !== value; 
    });

    // Update the item so that `traits[0].trait` etc. is available
    await this.item.update({ [name]: existing });
  }

  static async _viewItem(event, target) {
    if (target.dataset.documentUUID) {
      const item = await fromUuid(target.dataset.documentUUID);
      item.sheet.render(true);
    } 
    else if (target.dataset.documentId) {
      const item = await fromUuid(target.dataset.documentId);
      item.sheet.render(true);
    }
  }

  /**
   * Renders an embedded document's sheet
   *
   * @this BoilerplateItemSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _viewEffect(event, target) {
    const effect = this._getEffect(target);
    effect.sheet.render(true, {typeLocked: true});
  }

  /**
   * Handles item deletion
   *
   * @this BoilerplateItemSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _deleteEffect(event, target) {
    const effect = this._getEffect(target);
    await effect.delete();
  }

  /**
   * Handle creating a new Owned Item or ActiveEffect for the actor using initial data defined in the HTML dataset
   *
   * @this BoilerplateItemSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _createEffect(event, target) {
    // Retrieve the configured document class for ActiveEffect
    const aeCls = getDocumentClass("ActiveEffect");
    // Prepare the document creation data by initializing it a default name.
    // As of v12, you can define custom Active Effect subtypes just like Item subtypes if you want
    const effectData = {
      name: aeCls.defaultName({
        // defaultName handles an undefined type gracefully
        type: "base",
        parent: this.item,
      }),
    };
    // Loop through the dataset and add it to our effectData
    for (const [dataKey, value] of Object.entries(target.dataset)) {
      // These data attributes are reserved for the action handling
      if (["action", "documentClass"].includes(dataKey)) continue;
      // Nested properties require dot notation in the HTML, e.g. anything with `system`
      // An example exists in spells.hbs, with `data-system.spell-level`
      // which turns into the dataKey 'system.spellLevel'
      foundry.utils.setProperty(effectData, dataKey, value);
    }

    // Get the type from the nearest li dataset 'effectType'
    effectData.type = target.closest("li").dataset.effectType;

    effectData.name = this.item.name;
    effectData.origin = this.item.uuid;

    console.log(effectData);

    // Finally, create the embedded document!
    await aeCls.create(effectData, { parent: this.item });
  }

  /**
   * Determines effect parent to pass to helper
   *
   * @this BoilerplateItemSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _toggleEffect(event, target) {
    const effect = this._getEffect(target);
    await effect.update({ disabled: !effect.disabled });
  }

  /** Helper Functions */

  /**
   * Fetches the row with the data for the rendered embedded document
   *
   * @param {HTMLElement} target  The element with the action
   * @returns {HTMLLIElement} The document's row
   */
  _getEffect(target) {
    const li = target.closest(".effect");
    return this.item.effects.get(li?.dataset?.effectId);
  }

  /**
   *
   * DragDrop
   *
   */

  /**
   * Define whether a user is able to begin a dragstart workflow for a given drag selector
   * @param {string} selector       The candidate HTML selector for dragging
   * @returns {boolean}             Can the current user drag this selector?
   * @protected
   */
  _canDragStart(selector) {
    // game.user fetches the current user
    return this.isEditable;
  }

  /**
   * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
   * @param {string} selector       The candidate HTML selector for the drop target
   * @returns {boolean}             Can the current user drop on this selector?
   * @protected
   */
  _canDragDrop(selector) {
    // game.user fetches the current user
    return this.isEditable;
  }

  /**
   * Callback actions which occur at the beginning of a drag start workflow.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragStart(event) {
    const li = event.currentTarget;
    if ("link" in event.target.dataset) return;

    let dragData = null;

    // Active Effect
    if (li.dataset.effectId) {
      const effect = this.item.effects.get(li.dataset.effectId);
      dragData = effect.toDragData();
    }

    if (!dragData) return;

    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /**
   * Callback actions which occur when a dragged element is over a drop target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragOver(event) {}

  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  async _onDrop(event) {
    console.warn(event);

    const data = TextEditor.getDragEventData(event);
    const item = this.item;
    const allowed = Hooks.call("dropItemSheetData", item, this, data);
    if (allowed === false) return;

    // Handle different data types
    switch (data.type) {
      case "ActiveEffect":
        return this._onDropActiveEffect(event, data);
      case "Actor":
        return this._onDropActor(event, data);
      case "Item":
        return this._onDropItem(event, data);
      case "Folder":
        return this._onDropFolder(event, data);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle the dropping of ActiveEffect data onto an Actor Sheet
   * @param {DragEvent} event                  The concluding DragEvent which contains drop data
   * @param {object} data                      The data transfer extracted from the event
   * @returns {Promise<ActiveEffect|boolean>}  The created ActiveEffect object or false if it couldn't be created.
   * @protected
   */
  async _onDropActiveEffect(event, data) {
    const aeCls = getDocumentClass("ActiveEffect");
    const effect = await aeCls.fromDropData(data);
    if (!this.item.isOwner || !effect) return false;

    if (this.item.uuid === effect.parent?.uuid)
      return this._onEffectSort(event, effect);
    return aeCls.create(effect, { parent: this.item });
  }

  /**
   * Sorts an Active Effect based on its surrounding attributes
   *
   * @param {DragEvent} event
   * @param {ActiveEffect} effect
   */
  _onEffectSort(event, effect) {
    const effects = this.item.effects;
    const dropTarget = event.target.closest("[data-effect-id]");
    if (!dropTarget) return;
    const target = effects.get(dropTarget.dataset.effectId);

    // Don't sort on yourself
    if (effect.id === target.id) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for (let el of dropTarget.parentElement.children) {
      const siblingId = el.dataset.effectId;
      if (siblingId && siblingId !== effect.id)
        siblings.push(effects.get(el.dataset.effectId));
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(effect, {
      target,
      siblings,
    });
    const updateData = sortUpdates.map((u) => {
      const update = u.update;
      update._id = u.target._id;
      return update;
    });

    // Perform the update
    return this.item.updateEmbeddedDocuments("ActiveEffect", updateData);
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of an Actor data onto another Actor sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<object|boolean>}  A data object which describes the result of the drop, or false if the drop was
   *                                     not permitted.
   * @protected
   */
  async _onDropActor(event, data) {
    if (!this.item.isOwner) return false;
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of an item reference or item data onto an Actor Sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<Item[]|boolean>}  The created or updated Item instances, or false if the drop was not permitted.
   * @protected
   */
  async _onDropItem(event, data) {
    if (!this.item.isOwner) return false;
    this.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of a Folder on an Actor Sheet.
   * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
   * @param {DragEvent} event     The concluding DragEvent which contains drop data
   * @param {object} data         The data transfer extracted from the event
   * @returns {Promise<Item[]>}
   * @protected
   */
  async _onDropFolder(event, data) {
    if (!this.item.isOwner) return [];
  }

  /** The following pieces set up drag handling and are unlikely to need modification  */

  /**
   * Returns an array of DragDrop instances
   * @type {DragDrop[]}
   */
  get dragDrop() {
    return this.#dragDrop;
  }

  // This is marked as private because there's no real need
  // for subclasses or external hooks to mess with it directly
  #dragDrop;

  /**
   * Create drag-and-drop workflow handlers for this Application
   * @returns {DragDrop[]}     An array of DragDrop handlers
   * @private
   */
  #createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = { 
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      };
      d.callbacks = {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      };
      return new DragDrop(d);
    });
  }
}