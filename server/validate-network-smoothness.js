import { mkdirSync, writeFileSync } from "node:fs";
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

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactsDir = resolve(projectRoot, "artifacts", "network");
const HTTP_PORT = 8190;
const WS_PORT = 8200;
const ROOM_ID = "validate-network-smoothness";
const GAME_URL = `http://127.0.0.1:${HTTP_PORT}`;

const children = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function percentile(values, pct) {
  const sorted = values.filter((value) => Number.isFinite(value)).slice().sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.ceil((pct / 100) * sorted.length) - 1));
  return sorted[idx];
}

function summarizeSamples(samples) {
  const frameGaps = [];
  const movementSteps = [];
  let travelled = 0;
  for (let i = 1; i < samples.length; i += 1) {
    const prev = samples[i - 1];
    const next = samples[i];
    frameGaps.push(next.t - prev.t);
    const dist = Math.hypot(next.x - prev.x, next.y - prev.y);
    movementSteps.push(dist);
    travelled += dist;
  }
  return {
    frames: samples.length,
    travelled,
    frameGapP95: percentile(frameGaps, 95),
    frameGapMax: Math.max(0, ...frameGaps),
    movementStepP95: percentile(movementSteps, 95),
    movementStepMax: Math.max(0, ...movementSteps),
    correctionMax: Math.max(0, ...samples.map((sample) => sample.maxCorrectionPx || 0)),
    hardSnapMax: Math.max(0, ...samples.map((sample) => sample.hardSnapCount || 0)),
    blockedSnapMax: Math.max(0, ...samples.map((sample) => sample.blockedSnapCount || 0))
  };
}

async function captureFailure(page, error, state = null, samples = null) {
  return capturePageFailure(
    page,
    {
      dir: artifactsDir,
      screenshotPath: resolve(artifactsDir, "validate-network-smoothness-failure.png"),
      statePath: resolve(artifactsDir, "validate-network-smoothness-failure.json")
    },
    error,
    state,
    samples
  );
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

async function setReady(page) {
  await page.locator("#network-lobby-toggle-ready").click();
}

async function waitForActive(page, timeoutMs = 25000) {
  await page.waitForFunction(() => {
    const state = window.__WOTC_DEBUG__?.getState?.();
    return !!state && state.networkReady === true && state.networkRole === "Active";
  }, { timeout: timeoutMs });
  return getDebugState(page);
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
          lastCorrectionPx: state.networkPerf?.lastCorrectionPx || 0,
          maxCorrectionPx: state.networkPerf?.maxCorrectionPx || 0,
          hardSnapCount: state.networkPerf?.hardSnapCount || 0,
          blockedSnapCount: state.networkPerf?.blockedSnapCount || 0,
          pendingInputs: state.net?.pendingInputs || 0
        });
      }
      if (performance.now() - startedAt >= duration) resolve(samples);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), durationMs);
}

