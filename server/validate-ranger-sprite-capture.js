import { createServer } from "node:http";
import { mkdirSync, promises as fs } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const ARTIFACT_DIR = join(REPO_ROOT, "artifacts", "ranger-visuals");
const CAPTURE_PATH = join(ARTIFACT_DIR, "ranger-sprite-capture.png");
const METRICS_PATH = join(ARTIFACT_DIR, "ranger-sprite-capture-metrics.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function createStaticServer() {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      if (url.pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(getHarnessHtml());
        return;
      }
      const filePath = resolve(REPO_ROOT, `.${decodeURIComponent(url.pathname)}`);
      if (!filePath.startsWith(REPO_ROOT)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      const body = await fs.readFile(filePath);
      res.writeHead(200, { "Content-Type": MIME_TYPES[extname(filePath)] || "application/octet-stream" });
      res.end(body);
    } catch (error) {
      res.writeHead(error?.code === "ENOENT" ? 404 : 500);
      res.end(String(error?.message || error));
    }
  });
}

function getHarnessHtml() {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Ranger Sprite Capture</title>
    <style>
      body { margin: 0; background: #05080d; }
      canvas { display: block; image-rendering: pixelated; }
    </style>
  </head>
  <body>
    <canvas id="capture" width="960" height="672"></canvas>
    <script type="module">
      import { drawArcherFrame } from "/src/rendering/rangerSpriteSheet.js";
      import { getRangerVisualSpec } from "/src/rendering/rangerVisualPresentation.js";
      import { RendererRuntimeBase } from "/src/rendering/RendererRuntimeBase.js";

      const CONFIG = {
        hud: { sidebarWidth: 0, topHudHeight: 0 },
        player: { spriteFrame: 128, spriteRenderSize: 64, spriteDirections: 8, spriteFramesPerDir: 6, baseFireCooldown: 0.6 }
      };
      const builds = [
        { id: "default", label: "Default", keys: [], runtime: { weaponMode: "ranged" } },
        { id: "ranger-stormcaller", label: "Ranger Storm", keys: ["longbow", "precision", "rangerPath", "shadowVeil", "venomCoating", "stormcaller"], runtime: { weaponMode: "ranged" } },
        { id: "rogue-living-shadow", label: "Rogue Shadow", keys: ["throwingKnives", "ambush", "roguePath", "smokeBomb", "quarry", "livingShadow"], runtime: { weaponMode: "ranged", shadowVeilTimer: 0.5 } },
        { id: "assassin-death-chain", label: "Assassin Chain", keys: ["twinDaggers", "bleed", "assassinPath", "relentless", "comboSurge", "deathChain"], runtime: { weaponMode: "melee", combo: 10 } },
        { id: "beast-apex", label: "Beast Apex", keys: ["rapierPistol", "predator", "skirmisher", "beastMasterPath", "forager", "predatorsFeast", "apexPredator"], runtime: { weaponMode: "ranged", combo: 16 } }
      ];

      function makeSource(keys, runtime) {
        return {
          classType: "archer",
          rangerRuntime: runtime,
          skills: Object.fromEntries(keys.map((key) => [key, { points: 1 }]))
        };
      }

      function drawSprite(ctx, spec, dir, frameIndex, cx, cy) {
        const frame = CONFIG.player.spriteFrame;
        const renderSize = CONFIG.player.spriteRenderSize;
        const sprite = document.createElement("canvas");
        sprite.width = frame;
        sprite.height = frame;
        const sctx = sprite.getContext("2d");
        sctx.imageSmoothingEnabled = false;
        drawArcherFrame(sctx, CONFIG, 0, 0, (dir / 8) * Math.PI * 2, frameIndex, spec);
        ctx.drawImage(sprite, cx - renderSize / 2, cy - renderSize / 2, renderSize, renderSize);
      }

      function rowHash(ctx, x, y, w, h) {
        const data = ctx.getImageData(x, y, w, h).data;
        let hash = 2166136261;
        let nonBackground = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a > 0 && (Math.abs(r - 5) > 5 || Math.abs(g - 8) > 5 || Math.abs(b - 13) > 5)) nonBackground++;
          hash ^= r; hash = Math.imul(hash, 16777619);
          hash ^= g; hash = Math.imul(hash, 16777619);
          hash ^= b; hash = Math.imul(hash, 16777619);
          hash ^= a; hash = Math.imul(hash, 16777619);
        }
        return { hash: (hash >>> 0).toString(16).padStart(8, "0"), nonBackground };
      }

      function drawCapture() {
        const canvas = document.getElementById("capture");
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#05080d";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const runtime = new RendererRuntimeBase(canvas, ctx, CONFIG);
        const rowHeight = 120;
        const metrics = [];

        ctx.font = "12px monospace";
        ctx.textBaseline = "top";
        ctx.fillStyle = "#d6e4ff";
        ctx.fillText("idle east / walk east / idle south / idle diagonal / firing ranged / firing melee", 18, 12);

        builds.forEach((build, index) => {
          const y = 64 + index * rowHeight;
          const source = makeSource(build.keys, build.runtime);
          const spec = getRangerVisualSpec(source);
          const meleeSpec = getRangerVisualSpec({ ...source, rangerRuntime: { ...build.runtime, weaponMode: "melee" } });
          const rowTop = y - 46;

          ctx.fillStyle = index % 2 === 0 ? "#0b111b" : "#0e1520";
          ctx.fillRect(0, rowTop, canvas.width, rowHeight - 8);
          ctx.fillStyle = "#d6e4ff";
          ctx.fillText(build.label, 18, rowTop + 8);

          drawSprite(ctx, spec, 0, 0, 170, y);
          drawSprite(ctx, spec, 0, 1, 290, y);
          drawSprite(ctx, spec, 2, 0, 410, y);
          drawSprite(ctx, spec, 1, 0, 530, y);

          const isThrowingKnives = spec.weapon === "throwingKnives";
          const rangedPlayer = { dirX: 1, dirY: 0, facing: 0, fireCooldown: isThrowingKnives ? 0.24 : 0 };
          drawSprite(ctx, spec, 0, 0, 660, y);
          runtime.drawPlayerAimingRig(rangedPlayer, 660, y, 0.25, isThrowingKnives ? 0.8 : 0.65, spec);

          drawSprite(ctx, meleeSpec, 1, 1, 800, y);
          runtime.drawPlayerAimingRig({ dirX: Math.SQRT1_2, dirY: Math.SQRT1_2, facing: 1 }, 800, y, 0.65, 0.35, meleeSpec);

          metrics.push({ id: build.id, ...rowHash(ctx, 0, rowTop, canvas.width, rowHeight - 8) });
        });
        window.__RANGER_CAPTURE_METRICS__ = metrics;
      }

      drawCapture();
      window.__RANGER_CAPTURE_READY__ = true;
    </script>
  </body>
</html>`;
}

async function listen(server) {
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  assert(address && typeof address === "object", "capture server did not expose an address");
  return `http://127.0.0.1:${address.port}/`;
}

async function run() {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const server = createStaticServer();
  const url = await listen(server);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 960, height: 672 }, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__RANGER_CAPTURE_READY__ === true);
    const metrics = await page.evaluate(() => window.__RANGER_CAPTURE_METRICS__);
    assert(Array.isArray(metrics) && metrics.length === 5, `expected five ranger capture rows, got ${metrics?.length}`);
    for (const metric of metrics) {
      assert(metric.nonBackground > 1400, `${metric.id} capture row appears blank: ${metric.nonBackground}`);
    }
    const defaultHash = metrics[0].hash;
    for (const metric of metrics.slice(1)) {
      assert(metric.hash !== defaultHash, `${metric.id} capture should differ from default row`);
    }
    await page.locator("#capture").screenshot({ path: CAPTURE_PATH });
    await fs.writeFile(METRICS_PATH, `${JSON.stringify({ schema: "ranger-sprite-capture/v1", metrics }, null, 2)}\n`);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolveClose) => server.close(resolveClose));
  }
}

await run();
console.log("Ranger sprite capture validation passed.");
