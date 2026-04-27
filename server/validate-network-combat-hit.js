import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import { capturePageFailure, choosePythonCommand, ensurePortAvailable, startChild, stopChildren, waitForHttpReady, waitForTcpReady } from "./validation/networkValidationShared.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactsDir = resolve(projectRoot, "artifacts", "network");
const HTTP_PORT = 8185;
const WS_PORT = 8195;
const ROOM_ID = "validate-network-combat-hit";
const GAME_URL = `http://127.0.0.1:${HTTP_PORT}`;

const children = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function captureFailure(page, error, state = null, samples = null) {
  return capturePageFailure(
    page,
    {
      dir: artifactsDir,
      screenshotPath: resolve(artifactsDir, "validate-network-combat-hit-failure.png"),
      statePath: resolve(artifactsDir, "validate-network-combat-hit-failure.json")
    },
    error,
    state,
    samples
  );
}

async function readDebugSnapshot(page) {
  return page.evaluate(() => {
    const bridge = window.__WOTC_DEBUG__;
    const state = bridge?.getState?.() || null;
    const byId = (id) => document.getElementById(id);
    return {
      state,
      diagnostics: {
        hasDebugBridge: !!bridge,
        hasGetState: typeof bridge?.getState === "function",
        readyState: document.readyState,
        canvasPresent: !!byId("game"),
        networkSetupHidden: byId("network-setup-screen")?.hidden ?? null,
        networkLobbyHidden: byId("network-lobby-screen")?.hidden ?? null
      }
    };
  });
}

async function waitForDebugState(page, samples = null, phase = "debug", timeoutMs = 900) {
  const startedAt = performance.now();
  let latestDiagnostics = null;
  let nullReads = 0;
  while (performance.now() - startedAt < timeoutMs) {
    const snapshot = await readDebugSnapshot(page).catch((error) => ({
      state: null,
      diagnostics: { evaluateError: error instanceof Error ? error.message : String(error) }
    }));
    if (snapshot.state) {
      if (nullReads > 0 && Array.isArray(samples)) {
        samples.push({ phase: "debugRecovered", context: phase, nullReads, elapsedMs: performance.now() - startedAt, diagnostics: snapshot.diagnostics });
      }
      return snapshot.state;
    }
    latestDiagnostics = snapshot.diagnostics;
    nullReads += 1;
    await delay(60);
  }
  if (Array.isArray(samples)) {
    samples.push({ phase: "debugUnavailable", context: phase, nullReads, elapsedMs: performance.now() - startedAt, diagnostics: latestDiagnostics });
  }
  if (latestDiagnostics?.networkLobbyHidden === false) {
    throw new Error(`network game returned to lobby while reading debug state during ${phase}`);
  }
  return null;
}

function chooseTarget(state) {
  const hostiles = Array.isArray(state?.hostiles) ? state.hostiles : [];
  const targetable = hostiles.filter((enemy) => enemy && Number.isFinite(enemy.distToPlayer));
  if (targetable.length === 0) return null;
  const onScreen = targetable.filter(
    (enemy) =>
      Number.isFinite(enemy.screenX) &&
      Number.isFinite(enemy.screenY) &&
      enemy.screenX >= 24 &&
      enemy.screenX <= 616 &&
      enemy.screenY >= 24 &&
      enemy.screenY <= 456
  );
  const preferred = onScreen.length > 0 ? onScreen : targetable;
  const saferTarget = preferred
    .filter((enemy) => enemy.type !== "armor" && enemy.distToPlayer <= 320)
    .sort((a, b) => a.distToPlayer - b.distToPlayer)[0];
  if (saferTarget) return saferTarget;
  return preferred.sort((a, b) => a.distToPlayer - b.distToPlayer)[0];
}

function captureEnemyHp(state) {
  const byId = new Map();
  for (const enemy of Array.isArray(state?.hostiles) ? state.hostiles : []) {
    if (!enemy || enemy.id == null || !Number.isFinite(enemy.hp)) continue;
    byId.set(enemy.id, enemy.hp);
  }
  return byId;
}

function getFloatingTextSignature(state) {
  return JSON.stringify(
    Array.isArray(state?.combat?.recentFloatingTexts)
      ? state.combat.recentFloatingTexts.map((entry) => ({
          text: entry?.text || "",
          x: Math.round((entry?.x || 0) * 10) / 10,
          y: Math.round((entry?.y || 0) * 10) / 10
        }))
      : []
  );
}

async function tapMovement(page, dx, dy, durationMs = 90) {
  const keys = [];
  if (dx >= 10) keys.push("d");
  else if (dx <= -10) keys.push("a");
  if (dy >= 10) keys.push("s");
  else if (dy <= -10) keys.push("w");
  if (keys.length === 0) return;
  for (const key of keys) await page.keyboard.down(key);
  await delay(durationMs);
  for (const key of keys.reverse()) await page.keyboard.up(key);
}

