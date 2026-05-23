export function drawHolyCandleVisual(ctx, game, x, y) {
  const pulse = 0.75 + Math.sin((game.time || 0) * 8) * 0.25;
  ctx.save();
  ctx.shadowColor = "#fff1a8";
  ctx.shadowBlur = 10 + pulse * 8;
  ctx.fillStyle = "rgba(255, 225, 126, 0.18)";
  ctx.beginPath();
  ctx.arc(x, y + 2, 14 + pulse * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff2c9";
  ctx.fillRect(x - 4, y - 12, 8, 18);
  ctx.fillStyle = "#d7a15b";
  ctx.fillRect(x - 5, y + 4, 10, 4);
  ctx.fillStyle = "#ffd45f";
  ctx.beginPath();
  ctx.moveTo(x, y - 22);
  ctx.lineTo(x + 5, y - 13);
  ctx.lineTo(x, y - 8);
  ctx.lineTo(x - 5, y - 13);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
