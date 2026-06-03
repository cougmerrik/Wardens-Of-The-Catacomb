export function drawForzareBurst(ctx, zone, x, y, time = 0) {
  const radius = Number.isFinite(zone.radius) ? Math.max(8, zone.radius) : 72;
  const totalLife = Number.isFinite(zone.totalLife) && zone.totalLife > 0 ? zone.totalLife : 0.38;
  const lifeFrac = Math.max(0, Math.min(1, zone.life / totalLife));
  const progress = 1 - lifeFrac;
  const blastRadius = radius * (0.28 + progress * 0.86);
  const core = ctx.createRadialGradient(x, y, 2, x, y, blastRadius);
  core.addColorStop(0, `rgba(246, 232, 255, ${0.62 * lifeFrac})`);
  core.addColorStop(0.28, `rgba(186, 122, 255, ${0.48 * lifeFrac})`);
  core.addColorStop(0.66, `rgba(96, 54, 190, ${0.26 * lifeFrac})`);
  core.addColorStop(1, "rgba(24, 8, 54, 0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(x, y, blastRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(218, 190, 255, ${0.72 * lifeFrac})`;
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const ringRadius = radius * (0.22 + progress * (0.52 + i * 0.16));
    ctx.beginPath();
    ctx.arc(x, y, ringRadius, time * (2.2 + i * 0.4), time * (2.2 + i * 0.4) + Math.PI * 1.55);
    ctx.stroke();
  }
}

export function drawAssassinExecuteSplash(ctx, zone, x, y, time = 0) {
  const totalLife = Number.isFinite(zone.totalLife) && zone.totalLife > 0 ? zone.totalLife : 0.42;
  const lifeFrac = Math.max(0, Math.min(1, zone.life / totalLife));
  const radius = Number.isFinite(zone.radius) ? Math.max(8, zone.radius) : 20;
  ctx.save();
  ctx.globalAlpha = lifeFrac;
  const splash = ctx.createRadialGradient(x, y, 1, x, y, radius);
  splash.addColorStop(0, "rgba(255, 210, 210, 0.68)");
  splash.addColorStop(0.38, "rgba(190, 24, 36, 0.54)");
  splash.addColorStop(1, "rgba(70, 0, 10, 0)");
  ctx.fillStyle = splash;
  ctx.beginPath();
  ctx.arc(x, y, radius * (1.12 - lifeFrac * 0.28), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 92, 92, 0.82)";
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + time * 0.8;
    const r = radius * (0.68 + (i % 2) * 0.16);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * radius * 0.18, y + Math.sin(a) * radius * 0.18);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawAngelRingBurst(ctx, zone, x, y) {
  const radius = Number.isFinite(zone.radius) ? Math.max(8, zone.radius) : 64;
  const totalLife = Number.isFinite(zone.totalLife) && zone.totalLife > 0 ? zone.totalLife : 0.55;
  const lifeFrac = Math.max(0, Math.min(1, zone.life / totalLife));
  const progress = 1 - lifeFrac;
  const glowRadius = radius * (0.38 + progress * 0.74);
  const aura = ctx.createRadialGradient(x, y, 2, x, y, glowRadius);
  aura.addColorStop(0, `rgba(255, 252, 220, ${0.58 * lifeFrac})`);
  aura.addColorStop(0.38, `rgba(255, 227, 120, ${0.38 * lifeFrac})`);
  aura.addColorStop(0.78, `rgba(196, 150, 48, ${0.16 * lifeFrac})`);
  aura.addColorStop(1, "rgba(80, 50, 12, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 248, 200, ${0.82 * lifeFrac})`;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(x, y, radius * (0.42 + progress * 0.48), 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - radius * 0.46, y);
  ctx.lineTo(x + radius * 0.46, y);
  ctx.moveTo(x, y - radius * 0.46);
  ctx.lineTo(x, y + radius * 0.46);
  ctx.stroke();
}
