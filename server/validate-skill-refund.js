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

async function waitForDebugState(page, predicate, timeoutMs, message) {
  const startedAt = Date.now();
  let state = null;
  while (Date.now() - startedAt < timeoutMs) {
    state = await getDebugState(page).catch(() => null);
    if (predicate(state)) return state;
    await delay(100);
  }
  throw new Error(`${message}: ${JSON.stringify(state?.ui || state || null)}`);
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
  await page.goto(`${GAME_URL}/?refundScenario=${encodeURIComponent(classKey)}`, { waitUntil: "networkidle" });
  await page.keyboard.press("Space");
  await page.locator("#mode-select").waitFor({ state: "visible", timeout: 10000 });
  await page.locator("#menu-single").click();
  await page.locator("#character-select").waitFor({ state: "visible", timeout: 10000 });
  await page.locator("#character-select #net-player-name").fill(`RefundSolo-${classKey}`);
  await page.locator(`#character-select [data-class-option="${classKey}"]`).click();
  await page.locator("#start-game").click();

  await waitForDebugState(
    page,
    (state) => !!state && state.networkReady === false && state.player?.classType === expectedClassType,
    15000,
    `timed out waiting for ${classKey} game start`
  );

  await runDebug(page, "grantSkillPoints", { amount: 2 });
  await runDebug(page, "grantGold", { amount: 400 });
  await runDebug(page, "grantLevels", { amount: 1 });
  const requiredLevel = 2;
  await waitForDebugState(
    page,
    (state) => !!state && state.ui?.skillPoints >= 2 && state.ui?.gold >= 400 && (state.player?.level || 1) >= requiredLevel,
    5000,
    `timed out waiting for ${classKey} debug progress`
  );

  const spendResult = await runDebug(page, "spendSkill", { key: spendKey });
  assert(spendResult?.ok === true, `failed to spend ${spendKey} for ${classKey}: ${JSON.stringify(spendResult)}`);
  const spentBeforeRefund = spendResult.spentSkillPoints;
  const skillPointsBeforeRefund = spendResult.skillPoints;
  const goldBeforeRefund = spendResult.gold;
  const refundCost = spendResult.refundCost;

  assert(spendResult.talentPoints === 1, `expected ${spendKey} to have one point for ${classKey}, got ${spendResult.talentPoints}`);
  assert(spentBeforeRefund === 1, `expected one spent point before refund for ${classKey}, got ${spentBeforeRefund}`);
  assert(refundCost > 0, `expected positive refund cost for ${classKey}, got ${refundCost}`);

  const refundResult = await runDebug(page, "refundAllSkills");
  assert(refundResult?.ok === true, `failed to refund skills for ${classKey}: ${JSON.stringify(refundResult)}`);

  assert(refundResult.spentSkillPoints === 0, `refund did not clear spent points for ${classKey}: ${JSON.stringify(refundResult)}`);
  assert(refundResult.skillPoints === skillPointsBeforeRefund + spentBeforeRefund, `refund did not restore skill points for ${classKey}: ${JSON.stringify(refundResult)}`);
  assert(refundResult.gold === goldBeforeRefund - refundCost, `refund gold mismatch for ${classKey}: before=${goldBeforeRefund}, cost=${refundCost}, after=${refundResult.gold}`);
  assert(refundResult.refundCount === 1, `refund count did not increment for ${classKey}: ${refundResult.refundCount}`);

  return {
    classKey,
    spendKey,
    refundCost,
    goldAfterRefund: refundResult.gold,
    skillPointsAfterRefund: refundResult.skillPoints,
    refundCount: refundResult.refundCount
  };
}

async function main() {
  await ensurePortAvailable(HTTP_PORT, "HTTP");
  const python = choosePythonCommand();
  startChild("http", python.cmd, [...python.args, String(HTTP_PORT)]);
  await waitForHttpReady(GAME_URL);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  let page = null;
  let lastState = null;
  const scenarios = [
    { classKey: "archer", expectedClassType: "archer", spendKey: "longbow" },
    { classKey: "warrior", expectedClassType: "fighter", spendKey: "broadswing" },
    { classKey: "necromancer", expectedClassType: "necromancer", spendKey: "fireBoltCantrip" }
  ];
  const results = [];
  try {
    for (const scenario of scenarios) {
      page = await context.newPage();
      results.push(await runRefundScenario(page, scenario));
      lastState = await getDebugState(page);
      await page.close();
      page = null;
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
    const state = page ? await getDebugState(page).catch(() => lastState) : lastState;
    const artifacts = page ? await captureFailure(page, error, state) : { screenshotPath: "", statePath: "" };
    throw new Error(`${error instanceof Error ? error.message : String(error)}\nArtifacts: ${artifacts.screenshotPath}, ${artifacts.statePath}`);
  } finally {
    if (page) await page.close().catch(() => {});
    await browser.close();
    stopChildren();
  }
}

main().catch((error) => {
  stopChildren();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
