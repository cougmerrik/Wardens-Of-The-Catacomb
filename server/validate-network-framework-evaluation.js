import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const docPath = resolve(repoRoot, "docs/NETWORK_FRAMEWORK_EVALUATION.md");
const doc = readFileSync(docPath, "utf8");

function assertIncludesAll(label, values) {
  for (const value of values) {
    assert.ok(doc.includes(value), `${label} should include "${value}"`);
  }
}

assertIncludesAll("framework evaluation", [
  "# Network Framework Evaluation",
  "Keep the custom authoritative multiplayer backend as the production path",
  "Colyseus is a viable future spike",
  "not the default migration target"
]);

assertIncludesAll("current protocol ownership", [
  "authoritative `GameSim` room execution",
  "custom snapshot, keyframe, and delta payloads",
  "map metadata and chunk streaming",
  "controller prediction and reconciliation"
]);

assertIncludesAll("Colyseus fit", [
  "room lifecycle and matchmaker APIs",
  "client SDKs for JavaScript/TypeScript, Unity/C#, Defold, Haxe, and Godot",
  "schema-based state synchronization",
  "Redis-backed presence and driver options",
  "experimental WebTransport"
]);

assertIncludesAll("incremental adoption path", [
  "Keep the current `ws` backend and browser WebSocket client as the production default.",
  "Continue moving raw socket behavior behind small transport adapters.",
  "Prototype Colyseus as a sidecar room/matchmaking shell"
]);

assertIncludesAll("migration gates", [
  "current network validators pass without reducing coverage",
  "mobile builds keep secure `wss://` production defaults",
  "no broad Android cleartext or iOS App Transport Security exception becomes required",
  "rollback to the custom WebSocket adapter remains straightforward"
]);

const overview = readFileSync(resolve(repoRoot, "docs/TECHNICAL_OVERVIEW.md"), "utf8");
assert.ok(
  overview.includes("docs/NETWORK_FRAMEWORK_EVALUATION.md") || overview.includes("NETWORK_FRAMEWORK_EVALUATION.md"),
  "technical overview should link to the framework evaluation note"
);

console.log("Network framework evaluation validation passed.");
