export async function prepareSpeciesData(character) {
  const species = character._speciesData;

  if (character.languagePoints) character.languagePoints.available += species.system.communication.languages - character.languagePoints.spent;
  if (character.communication) character.communication.telepathy = species.system.communication.telepathy;
  character.size = species.system.size;

  //character.block.size += species.system.block.size;
  character.block.quantity = species.system.block.quantity;

  //character.dodge.size += species.system.dodge.size;
  character.dodge.quantity = species.system.dodge.quantity;

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
    innateRoll.evaluateSync();  
    character.speciesTravel[key].speed = innateRoll.total;

    const speciesRoll = new Roll(String(value.speed), rolldata);
    speciesRoll.evaluateSync();
    character.speciesTravel[key].speed += speciesRoll.total;
  }

  character.travel.land.formula = String(character.speciesTravel.land.speed);
  character.travel.land.stamina = character.speciesTravel.land.stamina;
  character.travel.water.formula = String(character.speciesTravel.water.speed);
  character.travel.water.stamina = character.speciesTravel.water.stamina;
  character.travel.air.formula = String(character.speciesTravel.air.speed);
  character.travel.air.stamina = character.speciesTravel.air.stamina;

  character.constitution += species.system.constitution;
  character.endurance += species.system.endurance;
  character.effervescence += species.system.effervescence;

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

  character.armors = species.system.armors;

  character.handheldSlots.capacity = character.evolution.hands;
  character.handheldSlots.equipped = character.handheldSlots.equipped || [];
  for (let i = 0; i < character.handheldSlots.capacity; i++) {
    if (!character.handheldSlots.equipped[i]) character.handheldSlots.equipped[i] = null;
  }

  return character;
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
  
  character.speciesTravel = {
    land: { speed: 0, stamina: 0 },
    water: { speed: 0, stamina: 0 },
    air: { speed: 0, stamina: 0 }
  }

  for (const [key, value] of Object.entries(character._speciesData.system.travel)) {
    character.speciesTravel[key].speed = await new Roll(String(character.innateTravel[key].speed), character.parent.getRollData()).evaluate().total;
    character.speciesTravel[key].speed += await new Roll(String(value.speed), character.parent.getRollData()).evaluate().total;
  }

  return character;
}