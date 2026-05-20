import { getOpenProgressionSkillPointGainForLevel, getOpenProgressionTierLevel } from "./openProgression.js";

const WARRIOR_TIER_PICK_LIMITS = {
  1: 1,
  2: 1,
  3: 1,
  4: 1,
  5: 2,
  6: 1
};

const WEAPON_KEYS = ["broadswing", "longspear", "warWhip", "twinHatchets"];
const STANCE_MODIFIER_KEYS = ["cleaving", "focused", "swift", "heavy", "guarded", "marked"];
const DOCTRINE_KEYS = ["paladinDoctrine", "berserkerDoctrine", "gladiatorDoctrine", "eldritchDoctrine"];
const EXTRA_KEYS = ["consecratedGround", "cleaveDiscipline", "executionersReach", "battleFrenzy", "shockRelease", "butchersPath", "redTempest", "secondWind"];
const CAPSTONE_KEYS = ["bastion", "ravager", "paragon", "spellknight"];

const WARRIOR_TALENT_DEFS = [
  {
    key: "broadswing",
    label: "Broadswing",
    tier: 1,
    family: "Weapon",
    icon: "BW",
    color: "#d7a06a",
    description: [
      "Weapon. Your melee attacks use a broad 125 degree swing with 44 range.",
      "Deals 100% melee damage with a normal attack speed multiplier and 12 knockback.",
      "Best for stable front-line control and reliable horde coverage."
    ]
  },
  {
    key: "longspear",
    label: "Longspear",
    tier: 1,
    family: "Weapon",
    icon: "LS",
    color: "#c8c39a",
    description: [
      "Weapon. Your melee attacks use a narrow 40 degree thrust with 76 range.",
      "Deals 108% melee damage, attacks 12% slower, applies 11 knockback, and adds 18% stagger pressure.",
      "Best for spacing, lane control, and disciplined single-line fighting."
    ]
  },
  {
    key: "warWhip",
    label: "War Whip",
    tier: 1,
    family: "Weapon",
    icon: "WW",
    color: "#9b8fd4",
    description: [
      "Weapon. Your melee attacks use an 86 degree lash with 60 range.",
      "Deals 88% melee damage, attacks 10% faster, applies 8 knockback, and slows on hit by 12% for 1.2 sec.",
      "Best for mid-range control and setting up enemies before they reach you."
    ]
  },
  {
    key: "twinHatchets",
    label: "Twin Hatchets",
    tier: 1,
    family: "Weapon",
    icon: "TH",
    color: "#d86f5e",
    description: [
      "Weapon. Your melee attacks use a 70 degree close-range chop with 38 range.",
      "Deals 80% melee damage, attacks 34% faster, and applies 9 knockback.",
      "Every third hatchet hit deals 25% increased melee damage."
    ]
  },
  {
    key: "stanceACleaving",
    label: "Cleaving Form",
    tier: 2,
    family: "Stance A",
    icon: "CL",
    color: "#dfb57f",
    description: [
      "Stance. Primary attacks gain wider coverage for horde clearing.",
      "Arc width increases by 25%, or more for spear and whip forms; range also increases slightly.",
      "Deals 8% less melee damage but adds +2 knockback."
    ]
  },
  {
    key: "stanceAFocused",
    label: "Focused Form",
    tier: 2,
    family: "Stance A",
    icon: "FC",
    color: "#f0c39b",
    description: [
      "Stance. Primary attacks become narrower, slower, and harder hitting.",
      "Deals 33% increased melee damage, attacks 8% slower, and adds +3 knockback.",
      "Adds +20% execute pressure; secondary stance converts part of this into extra finishing damage."
    ]
  },
  {
    key: "stanceASwift",
    label: "Swift Form",
    tier: 2,
    family: "Stance A",
    icon: "SW",
    color: "#b5e0b9",
    description: [
      "Stance. Primary attacks become faster and lighter.",
      "Deals 32% less melee damage but attacks 28% faster.",
      "Having Swift in either stance also grants +8% global warrior attack speed."
    ]
  },
  {
    key: "stanceAHeavy",
    label: "Heavy Form",
    tier: 2,
    family: "Stance A",
    icon: "HV",
    color: "#d48b72",
    description: [
      "Stance. Primary attacks become heavier and slower.",
      "Deals 28% increased melee damage, attacks 22% slower, and adds +10 knockback.",
      "Adds 16% stagger pressure and slightly widens most weapon arcs."
    ]
  },
  {
    key: "stanceAGuarded",
    label: "Guarded Form",
    tier: 2,
    family: "Stance A",
    icon: "GD",
    color: "#ced8bf",
    description: [
      "Stance. Primary attacks trade offense for guard windows.",
      "Deals 12% less melee damage and attacks 4% slower.",
      "Grants a 0.55 sec block window, +2 knockback, and 8% stagger pressure."
    ]
  },
  {
    key: "stanceAMarked",
    label: "Marked Form",
    tier: 2,
    family: "Stance A",
    icon: "MK",
    color: "#aab7c9",
    description: [
      "Stance. Primary attacks apply a 5 sec Mark to enemies hit.",
      "Range increases by 10%; whip hits also slow by at least 14%.",
      "Marked targets take +3 bonus melee damage, with doctrine-specific payoffs."
    ]
  },
  {
    key: "stanceBCleaving",
    label: "Cleaving Form",
    tier: 3,
    family: "Stance B",
    icon: "CL",
    color: "#dfb57f",
    description: [
      "Stance. Secondary attacks gain wider coverage for horde clearing.",
      "Arc width increases by 25%, or more for spear and whip forms; range also increases slightly.",
      "Deals 8% less melee damage but adds +2 knockback."
    ]
  },
  {
    key: "stanceBFocused",
    label: "Focused Form",
    tier: 3,
    family: "Stance B",
    icon: "FC",
    color: "#f0c39b",
    description: [
      "Stance. Secondary attacks become narrower, slower, and harder hitting.",
      "Deals 33% increased melee damage, attacks 8% slower, and adds +3 knockback.",
      "Adds +20% execute pressure; secondary stance converts part of this into extra finishing damage."
    ]
  },
  {
    key: "stanceBSwift",
    label: "Swift Form",
    tier: 3,
    family: "Stance B",
    icon: "SW",
    color: "#b5e0b9",
    description: [
      "Stance. Secondary attacks become faster and lighter.",
      "Deals 32% less melee damage but attacks 28% faster.",
      "Having Swift in either stance also grants +8% global warrior attack speed."
    ]
  },
  {
    key: "stanceBHeavy",
    label: "Heavy Form",
    tier: 3,
    family: "Stance B",
    icon: "HV",
    color: "#d48b72",
    description: [
      "Stance. Secondary attacks become heavier and slower.",
      "Deals 28% increased melee damage, attacks 22% slower, and adds +10 knockback.",
      "Adds 16% stagger pressure and slightly widens most weapon arcs."
    ]
  },
  {
    key: "stanceBGuarded",
    label: "Guarded Form",
    tier: 3,
    family: "Stance B",
    icon: "GD",
    color: "#ced8bf",
    description: [
      "Stance. Secondary attacks trade offense for guard windows.",
      "Deals 12% less melee damage and attacks 4% slower.",
      "Grants a 0.55 sec block window, +2 knockback, and 8% stagger pressure."
    ]
  },
  {
    key: "stanceBMarked",
    label: "Marked Form",
    tier: 3,
    family: "Stance B",
    icon: "MK",
    color: "#aab7c9",
    description: [
      "Stance. Secondary attacks apply a 5 sec Mark to enemies hit.",
      "Range increases by 10%; whip hits also slow by at least 14%.",
      "Marked targets take +3 bonus melee damage, with doctrine-specific payoffs."
    ]
  },
  {
    key: "paladinDoctrine",
    label: "Paladin Doctrine",
    tier: 4,
    family: "Doctrine",
    icon: "PD",
    color: "#edd98f",
    description: [
      "Doctrine. Your class skill becomes Sanctify: 10 sec cooldown, 3.5 sec duration.",
      "While active, gain +10% melee damage and 20% damage reduction.",
      "Attacks deal +14% primary damage as holy damage and deal +8% damage to undead enemies."
    ]
  },
  {
    key: "berserkerDoctrine",
    label: "Berserker Doctrine",
    tier: 4,
    family: "Doctrine",
    icon: "BD",
    color: "#ef7f67",
    description: [
      "Doctrine. Your class skill becomes Bloodhowl: 10 sec cooldown, 4 sec duration.",
      "While active, gain +28% melee damage, +20% attack speed, and +20% movement speed.",
      "When activated, marks a nearby high-health enemy for 5 sec and may stun it for 1 sec."
    ]
  },
  {
    key: "gladiatorDoctrine",
    label: "Gladiator Doctrine",
    tier: 4,
    family: "Doctrine",
    icon: "GD",
    color: "#d8b37b",
    description: [
      "Doctrine. Your class skill becomes Arena Command: 9 sec cooldown, 3 sec duration.",
      "While active, gain +16% melee damage and 10% damage reduction.",
      "Swapping stances has a 2 sec cooldown and grants a 1.6 sec stance-specific bonus."
    ]
  },
  {
    key: "eldritchDoctrine",
    label: "Eldritch Doctrine",
    tier: 4,
    family: "Doctrine",
    icon: "ED",
    color: "#8ea4ff",
    description: [
      "Doctrine. Your class skill becomes Arcane Armament: 10 sec cooldown, 4 sec duration.",
      "While active, gain +12% melee damage and your attacks add 16% primary damage as arcane damage.",
      "Attacks trigger a 1.2 sec arcane movement surge; guarded and focused stances gain extra arcane payoffs."
    ]
  },
  {
    key: "consecratedGround",
    label: "War Circle",
    tier: 5,
    family: "Extras",
    icon: "CG",
    color: "#f0d58d",
    description: [
      "General. Activating your class skill creates a 3.5 tile combat field for the skill duration.",
      "The field deals 10 damage per second with damage type and radius behavior based on doctrine.",
      "Paladin fields are holy, Eldritch fields are arcane, Berserker fields are tighter physical leech zones, and Gladiator fields are wider tactical zones."
    ]
  },
  {
    key: "cleaveDiscipline",
    label: "Cleave Discipline",
    tier: 5,
    family: "Extras",
    icon: "CD",
    color: "#e8c18d",
    description: [
      "General. After activating your class skill, your next attack is a guaranteed critical strike.",
      "Critical strikes from this effect deal 200% damage, or 220% while the class skill is active.",
      "During the class-skill window, melee arc width increases by 20%."
    ]
  },
  {
    key: "executionersReach",
    label: "Executioner's Reach",
    tier: 5,
    family: "Extras",
    icon: "ER",
    color: "#d8b494",
    description: [
      "General. During your class skill, melee range increases by 20%.",
      "Your melee hits have a 14% chance to execute enemies at or below 30% health.",
      "If Butcher's Path is also selected, the execute chance is doubled while your class skill is active."
    ]
  },
  {
    key: "battleFrenzy",
    label: "Battle Frenzy",
    tier: 5,
    family: "Extras",
    icon: "BF",
    color: "#e27f65",
    description: [
      "General. Kills during your class skill trigger a 3 sec frenzy, limited by a 10 sec internal cooldown.",
      "During frenzy, gain +16% movement speed and +10% damage.",
      "Kills during your class skill also store a 4 sec heal-over-time equal to 2% max health, capped at 10% max health."
    ]
  },
  {
    key: "shockRelease",
    label: "Shock Release",
    tier: 5,
    family: "Extras",
    icon: "SR",
    color: "#d9d1bb",
    description: [
      "General. Attacks build strike-wave charges for 2 sec; 5 charges releases a forward wave, or 4 charges with Gladiator.",
      "The wave deals 65% primary damage, lasts 0.9 sec, and travels 5 tiles by default.",
      "Paladin waves become holy and travel 8 tiles; Eldritch waves become arcane and travel 11 tiles."
    ]
  },
  {
    key: "butchersPath",
    label: "Butcher's Path",
    tier: 5,
    family: "Extras",
    icon: "BP",
    color: "#d37a66",
    description: [
      "General. Executing an enemy empowers your next melee hit.",
      "The empowered hit is a guaranteed critical strike, deals 35% increased damage, and has 25% wider arc coverage.",
      "Also doubles Executioner's Reach execute chance while your class skill is active."
    ]
  },
  {
    key: "redTempest",
    label: "Tempest",
    tier: 5,
    family: "Extras",
    icon: "RT",
    color: "#da6d5f",
    description: [
      "General. Activating your class skill grants temporary HP equal to 25% of max health for the skill duration.",
      "For the first 5 sec, melee attacks use full 360 degree arc coverage.",
      "Also creates a 1.8 tile aura for up to 3.2 sec, dealing 42% primary damage per second as doctrine-flavored area damage."
    ]
  },
  {
    key: "secondWind",
    label: "Second Wind",
    tier: 5,
    family: "Extras",
    icon: "SW",
    color: "#b2d8a7",
    description: [
      "General. Activating your class skill starts a 10 sec heal-over-time for 22% of your max health.",
      "Nearby allies receive a 10 sec heal-over-time for 8% of their max health.",
      "Your combat field healing multiplier is increased to 125%."
    ]
  },
  {
    key: "bastion",
    label: "Bastion",
    tier: 6,
    family: "Capstone",
    icon: "BA",
    color: "#f3ddb0",
    description: [
      "Capstone. During your class skill, gain an additional 10% damage reduction.",
      "Combat fields and protection effects grant 8% damage reduction, and guarded play gains +12% melee defense.",
      "Nearby allies receive a 10% defense aura from your stonewall presence."
    ]
  },
  {
    key: "ravager",
    label: "Ravager",
    tier: 6,
    family: "Capstone",
    icon: "RV",
    color: "#f08d77",
    description: [
      "Capstone. Missing health increases melee damage by up to 15%.",
      "Missing health also increases attack speed by up to 25% through the main attack-speed calculation.",
      "Best with aggressive class-skill windows and self-healing extras."
    ]
  },
  {
    key: "paragon",
    label: "Paragon",
    tier: 6,
    family: "Capstone",
    icon: "PG",
    color: "#e0c692",
    description: [
      "Capstone. Swapping stances primes the new stance for a bonus hit.",
      "Primary stance bonus: next hit deals 18% increased melee damage.",
      "Secondary stance bonus: next hit deals 10% increased melee damage and briefly staggers the target for 0.15 sec."
    ]
  },
  {
    key: "spellknight",
    label: "Spellknight",
    tier: 6,
    family: "Capstone",
    icon: "SK",
    color: "#a7b7ff",
    description: [
      "Capstone. Melee hits deal additional arcane damage equal to 15% of primary damage.",
      "Activating your class skill releases an arcane wave that deals 55% primary damage as arcane damage over 9 tiles.",
      "Arcane marks can detonate on death, dealing arcane splash damage to nearby enemies."
    ]
  }
];

