import { strict as assert } from "node:assert";
import { AuthoritativeRoom } from "./net/AuthoritativeRoom.js";
import { buildDeltaCollection } from "./net/deltaProtocol.js";
import { buildMapChunkRows } from "./net/mapChunkStreaming.js";
import { getStableId, serializeMetaState, serializeState } from "./net/stateSerialization.js";
import { average, monotonicNowMs, percentile } from "./net/telemetry.js";
import { makeDefaultInput } from "./net/serverHelpers.js";
import { applyRemoteActionAimToContext, getRemoteActionAimVector } from "./net/remoteActionAim.js";
import { chooseGameplayTrack } from "./musicCatalog.js";
import { resolveCombatAndDrops } from "../src/game/stepCombatResolution.js";
import { applyNetworkFloatingTextEvents, resetNetworkFloatingTextEventCache } from "../src/net/clientSnapshotHelpers.js";
import { getHudAbilityState } from "../src/rendering/hud/abilityWidgetState.js";
import {
  validateProgressionEffectCoverage,
  validateRemoteMageProgression,
  validateRemoteWarriorProgression
} from "./validation/networkStatusParityHelpers.js";

function createFakeSocket() {
  return {
    OPEN: 1,
    readyState: 1,
    bufferedAmount: 0,
    send() {}
  };
}

function createFakeTransport() {
  return {
    sent: [],
    bufferedAmount: 0,
    isOpen: () => true,
    send(data) {
      this.sent.push(typeof data === "string" ? JSON.parse(data) : data);
      return true;
    },
    sendJson(payload) {
      this.sent.push(payload);
      return true;
    }
  };
}

function makeClient(id, name, classType) {
  return {
    id,
    name,
    classType,
    protocolVersion: 2,
    ws: createFakeSocket(),
    transport: createFakeTransport(),
    input: makeDefaultInput(),
    lastInputSeq: 0,
    classLocked: true
  };
}

function createRoomOptions() {
  return {
    average,
    buildDeltaCollection,
    buildMapChunkRows,
    chooseGameplayTrack,
    deltaKeyframeEvery: 30,
    getStableId,
    makeDefaultInput,
    mapChunkPushMs: 120,
    mapChunkRadius: 2,
    mapChunkSize: 24,
    maxWsBufferedBytes: 262144,
    metaBroadcastMinMs: 320,
    monotonicNowMs,
    percentile,
    pushTelemetrySample() {},
    serializeMetaState,
    serializeState,
    snapshotAckGapForceKeyframe: 8,
    tickDriftEpsilonMs: 0.5
  };
}

function createActiveRoom() {
  const room = new AuthoritativeRoom("validate-network-status-parity", "necromancer", createRoomOptions());
  const owner = makeClient("owner", "Owner", "fighter");
  const remote = makeClient("remote-necro", "RemoteNecro", "necromancer");
  room.addClient(owner);
  room.addClient(remote);
  room.startRun(Date.now());
  return { room, owner, remote };
}

function resetRemoteNecromancerState(room, remote) {
  const state = room.activePlayers.get(remote.id);
  assert.ok(state, "remote necromancer active player state missing");
  state.classType = "necromancer";
  state.x = room.sim.player.x + 96;
  state.y = room.sim.player.y;
  state.dirX = 1;
  state.dirY = 0;
  state.necromancerTalents.necroticBeamCantrip.points = 1;
  state.necromancerTalents.necromancerPath.points = 0;
  state.necromancerRuntime.activeMode = "cantrip";
  state.necromancerRuntime.tempHp = 0;
  return state;
}

function setupRemoteMageClickTarget(room, remote) {
  const state = resetRemoteNecromancerState(room, remote);
  for (const node of Object.values(state.necromancerTalents || {})) {
    if (node && typeof node === "object" && Object.hasOwn(node, "points")) node.points = 0;
  }
  state.necromancerTalents.fireBoltCantrip.points = 1;
  state.necromancerRuntime.mana = 10;
  state.necromancerRuntime.spellCastTimer = 0;
  state.necromancerRuntime.mimicTimer = 0;
  state.necromancerRuntime.classSkillCooldownTimer = 0;
  state.deathBoltCooldown = 0;
  state.fireCooldown = 0;
  state.dirX = 1;
  state.dirY = 0;
  room.sim.bullets = [];
  room.sim.enemies = [];
  room.sim.fireZones = [];
  const clicked = { x: state.x + 72, y: state.y + 24 };
  const input = { ...makeDefaultInput(), hasAim: true, aimX: clicked.x, aimY: clicked.y };
  const originalIsWallAt = room.sim.isWallAt;
  room.sim.isWallAt = () => false;
  const expectedContext = room.createPlayerSimulationContext(state);
  const aim = getRemoteActionAimVector(state, input);
  applyRemoteActionAimToContext(expectedContext, state, input);
  return { state, input, originalIsWallAt, expectedContext, aim };
}

