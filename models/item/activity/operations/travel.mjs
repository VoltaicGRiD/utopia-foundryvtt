import { UtopiaChatMessage } from "../../../../documents/chat-message.mjs";
import { BaseOperation } from "../base-operation.mjs";

export class travel extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();
    
    return {
      travel: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField({ required: true, nullable: false, blank: false, initial: "travel" }),
        speed: new foundry.data.fields.StringField({ required: true, nullable: false, blank: true }),
        modifier: new foundry.data.fields.StringField({ required: true, nullable: false, blank: true }),
        ...baseActivity
      })
    }
  }

  static async getChoices(activity) {
    return {
      land: "Land",
      air: "Air",
      water: "Water",
      
      ...activity.operations.reduce((acc, operation) => {
        if (operation.type === "selectOption") {
          acc[operation.id] = `Inherit from ${operation.name}`;
        }
        return acc;
      }, {})
    }
  }

  static async execute(activity, operation, options = {}) {
    const travel = activity.parent.system.travel;
    let type = operation.speed;
    if (activity.system.operations.some(op => op.id === type)) {
      const operation = activity.system.operations.find(op => op.id === type);
      type = operation.value;
    }
    const distance = await new Roll(`${travel[type].speed} ${operation.modifier}`).evaluate();

    const types = {
      land: "Land",
      air: "Air",
      water: "Water",
    }

    // TODO - Find a way to implement this
    UtopiaChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: activity.parent || game.user }),
      content: `You travel ${types[type]} for ${distance} meters.`,
    });

    return true;
  }
}