import { getAndroidConsumablesStartX } from "./androidLayout.js";

const TIMED_BUFF_ICON_DEFS = [
  { key: "bloodwine", label: "BW", color: "rgba(181, 88, 88, 0.9)", getRatio: (effects) => (effects.bloodwine?.timer || 0) / 8 },
  { key: "potionOfSkill", label: "PS", color: "rgba(149, 124, 230, 0.9)", getRatio: (effects) => (effects.potionOfSkill?.timer || 0) / 10 },
  { key: "stonebloodBeads", label: "SB", color: "rgba(191, 188, 173, 0.9)", getRatio: (effects) => (effects.stonebloodBeads?.timer || 0) / 12 },
  { key: "guardianBell", label: "GB", color: "rgba(246, 228, 154, 0.9)", getRatio: (effects) => (effects.guardianBell?.timer || 0) / 6 },
  { key: "frostWard", label: "FW", color: "rgba(184, 231, 255, 0.9)", getRatio: (effects) => (effects.frostWard?.ready || 0) > 0 ? 1 : 0 },
  { key: "regenerationPotion", label: "PO", color: "rgba(130, 197, 141, 0.9)", getRatio: (effects) => (effects.regenerationPotion?.timer || 0) / Math.max(0.001, effects.regenerationPotion?.total || 5) },
  { key: "speedPotion", label: "PO", color: "rgba(121, 181, 255, 0.9)", getRatio: (effects) => (effects.speedPotion?.timer || 0) / 10 },
  { key: "frostOil", label: "OI", color: "rgba(145, 214, 255, 0.9)", getRatio: (effects) => (effects.frostOil?.timer || 0) / 10 },
  { key: "fireOil", label: "OI", color: "rgba(255, 154, 102, 0.9)", getRatio: (effects) => (effects.fireOil?.timer || 0) / 10 },
  { key: "spikeGrowth", label: "TH", color: "rgba(179, 219, 120, 0.9)", getRatio: (effects) => (effects.spikeGrowth?.timer || 0) / 10 }
];

function drawConsumableSlot(ctx, slotX, slotY, slotSize, fillStyle, label, count, cooldownRatio = 0, keyLabel = "") {
  ctx.fillStyle = "rgba(8, 12, 18, 0.94)";
  ctx.fillRect(slotX, slotY, slotSize, slotSize);
  ctx.strokeStyle = "rgba(198, 212, 246, 0.35)";
  ctx.strokeRect(slotX + 0.5, slotY + 0.5, slotSize - 1, slotSize - 1);
  if (label) {
    ctx.fillStyle = fillStyle;
    ctx.fillRect(slotX + 3, slotY + 3, slotSize - 6, slotSize - 6);
    if (cooldownRatio > 0) {
      ctx.fillStyle = "rgba(6, 8, 12, 0.66)";
      ctx.fillRect(slotX + 2, slotY + 2, slotSize - 4, (slotSize - 4) * cooldownRatio);
    }
    ctx.fillStyle = "#eef3ff";
    ctx.font = "bold 10px Trebuchet MS";
    ctx.fillText(label, slotX + 8, slotY + 19);
    ctx.font = "bold 11px Trebuchet MS";
    ctx.fillText(`${count || 0}`, slotX + 24, slotY + 28);
  }
  if (!keyLabel) return;
  ctx.fillStyle = "#d7e4ff";
  ctx.font = "10px Trebuchet MS";
  ctx.fillText(keyLabel, slotX + 3, slotY + 10);
}

function drawTimedBuffIcon(ctx, iconX, iconY, iconSize, fillStyle, label, ratio = 0) {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const centerX = iconX + iconSize * 0.5;
  const centerY = iconY + iconSize * 0.5;
  const radius = iconSize * 0.5 - 2;
  ctx.fillStyle = "rgba(8, 12, 18, 0.94)";
  ctx.fillRect(iconX, iconY, iconSize, iconSize);
  ctx.strokeStyle = "rgba(198, 212, 246, 0.35)";
  ctx.strokeRect(iconX + 0.5, iconY + 0.5, iconSize - 1, iconSize - 1);
  ctx.fillStyle = fillStyle;
  ctx.fillRect(iconX + 3, iconY + 3, iconSize - 6, iconSize - 6);
  ctx.fillStyle = "#eef3ff";
  ctx.font = "bold 10px Trebuchet MS";
  ctx.fillText(label, iconX + 8, iconY + 19);

  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(23, 30, 45, 0.92)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, -Math.PI / 2, Math.PI * 1.5);
  ctx.stroke();

  if (clampedRatio <= 0) return;
  ctx.strokeStyle = "#f3efe3";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clampedRatio);
  ctx.stroke();
}

