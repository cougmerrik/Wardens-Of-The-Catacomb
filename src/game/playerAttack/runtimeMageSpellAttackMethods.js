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

export const runtimeMageSpellAttackMethods = {
  castMageSpell(dx, dy) {
    const runtime = this.ensureMageRuntimeState();
    if ((runtime.mimicTimer || 0) > 0) return false;
    if (this.player.fireCooldown > 0 || (runtime.spellCastTimer || 0) > 0) return false;
    const spell = getMageSelectedSpell(this);
    if (!spell) return false;
    if (!this.spendMageMana(2)) return false;
    const runesConsumed = this.consumeMageRunes();
    const wildMagicEffect = this.triggerMageWildMagic(spell);
    const wildDamageMult = wildMagicEffect === "Damage" ? 2 : 1;
    const wildSizeMult = wildMagicEffect === "AoE Size" ? 1.5 : 1;
    const wildKnockback = wildMagicEffect === "Knockback" ? (this.config?.map?.tile || 32) * 5 : 0;
    const wildInfusion = wildMagicEffect === "Elemental Infusion" ? ["burning", "poison", "cold"][Math.floor(Math.random() * 3)] : "";
    if (wildMagicEffect === "Free Cast") runtime.mana = Math.min(this.getMageMaxMana(), (runtime.mana || 0) + 2);
    if (wildMagicEffect === "Speed Regen") {
      runtime.wildSpeedRegenTimer = Math.max(runtime.wildSpeedRegenTimer || 0, 5);
      runtime.vigorTimer = Math.max(runtime.vigorTimer || 0, 5);
      runtime.vigorHealPool = Math.max(runtime.vigorHealPool || 0, (this.player.maxHealth || 1) * 0.12);
    }
    const power = getMageSpellPowerMultiplier(this, { runesConsumed }) * wildDamageMult;
    const durationMult = getMagePersistentDurationMultiplier(this);
    this.player.fireCooldown = 1 * getMageSpellDelayMultiplier(this);
    runtime.spellCastTimer = this.player.fireCooldown;
    runtime.manaRegenPauseTimer = Math.max(runtime.manaRegenPauseTimer || 0, this.player.fireCooldown);
    if ((runtime.invisibilityTimer || 0) > 0) runtime.invisibilityTimer = 0;
    if (spell === "fireballSpell") this.castMageFireball(dx, dy, power, runesConsumed, { sizeMult: wildSizeMult, knockback: wildKnockback, infusion: wildInfusion });
    else if (spell === "chromaticOrbSpell") this.castMageChromaticOrb(dx, dy, power, runesConsumed, { sizeMult: wildSizeMult, knockback: wildKnockback, infusion: wildInfusion });
    else if (spell === "cloudDaggersSpell") this.castMageCloudOfDaggers(dx, dy, power * wildSizeMult, durationMult, runesConsumed);
    else if (spell === "confusionSpell") this.castMageConfusion(dx, dy, power * wildSizeMult, durationMult, runesConsumed);
    else if (spell === "invisibilitySpell") this.castMageSpiritGuardians(dx, dy, power, durationMult, runesConsumed);
    else if (spell === "flamingSphereSpell") this.castMageFlamingSphere(dx, dy, power, durationMult, runesConsumed);
    if (wildMagicEffect === "Split") this.splitLatestMageProjectile();
    this.triggerMageBattlemageEffects(this.player.x, this.player.y, power);
    return true;
  },

  castMageFireball(dx, dy, power = 1, runesConsumed = 0, options = {}) {
    const { x, y, origin } = this.getMageTargetPoint(dx, dy, 8);
    const speed = 360;
    const dist = vecLength(x - origin.x, y - origin.y) || 1;
    this.bullets.push({
      x: origin.x,
      y: origin.y,
      vx: ((x - origin.x) / dist) * speed,
      vy: ((y - origin.y) / dist) * speed,
      angle: Math.atan2(y - origin.y, x - origin.x),
      life: Math.max(0.1, dist / speed),
      size: 10,
      projectileType: "mage_fireball",
      damageType: "fire",
      ownerId: this.player.id || null,
      detonateX: x,
      detonateY: y,
      damage: this.getPrimaryDamage() * 3.4 * power,
      critMultiplier: this.rollMageCritical(),
      blastRadius: (this.config?.map?.tile || 32) * 3 * Math.max(0.75, Math.min(1.35, power)) * (options.sizeMult || 1),
      useSegmentHit: true,
      burnDuration: 3,
      knockback: options.knockback || 0,
      wildInfusion: options.infusion || "",
      runesConsumed
    });
  },

  castMageChromaticOrb(dx, dy, power = 1, runesConsumed = 0, options = {}) {
    const runtime = this.ensureMageRuntimeState();
    const cycle = ["fire", "cold", "lightning"];
    const index = Math.max(0, Math.floor(runtime.chromaticIndex || 0)) % cycle.length;
    const element = cycle[index];
    runtime.chromaticIndex = index + 1;
    const origin = this.getBowMuzzleOrigin(dx, dy);
    const speed = 430;
    const tile = this.config?.map?.tile || 32;
    this.bullets.push({
      x: origin.x,
      y: origin.y,
      vx: origin.dirX * speed,
      vy: origin.dirY * speed,
      angle: Math.atan2(origin.dirY, origin.dirX),
      life: ((this.config?.map?.tile || 32) * 8) / speed,
      size: tile * Math.max(0.85, Math.min(1.25, power)) * (options.sizeMult || 1),
      projectileType: "mage_chromaticOrb",
      damageType: element,
      ownerId: this.player.id || null,
      damage: this.getPrimaryDamage() * 2.0 * power,
      critMultiplier: this.rollMageCritical(),
      pierce: true,
      useSegmentHit: true,
      maxHitsPerFrame: 12,
      knockback: options.knockback || 0,
      wildInfusion: options.infusion || "",
      chromaticElement: element,
      runesConsumed,
      runicRefraction: runesConsumed >= 3,
      hitTargets: new Set()
    });
  },

  splitLatestMageProjectile() {
    const source = [...(this.bullets || [])].reverse().find((bullet) => bullet && String(bullet.projectileType || "").startsWith("mage_") && !bullet.wildSplitClone);
    if (!source) return;
    const baseAngle = Number.isFinite(source.angle) ? source.angle : Math.atan2(source.vy || 0, source.vx || 1);
    const speed = vecLength(source.vx || 0, source.vy || 0) || 320;
    for (const offset of [-0.24, 0.24]) {
      const angle = baseAngle + offset;
      this.bullets.push({
        ...source,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle,
        damage: Math.max(1, (source.damage || 1) * 0.55),
        size: Math.max(4, (source.size || 8) * 0.8),
        wildSplitClone: true,
        hitTargets: new Set()
      });
    }
  },

  castMageCloudOfDaggers(dx, dy, power = 1, durationMult = 1, runesConsumed = 0) {
    const target = this.getMageTargetPoint(dx, dy, 8);
    const tile = this.config?.map?.tile || 32;
    this.fireZones.push({
      x: target.x,
      y: target.y,
      radius: tile * 2 * Math.max(0.8, Math.min(1.25, power)),
      life: 4 * durationMult,
      totalLife: 4 * durationMult,
      tickTimer: 0,
      tickInterval: hasMageTalent(this, "lingeringPower") ? 0.18 : 0.25,
      zoneType: "cloudDaggers",
      ownerId: this.player.id || null,
      dps: this.getPrimaryDamage() * 1.35 * power,
      critMultiplier: this.rollMageCritical(),
      runicBlades: runesConsumed >= 3,
      runicBladeTimer: 1
    });
  },

  castMageConfusion(dx, dy, power = 1, durationMult = 1, runesConsumed = 0) {
    const target = this.getMageTargetPoint(dx, dy, 8);
    const tile = this.config?.map?.tile || 32;
    const duration = 4 * durationMult;
    const controlMult = hasMageTalent(this, "enchanterPath") ? 1.25 : 1;
    const confusionDuration = 3 * controlMult;
    const radius = tile * 2 * Math.max(0.85, Math.min(1.25, power));
    this.fireZones.push({ x: target.x, y: target.y, radius, life: duration, totalLife: duration, zoneType: "confusion", ownerId: this.player.id || null });
    for (const enemy of this.enemies || []) {
      if (!enemy || (enemy.hp || 0) <= 0 || this.isEnemyFriendlyToPlayer(enemy)) continue;
      if (vecLength((enemy.x || 0) - target.x, (enemy.y || 0) - target.y) > radius + (enemy.size || 20) * 0.35) continue;
      if ((enemy.confusionImmunityTimer || 0) <= 0) {
        enemy.confusionTimer = Math.max(enemy.confusionTimer || 0, confusionDuration);
        enemy.confusionOwnerId = this.player.id || null;
        enemy.confusionImmunityTimer = 10;
      }
      if (runesConsumed >= 3) {
        enemy.weakenedTimer = Math.max(enemy.weakenedTimer || 0, duration);
        for (const other of this.enemies || []) {
          if (!other || other === enemy || (other.hp || 0) <= 0 || this.isEnemyFriendlyToPlayer(other)) continue;
          if (vecLength((other.x || 0) - enemy.x, (other.y || 0) - enemy.y) <= tile * 1.2) other.weakenedTimer = Math.max(other.weakenedTimer || 0, 2);
        }
      }
      this.applyMageOnHitEffects(enemy, { status: "confusion", runesConsumed });
    }
  },

  castMageInvisibility(power = 1, runesConsumed = 0) {
    return this.castMageSpiritGuardians(this.player?.dirX || 1, this.player?.dirY || 0, power, 1, runesConsumed);
  },

  castMageSpiritGuardians(dx, dy, power = 1, durationMult = 1, runesConsumed = 0) {
    const runtime = this.ensureMageRuntimeState();
    const tile = this.config?.map?.tile || 32;
    const scale = Math.max(0.75, Math.min(1.35, Number.isFinite(power) ? power : 1));
    const duration = 4 * Math.max(0.5, durationMult || 1);
    runtime.invisibilityTimer = Math.max(runtime.invisibilityTimer || 0, 1.25);
    runtime.targetingBreakTimer = Math.max(runtime.targetingBreakTimer || 0, 1.25);
    runtime.blinkInvulnTimer = Math.max(runtime.blinkInvulnTimer || 0, 0.12);
    this.fireZones.push({
      x: this.player.x,
      y: this.player.y,
      radius: tile * 2.05 * scale,
      life: duration,
      totalLife: duration,
      tickTimer: 0,
      tickInterval: hasMageTalent(this, "lingeringPower") ? 0.2 : 0.28,
      zoneType: "spiritGuardians",
      followOwner: true,
      ownerId: this.player.id || null,
      damageType: "necrotic",
      dps: this.getPrimaryDamage() * 1.65 * power,
      runesConsumed,
      coldSlow: runesConsumed >= 3
    });
    if (typeof this.spawnFloatingText === "function") this.spawnFloatingText(this.player.x, this.player.y - 32, "Spirit Guardians", "#b7f0d0", 0.75, 13);
    return true;
  },

  castMageFlamingSphere(dx, dy, power = 1, durationMult = 1, runesConsumed = 0) {
    const target = this.getMageTargetPoint(dx, dy, 8);
    const id = `flame_sphere_${this.player.id || "p"}_${Math.floor((this.time || 0) * 1000)}_${Math.floor(Math.random() * 10000)}`;
    const sphere = {
      id,
      type: "flaming_sphere",
      tacticKey: "skeleton_warrior",
      x: target.x,
      y: target.y,
      anchorX: target.x,
      anchorY: target.y,
      size: 24,
      speed: 105,
      hp: 28 + this.level * 2,
      maxHp: 28 + this.level * 2,
      baseMaxHp: 28 + this.level * 2,
      damageMin: 3 * power,
      damageMax: 5 * power,
      baseDamageMin: 3 * power,
      baseDamageMax: 5 * power,
      contactAttackCooldown: 0,
      isControlledUndead: true,
      controllerPlayerId: this.player.id || "player",
      controlledAttackSpeedBonusPct: 0.1,
      controlledDamageBonusPct: 0,
      hpBarTimer: 1.2,
      expireTimer: 5 * durationMult,
      fireAuraDps: this.getPrimaryDamage() * 0.8 * power,
      fireAuraTickTimer: 0,
      burnDuration: 3,
      runicFlamesTimer: runesConsumed >= 3 ? 5 : 0,
      controlledColor: "#ff9b52",
      lightRadius: (this.config?.map?.tile || 32) * 2.25,
      lightIntensity: 0.2
    };
    this.enemies.push(sphere);
    if (typeof this.spawnFloatingText === "function") this.spawnFloatingText(sphere.x, sphere.y - 26, "Flaming Sphere", "#ffb05f", 0.65, 12);
  },

  triggerMageWildMagic(spellKey = "") {
    const runtime = this.ensureMageRuntimeState();
    const guaranteed = hasMageTalent(this, "sorcererPath") && (runtime.chaosSurgeTimer || 0) > 0;
    if (!guaranteed && (!hasMageTalent(this, "sorcererPath") || Math.random() >= 0.1)) return;
    const effects = ["Shield", "AoE Size", "Damage", "Free Cast", "Knockback", "Heal", "Self Fireball", "Blue", "Stoneskin", "Mimic", "Elemental Infusion", "Speed Regen", "Split", "Mushrooms", "Double Roll"];
    const effect = effects[Math.floor(Math.random() * effects.length)] || "Shield";
    if (effect === "Shield") {
      runtime.tempHp = Math.max(runtime.tempHp || 0, (this.player.maxHealth || 1) * 0.18);
    } else if (effect === "Heal") {
      this.applyPlayerHealing((this.player.maxHealth || 1) * 0.2);
    } else if (effect === "Self Fireball") {
      this.applyPlayerDamage((this.player.maxHealth || 1) * 0.15, "fire");
      this.fireZones.push({
        x: this.player.x,
        y: this.player.y,
        radius: (this.config?.map?.tile || 32) * 2.2,
        life: 0.35,
        totalLife: 0.35,
        zoneType: "fire",
        ownerId: this.player.id || null,
        dps: this.getPrimaryDamage() * 4
      });
    } else if (effect === "Blue") {
      runtime.blueTimer = Math.max(runtime.blueTimer || 0, 10);
    } else if (effect === "Stoneskin") {
      runtime.stoneskinTimer = Math.max(runtime.stoneskinTimer || 0, 10);
      runtime.battlemageGuardTimer = Math.max(runtime.battlemageGuardTimer || 0, 10);
    } else if (effect === "Mimic") {
      if (Math.random() < 0.5) {
        runtime.mimicTimer = Math.max(runtime.mimicTimer || 0, 13);
        runtime.mimicHealth = Math.max(runtime.mimicHealth || 0, (this.player.maxHealth || 1) * 0.45);
      }
      else return this.triggerMageWildMagic(spellKey);
    } else if (effect === "Mushrooms") {
      let changed = 0;
      for (const enemy of this.enemies || []) {
        if (changed >= 2) break;
        if (!enemy || (enemy.hp || 0) <= 0 || enemy.isBoss || enemy.isFloorBoss || this.isEnemyFriendlyToPlayer(enemy)) continue;
        if (!["goblin", "rat", "rat_archer", "skeleton", "skeleton_warrior", "ghost", "shardling"].includes(enemy.type)) continue;
        enemy.hp = 0;
        this.drops.push({ x: enemy.x, y: enemy.y, type: "mushroom", value: 0, magnet: false });
        changed += 1;
      }
    } else if (effect === "Double Roll") {
      runtime.wildDoubleRollDepth = (runtime.wildDoubleRollDepth || 0) + 1;
      if (runtime.wildDoubleRollDepth <= 1) {
        this.triggerMageWildMagic(spellKey);
        this.triggerMageWildMagic(spellKey);
      }
      runtime.wildDoubleRollDepth = Math.max(0, (runtime.wildDoubleRollDepth || 1) - 1);
    }
    if (typeof this.spawnFloatingText === "function") this.spawnFloatingText(this.player.x, this.player.y - 42, `Wild Magic: ${effect}`, "#ff8ed9", 0.8, 13);
    return effect;
  },

};
