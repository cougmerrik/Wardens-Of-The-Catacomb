const FPS_SMOOTHING = 0.12;
const NET_SMOOTHING = 0.2;
const FRAME_WINDOW_SIZE = 120;
const FRAME_SPIKE_THRESHOLD_MS = 50;
const FRAME_SPIKE_HISTORY_SIZE = 24;

function smooth(previous, next, factor) {
  if (!Number.isFinite(next)) return Number.isFinite(previous) ? previous : 0;
  if (!Number.isFinite(previous) || previous <= 0) return next;
  return previous + (next - previous) * factor;
}

function formatCount(value) {
  if (!Number.isFinite(value)) return "-";
  return `${Math.round(value)}`;
}

function formatMs(value) {
  if (!Number.isFinite(value)) return "-";
  if (value > 0 && value < 0.1) return "<0.1ms";
  if (Math.abs(value) < 10) return `${value.toFixed(1)}ms`;
  return `${Math.round(value)}ms`;
}

function percentile(values, pct) {
  const sorted = values.filter((value) => Number.isFinite(value)).slice().sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.ceil((pct / 100) * sorted.length) - 1));
  return sorted[idx];
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

function isDevStatsEnabled() {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("dev") === "1";
  } catch {
    return false;
  }
}

export function syncDebugHudStatsDom(game) {
  if (typeof document === "undefined") return;
  const el = document.getElementById("net-debug-stats");
  if (!el) return;
  const shouldShow = !!(game?.debugHudEnabled && game.networkEnabled) || isDevStatsEnabled();
  if (!shouldShow) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  const stats = game?.debugHudStats && typeof game.debugHudStats === "object" ? game.debugHudStats : {};
  const net = stats.network && typeof stats.network === "object" ? stats.network : {};
  el.hidden = false;
  const role = escapeHtml(game?.networkRole || net.role || "Idle");
  el.innerHTML = [
    `<span class="net-debug-stats__title">NETWORK STATS</span>`,
    `<span class="net-debug-stats__row"><span class="net-debug-stats__label">Role</span><span class="net-debug-stats__value">${role}</span></span>`,
    `<span class="net-debug-stats__row"><span class="net-debug-stats__label">FPS</span><span class="net-debug-stats__value">${formatCount(stats.frameWindowFps || stats.fps)} (${formatMs(stats.frameWindowP95Ms)} p95)</span></span>`,
    `<span class="net-debug-stats__row"><span class="net-debug-stats__label">Ping RTT</span><span class="net-debug-stats__value">${formatMs(net.pingMs)}</span></span>`,
    `<span class="net-debug-stats__row"><span class="net-debug-stats__label">Latency est.</span><span class="net-debug-stats__value">${formatMs(net.latencyMs)}</span></span>`,
    `<span class="net-debug-stats__row"><span class="net-debug-stats__label">Jitter</span><span class="net-debug-stats__value">${formatMs(net.jitterMs)}</span></span>`,
    `<span class="net-debug-stats__row"><span class="net-debug-stats__label">Buffer / Inputs</span><span class="net-debug-stats__value">${formatCount(net.snapshotBuffer)} / ${formatCount(net.pendingInputs)}</span></span>`
  ].join("");
}

export function updateDebugHudFrameStats(game, frameMs) {
  if (!game) return null;
  const stats = game.debugHudStats && typeof game.debugHudStats === "object" ? game.debugHudStats : {};
  const safeFrameMs = Number.isFinite(frameMs) && frameMs > 0 ? frameMs : 0;
  const rawFps = safeFrameMs > 0 ? 1000 / safeFrameMs : 0;
  const recentFrameMs = Array.isArray(stats.recentFrameMs) ? stats.recentFrameMs : [];
  if (safeFrameMs > 0) {
    recentFrameMs.push(safeFrameMs);
    if (recentFrameMs.length > FRAME_WINDOW_SIZE) recentFrameMs.splice(0, recentFrameMs.length - FRAME_WINDOW_SIZE);
  }
  const frameWindowTotalMs = recentFrameMs.reduce((sum, value) => sum + value, 0);
  const frameWindowAvgMs = recentFrameMs.length > 0 ? frameWindowTotalMs / recentFrameMs.length : 0;
  stats.frameMs = smooth(stats.frameMs, safeFrameMs, FPS_SMOOTHING);
  stats.fps = safeFrameMs > 0 ? smooth(stats.fps, rawFps, FPS_SMOOTHING) : stats.fps || 0;
  stats.rawFrameMs = safeFrameMs;
  stats.rawFps = rawFps;
  stats.frameCount = (Number.isFinite(stats.frameCount) ? stats.frameCount : 0) + (safeFrameMs > 0 ? 1 : 0);
  stats.frameWindowSampleCount = recentFrameMs.length;
  stats.frameWindowAvgMs = frameWindowAvgMs;
  stats.frameWindowFps = frameWindowAvgMs > 0 ? 1000 / frameWindowAvgMs : 0;
  stats.frameWindowP95Ms = percentile(recentFrameMs, 95);
  stats.frameWindowMaxMs = recentFrameMs.length > 0 ? Math.max(...recentFrameMs) : 0;
  stats.recentFrameMs = recentFrameMs;
  if (safeFrameMs > FRAME_SPIKE_THRESHOLD_MS) {
    const recentFrameSpikes = Array.isArray(stats.recentFrameSpikes) ? stats.recentFrameSpikes : [];
    const id = (Number.isFinite(stats.frameSpikeEventId) ? stats.frameSpikeEventId : 0) + 1;
    stats.frameSpikeEventId = id;
    stats.frameSpikeCount = (Number.isFinite(stats.frameSpikeCount) ? stats.frameSpikeCount : 0) + 1;
    recentFrameSpikes.push({
      id,
      atMs: typeof performance !== "undefined" ? Math.round(performance.now()) : Date.now(),
      frameMs: safeFrameMs,
      rawFps,
      frameWindowFps: stats.frameWindowFps,
      frameWindowP95Ms: stats.frameWindowP95Ms,
      frameWindowMaxMs: stats.frameWindowMaxMs,
      frameWindowSampleCount: stats.frameWindowSampleCount
    });
    if (recentFrameSpikes.length > FRAME_SPIKE_HISTORY_SIZE) {
      recentFrameSpikes.splice(0, recentFrameSpikes.length - FRAME_SPIKE_HISTORY_SIZE);
    }
    stats.recentFrameSpikes = recentFrameSpikes;
  }
  stats.updatedAtMs = typeof performance !== "undefined" ? performance.now() : Date.now();
  game.debugHudStats = stats;
  syncDebugHudStatsDom(game);
  return stats;
}

export function updateDebugHudNetworkStats(game, values = {}) {
  if (!game) return null;
  const stats = game.debugHudStats && typeof game.debugHudStats === "object" ? game.debugHudStats : {};
  stats.network = stats.network && typeof stats.network === "object" ? stats.network : {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string" || typeof value === "boolean" || value === null) {
      stats.network[key] = value;
    } else if (Number.isFinite(value)) {
      stats.network[key] = key === "pingMs" || key === "latencyMs" || key === "snapshotAgeMs"
        ? smooth(stats.network[key], value, NET_SMOOTHING)
        : value;
    }
  }
  stats.network.updatedAtMs = typeof performance !== "undefined" ? performance.now() : Date.now();
  game.debugHudStats = stats;
  syncDebugHudStatsDom(game);
  return stats;
}
