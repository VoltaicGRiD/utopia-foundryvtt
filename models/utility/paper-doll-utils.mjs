export function getPaperDollContext(actor) {
  // If we have direct access to the system data instead of the actor, we need to go up a level
  if (actor.augments)
    actor = actor.parent;

  const context = {};

  context.head = {};
  context.head.augments = actor.system.augments.head.map(i => actor.items.get(i));
  context.head.evolution = actor.system.evolution.head;
  context.head.unaugmentable = actor.system.armors.unaugmentable.head;
  context.head.unequippable = actor.system.armors.unequippable.head;
  context.head.specialty = actor.system.armors.specialty.head;
  context.head.items = actor.system.equipmentSlots.head.map(i => actor.items.get(i));
  context.head.augments = actor.system.augments.head.map(i => actor.items.get(i));

  context.neck = {};
  context.neck.augments = actor.system.augments.neck.map(i => actor.items.get(i));
  context.neck.evolution = actor.system.evolution.neck;
  context.neck.unaugmentable = actor.system.armors.unaugmentable.neck;
  context.neck.unequippable = actor.system.armors.unequippable.neck;
  context.neck.specialty = actor.system.armors.specialty.neck;
  context.neck.items = actor.system.equipmentSlots.neck.map(i => actor.items.get(i));
  context.neck.augments = actor.system.augments.neck.map(i => actor.items.get(i));

  context.chest = {};
  context.chest.augments = actor.system.augments.chest.map(i => actor.items.get(i));
  context.chest.evolution = actor.system.evolution.chest;
  context.chest.unaugmentable = actor.system.armors.unaugmentable.chest;
  context.chest.unequippable = actor.system.armors.unequippable.chest;
  context.chest.specialty = actor.system.armors.specialty.chest;
  context.chest.items = actor.system.equipmentSlots.chest.map(i => actor.items.get(i));
  context.chest.augments = actor.system.augments.chest.map(i => actor.items.get(i));

  context.back = {};
  context.back.augments = actor.system.augments.back.map(i => actor.items.get(i));
  context.back.evolution = actor.system.evolution.back;
  context.back.unaugmentable = actor.system.armors.unaugmentable.back;
  context.back.unequippable = actor.system.armors.unequippable.back;
  context.back.specialty = actor.system.armors.specialty.back;
  context.back.items = actor.system.equipmentSlots.back.map(i => actor.items.get(i));
  context.back.augments = actor.system.augments.back.map(i => actor.items.get(i));

  context.hands = {};
  context.hands.augments = actor.system.augments.hands.map(i => actor.items.get(i));
  context.hands.evolution = actor.system.evolution.hands;
  context.hands.unaugmentable = actor.system.armors.unaugmentable.hands;
  context.hands.unequippable = actor.system.armors.unequippable.hands;
  context.hands.specialty = actor.system.armors.specialty.hands;
  context.hands.items = actor.system.equipmentSlots.hands.map(i => actor.items.get(i));
  context.hands.augments = actor.system.augments.hands.map(i => actor.items.get(i));

  context.ring = {};
  context.ring.augments = actor.system.augments.ring.map(i => actor.items.get(i));
  context.ring.evolution = actor.system.evolution.ring;
  context.ring.unaugmentable = actor.system.armors.unaugmentable.ring;
  context.ring.unequippable = actor.system.armors.unequippable.ring;
  context.ring.specialty = actor.system.armors.specialty.ring;
  context.ring.items = actor.system.equipmentSlots.ring.map(i => actor.items.get(i));
  context.ring.augments = actor.system.augments.ring.map(i => actor.items.get(i));

  context.waist = {};
  context.waist.augments = actor.system.augments.waist.map(i => actor.items.get(i));
  context.waist.evolution = actor.system.evolution.waist;
  context.waist.unaugmentable = actor.system.armors.unaugmentable.waist;
  context.waist.unequippable = actor.system.armors.unequippable.waist;
  context.waist.specialty = actor.system.armors.specialty.waist;
  context.waist.items = actor.system.equipmentSlots.waist.map(i => actor.items.get(i));
  context.waist.augments = actor.system.augments.waist.map(i => actor.items.get(i));

  context.feet = {};
  context.feet.augments = actor.system.augments.feet.map(i => actor.items.get(i));
  context.feet.evolution = actor.system.evolution.feet;
  context.feet.unaugmentable = actor.system.armors.unaugmentable.feet;
  context.feet.unequippable = actor.system.armors.unequippable.feet;
  context.feet.specialty = actor.system.armors.specialty.feet;
  context.feet.items = actor.system.equipmentSlots.feet.map(i => actor.items.get(i));
  context.feet.augments = actor.system.augments.feet.map(i => actor.items.get(i));

  return context;
}