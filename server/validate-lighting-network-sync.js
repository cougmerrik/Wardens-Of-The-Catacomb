import { Game } from "../src/Game.js";
import { applyMapStateToGame, applySnapshotToGame } from "../src/net/clientStateSync.js";
import { buildDeltaCollection, buildJoinKeyframeState } from "./net/deltaProtocol.js";
import { serializeState } from "./net/stateSerialization.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeRoom(sim) {
  return {
    sim,
    idCounters: {
      enemy: 1,
      drop: 1,
      bullet: 1,
      fireArrow: 1,
      fireZone: 1,
      meleeSwing: 1,
      armorStand: 1,
      lightSource: 1,
      breakable: 1,
      wallTrap: 1
    },
    idMaps: {
      enemy: new WeakMap(),
      drop: new WeakMap(),
      bullet: new WeakMap(),
      fireArrow: new WeakMap(),
      fireZone: new WeakMap(),
      meleeSwing: new WeakMap(),
      armorStand: new WeakMap(),
      lightSource: new WeakMap(),
      breakable: new WeakMap(),
      wallTrap: new WeakMap()
    },
    getActivePlayerStates() {
      return [];
    },
    syncPrimaryActivePlayerFromSim() {
      return sim.player;
    }
  };
}

function main() {
  const serverGame = new Game(null, { headless: true });
  assert(serverGame.lightSources.length > 0, "server game should have placed torches");
  const room = makeRoom(serverGame);
  serverGame.player.lanternFuel = 0.42;
  const burningEnemy = {
    type: "goblin",
    x: serverGame.player.x + 64,
    y: serverGame.player.y,
    size: 24,
    hp: 8,
    maxHp: 8,
    burningTimer: 1.25,
    burningDps: 3,
    burningLightRadius: 96
  };
  serverGame.enemies = [burningEnemy];
  serverGame.bullets = [{
    x: serverGame.player.x + 72,
    y: serverGame.player.y,
    vx: 0,
    vy: 0,
    angle: 0,
    life: 0.5,
    size: 20,
    projectileType: "holyWave",
    lightRadius: 72,
    lightIntensity: 0.25
  }];
  serverGame.fireZones = [{
    x: serverGame.player.x + 96,
    y: serverGame.player.y,
    radius: 40,
    life: 1,
    totalLife: 1,
    zoneType: "warCircle",
    lightRadius: 44,
    lightIntensity: 0.25
  }];
  const fullState = serializeState(room);
  assert(fullState.player.lanternFuel === 0.42, "serialized primary player should include lantern fuel");
  assert(fullState.enemies.length === 1, "serialized state should include the nearby burning enemy");
  assert(fullState.enemies[0].burningTimer === 1.25, "serialized enemy should include burning timer");
  assert(fullState.enemies[0].burningLightRadius === 96, "serialized enemy should include burning light radius");
  assert(Array.isArray(fullState.lightSources), "serialized state should include lightSources");
  assert(fullState.lightSources.length === serverGame.lightSources.length, "serialized state should include all torches");
  assert(fullState.lightSources.every((light) => typeof light.id === "string" && light.type === "torch"), "serialized torches should include stable ids and type");
  assert(fullState.bullets.some((bullet) => bullet.projectileType === "holyWave" && bullet.lightRadius === 72 && bullet.lightIntensity === 0.25), "serialized bullets should include light radius and intensity");
  assert(fullState.fireZones.some((zone) => zone.zoneType === "warCircle" && zone.lightRadius === 44 && zone.lightIntensity === 0.25), "serialized fire zones should include light radius and intensity");

  const joinState = buildJoinKeyframeState(fullState);
  assert(Array.isArray(joinState.delta.lightSources.spawn), "join keyframe should include light source spawns");
  assert(joinState.delta.lightSources.spawn.length === fullState.lightSources.length, "join keyframe should include all light sources");

  const clientGame = new Game(null, { headless: true });
  applyMapStateToGame(clientGame, {
    mapSignature: fullState.mapSignature,
    floor: serverGame.floor,
    mapWidth: serverGame.mapWidth,
    mapHeight: serverGame.mapHeight,
    map: serverGame.map,
    lightSources: fullState.lightSources
  });
  assert(clientGame.lightSources.length === fullState.lightSources.length, "map bootstrap should sync light source placement");
  assert(clientGame.lightSources.every((light) => light.lit === true), "map bootstrap should preserve lit state");
  applySnapshotToGame({
    game: clientGame,
    state: {
      mapSignature: fullState.mapSignature,
      time: fullState.time,
      player: fullState.player,
      players: [],
      enemies: fullState.enemies,
      drops: [],
      lightSources: fullState.lightSources,
      breakables: [],
      wallTraps: [],
      bullets: fullState.bullets,
      fireArrows: [],
      fireZones: fullState.fireZones,
      meleeSwings: []
    },
    controller: false
  });
  assert(clientGame.enemies[0]?.burningTimer === 1.25, "snapshot should sync burning timer to client enemy");
  assert(clientGame.enemies[0]?.burningLightRadius === 96, "snapshot should sync burning light radius to client enemy");
  assert(
    clientGame.getActiveLightSources().some((source) => source.sourceType === "burningEnemy" && source.radius === 96),
    "client active lights should include synced burning enemy light"
  );
  assert(
    clientGame.getActiveLightSources().some((source) => source.sourceType === "holyWave" && source.radius === 72 && source.lightIntensity === 0.25),
    "client active lights should include synced projectile light intensity"
  );
  assert(
    clientGame.getActiveLightSources().some((source) => source.sourceType === "warCircle" && source.radius === 44 && source.lightIntensity === 0.25),
    "client active lights should include synced fire-zone light intensity"
  );

  const deltaCache = new Map();
  const keyframeDelta = buildDeltaCollection(deltaCache, fullState.lightSources, true);
  assert(Array.isArray(keyframeDelta.spawn), "delta keyframe should spawn light sources");

  serverGame.lightSources[0].lit = false;
  serverGame.lightSources[0].snuffCooldown = 0.75;
  const updatedState = serializeState(room);
  const updateDelta = buildDeltaCollection(deltaCache, updatedState.lightSources, false);
  assert(updateDelta && Array.isArray(updateDelta.update), "changed torch state should produce delta update");
  assert(updateDelta.update.some((patch) => patch.id === fullState.lightSources[0].id && patch.lit === false), "delta update should include lit=false patch");

  applySnapshotToGame({
    game: clientGame,
    state: {
      mapSignature: updatedState.mapSignature,
      time: updatedState.time,
      player: updatedState.player,
      players: [],
      delta: {
        keyframe: false,
        lightSources: updateDelta
      }
    },
    controller: false
  });
  const syncedTorch = clientGame.lightSources.find((light) => light.id === fullState.lightSources[0].id);
  assert(syncedTorch && syncedTorch.lit === false, "snapshot delta should sync lit=false to client");
  assert(syncedTorch.snuffCooldown === 0.75, "snapshot delta should sync snuff cooldown to client");
  assert(clientGame.player.lanternFuel === 0.42, "snapshot should sync lantern fuel to client player");

  console.log("Lighting network sync validation passed.");
}

main();
