import { compareRows, LEADERBOARD_BOARD_GROUP, LEADERBOARD_BOARD_SOLO, MAX_GLOBAL_ROWS, normalizeBoardType, normalizeRow } from "./leaderboardStore.js";

const DEFAULT_UPSTASH_KEY = "wardens:leaderboard";

function buildCommandUrl(baseUrl, ...parts) {
  const trimmed = String(baseUrl || "").replace(/\/+$/, "");
  const encoded = parts.map((part) => encodeURIComponent(String(part)));
  return `${trimmed}/${encoded.join("/")}`;
}

async function upstashRequest(baseUrl, token, ...parts) {
  const response = await fetch(buildCommandUrl(baseUrl, ...parts), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `Upstash request failed with ${response.status}`);
  }
  return payload?.result;
}

export class UpstashLeaderboardStore {
  constructor({
    url = process.env.UPSTASH_REDIS_REST_URL,
    token = process.env.UPSTASH_REDIS_REST_TOKEN,
    key = process.env.LEADERBOARD_UPSTASH_KEY || DEFAULT_UPSTASH_KEY
  } = {}) {
    if (!url || !token) {
      throw new Error("Missing Upstash Redis REST configuration.");
    }
    this.url = url;
    this.token = token;
    this.key = key;
  }

  async readAllRows() {
    const raw = await upstashRequest(this.url, this.token, "get", this.key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(String(raw));
      const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
      const nextRows = [];
      const byBoard = new Map();
      for (const row of rows.map(normalizeRow)) {
        const boardType = normalizeBoardType(row.boardType);
        if (!byBoard.has(boardType)) byBoard.set(boardType, []);
        byBoard.get(boardType).push(row);
      }
      for (const boardType of [LEADERBOARD_BOARD_SOLO, LEADERBOARD_BOARD_GROUP]) {
        nextRows.push(...(byBoard.get(boardType) || []).sort(compareRows).slice(0, MAX_GLOBAL_ROWS));
      }
      return nextRows;
    } catch {
      return [];
    }
  }

  async getRows(boardType = LEADERBOARD_BOARD_SOLO) {
    const normalizedBoardType = normalizeBoardType(boardType);
    return (await this.readAllRows())
      .filter((row) => normalizeBoardType(row.boardType) === normalizedBoardType)
      .sort(compareRows)
      .slice(0, MAX_GLOBAL_ROWS)
      .map((row) => ({ ...row }));
  }

  async submitRun(run) {
    const normalizedRun = normalizeRow(run);
    const boardType = normalizeBoardType(normalizedRun.boardType);
    const allRows = await this.readAllRows();
    const preservedRows = allRows.filter((row) => normalizeBoardType(row.boardType) !== boardType);
    const boardRows = [...allRows.filter((row) => normalizeBoardType(row.boardType) === boardType), normalizedRun]
      .map(normalizeRow)
      .sort(compareRows)
      .slice(0, MAX_GLOBAL_ROWS);
    await upstashRequest(this.url, this.token, "set", this.key, JSON.stringify({ rows: [...preservedRows, ...boardRows] }));
    return boardRows.map((row) => ({ ...row }));
  }
}
