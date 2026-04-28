import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import net from "node:net";
import process from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactsDir = resolve(projectRoot, "artifacts", "lighting");
const HTTP_PORT = 8197;
const GAME_URL = `http://127.0.0.1:${HTTP_PORT}/?dev=1`;
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

function startChild(name, cmd, args) {
  const child = spawn(cmd, args, {
    cwd: projectRoot,
    env: process.env,
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

async function getDebugState(page) {
  return page.evaluate(() => window.__WOTC_DEBUG__?.getState?.() || null);
}

async function runDebug(page, command, payload = {}) {
  return page.evaluate(
    ({ name, data }) => window.__WOTC_DEBUG__?.run?.(name, data) || null,
    { name: command, data: payload }
  );
}

async function readCanvasSamples(page, points) {
  return page.evaluate((samplePoints) => {
    const canvas = document.getElementById("game");
    const ctx = canvas?.getContext?.("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return { ok: false, width: 0, height: 0, samples: [] };
    const samples = samplePoints.map((point) => {
      const x = Math.max(0, Math.min(canvas.width - 1, Math.round(point.x)));
      const y = Math.max(0, Math.min(canvas.height - 1, Math.round(point.y)));
      const [r, g, b, a] = Array.from(ctx.getImageData(x, y, 1, 1).data);
      return { label: point.label, x, y, r, g, b, a, luma: r * 0.2126 + g * 0.7152 + b * 0.0722 };
    });
    return { ok: true, width: canvas.width, height: canvas.height, samples };
  }, points);
}

async function readLightingDebug(page) {
  return page.evaluate(() => window.__WOTC_LIGHTING_DEBUG__ || null);
}

async function captureFailure(page, error, state) {
  mkdirSync(artifactsDir, { recursive: true });
  const screenshotPath = resolve(artifactsDir, "validate-lighting-browser-failure.png");
  const statePath = resolve(artifactsDir, "validate-lighting-browser-failure.json");
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

async function main() {
  await ensurePortAvailable(HTTP_PORT, "HTTP");
  const python = choosePythonCommand();
  startChild("http", python.cmd, [...python.args, String(HTTP_PORT)]);
  await waitForHttpReady(`http://127.0.0.1:${HTTP_PORT}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  try {
    await page.goto(GAME_URL, { waitUntil: "networkidle" });
    await page.keyboard.press("Space");
    await page.locator("#mode-select").waitFor({ state: "visible", timeout: 10000 });
    await page.locator("#menu-single").click();
    await page.locator("#character-select").waitFor({ state: "visible", timeout: 10000 });
    await page.locator("#character-select #net-player-name").fill("LightingBrowserTest");
    await page.locator('#character-select [data-class-option="archer"]').click();
    await page.locator("#start-game").click();

    await page.waitForFunction(() => {
      const state = window.__WOTC_DEBUG__?.getState?.();
      return !!state && state.walkable === true && (state.lighting?.torchCount || 0) > 0;
    }, null, { timeout: 15000 });
    await page.waitForTimeout(350);

    const litState = await getDebugState(page);
    const lightingDebug = await readLightingDebug(page);
    assert(litState?.lighting?.enabled === true, "lighting should be enabled in browser state");
    assert((litState?.lighting?.litTorchCount || 0) > 0, "expected at least one lit torch");
    assert((litState?.lighting?.activeLightSourceCount || 0) > 0, "expected active browser light sources");
    assert((lightingDebug?.drawCount || 0) > 0, "lighting overlay should render at least once");
    assert((lightingDebug?.sourceCount || 0) > 0, "lighting overlay should render active sources");
    assert((lightingDebug?.ambientAlpha || 0) > 0 && (lightingDebug?.maxAlpha || 0) > lightingDebug.ambientAlpha, "lighting overlay debug alpha values are invalid");
    assert(Number.isFinite(litState?.lighting?.lanternFuel), "browser debug state should expose lantern fuel");
    assert(Number.isFinite(litState?.lighting?.playerLightRadius), "browser debug state should expose player light radius");

    const targetTorch = litState.lighting.firstTorch;
    assert(targetTorch, "expected a torch to validate lit/unlit state");
    const playerScreen = {
      x: (litState.player?.x || 0) - (litState.camera?.x || 0),
      y: (litState.player?.y || 0) - (litState.camera?.y || 0)
    };

    const litSamples = await readCanvasSamples(page, [
      { label: "playerLight", x: playerScreen.x, y: playerScreen.y },
      { label: "dark", x: 32, y: 590 },
      { label: "hud", x: 900, y: 40 }
    ]);
    assert(litSamples.ok === true, "canvas pixel read failed");
    assert(litSamples.samples.some((sample) => sample.a > 0), "canvas should not be blank");
    assert(litSamples.samples.find((sample) => sample.label === "dark")?.luma > 1, "darkness overlay should leave faint visibility");
    assert(litSamples.samples.find((sample) => sample.label === "hud")?.luma > 8, "HUD/sidebar should remain readable");

    const unlitResult = await runDebug(page, "setFirstTorchLit", { id: targetTorch.id, lit: false });
    assert(unlitResult?.ok === true, `failed to toggle torch unlit: ${JSON.stringify(unlitResult)}`);
    await page.waitForFunction(
      ({ id }) => {
        const torches = window.__WOTC_DEBUG__?.getState?.()?.lighting?.torches || [];
        const firstTorch = window.__WOTC_DEBUG__?.getState?.()?.lighting?.firstTorch;
        return torches.some((torch) => torch.id === id && torch.lit === false) || firstTorch?.id === id && firstTorch?.lit === false;
      },
      { id: targetTorch.id },
      { timeout: 3000 }
    );
    await page.waitForTimeout(250);
    const unlitState = await getDebugState(page);
    assert((unlitState?.lighting?.unlitTorchCount || 0) > 0, "expected debug state to expose an unlit torch");
    assert(errors.length === 0, `console/page errors: ${errors.join(" | ")}`);

    mkdirSync(artifactsDir, { recursive: true });
    const successPath = resolve(artifactsDir, "validate-lighting-browser-success.json");
    writeFileSync(
      successPath,
      JSON.stringify(
        {
          lighting: unlitState.lighting,
          lightingDebug,
          samples: litSamples.samples,
          successPath
        },
        null,
        2
      )
    );
    console.log(JSON.stringify({ successPath, samples: litSamples.samples, lightingDebug, lighting: unlitState.lighting }, null, 2));
  } catch (error) {
    const state = await getDebugState(page).catch(() => null);
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
