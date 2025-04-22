export async function prepareSpeciesData(character) {
  if (character.parent.items.filter(i => i.type === "species").length === 0) {
    return prepareSpeciesDefault(character);
  }

  const species = character.parent.items.find(i => i.type === "species");
  character._speciesData = species;

  if (character.languagePoints) character.languagePoints.available += character._speciesData.system.communication.languages - character.languagePoints.spent;
  if (character.communication) character.communication.telepathy = character._speciesData.system.communication.telepathy;
  character.size = character._speciesData.system.size;

  character.travel = {
    land: { speed: 0, stamina: 0 },
    water: { speed: 0, stamina: 0 },
    air: { speed: 0, stamina: 0 }
  }

  character.block.size += character._speciesData.system.block.size;
  character.block.quantity += character._speciesData.system.block.quantity;

  character.dodge.size += character._speciesData.system.dodge.size;
  character.dodge.quantity += character._speciesData.system.dodge.quantity;

  const traits = JSON.parse(game.settings.get("utopia", "advancedSettings.traits"));
  const subtraits = JSON.parse(game.settings.get("utopia", "advancedSettings.subtraits"));
  const allTraits = { ...traits, ...subtraits };
  for (const trait of character._speciesData.system.gifts.subtraits) {
    for (const [traitKey, traitValue] of Object.entries(traits)) {
      if (
        traitKey === trait.toLowerCase() || 
        traitValue.long === trait.toLowerCase() ||
        traitValue.short === trait.toLowerCase()
      ) {
        character.traits[traitKey].gifted = true;      
      }
    }

    for (const [traitKey, traitValue] of Object.entries(subtraits)) {
      if (
        traitKey === trait.toLowerCase() || 
        traitValue.long === trait.toLowerCase() ||
        traitValue.short === trait.toLowerCase()
      ) {
        character.subtraits[traitKey].gifted = true;      
      }
    }
  }

  character.giftPoints.available = character._speciesData.system.gifts.points;

  for (const [key, value] of Object.entries(character._speciesData.system.travel)) {
    const rolldata = await character.parent.getRollData();
    const innateRoll = new Roll(String(character.innateTravel[key].speed), rolldata);
    await innateRoll.evaluate();  
    character.travel[key].speed = innateRoll.total;

    const speciesRoll = new Roll(String(value.speed), rolldata);
    await speciesRoll.evaluate();
    character.travel[key].speed += speciesRoll.total;
  }

  character.constitution += character._speciesData.system.constitution;
  character.endurance += character._speciesData.system.endurance;
  character.effervescence += character._speciesData.system.effervescence;

  character.evolution.head = Math.max(species.system.evolution.head, 1);
  character.evolution.feet = species.system.evolution.feet;
  character.evolution.hands = species.system.evolution.hands;

  character.equipmentSlots.capacity = {};
  character.equipmentSlots.capacity.head = character.evolution.head;
  character.equipmentSlots.capacity.neck = character.evolution.head;
  character.equipmentSlots.capacity.back = 1;
  character.equipmentSlots.capacity.chest = 1;
  character.equipmentSlots.capacity.waist = 1;
  character.equipmentSlots.capacity.feet = character.evolution.feet / 2;
  character.equipmentSlots.capacity.hands = character.evolution.hands / 2;
  character.equipmentSlots.capacity.ring = character.evolution.hands / 2;

  character.augmentSlots.capacity = {};
  character.augmentSlots.capacity.head = character.evolution.head;
  character.augmentSlots.capacity.neck = character.evolution.head;
  character.augmentSlots.capacity.back = 1;
  character.augmentSlots.capacity.chest = 1;
  character.augmentSlots.capacity.waist = 1;
  character.augmentSlots.capacity.feet = character.evolution.feet / 2;
  character.augmentSlots.capacity.hands = character.evolution.hands / 2;
  character.augmentSlots.capacity.ring = character.evolution.hands / 2;

  character.handheldSlots.capacity = character.evolution.hands;
  character.handheldSlots.equipped = character.handheldSlots.equipped || [];
  for (let i = 0; i < character.handheldSlots.capacity; i++) {
    if (!character.handheldSlots.equipped[i]) character.handheldSlots.equipped[i] = null;
  }
}

export async function prepareSpeciesDefault(character) {
  character._speciesData = {
    name: "No Species",
    system: {
      travel: {
        land: "@spd.total",
        water: 0,
        air: 0
      },
      size: "medium",
      communication: {
        languages: 2,
        telepathy: false
      }
    }
  }

  if (character.languagePoints) character.languagePoints.available = character._speciesData.system.communication.languages;
  if (character.communication) character.communication.telepathy = character._speciesData.system.communication.telepathy;
  character.size = character._speciesData.system.size;
  
  character.travel = {
    land: { speed: 0, stamina: 0 },
    water: { speed: 0, stamina: 0 },
    air: { speed: 0, stamina: 0 }
  }

  for (const [key, value] of Object.entries(character._speciesData.system.travel)) {
    character.travel[key].speed = await new Roll(String(character.innateTravel[key].speed), character.parent.getRollData()).evaluate().total;
    character.travel[key].speed += await new Roll(String(value.speed), character.parent.getRollData()).evaluate().total;
  }
}