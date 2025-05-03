// We need a lookup table for all of the possible attributes a gear may possess.
// the table should have the attribute name as the key, and the value should be the
// data in the actor that we need to modify

// If the attribute is not present in the lookupTable, its lookup will be identical
// to the data in the actor, or should be added independently
const lookupTable = {
  "travel.vertical": "travel.vertical",
  "traitBonusAmount": "{traitBonusTrait}.{value}.bonus",
  "preventSpellcasting": "spellcasting.disabled",
  "spellDiscount": "spellcasting.discount",
  "block": "block.quantity",
  "dodge": "dodge.quantity",
}

const specialAttributes = [
  "preventSpellcasting",
  "grantsFlight",
  
]

export async function prepareGearDataPostActorPrep(actorSystem, gear) {
  const features = gear.system.attributes;

  for (const feature of features) {
    for (const [attribute, value] of Object.entries(feature)) {
      // If the attribute is a special attribute, we handle it differently
      if (specialAttributes.includes(attribute)) {
        handleSpecialAttribute(actorSystem, attribute, value);
        continue;
      }

      const lookup = foundry.utils.getProperty(lookupTable, attribute) ?? attribute;
      let regexPattern = /{([a-zA-Z]+)}/g;
      let match;
      while ((match = regexPattern.exec(lookup)) !== null) {
        // If the match is specifically "value" we put the value from the attribute at that location
        if (match[1] === "value") {
          lookup = lookup.replace(match[0], value);
        }

        // Otherwise, we replace the value with the value from another attribute
        else {
          lookup = lookup.replace(match[0], attributes[match[1]]);
        }
      }

      const parsedValue = foundry.utils.getProperty(actorSystem, lookup);
      // We need to modify the behavior based on the data type of the value
      const isNumber = typeof value === "number" || value instanceof Number;
      const isString = typeof value === "string" || value instanceof String;
      const isBoolean = typeof value === "boolean" || value instanceof Boolean;

      // If the property doesn't exist, we set it to the value directly
      if (parsedValue === undefined) {
        foundry.utils.setProperty(actorSystem, lookup, value);
        continue;
      }

      else if (isNumber) {
        const newValue = parsedValue + value;
        foundry.utils.setProperty(actorSystem, lookup, newValue);
      }

      else if (isString || isBoolean) {
        const newValue = parsedValue;
        foundry.utils.setProperty(actorSystem, lookup, newValue);
      }
    }
  }
}

function handleSpecialAttribute(actorSystem, attribute, value) {
  switch (attribute) {
    case "preventSpellcasting":
      foundry.utils.setProperty(actorSystem, "spellcasting.disabled", value);
      break;
    case "grantsFlight": 
      foundry.utils.setProperty(actorSystem, "movement.flight", value);
      break;
  }
}