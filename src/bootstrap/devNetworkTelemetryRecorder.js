const DEFAULT_WS_PORT = 8090;
const SAMPLE_INTERVAL_MS = 1000;
const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH_SIZE = 24;

function isDevMode(locationObject = globalThis?.location) {
  try {
    const params = new URLSearchParams(locationObject?.search || "");
    if (params.get("networkTelemetry") === "0" || params.get("telemetry") === "0") return false;
    return params.get("dev") === "1";
  } catch {
    return false;
  }
}

function buildSessionId(now = new Date()) {
  const stamp = now.toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${random}`;
}

function resolveTelemetryUrl(locationObject = globalThis?.location, port = DEFAULT_WS_PORT) {
  try {
    const params = new URLSearchParams(locationObject?.search || "");
    const explicitEndpoint = params.get("networkTelemetryEndpoint") || params.get("telemetryEndpoint");
    if (explicitEndpoint) return explicitEndpoint;
    const explicitPort = Number.parseInt(params.get("telemetryPort") || "", 10);
    if (Number.isFinite(explicitPort) && explicitPort > 0) port = explicitPort;
  } catch {
    // Fall back to the default local network server port.
  }
  const protocol = locationObject?.protocol === "https:" ? "https:" : "http:";
  const hostname = locationObject?.hostname || "localhost";
  return `${protocol}//${hostname}:${port}/api/dev-network-telemetry`;
}

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function booleanOrNull(value) {
  return typeof value === "boolean" ? value : null;
}

function stringOrEmpty(value) {
  return typeof value === "string" ? value : "";
}

function mediaMatches(query) {
  try {
    return typeof matchMedia === "function" ? matchMedia(query).matches : null;
  } catch {
    return null;
  }
}

function buildRenderContext(state = null) {
  const nav = typeof navigator === "undefined" ? null : navigator;
  const viewport = typeof window === "undefined" ? null : window.visualViewport;
  const screenInfo = typeof screen === "undefined" ? null : screen;
  const canvas = typeof document === "undefined" ? null : document.getElementById("game");
  const canvasRect = canvas && typeof canvas.getBoundingClientRect === "function" ? canvas.getBoundingClientRect() : null;
  const debugHud = state?.debugHud || {};
  return {
    rendererMode: "canvas2d",
    userAgent: stringOrEmpty(nav?.userAgent),
    platform: stringOrEmpty(nav?.platform),
    hardwareConcurrency: numberOrNull(nav?.hardwareConcurrency),
    deviceMemory: numberOrNull(nav?.deviceMemory),
    devicePixelRatio: typeof window === "undefined" ? null : numberOrNull(window.devicePixelRatio),
    windowInnerWidth: typeof window === "undefined" ? null : numberOrNull(window.innerWidth),
    windowInnerHeight: typeof window === "undefined" ? null : numberOrNull(window.innerHeight),
    windowOuterWidth: typeof window === "undefined" ? null : numberOrNull(window.outerWidth),
    windowOuterHeight: typeof window === "undefined" ? null : numberOrNull(window.outerHeight),
    screenWidth: numberOrNull(screenInfo?.width),
    screenHeight: numberOrNull(screenInfo?.height),
    screenAvailWidth: numberOrNull(screenInfo?.availWidth),
    screenAvailHeight: numberOrNull(screenInfo?.availHeight),
    screenColorDepth: numberOrNull(screenInfo?.colorDepth),
    visualViewportWidth: numberOrNull(viewport?.width),
    visualViewportHeight: numberOrNull(viewport?.height),
    visualViewportScale: numberOrNull(viewport?.scale),
    canvasWidth: numberOrNull(canvas?.width),
    canvasHeight: numberOrNull(canvas?.height),
    canvasClientWidth: numberOrNull(canvasRect?.width ?? canvas?.clientWidth),
    canvasClientHeight: numberOrNull(canvasRect?.height ?? canvas?.clientHeight),
    pageVisible: typeof document === "undefined" ? true : document.visibilityState !== "hidden",
    documentHidden: typeof document === "undefined" ? null : booleanOrNull(document.hidden),
    documentHasFocus: typeof document?.hasFocus === "function" ? document.hasFocus() : null,
    documentVisibilityState: typeof document?.visibilityState === "string" ? document.visibilityState : "",
    devHudEnabled: !!debugHud.enabled,
    telemetryActive: !!globalThis.__WOTC_NETWORK_TELEMETRY__,
    telemetrySampleIntervalMs: SAMPLE_INTERVAL_MS,
    prefersReducedMotion: mediaMatches("(prefers-reduced-motion: reduce)"),
    prefersReducedData: mediaMatches("(prefers-reduced-data: reduce)"),
    updateSlow: mediaMatches("(update: slow)"),
    displayModeBrowser: mediaMatches("(display-mode: browser)"),
    displayModeFullscreen: mediaMatches("(display-mode: fullscreen)"),
    anyPointerCoarse: mediaMatches("(any-pointer: coarse)"),
    hoverNone: mediaMatches("(hover: none)"),
    observedFrameWindowFps: numberOrNull(debugHud.frameWindowFps),
    observedFrameWindowAvgMs: numberOrNull(debugHud.frameWindowAvgMs),
    observedFrameWindowP95Ms: numberOrNull(debugHud.frameWindowP95Ms),
    observedFrameWindowMaxMs: numberOrNull(debugHud.frameWindowMaxMs)
  };
}

