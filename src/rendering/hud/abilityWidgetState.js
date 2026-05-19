import { getNecromancerTalentDef } from "../../game/necromancerTalentTree.js";
import { getRangerSelectedPath, getRangerTalentDef } from "../../game/rangerTalentTree.js";
import { getWarriorClassSkillColor, getWarriorClassSkillCooldown, getWarriorClassSkillName, getWarriorDoctrine, getWarriorTalentDef } from "../../game/warriorTalentTree.js";

function createGlyphIcon(label, color) {
  return { kind: "glyph", label, color };
}

function createTalentGlyphIcon(def, fallbackLabel, fallbackColor) {
  return createGlyphIcon(def?.icon || fallbackLabel, def?.color || fallbackColor);
}

function createScoutTalentIcon(key, fallbackLabel, fallbackColor) {
  const def = getRangerTalentDef(key);
  return { kind: "scoutSkill", key, label: def?.icon || fallbackLabel, color: def?.color || fallbackColor };
}

function getWarriorDoctrineIcon(game) {
  const keyMap = {
    paladin: "paladinDoctrine",
    berserker: "berserkerDoctrine",
    gladiator: "gladiatorDoctrine",
    eldritch: "eldritchDoctrine"
  };
  const key = keyMap[getWarriorDoctrine(game)];
  return key ? createTalentGlyphIcon(getWarriorTalentDef(key), "BC", getWarriorClassSkillColor(game)) : createGlyphIcon("BC", getWarriorClassSkillColor(game));
}

function getNecromancerPathIcon(path, color) {
  const keyMap = {
    wizard: "wizardPath",
    necromancer: "necromancerPath",
    sorcerer: "sorcererPath",
    enchanter: "enchanterPath"
  };
  const key = keyMap[path];
  return key ? createTalentGlyphIcon(getNecromancerTalentDef(key), "BL", color) : createGlyphIcon("BL", color);
}

function getHudAbilitySource(game) {
  const target = game?.player && (game.player.alive === false || (game.player.health || 0) <= 0) && typeof game.getSpectateTargetEntity === "function"
    ? game.getSpectateTargetEntity()
    : null;
  if (!target || target === game.player) return game;
  const source = Object.create(game);
  source.player = target;
  source.classType = target.classType || game.classType;
  source.classSpec = game.config?.classes?.[source.classType] || game.classSpec;
  source.rangerTalents = target.rangerTalents || {};
  source.rangerRuntime = target.rangerRuntime || {};
  source.warriorTalents = target.warriorTalents || {};
  source.warriorRuntime = target.warriorRuntime || {};
  source.necromancerTalents = target.necromancerTalents || {};
  source.necromancerRuntime = target.necromancerRuntime || {};
  source.warriorRageCooldownTimer = Number.isFinite(target.warriorRageCooldownTimer) ? target.warriorRageCooldownTimer : 0;
  source.warriorRageActiveTimer = Number.isFinite(target.warriorRageActiveTimer) ? target.warriorRageActiveTimer : 0;
  return source;
}

export function getHudAbilityState(game) {
  const source = getHudAbilitySource(game);
  if (source.isWarriorClass && source.isWarriorClass()) {
    const title = getWarriorClassSkillName(source);
    const color = getWarriorClassSkillColor(source);
    const cooldownMax = Math.max(0.01, getWarriorClassSkillCooldown(source));
    const cooldownRemaining = Math.max(0, source.warriorRageCooldownTimer || 0);
    return {
      title,
      color,
      accent: "#ffb0b0",
      icon: getWarriorDoctrineIcon(source),
      cooldownRemaining,
      cooldownMax,
      progress: cooldownRemaining > 0 ? 1 - cooldownRemaining / cooldownMax : 1,
      hoverText: cooldownRemaining > 0 ? `${title} cooldown: ${cooldownRemaining.toFixed(1)}s` : `${title} ready`
    };
  }
  if (source.isNecromancerClass && source.isNecromancerClass()) {
    const path = source.necromancerTalents?.wizardPath?.points > 0
      ? "wizard"
      : source.necromancerTalents?.necromancerPath?.points > 0
      ? "necromancer"
      : source.necromancerTalents?.sorcererPath?.points > 0
      ? "sorcerer"
      : source.necromancerTalents?.enchanterPath?.points > 0
      ? "enchanter"
      : "blink";
    const titleMap = {
      wizard: "Arcane Focus",
      necromancer: "Death Bolt",
      sorcerer: "Chaos Surge",
      enchanter: "Mirage",
      blink: "Blink"
    };
    const colorMap = {
      wizard: "#8eb8ff",
      necromancer: "#a186ff",
      sorcerer: "#ff8ed9",
      enchanter: "#d4b1ff",
      blink: "#c6a8ff"
    };
    const cooldownMaxMap = {
      wizard: 18,
      necromancer: Math.max(0.01, game.config.deathBolt?.cooldown || 10),
      sorcerer: 10,
      enchanter: 10,
      blink: 10
    };
    const cooldownMax = cooldownMaxMap[path] || 10;
    const cooldownRemaining = Math.max(0, source.necromancerRuntime?.classSkillCooldownTimer || source.player.deathBoltCooldown || 0);
    return {
      title: titleMap[path],
      color: colorMap[path],
      accent: "#ffffff",
      icon: getNecromancerPathIcon(path, colorMap[path]),
      cooldownRemaining,
      cooldownMax,
      progress: cooldownRemaining > 0 ? 1 - cooldownRemaining / cooldownMax : 1,
      hoverText: cooldownRemaining > 0 ? `${titleMap[path]} cooldown: ${cooldownRemaining.toFixed(1)}s` : `${titleMap[path]} ready`
    };
  }
  const selectedPath = getRangerSelectedPath(source);
  const path = selectedPath === "rangerPath"
    ? "ranger"
    : selectedPath === "roguePath"
    ? "rogue"
    : selectedPath === "assassinPath"
    ? "assassin"
    : selectedPath === "beastMasterPath"
    ? "beastMaster"
    : "dodge";
  const titleMap = {
    ranger: "Fire Arrow",
    rogue: "Shadowstep",
    assassin: "Execute",
    beastMaster: "Nature's Ally",
    dodge: "Dodge"
  };
  const colorMap = {
    ranger: "#59b85a",
    rogue: "#9c88ff",
    assassin: "#ffc0b3",
    beastMaster: "#a6d77c",
    dodge: "#7cd5ff"
  };
  const cooldownMaxMap = {
    ranger: Math.max(0.01, game.config.fireArrow.cooldown),
    rogue: 8,
    assassin: 7,
    beastMaster: 10,
    dodge: 6
  };
  const unlocked = true;
  const cooldownMax = cooldownMaxMap[path] || 6;
  const cooldownRemaining = path === "ranger"
    ? Math.max(0, source.player.fireArrowCooldown || source.rangerRuntime?.classSkillCooldownTimer || 0)
    : Math.max(0, source.rangerRuntime?.classSkillCooldownTimer || 0);
  return {
    title: titleMap[path],
    color: colorMap[path],
    accent: "#d7ffd0",
    icon: selectedPath ? createScoutTalentIcon(selectedPath, "DG", colorMap[path]) : createGlyphIcon("DG", colorMap[path]),
    cooldownRemaining,
    cooldownMax,
    progress: unlocked ? (cooldownRemaining > 0 ? 1 - cooldownRemaining / cooldownMax : 1) : 0,
    hoverText: cooldownRemaining > 0 ? `${titleMap[path]} cooldown: ${cooldownRemaining.toFixed(1)}s` : `${titleMap[path]} ready`
  };
}
