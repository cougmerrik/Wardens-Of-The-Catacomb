import { getConsumableDefinition } from "../consumables.js";
import { grantConsumableCharge, pushConsumableMessage } from "./consumablesEconomy.js";

const TILE_FALLBACK = 32;
const DISPATCH_DELAY_MIN = 15;
const DISPATCH_DELAY_MAX = 30;
const DELIVERY_WAIT_TIME = 15;
const DELIVERY_MIN_TILES = 12;
const DELIVERY_MAX_TILES = 24;
const ENEMY_AVOID_TILES = 6;
const PICKUP_TILES = 2;
const OWL_HP = 26;
const OWL_SPEED = 176;
const OWL_SIZE = 22;
const OWL_DROP_LIFE = 30;
const DEATH_MARKER_LIFE = 18;
const TRAIL_LIFE = 2.4;
const TRAIL_LIMIT = 72;
const HURT_AUDIO_COOLDOWN = 5;
const PORTAL_AWAY_TIME = 0.75;
const SLAIN_NEXT_DELIVERY_DELAY = 60;

function getTileSize(game) {
  return game?.config?.map?.tile || TILE_FALLBACK;
}

function getDeliveryHost(game) {
  const proto = game && Object.getPrototypeOf(game);
  if (proto && proto !== Object.prototype && Array.isArray(proto.shopStock) && proto.shopStock === game.shopStock) return proto;
  return game;
}

export function ensureOwlDeliveryState(game) {
  const host = getDeliveryHost(game);
  if (!host.owlDelivery || typeof host.owlDelivery !== "object") {
    host.owlDelivery = {
      pendingOrders: [],
      active: null,
      nextDispatchAt: 0,
      orderSeq: 1,
      audioSeq: 1,
      notificationSeq: 1,
      audioEvents: [],
      notificationEvents: [],
      lastMarker: null
    };
  }
  const state = host.owlDelivery;
  if (!Array.isArray(state.pendingOrders)) state.pendingOrders = [];
  if (!Array.isArray(state.audioEvents)) state.audioEvents = [];
  if (!Array.isArray(state.notificationEvents)) state.notificationEvents = [];
  if (!Number.isFinite(state.orderSeq)) state.orderSeq = 1;
  if (!Number.isFinite(state.audioSeq)) state.audioSeq = 1;
  if (!Number.isFinite(state.notificationSeq)) state.notificationSeq = 1;
  return state;
}

function now(game) {
  return Number.isFinite(game?.time) ? game.time : 0;
}

function getPlayerId(game) {
  return typeof game?.player?.id === "string" && game.player.id ? game.player.id : "player";
}

function queueOwlAudio(game, kind) {
  const state = ensureOwlDeliveryState(game);
  state.audioEvents.push({ id: `veronica_audio_${state.audioSeq++}`, kind, at: now(game) });
  if (state.audioEvents.length > 12) state.audioEvents.splice(0, state.audioEvents.length - 12);
}

function showOwlAlert(game, text, x = null, y = null) {
  pushConsumableMessage(game, text);
  const state = ensureOwlDeliveryState(game);
  state.notificationEvents.push({ id: `veronica_notice_${state.notificationSeq++}`, text, at: now(game) });
  if (state.notificationEvents.length > 12) state.notificationEvents.splice(0, state.notificationEvents.length - 12);
  if (typeof game.pushMultiplayerNotification === "function") {
    game.pushMultiplayerNotification(text);
    return;
  }
  if (!Array.isArray(game.multiplayerNotificationQueue)) game.multiplayerNotificationQueue = [];
  game.multiplayerNotificationQueue.push({ text, duration: 2.5, owlLocal: true });
  if (!game.multiplayerNotificationCurrent) game.multiplayerNotificationCurrent = game.multiplayerNotificationQueue.shift() || null;
}

function tickLocalOwlNotifications(game, dt) {
  if (typeof game.tickMultiplayerNotifications === "function") return;
  if (!game.multiplayerNotificationCurrent && Array.isArray(game.multiplayerNotificationQueue) && game.multiplayerNotificationQueue.length > 0) {
    game.multiplayerNotificationCurrent = game.multiplayerNotificationQueue.shift() || null;
  }
  const current = game.multiplayerNotificationCurrent;
  if (!current?.owlLocal) return;
  current.duration -= Math.max(0, Number.isFinite(dt) ? dt : 0);
  if (current.duration <= 0) game.multiplayerNotificationCurrent = game.multiplayerNotificationQueue?.shift?.() || null;
}

