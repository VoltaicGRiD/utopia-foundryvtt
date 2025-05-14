import { getTextContrastHex } from "../../system/helpers/textContrast.mjs";
import { ArtificeSheet } from "../specialty/artifice.mjs";
import { SpellcraftSheet } from "../specialty/spellcraft.mjs";

const { api, sheets } = foundry.applications;

/**
 * GearSheet is a specialized ItemSheet for gear items.
 * It provides a custom UI and behavior for managing gear, including crafting and editing.
 */
export class GearSheet extends api.HandlebarsApplicationMixin(sheets.ItemSheetV2) {
  constructor(options = {}) {
    super(options);
  }

  // Default configuration options.
  static DEFAULT_OPTIONS = {
    classes: ["utopia", "artifice"],
    position: { width: 500, height: 600 },
    actions: {
      image: this._image,
      use: this._use,
      craft: this._craft,
      equip: this._equip,
      augment: this._augment,
      duplicate: this._duplicate,
      edit: this._edit,
      save: this._save,
    },
    form: { submitOnChange: true },
    tag: "form",
    window: { title: "UTOPIA.SheetLabels.gear" },
  };

  // Template parts for the sheet.
  static PARTS = {
    details: { template: "systems/utopia/templates/item/special/gear.hbs" },
  };
    
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

