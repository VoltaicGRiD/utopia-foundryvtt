import { BaseOperation } from "../base-operation.mjs";

const fields = foundry.data.fields;

export class condition extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();

    return {
      condition: new fields.SchemaField({
        type: new fields.StringField({ required: true, nullable: false, blank: false, initial: "condition" }),
        conditions: new fields.ArrayField(new fields.SchemaField({
          key: new fields.StringField({ required: true, nullable: false, blank: true }),
          comparison: new fields.StringField({ required: true, nullable: false, blank: true, initial: "==", validate: (v) => ["==", "!=", "<", ">", "<=", ">=", "has", "!has"].includes(v) }),
          value: new fields.StringField({ required: true, nullable: false, blank: true }),
          priority: new fields.NumberField({ required: true, nullable: false, initial: 1 })
        })),
        proceedAnyway: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        ...baseActivity
      })
    }
  }

  static keys(activity) {
    const activityParent = activity.parent;
    const parentRollData = activityParent?.getRollData() || {};
    const parentData = activityParent?.system || {};
    const activityData = activity.system || {};
    const parentItems = activityParent?.items || [];

    return Object.keys({
      ...parentRollData, // Need to separate to be able to identify between data, and rollData, since keys could be the same
      ...parentData,
      ...activityData,
      ...activity.getRollData(),
      ...parentItems.reduce((acc, item) => {
        return { ...acc, ...item.getRollData() };
      }, {})
    });
  }

  static async addCondition(activity, operationId) {
    const operations = activity.parent.system.operations || [];
    
    await activity.parent.update({
      "system.operations": operations.map(op => {
        if (op.id === operationId) {
          return {
            ...op,
            conditions: [...op.conditions, { key: "", comparison: "==", value: "" }],
          };
        }
        return op;
      })
    });
  }

  static async removeCondition(activity, operationId, conditionIndex) {
    const operations = activity.parent.system.operations || [];
    
    await activity.parent.update({
      "system.operations": operations.map(op => {
        if (op.id === operationId) {
          return {
            ...op,
            conditions: op.conditions || [],
            conditions: op.conditions.filter((_, index) => index !== conditionIndex),
          };
        }
        return op;
      })
    });
  }

  static processConditions(conditions, activity) {
    const keys = this.keys(activity);
    
    return conditions.map(condition => {
      const { key, comparison, value, priority } = condition;
      
      if (!keys.includes(key)) {
        console.warn(`Condition key "${key}" not found in activity roll data.`);
        return null;
      }
      
      const activityValue = activity.system[key] || activity.getRollData()[key];
      
      if (activityValue === undefined) {
        console.warn(`Activity value for key "${key}" is undefined.`);
        return null;
      }

      let conditionMet = false;

      switch (comparison) {
        case "==":
          conditionMet = activityValue == value;
          break;
        case "!=":
          conditionMet = activityValue != value;
          break;
        case "<":
          conditionMet = activityValue < value;
          break;
        case ">":
          conditionMet = activityValue > value;
          break;
        case "<=":
          conditionMet = activityValue <= value;
          break;
        case ">=":
          conditionMet = activityValue >= value;
          break;
        case "has":
          if (Array.isArray(activityValue) || typeof activityValue === "string" || typeof activityValue === "Set") {
            if (typeof activityValue === "Set") {
              activityValue = Array.from(activityValue);
            }
            conditionMet = activityValue.includes(value);
          }
          break;
        case "!has":
          if (Array.isArray(activityValue) || typeof activityValue === "string" || typeof activityValue === "Set") {
            if (typeof activityValue === "Set") {
              activityValue = Array.from(activityValue);
            }
            conditionMet = !activityValue.includes(value);
          }
          break;
        default:
          console.warn(`Unknown comparison operator "${comparison}".`);
      }
      return { key, comparison, value, priority, met: conditionMet };
    }).filter(condition => condition !== null);
  }

  static async execute(activity, operation, options = {}) {
    const { conditions, proceedAnyway } = operation;
    
    if (!conditions || conditions.length === 0) {
      console.warn("No conditions defined for this operation.");
      return true; // No conditions to check, proceed anyway
    }

    const processedConditions = this.processConditions(conditions, activity);

    if (processedConditions.length === 0) {
      console.warn("No valid conditions found after processing.");
      return true; // No valid conditions to check, proceed anyway
    }

    const failedConditions = processedConditions.filter(condition => !condition.met);

    if (failedConditions.length > 0) {
      console.warn("Some conditions were not met:", failedConditions);
      if (proceedAnyway) {
        console.warn("Proceeding anyway due to 'proceedAnyway' flag.");
        return true;
      }
      return false; // Conditions not met and not allowed to proceed
    }

    return true; // All conditions met, proceed with the operation
  }
}