function randomDispatchDelay(game) {
  const override = game?.owlDeliveryDebugDelay;
  if (Number.isFinite(override)) return Math.max(0, override);
  return DISPATCH_DELAY_MIN + Math.random() * (DISPATCH_DELAY_MAX - DISPATCH_DELAY_MIN);
}

function schedulePendingDispatch(game, state, extraDelay = 0) {
  if (!state || state.active || state.pendingOrders.length <= 0) return;
  state.nextDispatchAt = now(game) + Math.max(0, extraDelay || 0) + randomDispatchDelay(game);
}

export function enqueueOwlDeliveryOrder(game, key, quantity = 1, playerId = getPlayerId(game)) {
  const def = getConsumableDefinition(key);
  if (!def) return false;
  const state = ensureOwlDeliveryState(game);
  const order = {
    id: `owl_order_${state.orderSeq++}`,
    playerId,
    key: def.key,
    quantity: Math.max(1, Math.floor(quantity || 1)),
    purchasedAt: now(game)
  };
  state.pendingOrders.push(order);
  if (!state.active && (!Number.isFinite(state.nextDispatchAt) || state.nextDispatchAt <= now(game))) schedulePendingDispatch(game, state);
  showOwlAlert(game, "Veronica delivery incoming!");
  return true;
}

export function getPendingOwlOrderCount(game, key, playerId = getPlayerId(game)) {
  const state = ensureOwlDeliveryState(game);
  let count = 0;
  const addOrder = (order) => {
    if (!order || order.key !== key) return;
    if (order.playerId !== playerId && !(order.playerId === "player" && playerId === "player")) return;
    count += Math.max(1, Math.floor(order.quantity || 1));
  };
  for (const order of state.pendingOrders) addOrder(order);
  for (const order of state.active?.orders || []) addOrder(order);
  return count;
}

export function getPendingOwlOrderKeys(game, playerId = getPlayerId(game)) {
  const state = ensureOwlDeliveryState(game);
  const keys = new Set();
  const addOrder = (order) => {
    if (!order?.key) return;
    if (order.playerId !== playerId && !(order.playerId === "player" && playerId === "player")) return;
    keys.add(order.key);
  };
  for (const order of state.pendingOrders) addOrder(order);
  for (const order of state.active?.orders || []) addOrder(order);
  return keys;
}

function isNavigableTile(game, tx, ty) {
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) return false;
  tx = Math.floor(tx);
  ty = Math.floor(ty);
  if (tx < 0 || ty < 0 || ty >= (game.mapHeight || game.map?.length || 0) || tx >= (game.mapWidth || game.map?.[0]?.length || 0)) return false;
  if (typeof game.isWalkableTile === "function") return !!game.isWalkableTile(tx, ty);
  const row = game.map?.[ty];
  const ch = Array.isArray(row) ? row[tx] : typeof row === "string" ? row[tx] : "#";
  return ch !== "#" && ch !== "B" && ch !== "?";
}

function tileCenter(game, tx, ty) {
  const tile = getTileSize(game);
  return { x: tx * tile + tile * 0.5, y: ty * tile + tile * 0.5 };
}

function getPartyPlayers(game) {
  const players = typeof game.getActivePlayerEntities === "function" ? game.getActivePlayerEntities() : [game.player];
  return (Array.isArray(players) ? players : [game.player]).filter(
    (player) => player && Number.isFinite(player.x) && Number.isFinite(player.y) && (player.health ?? 1) > 0
  );
}

function getPartyCenter(game) {
  const players = getPartyPlayers(game);
  if (!players.length) return { x: game.player?.x || 0, y: game.player?.y || 0 };
  let x = 0;
  let y = 0;
  for (const player of players) {
    x += player.x;
    y += player.y;
  }
  return { x: x / players.length, y: y / players.length };
}

function enemyDensityScore(game, x, y) {
  const tile = getTileSize(game);
  const avoid = ENEMY_AVOID_TILES * tile;
  let score = 0;
  for (const enemy of Array.isArray(game.enemies) ? game.enemies : []) {
    if (!enemy || (enemy.hp ?? 1) <= 0 || enemy.deathProcessed) continue;
    const dist = Math.hypot((enemy.x || 0) - x, (enemy.y || 0) - y);
    if (dist <= avoid) score += 1000 + (avoid - dist);
  }
  return score;
}

