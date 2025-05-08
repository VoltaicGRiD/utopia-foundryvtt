export function registerFeatures(settings) {
  CONFIG.UTOPIA.FEATURES = {};
  CONFIG.UTOPIA.FEATURES.fastWeapon = FastWeapon(settings);
  CONFIG.UTOPIA.FEATURES.moderateWeapon = ModerateWeapon(settings);
  CONFIG.UTOPIA.FEATURES.slowWeapon = SlowWeapon(settings);
  CONFIG.UTOPIA.FEATURES.chestArmor = ChestArmor(settings);
  CONFIG.UTOPIA.FEATURES.headArmor = HeadArmor(settings);
  CONFIG.UTOPIA.FEATURES.handsArmor = HandsArmor(settings);
  CONFIG.UTOPIA.FEATURES.feetArmor = FeetArmor(settings);
  CONFIG.UTOPIA.FEATURES.shields = Shield(settings);
  CONFIG.UTOPIA.FEATURES.consumable = Consumable(settings);
  CONFIG.UTOPIA.FEATURES.activeArtifact = ActiveArtifact(settings);
  CONFIG.UTOPIA.FEATURES.passiveArtifact = PassiveArtifact(settings);
  CONFIG.UTOPIA.FEATURES.artifactActivations = ArtifactActivations(settings);
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
  - "1X/1X" means the value is a range, where 'X' is the number of stacks (e.g., "1/1" w/ 2 stacks = "2/2").
  - "[operator]X" means the value is manipulated by the operator, where 'X' is the number of stacks (e.g., "+2" w/ 3 stacks = "+6").
  - "[operator][number]X" means the value is multiplied, where 'X' is the number of stacks (e.g., "*4X" w/ 3 stacks = "*12", or "/2X" w/ 3 stacks = "/6").
  - special: 
    - "array" means the the value is appended to an array for each stack (e.g., "array" w/ 2 stacks = ["value1", "value2"]).
    - "distributed" means the value (including stacks) is distributed across the options upon crafting (e.g., "distributed" w/ 12 stacks = {option1: 4, option2: 3, option3: 5}).

[cost] - The cost of the feature in RP, material, refinement, and power.
  - special:
    - RP is a string: "X" means the cost is variable based on the number of stacks, rounded up (e.g., "RP: -10/X" w/ 3 stacks = -4 RP).

[upgrade] - Array of objects that define minimum requirements for the feature to be applicable.
  - key: The key to check against the item's data.
  - value: The value to compare against.
  - comparison: The comparison operator to use (e.g., "==", ">=", etc.).

  [appliesTo] - Set to "this" if it applies to the item itself, or doesn't exist if it applies to the actor / target.

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
  - cost: The action cost to attempt the counter.
*/

function FastWeapon(settings) {
  console.log(settings);

  return {
    slam: {
      name: "UTOPIA.Features.Slam",
      stackable: true,
      maxStacks: 0,
      parentKey: "damage",
      key: "formula",
      value: "1d4",
      handler: "Xd4",
      componentsLocked: true,
      cost: {
        RP: 10,
        material: 1,
      },
      options: {
        physical: {
          name: "UTOPIA.Settings.physical",
          key: "type",
          value: "physical",
        },
      },
    },
    harsh: {
      name: "UTOPIA.Features.Harsh",
      stackable: true,
      maxStacks: 0,
      parentKey: "damage",
      key: "formula",
      value: "1d4",
      handler: "Xd4",
      componentsLocked: true,
      combined: true,
      cost: {
        RP: 15,
        power: 1,
      },
      options: {
        ...Object.entries(settings.damageTypes).reduce((acc, [key, value]) => {
          if (!value.harsh) return acc; // Only include harsh subtraits
          acc[key] = {
            name: value.label,
            key: "type",
            value: key,
          };
          return acc;
        }, {}),
      },
    },
    compact: {
      name: "UTOPIA.Features.Compact",
      stackable: false,
      maxStacks: 1,
      key: "slots",
      value: 1,
      handler: "override",
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
      parentKey: "damage",
      key: "modifier",
      upgrade: [
        {
          key: "rarity",
          value: 1, // Rarity 1 is Common
        },
      ],
      conditions: [
        {
          key: "ranged",
          value: false,
          comparison: "==",
          output: "@pow.mod",
        },
        {
          key: "ranged",
          value: true,
          comparison: "==",
          output: "@dex.mod",
        },
      ],
      handler: "override",
      cost: {
        RP: 60,
        material: 1,
      },
      incompatible: ["extravagant"],
      options: {
        ...Object.entries(settings.subtraits).reduce((acc, [key, value]) => {
          acc[key] = {
            name: value.label,
            value: `@${key}.mod`,
          };
          return acc;
        }, {}),
      },
    },
    extravagant: {
      name: "UTOPIA.Features.Extravagant",
      stackable: false,
      maxStacks: 1,
      parentKey: "damage",
      key: "modifier",
      upgrade: [
        {
          key: "rarity",
          value: 2, // Rarity 1 is Common
        },
      ],
      handler: "override",
      cost: {
        RP: 80,
        refinement: 1,
      },
      incompatible: ["elegant"],
      options: {
        ...Object.entries(settings.subtraits).reduce((acc, [key, value]) => {
          acc[key] = {
            name: value.label,
            value: `@${key}.mod`,
          };
          return acc;
        }, {}),
      },
    },
    reach: {
      name: "UTOPIA.Features.Reach",
      stackable: true,
      maxStacks: 3,
      key: "range",
      value: "1/1",
      handler: "1X/1X",
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
      handler: "5X/10X",
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
      key: "accuracyDifficulty",
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
      upgrade: [
        {
          key: "rarity",
          value: 1, // Rarity 1 is Common
        },
      ],
      conditions: [
        {
          _comment:
            "If the target does not have the construct tag, this feature applies.",
          key: "target.tags",
          value: "construct",
          comparison: "!has",
          output: true,
        },
        {
          _comment:
            "If the target has the construct tag, this feature does not apply.",
          key: "target.tags",
          value: "construct",
          comparison: "has",
          output: false,
        },
      ],
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
      upgrade: [
        {
          key: "rarity",
          value: 2, // Rarity 1 is Common
        },
      ],
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
      upgrade: [
        {
          key: "rarity",
          value: 2, // Rarity 1 is Common
        },
      ],
      value: true,
      handler: "array",
      cost: {
        RP: 80,
        refinement: 2,
      },
      options: {
        ...Object.entries(settings.damageTypes).reduce((acc, [key, value]) => {
          if (!value.penetrative) return acc; // Only include penetrative subtraits
          acc[key] = {
            name: value.label,
            key: "penetrative",
            value: key,
          };
          return acc;
        }, {}),
      },
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
        power: 1,
      },
    },
    blinding: {
      name: "UTOPIA.Features.Blinding",
      stackable: true,
      maxStacks: 0,
      key: "altActions",
      value: "*2",
      counters: [
        {
          type: "test", // Make a [test] (3d6 + [modifier]) against the [against], if [comparison] [success/failure]
          performer: "target",
          modifier: "@for.mod",
          against: "damageDealt",
          comparison: ">=",
          failure: {
            statusEffect: "blinded",
            duration: {
              turns: "X",
            },
          },
        },
      ],
      handler: "*2X",
      cost: {
        RP: 15,
        power: 1,
      },
    },
    confusing: {
      name: "UTOPIA.Features.Confusing",
      stackable: true,
      maxStacks: 0,
      key: "altActions",
      value: "*2",
      counters: [
        {
          type: "test", // Make a [test] (3d6 + [modifier]) against the [against], if [comparison] [success/failure]
          performer: "target",
          modifier: "@for.mod",
          against: "damageDealt",
          comparison: ">=",
          failure: {
            statusEffect: "dazed",
            duration: {
              turns: "X",
            },
          },
        },
      ],
      handler: "*2X",
      cost: {
        RP: 30,
        refinement: 1,
        power: 1,
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
        RP: "40 + (2 * @range.far)",
        power: 1,
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
        RP: "40 + (5 * @range.far)",
        power: 2,
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
      maxStacks: 5,
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
    },
  };
}

function ModerateWeapon(settings) {
  return {
    slam: {
      name: "UTOPIA.Features.Slam",
      stackable: true,
      maxStacks: 0,
      parentKey: "damage",
      key: "formula",
      value: "1d4",
      handler: "Xd4",
      componentsLocked: true,
      cost: {
        RP: 5,
        material: 1,
      },
      options: {
        physical: {
          name: "UTOPIA.Settings.physical",
          key: "type",
          value: "physical",
        },
      },
    },
    harsh: {
      name: "UTOPIA.Features.Harsh",
      stackable: true,
      maxStacks: 0,
      parentKey: "damage",
      key: "formula",
      value: "1d4",
      handler: "Xd4",
      componentsLocked: true,
      combined: true,
      cost: {
        RP: 8,
        power: 1,
      },
      options: {
        ...Object.entries(settings.damageTypes).reduce((acc, [key, value]) => {
          if (!value.harsh) return acc; // Only include harsh subtraits
          acc[key] = {
            name: value.label,
            key: "type",
            value: key,
          };
          return acc;
        }, {}),
      },
    },
    compact: {
      name: "UTOPIA.Features.Compact",
      stackable: false,
      maxStacks: 1,
      key: "slots",
      value: 1,
      handler: "override",
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
      parentKey: "damage",
      key: "modifier",
      upgrade: [
        {
          key: "rarity",
          value: 1, // Rarity 1 is Common
        },
      ],
      conditions: [
        {
          key: "ranged",
          value: false,
          comparison: "==",
          output: "@pow.mod",
        },
        {
          key: "ranged",
          value: true,
          comparison: "==",
          output: "@dex.mod",
        },
      ],
      handler: "override",
      cost: {
        RP: 30,
        material: 1,
      },
      incompatible: ["extravagant"],
    },
    extravagant: {
      name: "UTOPIA.Features.Extravagant",
      stackable: false,
      maxStacks: 1,
      parentKey: "damage",
      key: "modifier",
      upgrade: [
        {
          key: "rarity",
          value: 2, // Rarity 1 is Common
        },
      ],
      handler: "override",
      cost: {
        RP: 45,
        refinement: 1,
      },
      incompatible: ["elegant"],
      options: {
        ...Object.entries(settings.subtraits).reduce((acc, [key, value]) => {
          acc[key] = {
            name: value.label,
            value: `@${key}.mod`,
          };
          return acc;
        }, {}),
      },
    },
    reach: {
      name: "UTOPIA.Features.Reach",
      stackable: true,
      maxStacks: 3,
      key: "range",
      value: "1/1",
      handler: "1X/1X",
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
      handler: "1X/1X",
      cost: {
        RP: 4,
        refinement: 1,
      },
      incompatible: ["reach"],
    },
    assisted: {
      name: "UTOPIA.Features.Assisted",
      stackable: true,
      maxStacks: 0,
      key: "accuracyDifficulty",
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
      upgrade: [
        {
          key: "rarity",
          value: 1, // Rarity 1 is Common
        },
      ],
      conditions: [
        {
          _comment:
            "If the target does not have the construct tag, this feature applies.",
          key: "target.tags",
          value: "construct",
          comparison: "!has",
          output: true,
        },
        {
          _comment:
            "If the target has the construct tag, this feature does not apply.",
          key: "target.tags",
          value: "construct",
          comparison: "has",
          output: false,
        },
      ],
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
      upgrade: [
        {
          key: "rarity",
          value: 2, // Rarity 1 is Common
        },
      ],
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
      upgrade: [
        {
          key: "rarity",
          value: 2, // Rarity 1 is Common
        },
      ],
      value: true,
      handler: "array",
      cost: {
        RP: 60,
        refinement: 2,
      },
      options: {
        ...Object.entries(settings.damageTypes).reduce((acc, [key, value]) => {
          if (!value.penetrative) return acc; // Only include penetrative subtraits
          acc[key] = {
            name: value.label,
            key: "penetrative",
            value: key,
          };
          return acc;
        }, {}),
      },
    },
    shipWrecker: {
      name: "UTOPIA.Features.ShipWrecker",
      stackable: false,
      maxStacks: 1,
      key: "shipWrecker",
      value: true,
      handler: "override",
      cost: {
        RP: 8,
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
        power: 1,
      },
    },
    blinding: {
      name: "UTOPIA.Features.Blinding",
      stackable: true,
      maxStacks: 0,
      key: "altActions",
      value: "*2",
      counters: [
        {
          type: "test", // Make a [test] (3d6 + [modifier]) against the [against], if [comparison] [success/failure]
          performer: "target",
          modifier: "@for.mod",
          against: "damageDealt",
          comparison: ">=",
          failure: {
            statusEffect: "blinded",
            duration: {
              turns: "X",
            },
          },
        },
      ],
      handler: "*2X",
      cost: {
        RP: 15,
        power: 1,
      },
    },
    confusing: {
      name: "UTOPIA.Features.Confusing",
      stackable: true,
      maxStacks: 0,
      key: "altActions",
      value: "*2",
      counters: [
        {
          type: "test", // Make a [test] (3d6 + [modifier]) against the [against], if [comparison] [success/failure]
          performer: "target",
          modifier: "@for.mod",
          against: "damageDealt",
          comparison: ">=",
          failure: {
            statusEffect: "dazed",
            duration: {
              turns: "X",
            },
          },
        },
      ],
      handler: "*2X",
      cost: {
        RP: 30,
        refinement: 1,
        power: 1,
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
        RP: "40 + (2 * @range.far)",
        power: 1,
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
        RP: "40 + (5 * @range.far)",
        power: 2,
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
      maxStacks: 5,
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
        RP: -15,
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
        RP: -5,
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
        RP: -5,
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
        RP: -30,
      },
      incompatible: ["poisonous", "wounding"],
    },
  };
}

function SlowWeapon(settings) {
  return {
    slam: {
      name: "UTOPIA.Features.Slam",
      stackable: true,
      maxStacks: 0,
      parentKey: "damage",
      key: "formula",
      value: "1d4",
      handler: "Xd4",
      cost: {
        RP: 3,
        material: 1,
      },
      options: {
        physical: {
          name: "UTOPIA.Settings.physical",
          key: "type",
          value: "physical",
        },
      },
    },
    harsh: {
      name: "UTOPIA.Features.Harsh",
      stackable: true,
      maxStacks: 0,
      parentKey: "damage",
      key: "formula",
      value: "1d4",
      handler: "Xd4",
      combined: true,
      cost: {
        RP: 4,
        power: 1,
      },
      options: {
        ...Object.entries(settings.damageTypes).reduce((acc, [key, value]) => {
          if (!value.harsh) return acc; // Only include harsh subtraits
          acc[key] = {
            name: value.label,
            key: "type",
            value: key,
          };
          return acc;
        }, {}),
      },
    },
    compact: {
      name: "UTOPIA.Features.Compact",
      stackable: false,
      maxStacks: 1,
      key: "slots",
      value: 1,
      handler: "override",
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
      parentKey: "damage",
      key: "modifier",
      upgrade: [
        {
          key: "rarity",
          value: 1, // Rarity 1 is Common
        },
      ],
      conditions: [
        {
          key: "ranged",
          value: false,
          comparison: "==",
          output: "@pow.mod",
        },
        {
          key: "ranged",
          value: true,
          comparison: "==",
          output: "@dex.mod",
        },
      ],
      handler: "override",
      cost: {
        RP: 10,
        material: 1,
      },
      incompatible: ["extravagant"],
    },
    extravagant: {
      name: "UTOPIA.Features.Extravagant",
      stackable: false,
      maxStacks: 1,
      parentKey: "damage",
      key: "modifier",
      upgrade: [
        {
          key: "rarity",
          value: 2, // Rarity 1 is Common
        },
      ],
      handler: "override",
      cost: {
        RP: 20,
        refinement: 1,
      },
      incompatible: ["elegant"],
      options: {
        ...Object.entries(settings.subtraits).reduce((acc, [key, value]) => {
          acc[key] = {
            name: value.label,
            value: `@${key}.mod`,
          };
          return acc;
        }, {}),
      },
    },
    reach: {
      name: "UTOPIA.Features.Reach",
      stackable: true,
      maxStacks: 3,
      key: "range",
      value: "1/1",
      handler: "1X/1X",
      cost: {
        RP: 1,
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
      handler: "1X/1X",
      cost: {
        RP: 3,
        refinement: 1,
      },
      incompatible: ["reach"],
    },
    assisted: {
      name: "UTOPIA.Features.Assisted",
      stackable: true,
      maxStacks: 0,
      key: "accuracyDifficulty",
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
      upgrade: [
        {
          key: "rarity",
          value: 1, // Rarity 1 is Common
        },
      ],
      conditions: [
        {
          _comment:
            "If the target does not have the construct tag, this feature applies.",
          key: "target.tags",
          value: "construct",
          comparison: "!has",
          output: true,
        },
        {
          _comment:
            "If the target has the construct tag, this feature does not apply.",
          key: "target.tags",
          value: "construct",
          comparison: "has",
          output: false,
        },
      ],
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
      upgrade: [
        {
          key: "rarity",
          value: 2, // Rarity 1 is Common
        },
      ],
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
      upgrade: [
        {
          key: "rarity",
          value: 2, // Rarity 1 is Common
        },
      ],
      value: true,
      handler: "array",
      cost: {
        RP: 40,
        refinement: 2,
      },
      options: {
        ...Object.entries(settings.damageTypes).reduce((acc, [key, value]) => {
          if (!value.penetrative) return acc; // Only include penetrative subtraits
          acc[key] = {
            name: value.label,
            key: key,
            value: true,
          };
          return acc;
        }, {}),
      },
    },
    shipWrecker: {
      name: "UTOPIA.Features.ShipWrecker",
      stackable: false,
      maxStacks: 1,
      key: "shipWrecker",
      value: true,
      handler: "override",
      cost: {
        RP: 5,
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
        power: 1,
      },
    },
    blinding: {
      name: "UTOPIA.Features.Blinding",
      stackable: true,
      maxStacks: 0,
      key: "altActions",
      value: "*2",
      counters: [
        {
          type: "test", // Make a [test] (3d6 + [modifier]) against the [against], if [comparison] [success/failure]
          performer: "target",
          modifier: "@for.mod",
          against: "damageDealt",
          comparison: ">=",
          failure: {
            statusEffect: "blinded",
            duration: {
              turns: "X",
            },
          },
        },
      ],
      handler: "*2X",
      cost: {
        RP: 15,
        power: 1,
      },
    },
    confusing: {
      name: "UTOPIA.Features.Confusing",
      stackable: true,
      maxStacks: 0,
      key: "altActions",
      value: "*2",
      counters: [
        {
          type: "test", // Make a [test] (3d6 + [modifier]) against the [against], if [comparison] [success/failure]
          performer: "target",
          modifier: "@for.mod",
          against: "damageDealt",
          comparison: ">=",
          failure: {
            statusEffect: "dazed",
            duration: {
              turns: "X",
            },
          },
        },
      ],
      handler: "*2X",
      cost: {
        RP: 30,
        refinement: 1,
        power: 1,
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
        RP: "40 + (2 * @range.far)",
        power: 1,
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
        RP: "40 + (5 * @range.far)",
        power: 2,
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
      maxStacks: 5,
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
        RP: -10,
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
        RP: -2,
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
        RP: -2,
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
        RP: -20,
      },
      incompatible: ["poisonous", "wounding"],
    },
    elaborate: {
      name: "UTOPIA.Features.Elaborate",
      stackable: false,
      maxStacks: 1,
      key: "actions",
      value: 4,
      handler: "override",
      cost: {
        RP: -20,
      },
    },
    articulate: {
      name: "UTOPIA.Features.Articulate",
      stackable: false,
      maxStacks: 1,
      key: "actions",
      value: 5,
      handler: "override",
      cost: {
        RP: -30,
      },
    },
    convoluted: {
      name: "UTOPIA.Features.Convoluted",
      stackable: false,
      maxStacks: 1,
      key: "actions",
      value: 6,
      handler: "override",
      cost: {
        RP: -40,
      },
    },
  };
}

function ChestArmor(settings) {
  return {
    augmentable: {
      name: "UTOPIA.Features.Augmentable",
      stackable: false,
      maxStacks: 1,
      key: "augmentable",
      upgrade: [
        {
          key: "rarity",
          value: 1, // Rarity 1 is Common
        },
      ],
      value: true,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: 20,
        refinement: 1,
      },
    },
    defensive: {
      name: "UTOPIA.Features.Defensive",
      stackable: true,
      maxStacks: 0,
      key: "defenses",
      value: 1,
      handler: "distributed",
      cost: {
        RP: 4,
        material: 1,
      },
      options: {
        ...Object.entries(settings.damageTypes).reduce((acc, [key, value]) => {
          if (!value.defensive) return acc; // Only include defensive damage types
          acc[key] = {
            name: value.label,
            key: key,
            value: `+${value.value}`,
          };
          return acc;
        }, {}),
      },
    },
    screen: {
      name: "UTOPIA.Features.Screen",
      stackable: true,
      maxStacks: 0,
      key: "defenses.psyche",
      value: 1,
      handler: "+X",
      cost: {
        RP: 5,
        material: 1,
      },
    },
    guarded: {
      name: "UTOPIA.Features.Guarded",
      stackable: true,
      maxStacks: 0,
      key: "block.quantity",
      value: 1,
      handler: "+X",
      cost: {
        RP: 40,
        material: 1,
      },
    },
    spry: {
      name: "UTOPIA.Features.Spry",
      stackable: true,
      maxStacks: 0,
      key: "dodge.quantity",
      value: 1,
      handler: "+X",
      cost: {
        RP: 40,
        refinement: 1,
      },
    },
    magus: {
      name: "UTOPIA.Features.Magus",
      stackable: true,
      maxStacks: 0,
      key: "spellcasting.discount",
      value: 1,
      handler: "+X",
      cost: {
        RP: 15,
        power: 1,
      },
    },
    compact: {
      name: "UTOPIA.Features.Compact",
      stackable: false,
      maxStacks: 1,
      key: "slots",
      value: 1,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: 10,
        refinement: 1,
      },
      incompatible: ["awkward", "inordinate"],
    },
    sentient: {
      name: "UTOPIA.Features.Sentient",
      stackable: false,
      maxStacks: 1,
      key: "sentient",
      value: true,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: 25,
        refinement: 1,
        power: 1,
      },
    },
    shrouded: {
      name: "UTOPIA.Features.Shrouded",
      stackable: false,
      maxStacks: 1,
      key: "shrouded",
      value: true,
      handler: "override",
      cost: {
        RP: 20,
        material: 1,
      },
    },
    aerial: {
      name: "UTOPIA.Features.Aerial",
      stackable: true,
      maxStacks: 1,
      key: "travel.air.speed",
      upgrade: [
        {
          key: "travel.air.speed",
          value: 1, // Minimum speed of 1
          comparison: ">=",
        },
      ],
      value: 1,
      handler: "+X",
      cost: {
        RP: 15,
        power: 1,
      },
    },
    awkward: {
      name: "UTOPIA.Features.Awkward",
      stackable: false,
      maxStacks: 1,
      key: "slots",
      value: 9,
      handler: "override",
      appliesTo: "this",
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
      appliesTo: "this",
      cost: {
        RP: -30,
      },
      incompatible: ["awkward", "compact"],
    },
    tethered: {
      name: "UTOPIA.Features.Tethered",
      stackable: false,
      maxStacks: 1,
      key: "tethered",
      value: true,
      handler: "override",
      cost: {
        RP: -20,
      },
    },
    constricting: {
      name: "UTOPIA.Features.Constricting",
      stackable: false,
      maxStacks: 1,
      key: "constricting",
      value: true,
      handler: "override",
      cost: {
        RP: -20,
      },
    },
    corroded: {
      name: "UTOPIA.Features.Corroded",
      stackable: false,
      maxStacks: 1,
      key: "corroded",
      value: true,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: -40,
      },
    },
  };
}

