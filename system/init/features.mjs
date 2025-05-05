export function registerFeatures(settings) {
  CONFIG.UTOPIA.FEATURES = CONFIG.UTOPIA.FEATURES || {};
  CONFIG.UTOPIA.FEATURES.FastWeapon = FastWeapon(settings);
  // CONFIG.UTOPIA.FEATURES.ModerateWeapon = ModerateWeapon;
  // CONFIG.UTOPIA.FEATURES.SlowWeapon = SlowWeapon;
  // CONFIG.UTOPIA.FEATURES.ChestArmor = ChestArmor;
  // CONFIG.UTOPIA.FEATURES.HeadArmor = HeadArmor;
  // CONFIG.UTOPIA.FEATURES.HandsArmor = HandsArmor;
  // CONFIG.UTOPIA.FEATURES.FeetArmor = FeetArmor;
  // CONFIG.UTOPIA.FEATURES.Shield = Shield;
}

/*
Notes: 

[value] - The value of the feature, which can be a string or number.
  - The value can be a number, a boolean value, or a string that represents a formula or a special value.
  - If the value is exactly "X", it means the value is variable based on the number of stacks, where 'X' is the number of stacks (e.g., "X" w/ 3 stacks = 3).
    - Only used with [handler] "override"

[handler] - The function to call when the feature is applied.
  - "Xd4" means the value is a dice roll, where 'X' is the number of stacks (e.g., "Xd4" w/ 3 stacks = "3d4").
  - "override" means the value replaces the existing value.
  - "X/X" means the value is a range, where 'X' is the number of stacks (e.g., "1/1" w/ 2 stacks = "2/2").
  - "[operator]X" means the value is manipulated by the operator, where 'X' is the number of stacks (e.g., "+2" w/ 3 stacks = "+6").
  - "[operator][number]X" means the value is multiplied, where 'X' is the number of stacks (e.g., "*4X" w/ 3 stacks = "*12", or "/2X" w/ 3 stacks = "/6").
  - special: 
    - "array" means the the value is appended to an array for each stack (e.g., "array" w/ 2 stacks = ["value1", "value2"]).
    - "distributed" means the value (including stacks) is distributed across the options upon crafting (e.g., "distributed" w/ 12 stacks = {option1: 4, option2: 3, option3: 5}).

[cost] - The cost of the feature in RP, material, refinement, and power.
  - special:
    - RP is a string: "X" means the cost is variable based on the number of stacks, rounded up (e.g., "RP: -10/X" w/ 3 stacks = -4 RP).

[minimums] - Array of objects that define minimum requirements for the feature to be applicable.
  - key: The key to check against the item's data.
  - value: The value to compare against.
  - comparison: The comparison operator to use (e.g., "==", ">=", etc.).
[conditions] - Array of objects that define conditions for the feature to be applicable.
  - key: The key to check against the item's data.
  - value: The value to compare against.
  - comparison: The comparison operator to use (e.g., "==", "has", "!has").
  - output: The value to output if the condition is met.
[counters] - Array of objects that define counters for the feature.
  - type: The type of counter (e.g., "test", "damage").
  - performer: The entity that performs the counter (e.g., "target", "attacker").
  - modifier: The modifier to apply to the counter.
  - against: The key to check against the item's data for the counter.
  - comparison: The comparison operator to use for the counter.
  - success: The action to take if the counter is successful.
  - failure: The action to take if the counter fails.
*/

