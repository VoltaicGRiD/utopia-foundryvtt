import { BaseOperation } from "../base-operation.mjs";

const fields = foundry.data.fields;

export class generic extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();

    return {
      generic: new fields.SchemaField({
        type: new fields.StringField({ required: true, nullable: false, blank: false, initial: "generic" }),
        sendToChat: new fields.BooleanField({ required: true, nullable: false, initial: true }),
        message: new fields.StringField({ required: true, nullable: false, blank: true }), // TODO - Convert / allow HTML ('HTMLField'?)
        ...baseActivity
      })
    }
  }

  static async execute(activity, operation, options = {}) {
    const actor = activity.parent;
    const message = operation.message;
    const sendToChat = operation.sendToChat;

    message.replace(/({actor})/g, actor.name);
    message.replace(/({activity})/g, activity.name);
    message.replace(/({operation})/g, operation.name);
    
    if (sendToChat) {
      UtopiaChatMessage.create({
        content: `<p>${message}</p>`,
        speaker: ChatMessage.getSpeaker({ actor }),
        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      })
    }

    return true;
  }
}