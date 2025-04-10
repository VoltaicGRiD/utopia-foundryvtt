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
    classes: ["utopia", "gear-sheet"],
    position: { width: 500, height: 600 },
    actions: {
      image: this._image,
      use: this._use,
      craft: this._craft,
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

  /**
   * Prepares context data for rendering the gear sheet.
   * @param {object} options - Options passed to the sheet.
   * @returns {object} The complete context for rendering.
   */
  async _prepareContext(options) {
    // Build localized options for gear types.
    const fields = CONFIG.Item.dataModels.gear.schema.fields;
    const typeOptions = this._buildLocalizedChoices(fields.type.choices);
    const weaponTypeOptions = this._buildLocalizedChoices(fields.weaponType.choices);
    const armorTypeOptions = this._buildLocalizedChoices(fields.armorType.choices);
    const artifactTypeOptions = this._buildLocalizedChoices(fields.artifactType.choices);

    // Construct type data from the current item.
    const typeData = {
      type: this.item.system.type,
      weaponType: this.item.system.weaponType,
      armorType: this.item.system.armorType,
      artifactType: this.item.system.artifactType,
      types: typeOptions,
      weaponTypes: weaponTypeOptions,
      armorTypes: armorTypeOptions,
      artifactTypes: artifactTypeOptions,
    };

    // Prepare the full context for rendering.
    const context = {
      featureSettings: this.item.system.featureSettings,
      features: this.item.system.features,
      systemFields: CONFIG.Item.dataModels.gear.schema.fields,
      ...typeData,
      system: this.item.system,
      item: this.item,
      actor: this.item.parent || null,
    };

    this._log("Context prepared", context);
    this._log("Options", options);
    this._log("Sheet instance", this);
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

    // Listen for updates on select elements.
    this.element.querySelectorAll("select[data-action='update']").forEach(selectEl => {
      selectEl.addEventListener("change", async (event) => {
        this._update(event, selectEl);
      });
    });
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
}
