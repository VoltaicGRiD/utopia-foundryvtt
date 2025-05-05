import { CastSpellSheet } from "../../../applications/activity/operations/cast-spell-sheet.mjs";
import { SelectOperationSheet } from "../../../applications/activity/operations/select-operation-sheet.mjs";
import { ConditionSheet } from "../../../applications/activity/operations/condition-sheet.mjs";
import { AttackSheet } from "../../../applications/activity/operations/attack-sheet.mjs";
import { BaseOperation } from "./base-operation.mjs";
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
      ...ops.castSpell.defineSchema(),
      ...ops.variable.defineSchema(),
    }), { required: true, nullable: false, initial: [] });

    return schema;
  }

  operationFields(operation) {
    if (ops[operation]) {
      return ops[operation].defineSchema()[operation].fields || null;
    } else {
      console.warn(`Operation "${operation}" is not defined.`);
      return null;
    }
  }

  operationChoices(operation) {
    if (ops[operation]) {
      if (typeof ops[operation].getChoices !== "function") {
        console.warn(`Operation "${operation}" does not have a getChoices method.`);
        return null;
      }
      return ops[operation].getChoices(this) || null;
    } else {
      console.warn(`Operation "${operation}" is not defined.`);
      return null;
    }
  }

  async runFunction(operation, func, ...args) {
    if (ops[operation.type] && typeof ops[operation.type][func] === "function") {
      return await ops[operation.type][func](this, operation.id, ...args);
    } else {
      console.warn(`Operation "${operation.type}" or function "${func}" is not defined or not a function.`);
      return null;
    }
  }

  get TYPES() {
    return {
      "castSpell": CastSpellSheet,
      "attack": AttackSheet,
      "selectOperation": SelectOperationSheet,
      "condition": ConditionSheet,
      //"variable": VariableSheet,
      //"selectOption": SelectOptionSheet,
    }
  }

  getOperationSheet(operation) {
    return {
      castSpell: CastSpellSheet,
    } || null;
  }

  getEffects() {
    const effects = this.parent?.effects || [];
    const parentEffects = this.parent?.parent?.effects ?? [];

    return [...effects, ...parentEffects].map(effect => {
      return { uuid: effect.uuid, name: effect.name };
    });
  }

  get allOperations() {
    return ["attack", "castSpell", "selectOperation", "condition"];
  }

  async newOperation(operation) {
    const id = foundry.utils.randomID(16);
  
    const newOp = { id: id, type: operation, 
      name: game.i18n.localize(`UTOPIA.Items.Activity.Operation.${operation}`)
    };
  
    try {
      await this.parent.update({
        "system.operations": [...this.toObject().operations, newOp ]
      });
      return true;
    } catch (error) {
      console.error("Failed to update operations:", error);
      return false;
    }
  }

  async updateOperation(operationId, formData) {
    const operationData = this.operations.find(op => op.id === operationId);
    const newData = foundry.utils.mergeObject(operationData, formData.object);
    console.log("Updating operation:", operationId, newData);
    await this.parent.update({
      "system.operations": this.operations.map(op => op.id === operationId ? newData : op)
    });
  }

  async execute(options = {}) {
    const { operations } = this;

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
        if (await ops[operation.type].execute(this.parent, operation, options)) {
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

  async executeSpecificOperation(operationId, options = {}) {
    const operation = this.operations.find(op => op.id === operationId);
    
    if (!operation) {
      console.warn(`Operation with ID "${operationId}" not found in activity.`);
      return false;
    }

    if (!operation.executeImmediately) {
      return await ops[operation.type].execute(this.parent, operation, options);
    } else {
      console.warn(`Operation "${operation.type}" executes immediately.`);
      return false;
    }
  }

  prepareDerivedData() {
    this.costs = {
      turnActions: this.operations.reduce((sum, op) => sum + (op.costs?.actionType === "turn" ? op.costs.actions : 0), 0), 
      interruptActions: this.operations.reduce((sum, op) => sum + (op.costs?.actionType === "interrupt" ? op.costs.actions : 0), 0),
      currentActions: this.operations.reduce((sum, op) => sum + (op.costs?.actionType === "current" ? op.costs.actions : 0), 0),
      stamina: this.operations.reduce((sum, op) => sum + (op.costs?.stamina || 0), 0),
      shp: this.operations.reduce((sum, op) => sum + (op.costs?.shp || 0), 0),
      dhp: this.operations.reduce((sum, op) => sum + (op.costs?.dhp || 0), 0),
    }
  }
}