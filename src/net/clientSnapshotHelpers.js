export function syncNamedObject(target, source) {
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

function hasOwn(obj, key) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function floatingTextSignature(text, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return "";
  return `${String(text ?? "")}@${Math.round(x)}:${Math.round(y)}`;
}

function rememberNetworkFloatingTextSignature(game, text, x, y) {
  if (!game) return;
  if (!Array.isArray(game.networkFloatingTextEventSignatures)) game.networkFloatingTextEventSignatures = [];
  const signature = floatingTextSignature(text, x, y);
  if (!signature) return;
  game.networkFloatingTextEventSignatures.push(signature);
  if (game.networkFloatingTextEventSignatures.length > 96) {
    game.networkFloatingTextEventSignatures.splice(0, game.networkFloatingTextEventSignatures.length - 96);
  }
}

function hasRecentNetworkFloatingText(game, text, x, y) {
  const signature = floatingTextSignature(text, x, y);
  return !!signature && Array.isArray(game?.networkFloatingTextEventSignatures) && game.networkFloatingTextEventSignatures.includes(signature);
}

export function applyNetworkFloatingTextEvents(game, events) {
  if (!game || !Array.isArray(events) || events.length === 0) return;
  if (!Array.isArray(game.floatingTexts)) game.floatingTexts = [];
  if (!game.networkFloatingTextEventIds || typeof game.networkFloatingTextEventIds.has !== "function") {
    game.networkFloatingTextEventIds = new Set();
  }
  if (!Array.isArray(game.networkFloatingTextEventIdOrder)) game.networkFloatingTextEventIdOrder = [];
  for (const event of events) {
    if (!event || typeof event.id !== "string" || !event.id || game.networkFloatingTextEventIds.has(event.id)) continue;
    const x = Number.isFinite(event.x) ? event.x : null;
    const y = Number.isFinite(event.y) ? event.y : null;
    if (x === null || y === null) continue;
    const text = String(event.text ?? "");
    const color = typeof event.color === "string" && event.color ? event.color : "#ffffff";
    const life = Number.isFinite(event.life) ? event.life : 0.75;
    const size = Number.isFinite(event.size) ? event.size : 14;
    const vy = Number.isFinite(event.vy) ? event.vy : 22;
    game.floatingTexts.push({ x, y, text, color, life, maxLife: life, vy, size });
    game.networkFloatingTextEventIds.add(event.id);
    game.networkFloatingTextEventIdOrder.push(event.id);
    rememberNetworkFloatingTextSignature(game, text, x, y);
  }
  if (game.networkFloatingTextEventIdOrder.length > 256) {
    const trimCount = game.networkFloatingTextEventIdOrder.length - 256;
    const removed = game.networkFloatingTextEventIdOrder.splice(0, trimCount);
    for (const id of removed) game.networkFloatingTextEventIds.delete(id);
  }
}

export function resetNetworkFloatingTextEventCache(game) {
  if (!game) return;
  game.networkFloatingTextEventIds = new Set();
  game.networkFloatingTextEventIdOrder = [];
  game.networkFloatingTextEventSignatures = [];
}

export function syncFloorBossState(target, source, game) {
  if (!source || typeof source !== "object") return target;
  const base =
    target && typeof target === "object"
      ? target
      : typeof game?.createFloorBossState === "function"
      ? game.createFloorBossState(Number.isFinite(source.floor) ? source.floor : game.floor)
      : {};
  Object.assign(base, source);
  return base;
}

export function captureEnemyStateById(enemies) {
  const byId = new Map();
  for (const enemy of Array.isArray(enemies) ? enemies : []) {
    if (!enemy || enemy.id == null) continue;
    byId.set(enemy.id, {
      hp: Number.isFinite(enemy.hp) ? enemy.hp : null,
      x: Number.isFinite(enemy.x) ? enemy.x : null,
      y: Number.isFinite(enemy.y) ? enemy.y : null,
      size: Number.isFinite(enemy.size) ? enemy.size : 20
    });
  }
  return byId;
}

export function capturePlayerProgressById(game) {
  const byId = new Map();
  if (game?.player?.id) {
    byId.set(game.player.id, {
      level: Number.isFinite(game.level) ? game.level : Number.isFinite(game.player.level) ? game.player.level : 1,
      skillPoints: Number.isFinite(game.skillPoints) ? game.skillPoints : Number.isFinite(game.player.skillPoints) ? game.player.skillPoints : 0,
      gold: Number.isFinite(game.gold) ? game.gold : Number.isFinite(game.player.gold) ? game.player.gold : 0,
      x: Number.isFinite(game.player.x) ? game.player.x : null,
      y: Number.isFinite(game.player.y) ? game.player.y : null
    });
  }
  const players = [];
  for (const player of Array.isArray(game?.remotePlayers) ? game.remotePlayers : []) players.push(player);
  for (const player of players) {
    if (!player?.id) continue;
    byId.set(player.id, {
      level: Number.isFinite(player.level) ? player.level : 1,
      skillPoints: Number.isFinite(player.skillPoints) ? player.skillPoints : 0,
      gold: Number.isFinite(player.gold) ? player.gold : 0,
      x: Number.isFinite(player.x) ? player.x : null,
      y: Number.isFinite(player.y) ? player.y : null
    });
  }
  return byId;
}

function spawnEnemyDamageText(game, enemy, previous, damage) {
  if (!game || typeof game.spawnFloatingText !== "function" || !(damage >= 0.5)) return false;
  const textValue = Math.max(1, Math.round(damage));
  const x = Number.isFinite(enemy?.x) ? enemy.x : previous?.x;
  const y = Number.isFinite(enemy?.y) ? enemy.y : previous?.y;
  const size = Number.isFinite(enemy?.size) ? enemy.size : previous?.size;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const text = `-${textValue}`;
  const textY = y - (size || 20) * 0.65;
  if (!hasRecentNetworkFloatingText(game, text, x, textY)) {
    game.spawnFloatingText(x, textY, text, "#e85c5c");
  }
  if (enemy) enemy.hpBarTimer = Math.max(Number.isFinite(enemy.hpBarTimer) ? enemy.hpBarTimer : 0, game.config?.enemy?.hpBarDuration || 0.9);
  return true;
}

export function findSnapshotLocalPlayer(state, localPlayerId) {
  const snapshotPlayers = Array.isArray(state?.players) ? state.players : [];
  if (localPlayerId) {
    const exact = snapshotPlayers.find((player) => player && player.id === localPlayerId);
    if (exact) return exact;
  }
  if (state?.player && typeof state.player === "object") return state.player;
  return snapshotPlayers[0] && typeof snapshotPlayers[0] === "object" ? snapshotPlayers[0] : null;
}

export function getPredictionPressure(game) {
  const hostiles = Array.isArray(game?.enemies)
    ? game.enemies.filter((enemy) => enemy && (enemy.hp || 0) > 0 && (!game.isEnemyFriendlyToPlayer || !game.isEnemyFriendlyToPlayer(enemy)))
    : [];
  const playerX = Number.isFinite(game?.player?.x) ? game.player.x : 0;
  const playerY = Number.isFinite(game?.player?.y) ? game.player.y : 0;
  let closestHostilePx = Infinity;
  let nearbyHostileCount = 0;
  for (const enemy of hostiles) {
    const dist = Math.hypot((enemy.x || 0) - playerX, (enemy.y || 0) - playerY);
    if (dist < closestHostilePx) closestHostilePx = dist;
    if (dist <= 132) nearbyHostileCount += 1;
  }
  const perf = game?.networkPerf && typeof game.networkPerf === "object" ? game.networkPerf : null;
  const recentCorrections = Array.isArray(perf?.recentCorrections) ? perf.recentCorrections : [];
  const recentMaxCorrectionPx = recentCorrections.reduce((max, entry) => {
    const errorPx = Number.isFinite(entry?.errorPx) ? entry.errorPx : 0;
    return errorPx > max ? errorPx : max;
  }, 0);
  const lastCorrectionPx = Number.isFinite(perf?.lastCorrectionPx) ? perf.lastCorrectionPx : 0;
  const hasCrowding = closestHostilePx <= 72 || nearbyHostileCount >= 3;
  const strong =
    lastCorrectionPx >= 40 ||
    recentMaxCorrectionPx >= 40 ||
    (hasCrowding && (lastCorrectionPx >= 20 || recentMaxCorrectionPx >= 20));
  const moderate =
    strong ||
    lastCorrectionPx >= 24 ||
    recentMaxCorrectionPx >= 24 ||
    (hasCrowding && (lastCorrectionPx >= 12 || recentMaxCorrectionPx >= 12));
  return {
    strong,
    moderate,
    closestHostilePx: Number.isFinite(closestHostilePx) ? closestHostilePx : null,
    nearbyHostileCount,
    recentMaxCorrectionPx,
    lastCorrectionPx
  };
}

export function syncRemotePlayers(game, state, localPlayerId, positionAlpha, syncByIdLerp) {
  const snapshotPlayers = Array.isArray(state?.players) ? state.players : [];
  const remotes = snapshotPlayers.filter((player) => player && player.id !== localPlayerId);
  game.remotePlayers = syncByIdLerp(game.remotePlayers, remotes, positionAlpha, (player) => {
    player.remote = true;
    player.alive = player.alive !== false;
    if (!Number.isFinite(player.size)) player.size = 22;
    if (!Number.isFinite(player.level)) player.level = 1;
    if (!Number.isFinite(player.dirX)) player.dirX = 1;
    if (!Number.isFinite(player.dirY)) player.dirY = 0;
    if (!Number.isFinite(player.facing)) player.facing = 0;
    player.handle = typeof player.handle === "string" && player.handle.trim() ? player.handle.trim() : "Player";
    player.color = typeof player.color === "string" && player.color.trim() ? player.color.trim() : "#58a6ff";
  });
}

export function queuePlayerDeathNotifications(game, previousById, snapshotPlayer, remotes) {
  if (typeof game?.pushMultiplayerNotification !== "function") return;
  const nextPlayers = [];
  if (snapshotPlayer && typeof snapshotPlayer === "object") {
    nextPlayers.push({
      id: snapshotPlayer.id || game.player?.id || "local",
      handle: typeof snapshotPlayer.handle === "string" && snapshotPlayer.handle.trim() ? snapshotPlayer.handle.trim() : game.playerHandle || "Player",
      alive: snapshotPlayer.alive !== false && (snapshotPlayer.health || 0) > 0
    });
  }
  for (const player of Array.isArray(remotes) ? remotes : []) {
    nextPlayers.push({
      id: player?.id || "",
      handle: typeof player?.handle === "string" && player.handle.trim() ? player.handle.trim() : "Player",
      alive: player?.alive !== false && (player?.health || 0) > 0
    });
  }
  for (const player of nextPlayers) {
    if (!player.id) continue;
    const prevAlive = previousById.get(player.id);
    if (prevAlive !== true || player.alive) continue;
    game.pushMultiplayerNotification(`${player.handle} died`);
  }
}

export function synthesizePlayerProgressionFloatingTexts(game, previousById, snapshotPlayer, remotes) {
  if (typeof game?.spawnFloatingText !== "function") return;
  const players = [];
  if (snapshotPlayer && typeof snapshotPlayer === "object") players.push(snapshotPlayer);
  for (const player of Array.isArray(remotes) ? remotes : []) if (player && typeof player === "object") players.push(player);
  for (const player of players) {
    const id = player.id || (player === snapshotPlayer ? game.player?.id : null);
    if (!id) continue;
    const prev = previousById.get(id);
    if (!prev) continue;
    const nextLevel = Number.isFinite(player.level) ? player.level : prev.level;
    const nextSkillPoints = Number.isFinite(player.skillPoints) ? player.skillPoints : prev.skillPoints;
    const nextGold = Number.isFinite(player.gold) ? player.gold : prev.gold;
    const levelDelta = nextLevel - prev.level;
    const skillPointDelta = nextSkillPoints - prev.skillPoints;
    const goldDelta = nextGold - prev.gold;
    if (levelDelta <= 0 && skillPointDelta <= 0 && goldDelta <= 0) continue;
    const x = Number.isFinite(player.x) ? player.x : prev.x;
    const y = Number.isFinite(player.y) ? player.y : prev.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (goldDelta > 0) {
      const text = `+${Math.floor(goldDelta)}g`;
      if (!hasRecentNetworkFloatingText(game, text, x, y - 30)) game.spawnFloatingText(x, y - 30, text, "#f2d76b", 0.75, 14);
    }
    if (levelDelta > 0) {
      const spSuffix = skillPointDelta > 0 ? ` +${skillPointDelta} SP` : "";
      const text = `Level ${nextLevel}!${spSuffix}`;
      if (!hasRecentNetworkFloatingText(game, text, x, y - 48)) game.spawnFloatingText(x, y - 48, text, "#9be18a", 1.0, 15);
    } else if (skillPointDelta > 0) {
      const text = `+${skillPointDelta} SP`;
      if (!hasRecentNetworkFloatingText(game, text, x, y - 48)) game.spawnFloatingText(x, y - 48, text, "#9be18a", 0.9, 14);
    }
  }
}

export function synthesizeEnemyDamageFloatingTexts(game, previousById, { skip = false } = {}) {
  if (skip || typeof game?.spawnFloatingText !== "function") return;
  for (const enemy of Array.isArray(game.enemies) ? game.enemies : []) {
    if (!enemy || enemy.id == null) continue;
    const prev = previousById.get(enemy.id);
    if (!prev || !Number.isFinite(prev.hp) || !Number.isFinite(enemy.hp)) continue;
    const damage = prev.hp - enemy.hp;
    if (!(damage >= 0.5)) continue;
    spawnEnemyDamageText(game, enemy, prev, damage);
  }
}

export function synthesizeDespawnDamageFloatingTexts(game, previousById, despawnIds, { skip = false } = {}) {
  if (skip || typeof game?.spawnFloatingText !== "function" || !Array.isArray(despawnIds)) return;
  for (const id of despawnIds) {
    const prev = previousById.get(id);
    if (!prev || !Number.isFinite(prev.hp) || !(prev.hp >= 0.5)) continue;
    spawnEnemyDamageText(game, null, prev, prev.hp);
  }
}

export function applyMetaStateToGame(game, state) {
  if (!state || typeof state !== "object") return;
  const isActiveMultiplayer = !!game?.networkEnabled && state.roomPhase === "active" && Number.isFinite(state.activePlayerCount) && state.activePlayerCount > 1;
  const isLocalPauseOwner =
    !!game?.networkEnabled &&
    typeof game?.networkLocalPlayerId === "string" &&
    typeof state.pauseOwnerId === "string" &&
    game.networkLocalPlayerId === state.pauseOwnerId;
  if (typeof state.roomPhase === "string") game.networkRoomPhase = state.roomPhase;
  if (hasOwn(state, "roomOwnerId")) game.networkRoomOwnerId = typeof state.roomOwnerId === "string" ? state.roomOwnerId : null;
  if (hasOwn(state, "pauseOwnerId")) game.networkPauseOwnerId = typeof state.pauseOwnerId === "string" ? state.pauseOwnerId : null;
  if (Number.isFinite(state.time)) game.time = state.time;
  if (Number.isFinite(state.floor)) game.floor = state.floor;
  if (typeof game.setBiomeKey === "function" && typeof state.biomeKey === "string") game.setBiomeKey(state.biomeKey);
  if (!isActiveMultiplayer && Number.isFinite(state.level)) game.level = state.level;
  if (!isActiveMultiplayer && Number.isFinite(state.score)) game.score = state.score;
  if (!isActiveMultiplayer && Number.isFinite(state.gold)) game.gold = state.gold;
  if (!isActiveMultiplayer && Number.isFinite(state.experience)) game.experience = state.experience;
  if (!isActiveMultiplayer && Number.isFinite(state.expToNextLevel)) game.expToNextLevel = state.expToNextLevel;
  if (Number.isFinite(state.activePlayerCount)) game.activePlayerCount = state.activePlayerCount;
  if (!isActiveMultiplayer && Number.isFinite(state.skillPoints)) game.skillPoints = state.skillPoints;
  if (!isActiveMultiplayer && Number.isFinite(state.refundCount)) game.refundCount = state.refundCount;
  if (hasOwn(state, "hasKey")) game.hasKey = !!state.hasKey;
  if (hasOwn(state, "gameOver")) game.gameOver = !!state.gameOver;
  if (hasOwn(state, "gameOverTitle")) game.gameOverTitle = typeof state.gameOverTitle === "string" && state.gameOverTitle ? state.gameOverTitle : "GAME OVER";
  if (hasOwn(state, "paused")) game.paused = !!state.paused;
  if (hasOwn(state, "shopOpen") && (!isActiveMultiplayer || isLocalPauseOwner)) game.shopOpen = !!state.shopOpen;
  if (hasOwn(state, "skillTreeOpen") && (!isActiveMultiplayer || isLocalPauseOwner)) game.skillTreeOpen = !!state.skillTreeOpen;
  if (hasOwn(state, "statsPanelOpen") && !isActiveMultiplayer) game.statsPanelOpen = !!state.statsPanelOpen;
  if (!isActiveMultiplayer && (state.statsPanelView === "run" || state.statsPanelView === "character")) game.statsPanelView = state.statsPanelView;
  if (!isActiveMultiplayer && Number.isFinite(state.warriorMomentumTimer)) game.warriorMomentumTimer = state.warriorMomentumTimer;
  if (!isActiveMultiplayer && Number.isFinite(state.warriorRageActiveTimer)) game.warriorRageActiveTimer = state.warriorRageActiveTimer;
  if (!isActiveMultiplayer && Number.isFinite(state.warriorRageCooldownTimer)) game.warriorRageCooldownTimer = state.warriorRageCooldownTimer;
  if (!isActiveMultiplayer && Number.isFinite(state.warriorRageVictoryRushPool)) game.warriorRageVictoryRushPool = state.warriorRageVictoryRushPool;
  if (!isActiveMultiplayer && Number.isFinite(state.warriorRageVictoryRushTimer)) game.warriorRageVictoryRushTimer = state.warriorRageVictoryRushTimer;
  if (state.floorBoss && typeof state.floorBoss === "object") game.floorBoss = syncFloorBossState(game.floorBoss, state.floorBoss, game);
  if (state.runStats && typeof state.runStats === "object") game.runStats = syncNamedObject(game.runStats, state.runStats);
  if (state.finalResults && typeof state.finalResults === "object") {
    game.networkFinalResults = {
      teamOutcome: typeof state.finalResults.teamOutcome === "string" ? state.finalResults.teamOutcome : "Defeat",
      totalParticipants: Number.isFinite(state.finalResults.totalParticipants) ? state.finalResults.totalParticipants : 0,
      players: Array.isArray(state.finalResults.players) ? state.finalResults.players.map((player) => ({ ...player })) : []
    };
  }
  if (state.portal && typeof state.portal === "object") game.portal = { ...state.portal };
  if (state.musicTrack && typeof state.musicTrack === "object") game.musicTrack = { ...state.musicTrack };
  if (!isActiveMultiplayer && state.skills && typeof state.skills === "object") game.skills = syncNamedObject(game.skills, state.skills);
  if (!isActiveMultiplayer && state.upgrades && typeof state.upgrades === "object") game.upgrades = syncNamedObject(game.upgrades, state.upgrades);
}

export function createProjectileSpawnReconciler({
  controller,
  isNetworkController,
  localPlayerId,
  netPredictedProjectiles,
  game,
  frameGapMs
}) {
  return (projectile, type) => {
    if (!projectile || !controller || !isNetworkController) return projectile;
    if (!netPredictedProjectiles || typeof netPredictedProjectiles.get !== "function") return projectile;
    if (typeof projectile.ownerId === "string" && localPlayerId && projectile.ownerId !== localPlayerId) return projectile;
    const recordAuthoritativeShot = (matched = null, rejected = false) => {
      if (typeof game?.recordPlayerShotTelemetry !== "function") return;
      game.recordPlayerShotTelemetry({
        source: rejected ? "authoritativeProjectileRejected" : "authoritativeProjectile",
        projectileType: type,
        playerX: Number.isFinite(game.player?.x) ? game.player.x : 0,
        playerY: Number.isFinite(game.player?.y) ? game.player.y : 0,
        authoritativeX: Number.isFinite(projectile.x) ? projectile.x : null,
        authoritativeY: Number.isFinite(projectile.y) ? projectile.y : null,
        authoritativeAngle: Number.isFinite(projectile.angle) ? projectile.angle : null,
        intendedAngle: matched && Number.isFinite(matched.angle) ? matched.angle : (Number.isFinite(projectile.angle) ? projectile.angle : null),
        predictedX: matched && Number.isFinite(matched.x) ? matched.x : null,
        predictedY: matched && Number.isFinite(matched.y) ? matched.y : null,
        spawnSeq: Number.isFinite(projectile.spawnSeq) ? Math.floor(projectile.spawnSeq) : 0,
        rejected
      });
    };
    const seq = Number.isFinite(projectile.spawnSeq) ? Math.floor(projectile.spawnSeq) : 0;
    if (seq <= 0) return projectile;
    const recordReconcileReject = (candidate, ref, reason, extra = {}) => {
      if (!game.networkPerf || typeof game.networkPerf !== "object") game.networkPerf = {};
      game.networkPerf.projectileReconcileRejects = (game.networkPerf.projectileReconcileRejects || 0) + 1;
      if (!Array.isArray(game.networkPerf.recentProjectileReconcileRejects)) {
        game.networkPerf.recentProjectileReconcileRejects = [];
      }
      const eventId = (game.networkPerf.projectileReconcileRejectEventId || 0) + 1;
      game.networkPerf.projectileReconcileRejectEventId = eventId;
      game.networkPerf.recentProjectileReconcileRejects.push({
        id: eventId,
        atMs: typeof performance !== "undefined" && typeof performance.now === "function" ? Math.round(performance.now()) : Date.now(),
        reason,
        source: "clientProjectileReconcile",
        projectileType: type,
        ownerId: typeof projectile.ownerId === "string" ? projectile.ownerId : "",
        spawnSeq: seq,
        bucketSeq: Number.isFinite(ref?.bucketSeq) ? ref.bucketSeq : null,
        exactSeq: !!ref?.exactSeq,
        renderId: typeof candidate?.renderId === "string" ? candidate.renderId : "",
        authoritativeX: Number.isFinite(projectile.x) ? Number(projectile.x.toFixed(2)) : null,
        authoritativeY: Number.isFinite(projectile.y) ? Number(projectile.y.toFixed(2)) : null,
        predictedX: Number.isFinite(candidate?.x) ? Number(candidate.x.toFixed(2)) : null,
        predictedY: Number.isFinite(candidate?.y) ? Number(candidate.y.toFixed(2)) : null,
        predictedType: typeof candidate?.type === "string" ? candidate.type : "",
        ...extra
      });
      if (game.networkPerf.recentProjectileReconcileRejects.length > 24) {
        game.networkPerf.recentProjectileReconcileRejects.splice(0, game.networkPerf.recentProjectileReconcileRejects.length - 24);
      }
    };
    const exactBucket = netPredictedProjectiles.get(seq);
    const candidates = [];
    if (Array.isArray(exactBucket)) {
      for (let i = 0; i < exactBucket.length; i++) candidates.push({ bucketSeq: seq, bucket: exactBucket, index: i, exactSeq: true });
    }
    if (candidates.length === 0) {
      for (const [bucketSeq, bucket] of netPredictedProjectiles.entries()) {
        if (!Array.isArray(bucket) || Math.abs(bucketSeq - seq) > 45) continue;
        for (let i = 0; i < bucket.length; i++) candidates.push({ bucketSeq, bucket, index: i, exactSeq: false });
      }
    }
    if (candidates.length === 0) return projectile;
    let bestIdx = -1;
    let bestRef = null;
    let bestScore = Infinity;
    let bestPosDistSq = Infinity;
    for (let i = 0; i < candidates.length; i++) {
      const ref = candidates[i];
      const candidate = ref.bucket[ref.index];
      if (!candidate || candidate.type !== type) continue;
      const dx = (Number.isFinite(candidate.x) ? candidate.x : 0) - (Number.isFinite(projectile.x) ? projectile.x : 0);
      const dy = (Number.isFinite(candidate.y) ? candidate.y : 0) - (Number.isFinite(projectile.y) ? projectile.y : 0);
      const d2 = dx * dx + dy * dy;
      let score = d2;
      if (!ref.exactSeq) score += Math.abs(ref.bucketSeq - seq) * 2;
      if (Number.isFinite(candidate.angle) && Number.isFinite(projectile.angle)) {
        let angleDiff = candidate.angle - projectile.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        const anglePenalty = Math.abs(angleDiff) * 180;
        score += anglePenalty * anglePenalty;
      }
      if (score < bestScore) {
        bestScore = score;
        bestPosDistSq = d2;
        bestIdx = i;
        bestRef = ref;
      }
    }
    if (bestIdx < 0 || !bestRef) return projectile;
    const maxPosError = type === "fireArrow" ? 56 : 48;
    if (bestPosDistSq > maxPosError * maxPosError) {
      const rejectedMatch = bestRef.bucket[bestRef.index];
      recordReconcileReject(rejectedMatch, bestRef, "positionMismatch", {
        distancePx: Number(Math.sqrt(bestPosDistSq).toFixed(2)),
        maxDistancePx: maxPosError,
        score: Number.isFinite(bestScore) ? Number(bestScore.toFixed(2)) : null
      });
      bestRef.bucket.splice(bestRef.index, 1);
      if (bestRef.bucket.length === 0) netPredictedProjectiles.delete(bestRef.bucketSeq);
      if (typeof game?.discardPredictedProjectile === "function") game.discardPredictedProjectile(rejectedMatch);
      recordAuthoritativeShot(rejectedMatch, true);
      return projectile;
    }
    const matched = bestRef.bucket.splice(bestRef.index, 1)[0];
    if (bestRef.bucket.length === 0) netPredictedProjectiles.delete(bestRef.bucketSeq);
    if (typeof game?.discardPredictedProjectile === "function") game.discardPredictedProjectile(matched);
    recordAuthoritativeShot(matched, false);
    const blend = Number.isFinite(projectile.life) && projectile.life > 0.85 ? 0.86 : 0.62;
    const leadSeconds = Math.max(0, Math.min(0.06, frameGapMs / 1000));
    const predictedAngle = Number.isFinite(matched.angle) ? matched.angle : projectile.angle;
    const predictedDriftX = Number.isFinite(matched.vx) ? matched.vx * leadSeconds : 0;
    const predictedDriftY = Number.isFinite(matched.vy) ? matched.vy * leadSeconds : 0;
    const serverLeadX = Number.isFinite(projectile.vx) ? projectile.vx * leadSeconds : 0;
    const serverLeadY = Number.isFinite(projectile.vy) ? projectile.vy * leadSeconds : 0;
    return {
      ...projectile,
      x: (matched.x + predictedDriftX) * blend + (projectile.x + serverLeadX) * (1 - blend),
      y: (matched.y + predictedDriftY) * blend + (projectile.y + serverLeadY) * (1 - blend),
      angle: Number.isFinite(predictedAngle) ? predictedAngle : projectile.angle
    };
  };
}
