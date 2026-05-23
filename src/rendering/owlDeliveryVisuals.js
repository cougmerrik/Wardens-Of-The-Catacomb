export function drawOwlDeliveryVisual(renderer, game, cameraX, cameraY) {
  const owl = game.owlDelivery?.active;
  if (!owl) return;
  const ctx = renderer.ctx;
  const x = (Number.isFinite(owl.displayX) ? owl.displayX : owl.x) - cameraX;
  const y = (Number.isFinite(owl.displayY) ? owl.displayY : owl.y) - cameraY;
  const size = Number.isFinite(owl.size) ? owl.size : 22;
  const scale = Math.max(0.65, Math.min(1, size / 22));
  ctx.save();
  if (owl.state === "portal") {
    const total = 0.75;
    const t = 1 - Math.max(0, Math.min(1, (owl.portalTimer || 0) / total));
    const pulse = 0.92 + Math.sin((game.time || 0) * 9) * 0.08;
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
      const a = (game.time || 0) * 2.3 + (i / 4) * Math.PI * 2;
      ctx.fillStyle = i % 2 === 0 ? "#a5f4ff" : "#4fa8ff";
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * (5 + t * 5), y + Math.sin(a) * (4 + t * 4), 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  for (const mote of owl.trail || []) {
    const maxLife = Math.max(0.1, mote.maxLife || 2.4);
    const alpha = Math.max(0, Math.min(1, (mote.life || 0) / maxLife));
    ctx.globalAlpha = alpha * 0.34;
    ctx.fillStyle = "#65d9ff";
    ctx.beginPath();
    ctx.arc(mote.x - cameraX, mote.y - cameraY, 2 + alpha * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.95;
  ctx.shadowColor = "#63d7ff";
  ctx.shadowBlur = 11;
  ctx.fillStyle = "#6de1ff";
  ctx.beginPath();
  ctx.ellipse(x, y, 8 * scale, 10 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(130, 238, 255, 0.72)";
  ctx.beginPath();
  ctx.ellipse(x - 9 * scale, y + 1, 9 * scale, 4.5 * scale, -0.5, 0, Math.PI * 2);
  ctx.ellipse(x + 9 * scale, y + 1, 9 * scale, 4.5 * scale, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#163c62";
  ctx.beginPath();
  ctx.arc(x - 3 * scale, y - 3 * scale, 1.4 * scale, 0, Math.PI * 2);
  ctx.arc(x + 3 * scale, y - 3 * scale, 1.4 * scale, 0, Math.PI * 2);
  ctx.fill();
  if ((owl.orders || []).length > 0) {
    ctx.fillStyle = "#e7fbff";
    ctx.strokeStyle = "#3ebee8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x - 7, y - 24, 14, 12, 3);
    ctx.fill();
    ctx.stroke();
  }
  const hpPct = Math.max(0, Math.min(1, (owl.hp || 0) / Math.max(1, owl.maxHp || 1)));
  if (hpPct < 1 || (owl.underAttackTimer || 0) > 0) {
    ctx.fillStyle = "rgba(5, 10, 18, 0.75)";
    ctx.fillRect(x - 16, y - 22, 32, 4);
    ctx.fillStyle = hpPct > 0.35 ? "#73e6ff" : "#ff5967";
    ctx.fillRect(x - 16, y - 22, 32 * hpPct, 4);
  }
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#d7f9ff";
  ctx.strokeStyle = "rgba(3, 9, 16, 0.85)";
  ctx.lineWidth = 3;
  ctx.strokeText(owl.name || "Veronica", x, y - 31);
  ctx.fillText(owl.name || "Veronica", x, y - 31);
  ctx.restore();
}
