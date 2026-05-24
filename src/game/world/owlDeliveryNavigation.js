const TILE_FALLBACK = 32;

export function getOwlTileSize(game) {
  return game?.config?.map?.tile || TILE_FALLBACK;
}

export function isOwlNavigableTile(game, tx, ty) {
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) return false;
  tx = Math.floor(tx);
  ty = Math.floor(ty);
  if (tx < 0 || ty < 0 || ty >= (game.mapHeight || game.map?.length || 0) || tx >= (game.mapWidth || game.map?.[0]?.length || 0)) return false;
  const row = game.map?.[ty];
  const ch = Array.isArray(row) ? row[tx] : typeof row === "string" ? row[tx] : "#";
  return ch !== "#" && ch !== "B" && ch !== "?";
}

export function owlTileCenter(game, tx, ty) {
  const tile = getOwlTileSize(game);
  return { x: tx * tile + tile * 0.5, y: ty * tile + tile * 0.5 };
}

export function findOwlPath(game, fromX, fromY, toX, toY) {
  const tile = getOwlTileSize(game);
  const width = Math.max(1, game.mapWidth || game.map?.[0]?.length || 1);
  const height = Math.max(1, game.mapHeight || game.map?.length || 1);
  const sx = Math.floor(fromX / tile);
  const sy = Math.floor(fromY / tile);
  const gx = Math.floor(toX / tile);
  const gy = Math.floor(toY / tile);
  if (!isOwlNavigableTile(game, sx, sy) || !isOwlNavigableTile(game, gx, gy)) return null;
  const startKey = `${sx},${sy}`;
  const goalKey = `${gx},${gy}`;
  const queue = [[sx, sy]];
  const prev = new Map([[startKey, null]]);
  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head];
    if (x === gx && y === gy) break;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const key = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height || prev.has(key) || !isOwlNavigableTile(game, nx, ny)) continue;
      prev.set(key, `${x},${y}`);
      queue.push([nx, ny]);
    }
  }
  if (!prev.has(goalKey)) return null;
  const path = [];
  for (let key = goalKey; key; key = prev.get(key)) {
    const [x, y] = key.split(",").map(Number);
    path.push({ tx: x, ty: y, ...owlTileCenter(game, x, y) });
  }
  return path.reverse();
}

export function buildOwlDistanceMap(game, toX, toY) {
  const tile = getOwlTileSize(game);
  const width = Math.max(1, game.mapWidth || game.map?.[0]?.length || 1);
  const height = Math.max(1, game.mapHeight || game.map?.length || 1);
  const gx = Math.floor(toX / tile);
  const gy = Math.floor(toY / tile);
  if (!isOwlNavigableTile(game, gx, gy)) return null;
  const size = width * height;
  const dist = new Int16Array(size);
  dist.fill(-1);
  const index = (x, y) => y * width + x;
  const queue = [[gx, gy]];
  dist[index(gx, gy)] = 0;
  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head];
    const nextDist = dist[index(x, y)] + 1;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height || dist[index(nx, ny)] >= 0 || !isOwlNavigableTile(game, nx, ny)) continue;
      dist[index(nx, ny)] = nextDist;
      queue.push([nx, ny]);
    }
  }
  return { width, height, gx, gy, dist };
}

export function reconstructOwlPathFromDistanceMap(game, distanceMap, fromX, fromY) {
  const tile = getOwlTileSize(game);
  const sx = Math.floor(fromX / tile);
  const sy = Math.floor(fromY / tile);
  const { width, height, gx, gy, dist } = distanceMap || {};
  const index = (x, y) => y * width + x;
  if (!width || sx < 0 || sy < 0 || sx >= width || sy >= height || dist[index(sx, sy)] < 0) return null;
  const path = [];
  let x = sx;
  let y = sy;
  while (true) {
    path.push({ tx: x, ty: y, ...owlTileCenter(game, x, y) });
    if (x === gx && y === gy) break;
    let best = null;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nd = dist[index(nx, ny)];
      if (nd >= 0 && nd < dist[index(x, y)] && (!best || nd < best.dist)) best = { x: nx, y: ny, dist: nd };
    }
    if (!best) return null;
    x = best.x;
    y = best.y;
  }
  return path;
}
