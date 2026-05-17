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
    recentCorrections: [],
    networkFlightEventId: 0,
    recentFlightEvents: [],
    networkStateAnomalyEventId: 0,
    recentStateAnomalies: [],
    serverStateAnomalyEventId: 0,
    recentServerStateAnomalies: []
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

export function recordNetworkFlightEvent(game, kind, details = {}) {
  const perf = ensureNetworkPerf(game);
  if (!Array.isArray(perf.recentFlightEvents)) perf.recentFlightEvents = [];
  perf.networkFlightEventId = Math.max(0, Number.isFinite(perf.networkFlightEventId) ? Math.floor(perf.networkFlightEventId) : 0) + 1;
  const event = {
    id: perf.networkFlightEventId,
    atMs: nowMs(),
    kind,
    ...details
  };
  perf.recentFlightEvents.push(event);
  trimRecent(perf.recentFlightEvents, 96);
  return event;
}

export function recordNetworkStateAnomaly(game, kind, details = {}) {
  const perf = ensureNetworkPerf(game);
  if (!Array.isArray(perf.recentStateAnomalies)) perf.recentStateAnomalies = [];
  perf.networkStateAnomalyEventId = Math.max(
    0,
    Number.isFinite(perf.networkStateAnomalyEventId) ? Math.floor(perf.networkStateAnomalyEventId) : 0
  ) + 1;
  const event = {
    id: perf.networkStateAnomalyEventId,
    atMs: nowMs(),
    kind,
    ...details
  };
  perf.recentStateAnomalies.push(event);
  trimRecent(perf.recentStateAnomalies, 48);
  return event;
}

export function recordSuspiciousNetworkState(game, { keyframe = false, ackSeq = 0 } = {}) {
  if (!game?.networkPerf) return;
  const enemies = Array.isArray(game.enemies) ? game.enemies : [];
  let tripleStatusCount = 0;
  let fullHpBarCount = 0;
  for (const enemy of enemies) {
    if (!enemy) continue;
    if ((enemy.burningTimer || 0) > 0 && (enemy.curseTimer || 0) > 0 && (enemy.rotTimer || 0) > 0) {
      tripleStatusCount += 1;
    }
    if ((enemy.hpBarTimer || 0) >= 0.85 && Number.isFinite(enemy.hp) && Number.isFinite(enemy.maxHp) && enemy.hp >= enemy.maxHp) {
      fullHpBarCount += 1;
    }
  }
  const enemyCount = enemies.length;
  if (enemyCount >= 3 && tripleStatusCount >= Math.max(3, Math.ceil(enemyCount * 0.5))) {
    recordNetworkStateAnomaly(game, "enemyStatusFanout", {
      keyframe: !!keyframe,
      ackSeq: Number.isFinite(ackSeq) ? ackSeq : 0,
      enemyCount,
      tripleStatusCount,
      fullHpBarCount
    });
  }

  const localMimicTimer = Number.isFinite(game.necromancerRuntime?.mimicTimer) ? game.necromancerRuntime.mimicTimer : 0;
  const remoteMimics = (Array.isArray(game.remotePlayers) ? game.remotePlayers : [])
    .filter((player) => player?.classType === "necromancer" && (player.necromancerRuntime?.mimicTimer || 0) > 0);
  if (localMimicTimer > 0 || remoteMimics.length > 0) {
    recordNetworkStateAnomaly(game, "playerMimicRuntimeVisible", {
      keyframe: !!keyframe,
      ackSeq: Number.isFinite(ackSeq) ? ackSeq : 0,
      localMimicTimer,
      remoteMimicCount: remoteMimics.length,
      remotePlayerIds: remoteMimics.map((player) => player.id || "").filter(Boolean).slice(0, 6)
    });
  }
}

export function applyServerStateAnomalies(game, anomalies) {
  if (!Array.isArray(anomalies)) return;
  const perf = ensureNetworkPerf(game);
  perf.recentServerStateAnomalies = anomalies
    .filter((entry) => entry && typeof entry === "object")
    .slice(-24)
    .map((entry) => ({ ...entry }));
  perf.serverStateAnomalyEventId = perf.recentServerStateAnomalies.reduce((max, entry) => {
    const id = Number.isFinite(entry?.id) ? entry.id : 0;
    return id > max ? id : max;
  }, 0);
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
