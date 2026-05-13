export function ensureNetworkPerf(game) {
  if (game.networkPerf && typeof game.networkPerf === "object") return game.networkPerf;
  game.networkPerf = {
    appliedSnapshotCount: 0,
    lastCorrectionPx: 0,
    maxCorrectionPx: 0,
    hardSnapCount: 0,
    softCorrectionCount: 0,
    settleCorrectionCount: 0,
    blockedSnapCount: 0,
    projectileReconcileRejects: 0,
    projectileReconcileRejectEventId: 0,
    recentProjectileReconcileRejects: [],
    postLoadCorrectionReady: false,
    postLoadCorrectionFloor: null,
    postLoadCorrectionStartedAtMs: 0,
    postLoadCorrectionSnapshotStart: 0,
    postLoadLastCorrectionPx: 0,
    postLoadMaxCorrectionPx: 0,
    postLoadHardSnapCount: 0,
    postLoadSoftCorrectionCount: 0,
    postLoadSettleCorrectionCount: 0,
    postLoadBlockedSnapCount: 0,
    recentPostLoadCorrections: [],
    recentCorrections: []
  };
  return game.networkPerf;
}

function nowMs() {
  return typeof performance !== "undefined" && typeof performance.now === "function" ? Math.round(performance.now()) : Date.now();
}

function trimRecent(list, limit = 24) {
  if (list.length > limit) list.splice(0, list.length - limit);
}

export function resetPostLoadCorrectionMetrics(perf, game) {
  perf.postLoadCorrectionReady = true;
  perf.postLoadCorrectionFloor = Number.isFinite(game?.floor) ? game.floor : null;
  perf.postLoadCorrectionStartedAtMs = nowMs();
  perf.postLoadCorrectionSnapshotStart = Number.isFinite(perf.appliedSnapshotCount) ? perf.appliedSnapshotCount : 0;
  perf.postLoadLastCorrectionPx = 0;
  perf.postLoadMaxCorrectionPx = 0;
  perf.postLoadHardSnapCount = 0;
  perf.postLoadSoftCorrectionCount = 0;
  perf.postLoadSettleCorrectionCount = 0;
  perf.postLoadBlockedSnapCount = 0;
  perf.recentPostLoadCorrections = [];
}

export function isPostLoadCorrectionActive(game, { controller, ackSeq, isInitialControllerSync } = {}) {
  const perf = game?.networkPerf;
  if (!perf || typeof perf !== "object") return false;
  if (!controller || isInitialControllerSync || !(ackSeq > 0)) return false;
  if (!game.networkReady || !game.networkHasMap || !game.networkHasChunks) return false;
  const floor = Number.isFinite(game.floor) ? game.floor : null;
  if (!perf.postLoadCorrectionReady || perf.postLoadCorrectionFloor !== floor) resetPostLoadCorrectionMetrics(perf, game);
  return true;
}

export function recordCorrection(game, kind, errorDist, { ackSeq, pendingInputs, extra = {} } = {}) {
  const perf = ensureNetworkPerf(game);
  if (!Array.isArray(perf.recentCorrections)) perf.recentCorrections = [];
  perf.recentCorrections.push({
    atMs: nowMs(),
    kind,
    errorPx: Math.round(errorDist),
    ackSeq: Number.isFinite(ackSeq) ? ackSeq : 0,
    pendingInputs: Array.isArray(pendingInputs) ? pendingInputs.length : 0,
    ...extra
  });
  trimRecent(perf.recentCorrections);
}

export function recordPostLoadCorrection(game, active, kind, errorPx, { ackSeq, pendingDepth, extra = {} } = {}) {
  if (!active) return;
  const perf = ensureNetworkPerf(game);
  perf.postLoadLastCorrectionPx = errorPx;
  if (errorPx > (perf.postLoadMaxCorrectionPx || 0)) perf.postLoadMaxCorrectionPx = errorPx;
  if (!Array.isArray(perf.recentPostLoadCorrections)) perf.recentPostLoadCorrections = [];
  perf.recentPostLoadCorrections.push({
    atMs: nowMs(),
    kind,
    errorPx: Math.round(errorPx),
    ackSeq: Number.isFinite(ackSeq) ? ackSeq : 0,
    pendingInputs: Number.isFinite(pendingDepth) ? pendingDepth : 0,
    ...extra
  });
  trimRecent(perf.recentPostLoadCorrections);
}
