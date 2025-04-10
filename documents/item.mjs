import { DamageInstance } from "../system/damage.mjs";
import { UtopiaChatMessage } from "./chat-message.mjs";

export class UtopiaItem extends Item {
  /**
   * Only used for 'gear' type items.
   * Calculates which component amounts are still needed after subtracting contributions,
   * and determines if any excess components should be returned.
   */
  async craft(iterations = 0) {
    // Prevent infinite loops by limiting the number of iterations.
    iterations++;

    // Parent item (unused in this snippet but kept for context)
    const actorOwner = this.parent;
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
      return await this.update({
        [`system.prototype`]: false
      })
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

    // From the 'remainingComponents' object, we need to display a dialog to indicate
    // how many components are still needed.
    const content = await renderTemplate("systems/utopia/templates/dialogs/craft-remaining.hbs", {
      componentTypes: Object.values(componentConfig),
      rarityTypes: Object.values(rarityConfig),
      components: remainingComponents,
    })

    const confirm = await foundry.applications.api.DialogV2.confirm({
      window: { title: "UTOPIA.COMMON.confirmDialog" }, 
      content: content,
      rejectClose: false,
      modal: true
    });

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
  
  async roll() {
    this.use();
  }

  async _useGear() {
    const html = await renderTemplate("systems/utopia/templates/chat/gear-card.hbs", {
      item: this,
      features: this.system.features,
    });

    UtopiaChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker(),
      content: html,
      system: { item: this }
    });

    // TODO - Remove
    console.warn(this);
  }

  async performStrike() {
    const targets = [...game.user.targets.map(t => t.actor)] || [];
    if (targets.length == 0) { // No targets selected
      if (game.settings.get("utopia", "targetRequired")) {
        return ui.notifications.error(game.i18n.localize('UTOPIA.ERRORS.NoTargetsSelected'));
      }
      else {
        ui.notifications.info(game.i18n.localize('UTOPIA.NOTIFICATIONS.NoTargetsSelectedInfo'));
      }
    } 

    const damageValue = await new Roll(this.system.damage ?? "0").evaluate();
    for (const target of targets) {
      const damage = new DamageInstance({
        type: this.system.damageType ?? "physical",
        value: damageValue.total,
        target: target,
        source: this,
      });
      const damageMessage = await damage.toMessage();
      console.warn(damage);
      console.warn(damageMessage);
    }

    if (this.system.returnDamage && new Roll(this.system.returnDamage).formula > 0) {
      const owner = this.actor ?? this.parent ?? game.user.character ?? game.user; 
      const returnValue = await new Roll(this.system.returnDamage ?? "0").evaluate();
      const returnDamage = new DamageInstance({
        type: this.system.damageType ?? "physical",
        value: returnValue.total,
        target: owner,
        source: this,
      });
      const returnDamageMessage = await returnDamage.toMessage();
      console.warn(returnDamageMessage);
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
      return [ this.system.damage ];
    }
    else if (this.system.formula && this.system.formula.length > 0) {
      return [ this.system.formula ];
    }
  }

  _redistributions() {
    const redistributions = [];

    const diceSizes = [100, 20, 12, 10, 8, 6, 4];

    // Prioritize 'this.system.damage'
    if (this.system.damage && this.system.damage.length > 0) {
      redistributions.push(this.system.damage);

      const roll = new Roll(this.system.damage);
      for (const die of roll.dice.filter(d => d.constructor.name === "Die")) {
        const max = die.faces * die.number;
        for (const size of diceSizes.filter(s => s != die.faces)) {
          if (max % size === 0) {
            redistributions.push(`${Math.floor(max / size)}d${size}`);
          }
        }
      }
    }

    else if (item.system.formula && item.system.formula.length > 0) {
      redistributions.push(this.system.formula);

      const roll = new Roll(this.system.formula);
      for (const die of roll.dice.filter(d => d.constructor.name === "Die")) {
        const max = die.faces * die.number;
        for (const size of diceSizes.filter(s => s != die.faces)) {
          if (max % size === 0) {
            redistributions.push(`${Math.floor(max / size)}d${size}`);
          }
        }
      }
    }
    
    return redistributions;
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
      const settings = featureSettings[featureUuid] ?? {};
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
        target: owner
      });
      
      owner.applyDamage(damage);
    }

    const template = await this.system.getTemplate(this);

    const content = await renderTemplate("systems/utopia/templates/chat/spell-card.hbs", {
      item: this,
      owner: owner,
      cost: cost,
      features: features,
      template: template
    });

    return UtopiaChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker(),
      content: content,
      system: {
        item: this,
        template: template
      }
    });

    // features.forEach(async (feature) => {
    //   if (feature.system.formula.length > 0) {
    //     const roll = await new Roll(feature.system.formula).evaluate();
    //     const keys = ["type", "damage", "damagetype", "damage type"];
    //     for (const [key, value] of Object.entries(feature.variables)) {
    //       if (keys.includes(key.toLowerCase())) {
    //         const type = JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))[value] ?? JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes")).energy;
    //         const damage = DamageInstance.create({
    //           type: type,
    //           value: roll.total,
    //           target: this.actor
    //         });

    //         owner.applyDamage(damage);
    //       }
    //     }
    //   }      
    // })
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
}