import assert from "node:assert/strict";
import { buildSelectiveCloseoutPlan, FULL_CLOSEOUT_GATES } from "./validation/selectiveCloseoutPlan.js";

function gatesFor(files, options = {}) {
  return buildSelectiveCloseoutPlan(files, options).gates;
}

function assertHas(gates, expected) {
  for (const gate of expected) assert.ok(gates.includes(gate), `Expected gate ${gate}`);
}

assert.deepEqual(gatesFor(["docs/README.md"]), ["check", "validate:loc"]);

assertHas(gatesFor(["src/net/NetClient.js"]), ["check", "validate:loc", "validate:network-transport", "validate:network-join", "validate:network-combat-hit"]);

assertHas(gatesFor(["server/net/AuthoritativeRoom.js"]), [
  "validate:network-transport",
  "validate:network-join",
  "validate:network-combat",
  "validate:network-combat-hit",
  "validate:network-shop",
  "validate:network-two-client-damage",
  "validate:network-archer",
  "validate:network-audio",
  "validate:network-pause",
  "validate:network-ui",
  "validate:network-refund"
]);

assertHas(gatesFor(["scripts/prepare-capacitor-web.js", "src/runtime/runtimeConfig.js"]), ["validate:mobile-transport", "build:android:web"]);

assertHas(gatesFor(["docs/NETWORK_FRAMEWORK_EVALUATION.md"]), ["validate:network-framework"]);
assert.deepEqual(gatesFor(["server/validate-network-framework-evaluation.js"]), ["check", "validate:loc", "validate:network-framework"]);

assertHas(gatesFor(["server/run-validation-suite.js", "server/validation/selectiveCloseoutPlan.js"]), ["validate:selective-closeout-plan"]);

assertHas(gatesFor(["src/game/world/lighting.js"]), [
  "validate:lighting-state",
  "validate:lighting-placement",
  "validate:lighting-render",
  "validate:lighting-interaction",
  "validate:lighting-enemies",
  "validate:lighting-network",
  "validate:boss"
]);

assertHas(gatesFor(["src/rendering/hud/stats.js"]), ["validate:network-ui"]);

const broad = buildSelectiveCloseoutPlan(
  Array.from({ length: 3 }, (_, index) => `src/game/generated-${index}.js`),
  { broadChangeFileLimit: 2 }
);
assert.equal(broad.mode, "full");
assert.deepEqual(broad.gates, FULL_CLOSEOUT_GATES);

const ignoredArtifacts = buildSelectiveCloseoutPlan(["artifacts/network/result.json", "www/config.js"]);
assert.equal(ignoredArtifacts.mode, "selective");
assert.deepEqual(ignoredArtifacts.changedFiles, []);
assert.deepEqual(ignoredArtifacts.gates, ["check", "validate:loc"]);

console.log("Selective closeout planning validation passed.");
