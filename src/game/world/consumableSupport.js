import { getConsumableDefinition } from "../consumables.js";

export const createDefaultConsumableEffects = () => ({
  bloodwine: { timer: 0 },
  potionOfSkill: { timer: 0 },
  stonebloodBeads: { timer: 0, charges: 0, maxCharges: 0 },
  guardianBell: { timer: 0 },
  frostWard: { stationaryTimer: 0, ready: 0 },
  regenerationPotion: { timer: 0, total: 0, healPool: 0 },
  speedPotion: { timer: 0 },
  frostOil: { timer: 0 },
  fireOil: { timer: 0 },
  spikeGrowth: { timer: 0 }
});

export function ensureConsumableInventoryRecord(inventory) {
  const next = inventory && typeof inventory === "object"
    ? inventory
    : { activeSlots: [], passiveSlots: [], sharedCooldown: 0, message: "", messageTimer: 0, effects: {} };
  if (!Array.isArray(next.activeSlots)) next.activeSlots = [];
  if (!Array.isArray(next.passiveSlots)) next.passiveSlots = [];
  if (!next.effects || typeof next.effects !== "object") next.effects = {};
  for (const [key, effectState] of Object.entries(createDefaultConsumableEffects())) {
    if (!next.effects[key] || typeof next.effects[key] !== "object") next.effects[key] = effectState;
  }
  return next;
}

export function getConsumableInventoryForEntity(game, entity = game?.player) {
  if (!entity || entity === game?.player) {
    game.consumables = ensureConsumableInventoryRecord(game?.consumables);
    return game.consumables;
  }
  entity.consumables = ensureConsumableInventoryRecord(entity.consumables);
  return entity.consumables;
}

export function getConsumableEffectsForEntity(game, entity = game?.player) {
  return getConsumableInventoryForEntity(game, entity).effects;
}

export function getConsumableSlotForEntity(game, entity, key, type = null) {
  const def = type ? { type } : getConsumableDefinition(key);
  if (!def) return null;
  const inventory = getConsumableInventoryForEntity(game, entity);
  const slots = def.type === "Passive" ? inventory.passiveSlots : inventory.activeSlots;
  return slots.find((slot) => slot?.key === key) || null;
}

export function getConsumablePassiveSlotForEntity(game, entity, key) {
  return getConsumableSlotForEntity(game, entity, key, "Passive");
}

export function hasPassiveConsumableForEntity(game, entity, key) {
  const slot = getConsumablePassiveSlotForEntity(game, entity, key);
  return !!slot && (slot.count || 0) > 0;
}

export function consumeConsumableChargeForEntity(game, entity, slot, type) {
  if (!slot) return;
  slot.count = Math.max(0, (slot.count || 0) - 1);
  if (slot.count > 0) return;
  const inventory = getConsumableInventoryForEntity(game, entity);
  const slots = type === "Passive" ? inventory.passiveSlots : inventory.activeSlots;
  const index = slots.indexOf(slot);
  if (index >= 0) slots.splice(index, 1);
}

export function getConsumableRuntimeForEntity(entity) {
  if (!entity || typeof entity !== "object") return { tempHp: 0 };
  entity.consumableRuntime = entity.consumableRuntime && typeof entity.consumableRuntime === "object"
    ? entity.consumableRuntime
    : { tempHp: 0 };
  entity.consumableRuntime.tempHp = Math.max(0, Number.isFinite(entity.consumableRuntime.tempHp) ? entity.consumableRuntime.tempHp : 0);
  return entity.consumableRuntime;
}

export function getConsumableTempHpForEntity(entity) {
  return Math.max(0, Number.isFinite(entity?.consumableRuntime?.tempHp) ? entity.consumableRuntime.tempHp : 0);
}

export function setConsumableTempHpForEntity(entity, amount) {
  const runtime = getConsumableRuntimeForEntity(entity);
  runtime.tempHp = Math.max(0, Number.isFinite(amount) ? amount : 0);
}

