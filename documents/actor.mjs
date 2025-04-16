import { ForageAndCrafting } from "../applications/specialty/forage-and-crafting.mjs";
import { DamageInstance } from "../system/damage.mjs";
import { UtopiaChatMessage } from "./chat-message.mjs";

/**
 * UtopiaActor extends Foundry's Actor to provide custom roll data, crafting, damage,
 * and various in-game actions specific to the Utopia system.
 */
export class UtopiaActor extends Actor {

  /* -------------------------------------------- */
  /*  Logging Methods                             */
  /* -------------------------------------------- */

  /**
   * Logs messages prefixed with the actor class.
   * @param {string} message - The log message.
   * @param {...any} args - Additional objects to log.
   */
  _log(message, ...args) {
    console.log(`[UtopiaActor] ${message}`, ...args);
  }

  /**
   * Logs errors prefixed with the actor class.
   * @param {string} message - The error message.
   * @param {...any} args - Additional objects to log.
   */
  _error(message, ...args) {
    console.error(`[UtopiaActor ERROR] ${message}`, ...args);
  }

  /* -------------------------------------------- */
  /*  Roll Data & Paper Doll Processing           */
  /* -------------------------------------------- */

  /**
   * Gathers roll data from the actor's system and related traits.
   * Also adds paper doll and augment counts.
   *
   * @returns {object} The roll data for this actor.
   */
  getRollData(ignoreTarget = false) {
    const rollData = { ...this.system };

    // Merge in traits and subtraits
    for (const [key, trait] of Object.entries(rollData.traits)) {
      rollData[key] = trait;
    }
    for (const [key, subtrait] of Object.entries(rollData.subtraits)) {
      rollData[key] = subtrait;
    }

    if (!ignoreTarget) {
      // If the owner has any targets, use the first target's roll data.
      const owner = game.users.find(u => u.character?.name === this.name);
      if (owner && owner.targets.size > 0) {
        rollData.target = owner.targets.values().next().value.actor.getRollData(true);
      } else if (game.user.targets.size > 0 && game.user.targets.size < 2) {
        rollData.target = game.user.targets.values().next().value.actor.getRollData(true);
      } else {
        rollData.target = "multiple";
      }
    }

    // Add paper doll data.
    // const paperDoll = this.system.getPaperDoll();
    // rollData.paperdoll ??= {};
    // for (const [slot, obj] of Object.entries(paperDoll)) {
    //   rollData.paperdoll[slot] = obj;
    // }

    // Count filled augments.
    // rollData.filledAugments = Object.values(this.system.augments).filter(a => a !== null).length;
    // rollData.filledEquipment = Object.values(this.system.equipment).filter(e => e !== null).length;

    return rollData;
  }

  /* -------------------------------------------- */
  /*  Crafting Methods                          */
  /* -------------------------------------------- */

  /**
   * Contributes the actor's available components toward crafting.
   * Also returns a summary of the contributions made.
   *
   * For each component type (e.g., "material", "refinement", "power"):
   * - If the actor's available amount is less than the required amount, the actor contributes all available.
   * - If the actor has more available than required, only the needed amount is contributed
   *   and the surplus is recorded in the excessComponents.
   *
   * @param {object} neededComponents - Required amounts, e.g. { material: number, refinement: number, power: number }.
   * @param {object} excessComponents - Object to be populated with any unused (excess) amounts.
   * @param {string} craftingRarity - The rarity level (e.g., "crude", "common", etc.).
   * @returns {[object, object]} An array with updated neededComponents and contributedComponents.
   */
  async craft(neededComponents, excessComponents, craftingRarity) {
    // Return any excess components back to the actor's available pool.
    for (const [componentType, excessAmount] of Object.entries(excessComponents)) {
      if (excessAmount > 0) {
        await this.update({
          [`system.components.${componentType}.${craftingRarity}.available`]: excessAmount
        });
      }
    }

    const actorComponents = this.system.components;

    // Initialize contributedComponents using componentConfig.
    // Assumes a global 'componentConfig' exists with keys for each component type.
    const contributedComponents = Object.keys(componentConfig).reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {});

