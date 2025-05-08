import { prepareGearDataPostActorPrep } from "../models/utility/gear-utils.mjs";
import { DamageInstance } from "../system/oldDamage.mjs";
import { UtopiaTemplates } from "../system/init/measuredTemplates.mjs";
import { UtopiaChatMessage } from "./chat-message.mjs";

export class UtopiaItem extends Item {

  async getRollData() {
    const owner = this.actor ?? this.parent ?? game.user.character ?? game.user;
    if (owner instanceof Actor) {
      const rollData = owner.getRollData() ?? {};
      rollData.item = this;
      return rollData;
    }
    return {};
  }

  /**
   * Only used for 'gear' type items.
   * Calculates which component amounts are still needed after subtracting contributions,
   * and determines if any excess components should be returned.
   */
  async craft(iterations = 0) {
    // First and foremost, we need to check if the item has a crafting macro associated with it.
    // The macro could either be a single UUID or an array of UUIDs.
    if (this.system.craftingMacro && this.system.craftingMacro.length > 0) {
      // If the crafting macro is a single UUID, we convert it to an array.
      const macros = Array.isArray(this.system.craftingMacro) ? this.system.craftingMacro : [this.system.craftingMacro];
      // We need to check if the macro exists in the game.
      const macro = macros.map(uuid => fromUuidSync(uuid)).find(m => m);
      if (macro) {
        // If the macro exists, we execute
        // it and return the result.
        return await macro.execute({ item: this, actor: this.parent ?? game.user.character });
      }
      // If no macro was found, we return an error.
      return ui.notifications.error(game.i18n.localize('UTOPIA.ERRORS.CraftingMacroNotFound'));
    }

    // Parent item (unused in this snippet but kept for context)
    const actorOwner = this.parent;

    // Secondly, we prompt the user with a dialog to ask if they are crafting this item for a specific character.
    const characters = game.actors.filter(a => a.type === "character");
    // Store the character this is crafted for
    let craftingFor = this.system.craftedFor || actorOwner?.uuid || game.user.character?.uuid;

    if (this.system.prototype) {
      const result = await foundry.applications.api.DialogV2.prompt({
        window: { title: "Choose an option" },
        content: characters.map(c => {
          return `<label><input type="radio" name="character" value="${c.uuid}" ${c.uuid === craftingFor ? 'checked' : ''}> ${c.name}</label>`;
        }).join(''),
        ok: {
          label: "Craft For",
          callback: (event, button, dialog) => button.form.elements.character.value
        }
      });
      if (result) {
        craftingFor = result;
      }
      else {
        // If the user cancelled the dialog, we return early.
        return ui.notifications.info(game.i18n.localize('UTOPIA.NOTIFICATIONS.CraftingCancelled'));
      }
    }

    // Prevent infinite loops by limiting the number of iterations.
    iterations++;

    // Retrieve rarity configuration from the game system
    const rarityConfig = JSON.parse(game.settings.get("utopia", "advancedSettings.rarities"));
    // Retrieve component configuration from the game system
    const componentConfig = JSON.parse(game.settings.get("utopia", "advancedSettings.components"));
    // Calculate total cost points (using absolute value)
    const totalCostPoints = Math.abs(this.system.cost);
    // Components that have been contributed:
    // Expected structure: { material: { crude: number, common: number, ... }, refinement: {...}, power: {...} }
    const contributedComponents = this.system.contributedComponents;

    // Create a boolean to check if any components are needed
    var anyNeeded = false;

    // Get the actor's crafting discounts
    const craftingDiscounts = actorOwner.system.artifice?.gearDiscounts || {};

    // Initialize the total required amounts for each main component type.
    const neededComponents = {
      ...Object.keys(componentConfig).reduce((acc, key) => {
        acc[key] = 0;
        return acc;
      }, {})
    };

    // Create a boolean to check if any components are excess
    var anyExcess = false;

    // Initialize excess components (to be returned if contributions exceed requirements).
    const excessComponents = {
      ...Object.keys(componentConfig).reduce((acc, key) => {
        acc[key] = 0;
        return acc;
      }, {})
    };

    // Sum up required component amounts from each feature.
    // Each feature defines its own required amounts under feature.system.final.
    for (const [featureId, feature] of Object.entries(this.system.features)) {
      neededComponents.material += parseFloat(feature.system.final.material);
      neededComponents.refinement += parseFloat(feature.system.final.refinement);
      neededComponents.power += parseFloat(feature.system.final.power);
    }

    // Apply crafting discounts to the needed components.
    for (const [componentType, discount] of Object.entries(craftingDiscounts)) {
      if (neededComponents[componentType] !== undefined) {
        // Apply the discount to the needed amount. Minimum is 1.
        neededComponents[componentType] = Math.max(1, neededComponents[componentType] - discount);
      }
    }

    // Determine the item's rarity based on the total cost points.
    let itemRarity = "crude";
    let itemRarityValue = 0;
    for (const [rarityKey, rarityData] of Object.entries(rarityConfig)) {
      if (totalCostPoints >= rarityData.points.minimum && totalCostPoints <= rarityData.points.maximum) {
        itemRarity = rarityKey;
        itemRarityValue = rarityData.value;
        break;
      }
    }

    // Process contributed components:
    // For each component type (material, refinement, power), subtract contributed amounts (matching the current rarity)
    // from the needed components.
    for (const [componentType, rarityContributions] of Object.entries(contributedComponents)) {
      for (const [rarity, amount] of Object.entries(rarityContributions)) {
        if (
          amount > 0 &&
          (rarity === itemRarity || rarityConfig[rarity].value === itemRarityValue)
        ) {
          // Subtract the contributed amount from the total needed amount.
          neededComponents[componentType] -= amount;

          // If the exact requirement is met, remove that component key.
          if (neededComponents[componentType] === 0) {
            delete neededComponents[componentType];
          }
          // If contributions exceed the requirement, record the surplus and remove the key.
          if (neededComponents[componentType] < 0) {
            excessComponents[componentType] = Math.abs(neededComponents[componentType]);
            delete neededComponents[componentType];
          }
        }
        else if (
          amount > 0 &&
          (rarity !== itemRarity || rarityConfig[rarity].value !== itemRarityValue)
        ) {
          // If the rarity doesn't match, add the contributed amount to excessComponents.
          excessComponents[componentType] ??= {};
          excessComponents[componentType][rarity] += amount;
        }
      }
    }

    // At this point:
    // - neededComponents contains any remaining required amounts (if any).
    // - excessComponents contains any surplus that should be returned.

    // Go through the neededComponents and 'anyNeeded' to indicate if any components are still needed.
    if (Object.values(neededComponents).some(amount => amount > 0)) {
      anyNeeded = true;
    }

    // Go through the excessComponents and 'anyExcess' to indicate if any components are excess.
    if (Object.values(excessComponents).some(amount => amount > 0)) {
      anyExcess = true;
    }

    // If there are no needed components and no excess components, we can mark the item as complete.
    if (!anyNeeded && !anyExcess) {
      if (!this.system.prototype) {
        // The item isn't a prototype, so we increase the quantity
        return await this.update({
          [`system.quantity`]: this.system.quantity + 1,
          [`system.prototype`]: false,
        });
      }

      // The item is a prototype, so we mark it as not a prototype (quantity is 1 by default).
      return await this.update({
        [`system.quantity`]: 1,
        [`system.prototype`]: false,
        [`system.craftedFor`]: craftingFor,
      });
    }

    // Create variables to hold the remaining components and actor contributions.
    var remainingComponents = {};
    var actorContributed = {};

    // If there are needed components, we need to pass the crafting functionality to the actor.
    if (anyNeeded || anyExcess) {
      if (!actorOwner && game.user.isGM) {
        const confirm = await foundry.applications.api.DialogV2.confirm({
          window: { title: "UTOPIA.COMMON.confirmDialog" },
          content: game.i18n.localize("UTOPIA.COMMON.gmCraftItem"),
          rejectClose: false,
          modal: true
        });

        return await this.update({
          [`system.prototype`]: !confirm
        })
      }

      [remainingComponents, actorContributed] = await actorOwner.craft(neededComponents, excessComponents, itemRarity);
    }

    // If the actor contributed any components, we need to update the item,
    // and add them to the contributedComponents.
    if (Object.values(actorContributed).some(amount => amount > 0)) {
      for (const [componentType, contribution] of Object.entries(actorContributed)) {
        if (contribution > 0) {
          const existingAmount = this.system.contributedComponents[componentType]?.[rarity] ?? 0;
          const newAmount = existingAmount + contribution;
          await this.update({
            [`system.contributedComponents.${componentType}.${rarity}`]: newAmount
          })
        }
      }
    }

    const finalComponents = {};

    for (const [component, amount] of Object.entries(remainingComponents)) {
      // Add the rarity as a subkey to the component type.
      if (!finalComponents[component]) {
        finalComponents[component] = {};
      }
      if (!finalComponents[component][itemRarity]) {
        finalComponents[component][itemRarity] = 0;
      }
      // Add the amount to the remaining components.
      finalComponents[component][itemRarity] += amount;
    }

    const componentTypes = Object.entries(componentConfig).map(([key, value]) => ({
      key: key,
      ...value
    }));

    const rarityTypes = Object.entries(rarityConfig).map(([key, value]) => ({
      key: key,
      ...value
    }));

    // From the 'remainingComponents' object, we need to display a dialog to indicate
    // how many components are still needed.
    const content = await renderTemplate("systems/utopia/templates/dialogs/craft-remaining.hbs", {
      componentTypes,
      rarityTypes,
      components: finalComponents,
    })

    const confirm = await foundry.applications.api.DialogV2.confirm({
      window: { title: "UTOPIA.COMMON.confirmDialog" },
      content: content,
      rejectClose: false,
      modal: true
    });

    if (confirm && game.user.isGM) {
      // If a GM confirmed the dialog, we finish the crafting process
      await this.update({
        [`system.prototype`]: false,
        [`system.contributedComponents`]: finalComponents,
        [`system.craftedFor`]: craftingFor,
      })
    }

    // If there are remaining components, the item remains a prototype,
    // and we should re-run the crafting function if we have not reached the max iterations.
  }

