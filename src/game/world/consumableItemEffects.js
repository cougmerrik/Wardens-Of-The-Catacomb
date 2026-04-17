import {
  consumeConsumableChargeForEntity,
  getConsumableEffectsForEntity,
  getConsumableSlotForEntity,
  getConsumableTempHpForEntity,
  setConsumableTempHpForEntity
} from "./consumableSupport.js";

function getLowestHealthAllyInRange(game, rangeTiles, { excludeSelf = false, sourceEntity = game.player } = {}) {
  const tile = game.config?.map?.tile || 32;
  const range = Math.max(0, rangeTiles) * tile;
  const players = typeof game.getLivingPlayerEntities === "function" ? game.getLivingPlayerEntities() : [game.player];
  let best = null;
  let bestRatio = Number.POSITIVE_INFINITY;
  for (const player of players) {
    if (!player || (excludeSelf && player === sourceEntity)) continue;
    const dist = Math.hypot((player.x || 0) - (sourceEntity?.x || 0), (player.y || 0) - (sourceEntity?.y || 0));
    if (dist > range) continue;
    const ratio = (Number.isFinite(player.maxHealth) && player.maxHealth > 0) ? (player.health || 0) / player.maxHealth : 1;
    if (ratio < bestRatio) {
      best = player;
      bestRatio = ratio;
    }
  }
  return best;
}

