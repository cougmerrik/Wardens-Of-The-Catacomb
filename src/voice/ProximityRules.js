export const DEFAULT_PROXIMITY_RULES = {
  nearPx: 72,
  farPx: 960,
  floorGain: 0,
  rolloff: 2.4,
  wallOcclusionGain: 0.12,
  closedDoorGain: 0.24,
  clearFilterHz: 16000,
  wallFilterHz: 720,
  doorFilterHz: 1300,
  maxRoomSearchTiles: 20
};

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function computeDistanceGain(distancePx, rules = DEFAULT_PROXIMITY_RULES) {
  const nearPx = Math.max(1, Number.isFinite(rules.nearPx) ? rules.nearPx : DEFAULT_PROXIMITY_RULES.nearPx);
  const farPx = Math.max(nearPx + 1, Number.isFinite(rules.farPx) ? rules.farPx : DEFAULT_PROXIMITY_RULES.farPx);
  const floorGain = clamp01(Number.isFinite(rules.floorGain) ? rules.floorGain : DEFAULT_PROXIMITY_RULES.floorGain);
  if (!Number.isFinite(distancePx) || distancePx <= nearPx) return 1;
  if (distancePx >= farPx) return floorGain;
  const t = clamp01((distancePx - nearPx) / (farPx - nearPx));
  const curve = 1 - Math.pow(t, Number.isFinite(rules.rolloff) ? Math.max(0.1, rules.rolloff) : DEFAULT_PROXIMITY_RULES.rolloff);
  return floorGain + (1 - floorGain) * curve;
}

export function computeStereoPan(listener, source, maxPanDistancePx = 360) {
  if (!listener || !source) return 0;
  const dx = (Number.isFinite(source.x) ? source.x : 0) - (Number.isFinite(listener.x) ? listener.x : 0);
  const denom = Math.max(1, Number.isFinite(maxPanDistancePx) ? maxPanDistancePx : 360);
  return Math.max(-1, Math.min(1, dx / denom));
}

export function hasClosedDoorBetween(game, listener, source) {
  const door = game?.door;
  if (!door || door.open === true) return false;
  if (!Number.isFinite(door.x) || !Number.isFinite(door.y) || !listener || !source) return false;
  const ax = Number.isFinite(listener.x) ? listener.x : 0;
  const ay = Number.isFinite(listener.y) ? listener.y : 0;
  const bx = Number.isFinite(source.x) ? source.x : 0;
  const by = Number.isFinite(source.y) ? source.y : 0;
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq <= 0.0001) return false;
  const t = Math.max(0, Math.min(1, ((door.x - ax) * abx + (door.y - ay) * aby) / lenSq));
  const px = ax + abx * t;
  const py = ay + aby * t;
  return Math.hypot(door.x - px, door.y - py) <= 52;
}

function getTileAt(game, tx, ty) {
  if (!game || !Array.isArray(game.map) || !Number.isFinite(tx) || !Number.isFinite(ty)) return "#";
  if (ty < 0 || tx < 0 || ty >= game.map.length || tx >= game.map[0].length) return "#";
  const row = game.map[ty];
  return typeof row === "string" ? row[tx] : Array.isArray(row) ? row[tx] : "#";
}

function isAcousticPassableTile(game, tx, ty) {
  const tile = getTileAt(game, tx, ty);
  if (tile === "#" || tile === "?") return false;
  if (tile === "D" && game?.door?.open !== true) return false;
  return true;
}

export function areInSameAcousticRoom(game, listener, source, rules = DEFAULT_PROXIMITY_RULES) {
  const tileSize = game?.config?.map?.tile || 32;
  const sx = Math.floor((Number.isFinite(listener?.x) ? listener.x : 0) / tileSize);
  const sy = Math.floor((Number.isFinite(listener?.y) ? listener.y : 0) / tileSize);
  const tx = Math.floor((Number.isFinite(source?.x) ? source.x : 0) / tileSize);
  const ty = Math.floor((Number.isFinite(source?.y) ? source.y : 0) / tileSize);
  if (sx === tx && sy === ty) return true;
  if (!isAcousticPassableTile(game, sx, sy) || !isAcousticPassableTile(game, tx, ty)) return false;
  const maxTiles = Math.max(1, Math.floor(rules.maxRoomSearchTiles || DEFAULT_PROXIMITY_RULES.maxRoomSearchTiles));
  if (Math.abs(tx - sx) + Math.abs(ty - sy) > maxTiles * 2) return false;
  const minX = Math.max(0, Math.min(sx, tx) - maxTiles);
  const maxX = Math.min((game.map?.[0]?.length || 1) - 1, Math.max(sx, tx) + maxTiles);
  const minY = Math.max(0, Math.min(sy, ty) - maxTiles);
  const maxY = Math.min((game.map?.length || 1) - 1, Math.max(sy, ty) + maxTiles);
  const seen = new Set([`${sx},${sy}`]);
  const queue = [{ x: sx, y: sy }];
  for (let i = 0; i < queue.length; i += 1) {
    const cur = queue[i];
    for (const dir of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
      const nx = cur.x + dir.x;
      const ny = cur.y + dir.y;
      if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
      if (!isAcousticPassableTile(game, nx, ny)) continue;
      if (nx === tx && ny === ty) return true;
      const key = `${nx},${ny}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return false;
}

export function computeOcclusion(game, listener, source, rules = DEFAULT_PROXIMITY_RULES) {
  if (hasClosedDoorBetween(game, listener, source)) {
    return {
      gain: clamp01(Number.isFinite(rules.closedDoorGain) ? rules.closedDoorGain : DEFAULT_PROXIMITY_RULES.closedDoorGain),
      filterFrequency: Number.isFinite(rules.doorFilterHz) ? rules.doorFilterHz : DEFAULT_PROXIMITY_RULES.doorFilterHz
    };
  }
  if (!areInSameAcousticRoom(game, listener, source, rules)) {
    return {
      gain: clamp01(Number.isFinite(rules.wallOcclusionGain) ? rules.wallOcclusionGain : DEFAULT_PROXIMITY_RULES.wallOcclusionGain),
      filterFrequency: Number.isFinite(rules.wallFilterHz) ? rules.wallFilterHz : DEFAULT_PROXIMITY_RULES.wallFilterHz
    };
  }
  return {
    gain: 1,
    filterFrequency: Number.isFinite(rules.clearFilterHz) ? rules.clearFilterHz : DEFAULT_PROXIMITY_RULES.clearFilterHz
  };
}
