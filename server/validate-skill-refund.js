import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import net from "node:net";
import process from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactsDir = resolve(projectRoot, "artifacts", "gameplay");
const HTTP_PORT = 8198;
const GAME_URL = `http://127.0.0.1:${HTTP_PORT}`;

const children = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hasCommand(cmd, args = ["--version"]) {
  const res = spawnSync(cmd, args, { stdio: "ignore" });
  return res.status === 0;
}

function choosePythonCommand() {
  if (hasCommand("python3")) return { cmd: "python3", args: ["-m", "http.server"] };
  if (hasCommand("python")) return { cmd: "python", args: ["-m", "http.server"] };
  if (hasCommand("py", ["-3", "--version"])) return { cmd: "py", args: ["-3", "-m", "http.server"] };
  throw new Error("Python not found. Install Python or add it to PATH.");
}

function startChild(name, cmd, args, extraEnv = {}) {
  const child = spawn(cmd, args, {
    cwd: projectRoot,
    env: { ...process.env, ...extraEnv },
    stdio: "pipe",
    shell: false
  });
  child.stdout.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  children.push(child);
  return child;
}

function stopChildren() {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
}

function ensurePortAvailable(port, label) {
  return new Promise((resolvePromise, rejectPromise) => {
    const server = net.createServer();
    server.unref();
    server.on("error", (err) => {
      if (err?.code === "EADDRINUSE") {
        rejectPromise(new Error(`${label} port ${port} is already in use.`));
        return;
      }
      rejectPromise(err);
    });
    server.listen(port, "127.0.0.1", () => {
      server.close((closeErr) => {
        if (closeErr) rejectPromise(closeErr);
        else resolvePromise();
      });
    });
  });
}

async function waitForHttpReady(url, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await delay(200);
  }
  throw new Error(`Timed out waiting for HTTP server at ${url}`);
}

function rectCenter(rect) {
  return {
    x: rect.x + rect.w / 2,
    y: rect.y + rect.h / 2
  };
}

async function clickCanvasRect(page, rect) {
  const canvasBox = await page.locator("#game").boundingBox();
  assert(canvasBox, "game canvas bounding box unavailable");
  const canvasMetrics = await page.evaluate(() => {
    const canvas = document.getElementById("game");
    if (!(canvas instanceof HTMLCanvasElement)) return null;
    return {
      width: canvas.width,
      height: canvas.height
    };
  });
  assert(canvasMetrics?.width > 0 && canvasMetrics?.height > 0, "game canvas metrics unavailable");
  const point = rectCenter(rect);
  const scaleX = canvasBox.width / canvasMetrics.width;
  const scaleY = canvasBox.height / canvasMetrics.height;
  await page.mouse.click(canvasBox.x + point.x * scaleX, canvasBox.y + point.y * scaleY);
}

async function getDebugState(page) {
  return page.evaluate(() => window.__WOTC_DEBUG__?.getState?.() || null);
}

function findSkillTreeNode(state, key) {
  const nodes = Array.isArray(state?.ui?.skillTreeNodes) ? state.ui.skillTreeNodes : [];
  return nodes.find((node) => node?.key === key)?.rect || null;
}

async function runDebug(page, action, payload = {}) {
  return page.evaluate(
    ({ command, data }) => window.__WOTC_DEBUG__?.run?.(command, data) || null,
    { command: action, data: payload }
  );
}

async function captureFailure(page, error, state) {
  mkdirSync(artifactsDir, { recursive: true });
  const screenshotPath = resolve(artifactsDir, "validate-skill-refund-failure.png");
  const statePath = resolve(artifactsDir, "validate-skill-refund-failure.json");
  try {
    await page.screenshot({ path: screenshotPath, fullPage: true });
  } catch {}
  writeFileSync(
    statePath,
    JSON.stringify(
      {
        error: error instanceof Error ? error.message : String(error),
        state
      },
      null,
      2
    )
  );
  return { screenshotPath, statePath };
}

