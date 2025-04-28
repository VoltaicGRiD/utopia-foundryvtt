import { FeatureBuilder } from "../../applications/specialty/feature-builder.mjs";
import { UtopiaChatMessage } from "../../documents/chat-message.mjs";
import { registerDiceSoNice } from "../integrations/DiceSoNice/diceSoNice.mjs";

export function registerHooks() {
  Hooks.once("ready", function () {
    // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
    Hooks.on("hotbarDrop", (bar, data, slot) => {
      createDocMacro(data, slot);
      return false;
    });

    Hooks.on("targetToken", (user, token, targeted) => {
      if (ui.activeWindow.constructor.name === "UtopiaAttackSheet") {
        let window = ui.activeWindow;
        window.render();
      }
    });

    Hooks.on("deleteCombat", async (combat, options, userId) => {    
      console.warn("[UTOPIA] Combat is being deleted, restoring combatants' turn actions.", combat, options, userId);

      const harvestableCreatures = [];

      combat.combatants.forEach((combatant) => {
        let actor = combatant.actor;
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

      const template = await renderTemplate("systems/utopia/templates/chat/harvest-card.hbs");

      await UtopiaChatMessage.create({
        content: template,
        speaker: ChatMessage.getSpeaker({ alias: game.i18n.localize("UTOPIA.Combat.Harvest") }),
        system: {
          harvest: item.uuid,
        }
      });
    });

    Hooks.on("combatTurnChange", (combat, from, to) => {
      if (game.user.isGM) {
        let token = game.canvas.tokens.placeables.find(t => t.id === to.tokenId);
        token.control();
      }

      combat.combatants.forEach(async (combatant) => {
        let actor = game.actors.get(combatant.actorId);
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
      // Open the hyperlink to the Utopia Discord
      ui.notifications.error("A̸̜̱̳͛̇̿̔͒̾̈́́̄̽͝c̴̡̹̯̦̥̒̓͗̍̿̑̔̔̏̓̊̄̓̚c̴͕̘͕̝̣̲̥͛̔͂͒̊́͊͐͌̈̀̈́̔̚ę̸̧̼̺̤̫̠̤̹̩͊̈́͜͜s̸̟̦͉̤̱̖̻̓͛̾́s̶̘̰͘ ̶̛̝͕̌̽͊̆͋̃͋̿̑D̷̻͍̙̹̜̤͖̖͕̬̫͉͈̦̎́͛̇̀̃̋̌̈́̍͆̍̐͋͌͘ẽ̶̬͓̽̈͠͝n̶̢̢͙̲͉̙͇̞̜̓̓̎́͂̆͛̽̊i̷̙̲̥̭͇͖̬̿̊͛̀̉̏̒̃͒̐̉̈́̊͝ẻ̵̻̺̱͇͍̬̯̬̽̏̕͜͜ͅd̵̪̜͈̖͐̅̈͛̂̌̎̋͂̄̍͜͝ ̸̡̧̭̝̤͈̣̦̗̥͙̆͘͜-̴̧͈͚̯̠͇̰̲̙͉̜̤͔͇͇̂̄̎ͅͅ ̷̧͓̬̞̖̈̇̾͌̈̎͠͝͝͝ͅT̷̡̛͇̫̟͖̣͙̯̬͊͋̽͑͒̄̀̆̋̉̃̑̚͠h̷͓̦̦̪͙͇̲̦̜̘͙͇͇̜̙͆̅̏͛̈́̌́̾͘ͅḯ̴̧̥̟͖̼͚̗̪̫̣̲̫̗͙̜̎̀̒͂̌͜͝͝͝s̷̢̤̍̀́́ ̵̗̣̗̦̫̂͆̇͊͒̆͝t̵̠̘̱̰̲̗̟̜̯̤̳̣̠̬̍̂̇̀ḯ̸̪̻̹̫̞̘̚͠͝ḿ̶̡̛̛̥̖̞͚̮̩͙̰̘̥͉̯̪̑̇́̓͌͊͆͛̀̐͌̎͊͝ḛ̷̡̟̔̃̃̏͌͒͆̅̀͠͠l̷̢͚̅͌͒̀͑̍͐̾̾͆͋̆͝͝i̵̡̖̫͇͚̱̺̔̆͑̌͒͆ͅn̴̨̹̬̲͔̩͊̓̏̏̋́̈́̚e̷̢̢̡̞̼̦̯̤͈̣͙̯̹̩̖̭͆̓̑̐̈ ̸̛̻͚̒̂̉̃̊͐̈́͒̚̚͝͝i̷̛̤̥̬̰͎͉̹̪̗̲̜͇̦̱̩̞͈̎̈́̾̌̅͘s̵̡̛̳̞͚͆̑͋̔̋͒̈́̊͌̾̍̈̕͘̚͜͠ ̵̧̧̜̳͓̫͇̋́̇̕i̶̡͕̟̙̣̥̖̤̼̞̣͉͙̳̥̞͛͂́̎̓̒̒͗n̵̰̣̤̟̳̗̤͓̠͉̄͗͛͌̍̄̎̕v̶̺͓̤̻̺̬͇͒͜͝a̶̩̮̬̖̖̣͊̓͝͠l̸̨͇͋̌i̵̙̬͓̙̺͚̭̝̮̰̘̘̣̟̭̍͌̀̔͂̋͛̓̉͌͊̑d̵̡̫̣̤̜̮͇͖͉͉͛̂͑̆̉̕͝!̸̨̨̨̻̣̟̬̐̋́̏͊̌͛");
      setTimeout(() => {
        ui.notifications.error("A̸̜̱̳͛̇̿̔͒̾̈́́̄̽͝c̴̡̹̯̦̥̒̓͗̍̿̑̔̔̏̓̊̄̓̚c̴͕̘͕̝̣̲̥͛̔͂͒̊́͊͐͌̈̀̈́̔̚ę̸̧̼̺̤̫̠̤̹̩͊̈́͜͜s̸̟̦͉̤̱̖̻̓͛̾́s̶̘̰͘ ̶̛̝͕̌̽͊̆͋̃͋̿̑D̷̻͍̙̹̜̤͖̖͕̬̫͉͈̦̎́͛̇̀̃̋̌̈́̍͆̍̐͋͌͘ẽ̶̬͓̽̈͠͝n̶̢̢͙̲͉̙͇̞̜̓̓̎́͂̆͛̽̊i̷̙̲̥̭͇͖̬̿̊͛̀̉̏̒̃͒̐̉̈́̊͝ẻ̵̻̺̱͇͍̬̯̬̽̏̕͜͜ͅd̵̪̜͈̖͐̅̈͛̂̌̎̋͂̄̍͜͝ ̸̡̧̭̝̤͈̣̦̗̥͙̆͘͜-̴̧͈͚̯̠͇̰̲̙͉̜̤͔͇͇̂̄̎ͅͅ ̷̧͓̬̞̖̈̇̾͌̈̎͠͝͝͝ͅT̷̡̛͇̫̟͖̣͙̯̬͊͋̽͑͒̄̀̆̋̉̃̑̚͠h̷͓̦̦̪͙͇̲̦̜̘͙͇͇̜̙͆̅̏͛̈́̌́̾͘ͅḯ̴̧̥̟͖̼͚̗̪̫̣̲̫̗͙̜̎̀̒͂̌͜͝͝͝s̷̢̤̍̀́́ ̵̗̣̗̦̫̂͆̇͊͒̆͝t̵̠̘̱̰̲̗̟̜̯̤̳̣̠̬̍̂̇̀ḯ̸̪̻̹̫̞̘̚͠͝ḿ̶̡̛̛̥̖̞͚̮̩͙̰̘̥͉̯̪̑̇́̓͌͊͆͛̀̐͌̎͊͝ḛ̷̡̟̔̃̃̏͌͒͆̅̀͠͠l̷̢͚̅͌͒̀͑̍͐̾̾͆͋̆͝͝i̵̡̖̫͇͚̱̺̔̆͑̌͒͆ͅn̴̨̹̬̲͔̩͊̓̏̏̋́̈́̚e̷̢̢̡̞̼̦̯̤͈̣͙̯̹̩̖̭͆̓̑̐̈ ̸̛̻͚̒̂̉̃̊͐̈́͒̚̚͝͝i̷̛̤̥̬̰͎͉̹̪̗̲̜͇̦̱̩̞͈̎̈́̾̌̅͘s̵̡̛̳̞͚͆̑͋̔̋͒̈́̊͌̾̍̈̕͘̚͜͠ ̵̧̧̜̳͓̫͇̋́̇̕i̶̡͕̟̙̣̥̖̤̼̞̣͉͙̳̥̞͛͂́̎̓̒̒͗n̵̰̣̤̟̳̗̤͓̠͉̄͗͛͌̍̄̎̕v̶̺͓̤̻̺̬͇͒͜͝a̶̩̮̬̖̖̣͊̓͝͠l̸̨͇͋̌i̵̙̬͓̙̺͚̭̝̮̰̘̘̣̟̭̍͌̀̔͂̋͛̓̉͌͊̑d̵̡̫̣̤̜̮͇͖͉͉͛̂͑̆̉̕͝!̸̨̨̨̻̣̟̬̐̋́̏͊̌͛");
      }, 3500);
      setTimeout(() => {
        ui.notifications.warn("Ą̸̺̱̮̦̦̱̉̆̂͝r̷̨̥̜͓̠̫̮̗̹̦͈̪̳̙̻͑̅͑̐̽̄͌͘͝ͅe̵̡͈̜͖̪̖͚̩̬̗̫̭̊̈́͆͊̂̀̿̚ ̵͎̊̌͌͌̏̊͊̋̒̓̚y̶̻̍̈́̀̆͝͝ơ̴̧̛̟̺̳̬͚̑̌̀̌̇̂̈́̕͝ų̵̭̗̺̍̏̓̓̐̍͛̽̅̐̓̈́̐̊̕͝.̵̤̗̞͖̟̱̼̉̈́͗̒̕.̴̥͖̹͚̿̀̑̅̎͒̋̔̒́̂͑̈̔͑.̷̧̓ͅ.̶̞̱̝͕́̇̀̊ͅ ̶̞̰̥̟͓̫̪̰̺̼̪̰̹͇́͑͗̑̾̌͗̓̀̔̄̾́͒̒̊̈́ͅh̷̯̻͎̘̬͂̿̑͑̀̚ě̶̻̼̮̹͑̎̇́̋̓̂̆̎̈́͝͠r̷̡̤͕̙̠͕̯̫̮̼̖̫̞̙̟̯̗̆̀̃̏̈͒͘͝͠é̸̘̲͍̗̾́̐͒̉͌̽̚ ̵̡̢͎͚̟̝͍̻͎̳̰̬̥̮̼͍͊̈͊̕͜f̸̨̭̹̙̲̳͕͎̝̠̰̪̱̎̆͂̄̓͐́̂͘̚o̸̢̨̝̝̥̼̬̠͓̲̱̹̓̃̋͜͝ṟ̸̡̻̙̩̤͙̠͉͓̣̭͕͍̫͐̀̓̚ͅ ̸̧̲̝͓̣̠̟̝̄̀̔̽̈͜ͅm̴͖͕̆̌̿̊̅̀̊̔͋́̑͜ḙ̸̬̜̹̄̄͗̄ͅ?̵̧̧̛̗͇̼̪̘̫̥͎͇̑̓̄̿̓̎͐̂̄́͊͌͛̍̐͠");
      }, 3600);
      setTimeout(() => {
        ui.notifications.error("A̸̜̱̳͛̇̿̔͒̾̈́́̄̽͝c̴̡̹̯̦̥̒̓͗̍̿̑̔̔̏̓̊̄̓̚c̴͕̘͕̝̣̲̥͛̔͂͒̊́͊͐͌̈̀̈́̔̚ę̸̧̼̺̤̫̠̤̹̩͊̈́͜͜s̸̟̦͉̤̱̖̻̓͛̾́s̶̘̰͘ ̶̛̝͕̌̽͊̆͋̃͋̿̑D̷̻͍̙̹̜̤͖̖͕̬̫͉͈̦̎́͛̇̀̃̋̌̈́̍͆̍̐͋͌͘ẽ̶̬͓̽̈͠͝n̶̢̢͙̲͉̙͇̞̜̓̓̎́͂̆͛̽̊i̷̙̲̥̭͇͖̬̿̊͛̀̉̏̒̃͒̐̉̈́̊͝ẻ̵̻̺̱͇͍̬̯̬̽̏̕͜͜ͅd̵̪̜͈̖͐̅̈͛̂̌̎̋͂̄̍͜͝ ̸̡̧̭̝̤͈̣̦̗̥͙̆͘͜-̴̧͈͚̯̠͇̰̲̙͉̜̤͔͇͇̂̄̎ͅͅ ̷̧͓̬̞̖̈̇̾͌̈̎͠͝͝͝ͅT̷̡̛͇̫̟͖̣͙̯̬͊͋̽͑͒̄̀̆̋̉̃̑̚͠h̷͓̦̦̪͙͇̲̦̜̘͙͇͇̜̙͆̅̏͛̈́̌́̾͘ͅḯ̴̧̥̟͖̼͚̗̪̫̣̲̫̗͙̜̎̀̒͂̌͜͝͝͝s̷̢̤̍̀́́ ̵̗̣̗̦̫̂͆̇͊͒̆͝t̵̠̘̱̰̲̗̟̜̯̤̳̣̠̬̍̂̇̀ḯ̸̪̻̹̫̞̘̚͠͝ḿ̶̡̛̛̥̖̞͚̮̩͙̰̘̥͉̯̪̑̇́̓͌͊͆͛̀̐͌̎͊͝ḛ̷̡̟̔̃̃̏͌͒͆̅̀͠͠l̷̢͚̅͌͒̀͑̍͐̾̾͆͋̆͝͝i̵̡̖̫͇͚̱̺̔̆͑̌͒͆ͅn̴̨̹̬̲͔̩͊̓̏̏̋́̈́̚e̷̢̢̡̞̼̦̯̤͈̣͙̯̹̩̖̭͆̓̑̐̈ ̸̛̻͚̒̂̉̃̊͐̈́͒̚̚͝͝i̷̛̤̥̬̰͎͉̹̪̗̲̜͇̦̱̩̞͈̎̈́̾̌̅͘s̵̡̛̳̞͚͆̑͋̔̋͒̈́̊͌̾̍̈̕͘̚͜͠ ̵̧̧̜̳͓̫͇̋́̇̕i̶̡͕̟̙̣̥̖̤̼̞̣͉͙̳̥̞͛͂́̎̓̒̒͗n̵̰̣̤̟̳̗̤͓̠͉̄͗͛͌̍̄̎̕v̶̺͓̤̻̺̬͇͒͜͝a̶̩̮̬̖̖̣͊̓͝͠l̸̨͇͋̌i̵̙̬͓̙̺͚̭̝̮̰̘̘̣̟̭̍͌̀̔͂̋͛̓̉͌͊̑d̵̡̫̣̤̜̮͇͖͉͉͛̂͑̆̉̕͝!̸̨̨̨̻̣̟̬̐̋́̏͊̌͛");
      }, 3500);
      setTimeout(() => {
        ui.notifications.error("A̸̜̱̳͛̇̿̔͒̾̈́́̄̽͝c̴̡̹̯̦̥̒̓͗̍̿̑̔̔̏̓̊̄̓̚c̴͕̘͕̝̣̲̥͛̔͂͒̊́͊͐͌̈̀̈́̔̚ę̸̧̼̺̤̫̠̤̹̩͊̈́͜͜s̸̟̦͉̤̱̖̻̓͛̾́s̶̘̰͘ ̶̛̝͕̌̽͊̆͋̃͋̿̑D̷̻͍̙̹̜̤͖̖͕̬̫͉͈̦̎́͛̇̀̃̋̌̈́̍͆̍̐͋͌͘ẽ̶̬͓̽̈͠͝n̶̢̢͙̲͉̙͇̞̜̓̓̎́͂̆͛̽̊i̷̙̲̥̭͇͖̬̿̊͛̀̉̏̒̃͒̐̉̈́̊͝ẻ̵̻̺̱͇͍̬̯̬̽̏̕͜͜ͅd̵̪̜͈̖͐̅̈͛̂̌̎̋͂̄̍͜͝ ̸̡̧̭̝̤͈̣̦̗̥͙̆͘͜-̴̧͈͚̯̠͇̰̲̙͉̜̤͔͇͇̂̄̎ͅͅ ̷̧͓̬̞̖̈̇̾͌̈̎͠͝͝͝ͅT̷̡̛͇̫̟͖̣͙̯̬͊͋̽͑͒̄̀̆̋̉̃̑̚͠h̷͓̦̦̪͙͇̲̦̜̘͙͇͇̜̙͆̅̏͛̈́̌́̾͘ͅḯ̴̧̥̟͖̼͚̗̪̫̣̲̫̗͙̜̎̀̒͂̌͜͝͝͝s̷̢̤̍̀́́ ̵̗̣̗̦̫̂͆̇͊͒̆͝t̵̠̘̱̰̲̗̟̜̯̤̳̣̠̬̍̂̇̀ḯ̸̪̻̹̫̞̘̚͠͝ḿ̶̡̛̛̥̖̞͚̮̩͙̰̘̥͉̯̪̑̇́̓͌͊͆͛̀̐͌̎͊͝ḛ̷̡̟̔̃̃̏͌͒͆̅̀͠͠l̷̢͚̅͌͒̀͑̍͐̾̾͆͋̆͝͝i̵̡̖̫͇͚̱̺̔̆͑̌͒͆ͅn̴̨̹̬̲͔̩͊̓̏̏̋́̈́̚e̷̢̢̡̞̼̦̯̤͈̣͙̯̹̩̖̭͆̓̑̐̈ ̸̛̻͚̒̂̉̃̊͐̈́͒̚̚͝͝i̷̛̤̥̬̰͎͉̹̪̗̲̜͇̦̱̩̞͈̎̈́̾̌̅͘s̵̡̛̳̞͚͆̑͋̔̋͒̈́̊͌̾̍̈̕͘̚͜͠ ̵̧̧̜̳͓̫͇̋́̇̕i̶̡͕̟̙̣̥̖̤̼̞̣͉͙̳̥̞͛͂́̎̓̒̒͗n̵̰̣̤̟̳̗̤͓̠͉̄͗͛͌̍̄̎̕v̶̺͓̤̻̺̬͇͒͜͝a̶̩̮̬̖̖̣͊̓͝͠l̸̨͇͋̌i̵̙̬͓̙̺͚̭̝̮̰̘̘̣̟̭̍͌̀̔͂̋͛̓̉͌͊̑d̵̡̫̣̤̜̮͇͖͉͉͛̂͑̆̉̕͝!̸̨̨̨̻̣̟̬̐̋́̏͊̌͛");
      }, 5200);
      setTimeout(() => {
        ui.notifications.info("P̶̧̪͎̪̲̺̭̳̫̤̩̋̄̋̉̓̀̍͌̐̃́̉̽̍̕͜͜ẻ̵̛̺̈̀͋̒̔̈́͂͆͊̍͠ṟ̵͈̟̝̯̽́̇̇̑̐̀́̂̃̇͋͘ͅh̸̨̧̛͙̩̦̥̼̳̱̟͚̫̖̙̘̯͐̑̅̾̈̂̍̔̿͋͘͜͠â̷͖̼͑̆͐p̸̝̙̙̤̭͓̩͕̼̈́̂͂̃̇͛̋̉̎́̆̓̊͝͝͝s̴̢̡̱̺͓͊̾͆̈́̈͊̈́̌͗̀͘͠.̷̝̕͝.̷̢̲͉̞͉̞̇̏̾̽̍͌̾͂̆͘͘͜.̶̳̹̓̽̍͠.̶̧̡̼̤̣̯̰͖̪̈́̇͜ͅ ̶̞̯̥͆͋͒̈́̀̓̂̿͊͌t̴̡̢̺̝̗̲̪̾̀͌h̷͔͚̹̞̪̭̄ͅe̶̡̧̧̢̲̠̰̗̳̦̯̺̳̰̜͈̊̕͝ͅ ̵̨̡̘̲͉̠̫̊̃̾̊͛̊́͛̇͝g̵̨͎̯̹͙̹͈͖̩̠̅̒̄̄̾̒̌̓͗ͅò̶̦̘͚̼̲͎͇͕̿̌̋͜ͅl̷̯̹̱͉̿̀̓̋̽ḑ̵̡̼̜͎͙̝̖͍̩͙̙̣̺̮͔͋̓̈́̾ͅḙ̸̗̣͖̻̩̪̅ǹ̶̩̥͆̈͑̾͠ ̵͔͍̙͕̱̀̂͗̓̆́̃̽̀͒̽̄̾́̚ͅȯ̷̢͉͇̺͙͙̟̰̅͂̊̄̍̀̒̇͌̽̚͝͝͠ǹ̸̡̰͇̰̼̝̫͈̻̆ę̴͚̦̩̹̗͍̀̑̐̇̒̑͝ ̸̨̡͕̘̼͈̮̙͎͇̬͕͚̟̱̓h̴̢̥̘̫͕̥͕̹͚͇̦̱̑̀ǻ̴̢̢͈̝̜̝̤̗͔͇͙̹̠̍̀̈̀̌̏͆̈́̀̚͝s̷̬̝̀̌͐̎̔̆̀̄͗̈̈́͝͝͠͝ ̸̥͗͛͂͑͛͆͑͐̑̐͛́̎̐̑̕͝t̴̽̓̀̇͊́͌̊͝ͅh̴̛̬̘͇̯̩̫̯̟̤͓͓̬̬̼̞͐́̓̏̍͐͋̀͛͛̀̕ȩ̶̣̻̹͖̱̭͕̯͖̱̄̇̓̉̄̊̉̀̉̒͛̓ͅ ̴̨͈̙͍̙͓̞̙̏̎̃̒̅̓͗̂̚͝ͅa̷̘͚̻̭̦͔͙̟̙̽̔̀̕͜n̸̩̠̙͈̐̂͐͌͋̒͑͊̇̓͝͝s̵̨͇̠̺̼̜̘̳͒̀͛w̸̢̦̌̑́͐͐͝͠ḝ̸̛͙̥͚̣͇̜̝̯̭̘̟̟̪̎̋̄͋̄̀̚͝͠ͅṛ̶̖͙̜͒̽ŝ̷̢̖̱̞̭̼̭͎̙̠.̴̨̖͈̟͇͇̲͇̰̰̫̪̳͙͗̊͌̈́̇̈́̓̓̿̍̕̚");
      }, 5300);
      setTimeout(() => {
        ui.notifications.error("A̸̜̱̳͛̇̿̔͒̾̈́́̄̽͝c̴̡̹̯̦̥̒̓͗̍̿̑̔̔̏̓̊̄̓̚c̴͕̘͕̝̣̲̥͛̔͂͒̊́͊͐͌̈̀̈́̔̚ę̸̧̼̺̤̫̠̤̹̩͊̈́͜͜s̸̟̦͉̤̱̖̻̓͛̾́s̶̘̰͘ ̶̛̝͕̌̽͊̆͋̃͋̿̑D̷̻͍̙̹̜̤͖̖͕̬̫͉͈̦̎́͛̇̀̃̋̌̈́̍͆̍̐͋͌͘ẽ̶̬͓̽̈͠͝n̶̢̢͙̲͉̙͇̞̜̓̓̎́͂̆͛̽̊i̷̙̲̥̭͇͖̬̿̊͛̀̉̏̒̃͒̐̉̈́̊͝ẻ̵̻̺̱͇͍̬̯̬̽̏̕͜͜ͅd̵̪̜͈̖͐̅̈͛̂̌̎̋͂̄̍͜͝ ̸̡̧̭̝̤͈̣̦̗̥͙̆͘͜-̴̧͈͚̯̠͇̰̲̙͉̜̤͔͇͇̂̄̎ͅͅ ̷̧͓̬̞̖̈̇̾͌̈̎͠͝͝͝ͅT̷̡̛͇̫̟͖̣͙̯̬͊͋̽͑͒̄̀̆̋̉̃̑̚͠h̷͓̦̦̪͙͇̲̦̜̘͙͇͇̜̙͆̅̏͛̈́̌́̾͘ͅḯ̴̧̥̟͖̼͚̗̪̫̣̲̫̗͙̜̎̀̒͂̌͜͝͝͝s̷̢̤̍̀́́ ̵̗̣̗̦̫̂͆̇͊͒̆͝t̵̠̘̱̰̲̗̟̜̯̤̳̣̠̬̍̂̇̀ḯ̸̪̻̹̫̞̘̚͠͝ḿ̶̡̛̛̥̖̞͚̮̩͙̰̘̥͉̯̪̑̇́̓͌͊͆͛̀̐͌̎͊͝ḛ̷̡̟̔̃̃̏͌͒͆̅̀͠͠l̷̢͚̅͌͒̀͑̍͐̾̾͆͋̆͝͝i̵̡̖̫͇͚̱̺̔̆͑̌͒͆ͅn̴̨̹̬̲͔̩͊̓̏̏̋́̈́̚e̷̢̢̡̞̼̦̯̤͈̣͙̯̹̩̖̭͆̓̑̐̈ ̸̛̻͚̒̂̉̃̊͐̈́͒̚̚͝͝i̷̛̤̥̬̰͎͉̹̪̗̲̜͇̦̱̩̞͈̎̈́̾̌̅͘s̵̡̛̳̞͚͆̑͋̔̋͒̈́̊͌̾̍̈̕͘̚͜͠ ̵̧̧̜̳͓̫͇̋́̇̕i̶̡͕̟̙̣̥̖̤̼̞̣͉͙̳̥̞͛͂́̎̓̒̒͗n̵̰̣̤̟̳̗̤͓̠͉̄͗͛͌̍̄̎̕v̶̺͓̤̻̺̬͇͒͜͝a̶̩̮̬̖̖̣͊̓͝͠l̸̨͇͋̌i̵̙̬͓̙̺͚̭̝̮̰̘̘̣̟̭̍͌̀̔͂̋͛̓̉͌͊̑d̵̡̫̣̤̜̮͇͖͉͉͛̂͑̆̉̕͝!̸̨̨̨̻̣̟̬̐̋́̏͊̌͛");
      }, 5400);
    });

    utopiaSettings.append(twitchSettings, discordButton, vaultButton);

    const ws = new WebSocket("ws://localhost:8765");
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
      browserButton.append(browserIcon, game.i18n.localize("UTOPIA.Settings.Buttons.FeatureBuilder"));
      browserButton.addEventListener("click", () => {
        const browser = new FeatureBuilder();
        browser.render(true);
      });  

      tab.element[0].querySelector(".directory-footer.action-buttons")?.append(browserButton);
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