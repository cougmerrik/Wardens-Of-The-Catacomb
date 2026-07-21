import { runtimeSceneObjectDrawMethods } from "../src/rendering/runtimeSceneObjectDrawMethods.js";
import { runtimeSceneLightingMethods } from "../src/rendering/runtimeSceneLightingMethods.js";
import { getBrazierFrame, resetBrazierSpritePlaybackForTests } from "../src/rendering/brazierSpriteSheet.js";
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
    clip() { calls.push(["clip"]); },
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

  resetBrazierSpritePlaybackForTests();
  const stable = { id: "brazier-stable", type: "torch", variant: "brazier", lit: true };
  assert(getBrazierFrame(stable, 0) === 5, "new lit brazier should begin in the lit loop");
  stable.lit = false;
  assert(getBrazierFrame(stable, 1) === 11, "snuffed brazier should begin the extinguish sequence");
  assert(getBrazierFrame(stable, 1.625) === 16, "extinguish sequence should reach its final smoke frame");
  assert(getBrazierFrame(stable, 1.75) === 0, "extinguished brazier should settle on the unlit frame");
  stable.lit = true;
  assert(getBrazierFrame(stable, 2) === 1, "relit brazier should begin the ignition sequence");
  assert(getBrazierFrame(stable, 2.25) === 3, "ignition should advance at 100ms per frame");
  assert(getBrazierFrame(stable, 2.4) >= 5 && getBrazierFrame(stable, 2.4) <= 10, "ignition should settle into the lit loop");

  const firstGame = {};
  const nextGame = {};
  const reusedId = { id: "torch-1-0", type: "torch", variant: "brazier", lit: true };
  assert(getBrazierFrame(reusedId, 0, firstGame) === 5, "a lit brazier should begin in the lit loop for the first game");
  reusedId.lit = false;
  assert(getBrazierFrame(reusedId, 1, firstGame) === 11, "the first game should retain its extinguish playback state");
  assert(getBrazierFrame(reusedId, 1, nextGame) === 0, "a new game should not inherit playback for a reused brazier id");

  const recentlySnuffed = { id: "brazier-recently-snuffed", type: "torch", variant: "brazier", lit: false, litChangedAt: 9.75 };
  assert(getBrazierFrame(recentlySnuffed, 10) === 13, "a recently snuffed brazier first seen offscreen should resume its extinguish sequence");
  const recentlyRelit = { id: "brazier-recently-relit", type: "torch", variant: "brazier", lit: true, litChangedAt: 9.8 };
  assert(getBrazierFrame(recentlyRelit, 10) === 3, "a recently relit brazier first seen offscreen should resume its ignition sequence");
  const settledBeforeObservation = { id: "brazier-settled-before-observation", type: "torch", variant: "brazier", lit: false, litChangedAt: 8 };
  assert(getBrazierFrame(settledBeforeObservation, 10) === 0, "an old state change should be settled when the brazier is first observed");

  const offscreen = { id: "brazier-offscreen", type: "torch", variant: "brazier", lit: true, litChangedAt: 0 };
  assert(getBrazierFrame(offscreen, 0) === 5, "offscreen test brazier should begin lit");
  offscreen.lit = false;
  offscreen.litChangedAt = 1;
  assert(getBrazierFrame(offscreen, 5) === 0, "an offscreen state change should be settled when first rendered later");

  const PreviousImage = globalThis.Image;
  globalThis.Image = class {
    addEventListener(type, callback) {
      if (type === "load") callback();
    }
    set src(value) { this.currentSrc = value; }
  };
  resetBrazierSpritePlaybackForTests();
  const spriteCtx = createStubContext();
  spriteCtx.imageSmoothingEnabled = true;
  runtimeSceneObjectDrawMethods.drawTorch.call(
    { ctx: spriteCtx },
    { time: 0, config: { map: { tile: 32 } } },
    { id: "sprite-brazier", type: "torch", variant: "brazier", size: 16, lit: true },
    40,
    60
  );
  assert(spriteCtx.calls.some((call) => call[0] === "drawImage" && call[2] === 5 * 48), "loaded brazier sheet should draw the first lit sprite frame");
  assert(!spriteCtx.calls.some((call) => call[0] === "fillRect"), "loaded brazier sprite should replace the procedural torch body");

  const legacyCtx = createStubContext();
  runtimeSceneObjectDrawMethods.drawTorch.call(
    { ctx: legacyCtx },
    { time: 0, config: { map: { tile: 32 } } },
    { id: "legacy-torch", type: "torch", size: 16, lit: true },
    40,
    60
  );
  assert(!legacyCtx.calls.some((call) => call[0] === "drawImage"), "legacy torches without the brazier variant should keep procedural rendering");
  assert(legacyCtx.calls.some((call) => call[0] === "fillRect"), "legacy torches should retain their procedural body");
  globalThis.Image = PreviousImage;
  resetBrazierSpritePlaybackForTests();

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

  const darkvisionOverlayCtx = createStubContext();
  const darkvisionLayerCtx = createStubContext();
  runtimeSceneLightingMethods.drawLightingOverlay.call(
    { ctx: darkvisionOverlayCtx, canvas: { width: 320, height: 240 }, _lightingOverlayCanvas: { width: 320, height: 240, getContext: () => darkvisionLayerCtx } },
    {
      config: { map: { tile: 32 }, lighting: { enabled: true, ambientDarknessAlpha: 0.64, maxDarknessAlpha: 0.87 } },
      player: { x: 120, y: 140 },
      consumables: { effects: { darkvisionPotion: { timer: 12 } } },
      getActiveLightSources() {
        return [{ sourceType: "player", x: 120, y: 140, radius: 320 }];
      }
    },
    0,
    0,
    { playW: 300, topHudH: 24, xpBarH: 28 }
  );
  assert(darkvisionOverlayCtx.calls.some((call) => call[0] === "addColorStop" && typeof call[2] === "string" && call[2].includes("146, 84, 255")), "active darkvision should add a purple visibility tint");

  const fireOverlayCtx = createStubContext();
  const fireDarknessLayerCtx = createStubContext();
  const fireDarknessLayer = {
    width: 320,
    height: 240,
    getContext() {
      return fireDarknessLayerCtx;
    }
  };
  runtimeSceneLightingMethods.drawLightingOverlay.call(
    {
      ctx: fireOverlayCtx,
      canvas: { width: 320, height: 240 },
      _lightingOverlayCanvas: fireDarknessLayer,
      getLightSourceDecay: runtimeSceneLightingMethods.getLightSourceDecay,
      getLightSourceBrightRatio: runtimeSceneLightingMethods.getLightSourceBrightRatio,
      getLightSourceDimRatio: runtimeSceneLightingMethods.getLightSourceDimRatio
    },
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
        return [{ sourceType: "rangerFireArrow", x: 100, y: 120, radius: 120, lightDecay: 1.45, brightRadiusRatio: 0.42, dimRadiusRatio: 0.94 }];
      }
    },
    10,
    20,
    { playW: 300, topHudH: 24, xpBarH: 28 }
  );
  const fireStops = fireDarknessLayerCtx.calls.filter((call) => call[0] === "addColorStop" && Number.isFinite(call[1]));
  assert(fireStops.some((call) => call[1] === 0.42), "fire light should use its wider bright radius stop");
  assert(fireStops.some((call) => call[1] === 0.94), "fire light should use its wider dim radius stop");
  assert(alphaFromColor(fireStops.find((call) => call[1] === 0.42)?.[2]) > alphaFromColor(stops.find((call) => call[1] === 0.24)?.[2]), "fire light should preserve stronger brightness deeper into its radius");

  const lightingHost = {
    ctx: overlayCtx,
    canvas: { width: 320, height: 240 },
    getLightingCutoutAtPoint: runtimeSceneLightingMethods.getLightingCutoutAtPoint,
    getLightingDarknessAlphaAtPoint: runtimeSceneLightingMethods.getLightingDarknessAlphaAtPoint,
    getEnemyDarknessAlphaAtPoint: runtimeSceneLightingMethods.getEnemyDarknessAlphaAtPoint,
    getEnemyLightingCanvas: runtimeSceneLightingMethods.getEnemyLightingCanvas,
    getPickupLightingCanvas: runtimeSceneLightingMethods.getPickupLightingCanvas,
    drawEnemyDarkenedLayer: runtimeSceneLightingMethods.drawEnemyDarkenedLayer,
    drawPickupDarkenedLayer: runtimeSceneLightingMethods.drawPickupDarkenedLayer,
    drawSceneEnemy(_game, _enemy, _cameraX, _cameraY, options) {
      assert(options?.drawOverlays === false, "enemy layer should draw sprite pixels without overlays");
      this.ctx.fillRect(250, 110, 20, 20);
    },
    drawSceneEnemyOverlays(_game, _enemy, _cameraX, _cameraY) {
      overlayCtx.calls.push(["drawSceneEnemyOverlays"]);
    },
    drawSceneDrop(_game, _drop, _cameraX, _cameraY) {
      this.ctx.fillRect(245, 145, 10, 10);
    }
  };
  const enemyLayerCtx = createStubContext();
  const enemyLayer = {
    width: 320,
    height: 240,
    getContext() {
      return enemyLayerCtx;
    }
  };
  lightingHost._enemyLightingCanvas = enemyLayer;
  const pickupLayerCtx = createStubContext();
  const pickupLayer = {
    width: 320,
    height: 240,
    getContext() {
      return pickupLayerCtx;
    }
  };
  lightingHost._pickupLightingCanvas = pickupLayer;
  const lightingGame = {
    config: {
      lighting: {
        enabled: true,
        maxDarknessAlpha: 0.99,
        enemyMaxDarknessAlpha: 0.99,
        enemyLightFalloffDecay: 2.4
      }
    },
    getActiveLightSources() {
      return [{ sourceType: "player", x: 100, y: 120, radius: 80 }];
    }
  };
  assert(lightingHost.getLightingDarknessAlphaAtPoint(lightingGame, 100, 120) === 0, "enemy darkness should clear at a light source");
  const farEnemyAlpha = lightingHost.getLightingDarknessAlphaAtPoint(lightingGame, 260, 120);
  assert(farEnemyAlpha > 0.94, "raw far enemy darkness should match global darkness before the enemy cap");
  const enemyFarAlpha = lightingHost.getEnemyDarknessAlphaAtPoint(lightingGame, 260, 120);
  const enemyMidAlpha = lightingHost.getEnemyDarknessAlphaAtPoint(lightingGame, 140, 120);
  const enemyNearAlpha = lightingHost.getEnemyDarknessAlphaAtPoint(lightingGame, 105, 120);
  assert(enemyFarAlpha === 0.99, "enemy darkness should meet the 99% global darkness maximum outside light");
  assert(enemyMidAlpha > 0 && enemyMidAlpha < enemyFarAlpha, "enemy darkness should fade before reaching the light source");
  assert(enemyMidAlpha < 0.7, "enemy darkness should visibly reduce by halfway into a light radius");
  assert(enemyNearAlpha >= 0 && enemyNearAlpha < enemyMidAlpha, "enemy darkness should keep fading near the light source");
  const callsBeforeEnemyOverlay = overlayCtx.calls.length;
  const renderedEnemyLayer = lightingHost.drawEnemyDarkenedLayer(lightingGame, { x: 260, y: 120, size: 32, hp: 10 }, 0, 0, { playW: 300, topHudH: 24, xpBarH: 28 });
  const enemyOverlayCalls = overlayCtx.calls.slice(callsBeforeEnemyOverlay);
  assert(renderedEnemyLayer === true, "enemy darkness should render through an offscreen sprite layer");
  assert(enemyLayerCtx.calls.some((call) => call[0] === "fillRect"), "enemy sprite layer should draw enemy pixels and darkness");
  assert(!enemyLayerCtx.calls.some((call) => call[0] === "ellipse"), "enemy darkness should not draw a radius or ellipse mask");
  assert(!enemyLayerCtx.calls.some((call) => call[0] === "clip"), "enemy darkness should not use a radius clip");
  assert(enemyLayerCtx.fillStyle.includes("0.990"), "enemy darkness overlay should meet the 99% global darkness maximum");
  assert(enemyLayerCtx.globalCompositeOperation === "source-over", "enemy layer should restore source-over compositing");
  assert(enemyOverlayCalls.some((call) => call[0] === "drawImage"), "enemy sprite layer should composite back to the scene");
  assert(enemyOverlayCalls.some((call) => call[0] === "drawSceneEnemyOverlays"), "enemy overlays should render after sprite darkness");
  const callsBeforePickupOverlay = overlayCtx.calls.length;
  const renderedPickupLayer = lightingHost.drawPickupDarkenedLayer(lightingGame, { x: 260, y: 120, size: 12, life: 10, type: "gold" }, 0, 0);
  const pickupOverlayCalls = overlayCtx.calls.slice(callsBeforePickupOverlay);
  assert(renderedPickupLayer === true, "drop darkness should render through an offscreen sprite layer");
  assert(pickupLayerCtx.calls.some((call) => call[0] === "fillRect"), "drop sprite layer should draw pickup pixels and darkness");
  assert(!pickupLayerCtx.calls.some((call) => call[0] === "ellipse"), "drop darkness should not draw a radius or ellipse mask");
  assert(!pickupLayerCtx.calls.some((call) => call[0] === "clip"), "drop darkness should not use a radius clip");
  assert(pickupLayerCtx.fillStyle.includes("0.990"), "drop darkness overlay should meet the 99% global darkness maximum");
  assert(pickupLayerCtx.globalCompositeOperation === "source-over", "drop layer should restore source-over compositing");
  assert(pickupOverlayCalls.some((call) => call[0] === "drawImage"), "drop sprite layer should composite back to the scene");

  const throwingEnemyLayerCtx = createStubContext();
  const throwingPickupLayerCtx = createStubContext();
  const throwingHost = {
    ctx: overlayCtx,
    canvas: { width: 320, height: 240 },
    getLightingCutoutAtPoint: runtimeSceneLightingMethods.getLightingCutoutAtPoint,
    getLightingDarknessAlphaAtPoint: runtimeSceneLightingMethods.getLightingDarknessAlphaAtPoint,
    getEnemyDarknessAlphaAtPoint: runtimeSceneLightingMethods.getEnemyDarknessAlphaAtPoint,
    getEnemyLightingCanvas() {
      return {
        width: 320,
        height: 240,
        getContext() {
          return throwingEnemyLayerCtx;
        }
      };
    },
    getPickupLightingCanvas() {
      return {
        width: 320,
        height: 240,
        getContext() {
          return throwingPickupLayerCtx;
        }
      };
    },
    drawSceneEnemy() {
      throw new Error("forced enemy draw failure");
    },
    drawSceneDrop() {
      throw new Error("forced drop draw failure");
    }
  };
  let enemyThrowRestored = false;
  try {
    runtimeSceneLightingMethods.drawEnemyDarkenedLayer.call(throwingHost, lightingGame, { x: 260, y: 120, size: 32, hp: 10 }, 0, 0, { playW: 300, topHudH: 24, xpBarH: 28 });
  } catch (error) {
    enemyThrowRestored = error.message === "forced enemy draw failure" && throwingHost.ctx === overlayCtx;
  }
  assert(enemyThrowRestored, "enemy layer should restore renderer context when sprite drawing throws");
  assert(throwingEnemyLayerCtx.calls.at(-1)?.[0] === "restore", "enemy layer should restore offscreen context when sprite drawing throws");

  let pickupThrowRestored = false;
  try {
    runtimeSceneLightingMethods.drawPickupDarkenedLayer.call(throwingHost, lightingGame, { x: 260, y: 120, size: 12, life: 10, type: "gold" }, 0, 0);
  } catch (error) {
    pickupThrowRestored = error.message === "forced drop draw failure" && throwingHost.ctx === overlayCtx;
  }
  assert(pickupThrowRestored, "drop layer should restore renderer context when sprite drawing throws");
  assert(throwingPickupLayerCtx.calls.at(-1)?.[0] === "restore", "drop layer should restore offscreen context when sprite drawing throws");

  const sceneSource = readFileSync(resolve("src", "rendering", "RendererRuntimeScene.js"), "utf8");
  const overlayIndex = sceneSource.indexOf("this.drawLightingOverlay(game, cameraX, cameraY, layout);");
  const dropsIndex = sceneSource.indexOf("this.drawDrops(game, cameraX, cameraY);");
  const floatingTextIndex = sceneSource.indexOf("this.drawFloatingTexts(game, cameraX, cameraY);");
  const enemyLayerIndex = sceneSource.lastIndexOf("this.drawEnemyDarkenedLayer(game, enemy, cameraX, cameraY, layout)");
  const fallbackEnemyIndex = sceneSource.lastIndexOf("this.drawSceneEnemy(game, enemy, cameraX, cameraY);");
  assert(overlayIndex >= 0 && dropsIndex > overlayIndex, "drops should render after lighting overlay before sprite-level darkening");
  assert(overlayIndex >= 0 && floatingTextIndex > overlayIndex, "floating text should render after lighting overlay so it stays readable");
  assert(overlayIndex >= 0 && enemyLayerIndex > overlayIndex, "enemies should render through a darkened sprite layer after global lighting overlay");
  assert(fallbackEnemyIndex > enemyLayerIndex, "enemies should fall back to direct drawing only when the darkened layer is unavailable");
  assert(floatingTextIndex > fallbackEnemyIndex, "floating combat text should render after enemies so actors cannot paint over it");
  assert(sceneSource.slice(overlayIndex).includes("this.drawEnemyDarkenedLayer(game, enemy, cameraX, cameraY, layout)"), "post-overlay enemies should use sprite-level darkness");

  const drawSource = readFileSync(resolve("src", "rendering", "runtimeSceneDrawMethods.js"), "utf8");
  const projectileDrawSource = readFileSync(resolve("src", "rendering", "rendererEffectsProjectileMethods.js"), "utf8");
  assert(projectileDrawSource.includes("this.drawPickupDarkenedLayer(game, drop, cameraX, cameraY)"), "drops should use sprite-level darkness when available");
  assert(projectileDrawSource.includes("drawSceneDrop(game, drop, cameraX, cameraY)"), "drops should keep a single-drop draw helper for layer rendering");
  const gaugeSource = readFileSync(resolve("src", "rendering", "hud", "lanternFuelGauge.js"), "utf8");
  assert(gaugeSource.includes("drawLanternFuelGauge"), "lantern fuel gauge renderer should exist");
  assert(drawSource.indexOf("drawConsumablesBar(this, game, layout, y)") < drawSource.indexOf("drawLanternFuelGauge(this, game, layout, y, consumableBounds)"), "lantern gauge should render to the right of the key binding section");

  console.log("Lighting render validation passed.");
}

main();
