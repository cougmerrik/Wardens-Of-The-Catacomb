import { strict as assert } from "node:assert";
import { GameSim } from "../src/sim/GameSim.js";
import { tickOwlDelivery } from "../src/game/world/owlDelivery.js";

function activeSlot(game, key) {
  return game.consumables.activeSlots.find((slot) => slot?.key === key) || null;
}

function main() {
  const game = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  game.owlDeliveryDebugDelay = 0;
  game.gold = 3000;
  game.player.id = "player";
  game.shopStock = [{ key: "shield", stock: 1 }, { key: "speedPotion", stock: 1 }, { key: "fireOil", stock: 1 }];

  assert.equal(game.buyShopItem("shield"), true, "shield purchase should validate");
  assert.equal(game.gold, 2997, "purchase should deduct gold immediately");
  assert.equal(game.shopStock[0].stock, 0, "purchase should reduce stock immediately");
  assert.equal(activeSlot(game, "shield"), null, "purchased item should not enter inventory instantly");
  assert.equal(game.owlDelivery.pendingOrders.length, 1, "purchase should create a pending owl order");
  assert.equal(game.owlDelivery.audioEvents.length, 0, "purchase queue should not play the entrance clip");

  tickOwlDelivery(game, 0.1);
  assert(game.owlDelivery.active, "Veronica should spawn after dispatch delay");
  assert.equal(game.owlDelivery.active.name, "Veronica", "owl should use the Veronica name");
  assert.equal(game.owlDelivery.active.size, 22, "Veronica should stay close to wolf size");
  assert.equal(game.owlDelivery.active.speed, game.config.classes.archer.baseMoveSpeed, "Veronica should move at base Scout speed");
  assert.equal(game.owlDelivery.active.orders[0].playerId, "player", "order should remember purchaser id");
  assert.equal(game.consumables.message, "Veronica delivery incoming!", "incoming alert should be visible");
  assert.equal(game.owlDelivery.audioEvents.at(-1)?.kind, "veronica_entrance", "spawn should queue the entrance clip once");
  assert(game.owlDelivery.notificationEvents.some((event) => event.text === "Veronica delivery incoming!"), "incoming notification should be queued");

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
  assert.equal(game.owlDelivery.active?.state, "portal", "slain owl should show a portal before despawning");
  assert.equal(game.owlDelivery.active?.portalTimer > 0, true, "slain owl portal should have a visible timer");
  assert.equal(game.owlDelivery.lastMarker?.markerType, "delivery_box", "slain owl marker should use the delivery box icon");
  tickOwlDelivery(game, 0.8);
  assert.equal(game.owlDelivery.active, null, "owl should despawn after lethal enemy damage");
  assert.equal(game.consumables.message, "Veronica was slain!", "slain alert should be visible");
  assert.equal(game.owlDelivery.audioEvents.at(-1)?.kind, "veronica_dead", "lethal damage should queue the dead clip");
  assert.equal(game.owlDelivery.pendingOrders.some((order) => order.key === "fireOil"), true, "queued next delivery should survive current owl death");
  assert(game.owlDelivery.nextDispatchAt >= game.time + 64.9, "slain owl should delay the next delivery window by one minute");
  assert(game.drops.some((drop) => drop.type === "owl_item" && drop.key === "speedPotion"), "slain owl should drop unclaimed orders");
  assert(game.owlDelivery.lastMarker, "slain owl should leave a minimap marker");

  console.log(JSON.stringify({
    owlDelivery: "ok",
    drops: game.drops.filter((drop) => drop.type === "owl_item").length
  }, null, 2));
}

main();
