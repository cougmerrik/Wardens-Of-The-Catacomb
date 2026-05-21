import { getOpenProgressionSkillPointGainForLevel, getOpenProgressionTierLevel } from "./openProgression.js";

const MAGE_GROUP_LIMITS = {
  cantrip: 1,
  spell: 1,
  style: 1,
  path: 1,
  general: 2,
  capstone: 1
};

const MAGE_TIER_LABELS = {
  1: "Cantrip",
  2: "Spell",
  3: "Style",
  4: "Path",
  5: "General",
  6: "Capstone"
};

const MAGE_TALENT_DEFS = [
  { key: "fireBoltCantrip", label: "Fire Bolt", tier: 1, group: "cantrip", maxRanks: 1, icon: "FB", color: "#ff9b62", description: ["Cantrip. Fires a fast medium projectile that deals fire damage.", "On hit, applies Burning for 3 sec and contributes to Mage on-hit effects."] },
  { key: "frozenOrbCantrip", label: "Frozen Orb", tier: 1, group: "cantrip", maxRanks: 1, icon: "FO", color: "#9edcff", description: ["Cantrip. Fires a slow cold orb with lower direct frost damage.", "The orb pulses smaller shards that Chill enemies, slowing them by 25%."] },
  { key: "shockCantrip", label: "Shock", tier: 1, group: "cantrip", maxRanks: 1, icon: "SH", color: "#f5e779", description: ["Cantrip. Fires a very fast low-damage lightning projectile.", "On hit, chains lightning damage to up to 2 nearby enemies."] },
  { key: "arcaneMissileCantrip", label: "Arcane Missile", tier: 1, group: "cantrip", maxRanks: 1, icon: "AM", color: "#c6a8ff", description: ["Cantrip. Fires a homing arcane missile toward the nearest enemy in your aim direction.", "Reliable low damage at up to 8 tiles, useful when line pressure matters less than target acquisition."] },
  { key: "necroticBeamCantrip", label: "Necrotic Beam", tier: 1, group: "cantrip", maxRanks: 1, icon: "NB", color: "#9b85d8", description: ["Cantrip. Channels a necrotic beam that deals necrotic damage over time.", "Temporarily charms undead targets, or permanently charms them after choosing the undead-control path."] },
  { key: "greenFlameBladeCantrip", label: "Green-Flame Blade", tier: 1, group: "cantrip", maxRanks: 1, icon: "GB", color: "#7ee082", description: ["Cantrip. Performs a reach melee spell attack with life leech.", "Applies Burning, supports close-range casting, and gains extra reach and splash from the melee capstone."] },

  { key: "fireballSpell", label: "Fireball", tier: 2, group: "spell", maxRanks: 1, icon: "FI", color: "#ff754f", description: ["Spell. Costs 2 mana and launches a targeted projectile explosion.", "Deals high fire damage in a large radius and applies Burning to enemies hit."] },
  { key: "chromaticOrbSpell", label: "Chromatic Orb", tier: 2, group: "spell", maxRanks: 1, icon: "CO", color: "#f2d77a", description: ["Spell. Costs 2 mana and fires a piercing orb that cycles Fire, Frost, and Lightning effects.", "Provides flexible multi-target pressure with damage type and status changing by orb element."] },
  { key: "cloudDaggersSpell", label: "Cloud of Daggers", tier: 2, group: "spell", maxRanks: 1, icon: "CD", color: "#d7d9e8", description: ["Spell. Costs 2 mana and creates a targeted persistent damage field.", "The field lasts 4 sec before modifiers and deals rapid repeated physical damage ticks."] },
  { key: "confusionSpell", label: "Confusion", tier: 2, group: "spell", maxRanks: 1, icon: "CF", color: "#e1a8ff", description: ["Spell. Costs 2 mana and creates a targeted disruption field.", "Confuses enemies caught inside and disables boss special abilities while affected."] },
  { key: "invisibilitySpell", label: "Spirit Guardians", tier: 2, group: "spell", maxRanks: 1, icon: "SG", color: "#b7f0d0", description: ["Spell. Costs 2 mana, briefly vanishes you, and summons orbiting spirits.", "The aura damages nearby enemies and triggers Mage on-hit effects from its hits."] },
  { key: "flamingSphereSpell", label: "Flaming Sphere", tier: 2, group: "spell", maxRanks: 1, icon: "SP", color: "#ffb05f", description: ["Spell. Costs 2 mana and summons a mobile fire orb for 5 sec before duration modifiers.", "Recasting creates a new sphere at the target location and replaces the previous pressure point."] },

  { key: "highFocus", label: "High Focus", tier: 3, group: "style", maxRanks: 1, icon: "HF", color: "#f4efe3", description: ["Style. Strengthens high-mana casting and punishes low-mana casting.", "At high mana, gain +12% spell power on top of the normal high-mana bonus; at low mana, suffer an additional 10% spell power penalty."] },
  { key: "rapidCasting", label: "Rapid Casting", tier: 3, group: "style", maxRanks: 1, icon: "RC", color: "#9fd9ff", description: ["Style. Cast faster and recover mana cadence more quickly.", "Spell delay is reduced by 15% and mana regeneration improves by 10%, but peak spell power is reduced by 8%."] },
  { key: "bloodCasting", label: "Blood Casting", tier: 3, group: "style", maxRanks: 1, icon: "BC", color: "#df6b6b", description: ["Style. Health can cover missing mana when casting spells.", "Blood-cast spells cannot kill you directly, enabling emergency casts at low mana."] },
  { key: "battleCaster", label: "Battle Caster", tier: 3, group: "style", maxRanks: 1, icon: "BT", color: "#d5ab73", description: ["Style. Adds close-range durability and arcane shielding.", "Grants +1 flat damage reduction and adds temporary HP after blink-style class skills, supporting close spell use."] },

  { key: "wizardPath", label: "Wizard", tier: 4, group: "path", maxRanks: 1, icon: "WZ", color: "#8eb8ff", description: ["Path. Your class skill becomes Arcane Focus instead of baseline Blink.", "Gain +3 maximum mana and a high-mana threshold tuned around 5.6 mana, making disciplined high-mana casting stronger."] },
  { key: "necromancerPath", label: "Necromancer", tier: 4, group: "path", maxRanks: 1, icon: "NE", color: "#a186ff", description: ["Path. Your class skill becomes Death Bolt instead of baseline Blink.", "Undead control becomes permanent, control cap increases by 3, and controlled undead gain health, defense, and damage bonuses."] },
  { key: "sorcererPath", label: "Sorcerer", tier: 4, group: "path", maxRanks: 1, icon: "SO", color: "#ff8ed9", description: ["Path. Your class skill becomes Chaos Surge instead of baseline Blink.", "Low-mana chaos removes the normal low-mana spell power penalty and supports aggressive surge windows."] },
  { key: "enchanterPath", label: "Enchanter", tier: 4, group: "path", maxRanks: 1, icon: "EN", color: "#d4b1ff", description: ["Path. Your class skill remains Blink but leaves a decoy behind.", "Focuses on influence, charm, weakening, and redirecting enemies through summoned distractions."] },

  { key: "arcaneClarity", label: "Arcane Clarity", tier: 5, group: "general", maxRanks: 1, icon: "AC", color: "#f2e6bc", description: ["General. After standing still for 3 sec, gain clarity until you move.", "While active, mana regeneration is increased by 25% and spell power is increased by 25%."] },
  { key: "deepReserves", label: "Deep Reserves", tier: 5, group: "general", maxRanks: 1, icon: "DR", color: "#8eb8ff", description: ["General. Maximum mana is increased by 8.", "Mana regeneration speed is reduced by 15%, trading recovery speed for a larger spell pool."] },
  { key: "manaSurge", label: "Mana Surge", tier: 5, group: "general", maxRanks: 1, icon: "MS", color: "#ffcf77", description: ["General. While below 40% mana, spell delay is reduced by 33%.", "While below 40% mana, spell damage is increased by 20% and the normal low-mana penalty is avoided."] },
  { key: "phaseBarrier", label: "Phase Barrier", tier: 5, group: "general", maxRanks: 1, icon: "PB", color: "#9dd7ff", description: ["General. Once per second, incoming damage can spend 1 mana to reduce that hit by 50%.", "Does not trigger at 0 mana and will not consume mana unless damage is being reduced."] },
  { key: "catalyst", label: "Catalyst", tier: 5, group: "general", maxRanks: 1, icon: "CA", color: "#ffb36a", description: ["General. Swapping cast modes grants a short Spellweaver window.", "During the window, spell delay is reduced by 15% and spell power is increased by 10%; status-affected kills spread one status to nearby enemies."] },
  { key: "arcanePresence", label: "Arcane Presence", tier: 5, group: "general", maxRanks: 1, icon: "AP", color: "#b7e0ff", description: ["General. Standing in your owned magical effects empowers your casting.", "While active, gain +12% spell power, +20% mana regeneration, and +1 flat damage reduction."] },
  { key: "lingeringPower", label: "Lingering Power", tier: 5, group: "general", maxRanks: 1, icon: "LP", color: "#d7d9e8", description: ["General. Persistent magical effects last 25% longer before other spell power scaling.", "Persistent effects also tick faster, increasing damage and utility frequency over their lifetime."] },
  { key: "arcaneBind", label: "Arcane Bind", tier: 5, group: "general", maxRanks: 1, icon: "AB", color: "#b6f0ff", description: ["General. Hits can create a short binding field.", "Enemies inside the field are slowed and weakened, giving your spells and summons a control window."] },

  { key: "archmage", label: "Archmage", tier: 6, group: "capstone", maxRanks: 1, icon: "AR", color: "#f6f0df", description: ["Capstone. High-mana spell mastery improves your maximum spell power bonus.", "The high-mana spell power cap rises from +30% to +45%; high-mana class-skill use also grants temporary HP and a rune."] },
  { key: "lich", label: "Lich", tier: 6, group: "capstone", maxRanks: 1, icon: "LI", color: "#c7f0a0", description: ["Capstone. Enemy kills create Souls that drift to you and restore health.", "Also enables death-burst style effects, letting slain enemies create additional pressure around their death point."] },
  { key: "battlemage", label: "Battlemage", tier: 6, group: "capstone", maxRanks: 1, icon: "BM", color: "#d5ab73", description: ["Capstone. Close spell play gains defensive and shockwave payoffs.", "Blink-style class skills grant temporary HP, close spells gain damage reduction, and melee cantrip attacks gain reach and splash."] },
  { key: "runicMastery", label: "Runic Mastery", tier: 6, group: "capstone", maxRanks: 1, icon: "RM", color: "#9d8cff", description: ["Capstone. Cantrip hits build up to 3 Runes.", "Spells consume Runes for +10% spell power per Rune and additional spell-specific effects."] }
];

