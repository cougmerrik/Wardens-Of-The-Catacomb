export function drawSkillTreeTitle(ctx, menuX, menuY) {
  ctx.fillStyle = "#f3efe3";
  ctx.font = "bold 20px Trebuchet MS";
  ctx.fillText("Skills", menuX + 16, menuY + 30);
}

export function getSkillTierHeader(tier, label, selectedCount, limit) {
  const safeTier = Number.isFinite(tier) ? Math.max(1, Math.floor(tier)) : 1;
  const safeLabel = typeof label === "string" && label.trim() ? label.trim() : `Tier ${safeTier}`;
  const safeSelected = Number.isFinite(selectedCount) ? Math.max(0, Math.floor(selectedCount)) : 0;
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  return `Tier ${safeTier}  ${safeLabel}  (${safeSelected}/${safeLimit})`;
}

export function drawSkillRefundFooter(ctx, game, menuX, menuY, menuW, menuH) {
  const spentPoints = typeof game.getSpentSkillPointCount === "function" ? game.getSpentSkillPointCount() : 0;
  const refundCost = typeof game.getSkillRefundCost === "function" ? game.getSkillRefundCost(spentPoints, game.refundCount) : 0;
  const canRefund = typeof game.canRefundSkills === "function" ? game.canRefundSkills() : false;
  const noSpentPoints = spentPoints <= 0;
  const refundRect = { x: menuX + menuW - 158, y: menuY + menuH - 44, w: 136, h: 30 };
  game.uiRects.skillRefundButton = refundRect;

  ctx.fillStyle = "rgba(19, 18, 28, 0.98)";
  ctx.fillRect(menuX + 8, menuY + menuH - 56, menuW - 16, 44);
  ctx.strokeStyle = "rgba(111, 106, 138, 0.55)";
  ctx.strokeRect(menuX + 8, menuY + menuH - 56, menuW - 16, 44);

  ctx.font = "12px Trebuchet MS";
  ctx.fillStyle = "#d9d2e7";
  ctx.fillText(`Spent: ${spentPoints}`, menuX + 18, menuY + menuH - 31);
  ctx.fillText(`Refunds: ${Math.max(0, Math.floor(game.refundCount || 0))}`, menuX + 88, menuY + menuH - 31);
  if (noSpentPoints) {
    ctx.fillStyle = "#9f95b3";
    ctx.fillText("No spent points to refund.", menuX + 18, menuY + menuH - 16);
  } else if (canRefund) {
    ctx.fillStyle = "#99ddb2";
    ctx.fillText(`Refund all skills for ${refundCost}g.`, menuX + 18, menuY + menuH - 16);
  } else {
    ctx.fillStyle = "#d8b17c";
    ctx.fillText(`Need ${Math.max(0, refundCost - game.gold)}g more for refund (${refundCost}g).`, menuX + 18, menuY + menuH - 16);
  }

  ctx.fillStyle = noSpentPoints ? "rgba(80, 76, 90, 0.95)" : canRefund ? "rgba(150, 118, 74, 0.98)" : "rgba(99, 85, 66, 0.95)";
  ctx.fillRect(refundRect.x, refundRect.y, refundRect.w, refundRect.h);
  ctx.strokeStyle = "rgba(232, 226, 211, 0.58)";
  ctx.strokeRect(refundRect.x, refundRect.y, refundRect.w, refundRect.h);
  ctx.fillStyle = "#f3efe3";
  ctx.font = "bold 13px Trebuchet MS";
  ctx.fillText(noSpentPoints ? "No Refund" : `${refundCost}g Refund`, refundRect.x + 20, refundRect.y + 20);
}

export function drawSkillTreeScrollbar(ctx, menuX, menuW, contentTop, visibleH, contentHeight, scroll, scrollMax) {
  if (scrollMax <= 0) return;
  const trackX = menuX + menuW - 10;
  const trackY = contentTop;
  const trackH = visibleH;
  const thumbH = Math.max(30, Math.floor((visibleH / contentHeight) * trackH));
  const thumbY = trackY + Math.floor((scroll / scrollMax) * (trackH - thumbH));
  ctx.fillStyle = "rgba(68, 76, 97, 0.7)";
  ctx.fillRect(trackX, trackY, 4, trackH);
  ctx.fillStyle = "rgba(180, 194, 228, 0.85)";
  ctx.fillRect(trackX, thumbY, 4, thumbH);
}
