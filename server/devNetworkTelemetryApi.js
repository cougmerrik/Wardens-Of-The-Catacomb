import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const artifactsDir = resolve(process.cwd(), "artifacts", "network");
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_SAMPLES_PER_POST = 120;

function writeJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(`${JSON.stringify(payload)}\n`);
}

async function readJsonBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error("Telemetry payload too large");
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sanitizeSessionId(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  const safe = normalized.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return safe || `manual-${Date.now()}`;
}

function sanitizeProjectileRejectEvent(entry) {
  if (!entry || typeof entry !== "object") return null;
  return {
    id: Number.isFinite(entry.id) ? Math.floor(entry.id) : null,
    atMs: Number.isFinite(entry.atMs) ? Math.max(0, Math.round(entry.atMs)) : null,
    reason: typeof entry.reason === "string" ? entry.reason.slice(0, 64) : "",
    source: typeof entry.source === "string" ? entry.source.slice(0, 64) : "",
    projectileType: typeof entry.projectileType === "string" ? entry.projectileType.slice(0, 64) : "",
    ownerId: typeof entry.ownerId === "string" ? entry.ownerId.slice(0, 80) : "",
    spawnSeq: Number.isFinite(entry.spawnSeq) ? Math.floor(entry.spawnSeq) : null,
    bucketSeq: Number.isFinite(entry.bucketSeq) ? Math.floor(entry.bucketSeq) : null,
    exactSeq: !!entry.exactSeq,
    distancePx: Number.isFinite(entry.distancePx) ? entry.distancePx : null,
    maxDistancePx: Number.isFinite(entry.maxDistancePx) ? entry.maxDistancePx : null,
    authoritativeX: Number.isFinite(entry.authoritativeX) ? entry.authoritativeX : null,
    authoritativeY: Number.isFinite(entry.authoritativeY) ? entry.authoritativeY : null,
    predictedX: Number.isFinite(entry.predictedX) ? entry.predictedX : null,
    predictedY: Number.isFinite(entry.predictedY) ? entry.predictedY : null,
    predictedType: typeof entry.predictedType === "string" ? entry.predictedType.slice(0, 64) : ""
  };
}

function finiteNumberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function booleanOrNull(value) {
  return typeof value === "boolean" ? value : null;
}

