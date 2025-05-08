import { UtopiaActor } from "../documents/actor.mjs";
import { UtopiaChatMessage } from "../documents/chat-message.mjs";

export const DAMAGE_STATE = {
  INIT: 0,
  PENDING: 1,
  RESOLVED: 2,
  CANCELLED: 3,
}

export class Damage {
  constructor({ formula = "", type = "", target, options = {} }) {
    this.formula = formula; // The damage formula (e.g., "2d6 + 3")
    this.type = type; // The type of damage (e.g., "fire", "cold")
    this.options = options; // Additional options for the damage instance
    this.target = target; // The target actor or token
    this.flags = {
      blockers: [], // Actors that have blocked the damage (reduces damage by amount blocked)
      dodgers: [], // Actors that have dodged the damage (negates damage completely)
    }
  }

  async _initialize() {
    // Set up any necessary properties or methods for the damage instance
    this.roll = await this._rollFormula(this.formula);
    this.result = this.roll.total; // The total result of the roll
  }

  async _rollFormula() {
    // Roll the formula using the Roll class from FoundryVTT
    const roll = new Roll(this.formula); // Create a new Roll instance with the formula
    await roll.evaluate(); // Evaluate the roll asynchronously
    return roll; // Return the evaluated roll
  }

  async _handle() {
    // Ensure the roll is completed before handling damage
    if (!this.result) {
      await this._initialize(); // Re-initialize to ensure result is set
    }

    // Handle the damage application to the target
    const targetDefenses = this.target.system.defenses;
    const damageType = this._getDamageTypes()[this.type]; // Get the damage type from the configuration
    if (!damageType) return {}; // If the damage type is not valid, exit
    var targetDamage = this.result - targetDefenses[this.type]; // Calculate the effective damage after applying defenses
    
    // Check for resistances
    if (this.target.system.resistances) {
      const resistances = this.target.system.resistances[damageType] ?? 0; // Get the target's resistances
      targetDamage -= resistances; // Reduce the damage by the resistances
    }

    this.targetDefenses = targetDefenses; // Store the target defenses for later use
    this.targetDamage = targetDamage; // Store the target damage for later use
  }

  static estimate(formula) {
    // Calculate the estimated damage based on the roll and target defenses
    const simulations = game.settings.get("utopia", "estimateDamageSimulations") || 100; // Get the number of simulations from the settings
    return Roll.simulate(formula, simulations);
  }

  _shp({ target, targetDamage }) {
    // Calculate overflow based on the target's current SHP and max SHP
    const targetShp = target.system.hitpoints.surface;
    const overflow = targetShp.value - targetDamage > 0 ? 0 : Math.abs(targetShp - targetDamage);

    // Return the targets new SHP value, and apply overflow to DHP if necessary
    return {
      surface: Math.max(targetShp.value - targetDamage, 0), // Set the new SHP value (cannot go below 0)
      overflow: overflow > 0 ? overflow : 0, // Set the overflow value (if any)
    };
  }

  _dhp({ target, targetDamage }) {
    // DHP cannot overflow, but it can go negative
    const targetDhp = target.system.hitpoints.deep;

    // Return the targets new DHP value, and apply overflow to SHP if necessary
    return {
      deep: targetDhp - targetDamage, // Set the new DHP value (cannot go below 0)
    };
  }

  _stamina({ target, targetDamage }) {
    // Calculate overflow based on the target's current stamina and max stamina
    const targetStamina = target.system.stamina;
    const overflow = targetStamina.value - targetDamage > 0 ? 0 : Math.abs(targetStamina - targetDamage);

    // Return the targets new stamina value, and apply overflow to SHP if necessary
    return {
      stamina: Math.max(targetStamina.value - targetDamage, 0), // Set the new stamina value (cannot go below 0)
      overflow: overflow > 0 ? overflow : 0, // Set the overflow value (if any)
    };
  }

  _getDamageTypes() {
    return {
      ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {}),
    }
  }
}

export class DamageHandler {
  targetDamages = []; // Array to store the target damages
  targetMessages = []; // Array to store the target messages

  constructor({ damages = [], targets = [], state = DAMAGE_STATE.INIT, source = undefined }, options = {}) {
    this.damages = damages; // Array of damage objects
    this.state = state; // State of the damage instance
    this.options = options; // Additional options for the damage instance

    this._initializeSource(source).then(source => {
      this.source = source; // The source of the damage (e.g., the actor or item causing the damage)
      this._initializeTargets(targets).then(targets => {
        for (const target of targets) {
          this.targetDamages.push({ target, damages: damages }); // Initialize the target damages array for each target
        }
        this._initialize(); // Initialize the damage instance after targets are set
      });
    });
  }

  /* ====== Initialization ====== */
  // Initialize the source of the damage
  async _initializeSource(source) {
    if (typeof source === "string")  // Assume the source is a UUID string
      return fromUuid(source);
    return source;
  }

