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
    foraging.returns = `${components[foraging.component].foraging[foraging.rarity].harvest} ${game.i18n.localize(rarities[foraging.rarity].label)} ${game.i18n.localize(components[foraging.component].label)} Components`;

    const foragingTrait = this.actor.system.artifice.components[foraging.component].foragingTrait;
    const foragingTraitModifier = this.actor.system.traits[foragingTrait]?.mod ??
      this.actor.system.subtraits[foragingTrait]?.mod ?? 0;
    foraging.formula = new Roll(`3d6 + ${foragingTraitModifier}`).alter(1, foragingTimes[foraging.time].favor).formula;
    
    const crafting = {
      component: this.crafting.component ?? Object.keys(components)[0],
      rarity: this.crafting.rarity ?? Object.keys(rarities)[0],
    }

    crafting.requirements = components[crafting.component].crafting[crafting.rarity] ?? undefined; 
    if (crafting.requirements) {
      const craftingTrait = this.actor.system.artifice.components[crafting.component].craftingTrait;
      const craftingTraitModifier = this.actor.system.traits[craftingTrait]?.mod ??
        this.actor.system.subtraits[craftingTrait]?.mod ?? 0;
      crafting.difficulty = `${new Roll(`3d6 + ${craftingTraitModifier}`).formula} >= ${crafting.requirements.difficulty}`;

      crafting.requirements = (() => {
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
}