function buildFrameSpikeSamples(state, startedAtMs, previousPerf = {}) {
  const debugHud = state?.debugHud || {};
  const hudNet = debugHud.network || {};
  const net = state?.net || {};
  const perf = state?.networkPerf || {};
  const combat = state?.combat || {};
  const renderContext = buildRenderContext(state);
  const spikes = Array.isArray(debugHud.recentFrameSpikes)
    ? debugHud.recentFrameSpikes.filter((entry) => entry && Number.isFinite(entry.id) && entry.id > (previousPerf.frameSpikeEventId || 0))
    : [];
  return spikes.slice(-8).map((spike) => ({
    kind: "frameSpike",
    at: new Date().toISOString(),
    elapsedMs: typeof performance !== "undefined" ? performance.now() - startedAtMs : null,
    spikeId: Math.floor(spike.id),
    spikeAtMs: numberOrNull(spike.atMs),
    frameMs: numberOrNull(spike.frameMs),
    rawFps: numberOrNull(spike.rawFps),
    frameWindowFps: numberOrNull(spike.frameWindowFps),
    frameWindowP95Ms: numberOrNull(spike.frameWindowP95Ms),
    frameWindowMaxMs: numberOrNull(spike.frameWindowMaxMs),
    frameWindowSampleCount: numberOrNull(spike.frameWindowSampleCount),
    pageVisible: typeof document === "undefined" ? true : document.visibilityState !== "hidden",
    documentHasFocus: typeof document?.hasFocus === "function" ? document.hasFocus() : null,
    documentVisibilityState: typeof document?.visibilityState === "string" ? document.visibilityState : "",
    renderContext,
    gameActive: !!state,
    gameOver: !!state?.gameOver,
    paused: !!state?.ui?.paused,
    networkReady: !!state?.networkReady,
    networkRole: state?.networkRole || hudNet.role || "",
    floor: numberOrNull(state?.floor),
    pingMs: numberOrNull(hudNet.pingMs),
    latencyMs: numberOrNull(hudNet.latencyMs),
    jitterMs: numberOrNull(hudNet.jitterMs ?? net.jitterMs),
    snapshotBuffer: numberOrNull(hudNet.snapshotBuffer ?? net.snapshotBuffer),
    pendingInputs: numberOrNull(hudNet.pendingInputs ?? net.pendingInputs),
    unackedInputs: numberOrNull(hudNet.unackedInputs ?? net.unackedInputs),
    gapMs: numberOrNull(hudNet.gapMs ?? net.gapMs),
    appliedSnapshotCount: numberOrNull(perf.appliedSnapshotCount),
    lastCorrectionPx: numberOrNull(perf.lastCorrectionPx),
    maxCorrectionPx: numberOrNull(perf.maxCorrectionPx),
    postLoadLastCorrectionPx: numberOrNull(perf.postLoadLastCorrectionPx),
    postLoadMaxCorrectionPx: numberOrNull(perf.postLoadMaxCorrectionPx),
    hardSnapCount: numberOrNull(perf.hardSnapCount),
    blockedSnapCount: numberOrNull(perf.blockedSnapCount),
    projectileReconcileRejects: numberOrNull(perf.projectileReconcileRejects),
    visibleProjectiles: numberOrNull(combat.visibleProjectiles?.length ?? combat.visibleProjectileCount),
    visibleRangerProjectiles: numberOrNull(combat.visibleRangerProjectileCount),
    ownedProjectiles: numberOrNull(combat.ownedProjectiles?.length),
    recentShotCount: numberOrNull(combat.recentPlayerShots?.length)
  }));
}