async function runRefundScenario(page, { classKey, spendKey, expectedClassType }) {
  await page.goto(GAME_URL, { waitUntil: "networkidle" });
  await page.keyboard.press("Space");
  await page.locator("#mode-select").waitFor({ state: "visible", timeout: 10000 });
  await page.locator("#menu-single").click();
  await page.locator("#character-select").waitFor({ state: "visible", timeout: 10000 });
  await page.locator("#character-select #net-player-name").fill(`RefundSolo-${classKey}`);
  await page.locator(`#character-select [data-class-option="${classKey}"]`).click();
  await page.locator("#start-game").click();

  await page.waitForFunction((classType) => {
    const state = window.__WOTC_DEBUG__?.getState?.();
    return !!state && state.networkReady === false && state.player?.classType === classType && !!state.ui?.skillTreeButton;
  }, expectedClassType, { timeout: 15000 });

  await runDebug(page, "grantSkillPoints", { amount: 2 });
  await runDebug(page, "grantGold", { amount: 400 });
  await runDebug(page, "grantLevels", { amount: 1 });
  const requiredLevel = 2;
  await page.waitForFunction((level) => {
    const state = window.__WOTC_DEBUG__?.getState?.();
    return !!state && state.ui?.skillPoints >= 2 && state.ui?.gold >= 400 && (state.player?.level || 1) >= level;
  }, requiredLevel, { timeout: 5000 });

  let state = await getDebugState(page);
  await clickCanvasRect(page, state.ui.skillTreeButton);
  await page.waitForFunction((key) => {
    const state = window.__WOTC_DEBUG__?.getState?.();
    return !!state &&
      state.ui?.skillTreeOpen === true &&
      !!state.ui?.refundButton &&
      Array.isArray(state.ui?.skillTreeNodes) &&
      state.ui.skillTreeNodes.some((node) => node?.key === key);
  }, spendKey, { timeout: 5000 });

  state = await getDebugState(page);
  const spendNode = findSkillTreeNode(state, spendKey);
  assert(spendNode, `${spendKey} node not available in ${classKey} skill tree`);
  await clickCanvasRect(page, spendNode);
  await page.waitForFunction((key) => {
    const state = window.__WOTC_DEBUG__?.getState?.();
    return !!state && state.ui?.talentLevels?.[key] === 1 && state.ui?.spentSkillPoints === 1;
  }, spendKey, { timeout: 5000 });

  state = await getDebugState(page);
  const spentBeforeRefund = state.ui.spentSkillPoints;
  const skillPointsBeforeRefund = state.ui.skillPoints;
  const goldBeforeRefund = state.ui.gold;
  const refundCost = state.ui.refundCost;

  assert(spentBeforeRefund === 1, `expected one spent point before refund for ${classKey}, got ${spentBeforeRefund}`);
  assert(refundCost > 0, `expected positive refund cost for ${classKey}, got ${refundCost}`);

  await clickCanvasRect(page, state.ui.refundButton);
  await page.waitForFunction((key) => {
    const state = window.__WOTC_DEBUG__?.getState?.();
    return !!state &&
      state.ui?.refundCount === 1 &&
      state.ui?.spentSkillPoints === 0 &&
      state.ui?.talentLevels?.[key] === 0;
  }, spendKey, { timeout: 5000 });

  const finalState = await getDebugState(page);
  assert(finalState.ui.skillPoints === skillPointsBeforeRefund + spentBeforeRefund, `refund did not restore skill points for ${classKey}: ${JSON.stringify(finalState.ui)}`);
  assert(finalState.ui.gold === goldBeforeRefund - refundCost, `refund gold mismatch for ${classKey}: before=${goldBeforeRefund}, cost=${refundCost}, after=${finalState.ui.gold}`);
  assert(finalState.ui.refundCount === 1, `refund count did not increment for ${classKey}: ${finalState.ui.refundCount}`);

  return {
    classKey,
    spendKey,
    refundCost,
    goldAfterRefund: finalState.ui.gold,
    skillPointsAfterRefund: finalState.ui.skillPoints,
    refundCount: finalState.ui.refundCount
  };
}

async function main() {
  await ensurePortAvailable(HTTP_PORT, "HTTP");
  const python = choosePythonCommand();
  startChild("http", python.cmd, [...python.args, String(HTTP_PORT)]);
  await waitForHttpReady(GAME_URL);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  let lastState = null;
  const scenarios = [
    { classKey: "archer", expectedClassType: "archer", spendKey: "longbow" },
    { classKey: "warrior", expectedClassType: "fighter", spendKey: "broadswing" },
    { classKey: "necromancer", expectedClassType: "necromancer", spendKey: "fireBoltCantrip" }
  ];
  const results = [];
  try {
    for (const scenario of scenarios) {
      results.push(await runRefundScenario(page, scenario));
      lastState = await getDebugState(page);
    }

    mkdirSync(artifactsDir, { recursive: true });
    const successPath = resolve(artifactsDir, "validate-skill-refund-success.json");
    writeFileSync(
      successPath,
      JSON.stringify(
        {
          results,
          finalUi: lastState.ui
        },
        null,
        2
      )
    );
    console.log(JSON.stringify({
      results,
      successPath
    }, null, 2));
  } catch (error) {
    const state = await getDebugState(page).catch(() => lastState);
    const artifacts = await captureFailure(page, error, state);
    throw new Error(`${error instanceof Error ? error.message : String(error)}\nArtifacts: ${artifacts.screenshotPath}, ${artifacts.statePath}`);
  } finally {
    await browser.close();
    stopChildren();
  }
}

main().catch((error) => {
  stopChildren();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
