import { drawVeronicaSpriteFrame } from "./owlDeliverySpriteSheet.js";

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function drawSparkle(ctx, x, y, radius, alpha, time, phase, star) {
  const pulse = 0.68 + Math.sin(time * 7 + phase) * 0.32;
  ctx.globalAlpha = alpha * (0.38 + pulse * 0.2);
  ctx.shadowColor = "#7fe9ff";
  ctx.shadowBlur = 4.5 * pulse;
  ctx.fillStyle = star ? "#d8fbff" : "#67d8ff";
  if (star) {
    const r = radius * (0.9 + pulse * 0.35);
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.8);
    ctx.lineTo(x + r * 0.45, y - r * 0.35);
    ctx.lineTo(x + r * 1.8, y);
    ctx.lineTo(x + r * 0.45, y + r * 0.35);
    ctx.lineTo(x, y + r * 1.8);
    ctx.lineTo(x - r * 0.45, y + r * 0.35);
    ctx.lineTo(x - r * 1.8, y);
    ctx.lineTo(x - r * 0.45, y - r * 0.35);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, radius * pulse, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWing(ctx, side, flap, scale) {
  ctx.save();
  ctx.scale(side, 1);
  ctx.rotate(side * flap * 0.18);
  const gradient = ctx.createLinearGradient(0, -12 * scale, side * 23 * scale, 11 * scale);
  gradient.addColorStop(0, "rgba(197, 253, 255, 0.9)");
  gradient.addColorStop(0.45, "rgba(93, 207, 255, 0.86)");
  gradient.addColorStop(1, "rgba(41, 91, 176, 0.68)");
  ctx.fillStyle = gradient;
  ctx.strokeStyle = "rgba(205, 251, 255, 0.6)";
  ctx.lineWidth = 1.1 * scale;
  ctx.beginPath();
  ctx.moveTo(4 * scale, -5 * scale);
  ctx.quadraticCurveTo(18 * scale, -15 * scale - flap * 5 * scale, 28 * scale, -3 * scale);
  ctx.quadraticCurveTo(21 * scale, 9 * scale + flap * 2 * scale, 8 * scale, 8 * scale);
  ctx.quadraticCurveTo(3 * scale, 4 * scale, 4 * scale, -5 * scale);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(12, 58, 120, 0.34)";
  for (let i = 0; i < 4; i++) {
    const px = (9 + i * 4.6) * scale;
    ctx.beginPath();
    ctx.moveTo(px, -5 * scale);
    ctx.quadraticCurveTo(px + 2 * scale, 1 * scale, px - 2 * scale, 7 * scale);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDeliveryBundle(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.08);
  ctx.fillStyle = "#f0d29a";
  ctx.strokeStyle = "#7a4d23";
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.roundRect(-5 * scale, -4 * scale, 10 * scale, 8 * scale, 2 * scale);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#b56f28";
  ctx.beginPath();
  ctx.moveTo(-5 * scale, -1 * scale);
  ctx.lineTo(5 * scale, -1 * scale);
  ctx.moveTo(0, -4 * scale);
  ctx.lineTo(0, 4 * scale);
  ctx.stroke();
  ctx.restore();
}

function drawVeronicaSprite(ctx, owl, x, y, scale, gameTime) {
  const phase = Number.isFinite(owl.phase) ? owl.phase : gameTime * 3.2;
  const flap = Math.sin(gameTime * (owl.state === "waiting" ? 7 : 11) + phase);
  const hurt = clamp01((owl.underAttackTimer || 0) / 1.2);
  const tilt = owl.state === "waiting" ? Math.sin(phase) * 0.08 : Math.sin(phase * 0.7) * 0.05;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.globalAlpha = 0.96;
  ctx.shadowColor = hurt > 0 ? "#f7fdff" : "#66dfff";
  ctx.shadowBlur = 12 + hurt * 10;
  drawWing(ctx, -1, flap, scale);
  drawWing(ctx, 1, flap, scale);
  const bodyGradient = ctx.createRadialGradient(-3 * scale, -5 * scale, 2 * scale, 0, 2 * scale, 17 * scale);
  bodyGradient.addColorStop(0, hurt > 0 ? "#ffffff" : "#d8fcff");
  bodyGradient.addColorStop(0.42, "#78e4ff");
  bodyGradient.addColorStop(1, "#2d69c5");
  ctx.fillStyle = bodyGradient;
  ctx.strokeStyle = "rgba(211, 254, 255, 0.72)";
  ctx.lineWidth = 1.4 * scale;
  ctx.beginPath();
  ctx.ellipse(0, 1 * scale, 9 * scale, 12 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(20, 78, 151, 0.32)";
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.ellipse(i * 4 * scale, 5 * scale, 1.6 * scale, 4 * scale, i * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = hurt > 0 ? "#ffffff" : "#bdf8ff";
  ctx.beginPath();
  ctx.moveTo(-8 * scale, -5 * scale);
  ctx.quadraticCurveTo(-5 * scale, -14 * scale, 0, -11 * scale);
  ctx.quadraticCurveTo(5 * scale, -14 * scale, 8 * scale, -5 * scale);
  ctx.quadraticCurveTo(6 * scale, 1 * scale, 0, 2 * scale);
  ctx.quadraticCurveTo(-6 * scale, 1 * scale, -8 * scale, -5 * scale);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#102b5d";
  ctx.beginPath();
  ctx.arc(-3.4 * scale, -5.5 * scale, 1.6 * scale, 0, Math.PI * 2);
  ctx.arc(3.4 * scale, -5.5 * scale, 1.6 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8ffff";
  ctx.beginPath();
  ctx.arc(-3.9 * scale, -6.1 * scale, 0.45 * scale, 0, Math.PI * 2);
  ctx.arc(2.9 * scale, -6.1 * scale, 0.45 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd978";
  ctx.beginPath();
  ctx.moveTo(0, -2.3 * scale);
  ctx.lineTo(2.1 * scale, -0.2 * scale);
  ctx.lineTo(0, 1.1 * scale);
  ctx.lineTo(-2.1 * scale, -0.2 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(130, 85, 28, 0.5)";
  ctx.stroke();
  if ((owl.orders || []).length > 0) drawDeliveryBundle(ctx, 0, 13 * scale, scale);
  ctx.restore();
}

function drawPortal(ctx, x, y, gameTime, timer) {
  const total = 0.75;
  const t = 1 - clamp01((timer || 0) / total);
  const pulse = 0.92 + Math.sin(gameTime * 9) * 0.08;
  const outerR = (9 + t * 10) * pulse;
  const innerR = 5 + t * 5;
  ctx.globalAlpha = 0.95 * (1 - t * 0.35);
  ctx.shadowColor = "#63d7ff";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "rgba(0, 0, 0, 0.26)";
  ctx.beginPath();
  ctx.ellipse(x, y + 10, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const glow = ctx.createRadialGradient(x, y, 2, x, y, outerR + 8);
  glow.addColorStop(0, "rgba(188, 255, 251, 0.5)");
  glow.addColorStop(0.6, "rgba(94, 183, 255, 0.28)");
  glow.addColorStop(1, "rgba(29, 58, 122, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, outerR + 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8be3ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, outerR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#d9f8ff";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, innerR, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const a = gameTime * 2.3 + (i / 4) * Math.PI * 2;
    ctx.fillStyle = i % 2 === 0 ? "#a5f4ff" : "#4fa8ff";
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
    drawPortal(ctx, x, y, gameTime, owl.portalTimer);
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
  ctx.shadowColor = "rgba(39, 181, 255, 0.8)";
  ctx.shadowBlur = 14;
  const aura = ctx.createRadialGradient(x, y, 1, x, y, 26 * scale);
  aura.addColorStop(0, "rgba(122, 231, 255, 0.24)");
  aura.addColorStop(1, "rgba(49, 108, 218, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(x, y, 26 * scale, 0, Math.PI * 2);
  ctx.fill();
  if (!drawVeronicaSpriteFrame(renderer, owl, x, y, scale, gameTime)) drawVeronicaSprite(ctx, owl, x, y, scale, gameTime);
  const hpPct = clamp01((owl.hp || 0) / Math.max(1, owl.maxHp || 1));
  if (hpPct < 1 || (owl.underAttackTimer || 0) > 0) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(5, 10, 18, 0.75)";
    ctx.fillRect(x - 16, y - 25, 32, 4);
    ctx.fillStyle = hpPct > 0.35 ? "#73e6ff" : "#ff5967";
    ctx.fillRect(x - 16, y - 25, 32 * hpPct, 4);
  }
  ctx.shadowBlur = 0;
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#d7f9ff";
  ctx.strokeStyle = "rgba(3, 9, 16, 0.85)";
  ctx.lineWidth = 3;
  ctx.strokeText(owl.name || "Veronica", x, y - 34);
  ctx.fillText(owl.name || "Veronica", x, y - 34);
  ctx.restore();
}
