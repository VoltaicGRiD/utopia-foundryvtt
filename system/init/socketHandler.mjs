export class UtopiaSocketHandler {
    constructor() {
    this.identifier = "system.utopia" // whatever event name is correct for your package
    this.registerSocketHandlers()
  }

  registerSocketHandlers() {
    game.socket.on(this.identifier, ({ type, payload }) => {
      switch (type) {
        case "attackQuery": 
          this.#handleAttackQuery(payload);
          break;
        case "attackResponse":
          this.#handleAttackResponse(payload);
          break;
        default:
          throw new Error(`Unknown socket event type: ${type}`);
      }
    });
  }

  emit(type, payload) {
    return game.socket.emit(this.identifier, { type, payload })
  }

  async #handleAttackQuery({ target, canBlock, canDodge, canTakeCover, damage, damageHandler }) {
    const charId = game.user.character?.id || undefined;

    if (!charId) return; // User doesn't have a character
    if (target !== charId) return; // User's character is not a target
    if (!canBlock && !canDodge && !canTakeCover) return; // No options available

    const container = document.createElement("div");
    container.classList.add("flexcol");
    const header = document.createElement("span");
    header.style.fontSize = "1.5em";
    header.style.fontWeight = "bold";
    header.style.marginBottom = "5px";
    header.innerText = game.i18n.localize("UTOPIA.DIALOGS.AttackQuery.Header");
    const description = document.createElement("p");
    let damageString = "";
    switch (game.settings.get("utopia", "displayDamage")) {
      case 0: 
        damageString = game.i18n.localize("UTOPIA.DIALOGS.AttackQuery.Redacted");
        break;
      case 1: 
        damageString = game.i18n.format("UTOPIA.DIALOGS.AttackQuery.Estimated", { damage });
        break;
      case 2: 
        damageString = game.i18n.format("UTOPIA.DIALOGS.AttackQuery.Exact", { damage });
        break;
    }
    description.innerText = game.i18n.format("UTOPIA.DIALOGS.AttackQuery.Description", { damageString });
    container.append(header, description);

    const blockRating = game.user.character.getRollData().block.formula;
    const dodgeRating = game.user.character.getRollData().dodge.formula;

    const attackResponseActivities = game.user.character.items.filter(item => item.type === "activity" && item.system.operations.some(i => i.type === "attackResponse"));

    const select = foundry.applications.fields.createSelectInput({
      required: true,
      options: [
        canBlock ? { value: "block", label: game.i18n.format("UTOPIA.DIALOGS.AttackQuery.Block", { rating: blockRating }) } : null,
        canDodge ? { value: "dodge", label: game.i18n.format("UTOPIA.DIALOGS.AttackQuery.Dodge", { rating: dodgeRating }) } : null,
        //canTakeCover ? { value: "takeCover", label: game.i18n.localize("UTOPIA.DIALOGS.AttackQuery.TakeCover") } : null,
        ...attackResponseActivities.map(activity => {
          return {
            value: activity.id,
            label: game.i18n.format("UTOPIA.DIALOGS.AttackQuery.Activity", { name: activity.name, rating: activity.system.operations.find(i => i.type === "attackResponse").formula })
          }
        }, {}),
        { value: "none", label: game.i18n.localize("UTOPIA.DIALOGS.AttackQuery.None") }
      ]
    })
    container.append(select);

    await foundry.applications.api.DialogV2.prompt({
      title: game.i18n.localize("UTOPIA.DIALOGS.AttackQuery.Title"),
      content: container.innerHTML,
      ok: {
        label: "Submit", 
        icon: "fas fa-check",
        callback: async (event, button, dialog) => {
          const selected = dialog.querySelector("select").value;
          if (selected === "none") return;

          let roll;
          let total;

          switch (selected) {
            case "block":
              roll = await new Roll(game.user.character.system.block.formula, game.user.character.getRollData()).evaluate();
              total = roll.total;
              break;
            case "dodge":
              roll = await new Roll(game.user.character.system.dodge.formula, game.user.character.getRollData()).evaluate();
              total = roll.total;
              break;
            default: 
              const activity = game.user.character.items.get(selected);
              await activity.use();
              roll = activity.system.operationData[activity.system.operations.find(i => i.type === "attackResponse").id].roll;
              total = roll.total;
              break;
          }

          const response = {
            type: selected,
            total: total,
            roll: roll,
            damage: damage,
            damageHandler: damageHandler
          }

          this.emit("attackResponse", { charId, response });
        }
      }
    })
  }

  #handleAttackResponse({ charId, response }) {
    const handler = game.settings.get("utopia", "damageHandlers")[response.damageHandler];
    const type = response.type;
  }
}