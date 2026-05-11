import assert from "node:assert/strict";
import {
  NET_CONTROLLER_RENDER_DELAY_MS,
  NET_INPUT_INTERVAL_MS,
  NET_MIN_SEND_MS,
  NET_SPECTATOR_RENDER_DELAY_MS
} from "../src/bootstrap/networkSessionRuntime.js";

assert.equal(NET_INPUT_INTERVAL_MS, 16, "controller input should poll near 60Hz");
assert.ok(NET_MIN_SEND_MS <= NET_INPUT_INTERVAL_MS, "minimum send delay should not throttle below the input poll cadence");
assert.ok(NET_CONTROLLER_RENDER_DELAY_MS <= 12, "active controller render delay should stay low enough to avoid sluggish local play");
assert.ok(
  NET_CONTROLLER_RENDER_DELAY_MS < NET_SPECTATOR_RENDER_DELAY_MS,
  "spectator interpolation can stay buffered more than the active controller"
);

console.log("Network controller responsiveness validation passed.");
