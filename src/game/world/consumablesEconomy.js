import {
  ACTIVE_CONSUMABLE_COOLDOWN,
  ACTIVE_CONSUMABLE_SLOT_CAP,
  PASSIVE_CONSUMABLE_SLOT_CAP,
  cloneConsumableSlots,
  createConsumableEffectState,
  getConsumableDefinition,
  getConsumablePriceForFloor,
  rollConsumableShopStock
} from "../consumables.js";
import { enqueueOwlDeliveryOrder, getPendingOwlOrderCount, getPendingOwlOrderKeys } from "./owlDelivery.js";
import { addLanternFuel } from "./lighting.js";

const OIL_ATTACK_CHARGES = 15;
const OIL_EFFECT_KEYS = ["fireOil", "frostOil"];
const SPIKE_GROWTH_HITS = 25;
const PHOENIX_DRAUGHT_REVIVE_PCT = 0.4;

function getAllPlayerEntities(game) {
  const players = typeof game?.getActivePlayerEntities === "function" ? game.getActivePlayerEntities() : [game?.player];
  return (Array.isArray(players) ? players : [game?.player]).filter((player) => !!player);
}

export function isMultiplayerConsumableContext(game) {
  if ((Number.isFinite(game?.activePlayerCount) && game.activePlayerCount > 1) || (Number.isFinite(game?.networkActivePlayerCount) && game.networkActivePlayerCount > 1)) return true;
  return getAllPlayerEntities(game).length > 1;
}

function isDeadPlayerEntity(player) {
  return !!player && (player.alive === false || (Number.isFinite(player.health) && player.health <= 0));
}

function getPhoenixDraughtTargets(game) {
  if (!isMultiplayerConsumableContext(game)) return [];
  const userId = typeof game?.player?.id === "string" && game.player.id ? game.player.id : "player";
  return getAllPlayerEntities(game).filter((player) => {
    if (!player || player.id === userId) return false;
    return isDeadPlayerEntity(player) && Number.isFinite(player.maxHealth) && player.maxHealth > 0;
  });
}

export function ensureShopStock(game) {
  if (!Array.isArray(game.shopStock) || game.shopStock.length <= 0) {
    game.shopStock = rollConsumableShopStock(Math.max(1, Math.floor(game.floor || 1)), 5);
  }
  return game.shopStock;
}

function ensureConsumableState(game) {
  if (!game.consumables || typeof game.consumables !== "object") {
    game.consumables = {
      activeSlots: [],
      passiveSlots: [],
      sharedCooldown: 0,
      message: "",
      messageTimer: 0,
      effects: createConsumableEffectState()
    };
  }
  if (!Array.isArray(game.consumables.activeSlots)) game.consumables.activeSlots = [];
  if (!Array.isArray(game.consumables.passiveSlots)) game.consumables.passiveSlots = [];
  if (!game.consumables.effects || typeof game.consumables.effects !== "object") {
    game.consumables.effects = createConsumableEffectState();
  }
  const defaults = createConsumableEffectState();
  for (const [key, value] of Object.entries(defaults)) {
    if (!game.consumables.effects[key] || typeof game.consumables.effects[key] !== "object") {
      game.consumables.effects[key] = { ...value };
    }
  }
  for (const key of OIL_EFFECT_KEYS) {
    const effect = game.consumables.effects[key];
    if (!effect || typeof effect !== "object") {
      game.consumables.effects[key] = { timer: 0, attacksRemaining: 0 };
      continue;
    }
    effect.timer = 0;
    effect.attacksRemaining = Number.isFinite(effect.attacksRemaining)
      ? Math.max(0, Math.floor(effect.attacksRemaining))
      : 0;
  }
  const spike = game.consumables.effects.spikeGrowth;
  if (!Number.isFinite(spike.attacksRemaining)) spike.attacksRemaining = (spike.timer || 0) > 0 ? SPIKE_GROWTH_HITS : 0;
  return game.consumables;
}

export function pushConsumableMessage(game, text) {
  const consumables = ensureConsumableState(game);
  consumables.message = typeof text === "string" ? text : "";
  consumables.messageTimer = consumables.message ? 2.25 : 0;
}

