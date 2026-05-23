export function isPointVisibleToAnyLivingPlayer(game, x, y, radius = 0) {
  if (!game || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  const playW = typeof game.getPlayAreaWidth === "function" ? game.getPlayAreaWidth() : game.canvas?.width || 960;
  const viewH = Number.isFinite(game.canvas?.height) ? game.canvas.height : 640;
  const players = typeof game.getLivingPlayerEntities === "function" ? game.getLivingPlayerEntities() : [game.player];
  const activePlayers = Array.isArray(players) && players.length > 0 ? players.filter(Boolean) : [game.player];
  for (const player of activePlayers) {
    const px = Number.isFinite(player?.x) ? player.x : game.player?.x || 0;
    const py = Number.isFinite(player?.y) ? player.y : game.player?.y || 0;
    const camX = Math.max(0, Math.min((game.worldWidth || playW) - playW, px - playW / 2));
    const camY = Math.max(0, Math.min((game.worldHeight || viewH) - viewH, py - viewH / 2));
    if (x + radius >= camX && x - radius <= camX + playW && y + radius >= camY && y - radius <= camY + viewH) return true;
  }
  return false;
}

export function isEnemyVisibleToAnyLivingPlayer(game, enemy) {
  if (!enemy) return false;
  const radius = Number.isFinite(enemy.size) ? Math.max(0, enemy.size * 0.5) : 0;
  return isPointVisibleToAnyLivingPlayer(game, enemy.x, enemy.y, radius);
}

export function clearHiddenEnemiesAfterFloorBossDefeat(game) {
  const boss = typeof game?.syncFloorBossState === "function" ? game.syncFloorBossState() : game?.floorBoss;
  if (!game || !boss?.hiddenEnemyCleanupPending || !["defeated", "portal"].includes(boss.phase)) return 0;
  const isCleanupEligible = (enemy) =>
    !!enemy &&
    enemy.postFloorBossCleanupEligible === true &&
    (enemy.hp || 0) > 0 &&
    !enemy.isFloorBoss &&
    !game.isEnemyFriendlyToPlayer?.(enemy);
  const before = Array.isArray(game.enemies) ? game.enemies.length : 0;
  game.enemies = (game.enemies || []).filter((enemy) => {
    if (!enemy || (enemy.hp || 0) <= 0 || enemy.isFloorBoss) return true;
    if (game.isEnemyFriendlyToPlayer?.(enemy)) return true;
    if (!isCleanupEligible(enemy)) return true;
    return isEnemyVisibleToAnyLivingPlayer(game, enemy);
  });
  const removed = Math.max(0, before - game.enemies.length);
  boss.hiddenEnemyCleanupPending = (game.enemies || []).some(isCleanupEligible);
  boss.hiddenEnemyCleanupCount = (boss.hiddenEnemyCleanupCount || 0) + removed;
  return removed;
}
