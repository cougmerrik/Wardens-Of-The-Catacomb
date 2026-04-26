import {
  canSpendRangerNode,
  canSpendRangerUtility,
  formatLaneLabel,
  getRangerAvailableSkillPoints,
  getRangerGroupLimit,
  getRangerSelectedInGroup,
  getRangerSpentSkillPoints,
  getRangerTalentDefs,
  getRangerTalentPoints,
  getRangerTierLabel,
  getRangerTooltip,
  getRangerUtilityLevel,
  isRangerTierAccessible
} from "../../game/rangerTalentTree.js";
import { drawSkillRefundFooter } from "./skillTreeMenuSections.js";

function isPointInRect(x, y, rect) {
  return !!rect && x >= rect.x && y >= rect.y && x <= rect.x + rect.w && y <= rect.y + rect.h;
}

function drawRankPips(ctx, x, y, filled, total, color, locked) {
  const size = 10;
  const gap = 4;
  for (let i = 0; i < total; i++) {
    const px = x + i * (size + gap);
    ctx.fillStyle = i < filled ? color : locked ? "rgba(68, 74, 86, 0.92)" : "rgba(28, 34, 44, 0.96)";
    ctx.fillRect(px, y, size, size);
    ctx.strokeStyle = locked ? "rgba(110, 116, 128, 0.72)" : "rgba(220, 228, 238, 0.52)";
    ctx.strokeRect(px + 0.5, y + 0.5, size - 1, size - 1);
  }
}

function drawIcon(ctx, rect, icon, fill, locked) {
  ctx.fillStyle = locked ? "rgba(48, 52, 61, 0.96)" : fill;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = locked ? "rgba(119, 124, 134, 0.82)" : "rgba(242, 236, 224, 0.62)";
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  ctx.fillStyle = "#f4efe3";
  ctx.font = "bold 11px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(icon, rect.x + rect.w * 0.5, rect.y + rect.h * 0.62);
  ctx.textAlign = "left";
}

function drawTooltip(ctx, renderer, mouseX, mouseY, tooltip) {
  if (!tooltip) return;
  const lines = [tooltip.title, ...tooltip.lines];
  if (tooltip.requirement) lines.push(`Requirement: ${tooltip.requirement}`);
  ctx.save();
  ctx.font = "12px Trebuchet MS";
  let width = 0;
  for (const line of lines) width = Math.max(width, ctx.measureText(line).width);
  const lineH = 16;
  const padding = 10;
  const boxW = Math.min(360, width + padding * 2);
  const boxH = lines.length * lineH + padding * 2 - 4;
  const x = Math.max(10, Math.min(renderer.canvas.width - boxW - 10, mouseX + 16));
  const y = Math.max(26, Math.min(renderer.canvas.height - boxH - 10, mouseY - 10));
  ctx.fillStyle = "rgba(8, 11, 17, 0.97)";
  ctx.fillRect(x, y, boxW, boxH);
  ctx.strokeStyle = "rgba(154, 219, 194, 0.78)";
  ctx.strokeRect(x + 0.5, y + 0.5, boxW - 1, boxH - 1);
  lines.forEach((line, index) => {
    ctx.fillStyle = index === 0 ? "#f6f0df" : line.startsWith("Requirement:") ? "#ffcf9b" : "#d8e0ec";
    ctx.font = index === 0 ? "bold 13px Trebuchet MS" : "12px Trebuchet MS";
    ctx.fillText(line, x + padding, y + padding + 12 + index * lineH);
  });
  ctx.restore();
}

function getPinnedTooltip(game) {
  const pinned = game?.uiPinnedTooltip;
  if (!pinned || pinned.source !== "skillTree") return null;
  return getRangerTooltip(game, { key: pinned.key, kind: pinned.kind || "node" });
}

