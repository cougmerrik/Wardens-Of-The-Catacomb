import {
  getNecromancerBlackCandleCursedBeamBonus,
  getNecromancerBeamDamageMultiplier,
  getNecromancerBeamPulseRateMultiplier,
  getNecromancerCurseDuration,
  getNecromancerDeathBoltMasteryTempHpOnKill,
  getNecromancerTempHpCap,
  getNecromancerVigorBeamDamageMultiplier,
  hasNecromancerBlightstorm,
  isNecromancerTalentGame
} from "../../src/game/necromancerTalentTree.js";
import { cloneNecromancerBeamState } from "./playerStateCloneHelpers.js";

export function processRemoteNecromancerBeamForRoom(room, state, input, dt) {
  if (!room || !state) return false;
  const context = room.createPlayerSimulationContext(state);
  if (!context || typeof input !== "object") return false;
  const beam = context.necromancerBeam || (context.necromancerBeam = cloneNecromancerBeamState());
  for (const enemy of room.sim.enemies || []) if (enemy) enemy.charmLocked = false;
  const held = !!input.firePrimaryHeld && !!input.hasAim;
  const beamRange = (room.sim.config?.necromancer?.controlRangeTiles || 10) * (room.sim.config?.map?.tile || 32);
  const beamWidth = Number.isFinite(room.sim.config?.necromancer?.beamWidth) ? room.sim.config.necromancer.beamWidth : 11;
  const offensiveBeamEnabled = isNecromancerTalentGame(context);
  const beamDamagePeriod = 1.0 / getNecromancerBeamPulseRateMultiplier(context);
  const aimX = Number.isFinite(input.aimX) ? input.aimX : state.x;
  const aimY = Number.isFinite(input.aimY) ? input.aimY : state.y;
  beam.active = held;
  beam.targetId = null;
  beam.targetEnemy = null;
  beam.targetX = aimX;
  beam.targetY = aimY;
  if (!held) {
    beam.progress = 0;
    beam.healTickTimer = 0;
    beam.mode = "idle";
    room.syncActivePlayerStateFromContext(state, context);
    return false;
  }

  const aimLen = Math.hypot(aimX - state.x, aimY - state.y) || 1;
  let hitBreakable = null;
  let bestBreakableDist = Number.POSITIVE_INFINITY;
  for (const br of room.sim.breakables || []) {
    if (!br || (br.hp || 0) <= 0) continue;
    const beamDist = Math.hypot(br.x - state.x, br.y - state.y);
    if (beamDist > beamRange) continue;
    if (!room.beamHasLineOfSight(state.x, state.y, br.x, br.y)) continue;
    const lineDist = room.getAimLineDistance(state, input, br, aimLen);
    if (lineDist > beamWidth + (br.size || 20) * 0.35) continue;
    const distToAim = Math.hypot(br.x - aimX, br.y - aimY);
    if (distToAim < bestBreakableDist) {
      hitBreakable = br;
      bestBreakableDist = distToAim;
    }
  }
  if (hitBreakable) {
    beam.targetX = hitBreakable.x;
    beam.targetY = hitBreakable.y;
    beam.progress = 0;
    beam.healTickTimer = 0;
    beam.mode = "idle";
    hitBreakable.hp = 0;
    room.syncActivePlayerStateFromContext(state, context);
    return true;
  }

  let invalidTarget = null;
  let invalidTargetDist = Number.POSITIVE_INFINITY;
  let bestTarget = null;
  let bestTargetDist = Number.POSITIVE_INFINITY;
  for (const enemy of room.sim.enemies || []) {
    if (!enemy || (enemy.hp || 0) <= 0) continue;
    if (enemy.type === "skeleton_warrior" && enemy.collapsed) continue;
    const beamDist = Math.hypot(enemy.x - state.x, enemy.y - state.y);
    if (beamDist > beamRange) continue;
    if (!room.beamHasLineOfSight(state.x, state.y, enemy.x, enemy.y)) continue;
    const lineDist = room.getAimLineDistance(state, input, enemy, aimLen);
    if (lineDist > beamWidth) continue;
    const distToAim = Math.hypot(enemy.x - aimX, enemy.y - aimY);
    if (distToAim < invalidTargetDist) {
      invalidTarget = enemy;
      invalidTargetDist = distToAim;
    }
    const validCharmTarget = context.isUndeadEnemy(enemy) && !(enemy.isBoss || enemy.isFloorBoss);
    const validBeamTarget = validCharmTarget || offensiveBeamEnabled;
    if (!validBeamTarget) continue;
    if (distToAim < bestTargetDist) {
      bestTarget = enemy;
      bestTargetDist = distToAim;
    }
  }

  if (
    invalidTarget &&
    (!context.isUndeadEnemy(invalidTarget) || (!context.isControlledUndead(invalidTarget) && !context.canControlMoreUndead(state))) &&
    !offensiveBeamEnabled
  ) {
    beam.active = false;
    beam.progress = 0;
    beam.healTickTimer = 0;
    beam.mode = "idle";
    room.syncActivePlayerStateFromContext(state, context);
    return false;
  }

  const canTarget =
    !!bestTarget &&
    context.isUndeadEnemy(bestTarget) &&
    !(bestTarget.isBoss || bestTarget.isFloorBoss) &&
    (context.isControlledUndead(bestTarget)
      ? context.getControlledUndeadOwnerId(bestTarget) === state.id
      : context.canControlMoreUndead(state));

  if (!bestTarget || (!canTarget && !offensiveBeamEnabled)) {
    beam.progress = 0;
    beam.healTickTimer = 0;
    beam.mode = "idle";
    room.syncActivePlayerStateFromContext(state, context);
    return beam.active;
  }

  beam.targetEnemy = bestTarget;
  beam.targetX = bestTarget.x;
  beam.targetY = bestTarget.y;
  beam.targetId = bestTarget.id || null;
  if (context.isControlledUndead(bestTarget)) {
    beam.mode = "heal";
    beam.progress = 0;
    beam.healTickTimer = (beam.healTickTimer || 0) + Math.max(0, Number.isFinite(dt) ? dt : 0);
    const healPeriod = room.sim.config?.necromancer?.healTickSeconds || 0.2;
    while (beam.healTickTimer >= healPeriod) {
      beam.healTickTimer -= healPeriod;
      context.healControlledUndead(bestTarget, context.getNecroticBeamHealAmount());
    }
  } else if (canTarget) {
    processRemoteNecromancerCharm(room, context, state, beam, bestTarget, dt);
  } else if (offensiveBeamEnabled) {
    processRemoteNecromancerOffense(room, context, state, beam, bestTarget, dt, beamDamagePeriod);
  }
  room.syncActivePlayerStateFromContext(state, context);
  return true;
}

