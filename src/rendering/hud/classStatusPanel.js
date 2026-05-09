import {
  getRangerSelectedModifier,
  getRangerSelectedWeapon,
  getRangerTalentDef
} from "../../game/rangerTalentTree.js";
import {
  getMageSelectedStyle,
  getNecromancerTalentDef
} from "../../game/necromancerTalentTree.js";
import { getMageAttackLabel, getMageEfficiencyState } from "./mageHudState.js";

function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function getPanelRect(renderer, layout) {
  const w = layout.isAndroid ? 146 : Math.max(178, layout.sidebarW - renderer.sidebarPadding * 2);
  const x = layout.isAndroid ? layout.playW - w - 12 : layout.sidebarX + renderer.sidebarPadding;
  const y = layout.topHudH + renderer.sidebarPadding;
  return { x, y, w, h: layout.isAndroid ? 82 : 88 };
}

function drawPanelBase(ctx, rect, accent) {
  ctx.fillStyle = "rgba(8, 12, 20, 0.94)";
  ctx.fillRect(rect.x - 6, rect.y - 6, rect.w + 12, rect.h + 12);
  ctx.strokeStyle = accent;
  ctx.strokeRect(rect.x - 5.5, rect.y - 5.5, rect.w + 11, rect.h + 11);
}

function drawLabelLine(ctx, label, value, x, y, width, muted = false) {
  ctx.fillStyle = muted ? "#8f9bb2" : "#9eb0d6";
  ctx.font = "10px Trebuchet MS";
  ctx.fillText(label.toUpperCase(), x, y);
  ctx.fillStyle = muted ? "#aeb7c6" : "#f2efe7";
  ctx.font = "bold 12px Trebuchet MS";
  const text = typeof value === "string" && value.trim() ? value.trim() : "Unselected";
  const maxWidth = Math.max(50, width);
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y + 14);
    return;
  }
  let clipped = text;
  while (clipped.length > 3 && ctx.measureText(`${clipped.slice(0, -1)}...`).width > maxWidth) clipped = clipped.slice(0, -1);
  ctx.fillText(`${clipped}...`, x, y + 14);
}