function HeadArmor(settings) {
  return {
    augmentable: {
      name: "UTOPIA.Features.Augmentable",
      stackable: false,
      maxStacks: 1,
      key: "augmentable",
      upgrade: [
        {
          key: "rarity",
          value: 1, // Rarity 1 is Common
        },
      ],
      value: true,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: 20,
        refinement: 1,
      },
    },
    defensive: {
      name: "UTOPIA.Features.Defensive",
      stackable: true,
      maxStacks: 0,
      key: "defenses",
      value: 1,
      handler: "distributed",
      componentsLocked: true,
      cost: {
        RP: 4,
        material: 1,
      },
      options: {
        ...Object.entries(settings.damageTypes).reduce((acc, [key, value]) => {
          if (!value.defensive) return acc; // Only include defensive damage types
          acc[key] = {
            name: value.label,
            key: key,
          };
          return acc;
        }, {}),
      },
    },
    screen: {
      name: "UTOPIA.Features.Screen",
      stackable: true,
      maxStacks: 0,
      key: "defenses.psyche",
      value: 1,
      handler: "+X",
      cost: {
        RP: 5,
        material: 1,
      },
    },
    guarded: {
      name: "UTOPIA.Features.Guarded",
      stackable: true,
      maxStacks: 0,
      key: "block.quantity",
      value: 1,
      handler: "+X",
      cost: {
        RP: 40,
        material: 1,
      },
    },
    spry: {
      name: "UTOPIA.Features.Spry",
      stackable: true,
      maxStacks: 0,
      key: "dodge.quantity",
      value: 1,
      handler: "+X",
      cost: {
        RP: 40,
        refinement: 1,
      },
    },
    magus: {
      name: "UTOPIA.Features.Magus",
      stackable: true,
      maxStacks: 0,
      key: "spellcasting.discount",
      value: 1,
      handler: "+X",
      cost: {
        RP: 15,
        power: 1,
      },
    },
    compact: {
      name: "UTOPIA.Features.Compact",
      stackable: false,
      maxStacks: 1,
      key: "slots",
      value: 1,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: 10,
        refinement: 1,
      },
      incompatible: ["awkward", "inordinate"],
    },
    sentient: {
      name: "UTOPIA.Features.Sentient",
      stackable: false,
      maxStacks: 1,
      key: "sentient",
      value: true,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: 25,
        refinement: 1,
        power: 1,
      },
    },
    shrouded: {
      name: "UTOPIA.Features.Shrouded",
      stackable: false,
      maxStacks: 1,
      key: "shrouded",
      value: true,
      handler: "override",
      cost: {
        RP: 20,
        material: 1,
      },
    },
    intensify: {
      name: "UTOPIA.Features.Intensify",
      stackable: true,
      maxStacks: 0,
      key: "intensify",
      value: 1,
      handler: "+X",
      componentsLocked: true,
      cost: {
        RP: 15,
        power: 1,
      },
      options: {
        ...Object.entries(settings.subtraits).reduce((acc, [key, value]) => {
          acc[key] = {
            name: value.label,
            key: "intensify",
            value: key,
          };
          return acc;
        }, {}),
      },
    },
    harsh: {
      name: "UTOPIA.Features.Harsh",
      stackable: true,
      maxStacks: 0,
      parentKey: "weaponless",
      key: "damage",
      value: "1d4",
      handler: "Xd4",
      cost: {
        RP: 10,
        refinement: 1,
        power: 1,
      },
      options: {
        ...Object.entries(settings.damageTypes).reduce((acc, [key, value]) => {
          if (!value.harsh) return acc; // Only include harsh subtraits
          acc[key] = {
            name: value.label,
            key: "modifier",
            value: `+${value.value}`,
          };
          return acc;
        }, {}),
      },
    },
    breathless: {
      name: "UTOPIA.Features.Breathless",
      stackable: false,
      maxStacks: 1,
      key: "breathless",
      value: true,
      handler: "override",
      cost: {
        RP: 10,
        refinement: 1,
      },
    },
    awkward: {
      name: "UTOPIA.Features.Awkward",
      stackable: false,
      maxStacks: 1,
      key: "slots",
      value: 9,
      handler: "override",
      appliesTo: "this",
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
      appliesTo: "this",
      cost: {
        RP: -30,
      },
      incompatible: ["awkward", "compact"],
    },
    tethered: {
      name: "UTOPIA.Features.Tethered",
      stackable: false,
      maxStacks: 1,
      key: "tethered",
      value: true,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: -20,
      },
    },
    constricting: {
      name: "UTOPIA.Features.Constricting",
      stackable: false,
      maxStacks: 1,
      key: "constricting",
      value: true,
      handler: "override",
      cost: {
        RP: -20,
      },
    },
    corroded: {
      name: "UTOPIA.Features.Corroded",
      stackable: false,
      maxStacks: 1,
      key: "corroded",
      value: true,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: -40,
      },
    },
  };
}

