import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const DEFAULT_STORE_PATH = resolve(process.cwd(), "data", "leaderboard.json");
export const MAX_GLOBAL_ROWS = 25;
export const LEADERBOARD_BOARD_SOLO = "solo";
export const LEADERBOARD_BOARD_GROUP = "group";

export function sanitizeHandle(value) {
  if (typeof value !== "string") return "Player";
  const normalized = value
    .replace(/[^A-Za-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12);
  return normalized || "Player";
}

export function normalizeBoardType(value) {
  return value === LEADERBOARD_BOARD_GROUP ? LEADERBOARD_BOARD_GROUP : LEADERBOARD_BOARD_SOLO;
}

export function normalizeClassType(value) {
  return value === "fighter" || value === "warrior" || value === "necromancer"
    ? (value === "warrior" ? "fighter" : value)
    : "archer";
}

export function normalizeRow(row = {}) {
  const boardType = normalizeBoardType(row.boardType);
  const handles = Array.isArray(row.handles) && row.handles.length > 0
    ? row.handles.map((handle) => sanitizeHandle(handle)).filter((handle) => !!handle)
    : [sanitizeHandle(row.handle)];
  const classTypes = Array.isArray(row.classTypes) && row.classTypes.length > 0
    ? row.classTypes.map((classType) => normalizeClassType(classType))
    : [normalizeClassType(row.classType)];
  return {
    boardType,
    handle: handles[0] || "Player",
    classType: classTypes[0] || "archer",
    handles,
    classTypes,
    score: Number.isFinite(row.score) ? Math.max(0, Math.floor(row.score)) : 0,
    timeSeconds: Number.isFinite(row.timeSeconds) ? Math.max(0, Math.floor(row.timeSeconds)) : 0,
    floorReached: Number.isFinite(row.floorReached) ? Math.max(1, Math.floor(row.floorReached)) : 1,
    submittedAt: Number.isFinite(row.submittedAt) ? row.submittedAt : Date.now()
  };
}

export function compareRows(a, b) {
  const scoreDiff = b.score - a.score;
  if (scoreDiff !== 0) return scoreDiff;
  const floorDiff = b.floorReached - a.floorReached;
  if (floorDiff !== 0) return floorDiff;
  const timeDiff = b.timeSeconds - a.timeSeconds;
  if (timeDiff !== 0) return timeDiff;
  return a.submittedAt - b.submittedAt;
}

export class LeaderboardStore {
  constructor(path = DEFAULT_STORE_PATH) {
    this.path = path;
    this.rows = [];
    this.load();
  }

  load() {
    if (!existsSync(this.path)) {
      this.rows = [];
      return;
    }
    try {
      const raw = JSON.parse(readFileSync(this.path, "utf8"));
      const rows = Array.isArray(raw?.rows) ? raw.rows : [];
      this.rows = rows.map(normalizeRow);
      this.trimRows();
    } catch {
      this.rows = [];
    }
  }

  trimRows() {
    const nextRows = [];
    const byBoard = new Map();
    for (const row of this.rows.map(normalizeRow)) {
      const boardType = normalizeBoardType(row.boardType);
      if (!byBoard.has(boardType)) byBoard.set(boardType, []);
      byBoard.get(boardType).push(row);
    }
    for (const boardType of [LEADERBOARD_BOARD_SOLO, LEADERBOARD_BOARD_GROUP]) {
      nextRows.push(...(byBoard.get(boardType) || []).sort(compareRows).slice(0, MAX_GLOBAL_ROWS));
    }
    this.rows = nextRows;
  }

  save() {
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, `${JSON.stringify({ rows: this.rows }, null, 2)}\n`, "utf8");
  }

  getRows(boardType = LEADERBOARD_BOARD_SOLO) {
    const normalizedBoardType = normalizeBoardType(boardType);
    return this.rows
      .filter((row) => normalizeBoardType(row.boardType) === normalizedBoardType)
      .sort(compareRows)
      .slice(0, MAX_GLOBAL_ROWS)
      .map((row) => ({ ...row }));
  }

  submitRun(run) {
    const normalizedRun = normalizeRow(run);
    const boardType = normalizeBoardType(normalizedRun.boardType);
    const preservedRows = this.rows.filter((row) => normalizeBoardType(row.boardType) !== boardType);
    const boardRows = [...this.rows.filter((row) => normalizeBoardType(row.boardType) === boardType), normalizedRun]
      .map(normalizeRow)
      .sort(compareRows)
      .slice(0, MAX_GLOBAL_ROWS);
    this.rows = [...preservedRows, ...boardRows];
    this.save();
    return this.getRows(boardType);
  }
}
