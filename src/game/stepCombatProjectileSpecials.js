import { vecLength } from "../utils.js";

export function resolveSpecialProjectileCollision({
  game,
  projectile,
  activeEnemies,
  activeBreakables,
  getLivingPlayers,
  playerEnemyRadius,
  damagePlayer,
  skeletonIgnoresArrow
}) {
  if (!projectile || projectile.life <= 0) return false;
  if (projectile.projectileType === "ratArrow") {
    for (const enemy of activeEnemies) {
      if (!game.isEnemyFriendlyToPlayer || !game.isEnemyFriendlyToPlayer(enemy)) continue;
      if (enemy.type === "skeleton_warrior" && enemy.collapsed) continue;
      if (vecLength(projectile.x - enemy.x, projectile.y - enemy.y) > (enemy.size + projectile.size) * 0.5) continue;
      const rawDamage = game.rollEnemyContactDamage({ damageMin: projectile.damageMin, damageMax: projectile.damageMax });
      game.applyEnemyDamage(enemy, rawDamage * game.getEnemyDamageScale(), "arrow", projectile.ownerId || null);
      projectile.life = 0;
      return true;
    }
    for (const player of getLivingPlayers()) {
      const playerRadius = typeof game.getPlayerEnemyCollisionRadiusFor === "function" ? game.getPlayerEnemyCollisionRadiusFor(player) : playerEnemyRadius;
      if (vecLength(projectile.x - player.x, projectile.y - player.y) > playerRadius + projectile.size * 0.5) continue;
      const rawDamage = game.rollEnemyContactDamage({ damageMin: projectile.damageMin, damageMax: projectile.damageMax });
      damagePlayer(player, rawDamage * game.getEnemyDamageScale(), "arrow");
      projectile.life = 0;
      return true;
    }
    return true;
  }
  if (projectile.projectileType === "deathBolt") {
    let hit = false;
    for (const br of activeBreakables) {
      if (vecLength(projectile.x - br.x, projectile.y - br.y) >= (br.size + projectile.size) * 0.45) continue;
      br.hp = 0;
      hit = true;
      break;
    }
    if (!hit) {
      for (const enemy of activeEnemies) {
        if (vecLength(projectile.x - enemy.x, projectile.y - enemy.y) >= (enemy.size + projectile.size) * 0.5) continue;
        hit = true;
        break;
      }
    }
    if (hit) {
      game.triggerDeathBoltExplosion(projectile.x, projectile.y, projectile);
      projectile.life = 0;
    }
    return true;
  }
  if (projectile.projectileType === "trapArrow") {
    for (const br of activeBreakables) {
      if (vecLength(projectile.x - br.x, projectile.y - br.y) >= (br.size + projectile.size) * 0.45) continue;
      projectile.life = 0;
      break;
    }
    if (projectile.life <= 0) return true;
    for (const player of getLivingPlayers()) {
      const playerRadius = typeof game.getPlayerEnemyCollisionRadiusFor === "function" ? game.getPlayerEnemyCollisionRadiusFor(player) : playerEnemyRadius;
      if (vecLength(projectile.x - player.x, projectile.y - player.y) > playerRadius + projectile.size * 0.5) continue;
      const rawDamage = typeof game.rollWallTrapDamage === "function"
        ? game.rollWallTrapDamage()
        : game.rollEnemyContactDamage({ damageMin: projectile.damageMin, damageMax: projectile.damageMax });
      damagePlayer(player, rawDamage * game.getEnemyDamageScale(), "arrow");
      projectile.life = 0;
      return true;
    }
    for (const enemy of activeEnemies) {
      if (enemy.type === "skeleton_warrior" && enemy.collapsed) continue;
      if (vecLength(projectile.x - enemy.x, projectile.y - enemy.y) >= (enemy.size + projectile.size) * 0.5) continue;
      if (skeletonIgnoresArrow(enemy)) continue;
      const rawDamage = typeof game.rollWallTrapDamage === "function"
        ? game.rollWallTrapDamage()
        : game.rollEnemyContactDamage({ damageMin: projectile.damageMin, damageMax: projectile.damageMax });
      game.applyEnemyDamage(enemy, rawDamage * game.getEnemyDamageScale(), "arrow", projectile.ownerId || null);
      projectile.life = 0;
      break;
    }
    return true;
  }
  if (projectile.projectileType === "sonyaFireball") {
    let hit = false;
    for (const br of activeBreakables) {
      if (vecLength(projectile.x - br.x, projectile.y - br.y) >= (br.size + projectile.size) * 0.45) continue;
      br.hp = 0;
      hit = true;
      break;
    }
    if (!hit) {
      for (const enemy of activeEnemies) {
        if (!game.isEnemyFriendlyToPlayer || !game.isEnemyFriendlyToPlayer(enemy)) continue;
        if (enemy.type === "skeleton_warrior" && enemy.collapsed) continue;
        if (vecLength(projectile.x - enemy.x, projectile.y - enemy.y) >= (enemy.size + projectile.size) * 0.5) continue;
        const rawDamage = Number.isFinite(projectile.damage) ? projectile.damage : game.config.enemy.sonyaFireballDamage || 18;
        game.applyEnemyDamage(enemy, rawDamage * game.getEnemyDamageScale(), "fire", projectile.ownerId || null);
        hit = true;
        break;
      }
    }
    if (!hit) {
      for (const player of getLivingPlayers()) {
        if (vecLength(projectile.x - player.x, projectile.y - player.y) >= ((player.size || game.player.size) + projectile.size) * 0.5) continue;
        const rawDamage = Number.isFinite(projectile.damage) ? projectile.damage : game.config.enemy.sonyaFireballDamage || 18;
        const scaledEnemyDamage = rawDamage * game.getEnemyDamageScale();
        damagePlayer(player, scaledEnemyDamage, "fire");
        if (scaledEnemyDamage > 0 && player.health <= 0 && projectile.ownerId === "sonya") game.gameOverTitle = "Haley Wins";
        hit = true;
        break;
      }
    }
    if (hit) {
      if (projectile.leaveFirePatch) {
        game.fireZones.push({
          x: projectile.x,
          y: projectile.y,
          radius: (game.config.enemy.sonyaFirePatchRadiusTiles || 1.1) * (game.config.map?.tile || 32),
          life: game.config.enemy.sonyaFirePatchDuration || 3.6,
          zoneType: "sonyaFire",
          ownerId: projectile.ownerId || null,
          dps: game.config.enemy.sonyaFirePatchDps || 14,
          tickInterval: 0.35,
          tickTimer: 0.05
        });
      }
      projectile.life = 0;
    }
    return true;
  }
  return false;
}