  // Initialize the targets of the damage
  async _initializeTargets(targets) {
    const resolvedTargets = [];
    for (const target of targets) {
      if (typeof target === "string")  // Assume the target is a UUID string
        resolvedTargets.push(await fromUuid(target));
      else if (target instanceof UtopiaActor)  // Check if the target is an actor instance
        resolvedTargets.push(target);
      else if (target instanceof Token)  // Check if the target is a token instance
        resolvedTargets.push(target.actor);  // Get the actor from the token
    }
    return resolvedTargets;
  }

  // Initialize the damage instances
  _initialize() {
    // Set up any necessary properties or methods for the damage instance
    for (const td of this.targetDamages) {
      td.damages = td.damages.map(d => new Damage({ ...d, target: td.target })); // Create a new Damage instance for each damage object
    }

    this.id = foundry.utils.randomID(16);  // Generate a random ID for the handler
    globalThis.utopia.damageHandlers.push(this);  // Add the handler to the global damage handlers array
  
    this.handle(); // Call handle after initialization is complete
  }

  /* ====== Damage Handling ====== */
  // Handle damage application
  async handle() {
    if (!this.targetDamages || this.targetDamages.length === 0) throw new Error("Targets are not initialized yet."); // Ensure targets are defined

    for (const target of this.targetDamages) {
      for (let i = 0; i < target.damages.length; i++) {
        target.damages[i]._handle()
      }
    }

    await this._outputDamageResults();
  }

  /* ====== Outputting Damage Results ====== */
  // Output the damage results to the chat
  async _outputDamageResults() {
    // Check game settings for outputting damage results
    const outputSetting = game.settings.get("utopia", "displayDamage");
    if (outputSetting === 0) return;  // If the setting is 0, do not output anything
    if (outputSetting === 1) {  // If the setting is 1, output an estimate of the damage
      this.message = await this._createEstimateDamageMessage();  // Create an estimate damage message
    } else if (outputSetting === 2) {  // If the setting is 2, output the exact damage results
      this.message = await this._createExactDamageMessage();  // Create an exact damage message
    }

    // TODO - Replace with a socket connection message to the target actors
    await this._createTargetMessages(this.message, this.targetDamages);  // Create target messages based on the damage results

    this.state = DAMAGE_STATE.PENDING;  // Set the state to pending (waiting for actor responses)
  }

  async _createEstimateDamageMessage() {
    const estimateRolls = (await Promise.all(this.damages.map(async (damage) => {
      return Damage.estimate(damage.formula); // Wait for the estimate to be calculated
    }))).reduce((acc, estimate) => acc + estimate, 0); // Sum the estimates for all damages
    const estimate = Math.round(estimateRolls.split(",").map(v => parseInt(v)).reduce((acc, v) => acc + v, 0) / estimateRolls.split(",").length); // Calculate the total estimate

    const content = await renderTemplate("systems/utopia/templates/chat/new-estimate-damage-card.hbs", { estimate, damages: this.targetDamages });

    // Create an estimate damage message based on the target damages
    const message = await UtopiaChatMessage.create({
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      speaker: ChatMessage.getSpeaker({ actor: this.source }),
      system: {
        handler: this.id, // Store the handler ID in the message system
      }
    });
    
    return message;
  }

  async _createExactDamageMessage() {
    const exact = this.damages.reduce((acc, damage) => acc + damage.result, 0); // Calculate the total exact damage

    const content = await renderTemplate("systems/utopia/templates/chat/new-damage-card.hbs", { exact, damages: this.targetDamages });

    // Create an exact damage message based on the target damages
    const message = await UtopiaChatMessage.create({
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      speaker: ChatMessage.getSpeaker({ actor: this.source }),
      system: {
        handler: this.id, // Store the handler ID in the message system
      }
    });
    
    return message;
  }

  async _createTargetMessages() {
    for (const targetDamage of this.targetDamages) {
      const content = await renderTemplate("systems/utopia/templates/chat/new-target-damage-card.hbs", { targetDamage });

      // Create a target damage message based on the target damages
      const message = await UtopiaChatMessage.create({
        id: foundry.utils.randomID(16), // Generate a random ID for the message
        content: content,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        speaker: ChatMessage.getSpeaker({ actor: this.source }),
        whisper: [...game.users.filter(u => u.character === targetDamage.target.id), ...game.users.filter(u => u.isGM)], // Whisper the message to the target and GMs
        system: {
          target: targetDamage.target.uuid, // Store the target's UUID in the message system
          damage: targetDamage,
          handler: this.id,
        }
      });

      this.targetMessages.push(message.id); // Store the target message in the target messages array
    }
  }

  // Handle the final damage application to the targets
  async handleFinalDamage() {
    for (const target of this.targetDamages) {
      var totalDamage = 0;
      const blocked = target.blocked || 0; // Get the blocked amount for the target
      const dodged = target.dodged || false; // Get the dodged amount for the target

      if (blocked) totalDamage -= blocked; // Reduce the total damage by the blocked amount

      for (const damage of target.damages) {
        totalDamage += damage.targetDamage;
      }

      if (dodged) totalDamage = 0; // If the target dodged, set total damage to 0

      await target.target.applyNewDamage({ result: totalDamage, damages: target.damages, blockRoll: target.blockRoll ?? undefined, dodgeRoll: target.dodgeRoll ?? undefined }); // Apply the final damage to the target
    }
  }