const DEF_BY_KEY = Object.fromEntries(MAGE_TALENT_DEFS.map((def) => [def.key, def]));

export function createNecromancerTalentState() {
  return Object.fromEntries(MAGE_TALENT_DEFS.map((def) => [def.key, { key: def.key, points: 0, maxPoints: def.maxRanks }]));
}

export function cloneNecromancerTalentState(source = null) {
  const next = createNecromancerTalentState();
  if (!source || typeof source !== "object") return next;
  for (const [key, node] of Object.entries(next)) {
    const raw = source[key];
    if (!raw || typeof raw !== "object") continue;
    if (Number.isFinite(raw.points)) node.points = Math.max(0, Math.min(node.maxPoints, Math.floor(raw.points)));
  }
  return next;
}

export function getNecromancerTalentDefs() {
  return MAGE_TALENT_DEFS.map((def) => ({ ...def }));
}

export function getNecromancerTalentDef(key) {
  return DEF_BY_KEY[key] ? { ...DEF_BY_KEY[key] } : null;
}

export function isNecromancerTalentGame(game) {
  return !!game && typeof game.isNecromancerClass === "function" && game.isNecromancerClass();
}

export function getNecromancerTalentPoints(game, key) {
  const points = game?.necromancerTalents?.[key]?.points;
  return Number.isFinite(points) ? Math.max(0, points) : 0;
}

