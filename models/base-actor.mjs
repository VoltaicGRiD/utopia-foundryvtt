// Provide a clear description of this import and constant usage.
const fields = foundry.data.fields;
const requiredInteger = { required: true, nullable: false, initial: 0 }
import { BiographyField as TextareaField } from "./fields/biography-field.mjs";
import { SchemaArrayField } from "./fields/schema-set-field.mjs";
import { getPaperDollContext } from "./utility/paper-doll-utils.mjs";
import { prepareSpeciesData } from "./utility/species-utils.mjs";
// import { prepareGearData } from "./utility/gear-utils.mjs";
// import { prepareBodyData, prepareClassData, prepareKitData } from "./utility/pawn-utils.mjs";

export default class UtopiaActorBase extends foundry.abstract.TypeDataModel {
  // Extended from Foundry's TypeDataModel to represent base data logic for Utopia Actors.

  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "UTOPIA.Actors"];

  /**
   * Define the comprehensive data schema for the actor.
   * Includes fields, resources, traits, subtraits, and relevant data structures.
   */
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, initial: 0 };
    const schema = {};

    const formulaType = { required: true, nullable: true, validate: (v) => Roll.validate(v) };
    const TraitField = (parent = null) => {
      const returns = {
        mod: new fields.NumberField({ ...requiredInteger }),
        value: new fields.NumberField({ ...requiredInteger, initial: 1 }),
        bonus: new fields.NumberField({ ...requiredInteger }),
        total: new fields.NumberField({ ...requiredInteger }),
        gifted: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        critRisk: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      }
      if (parent) returns.parent = new fields.StringField({ required: true, nullable: false, initial: parent });
      return new fields.SchemaField(returns);
    }
    const ResourceField = () => new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      //rest: new fields.StringField({ required: true, nullable: false, blank: true, initial: "", validate: (v) => Roll.validate(v) || v === "" }),
    });

    schema.traits = new fields.SchemaField({
      ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.traits"))).reduce((acc, [key, value]) => {
        acc[key] = new fields.SchemaField({
          value: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        })
        return acc;
      }, {}),
    });

    schema.subtraits = new fields.SchemaField({
      ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.subtraits"))).reduce((acc, [key, value]) => {
        acc[key] = new fields.SchemaField({ 
          value: new fields.NumberField({ ...requiredInteger, initial: 1 }),
          gifted: new fields.BooleanField({ required: true, nullable: false, initial: false }),
          critRisk: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        });
        return acc;
      }, {}),
    });

    schema.checks = new fields.SchemaField({
      ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.specialtyChecks"))).reduce((acc, [key, value]) => {
        acc[key] = new fields.SchemaField({
          attribute: new fields.StringField({ required: true, nullable: false, initial: value.defaultAttribute }),
          bonus: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        })
        return acc;
      }, {}),
    });

    schema.fullbody = new fields.FilePathField({categories: ["IMAGE", "VIDEO"], required: true}),

    schema.favorLocks = new fields.SchemaField({});
    schema.favorLocks.fields.blockDisfavor = new fields.SchemaField({});
    schema.favorLocks.fields.blockFavor = new fields.SchemaField({});
    for (const [key, value] of Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.traits")))) {
      schema.favorLocks.fields.blockDisfavor[key] = new fields.BooleanField({ required: true, nullable: false, initial: false });
      schema.favorLocks.fields.blockFavor[key] = new fields.BooleanField({ required: true, nullable: false, initial: false });
      for (const subtrait of value.subtraits) {
        schema.favorLocks.fields.blockDisfavor[subtrait] = new fields.BooleanField({ required: true, nullable: false, initial: false });
        schema.favorLocks.fields.blockFavor[subtrait] = new fields.BooleanField({ required: true, nullable: false, initial: false });
      }
    }
    
    schema.travel = new fields.SchemaField({
      land: new fields.SchemaField({
        speed: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      }),
      water: new fields.SchemaField({
        speed: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      }),
      air: new fields.SchemaField({
        speed: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      }),
    })

    schema.hitpoints = new fields.SchemaField({
      surface: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      }),
      deep: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      })
    });
    schema.stamina = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0 }),
    })

    schema.block = new fields.SchemaField({
      quantity: new fields.NumberField({ ...requiredInteger, initial: 1 }),
      size: new fields.NumberField({ ...requiredInteger, initial: 4 }),
    });
    schema.dodge = new fields.SchemaField({
      quantity: new fields.NumberField({ ...requiredInteger, initial: 1 }),
      size: new fields.NumberField({ ...requiredInteger, initial: 12 }),
    });

    schema.innateDefenses = new fields.SchemaField({
      ...Object.keys(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, key) => {
        acc[key] = new fields.NumberField({ ...requiredInteger, initial: 0 });
        return acc;
      }, {}),
    });
    schema.armorDefenses = new fields.SchemaField({
      ...Object.keys(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, key) => {
        acc[key] = new fields.NumberField({ ...requiredInteger, initial: 0 });
        return acc;
      }, {}),
    });

    schema.weaponlessAttacks = new fields.SchemaField({
      formula: new fields.StringField({ ...requiredInteger, initial: "1d8" }),
      type: new fields.StringField({ ...requiredInteger, initial: "physical", choices: {
        ...JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))
      } }),
      range: new fields.StringField({ ...requiredInteger, initial: "0/0" }),
      traits: new fields.SetField(new fields.StringField({ required: true, nullable: false }), { initial: ['pow'] }),
      stamina: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      actionCost: new fields.NumberField({ ...requiredInteger, initial: 0 }),
    });

    // schema.deepBreath = new fields.SchemaField({
    //   additionalStamina: new fields.NumberField({ ...requiredInteger, initial: 0 }),
    // })

    const siphon = () => {
      const returns = {};
      for (const [key, value] of Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes")))) {
        returns[key] = new fields.SchemaField({
          convertToStaminaPercent: new fields.NumberField({ ...requiredInteger, initial: 0 }),
          convertToStaminaFixed: new fields.NumberField({ ...requiredInteger, initial: 0 }),
          convertToStaminaFormula: new fields.StringField({ required: true, nullable: false, blank: true, initial: "", validate: (v) => Roll.validate(v) }),
          convertToSurfacePercent: new fields.NumberField({ ...requiredInteger, initial: 0 }),
          convertToSurfaceFixed: new fields.NumberField({ ...requiredInteger, initial: 0 }),
          convertToSurfaceFormula: new fields.StringField({ required: true, nullable: false, blank: true, initial: "", validate: (v) => Roll.validate(v) }),
          convertToDeepPercent: new fields.NumberField({ ...requiredInteger, initial: 0 }),
          convertToDeepFixed: new fields.NumberField({ ...requiredInteger, initial: 0 }),
          convertToDeepFormula: new fields.StringField({ required: true, nullable: false, blank: true, initial: "", validate: (v) => Roll.validate(v) }),
          convertToResource: new fields.StringField({ required: false, nullable: true, initial: "", blank: true }),
          convertToResourcePercent: new fields.NumberField({ ...requiredInteger, initial: 0 }),
          convertToResourceFixed: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        })
      }
      return returns
    }

    schema.siphons = new fields.SchemaField({
      ...siphon()
    })

    schema.blockSiphons = new fields.SchemaField({
      ...siphon()
    });

    schema.dodgeSiphons = new fields.SchemaField({
      ...siphon()
    });

    // TODO - Implement healing factors
    schema.healing = new fields.SchemaField({ 
      item: new fields.SchemaField({
        staminaPercent: new fields.NumberField({ ...requiredInteger, initial: 1 }),
        surfacePercent: new fields.NumberField({ ...requiredInteger, initial: 1 }),
        deepPercent: new fields.NumberField({ ...requiredInteger, initial: 1 }),
      }),
      natural: new fields.SchemaField({
        staminaPercent: new fields.NumberField({ ...requiredInteger, initial: 1 }),
        surfacePercent: new fields.NumberField({ ...requiredInteger, initial: 1 }),
        deepPercent: new fields.NumberField({ ...requiredInteger, initial: 1 }),
      }),      
    });

    const artistries = () => {
      // Create a new StringField for each SPECIALTY_CHECKS
      const returns = {};
      for (const [key, value] of Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.artistries")))) {
        returns[key] = new fields.SchemaField({
          multiplier: new fields.NumberField({ ...requiredInteger, initial: 1 }),
          unlocked: new fields.BooleanField({ required: true, nullable: false, initial: false }),
          discount: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        });
      }      
      return returns;
    }

    schema.artifice = new fields.SchemaField({
      level: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      gearDiscounts: new fields.SchemaField({}),
      componentDiscounts: new fields.SchemaField({}),
      components: new fields.SchemaField({})
    })

    for (const [key, value] of Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.components")))) {
      schema.artifice.fields.components.fields[key] = new fields.SchemaField({
        foragingTrait: new fields.StringField({ required: true, nullable: false, initial: value.foragingTrait }),
        craftingTrait: new fields.StringField({ required: true, nullable: false, initial: value.craftingTrait }),
      }),
      schema.artifice.fields.gearDiscounts.fields[key] = new fields.NumberField({ ...requiredInteger, initial: 0 });
      schema.artifice.fields.componentDiscounts.fields[key] = new fields.NumberField({ ...requiredInteger, initial: 0 });
    }

    schema.spellcasting = new fields.SchemaField({
      artistries: new fields.SchemaField({
        ...artistries(),
      }),
      discount: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      spellcap: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      bonuses: new fields.SchemaField({
        deepBreath: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        consumeComponent: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        consumable: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      }),
      disabled: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    });

    schema.baseActions = new fields.SchemaField({
      deepBreath: new fields.SchemaField({
        type: new fields.StringField({ required: true, nullable: false, initial: "utility" }),
        restoration: new fields.BooleanField({ required: true, nullable: false, initial: true }),
        restores: new fields.SchemaField({
          surface: new fields.StringField({ required: true, nullable: false, initial: "", blank: true }),
          deep: new fields.StringField({ required: true, nullable: false, initial: "", blank: true }),
          stamina: new fields.StringField({ required: true, nullable: false, initial: "", blank: true }),
        })
      }),
      weaponless: new fields.SchemaField({
        type: new fields.StringField({ required: true, nullable: false, initial: "damage" }),
      })
    })

    schema.initiative = new fields.SchemaField({
      formula: new fields.StringField({ ...requiredInteger, initial: "3d6" }),
      trait: new fields.StringField({ ...requiredInteger, initial: "spd" }),
      decimals: new fields.NumberField({ ...requiredInteger, initial: 2 }),
    });

    const languages = () => {
      // Create a new StringField for each SPECIALTY_CHECKS
      const returns = {};
      for (const [key, value] of Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.languages")))) {
        returns[key] = new fields.BooleanField({ required: true, nullable: false, initial: false });
      }      
      return returns;
    }

    schema.constitution = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.endurance = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.effervescence = new fields.NumberField({ ...requiredInteger, initial: 0 });

    schema.communication = new fields.SchemaField({
      languages: new fields.SchemaField({
        ...languages()
      }),
      speaking: new fields.SchemaField({
        ...languages()
      }),
      telepathy: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    });

    schema.innateTravel = new fields.SchemaField({
      land: new fields.SchemaField({
        speed: new fields.StringField({ required: true, nullable: false, initial: "@spd.total" }),
        stamina: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      }),
      water: new fields.SchemaField({
        speed: new fields.StringField({ required: true, nullable: false, initial: "0" }),
        stamina: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      }),
      air: new fields.SchemaField({
        speed: new fields.StringField({ required: true, nullable: false, initial: "0" }),
        stamina: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      }),
    });

    schema.size = new fields.StringField({ required: true, nullable: false, initial: "medium", choices: {
      tiny: "UTOPIA.Size.tiny",
      small: "UTOPIA.Size.small",
      medium: "UTOPIA.Size.medium",
      large: "UTOPIA.Size.large",
      huge: "UTOPIA.Size.huge",
      gargantuan: "UTOPIA.Size.gargantuan",
    }});

    schema.transformations = new fields.SetField(new fields.SchemaField({
      name: new fields.StringField({ required: true, nullable: false }),
      description: new fields.StringField({ required: true, nullable: false }),
      duration: new fields.StringField({ required: true, nullable: false }),
      stamina: new fields.NumberField({ required: true, nullable: false }),
      formula: new fields.StringField({ required: true, nullable: false }),
      traits: new fields.SetField(new fields.StringField({ required: true, nullable: false }), { initial: [] }),
    }), { initial: [] });

    schema.turnActions = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: game.settings.get("utopia", "turnActionsMax") }),
      temporary: new fields.NumberField({ ...requiredInteger, initial: 0 })
    })
    schema.interruptActions = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: game.settings.get("utopia", "interruptActionsMax") }),
      temporary: new fields.NumberField({ ...requiredInteger, initial: 0 })
    })

    schema.evolution = new fields.SchemaField({
      head: new fields.NumberField({ ...requiredInteger, initial: 1 }),
      feet: new fields.NumberField({ ...requiredInteger, initial: 1 }),
      hands: new fields.NumberField({ ...requiredInteger, initial: 1 }),
    });

    const armors = () => new fields.SchemaField({
      count: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      all: new fields.BooleanField({ required: true, initial: false }),
      head: new fields.BooleanField({ required: true, initial: false }),
      neck: new fields.BooleanField({ required: true, initial: false }),
      back: new fields.BooleanField({ required: true, initial: false }),
      chest: new fields.BooleanField({ required: true, initial: false }),
      waist: new fields.BooleanField({ required: true, initial: false }),
      hands: new fields.BooleanField({ required: true, initial: false }),
      ring: new fields.BooleanField({ required: true, initial: false }),
      feet: new fields.BooleanField({ required: true, initial: false }),
    });

    schema.armors = new fields.SchemaField({
      unaugmentable: armors(),
      unequippable: armors(),
      specialty: armors(),
    });

    const slots = ["head", "neck", "back", "chest", "waist", "hands", "ring", "feet"];

    schema.equipmentSlots = new fields.SchemaField({
      capacity: new fields.SchemaField({
        ...slots.map(slot => [slot, new fields.NumberField({ ...requiredInteger, initial: 1 })]).reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {}),
      }),
      equipped: new fields.SchemaField({
        ...slots.map(slot => [slot, new fields.ArrayField(new fields.StringField({ required: true, nullable: false }))]).reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {}),
      }),
    });
    schema.augmentSlots = new fields.SchemaField({
      capacity: new fields.SchemaField({
        ...slots.map(slot => [slot, new fields.NumberField({ ...requiredInteger, initial: 1 })]).reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {}),
      }),
      equipped: new fields.SchemaField({
        ...slots.map(slot => [slot, new fields.ArrayField(new fields.StringField({ required: true, nullable: false }))]).reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {}),
      }),
    });
    schema.handheldSlots = new fields.SchemaField({
      capacity: new fields.NumberField({ ...requiredInteger, initial: 2 }),
      equipped: new fields.ArrayField(new fields.StringField({ required: true, nullable: false })),
    });

    schema.slotCapacity = new fields.SchemaField({
      bonus: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      total: new fields.NumberField({ ...requiredInteger, initial: 0 }),
    });
    schema.slots = new fields.NumberField({ ...requiredInteger, initial: 0 });

    schema.turnOrder = new fields.StringField({ required: true, nullable: false, initial: "spd.mod" })
    schema.turnOrderOptions = new fields.StringField({
      traits: new fields.SetField(new fields.StringField({ required: true, nullable: false }), { initial: ['spd.mod'] }),
    })

    const returns = {};
    const traitOptions = {
      ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.traits"))).reduce((acc, [key, value]) => {
        acc[key] = { ...value, group: "UTOPIA.TRAITS.GroupName" };
        return acc;
      }, {}),
      ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.subtraits"))).reduce((acc, [key, value]) => {
        acc[key] = { ...value, group: "UTOPIA.SUBTRAITS.GroupName" };
        return acc;
      }, {}),
    } 

    schema.augmenting = new fields.SchemaField({
      canAugment: new fields.BooleanField({ required: true, nullable: false, initial: true }),
      damageFormula: new fields.StringField({ required: true, nulllable: false, initial: "1d"}),
      actions: new fields.NumberField({ required: true, nullable: false, initial: 6 }),
      damage: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    })

    schema.resources = new SchemaArrayField(new fields.SchemaField({
      name: new fields.StringField({ required: true, nullable: false }),
      rollKey: new fields.StringField({ required: true, nullable: false }),
      max: new fields.NumberField({ required: true, nullable: false }),
      current: new fields.NumberField({ required: true, nullable: false }),
      eval: new fields.StringField({ required: true, nullable: false, validate: (v) => Roll.validate(v) }),
      reset: new fields.StringField({ required: true, nullable: false, validate: (v) => {
        return ["none", "rest", "dawn", "dusk"].includes(v);
      }}),
      resetEval: new fields.StringField({ required: true, nullable: false, validate: (v) => Roll.validate(v) }),
      onUse: new fields.StringField({ required: true, nullable: false, blank: true, validate: async (v) => {
        // Value either needs to be a valid Roll or a valid macro UUID (or empty)
        const uuid = await foundry.utils.parseUuid(v);
        if (uuid.type === "Macro" || Roll.validate(v) || v.length === 0) return true;
      }, initial: ""}),
      canBeNegative: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      visible: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    }))

    schema._decendantItemTracker = new fields.ArrayField(new fields.SchemaField({
      lookup: new fields.StringField({ required: true, nullable: false }),
      lookupName: new fields.StringField({ required: true, nullable: false }),
      granted: new fields.StringField({ required: true, nullable: false }),
      grantedName: new fields.StringField({ required: true, nullable: false }), 
    }));

    // schema.body = new fields.NumberField({ ...requiredInteger, initial: 0 });
    // schema.mind = new fields.NumberField({ ...requiredInteger, initial: 0 });
    // schema.soul = new fields.NumberField({ ...requiredInteger, initial: 0 });

    schema._speciesData = new fields.ObjectField({ required: true, nullable: false, initial: {} });
    schema._hasSpecies = new fields.BooleanField({ required: true, nullable: false, initial: false });
    
    return schema;
  }

  prepareBaseData() {
    super.prepareBaseData();

    this.deepBreath = {
      additionalStamina: 0,
    }

    Object.keys(this.subtraits).map(k => {
      this.subtraits[k].max = 0;
    })

    Object.keys(this.travel).forEach(k => {
      this.travel[k].formula = String(this.travel[k].speed);
      this.travel[k].speed = 0;
      this.travel[k].stamina = 0;
    })

    Object.keys(JSON.parse(game.settings.get("utopia", "advancedSettings.subtraits"))).forEach(k => {
      this.subtraits[k].total = this.subtraits[k].value;
      this.subtraits[k].mod = this.subtraits[k].value - 4;
    })

    Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.traits"))).forEach(([key, value]) => {
      this.traits[key].total = value.subtraits.reduce((acc, subtrait) => {
        return acc + this.subtraits[subtrait].total;
      }, 0);
      this.traits[key].mod = this.traits[key].total - 4;
    })

    this.defenses = {};

    const systemDefenses = JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"));
    for (const [key, value] of Object.entries(systemDefenses)) {
      if (value.initialDefense) {
        this.innateDefenses[key] += value.initialDefense;
        this.defenses[key] = 0;
      }
      else {
        this.innateDefenses[key] = 0;
        this.defenses[key] = 0;
      }
    }

    this.talentPoints = {
      spent: 0,
      available: this.level
    }

    this.hitpoints.surface.max = 0;
    this.hitpoints.deep.max = 0;
    this.stamina.max = 0;

    this.subtraitPoints = {
      spent: 0
    };
    this.talentPoints = {};

    this.turnActions.max = game.settings.get("utopia", "turnActionsMax");
    this.interruptActions.max = game.settings.get("utopia", "interruptActionsMax");
  }


  /**
   * Main function to process derived data after the base data is ready.
   * Invokes multiple preparation methods for traits, species, defenses, etc.
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    try {
      // Prepare species data
      if (!this._speciesData) {
        //ui.notifications.error(game.i18n.localize("UTOPIA.ERRORS.SpeciesDataNotFound"));
      }
      else {
        prepareSpeciesData(this);
      }
    } catch (err) {
      console.error("Error preparing derived data:", err);
    }
  }

  _preparePostSpeciesData(characterData) {
    foundry.utils.mergeObject(this, characterData);

    // Prepare travel speeds
    Object.keys(this.travel).forEach(k => {
      this.travel[k].speed = new Roll(this.travel[k].formula, this.parent.getRollData()).evaluateSync().total;
    });

    // Prepare defenses
    Object.keys(this.innateDefenses).forEach(k => {
      this.defenses[k] = this.innateDefenses[k];
    });

    this.canLevel = this.experience >= this.level * 100;

    for (const item of this.parent.items) {
      item.prepareDataPostActorPrep();
    }

    // Prepare points
    if (["character", "npc"].includes(this.parent.type)) {
      this.hitpoints.surface.max += (this.body * this.constitution) + this.level;
      this.hitpoints.deep.max += (this.soul * this.effervescence) + this.level;
      this.stamina.max += (this.mind * this.endurance) + this.level;

      this.hitpoints.surface.value = Math.min(this.hitpoints.surface.value, this.hitpoints.surface.max);
      this.hitpoints.deep.value = Math.min(this.hitpoints.deep.value, this.hitpoints.deep.max);
      this.stamina.value = Math.min(this.stamina.value, this.stamina.max);
    }

    this.talentPoints.spent = this.body + this.mind + this.soul;
    this.talentPoints.available = this.level - this.talentPoints.spent;
    
    this.specialistPoints.spent = this.parent.items.filter(i => i.type === "specialist").length;
    this.specialistPoints.available = Math.floor(this.level / 10) - this.specialistPoints.spent;

    Object.keys(this.subtraits).forEach(k =>{
      this.subtraitPoints.spent += (this.subtraits[k].value - 1);
      this.subtraitPoints.available = 5 + this.level - this.subtraitPoints.spent;
    })    

    this.turnActions.available = this.turnActions.value + this.turnActions.temporary;
    this.interruptActions.available = this.interruptActions.value + this.interruptActions.temporary;
  }

  get body() {
    return this.parent.items.filter(i => i.type === "talent").reduce((acc, talent) => acc + talent.system.body, 0);
  }

  get mind() {
    return this.parent.items.filter(i => i.type === "talent").reduce((acc, talent) => acc + talent.system.mind, 0);
  }

  get soul() {
    return this.parent.items.filter(i => i.type === "talent").reduce((acc, talent) => acc + talent.system.soul, 0);
  }

  get encumbered() {
    return this.parent.items.filter(i => ["gear", "generic"].includes(i.type) && i.system.slots && !i.system.equipped).reduce((acc, item) => acc + item.system.slots, 0) > this.slotCapacity.total;
  }

  /**
   * Currently only used to output the formula for blocks and dodges 
   *
   */
  _prepareAutomation() {
    this.block.formula = `${this.block.quantity}d${this.block.size}`;
    this.dodge.formula = `${this.dodge.quantity}d${this.dodge.size}`;

    this.turnOrder = foundry.utils.getProperty(this.parent.getRollData(), this.turnOrder)
    
    let slots = 0;
    for (const item of this.parent.items) {
      if (item.system.slots && !item.system.equipped) {
        slots += item.system.slots;
      }
    }
    
    this.encumbered = slots > this.slotCapacity.total;
  }

  /**
   * Prepare travel data, including innate travel speeds and stamina costs.
   * This method is called during the preparation of derived data.
   */
  _prepareTravel() {
    this.travel = {}
    
    const landRoll = new Roll(this.innateTravel.land.speed, this.parent.getRollData()).evaluateSync().total;
    const waterRoll = new Roll(this.innateTravel.water.speed, this.parent.getRollData()).evaluateSync().total;
    const airRoll = new Roll(this.innateTravel.air.speed, this.parent.getRollData()).evaluateSync().total;

    this.travel.land = {
      speed: landRoll + (this.speciesTravel?.land?.speed ?? 0),
      stamina: this.innateTravel.land.stamina + (this.speciesTravel?.land?.stamina ?? 0),
    }
    this.travel.water = {
      speed: waterRoll + (this.speciesTravel?.water?.speed ?? 0),
      stamina: this.innateTravel.water.stamina + (this.speciesTravel?.water?.stamina ?? 0),
    }
    this.travel.air = {
      speed: airRoll + (this.speciesTravel?.air?.speed ?? 0),
      stamina: this.innateTravel.air.stamina + (this.speciesTravel?.air?.stamina ?? 0),
    }
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
    this.talentPoints.spent = this.body + this.mind + this.soul;
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
    
    if (this._speciesData === undefined) return;

    const species = this._speciesData.system.branches;
    if (species) {
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
    }
  }

  /**
   * Aggregate innate and armor-based defenses for this actor.
   */
  _prepareDefenses() {
    for (const [key, value] of Object.entries(this.equipmentSlots.equipped)) {
      if (value && value.length > 0) {

        for (const itemId of value) {
          const item = this.parent.items.filter(i => i.id === itemId)[0];
          if (!item) continue;
          
          const defenses = item.system.defenses;
          if (defenses) {
            for (const [defenseKey, defenseValue] of Object.entries(defenses)) {
              if (this.armorDefenses[defenseKey] === undefined) this.armorDefenses[defenseKey] = 0;
              this.armorDefenses[defenseKey] += defenseValue;
            }
          }
        }
      }
    }

    for (const [key, value] of Object.entries(this.augmentSlots.equipped)) {
      if (value && value.length > 0) {

        for (const itemId of value) {
          const item = this.parent.items.filter(i => i.id === itemId)[0];
          if (!item) continue;
          
          const defenses = item.system.defenses;
          if (defenses) {
            for (const [defenseKey, defenseValue] of Object.entries(defenses)) {
              if (this.armorDefenses[defenseKey] === undefined) this.armorDefenses[defenseKey] = 0;
              this.armorDefenses[defenseKey] += defenseValue;
            }
          }
        }
      }
    }

    // TODO - Convert to using the parsed damage types from `game.settings.get("utopia", "advancedSettings.damageTypes")`
    this.defenses = {
      energy:    this.innateDefenses.energy    + this.armorDefenses?.energy ?? 0,
      heat:      this.innateDefenses.heat      + this.armorDefenses?.heat ?? 0,
      chill:     this.innateDefenses.chill     + this.armorDefenses?.chill ?? 0,
      physical:  this.innateDefenses.physical  + this.armorDefenses?.physical ?? 0,
      psyche:    this.innateDefenses.psyche    + this.armorDefenses?.psyche ?? 0,
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
    // TODO - Implement the other sizes
    const str = this.traits.str.total;
    switch (this.size) {
      case "sm": 
        this.slotCapacity.total = this.slotCapacity.bonus + (2 * str);
        break;
      case "med":
        this.slotCapacity.total = this.slotCapacity.bonus + (5 * str);
        break;
      case "lg":
        this.slotCapacity.total = this.slotCapacity.bonus + (15 * str);
        break;
    }

    this.spellcasting.spellcap = this.subtraits.res.total;
  }

  /**
   * Construct a "paper doll" data view of equipped items and evolution headings.
   * Useful in visualizing actor augmentations in specific body slots.
   */
  getPaperDoll() {
    return getPaperDollContext(this);
  }
}
