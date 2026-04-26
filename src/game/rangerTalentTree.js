const RANGER_GROUP_LIMITS = {
  weapon: 1,
  swap: 1,
  modifier: 1,
  path: 1,
  general: 2,
  capstone: 1
};

const RANGER_TIER_LABELS = {
  1: "Weapon Style",
  2: "Mode Swap",
  3: "Attack Modifier",
  4: "Path",
  5: "General Skills",
  6: "Capstone"
};

const RANGER_TALENT_DEFS = [
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

const DEF_BY_KEY = Object.fromEntries(RANGER_TALENT_DEFS.map((def) => [def.key, def]));

export const RANGER_WEAPON_STATS = {
  longbow: {
    label: "Longbow",
    swapCooldown: 1.2,
    ranged: { range: 360, cooldown: 0.48, damageMult: 1.24, projectileSpeed: 430, comboGain: 1, size: 6, life: 1.1 },
    melee: { range: 34, arcDeg: 120, cooldown: 0.42, damageMult: 0.42, comboGain: 1, knockbackTiles: 1.5, defensePct: 0.24 }
  },
  throwingKnives: {
    label: "Throwing Knives",
    swapCooldown: 0.5,
    ranged: { range: 260, cooldown: 0.3, damageMult: 0.88, projectileSpeed: 390, comboGain: 1, size: 5, life: 0.78 },
    melee: { range: 40, arcDeg: 95, cooldown: 0.28, damageMult: 1.07, comboGain: 2, knockback: 0, defensePct: 0.08 }
  },
  twinDaggers: {
    label: "Twin Daggers",
    swapCooldown: 0.65,
    ranged: { range: 180, cooldown: 0.26, damageMult: 0.68, projectileSpeed: 360, comboGain: 1, size: 5, life: 0.58 },
    melee: { range: 34, arcDeg: 115, cooldown: 0.2, damageMult: 0.94, comboGain: 2, knockback: 0, defensePct: 0.12 }
  },
  rapierPistol: {
    label: "Rapier & Pistol",
    swapCooldown: 0.8,
    ranged: { range: 420, cooldown: 0.7, damageMult: 1.08, projectileSpeed: 560, comboGain: 1, size: 5, life: 0.75, knockback: 70 },
    melee: { range: 52, arcDeg: 60, cooldown: 0.38, damageMult: 1.89, comboGain: 2, knockback: 0, defensePct: 0.1 }
  }
};

export function createRangerTalentState() {
  return Object.fromEntries(
    RANGER_TALENT_DEFS.map((def) => [
      def.key,
      {
        key: def.key,
        points: 0,
        maxPoints: def.maxRanks
      }
    ])
  );
}

export function cloneRangerTalentState(source = null) {
  const next = createRangerTalentState();
  if (!source || typeof source !== "object") return next;
  for (const [key, node] of Object.entries(next)) {
    const raw = source[key];
    if (!raw || typeof raw !== "object") continue;
    if (Number.isFinite(raw.points)) node.points = Math.max(0, Math.min(node.maxPoints, Math.floor(raw.points)));
  }
  return next;
}

export function getRangerTalentDefs() {
  return RANGER_TALENT_DEFS.map((def) => ({ ...def }));
}

export function getRangerTalentDef(key) {
  return DEF_BY_KEY[key] ? { ...DEF_BY_KEY[key] } : null;
}

export function isRangerTalentGame(game) {
  return !!game && typeof game.isArcherClass === "function" && game.isArcherClass();
}

export function getRangerTalentPoints(game, key) {
  const points = game?.rangerTalents?.[key]?.points;
  return Number.isFinite(points) ? Math.max(0, points) : 0;
}

export function hasRangerTalent(game, key) {
  return getRangerTalentPoints(game, key) > 0;
}

export function getRangerUtilityKeys() {
  return ["moveSpeed", "attackSpeed", "damage", "defense"];
}

export function getRangerUtilityLevel(game, key) {
  const level = game?.upgrades?.[key]?.level;
  return Number.isFinite(level) ? Math.max(0, Math.min(4, Math.floor(level))) : 0;
}

export function getRangerSpentSkillPoints(game) {
  let total = 0;
  for (const key of getRangerUtilityKeys()) total += getRangerUtilityLevel(game, key);
  for (const def of RANGER_TALENT_DEFS) total += getRangerTalentPoints(game, def.key);
  return total;
}

export function getRangerAvailableSkillPoints(game) {
  return Number.isFinite(game?.skillPoints) ? Math.max(0, game.skillPoints) : 0;
}

export function getRangerTierLabel(tier) {
  return RANGER_TIER_LABELS[tier] || `Tier ${tier}`;
}

export function getRangerSelectedInGroup(game, group) {
  return RANGER_TALENT_DEFS.filter((def) => def.group === group && getRangerTalentPoints(game, def.key) > 0).map((def) => def.key);
}

export function getRangerSelectedWeapon(game) {
  return getRangerSelectedInGroup(game, "weapon")[0] || null;
}

export function getRangerSelectedSwapStyle(game) {
  return getRangerSelectedInGroup(game, "swap")[0] || null;
}

export function getRangerSelectedModifier(game) {
  return getRangerSelectedInGroup(game, "modifier")[0] || null;
}

export function getRangerSelectedPath(game) {
  return getRangerSelectedInGroup(game, "path")[0] || null;
}

export function getRangerSelectedTier5Count(game) {
  return getRangerSelectedInGroup(game, "general").length;
}

export function getRangerSelectedCapstones(game) {
  return getRangerSelectedInGroup(game, "capstone").length;
}

export function getRangerWeaponStats(game, weaponKey = getRangerSelectedWeapon(game) || "longbow") {
  return RANGER_WEAPON_STATS[weaponKey] || RANGER_WEAPON_STATS.longbow;
}

export function getRangerCurrentWeaponMode(game) {
  const mode = game?.rangerRuntime?.weaponMode || game?.player?.rangerRuntime?.weaponMode;
  return mode === "melee" ? "melee" : "ranged";
}

export function getRangerCurrentWeaponModeStats(game) {
  const weapon = getRangerWeaponStats(game);
  return weapon[getRangerCurrentWeaponMode(game)] || weapon.ranged;
}

export function getRangerGroupLimit(group) {
  return RANGER_GROUP_LIMITS[group] || 1;
}

export function isRangerTierAccessible(game, tier) {
  if (tier <= 1) return true;
  if (tier === 2) return !!getRangerSelectedWeapon(game);
  if (tier === 3) return !!getRangerSelectedSwapStyle(game);
  if (tier === 4) return !!getRangerSelectedModifier(game);
  if (tier === 5) return !!getRangerSelectedPath(game);
  if (tier === 6) return getRangerSelectedTier5Count(game) >= 2;
  return false;
}

export function getRangerRowRequirement(row) {
  return row <= 0 ? 0 : row;
}

export function isRangerRowAccessible(game, row) {
  return isRangerTierAccessible(game, row + 1);
}

export function getRangerLaneSpent(game, lane) {
  return RANGER_TALENT_DEFS.filter((def) => def.group === lane || def.lane === lane).reduce((sum, def) => sum + getRangerTalentPoints(game, def.key), 0);
}

export function getRangerUnlockRequirementText(game, def) {
  if (!def) return "";
  if (def.tier === 1) return "Available immediately.";
  if (def.tier === 2) return getRangerSelectedWeapon(game) ? "Available now." : "Requires a weapon style.";
  if (def.tier === 3) return getRangerSelectedSwapStyle(game) ? "Available now." : "Requires a mode-swap style.";
  if (def.tier === 4) return getRangerSelectedModifier(game) ? "Available now." : "Requires an attack modifier.";
  if (def.tier === 5) {
    if (!getRangerSelectedPath(game)) return "Requires a path.";
    if (getRangerSelectedTier5Count(game) >= 2) return "Tier 5 limit reached.";
    return "Pick up to two Tier 5 skills.";
  }
  if (def.tier === 6) {
    if (getRangerSelectedTier5Count(game) < 2) return "Requires exactly two Tier 5 skills.";
    if (getRangerSelectedCapstones(game) >= 1) return "Capstone already selected.";
    return "Available now.";
  }
  return "";
}

export function canSpendRangerNode(game, key) {
  if (!isRangerTalentGame(game) || getRangerAvailableSkillPoints(game) <= 0) return false;
  const def = DEF_BY_KEY[key];
  if (!def) return false;
  const node = game?.rangerTalents?.[key];
  if (!node || node.points >= node.maxPoints) return false;
  if (!isRangerTierAccessible(game, def.tier)) return false;
  const selected = getRangerSelectedInGroup(game, def.group);
  if (selected.length >= getRangerGroupLimit(def.group)) return false;
  return true;
}

export function canSpendRangerUtility(game, key) {
  if (!isRangerTalentGame(game) || getRangerAvailableSkillPoints(game) <= 0) return false;
  if (getRangerSpentSkillPoints(game) <= 0 && !getRangerSelectedWeapon(game)) return false;
  const upgrade = game?.upgrades?.[key];
  return !!upgrade && Number.isFinite(upgrade.level) && upgrade.level < 4;
}

export function spendRangerNode(game, key) {
  if (!canSpendRangerNode(game, key)) return false;
  const node = game.rangerTalents[key];
  node.points += 1;
  game.skillPoints -= 1;
  return true;
}

export function spendRangerUtility(game, key) {
  if (!canSpendRangerUtility(game, key)) return false;
  game.upgrades[key].level += 1;
  game.skillPoints -= 1;
  return true;
}

export function formatLaneLabel(lane) {
  if (lane === "weapon") return "Weapon";
  if (lane === "swap") return "Swap";
  if (lane === "modifier") return "Modifier";
  if (lane === "path") return "Path";
  if (lane === "general") return "General";
  if (lane === "capstone") return "Capstone";
  return "Core";
}

export function getRangerTooltip(game, entry) {
  if (!entry) return null;
  if (entry.kind === "utility") {
    const labelMap = {
      moveSpeed: "Move Speed Training",
      attackSpeed: "Attack Speed Training",
      damage: "Damage Training",
      defense: "Defense Training"
    };
    return {
      title: labelMap[entry.key] || entry.key,
      lines: ["Training node. Counts toward total spent SP."],
      requirement: entry.locked ? "Requires at least 1 available skill point and a weapon style." : ""
    };
  }
  const def = DEF_BY_KEY[entry.key];
  if (!def) return null;
  return {
    title: def.label,
    lines: def.description.slice(),
    requirement: entry.locked ? getRangerUnlockRequirementText(game, def) : ""
  };
}

export function getRangerCombo(game) {
  const combo = game?.rangerRuntime?.combo ?? game?.player?.rangerRuntime?.combo;
  return Number.isFinite(combo) ? Math.max(0, Math.min(30, Math.floor(combo))) : 0;
}

export function getRangerComboTier(game) {
  const combo = getRangerCombo(game);
  if (combo >= 20) return 3;
  if (combo >= 10) return 2;
  if (combo >= 5) return 1;
  return 0;
}

export function getRangerComboAttackSpeedBonus(game) {
  const tier = getRangerComboTier(game);
  let bonus = tier === 3 ? 0.18 : tier === 2 ? 0.11 : tier === 1 ? 0.05 : 0;
  if (hasRangerTalent(game, "apexPredator")) bonus += tier === 3 ? 0.08 : tier === 2 ? 0.05 : tier === 1 ? 0.03 : 0;
  return bonus;
}

export function getRangerComboDamageBonus(game) {
  const tier = getRangerComboTier(game);
  return tier === 3 ? 0.16 : tier === 2 ? 0.09 : tier === 1 ? 0.04 : 0;
}

export function getRangerCritChance(game) {
  return hasRangerTalent(game, "precision") ? 0.08 + getRangerComboTier(game) * 0.03 : 0;
}

export function getRangerCritMultiplier() {
  return 1.5;
}

export function getRangerProjectileSpeedBonus(game) {
  const weapon = getRangerSelectedWeapon(game);
  let bonus = weapon === "longbow" ? 0.08 : weapon === "rapierPistol" ? 0.15 : 0;
  if (getRangerSelectedSwapStyle(game) === "opportunist" && getRangerCurrentWeaponMode(game) === "ranged" && (game?.rangerRuntime?.swapBuffTimer || 0) > 0) bonus += 0.2;
  return bonus;
}

export function getRangerSwapAttackSpeedBonus(game) {
  return getRangerSelectedSwapStyle(game) === "opportunist" &&
    getRangerCurrentWeaponMode(game) === "melee" &&
    (game?.rangerRuntime?.swapBuffTimer || 0) > 0
    ? 0.15
    : 0;
}

export function getRangerSwapRangeBonus(game) {
  return getRangerSelectedSwapStyle(game) === "opportunist" && (game?.rangerRuntime?.swapBuffTimer || 0) > 0 ? 0.2 : 0;
}

export function getRangerDamageBonus(game) {
  let total = getRangerComboDamageBonus(game);
  if (hasRangerTalent(game, "skirmisher") && game?.player?.moving) total += 0.08;
  if (getRangerSelectedPath(game) === "beastMasterPath" && game?.rangerRuntime?.wolfId && (game?.enemies || []).some((enemy) => enemy?.id === game.rangerRuntime.wolfId && (enemy.hp || 0) > 0)) total += 0.08;
  if (hasRangerTalent(game, "apexPredator")) {
    const tier = getRangerComboTier(game);
    total += tier === 3 ? 0.15 : tier === 2 ? 0.1 : tier === 1 ? 0.05 : 0;
  }
  return total;
}

export function getRangerMoveSpeedBonus(game) {
  let total = 0;
  if ((game?.rangerRuntime?.dodgeTimer || 0) > 0) total += 0.35;
  if ((game?.rangerRuntime?.predatorsFeastTimer || 0) > 0) total += 0.1;
  if (hasRangerTalent(game, "apexPredator")) {
    const tier = getRangerComboTier(game);
    total += tier === 3 ? 0.12 : tier === 2 ? 0.08 : tier === 1 ? 0.04 : 0;
  }
  return total;
}

export function getRangerMaxHealthBonusPct(game) {
  let bonus = 0;
  const weapon = getRangerSelectedWeapon(game);
  if (weapon === "throwingKnives") bonus += 0.06;
  else if (weapon === "twinDaggers") bonus += 0.10;
  else if (weapon === "rapierPistol") bonus += 0.08;
  const path = getRangerSelectedPath(game);
  if (path === "roguePath") bonus += 0.05;
  else if (path === "assassinPath") bonus += 0.08;
  else if (path === "beastMasterPath") bonus += 0.06;
  return bonus;
}

export function getRangerDodgeChance() {
  return 0;
}

export function getRangerDamageTakenReductionPct(game) {
  let reduction = 0;
  const mode = getRangerCurrentWeaponMode(game);
  const weapon = getRangerSelectedWeapon(game);
  if (mode === "melee") {
    const melee = getRangerWeaponStats(game).melee || {};
    reduction += Number.isFinite(melee.defensePct) ? Math.max(0, melee.defensePct) : 0;
    if (weapon !== "longbow") reduction += 0.04;
  }
  const path = getRangerSelectedPath(game);
  if (path === "roguePath") reduction += mode === "melee" ? 0.06 : 0.03;
  else if (path === "assassinPath") reduction += mode === "melee" ? 0.08 : 0.03;
  else if (path === "beastMasterPath") reduction += 0.06;
  if (hasRangerTalent(game, "apexPredator")) reduction += getRangerComboTier(game) * 0.02;
  return Math.max(0, Math.min(0.35, reduction));
}

export function getRangerIgniteChance() {
  return 0;
}

export function getRangerFireDamageBonus(game) {
  let bonus = hasRangerTalent(game, "stormcaller") ? 0.15 : 0;
  if (getRangerComboTier(game) >= 2) bonus += 0.08;
  return bonus;
}

export function getRangerFireRadiusBonus(game) {
  return hasRangerTalent(game, "stormcaller") ? 0.25 : 0;
}

export function getRangerPinningShotLengthTiles() {
  return 4;
}

export function hasPinningShot() {
  return false;
}

export function hasFireMastery() {
  return false;
}

export function hasTrickShot(game) {
  return hasRangerTalent(game, "trickShots") || hasRangerTalent(game, "stormcaller");
}

export function getRangerRicochetCount(game) {
  let count = 0;
  if (hasRangerTalent(game, "trickShots")) count += 2;
  if (hasRangerTalent(game, "stormcaller")) count += 2;
  return count;
}

export function hasFoxstep() {
  return false;
}

export function hasWildfireVolley() {
  return false;
}

export function getRangerMultishotBonus(game) {
  if (!hasRangerTalent(game, "rangerPath")) return 0;
  const tier = getRangerComboTier(game);
  return tier >= 3 ? 2 : tier >= 2 ? 1 : 0;
}

export function getRangerVolleyCooldownReduction() {
  return 0;
}

export function getRangerFireArrowProjectileSizeBonus(game) {
  return hasRangerTalent(game, "stormcaller") ? 2 : 0;
}

export function getRangerFireArrowDamageBonus(game) {
  return hasRangerTalent(game, "stormcaller") ? 0.15 : 0;
}

export function getRangerStationaryPierceBonus(game) {
  let bonus = 0;
  if (hasRangerTalent(game, "trickShots")) bonus += 0.25;
  if (hasRangerTalent(game, "stormcaller")) bonus += 0.25;
  return Math.min(0.5, bonus);
}

export function getRangerLinebreakerDamagePerHit(game) {
  return hasRangerTalent(game, "stormcaller") ? 0.08 : 0;
}

export function hasDanceOfThornsBuff() {
  return false;
}

export function getRangerDanceAttackSpeedBonus() {
  return 0;
}

export function getRangerDanceDefenseBonus() {
  return 0;
}

export function getRangerFireArrowDurationMultiplier() {
  return 1;
}

export function getRangerFireArrowImpactMultiplier(game) {
  return 1 + getRangerFireDamageBonus(game) + getRangerFireArrowDamageBonus(game);
}

export function shouldSpreadWildfire() {
  return false;
}

export function isEnemyBurning(game, enemy) {
  if (!game || !enemy) return false;
  if ((enemy.burningTimer || 0) > 0) return true;
  for (const zone of game.fireZones || []) {
    if (!zone || zone.life <= 0) continue;
    if (zone.zoneType && zone.zoneType !== "fire" && zone.zoneType !== "pinningFire") continue;
    const radius = Number.isFinite(zone.radius) ? zone.radius : 0;
    const dx = (enemy.x || 0) - (zone.x || 0);
    const dy = (enemy.y || 0) - (zone.y || 0);
    if (Math.hypot(dx, dy) <= radius + (enemy.size || 20) * 0.3) return true;
  }
  return false;
}

export function getRangerArrowBonusAgainstEnemy(game, enemy) {
  let mult = 1;
  if (isEnemyBurning(game, enemy) && hasRangerTalent(game, "rangerPath")) mult += 0.08;
  if (enemy?.rangerMarkedBy && enemy.rangerMarkedBy === game?.player?.id) mult += 0.08;
  return mult;
}

export function getRangerSkillPointGainForLevel(level, classType) {
  if (classType !== "archer") return 1;
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  if (safeLevel < 2) return 0;
  if (safeLevel === 2) return 2;
  if (safeLevel <= 11) return 1;
  return safeLevel % 2 === 0 ? 1 : 0;
}
