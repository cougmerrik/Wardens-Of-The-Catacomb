import assert from "node:assert/strict";
import { Game } from "../src/Game.js";
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
prunePredictedProjectiles(predicted, 2300, 220, game);
assert.equal(game.bullets.length, 0, "expired primary prediction should be removed from rendered bullets");

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

console.log("Network projectile prediction validation passed.");
