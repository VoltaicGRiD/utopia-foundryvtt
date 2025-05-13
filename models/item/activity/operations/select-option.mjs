import { BaseOperation } from "../base-operation.mjs";

const fields = foundry.data.fields;

export class selectOption extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();

    return {
      selectOption: new fields.SchemaField({
        type: new fields.StringField({ required: true, nullable: false, blank: false, initial: "select" }),
        options: new fields.ArrayField(new fields.SchemaField({
          key: new fields.StringField({ required: true, nullable: false, blank: true }),
          name: new fields.StringField({ required: true, nullable: false, blank: true }),
        }), { required: true, nullable: false, initial: [] }),
        value: new fields.StringField({ required: true, nullable: false, blank: true }),
        ...baseActivity,
      })
    }
  }

  static async addOption(activity, operationId) {
    const operations = activity.parent.system.operations || [];
    
    await activity.parent.update({
      "system.operations": operations.map(op => {
        if (op.id === operationId) {
          return {
            ...op,
            options: [...op.options, { key: "", name: "" }],
          };
        }
        return op;
      })
    });
  }

  static async removeOption(activity, operationId, optionIndex) {
    const operations = activity.parent.system.operations || [];
    
    await activity.parent.update({
      "system.operations": operations.map(op => {
        if (op.id === operationId) {
          return {
            ...op,
            options: op.options || [],
            options: op.options.filter((_, index) => index !== optionIndex),
          };
        }
        return op;
      })
    });
  }

  static async execute(activity, operation, options = {}) {
    const buttons = Array.from(operation.options).length > 0 ? Array.from(operation.options).map((op) => {
      return {
        action: op.key,
        label: op.name,
        callback: () => {
          op.key
        }
      };
    }) : [];

    const result = await new Promise((resolve) => {
      new foundry.applications.api.DialogV2({
        title: game.i18n.localize("UTOPIA.Activity.SelectOption.Title"),
        content: `<p>${game.i18n.localize("UTOPIA.Activity.SelectOption.Description")}</p>`,
        buttons: buttons,
        submit: resolve
      }).render(true);
    });
    
    const operations = await Promise.all(activity.system.operations.map(op => {
      if (op.id === operation.id) {
        return {
          ...op,
          value: result,
        };
      }
      return op;
    }));

    await activity.update({
      "system.operations": operations,
    });

    return true;
  }
}