export const RANGER_GROUP_LIMITS = {
  weapon: 1,
  swap: 1,
  modifier: 1,
  path: 1,
  general: 2,
  capstone: 1
};

export const RANGER_TIER_LEVELS = {
  1: 2,
  2: 3,
  3: 5,
  4: 7,
  5: 9,
  6: 12
};

export const OPEN_PROGRESSION_SP_LEVELS = new Set([2, 3, 5, 7, 9, 10, 12]);

export const RANGER_TIER_LABELS = {
  1: "Weapon Style",
  2: "Mode Swap",
  3: "Attack Modifier",
  4: "Path",
  5: "General Skills",
  6: "Capstone"
};

export const RANGER_TALENT_DEFS = [
  {
    key: "longbow",
    label: "Longbow",
    tier: 1,
    group: "weapon",
    maxRanks: 1,
    icon: "LB",
    color: "#8eb8ff",
    description: [
      "Weapon. Swapping modes has a 1.2 sec cooldown.",
      "Ranged attacks become long-range Draw Shots: 360 range, 0.48 sec attack time, 124% physical damage, +1 combo.",
      "Melee attacks become Bow Guard: a 34 range wide shove for 42% melee damage, +1 combo, 24% melee-mode damage reduction, and a 1.5 tile knockback."
    ]
  },
  {
    key: "throwingKnives",
    label: "Throwing Knives",
    tier: 1,
    group: "weapon",
    maxRanks: 1,
    icon: "TK",
    color: "#78dcb6",
    description: [
      "Weapon. Swapping modes has a 0.5 sec cooldown.",
      "Ranged attacks throw quick knives: 260 range, 0.30 sec attack time, 88% physical damage, +1 combo.",
      "Melee attacks become Close Cuts: 40 range, 0.28 sec attack time, 107% melee damage, +2 combo, and 8% melee-mode damage reduction."
    ]
  },
  {
    key: "twinDaggers",
    label: "Twin Daggers",
    tier: 1,
    group: "weapon",
    maxRanks: 1,
    icon: "TD",
    color: "#b7f4dc",
    description: [
      "Weapon. Swapping modes has a 0.65 sec cooldown.",
      "Ranged attacks throw short blades: 180 range, 0.26 sec attack time, 68% physical damage, +1 combo.",
      "Melee attacks become fast dagger flurries: 34 range, 0.20 sec attack time, 94% melee damage, +2 combo, and 12% melee-mode damage reduction."
    ]
  },
  {
    key: "rapierPistol",
    label: "Rapier & Pistol",
    tier: 1,
    group: "weapon",
    maxRanks: 1,
    icon: "RP",
    color: "#e7d08c",
    description: [
      "Weapon. Swapping modes has a 0.8 sec cooldown.",
      "Ranged attacks fire pistol shots: 420 range, 0.70 sec attack time, 108% physical damage, +1 combo, and 70 knockback.",
      "Melee attacks become lunges: 52 range, narrow arc, 0.38 sec attack time, 189% melee damage, +2 combo, and 10% melee-mode damage reduction."
    ]
  },
  {
    key: "opportunist",
    label: "Opportunist",
    tier: 2,
    group: "swap",
    maxRanks: 1,
    icon: "OP",
    color: "#7cd5ff",
    description: [
      "Mode. Your weapon swap cooldown is reduced by 15%.",
      "After swapping, gain a 2 sec destination-mode window. Your next attack in that mode deals 120% damage.",
      "While the window is active in ranged mode, projectiles gain +20% speed and +20% lifetime/range; melee mode gains +15% attack speed."
    ]
  },
  {
    key: "ambush",
    label: "Ambush",
    tier: 2,
    group: "swap",
    maxRanks: 1,
    icon: "AM",
    color: "#ffba6d",
    description: [
      "Mode. Swapping primes your next attack for 2 sec.",
      "The primed attack deals 155% physical or melee damage.",
      "If you have been idle for at least 2 sec or strike a new target, the primed attack deals an additional 25% damage."
    ]
  },
  {
    key: "predator",
    label: "Predator",
    tier: 2,
    group: "swap",
    maxRanks: 1,
    icon: "PD",
    color: "#d0f09d",
    description: [
      "Mode. Melee hits generate +1 additional combo.",
      "Ranged attacks spend 2 combo, when available, to pierce one additional enemy.",
      "Your first attack after swapping gains +1.5% damage per current combo point, up to +45% at 30 combo."
    ]
  },
  {
    key: "footwork",
    label: "Footwork",
    tier: 2,
    group: "swap",
    maxRanks: 1,
    icon: "FW",
    color: "#cbb5ff",
    description: [
      "Mode. Swapping grants 2 sec of footwork.",
      "While active, blockable incoming hits have a 45% chance to be blocked.",
      "Your first attack after swapping deals 105% damage and grants 1 sec of 20% damage reduction."
    ]
  },
  {
    key: "precision",
    label: "Precision",
    tier: 3,
    group: "modifier",
    maxRanks: 1,
    icon: "PR",
    color: "#d6e4ff",
    description: [
      "Modifier. Your attacks can critically strike.",
      "Gain 8% critical strike chance, plus 3% additional critical chance for each combo tier reached at 5, 10, and 20 combo.",
      "Critical strikes deal 150% physical or melee damage."
    ]
  },
  {
    key: "flurry",
    label: "Flurry",
    tier: 3,
    group: "modifier",
    maxRanks: 1,
    icon: "FL",
    color: "#88efaa",
    description: [
      "Modifier. Your combo tiers increase attack speed.",
      "At 5, 10, and 20 combo, gain +6%, +12%, and +18% attack speed respectively.",
      "Melee weapons generate combo quickly, letting this ramp faster in close combat."
    ]
  },
  {
    key: "bleed",
    label: "Bleed",
    tier: 3,
    group: "modifier",
    maxRanks: 1,
    icon: "BL",
    color: "#d36a62",
    description: [
      "Modifier. Hits apply or refresh a 3 sec physical bleed.",
      "Ranged hits set bleed DPS to at least 25% of your primary damage.",
      "Melee hits set bleed DPS to at least 50% of your primary damage."
    ]
  },
  {
    key: "trickShots",
    label: "Trick Shots",
    tier: 3,
    group: "modifier",
    maxRanks: 1,
    icon: "TS",
    color: "#aac7ff",
    description: [
      "Modifier. Ranged shots can ricochet off walls twice.",
      "While stationary, ranged shots gain +25% pierce chance.",
      "Each enemy hit by the same shot increases that shot's later hit damage by 8%."
    ]
  },
  {
    key: "skirmisher",
    label: "Skirmisher",
    tier: 3,
    group: "modifier",
    maxRanks: 1,
    icon: "SK",
    color: "#8ee1c6",
    description: [
      "Modifier. Deal 8% increased damage while currently moving.",
      "The bonus applies through your normal damage multiplier, affecting physical, melee, and class-effect damage.",
      "This has no internal cooldown and falls off immediately when you stop moving."
    ]
  },
  {
    key: "rangerPath",
    label: "Ranger",
    tier: 4,
    group: "path",
    maxRanks: 1,
    icon: "RA",
    color: "#ff9b52",
    description: [
      "Path. Your right-click class skill becomes Fire Arrow, with a 2 sec cooldown.",
      "Fire Arrow fires a burning projectile that deals fire impact damage in an area and leaves a 1 sec fire zone that deals fire damage over time.",
      "Your primary ranged attacks fire +1 additional arrow, increasing further at combo tier 2 and combo tier 3."
    ]
  },
  {
    key: "roguePath",
    label: "Rogue",
    tier: 4,
    group: "path",
    maxRanks: 1,
    icon: "RO",
    color: "#b78dff",
    description: [
      "Path. Your right-click class skill becomes Shadowstep, with an 8 sec cooldown.",
      "Shadowstep dashes 140 units in your aim direction and grants 1.5 sec of stealth.",
      "After Shadowstep, your next attack in your current weapon mode deals 150% damage."
    ]
  },
  {
    key: "assassinPath",
    label: "Assassin",
    tier: 4,
    group: "path",
    maxRanks: 1,
    icon: "AS",
    color: "#f0c39b",
    description: [
      "Path. Your right-click class skill becomes Execute, with a 7 sec cooldown.",
      "Execute throws a physical knife at a visible target within your ranged weapon range and applies Marked for 4 sec.",
      "Non-boss targets are killed outright. Bosses instead take a 150% critical physical hit."
    ]
  },
  {
    key: "beastMasterPath",
    label: "Beast Master",
    tier: 4,
    group: "path",
    maxRanks: 1,
    icon: "BM",
    color: "#a6d77c",
    description: [
      "Path. Your right-click class skill becomes Nature's Ally, with a 10 sec cooldown.",
      "Nature's Ally summons a friendly wolf, or fully heals your existing wolf if it is alive.",
      "Activating Nature's Ally also grants 2 sec of Dodge, increasing your movement speed by 35%."
    ]
  },
  {
    key: "shadowVeil",
    label: "Shadow Veil",
    tier: 5,
    group: "general",
    maxRanks: 1,
    icon: "SV",
    color: "#9c88ff",
    description: [
      "General. Swapping into melee mode grants 1.25 sec of stealth.",
      "Stealth prevents enemies from targeting you, but does not prevent incidental or area damage.",
      "Your next melee hit consumes stealth and deals 35% increased damage."
    ]
  },
  {
    key: "relentless",
    label: "Relentless",
    tier: 5,
    group: "general",
    maxRanks: 1,
    icon: "RL",
    color: "#ffe27c",
    description: [
      "General. Your combo decay delay increases from 1.15 sec to 1.8 sec after gaining combo.",
      "Once decay begins, combo decays more slowly at every combo tier.",
      "Melee hits generate +1 additional combo."
    ]
  },
  {
    key: "venomCoating",
    label: "Venom Coating",
    tier: 5,
    group: "general",
    maxRanks: 1,
    icon: "VC",
    color: "#8ae06f",
    description: [
      "General. Your hits poison-slow enemies by 25% for 2 sec.",
      "This poison application has a 1 sec internal cooldown.",
      "If you have a wolf, its bites also apply a weaker poison slow: 16% for 1.2 sec."
    ]
  },
  {
    key: "forager",
    label: "Forager",
    tier: 5,
    group: "general",
    maxRanks: 1,
    icon: "FG",
    color: "#b7e38a",
    description: [
      "General. Health pickups and mushroom pickups grant 4 sec of regeneration.",
      "Regeneration heals 1.2% of maximum health per second.",
      "Healing mushrooms periodically spawn in the dungeon; picking one up resets its spawn timer."
    ]
  },
  {
    key: "predatorsFeast",
    label: "Predator's Feast",
    tier: 5,
    group: "general",
    maxRanks: 1,
    icon: "PF",
    color: "#ffb36a",
    description: [
      "General. When you or your wolf kill an enemy, heal for 4% of your maximum health.",
      "Also gain a 2 sec buff that increases movement speed by 10%.",
      "This effect has a 5 sec internal cooldown."
    ]
  },
  {
    key: "comboSurge",
    label: "Combo Surge",
    tier: 5,
    group: "general",
    maxRanks: 1,
    icon: "CS",
    color: "#ffe27c",
    description: [
      "General. While you have at least 10 combo, your hits automatically trigger a physical shockwave.",
      "At combo tier 2, the shockwave deals 45% primary damage in a 1 tile radius and has a 2.2 sec internal cooldown.",
      "At combo tier 3, it deals 85% primary damage in a 1.6 tile radius and has a 1.5 sec internal cooldown."
    ]
  },
  {
    key: "smokeBomb",
    label: "Smoke Bomb",
    tier: 5,
    group: "general",
    maxRanks: 1,
    icon: "SB",
    color: "#9ea7ad",
    description: [
      "General. Swapping modes drops a smoke cloud for 2.75 sec in a 1.55 tile radius.",
      "Enemies cannot target players standing inside your smoke cloud.",
      "Attacks made while standing in smoke generate +1 combo. This has a 15 sec internal cooldown."
    ]
  },
  {
    key: "quarry",
    label: "Quarry",
    tier: 5,
    group: "general",
    maxRanks: 1,
    icon: "QY",
    color: "#f5e8b0",
    description: [
      "General. Repeated hits against the same enemy build stacks, up to 3.",
      "At 2 or more stacks, the target is Marked for 4 sec.",
      "Enemies Marked by you take 8% increased damage from your ranger arrows."
    ]
  },
  {
    key: "stormcaller",
    label: "Stormcaller",
    tier: 6,
    group: "capstone",
    maxRanks: 1,
    icon: "SC",
    color: "#d8f4ff",
    description: [
      "Capstone. Your Fire Arrow impact damage and fire-zone damage over time are increased by 15%.",
      "Fire Arrow's blast radius is increased by 25%, and its projectile size is increased by 2.",
      "Your ranged shots gain +2 ricochets, +25% stationary pierce chance, and one storm split on ricochet."
    ]
  },
  {
    key: "livingShadow",
    label: "Living Shadow",
    tier: 6,
    group: "capstone",
    maxRanks: 1,
    icon: "LS",
    color: "#c7a5ff",
    description: [
      "Capstone. Your hits trigger a shadow echo, limited by a 0.8 sec internal cooldown.",
      "The echo deals 55% of its base echo damage, with a minimum of 3 damage. Damage type follows the triggering hit.",
      "Hits empowered by stealth or by a swap bonus can trigger additional shadow echoes."
    ]
  },
  {
    key: "deathChain",
    label: "Death Chain",
    tier: 6,
    group: "capstone",
    maxRanks: 1,
    icon: "DC",
    color: "#ffc0b3",
    description: [
      "Capstone. When you kill an enemy, chain damage strikes up to 2 nearby enemies within 3 tiles.",
      "Chain damage is physical and based on your primary damage.",
      "The chain deals 70% primary damage, or 110% primary damage if the killed enemy was Marked."
    ]
  },
  {
    key: "apexPredator",
    label: "Apex Predator",
    tier: 6,
    group: "capstone",
    maxRanks: 1,
    icon: "AP",
    color: "#fff0bd",
    description: [
      "Capstone. Your combo tiers grant broad bonuses to damage, movement speed, attack speed, and damage reduction.",
      "At 5, 10, and 20 combo, this grants up to +15% damage, +12% movement speed, +8% attack speed, and +6% damage reduction.",
      "At 20 combo, your wolf can pounce every 4 sec, dealing bonus physical damage and splash damage."
    ]
  }
];

export const DEF_BY_KEY = Object.fromEntries(RANGER_TALENT_DEFS.map((def) => [def.key, def]));
