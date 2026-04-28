export const runtimeSceneLightingMethods = {
  getLightingOverlayCanvas(width, height) {
    const current = this._lightingOverlayCanvas;
    if (current && current.width === width && current.height === height) return current;
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    this._lightingOverlayCanvas = canvas;
    return canvas;
  },

  getEnemyLightingCanvas(width, height) {
    const current = this._enemyLightingCanvas;
    if (current && current.width === width && current.height === height) return current;
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    this._enemyLightingCanvas = canvas;
    return canvas;
  },

  getPickupLightingCanvas(width, height) {
    const current = this._pickupLightingCanvas;
    if (current && current.width === width && current.height === height) return current;
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    this._pickupLightingCanvas = canvas;
    return canvas;
  },

  getLightSourceDecay(source, fallback = 4.6) {
    return Math.max(0.5, Math.min(8, Number.isFinite(source?.lightDecay) ? source.lightDecay : fallback));
  },

  getLightSourceBrightRatio(source, fallback) {
    return Math.max(0.05, Math.min(0.95, Number.isFinite(source?.brightRadiusRatio) ? source.brightRadiusRatio : fallback));
  },

  getLightSourceDimRatio(source, fallback) {
    return Math.max(0.05, Math.min(1, Number.isFinite(source?.dimRadiusRatio) ? source.dimRadiusRatio : fallback));
  },

  getLightingCutoutAtPoint(game, x, y) {
    const cfg = game?.config?.lighting || {};
    if (cfg.enabled === false) return 0;
    const sources = typeof game?.getActiveLightSources === "function" ? game.getActiveLightSources() : [];
    let strongestCutout = 0;
    for (const source of Array.isArray(sources) ? sources : []) {
      if (!source || !Number.isFinite(source.x) || !Number.isFinite(source.y) || !Number.isFinite(source.radius) || source.radius <= 0) continue;
      const distanceRatio = Math.hypot(x - source.x, y - source.y) / source.radius;
      if (distanceRatio >= 1) continue;
      const decay = typeof this.getLightSourceDecay === "function" ? this.getLightSourceDecay(source) : 4.6;
      const alpha = distanceRatio <= 0 ? 1 : Math.exp(-decay * distanceRatio);
      strongestCutout = Math.max(strongestCutout, alpha);
    }
    return strongestCutout;
  },

  getLightingDarknessAlphaAtPoint(game, x, y) {
    const cfg = game?.config?.lighting || {};
    if (cfg.enabled === false) return 0;
    const maxAlpha = Math.max(0, Math.min(0.99, Number.isFinite(cfg.maxDarknessAlpha) ? cfg.maxDarknessAlpha : 0.86));
    const strongestCutout = typeof this.getLightingCutoutAtPoint === "function" ? this.getLightingCutoutAtPoint(game, x, y) : 0;
    return maxAlpha * (1 - strongestCutout);
  },

  getEnemyDarknessAlphaAtPoint(game, x, y) {
    const cfg = game?.config?.lighting || {};
    if (cfg.enabled === false) return 0;
    const maxEnemyAlpha = Math.max(0, Math.min(0.99, Number.isFinite(cfg.enemyMaxDarknessAlpha) ? cfg.enemyMaxDarknessAlpha : 0.75));
    const sources = typeof game?.getActiveLightSources === "function" ? game.getActiveLightSources() : [];
    const decay = Math.max(0.5, Math.min(6, Number.isFinite(cfg.enemyLightFalloffDecay) ? cfg.enemyLightFalloffDecay : 2.4));
    let strongestCutout = 0;
    for (const source of Array.isArray(sources) ? sources : []) {
      if (!source || !Number.isFinite(source.x) || !Number.isFinite(source.y) || !Number.isFinite(source.radius) || source.radius <= 0) continue;
      const distanceRatio = Math.hypot(x - source.x, y - source.y) / source.radius;
      if (distanceRatio >= 1) continue;
      const sourceDecay = typeof this.getLightSourceDecay === "function" ? this.getLightSourceDecay(source, decay) : decay;
      const alpha = distanceRatio <= 0 ? 1 : Math.exp(-sourceDecay * distanceRatio);
      strongestCutout = Math.max(strongestCutout, alpha);
    }
    return maxEnemyAlpha * (1 - strongestCutout);
  },

  drawEnemyDarkenedLayer(game, enemy, cameraX, cameraY, layout) {
    const cfg = game?.config?.lighting || {};
    if (!enemy || (enemy.hp ?? 1) <= 0) return false;
    if (cfg.enabled === false || typeof this.getEnemyDarknessAlphaAtPoint !== "function") return false;
    const darknessAlpha = this.getEnemyDarknessAlphaAtPoint(game, enemy.x, enemy.y);
    if (darknessAlpha <= 0.01) return false;

    const ctx = this.ctx;
    const layerCanvas = typeof this.getEnemyLightingCanvas === "function" ? this.getEnemyLightingCanvas(this.canvas.width, this.canvas.height) : null;
    const layerCtx = layerCanvas?.getContext?.("2d");
    if (!layerCanvas || !layerCtx || typeof this.drawSceneEnemy !== "function") return false;

    layerCtx.save();
    layerCtx.clearRect(0, 0, layerCanvas.width, layerCanvas.height);
    const previousCtx = this.ctx;
    this.ctx = layerCtx;
    this.drawSceneEnemy(game, enemy, cameraX, cameraY, { drawOverlays: false });
    this.ctx = previousCtx;
    layerCtx.globalCompositeOperation = "source-atop";
    layerCtx.fillStyle = `rgba(2, 4, 9, ${darknessAlpha.toFixed(3)})`;
    layerCtx.fillRect(0, 0, layerCanvas.width, layerCanvas.height);
    layerCtx.globalCompositeOperation = "source-over";
    layerCtx.restore();

    ctx.drawImage(layerCanvas, 0, 0);
    this.drawSceneEnemyOverlays(game, enemy, cameraX, cameraY);
    return true;
  },

  drawPickupDarkenedLayer(game, drop, cameraX, cameraY) {
    const cfg = game?.config?.lighting || {};
    if (!drop || (drop.life ?? 1) <= 0) return false;
    if (cfg.enabled === false || typeof this.getEnemyDarknessAlphaAtPoint !== "function") return false;
    const darknessAlpha = this.getEnemyDarknessAlphaAtPoint(game, drop.x, drop.y);
    if (darknessAlpha <= 0.01) return false;

    const ctx = this.ctx;
    const layerCanvas = typeof this.getPickupLightingCanvas === "function" ? this.getPickupLightingCanvas(this.canvas.width, this.canvas.height) : null;
    const layerCtx = layerCanvas?.getContext?.("2d");
    if (!layerCanvas || !layerCtx || typeof this.drawSceneDrop !== "function") return false;

    layerCtx.save();
    layerCtx.clearRect(0, 0, layerCanvas.width, layerCanvas.height);
    const previousCtx = this.ctx;
    this.ctx = layerCtx;
    this.drawSceneDrop(game, drop, cameraX, cameraY);
    this.ctx = previousCtx;
    layerCtx.globalCompositeOperation = "source-atop";
    layerCtx.fillStyle = `rgba(2, 4, 9, ${darknessAlpha.toFixed(3)})`;
    layerCtx.fillRect(0, 0, layerCanvas.width, layerCanvas.height);
    layerCtx.globalCompositeOperation = "source-over";
    layerCtx.restore();

    ctx.drawImage(layerCanvas, 0, 0);
    return true;
  },

  drawLightingOverlay(game, cameraX, cameraY, layout) {
    const cfg = game?.config?.lighting || {};
    if (cfg.enabled === false) return;
    const ctx = this.ctx;
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    const playW = Number.isFinite(layout?.playW) ? layout.playW : this.canvas.width;
    const top = Number.isFinite(layout?.topHudH) ? layout.topHudH : 0;
    const xpBarH = Number.isFinite(layout?.xpBarH) ? layout.xpBarH : 0;
    const h = Math.max(0, canvasH - top - xpBarH);
    if (playW <= 0 || h <= 0) return;

    const ambientAlpha = Math.max(0, Math.min(0.99, Number.isFinite(cfg.ambientDarknessAlpha) ? cfg.ambientDarknessAlpha : 0.72));
    const maxAlpha = Math.max(ambientAlpha, Math.min(0.99, Number.isFinite(cfg.maxDarknessAlpha) ? cfg.maxDarknessAlpha : 0.86));
    const brightRatio = Math.max(0.05, Math.min(0.9, Number.isFinite(cfg.brightRadiusRatio) ? cfg.brightRadiusRatio : 0.35));
    const dimRatio = Math.max(brightRatio, Math.min(1, Number.isFinite(cfg.dimRadiusRatio) ? cfg.dimRadiusRatio : 0.75));
    const sources = typeof game.getActiveLightSources === "function" ? game.getActiveLightSources() : [];
    if (typeof window !== "undefined") {
      const debug = window.__WOTC_LIGHTING_DEBUG__ || { drawCount: 0 };
      debug.drawCount = (debug.drawCount || 0) + 1;
      debug.sourceCount = Array.isArray(sources) ? sources.length : 0;
      debug.ambientAlpha = ambientAlpha;
      debug.maxAlpha = maxAlpha;
      debug.playW = playW;
      debug.height = h;
      debug.lastAtMs = typeof performance !== "undefined" ? performance.now() : 0;
      window.__WOTC_LIGHTING_DEBUG__ = debug;
    }

    const overlayCanvas = this._lightingOverlayCanvas && this._lightingOverlayCanvas.width === canvasW && this._lightingOverlayCanvas.height === canvasH
      ? this._lightingOverlayCanvas
      : typeof this.getLightingOverlayCanvas === "function"
        ? this.getLightingOverlayCanvas(canvasW, canvasH)
        : null;
    const overlayCtx = overlayCanvas?.getContext?.("2d");
    if (!overlayCanvas || !overlayCtx) return;

    overlayCtx.save();
    overlayCtx.clearRect(0, 0, canvasW, canvasH);
    overlayCtx.globalCompositeOperation = "source-over";
    overlayCtx.fillStyle = `rgba(2, 4, 9, ${maxAlpha})`;
    overlayCtx.fillRect(0, top, playW, h);
    overlayCtx.globalCompositeOperation = "destination-out";
    for (const source of Array.isArray(sources) ? sources : []) {
      if (!source || !Number.isFinite(source.x) || !Number.isFinite(source.y) || !Number.isFinite(source.radius) || source.radius <= 0) continue;
      const sx = source.x - cameraX;
      const sy = source.y - cameraY;
      const radius = source.radius;
      if (sx + radius < 0 || sx - radius > playW || sy + radius < top || sy - radius > top + h) continue;
      const gradient = overlayCtx.createRadialGradient(sx, sy, Math.max(1, radius * 0.08), sx, sy, radius);
      const decay = typeof this.getLightSourceDecay === "function" ? this.getLightSourceDecay(source) : 4.6;
      const sourceBrightRatio = typeof this.getLightSourceBrightRatio === "function" ? this.getLightSourceBrightRatio(source, brightRatio) : brightRatio;
      const sourceDimRatio = typeof this.getLightSourceDimRatio === "function" ? this.getLightSourceDimRatio(source, dimRatio) : dimRatio;
      const stops = [0, sourceBrightRatio * 0.5, sourceBrightRatio, (sourceBrightRatio + sourceDimRatio) * 0.5, sourceDimRatio, (sourceDimRatio + 1) * 0.5, 1];
      for (const stop of stops) {
        const alpha = stop >= 1 ? 0 : stop <= 0 ? 1 : Math.exp(-decay * stop);
        gradient.addColorStop(stop, `rgba(255, 255, 255, ${alpha.toFixed(3)})`);
      }
      overlayCtx.fillStyle = gradient;
      overlayCtx.beginPath();
      overlayCtx.arc(sx, sy, radius, 0, Math.PI * 2);
      overlayCtx.fill();
    }

    overlayCtx.globalCompositeOperation = "source-over";
    overlayCtx.restore();
    ctx.drawImage(overlayCanvas, 0, 0);
  }
};
