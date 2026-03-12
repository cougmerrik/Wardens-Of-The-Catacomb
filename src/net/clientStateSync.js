export function applyMapStateToGame(game, payload) {
  if (!Array.isArray(payload.map) || payload.map.length === 0) return "";
  const firstRow = payload.map[0];
  const rowLength =
    typeof firstRow === "string"
      ? firstRow.length
      : Array.isArray(firstRow)
      ? firstRow.length
      : 0;
  if (rowLength <= 0) return "";
  const tile = game.config.map.tile;
  game.map = payload.map;
  game.mapWidth = Number.isFinite(payload.mapWidth) ? payload.mapWidth : rowLength;
  game.mapHeight = Number.isFinite(payload.mapHeight) ? payload.mapHeight : payload.map.length;
  game.worldWidth = rowLength * tile;
  game.worldHeight = payload.map.length * tile;
  game.explored = Array.from({ length: payload.map.length }, () => Array(rowLength).fill(false));
  game.navDistance = Array.from({ length: payload.map.length }, () => Array(rowLength).fill(-1));
  game.navPlayerTile = { x: -1, y: -1 };
  return typeof payload.mapSignature === "string" ? payload.mapSignature : `${game.floor}:${game.mapWidth}x${game.mapHeight}`;
}

export function applyMapMetaToGame(game, payload) {
  const mapWidth = Number.isFinite(payload?.mapWidth) ? Math.max(1, Math.floor(payload.mapWidth)) : 0;
  const mapHeight = Number.isFinite(payload?.mapHeight) ? Math.max(1, Math.floor(payload.mapHeight)) : 0;
  if (mapWidth <= 0 || mapHeight <= 0) return "";
  const tile = game.config.map.tile;
  game.mapWidth = mapWidth;
  game.mapHeight = mapHeight;
  game.map = Array.from({ length: mapHeight }, () => Array(mapWidth).fill("#"));
  game.worldWidth = mapWidth * tile;
  game.worldHeight = mapHeight * tile;
  game.explored = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(false));
  game.navDistance = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(-1));
  game.navPlayerTile = { x: -1, y: -1 };
  return typeof payload.mapSignature === "string" ? payload.mapSignature : `${game.floor}:${game.mapWidth}x${game.mapHeight}`;
}

export function applyMapChunkToGame(game, payload) {
  if (!Array.isArray(game.map) || game.map.length === 0) return false;
  const chunkSize = Number.isFinite(payload?.chunkSize) ? Math.max(1, Math.floor(payload.chunkSize)) : 0;
  const cx = Number.isFinite(payload?.cx) ? Math.floor(payload.cx) : NaN;
  const cy = Number.isFinite(payload?.cy) ? Math.floor(payload.cy) : NaN;
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  if (chunkSize <= 0 || !Number.isFinite(cx) || !Number.isFinite(cy) || rows.length === 0) return false;
  const startX = cx * chunkSize;
  const startY = cy * chunkSize;
  let wrote = false;
  for (let r = 0; r < rows.length; r++) {
    const rowData = rows[r];
    if (typeof rowData !== "string" && !Array.isArray(rowData)) continue;
    const y = startY + r;
    if (y < 0 || y >= game.map.length) continue;
    const chars = typeof rowData === "string" ? rowData : rowData.join("");
    for (let c = 0; c < chars.length; c++) {
      const x = startX + c;
      if (x < 0 || x >= game.map[0].length) continue;
      const ch = chars[c];
      if (typeof ch !== "string" || ch.length === 0) continue;
      game.map[y][x] = ch;
      wrote = true;
    }
  }
  return wrote;
}