  async use() {
    switch (this.type) {
      case "gear":
        return this._useGear();
      case "featureSpell":
      case "featureGear":
      case "quirk":
      case "kit":
      case "class":
      case "body":
      case "species":
        return this._toMessage();
      case "spell":
        return this._castSpell();
      case "action":
        return this.parent?._performAction({ item: this }) ?? this._performAction();
    }
  }

  async equip() {
    // We require the parent actor to be defined.
    if (!this.parent) {
      return ui.notifications.error(game.i18n.localize('UTOPIA.ERRORS.NoParentActor'));
    }

    if (this.type === "gear") {
      // We need to validate whether this item can even be equipped
      if (!this.system.equippable) {
        return ui.notifications.error(game.i18n.localize('UTOPIA.ERRORS.ItemNotEquippable'));
      }

      const type = this.system.type;
      switch (type) {
        case "weapon":
          this.parent.equip({
            item: this,
            slot: {
              slot: "system.handheldSlots",
              hands: this.system.hands ?? 1,
            },
            override: true
          });
          break;
        case "armor":
          this.parent.equip({
            item: this,
            slot: {
              slot: "system.equipmentSlots",
              type: this.system.armorType.replace("Armor", "").toLowerCase(),
            },
            override: true
          });
          break;
        case "shield":
          this.parent.equip({
            item: this,
            slot: {
              slot: "system.handheldSlots",
              hands: this.system.hands ?? 1,
            },
            override: true
          });
          break;
        case "artifact":
          switch (this.system.artifactType) {
            case "handheldArtifact":
              this.parent.equip({
                item: this,
                slot: {
                  slot: "system.handheldSlots",
                  hands: this.system.hands ?? 1,
                },
                override: true
              });
              break;
            case "equippableArtifact":
              this.parent.equip({
                item: this,
                slot: {
                  slot: "system.equipmentSlots",
                  type: this.system.equippableArtifactSlot.toLowerCase(),
                },
                override: true
              });
              break;
            case "ammunitionArtifact":
              break;
          }
          break;
      }
    }
  }