const DEF_BY_KEY = Object.fromEntries(WARRIOR_TALENT_DEFS.map((def) => [def.key, def]));

function getTierKeys(tier) {
  return WARRIOR_TALENT_DEFS.filter((def) => def.tier === tier).map((def) => def.key);
}

function getTierSelections(game, tier) {
  return getTierKeys(tier).filter((key) => getWarriorTalentPoints(game, key) > 0);
}

function hasRequiredPreviousTier(game, tier) {
  if (tier <= 1) return true;
  return getTierSelections(game, tier - 1).length > 0;
}

function getTierLabel(tier) {
  if (tier === 1) return "Weapon";
  if (tier === 2) return "Stance";
  if (tier === 3) return "Stance";
  if (tier === 4) return "Doctrine";
  if (tier === 5) return "General";
  if (tier === 6) return "Capstone";
  return "Warrior";
}

function getSelectedStanceKey(game, stance) {
  const prefix = stance === "B" ? "stanceB" : "stanceA";
  const selected = STANCE_MODIFIER_KEYS.find((modifier) => getWarriorTalentPoints(game, `${prefix}${modifier[0].toUpperCase()}${modifier.slice(1)}`) > 0);
  return selected || "";
}

function modifierLabel(modifier) {
  if (!modifier) return "Balanced";
  return `${modifier[0].toUpperCase()}${modifier.slice(1)}`;
}