export function syncByIdLerp(target, source, positionAlpha = 1, decorate) {
  const src = Array.isArray(source) ? source : [];
  if (!Array.isArray(target)) {
    return src.map((entry) => {
      const obj = { ...entry };
      if (decorate) decorate(obj);
      return obj;
    });
  }
  const existingById = new Map();
  for (let i = 0; i < target.length; i++) {
    const item = target[i];
    if (item && item.id != null) existingById.set(item.id, item);
  }
  for (let i = 0; i < src.length; i++) {
    const srcItem = src[i];
    const id = srcItem && srcItem.id != null ? srcItem.id : null;
    let dst = id != null ? existingById.get(id) : target[i];
    if (!dst) {
      dst = { ...srcItem };
    } else {
      const prevX = Number.isFinite(dst.x) ? dst.x : null;
      const prevY = Number.isFinite(dst.y) ? dst.y : null;
      const sx = Number.isFinite(srcItem.x) ? srcItem.x : null;
      const sy = Number.isFinite(srcItem.y) ? srcItem.y : null;
      Object.assign(dst, srcItem);
      if (sx !== null && sy !== null && prevX !== null && prevY !== null && positionAlpha < 1) {
        dst.x = prevX * (1 - positionAlpha) + sx * positionAlpha;
        dst.y = prevY * (1 - positionAlpha) + sy * positionAlpha;
      }
    }
    if (decorate) decorate(dst);
    target[i] = dst;
  }
  target.length = src.length;
  return target;
}

function syncNamedObject(target, source) {
  if (!source || typeof source !== "object") return target;
  if (!target || typeof target !== "object") return { ...source };
  for (const key of Object.keys(source)) {
    const src = source[key];
    if (src && typeof src === "object" && !Array.isArray(src)) {
      target[key] = syncNamedObject(target[key], src);
    } else {
      target[key] = src;
    }
  }
  return target;
}

