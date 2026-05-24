import { strict as assert } from "node:assert";
import { AuthoritativeRoom } from "./net/AuthoritativeRoom.js";
import { handleActionMessage } from "./net/clientMessageHandler.js";
import { buildDeltaCollection } from "./net/deltaProtocol.js";
import { buildMapChunkRows } from "./net/mapChunkStreaming.js";
import { getStableId, serializeMetaState, serializeState } from "./net/stateSerialization.js";
import { average, monotonicNowMs, percentile } from "./net/telemetry.js";
import { makeDefaultInput } from "./net/serverHelpers.js";
import { chooseGameplayTrack } from "./musicCatalog.js";

function createFakeSocket() {
  return {
    OPEN: 1,
    readyState: 1,
    bufferedAmount: 0,
    send() {}
  };
}

function makeClient(id, name, classType) {
  return {
    id,
    name,
    classType,
    protocolVersion: 2,
    ws: createFakeSocket(),
    input: makeDefaultInput(),
    lastInputSeq: 0,
    classLocked: true
  };
}

function createRoomOptions() {
  return {
    average,
    buildDeltaCollection,
    buildMapChunkRows,
    chooseGameplayTrack,
    deltaKeyframeEvery: 30,
    getStableId,
    makeDefaultInput,
    mapChunkPushMs: 120,
    mapChunkRadius: 2,
    mapChunkSize: 24,
    maxWsBufferedBytes: 262144,
    metaBroadcastMinMs: 320,
    monotonicNowMs,
    percentile,
    pushTelemetrySample() {},
    serializeMetaState,
    serializeState,
    snapshotAckGapForceKeyframe: 8,
    tickDriftEpsilonMs: 0.5
  };
}

function activeSlot(state, key) {
  return Array.isArray(state?.consumables?.activeSlots)
    ? state.consumables.activeSlots.find((slot) => slot?.key === key) || null
    : null;
}

function advanceRoom(room, seconds) {
  const steps = Math.max(1, Math.ceil(seconds / 0.05));
  for (let i = 0; i < steps; i++) room.tick(room.lastTickMs + 50, 0);
}

function setPlayerPosition(room, state, x, y) {
  state.x = x;
  state.y = y;
  if (state.id === room.pauseOwnerId) room.syncSimPrimaryPlayerState();
}

function buy(room, clientId, key) {
  handleActionMessage(room, clientId, { kind: "buyUpgrade", key });
}