function HandsArmor(settings) {
  return {
    augmentable: {
      name: "UTOPIA.Features.Augmentable",
      stackable: false,
      maxStacks: 1,
      key: "augmentable",
      upgrade: [
        {
          key: "rarity",
          value: 1, // Rarity 1 is Common
        },
      ],
      value: true,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: 20,
        refinement: 1,
      },
    },
    defensive: {
      name: "UTOPIA.Features.Defensive",
      stackable: true,
      maxStacks: 0,
      key: "defenses",
      value: 1,
      handler: "distributed",
      componentsLocked: true,
      cost: {
        RP: 4,
        material: 1,
      },
      options: {
        ...Object.entries(settings.damageTypes).reduce((acc, [key, value]) => {
          if (!value.defensive) return acc; // Only include defensive damage types
          acc[key] = {
            name: value.label,
            key: key,
          };
          return acc;
        }, {}),
      },
    },
    guarded: {
      name: "UTOPIA.Features.Guarded",
      stackable: true,
      maxStacks: 0,
      key: "block.quantity",
      value: 1,
      handler: "+X",
      cost: {
        RP: 40,
        material: 1,
      },
    },
    spry: {
      name: "UTOPIA.Features.Spry",
      stackable: true,
      maxStacks: 0,
      key: "dodge.quantity",
      value: 1,
      handler: "+X",
      cost: {
        RP: 40,
        refinement: 1,
      },
    },
    magus: {
      name: "UTOPIA.Features.Magus",
      stackable: true,
      maxStacks: 0,
      key: "spellcasting.discount",
      value: 1,
      handler: "+X",
      cost: {
        RP: 15,
        power: 1,
      },
    },
    compact: {
      name: "UTOPIA.Features.Compact",
      stackable: false,
      maxStacks: 1,
      key: "slots",
      value: 1,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: 10,
        refinement: 1,
      },
      incompatible: ["awkward", "inordinate"],
    },
    sentient: {
      name: "UTOPIA.Features.Sentient",
      stackable: false,
      maxStacks: 1,
      key: "sentient",
      value: true,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: 25,
        refinement: 1,
        power: 1,
      },
    },
    shrouded: {
      name: "UTOPIA.Features.Shrouded",
      stackable: false,
      maxStacks: 1,
      key: "shrouded",
      value: true,
      handler: "override",
      cost: {
        RP: 20,
        material: 1,
      },
    },
    intensify: {
      name: "UTOPIA.Features.Intensify",
      stackable: true,
      maxStacks: 0,
      key: "intensify",
      value: 1,
      handler: "+X",
      componentsLocked: true,
      cost: {
        RP: 15,
        power: 1,
      },
      options: {
        ...Object.entries(settings.subtraits).reduce((acc, [key, value]) => {
          acc[key] = {
            name: value.label,
            key: "intensify",
            value: key,
          };
          return acc;
        }, {}),
      },
    },
    harsh: {
      name: "UTOPIA.Features.Harsh",
      stackable: true,
      maxStacks: 0,
      parentKey: "weaponless",
      key: "damage",
      value: "1d4",
      handler: "Xd4",
      cost: {
        RP: 20,
        material: 1,
        refinement: 1,
      },
      options: {
        ...Object.entries(settings.damageTypes).reduce((acc, [key, value]) => {
          if (!value.harsh) return acc; // Only include harsh subtraits
          acc[key] = {
            name: value.label,
            key: "modifier",
            value: `+${value.value}`,
          };
          return acc;
        }, {}),
      },
    },
    swift: {
      name: "UTOPIA.Features.Swift",
      stackable: false,
      maxStacks: 1,
      key: "weaponless.actions",
      value: 1,
      handler: "-X",
      cost: {
        RP: 20,
        refinement: 1,
      },
    },
    awkward: {
      name: "UTOPIA.Features.Awkward",
      stackable: false,
      maxStacks: 1,
      key: "slots",
      value: 9,
      handler: "override",
      appliesTo: "this",
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
      appliesTo: "this",
      cost: {
        RP: -30,
      },
      incompatible: ["awkward", "compact"],
    },
    tethered: {
      name: "UTOPIA.Features.Tethered",
      stackable: false,
      maxStacks: 1,
      key: "tethered",
      value: true,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: -20,
      },
    },
    constricting: {
      name: "UTOPIA.Features.Constricting",
      stackable: false,
      maxStacks: 1,
      key: "constricting",
      value: true,
      handler: "override",
      cost: {
        RP: -20,
      },
    },
    corroded: {
      name: "UTOPIA.Features.Corroded",
      stackable: false,
      maxStacks: 1,
      key: "corroded",
      value: true,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: -40,
      },
    },
  };
}

