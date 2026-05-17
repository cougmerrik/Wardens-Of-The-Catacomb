import { mkdirSync, writeFileSync } from "node:fs";
import process from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import {
  capturePageFailure,
  choosePythonCommand,
  ensurePortAvailable,
  getDebugState,
  startChild,
  stopChildren,
  waitForHttpReady,
  waitForTcpReady
} from "./validation/networkValidationShared.js";
import { runBots } from "./bots/run-player-bots.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactsDir = resolve(projectRoot, "artifacts", "network");
const HTTP_PORT = Number.parseInt(process.env.HTTP_PORT || "8212", 10);
const WS_PORT = Number.parseInt(process.env.WS_PORT || "8213", 10);
const ROOM_ID = "validate-network-rubberband-soak";
const GAME_URL = `http://127.0.0.1:${HTTP_PORT}`;
const BOT_COUNT = 5;
const BOT_DURATION_SECONDS = 18;
const children = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function percentile(values, pct) {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.ceil((pct / 100) * sorted.length) - 1));
  return sorted[idx];
}

function summarizeSampleGroups(groups) {
  const frameGaps = [];
  const movementSteps = [];
  const pendingInputs = [];
  const flightEvents = new Map();
  let travelled = 0;
  let firstMovementAtMs = null;
  const samples = [];
  for (const group of groups) {
    const list = Array.isArray(group) ? group : [];
    samples.push(...list);
    const start = list[0] || null;
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const next = list[i];
      frameGaps.push(next.t - prev.t);
      const dist = Math.hypot(next.x - prev.x, next.y - prev.y);
      movementSteps.push(dist);
      travelled += dist;
      if (firstMovementAtMs === null && start && Math.hypot(next.x - start.x, next.y - start.y) >= 1.5) firstMovementAtMs = next.t;
    }
    for (const sample of list) {
      if (Number.isFinite(sample.pendingInputs)) pendingInputs.push(sample.pendingInputs);
      for (const event of sample.flightEvents || []) {
        if (event?.id != null) flightEvents.set(event.id, event);
      }
    }
  }
  const events = Array.from(flightEvents.values());
  const postLoadEvents = events.filter((event) => event.controller && event.postLoadActive === true);
  return {
    frames: samples.length,
    travelled,
    firstMovementAtMs,
    frameGapP95: percentile(frameGaps, 95),
    frameGapMax: Math.max(0, ...frameGaps),
    movementStepP95: percentile(movementSteps, 95),
    movementStepMax: Math.max(0, ...movementSteps),
    pendingInputMax: Math.max(0, ...pendingInputs),
    snapshotCountMax: Math.max(0, ...samples.map((sample) => sample.snapshotCount || 0)),
    correctionMax: Math.max(0, ...samples.map((sample) => sample.maxCorrectionPx || 0)),
    postLoadCorrectionMax: Math.max(0, ...samples.map((sample) => sample.postLoadMaxCorrectionPx || 0)),
    postLoadHardSnapMax: Math.max(0, ...samples.map((sample) => sample.postLoadHardSnapCount || 0)),
    blockedSnapMax: Math.max(0, ...samples.map((sample) => sample.blockedSnapCount || 0)),
    flightEventCount: events.length,
    postLoadFlightEventCount: postLoadEvents.length,
    flightHardSnapCount: postLoadEvents.filter((event) => event.correctionKind === "hardSnap" || event.correctionKind === "blockedHardSnap").length,
    flightCorrectionP95: percentile(postLoadEvents.map((event) => event.correctionPx || 0), 95),
    flightAppliedP95: percentile(postLoadEvents.map((event) => event.appliedPx || 0), 95),
    flightPendingMax: Math.max(0, ...postLoadEvents.map((event) => event.pendingInputs || 0)),
    lastEvents: events.slice(-12)
  };
}

function summarizeSamples(samples) {
  return summarizeSampleGroups([samples]);
}

