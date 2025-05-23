import { ArtificeSheet } from "../../applications/specialty/artifice.mjs";
import { FeatureBuilder } from "../../applications/specialty/feature-builder.mjs";
import { UtopiaChatMessage } from "../../documents/chat-message.mjs";
import { getTextContrastHex } from "../helpers/textContrast.mjs";
import { registerDiceSoNice } from "../integrations/DiceSoNice/diceSoNice.mjs";
import { registerFeatures } from "./features.mjs";
import { createDocMacro, rollItemMacro } from "./macros.mjs";

export function registerHooks() {
  Hooks.once("ready", function () {
    

    // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
    Hooks.on("hotbarDrop", (bar, data, slot) => {
      createDocMacro(data, slot);
      return false;
    });

    Hooks.on("deleteCombat", async (combat, options, userId) => {    
      console.warn("[UTOPIA] Combat is being deleted, restoring combatants' turn actions.", combat, options, userId);

      const harvestableCreatures = [];

      combat.combatants.forEach((combatant) => {
        const token = game.canvas.tokens.get(combatant.tokenId);
        let actor = token.actor;
        if (actor.type === "creature" && 
          actor.system.hitpoints.surface.value === 0 && 
          actor.system.hitpoints.deep.value === 0) { // We need to identify if the actor is a creature, so that they can be harvested for components
          if (!actor.system.harvested) {
            harvestableCreatures.push(combatant);
          }
        }
      });

      const updatedCreatures = await Promise.all(harvestableCreatures.map(async (combatant) => {
        const creature = combatant.actor;        
        const formula = creature.system.harvest.testDifficulty;
        const roll = await new Roll(formula, creature.getRollData()).evaluate();

        return {
          id: foundry.utils.randomID(16),
          name: creature.name,
          difficulty: creature.system.difficulty,
          token: combatant.img,
          alwaysHarvestables: creature.system.harvest.alwaysHarvestable.map(harvestable => {
            return {
              id: foundry.utils.randomID(16),
              component: harvestable.component,
              quantity: harvestable.quantity,
              harvested: {
                complete: false,
                by: null,
                earned: null
              }
            }
          }),
          testHarvestables: creature.system.harvest.testHarvestable.map(harvestable => {
            return {
              id: foundry.utils.randomID(16),
              testTrait: creature.system.harvest.testTrait,
              testDifficulty: roll.total,
              component: harvestable.component,
              quantity: harvestable.quantity,
              harvested: {
                complete: false,
                by: null,
                earned: null
              }
            }
          }),
        }
      }));

      const item = await Item.createDocuments([{
        name: game.i18n.localize("UTOPIA.Items.Harvest.Name"),
        type: "harvest",
        system: {
          creatures: updatedCreatures
        },
        ownership: {
          default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
        }
      }]);

      console.log(item);

      const template = await renderTemplate("systems/utopia/templates/chat/harvest-card.hbs", { harvest: item[0].id });

      await UtopiaChatMessage.create({
        content: template,
        speaker: ChatMessage.getSpeaker({ alias: game.i18n.localize("UTOPIA.CHAT.Harvest") }),
        system: {
          harvest: item[0].uuid,
        }
      });
    });

    Hooks.on("combatTurnChange", (combat, from, to) => {
      //game.time.advance(6); // Advance the game time by 6 seconds to allow for any potential effects that may need to be processed after a turn change.

      if (game.user.isGM) {
        let token = game.canvas.tokens.placeables.find(t => t.id === to.tokenId);
        try {
          token.control();
        } catch (e) {
          console.error("[UTOPIA] Error controlling token", e);
        }
      }

      console.warn("[UTOPIA] Combat turn changed", combat, from, to);

      combat.combatants.forEach(async (combatant) => {
        // If the combatant is a creature, we need to modify the actorDelta instead of the actor
        const token = game.canvas.tokens.get(combatant.tokenId);

        let actor = token.actor;
        // If the combatant is the current combatant, we have to restore
        // their Turn Actions
        if (to.combatantId === combatant._id) {
          await actor.update({
            ["system.turnActions.value"]: actor.system.turnActions.max,
            ["system.interruptActions.value"]: 0,
          });
        }
        // If the combatant is not the current combatant, we have to restore 
        // their Interrupt Actions
        else {
          await actor.update({
            ["system.interruptActions.value"]: actor.system.interruptActions.max,
            ["system.turnActions.value"]: 0,
          });
        }

        if ([...actor.effects].length > 0) {
          await Promise.all([...actor.effects].forEach(async e => {
            if (e.isTemporary && e.duration.remaining === 0) {
              await e.update({
                disabled: true
              });
            }
          }));
        }
      }); 
    });

    Hooks.on("updateWorldTime", (worldTime, dt, options, userId) => {
      for (const template of game.canvas.scene.templates) {
        const flags = template.flags.utopia || {};
        
        // This is the original time the template was placed
        if (flags.worldTime) { 
          const elapsedTime = worldTime - flags.worldTime; // Calculate the elapsed time since the template was placed

          // If the elapsed time is greater than the duration, we need to delete the template
          if (elapsedTime > flags.duration) { 
            template.delete();
          }

          // Otherwise, we need to re-cast the spell's effects
          else { 
            if (flags.origin) {
              fromUuid(flags.origin).then((item) => {
                fromUuid(flags.chatMessage).then((chatMessage) => {
                  item._finishCastingSpell(chatMessage);
                });
              });
            }
          }
        }
      }
    });

    Hooks.on("deleteCombat", (combat) => {
      combat.combatants.forEach((combatant) => {
        let actor = game.actors.get(combatant.actorId);
        actor.update({
          ["system.turnActions.value"]: actor.system.turnActions.max,
          ["system.interruptActions.value"]: actor.system.interruptActions.max,
        });
      });
    });

    Hooks.on("updateActor", (actor, data, meta, userId) => {
      console.log("[UPDATE ACTOR]", actor, data, meta, userId);

      const dhp = actor.system.hitpoints.deep.value;
      const maxDhp = actor.system.hitpoints.deep.max;

      // If an actors DHP is in the negatives and less than or equal to their max DHP,
      // The body is considered "dead", and unusable
      if (dhp <= (maxDhp * -1)) {
        actor.toggleStatusEffect("dead", { active: true });
      }

      // If the actor's DHP is in the negatives and greater than their max DHP,
      // the body is in "stasis"
      else if (dhp < 0 && dhp > (maxDhp * -1)) {
        // Create the stasis effect
        actor.toggleStatusEffect("stasis", { active: true });
      }
    });

    Hooks.on("renderMacroConfig", async (app, html, data) => {

    });

    Hooks.on("preCreateActiveEffect", (effect, options, userId) => {
      const actor = effect.target;
      const condition = effect.statuses[0];

      // runTrigger("Condition", 
      //   { actor: actor, condition: condition }
      // );

      return true;
    });

    Hooks.on("preDeleteActiveEffect", (effect, options, userId) => {
      const actor = effect.target;
      const condition = effect.statuses[0];

      // if (condition === "focus") {
      //   runTrigger("FocusLost", actor, condition);
      // } else if (condition === "concentration") {
      //   runTrigger("ConcentrationLost", actor, condition);
      // } else {
      //   runTrigger("ConditionLost", actor, condition);
      // }

      return true;
    });

    //#endregion

    Hooks.on("createActiveEffect", (effect, options, userId) => {
      if (effect.statuses.has("blinded")) {
        let change = {
          key: "system.disfavors",
          mode: 2,
          priority: null,
          value: 'awa',
        };

        changes = effect.changes;
        changes.push([change, change]);
        effect.update({
          changes: changes
        })
      }

      return effect;
    });

    Hooks.on("updateActiveEffect", (effect, modified, options, userId) => {
      if (effect.isTemporary && modified.disabled !== undefined && game.combat) {
        effect.update({
          duration: {
            startRound: game.combat.current.round,
            startTurn: game.combat.current.turn,
          }
        });
      }
    })

    // Handle optional module integrations
    Hooks.on("diceSoNiceReady", (dice3d) => {
      registerDiceSoNice(dice3d);
    });

    const settings = {};
    settings.artistries = JSON.parse(game.settings.get("utopia", "advancedSettings.artistries"));
    settings.damageTypes = JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"));
    settings.traits = JSON.parse(game.settings.get("utopia", "advancedSettings.traits"));
    settings.subtraits = JSON.parse(game.settings.get("utopia", "advancedSettings.subtraits"));

    registerFeatures(settings);

    if (game.settings.get("utopia", "lastSeenVersion") === undefined) {
      game.settings.set("utopia", "lastSeenVersion", game.system.version);
    }

    if (parseFloat(game.system.flags.lastConfigurationResetVersion) > parseFloat(game.settings.get("utopia", "lastSeenVersion"))) {
      const content = document.createElement("div");
      content.innerHTML = `<h3 style="color: red"><strong>System Configuration Changes</strong></h3><p><strong>The Utopia system recently received changes to the initial configuration of the system.</strong></p><p>You will not receive these changes, until you reset the advanced settings in the game settings.</p><p>Please keep in mind, that doing so will overwrite any custom settings you have made.</p><p>It is recommended to make a backup of your settings before doing so, and modifying / applying your custom changes accordingly.</p><p>If you have any questions, or need assistance doing this, please reach out to @voltaicgrid on the Utopia TTRPG Discord (link on the settings tab).</p>`;
      const button = document.createElement("button");
      button.innerText = "Reset Advanced Settings (permanent).";
      button.addEventListener("click", async () => {
        utopia.utilities.resetSettings();
      });
      button.dataset.action = "resetSettings";
      content.appendChild(button);

      UtopiaChatMessage.create({
        speaker: "Utopia",
        content: content.innerHTML,
        whisper: game.users.filter(u => u.isGM).map(u => u.id),
      })

      game.settings.set("utopia", "lastSeenVersion", game.system.version);
    }

    game.utopia = globalThis.utopia;
    game.utopia.rollItemMacro = rollItemMacro;
  });

  Hooks.on('renderSettings', (settings) =>  {
    /**
     * Creates a DOM element with optional attributes and child nodes.
     * @param {string} tagName - The HTML tag (e.g., "div", "button", "span").
     * @param {Object} [options] - Element configuration.
     * @param {Object} [options.attributes] - A set of attributes (e.g., { class: "my-class" }).
     * @param {(string|Node)[]} [options.children] - Array of text or DOM nodes to append.
     * @returns {HTMLElement} The newly created element.
     */
    function createHTMLElement(tagName, { attributes = {}, children = [] } = {}) {
      const el = document.createElement(tagName);

      // Set attributes
      for (const [key, value] of Object.entries(attributes)) {
        el.setAttribute(key, value);
      }

      // Append children (strings or DOM nodes)
      for (const child of children) {
        if (typeof child === "string") {
          el.appendChild(document.createTextNode(child));
        } else {
          el.appendChild(child);
        }
      }

      return el;
    }

    const header = createHTMLElement("h2", { children: [game.system.title] });
    const utopiaSettings = createHTMLElement("div");
    settings.element[0].querySelector("#settings-game")?.after(header, utopiaSettings);

    const twitchSettings = document.createElement("button");
    const twitchIcon = document.createElement("i");
    twitchIcon.classList.add("fab", "fa-twitch");
    twitchSettings.type = "button";
    twitchSettings.append(twitchIcon, game.i18n.localize("UTOPIA.Settings.Buttons.twitch"));
    twitchSettings.addEventListener("click", async () => {
      await Twitch.registerSettings();

      // Render the Twitch Integration Settings app
      const sheet = new UtopiaTwitchIntegrationSheet();
      sheet.render(true);
    });

    const discordButton = document.createElement("button");
    const discordIcon = document.createElement("i");
    discordIcon.classList.add("fa-brands", "fa-discord");
    discordButton.type = "button";
    discordButton.append(discordIcon, game.i18n.localize("UTOPIA.Settings.Buttons.discord"));
    discordButton.addEventListener("click", () => {
      // Open the hyperlink to the Utopia Discord
      window.open("https://discord.gg/7kxJHtdGfZ", "_blank");
    });

    const vaultButton = document.createElement("button");
    const vaultIcon = document.createElement("i");
    vaultIcon.classList.add("fas", "fa-vault");
    vaultButton.type = "button";
    vaultButton.append(vaultIcon, "Ä̴̭̜̟͚̣̦̀͠c̷̡̪̺̖͙̯̣̗͒͌̚ͅe̴͚̺͙̾̔̈s̵̛̯͎̫̲̞̝̝̀͊̏͛̋̎̈́͠s̶͖̖̤͌͗ ̸̟̯͆̀͗̑̐͊͘͝͝t̷̙̰̘͝h̷̡̥͇͕͙͓̭̱͎͛̋̃̈́̈́̊̈́̚͠ë̷̡̨̪̦̟͔̦́̓͋̄ ̸̯͊̊́̍̎͘͜V̸̢̛̬̲͍͕̲͔̰͐̎̑͂͋̋̄͘̚ͅa̶̩͌̌̂̎̇ȕ̷̜̦͕̱̺̃̆͑̅̐̕͘l̷̨͚̥͔͉̰̻͇͗ͅt̸̙̺̙̅̅́̇̽̈́͌̚");
    vaultButton.addEventListener("click", () => {
      ui.notifications.error("T̷̪͍̉͛͂͒̐͐͂̏̒̄͝ǫ̷̛̥̥̻͇̟̜̦̈́́̏̍̈́̍̄̈́̽̈́̚͜͠o̵̠̱̹̰͔͉̳̝͎͔̬̻͓̩̪̜͉̥̭͇͒̋̈̿̀̊͠ ̴̧̧̡̫̩͙͈̺͇̣͍̬̮͍̘̻̭̗͚̝̼͉̗̗̺̹̔͗̑̏̀̈́͗͑̄́̄̃̿̿͋̌f̷̧̨̛͍̤̥̭͉̐̐̃͊̈́͜͠͝ą̴̧̨̨̛͍͉͈̤̮̘͓̤̰̫͇͍̬̞̗͉͇̪̖̈́̌̆̿̑̊̓́͌̈͂̂̽̃̕ͅͅs̶̪̲͈̖̯̰͉͈̣͕̉̏͑͒̾̉̅̒̏̇̋̉̈́̊̅̚ẗ̶̨͉̞͚͔̻͓̖͙́̐͗̂̑͂̋̓͗̒̉̑̓̈́̂͒̆͑͂͘͘͝͝ͅ.̷̡̻͇̣̟̝͈̤͎̯̫͖̈͛̈́̑̾͌̂̓̊͂͆͝ ̶̧̨̢̛̛̙̰̟̣̙̺̬̜͇̝̩̤͚͇̫̫̞͉̾̑̈́̎͐̓͊́̈́͜͜͝͠Ţ̷̨̛̟̠̺͍͉̬͖͉̗͓͓͕̽̀͑̄͊̾̽͗̊̓͒̑̀͂̕͘͜͝ơ̴̡̺̺̻̞̥̙̩̝̮͓̳̗̟̓͛̊̑̑̃̉͐̋̐͌̏̽̀̿̚͜͜o̵̡̧̧̞̞̫̣̞͔͓̦͈̻͍̙̫̹̙͍̝͇͔͑͝ͅ ̴̛̛̳̪̞͐̐̇̑̈̈́͌͆̔̈́̈̇̎̑͊̀̚̚͝s̷̡̡̺̞̜̲͓̖̣̱̠̱͆̇̉̒͂̂̈̅̕͠͝͝ơ̸̞̘͕̌̍̓͐͌̑̓̂̒̉͊̃̈́o̶̧̡̝̳͖̭̖̹̤͈̖͚̬͇̘̰͂̎̊͒͆͊͜n̵̢̰͔̝̰̰̞̠̳͖͚͇͖̰͎̯͎̲̓̐̒̍̀̇̈̄͋͐̃̓̈́̔̿̉͛̀̓̈́̆̅͝ͅ.̵̯̟̱̽̇̈́̌͑̽͝ ̵̡̨͓̭̭̳͛́͂̑͋̑̈͛͆͌̈̀̿̅̽̋́͌̋̈́̚̕͝͠Ç̷̠̭̮̖̘̹̰̺͚̩͉͔̳͎̜̦͈̯̉̄̏̉̆͛̇̇͂͜o̸̪̲͓̰͎͗͆m̷̢̧̡̡̧̢̳͔͈̗̱͓̺̯͚̗̗͖̻̻̈́̈́͘͝ͅę̶̨͇̥̗̼̹͎̗̩͈̗͈͚͕̠͎͎̈́͛̄ͅ ̴̨̢̛̤̦̦̼͇̬̭̠̗̞͈͇͉̅̑̆͆̾̅͛͋̽͒̍̄̚͜͜ͅͅb̷̨̛̦͔͉̬̼̭͇̥̝͔̮͉͋́͗̍͑͒͆̑̏͋͗̈́̋̑̌̇̓̕͜a̸̡̢̲͖͉̺͎̜̿̃̄c̴͈̼͔̑̓̋̽̅̆͆̾͛̋̕k̶̛͍̦̳͕̭̣̩̟͍̬̝̺͖̦̞̝̍̇͌́̋́̆̉̋͛͆̀̔͛̔̆̇͘͘͘̕̕͘͜͜͝ͅ ̴̟̯̣̠̺̤͛̾̑͂̒͋̒̌͘̚͠͝ļ̸̧̨̢̡͓̮͍̤̝̱͍̝͍̝̼͉̦̬͉̫̫̝̝̙̇͑̈́͘͝ą̴̨̰̣̖͉̟͖̰̺͖͚͉̞̞̲̝̙͛̃̋͊̔̊̚ͅͅͅt̴̨̛̼̠̫̝̗̮̏̑̀̋̐̿̈́̀̔̍̓͌͊̉̒̚͝͝͠ể̸̬̭̠͂̄́́͂́̇͑̀̂̃͌̀̈̅͝ṟ̷͕̉̃̔̋̏.̶̧͉̙̜̻͚̳̻͈͇̼̿̉̌̔́̇̽͋͌̊̓̌͒͂̂̍̀̂̌̅́̚̚͝͝͠ͅ");
    });
    // vaultButton.addEventListener("click", () => {
    //   // Open the hyperlink to the Utopia Discord
    //   ui.notifications.error("A̸̜̱̳͛̇̿̔͒̾̈́́̄̽͝c̴̡̹̯̦̥̒̓͗̍̿̑̔̔̏̓̊̄̓̚c̴͕̘͕̝̣̲̥͛̔͂͒̊́͊͐͌̈̀̈́̔̚ę̸̧̼̺̤̫̠̤̹̩͊̈́͜͜s̸̟̦͉̤̱̖̻̓͛̾́s̶̘̰͘ ̶̛̝͕̌̽͊̆͋̃͋̿̑D̷̻͍̙̹̜̤͖̖͕̬̫͉͈̦̎́͛̇̀̃̋̌̈́̍͆̍̐͋͌͘ẽ̶̬͓̽̈͠͝n̶̢̢͙̲͉̙͇̞̜̓̓̎́͂̆͛̽̊i̷̙̲̥̭͇͖̬̿̊͛̀̉̏̒̃͒̐̉̈́̊͝ẻ̵̻̺̱͇͍̬̯̬̽̏̕͜͜ͅd̵̪̜͈̖͐̅̈͛̂̌̎̋͂̄̍͜͝ ̸̡̧̭̝̤͈̣̦̗̥͙̆͘͜-̴̧͈͚̯̠͇̰̲̙͉̜̤͔͇͇̂̄̎ͅͅ ̷̧͓̬̞̖̈̇̾͌̈̎͠͝͝͝ͅT̷̡̛͇̫̟͖̣͙̯̬͊͋̽͑͒̄̀̆̋̉̃̑̚͠h̷͓̦̦̪͙͇̲̦̜̘͙͇͇̜̙͆̅̏͛̈́̌́̾͘ͅḯ̴̧̥̟͖̼͚̗̪̫̣̲̫̗͙̜̎̀̒͂̌͜͝͝͝s̷̢̤̍̀́́ ̵̗̣̗̦̫̂͆̇͊͒̆͝t̵̠̘̱̰̲̗̟̜̯̤̳̣̠̬̍̂̇̀ḯ̸̪̻̹̫̞̘̚͠͝ḿ̶̡̛̛̥̖̞͚̮̩͙̰̘̥͉̯̪̑̇́̓͌͊͆͛̀̐͌̎͊͝ḛ̷̡̟̔̃̃̏͌͒͆̅̀͠͠l̷̢͚̅͌͒̀͑̍͐̾̾͆͋̆͝͝i̵̡̖̫͇͚̱̺̔̆͑̌͒͆ͅn̴̨̹̬̲͔̩͊̓̏̏̋́̈́̚e̷̢̢̡̞̼̦̯̤͈̣͙̯̹̩̖̭͆̓̑̐̈ ̸̛̻͚̒̂̉̃̊͐̈́͒̚̚͝͝i̷̛̤̥̬̰͎͉̹̪̗̲̜͇̦̱̩̞͈̎̈́̾̌̅͘s̵̡̛̳̞͚͆̑͋̔̋͒̈́̊͌̾̍̈̕͘̚͜͠ ̵̧̧̜̳͓̫͇̋́̇̕i̶̡͕̟̙̣̥̖̤̼̞̣͉͙̳̥̞͛͂́̎̓̒̒͗n̵̰̣̤̟̳̗̤͓̠͉̄͗͛͌̍̄̎̕v̶̺͓̤̻̺̬͇͒͜͝a̶̩̮̬̖̖̣͊̓͝͠l̸̨͇͋̌i̵̙̬͓̙̺͚̭̝̮̰̘̘̣̟̭̍͌̀̔͂̋͛̓̉͌͊̑d̵̡̫̣̤̜̮͇͖͉͉͛̂͑̆̉̕͝!̸̨̨̨̻̣̟̬̐̋́̏͊̌͛");
    //   setTimeout(() => {
    //     ui.notifications.error("A̸̜̱̳͛̇̿̔͒̾̈́́̄̽͝c̴̡̹̯̦̥̒̓͗̍̿̑̔̔̏̓̊̄̓̚c̴͕̘͕̝̣̲̥͛̔͂͒̊́͊͐͌̈̀̈́̔̚ę̸̧̼̺̤̫̠̤̹̩͊̈́͜͜s̸̟̦͉̤̱̖̻̓͛̾́s̶̘̰͘ ̶̛̝͕̌̽͊̆͋̃͋̿̑D̷̻͍̙̹̜̤͖̖͕̬̫͉͈̦̎́͛̇̀̃̋̌̈́̍͆̍̐͋͌͘ẽ̶̬͓̽̈͠͝n̶̢̢͙̲͉̙͇̞̜̓̓̎́͂̆͛̽̊i̷̙̲̥̭͇͖̬̿̊͛̀̉̏̒̃͒̐̉̈́̊͝ẻ̵̻̺̱͇͍̬̯̬̽̏̕͜͜ͅd̵̪̜͈̖͐̅̈͛̂̌̎̋͂̄̍͜͝ ̸̡̧̭̝̤͈̣̦̗̥͙̆͘͜-̴̧͈͚̯̠͇̰̲̙͉̜̤͔͇͇̂̄̎ͅͅ ̷̧͓̬̞̖̈̇̾͌̈̎͠͝͝͝ͅT̷̡̛͇̫̟͖̣͙̯̬͊͋̽͑͒̄̀̆̋̉̃̑̚͠h̷͓̦̦̪͙͇̲̦̜̘͙͇͇̜̙͆̅̏͛̈́̌́̾͘ͅḯ̴̧̥̟͖̼͚̗̪̫̣̲̫̗͙̜̎̀̒͂̌͜͝͝͝s̷̢̤̍̀́́ ̵̗̣̗̦̫̂͆̇͊͒̆͝t̵̠̘̱̰̲̗̟̜̯̤̳̣̠̬̍̂̇̀ḯ̸̪̻̹̫̞̘̚͠͝ḿ̶̡̛̛̥̖̞͚̮̩͙̰̘̥͉̯̪̑̇́̓͌͊͆͛̀̐͌̎͊͝ḛ̷̡̟̔̃̃̏͌͒͆̅̀͠͠l̷̢͚̅͌͒̀͑̍͐̾̾͆͋̆͝͝i̵̡̖̫͇͚̱̺̔̆͑̌͒͆ͅn̴̨̹̬̲͔̩͊̓̏̏̋́̈́̚e̷̢̢̡̞̼̦̯̤͈̣͙̯̹̩̖̭͆̓̑̐̈ ̸̛̻͚̒̂̉̃̊͐̈́͒̚̚͝͝i̷̛̤̥̬̰͎͉̹̪̗̲̜͇̦̱̩̞͈̎̈́̾̌̅͘s̵̡̛̳̞͚͆̑͋̔̋͒̈́̊͌̾̍̈̕͘̚͜͠ ̵̧̧̜̳͓̫͇̋́̇̕i̶̡͕̟̙̣̥̖̤̼̞̣͉͙̳̥̞͛͂́̎̓̒̒͗n̵̰̣̤̟̳̗̤͓̠͉̄͗͛͌̍̄̎̕v̶̺͓̤̻̺̬͇͒͜͝a̶̩̮̬̖̖̣͊̓͝͠l̸̨͇͋̌i̵̙̬͓̙̺͚̭̝̮̰̘̘̣̟̭̍͌̀̔͂̋͛̓̉͌͊̑d̵̡̫̣̤̜̮͇͖͉͉͛̂͑̆̉̕͝!̸̨̨̨̻̣̟̬̐̋́̏͊̌͛");
    //   }, 3500);
    //   setTimeout(() => {
    //     ui.notifications.warn("Ą̸̺̱̮̦̦̱̉̆̂͝r̷̨̥̜͓̠̫̮̗̹̦͈̪̳̙̻͑̅͑̐̽̄͌͘͝ͅe̵̡͈̜͖̪̖͚̩̬̗̫̭̊̈́͆͊̂̀̿̚ ̵͎̊̌͌͌̏̊͊̋̒̓̚y̶̻̍̈́̀̆͝͝ơ̴̧̛̟̺̳̬͚̑̌̀̌̇̂̈́̕͝ų̵̭̗̺̍̏̓̓̐̍͛̽̅̐̓̈́̐̊̕͝.̵̤̗̞͖̟̱̼̉̈́͗̒̕.̴̥͖̹͚̿̀̑̅̎͒̋̔̒́̂͑̈̔͑.̷̧̓ͅ.̶̞̱̝͕́̇̀̊ͅ ̶̞̰̥̟͓̫̪̰̺̼̪̰̹͇́͑͗̑̾̌͗̓̀̔̄̾́͒̒̊̈́ͅh̷̯̻͎̘̬͂̿̑͑̀̚ě̶̻̼̮̹͑̎̇́̋̓̂̆̎̈́͝͠r̷̡̤͕̙̠͕̯̫̮̼̖̫̞̙̟̯̗̆̀̃̏̈͒͘͝͠é̸̘̲͍̗̾́̐͒̉͌̽̚ ̵̡̢͎͚̟̝͍̻͎̳̰̬̥̮̼͍͊̈͊̕͜f̸̨̭̹̙̲̳͕͎̝̠̰̪̱̎̆͂̄̓͐́̂͘̚o̸̢̨̝̝̥̼̬̠͓̲̱̹̓̃̋͜͝ṟ̸̡̻̙̩̤͙̠͉͓̣̭͕͍̫͐̀̓̚ͅ ̸̧̲̝͓̣̠̟̝̄̀̔̽̈͜ͅm̴͖͕̆̌̿̊̅̀̊̔͋́̑͜ḙ̸̬̜̹̄̄͗̄ͅ?̵̧̧̛̗͇̼̪̘̫̥͎͇̑̓̄̿̓̎͐̂̄́͊͌͛̍̐͠");
    //   }, 3600);
    //   setTimeout(() => {
    //     ui.notifications.error("A̸̜̱̳͛̇̿̔͒̾̈́́̄̽͝c̴̡̹̯̦̥̒̓͗̍̿̑̔̔̏̓̊̄̓̚c̴͕̘͕̝̣̲̥͛̔͂͒̊́͊͐͌̈̀̈́̔̚ę̸̧̼̺̤̫̠̤̹̩͊̈́͜͜s̸̟̦͉̤̱̖̻̓͛̾́s̶̘̰͘ ̶̛̝͕̌̽͊̆͋̃͋̿̑D̷̻͍̙̹̜̤͖̖͕̬̫͉͈̦̎́͛̇̀̃̋̌̈́̍͆̍̐͋͌͘ẽ̶̬͓̽̈͠͝n̶̢̢͙̲͉̙͇̞̜̓̓̎́͂̆͛̽̊i̷̙̲̥̭͇͖̬̿̊͛̀̉̏̒̃͒̐̉̈́̊͝ẻ̵̻̺̱͇͍̬̯̬̽̏̕͜͜ͅd̵̪̜͈̖͐̅̈͛̂̌̎̋͂̄̍͜͝ ̸̡̧̭̝̤͈̣̦̗̥͙̆͘͜-̴̧͈͚̯̠͇̰̲̙͉̜̤͔͇͇̂̄̎ͅͅ ̷̧͓̬̞̖̈̇̾͌̈̎͠͝͝͝ͅT̷̡̛͇̫̟͖̣͙̯̬͊͋̽͑͒̄̀̆̋̉̃̑̚͠h̷͓̦̦̪͙͇̲̦̜̘͙͇͇̜̙͆̅̏͛̈́̌́̾͘ͅḯ̴̧̥̟͖̼͚̗̪̫̣̲̫̗͙̜̎̀̒͂̌͜͝͝͝s̷̢̤̍̀́́ ̵̗̣̗̦̫̂͆̇͊͒̆͝t̵̠̘̱̰̲̗̟̜̯̤̳̣̠̬̍̂̇̀ḯ̸̪̻̹̫̞̘̚͠͝ḿ̶̡̛̛̥̖̞͚̮̩͙̰̘̥͉̯̪̑̇́̓͌͊͆͛̀̐͌̎͊͝ḛ̷̡̟̔̃̃̏͌͒͆̅̀͠͠l̷̢͚̅͌͒̀͑̍͐̾̾͆͋̆͝͝i̵̡̖̫͇͚̱̺̔̆͑̌͒͆ͅn̴̨̹̬̲͔̩͊̓̏̏̋́̈́̚e̷̢̢̡̞̼̦̯̤͈̣͙̯̹̩̖̭͆̓̑̐̈ ̸̛̻͚̒̂̉̃̊͐̈́͒̚̚͝͝i̷̛̤̥̬̰͎͉̹̪̗̲̜͇̦̱̩̞͈̎̈́̾̌̅͘s̵̡̛̳̞͚͆̑͋̔̋͒̈́̊͌̾̍̈̕͘̚͜͠ ̵̧̧̜̳͓̫͇̋́̇̕i̶̡͕̟̙̣̥̖̤̼̞̣͉͙̳̥̞͛͂́̎̓̒̒͗n̵̰̣̤̟̳̗̤͓̠͉̄͗͛͌̍̄̎̕v̶̺͓̤̻̺̬͇͒͜͝a̶̩̮̬̖̖̣͊̓͝͠l̸̨͇͋̌i̵̙̬͓̙̺͚̭̝̮̰̘̘̣̟̭̍͌̀̔͂̋͛̓̉͌͊̑d̵̡̫̣̤̜̮͇͖͉͉͛̂͑̆̉̕͝!̸̨̨̨̻̣̟̬̐̋́̏͊̌͛");
    //   }, 3500);
    //   setTimeout(() => {
    //     ui.notifications.error("A̸̜̱̳͛̇̿̔͒̾̈́́̄̽͝c̴̡̹̯̦̥̒̓͗̍̿̑̔̔̏̓̊̄̓̚c̴͕̘͕̝̣̲̥͛̔͂͒̊́͊͐͌̈̀̈́̔̚ę̸̧̼̺̤̫̠̤̹̩͊̈́͜͜s̸̟̦͉̤̱̖̻̓͛̾́s̶̘̰͘ ̶̛̝͕̌̽͊̆͋̃͋̿̑D̷̻͍̙̹̜̤͖̖͕̬̫͉͈̦̎́͛̇̀̃̋̌̈́̍͆̍̐͋͌͘ẽ̶̬͓̽̈͠͝n̶̢̢͙̲͉̙͇̞̜̓̓̎́͂̆͛̽̊i̷̙̲̥̭͇͖̬̿̊͛̀̉̏̒̃͒̐̉̈́̊͝ẻ̵̻̺̱͇͍̬̯̬̽̏̕͜͜ͅd̵̪̜͈̖͐̅̈͛̂̌̎̋͂̄̍͜͝ ̸̡̧̭̝̤͈̣̦̗̥͙̆͘͜-̴̧͈͚̯̠͇̰̲̙͉̜̤͔͇͇̂̄̎ͅͅ ̷̧͓̬̞̖̈̇̾͌̈̎͠͝͝͝ͅT̷̡̛͇̫̟͖̣͙̯̬͊͋̽͑͒̄̀̆̋̉̃̑̚͠h̷͓̦̦̪͙͇̲̦̜̘͙͇͇̜̙͆̅̏͛̈́̌́̾͘ͅḯ̴̧̥̟͖̼͚̗̪̫̣̲̫̗͙̜̎̀̒͂̌͜͝͝͝s̷̢̤̍̀́́ ̵̗̣̗̦̫̂͆̇͊͒̆͝t̵̠̘̱̰̲̗̟̜̯̤̳̣̠̬̍̂̇̀ḯ̸̪̻̹̫̞̘̚͠͝ḿ̶̡̛̛̥̖̞͚̮̩͙̰̘̥͉̯̪̑̇́̓͌͊͆͛̀̐͌̎͊͝ḛ̷̡̟̔̃̃̏͌͒͆̅̀͠͠l̷̢͚̅͌͒̀͑̍͐̾̾͆͋̆͝͝i̵̡̖̫͇͚̱̺̔̆͑̌͒͆ͅn̴̨̹̬̲͔̩͊̓̏̏̋́̈́̚e̷̢̢̡̞̼̦̯̤͈̣͙̯̹̩̖̭͆̓̑̐̈ ̸̛̻͚̒̂̉̃̊͐̈́͒̚̚͝͝i̷̛̤̥̬̰͎͉̹̪̗̲̜͇̦̱̩̞͈̎̈́̾̌̅͘s̵̡̛̳̞͚͆̑͋̔̋͒̈́̊͌̾̍̈̕͘̚͜͠ ̵̧̧̜̳͓̫͇̋́̇̕i̶̡͕̟̙̣̥̖̤̼̞̣͉͙̳̥̞͛͂́̎̓̒̒͗n̵̰̣̤̟̳̗̤͓̠͉̄͗͛͌̍̄̎̕v̶̺͓̤̻̺̬͇͒͜͝a̶̩̮̬̖̖̣͊̓͝͠l̸̨͇͋̌i̵̙̬͓̙̺͚̭̝̮̰̘̘̣̟̭̍͌̀̔͂̋͛̓̉͌͊̑d̵̡̫̣̤̜̮͇͖͉͉͛̂͑̆̉̕͝!̸̨̨̨̻̣̟̬̐̋́̏͊̌͛");
    //   }, 5200);
    //   setTimeout(() => {
    //     ui.notifications.info("P̶̧̪͎̪̲̺̭̳̫̤̩̋̄̋̉̓̀̍͌̐̃́̉̽̍̕͜͜ẻ̵̛̺̈̀͋̒̔̈́͂͆͊̍͠ṟ̵͈̟̝̯̽́̇̇̑̐̀́̂̃̇͋͘ͅh̸̨̧̛͙̩̦̥̼̳̱̟͚̫̖̙̘̯͐̑̅̾̈̂̍̔̿͋͘͜͠â̷͖̼͑̆͐p̸̝̙̙̤̭͓̩͕̼̈́̂͂̃̇͛̋̉̎́̆̓̊͝͝͝s̴̢̡̱̺͓͊̾͆̈́̈͊̈́̌͗̀͘͠.̷̝̕͝.̷̢̲͉̞͉̞̇̏̾̽̍͌̾͂̆͘͘͜.̶̳̹̓̽̍͠.̶̧̡̼̤̣̯̰͖̪̈́̇͜ͅ ̶̞̯̥͆͋͒̈́̀̓̂̿͊͌t̴̡̢̺̝̗̲̪̾̀͌h̷͔͚̹̞̪̭̄ͅe̶̡̧̧̢̲̠̰̗̳̦̯̺̳̰̜͈̊̕͝ͅ ̵̨̡̘̲͉̠̫̊̃̾̊͛̊́͛̇͝g̵̨͎̯̹͙̹͈͖̩̠̅̒̄̄̾̒̌̓͗ͅò̶̦̘͚̼̲͎͇͕̿̌̋͜ͅl̷̯̹̱͉̿̀̓̋̽ḑ̵̡̼̜͎͙̝̖͍̩͙̙̣̺̮͔͋̓̈́̾ͅḙ̸̗̣͖̻̩̪̅ǹ̶̩̥͆̈͑̾͠ ̵͔͍̙͕̱̀̂͗̓̆́̃̽̀͒̽̄̾́̚ͅȯ̷̢͉͇̺͙͙̟̰̅͂̊̄̍̀̒̇͌̽̚͝͝͠ǹ̸̡̰͇̰̼̝̫͈̻̆ę̴͚̦̩̹̗͍̀̑̐̇̒̑͝ ̸̨̡͕̘̼͈̮̙͎͇̬͕͚̟̱̓h̴̢̥̘̫͕̥͕̹͚͇̦̱̑̀ǻ̴̢̢͈̝̜̝̤̗͔͇͙̹̠̍̀̈̀̌̏͆̈́̀̚͝s̷̬̝̀̌͐̎̔̆̀̄͗̈̈́͝͝͠͝ ̸̥͗͛͂͑͛͆͑͐̑̐͛́̎̐̑̕͝t̴̽̓̀̇͊́͌̊͝ͅh̴̛̬̘͇̯̩̫̯̟̤͓͓̬̬̼̞͐́̓̏̍͐͋̀͛͛̀̕ȩ̶̣̻̹͖̱̭͕̯͖̱̄̇̓̉̄̊̉̀̉̒͛̓ͅ ̴̨͈̙͍̙͓̞̙̏̎̃̒̅̓͗̂̚͝ͅa̷̘͚̻̭̦͔͙̟̙̽̔̀̕͜n̸̩̠̙͈̐̂͐͌͋̒͑͊̇̓͝͝s̵̨͇̠̺̼̜̘̳͒̀͛w̸̢̦̌̑́͐͐͝͠ḝ̸̛͙̥͚̣͇̜̝̯̭̘̟̟̪̎̋̄͋̄̀̚͝͠ͅṛ̶̖͙̜͒̽ŝ̷̢̖̱̞̭̼̭͎̙̠.̴̨̖͈̟͇͇̲͇̰̰̫̪̳͙͗̊͌̈́̇̈́̓̓̿̍̕̚");
    //   }, 5300);
    //   setTimeout(() => {
    //     ui.notifications.error("A̸̜̱̳͛̇̿̔͒̾̈́́̄̽͝c̴̡̹̯̦̥̒̓͗̍̿̑̔̔̏̓̊̄̓̚c̴͕̘͕̝̣̲̥͛̔͂͒̊́͊͐͌̈̀̈́̔̚ę̸̧̼̺̤̫̠̤̹̩͊̈́͜͜s̸̟̦͉̤̱̖̻̓͛̾́s̶̘̰͘ ̶̛̝͕̌̽͊̆͋̃͋̿̑D̷̻͍̙̹̜̤͖̖͕̬̫͉͈̦̎́͛̇̀̃̋̌̈́̍͆̍̐͋͌͘ẽ̶̬͓̽̈͠͝n̶̢̢͙̲͉̙͇̞̜̓̓̎́͂̆͛̽̊i̷̙̲̥̭͇͖̬̿̊͛̀̉̏̒̃͒̐̉̈́̊͝ẻ̵̻̺̱͇͍̬̯̬̽̏̕͜͜ͅd̵̪̜͈̖͐̅̈͛̂̌̎̋͂̄̍͜͝ ̸̡̧̭̝̤͈̣̦̗̥͙̆͘͜-̴̧͈͚̯̠͇̰̲̙͉̜̤͔͇͇̂̄̎ͅͅ ̷̧͓̬̞̖̈̇̾͌̈̎͠͝͝͝ͅT̷̡̛͇̫̟͖̣͙̯̬͊͋̽͑͒̄̀̆̋̉̃̑̚͠h̷͓̦̦̪͙͇̲̦̜̘͙͇͇̜̙͆̅̏͛̈́̌́̾͘ͅḯ̴̧̥̟͖̼͚̗̪̫̣̲̫̗͙̜̎̀̒͂̌͜͝͝͝s̷̢̤̍̀́́ ̵̗̣̗̦̫̂͆̇͊͒̆͝t̵̠̘̱̰̲̗̟̜̯̤̳̣̠̬̍̂̇̀ḯ̸̪̻̹̫̞̘̚͠͝ḿ̶̡̛̛̥̖̞͚̮̩͙̰̘̥͉̯̪̑̇́̓͌͊͆͛̀̐͌̎͊͝ḛ̷̡̟̔̃̃̏͌͒͆̅̀͠͠l̷̢͚̅͌͒̀͑̍͐̾̾͆͋̆͝͝i̵̡̖̫͇͚̱̺̔̆͑̌͒͆ͅn̴̨̹̬̲͔̩͊̓̏̏̋́̈́̚e̷̢̢̡̞̼̦̯̤͈̣͙̯̹̩̖̭͆̓̑̐̈ ̸̛̻͚̒̂̉̃̊͐̈́͒̚̚͝͝i̷̛̤̥̬̰͎͉̹̪̗̲̜͇̦̱̩̞͈̎̈́̾̌̅͘s̵̡̛̳̞͚͆̑͋̔̋͒̈́̊͌̾̍̈̕͘̚͜͠ ̵̧̧̜̳͓̫͇̋́̇̕i̶̡͕̟̙̣̥̖̤̼̞̣͉͙̳̥̞͛͂́̎̓̒̒͗n̵̰̣̤̟̳̗̤͓̠͉̄͗͛͌̍̄̎̕v̶̺͓̤̻̺̬͇͒͜͝a̶̩̮̬̖̖̣͊̓͝͠l̸̨͇͋̌i̵̙̬͓̙̺͚̭̝̮̰̘̘̣̟̭̍͌̀̔͂̋͛̓̉͌͊̑d̵̡̫̣̤̜̮͇͖͉͉͛̂͑̆̉̕͝!̸̨̨̨̻̣̟̬̐̋́̏͊̌͛");
    //   }, 5400);
    // });

    utopiaSettings.append(twitchSettings, discordButton, vaultButton);

    //const ws = new WebSocket("ws://localhost:8765");
  });

  Hooks.on("renderSidebarTab", (tab) => {
    if (tab.tabName === "items") {
      const browserButton = document.createElement("button");
      const browserIcon = document.createElement("i");
      browserIcon.classList.add("fas", "fa-gears");
      browserButton.type = "button";
      browserButton.style.height = "28px";
      browserButton.style.lineHeight = "26px";
      browserButton.style.margin = "4px";
      browserButton.append(browserIcon, game.i18n.localize("UTOPIA.Settings.Buttons.Artifice"));
      browserButton.addEventListener("click", () => {
        const browser = new ArtificeSheet();
        browser.render(true);
      });  

      tab.element[0].querySelector(".directory-footer.action-buttons")?.append(browserButton);

      const items = tab.element[0].querySelectorAll(".directory-item.item");
      for (const item of items) { 
        const itemId = item.dataset.documentId;
        const itemData = game.items.get(itemId);
        if (itemData && itemData.type === "gear") {
          const rarity = itemData.system.rarity;
          const rarityColor = itemData.system.artifice.rarity.color;
          item.style.backgroundColor = rarityColor;
          item.style.color = getTextContrastHex(rarityColor);

          const icon = item.querySelector(".thumbnail");
          if (icon) {
            icon.style.backgroundColor = "black";
            icon.style.borderRadius = "4px";
            icon.style.padding = "2px";
            icon.style.margin = "2px";
          }
        }
      }
    }

    if (tab.tabName !== "compendium") return;

    const browserButton = document.createElement("button");
    const browserIcon = document.createElement("i");
    browserIcon.classList.add("fas", "fa-globe");
    browserButton.type = "button";
    browserButton.style.height = "28px";
    browserButton.style.lineHeight = "26px";
    browserButton.style.margin = "4px";
    browserButton.append(browserIcon, game.i18n.localize("UTOPIA.Settings.Buttons.CompendiumBrowser"));
    browserButton.addEventListener("click", () => {
      const browser = new UtopiaCompendiumBrowser();
      browser.render(true);
    });  

    tab.element[0].querySelector(".directory-footer.action-buttons")?.append(browserButton);
  });
}