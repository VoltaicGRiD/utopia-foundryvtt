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
  constructor({ type, value, source, target, block, dodged, roll, finalized = false }) {
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
    this.target = target ?? null;
    //this.target = typeof(target) === "object" ? new UtopiaActor(target) : target; // TODO - Convert target and source to use UUIDs
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
    // Add the formula for displaying on chat cards
    this.roll = roll ?? new Roll(`${this.value}`).evaluateSync({strict: false});
    // Find out if the source item is non-lethal
    this.nonLethal = source?.system.nonLethal ?? false;
    // Get percentage values for surface and deep hitpoints adjustments.
    this.shpPercent = 1;
    this.dhpPercent = 1;
    // Check if the damage should bypass defenses.
    this.penetrate = false;
    this.finalized = finalized;
    // Handle blocking
    this.blockTotal = block ?? 0;
    this.dodged = dodged ?? false;

    this.dodgable = this.type.dodge ?? false;
    this.blockable = this.type.block ?? 0 > 0 ? true : false;
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

  async defenses() {
    const target = await fromUuid(this.target);
    const typeKey = this.typeKey;
    if (this.type.armor === false || this.penetrate === true)
      return 0;
    else 
      return target.system.defenses[typeKey];
  }

  async handle(options = {}) {
    if (this.finalized) return this.final;

    const target = await fromUuid(this.target);
    const targetData = {
      shp: target.system.hitpoints.surface.value,
      dhp: target.system.hitpoints.deep.value,
      stamina: target.system.stamina.value,
      defenses: target.system.defenses,
    }

    const appliesTo = this.type.appliesTo ?? "shp";

    if (!(this.roll instanceof Roll)) 
      this.roll = Roll.fromData(this.roll);
    this.rollTooltip = await this.roll.getTooltip();

    // Check if our damage type can be blocked or dodged
    const dodgable = this.type.dodge ?? false;
    const blockPercent = this.type.block ?? 1;

    if (Object.keys(options).includes("block")) {
      const blockRoll = options.blockRoll;
      this.blockTooltip = await blockRoll.getTooltip();
      this.blocked = true;
    }
    
    if (Object.keys(options).includes("dodge")) {  
      const dodgeRoll = options.dodgeRoll;
      this.dodgeTooltip = await dodgeRoll.getTooltip();
      this.dodged = true;
    }

    // If the damage type applies to "shp", we will apply the damage to surface HP.
    if (appliesTo === "shp") {
      // Take the damage (this.value) and apply it to the target's surface HP, any overflow goes to deep HP.
      // When damage overflows, we track the overflow, but also set the surface damage dealt to the maximum possible.
      let overflow = 0;
      let shpDamage = (this.value - await this.defenses() - ((options.block ?? 0) * blockPercent)) * this.shpPercent;
      
      // Check if our damage was dodged. If so, no damage is taken.
      if (dodgable && Object.keys(options).includes("dodged") && options.dodged >= shpDamage) {
        shpDamage = 0;
      }

      // We dealt more damage than the target has surface HP
      if (shpDamage > targetData.shp) {
        overflow = Math.abs(targetData.shp - shpDamage);
        shpDamage = targetData.shp;
      }

      // Apply overflow to deep HP
      const dhpDamage = overflow * this.dhpPercent;

      const absorbedEntirely = shpDamage + dhpDamage <= 0 ? true : false;
      const absorbed = await this.defenses();

      this.final = { shpDamage, dhpDamage, staminaDamage: 0, total: this.value, absorbedEntirely, absorbed };
      return this.final;
    }

    // If the damage type applies to "dhp", we will apply the damage to deep HP.
    if (appliesTo === "dhp") {
      // Deep HP damage is applied directly, we don't have to worry about any overflow
      let dhpDamage = (this.value - await this.defenses() - ((options.block ?? 0) * blockPercent)) * this.dhpPercent;

      // Check if our damage was dodged. If so, no damage is taken.
      if (dodgable && Object.keys(options).includes("dodged") && options.dodged >= dhpDamage) {
        dhpDamage = 0;
      }

      // We dealt more damage than the target has deep HP
      if (dhpDamage > targetData.dhp) {
        dhpDamage = targetData.dhp;
      }

      const absorbedEntirely = dhpDamage <= 0 ? true : false;
      const absorbed = await this.defenses();

      this.final = { shpDamage: 0, dhpDamage, staminaDamage: 0, total: this.value, absorbedEntirely, absorbed };
      return this.final;
    }

    // If the damage type applies to "stamina", we will apply the damage to stamina.
    if (appliesTo === "stamina") {
      // Take the damage (this.value) and apply it to the target's stamina, any overflow goes to deep HP.
      // When damage overflows, we track the overflow, but also set the stamina damage dealt to the maximum possible.
      let overflow = 0;
      let staminaDamage = (this.value);

      // Check if our damage was dodged. If so, no damage is taken.
      // Typically, stamina damage is not dodgable, but we can check for it for homebrew.
      if (dodgable && Object.keys(options).includes("dodged") && options.dodged >= staminaDamage) {
        staminaDamage = 0;
      }

      // We dealt more damage than the target has stamina
      if (staminaDamage > targetData.stamina) {
        overflow = Math.abs(targetData.stamina - staminaDamage);
        staminaDamage = targetData.stamina;
      }

      // Apply overflow to deep HP
      const dhpDamage = overflow * this.dhpPercent;

      const absorbedEntirely = dhpDamage + staminaDamage <= 0 ? true : false;
      const absorbed = await this.defenses();

      this.final = { shpDamage: 0, dhpDamage, staminaDamage, total: this.value, absorbedEntirely, absorbed };
      return this.final;
    } 
  }

  async toMessage() {
    // We have to allow the target to block or dodge before displaying the damage dealt
    this.damageDisplay = game.settings.get("utopia", "displayDamage");

    // If set to 1 - we estimate the damage
    if (this.damageDisplay === 1) {
      const simulation = await Roll.simulate(this.roll._formula, game.settings.get("utopia", "estimateDamageSimulations"));
      // Simulations produce an array of numbers, we add them together, then divide by the number of simulations to get the average
      const total = Math.round(simulation.reduce((a, b) => a + b, 0) / simulation.length);
      this.simulationResult = total;
    }
    const content = await renderTemplate("systems/utopia/templates/chat/damage-card.hbs", { instances: [this], item: this.source, targets: this.targets });

    this.messageInstance = UtopiaChatMessage.create({
      content,
      rolls: [ this.roll ],
      speaker: {
        user: game.user._id,
        speaker: ChatMessage.getSpeaker(),
        content: content
      },
      system: { instance: this, source: this.source, target: this.target }
    });

    return this.messageInstance;
  }

  applyBlock(block) {
    this.blockTotal += block;

    if (this.messageInstance) {
      this.messageInstance.update({
        "system.instance.blockedDamage": this.blockTotal
      });
    }

    this.finalized = true;
  }

  applyDodge(dodge) {
    if (dodge > this.damage) {
      this.dodged = true;
    }

    if (this.messageInstance) {
      this.messageInstance.update({
        "system.instance.dodged": this.dodged
      });
    }

    this.finalized = true;
  }

  finalize() {
    this.finalized = true;
  }

  static fromObject(data) {
    const instance = new DamageInstance(data);

    for (const [key, value] of Object.entries(data)) {
      instance[key] = value;
    }

    return instance;
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