function wouldDuplicateStanceModifier(game, key) {
  const match = /^stance([AB])([A-Z].+)$/.exec(key);
  if (!match) return false;
  const nextModifier = match[2].charAt(0).toLowerCase() + match[2].slice(1);
  const otherStance = match[1] === "A" ? "B" : "A";
  return getSelectedStanceKey(game, otherStance) === nextModifier;
}

export function createWarriorTalentState() {
  return Object.fromEntries(
    WARRIOR_TALENT_DEFS.map((def) => [
      def.key,
      {
        key: def.key,
        points: 0,
        maxPoints: 1
      }
    ])
  );
}

export function cloneWarriorTalentState(source = null) {
  const next = createWarriorTalentState();
  if (!source || typeof source !== "object") return next;
  for (const [key, node] of Object.entries(next)) {
    const raw = source[key];
    if (!raw || typeof raw !== "object") continue;
    if (Number.isFinite(raw.points)) node.points = Math.max(0, Math.min(node.maxPoints, Math.floor(raw.points)));
  }
  return next;
}

export function getWarriorTalentDefs() {
  return WARRIOR_TALENT_DEFS.map((def) => ({ ...def, row: def.tier - 1, lane: def.family.toLowerCase() }));
}

export function getWarriorTalentDef(key) {
  return DEF_BY_KEY[key] ? { ...DEF_BY_KEY[key], row: DEF_BY_KEY[key].tier - 1, lane: DEF_BY_KEY[key].family.toLowerCase() } : null;
}