export function getConsumableSlots(game, type) {
  const consumables = ensureConsumableState(game);
  return type === "Passive" ? consumables.passiveSlots : consumables.activeSlots;
}

export function getConsumableSlot(game, key, type = null) {
  const def = type ? { type } : getConsumableDefinition(key);
  if (!def) return null;
  const slots = getConsumableSlots(game, def.type);
  return slots.find((slot) => slot?.key === key) || null;
}

export function getConsumableOwnedCount(game, key) {
  const def = getConsumableDefinition(key);
  const slot = getConsumableSlot(game, key, def?.type);
  return Number.isFinite(slot?.count) ? slot.count : 0;
}

export function canAcquireConsumableType(game, def) {
  const slots = getConsumableSlots(game, def.type);
  const cap = def.type === "Passive" ? PASSIVE_CONSUMABLE_SLOT_CAP : ACTIVE_CONSUMABLE_SLOT_CAP;
  const playerId = typeof game.player?.id === "string" && game.player.id ? game.player.id : "player";
  const pendingKeys = getPendingOwlOrderKeys(game, playerId);
  let pendingNewSlots = 0;
  for (const key of pendingKeys) {
    const pendingDef = getConsumableDefinition(key);
    if (pendingDef?.type === def.type && !slots.some((slot) => slot?.key === key)) pendingNewSlots++;
  }
  return slots.length + pendingNewSlots < cap;
}

export function getShopFailureReason(game, key) {
  const def = getConsumableDefinition(key);
  if (!def) return "Out of stock";
  if (def.multiplayerOnly && !isMultiplayerConsumableContext(game)) return "Multiplayer only";
  ensureShopStock(game);
  const entry = game.shopStock.find((item) => item?.key === key);
  if (!entry || entry.stock <= 0) return "Out of stock";
  const playerId = typeof game.player?.id === "string" && game.player.id ? game.player.id : "player";
  const ownedCount = getConsumableOwnedCount(game, key) + getPendingOwlOrderCount(game, key, playerId);
  if (ownedCount >= def.maxStack) return "At max stack";
  const existing = getConsumableSlot(game, key, def.type);
  if (!existing && !canAcquireConsumableType(game, def)) {
    return def.type === "Passive" ? "No passive slot available" : "No active slot available";
  }
  const price = getConsumablePriceForFloor(def, game.floor);
  if ((game.gold || 0) < price) return "Not enough gold";
  return "";
}

export function canBuyShopItem(game, key) {
  return !getShopFailureReason(game, key);
}

function addConsumableCharge(game, def) {
  const slots = getConsumableSlots(game, def.type);
  let slot = slots.find((entry) => entry?.key === def.key);
  if (!slot) {
    slot = {
      key: def.key,
      count: 0,
      cooldownRemaining: 0
    };
    slots.push(slot);
  }
  slot.count = Math.min(def.maxStack, (slot.count || 0) + 1);
  return slot;
}

export function grantConsumableCharge(game, key) {
  const def = getConsumableDefinition(key);
  if (!def) return null;
  return addConsumableCharge(game, def);
}

export function buyShopItem(game, key) {
  const def = getConsumableDefinition(key);
  if (!def) return false;
  const failure = getShopFailureReason(game, key);
  if (failure) {
    if (failure !== "Not enough gold") pushConsumableMessage(game, failure);
    return false;
  }
  const price = getConsumablePriceForFloor(def, game.floor);
  game.gold -= price;
  if (typeof game.recordRunGoldSpent === "function") game.recordRunGoldSpent(price);
  const entry = game.shopStock.find((item) => item?.key === key);
  if (entry) entry.stock = Math.max(0, (entry.stock || 0) - 1);
  enqueueOwlDeliveryOrder(game, def.key, 1, typeof game.player?.id === "string" && game.player.id ? game.player.id : "player");
  return true;
}

function consumeSlotCharge(game, slot, type) {
  if (!slot) return;
  slot.count = Math.max(0, (slot.count || 0) - 1);
  if (slot.count > 0) return;
  const slots = getConsumableSlots(game, type);
  const index = slots.indexOf(slot);
  if (index >= 0) slots.splice(index, 1);
}

