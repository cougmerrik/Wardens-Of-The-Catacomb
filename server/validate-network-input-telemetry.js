import { strict as assert } from "node:assert";
import { AuthoritativeRoom } from "./net/AuthoritativeRoom.js";
import { buildDeltaCollection } from "./net/deltaProtocol.js";
import { buildMapChunkRows } from "./net/mapChunkStreaming.js";
import { getStableId, serializeMetaState, serializeState } from "./net/stateSerialization.js";
import { average, monotonicNowMs, percentile } from "./net/telemetry.js";
import { makeDefaultInput } from "./net/serverHelpers.js";
import { chooseGameplayTrack } from "./musicCatalog.js";
import { applySnapshotToGame } from "../src/net/clientStateSync.js";
import { isLocalGameplayInputActive, shouldSendNetworkInput, stripGameplayInputForSpectator } from "../src/net/sessionInteraction.js";

function createRoomOptions(overrides = {}) {
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
    maxMapChunksPerSnapshot: 3,
    maxWsBufferedBytes: 262144,
    metaBroadcastMinMs: 320,
    monotonicNowMs,
    percentile,
    pushTelemetrySample(values, value) {
      if (Array.isArray(values)) values.push(value);
    },
    serializeMetaState,
    serializeState,
    snapshotAckGapForceKeyframe: 8,
    tickDriftEpsilonMs: 0.5,
    ...overrides
  };
}

function createTransport() {
  const sent = [];
  return {
    sent,
    bufferedAmount: 0,
    isOpen: () => true,
    send(data) {
      sent.push(typeof data === "string" ? JSON.parse(data) : data);
      return true;
    },
    sendJson(payload) {
      sent.push(payload);
      return true;
    }
  };
}

function createClient(id) {
  return {
    id,
    name: id,
    classType: "archer",
    protocolVersion: 2,
    transport: createTransport(),
    input: makeDefaultInput(),
    inputQueue: [],
    lastInputSeq: 0,
    lastReceivedInputSeq: 0,
    lastProcessedInputSeq: 0,
    droppedInputCount: 0
  };
}

function validateSpectatorInputGating() {
  const game = { networkRoomPhase: "active", networkRole: "Spectating", player: { health: 0 } };
  assert.equal(isLocalGameplayInputActive(game), false, "dead spectator should not be gameplay-input active");
  const input = stripGameplayInputForSpectator({
    moveX: 1,
    moveY: -1,
    firePrimaryQueued: true,
    firePrimaryHeld: true,
    fireAltQueued: true,
    swapAttackQueued: true,
    modeSwapQueued: true,
    spectateTargetId: "p_live"
  });
  assert.deepEqual(
    {
      moveX: input.moveX,
      moveY: input.moveY,
      firePrimaryQueued: input.firePrimaryQueued,
      firePrimaryHeld: input.firePrimaryHeld,
      fireAltQueued: input.fireAltQueued,
      swapAttackQueued: input.swapAttackQueued,
      modeSwapQueued: input.modeSwapQueued,
      spectatorOnly: input.spectatorOnly
    },
    {
      moveX: 0,
      moveY: 0,
      firePrimaryQueued: false,
      firePrimaryHeld: false,
      fireAltQueued: false,
      swapAttackQueued: false,
      modeSwapQueued: false,
      spectatorOnly: true
    },
    "spectator input should strip gameplay controls"
  );
  assert.equal(shouldSendNetworkInput(input, 100, { ...input }, 0, 100), false, "unchanged spectator input should not idle-send");
  assert.equal(shouldSendNetworkInput({ ...input, spectateTargetId: "p_next" }, 100, input, 0, 100), true, "spectate target changes should still send");
}

function validateDeadControllerDoesNotReconcile() {
  const game = {
    player: { id: "p_dead", x: 100, y: 100, size: 22, health: 0, alive: false, classType: "archer" },
    classType: "archer",
    config: { classes: { archer: {} }, map: { tile: 32 } },
    enemies: [],
    drops: [],
    lightSources: [],
    breakables: [],
    wallTraps: [],
    bullets: [],
    fireArrows: [],
    fireZones: [],
    meleeSwings: [],
    remotePlayers: [],
    networkPerf: { appliedSnapshotCount: 0 },
    moveWithCollisionSubsteps(entity, dx, dy) {
      entity.x += dx;
      entity.y += dy;
    },
    getPlayerMoveSpeed: () => 220,
    isPositionWalkable: () => true,
    updateSpectateTarget() {}
  };
  const pending = [{ seq: 9, dt: 1, moveX: 1, moveY: 0 }];
  const result = applySnapshotToGame({
    game,
    state: {
      player: { id: "p_dead", x: 40, y: 50, health: 0, alive: false, classType: "archer" },
      players: [{ id: "p_dead", x: 40, y: 50, health: 0, alive: false, classType: "archer" }],
      delta: { keyframe: true }
    },
    controller: true,
    isNetworkController: true,
    localPlayerId: "p_dead",
    ackSeq: 9,
    netPendingInputs: pending,
    netLastAckSeq: 0,
    snapshotJitterMs: 0,
    frameGapMs: 50
  });
  assert.equal(game.player.x, 40, "dead controller snapshot should apply directly instead of replaying movement");
  assert.equal(game.player.y, 50, "dead controller snapshot should apply directly instead of replaying movement");
  assert.equal(result.netPendingInputs.length, 1, "dead controller should not consume prediction queue through reconciliation");
  assert.equal(game.networkPerf.settleCorrectionCount || 0, 0, "dead controller should not record settle corrections");
}

function validateSnapshotTelemetryAndChunkCap() {
  const room = new AuthoritativeRoom("telemetry", "archer", createRoomOptions());
  const client = createClient("owner");
  room.addClient(client);
  room.startRun(Date.now());
  const pushed = room.sendMapChunksToClient(client, Date.now() + 200);
  assert.ok(pushed.sent <= 3, "map chunk push should respect per-snapshot cap");

  room.broadcastSnapshot(Date.now() + 300, true);
  const snapshot = client.transport.sent.find((msg) => msg.type === "state.snapshot");
  assert.ok(snapshot?.snapshotTelemetry, "snapshot should include telemetry");
  assert.ok(Number.isFinite(snapshot.snapshotTelemetry.mapChunksSent), "snapshot telemetry should include map chunk count");
  const telemetry = room.getTelemetrySnapshot();
  assert.ok(telemetry.snapshotPayloadBytes, "room telemetry should include payload bytes");
  assert.ok(telemetry.snapshotBroadcastGapMs, "room telemetry should include broadcast gap");
  assert.ok(telemetry.mapChunkPushDurationMs, "room telemetry should include map chunk push duration");
}

validateSpectatorInputGating();
validateDeadControllerDoesNotReconcile();
validateSnapshotTelemetryAndChunkCap();

console.log(JSON.stringify({ networkInputTelemetry: "ok" }));
