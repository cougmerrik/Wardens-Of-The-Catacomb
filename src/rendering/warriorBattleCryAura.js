import { getWarriorDoctrine } from "../game/warriorTalentTree.js";

const AURA_COLORS = {
  battlecry: { core: "218, 92, 70", ring: "255, 164, 86" },
  berserker: { core: "220, 78, 64", ring: "255, 124, 92" },
  paladin: { core: "245, 207, 111", ring: "255, 232, 163" },
  gladiator: { core: "214, 180, 135", ring: "226, 208, 178" },
  eldritch: { core: "157, 123, 255", ring: "196, 180, 255" }
};

export function getWarriorBattleCryAuraState(entity, config = {}, time = 0) {
  const active = Math.max(0, Number.isFinite(entity?.warriorRageActiveTimer) ? entity.warriorRageActiveTimer : 0);
  if (active <= 0) return null;
  const total = Math.max(active, Number.isFinite(config?.warriorRage?.duration) ? config.warriorRage.duration : 10);
  const remaining = Math.max(0, Math.min(1, active / Math.max(0.001, total)));
  const doctrine = getWarriorDoctrine(entity);
  const colors = AURA_COLORS[doctrine] || AURA_COLORS.battlecry;
  const pulse = 0.5 + Math.sin(time * 8) * 0.5;
  const size = Number.isFinite(entity?.size)
    ? entity.size
    : Number.isFinite(entity?.player?.size)
    ? entity.player.size
    : 22;
  return {
    doctrine,
    colors,
    alpha: 0.2 + remaining * 0.28 + pulse * 0.08,
    ringAlpha: 0.38 + remaining * 0.22,
    radiusX: 18 + pulse * 2.5,
    radiusY: 7 + pulse * 1.2,
    offsetY: Math.max(8, size * 0.5)
  };
}

export function drawWarriorBattleCryAura(ctx, entity, screenX, screenY, config = {}, time = 0) {
  const aura = getWarriorBattleCryAuraState(entity, config, time);
  if (!aura) return false;
  const y = screenY + aura.offsetY;
  const gradient = ctx.createRadialGradient(screenX, y, 2, screenX, y, aura.radiusX);
  gradient.addColorStop(0, `rgba(${aura.colors.core}, ${aura.alpha})`);
  gradient.addColorStop(0.62, `rgba(${aura.colors.core}, ${aura.alpha * 0.45})`);
  gradient.addColorStop(1, `rgba(${aura.colors.core}, 0)`);
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(screenX, y, aura.radiusX, aura.radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(${aura.colors.ring}, ${aura.ringAlpha})`;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(screenX, y, aura.radiusX * 0.9, aura.radiusY * 0.8, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  return true;
}
