import { strict as assert } from "node:assert";
import { GameSim } from "../src/sim/GameSim.js";
import { applySnapshotToGame } from "../src/net/clientStateSync.js";
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

  const state = serializeState(createRoom(sim));
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

  const client = new GameSim({ classType: "fighter", viewportWidth: 960, viewportHeight: 640 });
  client.player.id = "local-vfx";
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

  console.log(JSON.stringify({
    networkVfxSnapshots: "ok",
    bullets: state.bullets.length,
    fireZones: state.fireZones.length,
    meleeSwings: state.meleeSwings.length
  }, null, 2));
}

main();
