import { AuthoritativeRoom } from "./net/AuthoritativeRoom.js";
import { handleActionMessage } from "./net/clientMessageHandler.js";
import { buildDeltaCollection } from "./net/deltaProtocol.js";
import { buildMapChunkRows } from "./net/mapChunkStreaming.js";
import { getStableId, serializeMetaState, serializeState } from "./net/stateSerialization.js";
import { average, monotonicNowMs, percentile } from "./net/telemetry.js";
import { makeDefaultInput } from "./net/serverHelpers.js";
import { chooseGameplayTrack } from "./musicCatalog.js";
import { grantConsumableCharge, recordFlameOfTheFallenKill } from "../src/game/world/consumablesEconomy.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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

function getActiveSlot(state, key) {
  return Array.isArray(state?.consumables?.activeSlots)
    ? state.consumables.activeSlots.find((slot) => slot?.key === key) || null
    : null;
}

function getPassiveSlot(state, key) {
  return Array.isArray(state?.consumables?.passiveSlots)
    ? state.consumables.passiveSlots.find((slot) => slot?.key === key) || null
    : null;
}

function getStock(room, key) {
  return room.sim.shopStock.find((entry) => entry?.key === key) || null;
}

function main() {
  const room = new AuthoritativeRoom("validate-network-shop", "archer", createRoomOptions());
  const owner = makeClient("owner", "Owner", "warrior");
  const peer = makeClient("peer", "Peer", "archer");
  room.addClient(owner);
  room.addClient(peer);
  room.startRun(Date.now());

  let ownerState = room.activePlayers.get(owner.id);
  const peerState = room.activePlayers.get(peer.id);
  assert(ownerState && peerState, "active player state missing after room start");

  room.sim.shopStock = [
    { key: "shield", stock: 2 },
    { key: "regenerationPotion", stock: 1 },
    { key: "angelRing", stock: 2 },
    { key: "speedPotion", stock: 1 },
    { key: "fireOil", stock: 1 }
  ];
  room.sim.gold = 3000;
  ownerState.gold = 3000;
  peerState.gold = 3000;
  room.syncSimPrimaryPlayerState();

  handleActionMessage(room, owner.id, { kind: "buyUpgrade", key: "shield" });
  ownerState = room.syncPrimaryActivePlayerFromSim();
  assert(ownerState.gold === 2985, `owner gold did not drop after shield purchase: ${ownerState.gold}`);
  assert(!getActiveSlot(ownerState, "shield"), "owner shield should wait for owl delivery");
  assert((room.sim.owlDelivery?.pendingOrders || []).some((order) => order.key === "shield" && order.playerId === owner.id), "owner shield order was not queued for owl delivery");
  assert(getStock(room, "shield")?.stock === 1, `shared shield stock did not decrement after owner purchase: ${getStock(room, "shield")?.stock}`);
  assert(!getActiveSlot(peerState, "shield"), "peer incorrectly received owner shield purchase");
  grantConsumableCharge(room.sim, "shield");
  ownerState = room.syncPrimaryActivePlayerFromSim();

  handleActionMessage(room, peer.id, { kind: "buyUpgrade", key: "shield" });
  assert(peerState.gold === 2985, `peer gold did not drop after shield purchase: ${peerState.gold}`);
  assert(!getActiveSlot(peerState, "shield"), "peer shield should wait for owl delivery");
  assert((room.sim.owlDelivery?.pendingOrders || []).some((order) => order.key === "shield" && order.playerId === peer.id), "peer shield order was not queued for owl delivery");
  assert(getStock(room, "shield")?.stock === 0, `shared shield stock did not reach zero after peer purchase: ${getStock(room, "shield")?.stock}`);
  grantConsumableCharge({ player: peerState, consumables: peerState.consumables }, "shield");

  handleActionMessage(room, owner.id, { kind: "buyUpgrade", key: "shield" });
  ownerState = room.syncPrimaryActivePlayerFromSim();
  assert(getActiveSlot(ownerState, "shield")?.count === 1, "owner shield count changed after out-of-stock purchase attempt");

  handleActionMessage(room, owner.id, { kind: "buyUpgrade", key: "angelRing" });
  ownerState = room.syncPrimaryActivePlayerFromSim();
  assert(!getPassiveSlot(ownerState, "angelRing"), "owner angel ring should wait for owl delivery");
  assert(getStock(room, "angelRing")?.stock === 1, "angel ring stock did not decrement after owner purchase");

  handleActionMessage(room, peer.id, { kind: "buyUpgrade", key: "angelRing" });
  assert(!getPassiveSlot(peerState, "angelRing"), "peer angel ring should wait for owl delivery");
  assert(getStock(room, "angelRing")?.stock === 0, "angel ring stock did not reach zero after peer purchase");

  handleActionMessage(room, owner.id, { kind: "useConsumableSlot", slot: 0 });
  ownerState = room.syncPrimaryActivePlayerFromSim();
  assert(!getActiveSlot(ownerState, "shield"), "owner shield charge was not consumed on use");
  assert((ownerState.consumables?.sharedCooldown || 0) > 0, "owner shared consumable cooldown did not start");

  handleActionMessage(room, peer.id, { kind: "useConsumableSlot", slot: 0 });
  assert(!getActiveSlot(peerState, "shield"), "peer shield charge was not consumed on use");
  assert((peerState.consumables?.sharedCooldown || 0) > 0, "peer shared consumable cooldown did not start");

  peerState.health = 50;
  peerState.maxHealth = 100;
  peerState.consumables.sharedCooldown = 0;
  peerState.consumables.activeSlots = [{ key: "regenerationPotion", count: 1, cooldownRemaining: 0 }];
  handleActionMessage(room, peer.id, { kind: "useConsumableSlot", slot: 0 });
  const regenAfterUse = peerState.consumables?.effects?.regenerationPotion || {};
  assert(!getActiveSlot(peerState, "regenerationPotion"), "peer regeneration potion charge was not consumed on use");
  assert((peerState.consumables?.sharedCooldown || 0) > 0, "peer regeneration potion cooldown did not start");
  assert((regenAfterUse.timer || 0) > 0, "peer regeneration potion timer did not start");
  const cooldownAfterUse = peerState.consumables.sharedCooldown;
  const timerAfterUse = regenAfterUse.timer;
  const healthAfterUse = peerState.health;
  room.tick(room.lastTickMs + 1000);
  const regenAfterTick = peerState.consumables?.effects?.regenerationPotion || {};
  assert(peerState.consumables.sharedCooldown < cooldownAfterUse, "peer consumable cooldown did not tick down");
  assert(regenAfterTick.timer < timerAfterUse, "peer regeneration potion timer did not tick down");
  assert(peerState.health > healthAfterUse, "peer regeneration potion did not heal over time");
  room.sim.networkFloatingTextEvents = [];
  room.sim.nextFloatingTextId = 0;
  room.tickRemoteActivePlayerConsumables(peerState, 1);
  room.tickRemoteActivePlayerConsumables(peerState, 1);
  const regenTextIds = room.sim.networkFloatingTextEvents
    .filter((entry) => typeof entry?.text === "string" && entry.text.startsWith("+"))
    .map((entry) => entry.id);
  assert(regenTextIds.length >= 2, "peer regeneration potion should publish repeated healing feedback");
  assert(new Set(regenTextIds).size === regenTextIds.length, "peer regeneration potion feedback should allocate unique floating text ids");

  ownerState = room.syncPrimaryActivePlayerFromSim();
  ownerState.x = 512;
  ownerState.y = 640;
  ownerState.consumables.sharedCooldown = 0;
  ownerState.consumables.activeSlots = [{ key: "phoenixDraught", count: 1, cooldownRemaining: 0 }];
  peerState.x = 96;
  peerState.y = 128;
  peerState.health = 0;
  peerState.alive = false;
  peerState.spectateTargetId = owner.id;
  room.syncSimPrimaryPlayerState();
  room.sim.activePlayerCount = Math.max(1, room.clients.size);
  room.sim.networkActivePlayers = room.getSimulationPlayerEntities();
  handleActionMessage(room, owner.id, { kind: "useConsumableSlot", slot: 0 });
  ownerState = room.syncPrimaryActivePlayerFromSim();
  assert(peerState.alive === true, "Phoenix Draught should revive a dead multiplayer ally");
  assert(peerState.health === Math.ceil(peerState.maxHealth * 0.4), "Phoenix Draught should revive the ally at 40% HP");
  assert(peerState.x === ownerState.x, "Phoenix Draught should revive the ally at the user's x position");
  assert(peerState.y === ownerState.y, "Phoenix Draught should revive the ally at the user's y position");
  assert(!getActiveSlot(ownerState, "phoenixDraught"), "Phoenix Draught should be consumed after revive");

  peerState.health = 0;
  peerState.alive = false;
  peerState.spectateTargetId = owner.id;
  ownerState.consumables.sharedCooldown = 0;
  ownerState.consumables.activeSlots = [{ key: "flameOfTheFallen", count: 1, cooldownRemaining: 0 }];
  room.syncSimPrimaryPlayerState();
  room.sim.activePlayerCount = Math.max(1, room.clients.size);
  room.sim.networkActivePlayers = room.getSimulationPlayerEntities();
  handleActionMessage(room, owner.id, { kind: "useConsumableSlot", slot: 0 });
  ownerState = room.syncPrimaryActivePlayerFromSim();
  assert(room.sim.flameOfTheFallen?.active === true, "Flame of the Fallen should create an active multiplayer pyre");
  assert(peerState.alive === false, "Flame of the Fallen should not revive before the soul meter fills");
  const flame = room.sim.flameOfTheFallen;
  recordFlameOfTheFallenKill(room.sim, { x: flame.x, y: flame.y, type: "golem" });
  assert(peerState.alive === true, "Flame of the Fallen should revive a dead ally after the meter fills");
  assert(peerState.health === Math.ceil(peerState.maxHealth * 0.5), "Flame of the Fallen should revive at 50% HP");
  const flameSnapshot = serializeState(room);
  assert(flameSnapshot.flameOfTheFallen?.state === "complete", "serialized state should include completed flame state");
  assert(!getActiveSlot(ownerState, "flameOfTheFallen"), "Flame of the Fallen should be consumed after use");

  console.log(JSON.stringify({
    ownerGold: ownerState.gold,
    peerGold: peerState.gold,
    remainingStock: room.sim.shopStock,
    ownerConsumables: ownerState.consumables,
    peerConsumables: peerState.consumables,
    regenTextIds
  }, null, 2));
}

main();