function validateNetworkOwlDelivery() {
  const room = new AuthoritativeRoom("validate-network-owl-delivery", "archer", createRoomOptions());
  const owner = makeClient("owner", "Owner", "warrior");
  const peer = makeClient("peer", "Peer", "archer");
  room.addClient(owner);
  room.addClient(peer);
  room.startRun(Date.now());

  const ownerState = room.activePlayers.get(owner.id);
  const peerState = room.activePlayers.get(peer.id);
  assert.ok(ownerState, "owner active player state missing");
  assert.ok(peerState, "peer active player state missing");

  room.sim.owlDeliveryDebugDelay = 0;
  room.sim.shopStock = [
    { key: "shield", stock: 2 },
    { key: "speedPotion", stock: 1 },
    { key: "fireOil", stock: 1 }
  ];
  ownerState.gold = 3000;
  peerState.gold = 3000;
  room.syncSimPrimaryPlayerState();

  buy(room, owner.id, "shield");
  buy(room, peer.id, "speedPotion");

  assert.equal(ownerState.gold, 2985, "owner gold should be spent immediately");
  assert.equal(peerState.gold, 2900, "peer gold should be spent immediately");
  assert.equal(activeSlot(ownerState, "shield"), null, "owner shield should not be granted before delivery");
  assert.equal(activeSlot(peerState, "speedPotion"), null, "peer speed potion should not be granted before delivery");
  assert.equal(room.sim.owlDelivery?.pendingOrders?.length, 2, "two network purchases should queue for delivery");

  advanceRoom(room, 0.1);
  let owl = room.sim.owlDelivery?.active;
  assert.ok(owl, "Veronica should dispatch for queued network purchases");
  assert.equal(owl.state, "flying", "Veronica should enter flying");
  assert.equal(owl.orders.length, 2, "active Veronica should carry the initial manifest");
  assert.ok(owl.orders.some((order) => order.playerId === owner.id && order.key === "shield"), "owner order missing from manifest");
  assert.ok(owl.orders.some((order) => order.playerId === peer.id && order.key === "speedPotion"), "peer order missing from manifest");

  let snapshot = serializeState(room);
  assert.equal(snapshot.owlDelivery?.active?.name, "Veronica", "serialized state should include active Veronica");
  assert.equal(snapshot.owlDelivery.active.orders.length, 2, "serialized state should include carried orders");
  assert.ok(snapshot.owlDelivery.notificationEvents.some((event) => event.text === "Veronica delivery incoming!"), "serialized state should include delivery notification");
  assert.ok(snapshot.owlDelivery.audioEvents.some((event) => event.kind === "veronica_entrance"), "serialized state should include entrance audio event");

  buy(room, owner.id, "fireOil");
  assert.equal(room.sim.owlDelivery.pendingOrders.length, 1, "purchase made while Veronica is active should queue for next delivery");
  assert.ok(!owl.orders.some((order) => order.key === "fireOil"), "active manifest should not absorb later purchases");

  owl.state = "waiting";
  owl.destX = owl.x;
  owl.destY = owl.y;
  setPlayerPosition(room, ownerState, owl.x + 160, owl.y);
  setPlayerPosition(room, peerState, owl.x, owl.y);
  advanceRoom(room, 0.1);

  owl = room.sim.owlDelivery.active;
  assert.ok(activeSlot(peerState, "speedPotion"), "peer should receive only their delivered item when near Veronica");
  assert.equal(activeSlot(ownerState, "shield"), null, "owner item should remain carried when only peer is nearby");
  assert.deepEqual(owl.orders.map((order) => order.key), ["shield"], "Veronica should keep unclaimed owner order");

  setPlayerPosition(room, peerState, owl.x + 160, owl.y);
  setPlayerPosition(room, ownerState, owl.x, owl.y);
  advanceRoom(room, 0.1);
  assert.ok(activeSlot(ownerState, "shield"), "owner should receive their delivered item when near Veronica");
  assert.equal(room.sim.owlDelivery.active?.state, "portal", "Veronica should portal away when the manifest is empty");
  advanceRoom(room, 0.9);
  owl = room.sim.owlDelivery.active;
  assert.ok(owl, "pending order should dispatch after prior Veronica departs");
  assert.deepEqual(owl.orders.map((order) => order.key), ["fireOil"], "second delivery should carry only queued late purchase");

  buy(room, peer.id, "shield");
  assert.equal(room.sim.owlDelivery.pendingOrders.length, 1, "purchase during second active delivery should queue behind it");
  assert.ok(room.sim.owlDelivery.pendingOrders.some((order) => order.playerId === peer.id && order.key === "shield"), "queued follow-up order should preserve purchaser id");

  setPlayerPosition(room, ownerState, owl.x + 240, owl.y);
  setPlayerPosition(room, peerState, owl.x + 240, owl.y);
  room.sim.enemies = [{ type: "skeleton", x: owl.x, y: owl.y, size: 24, hp: 10, maxHp: 10, damageMax: 2000 }];
  advanceRoom(room, 0.1);
  assert.equal(room.sim.owlDelivery.active?.state, "slain", "enemy damage should slay Veronica in network sim");
  assert.ok(room.sim.owlDelivery.audioEvents.some((event) => event.kind === "veronica_dead"), "slain delivery should serialize a dead audio event");
  assert.ok(room.sim.owlDelivery.notificationEvents.some((event) => event.text === "Veronica was slain!"), "slain delivery should serialize a slain notification");

  const droppedParcel = room.sim.drops.find((drop) => drop.type === "owl_item" && drop.key === "fireOil");
  assert.ok(droppedParcel, "slain Veronica should drop the unclaimed carried item");
  assert.equal(droppedParcel.playerId, owner.id, "dropped parcel should preserve purchaser id");
  assert.equal(room.sim.owlDelivery.lastMarker?.markerType, "delivery_box", "slain marker should use the delivery box icon");
  room.sim.enemies = [];

  setPlayerPosition(room, peerState, droppedParcel.x, droppedParcel.y);
  advanceRoom(room, 0.1);
  assert.ok(room.sim.drops.includes(droppedParcel), "non-purchaser should not pick up another player's owl parcel");
  assert.equal(activeSlot(peerState, "fireOil"), null, "non-purchaser should not receive another player's owl parcel");

  setPlayerPosition(room, peerState, droppedParcel.x + 160, droppedParcel.y);
  setPlayerPosition(room, ownerState, droppedParcel.x, droppedParcel.y);
  advanceRoom(room, 0.1);
  room.syncPrimaryActivePlayerFromSim();
  assert.ok(
    activeSlot(ownerState, "fireOil"),
    `purchaser should recover dropped owl parcel: ${JSON.stringify({
      owner: { x: ownerState.x, y: ownerState.y, health: ownerState.health, slots: ownerState.consumables?.activeSlots },
      peer: { x: peerState.x, y: peerState.y, health: peerState.health, slots: peerState.consumables?.activeSlots },
      drop: { x: droppedParcel.x, y: droppedParcel.y, life: droppedParcel.life, present: room.sim.drops.includes(droppedParcel) }
    })}`
  );
  assert.ok(!room.sim.drops.includes(droppedParcel), "recovered owl parcel should leave the world");
  assert.equal(room.sim.owlDelivery.lastMarker, null, "delivery box marker should clear after final parcel pickup");

  advanceRoom(room, 3.4);
  assert.equal(room.sim.owlDelivery.active, null, "slain Veronica should finish corpse linger and portal cleanup");
  assert.ok(room.sim.owlDelivery.pendingOrders.some((order) => order.key === "shield" && order.playerId === peer.id), "queued follow-up order should survive current Veronica death");
  assert.ok(room.sim.owlDelivery.nextDispatchAt >= room.sim.time + 59.5, "slain Veronica should delay next delivery by about one minute");

  snapshot = serializeState(room);
  assert.equal(snapshot.owlDelivery?.active, null, "serialized state should clear active Veronica after death cleanup");
  assert.equal(snapshot.owlDelivery?.pendingCount, 1, "serialized state should keep queued follow-up delivery count");

  console.log(JSON.stringify({
    networkOwlDelivery: "ok",
    ownerConsumables: ownerState.consumables,
    peerConsumables: peerState.consumables,
    pendingCount: room.sim.owlDelivery.pendingOrders.length,
    nextDispatchDelay: Math.round(room.sim.owlDelivery.nextDispatchAt - room.sim.time)
  }, null, 2));
}

validateNetworkOwlDelivery();
