import { BaseOperation } from "../base-operation.mjs";

const fields = foundry.data.fields;

export class attackResponse extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();
    
    return {
      attackResponse: new fields.SchemaField({
        type: new fields.StringField({ required: true, nullable: false, blank: false, initial: "attackResponse" }),
        countsAs: new fields.StringField({ required: true, nullable: false, blank: false, initial: "block" }),
        useWeapon: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        formula: new fields.StringField({ required: true, nullable: false, blank: true }),
        modifier: new fields.StringField({ required: false, nullable: true, blank: true }),
        ...baseActivity
      })
    }
  }

  static async getChoices(activity) {
    return {
      block: game.i18n.localize("UTOPIA.Items.Activity.AttackResponse.Block"),
      dodge: game.i18n.localize("UTOPIA.Items.Activity.AttackResponse.Dodge"),
      // counterAttack: game.i18n.localize("UTOPIA.Items.Activity.AttackResponse.CounterAttack"),
      // counterDamage: game.i18n.localize("UTOPIA.Items.Activity.AttackResponse.CounterDamage")
    }
  }

  static async execute(activity, operation, options = {}) {
    if (operation.useWeapon) {
      const slots = actor.system.handheldSlots.equipped;
      for (const slot of slots) {
        const item = actor.items.get(slot);
        const weapons = [];
        if (item && item.type === "gear") {
          weapons.push(item);          
        }
      }

      const select = await foundry.applications.fields.createSelectInput({
        options: weapons.map(weapon => {
          return {
            label: `${weapon.name} (${weapon.system.damages.map(d => `${d.formula} ${d.type}`).join(", ")})`,
            value: weapon.id,
          };
        }),
      });

      const selectedWeapon = await foundry.applications.api.DialogV2.prompt({
        title: game.i18n.localize("UTOPIA.Activity.Attack.SelectWeapon"),
        content: select.outerHTML,
        render: true,
        ok: {
          label: "OK",
          callback: (event, button, dialog) => dialog.querySelector("select")
        }
      }).then((result) => {
        return result.selectedOptions[0].value;
      }).catch(err => {
        console.error("Error selecting weapon:", err);
      });

      // Set the activity's 'operationData' to the selected weapon
      await activity.update({
        "system.operationData": foundry.utils.mergeObject(activity.system.operationData, {
          [operation.id]: {
            weapon: selectedWeapon,
          }
        })
      })

      const weapon = actor.items.get(selectedWeapon);
      const weaponDamages = weapon.system.damages;
      const formula = weaponDamages.map(d => d.formula).join(" + ");
      const roll = await new Roll(formula, { ...weapon.getRollData(), ...activity.getRollData() }).evaluate();
      const total = roll.total;

      await activity.update({
        "system.operationData": foundry.utils.mergeObject(activity.system.operationData, {
          [operation.id]: {
            weapon: selectedWeapon,
            roll: roll,
            total: total,
          }
        })
      })
      return true;
    }
    else if (operation.formula && operation.formula !== "") {
      const modifiedFormula = operation.formula.replace(/(#[a-zA-Z0-9]+)/g, (match) => {
        const operation = activity.system.operations.find(op => op.key === match.replace('#', ''));
        return operation ? operation.value : match;
      });
      if (operation.modifier && operation.modifier !== "") {
        const roll = await new Roll(`${modifiedFormula} + ${operation.modifier}`, { ...activity.getRollData() }).evaluate();
        const total = roll.total;

        await activity.update({
          "system.operationData": foundry.utils.mergeObject(activity.system.operationData, {
            [operation.id]: {
              roll: roll,
              total: total,
            }
          })
        })
        return true;
      }
      const roll = await new Roll(modifiedFormula, { ...activity.getRollData() }).evaluate();
      const total = roll.total;
      await activity.update({
        "system.operationData": foundry.utils.mergeObject(activity.system.operationData, {
          [operation.id]: {
            roll: roll,
            total: total,
          }
        })
      })
      return true;
    }
    else {
      const roll = await new Roll(operation.modifier, { ...activity.getRollData() }).evaluate();
      const total = roll.total;
      await activity.update({
        "system.operationData": foundry.utils.mergeObject(activity.system.operationData, {
          [operation.id]: {
            roll: roll,
            total: total,
          }
        })
      })
      return true;
    }
  }
}
