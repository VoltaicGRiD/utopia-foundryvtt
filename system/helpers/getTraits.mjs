export function getTrait(trait, data = {}) {
  const lower = trait.toLowerCase();

  const allTraits = {
    ...JSON.parse(game.settings.get("utopia", "advancedSettings.traits")),
    ...JSON.parse(game.settings.get("utopia", "advancedSettings.subtraits"))
  }

  const correctTrait = {};

  for (const [key, value] of Object.entries(allTraits)) {
    if ([value.name, value.short, value.long].includes(lower)) {
      correctTrait = value;
    }
  }

  return allTraits[trait] || data;
}