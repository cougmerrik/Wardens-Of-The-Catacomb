import { vecLength } from "../utils.js";
import { hasLineOfSight } from "./enemyAiShared.js";
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
} from "./rangerTalentTree.js";
import {
  getWarriorDoctrine,
  getWarriorButchersPathNextHitArcBonus,
  getWarriorButchersPathNextHitDamageBonus,
  getWarriorBattleFrenzyDamageBonus,
  getWarriorCrusaderUndeadDamageBonus,
  getWarriorExecutionerRageCleaveWidthBonus,
  getWarriorExecutionerRageRangeBonus,
  getWarriorHeavyHandCleaveArcBonus,
  getWarriorHeavyHandDamageBonus,
  getWarriorJudgmentWaveChance,
  getWarriorJudgmentWaveDamageMultiplier,
  getWarriorJudgmentWaveShredPct,
  getWarriorStanceLabel,
  getWarriorStanceModifier,
  getWarriorSwapCooldown,
  getWarriorWeaponForm,
  hasWarriorButchersPath,
  hasWarriorBattleFrenzy,
  hasWarriorParagon,
  hasWarriorCleaveDiscipline,
  hasWarriorJudgmentWave,
  hasWarriorRavager,
  hasWarriorSpellknight,
  isWarriorRaging,
  isWarriorTalentGame
} from "./warriorTalentTree.js";
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
} from "./necromancerTalentTree.js";
import { spawnGhost } from "./enemySpawnFactories.js";

function getWarriorShockReleaseLightPower(game, doctrine = "") {
  const lighting = game?.config?.lighting || {};
  if (doctrine === "paladin") return Number.isFinite(lighting.shockReleasePaladinLightPower) ? Math.max(0, lighting.shockReleasePaladinLightPower) : 0;
  if (doctrine === "eldritch") return Number.isFinite(lighting.shockReleaseEldritchLightPower) ? Math.max(0, lighting.shockReleaseEldritchLightPower) : 0;
  return 0;
}

function getWarriorShockReleaseLightRadius(game) {
  const tile = game?.config?.map?.tile || 32;
  const lighting = game?.config?.lighting || {};
  const radiusTiles = Number.isFinite(lighting.torchRadiusTiles) ? Math.max(0, lighting.torchRadiusTiles) : 2.25;
  return radiusTiles * tile;
}

function getWarriorWeaponProfile(style) {
  switch (style) {
    case "longspear":
      return { style, weaponLabel: "Longspear", range: 76, arcDeg: 40, damageMult: 1.08, cooldownMult: 1.12, knockback: 11, bonusStagger: 0.18 };
    case "warWhip":
      return { style, weaponLabel: "War Whip", range: 60, arcDeg: 86, damageMult: 0.88, cooldownMult: 0.9, knockback: 8, slowOnHit: 0.12 };
    case "twinHatchets":
      return { style, weaponLabel: "Twin Hatchets", range: 38, arcDeg: 70, damageMult: 0.8, cooldownMult: 0.66, knockback: 9 };
    default:
      return { style: "broadswing", weaponLabel: "Broadswing", range: 44, arcDeg: 125, damageMult: 1, cooldownMult: 1, knockback: 12 };
  }
}

function getModifierDisplayLabel(modifier) {
  if (!modifier) return "Balanced";
  return `${modifier[0].toUpperCase()}${modifier.slice(1)}`;
}