export function isWarriorTalentGame(game) {
  return !!game && typeof game.isWarriorClass === "function" && game.isWarriorClass();
}

export function getWarriorTalentPoints(game, key) {
  const points = game?.warriorTalents?.[key]?.points;
  return Number.isFinite(points) ? Math.max(0, points) : 0;
}

export function getWarriorAvailableSkillPoints(game) {
  return Number.isFinite(game?.skillPoints) ? Math.max(0, game.skillPoints) : 0;
}

export function getWarriorSpentSkillPoints(game) {
  let total = 0;
  for (const def of WARRIOR_TALENT_DEFS) total += getWarriorTalentPoints(game, def.key);
  return total;
}

export function getWarriorRowRequirement(row) {
  const tier = Math.max(1, Math.min(6, Math.floor(row) + 1));
  return getOpenProgressionTierLevel(tier);
}

export function isWarriorRowAccessible(game, row) {
  const tier = Math.max(1, Math.min(6, Math.floor(row) + 1));
  const level = Number.isFinite(game?.level) ? Math.max(1, Math.floor(game.level)) : 1;
  return level >= getWarriorRowRequirement(row) && hasRequiredPreviousTier(game, tier);
}

export function getWarriorUnlockRequirementText(game, def) {
  if (!def) return "";
  const level = Number.isFinite(game?.level) ? Math.max(1, Math.floor(game.level)) : 1;
  const requiredLevel = getOpenProgressionTierLevel(def.tier);
  if (level < requiredLevel) return `Requires level ${requiredLevel}.`;
  if (!hasRequiredPreviousTier(game, def.tier)) return `Requires a Tier ${def.tier - 1} pick first.`;
  if (wouldDuplicateStanceModifier(game, def.key)) return "Cannot pick the same stance modifier twice.";
  const selected = getTierSelections(game, def.tier);
  if (selected.length >= (WARRIOR_TIER_PICK_LIMITS[def.tier] || 0) && !selected.includes(def.key)) return `${getTierLabel(def.tier)} choice already made.`;
  return "";
}

