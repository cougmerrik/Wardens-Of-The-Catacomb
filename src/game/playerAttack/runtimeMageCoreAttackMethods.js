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

export const runtimeMageCoreAttackMethods = {
  ensureMageRuntimeState() {
    this.necromancerRuntime = this.necromancerRuntime && typeof this.necromancerRuntime === "object"
      ? this.necromancerRuntime
      : (this.player?.necromancerRuntime && typeof this.player.necromancerRuntime === "object" ? this.player.necromancerRuntime : {});
    if (this.player) this.player.necromancerRuntime = this.necromancerRuntime;
    this.necromancerRuntime.activeMode = this.necromancerRuntime.activeMode === "spell" ? "spell" : "cantrip";
    const maxMana = this.getMageMaxMana();
    this.necromancerRuntime.mana = Math.max(0, Math.min(maxMana, Number.isFinite(this.necromancerRuntime.mana) ? this.necromancerRuntime.mana : maxMana));
    return this.necromancerRuntime;
  },

  getMageMaxMana() {
    return getMageBaseMaxMana(this);
  },

  getMageManaRegen() {
    return getMageManaRegenPerSecond(this);
  },

  toggleMageMode() {
    if (!(this.isNecromancerClass && this.isNecromancerClass())) return false;
    const runtime = this.ensureMageRuntimeState();
    runtime.activeMode = runtime.activeMode === "spell" ? "cantrip" : "spell";
    if (hasMageTalent(this, "catalyst")) runtime.catalystTimer = 2;
    if (typeof this.spawnFloatingText === "function") {
      this.spawnFloatingText(this.player.x, this.player.y - 30, runtime.activeMode === "spell" ? "Spell" : "Cantrip", "#c6a8ff", 0.45, 12);
    }
    return true;
  },

  getMageManaTier() {
    const ratio = this.getMageMaxMana() > 0 ? (this.ensureMageRuntimeState().mana || 0) / this.getMageMaxMana() : 1;
    if (ratio >= 0.8 || (hasMageTalent(this, "wizardPath") && (this.ensureMageRuntimeState().mana || 0) >= 5.6)) return "high";
    if (ratio >= 0.4) return "mid";
    return "low";
  },

  pauseMageManaRegen(duration = 0.5) {
    const runtime = this.ensureMageRuntimeState();
    runtime.manaRegenPauseTimer = Math.max(runtime.manaRegenPauseTimer || 0, duration);
  },

  rollMageCritical() {
    const chance = hasMageTalent(this, "archmage") ? 0.12 : hasMageTalent(this, "wizardPath") ? 0.05 : 0;
    if (chance <= 0 || Math.random() >= chance) return 1;
    return hasMageTalent(this, "archmage") ? 1.75 : 1.5;
  },

  spendMageMana(cost = 2) {
    const runtime = this.ensureMageRuntimeState();
    const safeCost = Math.max(0, Number.isFinite(cost) ? cost : 0);
    if ((runtime.mana || 0) >= safeCost) {
      runtime.mana -= safeCost;
      return true;
    }
    if (hasMageTalent(this, "bloodCasting")) {
      const missing = safeCost - (runtime.mana || 0);
      const hpCost = missing * Math.max(6, (this.player?.maxHealth || 1) * 0.08);
      if ((this.player?.health || 0) > hpCost + 1) {
        this.player.health = Math.max(1, this.player.health - hpCost);
        runtime.mana = 0;
        this.markPlayerHealthBarVisible();
        if (typeof this.spawnFloatingText === "function") {
          this.spawnFloatingText(this.player.x, this.player.y - 18, `-${Math.round(hpCost)}`, "#df6b6b", 0.75, 13);
          this.spawnFloatingText(this.player.x, this.player.y - 34, "Blood Cast", "#df6b6b", 0.65, 12);
        }
        return true;
      }
    }
    return false;
  },

  consumeMageRunes() {
    const runtime = this.ensureMageRuntimeState();
    if (!hasMageTalent(this, "runicMastery")) return 0;
    const runes = Math.max(0, Math.min(3, Math.floor(runtime.runes || 0)));
    runtime.runes = 0;
    runtime.runeTimer = 0;
    return runes;
  },

  gainMageRune() {
    if (!hasMageTalent(this, "runicMastery")) return;
    const runtime = this.ensureMageRuntimeState();
    runtime.runes = Math.min(3, Math.max(0, Math.floor(runtime.runes || 0)) + 1);
    runtime.runeTimer = 6;
  },

  getMageTargetPoint(dx, dy, rangeTiles = 8) {
    const tile = this.config?.map?.tile || 32;
    const range = tile * rangeTiles;
    const origin = this.getBowMuzzleOrigin(dx, dy);
    const targetX = Number.isFinite(this.input?.mouse?.worldX) ? this.input.mouse.worldX : origin.x + origin.dirX * range;
    const targetY = Number.isFinite(this.input?.mouse?.worldY) ? this.input.mouse.worldY : origin.y + origin.dirY * range;
    const totalDist = Math.min(range, vecLength(targetX - origin.x, targetY - origin.y) || range);
    const step = Math.max(8, tile * 0.35);
    const steps = Math.max(1, Math.ceil(totalDist / step));
    let lastX = origin.x;
    let lastY = origin.y;
    for (let i = 1; i <= steps; i++) {
      const dist = Math.min(totalDist, i * step);
      const x = origin.x + origin.dirX * dist;
      const y = origin.y + origin.dirY * dist;
      if (this.isWallAt(x, y, false)) return { x: lastX, y: lastY, origin };
      lastX = x;
      lastY = y;
    }
    return { x: lastX, y: lastY, origin };
  },

  applyMageOnHitEffects(enemy, { status = "", runesConsumed = 0 } = {}) {
    if (!enemy || !(this.isNecromancerClass && this.isNecromancerClass())) return;
    if (hasMageTalent(this, "arcaneBind") && Math.random() < 0.18) {
      const tile = this.config?.map?.tile || 32;
      this.fireZones.push({
        x: enemy.x,
        y: enemy.y,
        radius: tile * 1.15,
        life: 1,
        totalLife: 1,
        zoneType: "arcaneBind",
        ownerId: this.player.id || null,
        damageType: "arcane"
      });
    }
    if (hasMageTalent(this, "enchanterPath")) this.applyMageInfluence(enemy);
    if (status) enemy.lastMageStatus = status;
    if (runesConsumed >= 3 && hasMageTalent(this, "runicMastery") && status === "cold") {
      enemy.slowTimer = Math.max(enemy.slowTimer || 0, 2);
      enemy.slowPct = Math.max(enemy.slowPct || 0, 0.3);
    }
  },

  applyMageInfluence(enemy) {
    if (!enemy || (enemy.hp || 0) <= 0) return;
    enemy.mageInfluenceStacks = Math.min(3, (enemy.mageInfluenceStacks || 0) + 1);
    enemy.mageInfluenceOwnerId = this.player.id || null;
    if ((enemy.mageInfluenceStacks || 0) < 3) return;
    enemy.mageInfluenceStacks = 0;
    const duration = 3 + Math.max(0, Math.min(1, getMageSpellPowerMultiplier(this) - 1)) * 2;
    if (enemy.isBoss || enemy.isFloorBoss) {
      enemy.weakenedTimer = Math.max(enemy.weakenedTimer || 0, duration);
      if ((enemy.confusionImmunityTimer || 0) <= 0) {
        enemy.confusionTimer = Math.max(enemy.confusionTimer || 0, duration);
        enemy.confusionImmunityTimer = 10;
      }
      return;
    }
    if ((enemy.confusionImmunityTimer || 0) <= 0) {
      enemy.confusionTimer = Math.max(enemy.confusionTimer || 0, duration);
      enemy.confusionImmunityTimer = 10;
    }
    if (this.isUndeadEnemy(enemy) && this.canControlMoreUndead()) this.markUndeadAsControlled(enemy);
    else if (this.canControlMoreUndead()) {
      enemy.isControlledUndead = true;
      enemy.controllerPlayerId = this.player.id || null;
      enemy.summonedByPlayer = true;
      enemy.tempMageCharmTimer = Math.max(enemy.tempMageCharmTimer || 0, duration);
      enemy.dieWhenCharmEnds = false;
      enemy.hpBarTimer = this.config.enemy.hpBarDuration;
    }
  },

  triggerMageBattlemageEffects(x = this.player?.x || 0, y = this.player?.y || 0, scale = 1) {
    if (!hasMageTalent(this, "battlemage")) return;
    const tile = this.config?.map?.tile || 32;
    const closeEnemy = (this.enemies || []).some((enemy) => enemy && (enemy.hp || 0) > 0 && !this.isEnemyFriendlyToPlayer(enemy) && vecLength((enemy.x || 0) - (this.player?.x || 0), (enemy.y || 0) - (this.player?.y || 0)) <= tile * 2);
    if (!closeEnemy) return;
    const runtime = this.ensureMageRuntimeState();
    runtime.battlemageGuardTimer = Math.max(runtime.battlemageGuardTimer || 0, 2);
    if ((runtime.battlemageShockwaveCooldownTimer || 0) > 0) return;
    const damage = this.getPrimaryDamage() * 0.85 * Math.max(0.5, scale);
    const radius = tile * 1.25;
    for (const enemy of this.enemies || []) {
      if (!enemy || (enemy.hp || 0) <= 0 || this.isEnemyFriendlyToPlayer(enemy)) continue;
      if (vecLength((enemy.x || 0) - (this.player?.x || 0), (enemy.y || 0) - (this.player?.y || 0)) > radius + (enemy.size || 20) * 0.35) continue;
      this.applyEnemyDamage(enemy, damage, "arcane", this.player.id || null);
    }
    this.fireZones.push({ x: this.player.x, y: this.player.y, radius, life: 0.2, totalLife: 0.2, zoneType: "arcaneBurst", ownerId: this.player.id || null });
    runtime.battlemageShockwaveCooldownTimer = 1;
    if (typeof this.spawnFloatingText === "function") this.spawnFloatingText(this.player.x, this.player.y - 36, "Arcane Shockwave", "#d5ab73", 0.65, 12);
  },

  fireMagePrimary(dx, dy) {
    const runtime = this.ensureMageRuntimeState();
    if ((runtime.mimicTimer || 0) > 0) return this.performMageMimicTongue(dx, dy);
    if (runtime.activeMode === "spell") return this.castMageSpell(dx, dy);
    const cantrip = getMageSelectedCantrip(this) || "fireBoltCantrip";
    if (cantrip === "necroticBeamCantrip") return false;
    if (this.player.fireCooldown > 0) return false;
    const cantripPower = getMageSpellPowerMultiplier(this);
    const cooldowns = {
      fireBoltCantrip: 0.3,
      frostShardCantrip: 0.5,
      shockCantrip: 0.4,
      arcaneMissileCantrip: 0.45,
      greenFlameBladeCantrip: 0.576
    };
    this.player.fireCooldown = (cooldowns[cantrip] || 0.4) * (hasMageTalent(this, "rapidCasting") ? 0.85 : 1);
    this.pauseMageManaRegen(hasMageTalent(this, "rapidCasting") ? 0.35 : 0.5);
    if (cantrip === "greenFlameBladeCantrip") {
      this.performMageGreenFlameBlade(dx, dy, cantripPower);
      this.gainMageRune();
      return true;
    }
    const origin = this.getBowMuzzleOrigin(dx, dy);
    const angle = Math.atan2(origin.dirY, origin.dirX);
    const profile = {
      fireBoltCantrip: { speed: 340, life: 0.95, size: 6, damage: this.getPrimaryDamage() * 0.95 * cantripPower, projectileType: "mage_fireBolt", damageType: "fire", burn: 3 },
      frostShardCantrip: { speed: 250, life: 1.1, size: 7, damage: this.getPrimaryDamage() * 1.08 * cantripPower, projectileType: "mage_frostShard", damageType: "cold", slow: 5, knockback: 24 },
      shockCantrip: { speed: 560, life: 0.75, size: 5, damage: this.getPrimaryDamage() * 0.72 * cantripPower, projectileType: "mage_shock", damageType: "lightning", chainCount: 2 },
      arcaneMissileCantrip: { speed: 330, life: 0.85, size: 6, damage: this.getPrimaryDamage() * 0.68 * cantripPower, projectileType: "mage_arcaneMissile", damageType: "arcane", homing: true, range: (this.config?.map?.tile || 32) * 8 }
    }[cantrip];
    const critMultiplier = this.rollMageCritical();
    const shotAngles = cantrip === "arcaneMissileCantrip" ? [angle - 0.08, angle + 0.08] : [angle];
    for (const shotAngle of shotAngles) {
      this.bullets.push({
        x: origin.x,
        y: origin.y,
        vx: Math.cos(shotAngle) * profile.speed,
        vy: Math.sin(shotAngle) * profile.speed,
        angle: shotAngle,
        life: profile.life,
        size: profile.size,
        damage: profile.damage,
        projectileType: profile.projectileType,
        damageType: profile.damageType,
        ownerId: this.player.id || null,
        burnDuration: profile.burn || 0,
        slowDuration: profile.slow || 0,
        knockback: profile.knockback || 0,
        chainCount: profile.chainCount || 0,
        shockStunChance: cantrip === "shockCantrip" ? 0.25 : 0,
        shockStunDuration: cantrip === "shockCantrip" ? 0.2 : 0,
        mageCantrip: cantrip,
        homing: !!profile.homing,
        homingOriginX: origin.x,
        homingOriginY: origin.y,
        homingDirX: Math.cos(shotAngle),
        homingDirY: Math.sin(shotAngle),
        homingConeCos: profile.homing ? Math.cos(Math.PI / 6) : null,
        range: profile.range || null,
        critMultiplier,
        hitTargets: new Set()
      });
    }
    this.gainMageRune();
    return true;
  },

  performMageMimicTongue(dx, dy) {
    if (this.player.fireCooldown > 0) return false;
    this.player.fireCooldown = 0.42;
    const tile = this.config?.map?.tile || 32;
    const range = tile * 2;
    const angle = Math.atan2(dy, dx);
    const runtime = this.ensureMageRuntimeState();
    runtime.mimicTongueTimer = 0.22;
    runtime.mimicTongueDirX = Math.cos(angle);
    runtime.mimicTongueDirY = Math.sin(angle);
    this.meleeSwings.push({
      x: this.player.x,
      y: this.player.y,
      angle,
      arc: Math.PI * 0.18,
      range,
      style: "mimicTongue",
      label: "Mimic Tongue",
      life: this.config.effects.meleeSwingLife,
      maxLife: this.config.effects.meleeSwingLife
    });
    for (const enemy of this.enemies || []) {
      if (!enemy || (enemy.hp || 0) <= 0 || this.isEnemyFriendlyToPlayer(enemy)) continue;
      const ex = enemy.x - this.player.x;
      const ey = enemy.y - this.player.y;
      const dist = vecLength(ex, ey);
      if (dist > range + (enemy.size || 20) * 0.35) continue;
      const diff = Math.abs(Math.atan2(Math.sin(Math.atan2(ey, ex) - angle), Math.cos(Math.atan2(ey, ex) - angle)));
      if (diff > Math.PI * 0.16) continue;
      this.applyEnemyDamage(enemy, this.getPrimaryDamage() * 1.15, "physical", this.player.id || null);
      break;
    }
    return true;
  },

  performMageGreenFlameBlade(dx, dy, power = 1) {
    const tile = this.config?.map?.tile || 32;
    const scale = Math.max(0.75, Math.min(1.35, Number.isFinite(power) ? power : 1));
    const range = (hasMageTalent(this, "battlemage") ? 2.35 : 1.85) * tile * (0.88 + scale * 0.12);
    const arc = Math.PI * 0.58 * (0.9 + scale * 0.16) * 0.8;
    const angle = Math.atan2(dy, dx);
    this.meleeSwings.push({
      x: this.player.x,
      y: this.player.y,
      angle,
      arc,
      range,
      style: "greenFlameBlade",
      label: "Green-Flame Blade",
      life: this.config.effects.meleeSwingLife,
      maxLife: this.config.effects.meleeSwingLife
    });
    const critMultiplier = this.rollMageCritical();
    const damage = this.getPrimaryDamage() * (hasMageTalent(this, "battlemage") ? 1.55 : 1.3) * scale * critMultiplier;
    let leechTotal = 0;
    for (const enemy of this.enemies || []) {
      if (!enemy || (enemy.hp || 0) <= 0 || this.isEnemyFriendlyToPlayer(enemy)) continue;
      const ex = enemy.x - this.player.x;
      const ey = enemy.y - this.player.y;
      const dist = vecLength(ex, ey);
      if (dist > range + (enemy.size || 20) * 0.45) continue;
      const enemyAngle = Math.atan2(ey, ex);
      let diff = enemyAngle - angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) > arc * 0.5) continue;
      const hpBefore = Number.isFinite(enemy.hp) ? enemy.hp : 0;
      this.applyEnemyDamage(enemy, damage, "fire", this.player.id || null, { critical: critMultiplier > 1 });
      leechTotal += Math.max(0, hpBefore - Math.max(0, Number.isFinite(enemy.hp) ? enemy.hp : 0)) * 0.18;
      enemy.burningTimer = Math.max(enemy.burningTimer || 0, 3);
      enemy.burningDps = Math.max(enemy.burningDps || 0, Math.max(1, damage * 0.2));
      this.applyMageOnHitEffects(enemy, { status: "burning" });
      if (hasMageTalent(this, "battlemage")) {
        for (const other of this.enemies || []) {
          if (!other || other === enemy || (other.hp || 0) <= 0 || this.isEnemyFriendlyToPlayer(other)) continue;
          if (vecLength((other.x || 0) - enemy.x, (other.y || 0) - enemy.y) <= tile * 1.1) this.applyEnemyDamage(other, damage * 0.35, "fire", this.player.id || null);
        }
      }
    }
    for (const br of this.breakables || []) {
      if (!br || (br.hp || 0) <= 0) continue;
      const ex = br.x - this.player.x;
      const ey = br.y - this.player.y;
      const dist = vecLength(ex, ey);
      if (dist > range + (br.size || 20) * 0.45) continue;
      const brAngle = Math.atan2(ey, ex);
      let diff = brAngle - angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) <= arc * 0.5) br.hp = 0;
    }
    if (leechTotal > 0 && typeof this.applyPlayerHealing === "function") {
      this.applyPlayerHealing(Math.min(leechTotal, (this.player.maxHealth || 1) * 0.08));
    }
    this.triggerMageBattlemageEffects(this.player.x, this.player.y, 0.7);
  },

};
