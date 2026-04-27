import { Game } from "../src/Game.js";
import { CONFIG } from "../src/config.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createHeadlessGame() {
  return new Game(null, { headless: true });
}

function main() {
  assert(CONFIG.lighting && typeof CONFIG.lighting === "object", "CONFIG.lighting missing");
  assert(CONFIG.lighting.enabled === true, "lighting should default enabled");
  assert(CONFIG.lighting.ambientDarknessAlpha < 1, "ambient darkness must leave faint visibility");
  assert(CONFIG.lighting.maxDarknessAlpha < 1, "max darkness must not fully black out play");
  assert(CONFIG.lighting.brightRadiusRatio < CONFIG.lighting.dimRadiusRatio, "bright radius must be inside dim radius");
  assert(CONFIG.lighting.ambientDarknessAlpha >= 0.7, "ambient darkness should keep unlit areas meaningfully dark");
  assert(CONFIG.lighting.maxDarknessAlpha >= 0.9, "outer light falloff should approach deep darkness");
  assert(CONFIG.lighting.playerBaseRadiusTiles === 0, "0% lantern fuel should match global darkness with no player light radius");
  assert(CONFIG.lighting.playerFuelRadiusTiles >= 9.75, "full lantern fuel should provide the expanded radius increase");
  assert(CONFIG.lighting.lanternInitialFuel === 0.5, "lantern should start at 50% fuel");
  assert(CONFIG.lighting.lanternMaxFuel === 1, "lantern fuel should be bounded to 100%");
  assert(CONFIG.lighting.lanternFuelPerTorch === 0.2, "lit torches should add 20% lantern fuel");
  assert(CONFIG.lighting.lanternFuelDecayPerSecond > 0, "lantern fuel should decay over time");
  assert(CONFIG.lighting.torchRadiusTiles <= 2.5, "torch radius should stay localized");
  assert(!("ghostRadiusTiles" in CONFIG.lighting), "ghosts should not configure a world light radius");

  const game = createHeadlessGame();
  assert(Array.isArray(game.lightSources), "game.lightSources should initialize as an array");
  assert(typeof game.getPlayerLightRadius === "function", "getPlayerLightRadius should be available on game");
  assert(typeof game.getEnemyLightRadius === "function", "getEnemyLightRadius should be available on game");
  assert(typeof game.getActiveLightSources === "function", "getActiveLightSources should be available on game");

  game.lightSources.push({ type: "sentinel", x: game.player.x, y: game.player.y, lit: true, lightRadius: 100 });
  game.generateFloor(game.mapWidth, game.mapHeight);
  assert(Array.isArray(game.lightSources), "game.lightSources should remain an array after floor generation");
  assert(!game.lightSources.some((source) => source.type === "sentinel"), "generateFloor should replace stale lightSources");

  const radiusLevelOne = game.getPlayerLightRadius(game.player);
  assert(radiusLevelOne > 0, "player light radius should be positive");
  assert(game.player.lanternFuel === 0.5, "player should begin with 50% lantern fuel");
  game.player.lanternFuel = -1;
  const radiusEmptyFuel = game.getPlayerLightRadius(game.player);
  assert(game.player.lanternFuel === 0, "lantern fuel should clamp at 0%");
  assert(radiusEmptyFuel === 0, "0% lantern fuel should produce no player light radius");
  game.player.lanternFuel = 2;
  const radiusFullFuel = game.getPlayerLightRadius(game.player);
  assert(game.player.lanternFuel === 1, "lantern fuel should clamp at 100%");
  const expectedHalfRadius = radiusFullFuel * 0.5;
  game.player.lanternFuel = 0.5;
  assert(Math.abs(game.getPlayerLightRadius(game.player) - expectedHalfRadius) < 0.001, "player light radius should scale linearly with lantern fuel percent");
  const fuelBeforeDecay = game.player.lanternFuel;
  game.updateLightingInteractions(5);
  assert(game.player.lanternFuel < fuelBeforeDecay, "lantern fuel should decay over time");
  const radiusAfterDecay = game.getPlayerLightRadius(game.player);
  assert(radiusAfterDecay < radiusLevelOne, "player light radius should shrink as lantern fuel decays");
  game.player.lanternFuel = game.config.lighting.lanternMaxFuel;
  const radiusFullFuelAfterDecay = game.getPlayerLightRadius(game.player);
  assert(radiusFullFuelAfterDecay > radiusAfterDecay, "full lantern fuel should increase player light radius");
  game.level = 6;
  const radiusLevelSix = game.getPlayerLightRadius(game.player);
  assert(radiusLevelSix > radiusFullFuelAfterDecay, "player light radius should still scale with level");

  const ghost = { type: "ghost", x: game.player.x + 10, y: game.player.y, hp: 10 };
  const skeleton = { type: "skeleton", x: game.player.x + 20, y: game.player.y, hp: 10 };
  assert(game.getEnemyLightRadius(ghost) === 0, "ghost sprite glow should not create a world light radius");
  assert(game.getEnemyLightRadius(skeleton) === 0, "ordinary enemies should not glow by default");

  game.enemies = [ghost, skeleton];
  game.lightSources = [{ type: "torch", x: game.player.x + 30, y: game.player.y, lit: true, lightRadius: 80 }];
  const activeSources = game.getActiveLightSources();
  assert(activeSources.some((source) => source.sourceType === "player"), "active lights should include player");
  assert(activeSources.some((source) => source.sourceType === "torch"), "active lights should include lit torch");
  assert(!activeSources.some((source) => source.sourceType === "enemy"), "default ghosts should not be active world lights");
  assert(activeSources.length === 2, `expected 2 active lights, got ${activeSources.length}`);

  console.log("Lighting state validation passed.");
}

main();
