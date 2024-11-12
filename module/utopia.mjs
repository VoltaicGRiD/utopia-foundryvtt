// Import document classes.
import { UtopiaActor } from './documents/actor.mjs';
import { UtopiaItem } from './documents/item.mjs';
// Import sheet classes.
import { UtopiaActorSheet } from './sheets/actor-sheet.mjs';
import { UtopiaItemSheet } from './sheets/item-sheet.mjs';
import { UtopiaOptionsSheet } from './sheets/options-sheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { UTOPIA } from './helpers/config.mjs';
import isNumeric from './helpers/numeric.mjs';
import searchTraits from './helpers/searchTraits.mjs';

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', function () {
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.utopia = {
    UtopiaActor,
    UtopiaItem,
    rollItemMacro,
    itemDrop
  };

  // Add custom constants for configuration.
  CONFIG.UTOPIA = UTOPIA;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: '3d6 + @traits.agi.subtraits.spd.mod',
    decimals: 2,
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = UtopiaActor;
  CONFIG.Item.documentClass = UtopiaItem;

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('utopia', UtopiaActorSheet, {
    makeDefault: true,
    label: 'UTOPIA.SheetLabels.Actor',
  });
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('utopia', UtopiaItemSheet, {
    makeDefault: true,
    label: 'UTOPIA.SheetLabels.Item',
  });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));
  Hooks.on('dropActorSheetData', function(actor, sheet, data) {
    console.log(actor);
    if (actor.type == "talent") {
      console.log("Dropped on talent");
      return;
    }

    let item = game.items.get(data.uuid.split('.')[1])

    if (item.type == "species") {
      if (actor.items.contents.some(i => i.type == "species")) {
        ui.notifications.error("This actor already has a species. Remove it first to apply this one.");
        return false;
      }
      else {
        _handleSpeciesDrop(actor, item);
        return true;
      }
    }
  });
});

/* -------------------------------------------- */
/*  Actor - Item interaction                    */
/* -------------------------------------------- */

/**
 * Update actor data with necessary information from the item that
 * was dropped on the actor sheet.
 * @param {Object} actor 
 * @param {Object} item 
 */
async function _handleSpeciesDrop(actor, item) {
  let grants = item.system.grants;

  console.log(grants);

  try {
    if (grants.subtraits.indexOf(',') > -1) {
      let subtraits = grants.subtraits.split(',')
  
      subtraits.forEach(subtrait => {
        let parsed = String(subtrait.trim());
        let trait = searchTraits(actor.system.traits, parsed);

        console.log(parsed);
        console.log(trait);
  
        actor.update({
          system: {
            traits: {
              [trait]: {
                subtraits: {
                  [parsed]: {
                    gifted: true
                  }
                }
              }    
            }
          }
        })  
      })    
    }
  } catch {
    let points = actor.system.points.gifted;
    
    if (isNumeric(grants.subtraits)) {
      points += parseInt(grants.subtraits);
    }
    else {
      points += grants.subtraits;
    }

    actor.update({
      system: {
        points: {
          gifted: points
        }
      }
    })
  }

  actor.update({
    system: {
      species: item,
      block: grants['block'],
      dodge: grants['dodge'],
      attributes: {
        constitution: grants['constitution'],
        endurance: grants['endurance'],
        effervescence: grants['effervescence']
      }
    }
  })
}

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.utopia.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'utopia.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function itemDrop(itemUuid) {
  console.log(itemUuid);

  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };

  console.log(dropData);

  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}

