import { vecLength } from "../utils.js";
import { getNecromancerRotDps, getNecromancerRotDuration, hasNecromancerPlaguecraftRot, isNecromancerTalentGame } from "./necromancerTalentTree.js";

export function resolveFireZonesAndEnemyStatus({
  game,
  dt,
  activeEnemies,
  activeBreakables,
  playerEnemyRadius,
  isActive,
  getLivingPlayers,
  damagePlayer
}) {
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
      const burnTickInterval = Math.max(0.1, Number.isFinite(enemy.burningTickInterval) ? enemy.burningTickInterval : 1);
      enemy.burningTickTimer = Math.max(-2, (Number.isFinite(enemy.burningTickTimer) ? enemy.burningTickTimer : burnTickInterval) - dt);
      while ((enemy.hp || 0) > 0 && (enemy.burningTimer || 0) > 0 && enemy.burningTickTimer <= 0) {
        game.applyEnemyDamage(enemy, enemy.burningDps * burnTickInterval, "fire", enemy.lastDamageOwnerId || null);
        enemy.burningTickTimer += burnTickInterval;
      }
    } else {
      enemy.burningTickTimer = 0;
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

}
