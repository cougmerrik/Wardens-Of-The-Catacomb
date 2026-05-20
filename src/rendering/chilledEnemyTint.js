export function drawChilledEnemyTint(ctx, enemy, x, y, width, height, time = 0) {
  const pulse = 0.82 + Math.sin(time * 10 + (enemy?.x || 0) * 0.03) * 0.12;
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = `rgba(88, 211, 255, ${0.34 * pulse})`;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}