export const runtimePlayerAttackMethods = {
  ensureWarriorRuntimeState() {
    this.warriorRuntime = this.warriorRuntime && typeof this.warriorRuntime === "object"
      ? this.warriorRuntime
      : (this.player?.warriorRuntime && typeof this.player.warriorRuntime === "object" ? this.player.warriorRuntime : {});
    if (this.player) this.player.warriorRuntime = this.warriorRuntime;
    if (typeof this.warriorRuntime.activeAttackMode !== "string") this.warriorRuntime.activeAttackMode = "primary";
    this.warriorRuntime.attackSwapCooldownTimer = Number.isFinite(this.warriorRuntime.attackSwapCooldownTimer) ? this.warriorRuntime.attackSwapCooldownTimer : 0;
    return this.warriorRuntime;
  },

  getCurrentWarriorAttackMode() {
    const runtime = this.ensureWarriorRuntimeState();
    return runtime.activeAttackMode === "secondary" ? "secondary" : "primary";
  },

  getCurrentWarriorStanceSlot() {
    return this.getCurrentWarriorAttackMode() === "secondary" ? "B" : "A";
  },

  toggleWarriorAttackMode() {
    if (!(this.isWarriorClass && this.isWarriorClass())) return false;
    const runtime = this.ensureWarriorRuntimeState();
    if ((runtime.attackSwapCooldownTimer || 0) > 0) return false;
    runtime.activeAttackMode = runtime.activeAttackMode === "secondary" ? "primary" : "secondary";
    runtime.attackSwapCooldownTimer = getWarriorSwapCooldown(this);
    if (getWarriorDoctrine(this) === "gladiator") {
      runtime.gladiatorSwapTimer = 1.6;
      runtime.gladiatorSwapMode = runtime.activeAttackMode;
      if (hasWarriorJudgmentWave(this)) this.gainWarriorShockReleaseCharges(1);
    }
    if (hasWarriorParagon(this)) {
      runtime.paragonPrimaryReady = runtime.activeAttackMode === "primary";
      runtime.paragonSecondaryReady = runtime.activeAttackMode === "secondary";
    }
    if (typeof this.spawnFloatingText === "function") {
      const label = this.getWarriorModeDisplayName(runtime.activeAttackMode);
      this.spawnFloatingText(this.player.x, this.player.y - 30, label, "#f4efe3", 0.55, 13);
    }
    return true;
  },

  getWarriorModeDisplayName(mode = null) {
    const stance = mode === "secondary" ? "B" : mode === "primary" ? "A" : this.getCurrentWarriorStanceSlot();
    return getWarriorStanceLabel(this, stance);
  },

  getWarriorWeaponProfile() {
    return getWarriorWeaponProfile(getWarriorWeaponForm(this));
  },

  getWarriorShockReleaseThreshold() {
    return getWarriorDoctrine(this) === "gladiator" ? 4 : 5;
  },

  clearWarriorMarks(ownerId = this.player?.id || null) {
    if (!ownerId) return;
    for (const enemy of this.enemies || []) {
      if (!enemy || enemy.arcaneMarkOwnerId !== ownerId) continue;
      enemy.arcaneMarkTimer = 0;
      enemy.arcaneMarkOwnerId = null;
    }
  },

  getWarriorMarkedEnemy(ownerId = this.player?.id || null) {
    if (!ownerId) return null;
    for (const enemy of this.enemies || []) {
      if (!enemy || (enemy.hp || 0) <= 0) continue;
      if ((enemy.arcaneMarkTimer || 0) > 0 && enemy.arcaneMarkOwnerId === ownerId) return enemy;
    }
    return null;
  },

  applyWarriorMark(enemy, duration = 5) {
    if (!enemy || (enemy.hp || 0) <= 0) return false;
    const ownerId = this.player?.id || null;
    if (!ownerId) return false;
    this.clearWarriorMarks(ownerId);
    enemy.arcaneMarkTimer = Math.max(enemy.arcaneMarkTimer || 0, duration);
    enemy.arcaneMarkOwnerId = ownerId;
    return true;
  },

  refreshWarriorMark(enemy, duration = 5) {
    const ownerId = this.player?.id || null;
    if (!enemy || !ownerId || enemy.arcaneMarkOwnerId !== ownerId) return false;
    enemy.arcaneMarkTimer = Math.max(enemy.arcaneMarkTimer || 0, duration);
    return true;
  },

  markHighestHpEnemy(candidates = [], duration = 5, anchorX = this.player?.x || 0, anchorY = this.player?.y || 0) {
    let best = null;
    let bestHp = -Infinity;
    let bestCenterDist = Number.POSITIVE_INFINITY;
    let bestPlayerDist = Number.POSITIVE_INFINITY;
    for (const enemy of candidates) {
      if (!enemy || (enemy.hp || 0) <= 0 || this.isEnemyFriendlyToPlayer(enemy)) continue;
      const totalHp = Number.isFinite(enemy.maxHp) && enemy.maxHp > 0 ? enemy.maxHp : (enemy.hp || 0);
      const centerDist = Math.hypot((enemy.x || 0) - anchorX, (enemy.y || 0) - anchorY);
      const playerDist = Math.hypot((enemy.x || 0) - (this.player?.x || 0), (enemy.y || 0) - (this.player?.y || 0));
      if (
        totalHp > bestHp ||
        (totalHp === bestHp && centerDist < bestCenterDist) ||
        (totalHp === bestHp && centerDist === bestCenterDist && playerDist < bestPlayerDist)
      ) {
        best = enemy;
        bestHp = totalHp;
        bestCenterDist = centerDist;
        bestPlayerDist = playerDist;
      }
    }
    if (!best) return null;
    this.applyWarriorMark(best, duration);
    return best;
  },

  gainWarriorShockReleaseCharges(amount = 0) {
    if (!hasWarriorJudgmentWave(this)) return 0;
    const runtime = this.ensureWarriorRuntimeState();
    const threshold = this.getWarriorShockReleaseThreshold();
    const gain = Math.max(0, Math.floor(amount));
    if (gain <= 0) return runtime.shockReleaseCharges || 0;
    runtime.shockReleaseCharges = Math.min(threshold, (runtime.shockReleaseCharges || 0) + gain);
    runtime.shockReleaseComboTimer = 2;
    if ((runtime.shockReleaseCharges || 0) >= threshold) runtime.shockReleaseReady = true;
    return runtime.shockReleaseCharges || 0;
  },

  triggerWarriorShockRelease(angle, range, attackProfile = null) {
    if (!hasWarriorJudgmentWave(this)) return false;
    const profile = attackProfile || this.getWarriorAttackProfile();
    const tile = this.config?.map?.tile || 32;
    const life = 0.9;
    const doctrine = getWarriorDoctrine(this);
    const waveTiles = doctrine === "eldritch" ? 11 : doctrine === "paladin" ? 8 : 5;
    const speed = (tile * waveTiles) / life;
    const damageType = doctrine === "eldritch" ? "arcane" : doctrine === "paladin" ? "holy" : "physical";
    this.bullets.push({
      x: this.player.x + Math.cos(angle) * (range * 0.45),
      y: this.player.y + Math.sin(angle) * (range * 0.45),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle,
      life,
      size: 28,
      faction: "player",
      projectileType: "holyWave",
      damage: this.rollPrimaryDamage() * (getWarriorJudgmentWaveDamageMultiplier(this) + Math.max(0, profile?.waveDamageBonus || 0)),
      damageType,
      hitTargets: new Set(),
      ownerId: this.player.id || null,
      undeadDefenseShredPct: damageType === "holy" ? getWarriorJudgmentWaveShredPct(this) : 0,
      waveArc: Number.isFinite(profile?.arcDeg) ? (profile.arcDeg * Math.PI) / 180 : 0,
      markOnHit: doctrine === "paladin",
      markDuration: doctrine === "paladin" ? 5 : 0,
      shockKnockback: doctrine === "gladiator" ? 30 : 0,
      shockStun: doctrine === "gladiator" ? 0.5 : 0,
      lightRadius: getWarriorShockReleaseLightRadius(this),
      lightIntensity: getWarriorShockReleaseLightPower(this, doctrine)
    });
    const runtime = this.ensureWarriorRuntimeState();
    runtime.shockReleaseCharges = 0;
    runtime.shockReleaseComboTimer = 0;
    runtime.shockReleaseReady = false;
    return true;
  },

  getWarriorAttackProfile(mode = null) {
    const activeMode = mode || this.getCurrentWarriorAttackMode();
    const stance = activeMode === "secondary" ? "B" : "A";
    const modifier = getWarriorStanceModifier(this, stance);
    const doctrine = getWarriorDoctrine(this);
    const base = { ...this.getWarriorWeaponProfile() };
    const profile = {
      ...base,
      mode: activeMode,
      stance,
      modifier,
      modifierLabel: getModifierDisplayLabel(modifier),
      label: `${base.weaponLabel} / ${getModifierDisplayLabel(modifier)}`,
      arcaneBonus: 0,
      holyBonus: 0,
      blockWindow: 0,
      executeBonus: 0,
      markDuration: 0,
      waveChanceBonus: 0,
      waveDamageBonus: 0,
      surgeDuration: 0,
      moveStepTiles: 0,
      moveStepDir: "",
      slowOnHit: base.slowOnHit || 0,
      bonusStagger: base.bonusStagger || 0,
      hitWidthBonus: 0
    };

    switch (modifier) {
      case "cleaving":
        profile.arcDeg *= profile.style === "longspear" ? 1.5 : profile.style === "warWhip" ? 1.4 : 1.25;
        profile.range *= profile.style === "warWhip" ? 1.06 : profile.style === "twinHatchets" ? 1.14 : 1.02;
        profile.damageMult *= 0.92;
        profile.knockback += 2;
        break;
      case "focused":
        profile.arcDeg *= profile.style === "broadswing" ? 0.68 : profile.style === "warWhip" ? 0.74 : 0.8;
        profile.range *= profile.style === "longspear" ? 1.08 : 1;
        profile.damageMult *= 1.33;
        profile.cooldownMult *= 1.08;
        profile.knockback += 3;
        profile.bonusStagger += 0.12;
        profile.executeBonus += 0.2;
        break;
      case "swift":
        profile.arcDeg *= profile.style === "twinHatchets" ? 1.08 : 0.96;
        profile.damageMult *= 0.68;
        profile.cooldownMult *= 0.72;
        break;
      case "heavy":
        profile.arcDeg *= profile.style === "warWhip" ? 0.92 : 1.05;
        profile.range *= profile.style === "longspear" ? 1.06 : 1;
        profile.damageMult *= 1.28;
        profile.cooldownMult *= 1.22;
        profile.knockback += 10;
        profile.bonusStagger += 0.16;
        break;
      case "guarded":
        profile.damageMult *= 0.88;
        profile.cooldownMult *= 1.04;
        profile.blockWindow += 0.55;
        profile.knockback += 2;
        profile.arcDeg *= 1.02;
        profile.bonusStagger += 0.08;
        break;
      case "marked":
        profile.markDuration = 5;
        profile.range *= 1.1;
        if (profile.style === "warWhip") profile.slowOnHit = Math.max(profile.slowOnHit || 0, 0.14);
        break;
      default:
        break;
    }

    switch (doctrine) {
      case "paladin":
        profile.holyBonus += 0.14;
        if (modifier === "guarded") {
          profile.blockWindow += 0.45;
          profile.waveChanceBonus += 0.08;
        }
        if (modifier === "focused") profile.executeBonus += 0.08;
        break;
      case "berserker":
        profile.cooldownMult *= 0.94;
        if (modifier === "swift") profile.damageMult *= 1.06;
        if (modifier === "heavy") profile.knockback += 4;
        break;
      case "gladiator":
        profile.damageMult *= 1.04;
        profile.bonusStagger += 0.04;
        break;
      case "eldritch":
        profile.arcaneBonus += 0.16;
        profile.surgeDuration = Math.max(profile.surgeDuration, 1.2);
        if (modifier === "guarded") profile.blockWindow += 0.3;
        if (modifier === "focused") profile.executeBonus += 0.08;
        break;
      default:
        break;
    }

    const runtime = this.ensureWarriorRuntimeState();
    const hasGladiatorSwapBonus = doctrine === "gladiator" && (runtime.gladiatorSwapTimer || 0) > 0 && runtime.gladiatorSwapMode === activeMode;
    if (hasGladiatorSwapBonus) {
      switch (modifier) {
        case "cleaving":
          profile.range *= 1.08;
          profile.arcDeg *= 1.08;
          break;
        case "focused":
          profile.damageMult *= 1.1;
          profile.executeBonus += 0.08;
          break;
        case "swift":
          profile.cooldownMult *= 0.9;
          break;
        case "heavy":
          profile.knockback += 4;
          profile.bonusStagger += 0.08;
          break;
        case "guarded":
          profile.blockWindow += 0.25;
          break;
        case "marked":
          profile.markDuration = Math.max(profile.markDuration || 0, 5);
          break;
        default:
          profile.damageMult *= 1.06;
          break;
      }
    }

    return profile;
  },

  getWarriorPrimaryProfile() {
    return this.getWarriorAttackProfile("primary");
  },

  getWarriorSecondaryProfile() {
    return this.getWarriorAttackProfile("secondary");
  },

  switchRangerWeaponMode() {
    if (!(this.isArcherClass && this.isArcherClass())) return false;
    if (!getRangerSelectedSwapStyle(this)) return false;
    this.rangerRuntime = this.rangerRuntime && typeof this.rangerRuntime === "object" ? this.rangerRuntime : {};
    if ((this.rangerRuntime.swapCooldownTimer || 0) > 0) return false;
    const current = this.rangerRuntime.weaponMode === "melee" ? "melee" : "ranged";
    const next = current === "melee" ? "ranged" : "melee";
    this.rangerRuntime.weaponMode = next;
    const weapon = getRangerWeaponStats(this);
    const style = getRangerSelectedSwapStyle(this);
    const cooldownMult = style === "opportunist" ? 0.85 : 1;
    this.rangerRuntime.swapCooldownTimer = Math.max(0.15, (weapon.swapCooldown || 0.8) * cooldownMult);
    this.rangerRuntime.swapBuffTimer = 2;
    if (style === "opportunist") this.rangerRuntime.pendingSwapBonus = { style, mode: next, damageMult: 1.2, comboBonus: 0 };
    else if (style === "ambush") this.rangerRuntime.pendingSwapBonus = { style, mode: next, damageMult: 1.55, comboBonus: 0 };
    else if (style === "predator") this.rangerRuntime.pendingSwapBonus = { style, mode: next, damageMult: 1 + Math.min(30, this.rangerRuntime.combo || 0) * 0.015, comboBonus: 0 };
    else if (style === "footwork") {
      this.rangerRuntime.pendingSwapBonus = { style, mode: next, damageMult: 1.05, comboBonus: 0 };
      this.rangerRuntime.footworkTimer = 2;
    }
    if (hasRangerTalent(this, "shadowVeil") && next === "melee") this.rangerRuntime.shadowVeilTimer = 1.25;
    if (hasRangerTalent(this, "smokeBomb")) this.dropRangerSmokeBomb();
    if (typeof this.spawnFloatingText === "function") this.spawnFloatingText(this.player.x, this.player.y - 30, next === "melee" ? "Melee" : "Ranged", "#b7f4dc", 0.45, 12);
    return true;
  },

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

  fire(dx, dy) {
    if (this.isNecromancerClass()) {
      this.fireMagePrimary(dx, dy);
      return;
    }
    if (this.player.fireCooldown > 0) return;
    if (isWarriorTalentGame(this) && !this.classSpec.usesRanged) {
      const profile = this.getWarriorAttackProfile();
      this.player.fireCooldown = this.getPlayerFireCooldown() * (profile.cooldownMult || 1);
      this.performMeleeAttack(dx, dy, profile);
      return;
    }
    this.player.fireCooldown = this.getPlayerFireCooldown();
    if (this.isArcherClass && this.isArcherClass() && getRangerCurrentWeaponMode(this) === "melee") {
      this.performMeleeAttack(dx, dy);
      return;
    }
    if (!this.classSpec.usesRanged) {
      this.performMeleeAttack(dx, dy);
      return;
    }
    const origin = this.getBowMuzzleOrigin(dx, dy);
    const baseAngle = Math.atan2(origin.dirY, origin.dirX);
    const volleyAngles = this.getMultiarrowAngles(baseAngle);
    const count = volleyAngles.length;
    const releaseTailOffset = 7;
    const damageMultipliers = this.getMultiarrowArrowDamageMultipliers();
    const baseDamage = this.rollPrimaryDamage();
    const critChance = getRangerCritChance(this);
    const critMultiplier = getRangerCritMultiplier();
    if (typeof this.recordClassSpecificStat === "function") this.recordClassSpecificStat("ranger", "shotsFired", count);
    if (typeof this.recordPlayerShotTelemetry === "function") {
      const liveAimX = Number.isFinite(this.input?.mouse?.worldX) ? this.input.mouse.worldX : null;
      const liveAimY = Number.isFinite(this.input?.mouse?.worldY) ? this.input.mouse.worldY : null;
      this.recordPlayerShotTelemetry({
        source: "primary",
        playerX: this.player.x,
        playerY: this.player.y,
        moving: !!this.player.moving,
        aimX: liveAimX,
        aimY: liveAimY,
        intendedAngle: baseAngle,
        volleyAngles: volleyAngles.map((angle) => Number(angle.toFixed(6))),
        multishotCount: count,
        projectileSpeed: this.getProjectileSpeed(),
        fireCooldown: this.player.fireCooldown
      });
    }
    const predatorPierceAttack = this.isArcherClass && this.isArcherClass() &&
      getRangerSelectedSwapStyle(this) === "predator" &&
      Math.floor(this.rangerRuntime?.combo || 0) >= 2;
    if (predatorPierceAttack) {
      this.rangerRuntime.combo = Math.max(0, Math.floor(this.rangerRuntime.combo || 0) - 2);
      this.rangerRuntime.comboDecayDelayTimer = 1.15;
    }
    const stormcallerSplitIndex = Math.floor((count - 1) * 0.5);
    for (let i = 0; i < count; i++) {
      const a = volleyAngles[i];
      const modeStats = this.isArcherClass && this.isArcherClass() ? getRangerCurrentWeaponModeStats(this) : null;
      let speed = modeStats?.projectileSpeed || this.getProjectileSpeed();
      let projectileLife = modeStats?.life || 1.1;
      const projectileSize = modeStats?.size || 6;
      const damageMultBase = modeStats?.damageMult || 1;
      const projectileType = this.isArcherClass && this.isArcherClass() ? `ranger_${getRangerSelectedWeapon(this) || "longbow"}` : null;
      const knockback = modeStats?.knockback || 0;
      const opportunistRanged = this.isArcherClass && this.isArcherClass() &&
        getRangerSelectedSwapStyle(this) === "opportunist" &&
        getRangerCurrentWeaponMode(this) === "ranged" &&
        (this.rangerRuntime?.swapBuffTimer || 0) > 0;
      if (opportunistRanged) {
        speed *= 1.2;
        projectileLife *= 1.15;
      }
      this.bullets.push({
        x: origin.x + Math.cos(a) * releaseTailOffset,
        y: origin.y + Math.sin(a) * releaseTailOffset,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        angle: a,
        life: projectileLife,
        size: projectileSize,
        damage: baseDamage,
        damageMult: damageMultBase * (damageMultipliers[i] || damageMultipliers[damageMultipliers.length - 1] || 1),
        critMultiplier: Math.random() < critChance ? critMultiplier : 1,
        remainingRicochets: getRangerRicochetCount(this),
        stormcallerSplitOnRicochet: hasRangerTalent(this, "stormcaller") && i === stormcallerSplitIndex,
        stormcallerSplitUsed: false,
        predatorPierce: predatorPierceAttack,
        linebreakerHits: 0,
        projectileType,
        knockback,
        hitTargets: new Set(),
        ownerId: this.player.id || null
      });
    }
  },

  performMeleeAttack(dx, dy, profile = null) {
    const attackProfile = profile || (isWarriorTalentGame(this) ? this.getWarriorAttackProfile() : null);
    if ((attackProfile?.moveStepTiles || 0) > 0) {
      const len = Math.hypot(dx, dy) || 1;
      const dir = attackProfile.moveStepDir === "back" ? -1 : 1;
      const tile = this.config?.map?.tile || 32;
      this.moveWithCollisionSubsteps(this.player, (dx / len) * tile * attackProfile.moveStepTiles * dir, (dy / len) * tile * attackProfile.moveStepTiles * dir);
    }
    let range = Number.isFinite(attackProfile?.range) ? attackProfile.range : (this.classSpec.meleeRange || 42);
    const hitPadding = Number.isFinite(this.classSpec.meleeHitPadding) ? Math.max(0, this.classSpec.meleeHitPadding) : 0;
    let arcDeg = Number.isFinite(attackProfile?.arcDeg) ? attackProfile.arcDeg : (this.classSpec.meleeArcDeg || 95);
    let rangerMeleeStats = null;
    if (this.isArcherClass && this.isArcherClass()) {
      rangerMeleeStats = getRangerWeaponStats(this).melee;
      range = rangerMeleeStats.range || range;
      arcDeg = rangerMeleeStats.arcDeg || arcDeg;
      if (getRangerCurrentWeaponMode(this) === "melee") range *= 1 + getRangerSwapRangeBonus(this);
    }
    const raging = isWarriorTalentGame(this) ? isWarriorRaging(this) : (this.warriorRageActiveTimer || 0) > 0;
    if (isWarriorTalentGame(this)) {
      range *= 1 + getWarriorExecutionerRageRangeBonus(this) * (raging ? 1 : 0);
      arcDeg *= 1 + getWarriorHeavyHandCleaveArcBonus(this);
      if (raging) arcDeg *= 1 + getWarriorExecutionerRageCleaveWidthBonus(this);
      this.warriorRuntime = this.warriorRuntime && typeof this.warriorRuntime === "object"
        ? this.warriorRuntime
        : (this.player?.warriorRuntime && typeof this.player.warriorRuntime === "object" ? this.player.warriorRuntime : {});
      if (this.player) this.player.warriorRuntime = this.warriorRuntime;
      if ((this.warriorRuntime.rageArcTimer || 0) > 0) arcDeg = 360;
      else if (this.warriorRuntime.butcherEmpowerReady) arcDeg *= 1 + getWarriorButchersPathNextHitArcBonus(this);
      if (getWarriorDoctrine(this) === "gladiator" && (this.warriorRuntime.gladiatorSwapTimer || 0) > 0 && this.warriorRuntime.gladiatorSwapMode === (attackProfile?.mode || this.getCurrentWarriorAttackMode())) {
        this.warriorRuntime.gladiatorSwapTimer = 0;
        this.warriorRuntime.gladiatorSwapMode = "";
      }
    }
    const arc = (arcDeg * Math.PI) / 180;
    let angle = Math.atan2(dy, dx);
    const halfArc = arc * 0.5;
    let snapTarget = null;
    let bestSnapScore = Number.POSITIVE_INFINITY;
    for (const enemy of this.enemies || []) {
      if (!enemy || (enemy.hp || 0) <= 0 || this.isEnemyFriendlyToPlayer(enemy)) continue;
      const ex = enemy.x - this.player.x;
      const ey = enemy.y - this.player.y;
      const dist = vecLength(ex, ey);
      const effectiveRange = range + hitPadding + (enemy.size || 20) * 0.55;
      if (dist > effectiveRange + 14) continue;
      const enemyAngle = Math.atan2(ey, ex);
      let diff = enemyAngle - angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) > halfArc + 0.38) continue;
      const score = Math.abs(diff) * 100 + dist;
      if (score < bestSnapScore) {
        bestSnapScore = score;
        snapTarget = enemy;
      }
    }
    if (snapTarget) angle = Math.atan2(snapTarget.y - this.player.y, snapTarget.x - this.player.x);
    let executeProc = false;
    let consumedButcherEmpower = false;
    let hitAnyEnemy = false;
    let markedKill = false;
    const ownerId = this.player?.id || null;
    const markedEnemyAtAttackStart = this.getWarriorMarkedEnemy(ownerId);
    const markedHits = [];
    let markedTargetKilled = false;
    const guaranteedCrit = !!(this.warriorRuntime?.rageCritReady || this.warriorRuntime?.butcherCritReady);
    const critMultiplier = guaranteedCrit ? (raging && hasWarriorCleaveDiscipline(this) ? 2.2 : 2) : 1;
    if (isWarriorTalentGame(this)) {
      this.warriorRuntime.rageCritReady = false;
      this.warriorRuntime.butcherCritReady = false;
    }
    this.meleeSwings.push({
      x: this.player.x,
      y: this.player.y,
      angle,
      arc,
      range,
      style: attackProfile?.style || "broadswing",
      label: attackProfile?.label || "Strike",
      modifier: attackProfile?.modifier || "",
      stance: attackProfile?.stance || "",
      doctrine: isWarriorTalentGame(this) ? getWarriorDoctrine(this) : "",
      executeProc: false,
      life: this.config.effects.meleeSwingLife,
      maxLife: this.config.effects.meleeSwingLife,
      ownerId: this.player.id || null
    });
    let enemiesHit = 0;
    let firstEnemyHit = false;
    for (const enemy of this.enemies) {
      const ex = enemy.x - this.player.x;
      const ey = enemy.y - this.player.y;
      const dist = vecLength(ex, ey);
      if (dist > range + hitPadding + enemy.size * 0.45) continue;
      const enemyAngle = Math.atan2(ey, ex);
      let diff = enemyAngle - angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) <= halfArc) {
        const hpBefore = Number.isFinite(enemy.hp) ? enemy.hp : 0;
        const wasMarked = enemy === markedEnemyAtAttackStart;
        let damage = this.rollPrimaryDamage() * (Number.isFinite(attackProfile?.damageMult) ? attackProfile.damageMult : 1);
        if (rangerMeleeStats) damage *= rangerMeleeStats.damageMult || 1;
        if (rangerMeleeStats && this.rangerRuntime?.pendingSwapBonus?.mode === "melee") {
          damage *= this.rangerRuntime.pendingSwapBonus.damageMult || 1;
          if (this.rangerRuntime.pendingSwapBonus.style === "ambush") {
            const idle = (this.time || 0) - (Number.isFinite(this.rangerRuntime.lastAttackAt) ? this.rangerRuntime.lastAttackAt : -Infinity) >= 2;
            const newTarget = enemy.id && enemy.id !== this.rangerRuntime.lastAttackTargetId;
            if (idle || newTarget) damage *= 1.25;
          }
          this.addRangerCombo(this.rangerRuntime.pendingSwapBonus.comboBonus || 0);
          if (this.rangerRuntime.pendingSwapBonus.style === "footwork") this.rangerRuntime.footworkGuardTimer = Math.max(this.rangerRuntime.footworkGuardTimer || 0, 1);
          this.rangerRuntime.pendingSwapBonus = null;
        }
        if (rangerMeleeStats && this.rangerRuntime?.shadowVeilTimer > 0) {
          damage *= 1.35;
          if (hasRangerTalent(this, "livingShadow")) this.triggerLivingShadowEcho(enemy, damage, "melee");
          this.rangerRuntime.shadowVeilTimer = 0;
        }
        if (isWarriorTalentGame(this)) {
          damage *= 1 + getWarriorHeavyHandDamageBonus(this, enemy);
          damage *= 1 + getWarriorCrusaderUndeadDamageBonus(this, enemy);
          if ((this.warriorMomentumTimer || 0) > 0) damage *= 1 + getWarriorBattleFrenzyDamageBonus(this);
          if (this.warriorRuntime?.butcherEmpowerReady) {
            damage *= 1 + getWarriorButchersPathNextHitDamageBonus(this);
            consumedButcherEmpower = true;
          }
          if (attackProfile?.style === "twinHatchets") {
            this.warriorRuntime.cleaveCounter = (this.warriorRuntime.cleaveCounter || 0) + 1;
            if (this.warriorRuntime.cleaveCounter % 3 === 0) damage *= 1.25;
          }
          if (attackProfile?.style === "warWhip") {
            enemy.slowTimer = Math.max(enemy.slowTimer || 0, 1.2);
            enemy.slowPct = Math.max(enemy.slowPct || 0, attackProfile.slowOnHit || 0);
          }
          if (attackProfile?.style === "longspear") {
            enemy.pendingBonusStagger = Math.max(enemy.pendingBonusStagger || 0, attackProfile.bonusStagger || 0);
          }
          if (wasMarked) {
            damage += 3;
            const doctrine = getWarriorDoctrine(this);
            if (doctrine === "berserker") damage += 3;
            if (doctrine === "gladiator" && Math.random() < 0.1) damage *= 2;
          }
          if (hasWarriorSpellknight(this)) damage += this.rollPrimaryDamage() * 0.15;
          if (hasWarriorParagon(this) && this.warriorRuntime?.paragonPrimaryReady) {
            damage *= 1.18;
            this.warriorRuntime.paragonPrimaryReady = false;
          }
          if (hasWarriorParagon(this) && this.warriorRuntime?.paragonSecondaryReady) {
            damage *= 1.1;
            enemy.hitCooldown = Math.max(enemy.hitCooldown || 0, 0.15);
            this.warriorRuntime.paragonSecondaryReady = false;
          }
          if (hasWarriorRavager(this)) {
            const missingRatio = this.player?.maxHealth > 0 ? 1 - ((this.player?.health || 0) / this.player.maxHealth) : 0;
            damage *= 1 + 0.15 * Math.max(0, Math.min(1, missingRatio));
          }
          if (attackProfile?.stance === "B") damage *= 1 + (attackProfile.executeBonus || 0) * 0.3;
          damage *= critMultiplier;
        }
        this.applyEnemyDamage(enemy, damage, "melee", this.player.id || null, { critical: critMultiplier > 1 });
        const warCircle = typeof this.getCrusaderConsecratedZoneForEntity === "function" ? this.getCrusaderConsecratedZoneForEntity(this.player) : null;
        if (warCircle?.zoneType === "warCircle" && warCircle.doctrine === "berserker" && damage > 0 && typeof this.applyHealingToPlayerEntity === "function") {
          this.applyHealingToPlayerEntity(this.player, damage * 0.06, { suppressText: true });
        }
        if ((attackProfile?.knockback || 0) > 0) {
          const knockbackScale = enemy.isBoss ? 0.35 : 1;
          enemy.vx = (enemy.vx || 0) + Math.cos(angle) * attackProfile.knockback * knockbackScale;
          enemy.vy = (enemy.vy || 0) + Math.sin(angle) * attackProfile.knockback * knockbackScale;
        }
        if ((attackProfile?.holyBonus || 0) > 0) {
          this.applyEnemyDamage(enemy, this.rollPrimaryDamage() * attackProfile.holyBonus, "holy", this.player.id || null);
        }
        if ((attackProfile?.arcaneBonus || 0) > 0) {
          this.applyEnemyDamage(enemy, this.rollPrimaryDamage() * attackProfile.arcaneBonus, "arcane", this.player.id || null);
        }
        if (wasMarked && getWarriorDoctrine(this) === "paladin") {
          this.applyEnemyDamage(enemy, 2, "holy", this.player.id || null);
        }
        if (wasMarked && getWarriorDoctrine(this) === "eldritch") {
          this.applyEnemyDamage(enemy, 2, "arcane", this.player.id || null);
        }
        if ((attackProfile?.surgeDuration || 0) > 0 && getWarriorDoctrine(this) === "eldritch") {
          this.warriorRuntime.eldritchSurgeTimer = Math.max(this.warriorRuntime.eldritchSurgeTimer || 0, attackProfile.surgeDuration);
        }
        if (rangerMeleeStats?.knockbackTiles > 0) {
          const push = rangerMeleeStats.knockbackTiles * (this.config?.map?.tile || 32);
          const len = vecLength(ex, ey) || 1;
          if (typeof this.moveWithCollisionSubsteps === "function") {
            this.moveWithCollisionSubsteps(enemy, (ex / len) * push, (ey / len) * push);
          } else {
            enemy.x += (ex / len) * push;
            enemy.y += (ey / len) * push;
          }
          enemy.slowTimer = Math.max(enemy.slowTimer || 0, 0.25);
        } else if (rangerMeleeStats?.knockback > 0) {
          const push = rangerMeleeStats.knockback;
          const len = vecLength(ex, ey) || 1;
          if (typeof this.moveWithCollisionSubsteps === "function") this.moveWithCollisionSubsteps(enemy, (ex / len) * push, (ey / len) * push);
        }
        if (this.isArcherClass && this.isArcherClass()) this.addRangerCombo(rangerMeleeStats?.comboGain || 1);
        if (this.isArcherClass && this.isArcherClass()) this.applyRangerTalentOnHitEffects(enemy, "melee");
        if (rangerMeleeStats) {
          this.rangerRuntime.lastAttackAt = this.time || 0;
          this.rangerRuntime.lastAttackTargetId = enemy.id || null;
        }
        if (typeof this.applyConsumableOnHitEffects === "function") this.applyConsumableOnHitEffects(enemy, this.player.id || null);
        enemiesHit += 1;
        hitAnyEnemy = true;
        firstEnemyHit = true;
        const threshold = this.getWarriorExecuteThreshold();
        const chance = this.getWarriorExecuteChance();
        const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
        if (chance > 0 && enemy.hp > 0 && hpRatio > 0 && hpRatio <= threshold && Math.random() < chance) {
          const bossTarget = !!(enemy.isBoss || enemy.isFloorBoss);
          if (bossTarget) {
            this.applyEnemyDamage(enemy, this.rollPrimaryDamage() * 1.5, "melee", this.player.id || null, { critical: true });
          } else {
            enemy.hp = 0;
            enemy.pendingExecuteKill = true;
            executeProc = true;
          }
          if (isWarriorTalentGame(this) && hasWarriorButchersPath(this)) {
            this.warriorRuntime.butcherCritReady = true;
            this.warriorRuntime.butcherEmpowerReady = true;
          }
        }
        if ((attackProfile?.slowOnHit || 0) > 0) {
          enemy.slowTimer = Math.max(enemy.slowTimer || 0, 1.2);
          enemy.slowPct = Math.max(enemy.slowPct || 0, attackProfile.slowOnHit || 0);
        }
        if ((attackProfile?.bonusStagger || 0) > 0) {
          enemy.pendingBonusStagger = Math.max(enemy.pendingBonusStagger || 0, attackProfile.bonusStagger || 0);
          enemy.hitCooldown = Math.max(enemy.hitCooldown || 0, Math.min(0.38, attackProfile.bonusStagger * 1.2));
        }
        if ((attackProfile?.blockWindow || 0) > 0) {
          this.player.blockBonusTimer = Math.max(this.player.blockBonusTimer || 0, attackProfile.blockWindow || 0);
          if (getWarriorDoctrine(this) === "eldritch" && (this.warriorRuntime.eldritchWardCooldownTimer || 0) <= 0) {
            this.warriorRuntime.eldritchWardHp = Math.max(this.warriorRuntime.eldritchWardHp || 0, Math.round((this.player.maxHealth || 0) * 0.12));
            this.warriorRuntime.eldritchWardCooldownTimer = 2;
          }
        }
        if ((attackProfile?.markDuration || 0) > 0) markedHits.push(enemy);
        if (wasMarked) this.refreshWarriorMark(enemy, 5);
        if ((attackProfile?.executeBonus || 0) > 0) {
          const executeHpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;
          if (executeHpRatio <= 0.35 && enemy.hp > 0) {
            this.applyEnemyDamage(enemy, this.rollPrimaryDamage() * attackProfile.executeBonus, "melee", this.player.id || null);
          }
        }
        if (wasMarked && getWarriorDoctrine(this) === "eldritch" && (this.warriorRuntime.eldritchMarkedSparkTimer || 0) <= 0) {
          const tile = this.config?.map?.tile || 32;
          let chainTarget = null;
          let bestDist = Number.POSITIVE_INFINITY;
          for (const other of this.enemies || []) {
            if (!other || other === enemy || (other.hp || 0) <= 0 || this.isEnemyFriendlyToPlayer(other)) continue;
            const dist = vecLength((other.x || 0) - (enemy.x || 0), (other.y || 0) - (enemy.y || 0));
            if (dist > tile * 2.6 || dist >= bestDist) continue;
            chainTarget = other;
            bestDist = dist;
          }
          if (chainTarget) {
            this.applyEnemyDamage(chainTarget, 2, "arcane", this.player.id || null);
            this.fireZones.push({
              x: enemy.x,
              y: enemy.y,
              targetX: chainTarget.x,
              targetY: chainTarget.y,
              zoneType: "arcaneChain",
              life: 0.18,
              totalLife: 0.18
            });
          }
          this.warriorRuntime.eldritchMarkedSparkTimer = 0.5;
        }
        if (isWarriorTalentGame(this) && hpBefore > 0 && enemy.hp <= 0 && raging && (!this.isEnemyFriendlyToPlayer || !this.isEnemyFriendlyToPlayer(enemy))) {
          if (hasWarriorBattleFrenzy(this)) {
            const victoryRushHeal = this.getWarriorRageVictoryRushHeal();
            if (victoryRushHeal > 0) {
              this.warriorRageVictoryRushPool = Math.min(this.getWarriorRageVictoryRushPoolCap(), (this.warriorRageVictoryRushPool || 0) + victoryRushHeal);
              this.warriorRageVictoryRushTimer = this.getWarriorRageVictoryRushHotDuration();
              this.spawnFloatingText(this.player.x, this.player.y - 32, "Victory Rush", "#ffb3b3", 0.8, 13);
            }
          }
          if (getWarriorDoctrine(this) === "berserker") {
            this.warriorRageActiveTimer = Math.min(this.getWarriorRageDuration(), (this.warriorRageActiveTimer || 0) + 0.1);
          }
        }
        if (hpBefore > 0 && enemy.hp <= 0 && wasMarked) {
          markedKill = true;
          if (markedEnemyAtAttackStart === enemy) markedTargetKilled = true;
        }
        if (wasMarked && getWarriorDoctrine(this) === "gladiator") {
          this.warriorRuntime.gladiatorSwapTimer = Math.min(1.6, Math.max(this.warriorRuntime.gladiatorSwapTimer || 0, 0.6) + 0.22);
          this.warriorRuntime.gladiatorSwapMode = attackProfile?.mode || this.getCurrentWarriorAttackMode();
        }
      }
    }
    if (markedHits.length > 0) this.markHighestHpEnemy(markedHits, attackProfile?.markDuration || 5, this.player.x + Math.cos(angle) * range * 0.5, this.player.y + Math.sin(angle) * range * 0.5);
    if (consumedButcherEmpower && this.warriorRuntime?.butcherEmpowerReady) this.warriorRuntime.butcherEmpowerReady = false;
    for (const br of this.breakables || []) {
      const ex = br.x - this.player.x;
      const ey = br.y - this.player.y;
      const dist = vecLength(ex, ey);
      if (dist > range + br.size * 0.45) continue;
      const brAngle = Math.atan2(ey, ex);
      let diff = brAngle - angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) <= halfArc) br.hp = 0;
    }
    if (executeProc && this.meleeSwings.length > 0) {
      const swing = this.meleeSwings[this.meleeSwings.length - 1];
      swing.executeProc = true;
      swing.life += 0.5;
      swing.maxLife += 0.5;
    }
    if (isWarriorTalentGame(this) && hasWarriorJudgmentWave(this) && hitAnyEnemy) {
      const runtime = this.ensureWarriorRuntimeState();
      if (runtime.shockReleaseReady) {
        this.triggerWarriorShockRelease(angle, range, attackProfile);
      } else {
        let chargesEarned = 1;
        if (attackProfile?.modifier === "heavy" && Math.random() < 0.2) chargesEarned += 1;
        if (getWarriorDoctrine(this) === "paladin" && raging && Math.random() < 0.1) chargesEarned += 1;
        if (getWarriorDoctrine(this) === "eldritch" && markedKill && Math.random() < 0.1) chargesEarned += 1;
        if (getWarriorDoctrine(this) === "berserker") {
          const hpRatio = this.player?.maxHealth > 0 ? (this.player.health || 0) / this.player.maxHealth : 1;
          if (hpRatio <= 0.25) chargesEarned *= 2;
        }
        this.gainWarriorShockReleaseCharges(chargesEarned);
      }
    }
    if (markedTargetKilled && getWarriorDoctrine(this) === "berserker" && (this.warriorRuntime.berserkerMarkedFrenzyCooldown || 0) <= 0) {
      this.warriorMomentumTimer = Math.max(this.warriorMomentumTimer || 0, Math.max(0, (this.warriorMomentumTimer || 0)) + 2);
      this.warriorRuntime.berserkerMarkedFrenzyCooldown = 10;
    }
  },

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
    this.rangerRuntime.pendingSwapBonus = { mode: getRangerCurrentWeaponMode(this), damageMult: 1.5, comboBonus: 0 };
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
  }
};
