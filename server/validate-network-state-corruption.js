import { strict as assert } from "node:assert";
import { AuthoritativeRoom } from "./net/AuthoritativeRoom.js";
import { buildDeltaCollection } from "./net/deltaProtocol.js";
import { buildMapChunkRows } from "./net/mapChunkStreaming.js";
import { getStableId, serializeMetaState, serializeState } from "./net/stateSerialization.js";
import { average, monotonicNowMs, percentile } from "./net/telemetry.js";
import { makeDefaultInput } from "./net/serverHelpers.js";
import { chooseGameplayTrack } from "./musicCatalog.js";
import { GameSim } from "../src/sim/GameSim.js";
import { applySnapshotToGame } from "../src/net/clientStateSync.js";
import { stepNetworkEnemyPresentation } from "../src/bootstrap/networkRenderRuntime.js";

function createFakeSocket() {
  return {
    OPEN: 1,
    readyState: 1,
    bufferedAmount: 0,
    send() {}
  };
}

function makeClient(id, name, classType) {
  return {
    id,
    name,
    classType,
    protocolVersion: 2,
    ws: createFakeSocket(),
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

function makeStatusEnemy(id, x, y) {
  return {
    id,
    type: "ghost",
    x,
    y,
    size: 20,
    hp: 10,
    maxHp: 10,
    hpBarTimer: 1.2,
    burningTimer: 1.1,
    burningDps: 3,
    curseTimer: 1.3,
    rotTimer: 1.4,
    rotDps: 2
  };
}

function latestAnomaly(game, kind) {
  const entries = Array.isArray(game?.networkPerf?.recentStateAnomalies) ? game.networkPerf.recentStateAnomalies : [];
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i]?.kind === kind) return entries[i];
  }
  return null;
}

function latestServerAnomaly(game, kind) {
  const entries = Array.isArray(game?.networkPerf?.recentServerStateAnomalies)
    ? game.networkPerf.recentServerStateAnomalies
    : [];
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i]?.kind === kind) return entries[i];
  }
  return null;
}