const FastWeapon = (settings) => {
  return {
    slam: {
      name: "UTOPIA.Features.Slam",
      stackable: true,
      maxStacks: 0,
      key: "damage",
      value: "1d4",
      handler: "Xd4",
      cost: {
        RP: 10,
        material: 1,
      },
    },
    harsh: {
      name: "UTOPIA.Features.Harsh",
      stackable: true,
      maxStacks: 0,
      key: "damage",
      value: "1d4",
      handler: "Xd6",
      cost: {
        RP: 15,
        power: 1
      },
      options: {
        ...Object.entries(settings.damageTypes).reduce((acc, [key, value]) => {
          if (!value.gearDamageType) return acc; // Only include harsh subtraits
          acc[key] = {
            name: value.label,
            key: "damageType",
            value: key,
          };
          return acc;
        }, {})
        // TODO: Cannot get 'game.settings.get' here, as it is not available during the module's initialization phase.
        // ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
        //   if (!value.gearDamageType) return acc; // Only include harsh subtraits
        //   acc[key] = {
        //     name: value.label,
        //     key: "damageType",
        //     value: key,
        //   };
        //   return acc;
        // }, {}),
      }
    },
    compact: {
      name: "UTOPIA.Features.Compact",
      stackable: false,
      maxStacks: 1,
      key: "slots",
      value: 1,
      handler: "override",
      componentsPerStack: true,
      cost: {
        RP: 10,
        refinement: 1,
      },
      incompatible: ["awkward", "inordinate"],
    },
    elegant: {
      name: "UTOPIA.Features.Elegant",
      stackable: false,
      maxStacks: 1,
      key: "damageModifier",
      minimums: [{
        key: "rarity",
        value: 1, // Rarity 1 is Common
        comparison: ">="
      }],
      conditions: [{
        key: "ranged",
        value: false,
        comparison: "==",
        output: "@pow.mod"
      }, {
        key: "ranged",
        value: true,
        comparison: "==",
        output: "@dex.mod"
      }],
      handler: "override",
      cost: {
        RP: 60,
        material: 1,
      },
      incompatible: ["extravagant"],
    },
    extravagant: {
      name: "UTOPIA.Features.Extravagant",
      stackable: false,
      maxStacks: 1,
      key: "damageModifier",
      minimums: [{
        key: "rarity",
        value: 2, // Rarity 2 is Extraordinary
        comparison: ">="
      }],
      handler: "override",
      cost: {
        RP: 80,
        refinement: 1,
      },
      incompatible: ["elegant"],
      options: {
        ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.subtraits"))).reduce((acc, [key, value]) => {
          acc[key] = {
            name: value.label,
            key: "damageModifier",
            value: `@${key}.mod`,
          };
          return acc;
        }, {})
      }
    },
    reach: {
      name: "UTOPIA.Features.Reach",
      stackable: true,
      maxStacks: 3,
      key: "range",
      value: "1/1",
      handler: "X/X",
      cost: {
        RP: 2,
        material: 1,
      },
      incompatible: ["range"],
    },
    range: {
      name: "UTOPIA.Features.Range",
      stackable: true,
      maxStacks: 0,
      key: "range",
      value: "5/10",
      handler: "X/X",
      cost: {
        RP: 5,
        refinement: 1,
      },
      incompatible: ["reach"],
    },
    assisted: {
      name: "UTOPIA.Features.Assisted",
      stackable: true,
      maxStacks: 0,
      key: "accuracyModifier",
      value: "/2",
      handler: "/2X",
      cost: {
        RP: 5,
        refinement: 1,
      },
      requires: ["range"],
    },
    poisonous: {
      name: "UTOPIA.Features.Poisonous",
      stackable: false,
      maxStacks: 1,
      key: "ignoreSHP",
      minimums: [{
        key: "rarity",
        value: 1, // Rarity 1 is Common
        comparison: ">="
      }],
      conditions: [{
        _comment: "If the target does not have the construct tag, this feature applies.",
        key: "target.tags",
        value: "construct",
        comparison: "!has",
        output: true
      }, {
        _comment: "If the target has the construct tag, this feature does not apply.",
        key: "target.tags",
        value: "construct", 
        comparison: "has",
        output: false
      }],
      handler: "override",
      cost: {
        RP: 55,
        refinement: 2,
      },
      incompatible: ["wounding", "nonLethal"],
    },
    wounding: {
      name: "UTOPIA.Features.Wounding",
      stackable: false,
      maxStacks: 1,
      key: "ignoreSHP",
      minimums: [{
        key: "rarity",
        value: 2, // Rarity 2 is Extraordinary
        comparison: ">="
      }],
      value: true,
      handler: "override",
      cost: {
        RP: 70,
        refinement: 2,
      },
      incompatible: ["poisonous", "nonLethal"],
    },
    exhausting: {
      name: "UTOPIA.Features.Exhausting",
      stackable: false,
      maxStacks: 1,
      key: "exhausting",
      value: true,
      handler: "override",
      cost: {
        RP: 50,
        refinement: 2,
      },
    },
    penetrative: {
      name: "UTOPIA.Features.Penetrative",
      stackable: true,
      maxStacks: 1,
      key: "penetrative",
      minimums: [{
        key: "rarity",
        value: 2, // Rarity 2 is Extraordinary
        comparison: ">="
      }],
      value: true,
      handler: "array",
      cost: {
        RP: 80,
        refinement: 2,
      },
      options: {
        ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
          if (!value.penetrative) return acc; // Only include penetrative subtraits
          acc[key] = {
            name: value.label,
            key: "penetrative",
            value: key,
          };
          return acc;
        }, {})
      }
    },
    shipWrecker: {
      name: "UTOPIA.Features.ShipWrecker",
      stackable: false,
      maxStacks: 1,
      key: "shipWrecker",
      value: true,
      handler: "override",
      cost: {
        RP: 10,
        material: 1,
      },
    },
    sentient: {
      name: "UTOPIA.Features.Sentient",
      stackable: false,
      maxStacks: 1,
      key: "sentient",
      value: true,
      handler: "override",
      cost: {
        RP: 25,
        refinement: 1,
        power: 1
      },
    },
    blinding: {
      name: "UTOPIA.Features.Blinding",
      stackable: true,
      maxStacks: 0,
      key: "altActions",
      value: "*2",
      counters: [{
        type: "test", // Make a [test] (3d6 + [modifier]) against the [against], if [comparison] [success/failure]
        performer: "target",
        modifier: "@for.mod",
        against: "damageDealt",
        comparison: ">=",
        failure: {
          statusEffect: "blinded",
          duration: {
            turns: "X"
          }
        }
      }],
      handler: "*2X",
      componentsPerStack: true,
      cost: {
        RP: 15,
        power: 1
      },
    },
    confusing: {
      name: "UTOPIA.Features.Confusing",
      stackable: true,
      maxStacks: 0,
      key: "altActions",
      value: "*2",
      counters: [{
        type: "test", // Make a [test] (3d6 + [modifier]) against the [against], if [comparison] [success/failure]
        performer: "target",
        modifier: "@for.mod",
        against: "damageDealt",
        comparison: ">=",
        failure: {
          statusEffect: "dazed",
          duration: {
            turns: "X"
          }
        }
      }],
      handler: "*2X",
      componentsPerStack: true,
      cost: {
        RP: 30,
        refinement: 1,
        power: 1
      },
    },
    blasting: {
      name: "UTOPIA.Features.Blasting",
      stackable: false,
      maxStacks: 1,
      key: "blasting",
      value: true,
      handler: "override",
      cost: {
        RP: 70,
        power: 1
      },
      incompatible: ["booming"],
    },
    booming: {
      name: "UTOPIA.Features.Booming",
      stackable: false,
      maxStacks: 1,
      key: "booming",
      value: true,
      handler: "override",
      cost: {
        RP: 190,
        power: 2
      },
      incompatible: ["blasting"],
    },
    awkward: {
      name: "UTOPIA.Features.Awkward",
      stackable: false,
      maxStacks: 1,
      key: "slots",
      value: 9,
      handler: "override",
      cost: {
        RP: -10,
      },
      incompatible: ["compact", "inordinate"],
    },
    inordinate: {
      name: "UTOPIA.Features.Inordinate",
      stackable: false,
      maxStacks: 1,
      key: "slots",
      value: 27,
      handler: "override",
      cost: {
        RP: -30,
      },
      incompatible: ["awkward", "compact"],
    },
    unwieldy: {
      name: "UTOPIA.Features.Unwieldy",
      stackable: true,
      maxStacks: 6,
      key: "hands",
      value: 1,
      handler: "+X",
      cost: {
        RP: -10,
      },
    },
    armed: {
      name: "UTOPIA.Features.Armed",
      stackable: false,
      maxStacks: 1,
      key: "armed",
      value: true,
      handler: "override",
      cost: {
        RP: -20,
      },
    },
    sapping: {
      name: "UTOPIA.Features.Sapping",
      stackable: true,
      maxStacks: 0,
      key: "stamina",
      value: 1,
      handler: "+X",
      cost: {
        RP: -10,
      },
    },
    thorned: {
      name: "UTOPIA.Features.Thorned",
      stackable: true,
      maxStacks: 0,
      key: "returnedDamage",
      value: 1,
      handler: "+X",
      cost: {
        RP: -10,
      },
    },
    loaded: {
      name: "UTOPIA.Features.Loaded",
      stackable: true,
      maxStacks: 6,
      key: "charges",
      value: "X",
      handler: "override",
      cost: {
        RP: "-10/X",
      },
    },
    nonLethal: {
      name: "UTOPIA.Features.NonLethal",
      stackable: false,
      maxStacks: 1,
      key: "nonLethal",
      value: true,
      handler: "override",
      cost: {
        RP: -40,
      },
      incompatible: ["poisonous", "wounding"],
    }
  }
}

