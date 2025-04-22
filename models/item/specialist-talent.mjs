import { gatherItems } from "../../system/helpers/gatherItems.mjs";
import { isNumeric } from "../../system/helpers/isNumeric.mjs";
import UtopiaItemBase from "../base-item.mjs";

export class SpecialistTalent extends UtopiaItemBase {
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "UTOPIA.Items.SpecialistTalent"];

  static defineSchema() {
    const fields = foundry.data.fields;
    
    const requiredInteger = { required: true, nullable: false, initial: 0 };
    const requiredString = { required: true, nullable: false, initial: "" };

    const schema = super.defineSchema();

    schema.resource = new fields.SchemaField({
      resourceId: new fields.StringField({...requiredString, initial: foundry.utils.randomID(16)}),
      name: new fields.StringField({...requiredString}),
      max: new fields.SchemaField({
        formula: new fields.StringField({...requiredString, initial: "0"})
      }),
      amount: new fields.NumberField({...requiredInteger, initial: 0}),
      secret: new fields.BooleanField({required: true, initial: false, gmOnly: true}),
      propagateToActor: new fields.BooleanField({required: true, initial: true}),
      recoverAmount: new fields.NumberField({...requiredInteger}),
      recoverInterval: new fields.StringField({required: true, nullable: false, initial: "none", choices: {
        "none": "UTOPIA.Item.Gear.Resource.RecoverInterval.none",
        "turn": "UTOPIA.Item.Gear.Resource.RecoverInterval.turn",
        "round": "UTOPIA.Item.Gear.Resource.RecoverInterval.round",
        "rest": "UTOPIA.Item.Gear.Resource.RecoverInterval.rest",
        "day": "UTOPIA.Item.Gear.Resource.RecoverInterval.day",
        "session": "UTOPIA.Item.Gear.Resource.RecoverInterval.session",
      }}),
    });
    schema.resources = new fields.ArrayField(schema.resource);

    schema.action = new fields.SchemaField({
      actionId: new fields.StringField({...requiredString, initial: foundry.utils.randomID(16)}),
      name: new fields.StringField({...requiredString, initial: "New Action"}),
      category: new fields.StringField({required: true, nullable: false, initial: "trait", choices: {
        "generic": "UTOPIA.Item.Action.Category.generic",
        "trait": "UTOPIA.Item.Action.Category.trait",
        "damage": "UTOPIA.Item.Action.Category.damage",
        "macro": "UTOPIA.Item.Action.Category.macro",
      }}),
      type: new fields.StringField({required: true, nullable: false, initial: "turn", choices: {
        "turn": "UTOPIA.Item.Action.Type.turn",
        "interrupt": "UTOPIA.Item.Action.Type.interrupt",
      }}),
      trait: new fields.StringField({required: true, nullable: false, initial: "agi", choices: {
        "agi": "UTOPIA.Actor.Traits.agi.long",
        "str": "UTOPIA.Actor.Traits.str.long",
        "int": "UTOPIA.Actor.Traits.int.long",
        "wil": "UTOPIA.Actor.Traits.wil.long",
        "dis": "UTOPIA.Actor.Traits.dis.long",
        "cha": "UTOPIA.Actor.Traits.cha.long",  
        "spd": "UTOPIA.Actor.Subtraits.spd.long",
        "dex": "UTOPIA.Actor.Subtraits.dex.long",
        "pow": "UTOPIA.Actor.Subtraits.pow.long",
        "for": "UTOPIA.Actor.Subtraits.for.long",
        "eng": "UTOPIA.Actor.Subtraits.eng.long",
        "mem": "UTOPIA.Actor.Subtraits.mem.long",
        "res": "UTOPIA.Actor.Subtraits.res.long",
        "awa": "UTOPIA.Actor.Subtraits.awa.long",
        "por": "UTOPIA.Actor.Subtraits.por.long",
        "stu": "UTOPIA.Actor.Subtraits.stu.long",
        "app": "UTOPIA.Actor.Subtraits.app.long",
        "lan": "UTOPIA.Actor.Subtraits.lan.long",
      }}),
      modifier: new fields.StringField({required: true, nullable: false}),
      cost: new fields.NumberField({...requiredInteger, min: 0, max: 6}),
      stamina: new fields.NumberField({...requiredInteger, initial: 0}),
      formula: new fields.StringField({...requiredString, initial: ""}),
      flavor: new fields.StringField({...requiredString, initial: ""}),
      template: new fields.StringField({required: true, nullable: false, initial: "none", choices: {
        "none": "UTOPIA.Item.Action.Template.none",
        "sbt": "UTOPIA.Item.Action.Template.sbt",
        "mbt": "UTOPIA.Item.Action.Template.mbt",
        "lbt": "UTOPIA.Item.Action.Template.lbt",
        "xbt": "UTOPIA.Item.Action.Template.xbt",
        "cone": "UTOPIA.Item.Action.Template.cone",
        "line": "UTOPIA.Item.Action.Template.line",
      }}),
      resource: new fields.StringField({required: true, nullable: false}),
      consumed: new fields.NumberField({...requiredInteger, initial: 0}),
      macro: new fields.DocumentUUIDField({required: false, nullable: true}),
      actor: new fields.StringField({required: true, nullable: false, initial: "default", choices: {
        "default": "UTOPIA.Item.Action.Actor.default",
        "self": "UTOPIA.Item.Action.Actor.self",
        "target": "UTOPIA.Item.Action.Actor.target", 
      }}),
    })
    schema.actions = new fields.ArrayField(schema.action, {required: true, nullable: false, initial: []});

    schema.attributeRequirements = new fields.SetField(new fields.StringField(), { required: true, nullable: true, initial: [] });
    schema.speciesRequirements = new fields.StringField({ required: true, nullable: false });
    schema.talentRequirements = new fields.StringField({ required: true, nullable: false });
    schema.talentTreeRequirements = new fields.StringField({ required: true, nullable: false });
    schema.artistryRequirements = new fields.StringField({ required: true, nullable: false });
    schema.grants = new fields.SetField(new fields.DocumentUUIDField({ type: "Item" }), { required: true, nullable: true, initial: [] });

    return schema;
  }

  _evaluateComparison = (value1, operator, value2) => {
    if (String(isNumeric(value1)) && String(isNumeric(value2))) {
      value1 = parseFloat(value1);
      value2 = parseFloat(value2);
    }
    else {
      value1 = String(value1).toLowerCase();
      value2 = String(value2).toLowerCase();
    }
    
    switch (operator) {
      case '<': return value1 < value2;
      case '<=': return value1 <= value2;
      case '>': return value1 > value2;
      case '>=': return value1 >= value2;
      case '=': 
      case '==':
      case '===': 
        return value1 === value2;
      case '!=':
      case '!==': 
        return value1 !== value2;
      default: return false;
    }
  }

  canActorAccept(actor) {
    var acceptable = true;

    this.attributeRequirements.forEach(a => {
      const parts = a.split(' ');
      const attr = parts[0];
      const comparison = parts[1];
      const value = parts[2];

      const actorValue = foundry.utils.getProperty(actor, attr);
      if (!this._evaluateComparison(actorValue, comparison, value))
        acceptable = false;
    });

    if (this.speciesRequirements.length > 0) {
      this.speciesRequirements.split(',').forEach(r => {
        if (!this._evaluateComparison(actor._speciesData.name, "===", r.trim()))
          acceptable = false;
      });
    }

    if (this.talentRequirements.length > 0) {
      this.talentRequirements.split(',').forEach(r => {
        const actorTalents = actor.items.filter(i => i.type === "talent" || i.type === "specialistTalent")?.map(t => t.name.toLowerCase().trim()) ?? [];
  
        if (actorTalents.length === 0) {
          acceptable = false;
        }
        else { 
          if (!actorTalents.includes(r.toLowerCase().trim())) {
            acceptable = false;
          }
        }
      });
    }

    // TODO - Finish implementation
    //if (this.talentTreeRequirements.length > 0) {
      //this.talentTreeRequirements.split(',').forEach(async r => {
        //const talentTrees = await gatherItems({ type: "talentTree", gatherFolders: false, gatherFromActor: false, gatherFromWorld: true });
        //acceptable = true; // This is a placeholder, as the talent tree requirements are not yet implemented.
        // const actorTalents = actor.items.filter(i => i.type === "talent")?.map(t => t.system.tree.toLowerCase().trim().split('-')[0]) ?? [];
        // talents.filter(t => t.folder.name.toLowerCase().trim()).localeCompare(r.toLowerCase().trim())
        // var matches = 0;         
  
        // talents.forEach(t => {
        //   if (actorTalents.includes(t.name)) {
        //     matches++;
        //   }
        // })
  
        // if (isNumeric(r.split(' ')[0])) {
        //   if (matches < parseFloat(r.split(' ')[0])) {
        //     acceptable = false;
        //   }
        // } 
        // else {
        //   if (matches !== talents.length) {
        //     acceptable = false;
        //   }
        // }
      //});
    //}

    if (this.artistryRequirements.length > 0) {
      this.artistryRequirements.split(',').forEach(r => {
        const artistries = actor.system.spellcasting.artistries;
        for (const artistry of artistries) {
          if (artistry.toLowerCase().trim() === r.toLowerCase().trim() && artistry.unlocked) {
            continue;
          }
          else {
            acceptable = false;
          }
        }
      });
    }

    return acceptable;
  }

  migrateData(source) {
    if (source.requirements) {
      source.attributeRequirements = source.requirements;
    }

    if (source.talentRequirements === "none") 
      source.talentRequirements = null;
    if (source.talentTreeRequirements === "none") 
      source.talentTreeRequirements = null;
    if (source.attributeRequirements === "none") 
      source.attributeRequirements = null;
    if (source.artistryRequirements === "none") 
      source.artistryRequirements = null;
    if (source.speciesRequirements === "none") 
      source.speciesRequirements = null;

    return source;
  }

  prepareDerivedData() {
    const resources = this.resources;
    resources.forEach(async r => { // TODO - Implement in a way that avoids rolls
      // if (!r.propagateToActor) {
      //   // Max could be a formula
      //   const roll = await new Roll(r.max.formula, this.parent.getRollData()).evaluate();
      //   r.max.total  = roll.total;
      //   r.amount = Math.min(r.amount, r.max.total);
      // }
    });
  }
}