function main() {
  const room = new AuthoritativeRoom("validate-network-state-corruption", "archer", createRoomOptions());
  const owner = makeClient("owner", "Owner", "necromancer");
  const peer = makeClient("peer", "Peer", "fighter");
  room.addClient(owner);
  room.addClient(peer);
  room.startRun(Date.now());

  const ownerState = room.activePlayers.get(owner.id);
  assert.ok(ownerState, "owner active player state missing");
  ownerState.necromancerRuntime.mimicTimer = 8;
  ownerState.necromancerRuntime.mimicHealth = 11;
  room.syncSimPrimaryPlayerState();
  assert.equal(room.sim.necromancerRuntime.mimicTimer, 8, "test setup failed to seed server mimic runtime");

  room.sim.necromancerRuntime.mimicTimer = 0;
  room.sim.necromancerRuntime.mimicHealth = 0;
  room.syncPrimaryActivePlayerFromSim();
  const syncedOwner = room.activePlayers.get(owner.id);
  assert.equal(syncedOwner.necromancerRuntime.mimicTimer, 0, "pause-owner active snapshot kept stale mimic timer");
  assert.equal(syncedOwner.necromancerRuntime.mimicHealth, 0, "pause-owner active snapshot kept stale mimic health");

  const px = room.sim.player.x;
  const py = room.sim.player.y;
  room.sim.enemies = [
    makeStatusEnemy("status-a", px + 40, py),
    makeStatusEnemy("status-b", px + 70, py + 20),
    makeStatusEnemy("status-c", px + 100, py - 20),
    makeStatusEnemy("status-d", px + 130, py)
  ];
  room.sim.enemies.push({
    id: "mimic-dormant",
    type: "mimic",
    x: px + 72,
    y: py + 64,
    size: 20,
    hp: 12,
    maxHp: 12,
    dormant: true,
    revealed: false,
    tongueDirX: -1,
    tongueDirY: 0,
    tongueLength: 16
  });
  room.auditServerState({ source: "validatorSeed" });
  const serverStatusAudit = room.recentServerStateAnomalies.find((entry) => entry.kind === "enemyStatusFanout");
  assert.ok(serverStatusAudit, "server audit did not capture enemy status fanout");
  assert.equal(serverStatusAudit.tripleStatusCount, 4, "server audit did not include triple status count");

  const peerState = room.activePlayers.get(peer.id);
  assert.ok(peerState, "peer active player state missing");
  const pausedPeerX = peerState.x;
  const pausedPeerY = peerState.y;
  peer.input = {
    ...peer.input,
    seq: 42,
    moveX: 1,
    moveY: 0,
    firePrimaryQueued: true,
    firePrimaryHeld: true,
    hasAim: true,
    aimDirX: 1,
    aimDirY: 0
  };
  room.sim.paused = true;
  const pausedStatusBefore = room.sim.enemies.map((enemy) => ({
    id: enemy.id,
    hpBarTimer: enemy.hpBarTimer,
    burningTimer: enemy.burningTimer,
    curseTimer: enemy.curseTimer,
    rotTimer: enemy.rotTimer,
    burningDps: enemy.burningDps,
    rotDps: enemy.rotDps
  }));
  const pausedBulletCount = room.sim.bullets.length;
  const pausedFireArrowCount = room.sim.fireArrows.length;
  room.tick(Date.now() + 1000, 0);
  room.tick(Date.now() + 2000, 0);
  assert.deepEqual(
    room.sim.enemies.map((enemy) => ({
      id: enemy.id,
      hpBarTimer: enemy.hpBarTimer,
      burningTimer: enemy.burningTimer,
      curseTimer: enemy.curseTimer,
      rotTimer: enemy.rotTimer,
      burningDps: enemy.burningDps,
      rotDps: enemy.rotDps
    })),
    pausedStatusBefore,
    "paused authoritative tick mutated enemy status presentation state"
  );
  assert.equal(peerState.x, pausedPeerX, "paused authoritative tick moved a remote player");
  assert.equal(peerState.y, pausedPeerY, "paused authoritative tick moved a remote player vertically");
  assert.equal(room.sim.bullets.length, pausedBulletCount, "paused authoritative tick spawned bullets");
  assert.equal(room.sim.fireArrows.length, pausedFireArrowCount, "paused authoritative tick spawned fire arrows");
  room.sim.paused = false;

  const fullState = serializeState(room);
  const ownerSnapshot = fullState.players.find((player) => player.id === owner.id);
  assert.equal(ownerSnapshot?.necromancerRuntime?.mimicTimer, 0, "serialized owner snapshot exposed stale mimic timer");
  const mimicSnapshot = fullState.enemies.find((enemy) => enemy.type === "mimic");
  assert.equal(mimicSnapshot?.dormant, true, "serialized mimic dropped dormant presentation state");
  assert.equal(mimicSnapshot?.tongueLength, 16, "serialized mimic dropped tongue presentation state");

  const client = new GameSim({ classType: "fighter", viewportWidth: 960, viewportHeight: 640 });
  client.networkEnabled = true;
  client.player.id = peer.id;
  client.player.x = px;
  client.player.y = py;
  applySnapshotToGame({
    game: client,
    state: {
      players: fullState.players,
      delta: {
        keyframe: true,
        enemies: buildDeltaCollection(new Map(), fullState.enemies, true)
      },
      serverStateAnomalies: room.recentServerStateAnomalies
    },
    controller: false,
    localPlayerId: peer.id,
    ackSeq: 12
  });
  assert.ok(latestAnomaly(client, "enemyStatusFanout"), "telemetry did not mark enemy status fanout");
  assert.ok(latestServerAnomaly(client, "enemyStatusFanout"), "client did not preserve server-side status audit");
  assert.equal(latestAnomaly(client, "playerMimicRuntimeVisible"), null, "clean snapshot still reported player mimic runtime");

  const corruptPlayerState = {
    players: [
      {
        id: owner.id,
        handle: "Owner",
        classType: "necromancer",
        x: px + 32,
        y: py,
        size: 22,
        health: 100,
        maxHealth: 100,
        alive: true,
        necromancerRuntime: { mimicTimer: 6, mimicHealth: 9 }
      }
    ],
    delta: { keyframe: true, enemies: {} }
  };
  applySnapshotToGame({ game: client, state: corruptPlayerState, controller: false, localPlayerId: peer.id, ackSeq: 13 });
  const mimicTelemetry = latestAnomaly(client, "playerMimicRuntimeVisible");
  assert.ok(mimicTelemetry, "telemetry did not mark player mimic runtime visibility");
  assert.equal(mimicTelemetry.remoteMimicCount, 1, "player mimic telemetry did not include remote mimic count");

  client.enemies = [makeStatusEnemy("presentation", px, py)];
  stepNetworkEnemyPresentation(client.enemies, 0.45);
  assert.equal(client.enemies[0].hpBarTimer, 0.75, "presentation hp bar timer did not age by render delta");
  stepNetworkEnemyPresentation(client.enemies, 1.5);
  assert.equal(client.enemies[0].burningTimer, 0, "presentation burning timer did not clear after stall");
  assert.equal(client.enemies[0].curseTimer, 0, "presentation curse timer did not clear after stall");
  assert.equal(client.enemies[0].rotTimer, 0, "presentation rot timer did not clear after stall");
  assert.equal(client.enemies[0].burningDps, 0, "presentation burning dps did not clear with timer");
  assert.equal(client.enemies[0].rotDps, 0, "presentation rot dps did not clear with timer");

  const negativeRoom = new AuthoritativeRoom("validate-negative-tick-delta", "archer", createRoomOptions());
  const negativeOwner = makeClient("negative-owner", "NegativeOwner", "archer");
  negativeRoom.addClient(negativeOwner);
  negativeRoom.startRun(Date.now());
  const nx = negativeRoom.sim.player.x + 500;
  const ny = negativeRoom.sim.player.y + 500;
  negativeRoom.sim.enemies = [{
    id: "clean-status",
    type: "skeleton",
    x: nx,
    y: ny,
    size: 18,
    hp: 10,
    maxHp: 10,
    hpBarTimer: 0,
    burningTimer: 0,
    burningDps: 0,
    curseTimer: 0,
    rotTimer: 0,
    rotDps: 0
  }];
  if (negativeRoom.sim.necromancerRuntime) {
    negativeRoom.sim.necromancerRuntime.mimicTimer = 0;
    negativeRoom.sim.necromancerRuntime.mimicHealth = 0;
  }
  const negativeOwnerState = negativeRoom.activePlayers.get(negativeOwner.id);
  if (negativeOwnerState?.necromancerRuntime) {
    negativeOwnerState.necromancerRuntime.mimicTimer = 0;
    negativeOwnerState.necromancerRuntime.mimicHealth = 0;
  }
  const negativeNow = Date.now();
  negativeRoom.lastTickMs = negativeNow + 2915;
  negativeRoom.tick(negativeNow, 0);
  const cleanEnemy = negativeRoom.sim.enemies.find((enemy) => enemy.id === "clean-status");
  assert.ok(cleanEnemy, "negative tick removed clean enemy unexpectedly");
  assert.equal(cleanEnemy.burningTimer || 0, 0, "negative authoritative dt invented burning timer");
  assert.equal(cleanEnemy.curseTimer || 0, 0, "negative authoritative dt invented curse timer");
  assert.equal(cleanEnemy.rotTimer || 0, 0, "negative authoritative dt invented rot timer");
  assert.equal(cleanEnemy.burningDps || 0, 0, "negative authoritative dt invented burning dps");
  assert.equal(cleanEnemy.rotDps || 0, 0, "negative authoritative dt invented rot dps");
  assert.equal(negativeRoom.sim.necromancerRuntime?.mimicTimer || 0, 0, "negative authoritative dt invented primary mimic timer");
  assert.equal(negativeRoom.activePlayers.get(negativeOwner.id)?.necromancerRuntime?.mimicTimer || 0, 0, "negative authoritative dt invented active player mimic timer");
  assert.ok(
    negativeRoom.recentServerStateAnomalies.some((entry) => entry.kind === "negativeTickDelta"),
    "negative authoritative dt was not recorded for telemetry"
  );

  console.log(JSON.stringify({
    networkStateCorruption: "ok",
    serializedEnemies: fullState.enemies.length,
    stateAnomalies: client.networkPerf.recentStateAnomalies.map((entry) => entry.kind),
    serverClockAnomalies: negativeRoom.recentServerStateAnomalies.map((entry) => entry.kind)
  }, null, 2));
}

main();