export function canSpendWarriorNode(game, key) {
  if (!isWarriorTalentGame(game) || getWarriorAvailableSkillPoints(game) <= 0) return false;
  const def = DEF_BY_KEY[key];
  if (!def) return false;
  const node = game?.warriorTalents?.[key];
  if (!node || node.points >= node.maxPoints) return false;
  const level = Number.isFinite(game?.level) ? Math.max(1, Math.floor(game.level)) : 1;
  if (level < getOpenProgressionTierLevel(def.tier)) return false;
  if (!hasRequiredPreviousTier(game, def.tier)) return false;
  if (wouldDuplicateStanceModifier(game, key)) return false;
  const selected = getTierSelections(game, def.tier);
  if (selected.length >= (WARRIOR_TIER_PICK_LIMITS[def.tier] || 0) && !selected.includes(key)) return false;
  return true;
}

export function canSpendWarriorUtility() {
  return false;
}

export function spendWarriorNode(game, key) {
  if (!canSpendWarriorNode(game, key)) return false;
  game.warriorTalents[key].points = 1;
  game.skillPoints -= 1;
  return true;
}

export function spendWarriorUtility() {
  return false;
}

export function formatWarriorLaneLabel(lane) {
  if (lane === "weapon") return "Weapon Form";
  if (lane === "stance a") return "Stance";
  if (lane === "stance b") return "Stance";
  if (lane === "doctrine") return "Class Skill";
  if (lane === "extras") return "General";
  if (lane === "capstone") return "Capstone";
  return "Warrior";
}

