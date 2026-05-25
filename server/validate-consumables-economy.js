import { strict as assert } from "node:assert";
import { GameSim } from "../src/sim/GameSim.js";
import { getFlameOfTheFallenBuffMultiplier, recordFlameOfTheFallenKill } from "../src/game/world/consumablesEconomy.js";
import { tickShopStockRotation } from "../src/game/world/shopStockRotation.js";
import { getFlameOfTheFallenRequiredSouls } from "../src/game/world/flameOfTheFallen.js";
import { getConsumableDefinition, rollConsumableShopStock } from "../src/game/consumables.js";
import { applyDevStartingConsumables, getDevStartingConsumableOptions, grantDevStartingConsumable } from "../src/game/devStartingConsumables.js";

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
  assertInactiveEffect(game.consumables.effects.spikeGrowth, ["timer", "attacksRemaining"], "spikeGrowth");

  const itemGame = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  itemGame.player.maxHealth = 100;
  itemGame.player.health = 50;
  itemGame.player.lanternFuel = 0.25;
  itemGame.consumables.activeSlots = [
    { key: "lanternFuel", count: 1, cooldownRemaining: 0 },
    { key: "darkvisionPotion", count: 1, cooldownRemaining: 0 },
    { key: "holyCandle", count: 1, cooldownRemaining: 0 },
    { key: "spikeGrowth", count: 1, cooldownRemaining: 0 }
  ];
  assert.equal(itemGame.useConsumableSlot(0), true, "Lantern Fuel should be usable below full fuel");
  assert.equal(itemGame.player.lanternFuel, 0.45, "Lantern Fuel should add 20% fuel");
  itemGame.consumables.sharedCooldown = 0;
  assert.equal(itemGame.useConsumableSlot(0), true, "Darkvision Potion should be usable");
  assert.equal(itemGame.consumables.effects.darkvisionPotion.timer, 30, "Darkvision Potion should last 30 seconds");
  assert(itemGame.getPlayerLightRadius(itemGame.player) >= itemGame.config.map.tile * 10, "Darkvision should provide 10 tiles of sight");
  itemGame.consumables.sharedCooldown = 0;
  assert.equal(itemGame.useConsumableSlot(0), true, "Holy Candle should be usable");
  const candle = itemGame.lightSources.find((light) => light.type === "holyCandle");
  assert(candle, "Holy Candle should drop a ground light source");
  assert.equal(candle.lightRadius, itemGame.config.map.tile * 3, "Holy Candle light should have a 3 tile radius");
  itemGame.updateLightingInteractions(1);
  assert(itemGame.player.health > 50, "Holy Candle should heal players inside its radius");
  itemGame.consumables.sharedCooldown = 0;
  assert.equal(itemGame.useConsumableSlot(0), true, "Spike Growth should be usable");
  assert.equal(itemGame.consumables.effects.spikeGrowth.attacksRemaining, 25, "Spike Growth should use 25 hit charges");

  const soloPhoenixGame = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  assert(!soloPhoenixGame.shopStock.some((entry) => getConsumableDefinition(entry.key)?.multiplayerOnly), "single-player initial shop should not include multiplayer-only items");
  soloPhoenixGame.refillShopForFloor();
  assert(!soloPhoenixGame.shopStock.some((entry) => getConsumableDefinition(entry.key)?.multiplayerOnly), "single-player refill shop should not include multiplayer-only items");
  soloPhoenixGame.gold = 1000;
  soloPhoenixGame.shopStock = [{ key: "phoenixDraught", stock: 1 }];
  assert.equal(soloPhoenixGame.getShopFailureReason("phoenixDraught"), "Multiplayer only", "Phoenix Draught should be blocked from single-player purchase");
  soloPhoenixGame.consumables.activeSlots = [{ key: "phoenixDraught", count: 1, cooldownRemaining: 0 }];
  assert.equal(soloPhoenixGame.useConsumableSlot(0), false, "Phoenix Draught should not be usable in single player");
  assert.equal(soloPhoenixGame.consumables.activeSlots[0]?.count, 1, "blocked Phoenix Draught should not be consumed");
  soloPhoenixGame.gold = 0;
  soloPhoenixGame.shopStock = [{ key: "shield", stock: 1 }];
  assert.equal(soloPhoenixGame.buyShopItem("shield"), false, "unaffordable purchases should fail");
  assert.equal(soloPhoenixGame.consumables.message, "Not enough gold", "unaffordable purchases should show feedback");

  const phoenixGame = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  phoenixGame.player.id = "living";
  phoenixGame.player.x = 300;
  phoenixGame.player.y = 420;
  const deadAlly = {
    id: "dead-ally",
    handle: "Dead Ally",
    x: 120,
    y: 140,
    size: 22,
    health: 0,
    maxHealth: 100,
    alive: false,
    consumables: { activeSlots: [], passiveSlots: [], sharedCooldown: 0, effects: {} }
  };
  phoenixGame.activePlayerCount = 2;
  phoenixGame.networkActivePlayers = [phoenixGame.player, deadAlly];
  phoenixGame.consumables.activeSlots = [{ key: "phoenixDraught", count: 1, cooldownRemaining: 0 }];
  assert.equal(phoenixGame.useConsumableSlot(0), true, "Phoenix Draught should revive a dead multiplayer ally");
  assert.equal(deadAlly.alive, true, "Phoenix Draught should mark the ally alive");
  assert.equal(deadAlly.health, 40, "Phoenix Draught should revive at 40% HP");
  assert.equal(deadAlly.x, phoenixGame.player.x, "Phoenix Draught should move the ally to the user x position");
  assert.equal(deadAlly.y, phoenixGame.player.y, "Phoenix Draught should move the ally to the user y position");
  assert.equal(phoenixGame.consumables.activeSlots.length, 0, "Phoenix Draught should be consumed after revive");

  const flameSoloGame = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  flameSoloGame.gold = 1000;
  flameSoloGame.shopStock = [{ key: "flameOfTheFallen", stock: 1 }];
  assert.equal(flameSoloGame.getShopFailureReason("flameOfTheFallen"), "Multiplayer only", "Flame of the Fallen should be blocked from single-player purchase");
  flameSoloGame.consumables.activeSlots = [{ key: "flameOfTheFallen", count: 1, cooldownRemaining: 0 }];
  assert.equal(flameSoloGame.useConsumableSlot(0), false, "Flame of the Fallen should not be usable in single player");

  const flamePurchaseGame = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  flamePurchaseGame.activePlayerCount = 2;
  flamePurchaseGame.gold = 1000;
  flamePurchaseGame.shopStock = [{ key: "flameOfTheFallen", stock: 1 }];
  assert.equal(flamePurchaseGame.buyShopItem("flameOfTheFallen"), true, "First Flame purchase in a run should be allowed");
  assert.equal(flamePurchaseGame.flameOfTheFallenPurchased, true, "Flame purchase should mark the run item spent");
  flamePurchaseGame.shopStock = [{ key: "flameOfTheFallen", stock: 1 }];
  assert.equal(flamePurchaseGame.getShopFailureReason("flameOfTheFallen"), "Out of stock", "Flame should not be purchasable again in the same run");
  flamePurchaseGame.flameOfTheFallenPurchased = false;
  flamePurchaseGame.flameOfTheFallenOffered = true;
  flamePurchaseGame.refillShopForFloor();
  assert(!flamePurchaseGame.shopStock.some((entry) => entry.key === "flameOfTheFallen"), "Flame should not appear after it has already appeared once");

  const devItemGame = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  assert(getDevStartingConsumableOptions().some((option) => option.key === "forzare" && option.type === "Passive"), "dev starting item options should include Forzare");
  const devApplied = applyDevStartingConsumables(devItemGame, { inventoryKey: "flameOfTheFallen", shopKey: "holyCandle" });
  assert.equal(devApplied.inventoryGranted, true, "dev starting item should grant inventory");
  assert.equal(devApplied.shopForced, true, "dev starting shop item should force stock");
  assert(devItemGame.consumables.activeSlots.some((slot) => slot.key === "flameOfTheFallen"), "dev starting inventory should contain forced item");
  assert.equal(devItemGame.shopStock[0]?.key, "holyCandle", "dev starting shop item should be first in stock");
  const remoteState = { id: "remote", health: 10, maxHealth: 100, alive: true };
  assert.equal(grantDevStartingConsumable(devItemGame, "shield", remoteState), true, "dev starting item should grant to active player state");
  assert(remoteState.consumables?.activeSlots?.some((slot) => slot.key === "shield"), "remote active player should receive forced dev item");

  const angelGame = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  angelGame.player.maxHealth = 100;
  angelGame.player.health = 10;
  angelGame.consumables.passiveSlots = [{ key: "angelRing", count: 1, cooldownRemaining: 0 }];
  const angelPayload = { preventDeath: false };
  assert.equal(angelGame.applyPassiveConsumableEvent("lethalDamage", angelPayload), true, "Angel Ring should trigger on lethal damage");
  assert.equal(angelPayload.preventDeath, true, "Angel Ring should prevent lethal damage");
  assert.equal(angelGame.player.health, 60, "Angel Ring should heal for 50% max HP");
  assert(angelGame.fireZones.some((zone) => zone.zoneType === "angelRingBurst"), "Angel Ring should spawn holy proc VFX");
  assert(angelGame.floatingTexts.some((text) => text.text === "+50"), "Angel Ring should show healing amount text");
  assert(!angelGame.consumables.passiveSlots.some((slot) => slot.key === "angelRing"), "Angel Ring should be consumed after triggering");

  const forzareGame = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  const tile = forzareGame.config.map.tile;
  forzareGame.player.id = "forzare-player";
  forzareGame.player.x = 400;
  forzareGame.player.y = 400;
  forzareGame.moveWithCollisionSubsteps = (entity, dx, dy) => {
    entity.x += dx;
    entity.y += dy;
  };
  forzareGame.consumables.passiveSlots = [{ key: "forzare", count: 1, cooldownRemaining: 0 }];
  const adjacentEnemyDistance = tile + forzareGame.getPlayerEnemyCollisionRadiusFor(forzareGame.player) + 8;
  forzareGame.enemies = Array.from({ length: 4 }, (_, index) => ({
    id: `forzare-enemy-${index}`,
    type: "mummy",
    x: forzareGame.player.x + Math.cos(index * Math.PI * 0.5) * adjacentEnemyDistance,
    y: forzareGame.player.y + Math.sin(index * Math.PI * 0.5) * adjacentEnemyDistance,
    size: 18,
    hp: 30,
    maxHp: 30
  }));
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  try {
    forzareGame.tickConsumables(0.016);
  } finally {
    Math.random = originalRandom;
  }
  const forzareSlot = forzareGame.consumables.passiveSlots.find((slot) => slot.key === "forzare");
  assert(forzareSlot, "Forzare should remain in the passive slot after triggering");
  assert(forzareSlot.cooldownRemaining > 19.9, "Forzare should start a 20s cooldown");
  assert(forzareGame.enemies.every((enemy) => enemy.hp < 30), "Forzare should damage every surrounding enemy");
  assert(forzareGame.enemies.every((enemy) => Math.hypot(enemy.x - forzareGame.player.x, enemy.y - forzareGame.player.y) > tile), "Forzare should knock surrounding enemies away");
  assert(forzareGame.fireZones.some((zone) => zone.zoneType === "forzareBurst"), "Forzare should spawn purple proc VFX");
  assert(forzareGame.floatingTexts.some((text) => text.text === "Forzare!"), "Forzare should show proc status text");
  assert.equal(forzareGame.consumables.message, "Forzare triggered", "Forzare should show consumable proc status");
  const hpAfterForzare = forzareGame.enemies.map((enemy) => enemy.hp);
  forzareGame.tickConsumables(0.016);
  assert.deepEqual(forzareGame.enemies.map((enemy) => enemy.hp), hpAfterForzare, "Forzare should not trigger again while on cooldown");
  const forzareBreakGame = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  forzareBreakGame.player.x = 400;
  forzareBreakGame.player.y = 400;
  forzareBreakGame.moveWithCollisionSubsteps = (entity, dx, dy) => {
    entity.x += dx;
    entity.y += dy;
  };
  forzareBreakGame.consumables.passiveSlots = [{ key: "forzare", count: 1, cooldownRemaining: 0 }];
  forzareBreakGame.enemies = Array.from({ length: 4 }, (_, index) => ({
    id: `forzare-break-enemy-${index}`,
    type: "mummy",
    x: forzareBreakGame.player.x + Math.cos(index * Math.PI * 0.5) * adjacentEnemyDistance,
    y: forzareBreakGame.player.y + Math.sin(index * Math.PI * 0.5) * adjacentEnemyDistance,
    size: 18,
    hp: 30,
    maxHp: 30
  }));
  Math.random = () => 0.01;
  try {
    forzareBreakGame.tickConsumables(0.016);
  } finally {
    Math.random = originalRandom;
  }
  assert(!forzareBreakGame.consumables.passiveSlots.some((slot) => slot.key === "forzare"), "Forzare should leave the passive slot when it breaks");

  const flameGame = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  flameGame.player.id = "living";
  flameGame.player.x = 512;
  flameGame.player.y = 512;
  const deadOne = { id: "dead-one", handle: "One", x: 80, y: 80, size: 22, health: 0, maxHealth: 100, alive: false };
  const deadTwo = { id: "dead-two", handle: "Two", x: 120, y: 80, size: 22, health: 0, maxHealth: 120, alive: false };
  flameGame.activePlayerCount = 3;
  flameGame.networkActivePlayers = [flameGame.player, deadOne, deadTwo];
  flameGame.consumables.activeSlots = [{ key: "flameOfTheFallen", count: 1, cooldownRemaining: 0 }];
  assert.equal(flameGame.useConsumableSlot(0), true, "Flame of the Fallen should create a pyre when allies are dead");
  assert.equal(flameGame.flameOfTheFallen?.active, true, "Flame pyre should become active");
  assert.equal(flameGame.flameOfTheFallen.requiredSouls, 22, "Flame should use doubled total/living-player scaling");
  assert.equal(deadOne.alive, false, "Flame should not revive immediately");
  assert.equal(getFlameOfTheFallenBuffMultiplier(flameGame, flameGame.player), 1.1, "Living allies inside the pyre should receive the buff");
  const sixPlayerCheck = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  sixPlayerCheck.networkActivePlayers = Array.from({ length: 6 }, (_, index) => ({ id: `p${index}`, health: index < 2 ? 10 : 0, maxHealth: 100, alive: index < 2 }));
  assert.equal(getFlameOfTheFallenRequiredSouls(sixPlayerCheck), 32, "Two survivors in a six-player run should use the doubled reachable target");
  sixPlayerCheck.networkActivePlayers[1].health = 0;
  sixPlayerCheck.networkActivePlayers[1].alive = false;
  assert.equal(getFlameOfTheFallenRequiredSouls(sixPlayerCheck), 28, "Solo survivor in a six-player run should be hard but lower than a group target");
  assert(!rollConsumableShopStock(10, 20, new Set(["flameOfTheFallen"])).some((entry) => entry.key === "flameOfTheFallen"), "excluded Flame should not roll into shop stock again");
  assert(!rollConsumableShopStock(10, 20).some((entry) => getConsumableDefinition(entry.key)?.multiplayerOnly), "default shop rolls should exclude multiplayer-only items");

  const rotationGame = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  rotationGame.floor = 1;
  rotationGame.time = 59.9;
  rotationGame.shopStock = [
    { key: "regenerationPotion", stock: 2 },
    { key: "speedPotion", stock: 2 },
    { key: "frostOil", stock: 2 },
    { key: "fireOil", stock: 2 },
    { key: "spikeGrowth", stock: 2 }
  ];
  rotationGame.shopStockRotationNextAt = 60;
  rotationGame.multiplayerNotificationQueue = [];
  rotationGame.multiplayerNotificationCurrent = null;
  const beforeRotation = rotationGame.shopStock.map((entry) => entry.key);
  assert.equal(tickShopStockRotation(rotationGame, 0.1), null, "shop stock should not rotate before the 60s interval");
  assert.deepEqual(rotationGame.shopStock.map((entry) => entry.key), beforeRotation, "pre-interval shop stock should remain unchanged");
  const rotationRandom = Math.random;
  Math.random = () => 0;
  let rotated;
  try {
    rotationGame.time = 60;
    rotated = tickShopStockRotation(rotationGame, 0.1);
  } finally {
    Math.random = rotationRandom;
  }
  assert(rotated, "shop stock should rotate at the interval");
  assert.equal(rotated.slotIndex, 0, "rotation should replace one selected shop slot");
  assert.equal(rotationGame.shopStock.length, 5, "rotation should preserve shop slot count");
  assert.equal(rotationGame.shopStock.filter((entry) => beforeRotation.includes(entry.key)).length, 4, "rotation should only replace one visible slot");
  assert(rotationGame.shopStock[0].key !== "regenerationPotion", "rotation should pick a new item for the replaced slot when possible");
  assert.equal(rotationGame.shopStockRotationNextAt, 120, "rotation should schedule the next interval");
  assert.equal(rotationGame.multiplayerNotificationCurrent?.text, `${getConsumableDefinition(rotationGame.shopStock[0].key).name} is now available in the shop.`, "rotation should queue the multiplayer-style banner");
  assert(rotationGame.shopRotationEvents.some((event) => event.text === rotationGame.multiplayerNotificationCurrent.text), "rotation should serialize a banner event");
  rotationGame.multiplayerNotificationCurrent = { text: "Veronica delivery incoming!", duration: 2.5, owlLocal: true };
  tickShopStockRotation(rotationGame, 0.5);
  assert.equal(rotationGame.multiplayerNotificationCurrent.duration, 2.5, "shop rotation fallback should not tick owl banners");
  rotationGame.multiplayerNotificationCurrent = { text: "Shop notice", duration: 2.5, shopRotationLocal: true };
  tickShopStockRotation(rotationGame, 0.5);
  assert.equal(rotationGame.multiplayerNotificationCurrent.duration, 2, "shop rotation fallback should tick shop banners");

  recordFlameOfTheFallenKill(flameGame, { x: flameGame.player.x + 16, y: flameGame.player.y, type: "basic" });
  assert.equal(flameGame.flameOfTheFallen?.active, true, "One basic kill should not complete the pyre");
  recordFlameOfTheFallenKill(flameGame, { x: flameGame.player.x + 16, y: flameGame.player.y, isBoss: true });
  assert.equal(flameGame.flameOfTheFallen?.active, false, "Boss soul value should complete the pyre");
  assert.equal(deadOne.alive, true, "Flame should revive the first dead ally");
  assert.equal(deadTwo.alive, true, "Flame should revive all dead allies");
  assert.equal(deadOne.health, 50, "Flame should revive at 50% HP");
  assert.equal(deadTwo.health, 60, "Flame should revive each ally at 50% max HP");
  assert.equal(deadOne.x, 512, "Flame should revive allies at the pyre x position");
  assert.equal(deadTwo.y, 512, "Flame should revive allies at the pyre y position");

  console.log(JSON.stringify({
    consumablesEconomy: "ok"
  }, null, 2));
}

main();