async function openLobby(page, { wsUrl, roomId, playerName, classType }) {
  await page.goto(GAME_URL, { waitUntil: "networkidle" });
  await page.keyboard.press("Space");
  await page.locator("#mode-select").waitFor({ state: "visible", timeout: 10000 });
  await page.locator("#menu-network").click();
  await page.locator("#network-setup-screen").waitFor({ state: "visible", timeout: 10000 });
  await page.locator("#net-server-url").fill(wsUrl);
  await page.locator("#net-room-id").fill(roomId);
  await page.locator("#net-player-name-setup").fill(playerName);
  await page.locator("#network-setup-next").click();
  await page.locator("#network-lobby-screen").waitFor({ state: "visible", timeout: 10000 });
  await page.locator(`[data-lobby-class-option="${classType}"]`).click();
}

async function waitForActive(page, timeoutMs = 30000) {
  await page.waitForFunction(() => {
    const state = window.__WOTC_DEBUG__?.getState?.();
    return !!state && state.networkReady === true && state.networkRole === "Active";
  }, { timeout: timeoutMs });
  return getDebugState(page);
}

async function waitForRoster(page, expectedCount, timeoutMs = 15000) {
  await page.waitForFunction((count) => {
    const items = Array.from(document.querySelectorAll("#network-lobby-roster .network-lobby-roster-entry"));
    return items.length >= count;
  }, expectedCount, { timeout: timeoutMs });
}

