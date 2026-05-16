import { strict as assert } from "node:assert";
import { AuthoritativeRoom } from "./net/AuthoritativeRoom.js";
import { buildDeltaCollection } from "./net/deltaProtocol.js";
import { buildMapChunkRows } from "./net/mapChunkStreaming.js";
import { getStableId, serializeMetaState, serializeState } from "./net/stateSerialization.js";
import { average, monotonicNowMs, percentile } from "./net/telemetry.js";
import { makeDefaultInput } from "./net/serverHelpers.js";
import { chooseGameplayTrack } from "./musicCatalog.js";
import { GameSim } from "../src/sim/GameSim.js";
import { syncNamedObject } from "../src/net/clientSnapshotHelpers.js";
import { applyPlayerSnapshotToGameState, ACTIVE_PLAYER_SNAPSHOT_FIELDS } from "../src/net/playerSnapshotSchema.js";

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

function assertSnapshotFields(snapshot) {
  for (const field of ACTIVE_PLAYER_SNAPSHOT_FIELDS) {
    assert.ok(Object.prototype.hasOwnProperty.call(snapshot, field), `active player snapshot missing ${field}`);
  }
}

function main() {
  const room = new AuthoritativeRoom("validate-player-state-sync", "archer", createRoomOptions());
  const owner = makeClient("owner", "Owner", "necromancer");
  const peer = makeClient("peer", "Peer", "fighter");
  room.addClient(owner);
  room.addClient(peer);
  room.startRun(Date.now());

  const ownerState = room.activePlayers.get(owner.id);
  assert.ok(ownerState, "owner active player state missing");
  ownerState.level = 4;
  ownerState.score = 321;
  ownerState.gold = 123;
  ownerState.experience = 17;
  ownerState.skillPoints = 2;
  ownerState.refundCount = 1;
  ownerState.levelWeaponDamageBonus = 9;
  ownerState.fireCooldown = 0.25;
  ownerState.fireArrowCooldown = 0.5;
  ownerState.deathBoltCooldown = 0.75;
  ownerState.lanternFuel = 0.42;
  ownerState.necromancerRuntime.activeMode = "spell";
  ownerState.necromancerRuntime.mana = 3;
  ownerState.necromancerTalents.fireBoltCantrip.points = 1;
  ownerState.skills.deathBolt.points = 3;
  ownerState.consumables.sharedCooldown = 1.2;
  ownerState.necromancerBeam.active = true;
  ownerState.necromancerBeam.targetX = 77;
  ownerState.necromancerBeam.targetY = 88;

  room.syncSimPrimaryPlayerState();
  assert.equal(room.sim.classType, "necromancer", "primary sim class did not sync from active state");
  assert.equal(room.sim.level, 4, "primary sim level did not sync from active state");
  assert.equal(room.sim.gold, 123, "primary sim gold did not sync from active state");
  assert.equal(room.sim.skills.deathBolt.points, 3, "primary sim skills did not sync from active state");
  assert.equal(room.sim.necromancerTalents.fireBoltCantrip.points, 1, "primary sim talents did not sync from active state");

  room.sim.gold = 456;
  room.sim.level = 5;
  room.sim.player.health = 44;
  room.sim.player.fireCooldown = 0.125;
  room.sim.skills.deathBolt.points = 4;
  room.sim.necromancerRuntime.activeMode = "cantrip";
  room.sim.necromancerBeam.progress = 0.6;
  const syncedOwner = room.syncPrimaryActivePlayerFromSim();
  assert.equal(syncedOwner.gold, 456, "active state gold did not sync from primary sim");
  assert.equal(syncedOwner.level, 5, "active state level did not sync from primary sim");
  assert.equal(syncedOwner.health, 44, "active state health did not sync from primary sim");
  assert.equal(syncedOwner.fireCooldown, 0.125, "active state cooldown did not sync from primary sim");
  assert.equal(syncedOwner.skills.deathBolt.points, 4, "active state skills did not sync from primary sim");
  assert.equal(syncedOwner.necromancerBeam.progress, 0.6, "active state beam did not sync from primary sim");

  const state = serializeState(room);
  const ownerSnapshot = state.players.find((player) => player.id === owner.id);
  assert.ok(ownerSnapshot, "serialized owner snapshot missing from players collection");
  assertSnapshotFields(ownerSnapshot);
  assert.equal(ownerSnapshot.gold, 456, "serialized owner snapshot did not include active gold");
  assert.equal(ownerSnapshot.fireCooldown, 0.125, "serialized owner snapshot did not include cooldown");
  assert.equal(ownerSnapshot.necromancerBeam.progress, 0.6, "serialized owner snapshot did not include beam state");

  const clientGame = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  applyPlayerSnapshotToGameState(clientGame, ownerSnapshot, { isNetworkController: false, syncNamedObject });
  assert.equal(clientGame.classType, "necromancer", "client class did not apply from player snapshot");
  assert.equal(clientGame.gold, 456, "client gold did not apply from player snapshot");
  assert.equal(clientGame.player.health, 44, "client health did not apply from player snapshot");
  assert.equal(clientGame.player.fireCooldown, 0.125, "client cooldown did not apply from player snapshot");
  assert.equal(clientGame.skills.deathBolt.points, 4, "client skills did not apply from player snapshot");
  assert.equal(clientGame.necromancerBeam.progress, 0.6, "client beam did not apply from player snapshot");

  console.log(JSON.stringify({
    playerStateSync: "ok",
    snapshotFields: ACTIVE_PLAYER_SNAPSHOT_FIELDS.length,
    ownerClass: clientGame.classType,
    ownerGold: clientGame.gold
  }, null, 2));
}

main();
