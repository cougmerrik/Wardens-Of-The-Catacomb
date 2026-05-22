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
import { drawAbilityCooldownWidget, drawAndroidSwapWidget } from "./stats.js";

const HUD_PANEL_ALPHA = 0.8;
const PANEL_CONTENT_TOP = 96;
const PANEL_BAR_BLOCK_H = 24;
const PANEL_CONSUMABLE_GAP = 4;
const PANEL_BUTTON_BLOCK_H = 74;
const PANEL_NETWORK_BLOCK_H = 48;
const PANEL_GROUP_EMPTY_H = 30;
const PANEL_GROUP_ROW_H = 22;
const PANEL_GROUP_BOTTOM_GAP = 4;
const PANEL_BOTTOM_PADDING = 32;

function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function getHudPanelWidth(renderer, layout) {
  const minimapW = Number.isFinite(renderer?.config?.minimap?.width) ? renderer.config.minimap.width : 180;
  return layout.isAndroid ? 176 : Math.min(240, Math.max(220, minimapW));
}

function getGroupListHeight(groupRows) {
  return groupRows > 0
    ? groupRows * PANEL_GROUP_ROW_H + PANEL_GROUP_BOTTOM_GAP
    : PANEL_GROUP_EMPTY_H;
}

function getPanelContentHeight(layout, width, hasStatusBar, groupRows, networkLines) {
  let height = PANEL_CONTENT_TOP;
  if (hasStatusBar) height += PANEL_BAR_BLOCK_H;
  height += getConsumableStatusRows(width) * 28 + PANEL_CONSUMABLE_GAP;
  height += PANEL_BUTTON_BLOCK_H;
  if (networkLines > 0 && !layout.isAndroid) height += PANEL_NETWORK_BLOCK_H;
  height += getGroupListHeight(groupRows);
  return height + PANEL_BOTTOM_PADDING;
}

