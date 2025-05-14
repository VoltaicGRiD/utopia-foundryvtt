import { FeatureBuilder } from "../applications/specialty/feature-builder.mjs";
import { SpellcraftSheet } from "../applications/specialty/spellcraft.mjs";
import { TalentBrowser } from "../applications/specialty/talent-browser.mjs";
import { UtopiaActor } from "../documents/actor.mjs";
import { UtopiaChatMessage } from "../documents/chat-message.mjs";
import { UtopiaTokenDocument } from "../documents/hud/token-document.mjs";
import { UtopiaTokenHUD } from "../documents/hud/token-hud.mjs";
import { UtopiaToken } from "../documents/hud/token.mjs";
import { UtopiaItem } from "../documents/item.mjs";
import { registerConfig } from "./config.mjs";
import { DamageHandler } from "./damage.mjs";
import * as init from "./init/_init.mjs";

globalThis.utopia = {
  documents: {
    damage: DamageHandler
  },
  applications: {
    talentBrowser: TalentBrowser,
    featureBuilder: FeatureBuilder,
    spellcraft: SpellcraftSheet
  },
  utilities: {
    resetSettings: async () => {
      await game.settings.set("utopia", "advancedSettings.traits", CONFIG.UTOPIA.TRAITS);
      await game.settings.set("utopia", "advancedSettings.subtraits", CONFIG.UTOPIA.SUBTRAITS);
      await game.settings.set("utopia", "advancedSettings.damageTypes", CONFIG.UTOPIA.DAMAGE_TYPES);
      await game.settings.set("utopia", "advancedSettings.specialtyChecks", CONFIG.UTOPIA.SPECIALTY_CHECKS);
      await game.settings.set("utopia", "advancedSettings.artistries", CONFIG.UTOPIA.ARTISTRIES);
      await game.settings.set("utopia", "advancedSettings.rarities", CONFIG.UTOPIA.RARITIES);
    },
  },
  rollItemMacro: Item.rollItemMacro,
  damageHandlers: globalThis.utopia?.damageHandlers || [],
}

Hooks.once("init", async function () {
  CONFIG.UTOPIA = {};
  registerConfig();
  await init.registerGameSettings();
  init.registerHooks();
  init.registerHandlebarsSettings();
  init.registerMeasuredTemplates();
  init.registerItemDataModels();
  init.registerActorDataModels();
  init.registerItemSheets();
  init.registerActorSheets();

  CONFIG.Combat.initiative = {
    formula: `3d6 + @turnOrder`,
    decimals: 2,
  };

  CONFIG.Token.objectClass = UtopiaToken;
  CONFIG.Token.documentClass = UtopiaTokenDocument;
  CONFIG.Token.hudClass = UtopiaTokenHUD;

  CONFIG.Actor.documentClass = UtopiaActor;
  CONFIG.Item.documentClass = UtopiaItem;
  CONFIG.ChatMessage.documentClass = UtopiaChatMessage;

  init.preloadHandlebarsTemplates();
});

init.createDocMacro;