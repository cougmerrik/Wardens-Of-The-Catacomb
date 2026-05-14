import assert from "node:assert/strict";
import {
  NET_CONTROLLER_RENDER_DELAY_MS,
  NET_INPUT_INTERVAL_MS,
  NET_MIN_SEND_MS,
  NET_SPECTATOR_RENDER_DELAY_MS
} from "../src/bootstrap/networkSessionRuntime.js";
import { canRunPredictedCollision, hasRecentCorrectionPressure } from "../src/net/sessionInteraction.js";

assert.equal(NET_INPUT_INTERVAL_MS, 16, "controller input should poll near 60Hz");
assert.ok(NET_MIN_SEND_MS <= NET_INPUT_INTERVAL_MS, "minimum send delay should not throttle below the input poll cadence");
assert.ok(NET_CONTROLLER_RENDER_DELAY_MS <= 12, "active controller render delay should stay low enough to avoid sluggish local play");
assert.ok(
  NET_CONTROLLER_RENDER_DELAY_MS < NET_SPECTATOR_RENDER_DELAY_MS,
  "spectator interpolation can stay buffered more than the active controller"
);

const nowMs = performance.now();
const game = {
  player: { x: 64, y: 64, size: 22 },
  networkPerf: {
    lastCorrectionPx: 120,
    recentCorrections: [{ atMs: nowMs - 260, errorPx: 120, kind: "hardSnap" }]
  }
};
const knownTile = () => true;
assert.equal(hasRecentCorrectionPressure(game, nowMs), false, "stale corrections must not keep local prediction disabled");
assert.equal(canRunPredictedCollision(game, knownTile), true, "active controller prediction should resume after correction cooldown");
game.networkPerf.recentCorrections.push({ atMs: performance.now(), errorPx: 80, kind: "hardSnap" });
assert.equal(canRunPredictedCollision(game, knownTile), false, "fresh large corrections can briefly suppress collision prediction");

console.log("Network controller responsiveness validation passed.");
