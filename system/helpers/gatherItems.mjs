export async function gatherItems({ type, gatherFolders = true, gatherFromActor = true, gatherFromWorld = true }) {
  const allItems = [];

  // Filter all packs to get only those that are Item compendiums
  const itemPacks = game.packs.filter(pack => pack.metadata.type === 'Item');

  for (const pack of itemPacks) {
    // Load the full documents for spells of type 'spellFeature'
    const spells = await pack.getDocuments({ type: type });

    // We don't need to clone these spells, since we can't modify them from spellcrafting
    allItems.push(...spells);
  }
   
  if (gatherFromWorld) {
    // Get all world items of type spell
    const worldItems = [].concat(...Array.from(game.items.filter(i => i.type === type)));
    allItems.push(...worldItems);
  }

  if (gatherFromActor) {
  // Get all actor owned spells
    const actorItems = [].concat(...Array.from(game.actors.map(a => a.items.filter(i => i.type === type))))
    allItems.push(...actorItems);
  }

  if (gatherFolders) {
    // Get all folders of type spell
    allItems.forEach(i => i._folder = foundry.utils.deepClone(i.folder) ?? {
      name: "Uncategorized",
      color: {
        rgb: [0, 0, 0],
        css: "#000000"
      }
    });
  }
  
  return allItems;
}