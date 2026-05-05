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

export const runtimeDeathBoltAttackMethods = {
  fireDeathBolt(dx, dy) {
    if (!this.isNecromancerClass()) return false;
    if ((isNecromancerTalentGame(this) ? !hasNecromancerDeathBolt(this) : (this.skills.deathBolt.points || 0) <= 0) || this.player.deathBoltCooldown > 0) return false;
    const hpCost = isNecromancerTalentGame(this) ? 0 : Math.max(1, this.player.maxHealth * (this.config.deathBolt?.hpCostPct || 0.05));
    if (hpCost > 0 && this.player.health <= hpCost) return false;
    const origin = this.getBowMuzzleOrigin(dx, dy);
    const speed = this.config.deathBolt?.speed || 165;
    const life = this.config.deathBolt?.life || 1.6;
    const maxTravelDistance = speed * life;
    const clickedX = Number.isFinite(this.input?.mouse?.worldX) ? this.input.mouse.worldX : (origin.x + origin.dirX * maxTravelDistance);
    const clickedY = Number.isFinite(this.input?.mouse?.worldY) ? this.input.mouse.worldY : (origin.y + origin.dirY * maxTravelDistance);
    const toClickX = clickedX - origin.x;
    const toClickY = clickedY - origin.y;
    const clickDistance = vecLength(toClickX, toClickY);
    const travelDistance = Math.min(maxTravelDistance, clickDistance || maxTravelDistance);
    const detonateX = origin.x + origin.dirX * travelDistance;
    const detonateY = origin.y + origin.dirY * travelDistance;
    if (hpCost > 0) {
      this.player.health = Math.max(1, this.player.health - hpCost);
      this.markPlayerHealthBarVisible();
    }
    this.player.deathBoltCooldown = Math.max(0.5, (this.config.deathBolt?.cooldown || 10) - (isNecromancerTalentGame(this) ? getNecromancerDeathBoltCooldownReduction(this) : 0));
    const baseAngles = hasNecromancerBlightstorm(this) ? [-0.24, 0, 0.24] : [0];
    const forwardAngle = Math.atan2(origin.dirY, origin.dirX);
    for (const angleOffset of baseAngles) {
      const angle = forwardAngle + angleOffset;
      const targetX = origin.x + Math.cos(angle) * travelDistance;
      const targetY = origin.y + Math.sin(angle) * travelDistance;
      this.bullets.push({
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle,
        life,
        size: 10,
        projectileType: "deathBolt",
        ownerId: this.player.id || null,
        detonateX: targetX,
        detonateY: targetY,
        deathBoltDamage: this.getDeathBoltBaseDamage(),
        deathBoltHealAmount: this.getDeathBoltHealAmount(),
        deathBoltPetDamageMultiplier: this.getDeathBoltPetDamageMultiplier(),
        deathBoltRadius: this.getDeathBoltRadius(),
        pulseInterval: this.config.deathBolt?.pulseInterval || 1,
        visualLife: (this.config.deathBolt?.visualLife || 5) * (isNecromancerTalentGame(this) ? getNecromancerDeathBoltZoneDurationMultiplier(this) : 1)
      });
    }
    if (isNecromancerTalentGame(this) && this.necromancerRuntime && Number.isFinite(this.necromancerRuntime.harvesterBonusPct)) {
      this.necromancerRuntime.harvesterBonusPct = 0;
    }
    return true;
  },

  triggerDeathBoltExplosion(x, y, source = null) {
    const sourceState = source && typeof source === "object" ? source : {};
    const radius = Number.isFinite(sourceState.deathBoltRadius) ? sourceState.deathBoltRadius : this.getDeathBoltRadius();
    const pulseInterval = Number.isFinite(sourceState.pulseInterval) ? sourceState.pulseInterval : (this.config.deathBolt?.pulseInterval || 1);
    const visualLife = Number.isFinite(sourceState.visualLife) ? sourceState.visualLife : (this.config.deathBolt?.visualLife || 5);
    this.applyDeathBoltPulse(x, y, sourceState);
    this.fireZones.push({
      x,
      y,
      radius,
      life: visualLife,
      pulseTimer: pulseInterval,
      zoneType: "deathBolt",
      ownerId: typeof sourceState.ownerId === "string" && sourceState.ownerId ? sourceState.ownerId : (this.player.id || null),
      deathBoltDamage: Number.isFinite(sourceState.deathBoltDamage) ? sourceState.deathBoltDamage : this.getDeathBoltBaseDamage(),
      deathBoltHealAmount: Number.isFinite(sourceState.deathBoltHealAmount) ? sourceState.deathBoltHealAmount : this.getDeathBoltHealAmount(),
      deathBoltPetDamageMultiplier: Number.isFinite(sourceState.deathBoltPetDamageMultiplier) ? sourceState.deathBoltPetDamageMultiplier : this.getDeathBoltPetDamageMultiplier()
    });
  },

  applyDeathBoltPulse(x, y, source = null) {
    const sourceState = source && typeof source === "object" ? source : {};
    const radius = Number.isFinite(sourceState.deathBoltRadius) ? sourceState.deathBoltRadius : this.getDeathBoltRadius();
    const damage = Number.isFinite(sourceState.deathBoltDamage) ? sourceState.deathBoltDamage : this.getDeathBoltBaseDamage();
    const healAmount = Number.isFinite(sourceState.deathBoltHealAmount) ? sourceState.deathBoltHealAmount : this.getDeathBoltHealAmount();
    const petDamageMultiplier = Number.isFinite(sourceState.deathBoltPetDamageMultiplier) ? sourceState.deathBoltPetDamageMultiplier : this.getDeathBoltPetDamageMultiplier();
    const ownerId = typeof sourceState.ownerId === "string" && sourceState.ownerId ? sourceState.ownerId : (this.player.id || null);
    const deathBoltDamageType = isNecromancerTalentGame(this) && hasNecromancerCurse(this) ? "poison" : "death";
    for (const enemy of this.enemies || []) {
      if (!enemy || (enemy.hp || 0) <= 0) continue;
      if (vecLength(enemy.x - x, enemy.y - y) > radius + (enemy.size || 20) * 0.35) continue;
      if (this.isControlledUndead(enemy)) {
        this.healControlledUndead(enemy, healAmount);
        if (petDamageMultiplier > 1) {
          enemy.damageBuffMultiplier = petDamageMultiplier;
          enemy.damageBuffTimer = Math.max(Number.isFinite(enemy.damageBuffTimer) ? enemy.damageBuffTimer : 0, (this.config.deathBolt?.pulseInterval || 1) + 0.15);
        }
      } else {
        this.applyEnemyDamage(enemy, damage, deathBoltDamageType, ownerId);
        if (isNecromancerTalentGame(this) && hasNecromancerCurse(this)) {
          enemy.curseTimer = Math.max(enemy.curseTimer || 0, getNecromancerCurseDuration(this));
        }
        if ((enemy.hp || 0) <= 0 && isNecromancerTalentGame(this)) {
          const spawnChance = getNecromancerDeathBoltGhostSpawnChance(this);
          if (spawnChance > 0 && this.canControlMoreUndead() && Math.random() < spawnChance) {
            const ghost = spawnGhost(this, enemy.x, enemy.y);
            if (ghost && this.markUndeadAsControlled(ghost)) {
              this.enemies.push(ghost);
              ghost.hp = ghost.maxHp;
              if (typeof this.spawnFloatingText === "function") {
                this.spawnFloatingText(enemy.x, enemy.y - 30, "Raised", "#b6d9ff", 0.85, 13);
              }
            }
          }
          const tempHpGain = getNecromancerDeathBoltMasteryTempHpOnKill(this);
          if (tempHpGain > 0) {
            const runtime = this.necromancerRuntime || (this.necromancerRuntime = {});
            const cap = getNecromancerTempHpCap(this);
            runtime.tempHp = Math.min(cap, Math.max(0, Number.isFinite(runtime.tempHp) ? runtime.tempHp : 0) + tempHpGain);
            if (typeof this.markPlayerHealthBarVisible === "function") this.markPlayerHealthBarVisible();
            if (tempHpGain > 0 && typeof this.spawnFloatingText === "function") {
              this.spawnFloatingText(this.player.x, this.player.y - 34, `+${tempHpGain} THP`, "#9edcff", 0.7, 13);
            }
          }
        }
      }
    }
  },

  triggerExplodingDeath(sourceEnemy) {
    const points = Number.isFinite(sourceEnemy?.controllerExplodingDeathPoints)
      ? sourceEnemy.controllerExplodingDeathPoints
      : (this.skills.explodingDeath.points || 0);
    const ownerId = typeof sourceEnemy?.controllerPlayerId === "string" && sourceEnemy.controllerPlayerId
      ? sourceEnemy.controllerPlayerId
      : (this.player.id || null);
    if (!sourceEnemy || !this.isControlledUndead(sourceEnemy)) return;
    if (isNecromancerTalentGame(this) && !hasNecromancerExplodingDeath(this) && !hasNecromancerPlaguecraftDeathBurst(this)) return;
    if (!isNecromancerTalentGame(this) && points < 3) return;
    const radius = isNecromancerTalentGame(this)
      ? getNecromancerExplodingDeathRadiusTiles() * this.config.map.tile
      : this.getExplodingDeathRadius();
    const damage = isNecromancerTalentGame(this) ? getNecromancerExplodingDeathDamage() : this.getDeathExplosionDamage(points);
    for (const enemy of this.enemies || []) {
      if (!enemy || enemy === sourceEnemy || (enemy.hp || 0) <= 0 || this.isEnemyFriendlyToPlayer(enemy)) continue;
      if (vecLength(enemy.x - sourceEnemy.x, enemy.y - sourceEnemy.y) <= radius + (enemy.size || 20) * 0.35) {
        this.applyEnemyDamage(enemy, damage, "death", ownerId);
        if (isNecromancerTalentGame(this) && hasNecromancerPlaguecraftDeathBurst(this)) {
          enemy.rotTimer = Math.max(enemy.rotTimer || 0, getNecromancerRotDuration());
          enemy.rotDps = Math.max(enemy.rotDps || 0, getNecromancerRotDps(this));
        }
      }
    }
    this.fireZones.push({ x: sourceEnemy.x, y: sourceEnemy.y, radius, life: 0.12, zoneType: "deathBurst" });
    if (isNecromancerTalentGame(this) && hasNecromancerExplodingDeath(this)) {
      const runtime = this.necromancerRuntime || (this.necromancerRuntime = {});
      const wasInactive = (runtime.vigorTimer || 0) <= 0;
      runtime.vigorTimer = Math.max(runtime.vigorTimer || 0, 5);
      runtime.vigorBeamTimer = Math.max(runtime.vigorBeamTimer || 0, 2);
      runtime.vigorTotalDuration = 5;
      runtime.vigorHealPool = Math.max(runtime.vigorHealPool || 0, this.player.maxHealth * 0.15);
      if (wasInactive && typeof this.spawnFloatingText === "function") {
        this.spawnFloatingText(this.player.x, this.player.y - 36, "Vigor of Life", "#d7b8ff", 0.95, 15);
      }
    }
  }};
