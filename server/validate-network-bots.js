import { mkdirSync, writeFileSync } from "node:fs";
import process from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { ensurePortAvailable, startChild, stopChildren, waitForTcpReady } from "./validation/networkValidationShared.js";
import { BotClient } from "./bots/BotClient.js";
import { runBots } from "./bots/run-player-bots.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactsDir = resolve(projectRoot, "artifacts", "network");
const WS_PORT = 8199;
const ROOM_ID = "validate-network-bots";
const HOST_ROOM_ID = "validate-network-bot-host";
const BOT_COUNT = 3;
const RUN_SECONDS = 14;

const children = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForCondition(fn, label, timeoutMs = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (fn()) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function runHostModeScenario(url) {
  const host = new BotClient({
    url,
    roomId: HOST_ROOM_ID,
    name: "HostBot-1",
    classType: "archer",
    readyMode: "wait-for-human",
    botNamePrefix: "HostBot"
  });
  const guest = new BotClient({
    url,
    roomId: HOST_ROOM_ID,
    name: "ManualUser",
    classType: "fighter",
    botNamePrefix: "HostBot",
    autoReady: false
  });
  try {
    host.connect();
    await waitForCondition(() => host.metrics.joined, "host bot join");
    await delay(900);
    assert(host.metrics.readied === false, "host bot readied before a non-bot player entered");

    guest.connect();
    await waitForCondition(() => guest.metrics.joined, "guest join");
    await delay(900);
    assert(host.metrics.humanSeen === true, "host bot did not detect joined non-bot player");
    assert(host.metrics.readied === false, "host bot readied before the non-bot player was ready");
    guest.readyUp({ force: true });
    await waitForCondition(() => host.metrics.humanReadySeen && host.metrics.readied, "host bot ready after guest ready");
    await waitForCondition(() => host.metrics.started && guest.metrics.started, "host-mode room start", 12000);
    await delay(1500);

    return {
      host: { ...host.metrics },
      guest: { ...guest.metrics }
    };
  } finally {
    host.close();
    guest.close();
  }
}

async function main() {
  await ensurePortAvailable(WS_PORT, "WS");
  startChild(children, projectRoot, "ws", process.execPath, ["server/networkServer.js"], { PORT: String(WS_PORT) });
  await waitForTcpReady(WS_PORT);

  const url = `ws://127.0.0.1:${WS_PORT}`;
  const result = await runBots({
    url,
    room: ROOM_ID,
    bots: BOT_COUNT,
    duration: RUN_SECONDS,
    namePrefix: "ValidatorBot",
    seed: "validate-network-bots",
    staggerMs: 120,
    logLevel: "silent"
  });
  const hostResult = await runHostModeScenario(url);

  mkdirSync(artifactsDir, { recursive: true });
  const successPath = resolve(artifactsDir, "validate-network-bots-success.json");
  writeFileSync(successPath, JSON.stringify({ roomFill: result, hostMode: hostResult }, null, 2));

  assert(result.totals.joined === BOT_COUNT, `expected ${BOT_COUNT} joined bots, got ${result.totals.joined}`);
  assert(result.totals.readied === BOT_COUNT, `expected ${BOT_COUNT} readied bots, got ${result.totals.readied}`);
  assert(result.totals.started === BOT_COUNT, `expected ${BOT_COUNT} started bots, got ${result.totals.started}`);
  assert(result.totals.snapshots >= BOT_COUNT, "expected each bot to receive snapshots");
  assert(result.totals.inputsSent >= BOT_COUNT * 20, `expected active input traffic, got ${result.totals.inputsSent} inputs`);
  assert(result.totals.primaryInputsSent > 0, "expected at least one attack-oriented input");
  assert(result.totals.errors === 0, `expected no bot/server protocol errors, got ${result.totals.errors}`);
  assert(hostResult.host.humanSeen === true, "expected host bot to detect a non-bot player");
  assert(hostResult.host.humanReadySeen === true, "expected host bot to detect a ready non-bot player");
  assert(hostResult.host.readied === true, "expected host bot to ready after non-bot player readied");
  assert(hostResult.host.started === true && hostResult.guest.started === true, "expected host-mode room to start");
  assert(hostResult.host.inputsSent > 0, "expected host bot to send gameplay inputs after host-mode start");
  assert(hostResult.host.errors.length === 0 && hostResult.guest.errors.length === 0, "expected no host-mode bot errors");

  console.log(JSON.stringify({ ...result.totals, hostModeStarted: hostResult.host.started && hostResult.guest.started, successPath }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    stopChildren(children);
  });