function validateRemoteMageClickTargetedSpell(room, remote, spellKey) {
  const { state, input, originalIsWallAt, expectedContext, aim } = setupRemoteMageClickTarget(room, remote);
  state.necromancerTalents[spellKey].points = 1;
  expectedContext.necromancerTalents[spellKey].points = 1;
  state.necromancerRuntime.activeMode = "spell";
  input.firePrimaryQueued = true;
  const expectedTarget = expectedContext.getMageTargetPoint(aim.dx, aim.dy, 8);
  try { room.applyRemotePlayerCombat(remote, state, input, 0.016); } finally { room.sim.isWallAt = originalIsWallAt; }

  let actual = null;
  if (spellKey === "fireballSpell") {
    actual = room.sim.bullets.find((entry) => entry?.projectileType === "mage_fireball");
    assert.ok(actual, "remote fireballSpell should spawn a fireball projectile");
    actual = { x: actual.detonateX, y: actual.detonateY };
  } else if (spellKey === "flamingSphereSpell") {
    actual = room.sim.enemies.find((entry) => entry?.type === "flaming_sphere");
    assert.ok(actual, "remote flamingSphereSpell should spawn a flaming sphere");
    assert.equal(actual.anchorX, actual.x, "remote flaming sphere anchor should match spawn x");
    assert.equal(actual.anchorY, actual.y, "remote flaming sphere anchor should match spawn y");
  } else {
    const expectedZoneType = spellKey === "confusionSpell" ? "confusion" : "cloudDaggers";
    actual = room.sim.fireZones.find((entry) => entry?.zoneType === expectedZoneType);
    assert.ok(actual, `remote ${spellKey} should spawn its targeted zone`);
  }
  const errorPx = Math.hypot((actual.x || 0) - expectedTarget.x, (actual.y || 0) - expectedTarget.y);
  assert.ok(errorPx <= 0.01, `remote ${spellKey} should match local click-target resolver, got ${errorPx.toFixed(3)}px error`);
  return Number(errorPx.toFixed(3));
}

function validateRemoteMageClickTargetedDeathBolt(room, remote) {
  const { state, input, originalIsWallAt, expectedContext, aim } = setupRemoteMageClickTarget(room, remote);
  state.necromancerTalents.necromancerPath.points = 1;
  expectedContext.necromancerTalents.necromancerPath.points = 1;
  input.fireAltQueued = true;
  const origin = expectedContext.getBowMuzzleOrigin(aim.dx, aim.dy);
  const speed = expectedContext.config.deathBolt?.speed || 165;
  const life = expectedContext.config.deathBolt?.life || 1.6;
  const maxTravelDistance = speed * life;
  const clickedX = input.aimX;
  const clickedY = input.aimY;
  const clickDistance = Math.hypot(clickedX - origin.x, clickedY - origin.y);
  const travelDistance = Math.min(maxTravelDistance, clickDistance || maxTravelDistance);
  const expectedTarget = { x: origin.x + origin.dirX * travelDistance, y: origin.y + origin.dirY * travelDistance };
  try { room.applyRemotePlayerCombat(remote, state, input, 0.016); } finally { room.sim.isWallAt = originalIsWallAt; }
  const bolt = room.sim.bullets.find((entry) => entry?.projectileType === "deathBolt");
  assert.ok(bolt, "remote necromancerPath class skill should spawn Death Bolt");
  const errorPx = Math.hypot((bolt.detonateX || 0) - expectedTarget.x, (bolt.detonateY || 0) - expectedTarget.y);
  assert.ok(errorPx <= 0.01, `remote Death Bolt should use clicked detonation distance, got ${errorPx.toFixed(3)}px error`);
  return Number(errorPx.toFixed(3));
}

