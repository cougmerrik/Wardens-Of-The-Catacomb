import { getMageSelectedCantrip, getMageSelectedPath } from "../game/necromancerTalentTree.js";

export function getMagePathPresentation(entityOrGame) {
  const path = getMageSelectedPath(entityOrGame);
  const cantrip = getMageSelectedCantrip(entityOrGame);
  let visual = { tint: "#a6a8ad", alpha: 0.42, filter: "none", staff: "#7a5130", staffWrap: "#b28d5f", arm: "#6f737b", orb: "#8b5a34" };
  if (path === "wizardPath") visual = { tint: "#2f7dff", alpha: 0.52, filter: "saturate(1.12) brightness(1.04)", staff: "#f3f6ff", staffWrap: "#b4c7ff", arm: "#6f93c9", orb: "#dfeaff" };
  if (path === "enchanterPath") visual = { tint: "#3faf63", alpha: 0.5, filter: "saturate(1.1) brightness(1.02)", staff: "#d8b84f", staffWrap: "#a98935", arm: "#79a06f", orb: "#f2d872" };
  if (path === "sorcererPath") visual = { tint: "#c83a30", alpha: 0.54, filter: "saturate(1.18) brightness(1.02)", staff: "#f3f6ff", staffWrap: "#f1a38b", arm: "#b56b62", orb: "#ffb1a8" };
  if (path === "necromancerPath") visual = { tint: "#8d9299", alpha: 0.54, filter: "saturate(0.7) brightness(0.92)", staff: "#111317", staffWrap: "#5c646f", arm: "#6f737b", orb: "#363a42" };
  if (cantrip === "greenFlameBladeCantrip") {
    return {
      ...visual,
      weapon: "greenFlameBlade",
      staff: "#235230",
      staffWrap: "#9cff9c",
      orb: "#7bff6d",
      bladeCore: "#ddffd2",
      bladeMid: "#77ff6d",
      bladeEdge: "#26c95a"
    };
  }
  return { ...visual, weapon: "runestaff" };
}

export function getMageVisualSpec(entityOrGame) {
  const visual = getMagePathPresentation(entityOrGame);
  const cantrip = getMageSelectedCantrip(entityOrGame);
  return {
    classKey: "mage",
    path: getMageSelectedPath(entityOrGame) || "default",
    cantrip,
    weapon: visual.weapon || "runestaff",
    costume: {
      robe: "#293348",
      robeDark: "#171d2b",
      hood: "#1d2435",
      trim: "#8eb8ff",
      skin: "#d5c1a3",
      hair: "#d9d2bf",
      staff: visual.staff || "#7a5130",
      staffWrap: visual.staffWrap || "#b28d5f",
      orb: visual.orb || "#9edcff",
      bladeCore: visual.bladeCore || "#ddffd2",
      bladeMid: visual.bladeMid || "#77ff6d",
      bladeEdge: visual.bladeEdge || "#26c95a"
    }
  };
}
