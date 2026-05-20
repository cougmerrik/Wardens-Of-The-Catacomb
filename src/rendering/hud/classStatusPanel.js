import {
  getRangerSelectedModifier,
  getRangerSelectedWeapon,
  getRangerTalentDef
} from "../../game/rangerTalentTree.js";
import {
  getMageSelectedStyle,
  getNecromancerTalentDef
} from "../../game/necromancerTalentTree.js";
import { getClassDisplayLabel } from "../../game/classDisplay.js";
import { getMageAttackLabel, getMageEfficiencyState } from "./mageHudState.js";
import { drawConsumableItemIcon } from "./consumableItemIcons.js";

function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function getPanelRect(renderer, layout) {
  const w = layout.isAndroid ? 146 : Math.max(178, layout.sidebarW - renderer.sidebarPadding * 2);
  const x = layout.isAndroid ? layout.playW - w - 12 : layout.sidebarX + renderer.sidebarPadding;
  const y = layout.topHudH + renderer.sidebarPadding;
  return { x, y, w, h: layout.isAndroid ? 82 : 88 };
}

function formatMetric(value, suffix = "") {
  if (!Number.isFinite(value)) return "-";
  return `${Math.round(value)}${suffix}`;
}

function getNetworkStatusLines(game) {
  if (!game?.debugHudEnabled || !game.networkEnabled) return [];
  const stats = game.debugHudStats && typeof game.debugHudStats === "object" ? game.debugHudStats : {};
  const net = stats.network && typeof stats.network === "object" ? stats.network : {};
  return [
    `NET ${formatMetric(stats.fps)}fps  Ping ${formatMetric(net.pingMs, "ms")}`,
    `Lat ${formatMetric(net.latencyMs, "ms")}  Jit ${formatMetric(net.jitterMs, "ms")}`,
    `Buf ${formatMetric(net.snapshotBuffer)}  In ${formatMetric(net.pendingInputs)}`
  ];
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

function getActiveConsumableStatuses(game) {
  const effects = game?.consumables?.effects || {};
  const statuses = [];
  if ((effects.regenerationPotion?.timer || 0) > 0) statuses.push({ key: "regenerationPotion", count: Math.ceil(effects.regenerationPotion.timer || 0), color: "#79e59a" });
  if ((effects.speedPotion?.timer || 0) > 0) statuses.push({ key: "speedPotion", count: Math.ceil(effects.speedPotion.timer || 0), color: "#7fd7ff" });
  if ((effects.fireOil?.attacksRemaining || 0) > 0) statuses.push({ key: "fireOil", count: Math.floor(effects.fireOil.attacksRemaining || 0), color: "#ff9a54" });
  if ((effects.frostOil?.attacksRemaining || 0) > 0) statuses.push({ key: "frostOil", count: Math.floor(effects.frostOil.attacksRemaining || 0), color: "#93ddff" });
  if ((effects.spikeGrowth?.timer || 0) > 0) statuses.push({ key: "spikeGrowth", count: Math.ceil(effects.spikeGrowth.timer || 0), color: "#c7f06a" });
  const tempHp = Math.max(0, Number.isFinite(game?.player?.consumableRuntime?.tempHp) ? game.player.consumableRuntime.tempHp : 0);
  if (tempHp > 0) statuses.push({ key: "shield", count: Math.ceil(tempHp), color: "#b8c7ff" });
  return statuses;
}

function getConsumableStatusColumns(width) {
  return Math.max(1, Math.floor((Math.max(20, width) + 8) / 28));
}

function getConsumableStatusRows(width) {
  return Math.ceil(6 / getConsumableStatusColumns(width));
}

function drawConsumableStatuses(ctx, statuses, x, y, width) {
  const size = 20;
  const columns = getConsumableStatusColumns(width);
  for (let i = 0; i < statuses.length; i += 1) {
    const status = statuses[i];
    const iconX = x + (i % columns) * 28;
    const iconY = y + Math.floor(i / columns) * 28;
    ctx.fillStyle = "rgba(13, 18, 29, 0.96)";
    ctx.fillRect(iconX, iconY, size, size);
    ctx.strokeStyle = status.color;
    ctx.strokeRect(iconX + 0.5, iconY + 0.5, size - 1, size - 1);
    if (!drawConsumableItemIcon(ctx, status.key, iconX, iconY, size, 2)) {
      ctx.fillStyle = status.color;
      ctx.fillRect(iconX + 5, iconY + 5, size - 10, size - 10);
    }
    ctx.fillStyle = "#f7f3e8";
    ctx.font = "bold 10px Trebuchet MS";
    const label = `${status.count}`;
    ctx.fillText(label, iconX + size - 4 - ctx.measureText(label).width, iconY + size - 3);
  }
}

function getRangerStatus(game) {
  const runtime = game.rangerRuntime || {};
  const combo = Math.max(0, Math.min(30, Math.floor(Number.isFinite(runtime.combo) ? runtime.combo : 0)));
  const tier = combo >= 20 ? 3 : combo >= 10 ? 2 : combo >= 5 ? 1 : 0;
  const color = tier === 3 ? "#6ff6ff" : tier === 2 ? "#ffd76d" : tier === 1 ? "#7ee189" : "#8a96a3";
  const weapon = getRangerTalentDef(getRangerSelectedWeapon(game))?.label || "Weapon";
  const modifier = getRangerTalentDef(getRangerSelectedModifier(game))?.label || "Attack Modifier";
  return {
    title: getClassDisplayLabel(game),
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
    title: getClassDisplayLabel(game),
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
    title: getClassDisplayLabel(game),
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
  const networkLines = getNetworkStatusLines(game);
  const consumableStatuses = getActiveConsumableStatuses(game);
  const consumableRows = getConsumableStatusRows(rect.w);
  rect.h += consumableRows * 28;
  if (networkLines.length > 0 && !layout.isAndroid) rect.h += 42;
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

  drawConsumableStatuses(ctx, consumableStatuses, rect.x, rect.y + 86, rect.w);

  if (networkLines.length > 0 && !layout.isAndroid) {
    const netY = rect.y + 92 + consumableRows * 28;
    ctx.strokeStyle = "rgba(126, 139, 171, 0.35)";
    ctx.beginPath();
    ctx.moveTo(rect.x, netY - 10.5);
    ctx.lineTo(rect.x + rect.w, netY - 10.5);
    ctx.stroke();
    ctx.fillStyle = "#bfe8ff";
    ctx.font = "11px Trebuchet MS";
    for (let i = 0; i < networkLines.length; i += 1) {
      ctx.fillText(networkLines[i], rect.x, netY + i * 13);
    }
    game.networkStatsPanelRect = { x: rect.x, y: netY - 12, w: rect.w, h: 42 };
  } else {
    game.networkStatsPanelRect = null;
  }

  return rect.y + rect.h + 6;
}
