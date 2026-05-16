import { strict as assert } from "node:assert";
import { GameSim } from "../src/sim/GameSim.js";
import { applySnapshotToGame } from "../src/net/clientStateSync.js";
import { rendererEffectsProjectileMethods } from "../src/rendering/rendererEffectsProjectileMethods.js";
import { buildDeltaCollection } from "./net/deltaProtocol.js";
import { serializeState } from "./net/stateSerialization.js";

function createRoom(sim) {
  return {
    sim,
    idMaps: {},
    idCounters: {},
    getActivePlayerStates() {
      return [sim.player];
    },
    syncPrimaryActivePlayerFromSim() {
      return sim.player;
    }
  };
}

function requireEntry(collection, predicate, label) {
  const entry = (Array.isArray(collection) ? collection : []).find(predicate);
  assert.ok(entry, `${label} missing`);
  return entry;
}

function createCaptureContext() {
  const calls = [];
  const gradient = { addColorStop() {} };
  return {
    calls,
    save() { calls.push(["save"]); },
    restore() { calls.push(["restore"]); },
    beginPath() { calls.push(["beginPath"]); },
    closePath() { calls.push(["closePath"]); },
    moveTo(...args) { calls.push(["moveTo", ...args]); },
    lineTo(...args) { calls.push(["lineTo", ...args]); },
    arc(...args) { calls.push(["arc", ...args]); },
    fill() { calls.push(["fill"]); },
    stroke() { calls.push(["stroke"]); },
    createRadialGradient() { return gradient; },
    createLinearGradient() { return gradient; }
  };
}

