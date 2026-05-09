import { getWarriorDoctrine, hasWarriorJudgmentWave } from "./warriorTalentTree.js";

export const runtimeActivePlayerTickMethods = {
  tickActivePlayerEntities(dt) {
    for (const player of this.getActivePlayerEntities()) {
      player.fireCooldown = Math.max(0, (Number.isFinite(player.fireCooldown) ? player.fireCooldown : 0) - dt);
      player.fireArrowCooldown = Math.max(0, (Number.isFinite(player.fireArrowCooldown) ? player.fireArrowCooldown : 0) - dt);
      player.deathBoltCooldown = Math.max(0, (Number.isFinite(player.deathBoltCooldown) ? player.deathBoltCooldown : 0) - dt);
      player.hitCooldown = Math.max(0, (Number.isFinite(player.hitCooldown) ? player.hitCooldown : 0) - dt);
      player.hpBarTimer = Math.max(0, (Number.isFinite(player.hpBarTimer) ? player.hpBarTimer : 0) - dt);
      player.animTime = (Number.isFinite(player.animTime) ? player.animTime : 0) + dt;
      player.alive = Number.isFinite(player.health) ? player.health > 0 : player.alive !== false;
      player.consumableRuntime = player.consumableRuntime && typeof player.consumableRuntime === "object" ? player.consumableRuntime : { tempHp: 0 };
      player.consumableRuntime.tempHp = Math.max(0, Number.isFinite(player.consumableRuntime.tempHp) ? player.consumableRuntime.tempHp : 0);
      player.rangerRuntime = player.rangerRuntime && typeof player.rangerRuntime === "object" ? player.rangerRuntime : {};
      const rr = player.rangerRuntime;
      rr.weaponMode = rr.weaponMode === "melee" ? "melee" : "ranged";
      rr.swapCooldownTimer = Math.max(0, (Number.isFinite(rr.swapCooldownTimer) ? rr.swapCooldownTimer : 0) - dt);
      rr.classSkillCooldownTimer = Math.max(0, (Number.isFinite(rr.classSkillCooldownTimer) ? rr.classSkillCooldownTimer : 0) - dt);
      rr.dodgeTimer = Math.max(0, (Number.isFinite(rr.dodgeTimer) ? rr.dodgeTimer : 0) - dt);
      rr.swapBuffTimer = Math.max(0, (Number.isFinite(rr.swapBuffTimer) ? rr.swapBuffTimer : 0) - dt);
      if (rr.swapBuffTimer <= 0) rr.pendingSwapBonus = null;
      rr.shadowVeilTimer = Math.max(0, (Number.isFinite(rr.shadowVeilTimer) ? rr.shadowVeilTimer : 0) - dt);
      rr.footworkTimer = Math.max(0, (Number.isFinite(rr.footworkTimer) ? rr.footworkTimer : 0) - dt);
      rr.footworkGuardTimer = Math.max(0, (Number.isFinite(rr.footworkGuardTimer) ? rr.footworkGuardTimer : 0) - dt);
      rr.foragerRegenTimer = Math.max(0, (Number.isFinite(rr.foragerRegenTimer) ? rr.foragerRegenTimer : 0) - dt);
      rr.predatorsFeastTimer = Math.max(0, (Number.isFinite(rr.predatorsFeastTimer) ? rr.predatorsFeastTimer : 0) - dt);
      rr.predatorsFeastCooldownTimer = Math.max(0, (Number.isFinite(rr.predatorsFeastCooldownTimer) ? rr.predatorsFeastCooldownTimer : 0) - dt);
      rr.venomCooldownTimer = Math.max(0, (Number.isFinite(rr.venomCooldownTimer) ? rr.venomCooldownTimer : 0) - dt);
      rr.smokeBombCooldownTimer = Math.max(0, (Number.isFinite(rr.smokeBombCooldownTimer) ? rr.smokeBombCooldownTimer : 0) - dt);
      rr.mushroomSpawnTimer = Math.max(0, (Number.isFinite(rr.mushroomSpawnTimer) ? rr.mushroomSpawnTimer : 0) - dt);
      if (this.isPrimaryPlayerEntity(player)) this.ensureForagerMushrooms(dt);
      rr.comboSurgeCooldownTimer = Math.max(0, (Number.isFinite(rr.comboSurgeCooldownTimer) ? rr.comboSurgeCooldownTimer : 0) - dt);
      rr.livingShadowCooldownTimer = Math.max(0, (Number.isFinite(rr.livingShadowCooldownTimer) ? rr.livingShadowCooldownTimer : 0) - dt);
      rr.combo = Math.max(0, Math.min(30, Number.isFinite(rr.combo) ? Math.floor(rr.combo) : 0));
      if (rr.combo > 0) {
        rr.comboDecayDelayTimer = Math.max(0, (Number.isFinite(rr.comboDecayDelayTimer) ? rr.comboDecayDelayTimer : 0) - dt);
        if (rr.comboDecayDelayTimer <= 0) {
          const relentless = this.rangerTalents?.relentless?.points > 0;
          const getDecayInterval = (combo) => relentless
            ? (combo >= 20 ? 0.68 : combo >= 10 ? 0.48 : combo >= 5 ? 0.34 : 0.22)
            : (combo >= 20 ? 0.46 : combo >= 10 ? 0.32 : combo >= 5 ? 0.22 : 0.15);
          rr.comboDecayTickTimer = (Number.isFinite(rr.comboDecayTickTimer) ? rr.comboDecayTickTimer : getDecayInterval(rr.combo)) - dt;
          while (rr.combo > 0 && rr.comboDecayTickTimer <= 0) {
            rr.combo -= 1;
            rr.comboDecayTickTimer += getDecayInterval(rr.combo);
          }
        }
      } else {
        rr.comboDecayDelayTimer = 0;
        rr.comboDecayTickTimer = 0;
        rr.quarryTargetId = null;
        rr.quarryStacks = 0;
        rr.apexPredatorAnnounceTier = 0;
      }
      if ((rr.foragerRegenTimer || 0) > 0 && player.alive) {
        const healAmount = (player.maxHealth || 1) * 0.012 * dt;
        if (this.isPrimaryPlayerEntity(player)) this.applyPlayerHealing(healAmount, { suppressText: true });
        else player.health = Math.min(player.maxHealth || player.health || 0, (player.health || 0) + healAmount);
      }
      player.warriorRuntime = player.warriorRuntime && typeof player.warriorRuntime === "object" ? player.warriorRuntime : {};
      player.warriorRuntime.secondWindTimer = Math.max(0, (Number.isFinite(player.warriorRuntime.secondWindTimer) ? player.warriorRuntime.secondWindTimer : 0) - dt);
      player.warriorRuntime.battleFrenzyCooldownTimer = Math.max(0, (Number.isFinite(player.warriorRuntime.battleFrenzyCooldownTimer) ? player.warriorRuntime.battleFrenzyCooldownTimer : 0) - dt);
      player.warriorRuntime.tempHpTimer = Math.max(0, (Number.isFinite(player.warriorRuntime.tempHpTimer) ? player.warriorRuntime.tempHpTimer : 0) - dt);
      player.blockBonusTimer = Math.max(0, (Number.isFinite(player.blockBonusTimer) ? player.blockBonusTimer : 0) - dt);
      player.warriorRuntime.eldritchWardCooldownTimer = Math.max(0, (Number.isFinite(player.warriorRuntime.eldritchWardCooldownTimer) ? player.warriorRuntime.eldritchWardCooldownTimer : 0) - dt);
      player.warriorRuntime.rageArcTimer = Math.max(0, (Number.isFinite(player.warriorRuntime.rageArcTimer) ? player.warriorRuntime.rageArcTimer : 0) - dt);
      player.warriorRuntime.eldritchSurgeTimer = Math.max(0, (Number.isFinite(player.warriorRuntime.eldritchSurgeTimer) ? player.warriorRuntime.eldritchSurgeTimer : 0) - dt);
      player.warriorRuntime.eldritchMarkedSparkTimer = Math.max(0, (Number.isFinite(player.warriorRuntime.eldritchMarkedSparkTimer) ? player.warriorRuntime.eldritchMarkedSparkTimer : 0) - dt);
      player.warriorRuntime.berserkerMarkedFrenzyCooldown = Math.max(0, (Number.isFinite(player.warriorRuntime.berserkerMarkedFrenzyCooldown) ? player.warriorRuntime.berserkerMarkedFrenzyCooldown : 0) - dt);
      player.warriorRuntime.gladiatorSwapTimer = Math.max(0, (Number.isFinite(player.warriorRuntime.gladiatorSwapTimer) ? player.warriorRuntime.gladiatorSwapTimer : 0) - dt);
      player.warriorRuntime.shockReleaseComboTimer = Math.max(0, (Number.isFinite(player.warriorRuntime.shockReleaseComboTimer) ? player.warriorRuntime.shockReleaseComboTimer : 0) - dt);
      player.warriorRuntime.paladinGuardedChargeTimer = Math.max(0, (Number.isFinite(player.warriorRuntime.paladinGuardedChargeTimer) ? player.warriorRuntime.paladinGuardedChargeTimer : 3) - dt);
      player.warriorRuntime.cheatDeathCooldown = Math.max(0, (Number.isFinite(player.warriorRuntime.cheatDeathCooldown) ? player.warriorRuntime.cheatDeathCooldown : 0) - dt);
      const warCircle = this.getCrusaderConsecratedZoneForEntity(player);
      if (warCircle?.zoneType === "warCircle" && warCircle.doctrine === "gladiator") {
        const bonusTick = dt * 0.35;
        player.fireCooldown = Math.max(0, (Number.isFinite(player.fireCooldown) ? player.fireCooldown : 0) - bonusTick);
        player.fireArrowCooldown = Math.max(0, (Number.isFinite(player.fireArrowCooldown) ? player.fireArrowCooldown : 0) - bonusTick);
        player.deathBoltCooldown = Math.max(0, (Number.isFinite(player.deathBoltCooldown) ? player.deathBoltCooldown : 0) - bonusTick);
        player.warriorRuntime.attackSwapCooldownTimer = Math.max(0, (Number.isFinite(player.warriorRuntime.attackSwapCooldownTimer) ? player.warriorRuntime.attackSwapCooldownTimer : 0) - bonusTick);
        if (Number.isFinite(player.warriorRageCooldownTimer)) player.warriorRageCooldownTimer = Math.max(0, player.warriorRageCooldownTimer - bonusTick);
      }
      if ((player.warriorRuntime.tempHpTimer || 0) <= 0) player.warriorRuntime.tempHp = 0;
      if ((player.blockBonusTimer || 0) <= 0) player.warriorRuntime.eldritchWardHp = 0;
      if ((player.warriorRuntime.gladiatorSwapTimer || 0) <= 0) player.warriorRuntime.gladiatorSwapMode = "";
      if ((player.warriorRuntime.shockReleaseComboTimer || 0) <= 0) {
        player.warriorRuntime.shockReleaseCharges = 0;
        player.warriorRuntime.shockReleaseReady = false;
      }
      const activeModifier = this.getActiveWarriorStanceModifierForEntity(player);
      const doctrine = getWarriorDoctrine(player);
      if (doctrine === "paladin" && activeModifier === "guarded" && hasWarriorJudgmentWave(player)) {
        while ((player.warriorRuntime.paladinGuardedChargeTimer || 0) <= 0) {
          player.warriorRuntime.paladinGuardedChargeTimer += 3;
          if (this.gainWarriorShockReleaseCharges && this.isPrimaryPlayerEntity(player)) this.gainWarriorShockReleaseCharges(1);
          else {
            const threshold = doctrine === "gladiator" ? 4 : 5;
            player.warriorRuntime.shockReleaseCharges = Math.min(threshold, (player.warriorRuntime.shockReleaseCharges || 0) + 1);
            player.warriorRuntime.shockReleaseComboTimer = 2;
            if ((player.warriorRuntime.shockReleaseCharges || 0) >= threshold) player.warriorRuntime.shockReleaseReady = true;
          }
        }
      } else {
        player.warriorRuntime.paladinGuardedChargeTimer = 3;
      }
      if ((player.warriorRuntime.secondWindTimer || 0) > 0 && (player.warriorRuntime.secondWindPool || 0) > 0 && player.alive) {
        const timer = Math.max(dt, player.warriorRuntime.secondWindTimer);
        const healAmount = Math.min(player.warriorRuntime.secondWindPool, (player.warriorRuntime.secondWindPool / timer) * dt);
        player.warriorRuntime.secondWindPool = Math.max(0, player.warriorRuntime.secondWindPool - healAmount);
        if (this.isPrimaryPlayerEntity(player)) this.applyPlayerHealing(healAmount, { suppressText: true });
        else player.health = Math.min(player.maxHealth || player.health || 0, (player.health || 0) + healAmount);
      } else if ((player.warriorRuntime.secondWindTimer || 0) <= 0) {
        player.warriorRuntime.secondWindPool = 0;
      }
      player.necromancerRuntime = player.necromancerRuntime && typeof player.necromancerRuntime === "object" ? player.necromancerRuntime : {};
      const nr = player.necromancerRuntime;
      nr.activeMode = nr.activeMode === "spell" ? "spell" : "cantrip";
      const maxMana = this.isPrimaryPlayerEntity(player) && typeof this.getMageMaxMana === "function"
        ? this.getMageMaxMana()
        : (7 + ((player.necromancerTalents?.wizardPath?.points || 0) > 0 ? 3 : 0) + ((player.necromancerTalents?.deepReserves?.points || 0) > 0 ? 8 : 0) + ((nr.arcaneFocusTimer || 0) > 0 ? 3 : 0));
      nr.mana = Math.max(0, Math.min(maxMana, Number.isFinite(nr.mana) ? nr.mana : maxMana));
      nr.manaRegenPauseTimer = Math.max(0, (Number.isFinite(nr.manaRegenPauseTimer) ? nr.manaRegenPauseTimer : 0) - dt);
      nr.spellCastTimer = Math.max(0, (Number.isFinite(nr.spellCastTimer) ? nr.spellCastTimer : 0) - dt);
      nr.classSkillCooldownTimer = Math.max(0, (Number.isFinite(nr.classSkillCooldownTimer) ? nr.classSkillCooldownTimer : 0) - dt);
      nr.blinkInvulnTimer = Math.max(0, (Number.isFinite(nr.blinkInvulnTimer) ? nr.blinkInvulnTimer : 0) - dt);
      nr.invisibilityTimer = Math.max(0, (Number.isFinite(nr.invisibilityTimer) ? nr.invisibilityTimer : 0) - dt);
      nr.targetingBreakTimer = Math.max(0, (Number.isFinite(nr.targetingBreakTimer) ? nr.targetingBreakTimer : 0) - dt);
      nr.catalystTimer = Math.max(0, (Number.isFinite(nr.catalystTimer) ? nr.catalystTimer : 0) - dt);
      nr.phaseBarrierCooldownTimer = Math.max(0, (Number.isFinite(nr.phaseBarrierCooldownTimer) ? nr.phaseBarrierCooldownTimer : 0) - dt);
      nr.arcaneFocusTimer = Math.max(0, (Number.isFinite(nr.arcaneFocusTimer) ? nr.arcaneFocusTimer : 0) - dt);
      if ((nr.arcaneFocusTimer || 0) <= 0) nr.arcaneFocusTier = "";
      nr.chaosSurgeTimer = Math.max(0, (Number.isFinite(nr.chaosSurgeTimer) ? nr.chaosSurgeTimer : 0) - dt);
      nr.wildMagicCooldownTimer = Math.max(0, (Number.isFinite(nr.wildMagicCooldownTimer) ? nr.wildMagicCooldownTimer : 0) - dt);
      nr.blueTimer = Math.max(0, (Number.isFinite(nr.blueTimer) ? nr.blueTimer : 0) - dt);
      nr.stoneskinTimer = Math.max(0, (Number.isFinite(nr.stoneskinTimer) ? nr.stoneskinTimer : 0) - dt);
      nr.wildSpeedRegenTimer = Math.max(0, (Number.isFinite(nr.wildSpeedRegenTimer) ? nr.wildSpeedRegenTimer : 0) - dt);
      nr.mimicTimer = Math.max(0, (Number.isFinite(nr.mimicTimer) ? nr.mimicTimer : 0) - dt);
      nr.mimicTongueTimer = Math.max(0, (Number.isFinite(nr.mimicTongueTimer) ? nr.mimicTongueTimer : 0) - dt);
      if ((nr.mimicTimer || 0) <= 0) nr.mimicHealth = 0;
      nr.influenceCooldownTimer = Math.max(0, (Number.isFinite(nr.influenceCooldownTimer) ? nr.influenceCooldownTimer : 0) - dt);
      nr.runeTimer = Math.max(0, (Number.isFinite(nr.runeTimer) ? nr.runeTimer : 0) - dt);
      if ((nr.runeTimer || 0) <= 0) nr.runes = 0;
      nr.battlemageGuardTimer = Math.max(0, (Number.isFinite(nr.battlemageGuardTimer) ? nr.battlemageGuardTimer : 0) - dt);
      nr.battlemageShockwaveCooldownTimer = Math.max(0, (Number.isFinite(nr.battlemageShockwaveCooldownTimer) ? nr.battlemageShockwaveCooldownTimer : 0) - dt);
      nr.soulSpawnCooldownTimer = Math.max(0, (Number.isFinite(nr.soulSpawnCooldownTimer) ? nr.soulSpawnCooldownTimer : 0) - dt);
      nr.necroRaiseCooldownTimer = Math.max(0, (Number.isFinite(nr.necroRaiseCooldownTimer) ? nr.necroRaiseCooldownTimer : 0) - dt);
      if ((player.necromancerTalents?.battleCaster?.points || 0) > 0 && (nr.battleCasterShieldTimer || 0) <= 0) {
        nr.tempHp = Math.max(nr.tempHp || 0, (player.maxHealth || 1) * 0.08);
        nr.battleCasterShieldTimer = 6;
      }
      nr.battleCasterShieldTimer = Math.max(0, (Number.isFinite(nr.battleCasterShieldTimer) ? nr.battleCasterShieldTimer : 0) - dt);
      if (Array.isArray(nr.souls)) {
        nr.souls = nr.souls.filter((soul) => soul && (soul.life = Math.max(0, (Number.isFinite(soul.life) ? soul.life : 8) - dt)) > 0);
        for (const soul of nr.souls) {
          const dx = (player.x || 0) - (soul.x || 0);
          const dy = (player.y || 0) - (soul.y || 0);
          const dist = Math.hypot(dx, dy) || 1;
          if (dist <= (Number.isFinite(soul.collectRadius) ? soul.collectRadius : 22) && player.alive) {
            const heal = (player.maxHealth || 1) * (Number.isFinite(soul.healPct) ? soul.healPct : 0.04);
            if (this.isPrimaryPlayerEntity(player)) this.applyPlayerHealing(heal);
            else player.health = Math.min(player.maxHealth || player.health || 0, (player.health || 0) + heal);
            soul.life = 0;
          }
        }
      } else nr.souls = [];
      const moving = !!player.moving;
      if (moving) {
        nr.arcaneClarityChargeTimer = 0;
        nr.arcaneClarityTimer = 0;
      } else {
        nr.arcaneClarityChargeTimer = Math.min(3, (Number.isFinite(nr.arcaneClarityChargeTimer) ? nr.arcaneClarityChargeTimer : 0) + dt);
        if ((player.necromancerTalents?.arcaneClarity?.points || 0) > 0 && nr.arcaneClarityChargeTimer >= 3) nr.arcaneClarityTimer = 0.25;
      }
      if (nr.mana < maxMana) {
        const regen = this.isPrimaryPlayerEntity(player) && typeof this.getMageManaRegen === "function"
          ? this.getMageManaRegen()
          : (1 * ((player.necromancerTalents?.deepReserves?.points || 0) > 0 ? 0.85 : 1) * ((nr.arcaneClarityTimer || 0) > 0 ? 1.25 : 1));
        const regenScale = nr.manaRegenPauseTimer > 0 ? 0.34 : 1;
        nr.mana = Math.min(maxMana, nr.mana + regen * regenScale * dt);
      }
      player.necromancerRuntime.vigorTimer = Math.max(0, (Number.isFinite(player.necromancerRuntime.vigorTimer) ? player.necromancerRuntime.vigorTimer : 0) - dt);
      player.necromancerRuntime.vigorBeamTimer = Math.max(0, (Number.isFinite(player.necromancerRuntime.vigorBeamTimer) ? player.necromancerRuntime.vigorBeamTimer : 0) - dt);
      if ((player.necromancerRuntime.vigorTimer || 0) > 0 && (player.necromancerRuntime.vigorHealPool || 0) > 0 && player.alive) {
        const timer = Math.max(dt, player.necromancerRuntime.vigorTimer);
        const healAmount = Math.min(player.necromancerRuntime.vigorHealPool, (player.necromancerRuntime.vigorHealPool / timer) * dt);
        player.necromancerRuntime.vigorHealPool = Math.max(0, player.necromancerRuntime.vigorHealPool - healAmount);
        if (this.isPrimaryPlayerEntity(player)) this.applyPlayerHealing(healAmount, { suppressText: true });
        else player.health = Math.min(player.maxHealth || player.health || 0, (player.health || 0) + healAmount);
      } else if ((player.necromancerRuntime.vigorTimer || 0) <= 0) {
        player.necromancerRuntime.vigorHealPool = 0;
      }
      player.necromancerRuntime.tempHp = Math.max(0, Number.isFinite(player.necromancerRuntime.tempHp) ? player.necromancerRuntime.tempHp : 0);
      if (!this.isPrimaryPlayerEntity(player)) {
        player.warriorMomentumTimer = Math.max(0, (Number.isFinite(player.warriorMomentumTimer) ? player.warriorMomentumTimer : 0) - dt);
        player.warriorRageActiveTimer = Math.max(0, (Number.isFinite(player.warriorRageActiveTimer) ? player.warriorRageActiveTimer : 0) - dt);
        player.warriorRageCooldownTimer = Math.max(0, (Number.isFinite(player.warriorRageCooldownTimer) ? player.warriorRageCooldownTimer : 0) - dt);
        player.warriorRageVictoryRushTimer = Math.max(0, (Number.isFinite(player.warriorRageVictoryRushTimer) ? player.warriorRageVictoryRushTimer : 0) - dt);
        if ((player.warriorRageVictoryRushPool || 0) > 0 && (player.warriorRageVictoryRushTimer || 0) > 0 && player.alive) {
          const timer = Math.max(dt, player.warriorRageVictoryRushTimer);
          const healAmount = Math.min(player.warriorRageVictoryRushPool, (player.warriorRageVictoryRushPool / timer) * dt);
          player.warriorRageVictoryRushPool = Math.max(0, player.warriorRageVictoryRushPool - healAmount);
          player.health = Math.min(player.maxHealth || player.health || 0, (player.health || 0) + healAmount);
        } else if ((player.warriorRageVictoryRushTimer || 0) <= 0) {
          player.warriorRageVictoryRushPool = 0;
        }
        player.speed = this.getPlayerMoveSpeedFor(player);
      }
    }
  },

};
