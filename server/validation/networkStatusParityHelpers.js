import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolveCombatAndDrops } from "../../src/game/stepCombatResolution.js";

const RANGER_ON_HIT_EFFECT_CASES = [
  "venomCoating",
  "quarry",
  "bleed",
  "comboSurge",
  "livingShadow"
];
const MAGE_ON_HIT_EFFECT_CASES = [
  "arcaneBind",
  "enchanterPath",
  "runicMastery"
];
const WARRIOR_PROGRESSION_EFFECT_CASES = [
  "warWhip",
  "longspear",
  "guarded",
  "marked",
  "paladin",
  "eldritch"
];

function resetRemoteWarriorState(room, remote) {
  const state = room.activePlayers.get(remote.id);
  assert.ok(state, "remote warrior active player state missing");
  state.classType = "fighter";
  state.x = room.sim.player.x + 96;
  state.y = room.sim.player.y;
  state.dirX = 1;
  state.dirY = 0;
  state.level = 8;
  state.levelWeaponDamageBonus = 4;
  state.fireCooldown = 0;
  state.blockBonusTimer = 0;
  for (const talent of Object.values(state.warriorTalents || {})) talent.points = 0;
  state.warriorRuntime.eldritchSurgeTimer = 0;
  state.warriorRuntime.eldritchWardHp = 0;
  state.warriorRuntime.eldritchWardCooldownTimer = 0;
  return state;
}

function resetRemoteMageState(room, remote) {
  const state = room.activePlayers.get(remote.id);
  assert.ok(state, "remote mage active player state missing");
  state.classType = "necromancer";
  state.x = room.sim.player.x + 96;
  state.y = room.sim.player.y;
  state.dirX = 1;
  state.dirY = 0;
  state.level = 8;
  state.levelWeaponDamageBonus = 4;
  state.fireCooldown = 0;
  state.necromancerRuntime.activeMode = "cantrip";
  state.necromancerRuntime.tempHp = 0;
  for (const talent of Object.values(state.necromancerTalents || {})) talent.points = 0;
  return state;
}

function extractFunctionBody(source, name) {
  let searchFrom = 0;
  let bodyStart = -1;
  while (searchFrom < source.length) {
    const start = source.indexOf(`${name}(`, searchFrom);
    assert.notEqual(start, -1, `${name} source missing`);
    const paramsStart = source.indexOf("(", start);
    assert.notEqual(paramsStart, -1, `${name} params missing`);
    let paramsDepth = 0;
    let paramsEnd = -1;
    for (let i = paramsStart; i < source.length; i++) {
      if (source[i] === "(") paramsDepth += 1;
      else if (source[i] === ")") {
        paramsDepth -= 1;
        if (paramsDepth === 0) {
          paramsEnd = i;
          break;
        }
      }
    }
    assert.notEqual(paramsEnd, -1, `${name} params did not terminate`);
    let bodyCandidate = paramsEnd + 1;
    while (/\s/.test(source[bodyCandidate] || "")) bodyCandidate += 1;
    if (source[bodyCandidate] === "{") {
      bodyStart = bodyCandidate;
      break;
    }
    searchFrom = paramsEnd + 1;
  }
  assert.notEqual(bodyStart, -1, `${name} body missing`);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i++) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(bodyStart, i + 1);
    }
  }
  throw new Error(`${name} body did not terminate`);
}