function resetRemoteArcherState(room, remote) {
  const state = room.activePlayers.get(remote.id);
  assert.ok(state, "remote archer active player state missing");
  state.classType = "archer";
  state.x = room.sim.player.x + 96;
  state.y = room.sim.player.y;
  state.dirX = 1;
  state.dirY = 0;
  state.level = 8;
  state.levelWeaponDamageBonus = 4;
  state.rangerRuntime.classSkillCooldownTimer = 0;
  state.rangerRuntime.weaponMode = "ranged";
  state.rangerTalents.bleed.points = 1;
  return state;
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

function resolveRemoteRangerProjectileHit(room, owner, target, { damage = 8, damageMult = 1 } = {}) {
  resolveProjectileHit(room, owner, target, {
    damage,
    damageMult,
    projectileType: "ranger_longbow"
  });
}

function validateRemoteNecromancerBeamAllowsZeroAim(room, remote) {
  const state = resetRemoteNecromancerState(room, remote);
  state.x = 128;
  state.y = 128;
  state.necromancerBeam = {
    active: false,
    targetId: null,
    targetX: 0,
    targetY: 0,
    progress: 0,
    healTickTimer: 0,
    mode: "idle",
    targetEnemy: null
  };
  const aimX = 0;
  const aimY = 192;
  const lineLen = Math.hypot(aimX - state.x, aimY - state.y);
  const offset = 9;
  const breakable = {
    id: "zero-aim-breakable",
    x: (state.x + aimX) * 0.5 + (-(aimY - state.y) / lineLen) * offset,
    y: (state.y + aimY) * 0.5 + ((aimX - state.x) / lineLen) * offset,
    size: 20,
    hp: 10,
    maxHp: 10
  };
  room.sim.breakables = [breakable];
  room.sim.enemies = [];
  const hit = room.processRemoteNecromancerBeam(state, {
    firePrimaryHeld: true,
    hasAim: true,
    aimX,
    aimY
  }, 0.016);
  assert.equal(hit, true, "remote necromancer beam should accept x=0 aim coordinates");
  assert.equal(breakable.hp, 0, "remote necromancer beam should hit breakables near an x=0 aim line");
}

function validateFloatingTextBackpressureRetention() {
  const { room, owner, remote } = createActiveRoom();
  room.sim.networkFloatingTextEvents = [{
    id: "ft_1",
    x: room.sim.player.x,
    y: room.sim.player.y,
    text: "-4",
    color: "#ffffff",
    life: 0.75,
    size: 14,
    vy: 22
  }];
  remote.transport.bufferedAmount = room.options.maxWsBufferedBytes + 1;
  room.broadcastSnapshot(Date.now(), true);
  assert.equal(room.sim.networkFloatingTextEvents.length, 1, "floating text should remain queued if any snapshot recipient is skipped");
  assert.ok(owner.transport.sent.some((msg) => msg.type === "state.snapshot" && Array.isArray(msg.state?.floatingTexts)), "available clients should still receive queued floating text events");

  remote.transport.bufferedAmount = 0;
  room.broadcastSnapshot(Date.now() + 16, true);
  assert.equal(room.sim.networkFloatingTextEvents.length, 0, "floating text should clear after a snapshot reaches every open recipient");
}

function validateFloatingTextDedupeReset() {
  const game = { floatingTexts: [] };
  applyNetworkFloatingTextEvents(game, [{ id: "ft_1", x: 10, y: 20, text: "-1" }]);
  applyNetworkFloatingTextEvents(game, [{ id: "ft_1", x: 10, y: 20, text: "-1" }]);
  assert.equal(game.floatingTexts.length, 1, "network floating text should dedupe repeated ids within a session");
  resetNetworkFloatingTextEventCache(game);
  applyNetworkFloatingTextEvents(game, [{ id: "ft_1", x: 14, y: 24, text: "-2" }]);
  assert.equal(game.floatingTexts.length, 2, "network floating text ids should be reusable after a session cache reset");
}

function main() {
  const progressionCoverage = validateProgressionEffectCoverage();
  const { room, remote } = createActiveRoom();
  room.beamHasLineOfSight = () => true;
  const remoteState = resetRemoteNecromancerState(room, remote);

  const skeleton = {
    id: "skeleton-temp-charm",
    type: "skeleton",
    x: remoteState.x + 64,
    y: remoteState.y,
    size: 18,
    hp: 12,
    maxHp: 12
  };
  room.sim.enemies = [skeleton];
  room.sim.breakables = [];
  room.processRemoteNecromancerBeam(remoteState, {
    firePrimaryHeld: true,
    hasAim: true,
    aimX: skeleton.x,
    aimY: skeleton.y
  }, 4);
  assert.equal(skeleton.isControlledUndead, true, "remote necromancer beam should charm undead targets");
  assert.equal(skeleton.controllerPlayerId, remote.id, "remote necromancer charm should use remote player as owner");
  assert.equal(skeleton.tempMageCharmTimer, 5, "remote non-path beam charm should match local temporary charm");
  assert.equal(skeleton.dieWhenCharmEnds, true, "remote non-path beam charm should die when temporary charm ends");

  const goblin = {
    id: "goblin-offensive-beam",
    type: "goblin",
    x: remoteState.x + 64,
    y: remoteState.y,
    size: 20,
    hp: 40,
    maxHp: 40
  };
  room.sim.enemies = [goblin];
  remoteState.necromancerBeam = {
    active: false,
    targetId: null,
    targetX: 0,
    targetY: 0,
    progress: 0,
    healTickTimer: 0,
    mode: "idle",
    targetEnemy: null
  };
  room.processRemoteNecromancerBeam(remoteState, {
    firePrimaryHeld: true,
    hasAim: true,
    aimX: goblin.x,
    aimY: goblin.y
  }, 1);
  assert.ok(goblin.hp < 40, "remote necromancer offensive beam should damage non-undead targets");
  assert.ok((remoteState.necromancerRuntime.tempHp || 0) > 0, "remote necromancer offensive beam should grant temp HP from damage");
  validateRemoteNecromancerBeamAllowsZeroAim(room, remote);
  validateFloatingTextBackpressureRetention();
  validateFloatingTextDedupeReset();

  const remoteFireballTargetErrorPx = validateRemoteMageClickTargetedSpell(room, remote, "fireballSpell");
  const remoteCloudTargetErrorPx = validateRemoteMageClickTargetedSpell(room, remote, "cloudDaggersSpell");
  const remoteConfusionTargetErrorPx = validateRemoteMageClickTargetedSpell(room, remote, "confusionSpell");
  const remoteFlamingSphereTargetErrorPx = validateRemoteMageClickTargetedSpell(room, remote, "flamingSphereSpell");
  const remoteDeathBoltTargetErrorPx = validateRemoteMageClickTargetedDeathBolt(room, remote);

  const remoteArcher = resetRemoteArcherState(room, remote);
  const bleedTarget = {
    id: "remote-ranger-bleed-target",
    type: "goblin",
    x: remoteArcher.x + 44,
    y: remoteArcher.y,
    size: 22,
    hp: 120,
    maxHp: 120,
    hitCooldown: 10
  };
  resolveRemoteRangerProjectileHit(room, remoteArcher, bleedTarget);
  assert.ok(bleedTarget.hp < 120, "remote ranger projectile should hit validation target");
  assert.ok((bleedTarget.bleedTimer || 0) > 0, "remote ranger projectile should apply owner bleed talent");
  assert.ok((bleedTarget.bleedDps || 0) > 0, "remote ranger projectile bleed should carry damage per second");
  assert.ok((remoteArcher.rangerRuntime.combo || 0) > 0, "remote ranger on-hit effects should update owner combo runtime");

  remoteArcher.rangerTalents.venomCoating.points = 1;
  remoteArcher.rangerTalents.quarry.points = 1;
  remoteArcher.rangerTalents.comboSurge.points = 1;
  remoteArcher.rangerTalents.livingShadow.points = 1;
  remoteArcher.rangerRuntime.combo = 10;
  remoteArcher.rangerRuntime.venomCooldownTimer = 0;
  remoteArcher.rangerRuntime.comboSurgeCooldownTimer = 0;
  remoteArcher.rangerRuntime.livingShadowCooldownTimer = 0;
  const fullProgressionTarget = {
    id: "remote-ranger-progression-target",
    type: "goblin",
    x: remoteArcher.x + 44,
    y: remoteArcher.y,
    size: 22,
    hp: 160,
    maxHp: 160,
    hitCooldown: 10
  };
  resolveRemoteRangerProjectileHit(room, remoteArcher, fullProgressionTarget, { damage: 3, damageMult: 0.2 });
  assert.ok((fullProgressionTarget.slowTimer || 0) > 0, "remote venom coating should apply slow");
  assert.ok((fullProgressionTarget.poisonSlowTimer || 0) > 0, "remote venom coating should apply poison slow");
  assert.ok((remoteArcher.rangerRuntime.venomCooldownTimer || 0) > 0, "remote venom coating should set owner cooldown");
  assert.equal(remoteArcher.rangerRuntime.quarryTargetId, fullProgressionTarget.id, "remote quarry should track owner target");
  assert.equal(remoteArcher.rangerRuntime.quarryStacks, 1, "remote quarry should add first owner stack");
  assert.ok(room.sim.fireZones.some((zone) => zone?.zoneType === "rangerSurge" && zone.ownerId === remote.id), "remote combo surge should spawn owner fire zone");
  assert.ok((remoteArcher.rangerRuntime.comboSurgeCooldownTimer || 0) > 0, "remote combo surge should set owner cooldown");
  assert.ok(room.sim.fireZones.some((zone) => zone?.zoneType === "ghostSiphon" && zone.ownerId === remote.id), "remote living shadow should spawn owner echo zone");
  assert.ok((remoteArcher.rangerRuntime.livingShadowCooldownTimer || 0) > 0, "remote living shadow should set owner cooldown");
  const quarryMarkTarget = {
    id: fullProgressionTarget.id,
    type: "goblin",
    x: remoteArcher.x + 44,
    y: remoteArcher.y,
    size: 22,
    hp: 160,
    maxHp: 160,
    hitCooldown: 10
  };
  remoteArcher.rangerRuntime.venomCooldownTimer = 1;
  remoteArcher.rangerRuntime.comboSurgeCooldownTimer = 1;
  remoteArcher.rangerRuntime.livingShadowCooldownTimer = 1;
  resolveRemoteRangerProjectileHit(room, remoteArcher, quarryMarkTarget, { damage: 3, damageMult: 0.2 });
  assert.equal(quarryMarkTarget.rangerMarkedBy, remote.id, "remote quarry second stack should mark target with owner id");
  assert.ok((quarryMarkTarget.rangerMarkedTimer || 0) > 0, "remote quarry second stack should set mark timer");

  remoteArcher.rangerTalents.bleed.points = 0;
  remoteArcher.rangerTalents.venomCoating.points = 0;
  remoteArcher.rangerTalents.quarry.points = 0;
  remoteArcher.rangerTalents.comboSurge.points = 0;
  remoteArcher.rangerTalents.livingShadow.points = 0;
  remoteArcher.rangerTalents.beastMasterPath.points = 1;
  remoteArcher.rangerRuntime.classSkillCooldownTimer = 0;
  room.sim.enemies = [];
  const activatedWolf = room.performActionForActivePlayer(remote.id, (context) => context.fireFireArrow(1, 0));
  assert.equal(activatedWolf, true, "remote Beastmaster Nature's Ally should activate through archer alt fire");
  assert.ok(room.sim.enemies.some((enemy) => enemy?.type === "wolf" && enemy.controllerPlayerId === remote.id), "remote Nature's Ally should spawn an owned wolf");
  assert.equal(remoteArcher.rangerRuntime.classSkillCooldownTimer, 10, "remote Nature's Ally should use its 10s cooldown instead of dodge cooldown");
  room.sim.networkActivePlayers = room.getSimulationPlayerEntities();
  room.sim.tickActivePlayerEntities(4);
  assert.ok(remoteArcher.rangerRuntime.classSkillCooldownTimer <= 6.01 && remoteArcher.rangerRuntime.classSkillCooldownTimer >= 5.99, "remote Nature's Ally cooldown should tick down to 6s");
  room.sim.tickActivePlayerEntities(1);
  assert.ok(remoteArcher.rangerRuntime.classSkillCooldownTimer < 6, "remote Nature's Ally cooldown should continue ticking below 6s");

  const hudState = getHudAbilityState({
    player: { id: "local-dead", health: 0, alive: false },
    remotePlayers: [remoteArcher],
    spectateTargetId: remote.id,
    config: room.sim.config,
    classType: "archer",
    classSpec: room.sim.config.classes.archer,
    isWarriorClass() { return this.classType === "fighter"; },
    isNecromancerClass() { return this.classType === "necromancer"; },
    getSpectateTargetEntity() { return this.remotePlayers.find((player) => player.id === this.spectateTargetId) || null; }
  });
  assert.equal(hudState.title, "Nature's Ally", "spectator HUD should use spectate target ranger path");
  assert.ok(hudState.cooldownRemaining < 6, "spectator HUD should use live spectate target cooldown");

  validateRemoteWarriorProgression(room, remote);
  validateRemoteMageProgression(room, remote);

  const statusEnemy = {
    id: "status-full",
    type: "ghost",
    x: room.sim.player.x + 48,
    y: room.sim.player.y,
    size: 20,
    hp: 10,
    maxHp: 10,
    burningTimer: 1.2,
    burningDps: 3,
    curseTimer: 1.3,
    rotTimer: 1.4,
    rotDps: 2,
    slowTimer: 1.5,
    slowPct: 0.3,
    poisonSlowTimer: 1.6,
    confusionTimer: 1.7,
    confusionImmunityTimer: 8,
    weakenedTimer: 1.8,
    bleedTimer: 1.9,
    bleedDps: 4,
    rangerMarkedTimer: 2,
    rangerMarkedBy: remote.id,
    tempMageCharmTimer: 2.1,
    dieWhenCharmEnds: true
  };
  room.sim.enemies = [statusEnemy];
  const fullState = serializeState(room);
  const serialized = fullState.enemies.find((enemy) => enemy.type === "ghost" && enemy.rangerMarkedBy === remote.id);
  assert.ok(serialized, "serialized status enemy missing");
  for (const key of [
    "burningTimer",
    "burningDps",
    "curseTimer",
    "rotTimer",
    "rotDps",
    "slowTimer",
    "slowPct",
    "poisonSlowTimer",
    "confusionTimer",
    "confusionImmunityTimer",
    "weakenedTimer",
    "bleedTimer",
    "bleedDps",
    "rangerMarkedTimer",
    "tempMageCharmTimer"
  ]) {
    assert.equal(serialized[key], statusEnemy[key], `serialized enemy should include active ${key}`);
  }
  assert.equal(serialized.rangerMarkedBy, remote.id, "serialized enemy should include ranger mark owner");
  assert.equal(serialized.dieWhenCharmEnds, true, "serialized enemy should include temporary charm death flag");

  const cache = new Map();
  buildDeltaCollection(cache, [serialized], true);
  const clearedDelta = buildDeltaCollection(cache, [{
    id: serialized.id,
    type: "ghost",
    x: statusEnemy.x,
    y: statusEnemy.y,
    size: 20,
    hp: 10,
    maxHp: 10,
    hpBarTimer: 0,
    shotWindupTimer: 0,
    collapsed: false,
    collapseTimer: 0,
    goldEaten: 0,
    variant: null
  }], false);
  const clearPatch = clearedDelta.update.find((entry) => entry.id === serialized.id);
  assert.ok(clearPatch, "status clear delta missing");
  for (const key of [
    "slowTimer",
    "slowPct",
    "poisonSlowTimer",
    "confusionTimer",
    "confusionImmunityTimer",
    "weakenedTimer",
    "bleedTimer",
    "bleedDps",
    "rangerMarkedTimer",
    "rangerMarkedBy",
    "tempMageCharmTimer",
    "dieWhenCharmEnds"
  ]) {
    assert.equal(clearPatch[key], null, `enemy delta should explicitly clear expired ${key}`);
  }

  console.log(JSON.stringify({
    networkStatusParity: "ok",
    charmOwner: skeleton.controllerPlayerId,
    offensiveBeamDamage: Number((40 - goblin.hp).toFixed(3)),
    progressionCoverage,
    remoteFireballTargetErrorPx,
    remoteCloudTargetErrorPx,
    remoteConfusionTargetErrorPx,
    remoteFlamingSphereTargetErrorPx,
    remoteDeathBoltTargetErrorPx,
    remoteRangerBleedDps: Number((bleedTarget.bleedDps || 0).toFixed(3)),
    natureAllyCooldown: Number((remoteArcher.rangerRuntime.classSkillCooldownTimer || 0).toFixed(3)),
    serializedStatusFields: Object.keys(serialized).filter((key) => key.endsWith("Timer") || key.endsWith("Dps") || key === "slowPct").length
  }, null, 2));
}

main();