function showConsumableConsumedText(game, def) {
  if (!def || typeof game?.spawnFloatingText !== "function") return;
  const x = Number.isFinite(game.player?.x) ? game.player.x : 0;
  const y = Number.isFinite(game.player?.y) ? game.player.y - 42 : -42;
  game.spawnFloatingText(x, y, def.name, "#d7e4ff", 0.9, 14);
}

function getConsumableTempHp(game) {
  return Math.max(0, Number.isFinite(game.player?.consumableRuntime?.tempHp) ? game.player.consumableRuntime.tempHp : 0);
}

function setConsumableTempHp(game, amount) {
  if (!game.player.consumableRuntime || typeof game.player.consumableRuntime !== "object") {
    game.player.consumableRuntime = { tempHp: 0 };
  }
  game.player.consumableRuntime.tempHp = Math.max(0, Number.isFinite(amount) ? amount : 0);
}

function clearConsumableStateForRemoval(game, consumables) {
  consumables.activeSlots = [];
  consumables.passiveSlots = [];
  consumables.sharedCooldown = 0;
  consumables.effects = createConsumableEffectState();
  setConsumableTempHp(game, 0);
}

function canUseConsumable(game, def) {
  if (!def) return false;
  if (def.key === "phoenixDraught") return getPhoenixDraughtTargets(game).length > 0;
  if (def.key === "regenerationPotion") return (game.player?.health || 0) < (game.player?.maxHealth || 0);
  if (def.key === "lanternFuel") {
    const maxFuel = Number.isFinite(game.config?.lighting?.lanternMaxFuel) ? game.config.lighting.lanternMaxFuel : 1;
    return (Number.isFinite(game.player?.lanternFuel) ? game.player.lanternFuel : 0) < maxFuel;
  }
  return true;
}

function spawnHolyCandle(game) {
  if (!Array.isArray(game.lightSources)) game.lightSources = [];
  const tile = Number.isFinite(game.config?.map?.tile) ? game.config.map.tile : 32;
  const time = Number.isFinite(game.time) ? game.time : 0;
  game.lightSources.push({
    id: `holy-candle-${Math.round(time * 1000)}-${game.lightSources.length}`,
    type: "holyCandle",
    x: Number.isFinite(game.player?.x) ? game.player.x : 0,
    y: Number.isFinite(game.player?.y) ? game.player.y : 0,
    size: 18,
    lit: true,
    life: 10,
    healTick: 1,
    healPctPerSecond: 0.05,
    lightRadius: tile * 3,
    lightIntensity: 0.45
  });
}

function usePhoenixDraught(game) {
  const targets = getPhoenixDraughtTargets(game);
  if (targets.length <= 0) return false;
  const target = targets[Math.floor(Math.random() * targets.length)] || targets[0];
  target.x = Number.isFinite(game.player?.x) ? game.player.x : target.x;
  target.y = Number.isFinite(game.player?.y) ? game.player.y : target.y;
  target.health = Math.max(1, Math.ceil((Number.isFinite(target.maxHealth) ? target.maxHealth : 1) * PHOENIX_DRAUGHT_REVIVE_PCT));
  target.alive = true;
  target.spectateTargetId = "";
  if (typeof game.markPlayerEntityHealthBarVisible === "function") game.markPlayerEntityHealthBarVisible(target);
  if (typeof game.spawnFloatingText === "function") {
    game.spawnFloatingText(target.x, target.y - 34, "Revived!", "#ffc766", 0.95, 15);
  }
  pushConsumableMessage(game, `${target.handle || "Ally"} revived`);
  return true;
}