async function sampleRemoteFrames(page, playerId, durationMs) {
  return page.evaluate(({ id, duration }) => new Promise((resolve) => {
    const samples = [];
    const startedAt = performance.now();
    const tick = () => {
      const state = window.__WOTC_DEBUG__?.getState?.();
      const remote = Array.isArray(state?.remotePlayers) ? state.remotePlayers.find((player) => player?.id === id) : null;
      if (remote) {
        samples.push({
          t: performance.now() - startedAt,
          x: remote.x,
          y: remote.y,
          snapshotCount: state.networkPerf?.appliedSnapshotCount || 0
        });
      }
      if (performance.now() - startedAt >= duration) resolve(samples);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { id: playerId, duration: durationMs });
}

async function sampleHeldMovement(page, key, durationMs) {
  await page.keyboard.down(key);
  try {
    return await samplePlayerFrames(page, durationMs);
  } finally {
    await page.keyboard.up(key);
  }
}

async function sampleBestControllerMovement(page, durationMs, minTravelPx) {
  const attempts = [];
  for (const key of ["d", "s", "a", "w"]) {
    const frames = await sampleHeldMovement(page, key, durationMs);
    const summary = summarizeSamples(frames);
    attempts.push({ key, frames, summary });
    if (summary.travelled >= minTravelPx) return { key, frames, summary, attempts };
    await delay(120);
  }
  return attempts.sort((a, b) => b.summary.travelled - a.summary.travelled)[0] || { key: "", frames: [], summary: summarizeSamples([]), attempts };
}

async function sampleHeldRemoteMovement(controllerPage, peerPage, playerId, key, durationMs) {
  await controllerPage.keyboard.down(key);
  try {
    return await sampleRemoteFrames(peerPage, playerId, durationMs);
  } finally {
    await controllerPage.keyboard.up(key);
  }
}

async function sampleBestRemoteMovement(controllerPage, peerPage, playerId, durationMs, minTravelPx) {
  const attempts = [];
  for (const key of ["s", "d", "a", "w"]) {
    const frames = await sampleHeldRemoteMovement(controllerPage, peerPage, playerId, key, durationMs);
    const summary = summarizeSamples(frames);
    attempts.push({ key, frames, summary });
    if (summary.travelled >= minTravelPx) return { key, frames, summary, attempts };
    await delay(160);
  }
  return attempts.sort((a, b) => b.summary.travelled - a.summary.travelled)[0] || { key: "", frames: [], summary: summarizeSamples([]), attempts };
}

async function waitForSnapshotWarmup(page, timeoutMs = 7000) {
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    const state = await getDebugState(page);
    if (state?.networkReady && (state.networkPerf?.appliedSnapshotCount || 0) >= 12) return state;
    await delay(80);
  }
  return getDebugState(page);
}

async function waitForLocalProjectile(page, seq, timeoutMs = 140) {
  const handle = await page.waitForFunction((inputSeq) => {
    const state = window.__WOTC_DEBUG__?.getState?.();
    const projectiles = Array.isArray(state?.combat?.ownedProjectiles) ? state.combat.ownedProjectiles : [];
    const projectile = projectiles.find((entry) =>
      entry &&
      entry.spawnSeq === inputSeq &&
      (entry.source === "predictedRendered" || entry.source === "authoritative")
    );
    return projectile ? { source: projectile.source, t: performance.now() } : null;
  }, seq, { timeout: timeoutMs }).catch(() => null);
  return handle ? handle.jsonValue() : null;
}

async function waitForFreshShot(page, baselineCount, startedAtMs, timeoutMs = 1200) {
  const handle = await page.waitForFunction(({ count, startedAt }) => {
    const state = window.__WOTC_DEBUG__?.getState?.();
    const shots = Array.isArray(state?.combat?.recentPlayerShots) ? state.combat.recentPlayerShots : [];
    const fresh = shots.find((shot) =>
      shot &&
      Number.isFinite(shot.atMs) &&
      shot.atMs >= startedAt &&
      (shot.source === "primary" || shot.source === "predictedPrimary")
    );
    if (fresh) return fresh;
    return shots.length > count ? shots[shots.length - 1] : null;
  }, { count: baselineCount, startedAt: startedAtMs }, { timeout: timeoutMs }).catch(() => null);
  return handle ? handle.jsonValue() : null;
}

async function main() {
  await ensurePortAvailable(HTTP_PORT, "HTTP");
  await ensurePortAvailable(WS_PORT, "WS");

  const python = choosePythonCommand();
  startChild(children, projectRoot, "http", python.cmd, [...python.args, String(HTTP_PORT)]);
  startChild(children, projectRoot, "ws", process.execPath, ["server/networkServer.js"], { PORT: String(WS_PORT) });

  await waitForHttpReady(GAME_URL);
  await waitForTcpReady(WS_PORT);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const controllerPage = await context.newPage();
  const peerPage = await context.newPage();
  const samples = {};
  let lastState = null;

  try {
    const wsUrl = `ws://127.0.0.1:${WS_PORT}`;
    await openLobby(controllerPage, {
      wsUrl,
      roomId: ROOM_ID,
      playerName: "SmoothController",
      classType: "archer"
    });
    await openLobby(peerPage, {
      wsUrl,
      roomId: ROOM_ID,
      playerName: "SmoothPeer",
      classType: "warrior"
    });
    await setReady(controllerPage);
    await setReady(peerPage);

    const controllerReady = await waitForActive(controllerPage);
    await waitForActive(peerPage);
    const controllerPlayerId = controllerReady?.net?.playerId || null;
    assert(controllerPlayerId, "controller player id unavailable");
    await waitForSnapshotWarmup(controllerPage);
    await waitForSnapshotWarmup(peerPage);

    const controllerAttempt = await sampleBestControllerMovement(controllerPage, 1400, 90);
    const controllerMovement = controllerAttempt.frames;
    const controllerSummary = controllerAttempt.summary;
    samples.controllerMovement = {
      key: controllerAttempt.key,
      summary: controllerSummary,
      attempts: controllerAttempt.attempts.map((attempt) => ({ key: attempt.key, summary: attempt.summary })),
      frames: controllerMovement.slice(0, 12)
    };

    assert(controllerSummary.frames >= 45, `controller rendered too few frames: ${controllerSummary.frames}`);
    assert(controllerSummary.travelled >= 90, `controller movement did not advance enough: ${controllerSummary.travelled.toFixed(1)}px`);
    assert(controllerSummary.frameGapP95 <= 34, `controller frame p95 ${controllerSummary.frameGapP95.toFixed(1)}ms is too high`);
    assert(controllerSummary.movementStepP95 <= 14, `controller movement step p95 ${controllerSummary.movementStepP95.toFixed(1)}px is too high`);
    assert(controllerSummary.movementStepMax <= 30, `controller movement max step ${controllerSummary.movementStepMax.toFixed(1)}px is too high`);
    assert(controllerSummary.hardSnapMax <= 1, `controller hard snaps exceeded budget: ${controllerSummary.hardSnapMax}`);
    assert(controllerSummary.blockedSnapMax === 0, `controller had blocked correction snaps: ${controllerSummary.blockedSnapMax}`);

    const remoteAttempt = await sampleBestRemoteMovement(controllerPage, peerPage, controllerPlayerId, 1600, 70);
    const remoteMovement = remoteAttempt.frames;
    const remoteSummary = remoteAttempt.summary;
    samples.remoteMovement = {
      key: remoteAttempt.key,
      summary: remoteSummary,
      attempts: remoteAttempt.attempts.map((attempt) => ({ key: attempt.key, summary: attempt.summary })),
      frames: remoteMovement.slice(0, 12)
    };

    assert(remoteSummary.frames >= 35, `peer observed too few remote frames: ${remoteSummary.frames}`);
    assert(remoteSummary.travelled >= 70, `peer did not observe enough remote movement: ${remoteSummary.travelled.toFixed(1)}px`);
    assert(remoteSummary.frameGapP95 <= 45, `peer remote frame p95 ${remoteSummary.frameGapP95.toFixed(1)}ms is too high`);
    assert(remoteSummary.movementStepP95 <= 22, `peer remote movement step p95 ${remoteSummary.movementStepP95.toFixed(1)}px is too high`);
    assert(remoteSummary.movementStepMax <= 42, `peer remote movement max step ${remoteSummary.movementStepMax.toFixed(1)}px is too high`);

    const canvas = controllerPage.locator("#game");
    const box = await canvas.boundingBox();
    assert(box, "game canvas bounding box unavailable");
    await controllerPage.mouse.move(box.x + box.width * 0.78, box.y + box.height * 0.45);
    const beforeShot = await getDebugState(controllerPage);
    const shotCount = beforeShot?.combat?.recentPlayerShots?.length || 0;
    const startedAtMs = await controllerPage.evaluate(() => performance.now());
    await controllerPage.mouse.click(box.x + box.width * 0.78, box.y + box.height * 0.45, { button: "left" });
    const shot = await waitForFreshShot(controllerPage, shotCount, startedAtMs);
    assert(shot?.seq, `fresh local shot telemetry missing: ${JSON.stringify(shot)}`);
    const localProjectile = await waitForLocalProjectile(controllerPage, shot.seq);
    assert(localProjectile, `local projectile was not visible within prediction budget for seq ${shot.seq}`);
    samples.projectile = {
      seq: shot.seq,
      source: localProjectile.source,
      latencyMs: Math.max(0, localProjectile.t - startedAtMs)
    };
    assert(samples.projectile.latencyMs <= 120, `local projectile latency ${samples.projectile.latencyMs.toFixed(1)}ms is too high`);

    lastState = await getDebugState(controllerPage);
    mkdirSync(artifactsDir, { recursive: true });
    const successPath = resolve(artifactsDir, "validate-network-smoothness-success.json");
    writeFileSync(successPath, JSON.stringify({ samples, finalState: lastState }, null, 2));
    console.log(JSON.stringify({ ...samples, successPath }, null, 2));
  } catch (error) {
    const state = await getDebugState(controllerPage).catch(() => lastState);
    const artifacts = await captureFailure(controllerPage, error, state, samples);
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