export function drawRangerSkillTreeMenu(renderer, game, layout, frame) {
  const ctx = renderer.ctx;
  const menuX = frame.menuX;
  const menuY = frame.menuY;
  const menuW = frame.menuW;
  const menuH = frame.menuH;
  const contentTop = menuY + 48;
  const contentBottom = menuY + menuH - 84;
  const visibleH = contentBottom - contentTop;
  const getTierHeight = (tier) => (tier === 5 ? 184 : 116);
  const contentHeight = [1, 2, 3, 4, 5, 6].reduce((sum, tier) => sum + getTierHeight(tier), 44);
  const scrollMax = Math.max(0, contentHeight - visibleH);
  const scroll = Math.max(0, Math.min(scrollMax, game.uiScroll?.skillTree || 0));
  game.uiScroll.skillTree = scroll;
  game.uiRects.skillTreeScrollArea = { x: menuX + 8, y: contentTop, w: menuW - 16, h: visibleH };
  game.uiRects.skillTreeScrollMax = scrollMax;
  game.uiRects.skillTreeNodes = [];
  const sy = (y) => y - scroll;

  ctx.fillStyle = "#f3efe3";
  ctx.font = "bold 20px Trebuchet MS";
  ctx.fillText("Ranger Open Progression", menuX + 16, menuY + 30);
  ctx.font = "13px Trebuchet MS";
  ctx.fillStyle = "#d2d9e8";
  ctx.textAlign = "right";
  ctx.fillText(`SP ${getRangerSpentSkillPoints(game)}/${getRangerSpentSkillPoints(game) + getRangerAvailableSkillPoints(game)}   Available ${getRangerAvailableSkillPoints(game)}`, menuX + menuW - 46, menuY + 30);
  ctx.textAlign = "left";

  ctx.save();
  ctx.beginPath();
  ctx.rect(menuX + 8, contentTop, menuW - 16, visibleH);
  ctx.clip();

  const defs = getRangerTalentDefs();
  const mouseX = game.input?.mouse?.screenX;
  const mouseY = game.input?.mouse?.screenY;
  let hovered = null;

  let tierCursorY = menuY + 62;
  for (let tier = 1; tier <= 6; tier++) {
    const tierH = getTierHeight(tier);
    const tierY = sy(tierCursorY);
    const tierDefs = defs.filter((def) => def.tier === tier);
    const tierRect = { x: menuX + 18, y: tierY, w: menuW - 36, h: tierH - 10 };
    const accessible = isRangerTierAccessible(game, tier);
    const group = tierDefs[0]?.group || "";
    const selectedCount = getRangerSelectedInGroup(game, group).length;
    const groupLimit = getRangerGroupLimit(group);
    ctx.fillStyle = accessible ? "rgba(15, 28, 27, 0.94)" : "rgba(22, 24, 26, 0.86)";
    ctx.fillRect(tierRect.x, tierRect.y, tierRect.w, tierRect.h);
    ctx.strokeStyle = accessible ? "rgba(116, 190, 164, 0.55)" : "rgba(88, 92, 104, 0.52)";
    ctx.strokeRect(tierRect.x, tierRect.y, tierRect.w, tierRect.h);
    ctx.fillStyle = accessible ? "#e7fff6" : "#9198a4";
    ctx.font = "bold 14px Trebuchet MS";
    ctx.fillText(`Tier ${tier}  ${getRangerTierLabel(tier)}  (${selectedCount}/${groupLimit})`, tierRect.x + 12, tierRect.y + 20);
    ctx.font = "12px Trebuchet MS";
    ctx.fillStyle = accessible ? "#b9dacc" : "#bda885";
    if (!accessible) {
      const lockedEntry = tierDefs[0];
      const lockedTip = lockedEntry ? getRangerTooltip(game, { key: lockedEntry.key, kind: "node", locked: true }) : null;
      ctx.fillText(lockedTip?.requirement || "Locked.", tierRect.x + 12, tierRect.y + 38);
    } else {
      ctx.fillText(formatLaneLabel(group), tierRect.x + 12, tierRect.y + 38);
    }

    const cols = tier === 5 ? 4 : Math.min(5, tierDefs.length);
    const cardW = Math.max(86, Math.min(tier === 5 ? 136 : 112, (tierRect.w - 34) / cols - 8));
    const cardH = tier === 5 ? 54 : 48;
    tierDefs.forEach((def, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const rect = { x: tierRect.x + 14 + col * (cardW + 8), y: tierRect.y + 48 + row * (cardH + 6), w: cardW, h: cardH };
      const points = getRangerTalentPoints(game, def.key);
      const locked = !canSpendRangerNode(game, def.key) && points <= 0;
      drawIcon(ctx, { x: rect.x + 4, y: rect.y + 6, w: 28, h: 28 }, def.icon, def.color, locked || !accessible);
      ctx.fillStyle = locked || !accessible ? "#9ea4af" : "#f2efe7";
      ctx.font = "bold 11px Trebuchet MS";
      ctx.fillText(def.label, rect.x + 38, rect.y + 16);
      drawRankPips(ctx, rect.x + 38, rect.y + 29, points, def.maxRanks, def.color, locked || !accessible);
      game.uiRects.skillTreeNodes.push({ key: def.key, kind: "node", rect });
      if (Number.isFinite(mouseX) && Number.isFinite(mouseY) && isPointInRect(mouseX, mouseY, rect)) {
        hovered = getRangerTooltip(game, { key: def.key, kind: "node", locked: locked || !accessible });
      }
    });
    tierCursorY += tierH;
  }

  ctx.restore();
  drawSkillRefundFooter(ctx, game, menuX, menuY, menuW, menuH);
  if (hovered && Number.isFinite(mouseX) && Number.isFinite(mouseY)) {
    drawTooltip(ctx, renderer, mouseX, mouseY, hovered);
    return;
  }
  if (layout.isAndroid) {
    const pinned = getPinnedTooltip(game);
    if (pinned) drawTooltip(ctx, renderer, menuX + menuW - 280, menuY + 82, pinned);
  }
}