export function getWarriorTooltip(game, entry) {
  if (!entry || entry.kind === "utility") return null;
  const def = DEF_BY_KEY[entry.key];
  if (!def) return null;
  return {
    title: def.label,
    lines: def.description.slice(),
    requirement: entry.locked ? getWarriorUnlockRequirementText(game, def) : ""
  };
}

export function getWarriorWeaponForm(game) {
  return WEAPON_KEYS.find((key) => getWarriorTalentPoints(game, key) > 0) || "broadswing";
}

export function getWarriorPrimaryStyle(game) {
  return getWarriorWeaponForm(game);
}

export function getWarriorStanceModifier(game, stance = "A") {
  return getSelectedStanceKey(game, stance);
}

export function getWarriorStanceLabel(game, stance = "A") {
  return modifierLabel(getWarriorStanceModifier(game, stance));
}

export function getWarriorSecondaryStyle(game) {
  return getWarriorStanceModifier(game, "B");
}

export function getWarriorDoctrine(game) {
  if (getWarriorTalentPoints(game, "paladinDoctrine") > 0) return "paladin";
  if (getWarriorTalentPoints(game, "berserkerDoctrine") > 0) return "berserker";
  if (getWarriorTalentPoints(game, "gladiatorDoctrine") > 0) return "gladiator";
  if (getWarriorTalentPoints(game, "eldritchDoctrine") > 0) return "eldritch";
  return "battlecry";
}

export function getWarriorCapstone(game) {
  if (getWarriorTalentPoints(game, "bastion") > 0) return "bastion";
  if (getWarriorTalentPoints(game, "ravager") > 0) return "ravager";
  if (getWarriorTalentPoints(game, "paragon") > 0) return "paragon";
  if (getWarriorTalentPoints(game, "spellknight") > 0) return "spellknight";
  return "";
}

export function getWarriorClassSkillName(game) {
  switch (getWarriorDoctrine(game)) {
    case "paladin":
      return "Sanctify";
    case "berserker":
      return "Bloodhowl";
    case "gladiator":
      return "Arena Command";
    case "eldritch":
      return "Arcane Armament";
    default:
      return "Battle Cry";
  }
}

export function getWarriorClassSkillColor(game) {
  switch (getWarriorDoctrine(game)) {
    case "paladin":
      return "#e7d184";
    case "berserker":
      return "#dd6e62";
    case "gladiator":
      return "#d5ab73";
    case "eldritch":
      return "#8aa2ff";
    default:
      return "#d14f4f";
  }
}

export function getWarriorClassSkillCooldown(game) {
  return getWarriorDoctrine(game) === "gladiator" ? 9 : 10;
}

export function getWarriorClassSkillDuration(game) {
  switch (getWarriorDoctrine(game)) {
    case "paladin":
      return 3.5;
    case "berserker":
    case "eldritch":
      return 4;
    default:
      return 3;
  }
}

export function getWarriorSwapCooldown() {
  return 2;
}

export function hasWarriorCleaveDiscipline(game) {
  return getWarriorTalentPoints(game, "cleaveDiscipline") > 0;
}

export function hasWarriorExecutionersReach(game) {
  return getWarriorTalentPoints(game, "executionersReach") > 0;
}

export function hasWarriorBattleFrenzy(game) {
  return getWarriorTalentPoints(game, "battleFrenzy") > 0;
}

