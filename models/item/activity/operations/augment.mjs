import { BaseOperation } from "../base-operation.mjs";

export class consumeResource extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();

    return {
      consumeResource: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField({ required: true, nullable: false, blank: false, initial: "consumeResource" }),
        character: new foundry.data.fields.StringField({ required: true, nullable: false, blank: true }),
        slot: new foundry.data.fields.StringField({ required: true, nullable: false, blank: true }),
        ...baseActivity,
      })
    }
  }

  static async getChoices(activity) {
    const choices = {
      character: {
        ...game.actors.reduce((acc, actor) => {
          if (actor.type === "character") {
            acc[actor.id] = actor.name;
          }
          return acc;
        }, {}),

        ...activity.operations.reduce((acc, operation) => {
          if (operation.type === "selectOption") {
            acc[operation.id] = `Inherit from ${operation.name}`;
          }
          return acc;
        }, {})
      },

      slot: {
        head: "Head",
        neck: "Neck",
        chest: "Chest",
        back: "Back",
        hands: "Hands",
        ring: "Ring",
        waist: "Waist",
        feet: "Feet",
        ...activity.operations.reduce((acc, operation) => {
          if (operation.type === "selectOption") {
            acc[operation.id] = `Inherit from ${operation.name}`;
          }
          return acc;
        }, {})
      }
    }

    return choices;
  }

  static async execute(activity, operation, options = {}) {
    const characterSelect = foundry.applications.fields.createSelectInput({
      name: "character",
      options: [...game.actors.filter(actor => actor.type === "character").map(actor => ({
        value: actor.id,
        label: actor.name
      }))],
      type: "single",
      sort: true,
    });

    const slotSelect = foundry.applications.fields.createSelectInput({
      name: "slot",
      options: [
        { value: "head", label: "Head" },
        { value: "neck", label: "Neck" },
        { value: "chest", label: "Chest" },
        { value: "back", label: "Back" },
        { value: "hands", label: "Hands" },
        { value: "ring", label: "Ring" },
        { value: "waist", label: "Waist" },
        { value: "feet", label: "Feet" }
      ],
      type: "single",
      sort: true,
    });

    const typeSelect = foundry.applications.fields.createSelectInput({
      name: "type",
      options: [
        { value: "augment", label: "Augment" },
        { value: "deaugment", label: "De-augment" }
      ],
      type: "single",
      sort: true,
    });

    const container = document.createElement("div");
    container.appendChild(document.createTextNode("Select Character:"));
    container.appendChild(characterSelect);
    container.appendChild(document.createTextNode("Select Slot:"));
    container.appendChild(slotSelect);
    container.appendChild(document.createTextNode("Select Type:"));
    container.appendChild(typeSelect);
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "10px";

    const result = await new Promise((resolve) => {
      new foundry.applications.api.DialogV2({
        window: { title: "Select options" },
        content: container.outerHTML,
        buttons: [{
          action: "submit", 
          label: "Submit",
          icon: "fas fa-check",
          callback: (event, button, dialog) => dialog
        }],
        submit: resolve
      }).render({ force: true });
    });

    const character = game.actors.get(result.querySelector("select[name='character']").value);
    const slot = result.querySelector("select[name='slot']").value;
    const type = result.querySelector("select[name='type']").value;

    const slotData = character.system.augmentSlots[slot];
    const equipped = slotData.equipped;
    const capacity = slotData.capacity;

    return true;
  }
}