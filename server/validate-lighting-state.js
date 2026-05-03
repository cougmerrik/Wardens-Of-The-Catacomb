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
  assert(CONFIG.lighting.ambientDarknessAlpha === 0.99, "ambient darkness should be set to 99%");
  assert(CONFIG.lighting.maxDarknessAlpha >= 0.99, "outer light falloff should approach deep darkness");
  assert(CONFIG.lighting.enemyMaxDarknessAlpha === CONFIG.lighting.maxDarknessAlpha, "enemy and drop darkness should meet the global darkness maximum");
  assert(CONFIG.lighting.enemyLightFalloffDecay <= 2.4, "enemy sprite illumination should ramp visibly before reaching a light source");
  assert(CONFIG.lighting.fireArrowProjectileRadiusTiles > 0, "fire arrow projectiles should configure a light radius");
  assert(CONFIG.lighting.fireZoneRadiusMultiplier > 1, "ranger fire zones should configure an expanded light radius");
  assert(CONFIG.lighting.fireArrowProjectileRadiusTiles >= CONFIG.lighting.torchRadiusTiles * 2, "fire arrow projectiles should emit bright light");
  assert(CONFIG.lighting.fireZoneMinRadiusTiles >= CONFIG.lighting.torchRadiusTiles, "ranger fire zones should emit bright light");
  assert(CONFIG.lighting.burningEnemyRadiusTiles > CONFIG.lighting.torchRadiusTiles, "ignited enemies should emit bright light");
  assert(CONFIG.lighting.fireLightFalloffDecay < 2, "fire light should have a visibly broad falloff");
  assert(CONFIG.lighting.fireLightBrightRadiusRatio > CONFIG.lighting.brightRadiusRatio, "fire light should keep a wider bright center");
  assert(CONFIG.lighting.playerBaseRadiusTiles === 0, "0% lantern fuel should match global darkness with no player light radius");
  assert(CONFIG.lighting.playerFuelRadiusTiles >= 23.595, "full lantern fuel should provide the doubled maximum radius increase");
  assert(CONFIG.lighting.lanternInitialFuel === 0.5, "lantern should start at 50% fuel");
  assert(CONFIG.lighting.lanternMaxFuel === 1, "lantern fuel should be bounded to 100%");
  assert(CONFIG.lighting.lanternFuelPerTorch === 0.2, "lit torches should add 20% lantern fuel");
  assert(CONFIG.lighting.lanternFuelDecayPerSecond > 0, "lantern fuel should decay over time");
  assert(CONFIG.lighting.torchRadiusTiles <= 2.5, "torch radius should stay localized");
  assert(CONFIG.lighting.warCircleLightRadiusMultiplier === 1.1, "War Circle light radius should extend 10% past the circle");
  assert(CONFIG.lighting.warCirclePaladinLightPower === 0.25, "Paladin War Circle light should use 25% torch power");
  assert(CONFIG.lighting.warCircleEldritchLightPower === 0.1, "Eldritch War Circle light should use 10% torch power");
  assert(CONFIG.lighting.shockReleasePaladinLightPower === 0.25, "Paladin Shock Release light should use 25% torch power");
  assert(CONFIG.lighting.shockReleaseEldritchLightPower === 0.1, "Eldritch Shock Release light should use 10% torch power");
  assert(CONFIG.lighting.gladiatorLanternDecayMultiplier === 0.9, "Gladiator doctrine should decay lantern fuel at 90% normal rate");
  assert(CONFIG.lighting.stormcallerFlashRadiusTiles === 2, "Stormcaller flash light should stay within 2 tiles");
  assert(CONFIG.lighting.stormcallerFlashLightPower === 0.1, "Stormcaller flash light should use 10% power");
  assert(CONFIG.lighting.stormcallerFlashLightFalloffDecay < 1, "Stormcaller flash light should use diffuse falloff");
  assert(CONFIG.lighting.stormcallerFlashLightDimRadiusRatio === 1, "Stormcaller flash light should diffuse to the full radius");
  assert(CONFIG.lighting.beastMasterDarkVisionTiles === 1, "Beast Master dark vision should add exactly 1 tile");
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

  game.player.classType = "fighter";
  game.warriorTalents = { gladiatorDoctrine: { points: 1 } };
  game.player.lanternFuel = 0.5;
  game.updateLightingInteractions(10);
  const expectedGladiatorFuel = 0.5 - CONFIG.lighting.lanternFuelDecayPerSecond * CONFIG.lighting.gladiatorLanternDecayMultiplier * 10;
  assert(Math.abs(game.player.lanternFuel - expectedGladiatorFuel) < 0.001, "Gladiator doctrine should slow lantern decay to 90%");
  game.warriorTalents = {};
  game.player.lanternFuel = 0.5;
  game.updateLightingInteractions(10);
  const expectedNormalFuel = 0.5 - CONFIG.lighting.lanternFuelDecayPerSecond * 10;
  assert(Math.abs(game.player.lanternFuel - expectedNormalFuel) < 0.001, "non-Gladiator lantern decay should stay normal");
  game.player.classType = "archer";

  const ghost = { type: "ghost", x: game.player.x + 10, y: game.player.y, hp: 10, burningTimer: 1.5 };
  const skeleton = { type: "skeleton", x: game.player.x + 20, y: game.player.y, hp: 10 };
  assert(game.getEnemyLightRadius(ghost) === 0, "ghost sprite glow should not create a world light radius");
  assert(game.getEnemyLightRadius(skeleton) === 0, "ordinary enemies should not glow by default");

  game.enemies = [ghost, skeleton];
  game.lightSources = [{ type: "torch", x: game.player.x + 30, y: game.player.y, lit: true, lightRadius: 80 }];
  game.fireArrows = [{ x: game.player.x + 48, y: game.player.y, life: 0.6, size: 8 }];
  game.fireZones = [
    { x: game.player.x + 80, y: game.player.y, radius: 40, life: 0.8, zoneType: "fire" },
    { x: game.player.x + 112, y: game.player.y, radius: 14, life: 0.8, zoneType: "pinningFire" },
    { x: game.player.x + 144, y: game.player.y, radius: 40, life: 0.8, zoneType: "sonyaFire" }
  ];
  const activeSources = game.getActiveLightSources();
  assert(activeSources.some((source) => source.sourceType === "player"), "active lights should include player");
  assert(activeSources.some((source) => source.sourceType === "torch"), "active lights should include lit torch");
  assert(activeSources.some((source) => source.sourceType === "rangerFireArrow" && source.radius > 0), "active lights should include ranger fire arrows");
  assert(activeSources.some((source) => source.sourceType === "rangerFireArrow" && source.lightDecay < 2 && source.brightRadiusRatio > CONFIG.lighting.brightRadiusRatio), "ranger fire arrows should use bright fire light falloff");
  assert(activeSources.some((source) => source.sourceType === "burningEnemy" && source.radius > CONFIG.lighting.torchRadiusTiles * CONFIG.map.tile), "active lights should include ignited enemies");
  assert(activeSources.some((source) => source.sourceType === "burningEnemy" && source.lightDecay < 2), "ignited enemies should use bright fire light falloff");
  assert(activeSources.some((source) => source.sourceType === "rangerFireZone" && source.entityType === "fire" && source.radius > 40), "active lights should include circular ranger fire zones");
  assert(activeSources.some((source) => source.sourceType === "rangerFireZone" && source.entityType === "fire" && source.lightDecay < 2), "ranger fire zones should use bright fire light falloff");

  game.player.lanternFuel = 0;
  game.rangerTalents = { beastMasterPath: { points: 1 } };
  assert(game.getPlayerLightRadius(game.player) === CONFIG.lighting.beastMasterDarkVisionTiles * CONFIG.map.tile, "Beast Master should see 1 extra tile with empty lantern fuel");
  game.rangerTalents = {};
  assert(game.getPlayerLightRadius(game.player) === 0, "non-Beast Master empty lantern fuel should still have no player light radius");

  game.bullets = [{
    x: game.player.x + 176,
    y: game.player.y,
    life: 0.4,
    projectileType: "holyWave",
    lightRadius: CONFIG.lighting.torchRadiusTiles * CONFIG.map.tile,
    lightIntensity: CONFIG.lighting.shockReleasePaladinLightPower
  }];
  game.fireZones.push(
    {
      x: game.player.x + 208,
      y: game.player.y,
      radius: 24,
      life: 1,
      zoneType: "warCircle",
      lightRadius: 24 * CONFIG.lighting.warCircleLightRadiusMultiplier,
      lightIntensity: CONFIG.lighting.warCirclePaladinLightPower
    },
    {
      x: game.player.x + 240,
      y: game.player.y,
      radius: 18,
      life: 0.18,
      zoneType: "stormcallerFlash",
      lightRadius: CONFIG.lighting.stormcallerFlashRadiusTiles * CONFIG.map.tile,
      lightIntensity: CONFIG.lighting.stormcallerFlashLightPower
    }
  );
  const activeClassSources = game.getActiveLightSources();
  assert(activeClassSources.some((source) => source.sourceType === "holyWave" && source.radius === CONFIG.lighting.torchRadiusTiles * CONFIG.map.tile && source.lightIntensity === CONFIG.lighting.shockReleasePaladinLightPower), "Shock Release projectile should be a low-power active light source");
  assert(activeClassSources.some((source) => source.sourceType === "warCircle" && source.radius === 24 * CONFIG.lighting.warCircleLightRadiusMultiplier && source.lightIntensity === CONFIG.lighting.warCirclePaladinLightPower), "War Circle should light the whole circle plus 10% at low power");
  assert(activeClassSources.some((source) => source.sourceType === "stormcallerFlash" && source.radius === CONFIG.lighting.stormcallerFlashRadiusTiles * CONFIG.map.tile && source.lightIntensity === CONFIG.lighting.stormcallerFlashLightPower && source.lightDecay === CONFIG.lighting.stormcallerFlashLightFalloffDecay), "Stormcaller flashes should be diffuse active light sources");
  assert(activeSources.some((source) => source.sourceType === "rangerFireZone" && source.entityType === "pinningFire" && source.radius >= CONFIG.lighting.fireZoneMinRadiusTiles * CONFIG.map.tile), "active lights should include pinning fire line segments");
  assert(!activeSources.some((source) => source.sourceType === "rangerFireZone" && source.entityType === "sonyaFire"), "enemy fire patches should not be classified as ranger fire light");
  assert(!activeSources.some((source) => source.sourceType === "enemy"), "default ghosts should not be active world lights");
  assert(activeSources.length === 6, `expected 6 active lights, got ${activeSources.length}`);

  console.log("Lighting state validation passed.");
}

main();
