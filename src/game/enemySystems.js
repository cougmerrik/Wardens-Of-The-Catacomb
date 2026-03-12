import { vecLength } from "../utils.js";

export function spawnGhost(game, x, y) {
  const hp = game.rollScaledEnemyHealth(game.config.enemy.ghostHpMin, game.config.enemy.ghostHpMax);
  return {
    type: "ghost",
    x,
    y,
    size: 20,
    speed: 85 + Math.random() * 35,
    hp,
    maxHp: hp,
    hpBarTimer: 0,
    damageMin: game.config.enemy.ghostDamageMin,
    damageMax: game.config.enemy.ghostDamageMax
  };
}

export function spawnTreasureGoblin(game, x, y) {
  const hp = game.rollScaledEnemyHealth(game.config.enemy.goblinHpMin, game.config.enemy.goblinHpMax);
  return {
    type: "goblin",
    x,
    y,
    size: 16,
    speed: 95,
    hp,
    maxHp: hp,
    hpBarTimer: 0,
    damageMin: game.config.enemy.goblinDamageMin,
    damageMax: game.config.enemy.goblinDamageMax,
    goldEaten: 0,
    aggression: 0.12,
    wanderAngle: Math.random() * Math.PI * 2,
    wanderTimer: 0.5 + Math.random() * 0.8
  };
}

export function spawnAnimatedArmor(game, x, y) {
  const hp = game.rollScaledEnemyHealth(game.config.enemy.armorHpMin, game.config.enemy.armorHpMax);
  return {
    type: "armor",
    x,
    y,
    size: 24,
    speed: game.config.enemy.armorSpeed,
    hp,
    maxHp: hp,
    hpBarTimer: 0,
    damageMin: game.config.enemy.armorDamageMin,
    damageMax: game.config.enemy.armorDamageMax
  };
}

export function isGoldDrop(drop) {
  return drop.type === "gold" || drop.type === "gold_bag";
}

export function findNearestGoldDrop(game, x, y) {
  let nearest = null;
  let nearestDist = Number.POSITIVE_INFINITY;
  for (const drop of game.drops) {
    if (!isGoldDrop(drop) || drop.life <= 0) continue;
    const d = vecLength(drop.x - x, drop.y - y);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = drop;
    }
  }
  return nearest;
}

export function applyGoblinGrowth(game, goblin, goldAmount) {
  goblin.goldEaten += goldAmount;
  goblin.maxHp = Math.min(48, 2 + Math.floor(goblin.goldEaten * 0.7));
  goblin.hp = Math.min(goblin.maxHp, goblin.hp + 1 + Math.floor(goldAmount * 0.3));
  goblin.speed = Math.min(210, 95 + goblin.goldEaten * 1.5);
  const baseMin = Number.isFinite(goblin.damageMin) ? goblin.damageMin : game.config.enemy.goblinDamageMin;
  const baseMax = Number.isFinite(goblin.damageMax) ? goblin.damageMax : game.config.enemy.goblinDamageMax;
  const growth = Math.floor(goblin.goldEaten / 8);
  goblin.damageMin = Math.min(28, baseMin + growth);
  goblin.damageMax = Math.min(36, baseMax + growth * 2);
  goblin.size = Math.min(30, 16 + Math.floor(goblin.goldEaten / 5));
  goblin.aggression = Math.min(1, 0.12 + goblin.goldEaten / 60);
}