function activateConsumableEffect(game, def) {
  const effects = ensureConsumableState(game).effects;
  switch (def.key) {
    case "regenerationPotion":
      effects.regenerationPotion.timer = 10;
      effects.regenerationPotion.total = 10;
      effects.regenerationPotion.healPool = Math.max(1, (game.player?.maxHealth || 1) * 0.2);
      effects.regenerationPotion.textTimer = 1;
      effects.regenerationPotion.textHealPool = 0;
      return true;
    case "speedPotion":
      effects.speedPotion.timer = 10;
      return true;
    case "frostOil":
      effects.frostOil.timer = 0;
      effects.frostOil.attacksRemaining = OIL_ATTACK_CHARGES;
      return true;
    case "fireOil":
      effects.fireOil.timer = 0;
      effects.fireOil.attacksRemaining = OIL_ATTACK_CHARGES;
      return true;
    case "spikeGrowth":
      effects.spikeGrowth.timer = 0;
      effects.spikeGrowth.attacksRemaining = SPIKE_GROWTH_HITS;
      return true;
    case "lanternFuel":
      addLanternFuel(game, game.player, 0.2);
      return true;
    case "darkvisionPotion":
      effects.darkvisionPotion.timer = 30;
      return true;
    case "holyCandle":
      spawnHolyCandle(game);
      return true;
    case "phoenixDraught":
      return usePhoenixDraught(game);
    case "shield":
      setConsumableTempHp(game, getConsumableTempHp(game) + 10);
      return true;
    default:
      return false;
  }
}

export function useConsumableSlot(game, slotIndex) {
  const consumables = ensureConsumableState(game);
  const index = Math.max(0, Math.floor(slotIndex));
  const slot = consumables.activeSlots[index];
  if (!slot || (slot.count || 0) <= 0) return false;
  if ((consumables.sharedCooldown || 0) > 0) {
    pushConsumableMessage(game, "Consumables on cooldown");
    return false;
  }
  const def = getConsumableDefinition(slot.key);
  if (!def || def.type !== "Active") return false;
  if (!canUseConsumable(game, def)) {
    pushConsumableMessage(game, "Cannot use now");
    return false;
  }
  const activated = activateConsumableEffect(game, def);
  if (!activated) return false;
  consumeSlotCharge(game, slot, "Active");
  showConsumableConsumedText(game, def);
  consumables.sharedCooldown = ACTIVE_CONSUMABLE_COOLDOWN;
  pushConsumableMessage(game, `${def.name} used`);
  return true;
}

export function tickConsumables(game, dt) {
  const consumables = ensureConsumableState(game);
  consumables.sharedCooldown = Math.max(0, (consumables.sharedCooldown || 0) - dt);
  consumables.messageTimer = Math.max(0, (consumables.messageTimer || 0) - dt);
  if ((consumables.messageTimer || 0) <= 0) consumables.message = "";
  for (const slot of consumables.passiveSlots) {
    slot.cooldownRemaining = Math.max(0, (slot.cooldownRemaining || 0) - dt);
  }
  const effects = consumables.effects;
  for (const key of Object.keys(effects)) {
    const effect = effects[key];
    if (!effect || typeof effect !== "object") continue;
    if (Number.isFinite(effect.timer)) effect.timer = Math.max(0, effect.timer - dt);
  }
  const regen = effects.regenerationPotion;
  if ((regen?.timer || 0) > 0 && (regen?.healPool || 0) > 0 && (game.player?.health || 0) > 0) {
    const duration = Math.max(dt, regen.total || 10);
    const healAmount = Math.min(regen.healPool, (regen.healPool / duration) * dt);
    regen.healPool = Math.max(0, regen.healPool - healAmount);
    if (healAmount > 0 && typeof game.applyPlayerHealing === "function") {
      const before = Number.isFinite(game.player?.health) ? game.player.health : 0;
      game.applyPlayerHealing(healAmount, { suppressText: true });
      const after = Number.isFinite(game.player?.health) ? game.player.health : before;
      regen.textHealPool = Math.max(0, (regen.textHealPool || 0) + Math.max(0, after - before));
      regen.textTimer = Math.max(0, (regen.textTimer || 0) - dt);
      if ((regen.textTimer || 0) <= 0 && (regen.textHealPool || 0) > 0 && typeof game.spawnFloatingText === "function") {
        game.spawnFloatingText(
          game.player.x,
          game.player.y - 26,
          `+${Math.max(1, Math.round(regen.textHealPool))}`,
          typeof game.getHealingTextColor === "function" ? game.getHealingTextColor() : "#79e59a",
          0.8,
          14
        );
        regen.textHealPool = 0;
        regen.textTimer = 1;
      }
    }
  } else if ((regen?.timer || 0) <= 0) {
    if ((regen?.textHealPool || 0) > 0 && typeof game.spawnFloatingText === "function") {
      game.spawnFloatingText(
        game.player.x,
        game.player.y - 26,
        `+${Math.max(1, Math.round(regen.textHealPool))}`,
        typeof game.getHealingTextColor === "function" ? game.getHealingTextColor() : "#79e59a",
        0.8,
        14
      );
    }
    regen.healPool = 0;
    regen.textHealPool = 0;
    regen.textTimer = 0;
  }
}