export function finalizeProjectilesAndTransientState(game) {
  for (const bullet of game.bullets) {
    if (bullet.projectileType === "deathBolt" && bullet.pendingDeathBoltExplosion) {
      game.triggerDeathBoltExplosion(bullet.x, bullet.y, bullet);
      bullet.life = 0;
      bullet.pendingDeathBoltExplosion = false;
    }
    if (bullet.projectileType === "deathBolt" && bullet.life > 0 && game.isWallAt(bullet.x, bullet.y, false)) {
      game.triggerDeathBoltExplosion(bullet.x, bullet.y, bullet);
      bullet.life = 0;
    }
    if (bullet.projectileType === "sonyaFireball" && bullet.life > 0 && game.isWallAt(bullet.x, bullet.y, false)) {
      if (bullet.leaveFirePatch) {
        game.fireZones.push({
          x: bullet.x,
          y: bullet.y,
          radius: (game.config.enemy.sonyaFirePatchRadiusTiles || 1.1) * (game.config.map?.tile || 32),
          life: game.config.enemy.sonyaFirePatchDuration || 3.6,
          zoneType: "sonyaFire",
          ownerId: bullet.ownerId || null,
          dps: game.config.enemy.sonyaFirePatchDps || 14,
          tickInterval: 0.35,
          tickTimer: 0.05
        });
      }
      bullet.life = 0;
    }
  }
  game.bullets = game.bullets.filter((bullet) => !game.isWallAt(bullet.x, bullet.y, false) && bullet.life > 0);
  for (const arrow of game.fireArrows) {
    if (arrow.life <= 0 || game.isWallAt(arrow.x, arrow.y, false)) {
      game.triggerFireExplosion(arrow.x, arrow.y, arrow);
      arrow.life = 0;
    }
  }
  game.fireArrows = game.fireArrows.filter((arrow) => arrow.life > 0);
  game.drops = game.drops.filter((drop) => drop.life > 0);
  game.fireZones = game.fireZones.filter((zone) => zone.life > 0);
  game.meleeSwings = game.meleeSwings.filter((swing) => swing.life > 0);
}
