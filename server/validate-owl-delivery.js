import { strict as assert } from "node:assert";
import { VeronicaAudioEvents } from "../src/audio/veronicaAudioEvents.js";
import { GameSim } from "../src/sim/GameSim.js";
import { getOwlCourierMaxHp, pickupOwlItemDrop, tickOwlDelivery } from "../src/game/world/owlDelivery.js";

function activeSlot(game, key) {
  return game.consumables.activeSlots.find((slot) => slot?.key === key) || null;
}

function setMapTile(game, tx, ty, value) {
  const row = game.map?.[ty];
  if (typeof row === "string") {
    const chars = row.split("");
    chars[tx] = value;
    game.map[ty] = chars.join("");
  } else if (Array.isArray(row)) {
    row[tx] = value;
  }
}

function getMapTile(game, tx, ty) {
  const row = game.map?.[ty];
  return Array.isArray(row) ? row[tx] : typeof row === "string" ? row[tx] : "#";
}

function validateVeronicaAudioDedupe() {
  const played = [];
  const audioEvents = new VeronicaAudioEvents(() => ({ pause() {}, currentTime: 0, muted: false }));
  const play = (event) => audioEvents.play([event], { muted: false, attemptAudioPlay: (_audio, kind) => played.push(kind) });
  play({ id: "veronica_audio_1", kind: "veronica_entrance", at: 1 });
  play({ id: "veronica_audio_1", kind: "veronica_entrance", at: 1 });
  play({ id: "veronica_audio_1", kind: "veronica_entrance", at: 2 });
  assert.deepEqual(played, ["veronica_entrance", "veronica_entrance"], "Veronica audio dedupe should allow restarted run ids");
}