// const ModerateWeapon = {
//   slam: {
//     name: "UTOPIA.Features.Slam",
//     stackable: true,
//     maxStacks: 0,
//     key: "damage",
//     value: "1d4",
//     handler: "Xd4",
//     cost: {
//       RP: 5,
//       material: 1,
//     },
//   },
//   harsh: {
//     name: "UTOPIA.Features.Harsh",
//     stackable: true,
//     maxStacks: 0,
//     key: "damage",
//     value: "1d4",
//     handler: "Xd6",
//     cost: {
//       RP: 8,
//       power: 1
//     },
//     options: {
//       ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
//         if (!value.gearDamageType) return acc; // Only include harsh subtraits
//         acc[key] = {
//           name: value.label,
//           key: "damageType",
//           value: key,
//         };
//         return acc;
//       }, {}),
//     }
//   },
//   compact: {
//     name: "UTOPIA.Features.Compact",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 1,
//     handler: "override",
//     componentsPerStack: true,
//     cost: {
//       RP: 10,
//       refinement: 1,
//     },
//     incompatible: ["awkward", "inordinate"],
//   },
//   elegant: {
//     name: "UTOPIA.Features.Elegant",
//     stackable: false,
//     maxStacks: 1,
//     key: "damageModifier",
//     minimums: [{
//       key: "rarity",
//       value: 1, // Rarity 1 is Common
//       comparison: ">="
//     }],
//     conditions: [{
//       key: "ranged",
//       value: false,
//       comparison: "==",
//       output: "@pow.mod"
//     }, {
//       key: "ranged",
//       value: true,
//       comparison: "==",
//       output: "@dex.mod"
//     }],
//     handler: "override",
//     cost: {
//       RP: 30,
//       material: 1,
//     },
//     incompatible: ["extravagant"],
//   },
//   extravagant: {
//     name: "UTOPIA.Features.Extravagant",
//     stackable: false,
//     maxStacks: 1,
//     key: "damageModifier",
//     minimums: [{
//       key: "rarity",
//       value: 2, // Rarity 2 is Extraordinary
//       comparison: ">="
//     }],
//     handler: "override",
//     cost: {
//       RP: 45,
//       refinement: 1,
//     },
//     incompatible: ["elegant"],
//     options: {
//       ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.subtraits"))).reduce((acc, [key, value]) => {
//         acc[key] = {
//           name: value.label,
//           key: "damageModifier",
//           value: `@${key}.mod`,
//         };
//         return acc;
//       }, {})
//     }
//   },
//   reach: {
//     name: "UTOPIA.Features.Reach",
//     stackable: true,
//     maxStacks: 3,
//     key: "range",
//     value: "1/1",
//     handler: "X/X",
//     cost: {
//       RP: 2,
//       material: 1,
//     },
//     incompatible: ["range"],
//   },
//   range: {
//     name: "UTOPIA.Features.Range",
//     stackable: true,
//     maxStacks: 0,
//     key: "range",
//     value: "5/10",
//     handler: "X/X",
//     cost: {
//       RP: 4,
//       refinement: 1,
//     },
//     incompatible: ["reach"],
//   },
//   assisted: {
//     name: "UTOPIA.Features.Assisted",
//     stackable: true,
//     maxStacks: 0,
//     key: "accuracyModifier",
//     value: "/2",
//     handler: "/2X",
//     cost: {
//       RP: 5,
//       refinement: 1,
//     },
//     requires: ["range"],
//   },
//   poisonous: {
//     name: "UTOPIA.Features.Poisonous",
//     stackable: false,
//     maxStacks: 1,
//     key: "ignoreSHP",
//     minimums: [{
//       key: "rarity",
//       value: 1, // Rarity 1 is Common
//       comparison: ">="
//     }],
//     conditions: [{
//       _comment: "If the target does not have the construct tag, this feature applies.",
//       key: "target.tags",
//       value: "construct",
//       comparison: "!has",
//       output: true
//     }, {
//       _comment: "If the target has the construct tag, this feature does not apply.",
//       key: "target.tags",
//       value: "construct", 
//       comparison: "has",
//       output: false
//     }],
//     handler: "override",
//     cost: {
//       RP: 55,
//       refinement: 2,
//     },
//     incompatible: ["wounding", "nonLethal"],
//   },
//   wounding: {
//     name: "UTOPIA.Features.Wounding",
//     stackable: false,
//     maxStacks: 1,
//     key: "ignoreSHP",
//     minimums: [{
//       key: "rarity",
//       value: 2, // Rarity 2 is Extraordinary
//       comparison: ">="
//     }],
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 70,
//       refinement: 2,
//     },
//     incompatible: ["poisonous", "nonLethal"],
//   },
//   exhausting: {
//     name: "UTOPIA.Features.Exhausting",
//     stackable: false,
//     maxStacks: 1,
//     key: "exhausting",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 50,
//       refinement: 2,
//     },
//   },
//   penetrative: {
//     name: "UTOPIA.Features.Penetrative",
//     stackable: true,
//     maxStacks: 1,
//     key: "penetrative",
//     minimums: [{
//       key: "rarity",
//       value: 2, // Rarity 2 is Extraordinary
//       comparison: ">="
//     }],
//     value: true,
//     handler: "array",
//     cost: {
//       RP: 60,
//       refinement: 2,
//     },
//     options: {
//       ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
//         if (!value.penetrative) return acc; // Only include penetrative subtraits
//         acc[key] = {
//           name: value.label,
//           key: "penetrative",
//           value: key,
//         };
//         return acc;
//       }, {})
//     }
//   },
//   shipWrecker: {
//     name: "UTOPIA.Features.ShipWrecker",
//     stackable: false,
//     maxStacks: 1,
//     key: "shipWrecker",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 8,
//       material: 1,
//     },
//   },
//   sentient: {
//     name: "UTOPIA.Features.Sentient",
//     stackable: false,
//     maxStacks: 1,
//     key: "sentient",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 25,
//       refinement: 1,
//       power: 1
//     },
//   },
//   blinding: {
//     name: "UTOPIA.Features.Blinding",
//     stackable: true,
//     maxStacks: 0,
//     key: "altActions",
//     value: "*2",
//     counters: [{
//       type: "test", // Make a [test] (3d6 + [modifier]) against the [against], if [comparison] [success/failure]
//       performer: "target",
//       modifier: "@for.mod",
//       against: "damageDealt",
//       comparison: ">=",
//       failure: {
//         statusEffect: "blinded",
//         duration: {
//           turns: "X"
//         }
//       }
//     }],
//     handler: "*2X",
//     componentsPerStack: true,
//     cost: {
//       RP: 15,
//       power: 1
//     },
//   },
//   confusing: {
//     name: "UTOPIA.Features.Confusing",
//     stackable: true,
//     maxStacks: 0,
//     key: "altActions",
//     value: "*2",
//     counters: [{
//       type: "test", // Make a [test] (3d6 + [modifier]) against the [against], if [comparison] [success/failure]
//       performer: "target",
//       modifier: "@for.mod",
//       against: "damageDealt",
//       comparison: ">=",
//       failure: {
//         statusEffect: "dazed",
//         duration: {
//           turns: "X"
//         }
//       }
//     }],
//     handler: "*2X",
//     componentsPerStack: true,
//     cost: {
//       RP: 30,
//       refinement: 1,
//       power: 1
//     },
//   },
//   blasting: {
//     name: "UTOPIA.Features.Blasting",
//     stackable: false,
//     maxStacks: 1,
//     key: "blasting",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 70,
//       power: 1
//     },
//     incompatible: ["booming"],
//   },
//   booming: {
//     name: "UTOPIA.Features.Booming",
//     stackable: false,
//     maxStacks: 1,
//     key: "booming",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 190,
//       power: 2
//     },
//     incompatible: ["blasting"],
//   },
//   awkward: {
//     name: "UTOPIA.Features.Awkward",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 9,
//     handler: "override",
//     cost: {
//       RP: -10,
//     },
//     incompatible: ["compact", "inordinate"],
//   },
//   inordinate: {
//     name: "UTOPIA.Features.Inordinate",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 27,
//     handler: "override",
//     cost: {
//       RP: -30,
//     },
//     incompatible: ["awkward", "compact"],
//   },
//   unwieldy: {
//     name: "UTOPIA.Features.Unwieldy",
//     stackable: true,
//     maxStacks: 6,
//     key: "hands",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: -10,
//     },
//   },
//   armed: {
//     name: "UTOPIA.Features.Armed",
//     stackable: false,
//     maxStacks: 1,
//     key: "armed",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: -15,
//     },
//   },
//   sapping: {
//     name: "UTOPIA.Features.Sapping",
//     stackable: true,
//     maxStacks: 0,
//     key: "stamina",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: -5,
//     },
//   },
//   thorned: {
//     name: "UTOPIA.Features.Thorned",
//     stackable: true,
//     maxStacks: 0,
//     key: "returnedDamage",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: -5,
//     },
//   },
//   loaded: {
//     name: "UTOPIA.Features.Loaded",
//     stackable: true,
//     maxStacks: 6,
//     key: "charges",
//     value: "X",
//     handler: "override",
//     cost: {
//       RP: "-10/X",
//     },
//   },
//   nonLethal: {
//     name: "UTOPIA.Features.NonLethal",
//     stackable: false,
//     maxStacks: 1,
//     key: "nonLethal",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: -30,
//     },
//     incompatible: ["poisonous", "wounding"],
//   }
// }