export function hasMageTalent(game, key) {
  return getNecromancerTalentPoints(game, key) > 0;
}

export const hasNecromancerTalent = hasMageTalent;

export function getNecromancerUtilityKeys() {
  return [];
}

export function getNecromancerUtilityLevel() {
  return 0;
}

export function getNecromancerSpentSkillPoints(game) {
  return MAGE_TALENT_DEFS.reduce((sum, def) => sum + getNecromancerTalentPoints(game, def.key), 0);
}

export function getNecromancerAvailableSkillPoints(game) {
  return Number.isFinite(game?.skillPoints) ? Math.max(0, game.skillPoints) : 0;
}

export function getMageTierLabel(tier) {
  return MAGE_TIER_LABELS[tier] || `Tier ${tier}`;
}

export function getMageSelectedInGroup(game, group) {
  return MAGE_TALENT_DEFS.filter((def) => def.group === group && getNecromancerTalentPoints(game, def.key) > 0).map((def) => def.key);
}

export function getMageSelectedCantrip(game) {
  return getMageSelectedInGroup(game, "cantrip")[0] || null;
}

export function getMageSelectedSpell(game) {
  return getMageSelectedInGroup(game, "spell")[0] || null;
}

export function getMageSelectedStyle(game) {
  return getMageSelectedInGroup(game, "style")[0] || null;
}