export function getMirageDecoys(game) {
  return Array.isArray(game?.mirageDecoys)
    ? game.mirageDecoys.filter((decoy) => !!decoy && (decoy.life || 0) > 0 && (decoy.hp || 0) > 0)
    : [];
}

export function tickSecondaryPlayerConsumables(game, player, dt) {
  player.consumables = ensureConsumableInventoryRecord(player.consumables);
  player.consumables.sharedCooldown = Math.max(0, Number.isFinite(player.consumables.sharedCooldown) ? player.consumables.sharedCooldown - dt : 0);
  for (const effect of Object.values(player.consumables.effects)) {
    if (effect && typeof effect === "object" && Number.isFinite(effect.timer)) effect.timer = Math.max(0, effect.timer - dt);
  }
  const frostWard = player.consumables.effects.frostWard;
  if (frostWard && typeof frostWard === "object") {
    if ((frostWard.ready || 0) > 0) frostWard.stationaryTimer = 0;
    else if (player.moving) frostWard.stationaryTimer = 0;
    else {
      frostWard.stationaryTimer = Math.min(5, (Number.isFinite(frostWard.stationaryTimer) ? frostWard.stationaryTimer : 0) + dt);
      if ((frostWard.stationaryTimer || 0) >= 5 && hasPassiveConsumableForEntity(game, player, "frostWard")) frostWard.ready = 1;
    }
  }
  const beads = player.consumables.effects.stonebloodBeads;
  if (beads && typeof beads === "object" && (beads.timer || 0) <= 0) beads.charges = 0;
  for (const slot of player.consumables.passiveSlots) {
    slot.cooldownRemaining = Math.max(0, Number.isFinite(slot?.cooldownRemaining) ? slot.cooldownRemaining - dt : 0);
  }
}

export function applyFrostWardProtection(game, entity, amount) {
  if (!Number.isFinite(amount) || amount <= 0) return amount;
  const effects = getConsumableEffectsForEntity(game, entity);
  const frostWard = effects.frostWard;
  if (!frostWard || typeof frostWard !== "object" || (frostWard.ready || 0) <= 0 || !hasPassiveConsumableForEntity(game, entity, "frostWard")) {
    return amount;
  }
  const reduced = amount * 0.2;
  frostWard.ready = 0;
  frostWard.stationaryTimer = 0;
  const slot = getConsumablePassiveSlotForEntity(game, entity, "frostWard");
  if (slot && Math.random() < 0.2) consumeConsumableChargeForEntity(game, entity, slot, "Passive");
  for (const enemy of game.enemies || []) {
    if (!enemy || (enemy.hp || 0) <= 0 || game.isEnemyFriendlyToPlayer(enemy)) continue;
    if (Math.hypot((enemy.x || 0) - (entity.x || 0), (enemy.y || 0) - (entity.y || 0)) > (game.config.map.tile || 32) * 2.5) continue;
    enemy.slowPct = Math.max(enemy.slowPct || 0, 0.4);
    enemy.slowTimer = Math.max(enemy.slowTimer || 0, 2.5);
  }
  if (game.isPrimaryPlayerEntity(entity) && typeof game.spawnFloatingText === "function") {
    game.spawnFloatingText(entity.x, entity.y - 34, "Frost Ward", "#bde8ff", 0.8, 13);
  }
  return reduced;
}