function getPanelRect(renderer, layout, panelY = null, groupRows = 0, networkLines = 0, hasStatusBar = false) {
  const w = getHudPanelWidth(renderer, layout);
  const x = layout.playW - w - (layout.isAndroid ? 12 : 16);
  const y = Number.isFinite(panelY) ? Math.floor(panelY) : layout.topHudH + renderer.sidebarPadding;
  return { x, y, w, h: getPanelContentHeight(layout, w, hasStatusBar, groupRows, networkLines) };
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

function formatHudGold(value) {
  const amount = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  if (amount > 1000) return `${(amount / 1000).toFixed(1)}K`;
  return `${amount}`;
}

function drawPanelBase(ctx, rect, accent) {
  ctx.fillStyle = `rgba(8, 12, 20, ${HUD_PANEL_ALPHA})`;
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
  for (let i = 0; i < Math.min(6, statuses.length); i += 1) {
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

function drawHudButton(ctx, rect, label, options = {}) {
  const { active = false, activeFill = "rgba(88, 130, 105, 0.95)", disabled = false, pulse = 0, goldAmount = null } = options;
  if (disabled) {
    ctx.fillStyle = "rgba(42, 47, 58, 0.58)";
  } else if (pulse > 0) {
    const green = Math.floor(118 + pulse * 96);
    ctx.fillStyle = `rgba(32, ${green}, 72, 0.96)`;
  } else {
    ctx.fillStyle = active ? activeFill : "rgba(39, 53, 79, 0.94)";
  }
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = disabled ? "rgba(111, 119, 136, 0.34)" : pulse > 0 ? `rgba(120, 255, 156, ${0.56 + pulse * 0.3})` : "rgba(126, 139, 171, 0.72)";
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  ctx.fillStyle = disabled ? "#8992a4" : "#f3efe3";
  ctx.textAlign = "center";
  if (Number.isFinite(goldAmount)) {
    const cx = rect.x + rect.w * 0.5;
    ctx.font = "bold 10px Trebuchet MS";
    ctx.fillText(label, cx, rect.y + 11);
    const amountText = formatHudGold(goldAmount);
    const coinR = 4;
    const coinGap = 4;
    ctx.font = "bold 10px Trebuchet MS";
    const amountW = ctx.measureText(amountText).width;
    const coinX = cx - (coinR * 2 + coinGap + amountW) * 0.5 + coinR;
    const coinY = rect.y + 21;
    ctx.fillStyle = "#f6c84f";
    ctx.beginPath();
    ctx.arc(coinX, coinY, coinR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(102, 74, 19, 0.8)";
    ctx.stroke();
    ctx.fillStyle = "#fff3b3";
    ctx.beginPath();
    ctx.arc(coinX - 1.2, coinY - 1.2, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f3efe3";
    ctx.fillText(amountText, coinX + coinR + coinGap + amountW * 0.5, rect.y + 24);
  } else {
    ctx.font = "bold 11px Trebuchet MS";
    ctx.fillText(label, rect.x + rect.w * 0.5, rect.y + 17);
  }
  ctx.textAlign = "left";
}

function drawEmbeddedGroupList(ctx, game, rect, y) {
  const remotePlayers = Array.isArray(game.remotePlayers) ? game.remotePlayers : [];
  game.uiRects.groupPanelRows = [];
  if (remotePlayers.length === 0) return y;

  const pauseOwnerId = typeof game.networkPauseOwnerId === "string" ? game.networkPauseOwnerId : null;
  const roomOwnerId = typeof game.networkRoomOwnerId === "string" ? game.networkRoomOwnerId : null;
  for (const player of remotePlayers) {
    const alive = player?.alive !== false;
    const ratio = Number.isFinite(player?.maxHealth) && player.maxHealth > 0 ? Math.max(0, Math.min(1, player.health / player.maxHealth)) : 0;
    const accent = typeof player?.color === "string" && player.color.trim() ? player.color.trim() : "#58a6ff";
    const handle = typeof player?.handle === "string" && player.handle.trim() ? player.handle.trim() : "Player";
    const isPauseOwner = pauseOwnerId && player?.id === pauseOwnerId;
    const isRoomOwner = roomOwnerId && player?.id === roomOwnerId;
    const isSpectateTarget = typeof game.spectateTargetId === "string" && player?.id === game.spectateTargetId;
    const rowRect = { x: rect.x + 4, y, w: rect.w - 8, h: 18 };
    game.uiRects.groupPanelRows.push({ id: player?.id || "", rect: rowRect, alive });

    ctx.fillStyle = isSpectateTarget ? "rgba(31, 45, 68, 0.96)" : "rgba(16, 22, 31, 0.9)";
    ctx.fillRect(rowRect.x, rowRect.y, rowRect.w, rowRect.h);
    ctx.fillStyle = accent;
    ctx.fillRect(rowRect.x, rowRect.y, 3, rowRect.h);
    ctx.fillStyle = accent;
    ctx.font = "bold 10px Trebuchet MS";
    const prefix = isRoomOwner ? "★ " : "";
    let clipped = `${prefix}${handle}`;
    const nameMaxW = Math.max(46, Math.floor(rowRect.w * 0.42));
    while (clipped.length > prefix.length + 3 && ctx.measureText(`${clipped.slice(0, -1)}...`).width > nameMaxW) clipped = clipped.slice(0, -1);
    if (ctx.measureText(clipped).width > nameMaxW) clipped = `${clipped.slice(0, Math.max(prefix.length, clipped.length - 1))}...`;
    ctx.fillText(clipped, rowRect.x + 7, y + 12);
    if (isPauseOwner && !isRoomOwner) {
      ctx.fillStyle = "#f6d37a";
      ctx.fillText("*", rowRect.x + nameMaxW + 9, y + 12);
    }
    const barX = rowRect.x + nameMaxW + 18;
    const barY = y + 6;
    const barW = Math.max(48, rowRect.x + rowRect.w - barX - 6);
    ctx.fillStyle = "rgba(41, 52, 72, 0.95)";
    ctx.fillRect(barX, barY, barW, 6);
    ctx.fillStyle = alive ? (ratio > 0.5 ? "#76db8d" : ratio > 0.25 ? "#e1bf63" : "#df6767") : "#5c6371";
    ctx.fillRect(barX, barY, Math.floor(barW * ratio), 6);
    y += PANEL_GROUP_ROW_H;
  }
  return y + 4;
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

export function drawClassStatusPanel(renderer, game, layout, panelY = null) {
  const status = getClassStatus(game);
  if (!status) return layout.topHudH;
  const ctx = renderer.ctx;
  const networkLines = getNetworkStatusLines(game);
  const consumableStatuses = getActiveConsumableStatuses(game);
  const remoteCount = Array.isArray(game.remotePlayers) ? game.remotePlayers.length : 0;
  const groupRows = remoteCount;
  const rect = getPanelRect(renderer, layout, panelY, groupRows, networkLines.length, !!status.barLabel);
  game.uiRects.pauseOverlayResume = null;
  drawPanelBase(ctx, rect, status.accent);

  const playerHandle = typeof game.playerHandle === "string" && game.playerHandle.trim()
    ? game.playerHandle.trim()
    : "Player";
  ctx.fillStyle = status.accent;
  ctx.font = "bold 12px Trebuchet MS";
  ctx.fillText(playerHandle, rect.x, rect.y + 10);
  ctx.fillStyle = "#f2efe7";
  ctx.font = "11px Trebuchet MS";
  ctx.fillText(status.title, rect.x, rect.y + 25);
  const abilitySize = layout.isAndroid ? 42 : 36;
  const abilityX = rect.x + rect.w - abilitySize;
  drawAbilityCooldownWidget(renderer, game, abilityX, rect.y + 2, abilitySize);
  drawAndroidSwapWidget(renderer, game, game.uiRects.hudAbilityWidget);

  const columnW = Math.floor((rect.w - 10) / 2);
  drawLabelLine(ctx, status.primaryLabel, status.primary, rect.x, rect.y + 56, columnW);
  drawLabelLine(ctx, status.stateLabel, status.state, rect.x + columnW + 10, rect.y + 56, columnW);

  let contentY = rect.y + PANEL_CONTENT_TOP;
  if (status.barLabel) {
    ctx.fillStyle = "#cbd5e6";
    ctx.font = "11px Trebuchet MS";
    ctx.fillText(status.barLabel, rect.x, contentY);
    drawSegmentedBar(ctx, { x: rect.x, y: contentY + 5, w: rect.w, h: 8 }, status.barRatio, status.barColor, status.sections);
    contentY += PANEL_BAR_BLOCK_H;
  }

  drawConsumableStatuses(ctx, consumableStatuses, rect.x, contentY, rect.w);
  contentY += getConsumableStatusRows(rect.w) * 28 + PANEL_CONSUMABLE_GAP;

  const gap = 6;
  const buttonY = contentY;
  const buttonW = Math.floor((rect.w - gap) / 2);
  const buttonH = 30;
  const shopRect = { x: rect.x, y: buttonY, w: buttonW, h: buttonH };
  const skillRect = { x: rect.x + buttonW + gap, y: buttonY, w: rect.w - buttonW - gap, h: buttonH };
  const pauseRect = { x: rect.x, y: buttonY + buttonH + gap, w: rect.w, h: buttonH };
  const availableSkillPoints = Math.max(0, Math.floor(game.skillPoints || 0));
  const pulse = availableSkillPoints > 0 ? 0.5 + Math.sin((game.time || 0) * 3) * 0.5 : 0;
  const localPlayerId = typeof game.networkLocalPlayerId === "string" ? game.networkLocalPlayerId : null;
  const pauseOwnerId = typeof game.networkPauseOwnerId === "string" ? game.networkPauseOwnerId : null;
  const pauseDisabled = !!(game.networkEnabled && localPlayerId && pauseOwnerId && localPlayerId !== pauseOwnerId);
  game.uiRects.shopButton = shopRect;
  game.uiRects.skillTreeButton = skillRect;
  game.uiRects.pauseButton = pauseRect;
  drawHudButton(ctx, shopRect, "Shop", { active: game.shopOpen, activeFill: "rgba(113, 82, 44, 0.96)", goldAmount: game.gold || 0 });
  drawHudButton(ctx, skillRect, "Skill Tree", { active: game.skillTreeOpen, activeFill: "rgba(68, 104, 78, 0.96)", pulse });
  drawHudButton(ctx, pauseRect, game.paused ? "Resume" : "Pause", { active: game.paused, disabled: pauseDisabled, activeFill: "rgba(128, 80, 70, 0.96)" });
  contentY += PANEL_BUTTON_BLOCK_H;

  if (networkLines.length > 0 && !layout.isAndroid) {
    const netY = contentY + 2;
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
    contentY += PANEL_NETWORK_BLOCK_H;
  } else {
    game.networkStatsPanelRect = null;
  }

  drawEmbeddedGroupList(ctx, game, rect, contentY);
  return rect.y + rect.h + 6;
}
