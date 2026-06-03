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

export const runtimeRangerActiveAttackMethods = {
  fireFireArrow(dx, dy) {
    if (this.isNecromancerClass()) {
      return this.activateMageClassSkill(dx, dy);
    }
    if (!this.classSpec.usesRanged) {
      this.activateWarriorRage();
      return;
    }
    if (this.isArcherClass && this.isArcherClass()) {
      const path = getRangerSelectedPath(this);
      if (path === "roguePath") return this.activateRangerShadowstep(dx, dy);
      if (path === "assassinPath") return this.activateRangerExecute(dx, dy);
      if (path === "beastMasterPath") return this.activateRangerNaturesAlly();
      if (path !== "rangerPath") return this.activateRangerDodge();
    }
    if (!this.isFireArrowUnlocked() || this.player.fireArrowCooldown > 0) return;
    this.player.fireArrowCooldown = this.getRangerFireArrowCooldown();
    if (this.rangerRuntime) this.rangerRuntime.classSkillCooldownTimer = this.player.fireArrowCooldown;
    if (typeof this.recordClassSpecificStat === "function") this.recordClassSpecificStat("ranger", "shotsFired", 1);
    const origin = this.getBowMuzzleOrigin(dx, dy);
    const releaseTailOffset = 8;
    const speed = this.config.fireArrow.speed;
    const life = this.config.fireArrow.life;
    const maxTravelDistance = speed * life;
    const clickedX = Number.isFinite(this.input?.mouse?.worldX) ? this.input.mouse.worldX : (origin.x + origin.dirX * maxTravelDistance);
    const clickedY = Number.isFinite(this.input?.mouse?.worldY) ? this.input.mouse.worldY : (origin.y + origin.dirY * maxTravelDistance);
    const detonateDistance = Math.min(maxTravelDistance, vecLength(clickedX - origin.x, clickedY - origin.y) || maxTravelDistance);
    this.fireArrows.push({
      x: origin.x + origin.dirX * releaseTailOffset,
      y: origin.y + origin.dirY * releaseTailOffset,
      vx: origin.dirX * speed,
      vy: origin.dirY * speed,
      angle: Math.atan2(origin.dirY, origin.dirX),
      life,
      size: 8 + getRangerFireArrowProjectileSizeBonus(this),
      ownerId: this.player.id || null,
      impactDamage: this.getFireArrowImpactDamage(),
      blastRadius: this.getFireArrowBlastRadius(),
      lingerDuration: this.config.fireArrow.lingerDuration * this.getRangerFireArrowDurationMultiplier(),
      lingerDps: this.getFireArrowLingerDps(),
      pinningShot: hasPinningShot(this),
      detonateX: hasFireMastery(this) ? origin.x + origin.dirX * detonateDistance : null,
      detonateY: hasFireMastery(this) ? origin.y + origin.dirY * detonateDistance : null
    });
  },

  activateMageClassSkill(dx, dy) {
    const runtime = this.ensureMageRuntimeState();
    if ((runtime.mimicTimer || 0) > 0) return false;
    if ((runtime.classSkillCooldownTimer || 0) > 0) return false;
    const path = getMageSelectedPath(this);
    if (path === "wizardPath") return this.activateMageArcaneFocus();
    if (path === "necromancerPath") {
      const fired = this.fireDeathBolt(dx, dy);
      if (fired) runtime.classSkillCooldownTimer = Math.max(runtime.classSkillCooldownTimer || 0, this.player.deathBoltCooldown || 10);
      if (fired) this.applyMageClassSkillSecondaryBenefit();
      return fired;
    }
    if (path === "sorcererPath") {
      const blinked = this.activateMageBlink(dx, dy, { label: "Chaos Surge", color: "#ff8ed9" });
      if (blinked) {
        runtime.chaosSurgeTimer = 5;
        runtime.classSkillCooldownTimer = 10;
        this.applyMageClassSkillSecondaryBenefit();
      }
      return blinked;
    }
    const blinked = this.activateMageBlink(dx, dy, { decoy: path === "enchanterPath", label: path === "enchanterPath" ? "Mirage" : "Blink", color: path === "enchanterPath" ? "#8fdc8f" : "#c6a8ff" });
    if (blinked) this.applyMageClassSkillSecondaryBenefit();
    return blinked;
  },

  applyMageClassSkillSecondaryBenefit() {
    if (!hasMageTalent(this, "archmage") || this.getMageManaTier() !== "high") return;
    const runtime = this.ensureMageRuntimeState();
    runtime.tempHp = Math.max(runtime.tempHp || 0, (this.player.maxHealth || 1) * 0.12);
    runtime.runes = Math.min(3, Math.max(0, Math.floor(runtime.runes || 0)) + 1);
    runtime.runeTimer = Math.max(runtime.runeTimer || 0, 6);
    if (typeof this.spawnFloatingText === "function") this.spawnFloatingText(this.player.x, this.player.y - 48, "High Arcana", "#d8e6ff", 0.7, 12);
  },

  activateMageArcaneFocus() {
    const runtime = this.ensureMageRuntimeState();
    if ((runtime.classSkillCooldownTimer || 0) > 0) return false;
    const blinked = this.activateMageBlink(this.player?.dirX || 1, this.player?.dirY || 0, { label: "Arcane Focus", color: "#8eb8ff", noCooldown: true });
    if (!blinked) return false;
    runtime.arcaneFocusTier = this.getMageManaTier();
    runtime.arcaneFocusTimer = 8;
    runtime.mana = Math.min(this.getMageMaxMana(), (runtime.mana || 0) + 3);
    runtime.classSkillCooldownTimer = 18;
    if (hasMageTalent(this, "battlemage")) runtime.tempHp = Math.max(runtime.tempHp || 0, (this.player.maxHealth || 1) * 0.15);
    this.applyMageClassSkillSecondaryBenefit();
    if (typeof this.spawnFloatingText === "function") this.spawnFloatingText(this.player.x, this.player.y - 34, "Arcane Focus", "#8eb8ff", 0.75, 13);
    return true;
  },

  activateMageBlink(dx, dy, options = {}) {
    const runtime = this.ensureMageRuntimeState();
    if ((runtime.classSkillCooldownTimer || 0) > 0) return false;
    const len = vecLength(dx, dy) || 1;
    const tile = this.config?.map?.tile || 32;
    const maxDistance = tile * 4;
    const step = Math.max(8, tile * 0.35);
    const steps = Math.ceil(maxDistance / step);
    let moveX = 0;
    let moveY = 0;
    for (let i = 1; i <= steps; i++) {
      const dist = Math.min(maxDistance, i * step);
      const tx = this.player.x + (dx / len) * dist;
      const ty = this.player.y + (dy / len) * dist;
      if (this.isWallAt(tx, ty, false)) break;
      moveX = (dx / len) * dist;
      moveY = (dy / len) * dist;
    }
    if (options.decoy) {
      this.enemies.push({
        type: "mage_decoy",
        tacticKey: "mage_decoy",
        x: this.player.x,
        y: this.player.y,
        size: 22,
        speed: 0,
        hp: (this.player.maxHealth || 1) * 0.18,
        maxHp: (this.player.maxHealth || 1) * 0.18,
        damageMin: 0,
        damageMax: 0,
        isControlledUndead: true,
        controllerPlayerId: this.player.id || null,
        summonedByPlayer: true,
        skipRewardsOnDeath: true,
        hpBarTimer: 1.2,
        decoyFireCooldown: 0.25
      });
    }
    this.moveWithCollisionSubsteps(this.player, moveX, moveY);
    runtime.blinkInvulnTimer = 0.18;
    runtime.targetingBreakTimer = 0.5;
    if (!options.noCooldown) runtime.classSkillCooldownTimer = 10;
    if (hasMageTalent(this, "battlemage")) runtime.tempHp = Math.max(runtime.tempHp || 0, (this.player.maxHealth || 1) * 0.15);
    if (typeof this.spawnFloatingText === "function") this.spawnFloatingText(this.player.x, this.player.y - 32, options.label || "Blink", options.color || "#c6a8ff", 0.65, 12);
    return true;
  },

  activateRangerDodge() {
    this.rangerRuntime = this.rangerRuntime && typeof this.rangerRuntime === "object" ? this.rangerRuntime : {};
    if ((this.rangerRuntime.classSkillCooldownTimer || 0) > 0) return false;
    this.rangerRuntime.dodgeTimer = 1.25;
    this.rangerRuntime.classSkillCooldownTimer = 6;
    this.player.speed = this.getPlayerMoveSpeedFor(this.player);
    if (typeof this.spawnFloatingText === "function") this.spawnFloatingText(this.player.x, this.player.y - 30, "Dodge", "#b7f4dc", 0.6, 13);
    return true;
  },

  activateRangerShadowstep(dx, dy) {
    this.rangerRuntime = this.rangerRuntime && typeof this.rangerRuntime === "object" ? this.rangerRuntime : {};
    if ((this.rangerRuntime.classSkillCooldownTimer || 0) > 0) return false;
    const len = vecLength(dx, dy) || 1;
    const distance = 140;
    this.moveWithCollisionSubsteps(this.player, (dx / len) * distance, (dy / len) * distance);
    this.rangerRuntime.shadowVeilTimer = Math.max(this.rangerRuntime.shadowVeilTimer || 0, 1.5);
    this.rangerRuntime.pendingSwapBonus = { mode: getRangerCurrentWeaponMode(this), damageMult: 1, comboBonus: 0 };
    this.rangerRuntime.classSkillCooldownTimer = 8;
    if (typeof this.spawnFloatingText === "function") this.spawnFloatingText(this.player.x, this.player.y - 30, "Shadowstep", "#c7a5ff", 0.6, 13);
    return true;
  },

  activateRangerExecute(dx, dy) {
    this.rangerRuntime = this.rangerRuntime && typeof this.rangerRuntime === "object" ? this.rangerRuntime : {};
    if ((this.rangerRuntime.classSkillCooldownTimer || 0) > 0) return false;
    const origin = this.getBowMuzzleOrigin(dx, dy);
    const modeStats = getRangerWeaponStats(this).ranged || {};
    const executeRange = Number.isFinite(modeStats.range) ? modeStats.range : 320;
    let target = null;
    const mouseX = Number.isFinite(this.input?.mouse?.worldX) ? this.input.mouse.worldX : null;
    const mouseY = Number.isFinite(this.input?.mouse?.worldY) ? this.input.mouse.worldY : null;
    if (Number.isFinite(mouseX) && Number.isFinite(mouseY)) {
      let bestMouseDist = Number.POSITIVE_INFINITY;
      for (const enemy of this.enemies || []) {
        if (!enemy || (enemy.hp || 0) <= 0 || this.isEnemyFriendlyToPlayer(enemy)) continue;
        const rangeDist = vecLength((enemy.x || 0) - origin.x, (enemy.y || 0) - origin.y);
        if (rangeDist > executeRange + (enemy.size || 20) * 0.5) continue;
        if (!hasLineOfSight(this, origin.x, origin.y, enemy.x, enemy.y)) continue;
        const dist = vecLength((enemy.x || 0) - mouseX, (enemy.y || 0) - mouseY);
        if (dist > (enemy.size || 20) * 0.65 || dist >= bestMouseDist) continue;
        target = enemy;
        bestMouseDist = dist;
      }
    }
    if (!target) {
      let bestDist = Number.POSITIVE_INFINITY;
      for (const enemy of this.enemies || []) {
        if (!enemy || (enemy.hp || 0) <= 0 || this.isEnemyFriendlyToPlayer(enemy)) continue;
        if (enemy.type === "skeleton_warrior" && enemy.collapsed) continue;
        const dist = vecLength((enemy.x || 0) - origin.x, (enemy.y || 0) - origin.y);
        if (dist > executeRange + (enemy.size || 20) * 0.5 || dist >= bestDist) continue;
        if (!hasLineOfSight(this, origin.x, origin.y, enemy.x, enemy.y)) continue;
        {
          target = enemy;
          bestDist = dist;
        }
      }
    }
    if (!target) return false;
    const sx = this.player.x;
    const sy = this.player.y - 8;
    const dxToTarget = (target.x || sx) - sx;
    const dyToTarget = (target.y || sy) - sy;
    const len = vecLength(dxToTarget, dyToTarget) || 1;
    const speed = 620;
    this.bullets.push({
      x: sx,
      y: sy,
      vx: (dxToTarget / len) * speed,
      vy: (dyToTarget / len) * speed,
      angle: Math.atan2(dyToTarget, dxToTarget),
      life: Math.max(0.12, Math.min(0.45, len / speed)),
      size: 6,
      projectileType: "ranger_executeKnife",
      visualOnly: true,
      executeTargetId: target.id || null,
      ownerId: this.player.id || null
    });
    target.rangerMarkedBy = this.player.id || null;
    target.rangerMarkedTimer = Math.max(target.rangerMarkedTimer || 0, 4);
    if (typeof this.applyWarriorMark === "function") this.applyWarriorMark(target, 4);
    const isBossTarget = !!(target.isBoss || target.isFloorBoss);
    const executeDamage = isBossTarget
      ? this.rollPrimaryDamage() * getRangerCritMultiplier()
      : Math.max(9999, (target.hp || 1) * 20, (target.maxHp || 1) * 20);
    this.applyEnemyDamage(target, executeDamage, "physical", this.player.id || null, { critical: true });
    this.addRangerCombo(2);
    this.rangerRuntime.classSkillCooldownTimer = 7;
    if (typeof this.spawnFloatingText === "function") this.spawnFloatingText(target.x, target.y - 30, isBossTarget ? "Execute Crit" : "Execute", "#ffc0b3", 0.65, 13);
    return true;
  },

  dropRangerSmokeBomb() {
    this.rangerRuntime = this.rangerRuntime && typeof this.rangerRuntime === "object" ? this.rangerRuntime : {};
    if ((this.rangerRuntime.smokeBombCooldownTimer || 0) > 0) return false;
    const tile = this.config?.map?.tile || 32;
    this.fireZones.push({
      x: this.player.x,
      y: this.player.y,
      radius: tile * 1.55,
      life: 2.75,
      totalLife: 2.75,
      zoneType: "smokeBomb",
      ownerId: this.player.id || null
    });
    this.rangerRuntime.smokeBombCooldownTimer = 15;
    return true;
  },

  isPointInRangerSmokeBomb(x, y) {
    for (const zone of this.fireZones || []) {
      if (!zone || zone.life <= 0 || zone.zoneType !== "smokeBomb") continue;
      if (vecLength((x || 0) - (zone.x || 0), (y || 0) - (zone.y || 0)) <= (zone.radius || 0)) return true;
    }
    return false;
  },

  activateRangerNaturesAlly() {
    this.rangerRuntime = this.rangerRuntime && typeof this.rangerRuntime === "object" ? this.rangerRuntime : {};
    if ((this.rangerRuntime.classSkillCooldownTimer || 0) > 0) return false;
    const existing = (this.enemies || []).find((enemy) => enemy && enemy.id === this.rangerRuntime.wolfId && (enemy.hp || 0) > 0);
    if (existing) {
      existing.hp = existing.maxHp || existing.hp || 1;
      existing.hpBarTimer = Math.max(existing.hpBarTimer || 0, 1.2);
      if (typeof this.spawnFloatingText === "function") this.spawnFloatingText(existing.x, existing.y - 28, "Nature's Ally", "#d0f09d", 0.7, 13);
    } else {
      const id = `wolf_${this.player.id || "p"}_${Math.floor((this.time || 0) * 1000)}_${Math.floor(Math.random() * 10000)}`;
      const wolf = {
        id,
        type: "wolf",
        tacticKey: "skeleton_warrior",
        x: this.player.x + (this.player.dirX || 1) * 28,
        y: this.player.y + (this.player.dirY || 0) * 28,
        size: 22,
        speed: 132,
        hp: 55 + this.level * 5,
        maxHp: 55 + this.level * 5,
        baseMaxHp: 55 + this.level * 5,
        damageMin: 4 + this.level * 0.35,
        damageMax: 7 + this.level * 0.45,
        baseDamageMin: 4 + this.level * 0.35,
        baseDamageMax: 7 + this.level * 0.45,
        contactAttackCooldown: 0,
        isControlledUndead: true,
        controllerPlayerId: this.player.id || "player",
        controlledAttackSpeedBonusPct: 0.15,
        controlledDamageBonusPct: 0,
        hpBarTimer: 1.2
      };
      this.enemies.push(wolf);
      this.rangerRuntime.wolfId = id;
      if (typeof this.spawnFloatingText === "function") this.spawnFloatingText(wolf.x, wolf.y - 28, "Wolf", "#d0f09d", 0.7, 13);
    }
    this.rangerRuntime.dodgeTimer = Math.max(this.rangerRuntime.dodgeTimer || 0, 2);
    this.rangerRuntime.classSkillCooldownTimer = 10;
    this.player.speed = this.getPlayerMoveSpeedFor(this.player);
    return true;
  },

};