async function waitForNetworkWarmup(page, timeoutMs = 7000) {
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    const state = await waitForDebugState(page, null, "networkWarmup", 700);
    const ackReady = (state?.net?.lastAckSeq || 0) >= 8;
    const snapshotReady = (state?.networkPerf?.appliedSnapshotCount || 0) >= 12;
    if (state?.networkReady && ackReady && snapshotReady) return state;
    await delay(80);
  }
  return waitForDebugState(page, null, "networkWarmupFinal", 1200);
}

async function waitForNetworkSettle(page, timeoutMs = 2200) {
  const startedAt = performance.now();
  let last = null;
  while (performance.now() - startedAt < timeoutMs) {
    last = await waitForDebugState(page, null, "networkSettle", 700);
    const pendingInputs = last?.net?.pendingInputs || 0;
    const snapshotBuffer = last?.net?.snapshotBuffer || 0;
    const pendingSnapshot = !!last?.net?.pendingSnapshot;
    if (pendingInputs <= 6 && snapshotBuffer <= 6 && !pendingSnapshot) return last;
    await delay(60);
  }
  return last || waitForDebugState(page, null, "networkSettleFinal", 1200);
}

async function moveWithinAttackRange(page, samples, maxSteps = 24, desiredRange = 220, minRange = 110) {
  let latestState = null;
  let target = null;
  const roamPattern = [
    { dx: 1, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: 0, dy: -1 }
  ];
  for (let step = 0; step < maxSteps; step++) {
    latestState = await waitForDebugState(page, samples, "approach", 1400);
    target = chooseTarget(latestState);
    assert(latestState, "debug state unavailable while approaching");
    if (!target) {
      const roam = roamPattern[step % roamPattern.length];
      samples.push({
        phase: "seek",
        step,
        targetId: null,
        targetType: null,
        distToPlayer: null,
        playerX: latestState.player?.x || 0,
        playerY: latestState.player?.y || 0
      });
      await tapMovement(page, roam.dx * 32, roam.dy * 32, 120);
      await delay(70);
      continue;
    }
    samples.push({
      phase: "approach",
      step,
      targetId: target.id,
      targetType: target.type,
      distToPlayer: target.distToPlayer
    });
    if (target.distToPlayer >= minRange && target.distToPlayer <= desiredRange) {
      return { state: latestState, target };
    }
    if (target.distToPlayer < minRange) {
      await tapMovement(page, latestState.player.x - target.x, latestState.player.y - target.y, 95);
      await delay(65);
      continue;
    }
    await tapMovement(page, target.x - latestState.player.x, target.y - latestState.player.y, 95);
    await delay(65);
  }
  latestState = await waitForDebugState(page, samples, "approachFinal", 1400);
  target = chooseTarget(latestState);
  assert(latestState && target, "no hostile target available after approach loop");
  return { state: latestState, target };
}

async function waitForTargetInReliableRange(page, samples, desiredRange = 220, minRange = 110, maxCycles = 4) {
  let latestState = null;
  let target = null;
  for (let cycle = 0; cycle < maxCycles; cycle++) {
    const result = await moveWithinAttackRange(page, samples, 24, desiredRange, minRange);
    latestState = result.state;
    target = result.target;
    if (
      target &&
      Number.isFinite(target.distToPlayer) &&
      target.distToPlayer >= minRange &&
      target.distToPlayer <= desiredRange
    ) {
      return { state: latestState, target };
    }
    samples.push({
      phase: "reposition",
      cycle,
      targetId: target?.id || null,
      targetType: target?.type || null,
      distToPlayer: target?.distToPlayer ?? null
    });
    await delay(120);
  }
  return { state: latestState, target };
}