// const SlowWeapon = {
//   slam: {
//     name: "UTOPIA.Features.Slam",
//     stackable: true,
//     maxStacks: 0,
//     key: "damage",
//     value: "1d4",
//     handler: "Xd4",
//     cost: {
//       RP: 3,
//       material: 1,
//     },
//   },
//   harsh: {
//     name: "UTOPIA.Features.Harsh",
//     stackable: true,
//     maxStacks: 0,
//     key: "damage",
//     value: "1d4",
//     handler: "Xd6",
//     cost: {
//       RP: 4,
//       power: 1
//     },
//     options: {
//       ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
//         if (!value.gearDamageType) return acc; // Only include harsh subtraits
//         acc[key] = {
//           name: value.label,
//           key: "damageType",
//           value: key,
//         };
//         return acc;
//       }, {}),
//     }
//   },
//   compact: {
//     name: "UTOPIA.Features.Compact",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 1,
//     handler: "override",
//     componentsPerStack: true,
//     cost: {
//       RP: 10,
//       refinement: 1,
//     },
//     incompatible: ["awkward", "inordinate"],
//   },
//   elegant: {
//     name: "UTOPIA.Features.Elegant",
//     stackable: false,
//     maxStacks: 1,
//     key: "damageModifier",
//     minimums: [{
//       key: "rarity",
//       value: 1, // Rarity 1 is Common
//       comparison: ">="
//     }],
//     conditions: [{
//       key: "ranged",
//       value: false,
//       comparison: "==",
//       output: "@pow.mod"
//     }, {
//       key: "ranged",
//       value: true,
//       comparison: "==",
//       output: "@dex.mod"
//     }],
//     handler: "override",
//     cost: {
//       RP: 10,
//       material: 1,
//     },
//     incompatible: ["extravagant"],
//   },
//   extravagant: {
//     name: "UTOPIA.Features.Extravagant",
//     stackable: false,
//     maxStacks: 1,
//     key: "damageModifier",
//     minimums: [{
//       key: "rarity",
//       value: 2, // Rarity 2 is Extraordinary
//       comparison: ">="
//     }],
//     handler: "override",
//     cost: {
//       RP: 20,
//       refinement: 1,
//     },
//     incompatible: ["elegant"],
//     options: {
//       ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.subtraits"))).reduce((acc, [key, value]) => {
//         acc[key] = {
//           name: value.label,
//           key: "damageModifier",
//           value: `@${key}.mod`,
//         };
//         return acc;
//       }, {})
//     }
//   },
//   reach: {
//     name: "UTOPIA.Features.Reach",
//     stackable: true,
//     maxStacks: 3,
//     key: "range",
//     value: "1/1",
//     handler: "X/X",
//     cost: {
//       RP: 1,
//       material: 1,
//     },
//     incompatible: ["range"],
//   },
//   range: {
//     name: "UTOPIA.Features.Range",
//     stackable: true,
//     maxStacks: 0,
//     key: "range",
//     value: "5/10",
//     handler: "X/X",
//     cost: {
//       RP: 3,
//       refinement: 1,
//     },
//     incompatible: ["reach"],
//   },
//   assisted: {
//     name: "UTOPIA.Features.Assisted",
//     stackable: true,
//     maxStacks: 0,
//     key: "accuracyModifier",
//     value: "/2",
//     handler: "/2X",
//     cost: {
//       RP: 5,
//       refinement: 1,
//     },
//     requires: ["range"],
//   },
//   poisonous: {
//     name: "UTOPIA.Features.Poisonous",
//     stackable: false,
//     maxStacks: 1,
//     key: "ignoreSHP",
//     minimums: [{
//       key: "rarity",
//       value: 1, // Rarity 1 is Common
//       comparison: ">="
//     }],
//     conditions: [{
//       _comment: "If the target does not have the construct tag, this feature applies.",
//       key: "target.tags",
//       value: "construct",
//       comparison: "!has",
//       output: true
//     }, {
//       _comment: "If the target has the construct tag, this feature does not apply.",
//       key: "target.tags",
//       value: "construct", 
//       comparison: "has",
//       output: false
//     }],
//     handler: "override",
//     cost: {
//       RP: 55,
//       refinement: 2,
//     },
//     incompatible: ["wounding", "nonLethal"],
//   },
//   wounding: {
//     name: "UTOPIA.Features.Wounding",
//     stackable: false,
//     maxStacks: 1,
//     key: "ignoreSHP",
//     minimums: [{
//       key: "rarity",
//       value: 2, // Rarity 2 is Extraordinary
//       comparison: ">="
//     }],
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 70,
//       refinement: 2,
//     },
//     incompatible: ["poisonous", "nonLethal"],
//   },
//   exhausting: {
//     name: "UTOPIA.Features.Exhausting",
//     stackable: false,
//     maxStacks: 1,
//     key: "exhausting",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 50,
//       refinement: 2,
//     },
//   },
//   penetrative: {
//     name: "UTOPIA.Features.Penetrative",
//     stackable: true,
//     maxStacks: 1,
//     key: "penetrative",
//     minimums: [{
//       key: "rarity",
//       value: 2, // Rarity 2 is Extraordinary
//       comparison: ">="
//     }],
//     value: true,
//     handler: "array",
//     cost: {
//       RP: 40,
//       refinement: 2,
//     },
//     options: {
//       ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
//         if (!value.penetrative) return acc; // Only include penetrative subtraits
//         acc[key] = {
//           name: value.label,
//           key: "penetrative",
//           value: key,
//         };
//         return acc;
//       }, {})
//     }
//   },
//   shipWrecker: {
//     name: "UTOPIA.Features.ShipWrecker",
//     stackable: false,
//     maxStacks: 1,
//     key: "shipWrecker",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 5,
//       material: 1,
//     },
//   },
//   sentient: {
//     name: "UTOPIA.Features.Sentient",
//     stackable: false,
//     maxStacks: 1,
//     key: "sentient",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 25,
//       refinement: 1,
//       power: 1
//     },
//   },
//   blinding: {
//     name: "UTOPIA.Features.Blinding",
//     stackable: true,
//     maxStacks: 0,
//     key: "altActions",
//     value: "*2",
//     counters: [{
//       type: "test", // Make a [test] (3d6 + [modifier]) against the [against], if [comparison] [success/failure]
//       performer: "target",
//       modifier: "@for.mod",
//       against: "damageDealt",
//       comparison: ">=",
//       failure: {
//         statusEffect: "blinded",
//         duration: {
//           turns: "X"
//         }
//       }
//     }],
//     handler: "*2X",
//     componentsPerStack: true,
//     cost: {
//       RP: 15,
//       power: 1
//     },
//   },
//   confusing: {
//     name: "UTOPIA.Features.Confusing",
//     stackable: true,
//     maxStacks: 0,
//     key: "altActions",
//     value: "*2",
//     counters: [{
//       type: "test", // Make a [test] (3d6 + [modifier]) against the [against], if [comparison] [success/failure]
//       performer: "target",
//       modifier: "@for.mod",
//       against: "damageDealt",
//       comparison: ">=",
//       failure: {
//         statusEffect: "dazed",
//         duration: {
//           turns: "X"
//         }
//       }
//     }],
//     handler: "*2X",
//     componentsPerStack: true,
//     cost: {
//       RP: 30,
//       refinement: 1,
//       power: 1
//     },
//   },
//   blasting: {
//     name: "UTOPIA.Features.Blasting",
//     stackable: false,
//     maxStacks: 1,
//     key: "blasting",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 70,
//       power: 1
//     },
//     incompatible: ["booming"],
//   },
//   booming: {
//     name: "UTOPIA.Features.Booming",
//     stackable: false,
//     maxStacks: 1,
//     key: "booming",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 190,
//       power: 2
//     },
//     incompatible: ["blasting"],
//   },
//   awkward: {
//     name: "UTOPIA.Features.Awkward",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 9,
//     handler: "override",
//     cost: {
//       RP: -10,
//     },
//     incompatible: ["compact", "inordinate"],
//   },
//   inordinate: {
//     name: "UTOPIA.Features.Inordinate",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 27,
//     handler: "override",
//     cost: {
//       RP: -30,
//     },
//     incompatible: ["awkward", "compact"],
//   },
//   unwieldy: {
//     name: "UTOPIA.Features.Unwieldy",
//     stackable: true,
//     maxStacks: 6,
//     key: "hands",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: -10,
//     },
//   },
//   armed: {
//     name: "UTOPIA.Features.Armed",
//     stackable: false,
//     maxStacks: 1,
//     key: "armed",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: -10,
//     },
//   },
//   sapping: {
//     name: "UTOPIA.Features.Sapping",
//     stackable: true,
//     maxStacks: 0,
//     key: "stamina",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: -2,
//     },
//   },
//   thorned: {
//     name: "UTOPIA.Features.Thorned",
//     stackable: true,
//     maxStacks: 0,
//     key: "returnedDamage",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: -2,
//     },
//   },
//   loaded: {
//     name: "UTOPIA.Features.Loaded",
//     stackable: true,
//     maxStacks: 6,
//     key: "charges",
//     value: "X",
//     handler: "override",
//     cost: {
//       RP: "-10/X",
//     },
//   },
//   nonLethal: {
//     name: "UTOPIA.Features.NonLethal",
//     stackable: false,
//     maxStacks: 1,
//     key: "nonLethal",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: -20,
//     },
//     incompatible: ["poisonous", "wounding"],
//   },
//   elaborate: {
//     name: "UTOPIA.Features.Elaborate",
//     stackable: false,
//     maxStacks: 1,
//     key: "actions",
//     value: 4,
//     handler: "override",
//     cost: {
//       RP: -20,
//     },
//   },
//   articulate: {
//     name: "UTOPIA.Features.Articulate",
//     stackable: false,
//     maxStacks: 1,
//     key: "actions",
//     value: 5,
//     handler: "override",
//     cost: {
//       RP: -30,
//     },
//   },
//   convoluted: {
//     name: "UTOPIA.Features.Convoluted",
//     stackable: false,
//     maxStacks: 1,
//     key: "actions",
//     value: 6,
//     handler: "override",
//     cost: {
//       RP: -40,
//     },
//   },
// }