export function getMageSelectedPath(game) {
  return getMageSelectedInGroup(game, "path")[0] || null;
}

export function getMageSelectedTier5Count(game) {
  return getMageSelectedInGroup(game, "general").length;
}

export function getMageSelectedCapstones(game) {
  return getMageSelectedInGroup(game, "capstone").length;
}

export function getNecromancerSelectedCapstones(game) {
  return getMageSelectedCapstones(game);
}

export function getMageGroupLimit(group) {
  return MAGE_GROUP_LIMITS[group] || 1;
}

export function isMageTierAccessible(game, tier) {
  const level = Number.isFinite(game?.level) ? Math.max(1, Math.floor(game.level)) : 1;
  if (level < getOpenProgressionTierLevel(tier)) return false;
  if (tier <= 1) return true;
  if (tier === 2) return !!getMageSelectedCantrip(game);
  if (tier === 3) return !!getMageSelectedSpell(game);
  if (tier === 4) return !!getMageSelectedStyle(game);
  if (tier === 5) return !!getMageSelectedPath(game);
  if (tier === 6) return getMageSelectedTier5Count(game) >= 2;
  return false;
}

export function getNecromancerRowRequirement(row) {
  const tier = Math.max(1, Math.min(6, Math.floor(row) + 1));
  return getOpenProgressionTierLevel(tier);
}

export function isNecromancerRowAccessible(game, row) {
  return isMageTierAccessible(game, row + 1);
}

