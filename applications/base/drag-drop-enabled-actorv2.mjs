import { fitTextToWidth } from "../../system/helpers/fitTextToWidth.mjs";
import { flattenFields } from "../../system/helpers/flattenFields.mjs";
import { AdvancementSheet } from "../item/advancement.mjs";
import { SpellcraftSheet } from "../specialty/spellcraft.mjs";
import { TalentBrowser } from "../specialty/talent-browser.mjs";

const { api, sheets } = foundry.applications;

export class DragDropActorV2 extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  constructor(options = {}) {
    super(options);
    this.#dragDrop = this.#createDragDropHandlers();
  }

  static MODES = {
    PLAY: 0,
    EDIT: 1,
  }

  _mode = this.constructor.MODES.PLAY;
  
  static DEFAULT_OPTIONS = {
    classes: ["utopia", "actor-sheet"],
    actions: {
      image: this._image,
      createDocument: this._createDocument,
      viewDocument: this._viewDocument,
      deleteDocument: this._deleteDocument,
      openApplication: this._openApplication,
      viewEffect: this._viewEffect,
      createEffect: this._createEffect,
      deleteEffect: this._deleteEffect,
      toggleEffect: this._toggleEffect,      
      viewActor: this._viewActor,
      tab: this._tab,
      toggleMode: this._toggleMode,
      roll: this._roll
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
      resizable: false,
    },
    tag: "form",
    dragDrop: [{ dragSelector: '[data-drag]', dropSelector: null }],
  };

  async _prepareContext(options) {
    for (const [key, value] of Object.entries(CONFIG.UTOPIA.TRAITS)) {
      this.actor.system.traits[key].name = value.label;
      this.actor.system.traits[key].icon = value.icon;
    }

    for (const [key, value] of Object.entries(CONFIG.UTOPIA.SUBTRAITS)) {
      this.actor.system.subtraits[key].name = value.label;
      this.actor.system.subtraits[key].icon = value.icon;
    }

    const checks = {
      ...Object.entries(CONFIG.UTOPIA.TRAITS).reduce((acc, [key, value]) => {
        acc[key] = { ...value, ...this.actor.system.traits[key], group: game.i18n.localize("UTOPIA.TRAITS.GroupName") };
        return acc;
      }, {}),
      ...Object.entries(CONFIG.UTOPIA.SUBTRAITS).reduce((acc, [key, value]) => {
        acc[key] = { ...value, ...this.actor.system.subtraits[key], group: game.i18n.localize("UTOPIA.SUBTRAITS.GroupName") };
        return acc;
      }, {}),
      ...Object.entries(CONFIG.UTOPIA.SPECIALTY_CHECKS).reduce((acc, [key, value]) => {
        acc[key] = { ...value, group: game.i18n.localize("UTOPIA.SPECIALTY_CHECKS.GroupName") };
        return acc;
      }, {}),
    }

    // Sort them by their groups
    const checkOptions = Object.entries(checks).reduce((acc, [key, value]) => {
      const group = value.group;
      if (!acc[group]) acc[group] = [];
      acc[group].push({
        ...value,
        name: key,
      });
      return acc;
    }, {});

    // Then by their localized names using 'game.i18n.sortObjects(object, path)'
    for (const group in checkOptions) {
      checkOptions[group] = game.i18n.sortObjects(checkOptions[group], "label");
    }    

    var specialtyChecks = Object.fromEntries(await Promise.all(Object.entries(CONFIG.UTOPIA.SPECIALTY_CHECKS).map(async ([key, value]) => {
      const netFavor = await this.actor.checkForFavor(key) || 0;
      const attribute = this.actor.system.checks[key];
      const newFormula = value.formula.replace(`@${value.defaultAttribute}`, `@${attribute}`);
      const formula = new Roll(newFormula, this.actor.getRollData()).alter(1, netFavor).formula;
      return [key, { 
        ...value, 
        attribute: attribute,
        formula: formula,
        key: key
      }];
    })));

    specialtyChecks = game.i18n.sortObjects(Object.values(specialtyChecks), "label");

    return {
      // Ownership
      editable: this.isEditable,
      owner: this.actor.isOwner,
      limited: this.actor.limited,

      // The actor of course
      actor: this.actor,

      // The actor's effects
      effects: this.actor.effectCategories,

      // Actor's system data
      system: this.actor.system,
      systemSource: this.actor.system._source,

      // Actor flags
      flags: this.actor.flags,

      // Global configuration
      config: CONFIG.UTOPIA,

      // Actor fields
      fields: this.actor.schema.fields,
      systemFields: this.actor.system.schema.fields,

      // Mode
      isPlay: this._mode === this.constructor.MODES.PLAY,
      datasets: this._getDatasets(), 

      // Specialty Data
      checks: checkOptions,
      specialtyChecks: specialtyChecks,
    }
  }

  /**
   * Helper to compose datasets available in the hbs
   * @returns {Record<string, unknown>}
   */
  _getDatasets() {
    return {
      isSource: {source: true},
      notSource: {source: false}
    };
  }
  
  static async _image(event, target) {
    event.preventDefault();
    const type = target.dataset.image;
    let file = await new FilePicker({
      type: "image",
      current: type === "icon" ? this.document.img : this.document.system.fullbody,
      callback: (path) => {
        type === "icon" ? this.document.update({ img: path }) : this.document.update({ "system.fullbody": path });
      },
    }).browse();
  }

  async _preparePartContext(partId, context) {
    switch (partId) {
      case 'attributes':
      case 'spellbook':
      case 'background':
        context.tab = context.tabs[partId];
        context.enrichedDescription = await TextEditor.enrichHTML(
          this.actor.system.description,
          {
            secrets: this.document.isOwner,
            rollData: this.actor.getRollData(),
            relativeTo: this.actor
          }
        );
        context = this._prepareItems(context);
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
        label: 'UTOPIA.Actors.Tabs.',
      };
  
      switch (partId) {
        case 'header':
        case 'tabs':
          return tabs;
        case 'attributes':
          tab.id = 'attributes';
          tab.label += 'Attributes';
          tab.icon = 'fas fa-fw fa-dice';
          break;
        case 'actions': 
          tab.id = 'actions';
          tab.label += 'Actions';
          tab.icon = 'fas fa-fw fa-person-running';
          break;
        case 'equipment': 
          tab.id = 'equipment';
          tab.label += 'Equipment';
          tab.icon = 'fas fa-fw fa-suitcase';
          break;
        case 'spellbook': 
          tab.id = 'spellbook';
          tab.label += 'spellbook';
          tab.icon = 'fas fa-fw fa-hat-wizard';
          break;
        case 'talents': 
          tab.id = 'talents';
          tab.label += 'Talents';
          tab.icon = 'fas fa-fw fa-star';
        case 'background': 
          tab.id = 'background';
          tab.label += 'Background';
          tab.icon = 'fas fa-fw fa-align-left';
          break;
        case 'effects':
          tab.id = 'effects';
          tab.label += 'Effects';
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

  _prepareItems(context) {
    context.favors = this.actor.items.filter(i => i.type === 'favor');
    context.equipment = this.actor.items.filter(i => i.type === 'gear').filter(i => i.system.category !== "consumable");
    context.consumables = this.actor.items.filter(i => i.type === 'gear').filter(i => i.system.category === "consumable");
    context.talents = this.actor.items.filter(i => i.type === 'talent');
    context.spells = this.actor.items.filter(i => i.type === 'spell');
    context.actions = this.actor.items.filter(i => i.type === 'action');
    context.generic = this.actor.items.filter(i => i.type === 'generic');
    context.specialist = this.actor.items.filter(i => i.type === 'specialistTalent');
    
    return context;
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

    const nameElement = this.element.querySelector('.actor-name');
    fitTextToWidth(nameElement, 12, 24);
    nameElement.addEventListener('input', (event) => {
      const inputElement = event.target;
      fitTextToWidth(inputElement, 12, 24);
    });
    nameElement.addEventListener('blur', (event) => {
      const inputElement = event.target;
      fitTextToWidth(inputElement, 12, 24);
    });

    const toggle = this.element.querySelector(".mode-toggle");
    toggle.checked = this._mode === this.constructor.MODES.EDIT;
    
    const traitChecks = this.element.querySelectorAll(".trait-select");
    traitChecks.forEach((check) => {
      this._traitCheckChange(null, check);
      check.addEventListener("change", (event) => this._traitCheckChange(event, check));
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

  async _traitCheckChange(event, target) {
    const type = target.dataset.type;
    const trait = target.selectedOptions[0].value;
    const netFavor = await this.actor.checkForFavor(trait) || 0;
    const newFormula = `3d6 + @${trait}.mod`;
    const formula = new Roll(newFormula, this.actor.getRollData()).alter(1, netFavor).formula;
    const container = target.closest(".checks");
    const formulaElements = container.querySelectorAll(`.formula.${type}-check`);
    formulaElements.forEach((element) => {
      element.dataset.check = trait; 

      if (element.dataset.key) {
        const value = element.dataset.key;
        element.name = `system.${type}s.${trait}.${value}`;
        element.setAttribute('value', String(this.actor.system._source[`${type}s`][trait][value]));

        if (element.type === "checkbox") {
          if (this.actor.system._source[`${type}s`][trait][value]) element.setAttribute('checked');
        }
      }
      else {
        element.innerText = formula;
      }
    });
  }

  static async _roll(event, target) {
    const roll = target.dataset.roll;
    switch (roll) {
      case "block":
        const block = this.actor.system.block;
        const blockFormula = `${block.quantity}d${block.size}`;
        return await new Roll(blockFormula, this.actor.getRollData()).toMessage();
      case "dodge":
        const dodge = this.actor.system.dodge;
        const dodgeFormula = `${dodge.quantity}d${dodge.size}`;
        return await new Roll(dodgeFormula, this.actor.getRollData()).toMessage();
      case "rest": 
        return this.actor.rest();
      case "check": 
        const check = target.dataset.check;
        return this.actor.check(check);
      case "item": 
        const item = this.actor.items.get(target.dataset.item);
        return await item.roll();
      default: 
        const formula = target.dataset.formula || roll;
        return await new Roll(formula, this.actor.getRollData()).toMessage();
    }
  }

  static async _toggleMode(event, target) {
    const { MODES } = this.constructor;
    const toggle = target;
    const label = game.i18n.localize(`DND5E.SheetMode${toggle.checked ? "Play" : "Edit"}`);
    toggle.dataset.tooltip = label;
    toggle.setAttribute("aria-label", label);
    this._mode = toggle.checked ? MODES.EDIT : MODES.PLAY;
    await this.submit();
    this.render();
  }

  static async _createDocument(event, target) {
    const type = target.dataset.documentType;
    await this.actor.createEmbeddedDocuments("Item", [{ name: target.innerText, type: type }]);
  }

  static async _deleteDocument(event, target) {
    const id = target.dataset.documentId;
    await this.actor.deleteEmbeddedDocuments("Item", [id]);
  }

  static async _viewDocument(event, target) {
    if (target.dataset.documentId) {
      const item = this.actor.items.get(target.dataset.documentId);
      return item.sheet.render(true);
    }

    const documentType = target.dataset.documentType;
    switch (documentType) {
      case "specialtyCheck": 
        return await foundry.applications.api.DialogV2.prompt({
          window: { title: game.i18n.localize("UTOPIA.SPECIALTY_CHECKS.WindowTitle") },
          content: await renderTemplate("systems/utopia/templates/dialogs/specialty-check.hbs", {
            check: CONFIG.UTOPIA.SPECIALTY_CHECKS[target.dataset.check]
          }),
          modal: true,
        });
    }
  }

  static async _viewActor(event, target) {
    if (target.dataset.documentUUID) {
      const actor = await fromUuid(target.dataset.documentUUID);
      actor.sheet.render(true);
    } 
    else if (target.dataset.documentId) {
      const actor = await fromUuid(target.dataset.documentId);
      actor.sheet.render(true);
    }
  }

  static async _openApplication(event, target) {
    const app = target.dataset.application;
    switch (app) {
      case "talent-browser":
        return new TalentBrowser({ actor: this.actor }).render(true);
      case "spellcraft": 
        return new SpellcraftSheet({ actor: this.actor }).render(true);
      case "artifice": 
        return new ArtificeSheet({ actor: this.actor }).render(true);
      case "advancement":
        return new AdvancementSheet({ actor: this.actor }).render(true);
    }
  }

  /**
   * Renders an embedded document's sheet
   *
   * @this BoilerplateActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _viewEffect(event, target) {
    const effect = this._getEffect(target);
    effect.sheet.render(true, {typeLocked: true});
  }

  /**
   * Handles actor deletion
   *
   * @this BoilerplateActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _deleteEffect(event, target) {
    const effect = this._getEffect(target);
    await effect.delete();
  }

  /**
   * Handle creating a new Owned Actor or ActiveEffect for the actor using initial data defined in the HTML dataset
   *
   * @this BoilerplateActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _createEffect(event, target) {
    // Retrieve the configured document class for ActiveEffect
    const aeCls = getDocumentClass("ActiveEffect");
    // Prepare the document creation data by initializing it a default name.
    // As of v12, you can define custom Active Effect subtypes just like Actor subtypes if you want
    const effectData = {
      name: aeCls.defaultName({
        // defaultName handles an undefined type gracefully
        type: "base",
        parent: this.actor,
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

    effectData.name = this.actor.name;
    effectData.origin = this.actor.uuid;

    console.log(effectData);

    // Finally, create the embedded document!
    await aeCls.create(effectData, { parent: this.actor });
  }

  /**
   * Determines effect parent to pass to helper
   *
   * @this BoilerplateActorSheet
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
    return this.actor.effects.get(li?.dataset?.effectId);
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
      const effect = this.actor.effects.get(li.dataset.effectId);
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
    const actor = this.actor;
    const allowed = Hooks.call("dropActorSheetData", actor, this, data);
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
    if (!this.actor.isOwner || !effect) return false;

    if (this.actor.uuid === effect.parent?.uuid)
      return this._onEffectSort(event, effect);
    return aeCls.create(effect, { parent: this.actor });
  }

  /**
   * Sorts an Active Effect based on its surrounding attributes
   *
   * @param {DragEvent} event
   * @param {ActiveEffect} effect
   */
  _onEffectSort(event, effect) {
    const effects = this.actor.effects;
    const dropTarget = event.target.closest("[data-effect-id]");
    if (!dropTarget) return;
    const target = effects.get(dropTarget.dataset.effectId);

    // Don't sort on yourself
    if (effect.id === target.id) return;

    // Identify sibling actors based on adjacent HTML elements
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
    return this.actor.updateEmbeddedDocuments("ActiveEffect", updateData);
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
  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;
    const item = await Item.fromDropData(data);
    await this.actor.createEmbeddedDocuments("Item", [item]);
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of an actor reference or actor data onto an Actor Sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<Actor[]|boolean>}  The created or updated Actor instances, or false if the drop was not permitted.
   * @protected
   */
  async _onDropActor(event, data) {
    if (!this.actor.isOwner) return false;
    this.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of a Folder on an Actor Sheet.
   * The core sheet currently supports dropping a Folder of Actors to create all actors as owned actors.
   * @param {DragEvent} event     The concluding DragEvent which contains drop data
   * @param {object} data         The data transfer extracted from the event
   * @returns {Promise<Actor[]>}
   * @protected
   */
  async _onDropFolder(event, data) {
    if (!this.actor.isOwner) return [];
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