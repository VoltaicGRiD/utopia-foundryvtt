import { isNumeric } from "../../system/helpers/isNumeric.mjs";

export async function prepareBodyData(pawn) {
  if (pawn.parent.items.filter(i => i.type === "body").length === 0) {
    return;
  }

  const body = pawn.parent.items.find(i => i.type === "body");

  pawn._bodyData = body;
  pawn.hitpoints.surface.max += body.system.shp;
  // pawn.hitpoints.surface.value = body.system.shp; // TODO - This can't be updated on every actor update cycle
  pawn.hitpoints.deep.max = body.system.dhp;
  // pawn.hitpoints.deep.value = body.system.dhp; // TODO - This can't be updated on every actor update cycle
  pawn.stamina.max = body.system.stamina;
  // pawn.stamina.value = body.system.stamina; // TODO - This can't be updated on every actor update cycle

  pawn.block.size = body.system.block.size;
  pawn.block.quantity = body.system.block.quantity;

  pawn.dodge.size = body.system.dodge.size;
  pawn.dodge.quantity = body.system.dodge.quantity;

  pawn.harvest = body.system.harvest;

  for (const damageType of Object.keys(pawn.innateDefenses)) {
    if (body.system.defenses[damageType]) {
      pawn.innateDefenses[damageType] = body.system.defenses[damageType];
    }
  }

  const bodyTraits = body.system.traits.map(trait => {
    return trait.trait;
  });

  for (const [pawnTrait, data] of Object.entries(pawn.traits)) {
    if (bodyTraits.includes(pawnTrait)) {
      const trait = body.system.traits.find(trait => trait.trait === pawnTrait);
      data.value += trait.value;
    }
  }

  for (const [pawnTrait, data] of Object.entries(pawn.subtraits)) {
    if (bodyTraits.includes(pawnTrait)) {
      const trait = body.system.traits.find(trait => trait.trait === pawnTrait);
      data.value += trait.value;
    }
    else {
      data.value += body.system.traitDefault;
    }
    
    console.log("Subtrait", pawnTrait, data);

    pawn.subtraits[pawnTrait].value += data.value;
    pawn.subtraits[pawnTrait].mod = pawn.subtraits[pawnTrait].value - 4;
    data.mod = data.value - 4;
  }

  prepareClassData(pawn);
}  

export async function prepareClassData(pawn) {
  if (pawn.parent.items.filter(i => i.type === "class").length === 0) {
    return prepareKitData(pawn);
  }

  // A pawn can have multiple classes, depending on the classes they are,
  // - no max innate
  // - max 1 martial, arcane, and support
  // We can only get the first of each
  const classItems = pawn.parent.items.filter(i => i.type === "class");

  pawn._classData = classItems;
  
  var classCount = {
    martial: 0,
    arcane: 0,
    support: 0,
    innate: 0,
  }  

  for (const item of classItems) {
    classCount[item.system.type] += 1;

    pawn.difficulty += item.system.points;

    if (item.system.type !== "innate" && classCount[item.system.type] > 1) continue;
    
    // TODO - Implement this
    // Passives SHOULD be implemented via ActiveEffect, but there may be
    // some utility to implementing them this way
    for (const attribute of item.system.attributes) {
      const key = attribute.key.replace("system.", "");
      var value = attribute.value;
      var addValue = true;
      
      if (isNumeric(value)) {
        value = parseFloat(value);
      }
      // Check if the value starts with an '='
      else if (value.startsWith("=")) {
        addValue = false;
        value = parseFloat(value.substring(1));
      }
      else if (value.startsWith("+") || value.startsWith("-")) {
        addValue = true;
        value = parseFloat(value.substring(1));
      }
      
      const originalValue = foundry.utils.getProperty(pawn, key);
      foundry.utils.setProperty(pawn, key, 
        addValue ? originalValue + value : value
      );
    }
  }

  prepareKitData(pawn);
}

export async function prepareKitData(pawn) {
  if (pawn.parent.items.filter(i => i.type === "kit").length === 0) {
    return prepareRemainingData(pawn);
  }

  // Pawns can have any number of kits
  const kits = pawn.parent.items.filter(i => i.type === "kit");

  pawn._kitData = kits;

  for (const kit of kits) {
    pawn.difficulty += kit.system.points;

    // TODO - Implement this
    // Attributes SHOULD be implemented via ActiveEffect, but there may be
    // some utility to implementing them this way
    const choices = kit.system.selectedChoices;

    for (const attribute of kit.system.attributes) {
      var key = attribute.key;
      var value = attribute.value;
      if (isNumeric(value)) {
        value = parseFloat(value);
      }
      const choiceSet = attribute.choiceSet;
      if (attribute.hasChoices) {
        if (Object.keys(choices).includes(choiceSet)) {
          key = choices[choiceSet];
          // remove this set from the choices
          delete choices[choiceSet];
        } 
        else {
          continue;
        }
      }
      key = key.replace("system.", "");
      const originalValue = foundry.utils.getProperty(pawn, key);
      foundry.utils.setProperty(pawn, key, originalValue + value);
    }
  }

  prepareRemainingData(pawn);
}

export async function prepareRemainingData(pawn) {
  for (const key of Object.keys(pawn.innateDefenses)) {
    if (pawn.innateDefenses[key]) {
      pawn.defenses[key] += pawn.innateDefenses[key];
    }
  }
}