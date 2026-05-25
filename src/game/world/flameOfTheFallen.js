const DURATION = 20;
const RADIUS_TILES = 15;
const REVIVE_PCT = 0.5;
const BUFF_MULTIPLIER = 1.1;

function getAllPlayerEntities(game) {
  const players = typeof game?.getActivePlayerEntities === "function" ? game.getActivePlayerEntities() : [game?.player];
  return (Array.isArray(players) ? players : [game?.player]).filter(Boolean);
}

function isMultiplayer(game) {
  if ((Number.isFinite(game?.activePlayerCount) && game.activePlayerCount > 1) || (Number.isFinite(game?.networkActivePlayerCount) && game.networkActivePlayerCount > 1)) return true;
  return getAllPlayerEntities(game).length > 1;
}

function isDead(player) {
  return !!player && (player.alive === false || (Number.isFinite(player.health) && player.health <= 0));
}

function getDeadAllies(game) {
  if (!isMultiplayer(game)) return [];
  const userId = typeof game?.player?.id === "string" && game.player.id ? game.player.id : "player";
  return getAllPlayerEntities(game).filter((player) => player?.id !== userId && isDead(player) && Number.isFinite(player.maxHealth) && player.maxHealth > 0);
}

export function getFlameOfTheFallenRequiredSouls(game) {
  const players = getAllPlayerEntities(game);
  const totalPlayers = Math.max(2, players.length);
  const livingPlayers = Math.max(1, players.filter((player) => !isDead(player)).length);
  return Math.max(16, Math.min(48, (6 + totalPlayers + livingPlayers * 2) * 2));
}

function getStateHost(game) {
  if (!game || typeof game !== "object") return game;
  const proto = Object.getPrototypeOf(game);
  return proto && proto !== Object.prototype && Array.isArray(proto.enemies) && proto.config ? proto : game;
}

function message(game, text) {
  if (!game.consumables || typeof game.consumables !== "object") game.consumables = {};
  game.consumables.message = text;
  game.consumables.messageTimer = 2.25;
}

export function getActiveFlameOfTheFallen(game) {
  const flame = getStateHost(game)?.flameOfTheFallen;
  return flame?.active && (!Number.isFinite(flame.timer) || flame.timer > 0) ? flame : null;
}

export function canUseFlameOfTheFallen(game) {
  return !getActiveFlameOfTheFallen(game) && getDeadAllies(game).length > 0;
}

export function isEntityInFlameOfTheFallen(game, entity) {
  const flame = getActiveFlameOfTheFallen(game);
  if (!flame || !entity || entity.alive === false || (Number.isFinite(entity.health) && entity.health <= 0)) return false;
  return Math.hypot((entity.x || 0) - (flame.x || 0), (entity.y || 0) - (flame.y || 0)) <= (flame.radius || 0);
}

export function getFlameOfTheFallenBuffMultiplier(game, entity) {
  return isEntityInFlameOfTheFallen(game, entity) ? BUFF_MULTIPLIER : 1;
}

export function startFlameOfTheFallen(game) {
  if (getActiveFlameOfTheFallen(game)) return false;
  const targets = getDeadAllies(game);
  if (targets.length <= 0) return false;
  const host = getStateHost(game);
  const tile = Number.isFinite(game.config?.map?.tile) ? game.config.map.tile : 32;
  host.flameOfTheFallen = {
    active: true,
    state: "charging",
    x: Number.isFinite(game.player?.x) ? game.player.x : 0,
    y: Number.isFinite(game.player?.y) ? game.player.y : 0,
    radius: tile * RADIUS_TILES,
    timer: DURATION,
    maxTimer: DURATION,
    souls: 0,
    requiredSouls: getFlameOfTheFallenRequiredSouls(game),
    linkedPlayerIds: targets.map((player) => player.id).filter(Boolean),
    createdAt: Number.isFinite(game.time) ? game.time : 0,
    visualTimer: 0
  };
  message(game, "Flame of the Fallen lit");
  if (typeof game.spawnFloatingText === "function") game.spawnFloatingText(host.flameOfTheFallen.x, host.flameOfTheFallen.y - 46, "Flame lit!", "#ff9b42", 1, 16);
  return true;
}