// const ChestArmor = {
//   augmentable: {
//     name: "UTOPIA.Features.Augmentable",
//     stackable: false,
//     maxStacks: 1,
//     key: "augmentable",
//     minimums: [{
//       key: "rarity",
//       value: 1, // Rarity 1 is Common
//       comparison: ">="
//     }],
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 20,
//       refinement: 1,
//     },
//   },
//   defensive: {
//     name: "UTOPIA.Features.Defensive",
//     stackable: true,
//     maxStacks: 0,
//     key: "defenses",
//     value: 1,
//     handler: "distributed",
//     cost: {
//       RP: 4,
//       material: 1,
//     },
//     options: {
//       ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
//         if (!value.defensive) return acc; // Only include defensive damage types
//         acc[key] = {
//           name: value.label,
//           key: "defenseModifier",
//           value: `+${value.value}`,
//         };
//         return acc;
//       }, {})
//     }
//   }, 
//   screen: {
//     name: "UTOPIA.Features.Screen",
//     stackable: true,
//     maxStacks: 0,
//     key: "defenses.psyche",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: 5,
//       material: 1,
//     }
//   },
//   guarded: {
//     name: "UTOPIA.Features.Guarded",
//     stackable: true,
//     maxStacks: 0,
//     key: "block.quantity",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: 40,
//       material: 1,
//     }
//   },
//   spry: {
//     name: "UTOPIA.Features.Spry",
//     stackable: true,
//     maxStacks: 0,
//     key: "dodge.quantity",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: 40,
//       refinement: 1,
//     },
//   },
//   magus: {
//     name: "UTOPIA.Features.Magus",
//     stackable: true,
//     maxStacks: 0,
//     key: "spellcasting.staminaDiscount",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: 15,
//       power: 1
//     },
//   },
//   compact: {
//     name: "UTOPIA.Features.Compact",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 1,
//     handler: "override",
//     componentsPerStack: true,
//     cost: {
//       RP: 10,
//       refinement: 1,
//     },
//     incompatible: ["awkward", "inordinate"],
//   },
//   sentient: {
//     name: "UTOPIA.Features.Sentient",
//     stackable: false,
//     maxStacks: 1,
//     key: "sentient",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 25,
//       refinement: 1,
//       power: 1
//     },
//   },
//   shrouded: {
//     name: "UTOPIA.Features.Shrouded",
//     stackable: false,
//     maxStacks: 1,
//     key: "shrouded",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 20,
//       material: 1,
//     },
//   },
//   aerial: {
//     name: "UTOPIA.Features.Aerial",
//     stackable: true,
//     maxStacks: 1,
//     key: "travel.air.speed",
//     minimums: [{
//       key: "travel.air.speed",
//       value: 1, // Minimum speed of 1
//       comparison: ">="
//     }],
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: 15,
//       power: 1
//     },
//   }, 
//   awkward: {
//     name: "UTOPIA.Features.Awkward",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 9,
//     handler: "override",
//     cost: {
//       RP: -10,
//     },
//     incompatible: ["compact", "inordinate"],
//   },
//   inordinate: {
//     name: "UTOPIA.Features.Inordinate",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 27,
//     handler: "override",
//     cost: {
//       RP: -30,
//     },
//     incompatible: ["awkward", "compact"],
//   },
//   tethered: {
//     name: "UTOPIA.Features.Tethered",
//     stackable: false,
//     maxStacks: 1,
//     key: "tethered",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: -20,
//     },
//   },
//   constricting: {
//     name: "UTOPIA.Features.Constricting",
//     stackable: false,
//     maxStacks: 1,
//     key: "constricting",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: -20,
//     },
//   },
//   corroded: {
//     name: "UTOPIA.Features.Corroded",
//     stackable: false,
//     maxStacks: 1,
//     key: "corroded",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: -40,
//     },
//   }
// }

