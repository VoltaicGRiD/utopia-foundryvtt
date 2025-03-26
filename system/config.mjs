export function registerConfig() {
  CONFIG.UTOPIA.TRAITS = {
    agi: {
      name: 'Agility',
      short: 'agi',
      long: 'agility',
      label: game.i18n.localize('UTOPIA.TRAITS.Agility'),
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
      label: game.i18n.localize('UTOPIA.TRAITS.Strength'),
      path: 'system.traits.str',
      subtraits: ['pow', 'for']
    },
    int: {
      name: 'Intellect',
      short: 'int',
      long: 'intellect',
      icon: 'fas fa-brain-circuit',
      color: '#0D7F5F',
      label: game.i18n.localize('UTOPIA.TRAITS.Intellect'),
      path: 'system.traits.int',
      subtraits: ['eng', 'mem']
    },
    wil: {
      name: 'Will',
      short: 'wil',
      long: 'will',
      icon: 'fas fa-shield-alt',
      color: '#7F0D5F',
      label: game.i18n.localize('UTOPIA.TRAITS.Will'),
      path: 'system.traits.wil',
      subtraits: ['res', 'awa']
    },
    dis: {
      name: 'Display',
      short: 'dis',
      long: 'display',
      icon: 'fas fa-tv',
      color: '#7F5F0D',
      label: game.i18n.localize('UTOPIA.TRAITS.Display'),
      path: 'system.traits.dis',
      subtraits: ['por', 'stu']
    },
    cha: {
      name: 'Charm',
      short: 'cha',
      long: 'charm',
      icon: 'fas fa-face-grin-stars',
      color: '#782355',
      label: game.i18n.localize('UTOPIA.TRAITS.Charm'),
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
      label: game.i18n.localize('UTOPIA.SUBTRAITS.Dexterity'),
      path: 'system.subtraits.dex',
    },
    spd: {
      name: 'Speed',
      short: 'spd',
      long: 'speed',
      icon: 'fas fa-running',
      color: '#007A7A',
      label: game.i18n.localize('UTOPIA.SUBTRAITS.Speed'),
      path: 'system.subtraits.spd',
    },
    pow: {
      name: 'Power',
      short: 'pow',
      long: 'power',
      icon: 'fas fa-fist-raised',
      color: '#7F0D0D',
      label: game.i18n.localize('UTOPIA.SUBTRAITS.Power'),
      path: 'system.subtraits.pow',
    },
    for: {
      name: 'Fortitude',
      short: 'for',
      long: 'fortitude',
      icon: 'fas fa-fist-raised',
      color: '#7F0D0D',
      label: game.i18n.localize('UTOPIA.SUBTRAITS.Fortitude'),
      path: 'system.subtraits.for',
    },
    eng: {
      name: 'Engineering',
      short: 'eng',
      long: 'engineering',
      icon: 'fas fa-cogs',
      color: '#0D7F5F',
      label: game.i18n.localize('UTOPIA.SUBTRAITS.Engineering'),
      path: 'system.subtraits.eng',
    },
    mem: {
      name: 'Memory',
      short: 'mem',
      long: 'memory',
      icon: 'fas fa-brain',
      color: '#0D7F5F',
      label: game.i18n.localize('UTOPIA.SUBTRAITS.Memory'),
      path: 'system.subtraits.mem',
    },
    res: {
      name: 'Resolve',
      short: 'res',
      long: 'resolve',
      icon: 'fas fa-shield-alt',
      color: '#7F0D5F',
      label: game.i18n.localize('UTOPIA.SUBTRAITS.Resolve'),
      path: 'system.subtraits.res',
    },
    awa: {
      name: 'Awareness',
      short: 'awa',
      long: 'awareness',
      icon: 'fas fa-eye',
      color: '#7F0D5F',
      label: game.i18n.localize('UTOPIA.SUBTRAITS.Awareness'),
      path: 'system.subtraits.awa',
    },
    por: {
      name: 'Portrayal',
      short: 'por',
      long: 'portrayal',
      icon: 'fas fa-mobile-alt',
      color: '#7F5F0D',
      label: game.i18n.localize('UTOPIA.SUBTRAITS.Portrayal'),
      path: 'system.subtraits.por',
    },
    stu: {
      name: 'Stunt',
      short: 'stu',
      long: 'stunt',
      icon: 'fas fa-mobile-alt',
      color: '#7F5F0D',
      label: game.i18n.localize('UTOPIA.SUBTRAITS.Stunt'),
      path: 'system.subtraits.stu',
    },
    app: {
      name: 'Appeal',
      short: 'app',
      long: 'appeal',
      icon: 'fas fa-face-grin-stars',
      color: '#782355',
      label: game.i18n.localize('UTOPIA.SUBTRAITS.Appeal'),
      path: 'system.subtraits.app',
    },
    lan: {
      name: 'Language',
      short: 'lan',
      long: 'language',
      icon: 'fas fa-language',
      color: '#782355',
      label: game.i18n.localize('UTOPIA.SUBTRAITS.Language'),
      path: 'system.subtraits.lan',
    }
  }

  CONFIG.UTOPIA.SPECIALTY_CHECKS = {
    stealth: {
      defaultAttribute: "stu",
      formula: "3d6 + @stu.mod",
      tags: ["stunt", "stealth", "sneak", "sneaking", "hide", "hiding"],
      label: game.i18n.localize("UTOPIA.SPECIALTY_CHECKS.Stealth.label"),
      icon: "fas fa-user-secret"
    },
    disguise: {
      defaultAttribute: "por",
      formula: "3d6 + @por.mod",
      tags: ["portrayal", "disguise", "disguising", "camouflage", "camouflaging", "secretIdentity", "unknownIdentity"],
      label: game.i18n.localize("UTOPIA.SPECIALTY_CHECKS.Disguise.label"),
      icon: "fas fa-theater-masks"
    },
    mimic: {
      defaultAttribute: "dis",
      formula: "3d6 + @dis.mod",
      tags: ["display", "mimic", "mimicking", "copy", "copying", "impersonate", "impersonating"],
      label: game.i18n.localize("UTOPIA.SPECIALTY_CHECKS.Mimic.label"),
      icon: "fas fa-copy"
    },
    insight: {
      defaultAttribute: "int",
      formula: "3d6 + @int.mod",
      tags: ["intellect", "insight", "insightful", "analyze", "analyzing", "understand", "understanding"],
      label: game.i18n.localize("UTOPIA.SPECIALTY_CHECKS.Insight.label"),
      icon: "fas fa-lightbulb"
    },
    comprehendLanguages: {
      defaultAttribute: "mem",
      formula: "3d6 + @mem.mod",
      tags: ["memory", "comprehendLanguages", "understandLanguages", "translateLanguages", "translate"],
      label: game.i18n.localize("UTOPIA.SPECIALTY_CHECKS.ComprehendLanguages.label"),
      icon: "fas fa-language"
    },
    perception: {
      defaultAttribute: "awa",
      formula: "3d6 + @awa.mod",
      tags: ["awareness", "perception", "search", "searching"],
      label: game.i18n.localize("UTOPIA.SPECIALTY_CHECKS.Perception.label"),
      icon: "fas fa-eye"
    },
    persuasion: {
      defaultAttribute: "cha",
      formula: "3d6 + @cha.mod",
      tags: ["charm", "persuasion", "convince", "convincing", "negotiate", "negotiating", "bargain", "bargaining"],
      label: game.i18n.localize("UTOPIA.SPECIALTY_CHECKS.Persuasion.label"),
      icon: "fas fa-comments"
    },
    resistInfluence: {
      defaultAttribute: "wil",
      formula: "3d6 + @wil.mod",
      tags: ["will", "resistInfluence", "resistAction"],
      label: game.i18n.localize("UTOPIA.SPECIALTY_CHECKS.ResistInfluence.label"),
      icon: "fas fa-shield-alt"
    },
    forage: {
      defaultAttribute: "awa",
      formula: "3d6 + @awa.mod",
      tags: ["awareness", "forage", "foraging", "gather", "gathering"],
      label: game.i18n.localize("UTOPIA.SPECIALTY_CHECKS.Forage.label"),
      icon: "fas fa-leaf"
    },
    maintainFocus: {
      defaultAttribute: "wil",
      formula: "3d6 + @wil.mod",
      tags: ["will", "maintainFocus", ""],
      label: game.i18n.localize("UTOPIA.SPECIALTY_CHECKS.MaintainFocus.label"),
      icon: "fas fa-bullseye"
    },
    maintainConcentration: {
      defaultAttribute: "wil",
      formula: "3d6 + @wil.mod",
      tags: ["will", "maintainConcentration", "concentration", "concentrate"],
      label: game.i18n.localize("UTOPIA.SPECIALTY_CHECKS.MaintainConcentration.label"),
      icon: "fas fa-crosshairs"
    },
    appealAgainstHostile: {
      defaultAttribute: "app",
      formula: "3d6 + @app.mod",
      tags: ["appeal", "appealAgainstHostile", "appeal", "hostile"],
      label: game.i18n.localize("UTOPIA.SPECIALTY_CHECKS.AppealAgainstHostile.label"),
      icon: "fas fa-user-shield"
    }
  }

  CONFIG.UTOPIA.DAMAGE_TYPES = {
    energy: {
      name: 'Energy',
      icon: 'fas fa-bolt',
      block: 1.0,
      dodge: true,
      armor: true,
      label: game.i18n.localize('UTOPIA.DAMAGE_TYPES.Energy'),
    },
    heat: {
      name: 'Heat',
      icon: 'fas fa-fire',
      block: 1.0,
      dodge: true,
      armor: true,
      label: game.i18n.localize('UTOPIA.DAMAGE_TYPES.Heat'),
    },
    chill: {
      name: 'Chill',
      icon: 'fas fa-snowflake',
      block: 1.0,
      dodge: true,
      armor: true,
      label: game.i18n.localize('UTOPIA.DAMAGE_TYPES.Chill'),
    },
    physical: {
      name: 'Physical',
      icon: 'fas fa-fist-raised',
      block: 1.0,
      dodge: true,
      armor: true,
      label: game.i18n.localize('UTOPIA.DAMAGE_TYPES.Physical'),
    },
    pysche: {
      name: 'Psyche',
      icon: 'fas fa-brain',
      block: 1.0,
      dodge: true,
      armor: true,
      label: game.i18n.localize('UTOPIA.DAMAGE_TYPES.Psyche'),
    },
    kinetic: {
      name: 'Kinetic',
      icon: 'fas fa-bomb',
      block: 0,
      dodge: false,
      armor: false,
      label: game.i18n.localize('UTOPIA.DAMAGE_TYPES.Kinetic'),
    },
    stamina: {
      name: 'Stamina',
      icon: 'fas fa-heart-crack',
      block: 0,
      dodge: false,
      armor: false,
      label: game.i18n.localize('UTOPIA.DAMAGE_TYPES.Stamina'),
    },
    healing: {
      name: 'Healing',
      icon: 'fas fa-heart',
      block: 0,
      dodge: false,
      armor: false,
      label: game.i18n.localize('UTOPIA.DAMAGE_TYPES.Healing'),
    },
    restoreStamina: {
      name: 'Restore Stamina',
      icon: 'fas fa-heartbeat',
      block: 0,
      dodge: false,
      armor: false,
      label: game.i18n.localize('UTOPIA.DAMAGE_TYPES.RestoreStamina'),
    }
  }

  CONFIG.UTOPIA.ARTISTRIES = {
    alteration: {
      name: 'Alteration',
      short: 'alt',
      long: 'alteration',
      color: '#90c96b',
      label: game.i18n.localize('UTOPIA.ARTISTRIES.Alteration'),
    },
    array: {
      name: 'Array',
      short: 'arr',
      long: 'array',
      color: '#f3ec68',
      label: game.i18n.localize('UTOPIA.ARTISTRIES.Array'),
    },
    enchantment: {
      name: 'Enchantment',
      short: 'ench',
      long: 'enchantment',
      color: '#ee92b7',
      label: game.i18n.localize('UTOPIA.ARTISTRIES.Enchantment'),
    },
    evocation: {
      name: 'Evocation',
      short: 'evo',
      long: 'evocation',
      color: '#ee6448',
      label: game.i18n.localize('UTOPIA.ARTISTRIES.Evocation'),
    },
    divination: {
      name: 'Divination',
      short: 'div',
      long: 'divination',
      color: '#62b4ae',
      label: game.i18n.localize('UTOPIA.ARTISTRIES.Divination'),
    },
    illusion: {
      name: 'Illusion',
      short: 'ill',
      long: 'illusion',
      color: '#94d2e1',
      label: game.i18n.localize('UTOPIA.ARTISTRIES.Illusion'),
    },
    necromancy: {
      name: 'Necromancy',
      short: 'necro',
      long: 'necromancy',
      color: '#a75aa2',
      label: game.i18n.localize('UTOPIA.ARTISTRIES.Necromancy'),
    },
    wake: {
      name: 'Wake',
      short: 'wake',
      long: 'wake',
      color: '#f5a755',
      label: game.i18n.localize('UTOPIA.ARTISTRIES.Wake'),
    },
  }

  CONFIG.UTOPIA.RARITIES = {
    crude: {
      value: 0,
      label: game.i18n.localize('UTOPIA.RARITIES.Crude'),
      color: '#808080',
    },
    common: {
      value: 1,
      label: game.i18n.localize('UTOPIA.RARITIES.Common'),
      color: '#FFFFFF',
    },
    extraordinary: {
      value: 2,
      label: game.i18n.localize('UTOPIA.RARITIES.Extraordinary'),
      color: '#1E90FF',
    },
    rare: {
      value: 3,
      label: game.i18n.localize('UTOPIA.RARITIES.Rare'),
      color: '#9370DB',
    },
    legendary: {
      value: 4,
      label: game.i18n.localize('UTOPIA.RARITIES.Legendary'),
      color: '#FFD700',
    },
    mythical: {
      value: 5,
      label: game.i18n.localize('UTOPIA.RARITIES.Mythical'),
      color: '#FF4500',
    },
  }

  CONFIG.UTOPIA.LANGUAGES = {
    utopian: {
      name: "Utopian",
      label: game.i18n.localize("UTOPIA.LANGUAGES.Utopian")
    },
    elven: {
      name: "Elven",
      label: game.i18n.localize("UTOPIA.LANGUAGES.Elven")
    },
    apparatusCode: {
      name: "Apparatus Code",
      label: game.i18n.localize("UTOPIA.LANGUAGES.ApparatusCode")
    },
    dwarven: {
      name: "Dwarven",
      label: game.i18n.localize("UTOPIA.LANGUAGES.Dwarven")
    },
    oxtan: { 
      name: "Oxtan",
      label: game.i18n.localize("UTOPIA.LANGUAGES.Oxtan")
    },
    primordial: {
      name: "Primordial",
      label: game.i18n.localize("UTOPIA.LANGUAGES.Primordial")
    },
  }

  CONFIG.UTOPIA.COMPONENTS = {
    material: {
      label: game.i18n.localize("UTOPIA.COMPONENTS.Material"),
      icon: "fas fa-cube",
      color: "#A52A2A",
      foraging: {
        crude: {
          test: "1d4",
          trait: "awa",
          harvest: "1d8"
        },
        common: {
          test: "3d6",
          trait: "awa",
          harvest: "1d8"
        },
        extraordinary: {
          test: "5d8",
          trait: "awa",
          harvest: "1d8"
        },
        rare: {
          test: "7d10",
          trait: "awa",
          harvest: "1d8"
        },
        legendary: {
          test: "9d12",
          trait: "awa",
          harvest: "1d8"
        },
        mythical: {
          test: "11d20",
          trait: "awa",
          harvest: "1d8"
        },
      },
      crafting: {
        extraordinary: {
          material: {
            common: 2
          },
          difficulty: 12,
          trait: "eng",
        },
        rare: {
          material: {
            extraordinary: 2
          },
          difficulty: 18,
          trait: "eng",
        },
        legendary: {
          material: {
            rare: 2
          },
          difficulty: 24,
          trait: "eng",
        },
        mythical: {
          material: {
            legendary: 2
          },
          difficulty: 30,
          trait: "eng",
        },
      }
    },
    refinement: {
      label: game.i18n.localize("UTOPIA.COMPONENTS.Refinement"),
      icon: "fas fa-hammer",
      color: "#A52A2A",
      foraging: {
        crude: {
          test: "2d4",
          trait: "awa",
          harvest: "1d6"
        },
        common: {
          test: "4d6",
          trait: "awa",
          harvest: "1d6"
        },
        extraordinary: {
          test: "6d8",
          trait: "awa",
          harvest: "1d6"
        },
        rare: {
          test: "8d10",
          trait: "awa",
          harvest: "1d6"
        },
        legendary: {
          test: "10d12",
          trait: "awa",
          harvest: "1d6"
        },
        mythical: {
          test: "12d20",
          trait: "awa",
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
          trait: "eng",
        },
        rare: {
          material: {
            rare: 1,
            extraordinary: 1
          },
          difficulty: 20,
          trait: "eng",
        },
        legendary: {
          material: {
            legendary: 1,
            rare: 1
          },
          difficulty: 26,
          trait: "eng",
        },
        mythical: {
          material: {
            legendary: 1,
            mythical: 1
          },
          difficulty: 32,
          trait: "eng",
        },
      }
    },
    power: {
      label: game.i18n.localize("UTOPIA.COMPONENTS.Power"),
      icon: "fas fa-bolt",
      color: "#A52A2A",
      foraging: {
        crude: {
          test: "3d4",
          trait: "awa",
          harvest: "1d4"
        },
        common: {
          test: "5d6",
          trait: "awa",
          harvest: "1d4"
        },
        extraordinary: {
          test: "7d8",
          trait: "awa",
          harvest: "1d4"
        },
        rare: {
          test: "9d10",
          trait: "awa",
          harvest: "1d4"
        },
        legendary: {
          test: "11d12",
          trait: "awa",
          harvest: "1d4"
        },
        mythical: {
          test: "13d20",
          trait: "awa",
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
          trait: "eng"
        },
        extraordinary: {
          material: {
            extraordinary: 1
          },
          refinement: {
            extraordinary: 1
          },
          difficulty: 17,
          trait: "eng"
        },
        rare: {
          material: {
            rare: 1
          },
          refinement: {
            rare: 1
          },
          difficulty: 23,
          trait: "eng"
        },
        legendary: {
          material: {
            legendary: 1
          },
          refinement: {
            legendary: 1
          },
          difficulty: 29,
          trait: "eng"
        },
        mythical: {
          material: {
            mythical: 1
          },
          refinement: {
            mythical: 1
          },
          difficulty: 35,
          trait: "eng"
        },
      }
    }
  }

  // CONFIG.UTOPIA.SLOTS = {
  //   head: {
  //     name: "Head",
  //     label: game.i18n.localize("UTOPIA.SLOTS.Head")
  //   },
  //   neck: {
  //     name: "Neck",
  //     label: game.i18n.localize("UTOPIA.SLOTS.Neck")
  //   },
  //   chest: {
  //     name: "Chest",
  //     label: game.i18n.localize("UTOPIA.SLOTS.Chest")
  //   },
  //   back: {
  //     name: "Back",
  //     label: game.i18n.localize("UTOPIA.SLOTS.Back")
  //   },
  //   hands: {
  //     name: "Hands",
  //     label: game.i18n.localize("UTOPIA.SLOTS.Hands")
  //   },
  //   ring: {
  //     name: "Ring",
  //     label: game.i18n.localize("UTOPIA.SLOTS.Ring")
  //   },
  //   waist: {
  //     name: "Waist",
  //     label: game.i18n.localize("UTOPIA.SLOTS.Waist")
  //   },
  //   feet: {
  //     name: "Feet",
  //     label: game.i18n.localize("UTOPIA.SLOTS.Feet")
  //   },
  // }

  CONFIG.statusEffects = [
    {
      id: "deafened",
      img: "icons/svg/sound-off.svg",
      label: "UTOPIA.StatusEffects.deafened",
    },
    {
      id: "blinded",
      img: "icons/svg/blind.svg",
      label: "UTOPIA.StatusEffects.blinded",
    },
    {
      id: "unconcious",
      img: "icons/svg/unconscious.svg",
      label: "UTOPIA.StatusEffects.unconscious",
    },
    {
      id: "paralysis",
      img: "icons/svg/paralysis.svg",
      label: "UTOPIA.StatusEffects.paralysis",
    },
    {
      id: "dazed",
      img: "icons/svg/stoned.svg",
      label: "UTOPIA.StatusEffects.dazed",
    },
    {
      id: "concentration",
      img: "icons/svg/padlock.svg",
      label: "UTOPIA.StatusEffects.concentration",
    },
    {
      id: "focus",
      img: "icons/svg/daze.svg",
      label: "UTOPIA.StatusEffects.focus",
    },
    {
      id: "fatigue",
      img: "icons/svg/degen.svg",
      label: "UTOPIA.StatusEffects.fatigue",
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