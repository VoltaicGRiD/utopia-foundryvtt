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