import { AdvancedSettingsMenu } from "../../applications/specialty/advanced-game-settings.mjs"

export function registerGameSettings() {
  game.settings.registerMenu("utopia", "advancedSettings", {
    name: "UTOPIA.Settings.advancedSettingsMenu",
    label: "UTOPIA.Settings.advancedSettingsMenu",
    icon: "fas fa-cogs",
    type: AdvancedSettingsMenu,
    restricted: true,
  })

  game.settings.register("utopia", "advancedSettings.traits", {
    name: "UTOPIA.Settings.traits",
    hint: "UTOPIA.Settings.traitsHint",
    scope: "world",
    config: false,
    type: String,
    default: CONFIG.UTOPIA.TRAITS,
  })

  game.settings.register("utopia", "advancedSettings.subtraits", {
    name: "UTOPIA.Settings.subtraits",
    hint: "UTOPIA.Settings.subtraitsHint",
    scope: "world",
    config: false,
    type: String,
    default: CONFIG.UTOPIA.SUBTRAITS,
  })

  game.settings.register("utopia", "advancedSettings.damageTypes", {
    name: "UTOPIA.Settings.damageTypes",
    hint: "UTOPIA.Settings.damageTypesHint",
    scope: "world",
    config: false,
    type: String,
    default: CONFIG.UTOPIA.DAMAGE_TYPES,
  })

  game.settings.register("utopia", "advancedSettings.specialtyChecks", {
    name: "UTOPIA.Settings.specialtyChecks",
    hint: "UTOPIA.Settings.specialtyChecksHint",
    scope: "world",
    config: false,
    type: String,
    default: CONFIG.UTOPIA.SPECIALTY_CHECKS,
  })

  game.settings.register("utopia", "advancedSettings.artistries", {
    name: "UTOPIA.Settings.artistries",
    hint: "UTOPIA.Settings.artistriesHint",
    scope: "world",
    config: false,
    type: String,
    default: CONFIG.UTOPIA.ARTISTRIES,
  })

  game.settings.register("utopia", "advancedSettings.rarities", {
    name: "UTOPIA.Settings.rarities",
    hint: "UTOPIA.Settings.raritiesHint",
    scope: "world",
    config: false,
    type: String,
    default: CONFIG.UTOPIA.RARITIES,
  })

  game.settings.register("utopia", "advancedSettings.languages", {
    name: "UTOPIA.Settings.languages",
    hint: "UTOPIA.Settings.languagesHint",
    scope: "world",
    config: false,
    type: String,
    default: CONFIG.UTOPIA.LANGUAGES,
  })

  game.settings.register("utopia", "advancedSettings.components", {
    name: "UTOPIA.Settings.components",
    hint: "UTOPIA.Settings.componentsHint",
    scope: "world",
    config: false,
    type: String,
    default: CONFIG.UTOPIA.COMPONENTS,
  })

  game.settings.register("utopia", "activeMeasuredTemplatePreview", {
    name: "UTOPIA.Settings.activeMeasuredTemplatePreview",
    hint: "UTOPIA.Settings.activeMeasuredTemplatePreviewHint",
    scope: "client",
    config: false,
    type: Boolean,
    default: true,
  })

  // Register System settings in the game settings menu
  game.settings.register("utopia", "targetRequired", {
    name: "UTOPIA.Settings.targetRequired",
    hint: "UTOPIA.Settings.targetRequiredHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register('utopia', 'highlightTemplate', {
    name: 'UTOPIA.Settings.highlightTemplate',
    hint: 'UTOPIA.Settings.highlightTemplateHint',
    scope: 'world',
    type: Boolean,
    default: true,
    config: true,
  });

  game.settings.register("utopia", "autoRollAttacks", {
    name: "UTOPIA.Settings.autoRollAttacks",
    hint: "UTOPIA.Settings.autoRollAttacksHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("utopia", "autoRollContests", {
    name: "UTOPIA.Settings.autoRollContests",
    hint: "UTOPIA.Settings.autoRollContestsHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("utopia", "displayDamage", {
    name: "UTOPIA.Settings.displayDamage",
    hint: "UTOPIA.Settings.displayDamageHint",
    scope: "world",
    config: true,
    type: Number,
    requiresReload: true,
    choices: {
      0: "UTOPIA.Settings.displayDamageNone",
      1: "UTOPIA.Settings.displayDamageEstimate",
      2: "UTOPIA.Settings.displayDamageExact",
    },
    default: 1,
  });

  game.settings.register("utopia", "estimateDamageSimulations", {
    name: "UTOPIA.Settings.estimateDamageSimulations",
    hint: "UTOPIA.Settings.estimateDamageSimulationsHint",
    scope: "world",
    config: true,
    type: Number,
    default: 100,
  })

  game.settings.register("utopia", "diceRedistribution", {
    name: "UTOPIA.Settings.diceRedistribution",
    hint: "UTOPIA.Settings.diceRedistributionHint",
    scope: "world",
    config: true,
    requiresReload: true,
    type: Boolean,
    default: true,
  });

  
  game.settings.register('utopia', 'diceRedistributionDiceSizes', {
    name: "UTOPIA.Settings.diceRedistributionDiceSizes",
    hint: "UTOPIA.Settings.diceRedistributionDiceSizesHint",
    scope: "world",
    config: game.settings.get("utopia", "diceRedistribution"),
    type: String,
    default: "100,20,12,10,8,6,4",
  })

  game.settings.register("utopia", "diceRedistributionSize", {
    name: "UTOPIA.Settings.autoMaxDice",
    hint: "UTOPIA.Settings.autoMaxDiceHint",
    scope: "client",
    config: game.settings.get("utopia", "diceRedistribution"),
    type: Number,
    choices: {
      0: "UTOPIA.Settings.diceRedistributionNone",
      1: "UTOPIA.Settings.diceRedistributionSmallest",
      2: "UTOPIA.Settings.diceRedistributionHighest",
    },
    default: true,
  });

  game.settings.register("utopia", "turnActionsMax", {
    name: "UTOPIA.Settings.turnActionsMax",
    hint: "UTOPIA.Settings.turnActionsMaxHint",
    scope: "world",
    config: true,
    type: Number,
    default: 6,
  });

  game.settings.register("utopia", "interruptActionsMax", {
    name: "UTOPIA.Settings.interruptActionsMax",
    hint: "UTOPIA.Settings.interruptActionsMaxHint",
    scope: "world",
    config: true,
    type: Number,
    default: 2,
  });

  // game.settings.register("utopia", "turnActionsSeconds", {
  //   name: "UTOPIA.Settings.turnActionsSeconds",
  //   hint: "UTOPIA.Settings.turnActionsSecondsHint",
  //   scope: "world",
  //   config: true,
  //   type: Number,
  //   default: 1,
  // });

  game.settings.register('utopia', 'displayActionsOnToken', {
    name: "UTOPIA.Settings.displayActionsOnToken",
    hint: "UTOPIA.Settings.displayActionsOnTokenHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register('utopia', 'displayActionsOption', {
    name: "UTOPIA.Settings.displayActionsOption",
    hint: "UTOPIA.Settings.displayActionsOptionHint",
    scope: "world",
    config: game.settings.get("utopia", "displayActionsOnToken"),
    type: Number,
    choices: {
      0: "UTOPIA.Settings.displayActionsOptionCircle",
      1: "UTOPIA.Settings.displayActionsOptionVertical",
      2: "UTOPIA.Settings.displayActionsOptionHorizontal",
    },
    default: 0,
  });

  game.settings.register('utopia', 'displayActionsSize', {
    name: "UTOPIA.Settings.displayActionsSize",
    hint: "UTOPIA.Settings.displayActionsSizeHint",
    scope: "world",
    config: game.settings.get("utopia", "displayActionsOnToken"),
    type: Number,
    default: 6,
  });

  game.settings.register('utopia', 'enableTwitchIntegration', {
    name: "UTOPIA.Settings.enableTwitchIntegration",
    hint: "UTOPIA.Settings.enableTwitchIntegrationHint",
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register('utopia', 'restOnLevelUp', {
    name: "UTOPIA.Settings.restOnLevelUp",
    hint: "UTOPIA.Settings.restOnLevelUpHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });
}