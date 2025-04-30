import * as ops from "./_module.mjs";

export class Activity extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "UTOPIA.Items.Activity"];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};

    schema.name = new fields.StringField({ required: true, nullable: false, initial: "" });
    schema.description = new fields.StringField({ required: true, nullable: false, initial: "" });
    schema.origin = new fields.DocumentUUIDField({ required: false, nullable: true, initial: null });

    schema.operations = new fields.ArrayField(new fields.TypedSchemaField({
      ...ops.selectOperation.defineSchema(),
      ...ops.attack.defineSchema(),
      ...ops.selectOption.defineSchema(),
      ...ops.condition.defineSchema(),
      ...ops.castSpell.defineSchema()
    }), { required: true, nullable: false, initial: [] });

    // TODO - Implement the trigger system for activities
    // schema.runOnTrigger = new fields.BooleanField({ required: true, nullable: false, initial: false });
    // schema.trigger = new fields.StringField({ required: true, nullable: false, initial: "onTurnStart", choices: {
    //   "onTurnStart": { label: "UTOPIA.Items.Activity.Trigger.OnTurnStart", value: "onTurnStart" },
    //   "onTurnEnd": { label: "UTOPIA.Items.Activity.Trigger.OnTurnEnd", value: "onTurnEnd" },
    //   "onRoundStart": { label: "UTOPIA.Items.Activity.Trigger.OnRoundStart", value: "onRoundStart" },
    //   "onRoundEnd": { label: "UTOPIA.Items.Activity.Trigger.OnRoundEnd", value: "onRoundEnd" }
    // } });

    return schema;
  }

  get allOperations() {
    return ["attack", "castSpell", "selectOperation", "condition"];
  }

  async newOperation(operation) {
    const id = foundry.utils.randomID(16);

    const newOp = { ...ops[operation].defineSchema(), id: id, type: operation };

    try {
      await this.parent.update({
        "system.operations": [...this.operations, newOp ]
      });
      return true;
    } catch (error) {
      console.error("Failed to update operations:", error);
      return false;
    }
  }

  static async execute(activity, options = {}) {
    const { operations } = activity.system;

    // Create a running tally of costs for each operation that executes successfully
    const costs = { 
      turnActions: 0,
      interruptActions: 0,
      currentActions: 0,
      stamina: 0,
      shp: 0,
      dhp: 0
    }
    
    for (const operation of operations) {
      if (operation.executeImmediately) {
        if (await ops[operation.type].execute(activity, operation, options)) {
          costs.turnActions += operation.costs.actionType === "turn" ? operation.costs.actions : 0;
          costs.interruptActions += operation.costs.actionType === "interrupt" ? operation.costs.actions : 0;
          costs.currentActions += operation.costs.actionType === "current" ? operation.costs.actions : 0;
          costs.stamina += operation.costs.stamina;
          costs.shp += operation.costs.shp;
          costs.dhp += operation.costs.dhp;
          continue;
        }
        else 
          break;
      }
    }
  }

  static async executeSpecificOperation(activity, operationId, options = {}) {
    const operation = activity.system.operations.find(op => op.id === operationId);
    
    if (!operation) {
      console.warn(`Operation with ID "${operationId}" not found in activity.`);
      return false;
    }

    if (operation.executeImmediately) {
      return await ops[operation.type].execute(activity, operation, options);
    } else {
      console.warn(`Operation "${operation.type}" does not execute immediately.`);
      return false;
    }
  }
}