export function getNecromancerUnlockRequirementText(game, def) {
  if (!def) return "";
  const level = Number.isFinite(game?.level) ? Math.max(1, Math.floor(game.level)) : 1;
  const requiredLevel = getOpenProgressionTierLevel(def.tier);
  if (level < requiredLevel) return `Requires level ${requiredLevel}.`;
  if (def.tier === 1) return "Available now.";
  if (def.tier === 2) return getMageSelectedCantrip(game) ? "Available now." : "Requires a cantrip.";
  if (def.tier === 3) return getMageSelectedSpell(game) ? "Available now." : "Requires a spell.";
  if (def.tier === 4) return getMageSelectedStyle(game) ? "Available now." : "Requires a casting style.";
  if (def.tier === 5) {
    if (!getMageSelectedPath(game)) return "Requires a path.";
    if (getMageSelectedTier5Count(game) >= 2) return "Tier 5 limit reached.";
    return "Pick exactly two Tier 5 skills.";
  }
  if (def.tier === 6) {
    if (getMageSelectedTier5Count(game) < 2) return "Requires exactly two Tier 5 skills.";
    if (getMageSelectedCapstones(game) >= 1) return "Capstone already selected.";
    return "Available now.";
  }
  return "";
}

export function canSpendNecromancerNode(game, key) {
  if (!isNecromancerTalentGame(game) || getNecromancerAvailableSkillPoints(game) <= 0) return false;
  const def = DEF_BY_KEY[key];
  if (!def) return false;
  const node = game?.necromancerTalents?.[key];
  if (!node || node.points >= node.maxPoints) return false;
  if (!isMageTierAccessible(game, def.tier)) return false;
  if (getMageSelectedInGroup(game, def.group).length >= getMageGroupLimit(def.group)) return false;
  return true;
}

export function canSpendNecromancerUtility() {
  return false;
}

export function spendNecromancerNode(game, key) {
  if (!canSpendNecromancerNode(game, key)) return false;
  game.necromancerTalents[key].points = 1;
  game.skillPoints -= 1;
  if (key === "necromancerPath" && typeof game.clearTemporaryMageCharms === "function") game.clearTemporaryMageCharms();
  return true;
}

export function spendNecromancerUtility() {
  return false;
}

export function formatNecromancerLaneLabel(group) {
  if (group === "cantrip") return "Cantrip";
  if (group === "spell") return "Spell";
  if (group === "style") return "Style";
  if (group === "path") return "Path";
  if (group === "general") return "General";
  if (group === "capstone") return "Capstone";
  return "Mage";
}

export function getNecromancerTooltip(game, entry) {
  if (!entry) return null;
  const def = DEF_BY_KEY[entry.key];
  if (!def) return null;
  return {
    title: def.label,
    lines: def.description.slice(),
    requirement: entry.locked ? getNecromancerUnlockRequirementText(game, def) : ""
  };
}

export function getNecromancerSkillPointGainForLevel(level, classType) {
  if (classType !== "necromancer") return 1;
  return getOpenProgressionSkillPointGainForLevel(level);
}

export function getMageBaseMaxMana(game) {
  let maxMana = 7;
  if (hasMageTalent(game, "wizardPath")) maxMana += 3;
  if (hasMageTalent(game, "deepReserves")) maxMana += 8;
  const runtime = game?.necromancerRuntime || game?.player?.necromancerRuntime || {};
  if ((runtime.arcaneFocusTimer || 0) > 0) maxMana += 3;
  return maxMana;
}

export function getMageManaRegenPerSecond(game) {
  let regen = 1;
  if (hasMageTalent(game, "deepReserves")) regen *= 0.85;
  if (hasMageTalent(game, "arcaneClarity") && (game?.necromancerRuntime?.arcaneClarityTimer || 0) > 0) regen *= 1.25;
  if (hasMageArcanePresenceActive(game)) regen *= 1.2;
  if (hasMageTalent(game, "rapidCasting")) regen *= 1.1;
  return regen;
}

export function hasMageArcanePresenceActive(game) {
  if (!hasMageTalent(game, "arcanePresence")) return false;
  const player = game?.player;
  if (!player) return false;
  return (game.fireZones || []).some((zone) => {
    if (!zone || zone.life <= 0 || zone.ownerId !== player.id) return false;
    if (!["arcaneBind", "cloudDaggers", "confusion", "runicVeil", "fire", "arcaneBurst", "spiritGuardians"].includes(zone.zoneType)) return false;
    const radius = Number.isFinite(zone.radius) ? zone.radius : 0;
    return Math.hypot((zone.x || 0) - (player.x || 0), (zone.y || 0) - (player.y || 0)) <= radius + (player.size || 20) * 0.5;
  });
}

