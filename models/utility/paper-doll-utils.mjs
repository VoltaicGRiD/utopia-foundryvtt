export function getPaperDollContext(actor) {
  // If we have direct access to the system data instead of the actor, we need to go up a level
  if (actor.augmentSlots)
    actor = actor.parent;

  const context = {};

  context.head = {};
  context.head.evolution = actor.system.evolution.head;
  context.head.unaugmentable = actor.system.armors.unaugmentable.head;
  context.head.unequippable = actor.system.armors.unequippable.head;
  context.head.specialty = actor.system.armors.specialty.head;
  context.head.items = actor.system.equipmentSlots.equipped.head.map(i => actor.items.get(i) ?? null);
  context.head.items = context.head.items.filter(i => i !== null);
  context.head.augments = actor.system.augmentSlots.equipped.head.map(i => actor.items.get(i) ?? null);
  context.head.augments = context.head.augments.filter(i => i !== null);
  

  context.neck = {};
  context.neck.evolution = actor.system.evolution.neck;
  context.neck.unaugmentable = actor.system.armors.unaugmentable.neck;
  context.neck.unequippable = actor.system.armors.unequippable.neck;
  context.neck.specialty = actor.system.armors.specialty.neck;
  context.neck.items = actor.system.equipmentSlots.equipped.neck.map(i => actor.items.get(i) ?? null);
  context.neck.items = context.neck.items.filter(i => i !== null);
  context.neck.augments = actor.system.augmentSlots.equipped.neck.map(i => actor.items.get(i) ?? null);
  context.neck.augments = context.neck.augments.filter(i => i !== null);

  context.chest = {};
  context.chest.evolution = actor.system.evolution.chest;
  context.chest.unaugmentable = actor.system.armors.unaugmentable.chest;
  context.chest.unequippable = actor.system.armors.unequippable.chest;
  context.chest.specialty = actor.system.armors.specialty.chest;
  context.chest.items = actor.system.equipmentSlots.equipped.chest.map(i => actor.items.get(i) ?? null);
  context.chest.items = context.chest.items.filter(i => i !== null);
  context.chest.augments = actor.system.augmentSlots.equipped.chest.map(i => actor.items.get(i) ?? null);
  context.chest.augments = context.chest.augments.filter(i => i !== null); 
  
  context.back = {};
  context.back.evolution = actor.system.evolution.back;
  context.back.unaugmentable = actor.system.armors.unaugmentable.back;
  context.back.unequippable = actor.system.armors.unequippable.back;
  context.back.specialty = actor.system.armors.specialty.back;
  context.back.items = actor.system.equipmentSlots.equipped.back.map(i => actor.items.get(i) ?? null);
  context.back.items = context.back.items.filter(i => i !== null);
  context.back.augments = actor.system.augmentSlots.equipped.back.map(i => actor.items.get(i) ?? null);
  context.back.augments = context.back.augments.filter(i => i !== null);

  context.hands = {};
  context.hands.evolution = actor.system.evolution.hands;
  context.hands.unaugmentable = actor.system.armors.unaugmentable.hands;
  context.hands.unequippable = actor.system.armors.unequippable.hands;
  context.hands.specialty = actor.system.armors.specialty.hands;
  context.hands.items = actor.system.equipmentSlots.equipped.hands.map(i => actor.items.get(i) ?? null);
  context.hands.items = context.hands.items.filter(i => i !== null);
  context.hands.augments = actor.system.augmentSlots.equipped.hands.map(i => actor.items.get(i) ?? null);
  context.hands.augments = context.hands.augments.filter(i => i !== null);

  context.ring = {};
  context.ring.evolution = actor.system.evolution.ring;
  context.ring.unaugmentable = actor.system.armors.unaugmentable.ring;
  context.ring.unequippable = actor.system.armors.unequippable.ring;
  context.ring.specialty = actor.system.armors.specialty.ring;
  context.ring.items = actor.system.equipmentSlots.equipped.ring.map(i => actor.items.get(i) ?? null);
  context.ring.items = context.ring.items.filter(i => i !== null);
  context.ring.augments = actor.system.augmentSlots.equipped.ring.map(i => actor.items.get(i) ?? null);
  context.ring.augments = context.ring.augments.filter(i => i !== null);

  context.waist = {};
  context.waist.evolution = actor.system.evolution.waist;
  context.waist.unaugmentable = actor.system.armors.unaugmentable.waist;
  context.waist.unequippable = actor.system.armors.unequippable.waist;
  context.waist.specialty = actor.system.armors.specialty.waist;
  context.waist.items = actor.system.equipmentSlots.equipped.waist.map(i => actor.items.get(i) ?? null);
  context.waist.items = context.waist.items.filter(i => i !== null);
  context.waist.augments = actor.system.augmentSlots.equipped.waist.map(i => actor.items.get(i) ?? null);
  context.waist.augments = context.waist.augments.filter(i => i !== null);

  context.feet = {};
  context.feet.evolution = actor.system.evolution.feet;
  context.feet.unaugmentable = actor.system.armors.unaugmentable.feet;
  context.feet.unequippable = actor.system.armors.unequippable.feet;
  context.feet.specialty = actor.system.armors.specialty.feet;
  context.feet.items = actor.system.equipmentSlots.equipped.feet.map(i => actor.items.get(i) ?? null);
  context.feet.items = context.feet.items.filter(i => i !== null);
  context.feet.augments = actor.system.augmentSlots.equipped.feet.map(i => actor.items.get(i) ?? null);
  context.feet.augments = context.feet.augments.filter(i => i !== null);

  return context;
}