async function samplePlayerFrames(page, durationMs) {
  return page.evaluate((duration) => new Promise((resolve) => {
    const samples = [];
    const startedAt = performance.now();
    const tick = () => {
      const state = window.__WOTC_DEBUG__?.getState?.();
      if (state?.player) {
        samples.push({
          t: performance.now() - startedAt,
          x: state.player.x,
          y: state.player.y,
          snapshotCount: state.networkPerf?.appliedSnapshotCount || 0,
          pendingInputs: state.net?.pendingInputs || 0,
          maxCorrectionPx: state.networkPerf?.maxCorrectionPx || 0,
          postLoadMaxCorrectionPx: state.networkPerf?.postLoadMaxCorrectionPx || 0,
          postLoadHardSnapCount: state.networkPerf?.postLoadHardSnapCount || 0,
          blockedSnapCount: state.networkPerf?.blockedSnapCount || 0,
          flightEvents: Array.isArray(state.networkPerf?.recentFlightEvents) ? state.networkPerf.recentFlightEvents.slice(-24) : []
        });
      }
      if (performance.now() - startedAt >= duration) resolve(samples);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), durationMs);
}

async function sampleBestMovement(page, durationMs, minTravelPx) {
  const attempts = [];
  for (const key of ["d", "s", "a", "w"]) {
    await page.keyboard.down(key);
    let frames = [];
    try {
      frames = await samplePlayerFrames(page, durationMs);
    } finally {
      await page.keyboard.up(key);
    }
    const summary = summarizeSamples(frames);
    attempts.push({ key, summary, frames: frames.slice(0, 16) });
    if (summary.travelled >= minTravelPx) return { key, frames, summary, attempts };
    await delay(160);
  }
  const best = attempts.sort((a, b) => b.summary.travelled - a.summary.travelled)[0] || { key: "", frames: [], summary: summarizeSamples([]) };
  return { ...best, attempts };
}

async function captureFailure(page, error, details = null) {
  const state = await getDebugState(page).catch(() => null);
  return capturePageFailure(
    page,
    {
      dir: artifactsDir,
      screenshotPath: resolve(artifactsDir, "validate-network-rubberband-soak-failure.png"),
      statePath: resolve(artifactsDir, "validate-network-rubberband-soak-failure.json")
    },
    error,
    state,
    details
  );
}

async function main() {
  await ensurePortAvailable(HTTP_PORT, "HTTP");
  await ensurePortAvailable(WS_PORT, "WS");
  const python = choosePythonCommand();
  startChild(children, projectRoot, "http", python.cmd, [...python.args, String(HTTP_PORT)]);
  startChild(children, projectRoot, "ws", process.execPath, ["server/networkServer.js"], {
    PORT: String(WS_PORT),
    SNAPSHOT_RATE: "20",
    TICK_RATE: "60"
  });
  await waitForHttpReady(GAME_URL);
  await waitForTcpReady(WS_PORT);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const wsUrl = `ws://127.0.0.1:${WS_PORT}`;
  let botResult = null;
  const details = {};

  try {
    await openLobby(page, {
      wsUrl,
      roomId: ROOM_ID,
      playerName: "SoakController",
      classType: "archer"
    });
    const botRun = runBots({
      url: wsUrl,
      room: ROOM_ID,
      bots: BOT_COUNT,
      duration: BOT_DURATION_SECONDS,
      seed: "validate-network-rubberband-soak",
      namePrefix: "SoakBot",
      staggerMs: 80,
      logLevel: "silent"
    });
    await waitForRoster(page, BOT_COUNT + 1);
    await page.locator("#network-lobby-toggle-ready").click();
    await waitForActive(page);
    await delay(900);

    const first = await sampleBestMovement(page, 1700, 90);
    const second = await sampleBestMovement(page, 1700, 90);
    const flightDump = await page.evaluate(() => window.__WOTC_DEBUG__?.run?.("dumpNetworkFlightRecorder") || null);
    botResult = await botRun;

    details.firstMovement = { key: first.key, summary: first.summary, attempts: first.attempts };
    details.secondMovement = { key: second.key, summary: second.summary, attempts: second.attempts };
    details.flightDump = flightDump;
    details.botTotals = botResult.totals;

    const combined = summarizeSampleGroups([first.frames, second.frames]);
    assert(botResult.totals.joined === BOT_COUNT, `expected ${BOT_COUNT} bots joined, got ${botResult.totals.joined}`);
    assert(botResult.totals.started === BOT_COUNT, `expected ${BOT_COUNT} bots started, got ${botResult.totals.started}`);
    assert(botResult.totals.errors === 0, `bot/server protocol errors: ${botResult.totals.errors}`);
    assert(combined.frames >= 20, `not enough client frame samples: ${combined.frames}`);
    assert(combined.travelled >= 160, `controller travelled too little during soak: ${combined.travelled.toFixed(1)}px`);
    assert(combined.snapshotCountMax >= 18, `too few snapshots applied during soak: ${combined.snapshotCountMax}`);
    assert(combined.flightEventCount >= 18, `too few flight-recorder events: ${combined.flightEventCount}`);
    assert(combined.flightPendingMax <= 36, `pending input backlog too high: ${combined.flightPendingMax}`);
    assert(combined.pendingInputMax <= 42, `sampled pending input backlog too high: ${combined.pendingInputMax}`);
    assert(combined.postLoadHardSnapMax === 0, `post-load hard snaps exceeded budget: ${combined.postLoadHardSnapMax}`);
    assert(combined.blockedSnapMax === 0, `blocked correction snaps exceeded budget: ${combined.blockedSnapMax}`);
    assert(combined.flightHardSnapCount === 0, `flight recorder captured post-load hard snaps: ${combined.flightHardSnapCount}`);
    assert(combined.flightCorrectionP95 <= 42, `flight correction p95 ${combined.flightCorrectionP95.toFixed(1)}px is too high`);
    assert(combined.flightAppliedP95 <= 12, `applied correction p95 ${combined.flightAppliedP95.toFixed(1)}px is too high`);
    assert(combined.movementStepP95 <= 18, `movement step p95 ${combined.movementStepP95.toFixed(1)}px is too high`);
    assert(combined.movementStepMax <= 44, `movement max step ${combined.movementStepMax.toFixed(1)}px is too high`);

    mkdirSync(artifactsDir, { recursive: true });
    const successPath = resolve(artifactsDir, "validate-network-rubberband-soak-success.json");
    writeFileSync(successPath, JSON.stringify({ combined, details, botResult }, null, 2));
    console.log(JSON.stringify({ combined, botTotals: botResult.totals, successPath }, null, 2));
  } catch (error) {
    const artifacts = await captureFailure(page, error, details);
    throw new Error(`${error instanceof Error ? error.message : String(error)}\nArtifacts: ${artifacts.screenshotPath}, ${artifacts.statePath}`);
  } finally {
    await browser.close();
    stopChildren(children);
  }
}

main().catch((error) => {
  stopChildren(children);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
