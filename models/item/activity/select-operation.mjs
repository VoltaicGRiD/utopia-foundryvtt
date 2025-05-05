import { BaseOperation } from "./base-activity.mjs";

const fields = foundry.data.fields;

export class selectOperation extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();

    return {
      selectOperation: new fields.SchemaField({
        type: new fields.StringField({ required: true, nullable: false, blank: false, initial: "selectOperation" }),
        selectMultiple: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        availableOperations: new fields.ArrayField(new fields.SchemaField({
          name: new fields.StringField({ required: true, nullable: false, blank: false }),
          type: new fields.StringField({ required: true, nullable: false, blank: false, initial: "selectOperation" }),
          id: new fields.StringField({ required: true, nullable: false, blank: false }),
        }), { required: true, nullable: false, initial: [] }),
        selectedOperations: new fields.ArrayField(new fields.SchemaField({
          name: new fields.StringField({ required: true, nullable: false, blank: false }),
          type: new fields.StringField({ required: true, nullable: false, blank: false, initial: "selectOperation" }),
          id: new fields.StringField({ required: true, nullable: false, blank: false }),
        }), { required: true, nullable: false, initial: [] }),
        ...baseActivity,
      })
    }
  }

  static getOperations(activity) {
    const operations = [];

    for (const operation of activity.system.selectOperation.operations) {
      if (operation.type !== "selectOperation") {
        console.warn(`Operation type "${operation.type}" is not supported in selectOperation activity.`);
        continue;
      }

      operations.push({
        name: operation.name,
        type: operation.type,
        id: operation.id,
      });
    }

    return operations;
  }

  static async execute(activity, operation, options = {}) {
    await DialogV2.prompt({
      title: game.i18n.localize("UTOPIA.Activity.SelectOperation.Title"),
      content: `<p>${game.i18n.localize("UTOPIA.Activity.SelectOperation.Description")}</p>`,
      buttons: operation.selectedOperations.reduce((acc, op) => {
        acc[op.id] = {
          label: op.name,
          callback: () => {
            activity.system.selectOperation.selectedOperations.push(op);
            activity.update({ "system.selectOperation.selectedOperations": activity.system.selectOperation.selectedOperations });
          }
        };
        return acc;
      }, {}),
      default: "cancel",
      options: { width: 400, height: "auto" }
    })
  }
}