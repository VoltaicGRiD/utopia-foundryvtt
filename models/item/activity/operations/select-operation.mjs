import { BaseOperation } from "../base-operation.mjs";

const fields = foundry.data.fields;

export class selectOperation extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();

    return {
      selectOperation: new fields.SchemaField({
        type: new fields.StringField({ required: true, nullable: false, blank: false, initial: "selectOperation" }),
        selectMultiple: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        // availableOperations: new fields.ArrayField(new fields.SchemaField({
        //   name: new fields.StringField({ required: true, nullable: false, blank: false }),
        //   type: new fields.StringField({ required: true, nullable: false, blank: false, initial: "selectOperation" }),
        //   id: new fields.StringField({ required: true, nullable: false, blank: false }),
        // }), { required: true, nullable: false, initial: [] }),
        selectedOperations: new fields.SetField(new fields.StringField({ required: true, nullable: false, initial: "" }), { required: true, nullable: false, initial: [] }),
        //selectedOperations: new fields.StringField({ required: true, nullable: false, initial: "" }),

        ...baseActivity,
      })
    }
  }

  static getChoices(activity) {
    return activity.operations.reduce((acc, operation) => {
      if (operation.type !== "selectOperation" && !operation.executeImmediately) {
        acc[operation.id] = operation.name;
      }
      return acc;
    }, {});
  }

  static async execute(activity, operation, options = {}) {
    const buttons = Array.from(operation.selectedOperations).length > 0 ? Array.from(operation.selectedOperations).map((op) => {
      const opData = activity.system.operations.find(o => o.id === op);
      return {
        label: opData.name,
        callback: () => {
          activity.system.executeSpecificOperation(opData.id, options);
        }
      };
    }) : [];

    await new foundry.applications.api.DialogV2({
      title: game.i18n.localize("UTOPIA.Activity.SelectOperation.Title"),
      content: `<p>${game.i18n.localize("UTOPIA.Activity.SelectOperation.Description")}</p>`,
      buttons: buttons,
      options: { width: 400, height: "auto" }
    }).render(true);
  }
}