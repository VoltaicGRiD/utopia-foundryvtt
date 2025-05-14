import UtopiaActorBase from "../base-actor.mjs";

export class NPC extends UtopiaActorBase {

  /** @override */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

    this.parent.updateSource({
      prototypeToken: {
        displayName: CONST.TOKEN_DISPLAY_MODES.HOVER,
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
        sight: {
          enabled: true
        }
      }
    });
  }

  /**
   * Extend the base schema with additional fields and specialized logic for playable characters.
   */
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    const required = { required: true, nullable: false }

    schema.tags = new fields.SetField(new fields.StringField({ required: true, nullable: false }));
    schema.flexibility = new fields.ArrayField(new fields.ObjectField({}), { initial: [] });
    
    // Actor owned crafting components
    schema.components = new fields.SchemaField({});

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
  }
}