import { vecLength } from "../utils.js";

export function resolveAssassinProjectileEffects({ game, projectile, ownerContext, enemy, activeEnemies, projectileDamage }) {
  if (!game || !projectile || !ownerContext || !enemy) return;
  if (typeof ownerContext.tryAssassinExecuteEnemy === "function") ownerContext.tryAssassinExecuteEnemy(enemy, { ranged: true });
  if ((projectile.assassinChainCount || 0) <= 0) return;
  projectile.hitTargets.add(enemy);
  let chainSource = enemy;
  for (let i = 0; i < projectile.assassinChainCount; i++) {
    const chainTarget = findAssassinChainTarget(game, projectile, chainSource, activeEnemies);
    if (!chainTarget) break;
    game.applyEnemyDamage(chainTarget, projectileDamage * 0.65, "physical", projectile.ownerId || null);
    if (typeof ownerContext.tryAssassinExecuteEnemy === "function") ownerContext.tryAssassinExecuteEnemy(chainTarget, { ranged: true });
    projectile.hitTargets.add(chainTarget);
    game.fireZones.push({
      x: chainSource.x,
      y: chainSource.y,
      targetX: chainTarget.x,
      targetY: chainTarget.y,
      zoneType: "arcaneChain",
      damageType: "physical",
      life: 0.18,
      totalLife: 0.18
    });
    chainSource = chainTarget;
  }
}

function findAssassinChainTarget(game, projectile, chainSource, activeEnemies) {
  let chainTarget = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const other of activeEnemies) {
    if (!other || other === chainSource || (other.hp || 0) <= 0 || projectile.hitTargets.has(other)) continue;
    if (game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(other)) continue;
    const dist = vecLength((other.x || 0) - (chainSource.x || 0), (other.y || 0) - (chainSource.y || 0));
    if (dist > game.config.map.tile * 2.5 || dist >= bestDist) continue;
    bestDist = dist;
    chainTarget = other;
  }
  return chainTarget;
}
