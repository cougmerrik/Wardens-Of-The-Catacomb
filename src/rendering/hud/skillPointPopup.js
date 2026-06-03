import {
  SKILL_POINT_POPUP_DURATION,
  SKILL_POINT_POPUP_FADE_SECONDS,
  getSkillPointPopupTier,
  updateSkillPointPopup
} from "../../game/skillPointPopup.js";
import { getNecromancerTooltip } from "../../game/necromancerTalentTree.js";
import { getRangerTooltip } from "../../game/rangerTalentTree.js";
import { getWarriorTooltip } from "../../game/warriorTalentTree.js";
import { drawMageSkillIcon } from "./mageSkillIcons.js";
import { drawScoutSkillIcon } from "./scoutSkillIcons.js";
import { drawSkillTooltip } from "./skillTooltip.js";
import { drawWarriorSkillIcon } from "./warriorSkillIcons.js";

function drawSkillIcon(ctx, game, def, rect, muted = false, padding = 1) {
  if (game?.isArcherClass?.() && drawScoutSkillIcon(ctx, def.key, rect.x, rect.y, rect.w, padding, muted)) return;
  if (game?.isNecromancerClass?.() && drawMageSkillIcon(ctx, def.key, rect.x, rect.y, rect.w, padding, muted)) return;
  if (game?.isWarriorClass?.() && drawWarriorSkillIcon(ctx, def.key, rect.x, rect.y, rect.w, padding, muted)) return;
  ctx.fillStyle = def.color || "#93c7ff";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = "#081019";
  ctx.font = "bold 12px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(def.icon || "SK", rect.x + rect.w / 2, rect.y + rect.h / 2 + 4);
  ctx.textAlign = "left";
}

function isPointInRect(x, y, rect) {
  return !!rect && x >= rect.x && y >= rect.y && x <= rect.x + rect.w && y <= rect.y + rect.h;
}

function getPopupSkillTooltip(game, def) {
  if (game?.isArcherClass?.()) return getRangerTooltip(game, { key: def.key, kind: "node" });
  if (game?.isNecromancerClass?.()) return getNecromancerTooltip(game, { key: def.key, kind: "node" });
  if (game?.isWarriorClass?.()) return getWarriorTooltip(game, { key: def.key, kind: "node" });
  return null;
}

export function drawSkillPointPopup(renderer, game, layout, lanternBounds = null) {
  const active = updateSkillPointPopup(game);
  const tierInfo = active ? getSkillPointPopupTier(game) : null;
  game.uiRects.skillPointPopupNodes = [];
  if (!active || !tierInfo || tierInfo.defs.length <= 0 || game.skillTreeOpen || game.shopOpen || game.optionsOpen || game.gameOver) return;

  const ctx = renderer.ctx;
  const elapsed = Math.max(0, (Number.isFinite(game.time) ? game.time : 0) - active.startedAt);
  const remaining = Math.max(0, SKILL_POINT_POPUP_DURATION - elapsed);
  const alpha = Math.min(1, remaining / SKILL_POINT_POPUP_FADE_SECONDS);
  if (alpha <= 0) return;

  const defs = tierInfo.defs.slice(0, 8);
  const playW = layout.playW || renderer.canvas.width;
  const cardSize = layout.isAndroid ? 46 : 54;
  const gap = 6;
  const columns = Math.min(defs.length, Math.max(1, Math.floor((Math.min(720, playW - 24) + gap) / (cardSize + gap))));
  const rows = Math.max(1, Math.ceil(defs.length / columns));
  const panelW = Math.min(playW - 24, columns * cardSize + Math.max(0, columns - 1) * gap + 20);
  const panelH = 34 + rows * cardSize + Math.max(0, rows - 1) * gap;
  const x = Math.floor((playW - panelW) / 2);
  const anchorY = Number.isFinite(lanternBounds?.y) ? lanternBounds.y : renderer.canvas.height - (layout.xpBarH || 28) - 50;
  const y = Math.max(46, Math.floor(anchorY - panelH - 8));

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(8, 13, 20, 0.96)";
  ctx.fillRect(x, y, panelW, panelH);
  ctx.strokeStyle = "rgba(151, 202, 255, 0.72)";
  ctx.strokeRect(x + 0.5, y + 0.5, panelW - 1, panelH - 1);
  ctx.fillStyle = "#edf5ff";
  ctx.font = "bold 12px Trebuchet MS";
  ctx.fillText(`Choose Skill - Tier ${tierInfo.tier} ${tierInfo.label}`, x + 10, y + 18);
  ctx.font = "10px Trebuchet MS";
  ctx.fillStyle = "#9fb6d8";
  ctx.textAlign = "right";
  ctx.fillText(`${Math.ceil(remaining)}s`, x + panelW - 10, y + 18);
  ctx.textAlign = "left";

  const mouseX = game.input?.mouse?.screenX;
  const mouseY = game.input?.mouse?.screenY;
  let hovered = null;
  const startX = x + Math.floor((panelW - (columns * cardSize + Math.max(0, columns - 1) * gap)) / 2);
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    const col = i % columns;
    const row = Math.floor(i / columns);
    const rect = { x: startX + col * (cardSize + gap), y: y + 26 + row * (cardSize + gap), w: cardSize, h: cardSize };
    ctx.fillStyle = "#000000";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = "rgba(136, 172, 216, 0.56)";
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
    const iconRect = { x: rect.x + 1, y: rect.y + 1, w: rect.w - 2, h: rect.h - 2 };
    const previousSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    drawSkillIcon(ctx, game, def, iconRect, false, 0);
    ctx.imageSmoothingEnabled = previousSmoothing;
    game.uiRects.skillPointPopupNodes.push({ key: def.key, kind: "skillPointPopup", rect });
    if (Number.isFinite(mouseX) && Number.isFinite(mouseY) && isPointInRect(mouseX, mouseY, rect)) hovered = getPopupSkillTooltip(game, def);
  }
  ctx.restore();
  if (hovered && Number.isFinite(mouseX) && Number.isFinite(mouseY)) drawSkillTooltip(ctx, renderer, mouseX, mouseY, hovered);
}
