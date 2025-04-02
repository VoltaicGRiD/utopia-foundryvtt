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

    const required = { required: true, nullable: false, initial: 0 }
    const FormulaField = () => new fields.StringField({ required: true, nullable: true, validate: (v) => Roll.validate(v) });
    const ResourceField = () => new fields.SchemaField({
      value: new fields.NumberField({ ...required }),
      max: new fields.NumberField({ ...required })
    });
    const PointField = (initial) => new fields.SchemaField({
      available: new fields.NumberField({ ...required, initial: initial }),
      bonus: new fields.NumberField({ ...required, initial: 0 }),
      spent: new fields.NumberField({ ...required, initial: 0 })
    })

    schema.level = new fields.NumberField({ ...required, initial: 10 });
    schema.experience = new fields.NumberField({ ...required });
    schema.tags = new fields.SetField(new fields.StringField({ required: true, nullable: false }));
    schema.giftPoints = PointField(0);
    schema.subtraitPoints = PointField(0);
    schema.talentPoints = PointField(0);
    schema.specialistPoints = PointField(0);
    schema.languagePoints = PointField(0);
    schema.flexibility = new fields.ArrayField(new fields.ObjectField({}), { initial: [] });
    schema._talentTracking = new fields.ArrayField(new fields.SchemaField({
      tree: new fields.DocumentUUIDField({ required: true, nullable: false }),
      branch: new fields.NumberField({ required: true, nullable: false }),
      tier: new fields.NumberField({ required: true, nullable: false }),
      talent: new fields.DocumentUUIDField({ required: true, nullable: false }),
    }))    
    schema._talentOptions = new fields.ObjectField({ initial: {} });
    
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

  /**
   * Main function to process derived data after the base data is ready.
   * Invokes multiple preparation methods for traits, species, defenses, etc.
   */
  prepareDerivedData() {
    try { this._prepareTraits() } catch (e) { console.error(e) }
    try { prepareSpeciesData(this); } catch (e) { console.error(e); }
    try { this._prepareDefenses() } catch (e) { console.error(e) }
    try { this._prepareTalents() } catch (e) { console.error(e) }
    try { this._preparePoints(); } catch (e) { console.error(e); }
    try { this._prepareAttributes(); } catch (e) { console.error(e); }
    //try { this._prepareAutomation(); } catch (e) { console.error(e); }
  }
  
  /**
   * Adjust the actor's attributes (hitpoints, stamina) based on stats and current level.
   * Helps enforce minimum/maximum values.
   */
  _prepareAttributes() {
    this.hitpoints.surface.max += (this.body * this.constitution) + this.level;
    this.hitpoints.deep.max += (this.soul * this.effervescence) + this.level;
    this.stamina.max += (this.mind * this.endurance) + this.level;

    this.hitpoints.surface.value = Math.min(this.hitpoints.surface.value, this.hitpoints.surface.max);
    this.hitpoints.deep.value = Math.min(this.hitpoints.deep.value, this.hitpoints.deep.max);
    this.stamina.value = Math.min(this.stamina.value, this.stamina.max);

    this.canLevel = this.experience >= this.level * 100;
  }

  /**
   * Handle the initialization and tracking of point pools (talents, specialists).
   */
  _preparePoints() {
    this.points = {
      body: 0,
      mind: 0,
      soul: 0
    };

    for (const item of this.parent.items.filter(i => i.type === "talent")) {
      this.points.body += item.system.body;
      this.points.mind += item.system.mind;
      this.points.soul += item.system.soul;
    };
    
    this.talentPoints.spent = this.points.body + this.points.mind + this.points.soul;
    this.talentPoints.available = this.level - this.talentPoints.spent + this.talentPoints.bonus;
    
    this.specialistPoints.spent = this.parent.items.filter(i => i.type === "specialist").length;
    this.specialistPoints.available = Math.floor(this.level / 10) - this.specialistPoints.spent + this.specialistPoints.bonus;

    Object.keys(this.subtraits).forEach(k =>{
      this.subtraitPoints.spent += (this.subtraits[k].value - 1);
      this.subtraitPoints.available = 5 + this.level - this.subtraitPoints.spent + this.subtraitPoints.bonus;
    })
  }

  /**
   * Process talents by iterating over talent trees, checking highest tiers acquired, and summing stats.
   */
  async _prepareTalents() {
    this.body = 0;
    this.mind = 0;
    this.soul = 0;

    const talents = this.parent.items.filter(i => i.type === "talent");
    for (const talent of talents) {
      this.body += talent.system.body;
      this.mind += talent.system.mind;
      this.soul += talent.system.soul;

      if (talent.system.selectedOption.length !== 0) {
        const category = talent.system.options.category;
        this._talentOptions[category] ??= [];
        this._talentOptions[category].push(talent.system.selectedOption);
      }
    }
    
    const species = this._speciesData.system.branches;
    for (const branch of species) {
      var highestTier = -1;
      
      for (var t = 0; t < branch.talents.length; t++) {
        const branchTalent = await fromUuid(branch.talents[t].uuid);
        
        // We can compare points, name, and other properties, but can't compare
        // the entire object because it's a different instance
        for (const talent of talents) {
          var match = true;
          
          if (talent.name !== branchTalent.name) match = false;
          if (foundry.utils.objectsEqual(talent.system.toObject(), branchTalent.system.toObject()) === false) match = false;
          
          if (match) {
            if (t > highestTier) highestTier = t;
            break;
          }
        }
      }
    }


    this.trees = treeTiers;
    console.log(this);
  }

  /**
   * Aggregate innate and armor-based defenses for this actor.
   */
  _prepareDefenses() {
    this.armorDefenses = {
      energy:    0,
      heat:      0,
      chill:     0,
      physical:  0,
      psyche:    0,
    };

    for (const item of this.parent.items) {
      if (item.system.defenses) {
        for (const [key, value] of Object.entries(item.system.defenses)) {
          if (this.armorDefenses[key] === undefined) this.armorDefenses[key] = 0;
          this.armorDefenses[key] += value;
        }
      }
    }

    this.defenses = {
      energy:    this.innateDefenses.energy    + this.armorDefenses.energy ?? 0,
      heat:      this.innateDefenses.heat      + this.armorDefenses.heat ?? 0,
      chill:     this.innateDefenses.chill     + this.armorDefenses.chill ?? 0,
      physical:  this.innateDefenses.physical  + this.armorDefenses.physical ?? 0,
      psyche:    this.innateDefenses.psyche    + this.armorDefenses.psyche ?? 0,
    }
  }

  /**
   * Compile trait values (including bonuses and mods) into final totals for calculations.
   */
  _prepareTraits() {
    console.log(this);

    for (const [key, trait] of Object.entries(this.traits)) {
      trait.total = trait.value + trait.bonus;
    }

    for (const [key, subtrait] of Object.entries(this.subtraits)) {
      subtrait.total = subtrait.value + subtrait.bonus;
      if (subtrait.total === 0) subtrait.value = 1;
      subtrait.total = subtrait.value + subtrait.bonus;
      if (subtrait.gifted) {
        this.giftPoints.available -= 1;
        this.giftPoints.spent += 1;
        subtrait.mod = Math.max(subtrait.total - 4, 0);
      }
      else subtrait.mod = subtrait.total - 4;
      this.traits[subtrait.parent].total += subtrait.total;
      //this.traits[subtrait.parent].mod = this.traits[subtrait.parent].total - 4;
    }

    for (const [key, trait] of Object.entries(this.traits)) {
      trait.mod += trait.total;
      trait.mod = trait.mod - 4;
    }

    // Slot capacity is calculated from size and strength
    const str = this.traits.str.total;
    switch (this.size) {
      case "sm": 
        this.slotCapacity.total = this.slotCapacity.bonus + (2 * str);
        break;
      case "med":
        this.slotCapacity.total = this.slotCapacity.bonus + (5 * str);
        break;
      case "lg":
        this.slotCapacity.total = this.slotCapacity.bonus + (15* str);
        break;
    }

    this.spellcasting.spellcap = this.subtraits.res.total;
  }
}