function selectDeliveryPoint(game) {
  const tile = getTileSize(game);
  const center = getPartyCenter(game);
  const ctx = Math.floor(center.x / tile);
  const cty = Math.floor(center.y / tile);
  const min = DELIVERY_MIN_TILES;
  const max = DELIVERY_MAX_TILES;
  let best = null;
  for (let ty = cty - max; ty <= cty + max; ty++) {
    for (let tx = ctx - max; tx <= ctx + max; tx++) {
      if (!isNavigableTile(game, tx, ty)) continue;
      const dx = tx - ctx;
      const dy = ty - cty;
      const distTiles = Math.hypot(dx, dy);
      if (distTiles < min || distTiles > max) continue;
      const point = tileCenter(game, tx, ty);
      const enemyScore = enemyDensityScore(game, point.x, point.y);
      const score = enemyScore + Math.abs(distTiles - 18) * 10;
      if (!best || score < best.score) best = { ...point, score };
    }
  }
  if (best) return best;
  for (let radius = 2; radius <= max; radius++) {
    for (let ty = cty - radius; ty <= cty + radius; ty++) {
      for (let tx = ctx - radius; tx <= ctx + radius; tx++) {
        if (isNavigableTile(game, tx, ty)) return tileCenter(game, tx, ty);
      }
    }
  }
  return center;
}

function selectSpawnPoint(game, dest) {
  const width = Math.max(1, game.mapWidth || game.map?.[0]?.length || 1);
  const height = Math.max(1, game.mapHeight || game.map?.length || 1);
  const tile = getTileSize(game);
  const party = getPartyCenter(game);
  let best = null;
  for (const requireDistance of [true, false]) {
    best = null;
    for (let ty = 0; ty < height; ty++) {
      for (let tx = 0; tx < width; tx++) {
        const edge = tx <= 1 || ty <= 1 || tx >= width - 2 || ty >= height - 2;
        if (!edge || !isNavigableTile(game, tx, ty)) continue;
        const point = tileCenter(game, tx, ty);
        const partyDist = Math.hypot(point.x - party.x, point.y - party.y);
        if (requireDistance && partyDist < tile * 10) continue;
        const score = Math.hypot(point.x - dest.x, point.y - dest.y) - Math.min(partyDist, tile * 24) * 0.35;
        if (!best || score < best.score) best = { ...point, score };
      }
    }
    if (best) return best;
  }
  return { x: dest.x - getTileSize(game) * 14, y: dest.y };
}

function spawnOwl(game, orders) {
  const destination = selectDeliveryPoint(game);
  const spawn = selectSpawnPoint(game, destination);
  return {
    id: "ticklecorn",
    name: "Veronica",
    x: spawn.x,
    y: spawn.y,
    displayX: spawn.x,
    displayY: spawn.y,
    destX: destination.x,
    destY: destination.y,
    hp: OWL_HP,
    maxHp: OWL_HP,
    size: OWL_SIZE,
    speed: Number.isFinite(game?.config?.classes?.archer?.baseMoveSpeed) ? game.config.classes.archer.baseMoveSpeed : OWL_SPEED,
    phase: 0,
    state: "flying",
    waitTimer: DELIVERY_WAIT_TIME,
    portalTimer: 0,
    underAttackTimer: 0,
    attackWarningCooldown: 0,
    orders: orders.map((order) => ({ ...order })),
    trail: []
  };
}

function dropOwlOrders(game, owl) {
  if (!Array.isArray(game.drops)) game.drops = [];
  for (const order of Array.isArray(owl.orders) ? owl.orders : []) {
    const def = getConsumableDefinition(order.key);
    if (!def) continue;
    game.drops.push({
      type: "owl_item",
      key: order.key,
      playerId: order.playerId,
      quantity: Math.max(1, Math.floor(order.quantity || 1)),
      x: owl.x,
      y: owl.y,
      size: 22,
      life: OWL_DROP_LIFE,
      name: def.name
    });
  }
  owl.orders = [];
}

function markOwlDeath(game, owl) {
  const state = ensureOwlDeliveryState(game);
  state.lastMarker = {
    x: owl.x,
    y: owl.y,
    life: DEATH_MARKER_LIFE,
    markerType: "delivery_box",
    text: "Veronica was slain!"
  };
}

