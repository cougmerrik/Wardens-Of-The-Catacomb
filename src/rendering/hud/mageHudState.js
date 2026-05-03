import {
  getMageSelectedCantrip,
  getMageSelectedSpell,
  getNecromancerTalentDef
} from "../../game/necromancerTalentTree.js";

export function getMageAttackLabel(game) {
  const runtime = game?.necromancerRuntime || {};
  const key = runtime.activeMode === "spell"
    ? getMageSelectedSpell(game)
    : getMageSelectedCantrip(game);
  const fallback = runtime.activeMode === "spell" ? "Spell" : "Cantrip";
  return getNecromancerTalentDef(key)?.label || fallback;
}

export function getMageEfficiencyState(game) {
  const tier = typeof game?.getMageManaTier === "function" ? game.getMageManaTier() : "mid";
  if (tier === "high") return { tier, label: "High Efficiency", shortLabel: "High", color: "#7ee7ff" };
  if (tier === "low") return { tier, label: "Low Efficiency", shortLabel: "Low", color: "#ff9a86" };
  return { tier: "mid", label: "Normal Efficiency", shortLabel: "Normal", color: "#dce7fb" };
}
