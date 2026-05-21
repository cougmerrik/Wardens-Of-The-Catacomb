import { strict as assert } from "node:assert";
import { GameSim } from "../src/sim/GameSim.js";

function assertInactiveEffect(effect, fields, label) {
  for (const field of fields) {
    assert.equal(effect?.[field], 0, `${label}.${field} should reset`);
  }
}

function main() {
  const game = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  game.player.maxHealth = 100;
  game.player.health = 25;
  game.level = 1;
  game.experience = 0;
  game.expToNextLevel = 10;
  game.consumables.activeSlots = [
    { key: "fireOil", count: 1, cooldownRemaining: 0 },
    { key: "shield", count: 1, cooldownRemaining: 0 }
  ];
  game.consumables.passiveSlots = [
    { key: "monkeyPaw", count: 1, cooldownRemaining: 0 }
  ];
  game.consumables.sharedCooldown = 1.5;
  game.consumables.effects.regenerationPotion.timer = 8;
  game.consumables.effects.regenerationPotion.total = 10;
  game.consumables.effects.regenerationPotion.healPool = 16;
  game.consumables.effects.speedPotion.timer = 7;
  game.consumables.effects.frostOil.timer = 6;
  game.consumables.effects.fireOil.timer = 5;
  game.consumables.effects.spikeGrowth.timer = 4;
  game.player.consumableRuntime.tempHp = 10;

  const changed = game.applyPassiveConsumableEvent("floorAdvance");

  assert.equal(changed, true, "Monkey Paw should trigger on floor advance");
  assert.equal(game.player.health, game.player.maxHealth, "Monkey Paw should fully heal the player");
  assert.equal(game.level, 2, "Monkey Paw should immediately grant a level");
  assert.deepEqual(game.consumables.activeSlots, [], "Monkey Paw should remove active consumables");
  assert.deepEqual(game.consumables.passiveSlots, [], "Monkey Paw should remove passive consumables");
  assert.equal(game.consumables.sharedCooldown, 0, "Monkey Paw should clear shared consumable cooldown");
  assert.equal(game.player.consumableRuntime.tempHp, 0, "Monkey Paw should clear shield temporary HP");
  assertInactiveEffect(game.consumables.effects.regenerationPotion, ["timer", "total", "healPool"], "regenerationPotion");
  assertInactiveEffect(game.consumables.effects.speedPotion, ["timer"], "speedPotion");
  assertInactiveEffect(game.consumables.effects.frostOil, ["timer"], "frostOil");
  assertInactiveEffect(game.consumables.effects.fireOil, ["timer"], "fireOil");
  assertInactiveEffect(game.consumables.effects.spikeGrowth, ["timer"], "spikeGrowth");

  console.log(JSON.stringify({
    consumablesEconomy: "ok"
  }, null, 2));
}

main();
