import {
  ACTIVE_CONSUMABLE_COOLDOWN,
  ACTIVE_CONSUMABLE_SLOT_CAP,
  PASSIVE_CONSUMABLE_SLOT_CAP,
  cloneConsumableSlots,
  getConsumableDefinition,
  getConsumablePriceForFloor,
  rollConsumableShopStock
} from "../consumables.js";
import {
  consumeConsumableChargeForEntity,
  ensureConsumableInventoryRecord,
  getConsumableEffectsForEntity,
  getConsumableSlotForEntity
} from "./consumableSupport.js";
import {
  activateConsumableEffect,
  applyPrimaryAttackConsumableBenefits,
  canUseConsumableEffect,
  getGuardianBellProtector,
  tryMirrorShardReflect
} from "./consumableItemEffects.js";
export {
  applyPrimaryAttackConsumableBenefits,
  getGuardianBellProtector,
  tryMirrorShardReflect
} from "./consumableItemEffects.js";

export function ensureShopStock(game) {
  if (!Array.isArray(game.shopStock) || game.shopStock.length <= 0) {
    game.shopStock = rollConsumableShopStock(Math.max(1, Math.floor(game.floor || 1)), 5);
  }
  return game.shopStock;
}

function ensureConsumableState(game) {
  game.consumables = ensureConsumableInventoryRecord(game.consumables);
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
  return slots.length < cap;
}

export function getShopFailureReason(game, key) {
  const def = getConsumableDefinition(key);
  if (!def) return "Out of stock";
  ensureShopStock(game);
  const entry = game.shopStock.find((item) => item?.key === key);
  if (!entry || entry.stock <= 0) return "Out of stock";
  const ownedCount = getConsumableOwnedCount(game, key);
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

export function buyShopItem(game, key) {
  const def = getConsumableDefinition(key);
  if (!def) return false;
  const failure = getShopFailureReason(game, key);
  if (failure) {
    pushConsumableMessage(game, failure);
    return false;
  }
  const price = getConsumablePriceForFloor(def, game.floor);
  game.gold -= price;
  if (typeof game.recordRunGoldSpent === "function") game.recordRunGoldSpent(price);
  const entry = game.shopStock.find((item) => item?.key === key);
  if (entry) entry.stock = Math.max(0, (entry.stock || 0) - 1);
  addConsumableCharge(game, def);
  pushConsumableMessage(game, `${def.name} purchased`);
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

function resetPointTree(tree) {
  if (!tree || typeof tree !== "object") return 0;
  let refunded = 0;
  for (const node of Object.values(tree)) {
    if (!node || !Number.isFinite(node.points) || node.points <= 0) continue;
    refunded += node.points;
    node.points = 0;
  }
  return refunded;
}

function clearRefundedSkillState(game) {
  game.warriorMomentumTimer = 0;
  game.warriorRageActiveTimer = 0;
  game.warriorRageCooldownTimer = 0;
  game.warriorRageVictoryRushPool = 0;
  game.warriorRageVictoryRushTimer = 0;
  if (!game.necromancerBeam || typeof game.necromancerBeam !== "object") game.necromancerBeam = {};
  game.necromancerBeam.active = false;
  game.necromancerBeam.targetEnemy = null;
  game.necromancerBeam.targetId = null;
  game.necromancerBeam.targetX = 0;
  game.necromancerBeam.targetY = 0;
  game.necromancerBeam.progress = 0;
  game.necromancerBeam.healTickTimer = 0;
  if (game.player) {
    game.player.fireArrowCooldown = 0;
    game.player.deathBoltCooldown = 0;
  }
}

function resetAllSkillsAndTalents(game) {
  let refunded = 0;
  refunded += resetPointTree(game.skills);
  refunded += resetPointTree(game.rangerTalents);
  refunded += resetPointTree(game.warriorTalents);
  refunded += resetPointTree(game.necromancerTalents);
  game.skillPoints = Math.max(0, (Number.isFinite(game.skillPoints) ? game.skillPoints : 0) + refunded);
  clearRefundedSkillState(game);
  return refunded;
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
  if (!canUseConsumableEffect(game, def)) {
    pushConsumableMessage(game, "Cannot use now");
    return false;
  }
  const activated = activateConsumableEffect(game, def, consumables.effects);
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
  if ((effects.stonebloodBeads?.timer || 0) <= 0) effects.stonebloodBeads.charges = 0;
  const moving = !!game.player?.moving;
  if ((effects.frostWard?.ready || 0) > 0) {
    effects.frostWard.stationaryTimer = 0;
  } else if (moving) {
    effects.frostWard.stationaryTimer = 0;
  } else {
    effects.frostWard.stationaryTimer = Math.min(5, (effects.frostWard.stationaryTimer || 0) + dt);
    if ((effects.frostWard.stationaryTimer || 0) >= 5 && getConsumableSlot(game, "frostWard", "Passive")) effects.frostWard.ready = 1;
  }
  const regen = effects.regenerationPotion;
  if ((regen?.timer || 0) > 0 && (regen?.healPool || 0) > 0 && (game.player?.health || 0) > 0) {
    const duration = Math.max(dt, regen.total || 10);
    const healAmount = Math.min(regen.healPool, (regen.healPool / duration) * dt);
    regen.healPool = Math.max(0, regen.healPool - healAmount);
    if (healAmount > 0 && typeof game.applyPlayerHealing === "function") {
      game.applyPlayerHealing(healAmount, { suppressText: true });
    }
  } else if ((regen?.timer || 0) <= 0) {
    regen.healPool = 0;
  }
}

export function applyConsumableOnHitEffects(game, enemy, ownerId = null) {
  const effects = ensureConsumableState(game).effects;
  if ((effects.fireOil?.timer || 0) > 0) {
    enemy.burningTimer = Math.max(enemy.burningTimer || 0, 2);
    enemy.burningDps = Math.max(enemy.burningDps || 0, 1.5);
    enemy.lastDamageOwnerId = ownerId || enemy.lastDamageOwnerId || null;
  }
  if ((effects.frostOil?.timer || 0) > 0) {
    enemy.slowPct = Math.max(enemy.slowPct || 0, 0.15);
    enemy.slowTimer = Math.max(enemy.slowTimer || 0, 3);
  }
}

export function getConsumableBonusDamage(game) {
  const effects = ensureConsumableState(game).effects;
  let bonus = 0;
  if ((effects.fireOil?.timer || 0) > 0) bonus += 2;
  if ((effects.frostOil?.timer || 0) > 0) bonus += 2;
  return bonus;
}

export function getEntityConsumableEffects(game, entity = null) {
  return getConsumableEffectsForEntity(game, entity);
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
      consumables.activeSlots = [];
      consumables.passiveSlots = [];
      consumables.sharedCooldown = 0;
      pushConsumableMessage(game, "Monkey Paw triggered");
      changed = true;
      break;
    }
    if (eventKey === "floorAdvance" && def.key === "amnesiaTalisman") {
      const refunded = resetAllSkillsAndTalents(game);
      if (refunded > 0) {
        if (typeof game.spawnFloatingText === "function" && game.player) {
          game.spawnFloatingText(game.player.x, game.player.y - 26, "Amnesia", "#d9c4ff", 0.95, 16);
        }
        changed = true;
      }
    }
  }
  return changed;
}

export function refillShopForFloor(game) {
  game.shopStock = rollConsumableShopStock(Math.max(1, Math.floor(game.floor || 1)), 5);
}
