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

export const runtimeRangerOnHitAttackMethods = {
  addRangerCombo(amount = 1) {
    if (!(this.isArcherClass && this.isArcherClass())) return;
    this.rangerRuntime = this.rangerRuntime && typeof this.rangerRuntime === "object" ? this.rangerRuntime : {};
    if (this.player) this.player.rangerRuntime = this.rangerRuntime;
    const gain = Math.floor(Number.isFinite(amount) ? amount : 1);
    let adjustedGain = gain;
    if (hasRangerTalent(this, "relentless") && getRangerCurrentWeaponMode(this) === "melee") adjustedGain += 1;
    if (getRangerSelectedSwapStyle(this) === "predator" && getRangerCurrentWeaponMode(this) === "melee") adjustedGain += 1;
    if (hasRangerTalent(this, "smokeBomb") && this.isPointInRangerSmokeBomb(this.player.x, this.player.y)) adjustedGain += 1;
    this.rangerRuntime.combo = Math.min(30, Math.max(0, Math.floor(this.rangerRuntime.combo || 0)) + adjustedGain);
    this.rangerRuntime.comboDecayDelayTimer = hasRangerTalent(this, "relentless") ? 1.8 : 1.15;
    this.rangerRuntime.comboDecayTickTimer = hasRangerTalent(this, "relentless")
      ? (this.rangerRuntime.combo >= 20 ? 0.68 : this.rangerRuntime.combo >= 10 ? 0.48 : this.rangerRuntime.combo >= 5 ? 0.34 : 0.22)
      : (this.rangerRuntime.combo >= 20 ? 0.46 : this.rangerRuntime.combo >= 10 ? 0.32 : this.rangerRuntime.combo >= 5 ? 0.22 : 0.15);
    if (hasRangerTalent(this, "apexPredator") && this.rangerRuntime.combo >= 5 && (this.rangerRuntime.apexPredatorAnnounceTier || 0) !== getRangerComboTier(this)) {
      this.rangerRuntime.apexPredatorAnnounceTier = getRangerComboTier(this);
      if (typeof this.spawnFloatingText === "function") this.spawnFloatingText(this.player.x, this.player.y - 34, "Apex Predator", "#fff0bd", 0.65, 13);
    }
  },

  applyRangerTalentOnHitEffects(enemy, mode = "ranged") {
    if (!(this.isArcherClass && this.isArcherClass()) || !enemy) return;
    this.rangerRuntime = this.rangerRuntime && typeof this.rangerRuntime === "object" ? this.rangerRuntime : {};
    const ownerId = this.player?.id || null;
    if (hasRangerTalent(this, "venomCoating") && (this.rangerRuntime.venomCooldownTimer || 0) <= 0) {
      enemy.slowTimer = Math.max(enemy.slowTimer || 0, 2);
      enemy.slowPct = Math.max(enemy.slowPct || 0, 0.25);
      enemy.poisonSlowTimer = Math.max(enemy.poisonSlowTimer || 0, 2);
      this.rangerRuntime.venomCooldownTimer = 1;
    }
    if (hasRangerTalent(this, "quarry")) {
      if (this.rangerRuntime.quarryTargetId === enemy.id) this.rangerRuntime.quarryStacks = Math.min(3, (this.rangerRuntime.quarryStacks || 0) + 1);
      else {
        this.rangerRuntime.quarryTargetId = enemy.id || null;
        this.rangerRuntime.quarryStacks = 1;
      }
      if ((this.rangerRuntime.quarryStacks || 0) >= 2) {
        enemy.rangerMarkedBy = ownerId;
        enemy.rangerMarkedTimer = Math.max(enemy.rangerMarkedTimer || 0, 4);
        if (typeof this.applyWarriorMark === "function") this.applyWarriorMark(enemy, 4);
      }
    }
    if (hasRangerTalent(this, "bleed")) {
      enemy.bleedTimer = Math.max(enemy.bleedTimer || 0, 3);
      enemy.bleedDps = Math.max(enemy.bleedDps || 0, this.getPrimaryDamage() * (mode === "melee" ? 0.5 : 0.25));
    }
    if (hasRangerTalent(this, "comboSurge") && (this.rangerRuntime.comboSurgeCooldownTimer || 0) <= 0 && (this.rangerRuntime.combo || 0) >= 10) {
      const tier = getRangerComboTier(this);
      const tile = this.config?.map?.tile || 32;
      this.fireZones.push({
        x: enemy.x,
        y: enemy.y,
        radius: tile * (tier >= 3 ? 1.6 : 1.0),
        life: 0.18,
        totalLife: 0.18,
        zoneType: "rangerSurge",
        ownerId,
        damageType: "physical"
      });
      for (const other of this.enemies || []) {
        if (!other || (other.hp || 0) <= 0 || this.isEnemyFriendlyToPlayer(other)) continue;
        if (vecLength((other.x || 0) - enemy.x, (other.y || 0) - enemy.y) > tile * (tier >= 3 ? 1.6 : 1.0) + (other.size || 20) * 0.35) continue;
        this.applyEnemyDamage(other, this.getPrimaryDamage() * (tier >= 3 ? 0.85 : 0.45), "physical", ownerId);
      }
      this.rangerRuntime.comboSurgeCooldownTimer = tier >= 3 ? 1.5 : 2.2;
    }
    if (hasRangerTalent(this, "livingShadow")) {
      this.triggerLivingShadowEcho(enemy, this.getPrimaryDamage() * (mode === "melee" ? 1.0 : 0.8), mode === "melee" ? "melee" : "physical");
    }
  },

  applyRangerOnHitEffects(enemy, x, y) {
    if (!(this.isArcherClass && this.isArcherClass()) || !enemy) return;
    this.addRangerCombo(getRangerCurrentWeaponModeStats(this)?.comboGain || 1);
    this.applyRangerTalentOnHitEffects(enemy, "ranged");
    if (this.rangerRuntime?.pendingSwapBonus?.mode === "ranged") {
      if (this.rangerRuntime.pendingSwapBonus.style && hasRangerTalent(this, "livingShadow")) this.triggerLivingShadowEcho(enemy, this.getPrimaryDamage() * 0.55, "physical");
      if (this.rangerRuntime.pendingSwapBonus.style === "footwork") this.rangerRuntime.footworkGuardTimer = Math.max(this.rangerRuntime.footworkGuardTimer || 0, 1);
      this.rangerRuntime.pendingSwapBonus = null;
    }
    this.rangerRuntime.lastAttackAt = this.time || 0;
    this.rangerRuntime.lastAttackTargetId = enemy.id || null;
    if (Math.random() < getRangerIgniteChance(this)) {
      enemy.burningTimer = Math.max(enemy.burningTimer || 0, 2.2);
      enemy.burningDps = Math.max(enemy.burningDps || 0, Math.max(1, this.getFireArrowLingerDps() * 0.35));
    }
    if (shouldSpreadWildfire(this) && (enemy.burningTimer || 0) > 0) {
      for (const other of this.enemies || []) {
        if (!other || other === enemy || this.isEnemyFriendlyToPlayer(other)) continue;
        if (vecLength((other.x || 0) - enemy.x, (other.y || 0) - enemy.y) > (this.config.map?.tile || 32) * 1.35) continue;
        if (Math.random() >= 0.25) continue;
        other.burningTimer = Math.max(other.burningTimer || 0, 1.4);
        other.burningDps = Math.max(other.burningDps || 0, Math.max(1, this.getFireArrowLingerDps() * 0.25));
      }
    }
  },

  getRangerArrowDamageAgainst(enemy, projectile) {
    const projectileDamage = Number.isFinite(projectile?.damage) ? projectile.damage : this.rollPrimaryDamage();
    const damageMult = Number.isFinite(projectile?.damageMult) ? projectile.damageMult : 1;
    const critMult = Number.isFinite(projectile?.critMultiplier) ? projectile.critMultiplier : 1;
    const linebreakerMult = 1 + this.getRangerLinebreakerDamageBonus(projectile?.linebreakerHits || 0);
    const pinningLineMult = projectile?.passedPinningFire ? 1.1 : 1;
    let swapMult = 1;
    if (this.rangerRuntime?.pendingSwapBonus?.mode === "ranged") {
      swapMult *= this.rangerRuntime.pendingSwapBonus.damageMult || 1;
      if (this.rangerRuntime.pendingSwapBonus.style === "ambush") {
        const idle = (this.time || 0) - (Number.isFinite(this.rangerRuntime.lastAttackAt) ? this.rangerRuntime.lastAttackAt : -Infinity) >= 2;
        const newTarget = enemy?.id && enemy.id !== this.rangerRuntime.lastAttackTargetId;
        if (idle || newTarget) swapMult *= 1.25;
      }
    }
    if (getRangerSelectedSwapStyle(this) === "ambush" && !this.rangerRuntime?.pendingSwapBonus) {
      const idle = (this.time || 0) - (Number.isFinite(this.rangerRuntime?.lastAttackAt) ? this.rangerRuntime.lastAttackAt : -Infinity) >= 2;
      if (idle) swapMult *= 1.35;
    }
    return projectileDamage * damageMult * critMult * linebreakerMult * pinningLineMult * swapMult * getRangerArrowBonusAgainstEnemy(this, enemy);
  },

  tryAssassinExecuteEnemy(enemy, { ranged = false } = {}) {
    if (!(this.isArcherClass && this.isArcherClass()) || getRangerSelectedPath(this) !== "assassinPath") return false;
    if (!enemy || (enemy.hp || 0) <= 0 || enemy.isBoss || enemy.isFloorBoss) return false;
    const ratio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;
    if (!(ratio > 0 && ratio < 0.15)) return false;
    if (Math.random() >= 0.4) return false;
    enemy.hp = 0;
    enemy.pendingAssassinExecuteKill = true;
    if (ranged && Array.isArray(this.fireZones)) {
      this.fireZones.push({
        x: enemy.x,
        y: enemy.y,
        radius: Math.max(18, (enemy.size || 20) * 0.9),
        life: 0.42,
        totalLife: 0.42,
        zoneType: "assassinExecuteSplash",
        ownerId: this.player?.id || null
      });
    }
    return true;
  },

  triggerLivingShadowEcho(enemy, baseDamage, damageType = "physical") {
    if (!enemy) return;
    if ((this.rangerRuntime?.livingShadowCooldownTimer || 0) > 0) return;
    const damage = Math.max(3, (Number.isFinite(baseDamage) ? baseDamage : this.getPrimaryDamage()) * 0.55);
    if ((enemy.hp || 0) > 0) this.applyEnemyDamage(enemy, damage, damageType, this.player.id || null);
    this.rangerRuntime.livingShadowCooldownTimer = 0.8;
    this.fireZones.push({
      x: this.player?.x || enemy.x,
      y: this.player?.y || enemy.y,
      targetX: enemy.x,
      targetY: enemy.y,
      radius: 0,
      life: 0.35,
      totalLife: 0.35,
      zoneType: "ghostSiphon",
      ownerId: this.player.id || null
    });
    if (typeof this.spawnFloatingText === "function") this.spawnFloatingText(enemy.x, enemy.y - 42, `Shadow Echo -${Math.round(damage)}`, "#d8b5ff", 0.75, 12);
  },

};
