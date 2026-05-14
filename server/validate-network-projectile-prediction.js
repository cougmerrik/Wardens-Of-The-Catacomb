import assert from "node:assert/strict";
import { Game } from "../src/Game.js";
import { applySnapshotToGame } from "../src/net/clientStateSync.js";
import { createProjectileSpawnReconciler } from "../src/net/clientSnapshotHelpers.js";
import {
  discardPredictedProjectile,
  predictProjectileSpawn,
  prunePredictedProjectiles,
  updateNetworkProjectilePresentation,
  updatePredictedProjectiles
} from "../src/net/projectilePrediction.js";

const game = new Game(null, { headless: true, classType: "archer" });
const predicted = new Map();
game.player.id = "local-ranger";
game.networkLocalPlayerId = "net-ranger";
game.recentPlayerShots = [];
game.recordPlayerShotTelemetry = (entry) => {
  game.recentPlayerShots.push(entry);
};

predictProjectileSpawn(
  game,
  {
    seq: 7,
    hasAim: true,
    aimDirX: 1,
    aimDirY: 0,
    firePrimaryQueued: true,
    firePrimaryHeld: false,
    fireAltQueued: false
  },
  1000,
  true,
  predicted,
  0
);

const bucket = predicted.get(7);
assert.equal(bucket?.length, 1, "primary prediction should be indexed by input seq");
assert.equal(game.bullets.length, 1, "primary prediction should render immediately");
assert.equal(game.bullets[0].predicted, true, "rendered primary prediction should be marked predicted");
assert.equal(game.bullets[0].ownerId, "net-ranger", "rendered primary prediction should belong to local network player");
assert.equal(game.bullets[0].projectileType, "ranger_longbow", "rendered primary prediction should use ranger projectile art");
assert.equal(Math.round(game.bullets[0].vx), 430, "rendered primary prediction should use longbow projectile speed");
assert.equal(Math.round(bucket[0].vx), 430, "stored primary prediction should use longbow projectile speed");
assert.equal(game.recentPlayerShots[0]?.projectileSpeed, 430, "prediction telemetry should report longbow projectile speed");

const x0 = game.bullets[0].x;
updatePredictedProjectiles(game, predicted, 0.05);
assert.ok(game.bullets[0].x > x0 + 20, "rendered primary prediction should advance between snapshots");

game.bullets.length = 0;
updatePredictedProjectiles(game, predicted, 0.016);
assert.equal(game.bullets.length, 1, "pending prediction should rehydrate after snapshot bullet replacement");
assert.equal(game.bullets[0].predictedRenderId, bucket[0].renderId, "rehydrated prediction should keep its render identity");

discardPredictedProjectile(game, bucket[0]);
assert.equal(game.bullets.length, 0, "reconciled primary prediction should be removed from rendered bullets");

game.bullets.push({
  id: bucket[0].renderId,
  predicted: true,
  predictedRenderId: bucket[0].renderId,
  x: bucket[0].x,
  y: bucket[0].y,
  vx: bucket[0].vx,
  vy: bucket[0].vy,
  angle: bucket[0].angle,
  life: bucket[0].life,
  ownerId: bucket[0].ownerId,
  projectileType: bucket[0].projectileType,
  spawnSeq: bucket[0].seq
});
const snapshotStore = new Map([[7, [bucket[0]]]]);
applySnapshotToGame({
  game,
  state: {
    delta: {
      bullets: {
        spawn: [{
          id: "authoritative-7",
          spawnSeq: 7,
          ownerId: "net-ranger",
          x: bucket[0].x + 4,
          y: bucket[0].y,
          vx: bucket[0].vx,
          vy: bucket[0].vy,
          angle: bucket[0].angle,
          life: 1,
          projectileType: bucket[0].projectileType
        }]
      }
    },
    players: [{ id: "net-ranger", x: game.player.x, y: game.player.y, health: game.player.health, classType: "archer" }]
  },
  controller: true,
  ackSeq: 7,
  isNetworkController: true,
  localPlayerId: "net-ranger",
  netPredictedProjectiles: snapshotStore,
  netPendingInputs: [],
  netLastAckSeq: 0,
  frameGapMs: 16
});
assert.equal(snapshotStore.size, 0, "snapshot reconciliation should remove matched prediction from the store");
assert.equal(game.bullets.some((projectile) => projectile?.predicted), false, "delta merge should not reinsert reconciled predicted bullets");
assert.equal(game.bullets.length, 1, "delta merge should keep the authoritative projectile only");
game.bullets.length = 0;

predictProjectileSpawn(
  game,
  {
    seq: 8,
    hasAim: true,
    aimDirX: 1,
    aimDirY: 0,
    firePrimaryQueued: true,
    firePrimaryHeld: false,
    fireAltQueued: false
  },
  2000,
  true,
  predicted,
  0
);

assert.equal(game.bullets.length, 1, "second prediction should render immediately");
prunePredictedProjectiles(predicted, 2130, 220, game, 120);
assert.equal(game.bullets.length, 0, "visually expired primary prediction should be removed from rendered bullets");
assert.equal(predicted.get(8)?.length, 1, "visually expired primary prediction should remain available for reconciliation");
updatePredictedProjectiles(game, predicted, 0.016);
assert.equal(game.bullets.length, 0, "visually expired primary prediction should not rehydrate into rendered bullets");
prunePredictedProjectiles(predicted, 2300, 220, game);
assert.equal(game.bullets.length, 0, "expired primary prediction should be removed from rendered bullets");
assert.equal(predicted.has(8), false, "fully expired primary prediction should be removed from reconciliation store");

