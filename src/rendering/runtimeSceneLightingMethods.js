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

    const ambientAlpha = Math.max(0, Math.min(0.96, Number.isFinite(cfg.ambientDarknessAlpha) ? cfg.ambientDarknessAlpha : 0.72));
    const maxAlpha = Math.max(ambientAlpha, Math.min(0.98, Number.isFinite(cfg.maxDarknessAlpha) ? cfg.maxDarknessAlpha : 0.86));
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
      const decay = 4.6;
      const stops = [0, brightRatio * 0.5, brightRatio, (brightRatio + dimRatio) * 0.5, dimRatio, (dimRatio + 1) * 0.5, 1];
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