function getTimedBuffIcons(game) {
  const effects = game.consumables?.effects || {};
  return TIMED_BUFF_ICON_DEFS
    .map((def) => {
      const ratio = def.getRatio(effects);
      if (!Number.isFinite(ratio) || ratio <= 0) return null;
      return { ...def, ratio: Math.max(0, Math.min(1, ratio)) };
    })
    .filter(Boolean);
}

export function drawConsumablesBar(renderer, game, layout, xpBarY) {
  const ctx = renderer.ctx;
  const activeSlots = Array.isArray(game.consumables?.activeSlots) ? game.consumables.activeSlots : [];
  const passiveSlots = Array.isArray(game.consumables?.passiveSlots) ? game.consumables.passiveSlots : [];
  const timedBuffIcons = getTimedBuffIcons(game);
  game.uiRects.consumableSlots = [];
  const slotSize = 34;
  const slotGap = 6;
  const barBaseY = xpBarY - slotSize - 8;
  const activeWidth = 5 * slotSize + 4 * slotGap;
  const passiveWidth = passiveSlots.length > 0 ? passiveSlots.length * slotSize + Math.max(0, passiveSlots.length - 1) * slotGap : 0;
  const totalWidth = activeWidth + (passiveWidth > 0 ? 12 + passiveWidth : 0);
  const activeStartX = layout.isAndroid ? getAndroidConsumablesStartX(layout, totalWidth) : 10;

  if (timedBuffIcons.length > 0) {
    const buffSize = 26;
    const buffGap = 6;
    const buffY = barBaseY - buffSize - 8;
    const buffWidth = timedBuffIcons.length * buffSize + Math.max(0, timedBuffIcons.length - 1) * buffGap;
    const buffStartX = activeStartX + Math.max(0, Math.floor((activeWidth - buffWidth) * 0.5));
    for (let i = 0; i < timedBuffIcons.length; i++) {
      const buff = timedBuffIcons[i];
      drawTimedBuffIcon(
        ctx,
        buffStartX + i * (buffSize + buffGap),
        buffY,
        buffSize,
        buff.color,
        buff.label,
        buff.ratio
      );
    }
  }

  for (let i = 0; i < 5; i++) {
    const slotX = activeStartX + i * (slotSize + slotGap);
    game.uiRects.consumableSlots.push({ index: i, rect: { x: slotX, y: barBaseY, w: slotSize, h: slotSize } });
    const slot = activeSlots[i] || null;
    const cooldownRatio = (game.consumables?.sharedCooldown || 0) > 0
      ? Math.max(0, Math.min(1, (game.consumables.sharedCooldown || 0) / 2))
      : 0;
    drawConsumableSlot(
      ctx,
      slotX,
      barBaseY,
      slotSize,
      "rgba(126, 168, 255, 0.16)",
      slot ? (slot.key || "").slice(0, 2).toUpperCase() : "",
      slot?.count || 0,
      cooldownRatio,
      `${i + 1}`
    );
  }

  const passiveStartX = activeStartX + activeWidth + 12;
  for (let i = 0; i < passiveSlots.length; i++) {
    const slot = passiveSlots[i];
    const slotX = passiveStartX + i * (slotSize + slotGap);
    drawConsumableSlot(
      ctx,
      slotX,
      barBaseY,
      slotSize,
      "rgba(210, 168, 255, 0.16)",
      (slot.key || "").slice(0, 2).toUpperCase(),
      slot.count || 0,
      Math.max(0, Math.min(1, (slot.cooldownRemaining || 0) / 5))
    );
  }
}
