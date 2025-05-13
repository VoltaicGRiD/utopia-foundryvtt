const { api, sheets } = foundry.applications;

export class Harvest extends api.HandlebarsApplicationMixin(sheets.ItemSheetV2) {  
  static DEFAULT_OPTIONS = {
    classes: ["utopia", "harvest-sheet"],
    position: {
      width: 1300,
      height: 800,
    },
    actions: {
      harvest: this._harvest,
      complete: this._complete,
    },
    window: {
      title: "UTOPIA.SheetLabels.featureBuilder",
    },
  };

  static PARTS = {
    content: {
      template: "systems/utopia/templates/item/special/harvest.hbs",
      scrollable: [".creature-list"],
    },
  }
  
  async _prepareContext(options) {
    const context = {
      creatures: await this._getCreatures(),
      item: this.item
    }

    console.log(context); 

    return context;
  }

  async _getCreatures() {
    const creatures = [];

    const components = JSON.parse(game.settings.get("utopia", "advancedSettings.components"));
    const traits = JSON.parse(game.settings.get("utopia", "advancedSettings.traits"));
    const subtraits = JSON.parse(game.settings.get("utopia", "advancedSettings.subtraits"));
    const allTraits = { ...traits, ...subtraits };
    const rarities = JSON.parse(game.settings.get("utopia", "advancedSettings.rarities"));

    for (const creature of this.item.system.creatures) {
      const difficulty = creature.difficulty;
      for (const [key, value] of Object.entries(rarities)) {
        const min = value.points.minimum || 0;
        const max = value.points.maximum || 0;
        if (difficulty >= min && difficulty <= max) {
          creature.rarity = key;
          creature.rarityData = value;
          break;
        }
      }

      for (const alwaysHarvestable of creature.alwaysHarvestables) {
        if (alwaysHarvestable.harvested.by)
          alwaysHarvestable.harvested.byName = (await fromUuid(alwaysHarvestable.harvested.by)).name || "Unknown";
        alwaysHarvestable.componentData = {
          name: game.i18n.localize(components[alwaysHarvestable.component].label) || alwaysHarvestable.component,
          icon: components[alwaysHarvestable.component].icon || "fas fa-square-question"
        };
        alwaysHarvestable.quality = game.i18n.localize(rarities[creature.rarity].label) || creature.rarity;
      }
      for (const testHarvestable of creature.testHarvestables) {
        if (testHarvestable.harvested.by) 
          testHarvestable.harvested.byName = (await fromUuid(testHarvestable.harvested.by)).name || "Unknown";
        testHarvestable.componentData = {
          name: game.i18n.localize(components[testHarvestable.component].label) || testHarvestable.component,
          icon: components[testHarvestable.component].icon || "fas fa-square-question"
        }
        testHarvestable.testTraitData = {
          name: game.i18n.localize(allTraits[testHarvestable.testTrait].label) || testHarvestable.testTrait,
          icon: allTraits[testHarvestable.testTrait].icon || "fas fa-square-question"
        }
        testHarvestable.quality = game.i18n.localize(rarities[creature.rarity].label) || creature.rarity;
      }

      creatures.push(creature);
    }

    return creatures;
  }

