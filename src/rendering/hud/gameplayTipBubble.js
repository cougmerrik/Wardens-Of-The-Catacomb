function wrapText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (!current || ctx.measureText(next).width <= maxWidth) current = next;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function drawGameplayTipBubble(renderer, game, layout) {
  const tips = game?.gameplayTips;
  if (!tips || tips.enabled === false || !tips.text || (tips.timer || 0) <= 0) return;
  const ctx = renderer.ctx;
  const alpha = Math.max(0, Math.min(1, Math.min(1, tips.timer || 0)));
  if (alpha <= 0) return;
  const margin = layout?.isAndroid ? 12 : 14;
  const maxW = Math.min(layout?.playW ? layout.playW - margin * 2 : renderer.canvas.width - margin * 2, layout?.isAndroid ? 330 : 420);
  const padX = 12;
  const padY = 10;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = "13px Trebuchet MS";
  const lines = wrapText(ctx, tips.text, maxW - padX * 2);
  const lineH = 16;
  const textW = lines.reduce((best, line) => Math.max(best, ctx.measureText(line).width), 0);
  const w = Math.ceil(Math.min(maxW, Math.max(168, textW + padX * 2)));
  const h = padY * 2 + lines.length * lineH;
  const x = margin;
  const y = margin;
  ctx.fillStyle = "rgba(8, 12, 20, 0.92)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(231, 218, 157, 0.82)";
  ctx.lineWidth = 1.4;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = "#f4edd2";
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], x + padX, y + padY + 12 + i * lineH);
  }
  ctx.restore();
}
