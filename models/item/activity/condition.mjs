import { BaseOperation } from "./base-activity.mjs";

const fields = foundry.data.fields;

export class condition extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();

    return {
      condition: new fields.SchemaField({
        type: new fields.StringField({ required: true, nullable: false, blank: false, initial: "condition" }),
        conditions: new fields.ArrayField(new fields.SchemaField({
          key: new fields.StringField({ required: true, nullable: false, blank: false }),
          comparison: new fields.StringField({ required: true, nullable: false, blank: false, initial: "==", validate: (v) => ["==", "!=", "<", ">", "<=", ">=", "has", "!has"].includes(v) }),
          value: new fields.StringField({ required: true, nullable: false, blank: false }),
          priority: new fields.NumberField({ required: true, nullable: false, initial: 1 })
        })),
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
}