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
          penetrate: new fields.BooleanField({ required: true, nullable: false, initial: false }),
          nonLethal: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        }), { required: true, nullable: false, initial: [
          { formula: "1d4", damageType: "physical", penetrate: false, nonLethal: false }
        ] }),
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

    let instances = [];
    let targets = game.user.targets.size > 0 ? Array.from(game.user.targets) : [game.user.character] || [game.actors.get(options.actorId)] || [];    
    for (const damage of operation.damages) {
      const roll = await new Roll(damage.formula).evaluate();

      for (const target of targets) {
        if (!target || !target.actor) continue; // Skip if no target or target has no actor
        
        // Create a new DamageInstance for each target
        const instance = new DamageInstance({
          type: damage.damageType,
          value: roll.total,
          source: activity,
          target: target.actor,
        }, { 
          penetrate: damage.penetrate, 
          nonLethal: damage.nonLethal 
        });
        
        instances.push(instance);
      }
    }

    for (const instance of instances) {
      if (game.settings.get("utopia", "autoRollAttacks")) 
        return await instance.toFinalMessage();
      return await instance.toMessage();
    }
  }
}