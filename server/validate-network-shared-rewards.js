import { strict as assert } from "node:assert";
import { AuthoritativeRoom } from "./net/AuthoritativeRoom.js";
import { buildDeltaCollection } from "./net/deltaProtocol.js";
import { buildMapChunkRows } from "./net/mapChunkStreaming.js";
import { average, monotonicNowMs, percentile } from "./net/telemetry.js";
import { makeDefaultInput } from "./net/serverHelpers.js";
import { getStableId, serializeMetaState, serializeState } from "./net/stateSerialization.js";
import { chooseGameplayTrack } from "./musicCatalog.js";
import { getEffectiveMasterVolume, getStoredMasterVolume, normalizeMasterVolume } from "../src/audio/audioSettings.js";
import { GameSim } from "../src/sim/GameSim.js";
import { stepGame } from "../src/game/gameStep.js";

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

function prepareRewardPlayers(room) {
  room.syncSimPrimaryPlayerState();
  room.sim.activePlayerCount = Math.max(1, room.clients.size);
  room.sim.networkActivePlayers = room.getSimulationPlayerEntities();
}

function readRewardPlayers(room) {
  return {
    ownerState: room.syncPrimaryActivePlayerFromSim(),
    peerState: room.activePlayers.get("peer")
  };
}

function validateSharedRewards() {
  const room = new AuthoritativeRoom("validate-network-shared-rewards", "archer", createRoomOptions());
  const owner = makeClient("owner", "Owner", "warrior");
  const peer = makeClient("peer", "Peer", "archer");
  room.addClient(owner);
  room.addClient(peer);
  room.startRun(Date.now());

  prepareRewardPlayers(room);
  let { ownerState, peerState } = readRewardPlayers(room);
  assert.ok(ownerState, "owner active state missing");
  assert.ok(peerState, "peer active state missing");

  room.sim.gainExperienceForPlayerEntity(peerState, 4);
  ({ ownerState, peerState } = readRewardPlayers(room));
  assert.equal(ownerState.experience, 4, "owner did not receive shared XP from peer reward");
  assert.equal(peerState.experience, 4, "peer did not keep XP from own reward");

  room.sim.awardGoldToPlayerEntity(peerState, 11, { spawnText: false });
  ({ ownerState, peerState } = readRewardPlayers(room));
  assert.equal(ownerState.gold, 11, "owner did not receive shared gold from peer pickup");
  assert.equal(peerState.gold, 11, "peer did not keep gold from own pickup");
  assert.equal(ownerState.score, 11, "owner gold-score reward did not mirror shared gold");
  assert.equal(peerState.score, 11, "peer gold-score reward did not mirror shared gold");

  peerState.alive = false;
  peerState.health = 0;
  prepareRewardPlayers(room);
  room.sim.awardGoldToPlayerEntity(room.sim.player, 5, { spawnText: false });
  ({ ownerState, peerState } = readRewardPlayers(room));
  assert.equal(ownerState.gold, 16, "living owner did not receive gold after peer death");
  assert.equal(peerState.gold, 11, "dead peer incorrectly received shared gold");
}

function makeRewardEnemy(game, overrides = {}) {
  return {
    id: overrides.id || `enemy_${Math.random().toString(36).slice(2)}`,
    type: overrides.type || "mummy",
    x: game.player.x + 96,
    y: game.player.y,
    size: 18,
    hp: 0,
    maxHp: 10,
    ...overrides
  };
}

function validateDeathRewardEligibility() {
  const game = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  const remote = {
    id: "p_remote_alive",
    classType: "fighter",
    x: game.player.x + 64,
    y: game.player.y,
    size: game.player.size,
    health: 100,
    maxHealth: 100,
    alive: true,
    level: 1,
    experience: 0,
    expToNextLevel: 999,
    skillPoints: 0,
    levelWeaponDamageBonus: 0
  };
  game.remotePlayers = [remote];
  game.activePlayerCount = 2;
  game.player.health = 0;
  game.player.alive = false;

  game.enemies.push(makeRewardEnemy(game, { id: "ownerless" }));
  stepGame(game, 0.016, { processUi: false });
  assert.ok(remote.experience > 0, "ownerless enemy death should reward remaining active players");
  assert.equal(game.experience, 0, "dead primary player should not receive shared XP");

  const xpAfterOwnerless = remote.experience;
  game.enemies.push(makeRewardEnemy(game, {
    id: "friendly-pet",
    type: "wolf",
    isControlledUndead: true,
    controllerPlayerId: remote.id,
    summonedByPlayer: true
  }));
  stepGame(game, 0.016, { processUi: false });
  assert.equal(remote.experience, xpAfterOwnerless, "player pet death should not award XP");

  game.enemies.push(makeRewardEnemy(game, { id: "confused-kill", lastDamageOwnerId: remote.id }));
  stepGame(game, 0.016, { processUi: false });
  assert.ok(remote.experience > xpAfterOwnerless, "confused/allied enemy kill should award shared XP through owner id");
}

function validateAudioScaling() {
  const emptyStorage = { getItem: () => null };
  assert.equal(getStoredMasterVolume(emptyStorage), 0.5, "default master game volume should be 50%");
  assert.equal(normalizeMasterVolume(2), 1, "master game volume should clamp to 100%");
  assert.equal(getEffectiveMasterVolume(1), 0.1, "100% master game volume should output at 10% device volume");
  assert.equal(getEffectiveMasterVolume(0.5), 0.05, "50% master game volume should output at 5% device volume");
}

validateSharedRewards();
validateDeathRewardEligibility();
validateAudioScaling();

console.log(JSON.stringify({
  sharedRewards: "ok",
  deathRewardEligibility: "ok",
  defaultMasterVolume: getStoredMasterVolume({ getItem: () => null }),
  effectiveFullMasterVolume: getEffectiveMasterVolume(1),
  effectiveDefaultMasterVolume: getEffectiveMasterVolume(0.5)
}, null, 2));
