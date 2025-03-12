import * as ItemModels from "../../models/item/_models.mjs";
import * as ActorModels from "../../models/actor/_models.mjs";

export function registerItemDataModels() {
  CONFIG.Item.dataModels = {
    action: ItemModels.Action,
    kit: ItemModels.Kit,
    quirk: ItemModels.Quirk,
    body: ItemModels.Body,
    class: ItemModels.Class,
    favor: ItemModels.Favor,
    generic: ItemModels.GenericItem,
    species: ItemModels.Species,
    talentTree: ItemModels.TalentTree,
    talent: ItemModels.Talent,
    spell: ItemModels.Spell,
    spellFeature: ItemModels.SpellFeature,
  }
}

export function registerActorDataModels() {
  CONFIG.Actor.dataModels = {
    character: ActorModels.Character,
    npc: ActorModels.NPC
  }
}