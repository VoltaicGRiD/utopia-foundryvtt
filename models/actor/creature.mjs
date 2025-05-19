import UtopiaActorBase from "../base-actor.mjs";
import { prepareBodyData, prepareClassData, prepareKitData } from "../utility/pawn-utils.mjs";

export class Creature extends UtopiaActorBase {

  /** @override */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

    this.parent.updateSource({
      prototypeToken: {
        displayName: CONST.TOKEN_DISPLAY_MODES.HOVER,
        actorLink: false,
        disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE,
        sight: {
          enabled: true,
          range: 15,
        }
      }
    });
  }

  static prepareBaseData() {
    super.prepareBaseData();
    
    this.harvest = this.parent.items.find(i => i.type === "body").system.harvest;
    this.difficulty = 0;
  }

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    const required = { required: true, nullable: false }

    schema.difficulty = new fields.NumberField({ ...required, initial: 0 });
    schema.exp = new fields.NumberField({ ...required, initial: 0 });
    schema.harvested = new fields.BooleanField({ initial: false });

    return schema;
  }

  prepareDerivedData() {
    this.difficulty = this.parent.items.find(i => i.type === "body")?.system?.baseDR || 0;
    this._bodyData = this.parent.items.find(i => i.type === "body");

    prepareBodyData(this).then(() => {
      this.turnActions.available = this.turnActions.value + this.turnActions.temporary;
      this.interruptActions.available = this.interruptActions.value + this.interruptActions.temporary;

      this.spellcasting.spellcap = new Roll(`@${this.spellcasting.spellcapTrait}.total * @spellcasting.spellcapMultiplier`, this.parent.getRollData()).evaluateSync().total;

      this.talentPoints.available = 0; // Creatures don't have talent points
      this.specialistPoints.available = 0; // Creatures don't have specialist points
      this.subtraitPoints.available = 0; // Creatures don't have subtrait points

      this.spellcap = this.subtraits.res.total;

      this.handheldSlots.capacity = this.evolution.hands;
      this.handheldSlots.equipped = this.handheldSlots.equipped || [];
      for (let i = 0; i < this.handheldSlots.capacity; i++) {
        if (!this.handheldSlots.equipped[i]) this.handheldSlots.equipped[i] = null;
      }
    })    
  }
}