  async augment() {
    // We require the parent actor to be defined.
    if (!this.parent) {
      return ui.notifications.error(game.i18n.localize('UTOPIA.ERRORS.NoParentActor'));
    }

    if (this.type === "gear") {
      // We need to validate whether this item can even be equipped
      if (!this.system.augmentable) {
        return ui.notifications.error(game.i18n.localize('UTOPIA.ERRORS.ItemCannotBeAugmented'));
      }

      const type = this.system.type;
      switch (type) {
        case "weapon":
          return ui.notifications.error(game.i18n.localize('UTOPIA.ERRORS.ItemCannotBeAugmented'));
        case "armor":
          this.parent.augment({
            item: this,
            slot: {
              slot: "system.augmentSlots",
              type: this.system.armorType.replace("Armor", "").toLowerCase(),
            },
            override: true
          });
          break;
        case "shield":
          return ui.notifications.error(game.i18n.localize('UTOPIA.ERRORS.ItemCannotBeAugmented'));
        case "artifact":
          switch (this.system.artifactType) {
            case "handheldArtifact":
              return ui.notifications.error(game.i18n.localize('UTOPIA.ERRORS.ItemCannotBeAugmented'));
            case "equippableArtifact":
              this.parent.augment({
                item: this,
                slot: {
                  slot: "system.augmentSlots",
                  type: this.system.equippableArtifactSlot.toLowerCase(),
                },
                override: true
              });
              break;
            case "ammunitionArtifact":
              break;
          }
          break;
      }
    }
  }

