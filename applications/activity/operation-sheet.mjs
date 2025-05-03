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
      scrollable: ['.effects-list']
    }
  };

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ["header", "operation"];
  }

  async _prepareContext(options) {
    const context = {
      activity: this.document,
      operation: this.operation,
      effects: this.document.effectCategories,
      fields: this.document.system.operationFields(this.operation.type) || {},
    }

    console.log("Preparing context for operation sheet:", context);

    return context;
  }

  _processFormData(formData) {
    super._processFormData(formData);
    
    console.log(formData);

    return {};
  }

  static async submit(event, target) {
    super.submit()
  }
}