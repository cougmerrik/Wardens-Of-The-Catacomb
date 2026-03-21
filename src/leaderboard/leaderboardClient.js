export const PLAYER_HANDLE_STORAGE_KEY = "wardens.playerHandle";
export const LEADERBOARD_REQUEST_TIMEOUT_MS = 5000;

const CLASS_LABELS = {
  archer: "Elvish Archer",
  fighter: "Castle Warrior",
  warrior: "Castle Warrior",
  necromancer: "Reformed Necromancer"
};

export function sanitizePlayerHandle(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/\s+/g, " ").trim().slice(0, 20);
  return normalized || fallback;
}

export function loadStoredPlayerHandle(storage = globalThis?.localStorage) {
  if (!storage || typeof storage.getItem !== "function") return "";
  try {
    return sanitizePlayerHandle(storage.getItem(PLAYER_HANDLE_STORAGE_KEY) || "");
  } catch {
    return "";
  }
}

export function persistPlayerHandle(handle, storage = globalThis?.localStorage) {
  if (!storage || typeof storage.setItem !== "function") return false;
  const normalized = sanitizePlayerHandle(handle);
  if (!normalized) return false;
  try {
    storage.setItem(PLAYER_HANDLE_STORAGE_KEY, normalized);
    return true;
  } catch {
    return false;
  }
}

export function getDefaultLeaderboardServerUrl(locationObject = globalThis?.location) {
  const protocol = locationObject?.protocol === "https:" ? "wss" : "ws";
  const hostname = locationObject?.hostname || "localhost";
  return `${protocol}://${hostname}:8090`;
}

export function getClassLabel(classType) {
  return CLASS_LABELS[classType] || CLASS_LABELS.archer;
}

export function compareLeaderboardEntries(a, b) {
  const scoreDiff = (Number.isFinite(b?.score) ? b.score : 0) - (Number.isFinite(a?.score) ? a.score : 0);
  if (scoreDiff !== 0) return scoreDiff;
  const floorDiff = (Number.isFinite(b?.floorReached) ? b.floorReached : 0) - (Number.isFinite(a?.floorReached) ? a.floorReached : 0);
  if (floorDiff !== 0) return floorDiff;
  const timeDiff = (Number.isFinite(b?.timeSeconds) ? b.timeSeconds : 0) - (Number.isFinite(a?.timeSeconds) ? a.timeSeconds : 0);
  if (timeDiff !== 0) return timeDiff;
  return (Number.isFinite(a?.submittedAt) ? a.submittedAt : 0) - (Number.isFinite(b?.submittedAt) ? b.submittedAt : 0);
}

export function normalizeLeaderboardRow(row = {}) {
  const classType = row.classType === "fighter" || row.classType === "warrior" || row.classType === "necromancer"
    ? row.classType === "warrior" ? "fighter" : row.classType
    : "archer";
  return {
    handle: sanitizePlayerHandle(row.handle, "Player"),
    classType,
    score: Number.isFinite(row.score) ? Math.max(0, Math.floor(row.score)) : 0,
    timeSeconds: Number.isFinite(row.timeSeconds) ? Math.max(0, Math.floor(row.timeSeconds)) : 0,
    floorReached: Number.isFinite(row.floorReached) ? Math.max(1, Math.floor(row.floorReached)) : 1,
    submittedAt: Number.isFinite(row.submittedAt) ? row.submittedAt : Date.now()
  };
}

export function buildLocalRunSummary(game, handle) {
  return normalizeLeaderboardRow({
    handle,
    classType: game?.classType,
    score: game?.score,
    timeSeconds: game?.time,
    floorReached: game?.floor,
    submittedAt: Date.now()
  });
}

export function formatLeaderboardDuration(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function requestLeaderboard(wsUrl, payload) {
  return new Promise((resolve, reject) => {
    if (!wsUrl || typeof WebSocket === "undefined") {
      reject(new Error("Leaderboard connection is unavailable."));
      return;
    }
    const requestId = `lb_${Math.random().toString(36).slice(2, 10)}`;
    const socket = new WebSocket(wsUrl);
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        socket.close();
      } catch {}
      reject(new Error("Leaderboard request timed out."));
    }, LEADERBOARD_REQUEST_TIMEOUT_MS);
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {}
      callback();
    };
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ ...payload, requestId }));
    });
    socket.addEventListener("message", (event) => {
      let message = null;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!message || message.requestId !== requestId) return;
      if (message.type === "leaderboard.rows") {
        finish(() => resolve({
          rows: Array.isArray(message.rows) ? message.rows.map(normalizeLeaderboardRow) : [],
          accepted: message.accepted !== false
        }));
        return;
      }
      if (message.type === "error") {
        finish(() => reject(new Error(message.message || "Leaderboard request failed.")));
      }
    });
    socket.addEventListener("error", () => {
      finish(() => reject(new Error("Unable to reach the leaderboard server.")));
    });
    socket.addEventListener("close", () => {
      if (!settled) finish(() => reject(new Error("Leaderboard connection closed before completing the request.")));
    });
  });
}

export function fetchGlobalLeaderboard(wsUrl) {
  return requestLeaderboard(wsUrl, { type: "leaderboard.get" });
}

export function submitLocalRunToLeaderboard(wsUrl, run) {
  return requestLeaderboard(wsUrl, {
    type: "leaderboard.submit",
    run: normalizeLeaderboardRow(run)
  });
}