function drawSegmentedBar(ctx, rect, ratio, fill, sections = []) {
  ctx.fillStyle = "rgba(31, 39, 55, 0.96)";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  for (const section of sections) {
    ctx.fillStyle = section.color;
    ctx.globalAlpha = 0.26;
    ctx.fillRect(rect.x + rect.w * section.from, rect.y, Math.max(1, rect.w * (section.to - section.from) - 1), rect.h);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = fill;
  ctx.fillRect(rect.x, rect.y, Math.floor(rect.w * clamp01(ratio)), rect.h);
  ctx.strokeStyle = fill;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
}

function getRangerStatus(game) {
  const runtime = game.rangerRuntime || {};
  const combo = Math.max(0, Math.min(30, Math.floor(Number.isFinite(runtime.combo) ? runtime.combo : 0)));
  const tier = combo >= 20 ? 3 : combo >= 10 ? 2 : combo >= 5 ? 1 : 0;
  const color = tier === 3 ? "#6ff6ff" : tier === 2 ? "#ffd76d" : tier === 1 ? "#7ee189" : "#8a96a3";
  const weapon = getRangerTalentDef(getRangerSelectedWeapon(game))?.label || "Weapon";
  const modifier = getRangerTalentDef(getRangerSelectedModifier(game))?.label || "Attack Modifier";
  return {
    title: "Ranger",
    accent: color,
    primaryLabel: "Weapon",
    primary: weapon,
    stateLabel: "Modifier",
    state: modifier,
    barLabel: `Combo ${combo}/30`,
    barRatio: combo / 30,
    barColor: color,
    sections: [
      { from: 5 / 30, to: 10 / 30, color: "#7ee189" },
      { from: 10 / 30, to: 20 / 30, color: "#ffd76d" },
      { from: 20 / 30, to: 1, color: "#6ff6ff" }
    ]
  };
}

function getWarriorStatus(game) {
  const runtime = game.warriorRuntime || {};
  const weapon = typeof game.getWarriorWeaponProfile === "function" ? game.getWarriorWeaponProfile().weaponLabel : "Weapon";
  const mode = runtime.activeAttackMode === "secondary" ? "secondary" : "primary";
  const stance = typeof game.getWarriorModeDisplayName === "function" ? game.getWarriorModeDisplayName(mode) : "Stance";
  const hasShockRelease = (game?.warriorTalents?.shockRelease?.points || 0) > 0;
  const threshold = typeof game.getWarriorShockReleaseThreshold === "function" ? game.getWarriorShockReleaseThreshold() : 5;
  const charges = Math.max(0, Math.min(threshold, runtime.shockReleaseReady ? threshold : runtime.shockReleaseCharges || 0));
  return {
    title: "Warrior",
    accent: hasShockRelease && runtime.shockReleaseReady ? "#fff0a8" : "#d7a06a",
    primaryLabel: "Weapon",
    primary: weapon,
    stateLabel: mode === "secondary" ? "Stance B" : "Stance A",
    state: stance,
    barLabel: hasShockRelease ? `Shock Release ${runtime.shockReleaseReady ? "Ready" : `${charges}/${threshold}`}` : "",
    barRatio: threshold > 0 ? charges / threshold : 0,
    barColor: runtime.shockReleaseReady ? "#fff0a8" : "#d7a06a",
    sections: []
  };
}

function getMageStatus(game) {
  const runtime = game.necromancerRuntime || {};
  const efficiency = getMageEfficiencyState(game);
  const maxMana = typeof game.getMageMaxMana === "function" ? game.getMageMaxMana() : 7;
  const mana = Number.isFinite(runtime.mana) ? runtime.mana : maxMana;
  const style = getNecromancerTalentDef(getMageSelectedStyle(game))?.label || "Casting Style";
  return {
    title: "Mage",
    accent: efficiency.color,
    primaryLabel: "Attack",
    primary: getMageAttackLabel(game),
    stateLabel: "Style",
    state: style,
    barLabel: `Mana ${Math.floor(mana)}/${maxMana}`,
    barRatio: maxMana > 0 ? mana / maxMana : 1,
    barColor: efficiency.color,
    sections: [
      { from: 0, to: 0.4, color: "#ff7f6e" },
      { from: 0.4, to: 0.8, color: "#dce7fb" },
      { from: 0.8, to: 1, color: "#7ee7ff" }
    ]
  };
}

function getClassStatus(game) {
  if (game?.isArcherClass && game.isArcherClass()) return getRangerStatus(game);
  if (game?.isWarriorClass && game.isWarriorClass()) return getWarriorStatus(game);
  if (game?.isNecromancerClass && game.isNecromancerClass()) return getMageStatus(game);
  return null;
}

export function drawClassStatusPanel(renderer, game, layout) {
  const status = getClassStatus(game);
  if (!status) return layout.topHudH;
  const ctx = renderer.ctx;
  const rect = getPanelRect(renderer, layout);
  drawPanelBase(ctx, rect, status.accent);

  ctx.fillStyle = status.accent;
  ctx.font = "bold 12px Trebuchet MS";
  ctx.fillText(status.title, rect.x, rect.y + 10);

  const columnW = Math.floor((rect.w - 10) / 2);
  drawLabelLine(ctx, status.primaryLabel, status.primary, rect.x, rect.y + 28, columnW);
  drawLabelLine(ctx, status.stateLabel, status.state, rect.x + columnW + 10, rect.y + 28, columnW);

  if (status.barLabel) {
    ctx.fillStyle = "#cbd5e6";
    ctx.font = "11px Trebuchet MS";
    ctx.fillText(status.barLabel, rect.x, rect.y + 65);
    drawSegmentedBar(ctx, { x: rect.x, y: rect.y + 70, w: rect.w, h: 8 }, status.barRatio, status.barColor, status.sections);
  }

  return rect.y + rect.h + 6;
}