function FeetArmor(settings) {
  return {
    augmentable: {
      name: "UTOPIA.Features.Augmentable",
      stackable: false,
      maxStacks: 1,
      key: "augmentable",
      upgrade: [
        {
          key: "rarity",
          value: 1, // Rarity 1 is Common
        },
      ],
      value: true,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: 20,
        refinement: 1,
      },
    },
    defensive: {
      name: "UTOPIA.Features.Defensive",
      stackable: true,
      maxStacks: 0,
      key: "defenses",
      value: 1,
      handler: "distributed",
      componentsLocked: true,
      cost: {
        RP: 4,
        material: 1,
      },
      options: {
        ...Object.entries(settings.damageTypes).reduce((acc, [key, value]) => {
          if (!value.defensive) return acc; // Only include defensive damage types
          acc[key] = {
            name: value.label,
            key: key,
          };
          return acc;
        }, {}),
      },
    },
    guarded: {
      name: "UTOPIA.Features.Guarded",
      stackable: true,
      maxStacks: 0,
      key: "block.quantity",
      value: 1,
      handler: "+X",
      componentsLocked: true,
      cost: {
        RP: 40,
        material: 1,
      },
    },
    spry: {
      name: "UTOPIA.Features.Spry",
      stackable: true,
      maxStacks: 0,
      key: "dodge.quantity",
      value: 1,
      handler: "+X",
      componentsLocked: true,
      cost: {
        RP: 40,
        refinement: 1,
      },
    },
    magus: {
      name: "UTOPIA.Features.Magus",
      stackable: true,
      maxStacks: 0,
      key: "spellcasting.discount",
      value: 1,
      handler: "+X",
      componentsLocked: true,
      cost: {
        RP: 15,
        power: 1,
      },
    },
    compact: {
      name: "UTOPIA.Features.Compact",
      stackable: false,
      maxStacks: 1,
      key: "slots",
      value: 1,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: 10,
        refinement: 1,
      },
      incompatible: ["awkward", "inordinate"],
    },
    sentient: {
      name: "UTOPIA.Features.Sentient",
      stackable: false,
      maxStacks: 1,
      key: "sentient",
      value: true,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: 25,
        refinement: 1,
        power: 1,
      },
    },
    shrouded: {
      name: "UTOPIA.Features.Shrouded",
      stackable: false,
      maxStacks: 1,
      key: "shrouded",
      value: true,
      handler: "override",
      cost: {
        RP: 20,
        material: 1,
      },
    },
    aerial: {
      name: "UTOPIA.Features.Aerial",
      stackable: true,
      maxStacks: 1,
      key: "travel.air.speed",
      upgrade: [
        {
          key: "travel.air.speed",
          value: 1, // Minimum speed of 1
          comparison: ">=",
        },
      ],
      value: 1,
      handler: "+X",
      cost: {
        RP: 12,
        power: 1,
      },
    },
    intensify: {
      name: "UTOPIA.Features.Intensify",
      stackable: true,
      maxStacks: 0,
      key: "intensify",
      value: 1,
      handler: "+X",
      componentsLocked: true,
      cost: {
        RP: 15,
        power: 1,
      },
      options: {
        ...Object.entries(settings.subtraits).reduce((acc, [key, value]) => {
          acc[key] = {
            name: value.label,
            key: "intensify",
            value: key,
          };
          return acc;
        }, {}),
      },
    },
    harsh: {
      name: "UTOPIA.Features.Harsh",
      stackable: true,
      maxStacks: 0,
      parentKey: "weaponless",
      key: "damage",
      value: "1d4",
      handler: "Xd4",
      componentsLocked: true,
      cost: {
        RP: 20,
        power: 1,
        refinement: 1,
      },
      options: {
        ...Object.entries(settings.damageTypes).reduce((acc, [key, value]) => {
          if (!value.harsh) return acc; // Only include harsh subtraits
          acc[key] = {
            name: value.label,
            key: "modifier",
            value: `+${value.value}`,
          };
          return acc;
        }, {}),
      },
    },
    swift: {
      name: "UTOPIA.Features.Swift",
      stackable: true,
      maxStacks: 0,
      key: "weaponless.actions",
      value: 1,
      handler: "-X",
      cost: {
        RP: 20,
        refinement: 1,
      },
    },
    arachnid: {
      name: "UTOPIA.Features.Arachnid",
      stackable: false,
      maxStacks: 1,
      key: "arachnid",
      value: true,
      handler: "override",
      cost: {
        RP: 40,
        power: 1,
      },
    },
    boosted: {
      name: "UTOPIA.Features.Boosted",
      stackable: true,
      maxStacks: 0,
      key: "travel.land.speed",
      upgrade: [
        {
          key: "travel.land.speed",
          value: 1, // Minimum speed of 1
          comparison: ">=",
        },
      ],
      value: 1,
      handler: "+X",
      cost: {
        RP: 7,
        refinement: 1,
      },
    },
    marine: {
      name: "UTOPIA.Features.Marine",
      stackable: true,
      maxStacks: 1,
      key: "travel.water.speed",
      upgrade: [
        {
          key: "travel.water.speed",
          value: 1, // Minimum speed of 1
          comparison: ">=",
        },
      ],
      value: 1,
      handler: "+X",
      cost: {
        RP: 5,
        power: 1,
      },
    },
    awkward: {
      name: "UTOPIA.Features.Awkward",
      stackable: false,
      maxStacks: 1,
      key: "slots",
      value: 9,
      handler: "override",
      appliesTo: "this",
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
      appliesTo: "this",
      cost: {
        RP: -30,
      },
      incompatible: ["awkward", "compact"],
    },
    tethered: {
      name: "UTOPIA.Features.Tethered",
      stackable: false,
      maxStacks: 1,
      key: "tethered",
      value: true,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: -20,
      },
    },
    constricting: {
      name: "UTOPIA.Features.Constricting",
      stackable: false,
      maxStacks: 1,
      key: "constricting",
      value: true,
      handler: "override",
      cost: {
        RP: -20,
      },
    },
    corroded: {
      name: "UTOPIA.Features.Corroded",
      stackable: false,
      maxStacks: 1,
      key: "corroded",
      value: true,
      handler: "override",
      cost: {
        RP: -40,
      },
      requires: ["defensive"],
    },
  };
}