function main() {
  validateVeronicaAudioDedupe();
  const game = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  game.owlDeliveryDebugDelay = 0;
  game.gold = 3000;
  game.player.id = "player";
  game.shopStock = [{ key: "shield", stock: 1 }, { key: "speedPotion", stock: 1 }, { key: "fireOil", stock: 1 }];

  assert.equal(game.buyShopItem("shield"), true, "shield purchase should validate");
  assert.equal(game.gold, 2985, "purchase should deduct gold immediately");
  assert.equal(game.shopStock[0].stock, 0, "purchase should reduce stock immediately");
  assert.equal(activeSlot(game, "shield"), null, "purchased item should not enter inventory instantly");
  assert.equal(game.owlDelivery.pendingOrders.length, 1, "purchase should create a pending owl order");
  assert.equal(game.owlDelivery.audioEvents.length, 0, "purchase queue should not play the entrance clip");

  tickOwlDelivery(game, 0.1);
  assert(game.owlDelivery.active, "Veronica should spawn after dispatch delay");
  assert.equal(game.owlDelivery.active.name, "Veronica", "owl should use the Veronica name");
  assert.equal(game.owlDelivery.active.state, "flying", "Veronica should enter the map flying");
  assert(game.owlDelivery.active.path.length >= 20, "Veronica should spawn with a long navigable route to the target");
  assert(game.owlDelivery.active.path.length <= 60, "Veronica should not spawn across the whole map from the target");
  assert.equal(game.owlDelivery.active.size, 16.5, "Veronica should render at the reduced courier size");
  assert.equal(game.owlDelivery.active.speed, game.config.classes.archer.baseMoveSpeed, "Veronica should move at base Scout speed");
  assert.equal(game.owlDelivery.active.maxHp, getOwlCourierMaxHp(game), "Veronica health should use level-scaled courier max hp");
  assert.equal(game.owlDelivery.active.hp, game.owlDelivery.active.maxHp, "Veronica should spawn at full courier health");
  assert.equal(game.owlDelivery.active.orders[0].playerId, "player", "order should remember purchaser id");
  assert.equal(game.consumables.message, "Veronica delivery incoming!", "incoming alert should be visible");
  assert.equal(game.owlDelivery.audioEvents.at(-1)?.kind, "veronica_entrance", "spawn should queue the entrance clip once");
  assert(game.owlDelivery.notificationEvents.some((event) => event.text === "Veronica delivery incoming!"), "incoming notification should be queued");

  assert.equal(getOwlCourierMaxHp(game), 32, "level-one Veronica hp should use 26 + 6 * player level");
  const highLevelGame = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  highLevelGame.level = 10;
  assert.equal(getOwlCourierMaxHp(highLevelGame), 86, "Veronica hp should scale from player level instead of floor");

  game.owlDelivery.active.x = game.player.x + 8;
  game.owlDelivery.active.y = game.player.y + 8;
  game.owlDelivery.active.displayX = game.owlDelivery.active.x;
  game.owlDelivery.active.displayY = game.owlDelivery.active.y;
  tickOwlDelivery(game, 0.1);
  assert.equal(activeSlot(game, "shield")?.count, 1, "nearby purchaser should receive delivered item");
  assert.equal(game.owlDelivery.active?.state, "portal", "owl should portal away after retrieved delivery");
  tickOwlDelivery(game, 0.8);
  assert.equal(game.owlDelivery.active, null, "owl should leave after all orders are retrieved");

  game.shopStock[1].stock = 1;
  assert.equal(game.buyShopItem("speedPotion"), true, "second purchase should validate");
  tickOwlDelivery(game, 0.1);
  const owl = game.owlDelivery.active;
  assert(owl, "second owl should spawn");
  assert.equal(game.buyShopItem("fireOil"), true, "purchase while owl is active should validate");
  assert(!owl.orders.some((order) => order.key === "fireOil"), "active owl should not receive purchases made after it appears");
  assert(game.owlDelivery.pendingOrders.some((order) => order.key === "fireOil"), "active-owl purchases should queue for the next delivery");
  game.owlDeliveryDebugDelay = 5;
  owl.x = game.player.x + 100;
  owl.y = game.player.y + 100;
  owl.hp = 20;
  game.enemies.push({ type: "skeleton", x: owl.x, y: owl.y, size: 24, hp: 10, maxHp: 10, damageMax: 4 });
  assert.equal(game.getEnemyTargetPoint(game.enemies[0]), owl, "nearby hostile enemy should target Veronica");
  tickOwlDelivery(game, 0.2);
  const hurtEventsAfterFirstHit = game.owlDelivery.audioEvents.filter((event) => event.kind === "veronica_hurt").length;
  assert.equal(hurtEventsAfterFirstHit, 1, "survived damage should queue one hurt clip");
  tickOwlDelivery(game, 0.2);
  assert.equal(
    game.owlDelivery.audioEvents.filter((event) => event.kind === "veronica_hurt").length,
    hurtEventsAfterFirstHit,
    "hurt clip should be throttled while damage continues"
  );
  owl.hp = 1;
  game.enemies[0].x = owl.x;
  game.enemies[0].y = owl.y;
  game.enemies[0].damageMax = 20;
  tickOwlDelivery(game, 0.2);
  assert.equal(game.owlDelivery.active?.state, "slain", "slain owl corpse should linger before portaling away");
  assert.equal(game.owlDelivery.active?.slainTimer > 0, true, "slain owl should have a visible corpse timer");
  assert.equal(game.owlDelivery.lastMarker?.markerType, "delivery_box", "slain owl marker should use the delivery box icon");
  tickOwlDelivery(game, 2.6);
  assert.equal(game.owlDelivery.active?.state, "portal", "slain owl should portal away after corpse linger");
  assert.equal(game.owlDelivery.active?.portalTimer > 0, true, "slain owl portal should have a visible timer");
  tickOwlDelivery(game, 0.8);
  assert.equal(game.owlDelivery.active, null, "owl should despawn after lethal enemy damage");
  assert.equal(game.consumables.message, "Veronica was slain!", "slain alert should be visible");
  assert.equal(game.owlDelivery.audioEvents.at(-1)?.kind, "veronica_dead", "lethal damage should queue the dead clip");
  assert.equal(game.owlDelivery.pendingOrders.some((order) => order.key === "fireOil"), true, "queued next delivery should survive current owl death");
  assert(game.owlDelivery.nextDispatchAt >= game.time + 64.9, "slain owl should delay the next delivery window by one minute");
  const parcel = game.drops.find((drop) => drop.type === "owl_item" && drop.key === "speedPotion");
  assert(parcel, "slain owl should drop unclaimed orders");
  assert(game.owlDelivery.lastMarker, "slain owl should leave a minimap marker");
  assert.equal(pickupOwlItemDrop(game, parcel, game.player), true, "purchaser should recover dropped owl parcel");
  assert.equal(game.owlDelivery.lastMarker, null, "final recovered owl parcel should clear the minimap marker");

  const movementGame = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  movementGame.owlDeliveryDebugDelay = 0;
  movementGame.gold = 3000;
  movementGame.player.id = "player";
  movementGame.shopStock = [{ key: "shield", stock: 1 }];
  assert.equal(movementGame.buyShopItem("shield"), true, "movement purchase should validate");
  tickOwlDelivery(movementGame, 0.1);
  const movingOwl = movementGame.owlDelivery.active;
  assert(movingOwl, "movement owl should spawn");
  movingOwl.orders = [{ playerId: "other-player", key: "shield", quantity: 1 }];
  const tile = movementGame.config.map.tile;
  movingOwl.state = "waiting";
  movingOwl.destX = movementGame.player.x;
  movingOwl.destY = movementGame.player.y;
  movingOwl.x = movingOwl.destX;
  movingOwl.y = movingOwl.destY;
  movingOwl.displayX = movingOwl.x;
  movingOwl.displayY = movingOwl.y;
  movementGame.enemies = [{ type: "skeleton", x: movingOwl.x - tile * 0.5, y: movingOwl.y, size: 24, hp: 10, maxHp: 10, damageMax: 0 }];
  const beforeEvade = Math.hypot(movingOwl.x - movementGame.enemies[0].x, movingOwl.y - movementGame.enemies[0].y);
  tickOwlDelivery(movementGame, 0.1);
  const afterEvade = Math.hypot(movingOwl.x - movementGame.enemies[0].x, movingOwl.y - movementGame.enemies[0].y);
  assert(afterEvade > beforeEvade, "Veronica should move away from enemies within one tile");

  const tx = Math.floor(movementGame.player.x / tile) + 2;
  const ty = Math.floor(movementGame.player.y / tile);
  setMapTile(movementGame, tx, ty, "#");
  movingOwl.state = "flying";
  movingOwl.x = (tx - 1) * tile + tile * 0.5;
  movingOwl.y = ty * tile + tile * 0.5;
  movingOwl.destX = (tx + 1) * tile + tile * 0.5;
  movingOwl.destY = movingOwl.y;
  movementGame.enemies = [];
  tickOwlDelivery(movementGame, 0.25);
  assert.notEqual(Math.floor(movingOwl.x / tile), tx, "Veronica should not fly through wall tiles");

  setMapTile(movementGame, tx, ty, ".");
  movementGame.breakables = [{ type: "crate", x: tx * tile + tile * 0.5, y: ty * tile + tile * 0.5, size: 24, hp: 10 }];
  movingOwl.x = (tx - 1) * tile + tile * 0.5;
  movingOwl.y = ty * tile + tile * 0.5;
  movingOwl.destX = (tx + 1) * tile + tile * 0.5;
  movingOwl.destY = movingOwl.y;
  movingOwl.path = [];
  const beforeCrateX = movingOwl.x;
  tickOwlDelivery(movementGame, 0.25);
  assert(movingOwl.x > beforeCrateX, "Veronica should fly over crates and boxes");

  const spawnGame = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  spawnGame.owlDeliveryDebugDelay = 0;
  spawnGame.gold = 3000;
  spawnGame.shopStock = [{ key: "shield", stock: 1 }];
  spawnGame.isWalkableTile = () => true;
  for (let x = 0; x < spawnGame.mapWidth; x++) {
    setMapTile(spawnGame, x, 0, "#");
    setMapTile(spawnGame, x, spawnGame.mapHeight - 1, "#");
  }
  for (let y = 0; y < spawnGame.mapHeight; y++) {
    setMapTile(spawnGame, 0, y, "#");
    setMapTile(spawnGame, spawnGame.mapWidth - 1, y, "#");
  }
  assert.equal(spawnGame.buyShopItem("shield"), true, "spawn purchase should validate");
  tickOwlDelivery(spawnGame, 0.1);
  const spawnedOwl = spawnGame.owlDelivery.active;
  assert(spawnedOwl, "spawn regression owl should dispatch");
  const spawnTile = spawnGame.config.map.tile;
  assert.equal(
    "#B?".includes(getMapTile(spawnGame, Math.floor(spawnedOwl.x / spawnTile), Math.floor(spawnedOwl.y / spawnTile))),
    false,
    "Veronica should not spawn inside blocked terrain even if generic walkability lies"
  );

  console.log(JSON.stringify({
    owlDelivery: "ok",
    drops: game.drops.filter((drop) => drop.type === "owl_item").length
  }, null, 2));
}

main();