game.bullets.length = 0;
predicted.clear();
game.recentPlayerShots.length = 0;
const heldNextAt = predictProjectileSpawn(
  game,
  {
    seq: 9,
    hasAim: true,
    aimDirX: 1,
    aimDirY: 0,
    firePrimaryQueued: false,
    firePrimaryHeld: true,
    fireAltQueued: false
  },
  4000,
  true,
  predicted,
  3000
);
assert.equal(game.recentPlayerShots.length, 1, "late held-fire prediction should render one shot, not catch-up bursts");
assert.equal(game.bullets.length, 1, "late held-fire prediction should not burst multiple rendered shots");
assert.ok(heldNextAt > 4000, "late held-fire prediction should reschedule from the current time");

game.bullets.length = 0;
predicted.clear();
game.bullets.push({
  x: 10,
  y: 20,
  vx: 100,
  vy: -50,
  life: 1,
  predicted: false
});
game.fireArrows.push({
  x: 5,
  y: 6,
  vx: 0,
  vy: 200,
  life: 1,
  predicted: false
});
updateNetworkProjectilePresentation(game, 0.1);
assert.equal(Math.round(game.bullets[0].x), 20, "authoritative bullet presentation should advance between snapshots");
assert.equal(Math.round(game.bullets[0].y), 15, "authoritative bullet presentation should advance vertically between snapshots");
assert.equal(Math.round(game.fireArrows[0].y), 26, "authoritative fire arrow presentation should advance between snapshots");
game.bullets.push({ x: 0, y: 0, vx: 1, vy: 0, life: 0.01, predicted: false });
updateNetworkProjectilePresentation(game, 0.02);
assert.equal(game.bullets.some((bullet) => bullet && bullet.life === 0), false, "expired authoritative bullets should be removed in network presentation");

const reconcileStore = new Map();
reconcileStore.set(10, [{
  seq: 10,
  type: "bullet",
  x: 100,
  y: 100,
  vx: 430,
  vy: 0,
  angle: 0,
  renderId: "predicted-near-seq"
}]);
let discardedNearSeq = false;
const reconcileGame = {
  player: { x: 90, y: 100 },
  networkPerf: { projectileReconcileRejects: 0 },
  discardPredictedProjectile: () => {
    discardedNearSeq = true;
  },
  recordPlayerShotTelemetry: (entry) => {
    reconcileGame.lastShotTelemetry = entry;
  }
};
const reconcile = createProjectileSpawnReconciler({
  controller: true,
  isNetworkController: true,
  localPlayerId: "local-ranger",
  netPredictedProjectiles: reconcileStore,
  game: reconcileGame,
  frameGapMs: 16
});
const reconciled = reconcile({
  spawnSeq: 14,
  ownerId: "local-ranger",
  x: 106,
  y: 100,
  vx: 430,
  vy: 0,
  angle: 0,
  life: 1
}, "bullet");
assert.equal(reconcileStore.size, 0, "nearby held-fire seq mismatch should still reconcile predicted projectile");
assert.equal(discardedNearSeq, true, "nearby seq reconciliation should discard predicted render");
assert.equal(reconcileGame.lastShotTelemetry?.rejected, false, "nearby seq reconciliation should not be treated as a reject");
assert.ok(Number.isFinite(reconciled.x), "nearby seq reconciliation should return a usable authoritative projectile");

const rejectStore = new Map();
rejectStore.set(21, [{
  seq: 21,
  type: "bullet",
  x: 100,
  y: 100,
  vx: 430,
  vy: 0,
  angle: 0,
  renderId: "predicted-too-far"
}]);
let discardedRejected = false;
const rejectGame = {
  player: { x: 90, y: 100 },
  networkPerf: { projectileReconcileRejects: 0 },
  discardPredictedProjectile: () => {
    discardedRejected = true;
  },
  recordPlayerShotTelemetry: (entry) => {
    rejectGame.lastShotTelemetry = entry;
  }
};
const rejectReconcile = createProjectileSpawnReconciler({
  controller: true,
  isNetworkController: true,
  localPlayerId: "local-ranger",
  netPredictedProjectiles: rejectStore,
  game: rejectGame,
  frameGapMs: 16
});
const rejectedAuthoritative = rejectReconcile({
  spawnSeq: 21,
  ownerId: "local-ranger",
  x: 240,
  y: 100,
  vx: 430,
  vy: 0,
  angle: 0,
  life: 1
}, "bullet");
assert.equal(rejectStore.size, 0, "rejected reconciliation should discard the stale predicted projectile");
assert.equal(discardedRejected, true, "rejected reconciliation should remove the stale predicted render");
assert.equal(rejectGame.networkPerf.projectileReconcileRejects, 1, "rejected reconciliation should increment the reject counter");
assert.equal(rejectGame.networkPerf.recentProjectileReconcileRejects?.length, 1, "rejected reconciliation should record a reject event");
assert.equal(rejectGame.networkPerf.recentProjectileReconcileRejects[0].reason, "positionMismatch", "reject event should include a reason");
assert.equal(rejectGame.networkPerf.recentProjectileReconcileRejects[0].source, "clientProjectileReconcile", "reject event should include a source");
assert.equal(rejectGame.networkPerf.recentProjectileReconcileRejects[0].spawnSeq, 21, "reject event should include authoritative spawn seq");
assert.equal(rejectGame.networkPerf.recentProjectileReconcileRejects[0].bucketSeq, 21, "reject event should include predicted bucket seq");
assert.ok(rejectGame.networkPerf.recentProjectileReconcileRejects[0].distancePx > 48, "reject event should include the failed distance");
assert.equal(rejectGame.lastShotTelemetry?.rejected, true, "shot telemetry should mark rejected authoritative reconciliation");
assert.equal(rejectedAuthoritative.x, 240, "rejected reconciliation should keep authoritative projectile position");

console.log("Network projectile prediction validation passed.");
