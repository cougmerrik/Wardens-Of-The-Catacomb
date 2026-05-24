import { drawVeronicaEffectFrame, drawVeronicaSpriteFrame } from "./owlDeliverySpriteSheet.js";

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function drawSparkle(ctx, x, y, radius, alpha, time, phase, star) {
  const pulse = 0.68 + Math.sin(time * 7 + phase) * 0.32;
  ctx.globalAlpha = alpha * (0.28 + pulse * 0.14);
  ctx.shadowColor = star ? "#ffcf5a" : "#ff6a1f";
  ctx.shadowBlur = star ? 3 * pulse : 1.5 * pulse;
  ctx.fillStyle = star ? "#ffd45f" : "#d94718";
  if (star) {
    const r = radius * (0.75 + pulse * 0.22);
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.2);
    ctx.lineTo(x + r * 0.4, y - r * 0.25);
    ctx.lineTo(x + r * 1.2, y);
    ctx.lineTo(x + r * 0.4, y + r * 0.25);
    ctx.lineTo(x, y + r * 1.2);
    ctx.lineTo(x - r * 0.4, y + r * 0.25);
    ctx.lineTo(x - r * 1.2, y);
    ctx.lineTo(x - r * 0.4, y - r * 0.25);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(x, y, radius * (1.4 + pulse * 0.35), radius * (0.9 + pulse * 0.25), phase, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPortal(ctx, x, y, gameTime, timer) {
  const total = 0.75;
  const t = 1 - clamp01((timer || 0) / total);
  const pulse = 0.92 + Math.sin(gameTime * 9) * 0.08;
  const outerR = (9 + t * 10) * pulse;
  const innerR = 5 + t * 5;
  ctx.globalAlpha = 0.95 * (1 - t * 0.35);
  ctx.shadowColor = "#ff8a24";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "rgba(0, 0, 0, 0.26)";
  ctx.beginPath();
  ctx.ellipse(x, y + 10, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const glow = ctx.createRadialGradient(x, y, 2, x, y, outerR + 8);
  glow.addColorStop(0, "rgba(255, 207, 85, 0.46)");
  glow.addColorStop(0.55, "rgba(221, 74, 22, 0.32)");
  glow.addColorStop(1, "rgba(42, 8, 4, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, outerR + 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ff8a24";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, outerR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#ffd36a";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, innerR, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const a = gameTime * 2.3 + (i / 4) * Math.PI * 2;
    ctx.fillStyle = i % 2 === 0 ? "#ffd45f" : "#e34a18";
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * (5 + t * 5), y + Math.sin(a) * (4 + t * 4), 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawOwlDeliveryVisual(renderer, game, cameraX, cameraY) {
  const owl = game.owlDelivery?.active;
  if (!owl) return;
  const ctx = renderer.ctx;
  const x = (Number.isFinite(owl.displayX) ? owl.displayX : owl.x) - cameraX;
  const y = (Number.isFinite(owl.displayY) ? owl.displayY : owl.y) - cameraY;
  const size = Number.isFinite(owl.size) ? owl.size : 22;
  const scale = Math.max(0.68, Math.min(1.05, size / 22));
  const gameTime = game.time || 0;
  ctx.save();
  if (owl.state === "portal") {
    if (!drawVeronicaEffectFrame(renderer, "effects", 0, x, y, scale * 1.1)) drawPortal(ctx, x, y, gameTime, owl.portalTimer);
    drawVeronicaEffectFrame(renderer, "effects", 1, x - 8 * scale, y + 5 * scale, scale * 0.8);
    ctx.restore();
    return;
  }
  for (const mote of owl.trail || []) {
    const maxLife = Math.max(0.1, mote.maxLife || 2.4);
    const alpha = clamp01((mote.life || 0) / maxLife);
    drawSparkle(
      ctx,
      mote.x - cameraX,
      mote.y - cameraY,
      Number.isFinite(mote.radius) ? mote.radius : 2,
      Math.pow(alpha, 0.55) * 0.42,
      gameTime,
      mote.phase || 0,
      !!mote.sparkle
    );
  }
  ctx.globalAlpha = 1;
  ctx.shadowColor = "rgba(255, 111, 28, 0.72)";
  ctx.shadowBlur = 14;
  const aura = ctx.createRadialGradient(x, y, 1, x, y, 26 * scale);
  aura.addColorStop(0, "rgba(255, 123, 32, 0.22)");
  aura.addColorStop(1, "rgba(62, 13, 4, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(x, y, 26 * scale, 0, Math.PI * 2);
  ctx.fill();
  if (!drawVeronicaSpriteFrame(renderer, owl, x, y, scale, gameTime)) drawPortal(ctx, x, y, gameTime, 0.2);
  const hpPct = clamp01((owl.hp || 0) / Math.max(1, owl.maxHp || 1));
  if (hpPct < 1 || (owl.underAttackTimer || 0) > 0) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(5, 10, 18, 0.75)";
    ctx.fillRect(x - 16, y - 25, 32, 4);
    ctx.fillStyle = hpPct > 0.35 ? "#ff9a2f" : "#ff5967";
    ctx.fillRect(x - 16, y - 25, 32 * hpPct, 4);
  }
  ctx.shadowBlur = 0;
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffe1a8";
  ctx.strokeStyle = "rgba(3, 9, 16, 0.85)";
  ctx.lineWidth = 3;
  ctx.strokeText(owl.name || "Veronica", x, y - 34);
  ctx.fillText(owl.name || "Veronica", x, y - 34);
  ctx.restore();
}