  async roll() {
    this.use();
  }

  async _useGear() {
    // First, check if its a consumable, and if we have a quantity greater than 0.
    if (this.system.type === "consumable" && this.system.quantity <= 0) {
      return ui.notifications.error(game.i18n.localize('UTOPIA.ERRORS.NoConsumableQuantity'));
    }

    const html = await renderTemplate("systems/utopia/templates/chat/gear-card.hbs", {
      item: this,
      features: this.system.features,
    });

    const chatMessage = await UtopiaChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker(),
      content: html,
      system: { item: this }
    });

    // We should only perform attacks if the item has 'system.damage' or 'system.formula' populated
    if ((!this.system.damage && !this.system.formula) || (!this.system.damage.length === 0 && !this.system.formula.length === 0)) {
      // Otherwise, we return the chat message
      // If the item is a consumable, we should remove one of its quantities
      if (this.system.type === "consumable" && this.system.quantity > 0) {
        await this.update({ "system.quantity": this.system.quantity - 1 });
      }

      return chatMessage;
    }

    // Perform automatic attacks if necessary
    this._autoRollAttacks(chatMessage);
  }

  async performStrike(chatMessage = undefined, options = {}) {
    // Remove strike buttons from the chat message
    if (chatMessage instanceof UtopiaChatMessage)
      chatMessage.removeStrikeButtons();

    const formula = options.formula ?? this.redistributions[0];

    const targets = [...game.user.targets.map(t => t.actor)] || [];
    if (targets.length == 0) { // No targets selected
      if (game.settings.get("utopia", "targetRequired")) {
        return ui.notifications.error(game.i18n.localize('UTOPIA.ERRORS.NoTargetsSelected'));
      }
      else {
        ui.notifications.info(game.i18n.localize('UTOPIA.NOTIFICATIONS.NoTargetsSelectedInfo'));
      }
    }

    const damageRoll = new Roll(formula ?? "0", this.getRollData())
    const damageValue = await damageRoll.evaluate();
    for (const target of targets) {
      const damage = new DamageInstance({
        type: this.system.damageType ?? "physical",
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

    if (this.system.returnDamage && new Roll(this.system.returnDamage).formula > 0) {
      const owner = this.actor ?? this.parent ?? game.user.character ?? game.user;
      const returnRoll = new Roll(this.system.returnDamage);
      const returnValue = await returnRoll.evaluate();
      const returnDamage = new DamageInstance({
        type: this.system.damageType ?? "physical",
        value: returnValue.total,
        target: owner.uuid,
        source: this,
        roll: returnRoll,
      });
      const handledDamage = await returnDamage.handle();
      const returnDamageMessage = await returnDamage.toMessage();
      console.warn(returnDamageMessage);
    }
  }

  async _castSpell() {
    const featureSettings = this.system.featureSettings;
    const owner = this.actor ?? this.parent ?? game.user.character ?? game.user;
    const stamina = owner.isGM ? Infinity : owner.system.stamina.value;
    const spellcasting = owner.isGM ? this.constructor.GM_SPELLCASTING() : owner.system.spellcasting;
    const features = [];
    var cost = 0;

    for (const featureUuid of this.system.features) {
      const feature = await fromUuid(featureUuid);
      const art = feature.system.art;
      const settings = featureSettings[feature.id] ?? {};
      const stacks = settings.stacks.value ?? 1;

      if (spellcasting.artistries[art]) {
        if (spellcasting.artistries[art].unlocked === false)
          return ui.notifications.error(game.i18n.localize('UTOPIA.ERRORS.ArtistryNotUnlocked'));
        if (spellcasting.artistries[art].multiplier === 0)
          return ui.notifications.error(game.i18n.localize('UTOPIA.ERRORS.ArtistryMultiplierZero'));

        if (featureSettings) {
          const costVariable = settings.cost?.value ?? 1;
          cost += feature.system.cost *
            stacks *
            spellcasting.artistries[art].multiplier *
            costVariable;
        }
      }

      feature.variables = settings;
      features.push(feature);
    }

    cost = Math.floor(cost / 10);

    // First and foremost, we need to validate the spell's stamina is less than the owner's spellcap
    if (cost > owner.system.spellcasting.spellcap) {
      return ui.notifications.error(game.i18n.localize('UTOPIA.ERRORS.SpellCostExceedsSpellcap'));
    }

    if (stamina < cost) {
      const proceed = await foundry.applications.api.DialogV2.confirm({
        content: game.i18n.format('UTOPIA.ERRORS.NotEnoughStamina', { dhp: Math.abs(cost - stamina) }),
        rejectClose: false,
        modal: true
      });
      if (proceed === false) {
        return;
      }
    }

    if (!owner.isGM) {
      const damage = new DamageInstance({
        type: "stamina",
        source: this,
        value: cost,
        target: owner.uuid,
      });
      const handledDamage = await damage.handle();
      const damageMessage = await damage.toFinalMessage();
    }

    const templates = await this.system.getTemplate(this);

    const content = await renderTemplate("systems/utopia/templates/chat/spell-card.hbs", {
      item: this,
      owner: owner,
      cost: cost,
      features: features,
      templates: templates
    });

    const chatMessage = await UtopiaChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker(),
      content: content,
      system: {
        item: this,
        templates: templates
      },
      flags: { utopia: { itemUuid: this.uuid } }
    });

    // Perform automatic attacks if necessary
    //this._autoRollAttacks(chatMessage);

    if (templates.length > 0) {
      for (const feature of features) {
        if (feature.system.formula && feature.system.formula.length > 0) {
          // There are special flavors attributed to spell features,
          // `[DHP]` is used as a "damage type" that restores Deep Health Points (DHP),
          // `[SHP]` is used as a "damage type" that restores Stamina Health Points (SHP).
          // `[STA]` is used as a "damage type" that restores Stamina (STA).

          // We need to substitute any 'X' in the formula, with the actual cost of the spell.
          let formula = feature.system.formula;

          if (feature.system.costMultiplier === "multiply") {
            formula = formula.replace("@X", featureSettings[feature.id]?.cost?.value ?? 1);
          }

          if (featureSettings[feature.id]?.stacks?.value > 1) {
            for (let i = 1; i < featureSettings[feature.id].stacks.value; i++) {
              if (feature.system.costMultiplier === "multiply") {
                formula += ` + ${feature.system.formula.replace("@X", featureSettings[feature.id]?.cost?.value ?? 1)}`;
              }
              else {
                formula += ` + ${feature.system.formula}`;
              }
            }
          }

          const roll = new Roll(formula, this.getRollData());
          const rollValue = await roll.evaluate();

          let damageType = feature.system.damageType ?? "physical";
          for (const die of roll.dice.filter(d => d.constructor.name === "Die")) {
            if (die.flavor === "DHP") {
              damageType = "deepHealing";
            }
            else if (die.flavor === "SHP") {
              damageType = "healing";
            }
            else if (die.flavor === "STA") {
              damageType = "restoreStamina";
            }
          }

          // If there are no templates to place, we simply roll the damage.
          for (const target of Array.from(game.user.targets)) {
            const damage = new DamageInstance({
              type: damageType,
              value: rollValue.total,
              target: target.actor.uuid,
              source: this,
              roll: roll,
            });
            const handledDamage = await damage.handle();
            const damageMessage = await damage.toMessage();
          }
        }
      }
    }
  }

  async _finishCastingSpell(chatMessage, options = {}) {
    const templates = chatMessage.getFlag("utopia", "placedTemplates") || [];
    const targets = [];

    for (const template of templates) {
      const sceneTemplate = canvas.scene.templates.get(template);

      for (const token of canvas.scene.tokens) {
        if (token.object && UtopiaTemplates.testPoint(token.object.getCenterPoint(), sceneTemplate._object)) {
          targets.push(token.actor);
        }
      }

      const featureSettings = this.system.featureSettings;
      const owner = this.actor ?? this.parent ?? game.user.character ?? game.user;
      const stamina = owner.isGM ? Infinity : owner.system.stamina.value;
      const spellcasting = owner.isGM ? this.constructor.GM_SPELLCASTING() : owner.system.spellcasting;
      const features = [];
      var cost = 0;

      for (const featureUuid of this.system.features) {
        const feature = await fromUuid(featureUuid);
        const art = feature.system.art;
        const settings = featureSettings[feature.id] ?? {};
        const stacks = settings.stacks.value ?? 1;

        if (spellcasting.artistries[art]) {
          if (spellcasting.artistries[art].unlocked === false)
            return ui.notifications.error(game.i18n.localize('UTOPIA.ERRORS.ArtistryNotUnlocked'));
          if (spellcasting.artistries[art].multiplier === 0)
            return ui.notifications.error(game.i18n.localize('UTOPIA.ERRORS.ArtistryMultiplierZero'));

          if (featureSettings) {
            const costVariable = settings.cost?.value ?? 1;
            cost += feature.system.cost *
              stacks *
              spellcasting.artistries[art].multiplier *
              costVariable;
          }
        }

        feature.variables = settings;
        features.push(feature);
      }

      for (const feature of features) {
        if (feature.system.formula && feature.system.formula.length > 0) {
          // There are special flavors attributed to spell features,
          // `[DHP]` is used as a "damage type" that restores Deep Health Points (DHP),
          // `[SHP]` is used as a "damage type" that restores Stamina Health Points (SHP).
          // `[STA]` is used as a "damage type" that restores Stamina (STA).

          // We need to substitute any 'X' in the formula, with the actual cost of the spell.
          let formula = feature.system.formula;

          if (feature.system.costMultiplier === "multiply") {
            formula = formula.replace("@X", featureSettings[feature.id]?.cost?.value ?? 1);
          }

          if (featureSettings[feature.id]?.stacks?.value > 1) {
            for (let i = 1; i < featureSettings[feature.id].stacks.value; i++) {
              if (feature.system.costMultiplier === "multiply") {
                formula += ` + ${feature.system.formula.replace("@X", featureSettings[feature.id]?.cost?.value ?? 1)}`;
              }
              else {
                formula += ` + ${feature.system.formula}`;
              }
            }
          }

          const roll = new Roll(formula, this.getRollData());
          const rollValue = await roll.evaluate();

          let damageType = feature.system.damageType ?? "physical";
          for (const die of roll.dice.filter(d => d.constructor.name === "Die")) {
            if (die.flavor === "DHP") {
              damageType = "deepHealing";
            }
            else if (die.flavor === "SHP") {
              damageType = "healing";
            }
            else if (die.flavor === "STA") {
              damageType = "restoreStamina";
            }
          }

          // If there are no templates to place, we simply roll the damage.
          for (const target of targets) {
            const damage = new DamageInstance({
              type: damageType,
              value: rollValue.total,
              target: target.uuid,
              source: this,
              roll: roll,
            });
            const handledDamage = await damage.handle();
            const damageMessage = await damage.toMessage();
          }
        }
      }
    }
  }

  // *****************************************************
  // Item exclusive getters and helpers
  // *****************************************************
  async _autoRollAttacks(chatMessage = undefined) {
    // Check if the world "AutoRollAttacks" setting is enabled
    if (game.settings.get("utopia", "autoRollAttacks")) {
      var formula = this.system.damage ?? this.system.formula ?? "0";
      // Check if we should automatically redistribute dice
      if (game.settings.get("utopia", "diceRedistribution")) {

        switch (game.settings.get("utopia", "diceRedistributionSize")) {
          case 0: // Use the default formula
            break;
          case 1: // Use the smallest redistribution (smallest dice size)
            formula = this.redistributions[0] ?? this.redistributions[0];
            break;
          case 2: // Use the largest redistribution (largest dice size)
            formula = this.redistributions.at(-1) ?? this.redistributions[0];
            break;
        }

        this.performStrike(chatMessage, { formula: formula });
      }
      // We roll based on the default formula
      else {
        this.performStrike(chatMessage, { formula: roll.formula });
      }
    }
    else {
      // If the setting is disabled, we simply return the chat message
      if (chatMessage instanceof UtopiaChatMessage) {
        return chatMessage;
      }
      else {
        return this._toMessage();
      }
    }
  }

  /**
   * Getter for damage dice redistribution
   */
  get redistributions() {
    if (game.settings.get("utopia", "diceRedistribution")) {
      return this._redistributions();
    }

    // Prioritize 'this.system.damage'
    if (this.system.damage && this.system.damage.length > 0) {
      return [this.system.damage];
    }
    else if (this.system.formula && this.system.formula.length > 0) {
      return [this.system.formula];
    }
  }

  _redistributions() {
    const redistributions = [];

    const diceSizes = game.settings.get("utopia", "diceRedistributionDiceSizes").split(",").map(s => parseInt(s)).sort((a, b) => a - b);

    // Prioritize 'this.system.damage'
    if (this.system.damage && this.system.damage.length > 0) {
      const roll = new Roll(this.system.damage);
      for (const die of roll.dice.filter(d => d.constructor.name === "Die")) {
        const max = die.faces * die.number;
        for (const size of diceSizes) {
          if (max % size === 0) {
            redistributions.push(`${Math.floor(max / size)}d${size}`);
          }
        }
      }
    }

    else if (this.system.formula && this.system.formula.length > 0) {
      redistributions.push(this.system.formula);

      const roll = new Roll(this.system.formula);
      for (const die of roll.dice.filter(d => d.constructor.name === "Die")) {
        const max = die.faces * die.number;
        for (const size of diceSizes) {
          if (max % size === 0) {
            redistributions.push(`${Math.floor(max / size)}d${size}`);
          }
        }
      }
    }

    return redistributions;
  }

  static GM_SPELLCASTING = () => {
    const artistries = {}
    Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.artistries"))).map(([key, value]) => {
      artistries[key] = {
        unlocked: true,
        multiplier: 1
      }
    });

    return {
      artistries: {
        ...artistries
      }
    }
  }

  _toMessage() {
    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker(),
      content: this.system.description
    });
  }

  get effectCategories() {
    const categories = {};

    categories.temporary = {
      type: 'temporary',
      label: game.i18n.localize('TYPES.ActiveEffect.temporary'),
      effects: [],
    };
    categories.passive = {
      type: 'passive',
      label: game.i18n.localize('TYPES.ActiveEffect.passive'),
      effects: [],
    };
    categories.inactive = {
      type: 'inactive',
      label: game.i18n.localize('TYPES.ActiveEffect.inactive'),
      effects: [],
    };

    // Iterate over active effects, classifying them into categories
    for (let e of this.effects) {
      console.log(e);
      if (e.disabled) categories.inactive.effects.push(e);
      else if (e.isTemporary) categories.temporary.effects.push(e);
      else categories.passive.effects.push(e);
    }

    return categories;
  }

  /**
   * Item data preparation to take place after actor data preparation.
   */
  prepareDataPostActorPrep() {
    return;
  }
}