async function waitForAttackEmission(page, baseline, timeoutMs = 450) {
  const startedAt = performance.now();
  const baselineOwnedProjectileCount = Array.isArray(baseline?.combat?.ownedProjectiles)
    ? baseline.combat.ownedProjectiles.filter((entry) => entry?.source === "authoritative").length
    : 0;
  while (performance.now() - startedAt < timeoutMs) {
    const state = await waitForDebugState(page, null, "attackEmission", 500);
    if (!state) {
      await delay(40);
      continue;
    }
    const meleeAdvanced = (state.combat?.meleeSwingCount || 0) > (baseline.combat?.meleeSwingCount || 0);
    const bulletsAdvanced = (state.combat?.bulletCount || 0) > (baseline.combat?.bulletCount || 0);
    const fireArrowsAdvanced = (state.combat?.fireArrowCount || 0) > (baseline.combat?.fireArrowCount || 0);
    const authoritativeProjectileAdvanced =
      (Array.isArray(state.combat?.ownedProjectiles)
        ? state.combat.ownedProjectiles.filter((entry) => entry?.source === "authoritative").length
        : 0) > baselineOwnedProjectileCount;
    const shotsAdvanced =
      (Array.isArray(state.combat?.recentPlayerShots) ? state.combat.recentPlayerShots.length : 0) >
      (Array.isArray(baseline.combat?.recentPlayerShots) ? baseline.combat.recentPlayerShots.length : 0);
    if (meleeAdvanced || bulletsAdvanced || fireArrowsAdvanced || authoritativeProjectileAdvanced || shotsAdvanced) {
      return {
        state,
        attackLatencyMs: performance.now() - startedAt,
        emitted: {
          meleeAdvanced,
          bulletsAdvanced,
          fireArrowsAdvanced,
          authoritativeProjectileAdvanced,
          shotsAdvanced
        }
      };
    }
    await delay(40);
  }
  return null;
}

