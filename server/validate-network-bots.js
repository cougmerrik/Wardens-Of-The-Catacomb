import { mkdirSync, writeFileSync } from "node:fs";
import process from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensurePortAvailable, startChild, stopChildren, waitForTcpReady } from "./validation/networkValidationShared.js";
import { runBots } from "./bots/run-player-bots.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactsDir = resolve(projectRoot, "artifacts", "network");
const WS_PORT = 8199;
const ROOM_ID = "validate-network-bots";
const BOT_COUNT = 3;
const RUN_SECONDS = 14;

const children = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  await ensurePortAvailable(WS_PORT, "WS");
  startChild(children, projectRoot, "ws", process.execPath, ["server/networkServer.js"], { PORT: String(WS_PORT) });
  await waitForTcpReady(WS_PORT);

  const result = await runBots({
    url: `ws://127.0.0.1:${WS_PORT}`,
    room: ROOM_ID,
    bots: BOT_COUNT,
    duration: RUN_SECONDS,
    namePrefix: "ValidatorBot",
    seed: "validate-network-bots",
    staggerMs: 120,
    logLevel: "silent"
  });

  mkdirSync(artifactsDir, { recursive: true });
  const successPath = resolve(artifactsDir, "validate-network-bots-success.json");
  writeFileSync(successPath, JSON.stringify(result, null, 2));

  assert(result.totals.joined === BOT_COUNT, `expected ${BOT_COUNT} joined bots, got ${result.totals.joined}`);
  assert(result.totals.readied === BOT_COUNT, `expected ${BOT_COUNT} readied bots, got ${result.totals.readied}`);
  assert(result.totals.started === BOT_COUNT, `expected ${BOT_COUNT} started bots, got ${result.totals.started}`);
  assert(result.totals.snapshots >= BOT_COUNT, "expected each bot to receive snapshots");
  assert(result.totals.inputsSent >= BOT_COUNT * 20, `expected active input traffic, got ${result.totals.inputsSent} inputs`);
  assert(result.totals.primaryInputsSent > 0, "expected at least one attack-oriented input");
  assert(result.totals.errors === 0, `expected no bot/server protocol errors, got ${result.totals.errors}`);

  console.log(JSON.stringify({ ...result.totals, successPath }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    stopChildren(children);
  });
