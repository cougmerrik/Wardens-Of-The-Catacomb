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
      "Pick Longbow as your weapon style.",
      "Ranged: Draw Shot has the longest range and high single-hit pressure.",
      "Melee: Bow Guard is a weak defensive shove with a wide arc."
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
      "Pick Throwing Knives as your weapon style.",
      "Ranged: fast single knife throws.",
      "Melee: flexible close cuts with the fastest swap rhythm."
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
      "Pick Twin Daggers as your weapon style.",
      "Ranged: short thrown blades for combo upkeep.",
      "Melee: very fast flurry attacks and strong combo generation."
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
      "Pick Rapier & Pistol as your weapon style.",
      "Ranged: slow pistol shot with small knockback.",
      "Melee: precise high-damage lunge with a narrow arc."
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
      "Pick Opportunist as your combat rhythm.",
      "Swapping grants a 2 second destination-mode stat window.",
      "First attack after swapping deals moderate bonus damage."
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
      "Pick Ambush as your combat rhythm.",
      "Swapping grants a short damage window and high first-hit burst.",
      "The burst improves after idling or hitting a new target."
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
      "Pick Predator as your combat rhythm.",
      "Melee attacks generate additional combo.",
      "Ranged attacks spend combo to pierce, and swap attacks scale with combo."
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
      "Pick Footwork as your mode-swap style.",
      "Swapping grants temporary block chance and block power.",
      "Your first attack after swapping grants brief damage reduction."
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
      "Pick Precision as your attack modifier.",
      "Repeated hits and combo improve critical pressure.",
      "Best single-target payoff with Longbow and Rapier."
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
      "Pick Flurry as your attack modifier.",
      "Hits increase attack speed while you stay active.",
      "Melee ramps faster than ranged."
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
      "Pick Bleed as your attack modifier.",
      "Attacks apply stacking physical damage over time.",
      "Melee applies stronger bleed than ranged."
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
      "Pick Trick Shots as your attack modifier.",
      "Ranged attacks can pierce or ricochet.",
      "Melee attacks can create small splash or follow-up effects."
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
      "Pick Skirmisher as your attack modifier.",
      "Damage increases after movement.",
      "Swapping helps preserve the movement bonus."
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
      "Pick the Ranger path.",
      "Right-click becomes Fire Arrow.",
      "Ranged attacks gain multi-shot and projectile pressure identity."
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
      "Pick the Rogue path.",
      "Right-click becomes Shadowstep.",
      "Stealth and swap attacks gain burst identity."
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
      "Pick the Assassin path.",
      "Right-click becomes Execute.",
      "Marks, low-health damage, and chain kills become your identity."
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
      "Pick the Beast Master path.",
      "Right-click becomes Nature's Ally.",
      "Summon or heal a wolf while buffing your own speed."
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
      "Swapping to melee grants brief untargetable invisibility.",
      "Incidental damage can still hit you.",
      "Breaking invisibility empowers your next hit."
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
      "Combo decay starts later and decays more slowly.",
      "Melee hits generate extra combo."
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
      "Hits apply slowing poison.",
      "Poison has a 1 second internal cooldown.",
      "Wolf attacks can inherit a reduced slow."
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
      "Pickups grant regeneration over time.",
      "Mushrooms can spawn in the dungeon and heal when picked up."
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
      "Player or wolf credited kills restore health and grant a short buff.",
      "Triggers at most once every 2 seconds."
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
      "At combo thresholds, attacks trigger shockwave or tempest effects.",
      "Effects are cooldown-gated and automatic."
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
      "Swapping drops a smoke cloud that prevents enemy targeting.",
      "Attacks inside smoke generate extra combo."
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
      "Repeated hits apply the existing Marked condition.",
      "Marks are tracked per player in multiplayer."
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
      "Ranged attacks gain projectile escalation.",
      "Melee attacks gain storm extensions."
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
      "Attacks after stealth or swapping create shadow echo damage.",
      "Combo increases echo pressure."
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
      "Kills can chain reduced execute hits to nearby enemies.",
      "Marked targets improve the chain but are not required."
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
      "Each combo tier grants broad damage, speed, and defense bonuses.",
      "At high combo, the wolf gains a pouncing bite."
    ]
  }
];

export const DEF_BY_KEY = Object.fromEntries(RANGER_TALENT_DEFS.map((def) => [def.key, def]));
