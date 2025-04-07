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
  
}

export async function prepareGearData(actor) {
  const gearItems = actor.parent.items.filter(item => item.type === "gear" && item.isOwned);

  actor._gearData = [...gearItems.map(item => item.toObject())];

  for (const gear of gearItems) {
    const features = gear.system.attributes;

    for (const feature of features) {
      for (const [attribute, value] of Object.entries(feature)) {
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

        const parsedValue = foundry.utils.getProperty(actor, lookup);
        const newValue = parsedValue + value;
        foundry.utils.setProperty(actor, lookup, newValue);
      }
    }
  }
}