import { drawScoutSkillIcon } from "./scoutSkillIcons.js";

export function drawAbilityCenterIcon(ctx, state, cx, cy, size) {
  const icon = state?.icon;
  const iconSize = Math.max(20, Math.floor(size * 0.58));
  const iconX = Math.floor(cx - iconSize * 0.5);
  const iconY = Math.floor(cy - iconSize * 0.5);
  if (icon?.kind === "scoutSkill" && drawScoutSkillIcon(ctx, icon.key, iconX, iconY, iconSize, 1, false)) return;

  const color = icon?.color || state?.color || "#d8e0ec";
  const label = typeof icon?.label === "string" && icon.label ? icon.label : "?";
  ctx.save();
  ctx.fillStyle = "rgba(16, 20, 28, 0.95)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.fillRect(iconX, iconY, iconSize, iconSize);
  ctx.strokeRect(iconX + 0.5, iconY + 0.5, iconSize - 1, iconSize - 1);
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.max(9, Math.floor(iconSize * 0.34))}px Trebuchet MS`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, cy + 0.5);
  ctx.restore();
}

export function drawAbilityCooldownBadge(ctx, state, cx, y, size) {
  if ((state?.cooldownRemaining || 0) <= 0) return;
  const text = `${Math.ceil(state.cooldownRemaining)}`;
  ctx.font = "bold 11px Trebuchet MS";
  const textW = Math.max(16, Math.ceil(ctx.measureText(text).width) + 8);
  const pillH = 14;
  const pillX = Math.floor(cx - textW * 0.5);
  const pillY = Math.floor(y + size - pillH - 4);
  ctx.fillStyle = "rgba(5, 8, 12, 0.86)";
  ctx.fillRect(pillX, pillY, textW, pillH);
  ctx.strokeStyle = "rgba(242, 239, 227, 0.32)";
  ctx.strokeRect(pillX + 0.5, pillY + 0.5, textW - 1, pillH - 1);
  ctx.fillStyle = "#f2efe3";
  ctx.fillText(text, cx, pillY + 10);
}
