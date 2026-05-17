import { strict as assert } from "node:assert";
import { GameSim } from "../src/sim/GameSim.js";
import { applySnapshotToGame } from "../src/net/clientStateSync.js";
import { synthesizeDespawnDamageFloatingTexts, synthesizeEnemyDamageFloatingTexts } from "../src/net/clientSnapshotHelpers.js";
import { rendererEffectsProjectileMethods } from "../src/rendering/rendererEffectsProjectileMethods.js";
import { runtimeSceneDrawMethods } from "../src/rendering/runtimeSceneDrawMethods.js";
import { stepNetworkEnemyPresentation } from "../src/bootstrap/networkRenderRuntime.js";
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
    fillRect(...args) { calls.push(["fillRect", ...args]); },
    strokeRect(...args) { calls.push(["strokeRect", ...args]); },
    bezierCurveTo(...args) { calls.push(["bezierCurveTo", ...args]); },
    quadraticCurveTo(...args) { calls.push(["quadraticCurveTo", ...args]); },
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
  sim.spawnFloatingText(sim.player.x, sim.player.y - 32, "Victory Rush", "#ffb3b3", 0.8, 13);
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
  assert.ok(state.floatingTexts.some((entry) => entry.text === "Victory Rush"), "serialized state should include authoritative floating text events");
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
    rotDps: 2,
    slowTimer: 1.5,
    slowPct: 0.3,
    poisonSlowTimer: 1.6,
    confusionTimer: 1.7,
    weakenedTimer: 1.8,
    bleedTimer: 1.9,
    bleedDps: 4,
    rangerMarkedTimer: 2,
    rangerMarkedBy: "local-vfx",
    tempMageCharmTimer: 2.1
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
  assert.equal(clearPatch.bleedTimer, null, "enemy delta should explicitly clear expired bleedTimer");
  assert.equal(clearPatch.bleedDps, null, "enemy delta should explicitly clear expired bleedDps");
  assert.equal(clearPatch.rangerMarkedTimer, null, "enemy delta should explicitly clear expired rangerMarkedTimer");
  assert.equal(clearPatch.rangerMarkedBy, null, "enemy delta should explicitly clear expired rangerMarkedBy");

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
  assert.equal(client.enemies[0]?.bleedTimer, null, "client enemy should clear expired bleedTimer from delta");
  assert.equal(client.enemies[0]?.rangerMarkedBy, null, "client enemy should clear expired rangerMarkedBy from delta");

  client.enemies = [{ ...enemyWithStatuses }];
  stepNetworkEnemyPresentation(client.enemies, 2.2);
  assert.equal(client.enemies[0].bleedTimer, 0, "network presentation should age bleed timer");
  assert.equal(client.enemies[0].bleedDps, 0, "network presentation should clear expired bleed dps");
  assert.equal(client.enemies[0].rangerMarkedTimer, 0, "network presentation should age ranger mark timer");
  assert.equal(client.enemies[0].rangerMarkedBy, null, "network presentation should clear expired ranger mark owner");

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
  assert.ok(client.floatingTexts.some((entry) => entry.text === "Victory Rush"), "client should apply authoritative warrior floating text events");

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

  const statusCtx = createCaptureContext();
  const statusRenderer = {
    ctx: statusCtx,
    drawEnemyStatusBadge: runtimeSceneDrawMethods.drawEnemyStatusBadge,
    drawEnemyAdditionalStatusIcons: runtimeSceneDrawMethods.drawEnemyAdditionalStatusIcons,
    drawEnemyHealthBar: runtimeSceneDrawMethods.drawEnemyHealthBar
  };
  runtimeSceneDrawMethods.drawEnemyHealthBar.call(statusRenderer, {
    size: 22,
    hp: 8,
    maxHp: 12,
    hpBarTimer: 1,
    bleedTimer: 1.5,
    rangerMarkedTimer: 1.5,
    slowTimer: 1.5,
    poisonSlowTimer: 1.5,
    weakenedTimer: 1.5,
    tempMageCharmTimer: 1.5
  }, 160, 180);
  assert.ok(statusCtx.calls.filter((call) => call[0] === "save").length >= 4, "active auxiliary status effects should draw visible status badges");
  assert.ok(
    statusCtx.calls.some((call) => call[0] === "moveTo" && call[1] === 140 && call[2] === 183),
    "bleed status icon should render in the same compact enemy status row as burn/curse/rot"
  );
  assert.ok(
    statusCtx.calls.some((call) => call[0] === "moveTo" && call[1] === 179 && call[2] === 195),
    "poison status icon should render in the same compact enemy status row as burn/curse/rot"
  );
  assert.equal(
    statusCtx.calls.some((call) => call[0] === "bezierCurveTo" && call[1] === 136 && call[2] === 188 && call[3] === 135 && call[4] === 196 && call[5] === 130 && call[6] === 197),
    false,
    "bleed status icon should not use the larger auxiliary badge row"
  );
  assert.equal(
    statusCtx.calls.some((call) => call[0] === "arc" && call[1] === 157 && call[2] === 183 && call[3] === 4),
    false,
    "poison status icon should not use the larger auxiliary badge row"
  );

  const textGame = {
    config: { enemy: { hpBarDuration: 0.9 } },
    enemies: [{ id: "damage-target", x: 100, y: 100, size: 20, hp: 6, maxHp: 12 }],
    floatingTexts: [],
    spawnFloatingText(x, y, text, color) {
      this.floatingTexts.push({ x, y, text, color });
    }
  };
  const previous = new Map([["damage-target", { hp: 12, x: 100, y: 100, size: 20 }]]);
  synthesizeEnemyDamageFloatingTexts(textGame, previous, { skip: false });
  assert.ok(textGame.floatingTexts.some((entry) => entry.text === "-6"), "network hp delta should synthesize damage text");

  const despawnTextGame = {
    config: { enemy: { hpBarDuration: 0.9 } },
    enemies: [],
    floatingTexts: [],
    spawnFloatingText(x, y, text, color) {
      this.floatingTexts.push({ x, y, text, color });
    }
  };
  synthesizeDespawnDamageFloatingTexts(
    despawnTextGame,
    new Map([["dead-target", { hp: 7, x: 120, y: 120, size: 20 }]]),
    ["dead-target"],
    { skip: false }
  );
  assert.ok(despawnTextGame.floatingTexts.some((entry) => entry.text === "-7"), "network despawn kill should still synthesize damage text");

  const floatingEventClient = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  applySnapshotToGame({
    game: floatingEventClient,
    state: {
      floatingTexts: [
        { id: "ft-ranger", x: 150, y: 180, text: "Nature's Ally", color: "#d0f09d", life: 0.7, size: 13 },
        { id: "ft-mage", x: 180, y: 180, text: "Spirit Guardians", color: "#b7f0d0", life: 0.75, size: 13 }
      ]
    },
    controller: false,
    localPlayerId: "floating-local"
  });
  applySnapshotToGame({
    game: floatingEventClient,
    state: {
      floatingTexts: [
        { id: "ft-ranger", x: 150, y: 180, text: "Nature's Ally", color: "#d0f09d", life: 0.7, size: 13 }
      ]
    },
    controller: false,
    localPlayerId: "floating-local"
  });
  assert.equal(floatingEventClient.floatingTexts.filter((entry) => entry.text === "Nature's Ally").length, 1, "network floating text events should apply once by id");
  assert.equal(floatingEventClient.floatingTexts.filter((entry) => entry.text === "Spirit Guardians").length, 1, "network floating text events should carry mage action text");

  const duplicateDamageClient = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  duplicateDamageClient.enemies = [{ id: "damage-target", x: 100, y: 100, size: 20, hp: 12, maxHp: 12 }];
  duplicateDamageClient.floatingTexts = [];
  applySnapshotToGame({
    game: duplicateDamageClient,
    state: {
      floatingTexts: [{ id: "ft-damage", x: 100, y: 87, text: "-6", color: "#e85c5c", life: 0.75, size: 14 }],
      delta: {
        keyframe: false,
        enemies: {
          update: [{ id: "damage-target", x: 100, y: 100, size: 20, hp: 6, maxHp: 12 }]
        }
      }
    },
    controller: false,
    localPlayerId: "floating-local"
  });
  assert.equal(duplicateDamageClient.floatingTexts.filter((entry) => entry.text === "-6").length, 1, "network damage event should suppress fallback hp-delta duplicate text");

  const progressionClient = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  progressionClient.player.id = "progress-local";
  progressionClient.player.x = 200;
  progressionClient.player.y = 220;
  progressionClient.level = 1;
  progressionClient.skillPoints = 0;
  progressionClient.gold = 4;
  progressionClient.floatingTexts = [];
  applySnapshotToGame({
    game: progressionClient,
    state: {
      floatingTexts: [{ id: "ft-level-local", x: 200, y: 172, text: "Level 2! +1 SP", color: "#9be18a", life: 1, size: 15 }],
      player: {
        id: "progress-local",
        classType: "archer",
        x: 200,
        y: 220,
        size: 22,
        health: 100,
        maxHealth: 100,
        level: 2,
        gold: 15,
        experience: 0,
        expToNextLevel: 40,
        skillPoints: 1,
        alive: true
      }
    },
    controller: false,
    localPlayerId: "progress-local"
  });
  assert.equal(progressionClient.floatingTexts.filter((entry) => entry.text === "Level 2! +1 SP").length, 1, "network local level-up should show level and skill point text once");
  assert.ok(progressionClient.floatingTexts.some((entry) => entry.text === "+11g"), "network local gold gain should show pickup text");

  progressionClient.remotePlayers = [{
    id: "progress-remote",
    handle: "Remote",
    classType: "fighter",
    x: 260,
    y: 220,
    size: 22,
    health: 100,
    maxHealth: 100,
    gold: 2,
    level: 1,
    skillPoints: 0,
    alive: true
  }];
  progressionClient.floatingTexts = [];
  applySnapshotToGame({
    game: progressionClient,
    state: {
      player: {
        id: "progress-local",
        classType: "archer",
        x: 200,
        y: 220,
        size: 22,
        health: 100,
        maxHealth: 100,
        gold: 15,
        level: 2,
        skillPoints: 1,
        alive: true
      },
      players: [{
        id: "progress-remote",
        handle: "Remote",
        classType: "fighter",
        x: 260,
        y: 220,
        size: 22,
        health: 100,
        maxHealth: 100,
        gold: 8,
        level: 3,
        skillPoints: 1,
        alive: true
      }]
    },
    controller: false,
    localPlayerId: "progress-local"
  });
  assert.ok(progressionClient.floatingTexts.some((entry) => entry.text === "Level 3! +1 SP"), "network remote level-up should show level and skill point text");
  assert.ok(progressionClient.floatingTexts.some((entry) => entry.text === "+6g"), "network remote gold gain should show pickup text");

  console.log(JSON.stringify({
    networkVfxSnapshots: "ok",
    bullets: state.bullets.length,
    fireZones: state.fireZones.length,
    meleeSwings: state.meleeSwings.length
  }, null, 2));
}

main();