function buildSample(state, startedAtMs, previousPerf = {}) {
  const debugHud = state?.debugHud || {};
  const hudNet = debugHud.network || {};
  const net = state?.net || {};
  const perf = state?.networkPerf || {};
  const combat = state?.combat || {};
  const projectileReconcileRejects = numberOrNull(perf.projectileReconcileRejects);
  const previousProjectileReconcileRejects = numberOrNull(previousPerf.projectileReconcileRejects);
  const recentProjectileReconcileRejects = Array.isArray(perf.recentProjectileReconcileRejects)
    ? perf.recentProjectileReconcileRejects
        .filter((entry) => entry && Number.isFinite(entry.id) && entry.id > (previousPerf.projectileReconcileRejectEventId || 0))
        .slice(-8)
        .map((entry) => ({
          id: Math.floor(entry.id),
          atMs: numberOrNull(entry.atMs),
          reason: typeof entry.reason === "string" ? entry.reason : "",
          source: typeof entry.source === "string" ? entry.source : "",
          projectileType: typeof entry.projectileType === "string" ? entry.projectileType : "",
          ownerId: typeof entry.ownerId === "string" ? entry.ownerId : "",
          spawnSeq: numberOrNull(entry.spawnSeq),
          bucketSeq: numberOrNull(entry.bucketSeq),
          exactSeq: !!entry.exactSeq,
          distancePx: numberOrNull(entry.distancePx),
          maxDistancePx: numberOrNull(entry.maxDistancePx),
          authoritativeX: numberOrNull(entry.authoritativeX),
          authoritativeY: numberOrNull(entry.authoritativeY),
          predictedX: numberOrNull(entry.predictedX),
          predictedY: numberOrNull(entry.predictedY),
          predictedType: typeof entry.predictedType === "string" ? entry.predictedType : ""
        }))
    : [];
  const recentPostLoadCorrections = Array.isArray(perf.recentPostLoadCorrections)
    ? perf.recentPostLoadCorrections.slice(-8).map((entry) => ({
        atMs: numberOrNull(entry.atMs),
        kind: typeof entry.kind === "string" ? entry.kind : "",
        errorPx: numberOrNull(entry.errorPx),
        ackSeq: numberOrNull(entry.ackSeq),
        pendingInputs: numberOrNull(entry.pendingInputs),
        correctedX: numberOrNull(entry.correctedX),
        correctedY: numberOrNull(entry.correctedY)
      }))
    : [];
  return {
    kind: "sample",
    at: new Date().toISOString(),
    elapsedMs: typeof performance !== "undefined" ? performance.now() - startedAtMs : null,
    pageVisible: typeof document === "undefined" ? true : document.visibilityState !== "hidden",
    documentHasFocus: typeof document?.hasFocus === "function" ? document.hasFocus() : null,
    documentVisibilityState: typeof document?.visibilityState === "string" ? document.visibilityState : "",
    renderContext: buildRenderContext(state),
    gameActive: !!state,
    gameOver: !!state?.gameOver,
    paused: !!state?.ui?.paused,
    networkReady: !!state?.networkReady,
    networkRole: state?.networkRole || hudNet.role || "",
    floor: numberOrNull(state?.floor),
    fps: numberOrNull(debugHud.fps),
    frameMs: numberOrNull(debugHud.frameMs),
    rawFps: numberOrNull(debugHud.rawFps),
    rawFrameMs: numberOrNull(debugHud.rawFrameMs),
    frameCount: numberOrNull(debugHud.frameCount),
    frameWindowFps: numberOrNull(debugHud.frameWindowFps),
    frameWindowAvgMs: numberOrNull(debugHud.frameWindowAvgMs),
    frameWindowP95Ms: numberOrNull(debugHud.frameWindowP95Ms),
    frameWindowMaxMs: numberOrNull(debugHud.frameWindowMaxMs),
    frameWindowSampleCount: numberOrNull(debugHud.frameWindowSampleCount),
    pingMs: numberOrNull(hudNet.pingMs),
    latencyMs: numberOrNull(hudNet.latencyMs),
    jitterMs: numberOrNull(hudNet.jitterMs ?? net.jitterMs),
    snapshotBuffer: numberOrNull(hudNet.snapshotBuffer ?? net.snapshotBuffer),
    pendingInputs: numberOrNull(hudNet.pendingInputs ?? net.pendingInputs),
    unackedInputs: numberOrNull(hudNet.unackedInputs ?? net.unackedInputs),
    gapMs: numberOrNull(hudNet.gapMs ?? net.gapMs),
    msSinceLastSnapshot: numberOrNull(net.msSinceLastSnapshot),
    msSinceLastSend: numberOrNull(net.msSinceLastSend),
    appliedSnapshotCount: numberOrNull(perf.appliedSnapshotCount),
    lastCorrectionPx: numberOrNull(perf.lastCorrectionPx),
    maxCorrectionPx: numberOrNull(perf.maxCorrectionPx),
    postLoadCorrectionReady: !!perf.postLoadCorrectionReady,
    postLoadCorrectionFloor: numberOrNull(perf.postLoadCorrectionFloor),
    postLoadCorrectionSnapshotStart: numberOrNull(perf.postLoadCorrectionSnapshotStart),
    postLoadLastCorrectionPx: numberOrNull(perf.postLoadLastCorrectionPx),
    postLoadMaxCorrectionPx: numberOrNull(perf.postLoadMaxCorrectionPx),
    postLoadHardSnapCount: numberOrNull(perf.postLoadHardSnapCount),
    postLoadSoftCorrectionCount: numberOrNull(perf.postLoadSoftCorrectionCount),
    postLoadSettleCorrectionCount: numberOrNull(perf.postLoadSettleCorrectionCount),
    postLoadBlockedSnapCount: numberOrNull(perf.postLoadBlockedSnapCount),
    recentPostLoadCorrections,
    hardSnapCount: numberOrNull(perf.hardSnapCount),
    softCorrectionCount: numberOrNull(perf.softCorrectionCount),
    settleCorrectionCount: numberOrNull(perf.settleCorrectionCount),
    blockedSnapCount: numberOrNull(perf.blockedSnapCount),
    projectileReconcileRejects,
    projectileReconcileRejectDelta:
      projectileReconcileRejects == null || previousProjectileReconcileRejects == null
        ? null
        : Math.max(0, projectileReconcileRejects - previousProjectileReconcileRejects),
    recentProjectileReconcileRejects,
    visibleProjectiles: numberOrNull(combat.visibleProjectiles?.length ?? combat.visibleProjectileCount),
    visibleRangerProjectiles: numberOrNull(combat.visibleRangerProjectileCount),
    ownedProjectiles: numberOrNull(combat.ownedProjectiles?.length),
    recentShotCount: numberOrNull(combat.recentPlayerShots?.length),
    player: state?.player
      ? {
          x: numberOrNull(state.player.x),
          y: numberOrNull(state.player.y),
          health: numberOrNull(state.player.health),
          classType: state.player.classType || ""
        }
      : null
  };
}

