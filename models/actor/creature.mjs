import UtopiaActorBase from "../base-actor.mjs";

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
    super.prepareDerivedData();

    this.difficulty = this.parent.items.find(i => i.type === "body")?.system?.baseDR || 0;

    for (const item of this.parent.items) {
      if (item.type === "kit") {
        this.difficulty += item.system.points;
      }
      if (item.type === "class") {
        this.difficulty += item.system.difficulty;
      }
    }
  }
}