function hasOilCharges(effect) {
  return (effect?.attacksRemaining || 0) > 0;
}

export function getActiveConsumableAttackEffects(game) {
  const effects = ensureConsumableState(game).effects;
  return {
    fireOil: hasOilCharges(effects.fireOil),
    frostOil: hasOilCharges(effects.frostOil)
  };
}

export function consumeConsumableAttackCharge(game, attackEffects = null) {
  const effects = ensureConsumableState(game).effects;
  const active = attackEffects || getActiveConsumableAttackEffects(game);
  if (active.fireOil && (effects.fireOil?.attacksRemaining || 0) > 0) {
    effects.fireOil.attacksRemaining = Math.max(0, Math.floor(effects.fireOil.attacksRemaining || 0) - 1);
  }
  if (active.frostOil && (effects.frostOil?.attacksRemaining || 0) > 0) {
    effects.frostOil.attacksRemaining = Math.max(0, Math.floor(effects.frostOil.attacksRemaining || 0) - 1);
  }
}

export function applyConsumableOnHitEffects(game, enemy, ownerId = null, attackEffects = null) {
  const active = attackEffects || getActiveConsumableAttackEffects(game);
  if (active.fireOil) {
    enemy.burningTimer = Math.max(enemy.burningTimer || 0, 2);
    enemy.burningDps = Math.max(enemy.burningDps || 0, 1.5);
    enemy.lastDamageOwnerId = ownerId || enemy.lastDamageOwnerId || null;
  }
  if (active.frostOil) {
    enemy.slowPct = Math.max(enemy.slowPct || 0, 0.15);
    enemy.slowTimer = Math.max(enemy.slowTimer || 0, 3);
  }
}

export function getConsumableBonusDamage(game) {
  const effects = ensureConsumableState(game).effects;
  let bonus = 0;
  if (hasOilCharges(effects.fireOil)) bonus += 2;
  if (hasOilCharges(effects.frostOil)) bonus += 2;
  return bonus;
}

export function applyPassiveConsumableEvent(game, eventKey, payload = {}) {
  const consumables = ensureConsumableState(game);
  const slots = cloneConsumableSlots(consumables.passiveSlots);
  let changed = false;
  for (const clonedSlot of slots) {
    const liveSlot = consumables.passiveSlots.find((entry) => entry?.key === clonedSlot.key) || null;
    if (!liveSlot || (liveSlot.count || 0) <= 0 || (liveSlot.cooldownRemaining || 0) > 0) continue;
    const def = getConsumableDefinition(liveSlot.key);
    if (!def) continue;
    if (eventKey === "lethalDamage" && def.key === "angelRing") {
      if (typeof game.applyPlayerHealing === "function") game.applyPlayerHealing((game.player?.maxHealth || 0) * 0.2, { suppressText: true });
      if (payload && typeof payload === "object") payload.preventDeath = true;
      consumeSlotCharge(game, liveSlot, "Passive");
      showConsumableConsumedText(game, def);
      changed = true;
      continue;
    }
    if (eventKey === "floorAdvance" && def.key === "monkeyPaw") {
      game.player.health = game.player.maxHealth;
      if (typeof game.gainExperience === "function") game.gainExperience(game.expToNextLevel);
      showConsumableConsumedText(game, def);
      clearConsumableStateForRemoval(game, consumables);
      pushConsumableMessage(game, "Monkey Paw triggered");
      changed = true;
      break;
    }
  }
  return changed;
}

export function refillShopForFloor(game) {
  game.shopStock = rollConsumableShopStock(Math.max(1, Math.floor(game.floor || 1)), 5);
}
