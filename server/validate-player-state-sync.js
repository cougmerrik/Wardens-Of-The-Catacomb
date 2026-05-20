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
import { applySnapshotToGame, syncByIdLerp } from "../src/net/clientStateSync.js";
import { applyPlayerSnapshotToGameState, ACTIVE_PLAYER_SNAPSHOT_FIELDS } from "../src/net/playerSnapshotSchema.js";
import { applyPredictedTeleportAction } from "../src/net/teleportPrediction.js";

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

function validateTeleportPrediction() {
  const archer = { classType: "archer", rangerTalents: { roguePath: { points: 1 } }, player: { classType: "archer", x: 240, y: 240, dirX: 1, dirY: 0 }, moveWithCollisionSubsteps(entity, dx, dy) { entity.x += dx; entity.y += dy; } };
  const archerStartX = archer.player.x;
  assert.equal(applyPredictedTeleportAction(archer, { fireAltQueued: true, hasAim: true, aimDirX: 1, aimDirY: 0 }), true, "remote controller should predict rogue shadowstep");
  assert.ok(archer.player.x > archerStartX + 120, "predicted shadowstep should move immediately instead of waiting for correction");

  const mage = { classType: "necromancer", config: { map: { tile: 32 } }, necromancerTalents: { sorcererPath: { points: 1 } }, player: { classType: "necromancer", x: 240, y: 240, dirX: 1, dirY: 0 }, moveWithCollisionSubsteps(entity, dx, dy) { entity.x += dx; entity.y += dy; }, isWallAt: () => false };
  const mageStartX = mage.player.x;
  assert.equal(applyPredictedTeleportAction(mage, { fireAltQueued: true, hasAim: true, aimDirX: 1, aimDirY: 0 }), true, "remote controller should predict mage blink paths");
  assert.ok(mage.player.x > mageStartX + 40, "predicted mage blink should move immediately instead of smoothing in");

  const deathBoltMage = new GameSim({ classType: "necromancer", viewportWidth: 960, viewportHeight: 640 });
  deathBoltMage.necromancerTalents.necromancerPath.points = 1;
  const beforeX = deathBoltMage.player.x;
  assert.equal(applyPredictedTeleportAction(deathBoltMage, { fireAltQueued: true, hasAim: true, aimDirX: 1, aimDirY: 0 }), false, "Death Bolt should not be treated as teleport prediction");
  assert.equal(deathBoltMage.player.x, beforeX, "non-teleport mage class skill should not move during teleport prediction");

  const remotes = [{ id: "blink", x: 10, y: 10, teleportSeq: 1 }];
  syncByIdLerp(remotes, [{ id: "blink", x: 150, y: 10, teleportSeq: 2 }], 0.5);
  assert.equal(remotes[0].x, 150, "remote player teleportSeq changes should snap instead of lerping");
}

