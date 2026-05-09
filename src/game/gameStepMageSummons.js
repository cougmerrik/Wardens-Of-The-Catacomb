import { vecLength } from "../utils.js";

export function updateFriendlyMageSummon(game, enemy, dt, enemySpeedScale) {
  if (enemy.type === "mage_decoy" && game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy)) {
    enemy.decoyFireCooldown = Math.max(0, (Number.isFinite(enemy.decoyFireCooldown) ? enemy.decoyFireCooldown : 0) - dt);
    if ((enemy.decoyFireCooldown || 0) <= 0) {
      const tile = game.config?.map?.tile || 32;
      let target = null;
      let bestDist = Number.POSITIVE_INFINITY;
      for (const other of game.enemies || []) {
        if (!other || other === enemy || (other.hp || 0) <= 0 || (game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(other))) continue;
        const dist = vecLength((other.x || 0) - enemy.x, (other.y || 0) - enemy.y);
        if (dist > tile * 7 || dist >= bestDist) continue;
        target = other;
        bestDist = dist;
      }
      if (target) {
        const dx = (target.x || 0) - enemy.x;
        const dy = (target.y || 0) - enemy.y;
        const len = vecLength(dx, dy) || 1;
        const speed = 340;
        game.bullets.push({
          x: enemy.x,
          y: enemy.y - 6,
          vx: (dx / len) * speed,
          vy: (dy / len) * speed,
          angle: Math.atan2(dy, dx),
          life: 0.95,
          size: 6,
          damage: Math.max(2, (typeof game.getPrimaryDamage === "function" ? game.getPrimaryDamage() : 6) * 0.65),
          projectileType: "mage_fireBolt",
          damageType: "fire",
          ownerId: enemy.controllerPlayerId || game.player?.id || null,
          burnDuration: 2,
          hitTargets: new Set()
        });
      }
      enemy.decoyFireCooldown = 0.55;
    }
    return true;
  }
  if (enemy.type === "flaming_sphere" && game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy)) {
    const tile = game.config?.map?.tile || 32;
    const owner = typeof game.getPlayerEntityById === "function"
      ? (game.getPlayerEntityById(enemy.controllerPlayerId || null) || game.player)
      : game.player;
    const anchorX = Number.isFinite(enemy.anchorX) ? enemy.anchorX : enemy.x;
    const anchorY = Number.isFinite(enemy.anchorY) ? enemy.anchorY : enemy.y;
    const ownerAnchorDist = owner ? vecLength((owner.x || 0) - anchorX, (owner.y || 0) - anchorY) : Number.POSITIVE_INFINITY;
    let target = null;
    let bestDist = Number.POSITIVE_INFINITY;
    if (ownerAnchorDist <= tile * 6) {
      for (const other of game.enemies || []) {
        if (!other || other === enemy || (other.hp || 0) <= 0 || (game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(other))) continue;
        const dist = vecLength((other.x || 0) - anchorX, (other.y || 0) - anchorY);
        if (dist > tile * 3 || dist >= bestDist) continue;
        target = other;
        bestDist = dist;
      }
    }
    const moveTarget = target || owner;
    if (moveTarget) {
      const desiredDistance = target ? tile * 0.75 : tile * 0.95;
      const dx = (moveTarget.x || 0) - enemy.x;
      const dy = (moveTarget.y || 0) - enemy.y;
      const dist = vecLength(dx, dy) || 1;
      if (dist > desiredDistance) {
        game.moveWithCollision(enemy, (dx / dist) * (enemy.speed || 0) * enemySpeedScale * dt, (dy / dist) * (enemy.speed || 0) * enemySpeedScale * dt);
      }
    }
    return true;
  }
  return false;
}

export function updateConfusedEnemy(game, enemy, dt, appliedEnemySpeedScale) {
  if ((enemy.confusionTimer || 0) > 0 && (enemy.isBoss || enemy.isFloorBoss)) {
    enemy.castWindup = 0;
    enemy.castCooldown = Math.max(enemy.castCooldown || 0, 0.35);
    enemy.chargeWindupTimer = 0;
    enemy.chargeTimer = 0;
    enemy.chargeCooldown = Math.max(enemy.chargeCooldown || 0, 0.35);
    enemy.stompCooldown = Math.max(enemy.stompCooldown || 0, 0.35);
    enemy.summonCooldown = Math.max(enemy.summonCooldown || 0, 0.35);
  }
  if ((enemy.confusionTimer || 0) > 0 && !enemy.isBoss && !enemy.isFloorBoss && !(game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy))) {
    let attackTarget = null;
    let bestAttackDist = Number.POSITIVE_INFINITY;
    const attackRange = (enemy.size || 20) * 0.5 + 18;
    for (const other of game.enemies || []) {
      if (!other || other === enemy || (other.hp || 0) <= 0 || (game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(other))) continue;
      const dist = vecLength((other.x || 0) - enemy.x, (other.y || 0) - enemy.y);
      if (dist < bestAttackDist) {
        bestAttackDist = dist;
        attackTarget = other;
      }
    }
    if (attackTarget && bestAttackDist <= attackRange && (enemy.confusionAttackCooldown || 0) <= 0) {
      game.applyEnemyDamage(attackTarget, game.rollEnemyContactDamage(enemy) * game.getEnemyDamageScale(), "physical", enemy.confusionOwnerId || null);
      enemy.confusionAttackCooldown = 0.65;
      return true;
    }
    enemy.confusionAttackCooldown = Math.max(0, (Number.isFinite(enemy.confusionAttackCooldown) ? enemy.confusionAttackCooldown : 0) - dt);
    enemy.confusionWanderTimer = Math.max(0, (Number.isFinite(enemy.confusionWanderTimer) ? enemy.confusionWanderTimer : 0) - dt);
    if (enemy.confusionWanderTimer <= 0 || !Number.isFinite(enemy.confusionWanderAngle)) {
      enemy.confusionWanderAngle = attackTarget
        ? Math.atan2((attackTarget.y || 0) - enemy.y, (attackTarget.x || 0) - enemy.x)
        : Math.random() * Math.PI * 2;
      enemy.confusionWanderTimer = 0.35 + Math.random() * 0.45;
    }
    const confusionSpeed = appliedEnemySpeedScale * 0.72;
    if (typeof game.moveWithCollision === "function") {
      game.moveWithCollision(enemy, Math.cos(enemy.confusionWanderAngle) * (enemy.speed || 0) * confusionSpeed * dt, Math.sin(enemy.confusionWanderAngle) * (enemy.speed || 0) * confusionSpeed * dt);
    }
    return true;
  }
  return false;
}