export function awardGoldWithPovertyCharm(game, entity, amount, { spawnText = true } = {}) {
  if (!Number.isFinite(amount) || amount <= 0 || !game.isLivingPlayerEntity(entity)) return false;
  let awardedAmount = amount;
  if (hasPassiveConsumableForEntity(game, entity, "povertyCharm")) awardedAmount = Math.max(1, Math.floor(awardedAmount * 0.5));
  const currentGold = game.getPlayerProgressField(entity, "gold", 0);
  const nextGold = currentGold + awardedAmount;
  game.setPlayerProgressField(entity, "gold", nextGold);
  game.awardScoreToPlayerEntity(entity, awardedAmount);
  if (game.isPrimaryPlayerEntity(entity) && typeof game.recordRunGoldEarned === "function") game.recordRunGoldEarned(awardedAmount);
  else entity.goldEarned = (Number.isFinite(entity.goldEarned) ? entity.goldEarned : 0) + awardedAmount;
  if (spawnText) game.spawnFloatingText(entity.x, entity.y - 30, `+${awardedAmount}g`, "#f2d76b", 0.75, 14);
  if (hasPassiveConsumableForEntity(game, entity, "povertyCharm") && nextGold > 500) {
    const slot = getConsumablePassiveSlotForEntity(game, entity, "povertyCharm");
    if (slot) consumeConsumableChargeForEntity(game, entity, slot, "Passive");
  }
  return true;
}

export function applyStonebloodBeads(game, entity, amount) {
  const stoneblood = getConsumableInventoryForEntity(game, entity)?.effects?.stonebloodBeads;
  if (!stoneblood || (stoneblood.timer || 0) <= 0 || (stoneblood.charges || 0) <= 0) return amount;
  const blocked = Math.min(amount, 6);
  const remaining = Math.max(0, amount - blocked);
  stoneblood.charges = Math.max(0, (stoneblood.charges || 0) - 1);
  if (remaining <= 0 && typeof game.spawnFloatingText === "function") {
    game.spawnFloatingText(entity.x, entity.y - 18, "Beads", "#d9d1ff", 0.65, 13);
  }
  return remaining;
}

export function applyGuardianBellRedirect(game, entity, amount, damageType, source) {
  if (!entity || amount <= 0 || source?.guardianBellRedirect || typeof game.getGuardianBellProtector !== "function") return amount;
  const protector = game.getGuardianBellProtector(entity);
  if (!protector || protector === entity || (protector.health || 0) <= 0) return amount;
  const redirected = amount * 0.35;
  game.applyDamageToPlayerEntity(protector, redirected, damageType, { guardianBellRedirect: true, originalTargetId: entity.id || null });
  return amount - redirected;
}

export function absorbPlayerTempHpLayers(game, entity, amount) {
  const layers = [
    entity?.consumableRuntime,
    entity?.warriorRuntime,
    entity?.necromancerRuntime
  ];
  for (const layer of layers) {
    if (!layer || (layer.tempHp || 0) <= 0) continue;
    const absorbed = Math.min(layer.tempHp, amount);
    layer.tempHp = Math.max(0, layer.tempHp - absorbed);
    amount = Math.max(0, amount - absorbed);
    if (amount <= 0) {
      if (typeof game.spawnFloatingText === "function") game.spawnFloatingText(entity.x, entity.y - 18, "Blocked", "#d9d1ff", 0.65, 13);
      return 0;
    }
  }
  return amount;
}

export function triggerThornMailRetaliation(game, entity, damageAmount) {
  const slot = getConsumablePassiveSlotForEntity(game, entity, "thornMail");
  if (!slot || (slot.count || 0) <= 0 || (slot.cooldownRemaining || 0) > 0) return;
  const target = (game.enemies || []).find((enemy) =>
    enemy &&
    (enemy.hp || 0) > 0 &&
    !game.isEnemyFriendlyToPlayer(enemy) &&
    Math.hypot((enemy.x || 0) - (entity.x || 0), (enemy.y || 0) - (entity.y || 0)) <= ((enemy.size || 20) + (entity.size || 22)) * 0.95
  );
  if (!target) return;
  game.applyEnemyDamage(target, Math.max(3, damageAmount * 0.5), "physical", entity.id || null);
  target.slowPct = Math.max(target.slowPct || 0, 0.25);
  target.slowTimer = Math.max(target.slowTimer || 0, 1.5);
  slot.cooldownRemaining = 3;
}
