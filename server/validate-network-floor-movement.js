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
const HTTP_PORT = Number.parseInt(process.env.HTTP_PORT || "8194", 10);
const WS_PORT = Number.parseInt(process.env.WS_PORT || "8204", 10);
const ROOM_ID = "validate-network-floor-movement";
const GAME_URL = `http://127.0.0.1:${HTTP_PORT}/?dev=1`;
const CLASS_TYPES = ["archer", "warrior", "necromancer"];
const children = [];
function assert(condition, message) { if (!condition) throw new Error(message); }
async function captureFailure(page, error, details = null) {
  const state = await getDebugState(page).catch(() => null);
  return capturePageFailure(
    page,
    {
      dir: artifactsDir,
      screenshotPath: resolve(artifactsDir, "validate-network-floor-movement-failure.png"),
      statePath: resolve(artifactsDir, "validate-network-floor-movement-failure.json")
    },
    error,
    state,
    details
  );
}
async function openSinglePlayerNetworkLobby(page, wsUrl, classType, roomId) {
  await page.goto(GAME_URL, { waitUntil: "networkidle" });
  await page.keyboard.press("Space");
  await page.locator("#mode-select").waitFor({ state: "visible", timeout: 10000 });
  await page.locator("#menu-network").click();
  await page.locator("#network-setup-screen").waitFor({ state: "visible", timeout: 10000 });
  await page.locator("#net-server-url").fill(wsUrl);
  await page.locator("#net-room-id").fill(roomId);
  await page.locator("#net-player-name-setup").fill(`Floor${classType.slice(0, 4)}`);
  await page.locator("#network-setup-next").click();
  await page.locator("#network-lobby-screen").waitFor({ state: "visible", timeout: 10000 });
  await page.locator(`[data-lobby-class-option="${classType}"]`).click();
  await page.locator("#network-lobby-toggle-ready").click();
}
async function joinNetworkRoom(page, wsUrl, roomId, playerName) {
  await page.goto(GAME_URL, { waitUntil: "networkidle" });
  await page.keyboard.press("Space");
  await page.locator("#mode-select").waitFor({ state: "visible", timeout: 10000 });
  await page.locator("#menu-network").click();
  await page.locator("#network-setup-screen").waitFor({ state: "visible", timeout: 10000 });
  await page.locator("#net-server-url").fill(wsUrl);
  await page.locator("#net-room-id").fill(roomId);
  await page.locator("#net-player-name-setup").fill(playerName);
  await page.locator("#network-setup-next").click();
}
async function waitForFloorLoaded(page) {
  await page.waitForFunction(() => {
    const state = window.__WOTC_DEBUG__?.getState?.();
    const canvas = document.getElementById("game");
    const rect = canvas?.getBoundingClientRect?.();
    const canvasVisible = !!canvas && !canvas.hidden && rect && rect.width > 0 && rect.height > 0;
    return !!state &&
      canvasVisible &&
      state.networkReady === true &&
      state.networkRole === "Active" &&
      state.floor === 1 &&
      state.walkable === true &&
      state.gameOver !== true &&
      state.ui?.paused !== true &&
      state.player?.health > 0;
  }, { timeout: 30000 });
  await delay(250);
  return getDebugState(page);
}
async function assertNetworkStatsPanel(page, label) {
  try {
    await page.waitForFunction(() => {
      const hud = window.__WOTC_DEBUG__?.getState?.()?.debugHud;
      return !!hud?.enabled &&
        Number.isFinite(hud.fps) &&
        hud.fps > 0 &&
        Number.isFinite(hud.network?.pingMs) &&
        Number.isFinite(hud.network?.latencyMs) &&
        Number.isFinite(hud.uiRect?.x) &&
        Number.isFinite(hud.uiRect?.y) &&
        hud.uiRect.w > 0 &&
        hud.uiRect.h > 0;
    }, undefined, { timeout: 3500 });
    await page.waitForFunction(() => {
      const el = document.getElementById("net-debug-stats");
      if (!el || el.hidden) return false;
      const rect = el.getBoundingClientRect();
      const text = el.textContent || "";
      return rect.width > 0 &&
        rect.height > 0 &&
        text.includes("NETWORK STATS") &&
        text.includes("Ping") &&
        text.includes("Latency") &&
        text.includes("FPS");
    }, undefined, { timeout: 3500 });
  } catch (error) {
    const state = await getDebugState(page).catch(() => null);
    throw new Error(`${label} network stats UI unavailable: ${JSON.stringify(state?.debugHud || null)} ${error instanceof Error ? error.message : String(error)}`);
  }
  const hud = await getDebugState(page).then((state) => state?.debugHud || null);
  const sample = await page.evaluate((rect) => {
    const canvas = document.getElementById("game");
    const ctx = canvas?.getContext?.("2d");
    if (!canvas || !ctx || !rect) return null;
    const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(rect.x + 4)));
    const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(rect.y + 4)));
    const data = ctx.getImageData(x, y, 1, 1).data;
    return { x, y, r: data[0], g: data[1], b: data[2], a: data[3] };
  }, hud?.uiRect || null);
  assert(sample && sample.a > 0 && sample.r < 32 && sample.g < 40 && sample.b < 56, `${label} network stats UI was not visibly painted at expected rect: ${JSON.stringify({ hud, sample })}`);
  return { ...hud, sample };
}
async function getCanvasState(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById("game");
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      hidden: !!canvas.hidden,
      display: getComputedStyle(canvas).display,
      width: rect.width,
      height: rect.height
    };
  });
}
async function clickCanvasRect(page, rect) {
  const box = await page.locator("#game").boundingBox();
  assert(box, "game canvas bounding box unavailable");
  const metrics = await page.evaluate(() => { const canvas = document.getElementById("game"); return canvas instanceof HTMLCanvasElement ? { width: canvas.width, height: canvas.height } : null; });
  assert(metrics?.width > 0 && metrics?.height > 0, "game canvas metrics unavailable");
  await page.mouse.click(box.x + (rect.x + rect.w / 2) * box.width / metrics.width, box.y + (rect.y + rect.h / 2) * box.height / metrics.height);
}
async function sampleMovementAfterFloorLoad(page, key, durationMs = 900) {
  return page.evaluate(({ movementKey, duration }) => new Promise((resolve) => {
    const samples = [];
    const startedAt = performance.now();
    const capture = () => {
      const state = window.__WOTC_DEBUG__?.getState?.();
      if (state?.player) {
        samples.push({
          t: performance.now() - startedAt,
          key: movementKey,
          x: state.player.x,
          y: state.player.y,
          floor: state.floor,
          walkable: state.walkable,
          gameOver: !!state.gameOver,
          paused: !!state.ui?.paused,
          health: state.player.health,
          networkReady: state.networkReady,
          networkRole: state.networkRole,
          pendingInputs: state.net?.pendingInputs || 0,
          appliedSnapshotCount: state.networkPerf?.appliedSnapshotCount || 0
        });
      }
      if (performance.now() - startedAt >= duration) resolve(samples);
      else requestAnimationFrame(capture);
    };
    requestAnimationFrame(capture);
  }), { movementKey: key, duration: durationMs });
}
function summarizeMovement(samples) {
  const start = samples[0] || null;
  const end = samples[samples.length - 1] || null;
  let travelled = 0;
  let maxStep = 0;
  for (let i = 1; i < samples.length; i += 1) {
    const step = Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y);
    travelled += step;
    maxStep = Math.max(maxStep, step);
  }
  return {
    frames: samples.length,
    start,
    end,
    delta: start && end ? Math.hypot(end.x - start.x, end.y - start.y) : 0,
    travelled,
    maxStep
  };
}
async function samplePlayableState(page, durationMs = 2500) {
  return page.evaluate((duration) => new Promise((resolve) => {
    const samples = [];
    const startedAt = performance.now();
    const capture = () => {
      const state = window.__WOTC_DEBUG__?.getState?.();
      const canvas = document.getElementById("game");
      const rect = canvas?.getBoundingClientRect?.();
      if (state?.player) {
        samples.push({
          t: performance.now() - startedAt,
          x: state.player.x,
          y: state.player.y,
          health: state.player.health,
          lanternFuel: state.player.lanternFuel,
          hostiles: Array.isArray(state.hostiles) ? state.hostiles.length : 0,
          enemyCount: state.combat?.enemyCount || state.hostiles?.length || 0,
          gameOver: !!state.gameOver,
          paused: !!state.ui?.paused,
          networkReady: !!state.networkReady,
          canvasHidden: !!canvas?.hidden,
          canvasWidth: rect?.width || 0,
          canvasHeight: rect?.height || 0
        });
      }
      if (performance.now() - startedAt >= duration) resolve(samples);
      else setTimeout(capture, 250);
    };
    capture();
  }), durationMs);
}
function summarizePlayableState(samples) {
  const first = samples[0] || null;
  const last = samples[samples.length - 1] || null;
  return {
    frames: samples.length,
    first,
    last,
    minHealth: Math.min(...samples.map((sample) => Number.isFinite(sample.health) ? sample.health : Infinity)),
    maxHostiles: Math.max(0, ...samples.map((sample) => sample.hostiles || 0)),
    maxEnemyCount: Math.max(0, ...samples.map((sample) => sample.enemyCount || 0)),
    minLanternFuel: Math.min(...samples.map((sample) => Number.isFinite(sample.lanternFuel) ? sample.lanternFuel : Infinity)),
    maxLanternFuel: Math.max(0, ...samples.map((sample) => Number.isFinite(sample.lanternFuel) ? sample.lanternFuel : 0)),
    gameOverCount: samples.filter((sample) => sample.gameOver).length,
    hiddenCanvasCount: samples.filter((sample) => sample.canvasHidden || sample.canvasWidth <= 0 || sample.canvasHeight <= 0).length
  };
}
async function assertPauseRoundTrip(page) {
  await page.keyboard.press("Escape");
  await delay(250);
  const afterEscape = await getDebugState(page);
  assert(afterEscape?.ui?.paused === false, `Escape unexpectedly paused gameplay: ${JSON.stringify(afterEscape?.ui || null)}`);
  assert(afterEscape?.ui?.pauseButton, "pause button unavailable for pause round trip");
  await clickCanvasRect(page, afterEscape.ui.pauseButton);
  await page.waitForFunction(() => window.__WOTC_DEBUG__?.getState?.()?.ui?.paused === true, undefined, { timeout: 2000 });
  const paused = await getDebugState(page);
  assert(paused?.ui?.pauseOverlayResume, "pause overlay resume button unavailable for pause round trip");
  await clickCanvasRect(page, paused.ui.pauseOverlayResume);
  await page.waitForFunction(() => window.__WOTC_DEBUG__?.getState?.()?.ui?.paused === false, undefined, { timeout: 2000 });
  return { escapeDidNotPause: true, paused: !!paused?.ui?.paused, resumed: true, pauseOwnerId: paused?.net?.pauseOwnerId || null, localPlayerId: paused?.net?.playerId || null };
}
async function tryMovementKey(page, key) {
  const canvas = page.locator("#game");
  const box = await canvas.boundingBox();
  assert(box, "game canvas bounding box unavailable after floor load");
  const beforeCanvas = await getCanvasState(page);
  assert(beforeCanvas && !beforeCanvas.hidden && beforeCanvas.display !== "none" && beforeCanvas.width > 0 && beforeCanvas.height > 0, `game canvas was not visible after floor load: ${JSON.stringify(beforeCanvas)}`);
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.keyboard.down(key);
  try {
    const samples = await sampleMovementAfterFloorLoad(page, key);
    const afterCanvas = await getCanvasState(page);
    return { key, samples, summary: summarizeMovement(samples), beforeCanvas, afterCanvas };
  } finally {
    await page.keyboard.up(key);
  }
}
async function assertActiveRunTransfersDeadOwner(browser, wsUrl) {
  const roomId = `${ROOM_ID}-owner-transfer`;
  const ownerPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const joinerPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await joinNetworkRoom(ownerPage, wsUrl, roomId, "Owner");
    await ownerPage.locator("#network-lobby-screen").waitFor({ state: "visible", timeout: 10000 });
    await joinNetworkRoom(joinerPage, wsUrl, roomId, "Joiner");
    await joinerPage.locator("#network-lobby-screen").waitFor({ state: "visible", timeout: 10000 });
    await ownerPage.locator(`[data-lobby-class-option="archer"]`).click();
    await joinerPage.locator(`[data-lobby-class-option="archer"]`).click();
    await joinerPage.locator("#network-lobby-toggle-ready").click();
    await ownerPage.locator("#network-lobby-toggle-ready").click();
    try {
      await waitForFloorLoaded(ownerPage);
      await waitForFloorLoaded(joinerPage);
    } catch (error) {
      throw new Error(`owner transfer setup did not load both players: ${error instanceof Error ? error.message : String(error)}`);
    }
    try {
      await Promise.all([
        ownerPage.waitForFunction(() => {
          const state = window.__WOTC_DEBUG__?.getState?.();
          return !!state?.net?.playerId && state.net.pauseOwnerId === state.net.playerId;
        }, undefined, { timeout: 5000 }),
        joinerPage.waitForFunction(() => {
          const state = window.__WOTC_DEBUG__?.getState?.();
          return !!state?.net?.playerId && state.net.pauseOwnerId !== state.net.playerId;
        }, undefined, { timeout: 5000 })
      ]);
    } catch (error) {
      const ownerState = await getDebugState(ownerPage).catch(() => null);
      const joinerState = await getDebugState(joinerPage).catch(() => null);
      throw new Error(`owner transfer setup did not establish owner/joiner roles: ${JSON.stringify({
        owner: {
          playerId: ownerState?.net?.playerId,
          pauseOwnerId: ownerState?.net?.pauseOwnerId,
          gameOver: ownerState?.gameOver,
          health: ownerState?.player?.health
        },
        joiner: {
          playerId: joinerState?.net?.playerId,
          pauseOwnerId: joinerState?.net?.pauseOwnerId,
          gameOver: joinerState?.gameOver,
          health: joinerState?.player?.health
        }
      })} ${error instanceof Error ? error.message : String(error)}`);
    }
    await ownerPage.evaluate(() => window.__WOTC_DEBUG__?.run?.("setPlayerHealth", { health: 0 }));
    try {
      await ownerPage.waitForFunction(() => {
        const state = window.__WOTC_DEBUG__?.getState?.();
        return !!state && state.player?.health <= 0 && state.player?.alive === false;
      }, undefined, { timeout: 5000 });
    } catch (error) {
      const state = await getDebugState(ownerPage).catch(() => null);
      throw new Error(`owner transfer setup did not force owner death: ${JSON.stringify(state?.player || null)} ${error instanceof Error ? error.message : String(error)}`);
    }
    try {
      await joinerPage.waitForFunction(() => {
        const state = window.__WOTC_DEBUG__?.getState?.();
        return !!state &&
          state.networkReady === true &&
          state.networkRole === "Active" &&
          state.gameOver === false &&
          state.net?.playerId &&
          state.net?.pauseOwnerId === state.net.playerId &&
          state.player?.health > 0;
      }, undefined, { timeout: 10000 });
    } catch (error) {
      const state = await getDebugState(joinerPage).catch(() => null);
      throw new Error(`owner transfer did not give joiner control: ${JSON.stringify({
        gameOver: state?.gameOver,
        networkReady: state?.networkReady,
        networkRole: state?.networkRole,
        playerId: state?.net?.playerId,
        pauseOwnerId: state?.net?.pauseOwnerId,
        health: state?.player?.health,
        remotePlayers: state?.remotePlayers
      })} ${error instanceof Error ? error.message : String(error)}`);
    }
    const loaded = await getDebugState(joinerPage);
    const movementAttempts = [];
    let movement = null;
    for (const key of ["d", "s", "a", "w"]) {
      const attempt = await tryMovementKey(joinerPage, key);
      movementAttempts.push(attempt);
      if (attempt.summary.delta >= 24 && attempt.summary.travelled >= 24) {
        movement = attempt;
        break;
      }
      await delay(120);
    }
    const pauseRect = (await getDebugState(joinerPage))?.ui?.pauseButton;
    assert(pauseRect, "joiner pause button unavailable after owner transfer");
    await clickCanvasRect(joinerPage, pauseRect);
    await joinerPage.waitForFunction(() => window.__WOTC_DEBUG__?.getState?.()?.ui?.paused === true, undefined, { timeout: 3000 });
    const paused = await getDebugState(joinerPage);
    assert(movement, `joiner could not move after owner transfer: ${JSON.stringify(movementAttempts.map((attempt) => ({
      key: attempt.key,
      summary: attempt.summary
    })))}`);
    assert(paused?.ui?.paused === true, `joiner could not pause after owner transfer: ${JSON.stringify(paused?.ui?.networkUiDebug || null)}`);
    return {
      loaded: {
        playerId: loaded?.net?.playerId || null,
        pauseOwnerId: loaded?.net?.pauseOwnerId || null,
        gameOver: !!loaded?.gameOver,
        health: loaded?.player?.health || 0,
        remotePlayers: Array.isArray(loaded?.remotePlayers)
          ? loaded.remotePlayers.map((player) => ({
              id: player.id,
              health: player.health,
              alive: player.alive
            }))
          : []
      },
      movement: movement.summary,
      pause: {
        paused: !!paused?.ui?.paused,
        networkUiDebug: paused?.ui?.networkUiDebug || null
      }
    };
  } finally {
    await ownerPage.close().catch(() => {});
    await joinerPage.close().catch(() => {});
  }
}
async function main() {
  await ensurePortAvailable(HTTP_PORT, "HTTP");
  await ensurePortAvailable(WS_PORT, "WS");

  const python = choosePythonCommand();
  startChild(children, projectRoot, "http", python.cmd, [...python.args, String(HTTP_PORT)]);
  startChild(children, projectRoot, "ws", process.execPath, ["server/networkServer.js"], { PORT: String(WS_PORT) });

  await waitForHttpReady(`http://127.0.0.1:${HTTP_PORT}`);
  await waitForTcpReady(WS_PORT);

  const browser = await chromium.launch({ headless: true });
  const details = { classes: [] };
  try {
    for (const classType of CLASS_TYPES) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      const classDetails = { classType, attempts: [], consoleMessages: [] };
      details.classes.push(classDetails);
      page.on("console", (message) => {
        if (["error", "warning"].includes(message.type())) {
          classDetails.consoleMessages.push({ type: message.type(), text: message.text() });
        }
      });
      page.on("pageerror", (error) => {
        classDetails.consoleMessages.push({ type: "pageerror", text: String(error) });
      });
      try {
        await openSinglePlayerNetworkLobby(page, `ws://127.0.0.1:${WS_PORT}`, classType, `${ROOM_ID}-${classType}`);
        classDetails.loadedState = await waitForFloorLoaded(page);
        classDetails.debugHud = await assertNetworkStatsPanel(page, `${classType} floor`);
        if (classType === CLASS_TYPES[0]) {
          mkdirSync(artifactsDir, { recursive: true });
          classDetails.debugHudScreenshotPath = resolve(artifactsDir, "validate-network-floor-movement-network-stats-ui.png");
          await page.screenshot({ path: classDetails.debugHudScreenshotPath });
        }
        classDetails.pause = await assertPauseRoundTrip(page);
        assert(classDetails.pause.paused && classDetails.pause.resumed, `pause round trip failed for ${classType}: ${JSON.stringify(classDetails.pause)}`);

        let moved = false;
        for (const key of ["d", "s", "a", "w"]) {
          const attempt = await tryMovementKey(page, key);
          classDetails.attempts.push({
            key,
            beforeCanvas: attempt.beforeCanvas,
            afterCanvas: attempt.afterCanvas,
            summary: attempt.summary,
            samples: attempt.samples.slice(0, 8).concat(attempt.samples.slice(-4))
          });
          const last = attempt.samples[attempt.samples.length - 1] || null;
          assert(last?.gameOver !== true, `player entered game over while validating floor movement for ${classType}: ${JSON.stringify(attempt.summary)}`);
          assert(last?.paused !== true, `game paused while validating floor movement for ${classType}: ${JSON.stringify(attempt.summary)}`);
          assert((last?.health || 0) > 0, `player died while validating floor movement for ${classType}: ${JSON.stringify(attempt.summary)}`);
          assert(attempt.afterCanvas && !attempt.afterCanvas.hidden && attempt.afterCanvas.display !== "none", `game canvas became hidden while validating floor movement for ${classType}: ${JSON.stringify(attempt.afterCanvas)}`);
          if (attempt.summary.delta >= 24 && attempt.summary.travelled >= 24) {
            classDetails.successfulMovement = attempt.summary;
            moved = true;
            break;
          }
          await delay(120);
        }
        assert(moved, `player did not move after multiplayer floor 1 load for ${classType}: ${JSON.stringify(classDetails.attempts.map((attempt) => ({ key: attempt.key, delta: attempt.summary.delta, travelled: attempt.summary.travelled })))}`);

        const playableSamples = await samplePlayableState(page);
        const playableSummary = summarizePlayableState(playableSamples);
        classDetails.playableSummary = playableSummary;
        classDetails.playableSamples = playableSamples.slice(0, 6).concat(playableSamples.slice(-6));
        assert(playableSummary.gameOverCount === 0, `run ended during floor playability probe for ${classType}: ${JSON.stringify(playableSummary)}`);
        assert(playableSummary.hiddenCanvasCount === 0, `canvas hidden during floor playability probe for ${classType}: ${JSON.stringify(playableSummary)}`);
        assert(playableSummary.minHealth > 0, `player died during floor playability probe for ${classType}: ${JSON.stringify(playableSummary)}`);
        assert(playableSummary.maxHostiles > 0 || playableSummary.maxEnemyCount > 0, `no enemies became visible during floor playability probe for ${classType}: ${JSON.stringify(playableSummary)}`);
        assert(playableSummary.minLanternFuel < playableSummary.maxLanternFuel, `lantern fuel did not tick down during floor playability probe for ${classType}: ${JSON.stringify(playableSummary)}`);
      } catch (error) {
        const artifacts = await captureFailure(page, error, details);
        throw new Error(`${error instanceof Error ? error.message : String(error)}\nArtifacts: ${artifacts.screenshotPath}, ${artifacts.statePath}`);
      } finally {
        await page.close();
      }
    }
    details.deadOwnerTransfer = await assertActiveRunTransfersDeadOwner(browser, `ws://127.0.0.1:${WS_PORT}`);
    mkdirSync(artifactsDir, { recursive: true });
    const successPath = resolve(artifactsDir, "validate-network-floor-movement-success.json");
    writeFileSync(successPath, JSON.stringify(details, null, 2));
    console.log(JSON.stringify({
      classes: details.classes.map((entry) => ({ classType: entry.classType, movement: entry.successfulMovement, playable: entry.playableSummary })),
      deadOwnerTransfer: details.deadOwnerTransfer,
      successPath
    }, null, 2));
  } catch (error) {
    throw error;
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
