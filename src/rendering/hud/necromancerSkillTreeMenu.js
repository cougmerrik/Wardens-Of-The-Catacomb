import {
  canSpendNecromancerNode,
  getMageGroupLimit,
  getMageSelectedInGroup,
  getMageTierLabel,
  getNecromancerAvailableSkillPoints,
  getNecromancerSpentSkillPoints,
  getNecromancerTalentDefs,
  getNecromancerTalentPoints,
  getNecromancerTooltip,
  isNecromancerRowAccessible
} from "../../game/necromancerTalentTree.js";
import { drawSkillRefundFooter, drawSkillTreeTitle, getSkillTierHeader } from "./skillTreeMenuSections.js";

function isPointInRect(x, y, rect) {
  return !!rect && x >= rect.x && y >= rect.y && x <= rect.x + rect.w && y <= rect.y + rect.h;
}

function drawIcon(ctx, rect, icon, fill, locked) {
  ctx.fillStyle = locked ? "rgba(48, 52, 61, 0.96)" : fill;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = locked ? "rgba(119, 124, 134, 0.82)" : "rgba(242, 236, 224, 0.62)";
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  ctx.fillStyle = "#120d16";
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
  const boxW = width + padding * 2;
  const boxH = lines.length * lineH + padding * 2 - 4;
  const x = Math.max(10, Math.min(renderer.canvas.width - boxW - 10, mouseX + 16));
  const y = Math.max(26, Math.min(renderer.canvas.height - boxH - 10, mouseY - 10));
  ctx.fillStyle = "rgba(8, 11, 17, 0.97)";
  ctx.fillRect(x, y, boxW, boxH);
  ctx.strokeStyle = "rgba(186, 144, 255, 0.78)";
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
  return getNecromancerTooltip(game, { key: pinned.key, kind: pinned.kind || "node" });
}

export function drawNecromancerSkillTreeMenu(renderer, game, layout, frame) {
  const ctx = renderer.ctx;
  const { menuX, menuY, menuW, menuH } = frame;
  const contentTop = menuY + 48;
  const contentBottom = menuY + menuH - 84;
  const visibleH = contentBottom - contentTop;
  const rowH = 100;
  const contentHeight = 6 * rowH + 28;
  const scrollMax = Math.max(0, contentHeight - visibleH);
  const scroll = Math.max(0, Math.min(scrollMax, game.uiScroll?.skillTree || 0));
  game.uiScroll.skillTree = scroll;
  game.uiRects.skillTreeScrollArea = { x: menuX + 8, y: contentTop, w: menuW - 16, h: visibleH };
  game.uiRects.skillTreeScrollMax = scrollMax;
  game.uiRects.skillTreeNodes = [];
  const sy = (y) => y - scroll;

  drawSkillTreeTitle(ctx, menuX, menuY);
  ctx.font = "13px Trebuchet MS";
  ctx.fillStyle = "#d2d9e8";
  ctx.textAlign = "right";
  ctx.fillText(
    `SP ${getNecromancerSpentSkillPoints(game)}/${getNecromancerSpentSkillPoints(game) + getNecromancerAvailableSkillPoints(game)}   Available ${getNecromancerAvailableSkillPoints(game)}`,
    menuX + menuW - 46,
    menuY + 30
  );
  ctx.textAlign = "left";

  ctx.save();
  ctx.beginPath();
  ctx.rect(menuX + 8, contentTop, menuW - 16, visibleH);
  ctx.clip();

  const defs = getNecromancerTalentDefs();
  let hovered = null;
  const mouseX = game.input?.mouse?.screenX;
  const mouseY = game.input?.mouse?.screenY;

  for (let tier = 1; tier <= 6; tier++) {
    const rowY = sy(menuY + 62 + (tier - 1) * rowH);
    const rowRect = { x: menuX + 18, y: rowY, w: menuW - 36, h: rowH - 10 };
    const accessible = isNecromancerRowAccessible(game, tier - 1);
    ctx.fillStyle = accessible ? "rgba(18, 16, 28, 0.94)" : "rgba(20, 20, 26, 0.86)";
    ctx.fillRect(rowRect.x, rowRect.y, rowRect.w, rowRect.h);
    ctx.strokeStyle = accessible ? "rgba(160, 132, 216, 0.55)" : "rgba(88, 92, 104, 0.52)";
    ctx.strokeRect(rowRect.x, rowRect.y, rowRect.w, rowRect.h);
    ctx.fillStyle = accessible ? "#f1ecff" : "#9198a4";
    ctx.font = "bold 14px Trebuchet MS";
    const nodes = defs.filter((def) => def.tier === tier);
    const group = nodes[0]?.group || "";
    const selectedCount = getMageSelectedInGroup(game, group).length;
    const groupLimit = getMageGroupLimit(group);
    ctx.fillText(getSkillTierHeader(tier, getMageTierLabel(tier), selectedCount, groupLimit), rowRect.x + 12, rowRect.y + 20);

    const columns = tier === 5 ? 4 : Math.min(4, nodes.length);
    const nodeW = Math.floor((rowRect.w - 28 - (columns - 1) * 8) / columns);
    nodes.forEach((def, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const rect = { x: rowRect.x + 14 + col * (nodeW + 8), y: rowRect.y + 30 + row * 28, w: nodeW, h: 26 };
      const points = getNecromancerTalentPoints(game, def.key);
      const locked = !canSpendNecromancerNode(game, def.key) && points <= 0;
      drawIcon(ctx, { x: rect.x + 3, y: rect.y + 3, w: 20, h: 20 }, def.icon, def.color, locked || !accessible);
      ctx.fillStyle = locked || !accessible ? "#9ea4af" : points > 0 ? "#fff0bd" : "#f2efe7";
      ctx.font = "bold 11px Trebuchet MS";
      ctx.fillText(def.label, rect.x + 28, rect.y + 16);
      if (points > 0) {
        ctx.fillStyle = def.color;
        ctx.fillRect(rect.x + rect.w - 11, rect.y + 8, 7, 7);
      }
      game.uiRects.skillTreeNodes.push({ key: def.key, kind: "node", rect });
      if (Number.isFinite(mouseX) && Number.isFinite(mouseY) && isPointInRect(mouseX, mouseY, rect)) {
        hovered = getNecromancerTooltip(game, { key: def.key, kind: "node", locked: locked || !accessible });
      }
    });
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
