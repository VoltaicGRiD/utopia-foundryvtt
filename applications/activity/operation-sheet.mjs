const { api } = foundry.applications;

export class OperationSheet extends api.HandlebarsApplicationMixin(api.DocumentSheetV2) {
  constructor(options = {}) {
    super(options);
    this.operation = options.operation || null;
  }

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: ["utopia", "operation-sheet"],
    actions: {
      submit: this._submit,
    },
    form: {
      submitOnChange: false,
      closeOnSubmit: true,
    },
    position: {
      width: 600,
      height: 750
    },
  };

  static PARTS = {
    header: {
      template: "systems/utopia/templates/activity/operation-sheet-header.hbs",
      scrollable: []
    },
    buttons: {
      template: "systems/utopia/templates/activity/operation-sheet-buttons.hbs",
      scrollable: []
    }
  };

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ["header", "operation", "buttons"];
  }

  async _prepareContext(options) {
    const context = {
      activity: this.document,
      operation: this.operation,
      effects: this.document.effectCategories,
      effectsList: this.document.system.getEffects(),
      choices: this.document.system.operationChoices(this.operation.type) || {},
      fields: this.document.system.operationFields(this.operation.type) || {},
    }

    console.log("Preparing context for operation sheet:", context);

    return context;
  }

  _processFormData(event, form, formData) {
    return {};
  }

  static async _submit(event, target) {
    await (this.document.system.updateOperation(this.operation.id, new FormDataExtended(this.element)));
    await this.document.sheet.render({ force: true });
    await this.close();
  }
}