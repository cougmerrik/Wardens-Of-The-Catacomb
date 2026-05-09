import { getWarriorClassSkillColor, getWarriorClassSkillCooldown, getWarriorClassSkillName } from "../../game/warriorTalentTree.js";

export function getHudAbilityState(game) {
  if (game.isWarriorClass && game.isWarriorClass()) {
    const title = getWarriorClassSkillName(game);
    const color = getWarriorClassSkillColor(game);
    const cooldownMax = Math.max(0.01, getWarriorClassSkillCooldown(game));
    const cooldownRemaining = Math.max(0, game.warriorRageCooldownTimer || 0);
    return {
      title,
      color,
      accent: "#ffb0b0",
      cooldownRemaining,
      cooldownMax,
      progress: cooldownRemaining > 0 ? 1 - cooldownRemaining / cooldownMax : 1,
      hoverText: cooldownRemaining > 0 ? `${title} cooldown: ${cooldownRemaining.toFixed(1)}s` : `${title} ready`
    };
  }
  if (game.isNecromancerClass && game.isNecromancerClass()) {
    const path = game.necromancerTalents?.wizardPath?.points > 0
      ? "wizard"
      : game.necromancerTalents?.necromancerPath?.points > 0
      ? "necromancer"
      : game.necromancerTalents?.sorcererPath?.points > 0
      ? "sorcerer"
      : game.necromancerTalents?.enchanterPath?.points > 0
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
    const cooldownRemaining = Math.max(0, game.necromancerRuntime?.classSkillCooldownTimer || game.player.deathBoltCooldown || 0);
    return {
      title: titleMap[path],
      color: colorMap[path],
      accent: "#ffffff",
      cooldownRemaining,
      cooldownMax,
      progress: cooldownRemaining > 0 ? 1 - cooldownRemaining / cooldownMax : 1,
      hoverText: cooldownRemaining > 0 ? `${titleMap[path]} cooldown: ${cooldownRemaining.toFixed(1)}s` : `${titleMap[path]} ready`
    };
  }
  const path = game.rangerTalents?.rangerPath?.points > 0
    ? "ranger"
    : game.rangerTalents?.roguePath?.points > 0
    ? "rogue"
    : game.rangerTalents?.assassinPath?.points > 0
    ? "assassin"
    : game.rangerTalents?.beastMasterPath?.points > 0
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
    ? Math.max(0, game.player.fireArrowCooldown || game.rangerRuntime?.classSkillCooldownTimer || 0)
    : Math.max(0, game.rangerRuntime?.classSkillCooldownTimer || 0);
  return {
    title: titleMap[path],
    color: colorMap[path],
    accent: "#d7ffd0",
    cooldownRemaining,
    cooldownMax,
    progress: unlocked ? (cooldownRemaining > 0 ? 1 - cooldownRemaining / cooldownMax : 1) : 0,
    hoverText: cooldownRemaining > 0 ? `${titleMap[path]} cooldown: ${cooldownRemaining.toFixed(1)}s` : `${titleMap[path]} ready`
  };
}