export function validateProgressionEffectCoverage() {
  const rangerSource = readFileSync(new URL("../../src/game/playerAttack/runtimeRangerOnHitAttackMethods.js", import.meta.url), "utf8");
  const rangerBody = extractFunctionBody(rangerSource, "applyRangerTalentOnHitEffects");
  const rangerDiscovered = new Set(Array.from(rangerBody.matchAll(/hasRangerTalent\(this,\s*"([^"]+)"/g), (match) => match[1]));
  const rangerCovered = new Set(RANGER_ON_HIT_EFFECT_CASES);
  for (const key of rangerDiscovered) assert.ok(rangerCovered.has(key), `ranger progression on-hit effect ${key} needs a targeted network parity case`);
  for (const key of rangerCovered) assert.ok(rangerDiscovered.has(key), `ranger progression coverage case ${key} no longer maps to an on-hit effect`);

  const mageSource = readFileSync(new URL("../../src/game/playerAttack/runtimeMageCoreAttackMethods.js", import.meta.url), "utf8");
  const mageBody = extractFunctionBody(mageSource, "applyMageOnHitEffects");
  const mageDiscovered = new Set(Array.from(mageBody.matchAll(/hasMageTalent\(this,\s*"([^"]+)"/g), (match) => match[1]));
  const mageCovered = new Set(MAGE_ON_HIT_EFFECT_CASES);
  for (const key of mageDiscovered) assert.ok(mageCovered.has(key), `mage progression on-hit effect ${key} needs a targeted network parity case`);
  for (const key of mageCovered) assert.ok(mageDiscovered.has(key), `mage progression coverage case ${key} no longer maps to an on-hit effect`);

  const warriorSource = readFileSync(new URL("../../src/game/runtimePlayerAttackMethods.js", import.meta.url), "utf8");
  const warriorSourceBody = `${extractFunctionBody(warriorSource, "getWarriorAttackProfile")}\n${extractFunctionBody(warriorSource, "performMeleeAttack")}`;
  for (const token of WARRIOR_PROGRESSION_EFFECT_CASES) {
    assert.ok(warriorSourceBody.includes(token), `warrior progression effect ${token} needs source-backed network parity coverage`);
  }

  return {
    ranger: [...rangerDiscovered].sort(),
    mage: [...mageDiscovered].sort(),
    warrior: [...WARRIOR_PROGRESSION_EFFECT_CASES].sort()
  };
}

function resolveProjectileHit(room, owner, target, projectile = {}) {
  room.sim.enemies = [target];
  room.sim.bullets = [{
    x: target.x,
    y: target.y,
    prevXForHit: target.x - 12,
    prevYForHit: target.y,
    vx: 0,
    vy: 0,
    angle: 0,
    life: 0.8,
    size: 6,
    damage: 8,
    damageMult: 1,
    critMultiplier: 1,
    ownerId: owner.id,
    faction: "player",
    hitTargets: new Set(),
    ...projectile
  }];
  room.sim.networkActivePlayers = room.getSimulationPlayerEntities();
  assert.equal(room.sim.getPlayerEntityById(owner.id)?.classType, owner.classType, "remote projectile owner should be visible to projectile resolution");
  const originalIsWallAt = room.sim.isWallAt;
  room.sim.isWallAt = () => false;
  try {
    resolveCombatAndDrops({
      game: room.sim,
      dt: 0.016,
      activeEnemies: [target],
      activeBreakables: [],
      playerEnemyRadius: 0,
      isActive: () => true,
      segmentRectHit: () => false,
      skeletonIgnoresArrow: () => false
    });
  } finally {
    room.sim.isWallAt = originalIsWallAt;
  }
}

function makeProgressionTarget(id, owner, distance = 44) {
  return {
    id,
    type: "goblin",
    x: owner.x + distance,
    y: owner.y,
    size: 22,
    hp: 180,
    maxHp: 180,
    hitCooldown: 0
  };
}

function performRemoteMelee(room, owner, target) {
  room.sim.enemies = [target];
  room.sim.networkActivePlayers = room.getSimulationPlayerEntities();
  const swingCount = room.sim.meleeSwings.length;
  room.performActionForActivePlayer(owner.id, (context) => context.performMeleeAttack(1, 0));
  assert.ok(room.sim.meleeSwings.length > swingCount, "remote warrior melee action should create a swing");
  assert.ok(target.hp < target.maxHp, "remote warrior melee should damage validation target");
}

export function validateRemoteWarriorProgression(room, remote) {
  const warrior = resetRemoteWarriorState(room, remote);
  warrior.warriorTalents.warWhip.points = 1;
  let target = makeProgressionTarget("remote-warrior-warwhip", warrior, 42);
  performRemoteMelee(room, warrior, target);
  assert.ok((target.slowTimer || 0) > 0, "remote warrior War Whip should apply slow");
  assert.ok((target.slowPct || 0) > 0, "remote warrior War Whip should set slow percent");

  resetRemoteWarriorState(room, remote);
  warrior.warriorTalents.longspear.points = 1;
  target = makeProgressionTarget("remote-warrior-longspear", warrior, 50);
  performRemoteMelee(room, warrior, target);
  assert.ok((target.pendingBonusStagger || 0) > 0, "remote warrior Longspear should apply bonus stagger");
  assert.ok((target.hitCooldown || 0) > 0, "remote warrior Longspear should apply hit cooldown");

  resetRemoteWarriorState(room, remote);
  warrior.warriorTalents.stanceAGuarded.points = 1;
  warrior.warriorTalents.paladinDoctrine.points = 1;
  target = makeProgressionTarget("remote-warrior-guarded", warrior, 42);
  performRemoteMelee(room, warrior, target);
  assert.ok((warrior.blockBonusTimer || 0) > 0, "remote warrior Guarded Paladin should grant block window");

  resetRemoteWarriorState(room, remote);
  warrior.warriorTalents.stanceAMarked.points = 1;
  target = makeProgressionTarget("remote-warrior-marked", warrior, 42);
  performRemoteMelee(room, warrior, target);
  assert.equal(target.arcaneMarkOwnerId, remote.id, "remote warrior Marked stance should apply owner mark");
  assert.ok((target.arcaneMarkTimer || 0) > 0, "remote warrior Marked stance should apply mark timer");

  resetRemoteWarriorState(room, remote);
  warrior.warriorTalents.eldritchDoctrine.points = 1;
  target = makeProgressionTarget("remote-warrior-eldritch", warrior, 42);
  performRemoteMelee(room, warrior, target);
  assert.ok((warrior.warriorRuntime.eldritchSurgeTimer || 0) > 0, "remote warrior Eldritch doctrine should set surge runtime");
}

export function validateRemoteMageProgression(room, remote) {
  const mage = resetRemoteMageState(room, remote);
  mage.necromancerTalents.arcaneBind.points = 1;
  mage.necromancerTalents.enchanterPath.points = 1;
  mage.necromancerTalents.runicMastery.points = 1;
  mage.necromancerTalents.battlemage.points = 1;
  const target = makeProgressionTarget("remote-mage-progression", mage, 24);
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    resolveProjectileHit(room, mage, target, {
      projectileType: "mage_frostShard",
      mageCantrip: "frostShardCantrip",
      damageType: "cold",
      runesConsumed: 3
    });
  } finally {
    Math.random = originalRandom;
  }
  assert.ok(target.hp < 180 - 8, "remote mage Battlemage projectile bonus should use owner talents");
  assert.ok(room.sim.fireZones.some((zone) => zone?.zoneType === "arcaneBind" && zone.ownerId === remote.id), "remote mage Arcane Bind should spawn owner field");
  assert.equal(target.mageInfluenceOwnerId, remote.id, "remote mage Enchanter influence should use owner id");
  assert.equal(target.mageInfluenceStacks, 1, "remote mage Enchanter influence should add a stack");
  assert.ok((target.slowTimer || 0) > 0, "remote mage Runic Mastery cold hit should apply slow");
}