function Shield(settings) {
  return {
    defensive: {
      name: "UTOPIA.Features.Defensive",
      stackable: true,
      maxStacks: 0,
      key: "defenses",
      value: 1,
      handler: "distributed",
      componentsLocked: true,
      cost: {
        RP: 10,
        material: 1,
      },
      options: {
        ...Object.entries(settings.damageTypes).reduce((acc, [key, value]) => {
          if (!value.defensive) return acc; // Only include defensive damage types
          acc[key] = {
            name: value.label,
            key: key,
          };
          return acc;
        }, {}),
      },
    },
    guarded: {
      name: "UTOPIA.Features.Guarded",
      stackable: true,
      maxStacks: 0,
      key: "block.quantity",
      value: 1,
      handler: "+X",
      componentsLocked: true,
      cost: {
        RP: 15,
        material: 1,
      },
    },
    spry: {
      name: "UTOPIA.Features.Spry",
      stackable: true,
      maxStacks: 0,
      key: "dodge.quantity",
      value: 1,
      handler: "+X",
      componentsLocked: true,
      cost: {
        RP: 15,
        refinement: 1,
      },
    },
    compact: {
      name: "UTOPIA.Features.Compact",
      stackable: false,
      maxStacks: 1,
      key: "slots",
      value: 1,
      handler: "override",
      cost: {
        RP: 10,
        refinement: 1,
      },
      incompatible: ["awkward", "inordinate"],
    },
    magus: {
      name: "UTOPIA.Features.Magus",
      stackable: true,
      maxStacks: 0,
      key: "spellcasting.discount",
      value: 1,
      handler: "+X",
      componentsLocked: true,
      cost: {
        RP: 20,
        power: 1,
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
        power: 1,
      },
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
      maxStacks: 5,
      key: "hands",
      value: 1,
      handler: "+X",
      cost: {
        RP: -10,
      },
    },
  };
}

