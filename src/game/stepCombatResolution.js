import { vecLength } from "../utils.js";
import { finalizeProjectilesAndTransientState, resolveSpecialProjectileCollision } from "./stepCombatProjectileSpecials.js";
import { getNecromancerPlaguecraftRiseChance, getNecromancerRotDps, getNecromancerRotDuration, hasNecromancerHarvester, hasNecromancerPlaguecraftRot, isNecromancerTalentGame } from "./necromancerTalentTree.js";
import { hasWarriorSpellknight } from "./warriorTalentTree.js";
import { hasRangerTalent } from "./rangerTalentTree.js";
import { spawnGhost, spawnSkeleton } from "./enemySpawnFactories.js";

export function resolveCombatAndDrops({
  game,
  dt,
  activeEnemies,
  activeBreakables,
  playerEnemyRadius,
  isActive,
  segmentRectHit,
  skeletonIgnoresArrow
}) {
  const getLivingPlayers = () => (typeof game.getLivingPlayerEntities === "function" ? game.getLivingPlayerEntities() : [game.player]);
  const damagePlayer = (player, amount, type = "physical", source = null) => {
    if (!player || amount <= 0) return;
    const resolved = typeof game.getDamageTakenForPlayerEntity === "function" ? game.getDamageTakenForPlayerEntity(player, amount, type, source) : amount;
    if (typeof game.applyDamageToPlayerEntity === "function") game.applyDamageToPlayerEntity(player, resolved, type, source);
    else game.applyPlayerDamage(resolved);
  };
  const healPlayer = (player, amount) => {
    if (!player || amount <= 0) return;
    if (typeof game.applyHealingToPlayerEntity === "function") game.applyHealingToPlayerEntity(player, amount);
    else if (player === game.player) game.applyPlayerHealing(amount);
  };
  const getRewardOwner = (enemy) => {
    const ownerId = typeof enemy?.lastDamageOwnerId === "string" && enemy.lastDamageOwnerId ? enemy.lastDamageOwnerId : null;
    const owner = typeof game.getPlayerEntityById === "function" ? game.getPlayerEntityById(ownerId) : null;
    const fallbackOwner = typeof game.isLivingPlayerEntity === "function"
      ? (game.isLivingPlayerEntity(game.player) ? game.player : null)
      : game.player;
    const resolvedOwner = owner || fallbackOwner;
    if (!resolvedOwner) return null;
    if (typeof game.isLivingPlayerEntity === "function" && !game.isLivingPlayerEntity(resolvedOwner)) return null;
    return resolvedOwner;
  };

  for (const b of game.bullets) {
    if (!isActive(b, 180)) {
      b.life = 0;
      continue;
    }
    if (b.homing && b.faction !== "enemy") {
      let target = null;
      let best = Number.POSITIVE_INFINITY;
      const range = Number.isFinite(b.range) ? b.range : game.config.map.tile * 8;
      const originX = Number.isFinite(b.homingOriginX) ? b.homingOriginX : b.x;
      const originY = Number.isFinite(b.homingOriginY) ? b.homingOriginY : b.y;
      const dirLen = vecLength(b.homingDirX || 0, b.homingDirY || 0);
      const dirX = dirLen > 0 ? (b.homingDirX || 0) / dirLen : Math.cos(b.angle || 0);
      const dirY = dirLen > 0 ? (b.homingDirY || 0) / dirLen : Math.sin(b.angle || 0);
      const coneCos = Number.isFinite(b.homingConeCos) ? b.homingConeCos : -1;
      for (const enemy of activeEnemies) {
        if (!enemy || (enemy.hp || 0) <= 0 || (game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy))) continue;
        const originDist = vecLength((enemy.x || 0) - originX, (enemy.y || 0) - originY);
        if (originDist > range) continue;
        if (coneCos > -1 && originDist > 0) {
          const dot = (((enemy.x || 0) - originX) / originDist) * dirX + (((enemy.y || 0) - originY) / originDist) * dirY;
          if (dot < coneCos) continue;
        }
        const dist = vecLength((enemy.x || 0) - (b.x || 0), (enemy.y || 0) - (b.y || 0));
        if (dist >= best) continue;
        target = enemy;
        best = dist;
      }
      if (target) {
        const speed = vecLength(b.vx || 0, b.vy || 0) || 320;
        const dx = (target.x || 0) - (b.x || 0);
        const dy = (target.y || 0) - (b.y || 0);
        const len = vecLength(dx, dy) || 1;
        b.vx = (dx / len) * speed;
        b.vy = (dy / len) * speed;
        b.angle = Math.atan2(b.vy, b.vx);
      }
    }
    const prevX = b.x;
    const prevY = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.prevXForHit = prevX;
    b.prevYForHit = prevY;
    b.life -= dt;
    if (b.projectileType === "deathBolt" && Number.isFinite(b.detonateX) && Number.isFinite(b.detonateY)) {
      const remaining = vecLength((b.detonateX || 0) - b.x, (b.detonateY || 0) - b.y);
      const stepDistance = vecLength(b.x - prevX, b.y - prevY);
      if (remaining <= Math.max(b.size || 10, stepDistance)) {
        b.x = b.detonateX;
        b.y = b.detonateY;
        b.pendingDeathBoltExplosion = true;
      }
    }
    if (b.projectileType === "mage_fireball" && Number.isFinite(b.detonateX) && Number.isFinite(b.detonateY)) {
      const remaining = vecLength((b.detonateX || 0) - b.x, (b.detonateY || 0) - b.y);
      const stepDistance = vecLength(b.x - prevX, b.y - prevY);
      if (remaining <= Math.max(b.size || 10, stepDistance)) {
        b.x = b.detonateX;
        b.y = b.detonateY;
        if (typeof game.triggerMageFireballExplosion === "function") game.triggerMageFireballExplosion(b.x, b.y, b);
        b.life = 0;
      }
    }
    for (const br of activeBreakables) {
      if ((br.hp || 0) <= 0) continue;
      const half = (br.size || 20) * 0.5 + (b.size || 6) * 0.5;
      if (segmentRectHit(prevX, prevY, b.x, b.y, br.x - half, br.y - half, br.x + half, br.y + half)) {
        if (b.projectileType !== "trapArrow") br.hp = 0;
        if (b.projectileType === "mage_fireball" && typeof game.triggerMageFireballExplosion === "function") game.triggerMageFireballExplosion(b.x, b.y, b);
        b.life = 0;
        break;
      }
    }
    if (b.faction === "enemy") continue;
  }
  for (const a of game.fireArrows) {
    if (!isActive(a, 220)) {
      a.life = 0;
      continue;
    }
    const prevX = a.x;
    const prevY = a.y;
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.life -= dt;
    if (Number.isFinite(a.detonateX) && Number.isFinite(a.detonateY)) {
      const remaining = vecLength((a.detonateX || 0) - a.x, (a.detonateY || 0) - a.y);
      const stepDistance = vecLength(a.x - prevX, a.y - prevY);
      if (remaining <= Math.max(a.size || 8, stepDistance)) {
        a.x = a.detonateX;
        a.y = a.detonateY;
        game.triggerFireExplosion(a.x, a.y, a);
        a.life = 0;
        continue;
      }
    }
    for (const br of activeBreakables) {
      if ((br.hp || 0) <= 0) continue;
      const half = (br.size || 20) * 0.5 + (a.size || 8) * 0.5;
      if (segmentRectHit(prevX, prevY, a.x, a.y, br.x - half, br.y - half, br.x + half, br.y + half)) {
        br.hp = 0;
        game.triggerFireExplosion(a.x, a.y, a);
        a.life = 0;
        break;
      }
    }
  }
  for (const d of game.drops) d.life -= dt;
  for (const z of game.fireZones) z.life -= dt;
  for (const s of game.meleeSwings) s.life -= dt;

  finalizeProjectilesAndTransientState(game);

  for (const b of game.bullets) {
    if (b.life <= 0) continue;
    if (b.visualOnly) continue;
    if (!b.faction || b.faction !== "enemy") {
      for (const zone of game.fireZones || []) {
        if (!zone || zone.life <= 0 || zone.zoneType !== "pinningFire") continue;
        const dx = (b.x || 0) - (zone.x || 0);
        const dy = (b.y || 0) - (zone.y || 0);
        if (Math.hypot(dx, dy) <= (zone.radius || 0) + (b.size || 6) * 0.5) {
          b.passedPinningFire = true;
          break;
        }
      }
    }
    if (resolveSpecialProjectileCollision({
      game,
      projectile: b,
      activeEnemies,
      activeBreakables,
      getLivingPlayers,
      playerEnemyRadius,
      damagePlayer,
      skeletonIgnoresArrow
    })) {
      continue;
    }
    if (!b.hitTargets) b.hitTargets = new Set();
    if (b.faction === "enemy") {
      for (const enemy of activeEnemies) {
        if (!game.isEnemyFriendlyToPlayer || !game.isEnemyFriendlyToPlayer(enemy)) continue;
        if (enemy.type === "skeleton_warrior" && enemy.collapsed) continue;
        if (vecLength(b.x - enemy.x, b.y - enemy.y) < (enemy.size + b.size) * 0.5) {
          const rawDamage = Number.isFinite(b.damage) ? b.damage : game.config.enemy.necromancerProjectileDamage || 16;
          game.applyEnemyDamage(enemy, rawDamage * game.getEnemyDamageScale(), b.damageType || "necrotic", b.ownerId || null);
          b.life = 0;
          break;
        }
      }
      if (b.life <= 0) continue;
      let reflected = false;
      for (const player of getLivingPlayers()) {
        if (vecLength(b.x - player.x, b.y - player.y) >= ((player.size || game.player.size) + b.size) * 0.5) continue;
        if (typeof game.getWarriorMissileProtectorForPlayerEntity === "function" && typeof game.tryReflectMissileForPlayerEntity === "function") {
          const protector = game.getWarriorMissileProtectorForPlayerEntity(player);
          if (protector && game.tryReflectMissileForPlayerEntity(protector, b, protector)) {
            reflected = true;
            break;
          }
        }
        const rawDamage = Number.isFinite(b.damage) ? b.damage : game.config.enemy.necromancerProjectileDamage || 16;
        const scaledEnemyDamage = rawDamage * game.getEnemyDamageScale();
        damagePlayer(player, scaledEnemyDamage, b.damageType || "necrotic");
        b.life = 0;
        break;
      }
      if (reflected) continue;
      continue;
    }
    for (const br of activeBreakables) {
      if (b.hitTargets.has(br)) continue;
      if (vecLength(b.x - br.x, b.y - br.y) < (br.size + b.size) * 0.45) {
        br.hp = 0;
        b.hitTargets.add(br);
        b.life = 0;
        break;
      }
    }
    if (b.life <= 0) continue;
    for (const enemy of activeEnemies) {
      if (game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy)) continue;
      if (enemy.type === "skeleton_warrior" && enemy.collapsed) continue;
      if (b.hitTargets.has(enemy)) continue;
      const projectileHitRadius = (enemy.size + b.size) * 0.5;
      const hitPrevX = Number.isFinite(b.prevXForHit) ? b.prevXForHit : b.x;
      const hitPrevY = Number.isFinite(b.prevYForHit) ? b.prevYForHit : b.y;
      const hitDistance = b.useSegmentHit
        ? (() => {
          const sx = b.x - hitPrevX;
          const sy = b.y - hitPrevY;
          const lenSq = sx * sx + sy * sy;
          if (lenSq <= 0.001) return vecLength(b.x - enemy.x, b.y - enemy.y);
          const t = Math.max(0, Math.min(1, (((enemy.x || 0) - hitPrevX) * sx + ((enemy.y || 0) - hitPrevY) * sy) / lenSq));
          return vecLength((hitPrevX + sx * t) - enemy.x, (hitPrevY + sy * t) - enemy.y);
        })()
        : vecLength(b.x - enemy.x, b.y - enemy.y);
      if (hitDistance < projectileHitRadius) {
        if (skeletonIgnoresArrow(enemy)) {
          b.hitTargets.add(enemy);
          continue;
        }
        if (b.projectileType === "mage_fireball") {
          if (typeof game.triggerMageFireballExplosion === "function") game.triggerMageFireballExplosion(b.x, b.y, b);
          b.hitTargets.add(enemy);
          b.life = 0;
          break;
        }
        const isMageProjectile = typeof b.projectileType === "string" && b.projectileType.startsWith("mage_");
        const projectileDamage = isMageProjectile
          ? (Number.isFinite(b.damage) ? b.damage : game.rollPrimaryDamage()) * Math.max(0.01, Number.isFinite(b.damageMult) ? b.damageMult : 1) * Math.max(0.01, Number.isFinite(b.critMultiplier) ? b.critMultiplier : 1)
          : b.projectileType === "holyWave"
          ? (Number.isFinite(b.damage) ? b.damage : game.rollPrimaryDamage()) * Math.max(0.01, Number.isFinite(b.damageMult) ? b.damageMult : 1)
          : typeof game.getRangerArrowDamageAgainst === "function"
          ? game.getRangerArrowDamageAgainst(enemy, b)
          : (Number.isFinite(b.damage) ? b.damage : game.rollPrimaryDamage()) * Math.max(0.01, Number.isFinite(b.damageMult) ? b.damageMult : 1);
        const damageType = typeof b.damageType === "string" && b.damageType ? b.damageType : (b.projectileType === "holyWave" ? "holy" : "arrow");
        game.applyEnemyDamage(enemy, projectileDamage, damageType, b.ownerId || null, { critical: (b.critMultiplier || 1) > 1 });
        if (b.projectileType === "holyWave") {
          if ((b.shockKnockback || 0) > 0) {
            const angle = Number.isFinite(b.angle) ? b.angle : Math.atan2((b.vy || 0), (b.vx || 1));
            const knockbackScale = enemy.isBoss ? 0.35 : 1;
            enemy.vx = (enemy.vx || 0) + Math.cos(angle) * b.shockKnockback * knockbackScale;
            enemy.vy = (enemy.vy || 0) + Math.sin(angle) * b.shockKnockback * knockbackScale;
          }
          if ((b.shockStun || 0) > 0) {
            enemy.hitCooldown = Math.max(enemy.hitCooldown || 0, b.shockStun);
          }
        }
        if (
          b.projectileType === "holyWave" &&
          damageType === "holy" &&
          typeof game.isUndeadEnemy === "function" &&
          game.isUndeadEnemy(enemy) &&
          Number.isFinite(b.undeadDefenseShredPct) &&
          b.undeadDefenseShredPct > 0
        ) {
          enemy.crusaderDefenseShredPct = Math.max(enemy.crusaderDefenseShredPct || 0, b.undeadDefenseShredPct);
          enemy.crusaderDefenseShredTimer = Math.max(enemy.crusaderDefenseShredTimer || 0, 4);
        }
        if (b.projectileType === "holyWave" && b.markOnHit && typeof game.getPlayerEntityById === "function") {
          const owner = game.getPlayerEntityById(b.ownerId || null);
          const hpValue = Number.isFinite(enemy.maxHp) && enemy.maxHp > 0 ? enemy.maxHp : (enemy.hp || 0);
          if (!b.markCandidate || hpValue > (b.markCandidateHp || -Infinity)) {
            b.markCandidate = enemy;
            b.markCandidateHp = hpValue;
            if (owner && typeof game.applyWarriorMark === "function") game.applyWarriorMark(enemy, b.markDuration || 5);
          }
        }
        if (typeof game.applyConsumableOnHitEffects === "function") game.applyConsumableOnHitEffects(enemy, b.ownerId || null);
        if (b.projectileType && String(b.projectileType).startsWith("mage_")) {
          if (b.mageCantrip && (game.necromancerTalents?.battlemage?.points || 0) > 0) {
            const owner = typeof game.getPlayerEntityById === "function" ? game.getPlayerEntityById(b.ownerId || null) : game.player;
            const tile = game.config?.map?.tile || 32;
            if (owner && vecLength((enemy.x || 0) - owner.x, (enemy.y || 0) - owner.y) <= tile * 2) {
              game.applyEnemyDamage(enemy, projectileDamage * 0.25, b.damageType || "arcane", b.ownerId || null);
            }
          }
          if ((b.burnDuration || 0) > 0) {
            enemy.burningTimer = Math.max(enemy.burningTimer || 0, b.burnDuration);
            enemy.burningDps = Math.max(enemy.burningDps || 0, Math.max(1, projectileDamage * 0.18));
          }
          if ((b.slowDuration || 0) > 0 || b.damageType === "cold") {
            enemy.slowTimer = Math.max(enemy.slowTimer || 0, b.slowDuration || 2);
            enemy.slowPct = Math.max(enemy.slowPct || 0, 0.3);
          }
          if ((b.chainCount || 0) > 0) {
            let chainSource = enemy;
            for (let i = 0; i < b.chainCount; i++) {
              let chainTarget = null;
              let bestDist = Number.POSITIVE_INFINITY;
              for (const other of activeEnemies) {
                if (!other || other === chainSource || (other.hp || 0) <= 0 || b.hitTargets.has(other)) continue;
                if (game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(other)) continue;
                const dist = vecLength((other.x || 0) - (chainSource.x || 0), (other.y || 0) - (chainSource.y || 0));
                if (dist > game.config.map.tile * 2.5 || dist >= bestDist) continue;
                bestDist = dist;
                chainTarget = other;
              }
              if (!chainTarget) break;
              game.applyEnemyDamage(chainTarget, projectileDamage * 0.65, b.damageType || "lightning", b.ownerId || null);
              b.hitTargets.add(chainTarget);
              game.fireZones.push({
                x: chainSource.x,
                y: chainSource.y,
                targetX: chainTarget.x,
                targetY: chainTarget.y,
                zoneType: "arcaneChain",
                damageType: b.damageType || "lightning",
                lightRadius: (game.config?.map?.tile || 32) * 1.6,
                lightIntensity: 0.18,
                life: 0.18,
                totalLife: 0.18
              });
              chainSource = chainTarget;
            }
          }
          if ((b.shockStunChance || 0) > 0 && !(enemy.isBoss || enemy.isFloorBoss) && Math.random() < b.shockStunChance) {
            enemy.hitCooldown = Math.max(enemy.hitCooldown || 0, b.shockStunDuration || 0.2);
            enemy.stunTimer = Math.max(enemy.stunTimer || 0, b.shockStunDuration || 0.2);
          }
          if (b.wildInfusion === "burning") {
            enemy.burningTimer = Math.max(enemy.burningTimer || 0, 3);
            enemy.burningDps = Math.max(enemy.burningDps || 0, Math.max(1, projectileDamage * 0.16));
          } else if (b.wildInfusion === "poison") {
            enemy.poisonSlowTimer = Math.max(enemy.poisonSlowTimer || 0, 3);
            enemy.slowPct = Math.max(enemy.slowPct || 0, 0.2);
          } else if (b.wildInfusion === "cold") {
            enemy.slowTimer = Math.max(enemy.slowTimer || 0, 2.5);
            enemy.slowPct = Math.max(enemy.slowPct || 0, 0.3);
          }
          if (b.projectileType === "mage_chromaticOrb" && b.runicRefraction && !b.runicRefractionSpent) {
            b.runicRefractionSpent = true;
            const elements = ["fire", "cold", "lightning"].filter((element) => element !== b.damageType);
            const baseAngle = Number.isFinite(b.angle) ? b.angle : Math.atan2(b.vy || 0, b.vx || 1);
            const speed = vecLength(b.vx || 0, b.vy || 0) || 430;
            elements.slice(0, 2).forEach((element, index) => {
              const angle = baseAngle + (index === 0 ? -0.32 : 0.32);
              game.bullets.push({
                ...b,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                angle,
                damage: Math.max(1, projectileDamage * 0.55),
                size: Math.max(5, (b.size || 9) * 0.72),
                damageType: element,
                chromaticElement: element,
                runicRefraction: false,
                wildSplitClone: true,
                hitTargets: new Set([enemy])
              });
            });
          }
          if (typeof game.applyMageOnHitEffects === "function") game.applyMageOnHitEffects(enemy, { status: b.wildInfusion || b.damageType || "", runesConsumed: b.runesConsumed || 0 });
        }
        if (b.projectileType === "mage_frostShard" && !b.frostShardSplinter) {
          const baseAngle = Number.isFinite(b.angle) ? b.angle : Math.atan2(b.vy || 0, b.vx || 1);
          const speed = vecLength(b.vx || 0, b.vy || 0) || 250;
          for (const offset of [-0.5, 0.5]) {
            const angle = baseAngle + offset;
            game.bullets.push({
              x: b.x,
              y: b.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              angle,
              life: 0.55,
              size: Math.max(4, (b.size || 7) * 0.82),
              damage: Math.max(1, projectileDamage * 0.45),
              projectileType: "mage_frostShard",
              damageType: "cold",
              ownerId: b.ownerId || null,
              slowDuration: Math.max(2, (b.slowDuration || 5) * 0.6),
              knockback: Math.max(8, (b.knockback || 24) * 0.55),
              mageCantrip: b.mageCantrip || "frostShardCantrip",
              frostShardSplinter: true,
              hitTargets: new Set([enemy])
            });
          }
        }
        if (b.projectileType !== "holyWave" && typeof game.applyRangerOnHitEffects === "function") game.applyRangerOnHitEffects(enemy, b.x, b.y);
        if (Number.isFinite(b.knockback) && b.knockback > 0) {
          const len = vecLength((enemy.x || 0) - (b.x || 0), (enemy.y || 0) - (b.y || 0)) || 1;
          enemy.vx = (enemy.vx || 0) + (((enemy.x || 0) - (b.x || 0)) / len) * b.knockback;
          enemy.vy = (enemy.vy || 0) + (((enemy.y || 0) - (b.y || 0)) / len) * b.knockback;
        }
        b.hitTargets.add(enemy);
        b.linebreakerHits = (Number.isFinite(b.linebreakerHits) ? b.linebreakerHits : 0) + 1;
        if (Number.isFinite(b.maxHitsPerFrame) && b.hitTargets.size >= b.maxHitsPerFrame) {
          b.life = 0;
          break;
        }
        if (b.projectileType === "holyWave" || b.pierce) {
          // Piercing projectiles travel through enemies once per target.
        } else if (b.predatorPierce) {
          b.predatorPierce = false;
        } else if (Math.random() >= game.getPiercingChance()) {
          b.life = 0;
        }
        if (!b.pierce) break;
      }
    }
  }

  for (const arrow of game.fireArrows) {
    if (arrow.life <= 0) continue;
    let hit = false;
    for (const br of activeBreakables) {
      if (vecLength(arrow.x - br.x, arrow.y - br.y) < (br.size + arrow.size) * 0.45) {
        hit = true;
        br.hp = 0;
        break;
      }
    }
    if (hit) {
      game.triggerFireExplosion(arrow.x, arrow.y, arrow);
      arrow.life = 0;
      continue;
    }
    for (const enemy of activeEnemies) {
      if (game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy)) continue;
      if (enemy.type === "skeleton_warrior" && enemy.collapsed) continue;
      if (vecLength(arrow.x - enemy.x, arrow.y - enemy.y) < (enemy.size + arrow.size) * 0.5) {
        if (skeletonIgnoresArrow(enemy)) continue;
        hit = true;
        break;
      }
    }
    if (hit) {
      game.triggerFireExplosion(arrow.x, arrow.y, arrow);
      arrow.life = 0;
    }
  }
  game.fireArrows = game.fireArrows.filter((arrow) => arrow.life > 0);

  for (const zone of game.fireZones) {
    if (!isActive(zone, zone.radius || 0)) continue;
    if (zone.followOwner) {
      const owner = typeof game.getPlayerEntityById === "function"
        ? (game.getPlayerEntityById(zone.ownerId || null) || (((zone.ownerId || null) === (game.player?.id || null) || !zone.ownerId) ? game.player : null))
        : game.player;
      if (owner) {
        zone.x = owner.x;
        zone.y = owner.y;
      }
    }
    if (zone.zoneType === "deathBolt") {
      zone.pulseTimer = Math.max(-4, (Number.isFinite(zone.pulseTimer) ? zone.pulseTimer : (game.config.deathBolt?.pulseInterval || 1)) - dt);
      while (zone.life > 0 && zone.pulseTimer <= 0) {
        if (typeof game.applyDeathBoltPulse === "function") game.applyDeathBoltPulse(zone.x, zone.y, zone);
        zone.pulseTimer += game.config.deathBolt?.pulseInterval || 1;
      }
      continue;
    }
    if (zone.zoneType === "acid" || zone.zoneType === "bloodPool") {
      const touchDamage = () => {
        const multiplier = Number.isFinite(zone.damageMultiplier) ? Math.max(0, zone.damageMultiplier) : 0.2;
        const rawDamage = typeof game.rollWallTrapDamage === "function"
          ? game.rollWallTrapDamage()
          : game.rollEnemyContactDamage({ damageMin: zone.damageMin, damageMax: zone.damageMax });
        return rawDamage * game.getEnemyDamageScale() * multiplier;
      };
      const touchingPlayer = vecLength(zone.x - game.player.x, zone.y - game.player.y) < zone.radius + playerEnemyRadius * 0.8;
      if (touchingPlayer && !zone.touchingPlayer) {
        const reducedByDefense = Math.max(1, Math.round(touchDamage() - game.getDefenseFlatReduction()));
        game.applyPlayerDamage(game.getWarriorRageDamageTaken(reducedByDefense));
      }
      zone.touchingPlayer = touchingPlayer;
      if (!zone.touches || typeof zone.touches.add !== "function") zone.touches = new WeakSet();
      for (const enemy of activeEnemies) {
        if (!(game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy))) continue;
        if (enemy.type === "skeleton_warrior" && enemy.collapsed) continue;
        const touching = vecLength(zone.x - enemy.x, zone.y - enemy.y) < zone.radius + enemy.size * 0.35;
        if (touching) {
          if (!zone.touches.has(enemy)) {
            game.applyEnemyDamage(enemy, touchDamage(), "acid");
            zone.touches.add(enemy);
          }
        } else {
          zone.touches.delete(enemy);
        }
      }
      continue;
    }
    if (zone.zoneType === "sonyaFire") {
      const tickInterval = Math.max(0.12, zone.tickInterval || 0.35);
      zone.tickTimer = Math.max(-2, (Number.isFinite(zone.tickTimer) ? zone.tickTimer : tickInterval) - dt);
      for (const br of activeBreakables) {
        if (vecLength(zone.x - br.x, zone.y - br.y) < zone.radius + br.size * 0.32) br.hp = 0;
      }
      while (zone.life > 0 && zone.tickTimer <= 0) {
        const pulseDamage = (zone.dps || game.config.enemy.sonyaFirePatchDps || 14) * tickInterval * game.getEnemyDamageScale();
        for (const player of getLivingPlayers()) {
          const playerRadius = typeof game.getPlayerEnemyCollisionRadiusFor === "function" ? game.getPlayerEnemyCollisionRadiusFor(player) : playerEnemyRadius;
          if (vecLength(zone.x - player.x, zone.y - player.y) >= zone.radius + playerRadius * 0.8) continue;
          damagePlayer(player, pulseDamage, "fire");
          if (player.health <= 0 && zone.ownerId === "sonya") game.gameOverTitle = "Haley Wins";
        }
        for (const enemy of activeEnemies) {
          if (!(game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy))) continue;
          if (enemy.type === "skeleton_warrior" && enemy.collapsed) continue;
          if (vecLength(zone.x - enemy.x, zone.y - enemy.y) < zone.radius + enemy.size * 0.35) {
            game.applyEnemyDamage(enemy, pulseDamage, "fire", zone.ownerId || null);
          }
        }
        zone.tickTimer += tickInterval;
      }
      continue;
    }
    if (zone.zoneType === "golemCollapseWarning" || zone.zoneType === "golemCollapseImpact") {
      if (!zone.struck && zone.life <= (zone.strikeAt || 0)) {
        const rawDamage = game.rollEnemyContactDamage({
          damageMin: zone.damageMin,
          damageMax: zone.damageMax
        });
        const pulseDamage = rawDamage * game.getEnemyDamageScale();
        for (const br of activeBreakables) {
          if (vecLength(zone.x - br.x, zone.y - br.y) < (zone.radius || 0) + br.size * 0.35) br.hp = 0;
        }
        for (const player of getLivingPlayers()) {
          const playerRadius = typeof game.getPlayerEnemyCollisionRadiusFor === "function" ? game.getPlayerEnemyCollisionRadiusFor(player) : playerEnemyRadius;
          if (vecLength(zone.x - player.x, zone.y - player.y) >= (zone.radius || 0) + playerRadius * 0.8) continue;
          damagePlayer(player, pulseDamage, "physical");
        }
        for (const enemy of activeEnemies) {
          if (!(game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy))) continue;
          if (enemy.type === "skeleton_warrior" && enemy.collapsed) continue;
          if (vecLength(zone.x - enemy.x, zone.y - enemy.y) < (zone.radius || 0) + enemy.size * 0.35) {
            game.applyEnemyDamage(enemy, pulseDamage, "physical", zone.ownerId || null);
          }
        }
        zone.struck = true;
        zone.zoneType = "golemCollapseImpact";
        zone.life = Math.max(0.12, zone.impactLife || 0.4);
      }
      continue;
    }
    if (zone.zoneType === "crusaderAura" || zone.zoneType === "warCircle") {
      const tickInterval = Math.max(0.15, zone.tickInterval || 0.3);
      zone.tickTimer = Math.max(-2, (Number.isFinite(zone.tickTimer) ? zone.tickTimer : tickInterval) - dt);
      while (zone.life > 0 && zone.tickTimer <= 0) {
        const baseDps = Number.isFinite(zone.dps) ? zone.dps : 10;
        const pulseDamageBase = baseDps * tickInterval;
        const undeadMult = Number.isFinite(zone.undeadDamageMultiplier) ? zone.undeadDamageMultiplier : 1.5;
        const shredPct = Number.isFinite(zone.defenseShredPct) ? zone.defenseShredPct : 0;
        const damageType = typeof zone.damageType === "string" && zone.damageType ? zone.damageType : "holy";
        for (const enemy of activeEnemies) {
          if (game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy)) continue;
          if (enemy.type === "skeleton_warrior" && enemy.collapsed) continue;
          if (vecLength(zone.x - enemy.x, zone.y - enemy.y) >= zone.radius + enemy.size * 0.35) continue;
          const isUndead = typeof game.isUndeadEnemy === "function" && game.isUndeadEnemy(enemy);
          const pulseDamage = pulseDamageBase * (isUndead && damageType === "holy" ? undeadMult : 1);
          game.applyEnemyDamage(enemy, pulseDamage, damageType, zone.ownerId || null);
          if (isUndead && damageType === "holy" && shredPct > 0) {
            enemy.crusaderDefenseShredPct = Math.max(enemy.crusaderDefenseShredPct || 0, shredPct);
            enemy.crusaderDefenseShredTimer = Math.max(enemy.crusaderDefenseShredTimer || 0, tickInterval + 0.2);
          }
        }
        zone.tickTimer += tickInterval;
      }
      continue;
    }
    if (zone.zoneType === "tempestAura") {
      const tickInterval = Math.max(0.18, zone.tickInterval || 0.33);
      zone.tickTimer = Math.max(-2, (Number.isFinite(zone.tickTimer) ? zone.tickTimer : tickInterval) - dt);
      while (zone.life > 0 && zone.tickTimer <= 0) {
        const damageType = typeof zone.damageType === "string" && zone.damageType ? zone.damageType : "physical";
        const pulseDamage = (Number.isFinite(zone.dps) ? zone.dps : 8) * tickInterval;
        let chainSource = null;
        for (const enemy of activeEnemies) {
          if (game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy)) continue;
          if (enemy.type === "skeleton_warrior" && enemy.collapsed) continue;
          if (vecLength(zone.x - enemy.x, zone.y - enemy.y) >= zone.radius + enemy.size * 0.35) continue;
          game.applyEnemyDamage(enemy, pulseDamage, damageType, zone.ownerId || null);
          if (!chainSource) chainSource = enemy;
        }
        if (zone.chainArc && chainSource) {
          const tile = game.config?.map?.tile || 32;
          let chainTarget = null;
          let bestDist = Number.POSITIVE_INFINITY;
          for (const enemy of activeEnemies) {
            if (!enemy || enemy === chainSource || (enemy.hp || 0) <= 0) continue;
            if (game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy)) continue;
            const dist = vecLength((enemy.x || 0) - (chainSource.x || 0), (enemy.y || 0) - (chainSource.y || 0));
            if (dist > tile * 2.8 || dist >= bestDist) continue;
            bestDist = dist;
            chainTarget = enemy;
          }
          if (chainTarget) {
            game.applyEnemyDamage(chainTarget, pulseDamage * 0.7, "arcane", zone.ownerId || null);
            game.fireZones.push({
              x: chainSource.x,
              y: chainSource.y,
              targetX: chainTarget.x,
              targetY: chainTarget.y,
              zoneType: "arcaneChain",
              life: 0.18,
              totalLife: 0.18
            });
          }
        }
        zone.tickTimer += tickInterval;
      }
      continue;
    }
    if (zone.zoneType === "cloudDaggers" || zone.zoneType === "arcaneBind" || zone.zoneType === "confusion" || zone.zoneType === "runicVeil" || zone.zoneType === "spiritGuardians") {
      const tickInterval = zone.zoneType === "cloudDaggers" || zone.zoneType === "spiritGuardians" ? Math.max(0.12, zone.tickInterval || 0.25) : 0.25;
      zone.tickTimer = Math.max(-2, (Number.isFinite(zone.tickTimer) ? zone.tickTimer : 0) - dt);
      if (zone.zoneType === "runicVeil" && zone.life <= dt + 0.02 && !zone.exploded) {
        zone.exploded = true;
        for (const enemy of activeEnemies) {
          if (!enemy || (enemy.hp || 0) <= 0 || (game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy))) continue;
          if (vecLength(zone.x - enemy.x, zone.y - enemy.y) > zone.radius + enemy.size * 0.35) continue;
          game.applyEnemyDamage(enemy, zone.coldDamage || 8, "cold", zone.ownerId || null);
          enemy.slowTimer = Math.max(enemy.slowTimer || 0, 2);
          enemy.slowPct = Math.max(enemy.slowPct || 0, 0.35);
        }
      }
      while (zone.life > 0 && zone.tickTimer <= 0) {
        for (const enemy of activeEnemies) {
          if (!enemy || (enemy.hp || 0) <= 0 || (game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy))) continue;
          if (vecLength(zone.x - enemy.x, zone.y - enemy.y) > zone.radius + enemy.size * 0.35) continue;
          if (zone.zoneType === "cloudDaggers") {
            game.applyEnemyDamage(enemy, (zone.dps || 8) * tickInterval, "physical", zone.ownerId || null);
            if (typeof game.applyMageOnHitEffects === "function") game.applyMageOnHitEffects(enemy, { status: "daggers" });
          } else if (zone.zoneType === "spiritGuardians") {
            game.applyEnemyDamage(enemy, (zone.dps || 8) * tickInterval, zone.damageType || "necrotic", zone.ownerId || null);
            if (zone.coldSlow) {
              enemy.slowTimer = Math.max(enemy.slowTimer || 0, 1.2);
              enemy.slowPct = Math.max(enemy.slowPct || 0, 0.3);
            }
            if (typeof game.applyMageOnHitEffects === "function") game.applyMageOnHitEffects(enemy, { status: zone.damageType || "necrotic", runesConsumed: zone.runesConsumed || 0 });
          } else if (zone.zoneType === "arcaneBind") {
            enemy.slowTimer = Math.max(enemy.slowTimer || 0, 1.2);
            enemy.slowPct = Math.max(enemy.slowPct || 0, 0.35);
            enemy.weakenedTimer = Math.max(enemy.weakenedTimer || 0, 1.2);
          } else if (zone.zoneType === "confusion") {
            if ((enemy.confusionImmunityTimer || 0) <= 0) {
              enemy.confusionTimer = Math.max(enemy.confusionTimer || 0, 3);
              enemy.confusionOwnerId = zone.ownerId || null;
              enemy.confusionImmunityTimer = 10;
            }
          }
        }
        if (zone.zoneType === "cloudDaggers" && zone.runicBlades) {
          zone.runicBladeTimer = (Number.isFinite(zone.runicBladeTimer) ? zone.runicBladeTimer : 1) - tickInterval;
          if (zone.runicBladeTimer <= 0) {
            zone.runicBladeTimer += 1;
            const target = activeEnemies.find((enemy) => enemy && (enemy.hp || 0) > 0 && !(game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy)) && vecLength(zone.x - enemy.x, zone.y - enemy.y) <= zone.radius + game.config.map.tile * 2);
            if (target) game.applyEnemyDamage(target, Math.max(3, (zone.dps || 8) * 0.6), "physical", zone.ownerId || null);
          }
        }
        zone.tickTimer += tickInterval;
      }
      continue;
    }
    if (zone.zoneType && zone.zoneType !== "fire" && zone.zoneType !== "pinningFire") continue;
    for (const br of activeBreakables) {
      if (vecLength(zone.x - br.x, zone.y - br.y) < zone.radius + br.size * 0.32) br.hp = 0;
    }
    for (const enemy of activeEnemies) {
      if (game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy)) continue;
      if (enemy.type === "skeleton_warrior" && enemy.collapsed) {
        if (vecLength(zone.x - enemy.x, zone.y - enemy.y) < zone.radius + enemy.size * 0.35) {
          enemy.reviveAtEnd = false;
          enemy.collapseTimer = 0;
          enemy.hp = 0;
        }
        continue;
      }
      if (vecLength(zone.x - enemy.x, zone.y - enemy.y) < zone.radius + enemy.size * 0.35) {
        const lingerDps = Number.isFinite(zone.dps) ? zone.dps : game.getFireArrowLingerDps();
        enemy.burningTimer = Math.max(enemy.burningTimer || 0, 0.25);
        enemy.burningDps = Math.max(enemy.burningDps || 0, lingerDps);
        game.applyEnemyDamage(enemy, lingerDps * dt, "fire", zone.ownerId || null);
      }
    }
  }

  for (const enemy of activeEnemies) {
    if (!enemy || (enemy.hp || 0) <= 0) continue;
    enemy.crusaderDefenseShredTimer = Math.max(0, (Number.isFinite(enemy.crusaderDefenseShredTimer) ? enemy.crusaderDefenseShredTimer : 0) - dt);
    if ((enemy.crusaderDefenseShredTimer || 0) <= 0) enemy.crusaderDefenseShredPct = 0;
    enemy.slowTimer = Math.max(0, (Number.isFinite(enemy.slowTimer) ? enemy.slowTimer : 0) - dt);
    if ((enemy.slowTimer || 0) <= 0) enemy.slowPct = 0;
    enemy.poisonSlowTimer = Math.max(0, (Number.isFinite(enemy.poisonSlowTimer) ? enemy.poisonSlowTimer : 0) - dt);
    enemy.confusionTimer = Math.max(0, (Number.isFinite(enemy.confusionTimer) ? enemy.confusionTimer : 0) - dt);
    enemy.confusionImmunityTimer = Math.max(0, (Number.isFinite(enemy.confusionImmunityTimer) ? enemy.confusionImmunityTimer : 0) - dt);
    enemy.weakenedTimer = Math.max(0, (Number.isFinite(enemy.weakenedTimer) ? enemy.weakenedTimer : 0) - dt);
    enemy.curseTimer = Math.max(0, (Number.isFinite(enemy.curseTimer) ? enemy.curseTimer : 0) - dt);
    enemy.rotTimer = Math.max(0, (Number.isFinite(enemy.rotTimer) ? enemy.rotTimer : 0) - dt);
    enemy.rangerMarkedTimer = Math.max(0, (Number.isFinite(enemy.rangerMarkedTimer) ? enemy.rangerMarkedTimer : 0) - dt);
    if ((enemy.rangerMarkedTimer || 0) <= 0) enemy.rangerMarkedBy = null;
    enemy.bleedTimer = Math.max(0, (Number.isFinite(enemy.bleedTimer) ? enemy.bleedTimer : 0) - dt);
    if ((enemy.bleedTimer || 0) <= 0) enemy.bleedDps = 0;
    if ((enemy.rotTimer || 0) <= 0) enemy.rotDps = 0;
    if ((enemy.burningTimer || 0) > 0 && Number.isFinite(enemy.burningDps) && enemy.burningDps > 0) {
      game.applyEnemyDamage(enemy, enemy.burningDps * dt, "fire", enemy.lastDamageOwnerId || null);
    }
    if ((enemy.rotTimer || 0) > 0 && Number.isFinite(enemy.rotDps) && enemy.rotDps > 0) {
      game.applyEnemyDamage(enemy, enemy.rotDps * dt, "poison", enemy.lastDamageOwnerId || null);
    }
    if ((enemy.bleedTimer || 0) > 0 && Number.isFinite(enemy.bleedDps) && enemy.bleedDps > 0) {
      game.applyEnemyDamage(enemy, enemy.bleedDps * dt, "physical", enemy.lastDamageOwnerId || null);
    }
    if (enemy.type === "flaming_sphere") {
      enemy.expireTimer = Math.max(0, (Number.isFinite(enemy.expireTimer) ? enemy.expireTimer : 5) - dt);
      if ((enemy.expireTimer || 0) <= 0) enemy.hp = 0;
      enemy.fireAuraTickTimer = Math.max(-2, (Number.isFinite(enemy.fireAuraTickTimer) ? enemy.fireAuraTickTimer : 0) - dt);
      const auraTick = 0.25;
      while ((enemy.hp || 0) > 0 && enemy.fireAuraTickTimer <= 0) {
        enemy.fireAuraTickTimer += auraTick;
        for (const target of activeEnemies) {
          if (!target || target === enemy || (target.hp || 0) <= 0 || (game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(target))) continue;
          if (vecLength((target.x || 0) - enemy.x, (target.y || 0) - enemy.y) > game.config.map.tile * 1.2 + (target.size || 20) * 0.35) continue;
          const pulseDamage = Math.max(1, (enemy.fireAuraDps || 4) * auraTick);
          game.applyEnemyDamage(target, pulseDamage, "fire", enemy.controllerPlayerId || null);
          target.burningTimer = Math.max(target.burningTimer || 0, enemy.burnDuration || 3);
          target.burningDps = Math.max(target.burningDps || 0, Math.max(1, pulseDamage * 0.8));
        }
      }
      if ((enemy.runicFlamesTimer || 0) > 0) {
        enemy.runicFlamesTimer = Math.max(0, enemy.runicFlamesTimer - dt);
        game.fireZones.push({
          x: enemy.x,
          y: enemy.y,
          radius: game.config.map.tile * 0.65,
          life: 0.45,
          totalLife: 0.45,
          zoneType: "fire",
          ownerId: enemy.controllerPlayerId || null,
          dps: Math.max(2, enemy.fireAuraDps || 4)
        });
      }
    }
    if (enemy.tempMageCharmTimer > 0) {
      enemy.tempMageCharmTimer = Math.max(0, enemy.tempMageCharmTimer - dt);
      if (enemy.tempMageCharmTimer <= 0 && enemy.dieWhenCharmEnds) enemy.hp = 0;
      else if (enemy.tempMageCharmTimer <= 0 && enemy.isControlledUndead && !enemy.dieWhenCharmEnds) {
        enemy.isControlledUndead = false;
        enemy.controllerPlayerId = null;
        enemy.summonedByPlayer = false;
      }
    }
  }

  for (const enemy of activeEnemies) {
    enemy.contactAttackCooldown = Math.max(0, (enemy.contactAttackCooldown || 0) - dt);
    if (enemy.type === "mummy") enemy.auraPulseTimer = Math.max(0, (enemy.auraPulseTimer || 0) - dt);
  }
  for (const enemy of activeEnemies) {
    if (enemy.type !== "mummy" || (enemy.hp || 0) <= 0) continue;
    const auraRange = (game.config.enemy.mummyAuraRangeTiles || 1.8) * game.config.map.tile;
    const auraDps = game.config.enemy.mummyAuraDps || 8;
    let affected = false;
      if (!(game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy))) {
      for (const player of getLivingPlayers()) {
        const playerRadius = typeof game.getPlayerEnemyCollisionRadiusFor === "function" ? game.getPlayerEnemyCollisionRadiusFor(player) : playerEnemyRadius;
        if (vecLength(enemy.x - player.x, enemy.y - player.y) > auraRange + playerRadius) continue;
        const rawDamage = auraDps * dt * game.getEnemyDamageScale();
        damagePlayer(player, rawDamage, "poison");
        affected = true;
      }
      for (const ally of activeEnemies) {
        if (!(game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(ally))) continue;
        if (ally.type === "skeleton_warrior" && ally.collapsed) continue;
        if (vecLength(enemy.x - ally.x, enemy.y - ally.y) <= auraRange + (ally.size || 20) * 0.4) {
          game.applyEnemyDamage(ally, auraDps * dt * game.getEnemyDamageScale(), "poison");
          affected = true;
        }
      }
    }
    if (affected && enemy.auraPulseTimer <= 0) {
      enemy.hpBarTimer = Math.max(enemy.hpBarTimer || 0, game.config.enemy.hpBarDuration);
      enemy.auraPulseTimer = 0.45;
    }
  }
  for (let i = 0; i < activeEnemies.length; i++) {
    const a = activeEnemies[i];
    if ((a.hp || 0) <= 0 || (a.type === "skeleton_warrior" && a.collapsed)) continue;
    for (let j = i + 1; j < activeEnemies.length; j++) {
      const b = activeEnemies[j];
      if ((b.hp || 0) <= 0 || (b.type === "skeleton_warrior" && b.collapsed)) continue;
      const aFriendly = game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(a);
      const bFriendly = game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(b);
      if (aFriendly === bFriendly) continue;
      if ((aFriendly && game.necromancerBeam?.active && game.necromancerBeam.targetEnemy === b) || (bFriendly && game.necromancerBeam?.active && game.necromancerBeam.targetEnemy === a)) {
        continue;
      }
      const minDist = (a.size || 20) * 0.5 + (b.size || 20) * 0.5 + 6;
      if (vecLength(a.x - b.x, a.y - b.y) > minDist) continue;
      const friendly = aFriendly ? a : b;
      const hostile = aFriendly ? b : a;
      const friendlyOwnerId =
        typeof friendly?.controllerPlayerId === "string" && friendly.controllerPlayerId ? friendly.controllerPlayerId : null;
      if ((friendly.contactAttackCooldown || 0) <= 0) {
        const hostileHpBefore = Number.isFinite(hostile.hp) ? hostile.hp : 0;
        const friendlyDamageType = friendly.type === "flaming_sphere" ? "fire" : "physical";
        const friendlyDamage = game.rollEnemyContactDamage(friendly) * game.getEnemyDamageScale();
        game.applyEnemyDamage(hostile, friendlyDamage, friendlyDamageType, friendlyOwnerId);
        if (friendly.type === "flaming_sphere") {
          hostile.burningTimer = Math.max(hostile.burningTimer || 0, friendly.burnDuration || 3);
          hostile.burningDps = Math.max(hostile.burningDps || 0, Math.max(1, friendlyDamage * 0.18));
        }
        if (isNecromancerTalentGame(game) && hasNecromancerPlaguecraftRot(game)) {
          hostile.rotTimer = Math.max(hostile.rotTimer || 0, getNecromancerRotDuration());
          hostile.rotDps = Math.max(hostile.rotDps || 0, getNecromancerRotDps(game));
        }
        const dealt = Math.max(0, hostileHpBefore - Math.max(0, hostile.hp || 0));
        if ((friendly.lifeStealPct || 0) > 0 && dealt > 0) {
          friendly.hp = Math.min(friendly.maxHp || friendly.hp, (friendly.hp || 0) + dealt * friendly.lifeStealPct);
        }
        friendly.contactAttackCooldown = 0.55 / Math.max(0.4, 1 + (friendly.controlledAttackSpeedBonusPct || 0));
      }
      if ((hostile.contactAttackCooldown || 0) <= 0) {
        game.applyEnemyDamage(friendly, game.rollEnemyContactDamage(hostile) * game.getEnemyDamageScale(), "physical", null, { allowFriendlyPetDamage: true });
        hostile.contactAttackCooldown = 0.55;
      }
    }
  }

  const friendlyEnemies = activeEnemies.filter((enemy) => game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy) && (enemy.hp || 0) > 0);
  for (let i = 0; i < friendlyEnemies.length; i++) {
    const a = friendlyEnemies[i];
    for (let j = i + 1; j < friendlyEnemies.length; j++) {
      const b = friendlyEnemies[j];
      const minDist = (a.size || 20) * 0.45 + (b.size || 20) * 0.45 + 8;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = vecLength(dx, dy) || 0.001;
      if (dist >= minDist) continue;
      const push = (minDist - dist) * 0.5;
      const nx = dx / dist;
      const ny = dy / dist;
      game.moveWithCollision(a, -nx * push, -ny * push);
      game.moveWithCollision(b, nx * push, ny * push);
    }
  }

  const maxPetDistance = game.config.map.tile * 30;
  for (const enemy of game.enemies) {
    if (!(game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy))) continue;
    if ((enemy.hp || 0) <= 0) continue;
    const owner = typeof game.getControllingPlayerEntityForEnemy === "function" ? game.getControllingPlayerEntityForEnemy(enemy) : game.player;
    if (!owner || (typeof game.isLivingPlayerEntity === "function" && !game.isLivingPlayerEntity(owner))) {
      enemy.hp = 0;
      continue;
    }
    if (vecLength(enemy.x - owner.x, enemy.y - owner.y) > maxPetDistance) enemy.hp = 0;
  }

  let removeBossSummons = false;
  const pendingRaisedEnemies = [];
  game.enemies = game.enemies.filter((enemy) => {
    if (enemy.type === "skeleton_warrior" && enemy.collapsed && ((enemy.collapseTimer > 0) || (enemy.reanimateTimer > 0))) return true;
    if (enemy.hp <= 0) {
      if (enemy.skipRewardsOnDeath) return false;
      const isFinalGolemBossDeath = enemy.type === "golem" &&
        enemy.isFloorBoss &&
        !(game.enemies || []).some((other) => other && other !== enemy && other.isFloorBoss && (other.hp || 0) > 0);
      const spellknightDetonationOwnerId = typeof enemy.arcaneMarkOwnerId === "string" && enemy.arcaneMarkOwnerId ? enemy.arcaneMarkOwnerId : null;
      const spellknightDetonationOwner = spellknightDetonationOwnerId && typeof game.getPlayerEntityById === "function" ? game.getPlayerEntityById(spellknightDetonationOwnerId) : null;
      const markedForSpellknight =
        !!spellknightDetonationOwner &&
        (enemy.arcaneMarkTimer || 0) > 0 &&
        enemy.arcaneMarkOwnerId === spellknightDetonationOwnerId &&
        hasWarriorSpellknight(spellknightDetonationOwner);
      const wasFriendly = game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy);
      if (wasFriendly && typeof game.triggerExplodingDeath === "function") game.triggerExplodingDeath(enemy);
      if (wasFriendly) return false;
      if (markedForSpellknight) {
        const detonationDamage = (typeof game.rollPrimaryDamage === "function" ? game.rollPrimaryDamage() : 10) * 0.7;
        const tile = game.config?.map?.tile || 32;
        for (const other of activeEnemies) {
          if (!other || other === enemy || (other.hp || 0) <= 0) continue;
          if (game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(other)) continue;
          if (vecLength((other.x || 0) - (enemy.x || 0), (other.y || 0) - (enemy.y || 0)) > tile * 1.8 + (other.size || 20) * 0.35) continue;
          game.applyEnemyDamage(other, detonationDamage, "arcane", spellknightDetonationOwnerId);
        }
        game.fireZones.push({
          x: enemy.x,
          y: enemy.y,
          radius: tile * 1.2,
          life: 0.2,
          totalLife: 0.2,
          zoneType: "arcaneBurst"
        });
      }
      if (
        isNecromancerTalentGame(game) &&
        !game.isUndeadEnemy(enemy) &&
        !(enemy.isBoss || enemy.isFloorBoss) &&
        ((enemy.curseTimer || 0) > 0 || (enemy.rotTimer || 0) > 0) &&
        game.canControlMoreUndead() &&
        Math.random() < getNecromancerPlaguecraftRiseChance(game)
      ) {
        const skeleton = spawnSkeleton(game, enemy.x, enemy.y);
        if (skeleton && game.markUndeadAsControlled(skeleton)) {
          pendingRaisedEnemies.push(skeleton);
          skeleton.hp = skeleton.maxHp;
        }
      }
      const rewardOwner = getRewardOwner(enemy);
      if (rewardOwner && rewardOwner.classType === "necromancer" && (rewardOwner.necromancerTalents?.lich?.points || 0) > 0) {
        const runtime =
          rewardOwner === game.player
            ? (game.necromancerRuntime || (game.necromancerRuntime = {}))
            : (rewardOwner.necromancerRuntime || (rewardOwner.necromancerRuntime = {}));
        if ((runtime.soulSpawnCooldownTimer || 0) <= 0 && Math.random() < 0.1) {
          runtime.souls = Array.isArray(runtime.souls) ? runtime.souls : [];
          runtime.souls.push({
            x: enemy.x,
            y: enemy.y,
            life: 8,
            healPct: enemy.isBoss || enemy.isFloorBoss ? 0.12 : 0.04,
            collectRadius: 22,
            ownerId: rewardOwner.id || null
          });
          runtime.soulSpawnCooldownTimer = 0.15;
          if (rewardOwner === game.player && typeof game.spawnFloatingText === "function") game.spawnFloatingText(enemy.x, enemy.y - 24, "Soul", "#c7f0a0", 0.6, 12);
        }
      }
      if (rewardOwner && rewardOwner.classType === "necromancer" && !(enemy.isBoss || enemy.isFloorBoss) && (rewardOwner.necromancerTalents?.necromancerPath?.points || 0) > 0) {
        const runtime =
          rewardOwner === game.player
            ? (game.necromancerRuntime || (game.necromancerRuntime = {}))
            : (rewardOwner.necromancerRuntime || (rewardOwner.necromancerRuntime = {}));
        const guaranteed = enemy.lastDamageType === "necrotic" || enemy.lastDamageType === "death";
        if ((runtime.necroRaiseCooldownTimer || 0) <= 0 && game.canControlMoreUndead(rewardOwner) && (guaranteed || Math.random() < 0.1)) {
          const raised = enemy.type === "ghost" ? spawnGhost(game, enemy.x, enemy.y) : {
            ...enemy,
            id: null,
            x: enemy.x,
            y: enemy.y,
            hp: Math.max(1, Number.isFinite(enemy.maxHp) ? enemy.maxHp : 12),
            maxHp: Math.max(1, Number.isFinite(enemy.maxHp) ? enemy.maxHp : 12),
            baseMaxHp: Math.max(1, Number.isFinite(enemy.baseMaxHp) ? enemy.baseMaxHp : (Number.isFinite(enemy.maxHp) ? enemy.maxHp : 12)),
            baseSpeed: Number.isFinite(enemy.baseSpeed) ? enemy.baseSpeed : enemy.speed,
            baseDamageMin: Number.isFinite(enemy.baseDamageMin) ? enemy.baseDamageMin : enemy.damageMin,
            baseDamageMax: Number.isFinite(enemy.baseDamageMax) ? enemy.baseDamageMax : enemy.damageMax,
            isBoss: false,
            isFloorBoss: false,
            skipRewardsOnDeath: true,
            raisedUndeadCopy: true,
            burningTimer: 0,
            rotTimer: 0,
            curseTimer: 0,
            confusionTimer: 0,
            weakenedTimer: 0
          };
          if (raised && game.markUndeadAsControlled(raised, rewardOwner)) {
            pendingRaisedEnemies.push(raised);
            raised.hp = raised.maxHp;
            runtime.necroRaiseCooldownTimer = 2;
            if (rewardOwner === game.player && typeof game.spawnFloatingText === "function") game.spawnFloatingText(enemy.x, enemy.y - 30, "Raised", "#b6d9ff", 0.75, 12);
          }
        }
      }
      const diedNearOwnerForHarvester =
        !!rewardOwner &&
        typeof rewardOwner.x === "number" &&
        vecLength((enemy.x || 0) - rewardOwner.x, (enemy.y || 0) - rewardOwner.y) <= (game.config.map.tile || 32);
      if (rewardOwner) {
        const ownerHasHarvester = rewardOwner === game.player
          ? hasNecromancerHarvester(game)
          : ((rewardOwner?.necromancerTalents?.harvester?.points || 0) > 0);
        if (ownerHasHarvester) {
          const runtime =
            rewardOwner === game.player
              ? (game.necromancerRuntime || (game.necromancerRuntime = {}))
              : (rewardOwner.necromancerRuntime || (rewardOwner.necromancerRuntime = {}));
          runtime.harvesterBonusPct = Math.min(0.5, (Number.isFinite(runtime.harvesterBonusPct) ? runtime.harvesterBonusPct : 0) + 0.05);
          if (rewardOwner === game.player && typeof game.spawnFloatingText === "function") {
            game.spawnFloatingText(game.player.x, game.player.y - 34, "Harvest +5%", "#cf9fff", 0.7, 13);
          }
          if (diedNearOwnerForHarvester && !(enemy.isBoss || enemy.isFloorBoss) && game.canControlMoreUndead(rewardOwner) && Math.random() < 0.4) {
            const ghost = spawnGhost(game, enemy.x, enemy.y);
            if (ghost && game.markUndeadAsControlled(ghost, rewardOwner)) {
              pendingRaisedEnemies.push(ghost);
              ghost.hp = ghost.maxHp;
              if (rewardOwner === game.player && typeof game.spawnFloatingText === "function") {
                game.spawnFloatingText(enemy.x, enemy.y - 30, "Harvested", "#d8b3ff", 0.8, 13);
              }
            }
          }
        }
      }
      if (typeof game.recordKillByPlayerEntity === "function") game.recordKillByPlayerEntity(rewardOwner, enemy);
      if (rewardOwner && rewardOwner.classType === "archer") {
        const runtime = rewardOwner === game.player ? (game.rangerRuntime || (game.rangerRuntime = {})) : (rewardOwner.rangerRuntime || (rewardOwner.rangerRuntime = {}));
        const talentSource = rewardOwner === game.player ? game : rewardOwner;
        if (hasRangerTalent(talentSource, "predatorsFeast") && (runtime.predatorsFeastCooldownTimer || 0) <= 0) {
          const heal = (rewardOwner.maxHealth || 1) * 0.04;
          if (rewardOwner === game.player && typeof game.applyPlayerHealing === "function") game.applyPlayerHealing(heal);
          else rewardOwner.health = Math.min(rewardOwner.maxHealth || rewardOwner.health || 0, (rewardOwner.health || 0) + heal);
          runtime.predatorsFeastTimer = 2;
          runtime.predatorsFeastCooldownTimer = 5;
        }
        if (hasRangerTalent(talentSource, "deathChain") && !enemy.killedByDeathChain) {
          const tile = game.config?.map?.tile || 32;
          const chainTargets = [];
          for (const other of activeEnemies) {
            if (!other || other === enemy || (other.hp || 0) <= 0) continue;
            if (game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(other)) continue;
            const dist = vecLength((other.x || 0) - (enemy.x || 0), (other.y || 0) - (enemy.y || 0));
            if (dist > tile * 3) continue;
            chainTargets.push({ enemy: other, dist });
          }
          chainTargets.sort((a, b) => a.dist - b.dist);
          for (const entry of chainTargets.slice(0, 2)) {
            const chainDamage = (typeof game.rollPrimaryDamage === "function" ? game.rollPrimaryDamage() : 8) * (enemy.rangerMarkedBy ? 1.1 : 0.7);
            game.applyEnemyDamage(entry.enemy, chainDamage, "physical", rewardOwner.id || null);
            if ((entry.enemy.hp || 0) <= 0) entry.enemy.killedByDeathChain = true;
            if (typeof game.spawnFloatingText === "function") game.spawnFloatingText(entry.enemy.x, entry.enemy.y - entry.enemy.size, "Death Chain", "#d8b3ff", 0.75, 13);
          }
        }
      }
      if (enemy.isFloorBoss && typeof game.recordRunBossKill === "function" && (enemy.type !== "golem" || isFinalGolemBossDeath)) {
        game.recordRunBossKill();
      }
      if (enemy.lastDamageType === "fire" && typeof game.recordClassSpecificStat === "function") {
        game.recordClassSpecificStat("ranger", "fireArrowKills", 1);
      }
      if (enemy.pendingExecuteKill && typeof game.recordClassSpecificStat === "function") {
        game.recordClassSpecificStat("warrior", "executeKills", 1);
      }
      if (typeof game.triggerWarriorMomentumOnKillForPlayerEntity === "function") game.triggerWarriorMomentumOnKillForPlayerEntity(rewardOwner);
      else game.triggerWarriorMomentumOnKill();
      let rewardScore = 10;
      if (enemy.type === "goblin") rewardScore = 30 + enemy.goldEaten;
      else if (enemy.type === "armor") rewardScore = 40;
      else if (enemy.type === "mimic") rewardScore = 35;
      else if (enemy.type === "mummy") rewardScore = 22;
      else if (enemy.type === "prisoner") rewardScore = 22;
      else if (enemy.type === "rat_archer") rewardScore = 16;
      else if (enemy.type === "shardling") rewardScore = 12;
      else if (enemy.type === "skeleton_warrior") rewardScore = 10;
      else if (enemy.type === "necromancer" || enemy.type === "sonya") rewardScore = 250;
      else if (enemy.type === "leprechaun") rewardScore = 500;
      else if (enemy.type === "golem") rewardScore = isFinalGolemBossDeath ? 360 : 0;
      else if (enemy.type === "minotaur") rewardScore = 320;
      else if (enemy.type === "skeleton") rewardScore = 12;
      if (typeof game.awardScoreToPlayerEntity === "function" && rewardScore > 0) game.awardScoreToPlayerEntity(rewardOwner, rewardScore);
      const bossCleanupPhase = game.floorBoss && ["defeated", "portal", "completed"].includes(game.floorBoss.phase);
      const suppressPostBossXp = bossCleanupPhase && !enemy.isFloorBoss && !isFinalGolemBossDeath;
      if (!suppressPostBossXp && (enemy.type !== "golem" || !enemy.isFloorBoss || isFinalGolemBossDeath)) {
        if (typeof game.gainExperienceForPlayerEntity === "function") game.gainExperienceForPlayerEntity(rewardOwner, game.xpFromEnemy(enemy));
        else game.gainExperience(game.xpFromEnemy(enemy));
      }
      if (enemy.type === "goblin") game.dropTreasureBag(enemy.x, enemy.y, enemy.goldEaten);
      else if (enemy.type === "armor") game.dropArmorLoot(enemy.x, enemy.y);
      else if (enemy.type === "mimic") game.dropTreasureBag(enemy.x, enemy.y, 24);
      else if (enemy.type === "mummy") game.maybeSpawnDrop(enemy.x, enemy.y);
      else if (enemy.type === "prisoner" || enemy.type === "rat_archer" || enemy.type === "skeleton_warrior" || enemy.type === "skeleton" || enemy.type === "shardling") game.maybeSpawnDrop(enemy.x, enemy.y);
      else if (enemy.type === "necromancer" || enemy.type === "sonya" || enemy.type === "leprechaun") {
        if (typeof game.markFloorBossDefeated === "function") game.markFloorBossDefeated();
        removeBossSummons = true;
        if (typeof game.spawnExitPortal === "function") game.spawnExitPortal(enemy.x, enemy.y);
        if (enemy.type === "leprechaun") game.dropLeprechaunLoot(enemy.x, enemy.y);
        else game.dropNecromancerLoot(enemy.x, enemy.y);
        game.spawnFloatingText(enemy.x, enemy.y - 42, "Boss Defeated", "#f2bf7b", 1.5, 18);
        game.spawnFloatingText(enemy.x, enemy.y - 62, "Portal Open", "#90f0ff", 1.5, 18);
      } else if (enemy.type === "minotaur") {
        if (typeof game.markFloorBossDefeated === "function") game.markFloorBossDefeated();
        if (typeof game.spawnExitPortal === "function") game.spawnExitPortal(enemy.x, enemy.y);
        game.dropMinotaurLoot(enemy.x, enemy.y);
        game.spawnFloatingText(enemy.x, enemy.y - 42, "Boss Defeated", "#f2bf7b", 1.5, 18);
        game.spawnFloatingText(enemy.x, enemy.y - 62, "Portal Open", "#90f0ff", 1.5, 18);
      } else if (enemy.type === "golem") {
        if (isFinalGolemBossDeath) {
          if (typeof game.markFloorBossDefeated === "function") game.markFloorBossDefeated();
          if (typeof game.spawnExitPortal === "function") game.spawnExitPortal(enemy.x, enemy.y);
          game.dropGolemLoot(enemy.x, enemy.y);
          game.spawnFloatingText(enemy.x, enemy.y - 42, "Boss Defeated", "#f2bf7b", 1.5, 18);
          game.spawnFloatingText(enemy.x, enemy.y - 62, "Portal Open", "#90f0ff", 1.5, 18);
        }
      } else game.maybeSpawnDrop(enemy.x, enemy.y);
      return false;
    }
    return true;
  });
  if (pendingRaisedEnemies.length > 0) game.enemies.push(...pendingRaisedEnemies);
  if (removeBossSummons) {
    game.enemies = game.enemies.filter((enemy) => !(enemy.type === "skeleton" && enemy.summonerBoss));
  }
  game.breakables = (game.breakables || []).filter((br) => {
    if ((br.hp || 0) <= 0) {
      game.dropBreakableLoot(br.x, br.y);
      return false;
    }
    return true;
  });

  for (const drop of game.drops) {
    if (drop.life <= 0) continue;
    for (const player of getLivingPlayers()) {
      if (vecLength(player.x - drop.x, player.y - drop.y) >= game.getPickupRadius()) continue;
      if (drop.type === "health" || drop.type === "mushroom") {
        healPlayer(player, drop.amount);
        if (player.classType === "archer" && game.rangerTalents?.forager?.points > 0) {
          player.rangerRuntime = player.rangerRuntime && typeof player.rangerRuntime === "object" ? player.rangerRuntime : {};
          player.rangerRuntime.foragerRegenTimer = Math.max(player.rangerRuntime.foragerRegenTimer || 0, 4);
          if (drop.type === "mushroom") player.rangerRuntime.mushroomSpawnTimer = 30;
        }
      } else if (game.isGoldDrop(drop)) {
        const amount = Math.max(1, Math.floor(drop.amount * game.getGoldFindMultiplier()));
        if (typeof game.awardGoldToPlayerEntity === "function") game.awardGoldToPlayerEntity(player, amount);
      }
      drop.life = 0;
      break;
    }
  }
  game.drops = game.drops.filter((drop) => drop.life > 0);

  const boneSlowPct = game.config.enemy.skeletonWarriorBoneSlowPct || 0;
  if (boneSlowPct > 0) {
    const affectsEntity = (entity) => {
      if (!entity || !Number.isFinite(entity.x) || !Number.isFinite(entity.y)) return;
      for (const enemy of game.enemies) {
        if (enemy.type !== "skeleton_warrior" || !enemy.collapsed || enemy.collapseTimer <= 0) continue;
        const slowRadius = (enemy.size || 20) * 0.6;
        if (vecLength(entity.x - enemy.x, entity.y - enemy.y) <= slowRadius) {
          entity.x = Number.isFinite(entity.lastX) ? entity.lastX + (entity.x - entity.lastX) * (1 - boneSlowPct) : entity.x;
          entity.y = Number.isFinite(entity.lastY) ? entity.lastY + (entity.y - entity.lastY) * (1 - boneSlowPct) : entity.y;
          break;
        }
      }
    };
    for (const player of getLivingPlayers()) affectsEntity(player);
    for (const enemy of game.enemies) affectsEntity(enemy);
  }

  for (const player of getLivingPlayers()) {
    if ((player.hitCooldown || 0) > 0) continue;
    const playerRadius = typeof game.getPlayerEnemyCollisionRadiusFor === "function" ? game.getPlayerEnemyCollisionRadiusFor(player) : playerEnemyRadius;
    for (const enemy of activeEnemies) {
      if (game.isEnemyFriendlyToPlayer && game.isEnemyFriendlyToPlayer(enemy)) continue;
      if (enemy.type === "leprechaun" && enemy.phase !== "enraged") continue;
      if (enemy.type === "skeleton_warrior" && enemy.collapsed) continue;
      if (vecLength(player.x - enemy.x, player.y - enemy.y) > enemy.size * 0.5 + playerRadius) continue;
      player.hitCooldown = 1.0;
      const rawDamage = game.rollEnemyContactDamage(enemy);
      const scaledEnemyDamage = rawDamage * game.getEnemyDamageScale();
      damagePlayer(player, scaledEnemyDamage, "physical");
      break;
    }
  }
}
