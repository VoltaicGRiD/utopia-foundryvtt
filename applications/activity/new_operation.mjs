import { selectOperation } from "../../models/item/activity/select-operation.mjs";

const { api } = foundry.applications;

export class NewOperationSheet extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  activity = null;
  selectedOperations = [];

  constructor(options = {}) {
    super(options);

    this.activity = options.activity || null;
  }
  
  static DEFAULT_OPTIONS = {
    classes: ["utopia", "new-operation-sheet"],
    actions: {
      selectOperation: this._selectOperation,
      submit: this._submit
    },
    form: {
      submitOnChange: false,
      closeOnSubmit: true,
    },
    position: {
      width: 400,
      height: 750
    },
  };

  static PARTS = {
    content: {
      template: "systems/utopia/templates/activity/new-operation.hbs",
      scrollable: ['.operations-list']
    }
  }

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ["content"];
  }

  _prepareContext(options) {
    const context = {};

    context.title = "Hello World!";
    context.operations = this.activity.system.allOperations.map(a => {
      return { name: game.i18n.localize(`UTOPIA.Items.Activity.Operation.${a}`), type: a };
    }) || [];

    return context;
  }

  static async _selectOperation(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const operation = button.dataset.operation;
    const activity = this.activity;

    if (!activity) return console.warn("No activity found to select operation from.");

    const id = foundry.utils.randomID(16);
    const operations = activity.system.operations;
    const success = await activity.newOperation(operation);
    if (!success) return console.warn(`Operation "${operation}" could not be created.`);
    
    // Close this sheet, and ensure the activity's sheet is rendered
    await activity.sheet.render({ force: true });
    await this.close();
  }
}