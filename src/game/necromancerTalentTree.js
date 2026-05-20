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
  3: "Casting Style",
  4: "Path",
  5: "System Skills",
  6: "Capstone"
};

const MAGE_TALENT_DEFS = [
  { key: "fireBoltCantrip", label: "Fire Bolt", tier: 1, group: "cantrip", maxRanks: 1, icon: "FB", color: "#ff9b62", description: ["Fast medium projectile.", "Applies Burning for 3 seconds."] },
  { key: "frozenOrbCantrip", label: "Frozen Orb", tier: 1, group: "cantrip", maxRanks: 1, icon: "FO", color: "#9edcff", description: ["Slow cold orb with lower direct damage.", "Pulses smaller shards that Chill enemies."] },
  { key: "shockCantrip", label: "Shock", tier: 1, group: "cantrip", maxRanks: 1, icon: "SH", color: "#f5e779", description: ["Very fast low-damage projectile.", "Chains to up to 2 nearby enemies."] },
  { key: "arcaneMissileCantrip", label: "Arcane Missile", tier: 1, group: "cantrip", maxRanks: 1, icon: "AM", color: "#c6a8ff", description: ["Homing missile toward the nearest enemy in your aim direction.", "Reliable low damage at up to 8 tiles."] },
  { key: "necroticBeamCantrip", label: "Necrotic Beam", tier: 1, group: "cantrip", maxRanks: 1, icon: "NB", color: "#9b85d8", description: ["Channel a necrotic beam.", "Temporarily charms undead, or permanently charms them as Necromancer."] },
  { key: "greenFlameBladeCantrip", label: "Green-Flame Blade", tier: 1, group: "cantrip", maxRanks: 1, icon: "GB", color: "#7ee082", description: ["Reach melee cantrip with life leech.", "Applies Burning and supports Battlemage."] },

  { key: "fireballSpell", label: "Fireball", tier: 2, group: "spell", maxRanks: 1, icon: "FI", color: "#ff754f", description: ["2 mana. Targeted projectile explosion.", "Large radius, high damage, and Burning."] },
  { key: "chromaticOrbSpell", label: "Chromatic Orb", tier: 2, group: "spell", maxRanks: 1, icon: "CO", color: "#f2d77a", description: ["2 mana. Piercing orb that cycles Fire, Frost, and Lightning.", "Flexible multi-target pressure."] },
  { key: "cloudDaggersSpell", label: "Cloud of Daggers", tier: 2, group: "spell", maxRanks: 1, icon: "CD", color: "#d7d9e8", description: ["2 mana. Targeted damage field.", "Lasts 4 seconds with a high tick rate."] },
  { key: "confusionSpell", label: "Confusion", tier: 2, group: "spell", maxRanks: 1, icon: "CF", color: "#e1a8ff", description: ["2 mana. Targeted disruption field.", "Confuses enemies and disables boss special abilities."] },
  { key: "invisibilitySpell", label: "Spirit Guardians", tier: 2, group: "spell", maxRanks: 1, icon: "SG", color: "#b7f0d0", description: ["2 mana. Briefly vanish and summon orbiting spirits.", "The aura damages enemies and triggers Mage on-hit effects."] },
  { key: "flamingSphereSpell", label: "Flaming Sphere", tier: 2, group: "spell", maxRanks: 1, icon: "SP", color: "#ffb05f", description: ["2 mana. Summon a mobile fire orb for 5 seconds.", "Recasting creates a new sphere at the target location."] },

  { key: "highFocus", label: "High Focus", tier: 3, group: "style", maxRanks: 1, icon: "HF", color: "#f4efe3", description: ["Stronger high-mana payoff.", "Harsher low-mana penalty."] },
  { key: "rapidCasting", label: "Rapid Casting", tier: 3, group: "style", maxRanks: 1, icon: "RC", color: "#9fd9ff", description: ["Shorter cantrip regen pause and spell delay.", "Lower peak spell efficiency."] },
  { key: "bloodCasting", label: "Blood Casting", tier: 3, group: "style", maxRanks: 1, icon: "BC", color: "#df6b6b", description: ["Health can cover missing mana.", "Blood-cast spells cannot self-kill you."] },
  { key: "battleCaster", label: "Battle Caster", tier: 3, group: "style", maxRanks: 1, icon: "BT", color: "#d5ab73", description: ["Adds defense and periodic arcane shielding.", "Supports close-range spell use."] },

  { key: "wizardPath", label: "Wizard", tier: 4, group: "path", maxRanks: 1, icon: "WZ", color: "#8eb8ff", description: ["Disciplined high-mana caster.", "Arcane Focus replaces Blink."] },
  { key: "necromancerPath", label: "Necromancer", tier: 4, group: "path", maxRanks: 1, icon: "NE", color: "#a186ff", description: ["Permanent undead control and kill conversion.", "Death Bolt replaces Blink."] },
  { key: "sorcererPath", label: "Sorcerer", tier: 4, group: "path", maxRanks: 1, icon: "SO", color: "#ff8ed9", description: ["Wild Magic and low-mana chaos.", "Chaos Surge replaces Blink."] },
  { key: "enchanterPath", label: "Enchanter", tier: 4, group: "path", maxRanks: 1, icon: "EN", color: "#d4b1ff", description: ["Influence, charm, weakening, and decoys.", "Blink leaves a decoy."] },

  { key: "arcaneClarity", label: "Arcane Clarity", tier: 5, group: "general", maxRanks: 1, icon: "AC", color: "#f2e6bc", description: ["After standing still for 3 seconds, gain clarity until moving.", "+25% mana regeneration and +25% spell power."] },
  { key: "deepReserves", label: "Deep Reserves", tier: 5, group: "general", maxRanks: 1, icon: "DR", color: "#8eb8ff", description: ["+8 maximum mana.", "-15% mana regeneration speed."] },
  { key: "manaSurge", label: "Mana Surge", tier: 5, group: "general", maxRanks: 1, icon: "MS", color: "#ffcf77", description: ["At low mana, spell delay is reduced by 33%.", "At low mana, spell damage is increased by 20%."] },
  { key: "phaseBarrier", label: "Phase Barrier", tier: 5, group: "general", maxRanks: 1, icon: "PB", color: "#9dd7ff", description: ["Once per second, spend 1 mana to reduce an incoming hit by 50%.", "Does not trigger at 0 mana."] },
  { key: "catalyst", label: "Catalyst", tier: 5, group: "general", maxRanks: 1, icon: "CA", color: "#ffb36a", description: ["Swapping modes grants a short Spellweaver window.", "Status-affected kills spread one status to nearby enemies."] },
  { key: "arcanePresence", label: "Arcane Presence", tier: 5, group: "general", maxRanks: 1, icon: "AP", color: "#b7e0ff", description: ["Standing in owned magical effects improves damage and mana regeneration.", "Also grants +1 flat damage reduction."] },
  { key: "lingeringPower", label: "Lingering Power", tier: 5, group: "general", maxRanks: 1, icon: "LP", color: "#d7d9e8", description: ["Persistent effects last longer.", "Persistent effects tick faster."] },
  { key: "arcaneBind", label: "Arcane Bind", tier: 5, group: "general", maxRanks: 1, icon: "AB", color: "#b6f0ff", description: ["Hits can create a short binding field.", "Enemies inside are slowed and weakened."] },

  { key: "archmage", label: "Archmage", tier: 6, group: "capstone", maxRanks: 1, icon: "AR", color: "#f6f0df", description: ["High-mana mastery.", "Maximum high-mana spell bonus rises to +45%."] },
  { key: "lich", label: "Lich", tier: 6, group: "capstone", maxRanks: 1, icon: "LI", color: "#c7f0a0", description: ["Kills create Souls.", "Souls drift to you and restore health."] },
  { key: "battlemage", label: "Battlemage", tier: 6, group: "capstone", maxRanks: 1, icon: "BM", color: "#d5ab73", description: ["Close spells grant damage reduction and release Arcane Shockwave.", "Green-Flame Blade gains reach and splash."] },
  { key: "runicMastery", label: "Runic Mastery", tier: 6, group: "capstone", maxRanks: 1, icon: "RM", color: "#9d8cff", description: ["Cantrip hits build up to 3 Runes.", "Spells consume Runes for stronger and spell-specific effects."] }
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
  if (group === "general") return "System";
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