function main() {
  validateTeleportPrediction();
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
  assert.equal(room.sim.necromancerRuntime.activeMode, "spell", "primary sim necromancer runtime did not sync from active state");
  assert.equal(room.sim.necromancerRuntime.mana, 3, "primary sim necromancer mana did not sync from active state");

  room.sim.gold = 456;
  room.sim.level = 5;
  room.sim.player.health = 44;
  room.sim.player.fireCooldown = 0.125;
  room.sim.skills.deathBolt.points = 4;
  room.sim.necromancerRuntime.activeMode = "cantrip";
  room.sim.necromancerRuntime.mimicTimer = 0;
  room.sim.necromancerRuntime.mimicHealth = 0;
  room.sim.necromancerBeam.progress = 0.6;
  const syncedOwner = room.syncPrimaryActivePlayerFromSim();
  assert.equal(syncedOwner.gold, 456, "active state gold did not sync from primary sim");
  assert.equal(syncedOwner.level, 5, "active state level did not sync from primary sim");
  assert.equal(syncedOwner.health, 44, "active state health did not sync from primary sim");
  assert.equal(syncedOwner.fireCooldown, 0.125, "active state cooldown did not sync from primary sim");
  assert.equal(syncedOwner.skills.deathBolt.points, 4, "active state skills did not sync from primary sim");
  assert.equal(syncedOwner.necromancerRuntime.activeMode, "cantrip", "active state necromancer runtime mode did not sync from primary sim");
  assert.equal(syncedOwner.necromancerRuntime.mimicTimer, 0, "active state necromancer mimic timer stayed stale after primary sim sync");
  assert.equal(syncedOwner.necromancerBeam.progress, 0.6, "active state beam did not sync from primary sim");

  const peerState = room.activePlayers.get(peer.id);
  assert.ok(peerState, "peer active player state missing");
  peer.lastProcessedInputSeq = 77;
  peerState.classType = "archer";
  peerState.rangerTalents.roguePath.points = 1;
  peerState.x = 260;
  peerState.y = 260;
  const originalMoveWithCollisionSubsteps = room.sim.moveWithCollisionSubsteps;
  room.sim.moveWithCollisionSubsteps = (entity, dx, dy) => { entity.x += dx; entity.y += dy; };
  try {
    room.applyRemotePlayerCombat(peer, peerState, { ...makeDefaultInput(), fireAltQueued: true, hasAim: true, aimDirX: 1, aimDirY: 0 }, 0.016);
  } finally {
    room.sim.moveWithCollisionSubsteps = originalMoveWithCollisionSubsteps;
  }
  assert.equal(peerState.teleportSeq, 77, "authoritative teleport actions should mark active player teleportSeq");

  const state = serializeState(room);
  const ownerSnapshot = state.players.find((player) => player.id === owner.id);
  assert.ok(ownerSnapshot, "serialized owner snapshot missing from players collection");
  assertSnapshotFields(ownerSnapshot);
  assert.equal(ownerSnapshot.gold, 456, "serialized owner snapshot did not include active gold");
  assert.equal(ownerSnapshot.fireCooldown, 0.125, "serialized owner snapshot did not include cooldown");
  assert.equal(ownerSnapshot.necromancerRuntime.mimicTimer, 0, "serialized owner snapshot kept stale mimic timer");
  assert.equal(ownerSnapshot.necromancerBeam.progress, 0.6, "serialized owner snapshot did not include beam state");

  const clientGame = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  applyPlayerSnapshotToGameState(clientGame, ownerSnapshot, { isNetworkController: false, syncNamedObject });
  assert.equal(clientGame.classType, "necromancer", "client class did not apply from player snapshot");
  assert.equal(clientGame.gold, 456, "client gold did not apply from player snapshot");
  assert.equal(clientGame.player.health, 44, "client health did not apply from player snapshot");
  assert.equal(clientGame.player.fireCooldown, 0.125, "client cooldown did not apply from player snapshot");
  assert.equal(clientGame.skills.deathBolt.points, 4, "client skills did not apply from player snapshot");
  assert.equal(clientGame.necromancerRuntime.mimicTimer, 0, "client mimic timer did not clear from player snapshot");
  assert.equal(clientGame.necromancerBeam.progress, 0.6, "client beam did not apply from player snapshot");

  room.sim.floatingTexts = [];
  room.sim.spawnFloatingText(320, 260, "-9", "#e85c5c", 0.75, 14);
  room.sim.spawnFloatingText(room.sim.player.x, room.sim.player.y - 50, "Battle Cry", "#f4efe3", 0.85, 15);
  const floatingState = serializeState(room);
  assert.ok(floatingState.floatingTexts.some((entry) => entry.text === "-9"), "serialized network state should include killing-blow damage text");
  assert.ok(floatingState.floatingTexts.some((entry) => entry.text === "Battle Cry"), "serialized network state should include warrior battle cry text");
  const floatingClient = new GameSim({ classType: "fighter", viewportWidth: 960, viewportHeight: 640 });
  floatingClient.spawnFloatingText = function spawnFloatingText(x, y, text, color, life = 0.75, size = 14) {
    this.floatingTexts.push({ x, y, text, color, life, maxLife: life, size });
  };
  applySnapshotToGame({ game: floatingClient, state: floatingState, controller: false, localPlayerId: "spectator" });
  applySnapshotToGame({ game: floatingClient, state: floatingState, controller: false, localPlayerId: "spectator" });
  assert.equal(floatingClient.floatingTexts.filter((entry) => entry.text === "-9").length, 1, "network killing-blow damage text should spawn once");
  assert.equal(floatingClient.floatingTexts.filter((entry) => entry.text === "Battle Cry").length, 1, "network battle cry text should spawn once");

  console.log(JSON.stringify({
    playerStateSync: "ok",
    snapshotFields: ACTIVE_PLAYER_SNAPSHOT_FIELDS.length,
    ownerClass: clientGame.classType,
    ownerGold: clientGame.gold
  }, null, 2));
}

main();