function hasUsefulSample(sample) {
  return !!sample;
}

export function startDevNetworkTelemetryRecorder({
  getState,
  enabled = isDevMode(),
  endpoint = resolveTelemetryUrl(),
  sampleIntervalMs = SAMPLE_INTERVAL_MS,
  flushIntervalMs = FLUSH_INTERVAL_MS
} = {}) {
  if (!enabled || typeof window === "undefined" || typeof fetch !== "function" || typeof getState !== "function") {
    return null;
  }

  const sessionId = buildSessionId();
  const startedAtMs = typeof performance !== "undefined" ? performance.now() : Date.now();
  const samples = [];
  let sending = false;
  const previousPerf = {
    projectileReconcileRejects: null,
    projectileReconcileRejectEventId: 0,
    frameSpikeEventId: 0
  };

  const flush = ({ keepalive = false } = {}) => {
    if (sending || samples.length === 0) return Promise.resolve(false);
    const batch = samples.splice(0, samples.length);
    sending = true;
    return fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, samples: batch }),
      keepalive
    })
      .then((response) => {
        if (!response.ok) throw new Error(`telemetry POST failed: ${response.status}`);
        return true;
      })
      .catch(() => {
        samples.unshift(...batch.slice(-MAX_BATCH_SIZE));
        return false;
      })
      .finally(() => {
        sending = false;
      });
  };

  const sampleTimer = window.setInterval(() => {
    let state = null;
    try {
      state = getState();
    } catch {
      state = null;
    }
    const sample = buildSample(state, startedAtMs, previousPerf);
    if (!hasUsefulSample(sample)) return;
    const frameSpikeSamples = buildFrameSpikeSamples(state, startedAtMs, previousPerf);
    if (Number.isFinite(sample.projectileReconcileRejects)) {
      previousPerf.projectileReconcileRejects = sample.projectileReconcileRejects;
    }
    const lastRejectEvent = Array.isArray(sample.recentProjectileReconcileRejects) && sample.recentProjectileReconcileRejects.length > 0
      ? sample.recentProjectileReconcileRejects[sample.recentProjectileReconcileRejects.length - 1]
      : null;
    if (Number.isFinite(lastRejectEvent?.id)) {
      previousPerf.projectileReconcileRejectEventId = Math.max(previousPerf.projectileReconcileRejectEventId, lastRejectEvent.id);
    }
    const lastFrameSpike = frameSpikeSamples.length > 0 ? frameSpikeSamples[frameSpikeSamples.length - 1] : null;
    if (Number.isFinite(lastFrameSpike?.spikeId)) {
      previousPerf.frameSpikeEventId = Math.max(previousPerf.frameSpikeEventId, lastFrameSpike.spikeId);
    }
    samples.push(...frameSpikeSamples);
    samples.push(sample);
    if (samples.length > MAX_BATCH_SIZE) samples.splice(0, samples.length - MAX_BATCH_SIZE);
    if (samples.length >= 5) flush();
  }, sampleIntervalMs);

  const flushTimer = window.setInterval(() => flush(), flushIntervalMs);
  const flushOnPageHide = () => {
    flush({ keepalive: true });
  };
  window.addEventListener("pagehide", flushOnPageHide);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush({ keepalive: true });
  });

  const recorder = {
    sessionId,
    endpoint,
    flush,
    getRenderContext() {
      let state = null;
      try {
        state = getState();
      } catch {
        state = null;
      }
      return buildRenderContext(state);
    },
    stop() {
      window.clearInterval(sampleTimer);
      window.clearInterval(flushTimer);
      window.removeEventListener("pagehide", flushOnPageHide);
      return flush({ keepalive: true });
    }
  };
  window.__WOTC_NETWORK_TELEMETRY__ = recorder;
  return recorder;
}