  static async _harvest(event, target) {
    const harvestId = target.dataset.harvest;
    const creatureId = target.dataset.creature;
    const time = target.dataset.time;

    const character = game.actors.get(game.user.character?.id) || undefined;

    const creatures = await this._getCreatures();
    const creature = creatures.find(c => c.id === creatureId);
    
    for (const alwaysHarvestable of creature.alwaysHarvestables) {
      if (alwaysHarvestable.id === harvestId) {
        if (alwaysHarvestable.harvested.complete) return; // Already harvested
        if (character.system.turnActions.available < 6) {
          ui.notifications.warn(`${game.i18n.localize("UTOPIA.Items.Harvest.TurnActions")}`);
          return;
        }
        const earned = (await new Roll(alwaysHarvestable.quantity, {}).evaluate()).total;
        ui.notifications.info(`${game.i18n.localize("UTOPIA.Items.Harvest.Success")} ${alwaysHarvestable.componentData.name}.`);;
        alwaysHarvestable.harvested.complete = true;
        alwaysHarvestable.harvested.by = game.user.character?.uuid || game.user.uuid;
        alwaysHarvestable.harvested.earned = {
          quantity: earned,
          component: alwaysHarvestable.component
        }
        await character.update({
          "system.turnActions.value": character.system.turnActions.value - 6, // Reduce TA by 6 if fast harvest
          [`system.components.${alwaysHarvestable.component}.${creature.rarity}.available`]: character.system.components[alwaysHarvestable.component][creature.rarity].available + earned
        })
      }
    }

    for (const testHarvestable of creature.testHarvestables) {
      if (testHarvestable.id === harvestId) {
        if (testHarvestable.harvested.complete) return; // Already harvested
        if (character.system.turnActions.available < 6 && time === "fast") {
          ui.notifications.warn(`${game.i18n.localize("UTOPIA.Items.Harvest.TurnActions")}`);
          return;
        }
        let success = false;
        if (!character) success = true; // No character, auto success (GM)
        let difficulty = testHarvestable.testDifficulty;
        switch (time) {
          case "slow": // Slow harvest, 1 hour, 1/4 of the Difficulty
            difficulty = Math.ceil(testHarvestable.testDifficulty / 4);
            break;
          case "normal": // Moderate harvest, 1 minute, 1/2 of the Difficulty
            difficulty = Math.ceil(testHarvestable.testDifficulty / 2);
            break;
          case "fast": // Fast harvest, 6 TA, full Difficulty
            difficulty = difficulty; // No change
            break;
        }
        success = await character.check(testHarvestable.testTrait, { difficulty });
        if (time === "fast") {
          await (character.update({
            "system.turnActions.value": character.system.turnActions.value - 6, // Reduce TA by 6 if fast harvest
          }))
        }
        if (!success) {
          ui.notifications.warn(`${game.i18n.localize("UTOPIA.Items.Harvest.Failed")} ${testHarvestable.componentData.name}.`); // TODO - localize
          testHarvestable.harvested.failed.add(game.user.character?.uuid || game.user.uuid);
        }
        else {
          ui.notifications.info(`${game.i18n.localize("UTOPIA.Items.Harvest.Success")} ${testHarvestable.componentData.name}.`);
          const earned = (await new Roll(testHarvestable.quantity, {}).evaluate()).total;
          testHarvestable.harvested.complete = true;
          testHarvestable.harvested.by = game.user.character?.uuid || game.user.uuid;
          testHarvestable.harvested.earned = {
            quantity: earned,
            component: testHarvestable.component
          }
          await character.update({
            [`system.components.${testHarvestable.component}.${creature.rarity}.available`]: character.system.components[testHarvestable.component][creature.rarity].available + earned
          })
        }        
      }
    }

    await this.item.update({ "system.creatures": creatures });
  }

  static async _complete(event, target) {
    if (game.user.isGM) {
      const dialog = await api.DialogV2.confirm({
        window: { title: "UTOPIA.COMMON.confirmDialog" },
        content: `Are you sure you want to complete the harvest? This will mark all harvestables as complete, and distribute earned exp to characters.`,
        rejectClose: true,
        modal: true
      }) 

      if (!dialog) return;
      
      const creatures = await this._getCreatures();
      for (const creature of creatures) {
        for (const alwaysHarvestable of creature.alwaysHarvestables) {
          if (!alwaysHarvestable.harvested.complete) {
            alwaysHarvestable.harvested.complete = true;
            alwaysHarvestable.harvested.by = game.user.character?.uuid || game.user.uuid;
            alwaysHarvestable.harvested.earned = {
              quantity: 0,
              component: alwaysHarvestable.component
            }
          }
        }
        for (const testHarvestable of creature.testHarvestables) {
          if (!testHarvestable.harvested.complete) {
            testHarvestable.harvested.complete = true;
            testHarvestable.harvested.by = game.user.character?.uuid || game.user.uuid;
            testHarvestable.harvested.earned = {
              quantity: 0,
              component: testHarvestable.component
            }
          }
        }
      }

      await this.item.update({ 
        "system.creatures": creatures,
        "system.complete": true,
      });
    }
  }

  _calculateCharacterExp(creature) {

  }
}