function Consumable(settings) {
  return {
    radiating: {
      name: "UTOPIA.Features.Radiating",
      stackable: true,
      maxStacks: 0,
      key: "radius",
      value: 1,
      handler: "+X",
      cost: {
        RP: 4,
      },
      incompatible: ["spelltech"],
    },
    simple: {
      name: "UTOPIA.Features.Simple",
      stackable: false,
      maxStacks: 1,
      key: "actions",
      value: 1,
      handler: "-X",
      cost: {
        RP: 20,
      },
      incompatible: ["complicated", "charged", "deployed"],
    },
    compact: {
      name: "UTOPIA.Features.Compact",
      stackable: false,
      maxStacks: 1,
      key: "slots",
      value: 1,
      handler: "override",
      cost: {
        RP: 10,
      },
      incompatible: ["awkward", "inordinate"],
    },
    splash: {
      name: "UTOPIA.Features.Splash",
      stackable: false,
      maxStacks: 1,
      key: "radius",
      handler: "+X",
      cost: {
        RP: 10,
      },
      incompatible: ["charged", "deployed"],
      options: {
        ...Object.entries(settings.traits).reduce((acc, [key, value]) => {
          if (!value.splash) return acc; // Only include splash subtraits
          acc[key] = {
            name: value.label,
            key: "radius",
            value: `@${key}.total`,
          };
          return acc;
        }, {}),
      },
    },
    spelltech: {
      name: "UTOPIA.Features.Spelltech",
      stackable: true,
      maxStacks: 0,
      key: "spelltech",
      value: 1,
      handler: "+X",
      cost: {
        RP: 20,
      },
      incompatible: ["radiating"],
      crafting: {
        type: "spell",
        key: "cost",
        limit: "@spelltech",
      },
    },
    destructive: {
      name: "UTOPIA.Features.Destructive",
      stackable: true,
      maxStacks: 0,
      parentKey: "damage",
      key: "formula",
      value: "1d4",
      handler: "Xd4",
      cost: {
        RP: 2,
      },
      bypass: {
        block: true,
        dodge: true,
      },
      options: {
        ...Object.entries(settings.damageTypes).reduce((acc, [key, value]) => {
          if (!value.destructive) return acc; // Only include destructive subtraits
          acc[key] = {
            name: value.label,
            key: "type",
            value: key,
          };
          return acc;
        }, {}),
      },
    },
    psychosis: {
      name: "UTOPIA.Features.Psychosis",
      stackable: true,
      maxStacks: 0,
      parentKey: "damage",
      key: "formula",
      value: "1d4",
      handler: "Xd4",
      counters: [
        {
          type: "test",
          performer: "target",
          modifier: "@wil.mod",
          against: "12",
          comparison: ">=",
          cost: 1,
        },
      ],
      cost: {
        RP: 3,
      },
      options: {
        psyche: {
          name: "UTOPIA.DAMAGE_TYPES.psyche.label",
          key: "type",
          value: "psyche",
        },
      },
    },
    heal: {
      name: "UTOPIA.Features.Heal",
      stackable: true,
      maxStacks: 0,
      parentKey: "healing",
      key: "formula",
      value: "1d4",
      handler: "Xd4",
      combine: true,
      cost: {
        RP: 8,
      },
      options: {
        shp: {
          name: "UTOPIA.DAMAGE_TYPES.healing.label",
          key: "type",
          value: "shp",
        },
      },
    },
    refresh: {
      name: "UTOPIA.Features.Refresh",
      stackable: true,
      maxStacks: 0,
      parentKey: "healing",
      key: "formula",
      value: "1d4",
      handler: "Xd4",
      combine: true,
      cost: {
        RP: 6,
      },
      options: {
        stamina: {
          name: "UTOPIA.DAMAGE_TYPES.restoreStamina.label",
          key: "type",
          value: "stamina",
        },
      },
    },
    medical: {
      name: "UTOPIA.Features.Medical",
      stackable: true,
      maxStacks: 0,
      parentKey: "healing",
      key: "formula",
      value: "1d4",
      handler: "Xd4",
      combine: true,
      upgrade: [
        {
          key: "rarity",
          value: 1, // Rarity 1 is Common
          comparison: ">=",
        },
      ],
      cost: {
        RP: 10,
      },
      options: {
        deepHealing: {
          name: "UTOPIA.DAMAGE_TYPES.deepHealing.label",
          key: "type",
          value: "dhp",
        },
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
        RP: 20,
      },
    },
    residual: {
      name: "UTOPIA.Features.Residual",
      stackable: true,
      maxStacks: 0,
      key: "duration.turns",
      value: 1,
      handler: "+X",
      cost: {
        RP: 2,
      },
      incompatible: ["lingering", "persisting"],
    },
    lingering: {
      name: "UTOPIA.Features.Lingering",
      stackable: true,
      maxStacks: 0,
      key: "duration.minutes",
      value: 1,
      handler: "+X",
      cost: {
        RP: 10,
      },
      incompatible: ["residual", "persisting"],
    },
    persisting: {
      name: "UTOPIA.Features.Persisting",
      stackable: true,
      maxStacks: 0,
      key: "duration.hours",
      value: 1,
      handler: "+X",
      cost: {
        RP: 75,
      },
      incompatible: ["residual", "lingering"],
    },
    necrotic: {
      name: "UTOPIA.Features.Necrotic",
      stackable: true,
      maxStacks: 0,
      key: "necrotic",
      value: true,
      handler: "override",
      cost: {
        RP: 15,
      },
    },
    complicated: {
      name: "UTOPIA.Features.Complicated",
      stackable: true,
      maxStacks: 4,
      key: "actions",
      value: 1,
      handler: "+X",
      cost: {
        RP: -5,
      },
      incompatible: ["simple", "charged", "deployed"],
    },
    charged: {
      name: "UTOPIA.Features.Charged",
      stackable: false,
      maxStacks: 1,
      key: "activationTime.minutes",
      value: 1,
      handler: "+X",
      cost: {
        RP: -35,
      },
      incompatible: ["simple", "radiating", "deployed"],
    },
    deployed: {
      name: "UTOPIA.Features.Deployed",
      stackable: false,
      maxStacks: 1,
      key: "activationTime.hours",
      value: 1,
      handler: "+X",
      cost: {
        RP: -50,
      },
      incompatible: ["simple", "radiating", "charged"],
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
      maxStacks: 5,
      key: "hands",
      value: 1,
      handler: "+X",
      cost: {
        RP: -10,
      },
    },
  };
}

