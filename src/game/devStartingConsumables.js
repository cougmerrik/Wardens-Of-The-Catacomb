import {
  createConsumableShopEntry,
  getConsumableCatalog,
  getConsumableDefinition
} from "./consumables.js";
import { grantConsumableCharge } from "./world/consumablesEconomy.js";

export const DEV_START_CONSUMABLE_NONE = "";

export function getDevStartingConsumableOptions() {
  return getConsumableCatalog()
    .filter((item) => item && item.key)
    .map((item) => ({ key: item.key, name: item.name || item.key, type: item.type, rarity: item.rarity || "" }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function normalizeDevStartingConsumableKey(key) {
  const safeKey = typeof key === "string" ? key.trim() : "";
  if (!safeKey || safeKey === "none") return DEV_START_CONSUMABLE_NONE;
  return getConsumableDefinition(safeKey) ? safeKey : DEV_START_CONSUMABLE_NONE;
}

export function forceConsumableIntoShop(game, key, stock = 1) {
  const safeKey = normalizeDevStartingConsumableKey(key);
  if (!game || !safeKey) return false;
  if (!Array.isArray(game.shopStock)) game.shopStock = [];
  const existing = game.shopStock.find((entry) => entry?.key === safeKey);
  if (existing) existing.stock = Math.max(existing.stock || 0, stock);
  else game.shopStock.unshift(createConsumableShopEntry(safeKey, stock));
  if (safeKey === "flameOfTheFallen") game.flameOfTheFallenOffered = true;
  return true;
}

export function grantDevStartingConsumable(game, key, player = null) {
  const safeKey = normalizeDevStartingConsumableKey(key);
  if (!game || !safeKey) return false;
  const target = player || game.player;
  const context = target && target !== game.player
    ? { player: target, consumables: target.consumables }
    : game;
  grantConsumableCharge(context, safeKey);
  if (target && context.consumables) target.consumables = context.consumables;
  return true;
}

export function applyDevStartingConsumables(game, { inventoryKey = "", shopKey = "" } = {}) {
  const inventoryGranted = grantDevStartingConsumable(game, inventoryKey);
  const shopForced = forceConsumableIntoShop(game, shopKey);
  return { inventoryGranted, shopForced };
}
