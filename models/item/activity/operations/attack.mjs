import { DamageHandler } from "../../../../system/damage.mjs";
import { rangeTest } from "../../../../system/helpers/rangeTest.mjs";
import { DamageInstance } from "../../../../system/oldDamage.mjs";
import { BaseOperation } from "../base-operation.mjs";

const fields = foundry.data.fields;

export class attack extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();
    
    return {
      attack: new fields.SchemaField({
        type: new fields.StringField({ required: true, nullable: false, blank: false, initial: "attack" }),
        damages: new fields.ArrayField(new fields.SchemaField({
          formula: new fields.StringField({ required: true, nullable: false, blank: false, initial: "1d4" }),
          damageType: new fields.StringField({ required: true, nullable: false, blank: false, initial: "physical" }),
          modifier: new fields.StringField({ required: false, nullable: true, blank: true }),
          useWeapon: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        }), { required: true, nullable: false, initial: [
          { formula: "1d4", damageType: "physical", modifier: "", useWeapon: false,}
        ] }),
        modifier: new fields.StringField({ required: false, nullable: true, blank: true }),
        range: new fields.StringField({ required: false, nullable: true, blank: true, initial: "0/0", validate: (v) => {
          const regex = /^\d+\s*\/\s*\d+$/;
          return regex.test(v);
        } }),
        randomTarget: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        penetrate: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        nonLethal: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        exhausting: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        ignoreSHP: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        ...baseActivity
      })
    }
  }

  static _toObject() {
    return {
      type: "attack",
      damages: [{ formula: "1d4", damageType: "physical", penetrate: false, nonLethal: false }],
      ...BaseOperation._toObject()
    }
  }

  static async getChoices(activity) {
    return {
      ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
        acc[key] = game.i18n.localize(value.label);
        return acc;
      }, {}),

      ...activity.operations.reduce((acc, operation) => {
        if (operation.type === "selectOption") {
          acc[operation.id] = `Inherit from ${operation.name}`;
        }
        return acc;
      }, {})    
    }
  }

  static async addDamage(activity, operationId) {
    const operations = activity.parent.system.operations || [];
    
    await activity.parent.update({
      "system.operations": operations.map(op => {
        if (op.id === operationId) {
          return {
            ...op,
            damages: [...op.damages, { formula: "1d4", damageType: "physical", penetrate: false, nonLethal: false }],
          };
        }
        return op;
      })
    });
  }

  static async removeDamage(activity, operationId, damageIndex) {
    const operations = activity.parent.system.operations || [];
    
    await activity.parent.update({
      "system.operations": operations.map(op => {
        if (op.id === operationId) {
          return {
            ...op,
            damages: op.damages || [],
            damages: op.damages.filter((_, index) => index !== damageIndex),
          };
        }
        return op;
      })
    });
  }

  static async execute(activity, operation, options = {}) {
    const actor = activity.parent || game.actors.get(options.actorId) || game.user.character;
    if (!actor && !game.user.isGM) {
      console.warn("No actor found for attack operation.");
      return;
    }

    if (game.settings.get("utopia", "targetRequired") && game.user.targets.size === 0 && !game.user.isGM) {
      ui.notifications.warn(game.i18n.localize("UTOPIA.Activity.Attack.NoTargets"));
      return;
    }

    let targets = game.user.targets.size > 0 ? Array.from(game.user.targets) : [game.user.character] || [game.actors.get(options.actorId)] || [];    
    if (options.target) {
      targets = [game.canvas.scene.tokens.find(t => t.id === options.target)];
    }

    const targetsInRange = targets.filter(target => {
      if (operation.range) {
        return rangeTest({ range: operation.range, target: target, trait: actor.system.accuracyTrait });
      }
      return true;
    });

    const damages = [];

    for (const attackDamage of operation.damages.filter(d => d.useWeapon)) {
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
      const nonLethal = weapon.system.nonLethal ?? false;
      const penetrate = weapon.system.penetrative ?? false;
      const modifier = weapon.system.damage?.modifier ?? undefined;
      const ignoreSHP = weapon.system.ignoreSHP ?? false;
      const exhausting = weapon.system.exhausting ?? false;

      for (const damage of weaponDamages) {
        let formula = damage.formula;
        if (modifier && modifier !== "") 
          formula = `${formula} + ${modifier}`;
        
        damages.push({
          formula: `(${formula}) ${attackDamage.formula}`,
          type: damage.type,
          options: {
            penetrate: penetrate,
            nonLethal: nonLethal,
            ignoreSHP: ignoreSHP,
            exhausting: exhausting,
          }
        });
      }
    }

    const penetrate = operation.penetrate ?? false;
    const nonLethal = operation.nonLethal ?? false;
    const ignoreSHP = operation.ignoreSHP ?? false;
    const exhausting = operation.exhausting ?? false;
    const randomTarget = operation.randomTarget ?? false;

    for (const damage of operation.damages.filter(d => !d.useWeapon)) {
      let modifiedFormula = damage.formula.replace(/(#[a-zA-Z0-9]+)/g, (match) => {
        const operation = activity.system.operations.find(op => op.key === match.replace('#', ''));
        return operation ? operation.value : match;
      });

      damages.push({
        formula: modifiedFormula,
        type: damage.damageType,
        options: {
          penetrate: damage.penetrate,
          nonLethal: damage.nonLethal,
          randomTarget: damage.randomTarget,
        }
      })
    }

    new DamageHandler({
      damages,
      targets: targetsInRange,
      source: activity,
    })

    return true;
  }
}