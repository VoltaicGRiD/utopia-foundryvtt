import { DamageInstance } from "../system/damage.mjs";
import { UtopiaUserVisibility } from "../system/helpers/userVisibility.mjs";
import { UtopiaTemplates } from "../system/init/measuredTemplates.mjs";
import { UtopiaActor } from "./actor.mjs";
import { UtopiaItem } from "./item.mjs";

const { api } = foundry.applications

export class UtopiaChatMessage extends ChatMessage {
  async getHTML() {
    const actor = this.getActor() ?? this.system.actor ?? null;
    
    const $html = await super.getHTML();
    const html = $html[0];

    let openItem = html.querySelectorAll('[data-action="openItem"]');
    for (let button of openItem) {
      button.addEventListener('click', async (event) => {
        const actor = this.getActor();
        const item = actor.items.get(this.getFlag('utopia', 'item'));
        item.sheet.render(true);
      });
    }

    let strikeButtons = html.querySelectorAll('[data-action="performStrike"]');
    for (let button of strikeButtons) {
      button.addEventListener('click', async (event) => {
        const item = await new UtopiaItem(this.system.item);
        const formula = button.dataset.formula;
        await item.performStrike(this, {formula});
      });
    }

    let actionButtons = html.querySelectorAll('[data-action="performAction"]');
    for (let button of actionButtons) {
      button.addEventListener('click', async (event) => {
        const actor = this.getActor();
        const item = actor.items.get(this.getFlag('utopia', 'item'));
        const action = this.system.item.system.actions[button.dataset.index] ?? null;
        item.performAction(action, this);
      });
    }

    let templateButtons = html.querySelectorAll('[data-action="template"]'); 
    for (let button of templateButtons) {
      button.addEventListener('click', async (event) => {
        if (this.system.template) {
          // Set template data based on preset option
          const template = new CONFIG.MeasuredTemplate.documentClass(
            this.system.template,
            { parent: canvas.scene ?? undefined }
          );
          const measuredTemplate = new UtopiaTemplates(template);
          measuredTemplate.drawPreview();
        }
      });
    }

    let blockButton = html.querySelector('[data-action="block"]');
    blockButton?.addEventListener('click', async (event) => {
      const target = await fromUuid(this.system.target);
      const instance = DamageInstance.fromObject(this.system.instance);
      const newInstance = await target.blockDamageInstance(instance);
      const newMessage = UtopiaChatMessage.create({
        content: await renderTemplate("systems/utopia/templates/chat/damage-card.hbs", { instances: [newInstance], item: this.system.source, targets: [target] }),
        speaker: {
          user: game.user._id,
          speaker: ChatMessage.getSpeaker(),
          content: this.content
        },
        system: { instance: newInstance, source: this.system.source, target: this.system.target }
      });
      await this.delete();
    });

    let dodgeButton = html.querySelector('[data-action="dodge"]');  
    dodgeButton?.addEventListener('click', async (event) => {
      const target = await fromUuid(this.system.target);
      const instance = DamageInstance.fromObject(this.system.instance);
      const newInstance = await target.dodgeDamageInstance(instance);
      const newMessage = UtopiaChatMessage.create({
        content: await renderTemplate("systems/utopia/templates/chat/damage-card.hbs", { instances: [newInstance], item: this.system.source, targets: [target] }),
        speaker: {
          user: game.user._id,
          speaker: ChatMessage.getSpeaker(),
          content: this.content
        },
        system: { instance: newInstance, source: this.system.source, target: this.system.target }
      });
      await this.delete();
    });          

    let deleteTemplateButtons = html.querySelectorAll('[data-action="deleteTemplate"]');
    for (let button of deleteTemplateButtons) {
      button.addEventListener('click', async (event) => {
        const actor = this.getActor();
        const item = actor.items.get(this.getFlag('utopia', 'item'));
        const templates = item.getActiveTemplates() ?? this.system.itemTemplates ?? null;
        if (templates.length === 0) return ui.notifications.error("There are no templates to delete.");
        else {
          await game.canvas.scene.deleteEmbeddedDocuments("MeasuredTemplate", templates.map(t => t.id));
        }
      });
    }

    let damageDialog = html.querySelectorAll('[data-action="damageDialog"]');
    for (let button of damageDialog) {
      button.addEventListener('click', async (event) => {
        const actor = this.getActor();
        const item = actor.items.get(this.getFlag('utopia', 'item'));
        const targets = game.user.targets;
        if (targets.size === 0) return ui.notifications.error("You must target a token to deal damage.");
        const target = game.user.targets.values().next().value.actor;
        console.log(this);

        for (const die of this.system.dice) {
          const damage = die.results.reduce((sum, current) => sum + current.result, 0);
          const source = item;
          const type = die.options.flavor.toLowerCase();

          let data = {
            defenses: target.system.defenses,
            block: `${target.system.block.quantity.total}d${target.system.block.size}`,
            dodge: `${target.system.dodge.quantity.total}d${target.system.dodge.size}`,
            type: type,
            total: damage,
          };
          let template = "systems/utopia/templates/dialogs/deal-damage.hbs";
  
          const html = await renderTemplate(template, data);
          const dialog = new api.DialogV2({
            window: {
              title: `${game.i18n.localize("UTOPIA.CommonTerms.dealDamage")} - ${
                actor.name
              }`,
            },
            classes: ["utopia", "utopia.commonterms"],
            content: html,
            buttons: [
              {
                default: true,
                action: "submit",
                icon: "fas fa-check",
                id: "submit-button",
                label: "UTOPIA.CommonTerms.submit",
                // Callback to retrieve the selected choice value from the form
                callback: (event, button, dialog) => {
                  return {
                    damage: button.form.elements.damage.value,
                    type: button.form.elements.type.value,
                  };
                },
              },
              {
                default: true,
                action: "submit",
                icon: "fas fa-check",
                id: "submit-button",
                label: "UTOPIA.CommonTerms.submit",
                // Callback to retrieve the selected choice value from the form
                callback: (event, button, dialog) => {
                  return {
                    damage: button.form.elements.damage.value,
                    type: button.form.elements.type.value,
                  };
                },
              },
            ],
            // Handle the submission of the dialog
            submit: (result) => {
              console.log(result);
              target.applyDamage(
                { damage: result.damage, type: result.type, source: "GM" },
                true
              );
            },
          });
          await dialog.render(true);
        }
      });
    }

    let responseButtons = html.querySelectorAll('[data-action="responseAction"]');
    for (let button of responseButtons) {
      button.addEventListener('click', async (event) => {
        const response = button.dataset.response;
        const actor = game.user.character ?? game.canvas.tokens.controlled[0].actor ?? this.getActor();
                
        actor.performResponse(response, this);
      });
    }

    let quickDamage = html.querySelectorAll('[data-action="quickDamage"]');
    for (let button of quickDamage) {
      button.addEventListener('click', async (event) => {
        const actor = this.getActor();
        const item = actor.items.get(this.getFlag('utopia', 'item'));
        const terms = this.system.terms;
        var total = this.system.total ?? this.system.damage ?? this.system.value ?? 0;

        const type = event.target.dataset.type;
        var targets = [];
        if (type === "original") {
          targets = [...this.system.targets] ?? [];
        }
        else if (type === "mine") {
          targets = [...game.user.targets] ?? []
        }

        if (targets.length === 0) 
          return ui.notifications.error("Either there must be an original target, or you must have targeted a token to damage")

        for (let term of terms) {
          const termTotal = term.total;
          if (termTotal < total) {
            const data = {
              actor: actor,
              item: item,
              damage: term.total,
              source: item,
              type: term.flavor,
            }
  
            for (let target of targets) {
              await target.actor.applyDamage(data, data.source, data.type);
            }

            total -= termTotal;
          }  

          else if (termTotal >= total) {
            const data = {
              actor: actor,
              item: item,
              damage: total,
              source: item,
              type: term.flavor,
            }
  
            for (let target of targets) {
              if (!target.actor) {
                await game.canvas.scene.tokens.get(target._id).actor.applyDamage(data, data.source, data.type);
              }
              else {
                await target.actor.applyDamage(data, data.source, data.type);
              }
            }
          }
        }
      });
    }

    let damageButtons = html.querySelectorAll('[data-action="damage"]');
    for (let button of damageButtons) {
      button.addEventListener('click', async (event) => {
        let targets = game.user.targets;

        for (let target of targets) {
          console.log(target);

          let actor = target.actor;

          for (let dice of this.system.dice) {
            console.log(dice);

            let damage = dice.results.reduce((sum, current) => sum + current.result, 0); 
            let source = this.flags.utopia.item;
            let type = dice.options.flavor;

            await actor.applyDamage(damage, source, type);
          }
        }
      });
    }

    let dealDamageButtons = html.querySelectorAll('[data-action="dealDamage"]');
    let dealAllDamageButtons = html.querySelectorAll('[data-action="dealAllDamage"]');
    for (let button of dealDamageButtons) {
      button.addEventListener('click', async (event) => {
        var target = undefined;
        if (button.dataset.target === "target") {
          target = await fromUuid(this.system.target);
        }
        else {
          if (this.system.source.constructor.name === "UtopiaItem") {
            const item = await new UtopiaItem(this.system.source);
            target = item.parent;
          }
          else {
            target = this.source;
          }
        }        
        const percent = button.dataset.percent ?? 100;
        const instance = DamageInstance.fromObject(this.system.instance);
        target.applyDamage(instance) // TODO - Implement damage percentages
      });
    }

    for (let button of dealAllDamageButtons) {
      button.addEventListener('click', async (event) => {
        var target = undefined;
        if (button.dataset.target === "target") {
          target = await fromUuid(this.system.target);
        }
        else {
          if (this.system.source.constructor.name === "UtopiaItem") {
            const item = await new UtopiaItem(this.system.source);
            target = item.parent;
          }
          else {
            target = this.source;
          }
        }
        const percent = button.dataset.percent ?? 100;
        const instances = this.system.instances;
        for (const instance of instances) {
          const damageInstance = DamageInstance.fromObject(instance); // Convert to DamageInstance
          target.applyDamage(damageInstance, true) // TODO - Implement damage percentages
        }
      });
    }

    const visibilityHtml = UtopiaUserVisibility.process(html, { document: actor ?? this, message: this });

    return $(visibilityHtml);
  }

