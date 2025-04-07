import { UtopiaChatMessage } from "../../documents/chat-message.mjs";

const { api, sheets } = foundry.applications;

export class ForageAndCrafting extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  actor = {};
  foraging = {
    component: null,
    rarity: null,
    time: null,
  };
  crafting = {
    component: null,
    rarity: null,
  };

  constructor(options = {}) {
    super(options);
    this.actor = options.actor ?? this.close;
  }

  static DEFAULT_OPTIONS = {
    classes: ["utopia", "forage-and-crafting"],
    position: {
      width: 800,
      height: "auto",
    },
    actions: {
      forage: this._forage,
      craft: this._craft,
    },
    window: {
      title: "UTOPIA.SheetLabels.ForageAndCrafting",
    },
  };

  static PARTS = {
    content: {
      template: "systems/utopia/templates/specialty/forage-and-crafting/content.hbs",
    },
  };

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ["content"];
  }

  async _prepareContext(options) {
    const components = JSON.parse(game.settings.get('utopia', 'advancedSettings.components'));
    const rarities = JSON.parse(game.settings.get('utopia', 'advancedSettings.rarities'));
    const foragingTimes = {
      "1": {
        label: "UTOPIA.ForageAndCrafting.ForagingTimes.1",
        time: 1,
        favor: -1,
      },
      "4": {
        label: "UTOPIA.ForageAndCrafting.ForagingTimes.4",
        time: 4,
        favor: 0,
      },
      "8": {
        label: "UTOPIA.ForageAndCrafting.ForagingTimes.8",
        time: 8,
        favor: 1,
      },
      "12": {
        label: "UTOPIA.ForageAndCrafting.ForagingTimes.12",
        time: 12,
        favor: 2,
      },
      "18": {
        label: "UTOPIA.ForageAndCrafting.ForagingTimes.18",
        time: 18,
        favor: 3,
      },
    }
    const craftingLevel = this.actor.system.artifice.level;
    const componentDiscounts = this.actor.system.artifice.componentDiscounts

    const foraging = {
      component: this.foraging.component ?? Object.keys(components)[0],
      rarity: this.foraging.rarity ?? Object.keys(rarities)[0],
      time: this.foraging.time ?? Object.keys(foragingTimes)[0],
    }

    foraging.difficulty = components[foraging.component].foraging[foraging.rarity].test;
    foraging.returnsFormula = components[foraging.component].foraging[foraging.rarity].harvest;
    foraging.returns = `${components[foraging.component].foraging[foraging.rarity].harvest} ${game.i18n.localize(rarities[foraging.rarity].label)} ${game.i18n.localize(components[foraging.component].label)} Components`;

    const foragingTrait = this.actor.system.artifice.components[foraging.component].foragingTrait;
    const foragingTraitModifier = this.actor.system.traits[foragingTrait]?.mod ??
      this.actor.system.subtraits[foragingTrait]?.mod ?? 0;
    foraging.formula = new Roll(`3d6 + ${foragingTraitModifier}`).alter(1, foragingTimes[foraging.time].favor).formula;
    
    this.foraging = foraging;

    const crafting = {
      component: this.crafting.component ?? Object.keys(components)[0],
      rarity: this.crafting.rarity ?? Object.keys(rarities)[0],
    }

    crafting.requirements = components[crafting.component].crafting[crafting.rarity] ?? undefined; 
    if (crafting.requirements) {
      const craftingTrait = this.actor.system.artifice.components[crafting.component].craftingTrait;
      const craftingTraitModifier = this.actor.system.traits[craftingTrait]?.mod ??
        this.actor.system.subtraits[craftingTrait]?.mod ?? 0;
      const netFavor = await this.actor.checkForFavor(craftingTrait);
      const roll = new Roll(`3d6 + ${craftingTraitModifier}`).alter(1, netFavor);
      crafting.difficulty = `${roll.formula} >= ${crafting.requirements.difficulty}`;
      crafting.formula = roll.formula;

      crafting.requirementsOutput = (() => {
        const reqData = components[crafting.component].crafting[crafting.rarity];
        const output = [];
        for (const [reqKey, reqValue] of Object.entries(reqData)) {
          if (reqKey === "difficulty") continue;
          // reqValue is an object mapping rarity keys to a quantity.
          for (const [rarityKey, quantity] of Object.entries(reqValue)) {
            const rarityLabel = game.i18n.localize(rarities[rarityKey].label);
            const componentLabel = game.i18n.localize(components[reqKey].label);
            output.push(`${quantity} ${rarityLabel} ${componentLabel}`);
          }
        }
        return output;
      })();
    }

    // Crafting time is stored in minutes, we need to localize and format it
    const craftingTime = rarities[crafting.rarity].times.component;
    crafting.time = crafting.time >= 60 ? `in ${Math.floor(craftingTime / 60)} ${game.i18n.localize("UTOPIA.TIME.Hours")}` : `in ${craftingTime} ${game.i18n.localize("UTOPIA.TIME.Minutes")}`;
    crafting.returns = `1 ${game.i18n.localize(rarities[crafting.rarity].label)} ${game.i18n.localize(components[crafting.component].label)} Component`;

    this.crafting = crafting;

    const context = {
      components,
      rarities,
      foraging,
      crafting,
      foragingTimes,
      craftingLevel,
      componentDiscounts,
    }

    console.log(context);

    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    
    const foragingComponent = this.element.querySelector("#foraging-component");
    const foragingRarity = this.element.querySelector("#foraging-rarity");
    const foragingTime = this.element.querySelector("#foraging-time");
    
    foragingComponent.addEventListener("change", (event) => {
      this.foraging.component = event.target.value;
      this.render(false);
    });

    foragingRarity.addEventListener("change", (event) => {
      this.foraging.rarity = event.target.value;
      this.render(false);
    });

    foragingTime.addEventListener("change", (event) => {
      this.foraging.time = event.target.value;
      this.render(false);
    });

    const craftingComponent = this.element.querySelector("#crafting-component");
    const craftingRarity = this.element.querySelector("#crafting-rarity");
    
    craftingComponent.addEventListener("change", (event) => {
      this.crafting.component = event.target.value;
      this.render(false);
    });

    craftingRarity.addEventListener("change", (event) => {
      this.crafting.rarity = event.target.value;
      this.render(false);
    });
  }

  static async _forage(event, target) {
    const foraging = this.foraging;
    const components = JSON.parse(game.settings.get('utopia', 'advancedSettings.components'));
    const rarities = JSON.parse(game.settings.get('utopia', 'advancedSettings.rarities'));

    const difficultyRoll = await new Roll(foraging.difficulty).evaluate();
    const testRoll = await new Roll(foraging.formula).evaluate();
   
    // For every multiple of the difficulty roll that the test roll exceeds, the level of success increases by 1
    // For example, if the difficulty roll is 10 and the test roll is 20, the level of success is 2
    // If the test roll is less than the difficulty roll, the level of success is 0
    var levelOfSuccess = 0;
    if (testRoll.total > difficultyRoll.total * 2) 
      levelOfSuccess = Math.floor((testRoll.total - difficultyRoll.total) / difficultyRoll.total);
    
    else if (testRoll.total > difficultyRoll.total) 
      levelOfSuccess = 1;

    else 
      levelOfSuccess = 0;

    // Convert the time to minutes, and divide by the level of success
    const timeDivision = Math.floor(foraging.time * 60 / levelOfSuccess);
    if (timeDivision === Infinity) 
      timeDivision = foraging.time * 60;

    const result = levelOfSuccess > 0 ? game.i18n.localize("UTOPIA.COMMON.success") : game.i18n.localize("UTOPIA.COMMON.failure");
    var returns = 0;
    if (result) 
      returns = await new Roll(foraging.returnsFormula).evaluate();
    returns = `${returns.total} ${game.i18n.localize(rarities[foraging.rarity].label)} ${game.i18n.localize(components[foraging.component].label)} Components`;

    var timeOutput = timeDivision >= 60 ? `${Math.floor(timeDivision / 60)} ${game.i18n.localize("UTOPIA.TIME.Hours")}` : `${timeDivision} ${game.i18n.localize("UTOPIA.TIME.Minutes")}`;

    UtopiaChatMessage.create({
      content: `<h2>${game.i18n.localize("UTOPIA.ForageAndCrafting.Foraging")}</h2>` +
        `<p>${game.i18n.format("UTOPIA.ForageAndCrafting.ForagingResult", { result })} (${testRoll.total} vs ${difficultyRoll.total})</p>` + 
        (levelOfSuccess > 0 ? 
          `<p>${game.i18n.format("UTOPIA.ForageAndCrafting.ForagingReturns", { returns })}` :
          `<p>${game.i18n.localize("UTOPIA.ForageAndCrafting.ForagingNoReturns")}`) + 
        `<p>${game.i18n.format("UTOPIA.ForageAndCrafting.ForagingTimeTaken", { time: timeOutput })}</p>`,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    });

    const actorComponents = this.actor.system.components;
    const newValue = actorComponents[foraging.component][foraging.rarity] + returns.total;

    await this.actor.update({
      [`system.components.${foraging.component}.${foraging.rarity}.available`]: newValue,
    });
  }

  static async _craft(event, target) {
    const crafting = this.crafting;

    const requirements = crafting.requirements;
    const difficulty = crafting.requirements.difficulty;
    const formula = await new Roll(crafting.formula).evaluate();

    // First find out if the actor has the required components
    const actorComponents = this.actor.system.components;
    for (const [component, rarity] of Object.entries(requirements)) {
      for (const [rarityKey, quantity] of Object.entries(rarity)) {
        const actorComponent = actorComponents[component][rarityKey].available;
        if (actorComponent < quantity) {
          ui.notifications.error(game.i18n.localize("UTOPIA.ForageAndCrafting.CraftingNotEnoughComponents"));
          return;
        }
      }
    }

    var success = formula.total >= difficulty;
  
    if (success) { 
      // If the roll is successful, remove the components from the actor
      for (const [component, rarity] of Object.entries(requirements)) {
        for (const [rarityKey, quantity] of Object.entries(rarity)) {
          const actorComponent = actorComponents[component][rarityKey].available;
          await this.actor.update({
            [`system.components.${component}.${rarityKey}.available`]: actorComponent - quantity,
          });
        }
      }

      // Add the crafted component to the actor
      const actorCraftedComponent = actorComponents[crafting.component][crafting.rarity].available ?? 0;
      await this.actor.update({
        [`system.components.${crafting.component}.${crafting.rarity}.available`]: actorCraftedComponent + 1,
      });
    }

    const result = success ? game.i18n.localize("UTOPIA.COMMON.success") : game.i18n.localize("UTOPIA.COMMON.failure");
    const returns = success ? crafting.returns : game.i18n.localize("UTOPIA.ForageAndCrafting.CraftingNoReturns");
    const time = crafting.time;

    UtopiaChatMessage.create({
      content: `<h2>${game.i18n.localize("UTOPIA.ForageAndCrafting.Crafting")}</h2>` +
        `<p>${game.i18n.format("UTOPIA.ForageAndCrafting.CraftingResult", { result })} (${formula.total} >= ${difficulty})</p>` + 
        `<p>${game.i18n.format("UTOPIA.ForageAndCrafting.CraftingReturns", { returns })}` +
        `<p>${game.i18n.format("UTOPIA.ForageAndCrafting.CraftingTimeTaken", { time })}</p>`,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    });
    
  }
}