import { getRangerProjectileVisualSpec } from "./rangerVisualPresentation.js";

function makeTalentSource(keys = []) {
  return { skills: Object.fromEntries(keys.map((key) => [key, { points: 1 }])) };
}

export function getRangerProjectileSource(game, projectile, options = {}) {
  const ownerId = projectile?.ownerId;
  if (ownerId && game?.player?.id === ownerId && game?.isArcherClass?.()) return game;
  const remote = Array.isArray(game?.remotePlayers) ? game.remotePlayers.find((player) => player?.id === ownerId) : null;
  if (remote?.classType === "archer") return remote;
  if (options.fireArrow) return makeTalentSource(["longbow", "rangerPath"]);
  const projectileType = typeof projectile?.projectileType === "string" ? projectile.projectileType : "";
  if (!projectileType.startsWith("ranger_")) return null;
  const weapon = projectileType.slice("ranger_".length);
  return makeTalentSource([weapon || "longbow"]);
}

export function drawRangerProjectile(ctx, projectile, game, options = {}) {
  const source = getRangerProjectileSource(game, projectile, options);
  const spec = getRangerProjectileVisualSpec(source, {
    projectileKind: options.fireArrow ? "fireArrow" : projectile?.projectileType,
    active: {
      fireArrow: !!options.fireArrow,
      poison: !!projectile?.poisoned,
      marked: !!projectile?.marked,
      combo: !!projectile?.comboEnhanced,
      shadow: !!projectile?.shadow
    }
  });
  if (options.fireArrow) {
    drawArrow(ctx, spec, { fireArrow: true });
    return true;
  }
  if (!source) return false;
  if (spec.family === "bullet") drawBullet(ctx, spec);
  else if (spec.family === "knife" || spec.family === "pairedBlade") drawKnife(ctx, spec);
  else drawArrow(ctx, spec);
  return true;
}

function drawArrow(ctx, spec, options = {}) {
  const fireArrow = !!options.fireArrow;
  ctx.fillStyle = colorWithAlpha(spec.trail, fireArrow ? 0.55 : 0.38);
  ctx.fillRect(-13, -1.1, 12, 2.2);
  if (spec.effectAccents.includes("emberTrail")) {
    ctx.fillStyle = "#ff8a3d";
    ctx.fillRect(-12, -2.4, 2.4, 2);
    ctx.fillRect(-8, 1.2, 1.8, 1.5);
  }
  if (spec.effectAccents.includes("poisonDroplet")) {
    ctx.fillStyle = "#8ae06f";
    ctx.fillRect(-5, -2.8, 1.8, 1.8);
  }
  ctx.fillStyle = spec.trail || "#d9c27f";
  ctx.fillRect(-7, -1.3, 11, 2.6);
  ctx.fillStyle = spec.head || "#e5e2dc";
  ctx.beginPath();
  ctx.moveTo(5, 0);
  ctx.lineTo(1, -3);
  ctx.lineTo(1, 3);
  ctx.closePath();
  ctx.fill();
  if (spec.impact === "stormFork") drawStormFork(ctx);
}

function drawKnife(ctx, spec) {
  const paired = spec.family === "pairedBlade";
  const bladeLength = paired ? 9 : 7;
  ctx.strokeStyle = colorWithAlpha(spec.trail, 0.42);
  ctx.lineWidth = paired ? 3.2 : 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(-3, 0);
  ctx.stroke();
  ctx.strokeStyle = spec.head || "#f0f4fb";
  ctx.lineWidth = paired ? 2.4 : 2;
  ctx.beginPath();
  ctx.moveTo(-bladeLength * 0.55, -2.4);
  ctx.lineTo(bladeLength * 0.55, 2.4);
  ctx.moveTo(-bladeLength * 0.55, 2.4);
  ctx.lineTo(bladeLength * 0.55, -2.4);
  ctx.stroke();
  ctx.strokeStyle = spec.impact === "chainJump" ? "#ffc0b3" : "#384052";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-2.2, 0);
  ctx.lineTo(2.2, 0);
  ctx.stroke();
}

function drawBullet(ctx, spec) {
  ctx.fillStyle = colorWithAlpha(spec.trail, 0.36);
  ctx.fillRect(-11, -1.1, 12, 2.2);
  ctx.fillStyle = spec.impact === "apexPulse" ? "#fff0bd" : spec.head || "#fff0a8";
  ctx.beginPath();
  ctx.arc(2.5, 0, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7d5a2e";
  ctx.beginPath();
  ctx.arc(-2.5, 0, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawStormFork(ctx) {
  ctx.strokeStyle = "#d8f4ff";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-4, -3);
  ctx.lineTo(-7, -1);
  ctx.moveTo(-1, 0);
  ctx.lineTo(-4, 3);
  ctx.stroke();
}

function colorWithAlpha(color, alpha) {
  if (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color)) return `rgba(216, 201, 167, ${alpha})`;
  const int = Number.parseInt(color.slice(1), 16);
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
}