// const HeadArmor = {
//   augmentable: {
//     name: "UTOPIA.Features.Augmentable",
//     stackable: false,
//     maxStacks: 1,
//     key: "augmentable",
//     minimums: [{
//       key: "rarity",
//       value: 1, // Rarity 1 is Common
//       comparison: ">="
//     }],
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 20,
//       refinement: 1,
//     },
//   },
//   defensive: {
//     name: "UTOPIA.Features.Defensive",
//     stackable: true,
//     maxStacks: 0,
//     key: "defenses",
//     value: 1,
//     handler: "distributed",
//     componentsLocked: true,
//     cost: {
//       RP: 4,
//       material: 1,
//     },
//     options: {
//       ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
//         if (!value.defensive) return acc; // Only include defensive damage types
//         acc[key] = {
//           name: value.label,
//           key: "defenseModifier",
//           value: `+${value.value}`,
//         };
//         return acc;
//       }, {})
//     }
//   }, 
//   screen: {
//     name: "UTOPIA.Features.Screen",
//     stackable: true,
//     maxStacks: 0,
//     key: "defenses.psyche",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: 5,
//       material: 1,
//     }
//   },
//   guarded: {
//     name: "UTOPIA.Features.Guarded",
//     stackable: true,
//     maxStacks: 0,
//     key: "block.quantity",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: 40,
//       material: 1,
//     }
//   },
//   spry: {
//     name: "UTOPIA.Features.Spry",
//     stackable: true,
//     maxStacks: 0,
//     key: "dodge.quantity",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: 40,
//       refinement: 1,
//     },
//   },
//   magus: {
//     name: "UTOPIA.Features.Magus",
//     stackable: true,
//     maxStacks: 0,
//     key: "spellcasting.staminaDiscount",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: 15,
//       power: 1
//     },
//   },
//   compact: {
//     name: "UTOPIA.Features.Compact",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 1,
//     handler: "override",
//     componentsPerStack: true,
//     cost: {
//       RP: 10,
//       refinement: 1,
//     },
//     incompatible: ["awkward", "inordinate"],
//   },
//   sentient: {
//     name: "UTOPIA.Features.Sentient",
//     stackable: false,
//     maxStacks: 1,
//     key: "sentient",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 25,
//       refinement: 1,
//       power: 1
//     },
//   },
//   shrouded: {
//     name: "UTOPIA.Features.Shrouded",
//     stackable: false,
//     maxStacks: 1,
//     key: "shrouded",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 20,
//       material: 1,
//     },
//   },
//   intensify: {
//     name: "UTOPIA.Features.Intensify",
//     stackable: true,
//     maxStacks: 0,
//     key: "intensify",
//     value: 1,
//     handler: "+X",
//     componentsLocked: true,
//     cost: {
//       RP: 15,
//       power: 1,
//     },
//     options: {
//       ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.subtraits"))).reduce((acc, [key, value]) => {
//         if (!value.gearDamageType) return acc; // Only include intensify subtraits
//         acc[key] = {
//           name: value.label,
//           key: "intensify",
//           value: key,
//         };
//         return acc;
//       }, {})
//     }
//   },
//   harsh: {
//     name: "UTOPIA.Features.Harsh",
//     stackable: true,
//     maxStacks: 0,
//     key: "weaponless.damage",
//     value: "1d4",
//     handler: "Xd4",
//     cost: {
//       RP: 10,
//       refinement: 1,
//       power: 1
//     },
//     options: {
//       ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
//         if (!value.gearDamageType) return acc; // Only include harsh subtraits
//         acc[key] = {
//           name: value.label,
//           key: "defenseModifier",
//           value: `+${value.value}`,
//         };
//         return acc;
//       }, {}),
//     }
//   },
//   breathless: {
//     name: "UTOPIA.Features.Breathless",
//     stackable: false,
//     maxStacks: 1,
//     key: "breathless",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 10,
//       refinement: 1,
//     },
//   },
//   awkward: {
//     name: "UTOPIA.Features.Awkward",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 9,
//     handler: "override",
//     cost: {
//       RP: -10,
//     },
//     incompatible: ["compact", "inordinate"],
//   },
//   inordinate: {
//     name: "UTOPIA.Features.Inordinate",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 27,
//     handler: "override",
//     cost: {
//       RP: -30,
//     },
//     incompatible: ["awkward", "compact"],
//   },
//   tethered: {
//     name: "UTOPIA.Features.Tethered",
//     stackable: false,
//     maxStacks: 1,
//     key: "tethered",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: -20,
//     },
//   },
//   constricting: {
//     name: "UTOPIA.Features.Constricting",
//     stackable: false,
//     maxStacks: 1,
//     key: "constricting",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: -20,
//     },
//   },
//   corroded: {
//     name: "UTOPIA.Features.Corroded",
//     stackable: false,
//     maxStacks: 1,
//     key: "corroded",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: -40,
//     },
//   }
// }