export function hasWarriorJudgmentWave(game) {
  return getWarriorTalentPoints(game, "shockRelease") > 0;
}

export function hasWarriorShockRelease(game) {
  return hasWarriorJudgmentWave(game);
}

export function hasWarriorButchersPath(game) {
  return getWarriorTalentPoints(game, "butchersPath") > 0;
}

export function hasWarriorRedTempest(game) {
  return getWarriorTalentPoints(game, "redTempest") > 0;
}

export function hasWarriorSecondWind(game) {
  return getWarriorTalentPoints(game, "secondWind") > 0;
}

export function hasWarriorConsecratedGround(game) {
  return getWarriorTalentPoints(game, "consecratedGround") > 0;
}

export function hasWarriorBastion(game) {
  return getWarriorCapstone(game) === "bastion";
}

export function hasWarriorRavager(game) {
  return getWarriorCapstone(game) === "ravager";
}

export function hasWarriorParagon(game) {
  return getWarriorCapstone(game) === "paragon";
}

export function hasWarriorSpellknight(game) {
  return getWarriorCapstone(game) === "spellknight";
}

export function isWarriorRaging(game) {
  const activeTimer = Number.isFinite(game?.warriorRageActiveTimer) ? game.warriorRageActiveTimer : 0;
  return activeTimer > 0;
}

export function getWarriorBattleFrenzyDuration() {
  return 3;
}

export function getWarriorBattleFrenzyMoveSpeedBonus(game) {
  return hasWarriorBattleFrenzy(game) ? 0.16 : 0;
}

export function getWarriorBattleFrenzyDamageBonus(game) {
  return hasWarriorBattleFrenzy(game) ? 0.1 : 0;
}

export function getWarriorSecondWindHealPct(game) {
  return hasWarriorSecondWind(game) ? 0.22 : 0;
}

export function getWarriorSecondWindAllyHealPct(game) {
  return hasWarriorSecondWind(game) ? 0.08 : 0;
}

export function getWarriorConsecratedRadiusTiles(game) {
  return hasWarriorConsecratedGround(game) ? 3.5 : 0;
}

export function getWarriorConsecratedDps(game) {
  return hasWarriorConsecratedGround(game) ? 10 : 0;
}

export function getWarriorConsecratedUndeadMultiplier(game) {
  return hasWarriorConsecratedGround(game) ? 1.5 : 1;
}

export function getWarriorConsecratedHealingMultiplier(game) {
  return hasWarriorSecondWind(game) ? 1.25 : 1;
}

export function getWarriorConsecratedDamageReductionPct(game) {
  return hasWarriorConsecratedGround(game) || hasWarriorBastion(game) ? 0.08 : 0;
}

export function getWarriorConsecratedShredPct(game) {
  return hasWarriorJudgmentWave(game) ? 0.2 : 0;
}

export function getWarriorJudgmentWaveChance(game) {
  return hasWarriorJudgmentWave(game) ? 0.18 : 0;
}

export function getWarriorJudgmentWaveDamageMultiplier(game) {
  return hasWarriorJudgmentWave(game) ? 0.65 : 0;
}

export function getWarriorJudgmentWaveShredPct(game) {
  return hasWarriorJudgmentWave(game) ? 0.2 : 0;
}

export function getWarriorExecutionerExecuteChance(game) {
  return hasWarriorExecutionersReach(game) ? 0.14 : 0;
}

export function getWarriorExecutionerRageRangeBonus(game) {
  return hasWarriorExecutionersReach(game) ? 0.2 : 0;
}

export function getWarriorExecutionerRageCleaveWidthBonus(game) {
  return hasWarriorCleaveDiscipline(game) ? 0.2 : 0;
}

export function getWarriorButchersPathNextHitDamageBonus(game) {
  return hasWarriorButchersPath(game) ? 0.35 : 0;
}

export function getWarriorButchersPathNextHitArcBonus(game) {
  return hasWarriorButchersPath(game) ? 0.25 : 0;
}

export function getWarriorRedTempestMoveSpeedBonus(game) {
  return hasWarriorRedTempest(game) ? 0.2 : 0;
}

