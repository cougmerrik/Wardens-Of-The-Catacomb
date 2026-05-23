import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { createConsumableInventoryState, cloneConsumableInventoryState } from "../src/game/consumables.js";
import {
  applyConsumableOnHitEffects,
  consumeConsumableAttackCharge,
  getActiveConsumableAttackEffects,
  getConsumableBonusDamage,
  tickConsumables,
  useConsumableSlot
} from "../src/game/world/consumablesEconomy.js";

function makeGame() {
  return {
    player: { health: 100, maxHealth: 100, x: 0, y: 0, id: "p1", consumableRuntime: { tempHp: 0 } },
    consumables: createConsumableInventoryState(),
    floatingText: [],
    getHealingTextColor() {
      return "#79e59a";
    },
    applyPlayerHealing(amount) {
      this.player.health = Math.min(this.player.maxHealth, this.player.health + Math.max(0, amount));
    },
    spawnFloatingText(x, y, text, color) {
      this.floatingText.push({ x, y, text, color });
    }
  };
}

function useOil(game, key) {
  game.consumables.activeSlots = [{ key, count: 1, cooldownRemaining: 0 }];
  assert.equal(useConsumableSlot(game, 0), true, `${key} should activate`);
  assert.equal(game.consumables.activeSlots.length, 0, `${key} charge should be consumed from inventory`);
}

function validateOilCharges(key, statusField) {
  const game = makeGame();
  useOil(game, key);
  const effect = game.consumables.effects[key];
  assert.equal(effect.attacksRemaining, 15, `${key} should grant 15 attacks`);
  assert.equal(effect.timer, 0, `${key} should not use a duration timer`);
  tickConsumables(game, 3);
  assert.equal(effect.attacksRemaining, 15, `${key} attacks should not decay over time`);
  assert.equal(getConsumableBonusDamage(game), 2, `${key} should add bonus damage while charged`);

  const active = getActiveConsumableAttackEffects(game);
  assert.equal(active[key], true, `${key} should be active in attack snapshots`);
  const enemy = {};
  applyConsumableOnHitEffects(game, enemy, "p1", active);
  assert.ok(enemy[statusField] > 0, `${key} should apply its on-hit status`);

  consumeConsumableAttackCharge(game, active);
  assert.equal(effect.attacksRemaining, 14, `${key} should spend one attack charge`);
  const cloned = cloneConsumableInventoryState(game.consumables);
  assert.equal(cloned.effects[key].attacksRemaining, 14, `${key} attack charges should clone for network state`);

  effect.attacksRemaining = 1;
  const projectileSnapshot = getActiveConsumableAttackEffects(game);
  consumeConsumableAttackCharge(game, projectileSnapshot);
  assert.equal(effect.attacksRemaining, 0, `${key} should expire at zero charges`);
  assert.equal(getConsumableBonusDamage(game), 0, `${key} should stop adding damage after expiration`);
  const lateEnemy = {};
  applyConsumableOnHitEffects(game, lateEnemy, "p1", projectileSnapshot);
  assert.ok(lateEnemy[statusField] > 0, `${key} projectile snapshots should keep the fired attack coated`);
}

function validateStaleOilTimersAreInactive(key, statusField) {
  const zeroChargeGame = makeGame();
  zeroChargeGame.consumables.effects[key] = { timer: 99, attacksRemaining: 0 };
  assert.equal(getActiveConsumableAttackEffects(zeroChargeGame)[key], false, `${key} timer should not activate zero-charge restored state`);
  assert.equal(getConsumableBonusDamage(zeroChargeGame), 0, `${key} timer should not add bonus damage without charges`);
  const zeroChargeEnemy = {};
  applyConsumableOnHitEffects(zeroChargeGame, zeroChargeEnemy, "p1");
  assert.equal(zeroChargeEnemy[statusField], undefined, `${key} timer should not apply on-hit status without charges`);
  assert.equal(zeroChargeGame.consumables.effects[key].timer, 0, `${key} stale timer should be normalized away`);

  const missingChargeGame = makeGame();
  missingChargeGame.consumables.effects[key] = { timer: 99 };
  assert.equal(getActiveConsumableAttackEffects(missingChargeGame)[key], false, `${key} timer should not migrate to fresh charges`);
  assert.equal(missingChargeGame.consumables.effects[key].attacksRemaining, 0, `${key} missing charge count should normalize to zero`);
  assert.equal(missingChargeGame.consumables.effects[key].timer, 0, `${key} missing-charge timer should be normalized away`);
}