    // Process each required component type.
    for (const [componentType, requiredAmount] of Object.entries(neededComponents)) {
      if (requiredAmount > 0) {
        const availableAmount = actorComponents[componentType][craftingRarity].available;
        const contribution = Math.min(availableAmount, requiredAmount);
        contributedComponents[componentType] = contribution;

        const newAvailable = availableAmount - contribution;
        await this.update({
          [`system.components.${componentType}.${craftingRarity}.available`]: newAvailable
        });

        neededComponents[componentType] = requiredAmount - contribution;

        // Record any surplus as excess.
        excessComponents[componentType] = availableAmount > requiredAmount ? availableAmount - requiredAmount : 0;
      }
    }

    return [neededComponents, contributedComponents];
  }

  /* -------------------------------------------- */
  /*  Item & Talent Handling                      */
  /* -------------------------------------------- */

  /**
   * Determines if the actor can take the given item.
   * For species, if one already exists, prompts for replacement.
   *
   * @param {object} item - The item to be taken.
   * @returns {Promise<boolean|*>} True if the item is taken; otherwise, an error notification.
   */
  async canTake(item) {
    if (item.type === "species") {
      if (this.items.some(i => i.type === "species")) {
        if (game.user.isGM) {
          const species = this.items.find(i => i.type === "species");
          const msg = game.i18n.format("UTOPIA.ERRORS.ReplaceSpeciesGM", { species: species.name });
          const confirm = await Dialog.confirm({
            title: game.i18n.localize("UTOPIA.ERRORS.ReplaceSpeciesTitle"),
            content: msg,
            yes: () => true,
            no: () => false,
          });
          if (!confirm) return false;
          await this.deleteEmbeddedDocuments("Item", [species.id]);
          for (const branch of species.branches) {
            for (const talent of branch.talents) {
              await this.removeTalent(talent);
            }
          }
        } else {
          return ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.ReplaceSpecies"));
        }
      }
    }

    // TODO: Implement additional item type checks.
    if (this.isOwner) {
      return this.addItem(item, true);
    } else {
      return ui.notifications.error("You need to be the owner of the actor to add an item.");
    }
  }

  /**
   * Deletes an item from the actor.
   * Also deletes any granted items associated with it.
   * @param {object} item - The item to delete.
   * @param {boolean} showNotification - Whether to show a notification.
   */
  async deleteItem(item, showNotification = false) {
    const itemUuid = item.uuid;
    const itemsToDelete = [item.id];

    for (const [key, value] of Object.entries(this.system._decendantItemTracker)) {
      if (value.lookup === itemUuid) {
        const granted = value.granted;
        itemsToDelete.push(granted);
      }
    }
    
    if (item.type === "talent") {
      const tracker = this.system._talentTracking;
      const index = tracker.findIndex(t => t.talent === itemUuid);
      if (index !== -1) {
        tracker.splice(index, 1);
        await this.update({
          [`system._talentTracking`]: tracker,
        });
      }
    }

    await this.deleteEmbeddedDocuments("Item", itemsToDelete);

    if (showNotification) {
      for (const item of itemsToDelete) {
        ui.notifications.info(`Item ${item} deleted from ${this.name}`);
      }
    }    
  }

  /**
   * Adds an item to the actor.
   * @param {object} item - The item to add.
   * @param {boolean} showNotification - Whether to show a notification.
   * @returns {Promise<*>} Notification message.
   */
  async addItem(item, showNotification = false, trackDecendant = false, parent = undefined) {
    const newItems = await this.createEmbeddedDocuments("Item", [item]);

    if (showNotification)
      ui.notifications.info(`Item ${item.name} added to ${this.name}`);

    if (trackDecendant && parent) {
      const tracker = this.system._decendantItemTracker;
      tracker.push({
        lookup: parent.uuid,
        lookupName: parent.name,
        granted: newItems[0].id,
        grantedName: newItems[0].name,
      })

      await this.update({
        [`system._decendantItemTracker`]: tracker,
      });
    }
    
    // Run the macro if it exists
    this.runItemMacro(item);

    // Iterate over the granted items and add them to the actor as well
    // This is a recursive function, so we need to check if the item has any granted items
    // Make sure that we track the granted items as well
    if (item.system.grants) {
      for (const grantedUuid of Array.from(item.system.grants)) {
        const grantedItem = await fromUuid(grantedUuid);
        this.addItem(grantedItem, showNotification, true, newItems[0]);
      }
    }
    else if (item.type === "class" && item.system.grantedEquipment) {
      for (const grantedItem of item.system.grantedEquipment) {
        const itemData = await fromUuid(grantedItem.itemUuid);
        this.addItem(itemData, showNotification, true, newItems[0]);
      }
    }
  }

  /**
   * Runs a macro associated with an item if one is present.
   * @param {object} item - the item to check for and run the macro
   */
  async runItemMacro(item) {
    if (item.system.macro) {
      const macro = await fromUuid(item.system.macro);
      if (macro) {
        await macro.execute({ actor: this, item: item });
      } else {
        this._error(`Macro not found for item ${item.name}`);
      }
    }
  }

  /**
   * Attempts to add a talent to the actor.
   * Consumes talent points if available, executes associated macros,
   * and creates granted items if defined.
   *
   * @param {string} talent - The UUID of the talent.
   * @param {object} talentTree - The talent tree (unused in this snippet).
   */
  async addTalent(talent, talentTree, branchIndex, talentIndex) {
    // There are 3 things that we need to track
    // The parent talent tree this came from, so that we can remove talents belonging to it in the future
    // The talent itself,
    // And any macros and granted items the talent possesses
    // We need to check if the actor has enough talent points to take the talent
    let availablePoints = -1;
    
    if (this.type === "character") {
      availablePoints = this.system.talentPoints.available;
    }
    else {
      availablePoints = 999;
    }

    const cost = talent.body + talent.mind + talent.soul;
    
    if (availablePoints < cost) {
      return ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.NotEnoughTalentPoints"));
    }    

    // At this point, the actor has enough talent points, we can add the talent
    const itemData = talent.item.toObject();
    itemData.system.body = talent.body;
    itemData.system.mind = talent.mind;
    itemData.system.soul = talent.soul;

    // Check if the talent has user-selected options
    if (itemData.system.options.choices.length > 0) {
      const category = itemData.system.options.category;
      var choices = itemData.system.options.choices;

      // Failsafe for if the choices are a string
      // TODO: prevent this from happening in the first place
      if (Array.isArray(choices) && choices.length === 1) {
        choices = choices[0].split(",").map(c => c.trim());
      }

      // Create our array of buttons
      var buttons = [];
      for (const choice of Array.from(choices)) {
        buttons.push({
          label: choice,
          action: choice,
        });
      }

      // Remove any buttons for choices that are already selected
      if (this.system._talentOptions[category]) {
        for (const option of this.system._talentOptions[category]) {
          buttons = buttons.filter(b => b.label !== option);
        }
      }

      // Prompt the user to select the options
      // TODO: Localize
      const selectedOption = await foundry.applications.api.DialogV2.wait({
        title: game.i18n.localize("UTOPIA.Talents.SelectOptions"),
        content: '<p>Select Choice</p>',
        modal: true,
        buttons: buttons,
      });

      // If the user cancels, return
      if (!selectedOption) return;

      itemData.system.selectedOption = selectedOption;
    }

    await this.addItem(itemData, true, false, undefined);
    
    const tracker = this.system._talentTracking;
    tracker.push({
      tree: talentTree.uuid,
      branch: branchIndex,
      tier: talentIndex,
      talent: talent.uuid,
    });

    if (itemData.system.flexibility.enabled) {
      const flexibilities = this.system.flexibility;
      flexibilities.push(itemData.system.flexibility);

      await this.update({
        [`system.flexibility`]: flexibilities
      })
    }

    if (Object.keys(talent.flexibility).length > 0) {
      console.log(this.system.flexibility[0], talent.flexibility);
      const flexibilities = this.system.flexibility.filter(f => !foundry.utils.objectsEqual(f, talent.flexibility));

      await this.update({
        [`system.flexibility`]: flexibilities
      })
    }

    return await this.update({
      [`system._talentTracking`]: tracker,
    })
  }

  /* -------------------------------------------- */
  /*  Damage & Health Methods                     */
  /* -------------------------------------------- */

  /**
   * Applies damage to the actor by updating hitpoints and stamina.
   *
   * @param {DamageInstance} damageInstance - The damage instance to apply.
   * @returns {Promise<void>}
   */
  async takeDamage(damageInstance) {
    await this.update({
      "system.shp.value": damageInstance.final.shp,
      "system.dhp.value": damageInstance.final.dhp,
      "system.stamina.value": damageInstance.final.stamina
    });
    this._log(`Actor {${this.name}} took damage:`, damageInstance.final);
    return;
  }

  /**
   * Checks a trait, applying specialty logic if available.
   *
   * @param {string} trait - The trait to check.
   * @param {object} [options={}] - Additional options.
   * @param {string} [options.specification=""] - Additional specification, if any.
   * @param {boolean} [options.checkFavor=true] - Whether to include favor in the check.
   * @returns {Promise<ChatMessage>} The chat message with the roll result.
   */
  async check(trait, { specification = "always", checkFavor = true } = {}) {
    const specialChecks = JSON.parse(game.settings.get("utopia", "advancedSettings.specialtyChecks"))[trait] ?? {};
    if (Object.keys(specialChecks).length > 0) {
      return this._checkSpecialty({ trait, specialChecks, specification, checkFavor });
    } else {
      return this._checkTrait({ trait, specification, checkFavor });
    }
  }

  /**
   * Performs a specialty check.
   *
   * @param {object} params
   * @param {string} params.trait - The trait being checked.
   * @param {object} params.specialChecks - The specialty check configuration.
   * @param {string} [params.specification=""] - An optional specification to alter behavior.
   * @param {boolean} [params.checkFavor=true] - Whether to apply favor bonuses.
   * @returns {Promise<ChatMessage>}
   */
  async _checkSpecialty({ trait, specialChecks, specification = "always", checkFavor = true }) {
    const formula = specialChecks.formula;
    const attribute = this.system.checks[trait];
    const netFavor = checkFavor ? (await this.checkForFavor(trait, specification)) || 0 : 0;
    // Modify the formula by replacing the default attribute placeholder.
    const newFormula = formula.replace(`@${specialChecks.defaultAttribute}`, `@${attribute}`);
    // If a specification is provided and exists within specialChecks, use its label.
    const labelKey = specification && specialChecks[specification] ? specification : trait;
    var label = game.i18n.localize(specialChecks[labelKey].label);
    // If the specification is not "always", append it to the label.
    if (specification !== "always") 
      label = label + ` vs. ${specification.capitalize()}`;    
    return await new Roll(newFormula, this.getRollData()).alter(1, netFavor).toMessage({ flavor: label });
  }

  /**
   * Performs a standard trait check.
   *
   * @param {object} params
   * @param {string} params.trait - The trait to check.
   * @param {string} [params.specification=""] - An optional specification (currently no formula change).
   * @param {boolean} [params.checkFavor=true] - Whether to apply favor bonuses.
   * @returns {Promise<ChatMessage>}
   */
  async _checkTrait({ trait, specification = "always", checkFavor = true }) {
    const netFavor = checkFavor ? (await this.checkForFavor(trait, specification)) || 0 : 0;
    // Determine label based on whether the trait comes from traits or subtraits.
    var label = Object.keys(JSON.parse(game.settings.get("utopia", "advancedSettings.traits"))).includes(trait)
        ? game.i18n.localize(JSON.parse(game.settings.get("utopia", "advancedSettings.traits"))[trait].label)
        : game.i18n.localize(JSON.parse(game.settings.get("utopia", "advancedSettings.subtraits"))[trait].label);
    // If the specification is not "always", append it to the label.
    if (specification !== "always") 
      label = label + ` vs. ${specification.capitalize()}`;
    const newFormula = `3d6 + @${trait}.mod`;
    return await new Roll(newFormula, this.getRollData()).alter(1, netFavor).toMessage({ flavor: label });
  }

  /**
   * Rests the actor, resetting resources and restoring hitpoints and stamina.
   */
  async rest() {
    await this.resetResources('rest');
    await this.update({
      "system.hitpoints.surface.value": this.system.hitpoints.surface.max,
      "system.stamina.value": this.system.stamina.max,
      "system.hitpoints.deep.value": this.type === "creature" ? this.system.hitpoints.deep.max : this.system.hitpoints.deep.value,
      "system.turnActions.value": this.system.turnActions.max,
      "system.interruptActions.value": this.system.interruptActions.max, 
    });
  }

  /**
   * Resets resources (implementation pending).
   * @param {string} type - The type of rest.
   */
  async resetResources(type) {
    // TODO: Implement resource reset logic
  }

  /**
   * Creates a new DamageInstance for a given damage type and value.
   *
   * @param {string|object} type - The damage type or object.
   * @param {number} value - The damage value.
   * @param {Actor} target - The target actor.
   * @returns {Promise<DamageInstance>}
   */
  async createDamageInstance(type, value, target, source = this) {
    return await new DamageInstance({
      type: type,
      value: value,
      source: source,
      target: target,
    });
  }

  /**
   * Performs a weaponless strike using the actor's defined weaponless parameters.
   *
   * @returns {Array<Promise<DamageInstance>>} Array of damage instances.
   */
  weaponlessStrike() {
    const formula = this.weaponless.formula;
    const damageType = this.weaponless.type;
    const bonus = this.weaponless.bonus ?? 0;
    let targets = Array.from(game.user.targets) || [];
    if (!targets || targets.length === 0) {
      targets = [game.user.character ?? game.canvas.tokens.controlled[0]?.actor];
    }
    const totalDamage = new Roll(formula).evaluateSync().total + bonus;
    const instances = [];
    for (const target of targets) {
      instances.push(this.createDamageInstance(damageType, totalDamage, target));
      // TODO: Deal damage to target
    }
    return instances;
  }

  /* -------------------------------------------- */
  /*  Action & Macro Methods                      */
  /* -------------------------------------------- */

  async blockDamageInstance(damageInstance ) {
    const formula = this.system.block.formula;
    const roll = await new Roll(formula, this.getRollData()).evaluate();
    await damageInstance.handle({ block: roll.total, blockRoll: roll });
    damageInstance.finalize();
    return damageInstance;
  }

  async dodgeDamageInstance(damageInstance) {
    const formula = this.system.dodge.formula;
    const roll = await new Roll(formula, this.getRollData()).evaluate();
    await damageInstance.handle({ dodge: roll.total, dodgeRoll: roll });
    damageInstance.finalize();
    return damageInstance;
  }

  /**
   * Performs a forage action (implementation pending).
   */
  async forage() {
    // TODO: Implement forage action

    const sheet = new ForageAndCrafting({ actor: this });
    await sheet.render(true);
  }

  /**
   * Performs an action defined by an item.
   *
   * @param {object} param0 - Object containing the item.
   * @returns {Promise<*>} The result of the action.
   */
  _performAction({ item }) {
    if (item.type === "action") {
      const formula = item.system.formula;
      const category = item.system.category;
      switch (category) {
        case "damage":
          return this._damageAction(item);
        case "test": 
          for (const check of item.system.checks) {
            this.check(check, item.system.checkFavor);
          }
          return;
        case "utility":
          return this._utility(formula);
        case "macro":
          return this._macro(item.system.macro, { item: item });
      }
    }
  }

  /**
   * Processes a damage action from an item.
   *
   * @param {object} item - The damage action item.
   * @returns {Promise<Array<DamageInstance>>} Array of damage instances.
   */
  async _damageAction(item) {
    const instances = [];
    const targets = [];
    if (["self", "none"].includes(item.system.template)) {
      targets.push(this);
    } else if (item.system.template === "target") {
      targets.push([...game.user.targets]);
    }
    for (const damageData of item.system.damages) {
      const roll = await new Roll(damageData.formula).evaluate();
      const total = roll.total;
      roll.toMessage();
      if (targets.length === 0) {
        const instance = await this.createDamageInstance(damageType, total);
        instances.push(instance);
      }
      for (const target of targets) {
        const instance = await this.createDamageInstance(damageData.type, total, target, item);
        instances.push(instance);
      }
    }
    // Additional data can be passed for chat messages if needed.
    const data = { item: item, instances: instances };
    if (!["self", "none", "target"].includes(item.system.template))
      data.template = item.system.template;
    
    for (const instance of instances) {
      instance.target.applyDamage(instance);
    }
  }

  /**
   * Deals damage based on a formula to the actor's targets.
   *
   * @param {string} formula - The damage formula.
   * @returns {Promise<Array<DamageInstance>>} Array of damage instances.
   */
  async _dealDamage(formula) {
    let targets = Array.from(game.user.targets) || [];
    if (!targets || targets.length === 0) {
      targets = [game.user.character ?? game.canvas.tokens.controlled[0]?.actor ?? undefined];
    }
    const damageValue = (await new Roll(formula).evaluate()).total;
    const instances = [];
    if (!targets || targets.length === 0 || (targets.length === 1 && !targets[0])) {
      return ui.notifications.error(game.i18n.localize("UTOPIA.Errors.NoTargets"));
    }
    for (const target of targets) {
      instances.push(this.createDamageInstance("kinetic", damageValue, target));
    }
    return instances;
  }

  /**
   * Executes a macro associated with an item.
   *
   * @param {string} macro - The macro UUID.
   * @param {object} options - Options that may contain the item.
   * @returns {Promise<void>}
   */
  _macro(macro, { item = null }) {
    return fromUuid(macro).then((macro) => {
      macro.execute(item?.system.macroData ?? {});
    });
  }

  /**
   * Applies damage to the actor, updates health values, and creates a chat message.
   *
   * @param {DamageInstance} damage - The damage instance.
   * @returns {Promise<UtopiaChatMessage>} The created chat message.
   */
  async applyDamage(damage, chatMessage = undefined) {
    const handledDamage = damage.finalized ? damage.final : await damage.handle();

    await this.update({
      "system.hitpoints.surface.value": this.system.hitpoints.surface.value - handledDamage.shpDamage,
      "system.hitpoints.deep.value": this.system.hitpoints.deep.value - handledDamage.dhpDamage,
      "system.stamina.value": this.system.stamina.value - handledDamage.staminaDamage,
    });
  }

  /* -------------------------------------------- */
  /*  Effect & Favor Methods                      */
  /* -------------------------------------------- */

  /**
   * Categorizes active effects into temporary, passive, and inactive.
   *
   * @returns {object} An object with effect categories.
   */
  get effectCategories() {
    const categories = {
      temporary: {
        type: 'temporary',
        label: game.i18n.localize('TYPES.ActiveEffect.temporary'),
        effects: [],
      },
      passive: {
        type: 'passive',
        label: game.i18n.localize('TYPES.ActiveEffect.passive'),
        effects: [],
      },
      inactive: {
        type: 'inactive',
        label: game.i18n.localize('TYPES.ActiveEffect.inactive'),
        effects: [],
      }
    };

    // Classify each active effect.
    for (let effect of this.effects) {
      this._log("Processing effect:", effect);
      if (effect.disabled) {
        categories.inactive.effects.push(effect);
      } else if (effect.isTemporary) {
        categories.temporary.effects.push(effect);
      } else {
        categories.passive.effects.push(effect);
      }
    }
    return categories;
  }

  /**
   * Checks for favor contributions from items of type 'favor' for a specific trait.
   *
   * @param {string} trait - The trait to check favor for.
   * @param {string} [condition="always"] - The condition under which favor applies.
   * @returns {Promise<number>} The total favor value.
   */
  async checkForFavor(trait, condition = "always") {
    const favorItems = this.items.filter(i => i.type === 'favor').filter(f => f.system.checks.has(trait));
    let netFavor = 0;
    for (const favor of favorItems) {
      if (favor.system.conditions.has(condition)) {
        netFavor += favor.system.value;
      }
    }
    return netFavor;
  }
}
