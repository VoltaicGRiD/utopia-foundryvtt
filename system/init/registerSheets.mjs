import { TalentTree } from "../../applications/item/talent-tree.mjs";
import { ItemSheet } from "../../applications/item/standard-sheet.mjs";
import { Character } from "../../applications/actor/character.mjs";
import { SpellSheet } from "../../applications/item/spell.mjs";
import { SpellFeatureSheet } from "../../applications/item/spell-feature.mjs";
import { NPC } from "../../applications/actor/npc.mjs";
import { Species } from "../../applications/item/species.mjs";
import { GearSheet } from "../../applications/item/gear.mjs";
import { Creature } from "../../applications/actor/creature.mjs";
import { GearFeatureSheet } from "../../applications/item/gear-feature.mjs";

export function registerItemSheets() {
  Items.registerSheet("utopia", TalentTree, {
    makeDefault: true,
    types: ["talentTree"],
    label: "UTOPIA.SheetLabels.talentTree",
  });
  Items.registerSheet("utopia", ItemSheet, {
    makeDefault: true,
    types: ["talent", "favor", "action", "generic", "body", "class", "kit", "quirk", "species-talent"],
    label: "UTOPIA.SheetLabels.talent",
  });
  Items.registerSheet("utopia", SpellSheet, {
    makeDefault: true,
    types: ["spell"],
    label: "UTOPIA.SheetLabels.spell",
  });
  Items.registerSheet("utopia", SpellFeatureSheet, {
    makeDefault: true,
    types: ["spellFeature"],
    label: "UTOPIA.SheetLabels.spellFeature",
  });
  Items.registerSheet("utopia", Species, {
    makeDefault: true,
    types: ["species"],
    label: "UTOPIA.SheetLabels.species",
  });
  Items.registerSheet("utopia", GearSheet, {
    makeDefault: true,
    types: ["gear"],
    label: "UTOPIA.SheetLabels.gear",
  });
  Items.registerSheet("gearFeature", GearFeatureSheet, {
    makeDefault: true,
    types: ["gearFeature"],
    label: "UTOPIA.SheetLabels.gearFeature",
  });
}

export function registerActorSheets() {
  Actors.registerSheet("utopia", Character, {
    makeDefault: true,
    types: ["character"],
    label: "UTOPIA.SheetLabels.character",
  });
  Actors.registerSheet("utopia", NPC, {
    makeDefault: true,
    types: ["npc"],
    label: "UTOPIA.SheetLabels.character",
  });
  Actors.registerSheet("utopia", Creature, {
    makeDefault: true,
    types: ["creature"],
    label: "UTOPIA.SheetLabels.creature",
  });
}