export function getWarriorRedTempestTempHpPct(game) {
  return hasWarriorRedTempest(game) ? 0.25 : 0;
}

export function getWarriorRedTempestFullArcDuration(game) {
  return hasWarriorRedTempest(game) ? 5 : 0;
}

export function getWarriorRageMasteryAttackSpeedBonus(game) {
  return getWarriorDoctrine(game) === "berserker" ? 0.2 : 0;
}

export function getWarriorRageMasteryMoveSpeedBonus(game) {
  return getWarriorDoctrine(game) === "berserker" ? 0.1 : 0;
}

export function hasWarriorRageMastery(game) {
  return getWarriorDoctrine(game) === "berserker";
}

export function getWarriorBloodheatAttackSpeedBonus(game) {
  return getWarriorStanceModifier(game, "A") === "swift" || getWarriorStanceModifier(game, "B") === "swift" ? 0.08 : 0;
}

export function getWarriorBloodheatMoveSpeedBonus(game) {
  return getWarriorDoctrine(game) === "berserker" ? 0.05 : 0;
}

export function getWarriorBloodheatRageMoveSpeedBonus(game) {
  return getWarriorDoctrine(game) === "berserker" ? 0.1 : 0;
}

export function getWarriorCrusaderUndeadDamageBonus(game, enemy = null) {
  if ((getWarriorDoctrine(game) !== "paladin" && !hasWarriorJudgmentWave(game) && !hasWarriorConsecratedGround(game)) || !enemy) return 0;
  return enemy?.type === "ghost" || enemy?.type === "skeleton_warrior" || enemy?.type === "skeleton" || enemy?.type === "necromancer" || enemy?.type === "mummy"
    ? 0.08
    : 0;
}

export function getWarriorHeavyHandDamageBonus() {
  return 0;
}

export function getWarriorHeavyHandCleaveArcBonus() {
  return 0;
}

export function getWarriorIronGuardMaxHealthBonusPct() {
  return 0;
}

export function getWarriorIronGuardMaxHealthFlat() {
  return 0;
}

export function getWarriorIronGuardDefenseBonusPct() {
  return 0;
}

export function getWarriorPassiveRegenBonusPct() {
  return 0;
}

export function hasWarriorGuardedAdvance(game) {
  return hasWarriorConsecratedGround(game);
}

export function getWarriorGuardedAdvanceMeleeDefenseBonusPct(game) {
  return hasWarriorBastion(game) ? 0.12 : 0;
}

export function getWarriorGuardedAdvanceRetaliationDamage() {
  return 0;
}

export function getWarriorGuardedAdvanceCounterChance() {
  return 0;
}

export function getWarriorGuardedAdvanceIgnoreHitChance() {
  return 0;
}

export function getWarriorGuardedAdvanceAllyFlatReduction() {
  return 0;
}

export function getWarriorGuardedAdvanceMissileReflectChance() {
  return 0;
}

export function hasWarriorReflectShare() {
  return false;
}

export function getWarriorBattleFrenzyAttackSpeedBonus() {
  return 0;
}

export function getWarriorBattleFrenzyLifeLeechBonus() {
  return 0;
}

export function getWarriorUnbrokenLifeLeechBonus() {
  return 0;
}

export function getWarriorUnbrokenDamageReduction() {
  return 0;
}

export function hasWarriorUnbrokenCheatDeath() {
  return false;
}

export function isWarriorPassiveRageActive() {
  return false;
}

export function hasWarriorStonewall(game) {
  return hasWarriorJudgmentWave(game);
}

export function getWarriorStonewallLifeLeechBonus() {
  return 0;
}

export function getWarriorStonewallAllyDefenseAuraPct(game) {
  return hasWarriorBastion(game) ? 0.1 : 0;
}

export function hasWarriorCrusaderInvestment(game) {
  return getWarriorDoctrine(game) === "paladin" || hasWarriorJudgmentWave(game);
}

export function hasWarriorEldritchInvestment(game) {
  return getWarriorDoctrine(game) === "eldritch" || hasWarriorSpellknight(game);
}

export function getWarriorSkillPointGainForLevel(level, classType) {
  if (classType !== "fighter") return 1;
  return getOpenProgressionSkillPointGainForLevel(level);
}
