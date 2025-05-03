import { gatherItems } from "../../system/helpers/gatherItems.mjs";
import UtopiaActorBase from "../base-actor.mjs";
import { prepareSpeciesData, prepareSpeciesDefault } from "../utility/species-utils.mjs";

// This class extends UtopiaActorBase to model character-specific attributes and methods.
export class Character extends UtopiaActorBase {
  /**
   * Pre-creation hook that configures default token settings for newly created characters.
   */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

    this.parent.updateSource({
      prototypeToken: {
        displayName: CONST.TOKEN_DISPLAY_MODES.HOVER,
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        sight: {
          enabled: true,
          range: 15,
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

    // An actor can own components of various rarities
    // Each component has a number of available and craftable components
    // Each rarity has 
    // - available: number of components owned
    // - craftable: whether the component can be crafted
    // - trait: the trait check required to craft the component
    for (const [component, componentValue] of Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.components")))) {
      schema.components.fields[component] = new fields.SchemaField({});
      for (const [rarity, rarityValue] of Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.rarities")))) {
        schema.components.fields[component].fields[rarity] = new fields.SchemaField({});
        schema.components.fields[component].fields[rarity].fields.available = new fields.NumberField({ ...required, initial: 0 });
        schema.components.fields[component].fields[rarity].fields.craftable = new fields.BooleanField({ required: true, nullable: false, initial: rarity === "crude" ? true : false });        
        schema.components.fields[component].fields[rarity].fields.trait = new fields.StringField({ required: true, nullable: false, initial: "eng" });
      }
    }   

    return schema;
  }

  /**
   * Provide a list of header fields specific to characters (e.g., level, experience).
   */
  get headerFields() {
    return [
      ...super.headerFields,
      {
        field: this.schema.fields.level,
        stacked: false,
        editable: true,
      },
      {
        field: this.schema.fields.experience,
        stacked: false,
        editable: true,
      },
    ]
  }

  prepareDerivedData() {
    super.prepareDerivedData();
  }
}