function finishOwlRetire(game, slain = false) {
  const state = ensureOwlDeliveryState(game);
  state.active = null;
  schedulePendingDispatch(game, state, slain ? SLAIN_NEXT_DELIVERY_DELAY : 0);
}

function beginOwlPortalAway(game, slain) {
  const state = ensureOwlDeliveryState(game);
  const owl = state.active;
  if (!owl) {
    finishOwlRetire(game, slain);
    return;
  }
  if (slain) markOwlDeath(game, owl);
  owl.state = "portal";
  owl.portalTimer = PORTAL_AWAY_TIME;
  owl.portalSlain = !!slain;
  owl.orders = [];
}

function grantOrdersNearOwl(game, owl) {
  const tile = getTileSize(game);
  const pickupRadius = PICKUP_TILES * tile;
  const players = getPartyPlayers(game);
  for (const player of players) {
    if (Math.hypot((player.x || 0) - owl.x, (player.y || 0) - owl.y) > pickupRadius) continue;
    for (let i = owl.orders.length - 1; i >= 0; i--) {
      const order = owl.orders[i];
      if (order.playerId !== player.id && !(order.playerId === "player" && player === game.player)) continue;
      if (!player.consumables || typeof player.consumables !== "object") {
        player.consumables = player === game.player && game.consumables ? game.consumables : {};
      }
      const grantContext = { player, consumables: player.consumables || (player === game.player ? game.consumables : null) };
      for (let n = 0; n < Math.max(1, order.quantity || 1); n++) grantConsumableCharge(grantContext, order.key);
      owl.orders.splice(i, 1);
      const def = getConsumableDefinition(order.key);
      pushConsumableMessage(game, `${def?.name || "Item"} delivered`);
      if (typeof game.spawnFloatingText === "function") {
        game.spawnFloatingText(player.x, player.y - 36, "Delivery!", "#9be7ff", 0.9, 14);
      }
    }
  }
}

function moveOwlTowardDestination(game, owl, dt) {
  const tile = getTileSize(game);
  let dx = owl.destX - owl.x;
  let dy = owl.destY - owl.y;
  let dist = Math.hypot(dx, dy);
  if (dist <= tile * 0.8) {
    owl.state = "waiting";
    owl.x = owl.destX;
    owl.y = owl.destY;
    if (!owl.arrivalNotified) {
      showOwlAlert(game, "Veronica has arrived!", owl.x, owl.y - 34);
      owl.arrivalNotified = true;
    }
    return;
  }
  dx /= dist || 1;
  dy /= dist || 1;
  for (const enemy of Array.isArray(game.enemies) ? game.enemies : []) {
    if (!enemy || (enemy.hp ?? 1) <= 0 || enemy.deathProcessed) continue;
    const ex = owl.x - (enemy.x || 0);
    const ey = owl.y - (enemy.y || 0);
    const ed = Math.hypot(ex, ey);
    if (ed > 0 && ed < tile * 6) {
      const weight = (tile * 6 - ed) / (tile * 6);
      dx += (ex / ed) * weight * 2.2;
      dy += (ey / ed) * weight * 2.2;
    }
  }
  const nd = Math.hypot(dx, dy) || 1;
  owl.x += (dx / nd) * owl.speed * dt;
  owl.y += (dy / nd) * owl.speed * dt;
}

function updateOwlDisplay(owl, dt) {
  owl.phase = (owl.phase || 0) + dt * 3.2;
  if (owl.state === "portal") {
    owl.displayX = owl.x;
    owl.displayY = owl.y;
  } else if (owl.state === "waiting") {
    owl.displayX = owl.destX + Math.sin(owl.phase) * 18;
    owl.displayY = owl.destY + Math.sin(owl.phase * 2) * 10;
  } else {
    owl.displayX = owl.x;
    owl.displayY = owl.y + Math.sin(owl.phase) * 4;
  }
  if (!Array.isArray(owl.trail)) owl.trail = [];
  owl.trail.push({ x: owl.displayX, y: owl.displayY, life: TRAIL_LIFE, maxLife: TRAIL_LIFE });
  for (const mote of owl.trail) mote.life -= dt;
  owl.trail = owl.trail.filter((mote) => mote.life > 0).slice(-TRAIL_LIMIT);
}

