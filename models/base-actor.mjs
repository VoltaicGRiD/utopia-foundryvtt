// Provide a clear description of this import and constant usage.
const fields = foundry.data.fields;
const requiredInteger = { required: true, nullable: false, initial: 0 }
import { BiographyField as TextareaField } from "./fields/biography-field.mjs";
import { SchemaArrayField } from "./fields/schema-set-field.mjs";
import { getPaperDollContext } from "./utility/paper-doll-utils.mjs";

export default class UtopiaActorBase extends foundry.abstract.TypeDataModel {
  // Extended from Foundry's TypeDataModel to represent base data logic for Utopia Actors.

  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "UTOPIA.Actors"];

  /**
   * Prepare base data, such as establishing default action values.
   */
  prepareBaseData() {
    this.actions = {
      turn: {
        value: 6,
        max: 6
      },
      interrupt: {
        value: 2,
        max: 2
      }
    }
  }

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
        value: new fields.NumberField({ ...requiredInteger }),
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
      rest: new fields.StringField({ required: true, nullable: false, blank: true, initial: "", validate: (v) => Roll.validate(v) || v === "" }),
    });

    schema.traits = new fields.SchemaField({});
    schema.subtraits = new fields.SchemaField({});
    for (const [key, value] of Object.entries(CONFIG.UTOPIA.TRAITS)) {
      schema.traits.fields[key] = TraitField();
      for (const subtrait of value.subtraits) {
        schema.subtraits.fields[subtrait] = TraitField(key);
      }
    }

    schema.fullbody = new fields.FilePathField({categories: ["IMAGE", "VIDEO"], required: true}),

    schema.favorLocks = new fields.SchemaField({});
    schema.favorLocks.fields.blockDisfavor = new fields.SchemaField({});
    schema.favorLocks.fields.blockFavor = new fields.SchemaField({});
    for (const [key, value] of Object.entries(CONFIG.UTOPIA.TRAITS)) {
      schema.favorLocks.fields.blockDisfavor[key] = new fields.BooleanField({ required: true, nullable: false, initial: false });
      schema.favorLocks.fields.blockFavor[key] = new fields.BooleanField({ required: true, nullable: false, initial: false });
      for (const subtrait of value.subtraits) {
        schema.favorLocks.fields.blockDisfavor[subtrait] = new fields.BooleanField({ required: true, nullable: false, initial: false });
        schema.favorLocks.fields.blockFavor[subtrait] = new fields.BooleanField({ required: true, nullable: false, initial: false });
      }
    }
    
    schema.hitpoints = new fields.SchemaField({
      surface: ResourceField(),
      deep: ResourceField(),
    });
    schema.stamina = ResourceField();

    schema.block = new fields.SchemaField({
      quantity: new fields.NumberField({ ...requiredInteger, initial: 1 }),
      size: new fields.NumberField({ ...requiredInteger, initial: 4 }),
    });
    schema.dodge = new fields.SchemaField({
      quantity: new fields.NumberField({ ...requiredInteger, initial: 1 }),
      size: new fields.NumberField({ ...requiredInteger, initial: 12 }),
    });

    schema.innateDefenses = new fields.SchemaField({
      energy: new fields.NumberField({ ...requiredInteger, initial: 1 }),
      heat: new fields.NumberField({ ...requiredInteger, initial: 1 }),
      chill: new fields.NumberField({ ...requiredInteger, initial: 1 }),
      physical: new fields.NumberField({ ...requiredInteger, initial: 1 }),
      psyche: new fields.NumberField({ ...requiredInteger, initial: 1 }),
    });

    schema.weaponlessAttacks = new fields.SchemaField({
      formula: new fields.StringField({ ...requiredInteger, initial: "1d6" }),
      type: new fields.StringField({ ...requiredInteger, initial: "physical", choices: {
        ...CONFIG.UTOPIA.DAMAGE_TYPES
      } }),
      range: new fields.StringField({ ...requiredInteger, initial: "0/0" }),
      traits: new fields.SetField(new fields.StringField({ required: true, nullable: false }), { initial: [] }),
      stamina: new fields.NumberField({ ...requiredInteger, initial: 0 }),
    });

    const siphon = () => {
      const returns = {};
      for (const [key, value] of Object.entries(CONFIG.UTOPIA.DAMAGE_TYPES)) {
        returns[key] = new fields.SchemaField({
          convertToStaminaPercent: new fields.NumberField({ ...requiredInteger, initial: 0 }),
          convertToStaminaFixed: new fields.NumberField({ ...requiredInteger, initial: 0 }),
          convertToSurfacePercent: new fields.NumberField({ ...requiredInteger, initial: 0 }),
          convertToSurfaceFixed: new fields.NumberField({ ...requiredInteger, initial: 0 }),
          convertToDeepPercent: new fields.NumberField({ ...requiredInteger, initial: 0 }),
          convertToDeepFixed: new fields.NumberField({ ...requiredInteger, initial: 0 }),
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
      for (const [key, value] of Object.entries(CONFIG.UTOPIA.ARTISTRIES)) {
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
      gearDiscounts: new fields.SchemaField({ // Discounts is used for anything that is NOT a crafting component
        material: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        refinement: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        power: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      }),
      componentDiscounts: new fields.SchemaField({
        material: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        refinement: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        power: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      })
    })

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
      })
    });

    schema.initiative = new fields.SchemaField({
      formula: new fields.StringField({ ...requiredInteger, initial: "3d6" }),
      trait: new fields.StringField({ ...requiredInteger, initial: "spd" }),
      decimals: new fields.NumberField({ ...requiredInteger, initial: 2 }),
    });

    const languages = () => {
      // Create a new StringField for each SPECIALTY_CHECKS
      const returns = {};
      for (const [key, value] of Object.entries(CONFIG.UTOPIA.LANGUAGES)) {
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
        speed: new fields.StringField({ required: true, nullable: false, initial: "0" }),
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

    schema.fatigue = ResourceField();
    schema.turnActions = ResourceField();
    schema.interruptActions = ResourceField();

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

    schema.augments = new fields.SchemaField({
      head: new fields.ArrayField(new fields.DocumentIdField(), { initial: [] }),
      neck: new fields.ArrayField(new fields.DocumentIdField(), { initial: [] }),
      back: new fields.ArrayField(new fields.DocumentIdField(), { initial: [] }),
      chest: new fields.ArrayField(new fields.DocumentIdField(), { initial: [] }),
      waist: new fields.ArrayField(new fields.DocumentIdField(), { initial: [] }),
      hands: new fields.ArrayField(new fields.DocumentIdField(), { initial: [] }),
      ring: new fields.ArrayField(new fields.DocumentIdField(), { initial: [] }),
      feet: new fields.ArrayField(new fields.DocumentIdField(), { initial: [] }),
    });

    schema.equipmentSlots = new fields.SchemaField({
      head: new fields.ArrayField(new fields.DocumentIdField(), { initial: [] }),
      neck: new fields.ArrayField(new fields.DocumentIdField(), { initial: [] }),
      back: new fields.ArrayField(new fields.DocumentIdField(), { initial: [] }),
      chest: new fields.ArrayField(new fields.DocumentIdField(), { initial: [] }),
      waist: new fields.ArrayField(new fields.DocumentIdField(), { initial: [] }),
      hands: new fields.ArrayField(new fields.DocumentIdField(), { initial: [] }),
      ring: new fields.ArrayField(new fields.DocumentIdField(), { initial: [] }),
      feet: new fields.ArrayField(new fields.DocumentIdField(), { initial: [] }),
    });
    schema.slotCapacity = new fields.SchemaField({
      bonus: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      total: new fields.NumberField({ ...requiredInteger, initial: 0 }),
    });
    schema.slots = new fields.NumberField({ ...requiredInteger, initial: 0 });

    schema.turnOrder = new fields.SchemaField({
      traits: new fields.SetField(new fields.StringField({ required: true, nullable: false }), { initial: ['spd'] }),
    })

    const returns = {};
    const traitOptions = {
      ...Object.entries(CONFIG.UTOPIA.TRAITS).reduce((acc, [key, value]) => {
        acc[key] = { ...value, group: "UTOPIA.TRAITS.GroupName" };
        return acc;
      }, {}),
      ...Object.entries(CONFIG.UTOPIA.SUBTRAITS).reduce((acc, [key, value]) => {
        acc[key] = { ...value, group: "UTOPIA.SUBTRAITS.GroupName" };
        return acc;
      }, {}),
    } 

    const specialtyChecks = () => {
      // Create a new StringField for each SPECIALTY_CHECKS
      const returns = {};
      for (const [key, value] of Object.entries(CONFIG.UTOPIA.SPECIALTY_CHECKS)) {
        returns[key] = new fields.StringField({ required: true, nullable: false, initial: value.defaultAttribute, choices: traitOptions });
      }      
      return returns;
    }

    schema.checks = new fields.SchemaField({
      // Create a new StringField for each SPECIALTY_CHECKS
      ...specialtyChecks(),
    });

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

    UtopiaActorBase.getBiography(schema);
    
    return schema;
  }

  /**
   * Retrieve the header fields to display at the top of the sheet.
   */
  get headerFields() {
    return [
      {
        field: this.schema.fields.hitpoints.fields.surface.fields.value,
        stacked: false,
        editable: true,
      }
    ]
  }

  /**
   * Construct a "paper doll" data view of equipped items and evolution headings.
   * Useful in visualizing actor augmentations in specific body slots.
   */
  getPaperDoll() {
    return getPaperDollContext(this);
  }

  /**
   * Add biography fields to the schema, allowing for structured character background data.
   */
  static getBiography(schema) {
    schema.biographyFieldOptions = new fields.StringField({
      required: true,
      nullable: false,
      choices: {
        "generalKnowledgeDivider": "UTOPIA.Biography.generalKnowledgeDivider",
        "age": "UTOPIA.Biography.age",
        "birthday": "UTOPIA.Biography.birthday",
        "deathday": "UTOPIA.Biography.deathday",
        "height": "UTOPIA.Biography.height",
        "weight": "UTOPIA.Biography.weight",
        "pronouns": "UTOPIA.Biography.pronouns",
        "hairEyesSkin": "UTOPIA.Biography.hairEyesSkin",
        "markings": "UTOPIA.Biography.markings",
        "voice": "UTOPIA.Biography.voice",
        "bodyType": "UTOPIA.Biography.bodyType",
        "ethnicity": "UTOPIA.Biography.ethnicity",
        "nationality": "UTOPIA.Biography.nationality",
        "quirks": "UTOPIA.Biography.quirks",

        "relationshipDivider": "UTOPIA.Biography.relationshipsDivider",
        "enemies": "UTOPIA.Biography.enemies",
        "allies": "UTOPIA.Biography.allies",
        "rivals": "UTOPIA.Biography.rivals",
        "family": "UTOPIA.Biography.family",
        "friends": "UTOPIA.Biography.friends",
        "partners": "UTOPIA.Biography.partners",
        
        "personalInfoDivider": "UTOPIA.Biography.personalInformationDivider",
        "strength": "UTOPIA.Biography.strength",
        "education": "UTOPIA.Biography.education",
        "upbringing": "UTOPIA.Biography.upbringing",
        "achievements": "UTOPIA.Biography.achievements",
        "coreMemories": "UTOPIA.Biography.coreMemories",
        "phobias": "UTOPIA.Biography.phobias",
        "dreams": "UTOPIA.Biography.dreams",
        "nightmares": "UTOPIA.Biography.nightmares",
        "anathema": "UTOPIA.Biography.anathema",
        "edicts": "UTOPIA.Biography.edicts",
        "ambitions": "UTOPIA.Biography.ambitions",
        "motivations": "UTOPIA.Biography.motivations",
        "personalSecrets": "UTOPIA.Biography.personalSecrets",
        
        "alignmentDivider": "UTOPIA.Biography.alignmentsDivider",
        "moralAlignment": "UTOPIA.Biography.moralAlignment",
        "philosophicalAlignment": "UTOPIA.Biography.philosophicalAlignment",
        "politicalAlignment": "UTOPIA.Biography.politicalAlignment",

        "publicInfoDivider": "UTOPIA.Biography.publicInformationDivider",
        "occupation": "UTOPIA.Biography.occupation",
        "reputation": "UTOPIA.Biography.reputation",
        "hobbies": "UTOPIA.Biography.hobbies",
        "interests": "UTOPIA.Biography.interests",
      },
      initial: "age"
    });
    schema.biographyFields = new fields.SetField(schema.biographyFieldOptions, {
      required: true,
      nullable: false,
      initial: []
    });
    schema.biography = new fields.SchemaField({
      // General knowledge
      age: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      birthday: new TextareaField({ required: false, nullable: true }),
      deathday: new TextareaField({ required: false, nullable: true }),
      height: new TextareaField({ required: false, nullable: true }),
      weight: new fields.NumberField({ required: false, nullable: true }),
      pronouns: new TextareaField({ required: false, nullable: true }),
      hairEyesSkin: new TextareaField({ required: false, nullable: true }),
      bodyType: new TextareaField({ required: false, nullable: true }),
      ethnicity: new TextareaField({ required: false, nullable: true }),
      nationality: new TextareaField({ required: false, nullable: true }),
      markings: new TextareaField({ required: false, nullable: true }),
      voice: new TextareaField({ required: false, nullable: true }),
      quirks: new TextareaField({ required: false, nullable: true }),

      // Relationships
      allies: new TextareaField({ required: false, nullable: true }),
      enemies: new TextareaField({ required: false, nullable: true }),
      rivals: new TextareaField({ required: false, nullable: true }),
      family: new TextareaField({ required: false, nullable: true }),
      friends: new TextareaField({ required: false, nullable: true }),
      partners: new TextareaField({ required: false, nullable: true }),

      // Personal Information
      education: new TextareaField({ required: false, nullable: true }),
      upbringing: new TextareaField({ required: false, nullable: true }),
      achievements: new TextareaField({ required: false, nullable: true }),
      coreMemories: new TextareaField({ required: false, nullable: true }),
      phobias: new TextareaField({ required: false, nullable: true }),
      dreams: new TextareaField({ required: false, nullable: true }),
      nightmares: new TextareaField({ required: false, nullable: true }),
      anathema: new TextareaField({ required: false, nullable: true }),
      edicts: new TextareaField({ required: false, nullable: true }),
      ambitions: new TextareaField({ required: false, nullable: true }),
      motivations: new TextareaField({ required: false, nullable: true }),
      personalSecrets: new TextareaField({ required: false, nullable: true }),

      // Alignments
      moralAlignment: new TextareaField({ required: false, nullable: true }),
      philosophicalAlignment: new TextareaField({ required: false, nullable: true }),
      politicalAlignment: new TextareaField({ required: false, nullable: true }),

      // Public Information
      occupation: new TextareaField({ required: false, nullable: true }),
      reputation: new TextareaField({ required: false, nullable: true }),
      hobbies: new TextareaField({ required: false, nullable: true }),
      interests: new TextareaField({ required: false, nullable: true }),
    });    

    return schema;
  }
}