function main() {
  const sim = new GameSim({ classType: "fighter", viewportWidth: 960, viewportHeight: 640 });
  sim.player.id = "local-vfx";
  sim.player.x = 240;
  sim.player.y = 220;
  sim.player.classType = "fighter";
  sim.worldWidth = 960;
  sim.worldHeight = 640;
  sim.time = 12.5;

  sim.bullets.push({
    x: 280,
    y: 220,
    vx: 320,
    vy: 0,
    angle: 0,
    life: 0.9,
    size: 7,
    damage: 12,
    projectileType: "mage_fireBolt",
    damageType: "fire",
    critMultiplier: 1.5,
    ownerId: "local-vfx"
  });

  sim.fireZones.push({
    x: 260,
    y: 250,
    radius: 64,
    life: 2.5,
    totalLife: 3,
    zoneType: "warCircle",
    damageType: "physical",
    doctrine: "berserker",
    ownerId: "local-vfx",
    followOwner: true,
    size: 96,
    strikeAt: 0.75,
    visualLife: 2.5
  });

  sim.meleeSwings.push({
    x: sim.player.x,
    y: sim.player.y,
    angle: 0.25,
    arc: Math.PI * 0.7,
    range: 64,
    life: 0.45,
    maxLife: 0.95,
    style: "warWhip",
    modifier: "cleaving",
    doctrine: "eldritch",
    executeProc: true,
    ownerId: "local-vfx"
  });
  sim.enemies.push({
    id: "mimic-vfx",
    type: "mimic",
    x: 300,
    y: 260,
    size: 20,
    hp: 10,
    maxHp: 10,
    dormant: true,
    revealed: false,
    tongueDirX: -1,
    tongueDirY: 0,
    tongueLength: 12
  });

  const state = serializeState(createRoom(sim));
  const mimic = requireEntry(state.enemies, (entry) => entry.type === "mimic", "serialized mimic");
  assert.equal(mimic.dormant, true, "mimic dormant state should survive serialization");
  assert.equal(mimic.tongueDirX, -1, "mimic tongue direction should survive serialization");
  assert.equal(mimic.tongueLength, 12, "mimic tongue length should survive serialization");
  const bullet = requireEntry(state.bullets, (entry) => entry.projectileType === "mage_fireBolt", "serialized mage projectile");
  assert.equal(bullet.damageType, "fire", "projectile damageType should survive serialization for renderer palette");
  assert.equal(bullet.critMultiplier, 1.5, "projectile critMultiplier should survive serialization");
  assert.equal(bullet.ownerId, "local-vfx", "projectile ownerId should survive serialization");

  const zone = requireEntry(state.fireZones, (entry) => entry.zoneType === "warCircle", "serialized war circle");
  assert.equal(zone.doctrine, "berserker", "fire-zone doctrine should survive serialization for palette selection");
  assert.equal(zone.ownerId, "local-vfx", "fire-zone ownerId should survive serialization");
  assert.equal(zone.followOwner, true, "fire-zone followOwner should survive serialization");
  assert.equal(zone.size, 96, "fire-zone size should survive serialization");
  assert.equal(zone.strikeAt, 0.75, "fire-zone strikeAt should survive serialization");
  assert.equal(zone.visualLife, 2.5, "fire-zone visualLife should survive serialization");

  const swing = requireEntry(state.meleeSwings, (entry) => entry.style === "warWhip", "serialized melee swing");
  assert.equal(swing.modifier, "cleaving", "melee modifier should survive serialization");
  assert.equal(swing.doctrine, "eldritch", "melee doctrine should survive serialization");
  assert.equal(swing.executeProc, true, "melee executeProc should survive serialization");
  assert.equal(swing.maxLife, 0.95, "melee maxLife should survive serialization");
  assert.equal(swing.ownerId, "local-vfx", "melee ownerId should survive serialization");

  const deltaCache = new Map();
  const zoneDelta = buildDeltaCollection(deltaCache, state.fireZones, true);
  assert.equal(zoneDelta.spawn[0].doctrine, "berserker", "keyframe delta should preserve fire-zone doctrine");
  assert.equal(zoneDelta.spawn[0].followOwner, true, "keyframe delta should preserve fire-zone followOwner");

  const swingDelta = buildDeltaCollection(new Map(), state.meleeSwings, true);
  assert.equal(swingDelta.spawn[0].style, "warWhip", "keyframe delta should preserve melee style");
  assert.equal(swingDelta.spawn[0].executeProc, true, "keyframe delta should preserve melee executeProc");

  const enemyDeltaCache = new Map();
  const enemyWithStatuses = {
    id: "e_status",
    type: "ghost",
    x: 120,
    y: 140,
    size: 20,
    hp: 6,
    maxHp: 6,
    burningTimer: 1.2,
    burningDps: 3,
    curseTimer: 2.5,
    rotTimer: 4,
    rotDps: 2
  };
  buildDeltaCollection(enemyDeltaCache, [enemyWithStatuses], true);
  const statusClearDelta = buildDeltaCollection(enemyDeltaCache, [{
    id: "e_status",
    type: "ghost",
    x: 122,
    y: 140,
    size: 20,
    hp: 6,
    maxHp: 6
  }], false);
  const clearPatch = statusClearDelta.update.find((entry) => entry.id === "e_status");
  assert.equal(clearPatch.burningTimer, null, "enemy delta should explicitly clear expired burningTimer");
  assert.equal(clearPatch.burningDps, null, "enemy delta should explicitly clear expired burningDps");
  assert.equal(clearPatch.curseTimer, null, "enemy delta should explicitly clear expired curseTimer");
  assert.equal(clearPatch.rotTimer, null, "enemy delta should explicitly clear expired rotTimer");
  assert.equal(clearPatch.rotDps, null, "enemy delta should explicitly clear expired rotDps");

  const client = new GameSim({ classType: "fighter", viewportWidth: 960, viewportHeight: 640 });
  client.player.id = "local-vfx";
  client.enemies = [{ ...enemyWithStatuses }];
  applySnapshotToGame({
    game: client,
    state: { delta: { keyframe: false, enemies: statusClearDelta } },
    controller: false,
    localPlayerId: "local-vfx"
  });
  assert.equal(client.enemies[0]?.burningTimer, null, "client enemy should clear expired burningTimer from delta");
  assert.equal(client.enemies[0]?.curseTimer, null, "client enemy should clear expired curseTimer from delta");
  assert.equal(client.enemies[0]?.rotTimer, null, "client enemy should clear expired rotTimer from delta");

  applySnapshotToGame({
    game: client,
    state,
    controller: false,
    localPlayerId: "local-vfx"
  });

  assert.equal(client.bullets[0]?.damageType, "fire", "client projectile should keep damageType after snapshot application");
  assert.equal(client.fireZones[0]?.doctrine, "berserker", "client fire-zone should keep doctrine after snapshot application");
  assert.equal(client.fireZones[0]?.size, 96, "client fire-zone should keep size after snapshot application");
  assert.equal(client.meleeSwings[0]?.style, "warWhip", "client melee swing should keep style after snapshot application");
  assert.equal(client.meleeSwings[0]?.executeProc, true, "client melee swing should keep executeProc after snapshot application");

  const captureCtx = createCaptureContext();
  const renderer = {
    ctx: captureCtx,
    config: { effects: { meleeSwingLife: 0.17 } },
    drawMeleeSwing: rendererEffectsProjectileMethods.drawMeleeSwing
  };
  rendererEffectsProjectileMethods.drawProjectiles.call(renderer, {
    player: { x: 900, y: 500 },
    bullets: [],
    fireArrows: [],
    fireZones: [],
    necromancerRuntime: { souls: [] },
    time: 0,
    meleeSwings: [{
      x: 240,
      y: 220,
      angle: 0,
      arc: Math.PI * 0.7,
      range: 64,
      life: 0.17,
      maxLife: 0.17,
      style: "broadswing"
    }]
  }, 0, 0);
  assert.ok(
    captureCtx.calls.some((call) => call[0] === "moveTo" && call[1] === 252 && call[2] === 220),
    "melee swing handle should be anchored to swing origin, not local player"
  );
  assert.equal(
    captureCtx.calls.some((call) => call[0] === "moveTo" && call[1] === 912 && call[2] === 500),
    false,
    "remote melee swing handle incorrectly anchored to local player"
  );

  console.log(JSON.stringify({
    networkVfxSnapshots: "ok",
    bullets: state.bullets.length,
    fireZones: state.fireZones.length,
    meleeSwings: state.meleeSwings.length
  }, null, 2));
}

main();
