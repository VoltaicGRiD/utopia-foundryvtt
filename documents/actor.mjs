import { ForageAndCrafting } from "../applications/specialty/forage-and-crafting.mjs";
import { DamageInstance } from "../system/oldDamage.mjs";
import { isNumeric } from "../system/helpers/isNumeric.mjs";
import { rangeTest } from "../system/helpers/rangeTest.mjs";
import { UtopiaChatMessage } from "./chat-message.mjs";
import { DamageHandler } from "../system/damage.mjs";

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

    rollData["turnOrder"] = new Roll(`@${this.system.turnOrder}`).evaluateSync().total;

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

    if (this.type === "creature") {
      if (this.items.some(i => i.type === "body")) {
        const bodyItem = this.items.find(i => i.type === "body");
        rollData.body = bodyItem.system;
      }
      rollData.baseDR = rollData.body?.baseDR ?? 0;
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
    const contributedComponents = Object.keys(JSON.parse(game.settings.get("utopia", "advancedSettings.components"))).reduce((acc, key) => {
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

  async craftComponent(componentType, craftingRarity, amount = 1) {
    const components = Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.components")));
    const rarities = Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.rarities")));

    const generalRequirements = components[componentType].crafting;
    if (generalRequirements[craftingRarity]) {
      const requirements = generalRequirements[craftingRarity];
      const difficulty = requirements.difficulty || 0;
    }
  }

  async beginHarvest() {
    const template = await renderTemplate("systems/utopia/templates/chat/harvest.hbs", {
      actor: this,
    });
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
    this.runItemMacro(newItems[0]);

    // Iterate over the granted items and add them to the actor as well
    // This is a recursive function, so we need to check if the item has any granted items
    // Make sure that we track the granted items as well
    if (item.system.grants) {
      for (const grantedUuid of Array.from(item.system.grants)) {
        const grantedItem = await fromUuid(grantedUuid);
        const itemData = grantedItem.toObject();
        itemData.system.origin = newItems[0].uuid;
        this.addItem(itemData, showNotification, true, newItems[0]);
      }
    }
    else if (item.type === "class" && item.system.grantedEquipment) {
      for (const grantedItemData of item.system.grantedEquipment) {
        const grantedItem = await fromUuid(grantedItemData.itemUuid);
        const itemData = grantedItem.toObject();
        itemData.system.origin = newItems[0].uuid;
        this.addItem(itemData, showNotification, true, newItems[0]);
      }
    }

    return newItems;
  }

  /**
   * Runs a macro associated with an item if one is present.
   * @param {object} item - the item to check for and run the macro
   */
  async runItemMacro(item) {
    if (item.system.macro) {
      const macro = await fromUuid(item.system.macro);
      if (macro) {
        // Return the item's toObject() data to the macro, and append the item's UUID
        const macroItem = item.toObject();
        macroItem.uuid = item.uuid;
        await macro.execute({ actor: this, item: macroItem });
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

    const newItems = await this.addItem(itemData, true, false, undefined);
    
    const tracker = this.system._talentTracking;
    tracker.push({
      tree: talentTree.uuid,
      branch: branchIndex,
      tier: talentIndex,
      talent: newItems[0].uuid,
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
  async check(trait, { specification = "always", checkFavor = true, difficulty = 0, flavor = "", override = undefined } = {}) {
    const check = JSON.parse(game.settings.get("utopia", "advancedSettings.specialtyChecks"))[trait] ?? {};
    if (Object.keys(check).length > 0) {
      return this._checkSpecialty({ trait, check, specification, checkFavor, difficulty, flavor, override });
    } else {
      return this._checkTrait({ trait, specification, checkFavor, difficulty, flavor, override });
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
   * @param {number} [params.difficulty=0] - The difficulty level of the check.
   * @returns {Promise<ChatMessage>}
   */
  async _checkSpecialty({ trait, check, specification = "always", checkFavor = true, difficulty = 0, flavor, override }) {
    const formula = check.formula;
    const attribute = this.system.checks[trait].attribute;
    const netFavor = checkFavor ? (await this.checkForFavor(trait, specification)) || 0 : 0;
    // Modify the formula by replacing the default attribute placeholder.
    const newFormula = formula.replace(`@${check.defaultAttribute}`, `@${attribute}`);
    // If a specification is provided and exists within check, use its label.
    var label = game.i18n.localize(check.label);
    // If the specification is not "always", append it to the label.
    if (specification !== "always") 
      label = label + ` vs. ${specification.capitalize()}`;
    
    let roll = undefined;
    if (override) {
      if (override.beforeModifiers) 
        roll = await new Roll(`max(${newFormula.split(' + @')[0]}, ${override.setTo})`).alter(1, netFavor).evaluate();
      else 
        roll = await new Roll(`max(${newFormula}, ${override.setTo})`).alter(1, netFavor).evaluate();
    }
    else
      roll = await new Roll(newFormula, this.getRollData(), { flavor: flavor || label }).alter(1, netFavor).evaluate();

    if (difficulty > 0) {
      const success = roll.total >= difficulty;
      await roll.toMessage({ flavor: flavor || label, speaker: ChatMessage.getSpeaker({ actor: this }) });
      await UtopiaChatMessage.create({
        content: `<p>${label} ${success ? game.i18n.localize("UTOPIA.COMMON.success") : game.i18n.localize("UTOPIA.COMMON.failure")}</p>`,
        flavor: flavor || label,
        roll: roll,
        speaker: ChatMessage.getSpeaker({ actor: this }),
      });

      return success;
    }

    return roll;
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
  async _checkTrait({ trait, specification = "always", checkFavor = true, difficulty = 0, flavor, override }) {
    const netFavor = checkFavor ? (await this.checkForFavor(trait, specification)) || 0 : 0;
    // Determine label based on whether the trait comes from traits or subtraits.
    var label = Object.keys(JSON.parse(game.settings.get("utopia", "advancedSettings.traits"))).includes(trait)
        ? game.i18n.localize(JSON.parse(game.settings.get("utopia", "advancedSettings.traits"))[trait].label)
        : game.i18n.localize(JSON.parse(game.settings.get("utopia", "advancedSettings.subtraits"))[trait].label);
    // If the specification is not "always", append it to the label.
    if (specification !== "always") 
      label = label + ` vs. ${specification.capitalize()}`;
    const newFormula = `3d6 + @${trait}.mod`;

    let roll = undefined;
    if (override) {
      if (override.beforeModifiers) 
        roll = await new Roll(`max(${newFormula.split(' + @')[0]}, ${override.setTo})`).alter(1, netFavor).evaluate();
      else 
        roll = await new Roll(`max(${newFormula}, ${override.setTo})`).alter(1, netFavor).evaluate();
    }
    else
      roll = await new Roll(newFormula, this.getRollData(), { flavor: flavor || label }).alter(1, netFavor).evaluate();
    
    if (difficulty > 0) {
      const success = roll.total >= difficulty;
      await roll.toMessage({ flavor: flavor || label, speaker: ChatMessage.getSpeaker({ actor: this }) });
      await UtopiaChatMessage.create({
        content: `<p>${label} ${success ? game.i18n.localize("UTOPIA.COMMON.success") : game.i18n.localize("UTOPIA.COMMON.failure")}</p>`,
        flavor: flavor || label,
        roll: roll,
        speaker: ChatMessage.getSpeaker({ actor: this }),
      });
      return success;
    }

    return roll;
  }

  /**
   * Rests the actor, resetting resources and restoring hitpoints and stamina.
   */
  async rest() {
    await this.resetResources('rest');
    await this.update({
      "system.hitpoints.surface.value": this.system.hitpoints.surface.max,
      "system.hitpoints.deep.value": this.type === "creature" ? this.system.hitpoints.deep.max : this.system.hitpoints.deep.value,
      "system.turnActions.value": this.system.turnActions.max,
      "system.interruptActions.value": this.system.interruptActions.max, 
    });
    if (!(await this.getFatigueLevel(3))) {
      await this.update({
        "system.stamina.value": this.system.stamina.max
      });
    }
    this.removeFatigue(1); // TODO - Validate this should go here
  }

  async addFatigue(amount = 1) {
    const statuses = Array.from(this.statuses);
    if (statuses.some(s => s.includes("fatigue"))) {
      let highestFatigue = 1;
      for (const status of statuses.filter(s => s.includes("fatigue"))) {
        highestFatigue = Math.max(highestFatigue, parseInt(status.id.split("_")[1]));
      }
      highestFatigue += amount;
      if (highestFatigue === 7) // Character is already at maximum fatigue
        return false;
      else 
        this.toggleStatusEffect(`fatigue_${highestFatigue}`);
    }
    else 
      this.toggleStatusEffect("fatigue_1");
  }

  async removeFatigue(amount = 1) {
    const statuses = Array.from(this.statuses);
    if (statuses.some(s => s.includes("fatigue"))) {
      let highestFatigue = 6;
      let amountRemoved = 0;
      for (let i = 6; i > 0; i--) {
        if (statuses.includes(`fatigue_${i}`)) {
          this.toggleStatusEffect(`fatigue_${i}`);
          amountRemoved++;
        }
        if (amountRemoved === amount) 
          return;
      }
    }
  }

  async setFatigue(level) {
    const statuses = Array.from(this.statuses);
    for (let i = 1; i <= level; i++) {
      if (!statuses.includes(`fatigue_${i}`)) // Set all fatigues lower than or equal to the requested level
        this.toggleStatusEffect(`fatigue_${i}`);
    }
    if (level === 6) return;
    for (let i = 6; i > level; i--) {
      if (statuses.includes(`fatigue_${i}`)) // Remove all fatigues greater than the requested level
        this.toggleStatusEffect(`fatigue_${i}`); 
    }
  }

  async getFatigue(level = null) {
    let highestFatigue = 0;
    for (const status of this.statuses) {
      highestFatigue = Math.max(highestFatigue, parseInt(status.split("_")[1]));
    }
    return highestFatigue;
  }

  async getFatigueLevel(level) {
    const statuses = Array.from(this.statuses).filter(s => s.includes("fatigue"));
    if (statuses.includes(`fatigue_${level}`)) {
      return true;
    } else {
      return false;
    }
  }

  async equip({item, slot, override = false}) {
    const capacityData = (foundry.utils.getProperty(this, slot.slot)).capacity;
    var capacity = 0;
    
    let equippedData = (foundry.utils.getProperty(this, slot.slot)).equipped;
    if (equippedData.length >= capacity && !override) {
      return ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.ItemRequiresFullSlot"));
    }

    if (slot.hands) { // Uses a handheld slot
      capacity = capacityData;
      const hands = slot.hands ?? 1; // Default to 1 hand if not specified

      const nullSlots = equippedData.filter(id => id === null || id === undefined);
      const indexOfNull = equippedData.indexOf(null);
      if (nullSlots.length >= hands) { // If there are enough empty slots, just equip the item
        // Pop the null slots, and take their place        
        for (var i = 0; i < hands; i++) {
          nullSlots.splice(i, 1, item.id);
        }

        // Update the equipped data with the new item
        // Replacing the null slots with the new item
        equippedData.splice(indexOfNull, hands, ...nullSlots);
        
        // Update the item to reflect that it is now equipped
        await item.update({
          "system.equipped": true,
        })

        // Update the actor with the new equipped data
        return await this.update({
          [`${slot.slot}.equipped`]: equippedData
        });
      }

      for (var i = 0; i < hands; i++) {
        if (override) { // Remove the item at the end of the equipped items
          equippedData.pop();
        }
        else if (equippedData.length + hands >= capacity) {
          return ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.ItemRequiresFullSlot"));
        }

        equippedData.push(item.id);
      }

      // Ensure we do not exceed the capacity
      if (equippedData.length > capacity) {
        equippedData.splice(0, equippedData.length - capacity); // Keep only the first 'capacity' items
      }

      await this.update({
        [`${slot.slot}.equipped`]: equippedData
      });
    }
    else if (slot.type) {
      equippedData = (foundry.utils.getProperty(this, slot.slot)).equipped[slot.type];

      if (!this._canEquip(slot.type, item))
        return ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.ItemWasNotEquipped"));

      capacity = capacityData[slot.type];
      if (capacity === undefined || capacity === 0) {
        return ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.ItemRequiresInvalidSlot"));
      }

      if (equippedData.length < capacity) {
        // Add the new item to the equipped items
        equippedData.push(item.id);

        // await item.update({
        //   "system.equipped": true,
        // })

        return await this.update({
          [`${slot.slot}.equipped.${slot.type}`]: equippedData
        });
      }
      else if (equippedData.length >= capacity && !override) {
        return ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.ItemRequiresFullSlot"));
      }
      else if (equippedData.length >= capacity && override) {
        // Remove the last item in the equipped items
        equippedData.splice(0, 1);
        // Add the new item to the equipped items
        equippedData.push(item.id);

        // await item.update({
        //   "system.equipped": true,
        // })

        return await this.update({
          [`${slot.slot}.equipped`]: equippedData
        });
      }
      else {
        // Add the item to the equipped items
        equippedData.push(item.id);
        
        return await this.update({
          [`${slot.slot}.equipped.${slot.type}`]: equippedData
        });
      }
    }
  }

  async augment({item, slot, override = false}) {
    const capacityData = (foundry.utils.getProperty(this, slot.slot)).capacity;
    var capacity = 0;
    
    let equippedData = (foundry.utils.getProperty(this, slot.slot)).equipped;
    if (equippedData.length >= capacity && !override) {
      return ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.ItemRequiresFullSlot"));
    }

    if (slot.hands) { // Uses a handheld slot
      capacity = capacityData;
      const hands = slot.hands ?? 1; // Default to 1 hand if not specified

      const nullSlots = equippedData.filter(id => id === null || id === undefined);
      const indexOfNull = equippedData.indexOf(null);
      if (nullSlots.length >= hands) { // If there are enough empty slots, just equip the item
        // Pop the null slots, and take their place        
        for (var i = 0; i < hands; i++) {
          nullSlots.splice(i, 1, item.id);
        }

        // Update the equipped data with the new item
        // Replacing the null slots with the new item
        equippedData.splice(indexOfNull, hands, ...nullSlots);
        
        // Update the item to reflect that it is now equipped
        await item.update({
          "system.equipped": true,
        })

        // Update the actor with the new equipped data
        return await this.update({
          [`${slot.slot}.equipped`]: equippedData
        });
      }

      for (var i = 0; i < hands; i++) {
        if (override) { // Remove the item at the end of the equipped items
          equippedData.pop();
        }
        else if (equippedData.length + hands >= capacity) {
          return ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.ItemRequiresFullSlot"));
        }

        equippedData.push(item.id);
      }

      // Ensure we do not exceed the capacity
      if (equippedData.length > capacity) {
        equippedData.splice(0, equippedData.length - capacity); // Keep only the first 'capacity' items
      }

      await this.update({
        [`${slot.slot}.equipped`]: equippedData
      });
    }
    else if (slot.type) {
      equippedData = (foundry.utils.getProperty(this, slot.slot)).equipped[slot.type];

      if (!this._canEquip(slot.type, item))
        return ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.ItemWasNotEquipped"));

      capacity = capacityData[slot.type];
      if (capacity === undefined || capacity === 0) {
        return ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.ItemRequiresInvalidSlot"));
      }

      if (equippedData.length < capacity) {
        // Add the new item to the equipped items
        equippedData.push(item.id);

        // await item.update({
        //   "system.equipped": true,
        // })

        return await this.update({
          [`${slot.slot}.equipped.${slot.type}`]: equippedData
        });
      }
      else if (equippedData.length >= capacity && !override) {
        return ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.ItemRequiresFullSlot"));
      }
      else if (equippedData.length >= capacity && override) {
        // Remove the last item in the equipped items
        equippedData.splice(0, 1);
        // Add the new item to the equipped items
        equippedData.push(item.id);

        // await item.update({
        //   "system.equipped": true,
        // })

        return await this.update({
          [`${slot.slot}.equipped`]: equippedData
        });
      }
      else {
        // Add the item to the equipped items
        equippedData.push(item.id);
        
        return await this.update({
          [`${slot.slot}.equipped.${slot.type}`]: equippedData
        });
      }
    }
  }

  async _canEquip(slot, item) {
    const armors = this.system.armors;
    let equippable = true;

    if (armors.specialty[slot]) {
      // Requires the item to be crafted specifically for this character
      if (item.system.craftedFor !== this.uuid) {
        ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.ItemRequiresSpecialtyCrafting"));
        equippable = false;
      }
    }

    if (armors.unequippable[slot]) {
      // The item cannot be equipped in this slot
      ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.ItemRequiresUnequippableSlot"));
      equippable = false;
    }

    return equippable;
  }

  async _canAugment(slot, item) {
    const armors = this.system.armors;
    let augmentable = true;

    if (armors.specialty[slot]) {
      // Requires the item to be crafted specifically for this character
      if (item.system.craftedFor !== this.uuid) {
        ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.ItemRequiresSpecialtyCrafting"));
        augmentable = false;
      }
    }
    
    if (armors.unaugmentable[slot]) {
      // The item cannot be augmented in this slot
      ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.ItemRequiresUnaugmentableSlot"));
      augmentable = false;
    }

    return augmentable;
  }

  async _canEquip(slot, item) {
    const armors = this.system.armors;
    let equippable = true;

    if (armors.specialty[slot]) {
      // Requires the item to be crafted specifically for this character
      if (item.system.craftedFor !== this.uuid) {
        ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.ItemRequiresSpecialtyCrafting"));
        equippable = false;
      }
    }

    if (armors.unequippable[slot]) {
      // The item cannot be equipped in this slot
      ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.ItemRequiresUnequippableSlot"));
      equippable = false;
    }

    return equippable;
  }

  async _canAugment(slot, item) {
    const armors = this.system.armors;
    let augmentable = true;

    if (armors.specialty[slot]) {
      // Requires the item to be crafted specifically for this character
      if (item.system.craftedFor !== this.uuid) {
        ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.ItemRequiresSpecialtyCrafting"));
        augmentable = false;
      }
    }
    
    if (armors.unaugmentable[slot]) {
      // The item cannot be augmented in this slot
      ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.ItemRequiresUnaugmentableSlot"));
      augmentable = false;
    }

    return augmentable;
  }

  /**
   * Resets resources (implementation pending).
   * @param {string} type - The type of rest.
   */
  async resetResources(type) {
    // TODO: Implement resource reset logic
    const restResources = Object.entries(this.system).filter(([key, value]) => {
      
    });
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
  async weaponlessStrike() {
    const formula = this.system.weaponlessAttacks.formula;
    const damageType = this.system.weaponlessAttacks.type;
    const bonus = this.system.weaponlessAttacks.bonus ?? 0;

    const damageRoll = new Roll(`${formula} + ${bonus}` ?? "0", this.getRollData());
    const damageValue = await damageRoll.evaluate();
    const targets = [];

    if (Array.from(game.user.targets).length === 0) {
      if (game.settings.get("utopia", "targetRequired")) {
        return ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.NoTargetsSelected"));
      }
      else {
        return ui.notifications.warn(game.i18n.localize("UTOPIA.ERRORS.NoTargetsSelectedInfo"));
      }
    }
    
    targets.push(...Array.from(game.user.targets).map(t => t.actor)) || [];

    for (const target of targets) {
      const damage = new DamageInstance({
        type: damageType ?? "physical",
        value: damageValue.total,
        target: target.uuid,
        source: this,
        roll: damageRoll,
      });
      const handledDamage = await damage.handle();
      const damageMessage = await damage.toMessage();
      console.warn(damage);
      console.warn(damageMessage);
    }
  }

  /* -------------------------------------------- */
  /*  Action & Macro Methods                      */
  /* -------------------------------------------- */

  async blockDamageInstance(damageInstance ) {
    let canPerform = false;
    let isTurn = false;

    if (this.inCombat) {
      for (const combat of game.combats) {
        if (combat.current.combatantId === combat.combatants.find(c => c.actorId === this.id)) // Is currently this actors turn, use turn actions
          isTurn = true;
      }

      if (isTurn) 
        canPerform = await this._canPerformAction({cost: 1, type: "turn"})     
      else 
        canPerform = await this._canPerformAction({cost: 1, type: "interrupt"})     
    }

    if (!canPerform) {
      ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.NotEnoughActions"));
      await damageInstance.handle();
      damageInstance.finalize();
      return damageInstance;
    }

    if (isTurn) {
      if (this.system.turnActions.temporary > 0) { // Always use temporary first
        await this.update({
          "system.turnActions.temporary": this.system.turnActions.temporary - 1
        })
      }
      else {
        await this.update({
          "system.turnActions.value": this.system.turnActions.value - 1
        })
      }
    }
    else {
      if (this.system.interruptActions.temporary > 0) { // Always use temporary first
        await this.update({
          "system.interruptActions.temporary": this.system.interruptActions.temporary - 1
        })
      }
      else {
        await this.update({
          "system.interruptActions.value": this.system.interruptActions.value - 1
        })
      }
    }

    if (await this.getFatigueLevel(4)) {
      await this.update({
        "system.stamina.value": this.system.stamina.value - this.getFatigue()
      })
    }

    await this.update(updateData);

    const formula = this.system.block.formula;

    let protections = 0;
    if (this.getFlag("utopia", "protections")) {
      protections = this.getFlag("utopia", "protections");
      await this.unsetFlag("utopia", "protections");
    }

    const roll = await new Roll(formula, this.getRollData()).alter(1, protections).evaluate();
    await damageInstance.handle({ block: roll.total, blockRoll: roll });
    damageInstance.finalize();
    this._applySiphons(damageInstance);
    return damageInstance;
  }

  async dodgeDamageInstance(damageInstance) {
    let canPerform = false;
    let isTurn = false;

    if (this.inCombat) {
      for (const combat of game.combats) {
        if (combat.current.combatantId === combat.combatants.find(c => c.actorId === this.id)) // Is currently this actors turn, use turn actions
          isTurn = true;
      }

      if (isTurn) 
        canPerform = await this._canPerformAction({cost: 1, type: "turn"})     
      else 
        canPerform = await this._canPerformAction({cost: 1, type: "interrupt"})     
    }

    if (!canPerform) {
      ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.NotEnoughActions"));
      await damageInstance.handle();
      damageInstance.finalize();
      return damageInstance;
    }

    if (isTurn) {
      if (this.system.turnActions.temporary > 0) { // Always use temporary first
        await this.update({
          "system.turnActions.temporary": this.system.turnActions.temporary - 1
        })
      }
      else {
        await this.update({
          "system.turnActions.value": this.system.turnActions.value - 1
        })
      }
    }
    else {
      if (this.system.interruptActions.temporary > 0) { // Always use temporary first
        await this.update({
          "system.interruptActions.temporary": this.system.interruptActions.temporary - 1
        })
      }
      else {
        await this.update({
          "system.interruptActions.value": this.system.interruptActions.value - 1
        })
      }
    }

    if (await this.getFatigueLevel(4)) {
      await this.update({
        "system.stamina.value": this.system.stamina.value - this.getFatigue()
      })
    }

    const formula = this.system.dodge.formula;

    let protections = 0;
    if (this.getFlag("utopia", "protections")) {
      protections = this.getFlag("utopia", "protections");
      await this.unsetFlag("utopia", "protections");
    }

    const roll = await new Roll(formula, this.getRollData()).alter(1, protections).evaluate();
    await damageInstance.handle({ dodge: roll.total, dodgeRoll: roll });
    damageInstance.finalize();
    this._applySiphons(damageInstance);
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
  /**
   * Core action entry point, now modular and pluggable.
   */
  async _performAction(params) {
    const item = params.item;
    if (this.system.encumbered) return this._notifyEncumbered();
    if (item && item.type !== 'action') return;

    // Resolve action parameters
    let actionType, cost, staminaCost;
    if (item) {
      ({ actionType, cost, staminaCost } = await this._resolveActionParams(item));
    } else {
      actionType = params.type;
      cost = params.cost;
      staminaCost = params.staminaCost ?? 0;
    }

    // Toggle effects if applicable
    if (item && item.system.toggleActiveEffects) {
      await this._toggleEffects(item);
    }

    // Verify resources
    if (!this._hasSufficientResources(actionType, cost, staminaCost)) {
      ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.NotEnoughActions"));
      return false;
    }

    // Execute behavior
    let result;
    if (item) {
      switch (item.system.category) {
        case 'damage':
          result = await this._damageAction(item);
          break;
        case 'test':
          result = await this._executeTestAction(item);
          break;
        case 'utility':
          result = await this._utility(item);
          break;
        case 'macro':
          result = await this._macro(item.system.macro, { item });
          break;
        case 'passive': 
          result = await this._passive(item);
          break;
        default:
          result = null;
      }
    } else {
      // Raw action: optional callback or default success
      result = params.execute ? await params.execute() : true;
    }

    // Consume resources
    await this._consumeResources(actionType, cost, staminaCost);
    return result;
  }

  /**
   * Determine raw costs and base action type; apply exchange rules.
   */
  async _resolveActionParams(item) {
    // Resolve numeric cost & stamina
    const rawCost = item.system.cost;
    const cost = isNumeric(rawCost)
      ? parseInt(rawCost)
      : (await new Roll(rawCost).evaluate()).total;
    const staminaCost = item.system.stamina ?? 0;

    // Determine base type (turn/interrupt/current)
    let type = item.system.type;
    if (type === 'current') type = this._determineBaseActionType();

    // Exchange logic
    this._exchange = null;
    const { turnActions, interruptActions } = this.system;
    if (type === 'interrupt' && this._isPlayersTurn()
        && interruptActions.available < cost
        && turnActions.available >= cost) {
      this._exchange = { from: 'turn', to: 'interrupt', rate: 1 };
    }
    else if (type === 'turn' && !this._isPlayersTurn()
        && turnActions.available < cost
        && interruptActions.available >= cost * 2) {
      this._exchange = { from: 'interrupt', to: 'turn', rate: 2 };
    }

    return { actionType: type, cost, staminaCost };
  }

  /**
   * Check pools + stamina, considering any exchange rules.
   */
  _hasSufficientResources(type, cost, staminaCost) {
    if (this.system.stamina.value < staminaCost) return false;
    const { turnActions, interruptActions } = this.system;
    if (type === 'turn') {
      if (turnActions.available >= cost) return true;
      if (this._exchange?.to === 'turn') {
        return interruptActions.available >= cost * this._exchange.rate;
      }
      return false;
    }
    if (type === 'interrupt') {
      if (interruptActions.available >= cost) return true;
      if (this._exchange?.to === 'interrupt') {
        return turnActions.available >= cost * this._exchange.rate;
      }
      return false;
    }
    return true;
  }

  /**
   * Deduct temporary & permanent pools, applying any exchange.
   */
  async _consumeResources(type, cost, staminaCost) {
    const update = {};
    // Deduct stamina
    update['system.stamina.value'] = this.system.stamina.value - staminaCost;

    // Choose primary pool
    const poolKey = type === 'turn' ? 'turnActions' : 'interruptActions';
    const pool = this.system[poolKey];
    const tempKey = `${poolKey}.temporary`;
    const valKey  = `${poolKey}.value`;
    let remaining = cost;

    // Use temporary first
    if (pool.temporary > 0) {
      const usedTemp = Math.min(pool.temporary, remaining);
      remaining -= usedTemp;
      update[tempKey] = pool.temporary - usedTemp;
    }

    // If exchange applies and still owe, deduct from other pool
    if (remaining > 0 && this._exchange?.to === type) {
      const otherKey = this._exchange.from === 'turn' ? 'turnActions' : 'interruptActions';
      const otherVal = this.system[otherKey].value;
      update[`${otherKey}.value`] = otherVal - remaining * this._exchange.rate;
      remaining = 0;
    }

    // Deduct remainder from primary pool
    if (remaining > 0) {
      update[valKey] = pool.value - remaining;
    }

    await this.update(update);
  }

  /** Base type determination when item.system.type==='current' */
  _determineBaseActionType() {
    return (!this.inCombat) ? 'turn' : (this._isPlayersTurn() ? 'turn' : 'interrupt');
  }

  /** True if it's this actor's turn in the active combat */
  _isPlayersTurn() {
    const combat = game.combat;
    return combat?.combatant?.actor?.id === this.id;
  }

  /** Encapsulate test actions with checks and finish */
  async _executeTestAction(item) {
    const targetRoll = (await this._actionAgainst(item)).total;
    for (const check of item.system.checks) {
      return await this.check(check, { difficulty: targetRoll });
    }
  }

  /** Notify and return false when encumbered */
  _notifyEncumbered() {
    return UtopiaChatMessage.create({
      content: `<p>${game.i18n.format("UTOPIA.ERRORS.Encumbered",{actorName:this.name})}</p>`
    });
  }

  /**
   * Processes a damage action from an item.
   *
   * @param {object} item - The damage action item.
   * @returns {Promise<Array<DamageInstance>>} Array of damage instances.
   */
  async _damageAction(item) {
    const targets = [];

    if (["self"].includes(item.system.template)) {
      targets.push(this);
    } else if (["target"].includes(item.system.template)) {
      if (Array.from(game.user.targets).length === 0) {
        if (game.settings.get("utopia", "targetRequired")) {
          return ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.NoTargetsSelected"));
        }
        else {
          return ui.notifications.warn(game.i18n.localize("UTOPIA.ERRORS.NoTargetsSelectedInfo"));
        }
      }
      targets.push(...Array.from(game.user.targets)); 
    }
    
    // TODO - Implement automated accuracy tests
    // TODO - Implement 'Roll for out-of-range targets anyway' game setting
    const targetsInRange = [];
    
    for (const target of targets) {
      const trait = item.system.accuracyTrait;
      const result = await rangeTest({item, target, trait });
      if (result) {
        targetsInRange.push(target);
      }
    }

    const finalTargets = targetsInRange.map(t => t.actor);

    const damages = item.system.damages;
    if (damages) {
      if (Array.isArray(damages)) {
        const damageHandler = new DamageHandler({ damages, targets: Array.from(game.user.targets), source: this.parent })
      }
    }

    if (this.getFatigue(4) === true) { // Handle fatigue
      await this.update({
        "system.stamina.value": this.system.stamina.value - this.getFatigue()
      })
    }

    // Additional data can be passed for chat messages if needed.
    // const data = { item: item, instances: instances };
    // if (!["self", "none", "target"].includes(item.system.template))
    //   data.template = item.system.template;

    this._finishAction(item);
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
      return ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.NoTargets"));
    }
    for (const target of targets) {
      instances.push(this.createDamageInstance("kinetic", damageValue, target));
    }
    return instances;
  }

  async _utility(item) {
    const roll = await new Roll(item.system.formula, this.getRollData()).evaluate();
    const tooltip = await roll.getTooltip(); 
    roll.tooltip = tooltip;
    
    const restoration = item.system.restoration;
    const type = item.system.restorationType;

    if (restoration && type) {
      const updateData = {};
      if (type === "surface") {
        updateData[`system.hitpoints.surface.value`] = Math.min(this.system.hitpoints.surface.max, this.system.hitpoints.surface.value + roll.total);
      } else if (type === "deep") {
        updateData[`system.hitpoints.deep.value`] = Math.min(this.system.hitpoints.deep.max, this.system.hitpoints.deep.value + roll.total);
      } else if (type === "stamina") {
        updateData[`system.stamina.value`] = Math.min(this.system.stamina.max, this.system.stamina.value + roll.total);
      }
      
      await this.update(updateData);
    }

    this._finishAction(item);
  }

  async _toggleEffects(item) {
    const effects = this.effects.filter(e => e.origin === item.uuid);
    for (const effect of effects) {
      effect.update({
        "disabled": !effect.disabled,
      })
    }

    await UtopiaChatMessage.create({
      content: `<p>${game.i18n.format("UTOPIA.Actors.Actions.ToggleEffects", { action: item.name })}</p>`,
      speaker: ChatMessage.getSpeaker({ actor: this }),
    });
  }

  async _passive(item) {
    await UtopiaChatMessage.create({
      content: `<p>${game.i18n.format("UTOPIA.Actors.Actions.PassiveAction", { action: item.name })}</p>`,
      speaker: ChatMessage.getSpeaker({ actor: this }),
    });
    this._finishAction(item);
  }

  /**
   * Executes a macro associated with an item.
   *
   * @param {string} macro - The macro UUID.
   * @param {object} options - Options that may contain the item.
   * @returns {Promise<void>}
   */
  async _macro(macro, { item = null }) {
    fromUuid(macro).then((macro) => {
      macro.execute(item?.system.macroData ?? {});
    });
    this._finishAction(item);
  }

  async _canPerformAction({ item = undefined, staminaCost = 0, cost = 0, type = "special" }) {
    if (item) {
      const actionCost = item.system.cost;
      type = item.system.type;

      if (isNumeric(actionCost)) {
        cost = parseInt(actionCost);
      }
      else {
        cost = (await new Roll(actionCost).evaluate()).total;
      }

      staminaCost = item.system.stamina;
    }

    if (type === "current") { // Use currently available action type
      if (this.inCombat) {
        let isTurn = false;
        
        for (const combat of game.combats) {
          if (combat.current.combatantId === combat.combatants.find(c => c.actorId === this.id)) // Is currently this actors turn, use turn actions
            isTurn = true;
        }

        if (isTurn) type = "turn";
        else type = "interrupt";
      }

      type = "turn";
    }

    switch (type) {
      case "turn": 
        return this.system.turnActions.available >= cost && this.system.stamina.value >= staminaCost;
      case "interrupt":
        return this.system.interruptActions.available >= cost && this.system.stamina.value >= staminaCost;
      default:
        return true;
    }    
  }

  async _actionAgainst(item) {
    if (!item.system.checkAgainstTarget) return;

    else {
      if (game.user.targets.size === 0) {
        ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.ActionAgainstNoTarget"));
        return false;
      }
      
      for (const target of Array.from(game.user.targets)) {
        const actor = target.actor ?? undefined;
        if (actor) {
          const roll = await actor.check(item.system.checkAgainstTrait);
          roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: actor }) });
          return roll;
        }
      }
    }
  }

  async _finishAction(item = undefined) {
    const actionCost = item.system.cost;
    const type = item.system.type;
    let cost = 0;

    if (isNumeric(actionCost)) {
      cost = parseInt(actionCost);
    }
    else {
      cost = (await new Roll(actionCost).evaluate()).total;
    }

    let costLeft = cost;

    switch (type) {
      case "turn": 
        if (this.system.turnActions.temporary > 0) {
          if (this.system.turnActions.temporary >= cost) {
            costLeft = 0; // If we have enough temporary actions, no need to update the value
            await this.update({
              "system.turnActions.temporary": this.system.turnActions.temporary - cost
            })
          }
          else {
            costLeft -= this.system.turnActions.temporary; // Remove all temporary actions
            await this.update({
              "system.turnActions.temporary": 0
            });
          }
        }
        return await this.update({
          "system.turnActions.value": this.system.turnActions.value - costLeft,
          "system.stamina.value": this.system.stamina.value - item.system.stamina
        });
      case "interrupt":
        if (this.system.interruptActions.temporary > 0) {
          if (this.system.interruptActions.temporary >= cost) {
            costLeft = 0; // If we have enough temporary actions, no need to update the value
            await this.update({
              "system.interruptActions.temporary": this.system.interruptActions.temporary - cost
            })
          }
          else {
            costLeft -= this.system.interruptActions.temporary; // Remove all temporary actions
            await this.update({
              "system.interruptActions.temporary": 0
            });
          }
        }
        return await this.update({
          "system.interruptActions.value": this.system.interruptActions.value - cost,
          "system.stamina.value": this.system.stamina.value - item.system.stamina
        });
      default:
        return;
    }
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

    if (chatMessage) {
      chatMessage.delete();

      console.warn(damage);

      const roll = damage.roll;
      const tooltip = await roll.getTooltip();
      roll.tooltip = tooltip;

      const template = await renderTemplate("systems/utopia/templates/chat/damage-final.hbs", {
        actor: this,
        damage: damage,
        handledDamage: handledDamage
      });

      await UtopiaChatMessage.create({
        content: template,
        speaker: ChatMessage.getSpeaker({ actor: this }),
        flavor: game.i18n.localize("UTOPIA.CHAT.DamageAppliedFlavor"),
      });
    }    

    await this._applySiphons(damage);
  }

  async applyNewHealing({ healings }) {
    const rolls = [];

    let surface = this.system.hitpoints.surface.value;
    let deep = this.system.hitpoints.deep.value;
    let stamina = this.system.stamina.value;

    for (const healing of healings) {
      const roll = healing.roll;
      const tooltip = await roll.getTooltip();
      const newRoll = foundry.utils.deepClone(roll);
      newRoll.tooltip = tooltip;
      newRoll.flavor = healing.type.capitalize() + " Healing";
      newRoll._total = healing.targetHealing; // Override the total to show the damage dealt, including defenses

      if (healing.type === "heal") 
        surface += healing.targetHealing;
      else if (healing.type === "medical")
        deep += healing.targetHealing;
      else if (healing.type === "recover")
        stamina += healing.targetHealing;
      
      rolls.push(newRoll);
    }

    const handledHealing = {
      shpHealing: surface > this.system.hitpoints.surface.max ? this.system.hitpoints.surface.max - this.system.hitpoints.surface.value : 0,
      dhpHealing: deep > this.system.hitpoints.deep.max ? this.system.hitpoints.deep.max - this.system.hitpoints.deep.value : 0,
      staminaHealing: stamina > this.system.stamina.max ? this.system.stamina.max - this.system.stamina.value : 0,
    }

    const template = await renderTemplate("systems/utopia/templates/chat/new-healing-final.hbs", {
      actor: this,
      rolls: rolls,
      handledHealing: handledHealing
    });

    await UtopiaChatMessage.create({
      content: template,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.localize("UTOPIA.CHAT.HealingAppliedFlavor"),
    });

    await this.update({
      "system.hitpoints.surface.value": Math.min(this.system.hitpoints.surface.max, surface),
      "system.hitpoints.deep.value": Math.min(this.system.hitpoints.deep.max, deep),
      "system.stamina.value": Math.min(this.system.stamina.max, stamina),
    });
  }

  async applyNewDamage({ result, damages, blockRoll = undefined, dodgeRoll = undefined}) {
    const rolls = [];

    let surface = 0;
    let deep = 0;
    let stamina = 0;

    for (const damage of damages) {
      const roll = damage.roll;
      const tooltip = await roll.getTooltip();
      const newRoll = foundry.utils.deepClone(roll);
      newRoll.tooltip = tooltip;
      newRoll.flavor = damage.type.capitalize() + " Damage";
      if (damage.targetDefenses) 
        newRoll._formula += ` - ${damage.targetDefenses[damage.type] }`
      newRoll._total = damage.targetDamage; // Override the total to show the damage dealt, including defenses

      switch (damage.appliesTo) {
        case "shp": 
          if (damage.targetDamage + surface > this.system.hitpoints.surface.value) {
            surface += this.system.hitpoints.surface.value;
            deep += (damage.targetDamage - this.system.hitpoints.surface.value);
          }
          else {
            surface += damage.targetDamage;
          }
          break;
        case "dhp": 
          deep += damage.targetDamage;
          break;
        case "stamina":
          if (damage.targetDamage + stamina > this.system.stamina.value) {
            stamina += this.system.stamina.value;
            deep += (damage.targetDamage - this.system.stamina.value);
          }
          else {
            stamina += damage.targetDamage;
          }
          break;
        default:
          if (damage.targetDamage + surface > this.system.hitpoints.surface.value) {
            surface += this.system.hitpoints.surface.value;
            deep += (damage.targetDamage - this.system.hitpoints.surface.value);
          }
          else {
            surface += damage.targetDamage;
          }
          break;
      }

      rolls.push(newRoll);
    }

    if (blockRoll) {
      const tooltip = await blockRoll.getTooltip();
      const newRoll = foundry.utils.deepClone(blockRoll);
      newRoll.tooltip = tooltip;
      newRoll.flavor = "Block";

      rolls.push(newRoll);      
    }

    if (dodgeRoll) {
      const tooltip = await dodgeRoll.getTooltip();
      const newRoll = foundry.utils.deepClone(dodgeRoll);
      newRoll.tooltip = tooltip;
      newRoll.flavor = "Dodge";

      rolls.push(newRoll);
    }

    const handledDamage = {
      shpDamage: Math.abs(surface),
      dhpDamage: Math.abs(deep),
      staminaDamage: Math.abs(stamina),
    }

    if (handledDamage.shpDamage > this.system.hitpoints.surface.value) {
      handledDamage.shpDamage = this.system.hitpoints.surface.value;
      handledDamage.dhpDamage += Math.abs(surface) - this.system.hitpoints.surface.value;
      surface = this.system.hitpoints.surface.value;
    }

    if (handledDamage.staminaDamage > this.system.stamina.value) {
      handledDamage.staminaDamage = this.system.stamina.value;
      handledDamage.dhpDamage += Math.abs(stamina) - this.system.stamina.value;
      stamina = this.system.stamina.value;
    }

    const template = await renderTemplate("systems/utopia/templates/chat/new-damage-final.hbs", {
      actor: this,
      rolls: rolls,
      handledDamage: handledDamage
    });

    await UtopiaChatMessage.create({
      content: template,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.localize("UTOPIA.CHAT.DamageAppliedFlavor"),
    });

    await this.update({
      "system.hitpoints.surface.value": this.system.hitpoints.surface.value - Math.abs(surface),
      "system.hitpoints.deep.value": this.system.hitpoints.deep.value - Math.abs(deep),
      "system.stamina.value": this.system.stamina.value - Math.abs(stamina),
    });
  }

  /**
   * Applies siphon data present on the actor
   * @param {DamageInstance} damage - The damage instance to retrieve damage information from.
   */
  async _applySiphons(damage) {
    const effectiveSiphons = [];

    if (damage.target === this.uuid) { // We need to apply damage siphons (system.siphons)
      const damageType = damage.typeKey;
      const siphons = foundry.utils.getProperty(this.system.siphons, damageType);

      if (siphons) {
        await this._siphons(siphons, damage.shpDamage + damage.dhpDamage);
      }
    }
    else {
      if (damage.blocked) { // We need to apply block siphons
        const damageType = damage.typeKey;
        const siphons = foundry.utils.getProperty(this.system.blockSiphons, damageType);

        effectiveSiphons = await this._siphons(siphons, 0);
      }
      if (damage.dodged) {
        const damageType = damage.typeKey;
        const siphons = foundry.utils.getProperty(this.system.dodgeSiphons, damageType);

        effectiveSiphons = await this._siphons(siphons, 0);
      }
    }

    if (effectiveSiphons.length === 0) {
      return;
    }

    const template = await renderTemplate("systems/utopia/templates/chat/siphon.hbs", {
      actor: this,
      siphons: effectiveSiphons,
    });
    
    await UtopiaChatMessage.create({
      content: template,
      speaker: ChatMessage.getSpeaker({ actor: this }),
    });
  }

  async _siphons(siphons, damageDealt) {
    const effectiveSiphons = [];

    if (siphons.convertToStaminaPercent > 0) {
      const staminaToRestore = Math.floor((damageDealt * siphons.convertToStaminaPercent));
      await this.update({
        "system.stamina.value": Math.min(this.system.stamina.max, this.system.stamina.value + staminaToRestore)
      });
      effectiveSiphons.push({
        type: "stamina",
        value: staminaToRestore,
      });
    }
    if (siphons.convertToStaminaFixed > 0) {
      const staminaToRestore = siphons.convertToStaminaFixed;
      await this.update({
        "system.stamina.value": Math.min(this.system.stamina.max, this.system.stamina.value + staminaToRestore)
      });
      effectiveSiphons.push({
        type: "stamina",
        value: staminaToRestore,
      });
    }
    if (siphons.convertToStaminaFormula.length > 0) {
      const formula = siphons.convertToStaminaFormula;
      const staminaToRestore = (await new Roll(formula, this.getRollData()).evaluate()).total;
      await this.update({
        "system.stamina.value": Math.min(this.system.stamina.max, this.system.stamina.value + staminaToRestore)
      });
      effectiveSiphons.push({
        type: "stamina",
        value: staminaToRestore,
      })
    }
    if (siphons.convertToSurfacePercent > 0) {
      const surfaceToRestore = Math.floor((damageDealt * siphons.convertToSurfacePercent));
      await this.update({
        "system.hitpoints.surface.value": Math.min(this.system.hitpoints.surface.max, this.system.hitpoints.surface.value + surfaceToRestore)
      });
      effectiveSiphons.push({
        type: "surface",
        value: surfaceToRestore,
      });
    }
    if (siphons.convertToSurfaceFixed > 0) {
      const surfaceToRestore = siphons.convertToSurfaceFixed;
      await this.update({
        "system.hitpoints.surface.value": Math.min(this.system.hitpoints.surface.max, this.system.hitpoints.surface.value + surfaceToRestore)
      });
      effectiveSiphons.push({
        type: "surface",
        value: surfaceToRestore,
      });
    }
    if (siphons.convertToSurfaceFormula.length > 0) {
      const formula = siphons.convertToSurfaceFormula;
      const surfaceToRestore = (await new Roll(formula, this.getRollData()).evaluate()).total;
      await this.update({
        "system.stamina.value": Math.min(this.system.stamina.max, this.system.stamina.value + surfaceToRestore)
      });
      effectiveSiphons.push({
        type: "surface",
        value: surfaceToRestore,
      })
    }
    if (siphons.convertToDeepPercent > 0) {
      const deepToRestore = Math.floor((damageDealt * siphons.convertToDeepPercent));
      await this.update({
        "system.hitpoints.deep.value": Math.min(this.system.hitpoints.deep.max, this.system.hitpoints.deep.value + deepToRestore)
      });
      effectiveSiphons.push({
        type: "deep",
        value: deepToRestore,
      });
    }
    if (siphons.convertToDeepFixed > 0) {
      const deepToRestore = siphons.convertToDeepFixed;
      await this.update({
        "system.hitpoints.deep.value": Math.min(this.system.hitpoints.deep.max, this.system.hitpoints.deep.value + deepToRestore)
      });
      effectiveSiphons.push({
        type: "deep",
        value: deepToRestore,
      });
    }
    if (siphons.convertToDeepFormula.length > 0) {
      const formula = siphons.convertToDeepFormula;
      const deepToRestore = (await new Roll(formula, this.getRollData()).evaluate()).total;
      await this.update({
        "system.stamina.value": Math.min(this.system.stamina.max, this.system.stamina.value + deepToRestore)
      });
      effectiveSiphons.push({
        type: "deep",
        value: deepToRestore,
      })
    }
    if (siphons.convertToResource !== undefined && siphons.convertToResource.length > 0) {
      // TODO - Implement resource conversion logic
    }

    return effectiveSiphons;
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

  
  // *****************************************************
  // Actor exclusive getters and helpers
  // *****************************************************
  _onCreateDescendantDocuments(parent, collection, documents, data, options, userId) { // TODO - Move Species processing here
    // This method is called when a new document is created that is a descendant of this actor.
    console.warn("Actor._onCreateDescendantDocuments called", parent, collection, documents, data, options, userId);

    for (const document of documents) {
      if (document.type === "body") {
        const baseDR = document.system.baseDR;
        this.update({
          "system.baseDR": baseDR,
        });
      }

      if (document.type === "species") {
        this.update({
          "system._speciesData": foundry.utils.mergeObject( document.system.toObject(), {name: document.name} ),
          "system._hasSpecies": true,
        })
      }
    }

    if (collection === "effects") { // ActiveEffect created
      if (data.statuses && data.statuses.includes('grappled')) { // Character grappled
        new foundry.applications.api.DialogV2({
          window: { title: "Choose an option" },
          content: `<p>You're being grappled! Select a check to respond with.</p>`,
          buttons: [{
            action: "str",
            label: "Strength",
            default: true,
          }, {
            action: "agi",
            label: "Agility",
          }],
          submit: result => {
            if (result === "str") this.check("str");
            else if (result === "agi") this.check("agi");
          }
        }).render({ force: true });
      }
    }

    super._onCreateDescendantDocuments(parent, collection, documents, data, options, userId);
  }

  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);

    if (!game.user.isGM) return;
    this.createEmbeddedDocuments("Item", [{
      type: "action",
      name: game.i18n.localize("UTOPIA.Actors.Actions.WeaponlessAttack"),
      system: {
        isBaseAction: true,
        category: "damage",
        damages: [{
          formula: this.system.weaponlessAttacks.formula,
          type: this.system.weaponlessAttacks.type,
        }],
        damageModifier: this.system.weaponlessAttacks.traits[0],
        template: "target",
        range: "0/0",
        cost: String(this.system.weaponlessAttacks.actionCost),
        stamina: this.system.weaponlessAttacks.stamina
      }
    }]);

    this.createEmbeddedDocuments("Item", [{
      type: "action",
      name: game.i18n.localize("UTOPIA.Actors.Actions.DeepBreath"),
      system: {
        isBaseAction: true,
        category: "utility",
        restoration: true,
        restorationType: "stamina",
        formula: 1,
        type: "turn",
        cost: "1",
        stamina: 0,
      }
    }]);

    this.createEmbeddedDocuments("Item", [{
      type: "action",
      name: game.i18n.localize("UTOPIA.Actors.Actions.Grapple"),
      system: {
        isBaseAction: true,
        category: "test",
        checks: new Set(["str"]),
        checkAgainstTarget: true,
        checkAgainstTrait: "str",
        applyStatusEffectToTarget: true,
        statusEffectToApply: "grappled",
        type: "turn",
        cost: "3",
        stamina: 2,
      }
    }]);

    this.createEmbeddedDocuments("Item", [{
      type: "action",
      name: game.i18n.localize("UTOPIA.Actors.Actions.Aim"),
      system: {
        isBaseAction: true,
        category: "active",
        toggleActiveEffects: true,
        type: "turn",
        cost: "1",
        stamina: 0,
      },
      effects: [{
        transfer: true,
        name: game.i18n.localize("UTOPIA.Actors.Actions.Aim"),
        changes: [{
          key: "system.favors.accuracy",
          value: "1",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          priority: 1
        }],
        disabled: true,
        duration: {
          turns: 1
        }
      }]
    }]);

    this.createEmbeddedDocuments("Item", [{
      type: "action",
      name: game.i18n.localize("UTOPIA.Actors.Actions.TakeCover"),
      system: {
        isBaseAction: true,
        category: "active",
        type: "current",
        toggleActiveEffects: true,
        cost: "1",
        stamina: 1,
      },
      effects: [{
        transfer: true,
        name: game.i18n.localize("UTOPIA.Actors.Actions.TakeCover"),
        changes: [
          {
            key: "system.block.quantity",
            value: "2",
            mode: CONST.ACTIVE_EFFECT_MODES.MULTIPLY,
            priority: 1
          },
          {
            key: "system.dodge.quantity",
            value: "2",
            mode: CONST.ACTIVE_EFFECT_MODES.MULTIPLY,
            priority: 1
          }
        ],
        disabled: true,
        duration: {
          turns: 1
        }
      }]
    }]);

    this.createEmbeddedDocuments("Item", [{
      type: "action",
      name: game.i18n.localize("UTOPIA.Actors.Actions.Travel"),
      system: {
        isBaseAction: true,
        category: "passive",
        type: "turn",
        cost: "1",
        stamina: 0,
      },
    }]);

    this.createEmbeddedDocuments("Item", [{
      type: "action",
      name: game.i18n.localize("UTOPIA.Actors.Actions.Stealth"),
      system: {
        isBaseAction: true,
        category: "test",
        checks: ["stu"],
        type: "current",
        cost: "1",
        stamina: 0,
      },
    }]);

    this.createEmbeddedDocuments("Item", [{
      type: "action",
      name: game.i18n.localize("UTOPIA.Actors.Actions.Leap"),
      system: {
        isBaseAction: true,
        category: "passive",
        type: "turn",
        cost: "3",
        stamina: 3,
      },
    }]);

    this.createEmbeddedDocuments("Item", [{
      type: "action",
      name: game.i18n.localize("UTOPIA.Actors.Actions.ScaleSame"),
      system: {
        isBaseAction: true,
        category: "test",
        checks: ["agi"],
        checkAgainstTarget: true,
        checkAgainstTrait: "str",
        type: "current",
        cost: "3",
        stamina: 4,
      },
    }]);

    this.createEmbeddedDocuments("Item", [{
      type: "action",
      name: game.i18n.localize("UTOPIA.Actors.Actions.ScaleLarger"),
      system: {
        isBaseAction: true,
        category: "test",
        checks: ["agi"],
        checkAgainstTarget: true,
        checkAgainstTrait: "agi",
        type: "current",
        cost: "3",
        stamina: 4,
      },
    }]);

    this.createEmbeddedDocuments("Item", [{
      type: "action",
      name: game.i18n.localize("UTOPIA.Actors.Actions.HoldAction"),
      system: {
        isBaseAction: true,
        category: "active",
        toggleActiveEffects: true,
        type: "turn",
        cost: "2",
        stamina: 0,
      },
      effects: [{
        transfer: true,
        name: game.i18n.localize("UTOPIA.Actors.Actions.HoldAction"),
        changes: [{
          key: "system.turnActions.temporary",
          value: "1",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          priority: 1
        }],
        disabled: true,
        duration: {
          rounds: 1
        }
      }]
    }]);

    // this.createEmbeddedDocuments("Item", [{
    //   type: "action",
    //   name: game.i18n.localize("UTOPIA.Actors.Actions.Assist"),
    //   system: {
    //     isBaseAction: true,
    //     category: "active",
    //     toggleActiveEffects: true,
    //     type: "turn",
    //     cost: "2",
    //     stamina: 0,
    //   },
    //   effects: [{
    //     transfer: true,
    //     name: game.i18n.localize("UTOPIA.Actors.Actions.Assist"),
    //     changes: [{
    //       key: "system.turnActions.temporary",
    //       value: "1",
    //       mode: CONST.ACTIVE_EFFECT_MODES.ADD,
    //       priority: 1
    //     }],
    //     disabled: true,
    //     duration: {
    //       rounds: 1
    //     }
    //   }]
    // }]);

    this.update({
      "system.hitpoints.surface.value": this.system.hitpoints.surface.max,
      "system.hitpoints.deep.value": this.system.hitpoints.deep.max,
      "system.stamina.value": this.system.stamina.max,
    })
  }

  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);

    for (const item of this.items) {
      if (item.type === "action" && item.system.isBaseAction) {
        item.reset();
      }
    }
  }


  // TODO - Finish this method - was taken from 'item.mjs'
  // async _autoRollAttacks(chatMessage = undefined) {
  //   // Check if the world "AutoRollAttacks" setting is enabled
  //   if (game.settings.get("utopia", "autoRollAttacks")) {
  //     var formula = this.system.damage ?? this.system.formula ?? "0";
  //     // Check if we should automatically redistribute dice
  //     if (game.settings.get("utopia", "diceRedistribution")) {

  //       switch (game.settings.get("utopia", "diceRedistributionSize")) {
  //         case 0: // Use the default formula
  //           break;
  //         case 1: // Use the smallest redistribution (smallest dice size)
  //           formula = this.redistributions[0] ?? this.redistributions[0];
  //           break;
  //         case 2: // Use the largest redistribution (largest dice size)
  //           formula = this.redistributions.at(-1) ?? this.redistributions[0];
  //           break;
  //       }

  //       this.performStrike(chatMessage, {formula: formula});
  //     }
  //     // We roll based on the default formula\
  //     else {       
  //       this.performStrike(chatMessage, {formula: roll.formula});
  //     }
  //   }
  // }
}