import {
  getConsumableDefinition,
  rollConsumableShopEntry
} from "../consumables.js";
import { ensureShopStock, isMultiplayerConsumableContext } from "./consumablesEconomy.js";

export const SHOP_STOCK_ROTATION_INTERVAL = 60;

function getRunHost(game) {
  if (!game || typeof game !== "object") return game;
  const proto = Object.getPrototypeOf(game);
  return proto && proto !== Object.prototype && Array.isArray(proto.shopStock) && proto.shopStock === game.shopStock ? proto : game;
}

function resetRotationTimer(game) {
  const host = getRunHost(game);
  host.shopStockRotationNextAt = (Number.isFinite(game?.time) ? game.time : 0) + SHOP_STOCK_ROTATION_INTERVAL;
}

function queueBanner(game, text) {
  const host = getRunHost(game);
  if (!Array.isArray(host.shopRotationEvents)) host.shopRotationEvents = [];
  const nextId = (Number.isFinite(host.shopRotationEventSeq) ? Math.floor(host.shopRotationEventSeq) : 0) + 1;
  host.shopRotationEventSeq = nextId;
  host.shopRotationEvents.push({ id: `shop_rotation_${nextId}`, text, at: Number.isFinite(game.time) ? game.time : 0 });
  if (host.shopRotationEvents.length > 20) host.shopRotationEvents.splice(0, host.shopRotationEvents.length - 20);
  if (typeof game.pushMultiplayerNotification === "function") {
    game.pushMultiplayerNotification(text);
    return;
  }
  if (!Array.isArray(game.multiplayerNotificationQueue)) game.multiplayerNotificationQueue = [];
  game.multiplayerNotificationQueue.push({ text, duration: 2.5, shopRotationLocal: true });
  if (!game.multiplayerNotificationCurrent) game.multiplayerNotificationCurrent = game.multiplayerNotificationQueue.shift() || null;
}

function tickLocalBannerFallback(game, dt) {
  if (typeof game?.tickMultiplayerNotifications === "function") return;
  if (!game.multiplayerNotificationCurrent && Array.isArray(game.multiplayerNotificationQueue) && game.multiplayerNotificationQueue.length > 0) {
    game.multiplayerNotificationCurrent = game.multiplayerNotificationQueue.shift() || null;
  }
  const current = game.multiplayerNotificationCurrent;
  if (!current?.shopRotationLocal || !Number.isFinite(current.duration)) return;
  current.duration -= dt;
  if (current.duration <= 0) game.multiplayerNotificationCurrent = game.multiplayerNotificationQueue?.shift?.() || null;
}

function getExcludeKeys(game, slotIndex, includeRotatedSlot) {
  const host = getRunHost(game);
  const exclude = new Set();
  for (let i = 0; i < game.shopStock.length; i++) {
    if (!includeRotatedSlot && i === slotIndex) continue;
    if (game.shopStock[i]?.key) exclude.add(game.shopStock[i].key);
  }
  if (host?.flameOfTheFallenOffered || host?.flameOfTheFallenPurchased) exclude.add("flameOfTheFallen");
  return exclude;
}

export function rotateShopStockSlot(game) {
  const stock = ensureShopStock(game);
  if (!Array.isArray(stock) || stock.length <= 0) {
    resetRotationTimer(game);
    return null;
  }
  const slotIndex = Math.max(0, Math.min(stock.length - 1, Math.floor(Math.random() * stock.length)));
  const options = { includeMultiplayerOnly: isMultiplayerConsumableContext(game) };
  let entry = rollConsumableShopEntry(game.floor, getExcludeKeys(game, slotIndex, true), options);
  if (!entry) entry = rollConsumableShopEntry(game.floor, getExcludeKeys(game, slotIndex, false), options);
  if (!entry) {
    resetRotationTimer(game);
    return null;
  }
  stock[slotIndex] = entry;
  if (entry.key === "flameOfTheFallen") getRunHost(game).flameOfTheFallenOffered = true;
  queueBanner(game, `${getConsumableDefinition(entry.key)?.name || "An item"} is now available in the shop.`);
  resetRotationTimer(game);
  return { slotIndex, entry };
}

export function tickShopStockRotation(game, dt = 0) {
  const host = getRunHost(game);
  if (!host) return null;
  tickLocalBannerFallback(game, dt);
  ensureShopStock(game);
  const now = Number.isFinite(game?.time) ? game.time : 0;
  if (!Number.isFinite(host.shopStockRotationNextAt)) {
    resetRotationTimer(game);
    return null;
  }
  return now >= host.shopStockRotationNextAt ? rotateShopStockSlot(game) : null;
}