export function updateGoblin(game, enemy, dt, speedScale) {
  const isStrong = enemy.goldEaten >= game.config.enemy.goblinStrongGoldThreshold;
  const toPlayerX = game.player.x - enemy.x;
  const toPlayerY = game.player.y - enemy.y;
  const playerDist = vecLength(toPlayerX, toPlayerY) || 1;
  const awayPlayerX = -toPlayerX / playerDist;
  const awayPlayerY = -toPlayerY / playerDist;
  const targetGold = findNearestGoldDrop(game, enemy.x, enemy.y);

  if (targetGold) {
    const toGoldX = targetGold.x - enemy.x;
    const toGoldY = targetGold.y - enemy.y;
    const goldLen = vecLength(toGoldX, toGoldY) || 1;
    let dirX = toGoldX / goldLen;
    let dirY = toGoldY / goldLen;
    if (!isStrong && playerDist < game.config.enemy.goblinFearRadius) {
      dirX = dirX * 0.75 + awayPlayerX * 0.25;
      dirY = dirY * 0.75 + awayPlayerY * 0.25;
    }
    const dirLen = vecLength(dirX, dirY) || 1;
    game.moveWithCollision(enemy, (dirX / dirLen) * enemy.speed * speedScale * dt, (dirY / dirLen) * enemy.speed * speedScale * dt);
    if (goldLen < enemy.size * 0.45 + targetGold.size * 0.75) {
      targetGold.life = 0;
      applyGoblinGrowth(game, enemy, targetGold.amount);
    }
    return;
  }

  if (!isStrong && playerDist < game.config.enemy.goblinFearRadius * 1.2) {
    game.moveWithCollision(enemy, awayPlayerX * enemy.speed * speedScale * dt, awayPlayerY * enemy.speed * speedScale * dt);
    enemy.wanderAngle = Math.atan2(awayPlayerY, awayPlayerX);
    return;
  }

  enemy.wanderTimer -= dt;
  if (enemy.wanderTimer <= 0) {
    enemy.wanderTimer = 0.6 + Math.random() * 1.2;
    enemy.wanderAngle += (Math.random() - 0.5) * 1.8;
  }

  const pursueX = toPlayerX / playerDist;
  const pursueY = toPlayerY / playerDist;
  const wanderX = Math.cos(enemy.wanderAngle);
  const wanderY = Math.sin(enemy.wanderAngle);
  const vx = wanderX * (1 - enemy.aggression) + pursueX * enemy.aggression;
  const vy = wanderY * (1 - enemy.aggression) + pursueY * enemy.aggression;
  const len = vecLength(vx, vy) || 1;
  game.moveWithCollision(enemy, (vx / len) * enemy.speed * speedScale * dt, (vy / len) * enemy.speed * speedScale * dt);
  enemy.wanderAngle = Math.atan2(vy, vx);
}

export function xpFromEnemy(game, enemy) {
  const baseXp = enemy.type === "armor" ? 24 : enemy.type === "goblin" ? 12 + Math.floor(enemy.goldEaten * 0.6) : 6;
  const level = Number.isFinite(game?.level) ? Math.max(1, game.level) : 1;
  const floor = Number.isFinite(game?.floor) ? Math.max(1, game.floor) : 1;
  const ratio = level / floor;

  let mult = 1;
  if (ratio < 1) {
    mult = 0.7 + 0.3 * ratio;
  } else if (ratio <= 3) {
    // Peak in the 1x-3x band, centered around ~2x.
    mult = 1 + 0.18 * (1 - Math.abs(ratio - 2));
  } else if (ratio < 5) {
    // Steep falloff beyond 3x floor level.
    mult = 1 - 0.45 * (ratio - 3);
  } else {
    mult = 0.05;
  }

  const xp = Math.floor(baseXp * Math.max(0, mult));
  return xp;
}

export function maybeSpawnDrop(game, x, y) {
  const amountMult = game.getGoldDropAmountMultiplier ? game.getGoldDropAmountMultiplier() : 1;
  if (Math.random() < game.getGoldDropRate()) {
    const base = game.config.drops.goldMin + Math.floor(Math.random() * (game.config.drops.goldMax - game.config.drops.goldMin + 1));
    game.drops.push({
      type: "gold",
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      size: 10,
      amount: Math.max(1, Math.floor(base * amountMult)),
      life: game.config.drops.life
    });
  }
  if (Math.random() < game.config.drops.rateHealth) {
    game.drops.push({
      type: "health",
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      size: 12,
      amount: game.config.drops.healthRestore,
      life: game.config.drops.life
    });
  }
}

export function dropTreasureBag(game, x, y, goldEaten) {
  const amountMult = game.getGoldDropAmountMultiplier ? game.getGoldDropAmountMultiplier() : 1;
  const bonus = Math.floor((goldEaten / 100) * game.config.drops.treasureBagBonusGold);
  const baseAmount = game.config.drops.treasureBagBaseGold + bonus + Math.floor(Math.random() * 16);
  game.drops.push({
    type: "gold_bag",
    x,
    y,
    size: 16,
    amount: Math.max(1, Math.floor(baseAmount * amountMult)),
    life: game.config.drops.life + 6
  });
}

export function dropArmorLoot(game, x, y) {
  const amountMult = game.getGoldDropAmountMultiplier ? game.getGoldDropAmountMultiplier() : 1;
  const baseAmount = 35 + Math.floor(Math.random() * 36);
  game.drops.push({
    type: "gold_bag",
    x: x + (Math.random() - 0.5) * 8,
    y: y + (Math.random() - 0.5) * 8,
    size: 18,
    amount: Math.max(1, Math.floor(baseAmount * amountMult)),
    life: game.config.drops.life + 8
  });
  if (Math.random() < game.config.drops.rateHealth * 1.4) {
    game.drops.push({
      type: "health",
      x: x + (Math.random() - 0.5) * 12,
      y: y + (Math.random() - 0.5) * 12,
      size: 12,
      amount: game.config.drops.healthRestore,
      life: game.config.drops.life
    });
  }
}