  /* ====== Response Methods ====== */
  // Handle a block response from the target
  async handleBlockResponse({ target }) {
    // Check if the target is valid and the damage handler is in the pending state
    if (!target || this.state !== DAMAGE_STATE.PENDING) return;
    
    const formula = target.system.block.formula;
    const roll = await new Roll(formula, target.getRollData()).evaluate();

    const amount = roll.total; // Get the amount to block from the roll
    if (this.targetDamages.find(td => td.target.id).blocked) return; // If the target has already blocked, exit
    else {
      this.targetDamages.find(td => td.target.id === target.id).blocked = amount; // Set the blocked amount for the target damage
      this.targetDamages.find(td => td.target.id === target.id).blockRoll = roll; // Set the blocked amount for the target damage
    }
  }

  // Handle a dodge response from the target
  async handleDodgeResponse({ target }) {
    // Check if the target is valid and the damage handler is in the pending state
    if (!target || this.state !== DAMAGE_STATE.PENDING) return;

    const formula = target.system.dodge.formula;
    const roll = await new Roll(formula, target.getRollData()).evaluate();
    
    const amount = roll.total; // Get the amount to dodge from the roll
    const targetDamageEntry = this.targetDamages.find(td => td.target.id === target.id);
    if (!targetDamageEntry) return; // Exit if no matching target is found

    if (amount >= targetDamageEntry.damages.map(d => d.result).reduce((acc, d) => acc + d, 0)) { // If the amount is greater than the total damage, the dodge is successful
      if (targetDamageEntry.dodged) return; // If the target has already dodged, exit
      else {
         this.targetDamages.find(td => td.target.id === target.id).dodged = true; // Set the dodged amount for the target damage
         this.targetDamages.find(td => td.target.id === target.id).dodgeRoll = roll; // Set the blocked amount for the target damage to 0
      }
    } 
    else {
      this.targetDamages.find(td => td.target.id === target.id).dodgeRoll = roll; // Set the blocked amount for the target damage to 0
      return; // If the amount is not greater than the total damage, exit
    }
  }

  // Handle a cancel response from the source or the GM
  async handleCancelResponse() {
    // Check if the damage handler is in the pending state
    if (this.state !== DAMAGE_STATE.PENDING) return;

    for (const targetMessage of this.targetMessages) {
      // Update the target messages with the resolved state
      await ChatMessage.get(targetMessage).delete(); // Delete the target message
    }
    
    this.state = DAMAGE_STATE.CANCELLED; // Set the state to cancelled
  }

  // Handle a resolve response from the GM
  async handleResolveResponse() {
    // Check if the damage handler is in the pending state
    if (this.state !== DAMAGE_STATE.PENDING) return;

    for (const targetMessage of this.targetMessages) {
      // Update the target messages with the resolved state
      try { await ChatMessage.get(targetMessage).delete(); }
      catch (err) { // Delete the target message
        console.error("Unable to delete resposne message(s). The message may have already been deleted") 
      }
    }
    
    await this.handleFinalDamage(); // Handle the final damage application to the targets
    
    this.state = DAMAGE_STATE.RESOLVED; // Set the state to resolved
  }

  /* ====== Utility Methods ====== */
  // Handle a target blocking the damage
  static get(id) {
    // Find an instance of the damage handler by ID
    return globalThis.utopia.damageHandlers.find(handler => handler.id === id);
  }

  _shp({ target, targetDamage }) {
    // Calculate overflow based on the target's current SHP and max SHP
    const targetShp = target.system.hitpoints.surface;
    const overflow = targetShp.value - targetDamage > 0 ? 0 : Math.abs(targetShp - targetDamage);

    // Return the targets new SHP value, and apply overflow to DHP if necessary
    return {
      surface: Math.max(targetShp.value - targetDamage, 0), // Set the new SHP value (cannot go below 0)
      overflow: overflow > 0 ? overflow : 0, // Set the overflow value (if any)
    };
  }

  _dhp({ target, targetDamage }) {
    // DHP cannot overflow, but it can go negative
    const targetDhp = target.system.hitpoints.deep;

    // Return the targets new DHP value, and apply overflow to SHP if necessary
    return {
      deep: targetDhp - targetDamage, // Set the new DHP value (cannot go below 0)
    };
  }

  _stamina({ target, targetDamage }) {
    // Calculate overflow based on the target's current stamina and max stamina
    const targetStamina = target.system.stamina;
    const overflow = targetStamina.value - targetDamage > 0 ? 0 : Math.abs(targetStamina - targetDamage);

    // Return the targets new stamina value, and apply overflow to SHP if necessary
    return {
      stamina: Math.max(targetStamina.value - targetDamage, 0), // Set the new stamina value (cannot go below 0)
      overflow: overflow > 0 ? overflow : 0, // Set the overflow value (if any)
    };
  }
}