  /**
   * Configures render options for the sheet.
   * @param {object} options - Render options.
   */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ["details"];
  }

  /* -------------------------------------------- */
  /*  Logging Methods                             */
  /* -------------------------------------------- */

  /**
   * Centralized logging method.
   * @param {string} message - The log message.
   * @param {...any} args - Additional data.
   */
  _log(message, ...args) {
    console.log(`[GearSheet] ${message}`, ...args);
  }

  /**
   * Centralized error logging method.
   * @param {string} message - The error message.
   * @param {...any} args - Additional data.
   */
  _error(message, ...args) {
    console.error(`[GearSheet ERROR] ${message}`, ...args);
  }

  /* -------------------------------------------- */
  /*  Utility Methods                             */
  /* -------------------------------------------- */

  /**
   * Builds a localized choices object from raw choices.
   * @param {object} choices - Raw schema choices.
   * @returns {object} Localized choices.
   */
  _buildLocalizedChoices(choices) {
    const localized = {};
    Object.entries(choices).forEach(([key, value]) => {
      localized[key] = game.i18n.localize(value);
    });
    return localized;
  }

  /* -------------------------------------------- */
  /*  Data Preparation Methods                    */
  /* -------------------------------------------- */

  getRollData() {
    const rollData = {};
    if (Object.keys(this.item.system.features).length > 0) {
      Object.values(this.item.system.features).forEach((feature) => {
        for (const key of feature.keys) {
          if (key.key === "range") {
            rollData["range"] = rollData["range"] || {};
            rollData["range"]["close"] = feature.output.value.split('/')[0].trim();
            rollData["range"]["far"] = feature.output.value.split('/')[1].trim();
          }
          else {
            rollData[key.key] = feature.output.value;
          }
        }
      });
    }

    // Mark ranged if either close or far range is greater than 3
    if (rollData.range && (rollData.range.close > 3 || rollData.range.far > 3)) {
      rollData.ranged = true;
    }

    return rollData;
  }

  /**
   * Prepares context data for rendering the gear sheet.
   * @param {object} options - Options passed to the sheet.
   * @returns {object} The complete context for rendering.
   */
  async _prepareContext(options) {
    const features = this.item.system.features || {};
    const activations = this.item.system.activations || {};
    const type = this.item.system.type;

    const artifice = this.item.system.artifice || {};
    const rollData = this.getRollData() || {};

    const context = {
      features,
      activations,
      artifice,
      rollData,
      item: this.item,
      types: ["fastWeapon", "moderateWeapon", "slowWeapon", "shields", "headArmor", "chestArmor", "handsArmor", "feetArmor", "consumable", "equippableArtifact", "handheldArtifact", "ammunitionArtifact"],
      type: type,
      isArtifact: ["equippableArtifact", "handheldArtifact", "ammunitionArtifact"].includes(type), 
    }

    console.log("GearSheet context:", context);

    return context;
  }

  /**
   * Prepares the submit data, filtering out fields that should not be submitted.
   * @param {Event} event - The submit event.
   * @param {HTMLFormElement} form - The form element.
   * @param {object} formData - The serialized form data.
   * @returns {object} The prepared submit data.
   */
  _prepareSubmitData(event, form, formData) {
    const submitData = super._prepareSubmitData(event, form, formData);
    delete submitData["system.features"];
    return submitData;
  }

  /* -------------------------------------------- */
  /*  Tab Handling                                */
  /* -------------------------------------------- */

  /**
   * Generates tabs configuration for the sheet.
   * @param {Array<string>} parts - List of part identifiers.
   * @returns {object} Tabs configuration.
   */
  _getTabs(parts) {
    const tabGroup = 'primary';
    if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = 'details';

    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: '',
        group: tabGroup,
        id: '',
        icon: '',
        label: 'UTOPIA.Items.Tabs.',
      };

      switch (partId) {
        case 'details':
          tab.id = 'details';
          tab.label += 'Details';
          break;
        default:
          break;
      }

      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = 'active';
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  /* -------------------------------------------- */
  /*  Rendering & Event Handling                  */
  /* -------------------------------------------- */

  /**
   * Sets up event listeners after rendering.
   * @param {object} context - The rendering context.
   * @param {object} options - Additional options.
   */
  async _onRender(context, options) {
    super._onRender(context, options);

    this.element.querySelector(".window-content").style.position = "relative";
    if (options.isFirstRender && this.item.system.type === "consumable") {
      const div = document.createElement("div");
      div.classList.add("artifice-craft-div");
      const button = document.createElement("button");
      button.dataset.action = "duplicate";
      button.classList.add("artifice-craft-button");
      button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="height: 512px; width: 512px;"><defs><filter id="shadow-3" height="300%" width="300%" x="-100%" y="-100%"><feFlood flood-color="rgba(255, 0, 0, 1)" result="flood"></feFlood><feComposite in="flood" in2="SourceGraphic" operator="atop" result="composite"></feComposite><feGaussianBlur in="composite" stdDeviation="15" result="blur"></feGaussianBlur><feOffset dx="5" dy="5" result="offset"></feOffset><feComposite in="SourceGraphic" in2="offset" operator="over"></feComposite></filter><filter id="shadow-5" height="300%" width="300%" x="-100%" y="-100%"><feFlood flood-color="rgba(255, 0, 0, 1)" result="flood"></feFlood><feComposite in="flood" in2="SourceGraphic" operator="atop" result="composite"></feComposite><feGaussianBlur in="composite" stdDeviation="15" result="blur"></feGaussianBlur><feOffset dx="0" dy="0" result="offset"></feOffset><feComposite in="SourceGraphic" in2="offset" operator="over"></feComposite></filter></defs><g class="" transform="translate(0,1)" style=""><g><path d="M256 18.365L50.14 136L256 253.635L461.86 136L256 18.365Z" class="" fill="#0097f8" fill-opacity="1"></path><path d="M102 186.365L50.14 216L256 333.635L461.86 216L410 186.365L256 274.365L102 186.365Z" class="" fill="#000000" fill-opacity="1" stroke="#fff8f8" stroke-opacity="1" stroke-width="8" filter="url(#shadow-3)"></path><path d="M102 266.365L50.14 296L256 413.635L461.86 296L410 266.365L256 354.365L102 266.365Z" class="" fill="#00b5ff" fill-opacity="1"></path><path d="M102 346.365L50.14 376L256 493.635L461.86 376L410 346.365L256 434.365L102 346.365Z" class="selected" fill="#000000" fill-opacity="1" filter="url(#shadow-5)" stroke="#ffffff" stroke-opacity="1" stroke-width="8"></path></g></g></svg>`;
      div.append(button);
      this.element.append(div);
    }

    // Listen for updates on select elements.
    this.element.querySelectorAll("select[data-action='update']").forEach(selectEl => {
      selectEl.addEventListener("change", async (event) => {
        this._update(event, selectEl);
      });
    });

    const header = this.element.querySelector('.window-header');
    header.style.backgroundColor = this.item.system.artifice.rarity.color;
    header.style.color = getTextContrastHex(this.item.system.artifice.rarity.color, "#000000", "#FFFFFF");
    header.querySelector('.window-title').style.color = getTextContrastHex(this.item.system.artifice.rarity.color, "#000000", "#FFFFFF");
  }

  /**
   * Handles updates from select input changes.
   * @param {Event} event - The change event.
   * @param {HTMLElement} target - The select element.
   */
  async _update(event, target) {
    const confirmUpdate = await foundry.applications.api.DialogV2.confirm({
      window: { title: "UTOPIA.COMMON.confirmDialog" },
      content: game.i18n.localize("UTOPIA.COMMON.confirmUpdateGearType"),
      modal: true
    });

    // Normalize the property name.
    const propertyName = target.name === "systemtype" ? "type" : target.name;

    if (confirmUpdate) {
      await this.item.update({
        "system.features": {},
        "system.featureSettings": {},
        [`system.${propertyName}`]: target.selectedOptions[0].value,
      });
      this.render(true);
    }
  }

  /* -------------------------------------------- */
  /*  Action Handlers                             */
  /* -------------------------------------------- */

  /**
   * Opens the ArtificeSheet for editing gear.
   * @param {Event} event - The triggering event.
   * @param {HTMLElement} target - The target element.
   */
  static async _edit(event, target) {
    // Render an ArtificeSheet for further editing.
    await new ArtificeSheet().render({ item: this.item, force: true });
    this.close();
  }

  /**
   * Invokes the crafting process.
   * @param {Event} event - The triggering event.
   * @param {HTMLElement} target - The target element.
   */
  static async _craft(event, target) {
    if (game.user.isGM || (this.item.parent?.isOwner ?? false)) {
      await this.item.craft();
    }
    this.render(true);
  }

  /**
   * Submits the gear sheet.
   * @param {Event} event - The submit event.
   * @param {HTMLElement} target - The target element.
   */
  static async _save(event, target) {
    super.submit();
  }

  /**
   * Uses the gear.
   * @param {Event} event - The triggering event.
   * @param {HTMLElement} target - The target element.
   */
  static async _use(event, target) {
    await this.item.use();
  }

  /**
   * Equips the gear.
   * @param {Event} event - The triggering event.
   * @param {HTMLElement} target - The target element.
   */
  static async _equip(event, target) {
    await this.item.equip();
    this.render(true);
  }

  /**
   * Augments the gear.
   * 
   */
  static async _augment(event, target) {
    await this.item.augment();
    this.render(true);
  }

  static async _duplicate(event, target) {
    if (game.user.isGM) {
      this.item.update({
        "system.quantity": this.item.system.quantity + 1,
      })

      return ui.notifications.info(game.i18n.localize("UTOPIA.Artifice.Duplicated"));
    }

    const { material, refinement, power } = this.item.system.artifice;
    const actor = game.user.character;
  }
}