function validateRegenerationPotionFeedback() {
  const game = makeGame();
  game.player.health = 50;
  game.consumables.activeSlots = [{ key: "regenerationPotion", count: 1, cooldownRemaining: 0 }];
  assert.equal(useConsumableSlot(game, 0), true, "regeneration potion should activate");
  assert.ok((game.consumables.effects.regenerationPotion.timer || 0) > 0, "regeneration potion should track active duration");
  tickConsumables(game, 1);
  assert.ok(game.player.health > 50, "regeneration potion should heal over time");
  assert.ok(game.floatingText.some((entry) => /^\+\d+/.test(entry.text)), "regeneration potion healing should show gain text");
}

function validateStatusPanelCoverage() {
  const source = readFileSync("src/rendering/hud/classStatusPanel.js", "utf8");
  for (const key of ["regenerationPotion", "speedPotion", "fireOil", "frostOil", "spikeGrowth", "shield"]) {
    assert.ok(source.includes(`key: "${key}"`), `class status panel should render ${key}`);
  }
  assert.ok(source.includes("getConsumableStatusRows(width) * 28"), "class status panel should reserve fixed consumable rows");
  assert.ok(!source.includes("if (consumableStatuses.length > 0) rect.h +="), "class status panel should not resize only when effects are active");
}

function getMethodSource(source, methodName, endMarker) {
  const start = source.indexOf(`  ${methodName}(`);
  const end = source.indexOf(endMarker, start + 1);
  assert.ok(start >= 0, `${methodName} source should be present`);
  assert.ok(end > start, `${methodName} source end marker should be present`);
  return source.slice(start, end);
}

function validateMeleeOilsSpendOnUse() {
  const warriorSource = readFileSync("src/game/runtimePlayerAttackMethods.js", "utf8");
  const mageSource = readFileSync("src/game/playerAttack/runtimeMageCoreAttackMethods.js", "utf8");
  const warriorMelee = getMethodSource(warriorSource, "performMeleeAttack", "\n\n  ...runtimeRangerActiveAttackMethods");
  const mimicTongue = getMethodSource(mageSource, "performMageMimicTongue", "\n  performMageGreenFlameBlade(");
  const greenFlameBlade = getMethodSource(mageSource, "performMageGreenFlameBlade", "\n\n};");

  assert.ok(!/hitAnyEnemy\s*&&\s*\(consumableAttackEffects\?\.fireOil/.test(warriorMelee), "warrior melee oils should spend on swing, not only on hit");
  assert.ok(!/hitAnyEnemy\s*&&\s*\(consumableAttackEffects\?\.fireOil/.test(greenFlameBlade), "green-flame blade oils should spend on swing, not only on hit");
  assert.ok(
    mimicTongue.indexOf("this.consumeConsumableAttackCharge(consumableAttackEffects)") > mimicTongue.lastIndexOf("break;"),
    "mimic tongue oils should spend after the attack resolves, including whiffs"
  );
}

function main() {
  validateOilCharges("fireOil", "burningTimer");
  validateOilCharges("frostOil", "slowTimer");
  validateStaleOilTimersAreInactive("fireOil", "burningTimer");
  validateStaleOilTimersAreInactive("frostOil", "slowTimer");
  validateRegenerationPotionFeedback();
  validateStatusPanelCoverage();
  validateMeleeOilsSpendOnUse();
  console.log(JSON.stringify({ consumableEffects: "ok" }, null, 2));
}

main();
