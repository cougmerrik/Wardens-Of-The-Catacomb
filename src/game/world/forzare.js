const FORZARE_COOLDOWN = 20;
const FORZARE_DAMAGE = 10;
const FORZARE_TRIGGER_ENEMY_COUNT = 4;
const FORZARE_TRIGGER_RANGE_TILES = 1;
const FORZARE_KNOCKBACK_TILES = 3;
const FORZARE_BREAK_CHANCE = 0.05;

function getForzareTargets(game) {
  const tile = Number.isFinite(game?.config?.map?.tile) ? game.config.map.tile : 32;
  const player = game?.player;
  if (!player || (Number.isFinite(player.health) && player.health <= 0) || player.alive === false) return [];
  const playerRadius = typeof game.getPlayerEnemyCollisionRadiusFor === "function"
    ? game.getPlayerEnemyCollisionRadiusFor(player)
    : Math.max(0, (Number.isFinite(player.size) ? player.size : 22) * 0.5);
  return (Array.isArray(game.enemies) ? game.enemies : []).filter((enemy) => {
    if (!enemy || (enemy.hp || 0) <= 0 || enemy.deathProcessed) return false;
    if (typeof game.isEnemyFriendlyToPlayer === "function" && game.isEnemyFriendlyToPlayer(enemy)) return false;
    const enemyRadius = Math.max(0, (Number.isFinite(enemy.size) ? enemy.size : 20) * 0.5);
    const range = tile * FORZARE_TRIGGER_RANGE_TILES + playerRadius + enemyRadius;
    return Math.hypot((enemy.x || 0) - (player.x || 0), (enemy.y || 0) - (player.y || 0)) <= range;
  });
}

export function triggerForzare(game, slot, def, feedback = {}) {
  const targets = getForzareTargets(game);
  if (targets.length < FORZARE_TRIGGER_ENEMY_COUNT) return false;
  const tile = Number.isFinite(game?.config?.map?.tile) ? game.config.map.tile : 32;
  const pushDistance = tile * FORZARE_KNOCKBACK_TILES;
  const player = game.player;
  if (Array.isArray(game.fireZones)) {
    game.fireZones.push({
      x: player.x || 0,
      y: player.y || 0,
      radius: tile * 2.6,
      life: 0.38,
      totalLife: 0.38,
      zoneType: "forzareBurst"
    });
  }
  if (typeof game.spawnFloatingText === "function") {
    game.spawnFloatingText(player.x || 0, (player.y || 0) - 42, "Forzare!", "#c7a9ff", 0.95, 15);
  }
  for (const enemy of targets) {
    const dx = (enemy.x || 0) - (player.x || 0);
    const dy = (enemy.y || 0) - (player.y || 0);
    const len = Math.hypot(dx, dy) || 1;
    const pushX = (dx / len) * pushDistance;
    const pushY = (dy / len) * pushDistance;
    if (typeof game.moveWithCollisionSubsteps === "function") game.moveWithCollisionSubsteps(enemy, pushX, pushY);
    else {
      enemy.x = (enemy.x || 0) + pushX;
      enemy.y = (enemy.y || 0) + pushY;
    }
    if (typeof game.applyEnemyDamage === "function") game.applyEnemyDamage(enemy, FORZARE_DAMAGE, "force", player.id || null);
  }
  if (Math.random() < FORZARE_BREAK_CHANCE) {
    if (typeof feedback.breakSlot === "function") feedback.breakSlot();
    else {
      slot.count = 0;
      slot.cooldownRemaining = 0;
    }
    if (typeof feedback.pushMessage === "function") feedback.pushMessage(game, "Forzare broke");
  } else {
    slot.cooldownRemaining = FORZARE_COOLDOWN;
    if (typeof feedback.pushMessage === "function") feedback.pushMessage(game, "Forzare triggered");
  }
  if (typeof feedback.showConsumed === "function") feedback.showConsumed(game, def);
  return true;
}
