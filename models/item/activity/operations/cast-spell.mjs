import { gatherItemsSync } from "../../../../system/helpers/gatherItems.mjs";
import { BaseOperation } from "../base-operation.mjs";

const fields = foundry.data.fields;

export class castSpell extends BaseOperation {
  static defineSchema() {
    const baseActivity = super.defineSchema();

    return {
      castSpell: new fields.SchemaField({
        type: new fields.StringField({ required: true, nullable: false, blank: false, initial: "castSpell" }),
        spell: new fields.StringField({ required: false, nullable: true, initial: null }), // Substitute for DocumentUUIDField, which cannot display 'choices' in the UI
        ignoreSpellcap: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        ignoreStatusEffects: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        ignoreArtistries: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        ...baseActivity,
      })
    }
  }

  static getChoices(activity) {
    return gatherItemsSync({ type: "spell", gatherFromActor: true, gatherFromWorld: true, gatherFolders: true }).reduce((acc, spell) => { 
      acc[spell.uuid] = spell.name;
      return acc;
    }, {})
  }
}