export function getMageManaRatio(game) {
  const runtime = game?.necromancerRuntime || game?.player?.necromancerRuntime || {};
  const maxMana = Math.max(1, getMageBaseMaxMana(game));
  return Math.max(0, Math.min(1, (Number.isFinite(runtime.mana) ? runtime.mana : maxMana) / maxMana));
}

export function getMageSpellPowerMultiplier(game, options = {}) {
  const runtime = game?.necromancerRuntime || game?.player?.necromancerRuntime || {};
  const ratio = Number.isFinite(options.manaRatio) ? options.manaRatio : getMageManaRatio(game);
  let mult = 1;
  const lockedTier = (runtime.arcaneFocusTimer || 0) > 0 ? runtime.arcaneFocusTier : "";
  const highThreshold = hasMageTalent(game, "wizardPath") ? 5.6 / Math.max(1, getMageBaseMaxMana(game)) : 0.8;
  const highCap = hasMageTalent(game, "archmage") ? 0.45 : 0.3;
  const highRatio = lockedTier === "high" ? 1 : ratio >= highThreshold ? Math.min(1, (ratio - highThreshold) / Math.max(0.01, 1 - highThreshold)) : 0;
  if (highRatio > 0) mult += highCap * highRatio;
  else if (lockedTier !== "mid" && ratio < 0.4) mult -= hasMageTalent(game, "manaSurge") || hasMageTalent(game, "sorcererPath") ? 0 : 0.2;
  if (hasMageTalent(game, "highFocus")) mult += highRatio > 0 ? 0.12 : ratio < 0.4 ? -0.1 : 0;
  if (hasMageTalent(game, "rapidCasting")) mult -= 0.08;
  if (hasMageTalent(game, "manaSurge") && ratio < 0.4) mult += 0.2;
  if (hasMageTalent(game, "arcaneClarity") && (runtime.arcaneClarityTimer || 0) > 0) mult += 0.25;
  if (hasMageArcanePresenceActive(game)) mult += 0.12;
  if (hasMageTalent(game, "catalyst") && (runtime.catalystTimer || 0) > 0) mult += 0.1;
  if (hasMageTalent(game, "runicMastery") && Number.isFinite(options.runesConsumed)) mult += Math.max(0, Math.min(3, options.runesConsumed)) * 0.1;
  return Math.max(0.35, mult);
}

export function getMageSpellDelayMultiplier(game) {
  let mult = 1;
  const ratio = getMageManaRatio(game);
  if (hasMageTalent(game, "rapidCasting")) mult *= 0.85;
  if (hasMageTalent(game, "manaSurge") && ratio < 0.4) mult *= 0.67;
  if (hasMageTalent(game, "catalyst") && (game?.necromancerRuntime?.catalystTimer || 0) > 0) mult *= 0.85;
  return Math.max(0.25, mult);
}

export function getMagePersistentDurationMultiplier(game) {
  let mult = 1;
  if (hasMageTalent(game, "lingeringPower")) mult *= 1.25;
  const spellMult = getMageSpellPowerMultiplier(game);
  return mult * Math.max(0.75, Math.min(1.3, spellMult));
}

export function hasNecromancerDeathBolt(game) {
  return hasMageTalent(game, "necromancerPath");
}

export function getNecromancerControlCapBonus(game) {
  return hasMageTalent(game, "necromancerPath") ? 3 : 0;
}

export function getNecromancerBeamDamageMultiplier(game) {
  let mult = 1.3;
  if (hasMageTalent(game, "necromancerPath")) mult += 0.15;
  return mult * getMageSpellPowerMultiplier(game);
}

export function getNecromancerBaseCharmDurationForLevel() {
  return 0.55;
}

