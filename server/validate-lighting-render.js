import { runtimeSceneObjectDrawMethods } from "../src/rendering/runtimeSceneObjectDrawMethods.js";
import { runtimeSceneLightingMethods } from "../src/rendering/runtimeSceneLightingMethods.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createGradient(calls) {
  return {
    addColorStop(offset, color) {
      calls.push(["addColorStop", offset, color]);
    }
  };
}

function createStubContext() {
  const calls = [];
  const ctx = {
    calls,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    globalCompositeOperation: "source-over",
    save() { calls.push(["save"]); },
    restore() { calls.push(["restore"]); },
    beginPath() { calls.push(["beginPath"]); },
    ellipse(...args) { calls.push(["ellipse", ...args]); },
    fill() { calls.push(["fill"]); },
    fillRect(...args) { calls.push(["fillRect", ...args]); },
    stroke() { calls.push(["stroke"]); },
    moveTo(...args) { calls.push(["moveTo", ...args]); },
    lineTo(...args) { calls.push(["lineTo", ...args]); },
    quadraticCurveTo(...args) { calls.push(["quadraticCurveTo", ...args]); },
    arc(...args) { calls.push(["arc", ...args]); },
    clearRect(...args) { calls.push(["clearRect", ...args]); },
    drawImage(...args) { calls.push(["drawImage", ...args]); },
    createRadialGradient(...args) {
      calls.push(["createRadialGradient", ...args]);
      return createGradient(calls);
    }
  };
  return ctx;
}

function alphaFromColor(color) {
  const match = /,\s*([0-9.]+)\)$/.exec(color);
  return match ? Number(match[1]) : NaN;
}

function drawTorch(torch) {
  const ctx = createStubContext();
  runtimeSceneObjectDrawMethods.drawTorch.call({ ctx }, {}, torch, 40, 60);
  return ctx.calls;
}

function main() {
  const litCalls = drawTorch({ type: "torch", size: 16, lit: true });
  assert(litCalls.some((call) => call[0] === "createRadialGradient"), "lit torch should draw glow gradient");
  assert(litCalls.some((call) => call[0] === "arc"), "lit torch should draw glow circle");
  assert(litCalls.some((call) => call[0] === "quadraticCurveTo"), "lit torch should draw flame curves");

  const unlitCalls = drawTorch({ type: "torch", size: 16, lit: false });
  assert(!unlitCalls.some((call) => call[0] === "createRadialGradient"), "unlit torch should not draw glow gradient");
  assert(unlitCalls.some((call) => call[0] === "stroke"), "unlit torch should draw charred wick mark");
  assert(unlitCalls.some((call) => call[0] === "fillRect"), "unlit torch should still draw torch body");

  const overlayCtx = createStubContext();
  const darknessLayerCtx = createStubContext();
  const darknessLayer = {
    width: 320,
    height: 240,
    getContext() {
      return darknessLayerCtx;
    }
  };
  runtimeSceneLightingMethods.drawLightingOverlay.call(
    { ctx: overlayCtx, canvas: { width: 320, height: 240 }, _lightingOverlayCanvas: darknessLayer },
    {
      config: {
        lighting: {
          enabled: true,
          ambientDarknessAlpha: 0.64,
          maxDarknessAlpha: 0.87,
          brightRadiusRatio: 0.24,
          dimRadiusRatio: 0.74
        }
      },
      getActiveLightSources() {
        return [{ sourceType: "player", x: 100, y: 120, radius: 80 }];
      }
    },
    10,
    20,
    { playW: 300, topHudH: 24, xpBarH: 28 }
  );
  assert(darknessLayerCtx.calls[0][0] === "save", "lighting overlay should save offscreen context");
  assert(darknessLayerCtx.calls.at(-1)[0] === "restore", "lighting overlay should restore offscreen context");
  assert(darknessLayerCtx.calls.some((call) => call[0] === "createRadialGradient"), "lighting overlay should draw radial falloff");
  const stops = darknessLayerCtx.calls.filter((call) => call[0] === "addColorStop" && Number.isFinite(call[1]));
  assert(stops.length >= 7, "lighting overlay should use enough stops for exponential falloff");
  assert(stops[0][1] === 0 && alphaFromColor(stops[0][2]) === 1, "bright center should fully reveal underlying world color");
  assert(stops.some((call) => call[1] === 0.12), "lighting overlay should include early exponential falloff stop");
  assert(stops.some((call) => call[1] === 0.24), "lighting overlay should include compact bright falloff stop");
  assert(stops.some((call) => call[1] === 0.49), "lighting overlay should include mid exponential falloff stop");
  assert(stops.some((call) => call[1] === 0.74), "lighting overlay should include gradual dim falloff stop");
  assert(stops.at(-1)[1] === 1 && alphaFromColor(stops.at(-1)[2]) === 0, "light should fade fully back to darkness at the radius edge");
  for (let i = 1; i < stops.length; i += 1) {
    assert(alphaFromColor(stops[i][2]) <= alphaFromColor(stops[i - 1][2]), "light falloff should decrease with distance");
  }
  assert(darknessLayerCtx.calls.filter((call) => call[0] === "fillRect").length === 1, "lighting overlay should draw one offscreen darkness layer before light cutouts");
  assert(darknessLayerCtx.globalCompositeOperation === "source-over", "lighting overlay should restore source-over compositing");
  assert(overlayCtx.calls.some((call) => call[0] === "drawImage"), "lighting overlay should composite offscreen darkness over the world");

  const sceneSource = readFileSync(resolve("src", "rendering", "RendererRuntimeScene.js"), "utf8");
  const overlayIndex = sceneSource.indexOf("this.drawLightingOverlay(game, cameraX, cameraY, layout);");
  const dropsIndex = sceneSource.indexOf("this.drawDrops(game, cameraX, cameraY);");
  const floatingTextIndex = sceneSource.indexOf("this.drawFloatingTexts(game, cameraX, cameraY);");
  const enemyIndex = sceneSource.indexOf("this.drawSceneEnemy(game, enemy, cameraX, cameraY);");
  assert(overlayIndex >= 0 && dropsIndex > overlayIndex, "drops should render after lighting overlay so they stay fully illuminated");
  assert(overlayIndex >= 0 && floatingTextIndex > overlayIndex, "floating text should render after lighting overlay so it stays readable");
  assert(overlayIndex >= 0 && enemyIndex > overlayIndex, "enemies should render after lighting overlay so they stay fully illuminated");
  assert(!sceneSource.slice(0, overlayIndex).includes("this.drawSceneEnemy(game, enemy, cameraX, cameraY);"), "enemies should not render before lighting overlay");

  const drawSource = readFileSync(resolve("src", "rendering", "runtimeSceneDrawMethods.js"), "utf8");
  const gaugeSource = readFileSync(resolve("src", "rendering", "hud", "lanternFuelGauge.js"), "utf8");
  assert(gaugeSource.includes("drawLanternFuelGauge"), "lantern fuel gauge renderer should exist");
  assert(drawSource.indexOf("drawConsumablesBar(this, game, layout, y)") < drawSource.indexOf("drawLanternFuelGauge(this, game, layout, y, consumableBounds)"), "lantern gauge should render to the right of the key binding section");

  console.log("Lighting render validation passed.");
}

main();