function damageOwlFromEnemies(game, owl, dt) {
  const tile = getTileSize(game);
  let attacked = false;
  let damage = 0;
  for (const enemy of Array.isArray(game.enemies) ? game.enemies : []) {
    if (!enemy || (enemy.hp ?? 1) <= 0 || enemy.deathProcessed) continue;
    const radius = (Number.isFinite(enemy.size) ? enemy.size : 22) * 0.5 + owl.size * 0.5 + 6;
    if (Math.hypot((enemy.x || 0) - owl.x, (enemy.y || 0) - owl.y) > Math.max(radius, tile * 0.75)) continue;
    const dps = Number.isFinite(enemy.damageMax) ? Math.max(4, enemy.damageMax * 0.8) : 8;
    damage += dps * dt;
    attacked = true;
  }
  if (attacked) {
    owl.hp -= damage;
    owl.underAttackTimer = 1.2;
    owl.attackWarningCooldown = Math.max(0, (owl.attackWarningCooldown || 0) - dt);
    if (owl.hp > 0 && owl.attackWarningCooldown <= 0) {
      showOwlAlert(game, "Veronica is under attack!", owl.x, owl.y - 34);
      queueOwlAudio(game, "veronica_hurt");
      owl.attackWarningCooldown = HURT_AUDIO_COOLDOWN;
    }
  } else {
    owl.underAttackTimer = Math.max(0, (owl.underAttackTimer || 0) - dt);
    owl.attackWarningCooldown = Math.max(0, (owl.attackWarningCooldown || 0) - dt);
  }
}

export function tickOwlDelivery(game, dt) {
  const state = ensureOwlDeliveryState(game);
  tickLocalOwlNotifications(game, dt);
  if (state.lastMarker) {
    state.lastMarker.life = Math.max(0, (state.lastMarker.life || 0) - dt);
    if (state.lastMarker.life <= 0) state.lastMarker = null;
  }
  if (!state.active && state.pendingOrders.length > 0 && now(game) >= (state.nextDispatchAt || 0)) {
    state.active = spawnOwl(game, state.pendingOrders.splice(0));
    showOwlAlert(game, "Veronica delivery incoming!");
    queueOwlAudio(game, "veronica_entrance");
  }
  const owl = state.active;
  if (!owl) return;
  if (!Array.isArray(owl.orders)) owl.orders = [];
  if (owl.state === "portal") {
    owl.portalTimer = Math.max(0, (owl.portalTimer || 0) - dt);
    updateOwlDisplay(owl, dt);
    if (owl.portalTimer <= 0) finishOwlRetire(game, !!owl.portalSlain);
    return;
  }
  damageOwlFromEnemies(game, owl, dt);
  if (owl.hp <= 0) {
    dropOwlOrders(game, owl);
    showOwlAlert(game, "Veronica was slain!", owl.x, owl.y - 34);
    queueOwlAudio(game, "veronica_dead");
    beginOwlPortalAway(game, true);
    return;
  }
  if (owl.state === "flying") moveOwlTowardDestination(game, owl, dt);
  else if (owl.state === "waiting") owl.waitTimer = Math.max(0, (owl.waitTimer || 0) - dt);
  updateOwlDisplay(owl, dt);
  grantOrdersNearOwl(game, owl);
  if (owl.orders.length <= 0) {
    beginOwlPortalAway(game, false);
    return;
  }
  if (owl.state === "waiting" && owl.waitTimer <= 0) {
    dropOwlOrders(game, owl);
    showOwlAlert(game, "Veronica was slain!", owl.x, owl.y - 34);
    queueOwlAudio(game, "veronica_dead");
    beginOwlPortalAway(game, true);
  }
}

export function pickupOwlItemDrop(game, drop, player = game.player) {
  if (!drop || drop.type !== "owl_item") return false;
  const playerId = typeof player?.id === "string" && player.id ? player.id : "player";
  if (drop.playerId && drop.playerId !== playerId && !(drop.playerId === "player" && player === game.player)) return false;
  if (!player.consumables || typeof player.consumables !== "object") {
    player.consumables = player === game.player && game.consumables ? game.consumables : {};
  }
  const grantContext = { player, consumables: player.consumables || (player === game.player ? game.consumables : null) };
  for (let n = 0; n < Math.max(1, drop.quantity || 1); n++) grantConsumableCharge(grantContext, drop.key);
  const def = getConsumableDefinition(drop.key);
  pushConsumableMessage(game, `${def?.name || "Item"} recovered`);
  return true;
}