function PassiveArtifact(settings) {
  return {
    clamber: {
      name: "UTOPIA.Features.Clamber",
      stackable: true,
      maxStacks: 0,
      key: "clamber",
      value: true,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: 8,
      },
      requires: ["travel"],
    },
    seaworthy: {
      name: "UTOPIA.Features.Seaworthy",
      stackable: true,
      maxStacks: 0,
      key: "travel.water.speed",
      value: "@travel.land.speed",
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: 10,
      },
      requires: ["travel"],
    },
    airborne: {
      name: "UTOPIA.Features.Airborne",
      stackable: true,
      maxStacks: 0,
      key: "travel.air.speed",
      value: "@travel.land.speed",
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: 25,
      },
      requires: ["travel"],
    },
    versatileBlock: {
      name: "UTOPIA.Features.VersatileBlock",
      stackable: true,
      maxStacks: 0,
      key: "block.quantity",
      value: 1,
      handler: "+X",
      cost: {
        RP: 40,
      },
    },
    versatileDodge: {
      name: "UTOPIA.Features.VersatileDodge",
      stackable: true,
      maxStacks: 0,
      key: "dodge.quantity",
      value: 1,
      handler: "+X",
      cost: {
        RP: 40,
      },
    },
    remote: {
      name: "UTOPIA.Features.Remote",
      stackable: true,
      maxStacks: 0,
      key: "remote",
      value: 5,
      handler: "5X",
      appliesTo: "this",
      cost: {
        RP: 20,
      },
    },
    range: {
      name: "UTOPIA.Features.Range",
      stackable: true,
      maxStacks: 0,
      key: "range",
      value: "5/10",
      handler: "5X/10X",
      appliesTo: "this",
      cost: {
        RP: 5,
      },
    },
    minorCasting: {
      name: "UTOPIA.Features.MinorCasting",
      stackable: true,
      maxStacks: 0,
      key: "spellcasting.artistries",
      value: 1,
      handler: "+X",
      cost: {
        RP: 60,
      },
      options: {
        ...Object.entries(settings.artistries).reduce((acc, [key, value]) => {
          if (value.classification != "minor") return acc; // Only include minor casting subtraits
          acc[key] = {
            specialLabel: "UTOPIA.Features.SpecialLabels.Artistry",
            name: value.label,
            key: `${key}.unlocked`,
            value: true,
          };
          return acc;
        }, {}),
      },
    },
    moderateCasting: {
      name: "UTOPIA.Features.ModerateCasting",
      stackable: true,
      maxStacks: 0,
      key: "spellcasting.artistries",
      value: 1,
      handler: "+X",
      cost: {
        RP: 80,
      },
      options: {
        ...Object.entries(settings.artistries).reduce((acc, [key, value]) => {
          if (value.classification != "moderate") return acc;
          acc[key] = {
            specialLabel: "UTOPIA.Features.SpecialLabels.Artistry",
            name: value.label,
            key: `${key}.unlocked`,
            value: true,
          };
          return acc;
        }, {}),
      },
    },
    majorCasting: {
      name: "UTOPIA.Features.MajorCasting",
      stackable: true,
      maxStacks: 0,
      key: "spellcasting.artistries",
      value: 1,
      handler: "+X",
      cost: {
        RP: 100,
      },
      options: {
        ...Object.entries(settings.artistries).reduce((acc, [key, value]) => {
          if (value.classification != "major") return acc;
          acc[key] = {
            specialLabel: "UTOPIA.Features.SpecialLabels.Artistry",
            name: value.label,
            key: `${key}.unlocked`,
            value: true,
          };
          return acc;
        }, {}),
      },
    },
    capacity: {
      name: "UTOPIA.Features.Capacity",
      stackable: true,
      maxStacks: 0,
      key: "capacity",
      value: 1,
      handler: "+X",
      appliesTo: "this",
      cost: {
        RP: 2,
      },
    },
    shrouded: {
      name: "UTOPIA.Features.Shrouded",
      stackable: false,
      maxStacks: 1,
      key: "shrouded",
      value: true,
      handler: "override",
      cost: {
        RP: 20,
      },
    },
    sentient: {
      name: "UTOPIA.Features.Sentient",
      stackable: false,
      maxStacks: 1,
      key: "sentient",
      value: true,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: 30,
      },
    },
    intensify: {
      name: "UTOPIA.Features.Intensify",
      stackable: true,
      maxStacks: 0,
      key: "intensify",
      value: 1,
      handler: "+X",
      componentsLocked: true,
      cost: {
        RP: 20,
      },
      options: {
        ...Object.entries(settings.subtraits).reduce((acc, [key, value]) => {
          acc[key] = {
            name: value.label,
            key: "intensify",
            value: key,
          };
          return acc;
        }, {}),
      },
    },
    resistance: {
      name: "UTOPIA.Features.Resistance",
      stackable: false,
      maxStacks: 1,
      key: "resistance",
      cost: {
        RP: 70,
      },
      handler: "+X",
      incompatible: ["incorporeal"],
      options: {
        ...Object.entries(settings.damageTypes).reduce((acc, [key, value]) => {
          if (!value.resistance) return acc; // Only include resistance subtraits
          acc[key] = {
            name: value.label,
            key: key,
            value: true,
          };
          return acc;
        }, {}),
      },
    },
    incorporeal: {
      name: "UTOPIA.Features.Incorporeal",
      stackable: false,
      maxStacks: 1,
      key: "resistance",
      value: true,
      handler: "override",
      cost: {
        RP: 110,
      },
      incompatible: ["resistance"],
      options: {
        physical: {
          name: "UTOPIA.DAMAGE_TYPES.physical.label",
          key: "physical",
          value: true,
        },
      },
    },
    hermetic: {
      name: "UTOPIA.Features.Hermetic",
      stackable: false,
      maxStacks: 1,
      key: "hermetic",
      value: true,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: 50,
      },
    },
    instrumental: {
      name: "UTOPIA.Features.Instrumental",
      stackable: false,
      maxStacks: 1,
      key: "instrumental",
      value: true,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: 80,
      },
    },
    boosted: {
      name: "UTOPIA.Features.Boosted",
      stackable: true,
      maxStacks: 0,
      key: "travel.land.speed",
      value: 1,
      handler: "+X",
      cost: {
        RP: 15,
      },
    },
    marine: {
      name: "UTOPIA.Features.Marine",
      stackable: true,
      maxStacks: 1,
      key: "travel.water.speed",
      upgrade: [
        {
          key: "travel.water.speed",
          value: 1, // Minimum speed of 1
          comparison: ">=",
        },
      ],
      value: 1,
      handler: "+X",
      cost: {
        RP: 15,
      },
    },
    aerial: {
      name: "UTOPIA.Features.Aerial",
      stackable: true,
      maxStacks: 1,
      key: "travel.air.speed",
      upgrade: [
        {
          key: "travel.air.speed",
          value: 1, // Minimum speed of 1
          comparison: ">=",
        },
      ],
      value: 1,
      handler: "+X",
      cost: {
        RP: 15,
      },
    },
    flight: {
      name: "UTOPIA.Features.Flight",
      stackable: true,
      maxStacks: 0,
      key: "travel.air.speed",
      value: 1,
      handler: "+X",
      cost: {
        RP: "25+15",
      },
    },
    magus: {
      name: "UTOPIA.Features.Magus",
      stackable: true,
      maxStacks: 0,
      key: "spellcasting.discount",
      value: 1,
      handler: "+X",
      cost: {
        RP: 20,
      },
    },
    hexproof: {
      name: "UTOPIA.Features.Hexproof",
      stackable: false,
      maxStacks: 1,
      key: "spellcasting.disabled",
      value: true,
      handler: "override",
      cost: {
        RP: 30,
      },
    },
    fiddly: {
      name: "UTOPIA.Features.Fiddly",
      stackable: false,
      maxStacks: 1,
      key: "slots",
      value: 3,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: -10,
      },
      incompatible: ["awkward", "inordinate"],
    },
    awkward: {
      name: "UTOPIA.Features.Awkward",
      stackable: false,
      maxStacks: 1,
      key: "slots",
      value: 9,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: -20,
      },
      incompatible: ["fiddly", "inordinate"],
    },
    inordinate: {
      name: "UTOPIA.Features.Inordinate",
      stackable: false,
      maxStacks: 1,
      key: "slots",
      value: 27,
      handler: "override",
      appliesTo: "this",
      cost: {
        RP: -50,
      },
      incompatible: ["fiddly", "awkward"],
    },
  };
}

function ArtifactActivations(settings) {
  return {
    fastActivationI: {
      name: "UTOPIA.Features.FastActivationI",
      stackable: true,
      maxStacks: 0,
      key: "activation",
      activation: {
        costMultiplier: 12,
        cost: 1,
        division: "interrupt",
      },
    },
    fastActivationII: {
      name: "UTOPIA.Features.FastActivationII",
      stackable: true,
      maxStacks: 0,
      key: "activation",
      activation: {
        costMultiplier: 8,
        cost: 2,
        division: "interrupt",
      },
    },
    fastActivationIII: {
      name: "UTOPIA.Features.FastActivationIII",
      stackable: true,
      maxStacks: 0,
      key: "activation",
      activation: {
        costMultiplier: 6,
        cost: 3,
        division: "turn",
      },
    },
    fastActivationIV: {
      name: "UTOPIA.Features.FastActivationIV",
      stackable: true,
      maxStacks: 0,
      key: "activation",
      activation: {
        costMultiplier: 5,
        cost: 4,
        division: "turn",
      },
    },
    fastActivationV: {
      name: "UTOPIA.Features.FastActivationV",
      stackable: true,
      maxStacks: 0,
      key: "activation",
      activation: {
        costMultiplier: 4,
        cost: 5,
        division: "turn",
      },
    },
    fastActivationVI: {
      name: "UTOPIA.Features.FastActivationVI",
      stackable: true,
      maxStacks: 0,
      key: "activation",
      activation: {
        costMultiplier: 3,
        cost: 6,
        division: "turn",
      },
    },
    activatedI: {
      name: "UTOPIA.Features.ActivatedI",
      stackable: true,
      maxStacks: 0,
      key: "activation",
      activation: {
        costMultiplier: 2,
        cost: 1,
        division: "minutes",
      },
    },
    activatedII: {
      name: "UTOPIA.Features.ActivatedII",
      stackable: true,
      maxStacks: 0,
      key: "activation",
      activation: {
        costMultiplier: 1,
        cost: 1,
        division: "hours",
      },
    },
    commandTrigger: {
      name: "UTOPIA.Features.CommandTrigger",
      stackable: false,
      maxStacks: 1,
      key: "activation",
      cost: {
        RP: 20,
      },
      incompatible: ["unwieldy"],
    },
    unwieldy: {
      name: "UTOPIA.Features.Unwieldy",
      stackable: true,
      maxStacks: 5,
      key: "hands",
      value: 1,
      handler: "+X",
      cost: {
        RP: -10,
      },
      incompatible: ["commandTrigger"],
    },
  };
}

function ActiveArtifact(settings) {
  return {
    destructive: {
      name: "UTOPIA.Features.Destructive",
      stackable: true,
      maxStacks: 0,
      parentKey: "damage",
      key: "formula",
      value: "1d4",
      handler: "Xd4",
      cost: {
        RP: 1,
      },
      bypass: {
        block: true,
        dodge: true,
      },
      options: {
        ...Object.entries(settings.damageTypes).reduce((acc, [key, value]) => {
          if (!value.destructive) return acc; // Only include destructive subtraits
          acc[key] = {
            name: value.label,
            key: "type",
            value: key,
          };
          return acc;
        }, {}),
      },
    },
    psychosis: {
      name: "UTOPIA.Features.Psychosis",
      stackable: true,
      maxStacks: 0,
      parentKey: "damage",
      key: "formula",
      value: "1d4",
      handler: "Xd4",
      counters: [
        {
          type: "test",
          performer: "target",
          modifier: "@wil.mod",
          against: "@wil.mod",
          comparison: ">=",
          cost: 1,
        },
      ],
      cost: {
        RP: 1,
      },
      options: {
        psyche: {
          name: "UTOPIA.DAMAGE_TYPES.psyche.label",
          key: "type",
          value: "psyche",
        },
      },
    },
    spelltech: {
      name: "UTOPIA.Features.Spelltech",
      stackable: true,
      maxStacks: 0,
      key: "spelltech",
      value: 1,
      handler: "+X",
      cost: {
        RP: 2,
      },
      crafting: {
        type: "spell",
        key: "cost",
        limit: "@spelltech",
      },
      incompatible: ["radiating"],
    },
    travel: {
      name: "UTOPIA.Features.Travel",
      stackable: true,
      maxStacks: 0,
      key: "travel.land.speed",
      value: 1,
      handler: "+X",
      appliesTo: "this",
      cost: {
        RP: 1,
      },
    },
  };
}