async function waitForHitConfirmation(page, baselineState, timeoutMs = 1500) {
  const baselineHp = captureEnemyHp(baselineState);
  const baselineTextSignature = getFloatingTextSignature(baselineState);
  const baselineFloatingCount = baselineState?.combat?.floatingTextCount || 0;
  const startedAt = performance.now();
  let hpResult = null;
  let textResult = null;
  let latestState = baselineState;

  while (performance.now() - startedAt < timeoutMs) {
    latestState = await waitForDebugState(page, null, "hitConfirmation", 500);
    if (!latestState) {
      await delay(40);
      continue;
    }
    if (!hpResult) {
      for (const enemy of Array.isArray(latestState.hostiles) ? latestState.hostiles : []) {
        if (!enemy || enemy.id == null || !Number.isFinite(enemy.hp)) continue;
        const beforeHp = baselineHp.get(enemy.id);
        if (!Number.isFinite(beforeHp) || enemy.hp >= beforeHp) continue;
        hpResult = {
          atMs: performance.now(),
          enemyId: enemy.id,
          enemyType: enemy.type,
          beforeHp,
          afterHp: enemy.hp,
          damage: beforeHp - enemy.hp
        };
        break;
      }
    }
    if (!textResult) {
      const recentTexts = Array.isArray(latestState.combat?.recentFloatingTexts) ? latestState.combat.recentFloatingTexts : [];
      const signatureChanged = getFloatingTextSignature(latestState) !== baselineTextSignature;
      const countChanged = (latestState.combat?.floatingTextCount || 0) !== baselineFloatingCount;
      const damageText = recentTexts.find((entry) => typeof entry?.text === "string" && entry.text.startsWith("-"));
      if ((signatureChanged || countChanged) && damageText) {
        textResult = {
          atMs: performance.now(),
          text: damageText.text,
          x: damageText.x,
          y: damageText.y
        };
      }
    }
    if (hpResult && textResult) break;
    await delay(40);
  }

  return {
    latestState,
    hpResult,
    textResult,
    hpLatencyMs: hpResult ? hpResult.atMs - startedAt : null,
    textLatencyMs: textResult ? textResult.atMs - startedAt : null
  };
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const attempts = [];
  let lastState = null;
  try {
    await page.goto(GAME_URL, { waitUntil: "networkidle" });
    await page.keyboard.press("Space");
    await page.locator("#mode-select").waitFor({ state: "visible", timeout: 10000 });
    await page.locator("#menu-network").click();
    await page.locator("#network-setup-screen").waitFor({ state: "visible", timeout: 10000 });
    await page.locator("#net-server-url").fill(`ws://127.0.0.1:${WS_PORT}`);
    await page.locator("#net-room-id").fill(ROOM_ID);
    await page.locator("#net-player-name-setup").fill("CombatHitValidator");
    await page.locator("#network-setup-next").click();
    await page.locator("#network-lobby-screen").waitFor({ state: "visible", timeout: 10000 });
    await page.locator('[data-lobby-class-option="warrior"]').click();
    await page.locator("#network-lobby-toggle-ready").click();

    await page.waitForFunction(() => {
      const state = window.__WOTC_DEBUG__?.getState?.();
      return !!state && state.networkReady === true && state.networkRole === "Active" && state.player.classType === "fighter";
    }, { timeout: 15000 });
    lastState = await waitForNetworkWarmup(page, 8000);

    const canvas = page.locator("#game");
    const box = await canvas.boundingBox();
    assert(box, "game canvas bounding box unavailable");

    let successAttempt = null;
    for (let attemptIndex = 0; attemptIndex < 8; attemptIndex++) {
      const desiredRange = 80;
      const minRange = 0;
      const { state: approachState, target } = await waitForTargetInReliableRange(page, attempts, desiredRange, minRange, 3);
      lastState = approachState;
      assert(target, "no hostile target available for attack");
      const settledState = await waitForNetworkSettle(page, 2400);
      lastState = settledState || approachState;
      const settledTarget = chooseTarget(settledState) || target;
      const baselineState = settledState || (await waitForDebugState(page, attempts, "beforeAttack", 1400));
      lastState = baselineState;
      assert(baselineState, "debug state unavailable before attack");
      if (
        !Number.isFinite(settledTarget?.distToPlayer) ||
        settledTarget.distToPlayer > 130
      ) {
        attempts.push({
          phase: "skipAttack",
          attemptIndex,
          targetId: settledTarget?.id || null,
          targetType: settledTarget?.type || null,
          targetDist: settledTarget?.distToPlayer ?? null,
          reason: "targetOutOfReliableRangeOrPinned"
        });
        continue;
      }
      let shotBaseline = baselineState;
      for (let shotIndex = 0; shotIndex < 3; shotIndex++) {
        let freshState = null;
        for (let readyTry = 0; readyTry < 12; readyTry++) {
          freshState = await waitForDebugState(page, attempts, "freshAttackTarget", 1200);
          if ((freshState?.player?.fireCooldown || 0) <= 0.03) break;
          await delay(80);
        }
        const freshTarget = chooseTarget(freshState) || settledTarget;
        lastState = freshState || shotBaseline;
        const attackScreenX = box.x + freshTarget.screenX;
        const attackScreenY = box.y + freshTarget.screenY;
        const clickStartedAt = performance.now();
        await page.mouse.move(attackScreenX, attackScreenY);
        await page.mouse.click(attackScreenX, attackScreenY, { button: "left" });

        const emission = await waitForAttackEmission(page, shotBaseline, 850);
        const confirmation = await waitForHitConfirmation(page, shotBaseline, emission ? 1200 : 350);
        lastState = confirmation.latestState || emission?.state || shotBaseline;
        const attemptRecord = {
          phase: "attack",
          attemptIndex,
          shotIndex,
          targetId: freshTarget.id,
          targetType: freshTarget.type,
          targetDist: freshTarget.distToPlayer,
          pendingInputsBeforeAttack: shotBaseline?.net?.pendingInputs || 0,
          snapshotBufferBeforeAttack: shotBaseline?.net?.snapshotBuffer || 0,
          clickStartedAt,
          attackLatencyMs: emission?.attackLatencyMs ?? null,
          emitted: emission?.emitted || null,
          hpLatencyMs: confirmation.hpLatencyMs,
          textLatencyMs: confirmation.textLatencyMs,
          hpResult: confirmation.hpResult,
          textResult: confirmation.textResult
        };
        attempts.push(attemptRecord);
        if (confirmation.hpResult && (confirmation.textResult || emission)) {
          successAttempt = attemptRecord;
          break;
        }
        shotBaseline = lastState || shotBaseline;
        await delay(120);
      }
      if (successAttempt) break;
      await delay(180);
    }

    assert(successAttempt, "network combat hit confirmation never produced hp-drop feedback after attack emission");
    assert(successAttempt.attackLatencyMs != null, "attack emission never appeared in client combat state");
    assert(
      successAttempt.hpResult && successAttempt.hpResult.damage >= 1,
      `enemy HP did not drop enough: ${JSON.stringify(successAttempt.hpResult)}`
    );
    assert(
      successAttempt.hpLatencyMs != null && successAttempt.hpLatencyMs <= 1100,
      `enemy HP confirmation latency ${Number(successAttempt.hpLatencyMs).toFixed(1)}ms exceeded threshold`
    );
    if (successAttempt.textLatencyMs != null) {
      assert(
        successAttempt.textLatencyMs <= 1350,
        `floating-text confirmation latency ${Number(successAttempt.textLatencyMs).toFixed(1)}ms exceeded threshold`
      );
    }

    mkdirSync(artifactsDir, { recursive: true });
    const successPath = resolve(artifactsDir, "validate-network-combat-hit-success.json");
    writeFileSync(successPath, JSON.stringify({ attempts, lastState, successAttempt }, null, 2));
    console.log(JSON.stringify({
      attempts,
      successAttempt,
      successPath
    }, null, 2));
  } catch (error) {
    const state = await readDebugSnapshot(page).then((snapshot) => snapshot.state).catch(() => lastState);
    const artifacts = await captureFailure(page, error, state, attempts);
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
