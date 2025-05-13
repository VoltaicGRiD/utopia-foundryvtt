import { BaseOperation } from "../base-operation.mjs";

export class use extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();

    return {
      use: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField({ required: true, nullable: false, blank: false, initial: "use" }),
        useItem: new foundry.data.fields.StringField({ required: false, nullable: true, initial: null }),
        useSlot: new foundry.data.fields.StringField({ required: false, nullable: true, initial: null }),
        useSlotLimit: new foundry.data.fields.NumberField({ required: true, nullable: false, initial: 1 }),
        useSlotIndex: new foundry.data.fields.NumberField({ required: true, nullable: false, initial: 0 }),
        useItemActions: new foundry.data.fields.BooleanField({ required: true, nullable: false, initial: true }),
        maximizeOutput: new foundry.data.fields.BooleanField({ required: true, nullable: false, initial: false }), 
        ...baseActivity,
      })
    }
  }

  static _toObject() {
    return {
      type: "use",
      testType: "",
      ...BaseOperation._toObject()
    }
  }

  static getChoices(activity) {
    return {
      items: {
        gear: {
          name: "Gear", // TODO: Localize
          choices: activity.parent.parent?.items?.filter(i => i.type === "gear").reduce((acc, item) => {
            acc[item.id] = {
              group: "Gear", // TODO: Localize
              label: item.name,
            };
            return acc;
          }, {}),
        },
        generic: {
          name: "Generic", // TODO: Localize
          choices: activity.parent.parent?.items?.filter(i => i.type === "generic").reduce((acc, item) => {
            acc[item.id] = {
              group: "Generic", // TODO: Localize
              label: item.name,
            };
            return acc;
          }, {}),
        },
        talent: {
          name: "Talent", // TODO: Localize
          choices: activity.parent.parent?.items?.filter(i => i.type === "talent").reduce((acc, item) => {
            acc[item.id] = {
              group: "Talent", // TODO: Localize
              label: item.name,
            };
            return acc;
          }, {}),
        },
        specialistTalent: {
          name: "Specialist Talent", // TODO: Localize
          choices: activity.parent.parent?.items?.filter(i => i.type === "specialistTalent").reduce((acc, item) => {
            acc[item.id] = {
              group: "Specialist Talent", // TODO: Localize
              label: item.name,
            };
            return acc;
          }, {}),
        },
        action: {
          name: "Action", // TODO: Localize
          choices: activity.parent.parent?.items?.filter(i => i.type === "action").reduce((acc, item) => {
            acc[item.id] = {
              group: "Action", // TODO: Localize
              label: item.name,
            };
            return acc;
          }, {}),
        },

        other: {
          name: "Other", // TODO: Localize
          choices: activity.operations.reduce((acc, operation) => {
            if (operation.type === "selectOption") {
              acc[operation.id] = {
                label: `Inherit from ${operation.name}`
              }
            }
            return acc;
          }, {})
        }
      },
      
      slots: {
        slots: {
          name: "Slots",
          choices: {
            "handheld": "Handheld",
            "head": "Head", 
            "neck": "Neck",
            "chest": "Chest",
            "back": "Back",
            "waist": "Waist",
            "hands": "Hands",
            "ring": "Ring",
            "feet": "Feet",

            ...activity.operations.reduce((acc, operation) => {
              if (operation.type === "selectOption") {
                acc[operation.id] = `Inherit from ${operation.name}`;
              }
              return acc;
            }, {})   
          },
        }
      },
    }
  }

  static async execute(activity, operation, options = {}) {
    const useItem = operation.useItem;
    const useSlot = operation.useSlot;

    let actionCost = operation.costs.actions || 0;
    
    if (!useItem && !useSlot) {
      console.error("Missing useItem or useSlot in operation:", operation);
      return false;
    }

    if (useItem) {
      const item = activity.parent.items.get(operation.useItem);
      if (!item) {
        console.error("Item not found for use operation:", operation.useItem);
        return;
      }

      actionCost += item.system.artifice.actions || item.system.actions || item.system.costs.actions || 0;
      const actionsAvailable = activity.parent.system.turnActions.available;
      if (actionsAvailable < actionCost) {
        console.error("Not enough actions available to use item:", operation.useItem);
        return false;
      }

      try { 
        await item.use({ maximizeOutput: operation.maximizeOutput });
        return true;
      } catch (error) {
        item.sheet.render(true);
        return true;
      }
    }
    
    if (useSlot) {
      let path = activity.parent.system;

      if (useSlot.includes('handheld')) {
        path = path["handheldSlots"].equipped;
      }
      else {
        path = path["equipmentSlots"][useSlot].equipped;
      }

      const itemsInSlot = path.map(i => activity.parent.items.get(i));

      if (operation.useSlotLimit > 1) {
        itemsInSlot.splice(-operation.useSlotLimit, length);

        itemsInSlot.forEach(item => {
          actionCost += item.system.artifice.actions || item.system.actions || item.system.costs.actions || 0;
        })

        const actionsAvailable = activity.parent.system.turnActions.available;
        if (actionsAvailable < actionCost) {
          console.error("Not enough actions available to use item(s):", itemsInSlot);
          return false;
        }  

        for (let i = 0; i < itemsInSlot.length; i++) {
          const item = itemsInSlot[i];
          if (!item) {
            console.error("Item not found for use operation:", operation.useItem);
            return;
          }

          try { 
            await item.use({ maximizeOutput: operation.maximizeOutput });
          } catch (error) {
            item.sheet.render(true);
          }
        }

        return true;
      }
      else if (operation.useSlotLimit === 0) {
        itemsInSlot.forEach(item => {
          actionCost += item.system.artifice.actions || item.system.actions || item.system.costs.actions || 0;
        })

        const actionsAvailable = activity.parent.system.turnActions.available;
        if (actionsAvailable < actionCost) {
          console.error("Not enough actions available to use item(s):", itemsInSlot);
          return false;
        }

        for (let i = 0; i < itemsInSlot.length; i++) {
          const item = itemsInSlot[i];
          if (!item) {
            console.error("Item not found for use operation:", operation.useItem);
            return;
          }

          try { 
            await item.use({ maximizeOutput: operation.maximizeOutput });
          } catch (error) {
            item.sheet.render(true);
          }
        }

        return true;
      }

      else {
        let item = itemsInSlot[operation.useSlotIndex] || itemsInSlot[0];
        
        if (!item) {
          item = itemsInSlot[0]; // Fallback to the first item if the index is out of bounds
          
          if (!item) {
            console.error("Item not found for use operation:", operation.useItem);
            return;
          }
        }

        actionCost += item.system.artifice.actions || item.system.actions || item.system.costs.actions || 0;

        const actionsAvailable = activity.parent.system.turnActions.available;
        if (actionsAvailable < actionCost) {
          console.error("Not enough actions available to use item:", operation.useItem);
          return false;
        }

        try { 
          await item.use({ maximizeOutput: operation.maximizeOutput });
          return true;
        } catch (error) {
          item.sheet.render(true);
          return true;
        }
      }
    }
  }
}