function test() {
  const testStacks = [5];

  for (const [entryKey, entry] of Object.entries(CONFIG.UTOPIA.FEATURES)) {
    if (entryKey === "ArtifactActivations") continue; // Skip ArtifactActivations for this test
    for (const feature of Object.values(entry)) {
      if (feature.stackable) {
        for (const stack of testStacks) {
          let value =
            feature.value ??
            (feature.options
              ? Object.values(feature.options)[0]?.value
              : undefined) ??
            feature.conditions;
          let processedValue = value;
          if (!Array.isArray(value) && typeof value !== "boolean")
            processedValue = handle(feature.handler, value, stack);

          let key = feature.parentKey
            ? `${feature.parentKey}.${feature.key}`
            : feature.key;

          const options = feature.options
            ? Object.values(feature.options).map((o) => {
                if (o.key) {
                  return {
                    key: feature.parentKey
                      ? `${feature.parentKey}.${o.key}`
                      : o.key,
                    value: o.value,
                  };
                }
                return {
                  key: feature.parentKey
                    ? `${feature.parentKey}.${feature.key}`
                    : feature.key,
                  value: o.value,
                };
              })
            : [];

          let costs = feature.cost;

          for (const [key, costValue] of Object.entries(costs)) {
            if (typeof costValue === "string") {
              costs[key] = handle(costValue, costValue, 1);
            } else if (typeof costValue === "number") {
              if (feature.componentsLocked && key !== "RP") {
                costs[key] = costValue; // Assuming 1 is the number of components
              } else if (!feature.componentsLocked && key !== "RP") {
                costs[key] = costValue * stack; // Assuming 1 is the number of stacks
              }

              if (key === "RP") {
                costs[key] = costValue * stack; // Assuming 1 is the number of stacks
              }
            }
          }

          console.log(
            `ENTRY: ${entryKey}; Feature: ${feature.name} at ${stack} stacks`,
            {
              key,
              handler: feature.handler,
              value: value,
              processedValue,
              options,
              costs,
              initialCosts: feature.cost,
            }
          );

          if (!processedValue) {
            console.error(
              `Error processing feature: ${feature.name} at ${stack} stacks`
            );
          }
        }
      } else {
        let value =
          feature.value ??
          (feature.options
            ? Object.values(feature.options)[0]?.value
            : undefined) ??
          feature.conditions;
        let processedValue = value;
        if (!Array.isArray(value))
          processedValue = handle(feature.handler, value, 1);

        let key = feature.parentKey
          ? `${feature.parentKey}.${feature.key}`
          : feature.key;

        const options = feature.options
          ? Object.values(feature.options).map((o) => {
              if (o.key) {
                return {
                  key: feature.parentKey
                    ? `${feature.parentKey}.${o.key}`
                    : o.key,
                  value: o.value,
                };
              }
              return {
                key: feature.parentKey
                  ? `${feature.parentKey}.${feature.key}`
                  : feature.key,
                value: o.value,
              };
            })
          : [];

        let costs = feature.cost;

        for (const [key, costValue] of Object.entries(costs)) {
          if (typeof costValue === "string") {
            costs[key] = handle(costValue, costValue, 1);
          } else if (typeof costValue === "number") {
            if (feature.componentsLocked && key !== "RP") {
              costs[key] = costValue; // Assuming 1 is the number of components
            } else if (!feature.componentsLocked && key !== "RP") {
              costs[key] = costValue * 1; // Assuming 1 is the number of stacks
            }

            if (key === "RP") {
              costs[key] = costValue * 1; // Assuming 1 is the number of stacks
            }
          }
        }

        console.log(
          `ENTRY: ${entryKey}; Feature: ${feature.name} at ${1} stacks`,
          {
            key,
            handler: feature.handler,
            value: value,
            processedValue,
            options,
            costs,
            initialCosts: feature.cost,
          }
        );

        if (!processedValue) {
          console.error(
            `Error processing feature: ${feature.name} at ${1} stacks`
          );
        }
      }
    }
  }
}

export function parseFeature(feature) {
  const handlers = {
    add: /\+X/g,
    subtract: /\-X/g,
    multiply: /([0-9]+)X(?!\/)/g, // Ensure it doesn't match '5X/10X'
    range: /([0-9]+)X\/([0-9]+)X/g,
    multiplyTo: /\*([0-9]+)X/g,
    divide: /^\/([0-9]+)X/g, // Ensure it only matches if '/' is the first character
    divideFrom: /([0-9]+)\/X/g,
    formula: /Xd([0-9]+)/g,
    override: /override/g,
    distributed: /distributed/g,
  };

  function handle(input, defaultValue, stack) {
    let value = defaultValue;

    for (const [handler, regex] of Object.entries(handlers)) {
      if (input.match(regex)) {
        value = input.replace(regex, (match, p1, p2) => {
          switch (handler) {
            case "add":
              return stack;
            case "subtract":
              return stack * (Math.max(parseInt(p1), 1) * -1);
            case "multiply":
              return stack * (parseInt(p1) || 1);
            case "range":
              return `${stack * (parseInt(p1) || 1)}/${
                stack * (parseInt(p2) || 1)
              }`;
            case "multiplyTo":
              return `*${stack * (parseInt(p1) || 1)}`;
            case "divide":
              return `/${(parseInt(p1) || 1) * stack}`;
            case "divideFrom":
              return Math.floor((parseInt(p1) || 1) / stack);
            case "formula":
              return `${stack}d${parseInt(p1) || 1}`;
            case "override":
              return defaultValue;
            case "distributed":
              return "distributed";
            default:
              return defaultValue; // Return the original match if no handler is found
          }
        });
      }
    }

    return value;
  }

  function createKeyDisplay(feature, key) {
    let display = "";
    let keyDisplay = "";

    if (key.includes(".")) {
      keyDisplay = key
        .split(".")
        .map((v) => v.capitalize())
        .join(" ");
    } else {
      keyDisplay = key.capitalize();
    }

    if (feature.parentKey) {
      display = `${feature.parentKey.capitalize()} ${keyDisplay}`;
    } else {
      display = keyDisplay;
    }

    display = display.replace(/([a-z])([A-Z])/g, "$1 $2");

    return display;
  }

  const cost = feature.cost;
  let stacks = feature.stacks;

  if (
    (stacks > feature.maxStacks &&
      feature.stackable &&
      feature.maxStacks > 0) ||
    (stacks > 1 && !feature.stackable)
  ) {
    console.warn(
      `Feature ${feature.name} exceeds max stacks. Setting to max stacks.`
    );
    stacks = feature.maxStacks;
  }
  if (stacks < 1) {
    console.warn(
      `Feature ${feature.name} has less than 1 stack. Setting to 1 stack.`
    );
    stacks = 1;
  }

  const RP =
    typeof cost.RP === "string"
      ? handle(cost.RP, cost.RP, stacks)
      : cost.RP * stacks;
  const material = feature.componentsLocked
    ? cost.material
    : cost.material * stacks;
  const refinement = feature.componentsLocked
    ? cost.refinement
    : cost.refinement * stacks;
  const power = feature.componentsLocked ? cost.power : cost.power * stacks;

  const key = feature.parentKey
    ? `${feature.parentKey}.${feature.key}`
    : feature.key;
  var value =
    feature.value ??
    (feature.options ? Object.values(feature.options)[0]?.value : undefined) ??
    feature.conditions;
  var processedValue = value;
  if (!Array.isArray(value) && typeof value !== "boolean")
    processedValue = handle(feature.handler, value, stacks);

  feature.output = {
    crafting: feature.crafting,
    display: createKeyDisplay(feature, feature.key),
    key,
    value: processedValue,
    appliesTo: feature.appliesTo || "target",
    parentKey: feature.parentKey,
    counters: feature.counters || [],
    cost: {
      RP,
      material,
      refinement,
      power,
    },
    stacks,
    options: feature.options
      ? Object.values(feature.options).map((o) => {
          if (o.key && o.value) {
            return {
              display: createKeyDisplay(feature, o.key),
              key: feature.parentKey ? `${feature.parentKey}.${o.key}` : o.key,
              value: o.value,
              specialLabel: o.specialLabel || undefined,
            };
          } else if (o.key && !o.value) {
            return {
              display: createKeyDisplay(feature, o.key),
              key: feature.parentKey ? `${feature.parentKey}.${o.key}` : o.key,
              value: processedValue,
              specialLabel: o.specialLabel || undefined,
            };
          }
          return {
            display: createKeyDisplay(feature, feature.key),
            key: feature.parentKey
              ? `${feature.parentKey}.${feature.key}`
              : feature.key,
            value: o.value,
            specialLabel: o.specialLabel || undefined,
          };
        })
      : [],
  };

  return feature;
}
