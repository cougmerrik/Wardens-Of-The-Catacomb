export function summarizeShotCadence(shots, source) {
  const filtered = shots
    .filter((shot) => shot?.source === source && Number.isFinite(shot.atMs))
    .slice()
    .sort((a, b) => a.atMs - b.atMs);
  const intervals = [];
  for (let i = 1; i < filtered.length; i += 1) intervals.push(filtered[i].atMs - filtered[i - 1].atMs);
  const cooldownMs = Math.max(40, ...filtered.map((shot) => Number.isFinite(shot.fireCooldown) ? shot.fireCooldown * 1000 : 0));
  return {
    source,
    count: filtered.length,
    cooldownMs,
    intervals,
    minIntervalMs: intervals.length > 0 ? Math.min(...intervals) : 0,
    maxIntervalMs: intervals.length > 0 ? Math.max(...intervals) : 0
  };
}

export function summarizeShotReconciliation(shots) {
  const predicted = shots.filter((shot) => shot?.source === "predictedPrimary" && Number.isFinite(shot.atMs)).slice().sort((a, b) => a.atMs - b.atMs);
  const authoritative = shots.filter((shot) => shot?.source === "authoritativeProjectile" && Number.isFinite(shot.atMs)).slice().sort((a, b) => a.atMs - b.atMs);
  const lags = [];
  let matched = 0;
  for (const shot of predicted) {
    const auth = authoritative.find((entry) =>
      entry.atMs >= shot.atMs &&
      entry.atMs - shot.atMs <= 180 &&
      Math.abs((entry.seq || 0) - (shot.seq || 0)) <= 45
    );
    if (!auth) continue;
    matched += 1;
    lags.push(auth.atMs - shot.atMs);
  }
  return { predictedCount: predicted.length, authoritativeCount: authoritative.length, matched, maxLagMs: lags.length > 0 ? Math.max(...lags) : 0 };
}

export async function captureRenderContext(page) {
  return page.evaluate(() => {
    const mediaMatches = (query) => {
      try {
        return typeof matchMedia === "function" ? matchMedia(query).matches : null;
      } catch {
        return null;
      }
    };
    const canvas = document.getElementById("game");
    const rect = canvas?.getBoundingClientRect?.();
    const debugHud = window.__WOTC_DEBUG__?.getState?.()?.debugHud || {};
    return {
      rendererMode: "canvas2d",
      devicePixelRatio: Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : null,
      windowInnerWidth: Number.isFinite(window.innerWidth) ? window.innerWidth : null,
      windowInnerHeight: Number.isFinite(window.innerHeight) ? window.innerHeight : null,
      visualViewportWidth: Number.isFinite(window.visualViewport?.width) ? window.visualViewport.width : null,
      visualViewportHeight: Number.isFinite(window.visualViewport?.height) ? window.visualViewport.height : null,
      visualViewportScale: Number.isFinite(window.visualViewport?.scale) ? window.visualViewport.scale : null,
      canvasWidth: Number.isFinite(canvas?.width) ? canvas.width : null,
      canvasHeight: Number.isFinite(canvas?.height) ? canvas.height : null,
      canvasClientWidth: Number.isFinite(rect?.width ?? canvas?.clientWidth) ? rect?.width ?? canvas.clientWidth : null,
      canvasClientHeight: Number.isFinite(rect?.height ?? canvas?.clientHeight) ? rect?.height ?? canvas.clientHeight : null,
      documentHidden: typeof document.hidden === "boolean" ? document.hidden : null,
      documentHasFocus: typeof document.hasFocus === "function" ? document.hasFocus() : null,
      documentVisibilityState: typeof document.visibilityState === "string" ? document.visibilityState : "",
      prefersReducedMotion: mediaMatches("(prefers-reduced-motion: reduce)"),
      updateSlow: mediaMatches("(update: slow)"),
      displayModeBrowser: mediaMatches("(display-mode: browser)"),
      devHudEnabled: !!debugHud.enabled,
      observedFrameWindowFps: Number.isFinite(debugHud.frameWindowFps) ? debugHud.frameWindowFps : null,
      observedFrameWindowP95Ms: Number.isFinite(debugHud.frameWindowP95Ms) ? debugHud.frameWindowP95Ms : null
    };
  });
}

export async function sampleHeldPrimaryCadence(page, durationMs) {
  return page.evaluate((duration) => new Promise((resolve) => {
    const shots = new Map();
    const startedAt = performance.now();
    const capture = () => {
      const recent = window.__WOTC_DEBUG__?.getState?.()?.combat?.recentPlayerShots || [];
      for (const shot of recent) {
        if (!shot || !Number.isFinite(shot.atMs) || shot.atMs < startedAt - 80) continue;
        shots.set(`${shot.source || ""}:${shot.seq || 0}:${shot.atMs}:${shot.multishotCount || 0}`, { ...shot });
      }
      if (performance.now() - startedAt >= duration) resolve(Array.from(shots.values()).sort((a, b) => a.atMs - b.atMs));
      else setTimeout(capture, 25);
    };
    capture();
  }), durationMs);
}

export async function waitForPredictedProjectilesToClear(page, getDebugState, timeoutMs = 500) {
  const handle = await page.waitForFunction(() => {
    const combat = window.__WOTC_DEBUG__?.getState?.()?.combat || {};
    return combat.predictedProjectileCount === 0 && combat.predictedRenderedProjectileCount === 0
      ? { predictedStoreCount: 0, predictedRenderedCount: 0 }
      : null;
  }, null, { timeout: timeoutMs }).catch(() => null);
  if (handle) return handle.jsonValue();
  const combat = (await getDebugState(page))?.combat || {};
  return { predictedStoreCount: combat.predictedProjectileCount || 0, predictedRenderedCount: combat.predictedRenderedProjectileCount || 0 };
}

export async function waitForVisibleRangerProjectilesToClear(page, getDebugState, timeoutMs = 1700) {
  const handle = await page.waitForFunction(() => {
    const combat = window.__WOTC_DEBUG__?.getState?.()?.combat || {};
    return (combat.visibleRangerProjectileCount || 0) > 0 ? null : { lingeringCount: 0 };
  }, null, { timeout: timeoutMs }).catch(() => null);
  if (handle) return handle.jsonValue();
  const combat = (await getDebugState(page))?.combat || {};
  return { lingeringCount: combat.visibleRangerProjectileCount || 0, visibleProjectiles: combat.visibleProjectiles || [] };
}
