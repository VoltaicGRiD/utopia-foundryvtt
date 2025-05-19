import { UtopiaActor } from "../documents/actor.mjs";
import { UtopiaChatMessage } from "../documents/chat-message.mjs";

export const HEALING_STATE = {
  INIT: 0,
  PENDING: 1,
  RESOLVED: 2,
  CANCELLED: 3,
};

export class Healing {
  constructor({ formula = "", type = "", source = {}, target, options = {} }) {
    this.formula = formula; // The healing formula (e.g., "2d6 + 3")
    this.type = type; // The type of healing (e.g., "heal", "medical", "restoration")
    this.options = options; // Additional options for the healing instance
    this.source = source;
    this.target = target; // The target actor or token
  }

  async _initialize() {
    // Set up any necessary properties or methods for the healing instance
    this.roll = await this._rollFormula(this.formula);
    this.result = Math.abs(this.roll.total); // The total result of the roll
  }

  async _rollFormula() {
    // Roll the formula using the Roll class from FoundryVTT
    const roll = new Roll(this.formula, await this.source.getRollData()); // Create a new Roll instance with the formula
    await roll.evaluate(); // Evaluate the roll asynchronously
    return roll; // Return the evaluated roll
  }

  async _handle() {
    // Ensure the roll is completed before handling healing
    if (!this.result) {
      await this._initialize(); // Re-initialize to ensure result is set
    }

    let targetHealing = this.result; // Initialize target healing with the result of the roll

    // // Apply healing based on the type
    // const targetHitpoints = foundry.utils.deepClone(this.target.system.hitpoints);
    // const targetStamina = this.target.system.stamina;

    // if (this.type === "heal") {
    //   // Heal Surface Health Points (SHP)
    //   targetHitpoints.surface.value = Math.min(
    //     targetHitpoints.surface.value + targetHealing,
    //     targetHitpoints.surface.max
    //   );
    // } else if (this.type === "medical") {
    //   // Heal Deep Health Points (DHP)
    //   targetHitpoints.deep.value = Math.min(
    //     targetHitpoints.deep.value + targetHealing,
    //     targetHitpoints.deep.max
    //   );
    // } else if (this.type === "restoration") {
    //   // Restore Stamina
    //   targetStamina.value = Math.min(
    //     targetStamina.value + targetHealing,
    //     targetStamina.max
    //   );
    // }

    // this.targetHitpoints = targetHitpoints; // Store the target hitpoints for later use
    // this.targetStamina = targetStamina; // Store the target stamina for later use
    this.targetHealing = targetHealing; // Store the target healing for later use
  }
}

export class HealingHandler {
  targetHealings = []; // Array to store the target healings

  constructor({ healings = [], targets = [], state = HEALING_STATE.INIT, source = undefined }, options = {}) {
    this.healings = healings; // Array of healing objects
    this.state = state; // State of the healing instance
    this.options = options; // Additional options for the healing instance

    this._initializeSource(source).then((source) => {
      this.source = source; // The source of the healing (e.g., the actor or item causing the healing)
      this._initializeTargets(targets).then((targets) => {
        for (const target of targets) {
          this.targetHealings.push({ target, healings: healings }); // Initialize the target healings array for each target
        }
        this._initialize(); // Initialize the healing instance after targets are set
      });
    });
  }

  /* ====== Initialization ====== */
  async _initializeSource(source) {
    if (typeof source === "string") return fromUuid(source); // Assume the source is a UUID string
    return source;
  }

  async _initializeTargets(targets) {
    const resolvedTargets = [];
    for (const target of targets) {
      if (typeof target === "string") resolvedTargets.push(await fromUuid(target)); // Assume the target is a UUID string
      else if (target instanceof UtopiaActor) resolvedTargets.push(target); // Check if the target is an actor instance
      else if (target instanceof Token) resolvedTargets.push(target.actor); // Get the actor from the token
    }
    return resolvedTargets;
  }

  _initialize() {
    for (const th of this.targetHealings) {
      th.healings = th.healings.map(
        (h) => new Healing({ ...h, target: th.target, source: this.source })
      ); // Create a new Healing instance for each healing object
    }

    this.id = foundry.utils.randomID(16); // Generate a random ID for the handler
    globalThis.utopia.healingHandlers.push(this); // Add the handler to the global healing handlers array

    this.handle(); // Call handle after initialization is complete
  }

  /* ====== Healing Handling ====== */
  async handle() {
    if (!this.targetHealings || this.targetHealings.length === 0)
      throw new Error("Targets are not initialized yet."); // Ensure targets are defined

    for (const target of this.targetHealings) {
      for (let i = 0; i < target.healings.length; i++) {
        target.healings[i]._handle();
      }
    }

    await this._outputHealingResults();
  }

  /* ====== Outputting Healing Results ====== */
  async _outputHealingResults() {
    this.message = await this._createHealingMessage(); // Create an exact healing message

    this.state = HEALING_STATE.RESOLVED; // Set the state to resolved

    await this.handleFinalHealing(); // Handle any final healing actions
  }

  async _createHealingMessage() {
    const exact = this.healings.reduce((acc, healing) => acc + healing.result, 0); // Calculate the total exact healing

    const content = await renderTemplate(
      "systems/utopia/templates/chat/new-healing-final.hbs",
      { exact, healings: this.targetHealings }
    );

    const message = await UtopiaChatMessage.create({
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      speaker: ChatMessage.getSpeaker({ actor: this.source }),
      system: {
        handler: this.id, // Store the handler ID in the message system
      },
    });

    return message;
  }

  async handleFinalHealing() {
    // Handle any final healing actions, such as updating the target's hitpoints or stamina
    for (const target of this.targetHealings) {
      await target.target.applyNewHealing({ healings: target.healings })
    }
  }

  static get(id) {
    return globalThis.utopia.healingHandlers.find(
      (handler) => handler.id === id
    );
  }
}