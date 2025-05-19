import { BaseOperation } from "./base-operation.mjs";
import * as ops from "./_module.mjs";
import * as sheets from "../../../applications/activity/operations/_module.mjs";
import { isNumeric } from "../../../system/helpers/isNumeric.mjs";

export class Activity extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "UTOPIA.Items.Activity"];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};

    schema.name = new fields.StringField({ required: true, nullable: false, initial: "" });
    schema.description = new fields.StringField({ required: true, nullable: false, initial: "" });
    schema.origin = new fields.DocumentUUIDField({ required: false, nullable: true, initial: null });

    schema.replacesBaseAction = new fields.StringField({ required: true, nullable: false, blank: true });
    
    schema.operations = new fields.ArrayField(new fields.TypedSchemaField({
      ...ops.selectOperation.defineSchema(),
      ...ops.selectOption.defineSchema(),
      ...ops.heal.defineSchema(),
      ...ops.attack.defineSchema(),
      ...ops.condition.defineSchema(),
      ...ops.castSpell.defineSchema(),
      ...ops.consumption.defineSchema(),
      ...ops.variable.defineSchema(),
      ...ops.check.defineSchema(),
      ...ops.test.defineSchema(),
      ...ops.use.defineSchema(),
      ...ops.setFlag.defineSchema(),
      ...ops.createResource.defineSchema(),
      ...ops.consumeResource.defineSchema(),
      ...ops.travel.defineSchema(),
      ...ops.generic.defineSchema(),
      ...ops.attackResponse.defineSchema(),
      ...ops.target.defineSchema(),
    }), { required: true, nullable: false, initial: [] });
    schema.operationData = new fields.ObjectField({ required: true, nullable: false, initial: {} });  

    return schema;
  }

  get baseActions() {
    return ["takeCover", "aim", "grapple", "deepBreath", "weaponlessAttack", "block", "dodge", "travel", "stealth", "leap", "scaleSame", "scaleLarger", "holdAction", "assist"];
  }

  operationFields(operation) {
    if (ops[operation]) {
      return ops[operation].defineSchema()[operation].fields || null;
    } else {
      console.warn(`Operation "${operation}" is not defined.`);
      return null;
    }
  }

  async operationChoices(operation) {
    if (ops[operation]) {
      if (typeof ops[operation].getChoices !== "function") {
        console.warn(`Operation "${operation}" does not have a getChoices method.`);
        return null;
      }
      return await ops[operation].getChoices(this) || null;
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
      "castSpell": sheets.CastSpellSheet,
      "attack": sheets.AttackSheet,
      "heal": sheets.HealSheet, 
      "selectOperation": sheets.SelectOperationSheet,
      "consumption": sheets.ConsumptionSheet,
      "condition": sheets.ConditionSheet,
      "check": sheets.CheckSheet,
      "test": sheets.TestSheet,
      "use": sheets.UseSheet,
      "setFlag": sheets.SetFlagSheet,
      "createResource": sheets.CreateResourceSheet,
      "consumeResource": sheets.ConsumeResourceSheet,
      "variable": sheets.VariableSheet,
      "travel": sheets.TravelSheet,
      "selectOption": sheets.SelectOptionSheet,
      "generic": sheets.GenericSheet,
      "attackResponse": sheets.AttackResponseSheet,
      "target": sheets.TargetSheet,
      //"variable": VariableSheet,
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
    return ["attack", "attackResponse", "heal", "travel", "consumption", "castSpell", "use", "selectOption", "generic", "selectOperation", "condition", "target", "test", "check", "setFlag", "variable", "createResource", "consumeResource"];
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

    var fullExecution = true;

    // Create a running tally of costs for each operation that executes successfully
    const costs = { 
      turnActions: 0,
      interruptActions: 0,
      currentActions: 0,
      stamina: 0,
      shp: 0,
      dhp: 0
    }
  
    await this.parent.update({
      "system.operationData": {}
    })

    for (const operation of operations) {
      const rollData = this.parent.getRollData();
      if (this.operationData['target']) 
        rollData['target'] = this.operationData['target'];

      if (operation.executeImmediately) {
        if (await ops[operation.type].execute(this.parent, operation, {...options, rollData})) {
          if (operation.type === "attack" && operation.damages.some(d => d.useWeapon)) {
            const weapon = this.parent.items.get(this.operationData[operation.id].weapon);
            rollData["inherit"] = weapon.system.actions;
          }
          else if (operation.type === "attackResponse" && operation.useWeapon) {
            const weapon = this.parent.items.get(this.operationData[operation.id].weapon);
            rollData["inherit"] = weapon.system.actions;
          }

          const actions = isNumeric(operation.costs.actions) ? parseInt(operation.costs.actions) : await new roll(operation.costs.actions, this.parent.getRollData()).total;
          costs.turnActions = operation.costs.actionType === "turn" ? actions : 0;
          costs.interruptActions = operation.costs.actionType === "interrupt" ? actions : 0;
          costs.currentActions = operation.costs.actionType === "current" ? actions : 0;
          costs.stamina = isNumeric(operation.costs.stamina) ? parseInt(operation.costs.stamina) : await new roll(operation.costs.stamina, this.parent.getRollData()).total;

          await this.parent.parent._consumeResources(operation.costs.actionType, operation.costs.actions, operation.costs.stamina);

          continue;
        }
        else {
          fullExecution = false;
          break;
        }
      }
    }

    // If all operations executed successfully, update the parent actor with the costs
    // if (fullExecution) {
    //   await this.parent.update({
    //     "system.actions.turnActions": this.parent.system.actions.turnActions - costs.turnActions,
    //     "system.actions.interruptActions": this.parent.system.actions.interruptActions - costs.interruptActions,
    //     "system.actions.currentActions": this.parent.system.actions.currentActions - costs.currentActions,
    //     "system.stamina": this.parent.system.stamina - costs.stamina,
    //     "system.shp": this.parent.system.shp - costs.shp,
    //     "system.dhp": this.parent.system.dhp - costs.dhp
    //   });
    // }
  }

  async executeSpecificOperation(operationId, options = {}) {
    const operation = this.operations.find(op => op.id === operationId);
    
    if (!operation) {
      console.warn(`Operation with ID "${operationId}" not found in activity.`);
      return false;
    }

    if (!operation.executeImmediately) {
      const rollData = this.parent.getRollData();
      if (options.target) {
        rollData['target'] = game.user.targets.get(options.target).actor.getRollData();
      }

      await ops[operation.type].execute(this.parent, operation, {...options, rollData });
      await this.parent.parent._consumeResources(operation.costs.actionType, operation.costs.actions, operation.costs.stamina);
      await this.continueExecutionFrom(operationId, {...options, rollData });
      return true;
    } else {
      console.warn(`Operation "${operation.type}" executes immediately.`);
      return false;
    }
  }

  async continueExecutionFrom(operationId, options = {}) {
    const index = this.operations.findIndex(op => op.id === operationId);
    for (let i = index + 1; i < this.operations.length; i++) {
      const rollData = this.parent.getRollData();
      if (options.target) {
        rollData['target'] = game.user.targets.get(options.target).actor.getRollData();
      }

      const operation = this.operations[i];
      if (operation.executeImmediately) {
        if (await ops[operation.type].execute(this.parent, operation, {...options, rollData})) {
          await this.parent.parent._consumeResources(operation.costs.actionType, operation.costs.actions, operation.costs.stamina);
          continue;
        } else {
          console.warn(`Operation "${operation.type}" failed to execute.`);
          return false;
        }
      }
      else {
        console.warn(`Operation "${operation.type}" does not execute immediately.`);
        return false;
      }
    }
  }

  async executeOnTarget(operationId, target, options = {}) {
    const operation = this.operations.find(op => op.id === operationId);
    game.user.targets.get(target);
  }

  prepareDerivedData() {
    const turnActions = this.operations.reduce((sum, op) => {
      if (op.costs?.actionType === "turn") {
        if (isNumeric(op.costs.actions)) 
          return sum + parseInt(op.costs.actions);
        else 
          return sum + new Roll(op.costs.actions, this.parent.getRollData()).evaluateSync().total;
      }
      return sum;
    }, 0);
    const interruptActions = this.operations.reduce((sum, op) => {
      if (op.costs?.actionType === "interrupt") {
        if (isNumeric(op.costs.actions)) 
          return sum + parseInt(op.costs.actions);
        else 
          return sum + new Roll(op.costs.actions, this.parent.getRollData()).evaluateSync().total;
      }
      return sum;
    }, 0);
    const currentActions = this.operations.reduce((sum, op) => {
      if (op.costs?.actionType === "current") {
        if (isNumeric(op.costs.actions)) 
          return sum + parseInt(op.costs.actions);
        else 
          return sum + new Roll(op.costs.actions, this.parent.getRollData()).evaluateSync().total;
      }
      return sum;
    }, 0);
    const stamina = this.operations.reduce((sum, op) => {
      if (isNumeric(op.costs.stamina)) 
        return sum + parseInt(op.costs.stamina);
      else 
        return sum + new Roll(op.costs.stamina, this.parent.getRollData()).evaluateSync().total;
    }, 0);

    this.costs = {
      turnActions,
      interruptActions,
      currentActions,
      stamina
    }
  }
}