// const HandsArmor = {
//   augmentable: {
//     name: "UTOPIA.Features.Augmentable",
//     stackable: false,
//     maxStacks: 1,
//     key: "augmentable",
//     minimums: [{
//       key: "rarity",
//       value: 1, // Rarity 1 is Common
//       comparison: ">="
//     }],
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 20,
//       refinement: 1,
//     },
//   },
//   defensive: {
//     name: "UTOPIA.Features.Defensive",
//     stackable: true,
//     maxStacks: 0,
//     key: "defenses",
//     value: 1,
//     handler: "distributed",
//     cost: {
//       RP: 4,
//       material: 1,
//     },
//     options: {
//       ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
//         if (!value.defensive) return acc; // Only include defensive damage types
//         acc[key] = {
//           name: value.label,
//           key: "defenseModifier",
//           value: `+${value.value}`,
//         };
//         return acc;
//       }, {})
//     }
//   }, 
//   guarded: {
//     name: "UTOPIA.Features.Guarded",
//     stackable: true,
//     maxStacks: 0,
//     key: "block.quantity",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: 40,
//       material: 1,
//     }
//   },
//   spry: {
//     name: "UTOPIA.Features.Spry",
//     stackable: true,
//     maxStacks: 0,
//     key: "dodge.quantity",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: 40,
//       refinement: 1,
//     },
//   },
//   magus: {
//     name: "UTOPIA.Features.Magus",
//     stackable: true,
//     maxStacks: 0,
//     key: "spellcasting.staminaDiscount",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: 15,
//       power: 1
//     },
//   },
//   compact: {
//     name: "UTOPIA.Features.Compact",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 1,
//     handler: "override",
//     componentsPerStack: true,
//     cost: {
//       RP: 10,
//       refinement: 1,
//     },
//     incompatible: ["awkward", "inordinate"],
//   },
//   sentient: {
//     name: "UTOPIA.Features.Sentient",
//     stackable: false,
//     maxStacks: 1,
//     key: "sentient",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 25,
//       refinement: 1,
//       power: 1
//     },
//   },
//   shrouded: {
//     name: "UTOPIA.Features.Shrouded",
//     stackable: false,
//     maxStacks: 1,
//     key: "shrouded",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 20,
//       material: 1,
//     },
//   },
//   intensify: {
//     name: "UTOPIA.Features.Intensify",
//     stackable: true,
//     maxStacks: 0,
//     key: "intensify",
//     value: 1,
//     handler: "+X",
//     componentsLocked: true,
//     cost: {
//       RP: 15,
//       power: 1,
//     },
//     options: {
//       ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.subtraits"))).reduce((acc, [key, value]) => {
//         if (!value.gearDamageType) return acc; // Only include intensify subtraits
//         acc[key] = {
//           name: value.label,
//           key: "intensify",
//           value: key,
//         };
//         return acc;
//       }, {})
//     }
//   },
//   harsh: {
//     name: "UTOPIA.Features.Harsh",
//     stackable: true,
//     maxStacks: 0,
//     key: "weaponless.damage",
//     value: "1d4",
//     handler: "Xd4",
//     cost: {
//       RP: 20,
//       material: 1,
//       refinement: 1
//     },
//     options: {
//       ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
//         if (!value.gearDamageType) return acc; // Only include harsh subtraits
//         acc[key] = {
//           name: value.label,
//           key: "defenseModifier",
//           value: `+${value.value}`,
//         };
//         return acc;
//       }, {}),
//     }
//   },
//   swift: {
//     name: "UTOPIA.Features.Swift",
//     stackable: true,
//     maxStacks: 0,
//     key: "weaponless.actions",
//     value: -1,
//     handler: "-X",
//     cost: {
//       RP: 20,
//       refinement: 1
//     },
//   },
//   awkward: {
//     name: "UTOPIA.Features.Awkward",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 9,
//     handler: "override",
//     cost: {
//       RP: -10,
//     },
//     incompatible: ["compact", "inordinate"],
//   },
//   inordinate: {
//     name: "UTOPIA.Features.Inordinate",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 27,
//     handler: "override",
//     cost: {
//       RP: -30,
//     },
//     incompatible: ["awkward", "compact"],
//   },
//   tethered: {
//     name: "UTOPIA.Features.Tethered",
//     stackable: false,
//     maxStacks: 1,
//     key: "tethered",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: -20,
//     },
//   },
//   constricting: {
//     name: "UTOPIA.Features.Constricting",
//     stackable: false,
//     maxStacks: 1,
//     key: "constricting",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: -20,
//     },
//   },
//   corroded: {
//     name: "UTOPIA.Features.Corroded",
//     stackable: false,
//     maxStacks: 1,
//     key: "corroded",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: -40,
//     },
//   }
// }