export function getNecromancerDeathBoltCooldownReduction() { return 0; }
export function getNecromancerDeathBoltDamageMultiplier(game) { return getMageSpellPowerMultiplier(game); }
export function getNecromancerDeathBoltExplosionDamageMultiplier(game) { return getMageSpellPowerMultiplier(game); }
export function getNecromancerDeathBoltZoneDurationMultiplier(game) { return getMagePersistentDurationMultiplier(game); }
export function getNecromancerDeathBoltRadiusMultiplier(game) { return Math.max(0.75, Math.min(1.45, getMageSpellPowerMultiplier(game))); }
export function getNecromancerBeamHealingMultiplier(game) { return hasMageTalent(game, "necromancerPath") ? 1.25 : 1; }
export function getNecromancerDeathBoltGhostSpawnChance(game) { return hasMageTalent(game, "necromancerPath") ? 1 : 0; }
export function getNecromancerDeathBoltMasteryTempHpOnKill() { return 0; }
export function getNecromancerTempHpCap(game, entity = game?.player) { return Math.max(0, Math.floor((entity?.maxHealth || 0) * 0.3)); }
export function getNecromancerBeamPulseRateMultiplier(game) { return hasMageTalent(game, "rapidCasting") ? 1.2 : 1; }
export function getNecromancerBoneWardDamageReduction() { return 0; }
export function getNecromancerBoneWardDamageBonus() { return 0; }
export function getNecromancerBoneWardReflectChance() { return 0; }
export function hasNecromancerCurse() { return false; }
export function getNecromancerCurseDuration() { return 3; }
export function getNecromancerCurseUndeadDamageBonus() { return 0; }
export function getNecromancerRotDuration() { return 3; }
export function getNecromancerRotSlowPct() { return 0.25; }
export function getNecromancerRotDps(game) { return Math.max(1, (typeof game?.getDeathBoltBaseDamage === "function" ? game.getDeathBoltBaseDamage() : 8) * 0.12); }
export function hasNecromancerExplodingDeath(game) { return hasMageTalent(game, "lich"); }
export function getNecromancerExplodingDeathDamage() { return 5; }
export function getNecromancerExplodingDeathRadiusTiles() { return 2; }
export function getNecromancerVigorDefenseBonusPct(game) { return (game?.necromancerRuntime?.battlemageGuardTimer || 0) > 0 ? 0.3 : 0; }
export function getNecromancerVigorMoveSpeedBonusPct() { return 0; }
export function getNecromancerVigorBeamDamageMultiplier() { return 1; }
export function getNecromancerVigorHealFraction() { return 0; }
export function hasNecromancerPlaguecraftRot() { return false; }
export function hasNecromancerPlaguecraftDeathBurst() { return false; }
export function getNecromancerPlaguecraftRiseChance() { return 0; }
export function hasNecromancerHarvester() { return false; }
export function hasNecromancerLegionMaster() { return false; }
export function hasNecromancerBlightstorm() { return false; }
export function getNecromancerBlackCandleCursedBeamBonus() { return 0; }
export function getNecromancerRotTouchedRetaliationDamage() { return 0; }
export function getNecromancerGhostLifeSteal() { return 0; }
export function getNecromancerBlackCandleDamageBonus() { return 0; }
export function getNecromancerColdCommandRanks() { return 0; }
export function getNecromancerControlledUndeadHealthBonusPct(game) { return hasMageTalent(game, "necromancerPath") ? 0.2 : 0; }
export function getNecromancerControlledUndeadDefenseBonusPct(game) { return hasMageTalent(game, "necromancerPath") ? 0.1 : 0; }
export function getNecromancerControlledUndeadDamageBonusPct(game) {
  let bonus = hasMageTalent(game, "necromancerPath") ? 0.1 : 0;
  bonus += getMageManaRatio(game) * 0.2;
  return bonus;
}
export function getNecromancerControlledUndeadAttackSpeedBonusPct(game) { return getMageManaRatio(game) * 0.15; }
