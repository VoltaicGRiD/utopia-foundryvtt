import { UtopiaActor } from "../documents/actor.mjs";
import { UtopiaChatMessage } from "../documents/chat-message.mjs";

export class DamageInstance {
  /**
   * Constructs a DamageInstance.
   * @param {Object} param0 - The damage parameters.
   * @param {Object} param0.type - The damage type.
   * @param {number} param0.value - The incoming damage value.
   * @param {Object} param0.source - The source actor.
   * @param {Object} param0.target - The target actor.
   */
  constructor({ type, value, source, target }) {
    if (typeof type === "string") {
      this.type = JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))[type];
      this.typeKey = type;
    }
    else {
      this.type = type;
      const systemTypes = JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"));
      // Find the key that matches the type object.
      const key = Object.entries(systemTypes).find(([key, config]) => foundry.utils.objectsEqual(config, type))?.[0];
      this.typeKey = key;
    }
    this.value = value ?? 0;
    this.source = source ?? null;
    this.target = typeof(target) === "object" ? new UtopiaActor(target) : target; // TODO - Convert target and source to use UUIDs
    // If no target is provided, use an "Unknown" actor or create a default target.
    if (target === null || target === undefined) {
      if (game.actors.getName("Unknown"))
        this.target = game.actors.getName("Unknown");
      else { // TODO - Implement tracking of configurable damage types
        this.target = {};
        foundry.utils.setProperty(this.target, "system.hitpoints.surface.value", 0);
        foundry.utils.setProperty(this.target, "system.hitpoints.deep.value", 0);
        foundry.utils.setProperty(this.target, "system.defenses.energy", 0);
        foundry.utils.setProperty(this.target, "system.defenses.heat", 0);
        foundry.utils.setProperty(this.target, "system.defenses.chill", 0);
        foundry.utils.setProperty(this.target, "system.defenses.physical", 0);
        foundry.utils.setProperty(this.target, "system.defenses.psyche", 0);
        // Assume target has a stamina value as well.
        foundry.utils.setProperty(this.target, "system.stamina.value", 10);
      }
    }
    // Find out if the source item is non-lethal
    this.nonLethal = source?.system.nonLethal ?? false;
    // Get percentage values for surface and deep hitpoints adjustments.
    this.shpPercent = 1;
    this.dhpPercent = 1;
    // Check if the damage should bypass defenses.
    this.penetrate = false;
    this.finalized = false;
  }

  /**
   * Getter for chat data.
   * Renders the damage-instance template if the damage isn't finalized.
   */
  get chatData() {
    if (!this.finalized) {
      renderTemplate("systems/utopia/templates/chat/damage-instance.hbs", this.final).then((content) => {
        return content;
      });
    }
  }

  /**
   * Getter for the target's defenses based on damage type.
   * Some damage types bypass defenses.
   */
  get defenses() {
    const typeKey = this.typeKey;
    if (this.type.armor === false || this.penetrate === true)
      return 0;
    else 
      return this.target.system.defenses[typeKey];
  }

  /**
   * Getter for the raw damage after subtracting defenses.
   */
  get damage() {
    return this.value - this.defenses;
  }

  /**
   * Getter for adjusted surface hitpoints (shp) after damage is applied.
   */
  get shp() {
    const typeKey = this.typeKey;
    // For specific damage types, compute new surface hitpoints.
    if (["stamina", "restoreStamina", "kinetic", "dhp"].includes(typeKey))
      return 0;
    return (this.target.system.hitpoints.surface.value - this.damage) * this.shpPercent;
  }

  /**
   * Getter for the amount of damage dealt to surface hitpoints.
   */
  get shpDamageDealt() {
    return this.target.system.hitpoints.surface.value - this.shp;
  }

  /**
   * Getter for adjusted deep hitpoints (dhp) if surface hitpoints drop below zero.
   */
  get dhp() {
    if (this.shp > 0) return this.target.system.hitpoints.deep.value;

    const remaining = Math.abs(this.shp) * this.dhpPercent;
    return this.target.system.hitpoints.deep.value - remaining;
  }

  /**
   * Getter for the amount of damage dealt to deep hitpoints.
   */
  get dhpDamageDealt() {
    return this.target.system.hitpoints.deep.value - this.dhp;
  }

  /**
   * Getter for stamina damage.
   * For stamina damage type, only remove what the target currently has.
   * Otherwise, if the source is "exhausting", combine surface and deep damage.
   */
  get stamina() {
    const currentStamina = this.target.system.stamina.value || 0;
    if (this.typeKey === "stamina") {
      // Apply only as much stamina damage as possible.
      return Math.max(currentStamina - this.damage, 0);
    }
    return currentStamina;
  }

  /**
   * Getter for overflow damage that passes from stamina to deep hitpoints.
   * If stamina damage exceeds the target's stamina, the overflow goes to deep hitpoints.
   */
  get deepDamageFromStamina() {
    const currentStamina = this.target.system.stamina.value || 0;
    if (this.typeKey === "stamina") {
      if (currentStamina - this.damage < 0) {
        const overflow = Math.abs(currentStamina - this.damage);
        return overflow * this.dhpPercent;
      }
    }
    return 0;
  }

  /**
   * Getter for actual stamina damage dealt.
   */
  get staminaDamageDealt() {
    return this.target.system.stamina.value - this.stamina;
  }

  /**
   * Getter for the final damage object formatted for chat output.
   * For stamina damage, returns both stamina reduction and deep overflow.
   * For other types, returns the respective damage values.
   */
  get final() {
    return {
      shp: this.shp < 0 ? 0 : this.shp,
      shpDamageDealt: this.shpDamageDealt,
      dhp: this.dhp < 0 ? 0 : this.dhp,
      dhpDamageDealt: this.dhpDamageDealt,
      stamina: this.stamina < 0 ? 0 : this.stamina,
      staminaDamageDealt: this.staminaDamageDealt,
      deepDamageFromStamina: this.deepDamageFromStamina,
      total: this.shpDamageDealt + this.dhpDamageDealt + this.staminaDamageDealt ?? 0 + this.deepDamageFromStamina ?? 0,
      type: JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))[this.type]
    }
  }

  async toMessage() {
    const content = await renderTemplate("systems/utopia/templates/chat/damage-card.hbs", { instances: [this], item: this.source, targets: this.targets });
    return UtopiaChatMessage.create({
      content,
      speaker: {
        user: game.user._id,
        speaker: ChatMessage.getSpeaker(),
        content: content
      },
      system: { instance: this, source: this.source, target: this.target }
    });
  }

  /**
   * Static helper to create multiple DamageInstance objects simultaneously.
   * @param {Array} damagesArray - Array of damage objects ({ type, value }).
   * @param {Object} source - The source actor.
   * @param {Object} target - The target actor.
   * @returns {Array} An array of DamageInstance objects.
   */
  static createMultiple(damagesArray, source, target) {
    return damagesArray.map(dmg => new DamageInstance({
      type: dmg.type,
      value: dmg.value,
      source,
      target
    }));
  }
}