function soulValue(enemy) {
  if (enemy?.isBoss || enemy?.isFloorBoss) return Number.POSITIVE_INFINITY;
  const type = String(enemy?.type || "").toLowerCase();
  if (type.includes("boss")) return Number.POSITIVE_INFINITY;
  if (enemy?.elite || enemy?.isElite || ["armor", "mimic"].includes(type)) return 8;
  if (["necromancer", "sonya", "leprechaun", "minotaur", "golem"].includes(type)) return 20;
  return 1;
}

function reviveAtFlame(game, player, flame) {
  player.x = Number.isFinite(flame.x) ? flame.x : player.x;
  player.y = Number.isFinite(flame.y) ? flame.y : player.y;
  player.health = Math.max(1, Math.ceil((Number.isFinite(player.maxHealth) ? player.maxHealth : 1) * REVIVE_PCT));
  player.alive = true;
  player.spectateTargetId = "";
  if (typeof game.markPlayerEntityHealthBarVisible === "function") game.markPlayerEntityHealthBarVisible(player);
  if (typeof game.spawnFloatingText === "function") game.spawnFloatingText(player.x, player.y - 34, "Rekindled!", "#ffcf75", 1, 16);
}

function complete(game) {
  const flame = getActiveFlameOfTheFallen(game);
  if (!flame) return false;
  for (const enemy of game.enemies || []) {
    if (!enemy || (enemy.hp || 0) <= 0) continue;
    const dx = (enemy.x || 0) - (flame.x || 0);
    const dy = (enemy.y || 0) - (flame.y || 0);
    const dist = Math.hypot(dx, dy);
    if (dist > Math.min(flame.radius || 0, (game.config?.map?.tile || 32) * 8)) continue;
    if (typeof game.applyEnemyDamage === "function") game.applyEnemyDamage(enemy, Math.max(8, (enemy.maxHp || enemy.hp || 8) * 0.35), "fire");
    enemy.vx = (Number.isFinite(enemy.vx) ? enemy.vx : 0) + (dx / Math.max(1, dist)) * 120;
    enemy.vy = (Number.isFinite(enemy.vy) ? enemy.vy : 0) + (dy / Math.max(1, dist)) * 120;
  }
  for (const player of getAllPlayerEntities(game)) if (isDead(player)) reviveAtFlame(game, player, flame);
  if (typeof game.spawnFloatingText === "function") game.spawnFloatingText(flame.x, flame.y - 48, "Flame fulfilled!", "#fff0a6", 1.1, 18);
  message(game, "Flame fulfilled");
  flame.active = false;
  flame.state = "complete";
  flame.visualTimer = 1.2;
  return true;
}

export function recordFlameOfTheFallenKill(game, enemy) {
  const flame = getActiveFlameOfTheFallen(game);
  if (!flame || !enemy || Math.hypot((enemy.x || 0) - (flame.x || 0), (enemy.y || 0) - (flame.y || 0)) > (flame.radius || 0)) return false;
  const value = soulValue(enemy);
  flame.souls = value === Number.POSITIVE_INFINITY ? flame.requiredSouls : Math.min(flame.requiredSouls, (flame.souls || 0) + value);
  flame.pulseTimer = 0.45;
  if (typeof game.spawnFloatingText === "function") game.spawnFloatingText(enemy.x || flame.x, (enemy.y || flame.y) - 26, value === Number.POSITIVE_INFINITY ? "Full charge" : `+${value} soul`, "#ffb15c", 0.75, 13);
  if ((flame.souls || 0) >= (flame.requiredSouls || 1)) complete(game);
  return true;
}

export function tickFlameOfTheFallen(game, dt) {
  if (getStateHost(game) !== game) return;
  const flame = getActiveFlameOfTheFallen(game);
  if (flame) {
    flame.timer = Math.max(0, (Number.isFinite(flame.timer) ? flame.timer : DURATION) - dt);
    flame.pulseTimer = Math.max(0, (flame.pulseTimer || 0) - dt);
    if (flame.timer <= 0) {
      flame.active = false;
      flame.state = "expired";
      flame.visualTimer = 1.2;
      message(game, "Flame collapsed");
      if (typeof game.spawnFloatingText === "function") game.spawnFloatingText(flame.x, flame.y - 46, "Flame collapsed", "#9c7f73", 0.9, 15);
    }
  } else if (game.flameOfTheFallen?.visualTimer > 0) {
    game.flameOfTheFallen.visualTimer = Math.max(0, game.flameOfTheFallen.visualTimer - dt);
  }
}
