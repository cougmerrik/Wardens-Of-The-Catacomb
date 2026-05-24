import { drawConsumableItemIcon } from "./hud/consumableItemIcons.js";

export function drawHolyCandleVisual(ctx, game, light, x, y) {
  const pulse = 0.75 + Math.sin((game.time || 0) * 8) * 0.25;
  const radius = Number.isFinite(light?.lightRadius)
    ? light.lightRadius
    : (Number.isFinite(game?.config?.map?.tile) ? game.config.map.tile : 32) * 3;
  const lifeRatio = Number.isFinite(light?.life) ? Math.max(0.25, Math.min(1, light.life / 10)) : 1;
  ctx.save();
  ctx.shadowColor = "#fff1a8";
  ctx.shadowBlur = 14 + pulse * 8;
  const aura = ctx.createRadialGradient(x, y, Math.max(6, radius * 0.1), x, y, radius);
  aura.addColorStop(0, `rgba(255, 237, 168, ${0.16 * lifeRatio})`);
  aura.addColorStop(0.72, `rgba(255, 205, 106, ${0.07 * lifeRatio})`);
  aura.addColorStop(1, "rgba(255, 205, 106, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(255, 226, 137, ${0.46 + pulse * 0.16})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.setLineDash([]);
  ctx.fillStyle = `rgba(255, 225, 126, ${0.16 + pulse * 0.05})`;
  ctx.beginPath();
  ctx.arc(x, y + 2, 17 + pulse * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "#fff1a8";
  ctx.shadowBlur = 8 + pulse * 4;
  if (!drawConsumableItemIcon(ctx, "holyCandle", x - 16, y - 18, 32, 0)) {
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
  }
  ctx.restore();
}