// const FeetArmor = {
//   augmentable: {
//     name: "UTOPIA.Features.Augmentable",
//     stackable: false,
//     maxStacks: 1,
//     key: "augmentable",
//     minimums: [{
//       key: "rarity",
//       value: 1, // Rarity 1 is Common
//       comparison: ">="
//     }],
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 20,
//       refinement: 1,
//     },
//   },
//   defensive: {
//     name: "UTOPIA.Features.Defensive",
//     stackable: true,
//     maxStacks: 0,
//     key: "defenses",
//     value: 1,
//     handler: "distributed",
//     cost: {
//       RP: 4,
//       material: 1,
//     },
//     options: {
//       ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
//         if (!value.defensive) return acc; // Only include defensive damage types
//         acc[key] = {
//           name: value.label,
//           key: "defenseModifier",
//           value: `+${value.value}`,
//         };
//         return acc;
//       }, {})
//     }
//   }, 
//   guarded: {
//     name: "UTOPIA.Features.Guarded",
//     stackable: true,
//     maxStacks: 0,
//     key: "block.quantity",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: 40,
//       material: 1,
//     }
//   },
//   spry: {
//     name: "UTOPIA.Features.Spry",
//     stackable: true,
//     maxStacks: 0,
//     key: "dodge.quantity",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: 40,
//       refinement: 1,
//     },
//   },
//   magus: {
//     name: "UTOPIA.Features.Magus",
//     stackable: true,
//     maxStacks: 0,
//     key: "spellcasting.staminaDiscount",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: 15,
//       power: 1
//     },
//   },
//   compact: {
//     name: "UTOPIA.Features.Compact",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 1,
//     handler: "override",
//     componentsPerStack: true,
//     cost: {
//       RP: 10,
//       refinement: 1,
//     },
//     incompatible: ["awkward", "inordinate"],
//   },
//   sentient: {
//     name: "UTOPIA.Features.Sentient",
//     stackable: false,
//     maxStacks: 1,
//     key: "sentient",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 25,
//       refinement: 1,
//       power: 1
//     },
//   },
//   shrouded: {
//     name: "UTOPIA.Features.Shrouded",
//     stackable: false,
//     maxStacks: 1,
//     key: "shrouded",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 20,
//       material: 1,
//     },
//   },
//   aerial: {
//     name: "UTOPIA.Features.Aerial",
//     stackable: true,
//     maxStacks: 1,
//     key: "travel.air.speed",
//     minimums: [{
//       key: "travel.air.speed",
//       value: 1, // Minimum speed of 1
//       comparison: ">="
//     }],
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: 12,
//       power: 1
//     },
//   }, 
//   intensify: {
//     name: "UTOPIA.Features.Intensify",
//     stackable: true,
//     maxStacks: 0,
//     key: "intensify",
//     value: 1,
//     handler: "+X",
//     componentsLocked: true,
//     cost: {
//       RP: 15,
//       power: 1,
//     },
//     options: {
//       ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.subtraits"))).reduce((acc, [key, value]) => {
//         if (!value.gearDamageType) return acc; // Only include intensify subtraits
//         acc[key] = {
//           name: value.label,
//           key: "intensify",
//           value: key,
//         };
//         return acc;
//       }, {})
//     }
//   },
//   harsh: {
//     name: "UTOPIA.Features.Harsh",
//     stackable: true,
//     maxStacks: 0,
//     key: "weaponless.damage",
//     value: "1d4",
//     handler: "Xd4",
//     cost: {
//       RP: 20,
//       material: 1,
//       refinement: 1
//     },
//     options: {
//       ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
//         if (!value.gearDamageType) return acc; // Only include harsh subtraits
//         acc[key] = {
//           name: value.label,
//           key: "defenseModifier",
//           value: `+${value.value}`,
//         };
//         return acc;
//       }, {}),
//     }
//   },
//   swift: {
//     name: "UTOPIA.Features.Swift",
//     stackable: true,
//     maxStacks: 0,
//     key: "weaponless.actions",
//     value: -1,
//     handler: "-X",
//     cost: {
//       RP: 20,
//       refinement: 1
//     },
//   },
//   arachnid: {
//     name: "UTOPIA.Features.Arachnid",
//     stackable: false,
//     maxStacks: 1,
//     key: "arachnid",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 40,
//       power: 1
//     },
//   },
//   boosted: {
//     name: "UTOPIA.Features.Boosted",
//     stackable: true,
//     maxStacks: 0,
//     key: "travel.land.speed",
//     minimums: [{
//       key: "travel.land.speed",
//       value: 1, // Minimum speed of 1
//       comparison: ">="
//     }],
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: 7,
//       refinement: 1,
//     },
//   },
//   marine: {
//     name: "UTOPIA.Features.Marine",
//     stackable: true,
//     maxStacks: 1,
//     key: "travel.water.speed",
//     minimums: [{
//       key: "travel.water.speed",
//       value: 1, // Minimum speed of 1
//       comparison: ">="
//     }],
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: 5,
//       power: 1
//     },
//   },
//   awkward: {
//     name: "UTOPIA.Features.Awkward",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 9,
//     handler: "override",
//     cost: {
//       RP: -10,
//     },
//     incompatible: ["compact", "inordinate"],
//   },
//   inordinate: {
//     name: "UTOPIA.Features.Inordinate",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 27,
//     handler: "override",
//     cost: {
//       RP: -30,
//     },
//     incompatible: ["awkward", "compact"],
//   },
//   tethered: {
//     name: "UTOPIA.Features.Tethered",
//     stackable: false,
//     maxStacks: 1,
//     key: "tethered",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: -20,
//     },
//   },
//   constricting: {
//     name: "UTOPIA.Features.Constricting",
//     stackable: false,
//     maxStacks: 1,
//     key: "constricting",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: -20,
//     },
//   },
//   corroded: {
//     name: "UTOPIA.Features.Corroded",
//     stackable: false,
//     maxStacks: 1,
//     key: "corroded",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: -40,
//     },
//   }
// }

// const Sheild = {
//   defensive: {
//     name: "UTOPIA.Features.Defensive",
//     stackable: true,
//     maxStacks: 0,
//     key: "defenses",
//     value: 1,
//     handler: "distributed",
//     componentsLocked: true,
//     cost: {
//       RP: 10,
//       material: 1,
//     },
//     options: {
//       ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.damageTypes"))).reduce((acc, [key, value]) => {
//         if (!value.defensive) return acc; // Only include defensive damage types
//         acc[key] = {
//           name: value.label,
//           key: "defenseModifier",
//           value: `+${value.value}`,
//         };
//         return acc;
//       }, {})
//     }
//   }, 
//   guarded: {
//     name: "UTOPIA.Features.Guarded",
//     stackable: true,
//     maxStacks: 0,
//     key: "block.quantity",
//     value: 1,
//     handler: "+X",
//     componentsLocked: true,
//     cost: {
//       RP: 15,
//       material: 1,
//     }
//   },
//   spry: {
//     name: "UTOPIA.Features.Spry",
//     stackable: true,
//     maxStacks: 0,
//     key: "dodge.quantity",
//     value: 1,
//     handler: "+X",
//     componentsLocked: true,
//     cost: {
//       RP: 15,
//       refinement: 1,
//     },
//   },
//   compact: {
//     name: "UTOPIA.Features.Compact",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 1,
//     handler: "override",
//     cost: {
//       RP: 10,
//       refinement: 1,
//     },
//     incompatible: ["awkward", "inordinate"],
//   },
//   magus: {
//     name: "UTOPIA.Features.Magus",
//     stackable: true,
//     maxStacks: 0,
//     key: "spellcasting.staminaDiscount",
//     value: 1,
//     handler: "+X",
//     componentsLocked: true,
//     cost: {
//       RP: 20,
//       power: 1
//     },
//   },
//   sentient: {
//     name: "UTOPIA.Features.Sentient",
//     stackable: false,
//     maxStacks: 1,
//     key: "sentient",
//     value: true,
//     handler: "override",
//     cost: {
//       RP: 25,
//       refinement: 1,
//       power: 1
//     },
//   },
//   awkward: {
//     name: "UTOPIA.Features.Awkward",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 9,
//     handler: "override",
//     cost: {
//       RP: -10,
//     },
//     incompatible: ["compact", "inordinate"],
//   },
//   inordinate: {
//     name: "UTOPIA.Features.Inordinate",
//     stackable: false,
//     maxStacks: 1,
//     key: "slots",
//     value: 27,
//     handler: "override",
//     cost: {
//       RP: -30,
//     },
//     incompatible: ["awkward", "compact"],
//   },
//   unwieldy: {
//     name: "UTOPIA.Features.Unwieldy",
//     stackable: true,
//     maxStacks: 6,
//     key: "hands",
//     value: 1,
//     handler: "+X",
//     cost: {
//       RP: -10,
//     },
//   }
// }