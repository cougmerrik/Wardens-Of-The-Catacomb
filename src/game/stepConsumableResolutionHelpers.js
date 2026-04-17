import { vecLength } from "../utils.js";

export function tickWarBannerZone(game, zone, dt, getLivingPlayers, playerEnemyRadius, healPlayer) {
  const tickInterval = 0.25;
  zone.tickTimer = Math.max(-2, (Number.isFinite(zone.tickTimer) ? zone.tickTimer : tickInterval) - dt);
  while (zone.life > 0 && zone.tickTimer <= 0) {
    for (const player of getLivingPlayers()) {
      const playerRadius = typeof game.getPlayerEnemyCollisionRadiusFor === "function" ? game.getPlayerEnemyCollisionRadiusFor(player) : playerEnemyRadius;
      if (vecLength(zone.x - player.x, zone.y - player.y) >= (zone.radius || 0) + playerRadius * 0.8) continue;
      healPlayer(player, Math.max(1, (player.maxHealth || 1) * 0.02 * tickInterval));
    }
    zone.tickTimer += tickInterval;
  }
}

export function resolveConsumableDrivenDropPickup(game, drop, getLivingPlayers, healPlayer) {
  if ((drop.life || 0) <= 0) return false;
  if (game.isGoldDrop(drop)) {
    const mimic = (game.enemies || []).find((enemy) =>
      enemy?.type === "mimic" &&
      enemy?.isSummonedCompanion &&
      (enemy.hp || 0) > 0 &&
      vecLength((enemy.x || 0) - drop.x, (enemy.y || 0) - drop.y) < game.getPickupRadius()
    ) || null;
    if (mimic) {
      mimic.hp = Math.min(mimic.maxHp || mimic.hp || 0, (mimic.hp || 0) + Math.max(1, drop.amount * 0.2));
      mimic.damageBuffTimer = Math.max(mimic.damageBuffTimer || 0, 3);
      mimic.damageBuffMultiplier = Math.max(mimic.damageBuffMultiplier || 0, 1.2);
      drop.life = 0;
      return true;
    }
  }
  for (const player of getLivingPlayers()) {
    if (vecLength(player.x - drop.x, player.y - drop.y) >= game.getPickupRadius()) continue;
    if (drop.type === "health") {
      const healMult = typeof game.hasPassiveConsumableForEntity === "function" && game.hasPassiveConsumableForEntity(player, "povertyCharm") ? 1.2 : 1;
      healPlayer(player, drop.amount * healMult);
    } else if (game.isGoldDrop(drop)) {
      const amount = Math.max(1, Math.floor(drop.amount * game.getGoldFindMultiplier()));
      if (typeof game.awardGoldToPlayerEntity === "function") game.awardGoldToPlayerEntity(player, amount);
    }
    drop.life = 0;
    return true;
  }
  return false;
}
