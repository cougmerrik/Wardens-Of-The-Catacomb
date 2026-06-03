export function drawFlameOfTheFallenVisual(ctx, game, flame, x, y) {
  if (!ctx || !flame) return;
  const radius = Math.max(0, Number.isFinite(flame.radius) ? flame.radius : 0);
  const progress = Math.max(0, Math.min(1, (Number.isFinite(flame.souls) ? flame.souls : 0) / Math.max(1, Number.isFinite(flame.requiredSouls) ? flame.requiredSouls : 1)));
  const timerProgress = Math.max(0, Math.min(1, (Number.isFinite(flame.timer) ? flame.timer : 0) / Math.max(1, Number.isFinite(flame.maxTimer) ? flame.maxTimer : 20)));
  const pulse = Math.max(0, Math.min(1, Number.isFinite(flame.pulseTimer) ? flame.pulseTimer / 0.45 : 0));
  const time = Number.isFinite(game?.time) ? game.time : 0;

  ctx.save();
  if (radius > 0) {
    const aura = ctx.createRadialGradient(x, y, Math.max(12, radius * 0.08), x, y, radius);
    aura.addColorStop(0, `rgba(255, 131, 34, ${0.14 + progress * 0.08 + pulse * 0.06})`);
    aura.addColorStop(0.66, `rgba(198, 62, 24, ${0.08 + progress * 0.05})`);
    aura.addColorStop(1, "rgba(255, 106, 36, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = `rgba(255, 178, 75, ${0.35 + progress * 0.28})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.translate(x, y);
  ctx.rotate(time * 0.9);
  ctx.strokeStyle = `rgba(255, 118, 38, ${0.45 + progress * 0.28})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 26 + pulse * 4, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 13, Math.sin(a) * 13);
    ctx.lineTo(Math.cos(a) * 30, Math.sin(a) * 30);
    ctx.stroke();
  }
  ctx.rotate(-time * 0.9);

  ctx.fillStyle = "rgba(40, 26, 21, 0.95)";
  ctx.fillRect(-13, 2, 26, 12);
  ctx.fillStyle = "#1b1412";
  ctx.fillRect(-16, 11, 32, 5);
  const flameGradient = ctx.createLinearGradient(0, -32, 0, 8);
  flameGradient.addColorStop(0, "#fff2a8");
  flameGradient.addColorStop(0.38, "#ffb139");
  flameGradient.addColorStop(1, "#b02d18");
  ctx.fillStyle = flameGradient;
  const flameHeight = 34 + progress * 18 + Math.sin(time * 12) * 2 + pulse * 8;
  ctx.beginPath();
  ctx.moveTo(0, -flameHeight);
  ctx.bezierCurveTo(18, -18, 8, 2, 0, 7);
  ctx.bezierCurveTo(-14, -2, -16, -19, 0, -flameHeight);
  ctx.fill();

  ctx.rotate(-time * 1.7);
  ctx.strokeStyle = `rgba(255, 224, 135, ${0.18 + progress * 0.3})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -10, 43, -Math.PI * 0.3, Math.PI * 0.82);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  const barW = 76;
  const barH = 7;
  const barX = x - barW / 2;
  const barY = y - 62;
  ctx.fillStyle = "rgba(14, 10, 9, 0.82)";
  ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
  ctx.fillStyle = "#2f1712";
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = "#ff943d";
  ctx.fillRect(barX, barY, barW * progress, barH);
  ctx.fillStyle = "rgba(255, 232, 157, 0.7)";
  ctx.fillRect(barX, barY + barH + 3, barW * timerProgress, 2);
  ctx.restore();
}