function boundedString(value, maxLength) {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function sanitizeRenderContext(context) {
  if (!context || typeof context !== "object") return null;
  return {
    rendererMode: boundedString(context.rendererMode, 32),
    userAgent: boundedString(context.userAgent, 180),
    platform: boundedString(context.platform, 80),
    hardwareConcurrency: finiteNumberOrNull(context.hardwareConcurrency),
    deviceMemory: finiteNumberOrNull(context.deviceMemory),
    devicePixelRatio: finiteNumberOrNull(context.devicePixelRatio),
    windowInnerWidth: finiteNumberOrNull(context.windowInnerWidth),
    windowInnerHeight: finiteNumberOrNull(context.windowInnerHeight),
    windowOuterWidth: finiteNumberOrNull(context.windowOuterWidth),
    windowOuterHeight: finiteNumberOrNull(context.windowOuterHeight),
    screenWidth: finiteNumberOrNull(context.screenWidth),
    screenHeight: finiteNumberOrNull(context.screenHeight),
    screenAvailWidth: finiteNumberOrNull(context.screenAvailWidth),
    screenAvailHeight: finiteNumberOrNull(context.screenAvailHeight),
    screenColorDepth: finiteNumberOrNull(context.screenColorDepth),
    visualViewportWidth: finiteNumberOrNull(context.visualViewportWidth),
    visualViewportHeight: finiteNumberOrNull(context.visualViewportHeight),
    visualViewportScale: finiteNumberOrNull(context.visualViewportScale),
    canvasWidth: finiteNumberOrNull(context.canvasWidth),
    canvasHeight: finiteNumberOrNull(context.canvasHeight),
    canvasClientWidth: finiteNumberOrNull(context.canvasClientWidth),
    canvasClientHeight: finiteNumberOrNull(context.canvasClientHeight),
    pageVisible: booleanOrNull(context.pageVisible),
    documentHidden: booleanOrNull(context.documentHidden),
    documentHasFocus: booleanOrNull(context.documentHasFocus),
    documentVisibilityState: boundedString(context.documentVisibilityState, 32),
    devHudEnabled: booleanOrNull(context.devHudEnabled),
    telemetryActive: booleanOrNull(context.telemetryActive),
    telemetrySampleIntervalMs: finiteNumberOrNull(context.telemetrySampleIntervalMs),
    prefersReducedMotion: booleanOrNull(context.prefersReducedMotion),
    prefersReducedData: booleanOrNull(context.prefersReducedData),
    updateSlow: booleanOrNull(context.updateSlow),
    displayModeBrowser: booleanOrNull(context.displayModeBrowser),
    displayModeFullscreen: booleanOrNull(context.displayModeFullscreen),
    anyPointerCoarse: booleanOrNull(context.anyPointerCoarse),
    hoverNone: booleanOrNull(context.hoverNone),
    observedFrameWindowFps: finiteNumberOrNull(context.observedFrameWindowFps),
    observedFrameWindowAvgMs: finiteNumberOrNull(context.observedFrameWindowAvgMs),
    observedFrameWindowP95Ms: finiteNumberOrNull(context.observedFrameWindowP95Ms),
    observedFrameWindowMaxMs: finiteNumberOrNull(context.observedFrameWindowMaxMs)
  };
}

function sanitizeSample(sample) {
  if (!sample || typeof sample !== "object") return null;
  const kind = sample.kind === "frameSpike" ? "frameSpike" : "sample";
  const recentProjectileReconcileRejects = Array.isArray(sample.recentProjectileReconcileRejects)
    ? sample.recentProjectileReconcileRejects.slice(-8).map(sanitizeProjectileRejectEvent).filter(Boolean)
    : [];
  return {
    kind,
    at: typeof sample.at === "string" ? sample.at : new Date().toISOString(),
    elapsedMs: Number.isFinite(sample.elapsedMs) ? Math.max(0, Math.round(sample.elapsedMs)) : null,
    spikeId: kind === "frameSpike" && Number.isFinite(sample.spikeId) ? Math.floor(sample.spikeId) : null,
    spikeAtMs: kind === "frameSpike" && Number.isFinite(sample.spikeAtMs) ? Math.max(0, Math.round(sample.spikeAtMs)) : null,
    pageVisible: sample.pageVisible !== false,
    documentHasFocus: typeof sample.documentHasFocus === "boolean" ? sample.documentHasFocus : null,
    documentVisibilityState: typeof sample.documentVisibilityState === "string" ? sample.documentVisibilityState.slice(0, 32) : "",
    renderContext: sanitizeRenderContext(sample.renderContext),
    gameActive: !!sample.gameActive,
    gameOver: !!sample.gameOver,
    paused: !!sample.paused,
    networkReady: !!sample.networkReady,
    networkRole: typeof sample.networkRole === "string" ? sample.networkRole.slice(0, 32) : "",
    floor: Number.isFinite(sample.floor) ? sample.floor : null,
    fps: Number.isFinite(sample.fps) ? sample.fps : null,
    frameMs: Number.isFinite(sample.frameMs) ? sample.frameMs : null,
    rawFps: Number.isFinite(sample.rawFps) ? sample.rawFps : null,
    rawFrameMs: Number.isFinite(sample.rawFrameMs) ? sample.rawFrameMs : null,
    frameCount: Number.isFinite(sample.frameCount) ? sample.frameCount : null,
    frameWindowFps: Number.isFinite(sample.frameWindowFps) ? sample.frameWindowFps : null,
    frameWindowAvgMs: Number.isFinite(sample.frameWindowAvgMs) ? sample.frameWindowAvgMs : null,
    frameWindowP95Ms: Number.isFinite(sample.frameWindowP95Ms) ? sample.frameWindowP95Ms : null,
    frameWindowMaxMs: Number.isFinite(sample.frameWindowMaxMs) ? sample.frameWindowMaxMs : null,
    frameWindowSampleCount: Number.isFinite(sample.frameWindowSampleCount) ? sample.frameWindowSampleCount : null,
    pingMs: Number.isFinite(sample.pingMs) ? sample.pingMs : null,
    latencyMs: Number.isFinite(sample.latencyMs) ? sample.latencyMs : null,
    jitterMs: Number.isFinite(sample.jitterMs) ? sample.jitterMs : null,
    snapshotBuffer: Number.isFinite(sample.snapshotBuffer) ? sample.snapshotBuffer : null,
    pendingInputs: Number.isFinite(sample.pendingInputs) ? sample.pendingInputs : null,
    unackedInputs: Number.isFinite(sample.unackedInputs) ? sample.unackedInputs : null,
    gapMs: Number.isFinite(sample.gapMs) ? sample.gapMs : null,
    msSinceLastSnapshot: Number.isFinite(sample.msSinceLastSnapshot) ? sample.msSinceLastSnapshot : null,
    msSinceLastSend: Number.isFinite(sample.msSinceLastSend) ? sample.msSinceLastSend : null,
    appliedSnapshotCount: Number.isFinite(sample.appliedSnapshotCount) ? sample.appliedSnapshotCount : null,
    lastCorrectionPx: Number.isFinite(sample.lastCorrectionPx) ? sample.lastCorrectionPx : null,
    maxCorrectionPx: Number.isFinite(sample.maxCorrectionPx) ? sample.maxCorrectionPx : null,
    postLoadLastCorrectionPx: Number.isFinite(sample.postLoadLastCorrectionPx) ? sample.postLoadLastCorrectionPx : null,
    postLoadMaxCorrectionPx: Number.isFinite(sample.postLoadMaxCorrectionPx) ? sample.postLoadMaxCorrectionPx : null,
    hardSnapCount: Number.isFinite(sample.hardSnapCount) ? sample.hardSnapCount : null,
    softCorrectionCount: Number.isFinite(sample.softCorrectionCount) ? sample.softCorrectionCount : null,
    settleCorrectionCount: Number.isFinite(sample.settleCorrectionCount) ? sample.settleCorrectionCount : null,
    blockedSnapCount: Number.isFinite(sample.blockedSnapCount) ? sample.blockedSnapCount : null,
    projectileReconcileRejects: Number.isFinite(sample.projectileReconcileRejects) ? sample.projectileReconcileRejects : null,
    projectileReconcileRejectDelta: Number.isFinite(sample.projectileReconcileRejectDelta) ? sample.projectileReconcileRejectDelta : null,
    recentProjectileReconcileRejects,
    visibleProjectiles: Number.isFinite(sample.visibleProjectiles) ? sample.visibleProjectiles : null,
    visibleRangerProjectiles: Number.isFinite(sample.visibleRangerProjectiles) ? sample.visibleRangerProjectiles : null,
    ownedProjectiles: Number.isFinite(sample.ownedProjectiles) ? sample.ownedProjectiles : null,
    recentShotCount: Number.isFinite(sample.recentShotCount) ? sample.recentShotCount : null,
    player: sample.player && typeof sample.player === "object"
      ? {
          x: Number.isFinite(sample.player.x) ? sample.player.x : null,
          y: Number.isFinite(sample.player.y) ? sample.player.y : null,
          health: Number.isFinite(sample.player.health) ? sample.player.health : null,
          classType: typeof sample.player.classType === "string" ? sample.player.classType.slice(0, 32) : ""
        }
      : null
  };
}

export async function handleDevNetworkTelemetryRequest(req, res) {
  const method = req.method || "GET";
  if (method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end();
    return;
  }

  if (method !== "POST") {
    writeJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const sessionId = sanitizeSessionId(body?.sessionId);
    const samples = Array.isArray(body?.samples) ? body.samples.slice(0, MAX_SAMPLES_PER_POST) : [];
    const sanitized = samples.map(sanitizeSample).filter(Boolean);
    if (sanitized.length === 0) {
      writeJson(res, 400, { error: "No telemetry samples" });
      return;
    }
    mkdirSync(artifactsDir, { recursive: true });
    const path = resolve(artifactsDir, `manual-network-telemetry-${sessionId}.jsonl`);
    const lines = sanitized.map((sample) => JSON.stringify({
      sessionId,
      receivedAt: new Date().toISOString(),
      ...sample
    })).join("\n");
    appendFileSync(path, `${lines}\n`, "utf8");
    writeJson(res, 200, { accepted: true, sampleCount: sanitized.length, path });
  } catch (error) {
    writeJson(res, 400, { error: error instanceof Error ? error.message : "Invalid telemetry payload" });
  }
}