function findNearbyRoomDestination(game, rangeTiles = 20) {
  const tile = game.config?.map?.tile || 32;
  const originTx = Math.floor((game.player?.x || 0) / tile);
  const originTy = Math.floor((game.player?.y || 0) / tile);
  const candidates = [];
  for (let oy = -rangeTiles; oy <= rangeTiles; oy++) {
    for (let ox = -rangeTiles; ox <= rangeTiles; ox++) {
      const tx = originTx + ox;
      const ty = originTy + oy;
      if (!game.isWalkableTile(tx, ty)) continue;
      const dist = Math.hypot(ox, oy);
      if (dist < 3 || dist > rangeTiles) continue;
      let openNeighbors = 0;
      for (let ny = -1; ny <= 1; ny++) {
        for (let nx = -1; nx <= 1; nx++) {
          if (Math.abs(nx) + Math.abs(ny) !== 1) continue;
          if (game.isWalkableTile(tx + nx, ty + ny)) openNeighbors += 1;
        }
      }
      if (openNeighbors < 3) continue;
      candidates.push({ x: tx * tile + tile * 0.5, y: ty * tile + tile * 0.5, score: openNeighbors - dist * 0.03 });
    }
  }
  if (candidates.length <= 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  const topSlice = candidates.slice(0, Math.min(12, candidates.length));
  const chosen = topSlice[Math.floor(Math.random() * topSlice.length)] || topSlice[0] || null;
  return chosen && typeof game.findNearestSafePoint === "function" ? game.findNearestSafePoint(chosen.x, chosen.y, 6) : chosen;
}

function spawnMirageDecoy(game) {
  const maxHealth = Number.isFinite(game.player?.maxHealth) ? game.player.maxHealth : 1;
  const decoy = {
    id: `mirage_${Math.floor((game.time || 0) * 1000)}_${Math.floor(Math.random() * 10000)}`,
    type: "mirageDecoy",
    isMirageDecoy: true,
    x: game.player?.x || 0,
    y: game.player?.y || 0,
    size: Math.max(16, Number.isFinite(game.player?.size) ? game.player.size : 22),
    hp: Math.max(1, maxHealth * 0.2),
    maxHp: Math.max(1, maxHealth * 0.2),
    life: 4,
    ownerId: game.player?.id || null
  };
  if (!Array.isArray(game.mirageDecoys)) game.mirageDecoys = [];
  game.mirageDecoys = game.mirageDecoys.filter((entry) => !!entry && (entry.life || 0) > 0);
  game.mirageDecoys.push(decoy);
  return decoy;
}

function spawnOrReplaceMimicCompanion(game) {
  if (typeof game.spawnMimic !== "function") return false;
  game.enemies = (game.enemies || []).filter((enemy) => !(enemy?.type === "mimic" && enemy?.isSummonedCompanion));
  const tile = game.config?.map?.tile || 32;
  const spawn = typeof game.findNearestSafePoint === "function"
    ? game.findNearestSafePoint((game.player?.x || 0) + tile, game.player?.y || 0, 6)
    : { x: (game.player?.x || 0) + tile, y: game.player?.y || 0 };
  const mimic = game.spawnMimic(spawn.x, spawn.y);
  if (!mimic) return false;
  mimic.dormant = false;
  mimic.revealed = true;
  mimic.homeX = spawn.x;
  mimic.homeY = spawn.y;
  mimic.isSummonedCompanion = true;
  mimic.isControlledUndead = true;
  mimic.controllerPlayerId = game.player?.id || null;
  mimic.controllerExplodingDeathPoints = 0;
  mimic.summonedByPlayer = true;
  mimic.controlledAt = game.time || 0;
  mimic.hpBarTimer = game.config.enemy.hpBarDuration;
  game.enemies.push(mimic);
  return true;
}

function getShieldTempHpAmount(game) {
  return Math.max(1, Math.round((Number.isFinite(game.player?.maxHealth) ? game.player.maxHealth : 1) * 0.1));
}

export function canUseConsumableEffect(game, def) {
  if (!def) return false;
  if (def.key === "regenerationPotion") return (game.player?.health || 0) < (game.player?.maxHealth || 0);
  if (def.key === "potionOfSkill") {
    if (game.isArcherClass && game.isArcherClass()) return !!(game.isFireArrowUnlocked && game.isFireArrowUnlocked());
    if (game.isWarriorClass && game.isWarriorClass()) return !!(game.isWarriorRageUnlocked && game.isWarriorRageUnlocked());
    return (game.skills?.deathBolt?.points || 0) > 0 || (game.necromancerTalents?.deathBoltActive?.points || 0) > 0;
  }
  if (def.key === "blinkDust") return !!findNearbyRoomDestination(game, 20);
  if (def.key === "blessedStones") return !!getLowestHealthAllyInRange(game, 5, { excludeSelf: true, sourceEntity: game.player });
  if (def.key === "guardianBell") return !!getLowestHealthAllyInRange(game, 6, { excludeSelf: true, sourceEntity: game.player });
  return true;
}

export function activateConsumableEffect(game, def, effects) {
  switch (def.key) {
    case "regenerationPotion":
      effects.regenerationPotion.timer = 5;
      effects.regenerationPotion.total = 5;
      effects.regenerationPotion.healPool = Math.max(1, (game.player?.maxHealth || 1) * 0.2);
      return true;
    case "speedPotion":
      effects.speedPotion.timer = 10;
      return true;
    case "timeHook":
      for (const enemy of game.enemies || []) {
        if (!enemy || (enemy.hp || 0) <= 0 || game.isEnemyFriendlyToPlayer(enemy)) continue;
        const slowPct = enemy.isFloorBoss ? 0.3 : 0.7;
        enemy.slowPct = Math.max(enemy.slowPct || 0, slowPct);
        enemy.slowTimer = Math.max(enemy.slowTimer || 0, 8);
      }
      return true;
    case "mirage":
      spawnMirageDecoy(game);
      return true;
    case "blinkDust": {
      const destination = findNearbyRoomDestination(game, 20);
      if (!destination) return false;
      game.player.x = destination.x;
      game.player.y = destination.y;
      game.player.lastX = destination.x;
      game.player.lastY = destination.y;
      if (typeof game.revealAroundPlayer === "function") game.revealAroundPlayer();
      return true;
    }
    case "warBanner":
      game.fireZones.push({
        x: game.player?.x || 0,
        y: game.player?.y || 0,
        radius: (game.config?.map?.tile || 32) * 3,
        life: 10,
        totalLife: 10,
        zoneType: "warBanner",
        ownerId: game.player?.id || null
      });
      return true;
    case "bloodwine":
      effects.bloodwine.timer = 8;
      return true;
    case "potionOfSkill":
      effects.potionOfSkill.timer = 10;
      if (game.isArcherClass && game.isArcherClass()) game.player.fireArrowCooldown = 0;
      else if (game.isWarriorClass && game.isWarriorClass()) game.warriorRageCooldownTimer = 0;
      else if (game.isNecromancerClass && game.isNecromancerClass()) game.player.deathBoltCooldown = 0;
      return true;
    case "frostOil":
      effects.frostOil.timer = 10;
      return true;
    case "fireOil":
      effects.fireOil.timer = 10;
      return true;
    case "spikeGrowth":
      effects.spikeGrowth.timer = 10;
      return true;
    case "shield":
      setConsumableTempHpForEntity(game.player, getConsumableTempHpForEntity(game.player) + getShieldTempHpAmount(game));
      return true;
    case "blessedStones": {
      const ally = getLowestHealthAllyInRange(game, 5, { excludeSelf: true, sourceEntity: game.player });
      if (!ally || typeof game.applyHealingToPlayerEntity !== "function") return false;
      game.applyHealingToPlayerEntity(ally, Math.max(1, (ally.maxHealth || 1) * 0.25));
      return true;
    }
    case "stonebloodBeads":
      effects.stonebloodBeads.timer = 12;
      effects.stonebloodBeads.charges = 4;
      effects.stonebloodBeads.maxCharges = 4;
      return true;
    case "mimicEgg":
      return spawnOrReplaceMimicCompanion(game);
    case "guardianBell":
      effects.guardianBell.timer = 6;
      return true;
    default:
      return false;
  }
}

export function tryMirrorShardReflect(game, entity, projectile) {
  const slot = getConsumableSlotForEntity(game, entity, "mirrorShard", "Passive");
  if (!slot || (slot.count || 0) <= 0 || (slot.cooldownRemaining || 0) > 0 || !projectile) return false;
  const sourceX = Number.isFinite(projectile.x) ? projectile.x : (entity?.x || 0);
  const sourceY = Number.isFinite(projectile.y) ? projectile.y : (entity?.y || 0);
  const targetX = Number.isFinite(projectile.ownerX) ? projectile.ownerX : sourceX - (Number.isFinite(projectile.vx) ? projectile.vx : 0);
  const targetY = Number.isFinite(projectile.ownerY) ? projectile.ownerY : sourceY - (Number.isFinite(projectile.vy) ? projectile.vy : 0);
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.hypot(dx, dy) || 1;
  const speed = Math.max(180, Math.hypot(Number.isFinite(projectile.vx) ? projectile.vx : 0, Number.isFinite(projectile.vy) ? projectile.vy : 0));
  projectile.vx = (dx / len) * speed;
  projectile.vy = (dy / len) * speed;
  projectile.faction = "player";
  projectile.projectileType = "bullet";
  projectile.ownerId = entity?.id || game.player?.id || null;
  projectile.hitTargets = new Set();
  const rawDamage = Number.isFinite(projectile.damage) ? projectile.damage : game.rollEnemyContactDamage({ damageMin: projectile.damageMin, damageMax: projectile.damageMax });
  projectile.damage = rawDamage * 0.5;
  slot.cooldownRemaining = 8;
  consumeConsumableChargeForEntity(game, entity, slot, "Passive");
  if (typeof game.spawnFloatingText === "function" && entity) game.spawnFloatingText(entity.x, entity.y - 28, "Mirror", "#b7d8ff", 0.9, 14);
  return true;
}

export function applyPrimaryAttackConsumableBenefits(game, ownerEntity, damageDealt, killedEnemy = false) {
  if (!ownerEntity || !Number.isFinite(damageDealt) || damageDealt <= 0) return;
  const effects = getConsumableEffectsForEntity(game, ownerEntity);
  if ((effects.bloodwine?.timer || 0) > 0 && typeof game.applyHealingToPlayerEntity === "function") {
    game.applyHealingToPlayerEntity(ownerEntity, damageDealt * 0.2, { suppressText: true });
  }
  if (!killedEnemy) return;
  const slot = getConsumableSlotForEntity(game, ownerEntity, "soulBattery", "Passive");
  if (!slot || (slot.count || 0) <= 0 || (slot.cooldownRemaining || 0) > 0) return;
  const healAmount = Math.max(1, (ownerEntity.maxHealth || 1) * 0.01);
  const tempHpCap = Math.max(1, (ownerEntity.maxHealth || 1) * 0.05);
  if (typeof game.applyHealingToPlayerEntity === "function") game.applyHealingToPlayerEntity(ownerEntity, healAmount, { suppressText: true });
  setConsumableTempHpForEntity(ownerEntity, Math.min(tempHpCap, getConsumableTempHpForEntity(ownerEntity) + healAmount));
  slot.cooldownRemaining = 3;
}

export function getGuardianBellProtector(game, protectedEntity) {
  if (!protectedEntity || typeof game.getLivingPlayerEntities !== "function") return null;
  const players = game.getLivingPlayerEntities();
  if (!Array.isArray(players) || players.length <= 1) return null;
  let best = null;
  let bestRatio = Number.POSITIVE_INFINITY;
  for (const player of players) {
    if (!player || player === protectedEntity) continue;
    const effects = getConsumableEffectsForEntity(game, player);
    if ((effects.guardianBell?.timer || 0) <= 0) continue;
    if (getLowestHealthAllyInRange(game, 6, { excludeSelf: true, sourceEntity: player }) !== protectedEntity) continue;
    const ratio = (Number.isFinite(player.maxHealth) && player.maxHealth > 0) ? (player.health || 0) / player.maxHealth : 1;
    if (ratio < bestRatio) {
      best = player;
      bestRatio = ratio;
    }
  }
  return best;
}