  static async create(message, data = {}) {
    const chatData = await super.create(message, data);
    return this;
  }

  /** Get the actor associated with this chat message */
  getActor() {
    return ChatMessage.getSpeakerActor(this.speaker);
  }

  /** Get the owned item associated with this chat message */
  getItem() {
    console.log("get item");

    const item = (() => {
      return item instanceof UtopiaItem ? item : null;
    })();
    if (!item) return null;

    if (item?.type === "spell") {
      const entryId = this.flags.pf2e?.casting?.id ?? null;
      const overlayIds = this.flags.pf2e.origin?.variant?.overlays;
      const castRank = this.flags.pf2e.origin?.castRank ?? item.rank;
      const modifiedSpell = item.loadVariant({ overlayIds, castRank, entryId });
      return modifiedSpell ?? item;
    }

    return item;
  }

  /** Get the token of the speaker if possible */
  getToken() {
    if (!game.scenes) return null; // In case we're in the middle of game setup
    const sceneId = this.speaker.scene ?? "";
    const tokenId = this.speaker.token ?? "";
    return game.scenes.get(sceneId)?.tokens.get(tokenId) ?? null;
  }

  /** @override */
  getRollData() {
    const { actor, item } = this;
    return { ...actor?.getRollData(), ...item?.getRollData() };
  }

  async removeStrikeButtons() {
    const html = await this.getHTML();
    const strikeButtons = html[0].querySelectorAll('[data-action="performStrike"]');
    for (let button of strikeButtons) {
      button.remove();
    }
    this.render();
  }

  async removeDamageButtons() {
    const html = await this.getHTML();
    const damageButtons = html[0].querySelectorAll('[data-action="damage"]');
    for (let button of damageButtons) {
      button.remove();
    }
    this.render();
  }
}