function processRemoteNecromancerCharm(room, context, state, beam, bestTarget, dt) {
  beam.mode = "charm";
  beam.healTickTimer = 0;
  bestTarget.charmLocked = true;
  beam.progress += Math.max(0, Number.isFinite(dt) ? dt : 0);
  if (beam.progress < context.getNecromancerCharmDurationForPlayer(state)) return;
  if (!context.markUndeadAsControlled(bestTarget, state)) return;
  if (!(state.necromancerTalents?.necromancerPath?.points || 0)) {
    bestTarget.tempMageCharmTimer = 5;
    bestTarget.dieWhenCharmEnds = true;
  }
  beam.progress = 0;
  context.spawnFloatingText(bestTarget.x, bestTarget.y - bestTarget.size * 0.7, "Charmed", "#8eb8ff", 0.9, 14);
}

function processRemoteNecromancerOffense(room, context, state, beam, bestTarget, dt, beamDamagePeriod) {
  const firstDamageDelay = 0.2;
  if (beam.mode !== "offense") beam.healTickTimer = Math.max(0, beamDamagePeriod - firstDamageDelay);
  beam.mode = "offense";
  beam.progress = 0;
  beam.healTickTimer = (beam.healTickTimer || 0) + Math.max(0, Number.isFinite(dt) ? dt : 0);
  while (beam.healTickTimer >= beamDamagePeriod) {
    beam.healTickTimer -= beamDamagePeriod;
    const damage =
      context.getDeathBoltBaseDamage() *
      0.27 *
      getNecromancerBeamDamageMultiplier(context) *
      (1 + getNecromancerBlackCandleCursedBeamBonus(context, bestTarget)) *
      getNecromancerVigorBeamDamageMultiplier(context);
    const hpBefore = Number.isFinite(bestTarget.hp) ? bestTarget.hp : 0;
    context.applyEnemyDamage(bestTarget, damage, "necrotic", state.id || null);
    const dealt = Math.max(0, hpBefore - Math.max(0, Number.isFinite(bestTarget.hp) ? bestTarget.hp : 0));
    if (dealt > 0) {
      const runtime = context.necromancerRuntime || (context.necromancerRuntime = {});
      const cap = Math.max(0, (state.maxHealth || 0) * 0.15);
      runtime.tempHp = Math.min(cap, Math.max(0, Number.isFinite(runtime.tempHp) ? runtime.tempHp : 0) + Math.max(0.25, dealt * 0.2));
      if (typeof context.markPlayerHealthBarVisible === "function") context.markPlayerHealthBarVisible();
    }
    if (hasNecromancerBlightstorm(context)) bestTarget.curseTimer = Math.max(bestTarget.curseTimer || 0, getNecromancerCurseDuration(context));
    if (hpBefore <= 0 || (bestTarget.hp || 0) > 0) continue;
    const tempHpGain = getNecromancerDeathBoltMasteryTempHpOnKill(context);
    if (tempHpGain <= 0) continue;
    const runtime = context.necromancerRuntime || (context.necromancerRuntime = {});
    const cap = getNecromancerTempHpCap(context, state);
    runtime.tempHp = Math.min(cap, Math.max(0, Number.isFinite(runtime.tempHp) ? runtime.tempHp : 0) + tempHpGain);
    if (typeof context.markPlayerHealthBarVisible === "function") context.markPlayerHealthBarVisible();
    if (typeof context.spawnFloatingText === "function") context.spawnFloatingText(state.x, state.y - 34, `+${tempHpGain} THP`, "#9edcff", 0.7, 13);
  }
}