export function applySnapshotToGame({
  game,
  state,
  controller = false,
  ackSeq = 0,
  isNetworkController = false,
  netPendingInputs = [],
  netLastAckSeq = 0
}) {
  if (!state || typeof state !== "object") return { netPendingInputs, netLastAckSeq };
  let controllerProjectileOffsetX = 0;
  let controllerProjectileOffsetY = 0;

  game.time = Number.isFinite(state.time) ? state.time : game.time;
  game.floor = Number.isFinite(state.floor) ? state.floor : game.floor;
  game.level = Number.isFinite(state.level) ? state.level : game.level;
  game.score = Number.isFinite(state.score) ? state.score : game.score;
  game.gold = Number.isFinite(state.gold) ? state.gold : game.gold;
  game.experience = Number.isFinite(state.experience) ? state.experience : game.experience;
  game.expToNextLevel = Number.isFinite(state.expToNextLevel) ? state.expToNextLevel : game.expToNextLevel;
  game.skillPoints = Number.isFinite(state.skillPoints) ? state.skillPoints : game.skillPoints;
  game.hasKey = !!state.hasKey;
  game.gameOver = !!state.gameOver;
  game.paused = !!state.paused;
  game.shopOpen = !!state.shopOpen;
  game.skillTreeOpen = !!state.skillTreeOpen;
  game.statsPanelOpen = !!state.statsPanelOpen;
  game.warriorMomentumTimer = Number.isFinite(state.warriorMomentumTimer) ? state.warriorMomentumTimer : game.warriorMomentumTimer;
  game.warriorRageActiveTimer = Number.isFinite(state.warriorRageActiveTimer) ? state.warriorRageActiveTimer : game.warriorRageActiveTimer;
  game.warriorRageCooldownTimer = Number.isFinite(state.warriorRageCooldownTimer) ? state.warriorRageCooldownTimer : game.warriorRageCooldownTimer;
  game.skills = syncNamedObject(game.skills, state.skills);
  game.upgrades = syncNamedObject(game.upgrades, state.upgrades);

  if (state.player && typeof state.player === "object") {
    if (!controller) {
      Object.assign(game.player, state.player);
    } else {
      const baseX = Number.isFinite(state.player.x) ? state.player.x : game.player.x;
      const baseY = Number.isFinite(state.player.y) ? state.player.y : game.player.y;
      let correctedX = baseX;
      let correctedY = baseY;
      if (ackSeq > 0) {
        netLastAckSeq = Math.max(netLastAckSeq, ackSeq);
        let keepFrom = 0;
        while (keepFrom < netPendingInputs.length && netPendingInputs[keepFrom].seq <= netLastAckSeq) keepFrom += 1;
        if (keepFrom > 0) netPendingInputs.splice(0, keepFrom);
        const probe = { x: baseX, y: baseY, size: game.player.size };
        for (const entry of netPendingInputs) {
          const mx = entry.moveX;
          const my = entry.moveY;
          if (mx || my) {
            const len = Math.hypot(mx, my) || 1;
            const speed = game.getPlayerMoveSpeed();
            game.moveWithCollision(probe, (mx / len) * speed * entry.dt, (my / len) * speed * entry.dt);
          }
        }
        correctedX = probe.x;
        correctedY = probe.y;
      }

      const dx = correctedX - game.player.x;
      const dy = correctedY - game.player.y;
      const errorSq = dx * dx + dy * dy;
      if (errorSq > 220 * 220) {
        game.player.x = correctedX;
        game.player.y = correctedY;
      } else if (ackSeq > 0 && errorSq > 28 * 28) {
        game.player.x += dx * 0.12;
        game.player.y += dy * 0.12;
      }
      // In controller mode, projectiles can appear to spawn "behind" due to server-authoritative latency.
      // Apply a short-lived visual offset for very new, nearby projectiles.
      controllerProjectileOffsetX = game.player.x - baseX;
      controllerProjectileOffsetY = game.player.y - baseY;
      game.player.health = state.player.health;
      game.player.maxHealth = state.player.maxHealth;
      if (Number.isFinite(state.player.fireCooldown)) game.player.fireCooldown = state.player.fireCooldown;
      if (Number.isFinite(state.player.fireArrowCooldown)) game.player.fireArrowCooldown = state.player.fireArrowCooldown;
      if (Number.isFinite(state.player.hitCooldown)) game.player.hitCooldown = state.player.hitCooldown;
      if (Number.isFinite(state.player.hpBarTimer)) game.player.hpBarTimer = state.player.hpBarTimer;
      game.player.classType = state.player.classType;
      if (!isNetworkController) {
        if (Number.isFinite(state.player.dirX)) game.player.dirX = state.player.dirX;
        if (Number.isFinite(state.player.dirY)) game.player.dirY = state.player.dirY;
        if (Number.isFinite(state.player.facing)) game.player.facing = state.player.facing;
      }
    }
  }

  if (state.door && typeof state.door === "object") game.door = { ...state.door };
  if (state.pickup && typeof state.pickup === "object") game.pickup = { ...state.pickup };
  const snapAlpha = isNetworkController ? 0.72 : 0.62;
  const visuallyAdjustProjectile = (p) => {
    if (!isNetworkController || !controller) return p;
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return p;
    const life = Number.isFinite(p.life) ? p.life : 0;
    if (life < 0.75) return p;
    const dx = p.x - game.player.x;
    const dy = p.y - game.player.y;
    if (dx * dx + dy * dy > 180 * 180) return p;
    return {
      ...p,
      x: p.x + controllerProjectileOffsetX,
      y: p.y + controllerProjectileOffsetY
    };
  };
  game.armorStands = syncByIdLerp(game.armorStands, state.armorStands, 1);
  game.enemies = syncByIdLerp(game.enemies, state.enemies, snapAlpha);
  game.drops = syncByIdLerp(game.drops, state.drops, snapAlpha);
  game.breakables = syncByIdLerp(game.breakables, state.breakables, 1);
  game.bullets = syncByIdLerp(game.bullets, (state.bullets || []).map(visuallyAdjustProjectile), 1);
  game.fireArrows = syncByIdLerp(game.fireArrows, (state.fireArrows || []).map(visuallyAdjustProjectile), 1);
  game.fireZones = syncByIdLerp(game.fireZones, state.fireZones, 1);
  game.meleeSwings = syncByIdLerp(game.meleeSwings, state.meleeSwings, 1);
  game.floatingTexts = syncByIdLerp(game.floatingTexts, state.floatingTexts, 1, (t) => {
    t.maxLife = t.maxLife || t.life;
    t.vy = t.vy || 22;
  });

  return { netPendingInputs, netLastAckSeq };
}
