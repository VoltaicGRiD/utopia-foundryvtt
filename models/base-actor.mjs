// Provide a clear description of this import and constant usage.
const fields = foundry.data.fields;
const requiredInteger = { required: true, nullable: false, initial: 0 }
import { isNumeric } from "../system/helpers/isNumeric.mjs";
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

    schema.level = new fields.NumberField({ ...requiredInteger, initial: 10 });
    schema.experience = new fields.NumberField({ ...requiredInteger });
    
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
      size: new fields.NumberField({ ...requiredInteger, initial: 4 }),
    });
    schema.dodge = new fields.SchemaField({
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
      components: new fields.SchemaField({}),
      hasty: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      relaxed: new fields.BooleanField({ required: true, nullable: false, initial: false }),

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
      spellcapTrait: new fields.StringField({ required: true, nullable: false, initial: "res" }),
      spellcapMultiplier: new fields.NumberField({ ...requiredInteger, initial: 1 }),
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

    schema.turnOrder = new fields.StringField({ required: true, nullable: false, initial: "@spd.mod" })
    schema.turnOrderOptions = new fields.StringField({
      traits: new fields.SetField(new fields.StringField({ required: true, nullable: false }), { initial: ['@spd.mod'] }),
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

    schema._talentTracking = new fields.ArrayField(new fields.SchemaField({
      tree: new fields.DocumentUUIDField({ required: true, nullable: false }),
      branch: new fields.NumberField({ required: true, nullable: false }),
      tier: new fields.NumberField({ required: true, nullable: false }),
      talent: new fields.DocumentUUIDField({ required: true, nullable: false }),
    }))    
    schema._talentOptions = new fields.ObjectField({ initial: {} });

    // schema.body = new fields.NumberField({ ...requiredInteger, initial: 0 });
    // schema.mind = new fields.NumberField({ ...requiredInteger, initial: 0 });
    // schema.soul = new fields.NumberField({ ...requiredInteger, initial: 0 });

    schema.constitution = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.endurance = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.effervescence = new fields.NumberField({ ...requiredInteger, initial: 0 });

    schema.biography = new fields.SchemaField({
      pronouns: new fields.StringField({ required: true, nullable: false, initial: "" }),
      age: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      height: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      weight: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      edicts: new fields.StringField({ required: true, nullable: false, initial: "" }),
      anathema: new fields.StringField({ required: true, nullable: false, initial: "" }),
      motivations: new fields.StringField({ required: true, nullable: false, initial: "" }),
      phobias: new fields.StringField({ required: true, nullable: false, initial: "" }),
    });

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
    })

    Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.traits"))).forEach(([key, value]) => {
      this.traits[key].total = value.subtraits.reduce((acc, subtrait) => {
        return acc + this.subtraits[subtrait].total;
      }, 0);
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

    this.hitpoints.surface.max = 0;
    this.hitpoints.deep.max = 0;
    this.stamina.max = 0;

    this.giftPoints = {
      spent: 0,
      available: 0
    }
    this.subtraitPoints = {
      spent: 0
    };
    this.talentPoints = {
      spent: 0,
      available: this.level
    };
    this.specialistPoints = {
      spent: 0,
      available: 0
    }
    this.languagePoints = {
      spent: 0,
      available: 0
    };

    this.slotCapacity = 0;

    this.turnActions.max = game.settings.get("utopia", "turnActionsMax");
    this.interruptActions.max = game.settings.get("utopia", "interruptActionsMax");

    this.spellcasting.spellcap = 0;

    this.gearActions = [];

    this.block.quantity = 0;
    this.dodge.quantity = 0;

    if (this._speciesData) {
      prepareSpeciesData(this);
    }
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
        //prepareSpeciesData(this);
        this.prepareGearData();
        
        Object.keys(JSON.parse(game.settings.get("utopia", "advancedSettings.subtraits"))).forEach(k => {
          this.subtraits[k].total = this.subtraits[k].value;
          this.subtraits[k].mod = this.subtraits[k].value - 4;
        })

        Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.traits"))).forEach(([key, value]) => {
          value.subtraits.forEach(subtrait => {
            this.subtraits[subtrait].max = this[value.maximum];
          })
          this.traits[key].total = value.subtraits.reduce((acc, subtrait) => {
            return acc + this.subtraits[subtrait].total;
          }, 0);
          this.traits[key].mod = this.traits[key].total - 4;
        })

        Object.keys(JSON.parse(game.settings.get("utopia", "advancedSettings.subtraits"))).forEach(k => {
          if (this.subtraits[k].gifted) {
            this.giftPoints.spent += 1;
          }
        })

        this.giftPoints.available = this.giftPoints.available - this.giftPoints.spent;

        this.block.formula = `${this.block.quantity}d${this.block.size}`;
        this.dodge.formula = `${this.dodge.quantity}d${this.dodge.size}`;
      }
    } catch (err) {
      console.error("Error preparing derived data:", err);
    }
  }

  prepareGearData() {
    for (const item of this.parent.items.filter(i => i.type === "gear")) {
      const data = item.system;
      const features = data.features;
      const type = data.type;
      let equipped = false;

      for (const [key, value] of Object.entries(this.equipmentSlots.equipped)) {
        if (value.includes(item.id)) {
          equipped = true;
        } 
      }

      if (data.augmentable) {
        for (const [key, value] of Object.entries(this.augmentSlots.equipped)) {
          if (value.includes(item.id)) {
            equipped = true;
          }
        }
      }

      if (["handheldArtifact", "fastWeapon", "moderateWeapon", "slowWeapon"].includes(type)) {
        for (const [key, value] of Object.entries(this.handheldSlots.equipped)) {
          if (value && value.includes(item.id)) {
            equipped = true;
          }
        }
      }

      if (!equipped) continue;

      if (["equippableArtifact", "handheldArtifact", "ammunitionArtifact"].includes(type)) {
        const activations = data.activations;
        for (const action of activations) {
          const name = game.i18n.localize(activation.name);
          const activation = action.activation;
          const cost = activation.cost;
          const division = activation.division;
          const actives = activation.features;
          
          // TODO - Convert to Activities
          // ! This is only for artifact types
          // ! And is hardcoded as such
          // We need to find out if there is a damage key in the activation,
          // if there is, we have to check all other actives, and combine any other
          // feature that also has a damage key
          if (Object.values(actives).any(a => a.parentKey === "damage")) {
            const matchingActives = Object.values(actives).filter(a => a.parentKey === "damage");
            let damages = [];
            let modifiers = [];

            for (const active of matchingActives) {
              if (active.keys.find(k => k.key === "damage.formula") && active.keys.find(k => k.key === "damage.type")) {
                const formula = active.keys.find(k => k.key === "damage.formula").value;
                const type = active.keys.find(k => k.key === "damage.type").value;
                damages.push({
                  type: type,
                  formula: formula,
                })
              }
              if (active.keys.find(k => k.key === "damage.modifier")) {
                const modifier = active.keys.find(k => k.key === "damage.modifier").value;
                modifiers.push(modifier);
              }
            }

            this.gearActions.push({
              name: `${item.name}: ${name}`,
              type: "action",
              system: {
                cost: cost,
                type: division === "turn" ? "turn" : "long",
                category: "damage",
                damages,
                counters: counters,
              },
              parent: this.parent
            }); 
          }

          // ! Spelltech hard-coding
          if (Object.values(actives).any(a => a.key === "spelltech")) {         
            const craftingItem = fromUuid(actives.find(a => a.key === "spelltech").crafting.item);
            this.gearActions.push({
              name: `${item.name}: ${name}`,
              type: "action",
              system: {
                cost: cost,
                type: division === "turn" ? "turn" : "long",
                category: "spelltech",
                spell: craftingItem,
              },
              parent: this.parent
            })
          }
        }
      }
      else {
        // Weapons don't affect the actor, but the gear item itself
        if (["fastWeapon", "moderateWeapon", "slowWeapon"].includes(type)) 
          continue;
        else {
          for (const feature of Object.values(features)) {
            const handlers = {
              add: /\+X/g,
              subtract: /\-X/g,
              multiply: /([0-9]+)X(?!\/)/g, // Ensure it doesn't match '5X/10X'
              range: /([0-9]+)X\/([0-9]+)X/g,
              multiplyTo: /\*([0-9]+)X/g,
              divide: /^\/([0-9]+)X/g, // Ensure it only matches if '/' is the first character
              divideFrom: /([0-9]+)\/X/g,
              formula: /Xd([0-9]+)/g,
              override: /override/g,
              distributed: /distributed/g,
            };

            function handle(data, featureHandler, key, value) {
              for (const [handler, regex] of Object.entries(handlers)) {
                if (featureHandler.match(regex)) {
                  if (typeof value === "string" && isNumeric(value)) {
                    value = parseInt(value);
                  }
                  if (!foundry.utils.getProperty(data, key)) {
                    return foundry.utils.setProperty(data, key, value);
                  }
                  const dataValue = foundry.utils.getProperty(data, key);
                  value = featureHandler.replace(regex, (match, p1, p2) => {
                    switch (handler) {
                      case "add":
                        return foundry.utils.setProperty(data, key, dataValue + value);
                      case "subtract":
                        return foundry.utils.setProperty(data, key, dataValue - value);
                      case "multiply":
                        return foundry.utils.setProperty(data, key, dataValue * value);
                      case "range":
                        return foundry.utils.setProperty(data, key, dataValue * value);
                      case "multiplyTo":
                        return foundry.utils.setProperty(data, key, dataValue * parseInt(p1) || 1);
                      case "divide":
                        return foundry.utils.setProperty(data, key, dataValue / value);
                      case "divideFrom":
                        return foundry.utils.setProperty(data, key, value / dataValue);
                      case "formula":
                        return foundry.utils.setProperty(data, key, value.replace(/d/g, "*") + "d" + p1);
                      case "override":
                        return foundry.utils.setProperty(data, key, value);
                      case "distributed":
                        return foundry.utils.setProperty(data, key, dataValue + value);
                      default:
                        return;
                    }
                  });
                }
              }
            }

            if (feature.appliesTo === "this" || ["fastWeapon", "moderateWeapon", "slowWeapon"].includes(item.system.type)) continue; // Applies to the gear item itself
            const keys = feature.keys;
            const handler = feature.handler;
            for (const key of keys) {
              handle(this, handler, key.key, key.value);
            }
          }
        }
      }
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

    Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.traits"))).forEach(([key, trait]) => {
      const maximum = trait.maximum;

      trait.subtraits.forEach(subtrait => {
        if (this.subtraits[subtrait]) {
          this.subtraits[subtrait].max = this[maximum];
        }
      })
    })

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

    this.spellcasting.spellcap = new Roll(`@${this.spellcasting.spellcapTrait}.total * @spellcasting.spellcapMultiplier`, this.parent.getRollData()).evaluateSync().total;

    if (["sm", "small"].includes(this.size)) 
      this.slotCapacity = 2 * this.traits.str.total;
    else if (["med", "medium"].includes(this.size))
      this.slotCapacity = 5 * this.traits.str.total;
    else if (["lg", "large"].includes(this.size)) 
      this.slotCapacity = 15 * this.traits.str.total;
    else 
      this.slotCapacity = 0; // TODO - Implement other sizes
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

  get slots() {
    return this.parent.items.filter(i => ["gear", "generic"].includes(i.type) && i.system.slots && i.system.equipped).reduce((acc, item) => acc + item.system.slots, 0);
  }

  get encumbered() {
    return this.slots > this.slotCapacity;
  }

  /**
   * Construct a "paper doll" data view of equipped items and evolution headings.
   * Useful in visualizing actor augmentations in specific body slots.
   */
  getPaperDoll() {
    return getPaperDollContext(this);
  }
}
