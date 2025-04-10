import { UtopiaTemplates } from "./init/measuredTemplates.mjs"

export function registerConfig() {
  CONFIG.UTOPIA.TRAITS = {
    agi: {
      name: 'Agility',
      short: 'agi',
      long: 'agility',
      label: 'UTOPIA.TRAITS.Agility',
      icon: 'fas fa-rabbit-running',
      color: '#005F5F',
      path: 'system.traits.agi',
      subtraits: ['dex', 'spd']
    },
    str: {
      name: 'Strength',
      short: 'str',
      long: 'strength',
      icon: 'fas fa-dumbbell',
      color: '#7F0D0D',
      label: 'UTOPIA.TRAITS.Strength',
      path: 'system.traits.str',
      subtraits: ['pow', 'for']
    },
    int: {
      name: 'Intellect',
      short: 'int',
      long: 'intellect',
      icon: 'fas fa-brain-circuit',
      color: '#0D7F5F',
      label: 'UTOPIA.TRAITS.Intellect',
      path: 'system.traits.int',
      subtraits: ['eng', 'mem']
    },
    wil: {
      name: 'Will',
      short: 'wil',
      long: 'will',
      icon: 'fas fa-shield-alt',
      color: '#7F0D5F',
      label: 'UTOPIA.TRAITS.Will',
      path: 'system.traits.wil',
      subtraits: ['res', 'awa']
    },
    dis: {
      name: 'Display',
      short: 'dis',
      long: 'display',
      icon: 'fas fa-tv',
      color: '#7F5F0D',
      label: 'UTOPIA.TRAITS.Display',
      path: 'system.traits.dis',
      subtraits: ['por', 'stu']
    },
    cha: {
      name: 'Charm',
      short: 'cha',
      long: 'charm',
      icon: 'fas fa-face-grin-stars',
      color: '#782355',
      label: 'UTOPIA.TRAITS.Charm',
      path: 'system.traits.cha',
      subtraits: ['app', 'lan']
    }
  }

  CONFIG.UTOPIA.SUBTRAITS = {
    dex: {
      name: 'Dexterity',
      short: 'dex',
      long: 'dexterity',
      icon: 'fas fa-hand-sparkles',
      color: '#007A7A',
      label: 'UTOPIA.SUBTRAITS.Dexterity',
      path: 'system.subtraits.dex',
    },
    spd: {
      name: 'Speed',
      short: 'spd',
      long: 'speed',
      icon: 'fas fa-running',
      color: '#007A7A',
      label: 'UTOPIA.SUBTRAITS.Speed',
      path: 'system.subtraits.spd',
    },
    pow: {
      name: 'Power',
      short: 'pow',
      long: 'power',
      icon: 'fas fa-fist-raised',
      color: '#7F0D0D',
      label: 'UTOPIA.SUBTRAITS.Power',
      path: 'system.subtraits.pow',
    },
    for: {
      name: 'Fortitude',
      short: 'for',
      long: 'fortitude',
      icon: 'fas fa-fist-raised',
      color: '#7F0D0D',
      label: 'UTOPIA.SUBTRAITS.Fortitude',
      path: 'system.subtraits.for',
    },
    eng: {
      name: 'Engineering',
      short: 'eng',
      long: 'engineering',
      icon: 'fas fa-cogs',
      color: '#0D7F5F',
      label: 'UTOPIA.SUBTRAITS.Engineering',
      path: 'system.subtraits.eng',
    },
    mem: {
      name: 'Memory',
      short: 'mem',
      long: 'memory',
      icon: 'fas fa-brain',
      color: '#0D7F5F',
      label: 'UTOPIA.SUBTRAITS.Memory',
      path: 'system.subtraits.mem',
    },
    res: {
      name: 'Resolve',
      short: 'res',
      long: 'resolve',
      icon: 'fas fa-shield-alt',
      color: '#7F0D5F',
      label: 'UTOPIA.SUBTRAITS.Resolve',
      path: 'system.subtraits.res',
    },
    awa: {
      name: 'Awareness',
      short: 'awa',
      long: 'awareness',
      icon: 'fas fa-eye',
      color: '#7F0D5F',
      label: 'UTOPIA.SUBTRAITS.Awareness',
      path: 'system.subtraits.awa',
    },
    por: {
      name: 'Portrayal',
      short: 'por',
      long: 'portrayal',
      icon: 'fas fa-mobile-alt',
      color: '#7F5F0D',
      label: 'UTOPIA.SUBTRAITS.Portrayal',
      path: 'system.subtraits.por',
    },
    stu: {
      name: 'Stunt',
      short: 'stu',
      long: 'stunt',
      icon: 'fas fa-mobile-alt',
      color: '#7F5F0D',
      label: 'UTOPIA.SUBTRAITS.Stunt',
      path: 'system.subtraits.stu',
    },
    app: {
      name: 'Appeal',
      short: 'app',
      long: 'appeal',
      icon: 'fas fa-face-grin-stars',
      color: '#782355',
      label: 'UTOPIA.SUBTRAITS.Appeal',
      path: 'system.subtraits.app',
    },
    lan: {
      name: 'Language',
      short: 'lan',
      long: 'language',
      icon: 'fas fa-language',
      color: '#782355',
      label: 'UTOPIA.SUBTRAITS.Language',
      path: 'system.subtraits.lan',
    }
  }

  CONFIG.UTOPIA.SPECIALTY_CHECKS = {
    stealth: {
      defaultAttribute: "stu",
      formula: "3d6 + @stu.mod",
      tags: ["stunt", "stealth", "sneak", "sneaking", "hide", "hiding"],
      label: "UTOPIA.SPECIALTY_CHECKS.Stealth.label",
      description: "UTOPIA.SPECIALTY_CHECKS.Stealth.description",
      icon: "fas fa-user-secret"
    },
    disguise: {
      defaultAttribute: "por",
      formula: "3d6 + @por.mod",
      tags: ["portrayal", "disguise", "disguising", "camouflage", "camouflaging", "secretIdentity", "unknownIdentity"],
      label: "UTOPIA.SPECIALTY_CHECKS.Disguise.label",
      description: "UTOPIA.SPECIALTY_CHECKS.Disguise.description",
      icon: "fas fa-theater-masks"
    },
    mimic: {
      defaultAttribute: "dis",
      formula: "3d6 + @dis.mod",
      tags: ["display", "mimic", "mimicking", "copy", "copying", "impersonate", "impersonating"],
      label: "UTOPIA.SPECIALTY_CHECKS.Mimic.label",
      description: "UTOPIA.SPECIALTY_CHECKS.Mimic.description",
      icon: "fas fa-copy"
    },
    insight: {
      defaultAttribute: "int",
      formula: "3d6 + @int.mod",
      tags: ["intellect", "insight", "insightful", "analyze", "analyzing", "understand", "understanding"],
      label: "UTOPIA.SPECIALTY_CHECKS.Insight.label",
      description: "UTOPIA.SPECIALTY_CHECKS.Insight.description",
      icon: "fas fa-lightbulb"
    },
    comprehendLanguages: {
      defaultAttribute: "mem",
      formula: "3d6 + @mem.mod",
      tags: ["memory", "comprehendLanguages", "understandLanguages", "translateLanguages", "translate"],
      label: "UTOPIA.SPECIALTY_CHECKS.ComprehendLanguages.label",
      description: "UTOPIA.SPECIALTY_CHECKS.ComprehendLanguages.description",
      icon: "fas fa-language"
    },
    perception: {
      defaultAttribute: "awa",
      formula: "3d6 + @awa.mod",
      tags: ["awareness", "perception", "search", "searching"],
      label: "UTOPIA.SPECIALTY_CHECKS.Perception.label",
      description: "UTOPIA.SPECIALTY_CHECKS.Perception.description",
      icon: "fas fa-eye"
    },
    persuasion: {
      defaultAttribute: "cha",
      formula: "3d6 + @cha.mod",
      tags: ["charm", "persuasion", "convince", "convincing", "negotiate", "negotiating", "bargain", "bargaining"],
      label: "UTOPIA.SPECIALTY_CHECKS.Persuasion.label",
      description: "UTOPIA.SPECIALTY_CHECKS.Persuasion.description",
      icon: "fas fa-comments"
    },
    resistInfluence: {
      defaultAttribute: "wil",
      formula: "3d6 + @wil.mod",
      tags: ["will", "resistInfluence", "resistAction"],
      label: "UTOPIA.SPECIALTY_CHECKS.ResistInfluence.label",
      description: "UTOPIA.SPECIALTY_CHECKS.ResistInfluence.description",
      icon: "fas fa-shield-alt"
    },
    forage: {
      defaultAttribute: "awa",
      formula: "3d6 + @awa.mod",
      tags: ["awareness", "forage", "foraging", "gather", "gathering"],
      label: "UTOPIA.SPECIALTY_CHECKS.Forage.label",
      description: "UTOPIA.SPECIALTY_CHECKS.Forage.description",
      icon: "fas fa-leaf"
    },
    maintainFocus: {
      defaultAttribute: "wil",
      formula: "3d6 + @wil.mod",
      tags: ["will", "maintainFocus", ""],
      label: "UTOPIA.SPECIALTY_CHECKS.MaintainFocus.label",
      description: "UTOPIA.SPECIALTY_CHECKS.MaintainFocus.description",
      icon: "fas fa-bullseye"
    },
    maintainConcentration: {
      defaultAttribute: "wil",
      formula: "3d6 + @wil.mod",
      tags: ["will", "maintainConcentration", "concentration", "concentrate"],
      label: "UTOPIA.SPECIALTY_CHECKS.MaintainConcentration.label",
      description: "UTOPIA.SPECIALTY_CHECKS.MaintainConcentration.description",
      icon: "fas fa-crosshairs"
    },
    grapple: {
      defaultAttribute: "str",
      formula: "3d6 + @str.mod",
      tags: ["strength", "grapple", "grappling", "wrestle", "wrestling"],
      label: "UTOPIA.SPECIALTY_CHECKS.Grapple.label",
      description: "UTOPIA.SPECIALTY_CHECKS.Grapple.description",
      icon: "fas fa-fist-raised"
    }
    // appealAgainstHostile: {
    //   defaultAttribute: "app",
    //   formula: "3d6 + @app.mod",
    //   tags: ["appeal", "appealAgainstHostile", "appeal", "hostile"],
    //   label: "UTOPIA.SPECIALTY_CHECKS.AppealAgainstHostile.label",
    //   icon: "fas fa-user-shield"
    // }
  }

  CONFIG.UTOPIA.DAMAGE_TYPES = {
    energy: {
      name: 'Energy',
      icon: 'fas fa-bolt',
      block: 1.0,
      dodge: true,
      armor: true,
      label: 'UTOPIA.DAMAGE_TYPES.Energy',
    },
    heat: {
      name: 'Heat',
      icon: 'fas fa-fire',
      block: 1.0,
      dodge: true,
      armor: true,
      label: 'UTOPIA.DAMAGE_TYPES.Heat',
    },
    chill: {
      name: 'Chill',
      icon: 'fas fa-snowflake',
      block: 1.0,
      dodge: true,
      armor: true,
      label: 'UTOPIA.DAMAGE_TYPES.Chill',
    },
    physical: {
      name: 'Physical',
      icon: 'fas fa-fist-raised',
      block: 1.0,
      dodge: true,
      armor: true,
      label: 'UTOPIA.DAMAGE_TYPES.Physical',
    },
    pysche: {
      name: 'Psyche',
      icon: 'fas fa-brain',
      block: 1.0,
      dodge: true,
      armor: true,
      label: 'UTOPIA.DAMAGE_TYPES.Psyche',
    },
    kinetic: {
      name: 'Kinetic',
      icon: 'fas fa-bomb',
      block: 0,
      dodge: false,
      armor: false,
      label: 'UTOPIA.DAMAGE_TYPES.Kinetic',
    },
    stamina: {
      name: 'Stamina',
      icon: 'fas fa-heart-crack',
      block: 0,
      dodge: false,
      armor: false,
      label: 'UTOPIA.DAMAGE_TYPES.Stamina',
    },
    healing: {
      name: 'Healing',
      icon: 'fas fa-heart',
      block: 0,
      dodge: false,
      armor: false,
      label: 'UTOPIA.DAMAGE_TYPES.Healing',
    },
    restoreStamina: {
      name: 'Restore Stamina',
      icon: 'fas fa-heartbeat',
      block: 0,
      dodge: false,
      armor: false,
      label: 'UTOPIA.DAMAGE_TYPES.RestoreStamina',
    }
  }

  CONFIG.UTOPIA.ARTISTRIES = {
    alteration: {
      name: 'Alteration',
      short: 'alt',
      long: 'alteration',
      color: '#90c96b',
      label: 'UTOPIA.ARTISTRIES.Alteration',
    },
    array: {
      name: 'Array',
      short: 'arr',
      long: 'array',
      color: '#f3ec68',
      label: 'UTOPIA.ARTISTRIES.Array',
    },
    enchantment: {
      name: 'Enchantment',
      short: 'ench',
      long: 'enchantment',
      color: '#ee92b7',
      label: 'UTOPIA.ARTISTRIES.Enchantment',
    },
    evocation: {
      name: 'Evocation',
      short: 'evo',
      long: 'evocation',
      color: '#ee6448',
      label: 'UTOPIA.ARTISTRIES.Evocation',
    },
    divination: {
      name: 'Divination',
      short: 'div',
      long: 'divination',
      color: '#62b4ae',
      label: 'UTOPIA.ARTISTRIES.Divination',
    },
    illusion: {
      name: 'Illusion',
      short: 'ill',
      long: 'illusion',
      color: '#94d2e1',
      label: 'UTOPIA.ARTISTRIES.Illusion',
    },
    necromancy: {
      name: 'Necromancy',
      short: 'necro',
      long: 'necromancy',
      color: '#a75aa2',
      label: 'UTOPIA.ARTISTRIES.Necromancy',
    },
    wake: {
      name: 'Wake',
      short: 'wake',
      long: 'wake',
      color: '#f5a755',
      label: 'UTOPIA.ARTISTRIES.Wake',
    },
  }

  CONFIG.UTOPIA.RARITIES = {
    crude: {
      value: 0,
      label: 'UTOPIA.RARITIES.Crude',
      color: '#808080',
      times: {
        item: 30,
        component: 5
      },
      points: {
        minimum: 0,
        maximum: 20,
        multiplier: 1,
      }
    },
    common: {
      value: 1,
      label: 'UTOPIA.RARITIES.Common',
      color: '#FFFFFF',
      times: {
        item: 60,
        component: 10
      },
      points: {
        minimum: 21,
        maximum: 40,
        multiplier: 2,
      }
    },
    extraordinary: {
      value: 2,
      label: 'UTOPIA.RARITIES.Extraordinary',
      color: '#1E90FF',
      times: {
        item: 180,
        component: 30
      },
      points: {
        minimum: 41,
        maximum: 70,
        multiplier: 4,
      }
    },
    rare: {
      value: 3,
      label: 'UTOPIA.RARITIES.Rare',
      color: '#9370DB',
      times: {
        item: 480,
        component: 120
      },
      points: {
        minimum: 71,
        maximum: 110,
        multiplier: 8,
      }
    },
    legendary: {
      value: 4,
      label: 'UTOPIA.RARITIES.Legendary',
      color: '#FFD700',
      times: {
        item: 1440,
        component: 360
      },
      points: {
        minimum: 111,
        maximum: 160,
        multiplier: 16,
      }
    },
    mythical: {
      value: 5,
      label: 'UTOPIA.RARITIES.Mythical',
      color: '#FF4500',
      times: {
        item: 4320,
        component: 1080
      },
      points: {
        minimum: 161,
        maximum: 220,
        multiplier: 32,
      }
    },
  }

  CONFIG.UTOPIA.LANGUAGES = {
    utopian: {
      name: "Utopian",
      label: "UTOPIA.LANGUAGES.Utopian"
    },
    elven: {
      name: "Elven",
      label: "UTOPIA.LANGUAGES.Elven"
    },
    apparatusCode: {
      name: "Apparatus Code",
      label: "UTOPIA.LANGUAGES.ApparatusCode"
    },
    dwarven: {
      name: "Dwarven",
      label: "UTOPIA.LANGUAGES.Dwarven"
    },
    oxtan: { 
      name: "Oxtan",
      label: "UTOPIA.LANGUAGES.Oxtan"
    },
    primordial: {
      name: "Primordial",
      label: "UTOPIA.LANGUAGES.Primordial"
    },
  }

  CONFIG.UTOPIA.COMPONENTS = {
    material: {
      label: "UTOPIA.COMPONENTS.Material",
      icon: "fas fa-cube",
      color: "#A52A2A",
      foragingTrait: "awa",
      craftingTrait: "eng",
      foraging: {
        crude: {
          test: "1d4",
          harvest: "1d8"
        },
        common: {
          test: "3d6",
          harvest: "1d8"
        },
        extraordinary: {
          test: "5d8",
          harvest: "1d8"
        },
        rare: {
          test: "7d10",
          harvest: "1d8"
        },
        legendary: {
          test: "9d12",
          harvest: "1d8"
        },
        mythical: {
          test: "11d20",
          harvest: "1d8"
        },
      },
      crafting: {
        extraordinary: {
          material: {
            common: 2
          },
          difficulty: 12,
        },
        rare: {
          material: {
            extraordinary: 2
          },
          difficulty: 18,
        },
        legendary: {
          material: {
            rare: 2
          },
          difficulty: 24,
        },
        mythical: {
          material: {
            legendary: 2
          },
          difficulty: 30,
        },
      }
    },
    refinement: {
      label: "UTOPIA.COMPONENTS.Refinement",
      icon: "fas fa-hammer",
      color: "#A52A2A",
      foragingTrait: "awa",
      craftingTrait: "eng",
      foraging: {
        crude: {
          test: "2d4",
          harvest: "1d6"
        },
        common: {
          test: "4d6",
          harvest: "1d6"
        },
        extraordinary: {
          test: "6d8",
          harvest: "1d6"
        },
        rare: {
          test: "8d10",
          harvest: "1d6"
        },
        legendary: {
          test: "10d12",
          harvest: "1d6"
        },
        mythical: {
          test: "12d20",
          harvest: "1d6"
        },
      },
      crafting: {
        extraordinary: {
          material: {
            common: 1,
            extraordinary: 1
          },
          difficulty: 14,
        },
        rare: {
          material: {
            rare: 1,
            extraordinary: 1
          },
          difficulty: 20,
        },
        legendary: {
          material: {
            legendary: 1,
            rare: 1
          },
          difficulty: 26,
        },
        mythical: {
          material: {
            legendary: 1,
            mythical: 1
          },
          difficulty: 32,
        },
      }
    },
    power: {
      label: "UTOPIA.COMPONENTS.Power",
      icon: "fas fa-bolt",
      color: "#A52A2A",
      foragingTrait: "awa",
      craftingTrait: "eng",
      foraging: {
        crude: {
          test: "3d4",
          harvest: "1d4"
        },
        common: {
          test: "5d6",
          harvest: "1d4"
        },
        extraordinary: {
          test: "7d8",
          harvest: "1d4"
        },
        rare: {
          test: "9d10",
          harvest: "1d4"
        },
        legendary: {
          test: "11d12",
          harvest: "1d4"
        },
        mythical: {
          test: "13d20",
          harvest: "1d4"
        },
      },
      crafting: {
        common: {
          material: {
            common: 1
          },
          refinement: {
            common: 1
          },
          difficulty: 11,
        },
        extraordinary: {
          material: {
            extraordinary: 1
          },
          refinement: {
            extraordinary: 1
          },
          difficulty: 17,
        },
        rare: {
          material: {
            rare: 1
          },
          refinement: {
            rare: 1
          },
          difficulty: 23,
        },
        legendary: {
          material: {
            legendary: 1
          },
          refinement: {
            legendary: 1
          },
          difficulty: 29,
        },
        mythical: {
          material: {
            mythical: 1
          },
          refinement: {
            mythical: 1
          },
          difficulty: 35,
        },
      }
    }
  }

  CONFIG.statusEffects = [
    {
      id: "deafened",
      img: "icons/svg/sound-off.svg",
      name: "UTOPIA.StatusEffects.deafened",
    },
    {
      id: "blinded",
      img: "icons/svg/blind.svg",
      name: "UTOPIA.StatusEffects.blinded",
    },
    {
      id: "unconcious",
      img: "icons/svg/unconscious.svg",
      name: "UTOPIA.StatusEffects.unconscious",
    },
    {
      id: "paralysis",
      img: "icons/svg/paralysis.svg",
      name: "UTOPIA.StatusEffects.paralysis",
    },
    {
      id: "dazed",
      img: "icons/svg/stoned.svg",
      name: "UTOPIA.StatusEffects.dazed",
    },
    {
      id: "concentration",
      img: "icons/svg/padlock.svg",
      name: "UTOPIA.StatusEffects.concentration",
    },
    {
      id: "focus",
      img: "icons/svg/daze.svg",
      name: "UTOPIA.StatusEffects.focus",
    },
    {
      id: "fatigue",
      img: "icons/svg/degen.svg",
      name: "UTOPIA.StatusEffects.fatigue",
    },
    {
      id: "stasis", 
      img: "icons/svg/aura.svg",
      name: "UTOPIA.StatusEffects.stasis",
    },
    {
      id: "dead",
      img: "icons/svg/skull.svg",
      name: "UTOPIA.StatusEffects.dead",
    }
  ]

  CONFIG.Dice.functions = {
    gt: (a, b) => { 
      return a > b;
    },
    lt: (a, b) => {
      return a < b;
    },
    gte: (a, b) => {
      return a >= b;
    },
    lte: (a, b) => {
      return a <= b;
    },
    eq: (a, b) => {
      return a == b;
    },
    min: (a, b) => {
      return Math.min(a, b);
    },
    max: (a, b) => {
      return Math.max(a, b);
    },
  }
}