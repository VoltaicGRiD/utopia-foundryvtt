import UtopiaItemBase from "../base-item.mjs";
import { UtopiaSchemaField } from "../fields/schema-field.mjs";
import { TalentField } from "../fields/talent-field.mjs";
import { PaperDollField } from "../paperdoll-field.mjs";

export class Species extends UtopiaItemBase {

  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "UTOPIA.Items.Species"];

  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
      
    const required = { required: true, nullable: false, initial: 0 }
    const FormulaField = (initial) => new fields.StringField({ required: true, nullable: true, initial: initial ?? "0", validate: (v) => Roll.validate(v) });

    schema.style = new fields.SchemaField({
      foregroundColor: new fields.ColorField({ required: true, nullable: false, initial: "#FFFFFF" }),
      backgroundColor: new fields.ColorField({ required: true, nullable: false, initial: "#000000" }),
      headerColor: new fields.ColorField({ required: true, nullable: false, initial: "#555555" }),
    });

    const talent = new fields.SchemaField({
      uuid: new fields.DocumentUUIDField({ type: "Item", validate: async (value) => { 
        return (await fromUuid(value))?.type === "talent";
      }}),
      overridden: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      body: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      mind: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      soul: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    })
    schema.branches = new fields.ArrayField(new fields.SchemaField({
      category: new fields.StringField({ required: true, nullable: false, initial: "species", choices: {
        "species": "UTOPIA.Items.Species.BranchCategory.Species",
        "subspecies": "UTOPIA.Items.Species.BranchCategory.Subspecies",
      } }),
      talents: new fields.ArrayField(talent, { initial: [] }),
    }), { initial: [{ name: "", talents: [] }, { name: "", talents: [] }, { name: "", talents: [] }] });

    schema.branchCount = new fields.NumberField({ required: true, nullable: false, initial: 3 });

    const evolution = () => new fields.SchemaField({
      head: new fields.NumberField({ ...required, initial: 1 }),
      neck: new fields.NumberField({ ...required, initial: 1 }),
      back: new fields.NumberField({ ...required, initial: 1 }),
      chest: new fields.NumberField({ ...required, initial: 1 }),
      waist: new fields.NumberField({ ...required, initial: 1 }),
      hands: new fields.NumberField({ ...required, initial: 2 }),
      ring: new fields.NumberField({ ...required, initial: 1 }),
      feet: new fields.NumberField({ ...required, initial: 2 }),
    });
    const armors = () => new fields.SchemaField({
      count: new fields.NumberField({ ...required, initial: 0 }),
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

    schema.evolution = evolution();

    schema.armors = new fields.SchemaField({ 
      unequippable: armors(),
      unaugmentable: armors(),
      specialty: armors(),
    })

    schema.block = new UtopiaSchemaField({
      quantity: new fields.NumberField({ ...required, initial: 1, min: 1, max: 6 }),
      size: new fields.NumberField({ ...required, initial: 4, min: 1 }),
    });
    schema.dodge = new UtopiaSchemaField({
      quantity: new fields.NumberField({ ...required, initial: 1, min: 1, max: 6 }),
      size: new fields.NumberField({ ...required, initial: 12, min: 1 }),
    }); 

    schema.constitution = new fields.NumberField({ required: true, nullable: false, initial: 1, min: 1, max: 8, step: 1 });
    schema.endurance = new fields.NumberField({ required: true, nullable: false, initial: 1, min: 1, max: 8, step: 1 });
    schema.effervescence = new fields.NumberField({ required: true, nullable: false, initial: 1, min: 1, max: 8, step: 1 });

    schema.quirkPoints = new fields.NumberField({ required: true, nullable: false, initial: 0 });

    schema.communication = new UtopiaSchemaField({
      language: new UtopiaSchemaField({
        choices: new fields.NumberField({ ...required, initial: 0 }),
        languages: new fields.SetField(new fields.StringField(), { initial: [] }),
      }),
      types: new fields.SetField(new fields.StringField({
        required: true,
        nullable: false,
        choices: {
          "mute": "UTOPIA.Items.Species.CommunicationTypes.Mute",
          "speech": "UTOPIA.Items.Species.CommunicationTypes.Speech",
          "telepathy": "UTOPIA.Items.Species.CommunicationTypes.Telepathy",
        },
        validate: (value) => {
          if (value.has("mute") && value.has("speech")) {
            ui.notifications.error("Cannot be both mute and have speech communication");
            return false;
          }
        }
      }, {
        required: true,
        nullable: false,
        initial: new Set(["speech"]),
      })),
    })

    schema.travel = new fields.SchemaField({
      land: new UtopiaSchemaField({
        speed: FormulaField("@spd.total"),
        stamina: FormulaField(),
      }),
      air: new UtopiaSchemaField({
        speed: FormulaField(),
        stamina: FormulaField(),
      }),
      water: new UtopiaSchemaField({
        speed: FormulaField(),
        stamina: FormulaField(),
      }),
    });

    schema.transform = new UtopiaSchemaField({
      cost: new fields.NumberField({ ...required, initial: 0 }),
      duration: new fields.NumberField({ ...required, initial: 0 }),
      type: new fields.StringField({
        required: true,
        nullable: false,
        choices: {
          "none": "UTOPIA.Items.Species.TransformationTypes.none",
          "wild": "UTOPIA.Items.Species.TransformationTypes.wild",
          "enhance": "UTOPIA.Items.Species.TransformationTypes.enhance",
        },
        initial: "none",
      }),
    });

    schema.gifts = new UtopiaSchemaField({
      subtraits: new fields.SetField(new fields.StringField(), {
        required: true,
        nullable: false,
        initial: [],
      }),
      points: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 0,
        min: 0,
        max: 2,
        step: 2
      }),
      trade: new fields.BooleanField({
        required: true,
        nullable: false,
        initial: false,
      }),
    })

    schema.paperdoll = new fields.SchemaField({
      head: new PaperDollField({ slot: "head", augmentable: true, equippable: true, specialty: false }, { label: "UTOPIA.PaperDoll.Slot.Head.label", hint: "UTOPIA.PaperDoll.Slot.Head.hint" }),
      neck: new PaperDollField({ slot: "neck", augmentable: true, equippable: true, specialty: false }, { label: "UTOPIA.PaperDoll.Slot.Neck.label", hint: "UTOPIA.PaperDoll.Slot.Neck.hint" }),
      chest: new PaperDollField({ slot: "chest", augmentable: true, equippable: true, specialty: false }, { label: "UTOPIA.PaperDoll.Slot.Chest.label", hint: "UTOPIA.PaperDoll.Slot.Chest.hint" }),
      back: new PaperDollField({ slot: "back", augmentable: true, equippable: true, specialty: false }, { label: "UTOPIA.PaperDoll.Slot.Back.label", hint: "UTOPIA.PaperDoll.Slot.Back.hint" }),
      hands: new PaperDollField({ slot: "hands", augmentable: true, equippable: true, specialty: false }, { label: "UTOPIA.PaperDoll.Slot.Hands.label", hint: "UTOPIA.PaperDoll.Slot.Hands.hint" }),
      ring: new PaperDollField({ slot: "ring", augmentable: true, equippable: true, specialty: false }, { label: "UTOPIA.PaperDoll.Slot.Ring.label", hint: "UTOPIA.PaperDoll.Slot.Ring.hint" }),
      waist: new PaperDollField({ slot: "waist", augmentable: true, equippable: true, specialty: false }, { label: "UTOPIA.PaperDoll.Slot.Waist.label", hint: "UTOPIA.PaperDoll.Slot.Waist.hint" }),
      feet: new PaperDollField({ slot: "feet", augmentable: true, equippable: true, specialty: false }, { label: "UTOPIA.PaperDoll.Slot.Feet.label", hint: "UTOPIA.PaperDoll.Slot.Feet.hint" }),
    });

    schema.quirks = new fields.SetField(new fields.DocumentUUIDField(), { initial: [] })

    // schema.quirk = new fields.SchemaField({
    //   name: new fields.StringField({ required: true, nullable: false, initial: "" }),
    //   qp: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    //   description: new fields.StringField({ required: true, nullable: false, initial: "" }),
    //   attributes: new fields.StringField({ required: false, nullable: false }),
    // })
    //schema.customQuirks = new fields.ArrayField(schema.quirk);
    //schema.quirks = new fields.ArrayField(new fields.ObjectField());

    return schema;
  }

  migrateData(source) {
    try {
      if (source.communication.types) {
        const types = new Set(source.communication.types);
        if (types.has("mute") && types.has("speech")) {
          types.delete("mute");
        }
      }
    } catch (err)
    {
      console.error(err);
    }
  }

  get headerFields() {
    return [
      {
        field: this.schema.fields.constitution,
        stacked: true,
        editable: true,
      },
      {
        field: this.schema.fields.endurance,
        stacked: true,
        editable: true,
      },
      {
        field: this.schema.fields.effervescence,
        stacked: true,
        editable: true,
      },
      {
        field: this.schema.fields.travel.fields.land,
        stacked: true,
        editable: true,
        columns: 2,
      },
      {
        field: this.schema.fields.travel.fields.water,
        stacked: true,
        editable: true,
        columns: 2,
      },
      {
        field: this.schema.fields.travel.fields.air,
        stacked: true,
        editable: true,
        columns: 2,
      },
      {
        field: this.schema.fields.dodge,
        stacked: true,
        editable: true,
        columns: 2,
      },
      {
        field: this.schema.fields.block,
        stacked: true,
        editable: true,
        columns: 2,
      },
      {
        field: this.schema.fields.quirkPoints,
        stacked: false,
        editable: false,
      },
    ]
  }

  get attributeFields() {
    return [
      {
        field: this.schema.fields.communication,
        stacked: true,
        editable: true,
        columns: 2
      },
      {
        field: this.schema.fields.transform,
        stacked: false,
        editable: true,
        columns: 3,
      },
      {
        field: this.schema.fields.gifts,
        stacked: false,
        editable: true,
        columns: 3,
      },
      {
        field: this.schema.fields.quirks,
        stacked: false,
        editable: true,
      }
    ]
  }

  getPaperDoll() {
    const context = {}

    context.head = {}
    context.head.evolution = this.evolution.head;
    context.head.unaugmentable = this.armors.unaugmentable.head;
    context.head.unequippable = this.armors.unequippable.head;
    context.head.specialty = this.armors.specialty.head;

    context.neck = {}
    context.neck.evolution = this.evolution.neck;
    context.neck.unaugmentable = this.armors.unaugmentable.neck;
    context.neck.unequippable = this.armors.unequippable.neck
    context.neck.specialty = this.armors.specialty.neck;

    context.chest = {}
    context.chest.evolution = this.evolution.chest;
    context.chest.unaugmentable = this.armors.unaugmentable.chest;
    context.chest.unequippable = this.armors.unequippable.chest
    context.chest.specialty = this.armors.specialty.chest;

    context.back = {}
    context.back.evolution = this.evolution.back;
    context.back.unaugmentable = this.armors.unaugmentable.back;
    context.back.unequippable = this.armors.unequippable.back
    context.back.specialty = this.armors.specialty.back;

    context.hands = {}
    context.hands.evolution = this.evolution.hands;
    context.hands.unaugmentable = this.armors.unaugmentable.hands;
    context.hands.unequippable = this.armors.unequippable.hands
    context.hands.specialty = this.armors.specialty.hands;

    context.ring = {}
    context.ring.evolution = this.evolution.ring;
    context.ring.unaugmentable = this.armors.unaugmentable.ring;
    context.ring.unequippable = this.armors.unequippable.ring
    context.ring.specialty = this.armors.specialty.ring;

    context.waist = {}
    context.waist.evolution = this.evolution.waist;
    context.waist.unaugmentable = this.armors.unaugmentable.waist;
    context.waist.unequippable = this.armors.unequippable.waist
    context.waist.specialty = this.armors.specialty.waist;

    context.feet = {}
    context.feet.evolution = this.evolution.feet;
    context.feet.unaugmentable = this.armors.unaugmentable.feet;
    context.feet.unequippable = this.armors.unequippable.feet
    context.feet.specialty = this.armors.specialty.feet;

    console.log(context);

    return context;
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();

    this._prepareQuirks();
  }

  async _prepareQuirks() {
    try {
      this.quirkPoints = 0;

      const quirks = [...this.quirks];

      // Since we're storing quirks in a Set, we need to convert it to an array before we can iterate over it
      Array.from(quirks).forEach(async uuid => {
        console.warn(uuid);

        const quirk = await fromUuid(uuid);
        if (!quirk) return;

        // Get our points
        this.quirkPoints += quirk.system.quirkPoints;

        // Attributes are stored as an array of [{key: key, value: value}] objects
        const attributes = quirk.system.attributes;
        if (attributes.length === 0) return;
        attributes.forEach(attribute => {
          const key = attribute.key;
          let value = attribute.value;
          const path = key.split(".");
          const last = path.pop();
          const target = path.reduce((acc, part) => acc[part], this);         
          const fieldPaths = path.map(part => `${part}.fields`);
          const fields = fieldPaths.join(".") + "." + last;
          const field = foundry.utils.getProperty(this.schema.fields, fields);
          if (field.constructor.name === "NumberField") 
            value = parseFloat(value);
          else if (field.constructor.name === "BooleanField")
            value = Boolean(value);
          else if (field.constructor.name === "StringField")
            value = String(value);
          target[last] = value;
        }); 
      });

      this.quirkPoints += this.constitution;
      this.quirkPoints += this.endurance;
      this.quirkPoints += this.effervescence;
  
      this.quirkPoints += this.block.quantity;
      this.quirkPoints += this.dodge.quantity;
  
      this.gifts.subtraitsLeft = 4 - this.gifts.subtraits.size - (this.gifts.points === 2 ? 3 : 0);
  
      this.quirkPoints += this.gifts.subtraits.size;
      this.quirkPoints += this.gifts.points === 2 ? 3 : 0;

    } catch (e) {
      console.error("Error preparing species quirks:", e);
    }
  }
}