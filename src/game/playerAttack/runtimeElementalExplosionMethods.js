import { vecLength } from "../../utils.js";
import { hasLineOfSight } from "../enemyAiShared.js";
import {
  getRangerFireArrowProjectileSizeBonus,
  getRangerArrowBonusAgainstEnemy,
  getRangerComboTier,
  getRangerCritChance,
  getRangerCritMultiplier,
  getRangerCurrentWeaponMode,
  getRangerCurrentWeaponModeStats,
  getRangerRicochetCount,
  getRangerSelectedPath,
  getRangerSelectedSwapStyle,
  getRangerSelectedWeapon,
  getRangerSwapRangeBonus,
  getRangerWeaponStats,
  getRangerIgniteChance,
  getRangerPinningShotLengthTiles,
  hasFireMastery,
  hasRangerTalent,
  hasPinningShot,
  shouldSpreadWildfire
} from "../rangerTalentTree.js";
import {
  getNecromancerDeathBoltCooldownReduction,
  getNecromancerDeathBoltZoneDurationMultiplier,
  getNecromancerCurseDuration,
  getNecromancerDeathBoltGhostSpawnChance,
  getNecromancerDeathBoltMasteryTempHpOnKill,
  getNecromancerTempHpCap,
  getNecromancerExplodingDeathDamage,
  getNecromancerExplodingDeathRadiusTiles,
  getNecromancerRotDps,
  getNecromancerRotDuration,
  getMageBaseMaxMana,
  getMageManaRegenPerSecond,
  getMagePersistentDurationMultiplier,
  getMageSelectedCantrip,
  getMageSelectedPath,
  getMageSelectedSpell,
  getMageSpellDelayMultiplier,
  getMageSpellPowerMultiplier,
  hasMageTalent,
  hasNecromancerBlightstorm,
  hasNecromancerCurse,
  hasNecromancerDeathBolt,
  hasNecromancerExplodingDeath,
  hasNecromancerPlaguecraftDeathBurst,
  hasNecromancerPlaguecraftRot,
  isNecromancerTalentGame
} from "../necromancerTalentTree.js";
import { spawnGhost } from "../enemySpawnFactories.js";

export const runtimeElementalExplosionMethods = {
  triggerFireExplosion(x, y, source = null) {
    const sourceState = source && typeof source === "object" ? source : {};
    const blastRadius = Number.isFinite(sourceState.blastRadius) ? sourceState.blastRadius : this.getFireArrowBlastRadius();
    const impactDamage = Number.isFinite(sourceState.impactDamage) ? sourceState.impactDamage : this.getFireArrowImpactDamage();
    const lingerDuration = Number.isFinite(sourceState.lingerDuration) ? sourceState.lingerDuration : this.config.fireArrow.lingerDuration;
    const lingerDps = Number.isFinite(sourceState.lingerDps) ? sourceState.lingerDps : this.getFireArrowLingerDps();
    const ownerId = typeof sourceState.ownerId === "string" && sourceState.ownerId ? sourceState.ownerId : (this.player.id || null);
    if (sourceState.pinningShot) {
      const tile = this.config.map?.tile || 32;
      const angle = Number.isFinite(sourceState.angle) ? sourceState.angle : 0;
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      const lineLength = tile * getRangerPinningShotLengthTiles(this);
      const zoneRadius = Math.max(10, tile * 0.42);
      const segmentSpacing = tile;
      for (const enemy of this.enemies) {
        if (this.isEnemyFriendlyToPlayer(enemy)) continue;
        const relX = (enemy.x || 0) - x;
        const relY = (enemy.y || 0) - y;
        const along = relX * dirX + relY * dirY;
        const lateral = Math.abs(relX * -dirY + relY * dirX);
        if (along < 0 || along > lineLength) continue;
        if (lateral > zoneRadius + (enemy.size || 20) * 0.4) continue;
        enemy.pinningSlowTimer = Math.max(enemy.pinningSlowTimer || 0, 1.75);
        enemy.pinningSlowPct = Math.max(enemy.pinningSlowPct || 0, 0.25);
        this.applyEnemyDamage(enemy, impactDamage, "fire", ownerId);
      }
      for (let dist = 0; dist <= lineLength; dist += segmentSpacing) {
        this.fireZones.push({
          x: x + dirX * dist,
          y: y + dirY * dist,
          radius: zoneRadius,
          life: lingerDuration,
          zoneType: "pinningFire",
          ownerId,
          dps: lingerDps
        });
      }
      return;
    }
    for (const enemy of this.enemies) {
      if (this.isEnemyFriendlyToPlayer(enemy)) continue;
      if (vecLength(x - enemy.x, y - enemy.y) <= blastRadius + enemy.size * 0.3) this.applyEnemyDamage(enemy, impactDamage, "fire", ownerId);
    }
    this.fireZones.push({ x, y, radius: blastRadius * 0.9, life: lingerDuration, zoneType: "fire", ownerId, dps: lingerDps });
  },

  triggerMageFireballExplosion(x, y, source = null) {
    const sourceState = source && typeof source === "object" ? source : {};
    const radius = Number.isFinite(sourceState.blastRadius) ? sourceState.blastRadius : (this.config?.map?.tile || 32) * 3;
    const damage = Number.isFinite(sourceState.damage) ? sourceState.damage : this.getPrimaryDamage() * 3;
    const ownerId = typeof sourceState.ownerId === "string" && sourceState.ownerId ? sourceState.ownerId : (this.player.id || null);
    const runesConsumed = Math.max(0, Math.floor(sourceState.runesConsumed || 0));
    for (const enemy of this.enemies || []) {
      if (!enemy || (enemy.hp || 0) <= 0 || this.isEnemyFriendlyToPlayer(enemy)) continue;
      if (vecLength((enemy.x || 0) - x, (enemy.y || 0) - y) > radius + (enemy.size || 20) * 0.35) continue;
      this.applyEnemyDamage(enemy, damage, "fire", ownerId);
      enemy.burningTimer = Math.max(enemy.burningTimer || 0, sourceState.burnDuration || 3);
      enemy.burningDps = Math.max(enemy.burningDps || 0, Math.max(1, damage * 0.16));
      if ((sourceState.knockback || 0) > 0) {
        const len = vecLength((enemy.x || 0) - x, (enemy.y || 0) - y) || 1;
        enemy.vx = (enemy.vx || 0) + (((enemy.x || 0) - x) / len) * sourceState.knockback;
        enemy.vy = (enemy.vy || 0) + (((enemy.y || 0) - y) / len) * sourceState.knockback;
      }
      if (sourceState.wildInfusion === "cold") {
        enemy.slowTimer = Math.max(enemy.slowTimer || 0, 2.5);
        enemy.slowPct = Math.max(enemy.slowPct || 0, 0.3);
      } else if (sourceState.wildInfusion === "poison") {
        enemy.poisonSlowTimer = Math.max(enemy.poisonSlowTimer || 0, 3);
        enemy.slowPct = Math.max(enemy.slowPct || 0, 0.2);
      }
      this.applyMageOnHitEffects(enemy, { status: sourceState.wildInfusion || "burning", runesConsumed });
    }
    const lingering = runesConsumed >= 3;
    this.fireZones.push({
      x,
      y,
      radius: lingering ? radius * 0.75 : radius,
      life: lingering ? 2 : 0.18,
      totalLife: lingering ? 2 : 0.18,
      zoneType: lingering ? "fire" : "arcaneBurst",
      ownerId,
      dps: lingering ? Math.max(1, damage * 0.25) : 0
    });
  },

};
