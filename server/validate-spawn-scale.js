import { GameSim } from "../src/sim/GameSim.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function scaleAt(game, floor, level) {
  game.floor = floor;
  game.level = level;
  return game.getEnemySpawnRateScale();
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function assertRatioInRange(label, actual, original, min, max) {
  const ratio = actual / original;
  assert(ratio >= min && ratio <= max, `${label} expected ratio ${min}-${max}, got ${round(ratio)} (${actual}/${original})`);
}

function validateFloorStepSpawnScale() {
  const game = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  const initial = scaleAt(game, 1, 1);
  const floorOneBossLevel = game.getFloorBossTriggerLevel(1);
  const floorOnePreBoss = scaleAt(game, 1, floorOneBossLevel - 1);
  const floorOneBossTrigger = scaleAt(game, 1, floorOneBossLevel);
  const floorTwoStart = scaleAt(game, 2, game.getMinimumLevelForFloorStart(2));
  const floorTwoEarly = scaleAt(game, 2, game.getMinimumLevelForFloorStart(2) + 1);
  const floorTwoPreBoss = scaleAt(game, 2, game.getFloorBossTriggerLevel(2) - 1);
  const floorTwoBossTrigger = scaleAt(game, 2, game.getFloorBossTriggerLevel(2));
  const floorThreeStart = scaleAt(game, 3, game.getMinimumLevelForFloorStart(3));
  const floorThreePreBoss = scaleAt(game, 3, game.getFloorBossTriggerLevel(3) - 1);
  const floorFiveStart = scaleAt(game, 5, game.getMinimumLevelForFloorStart(5));
  const floorFivePreBoss = scaleAt(game, 5, game.getFloorBossTriggerLevel(5) - 1);
  const floorSixPreBoss = scaleAt(game, 6, game.getFloorBossTriggerLevel(6) - 1);
  const floorSevenPreBoss = scaleAt(game, 7, game.getFloorBossTriggerLevel(7) - 1);
  const floorTenStart = scaleAt(game, 10, game.getMinimumLevelForFloorStart(10));
  const floorTenPreBoss = scaleAt(game, 10, game.getFloorBossTriggerLevel(10) - 1);

  assert(initial < 1, `initial spawn scale should be reduced below old baseline, got ${initial}`);
  assert(floorOnePreBoss > initial, "floor one spawn scale did not rise before the boss trigger");
  assert(floorOneBossTrigger === floorOnePreBoss, "boss-trigger level should not increase spawn pressure beyond the pre-boss level");
  assert(floorTwoStart < floorOnePreBoss, `floor two start should step back from floor one pre-boss pressure (${floorTwoStart} >= ${floorOnePreBoss})`);
  assert(floorTwoEarly < floorOnePreBoss, `floor two early pressure should remain below floor one pre-boss pressure (${floorTwoEarly} >= ${floorOnePreBoss})`);
  assert(floorTwoPreBoss > floorTwoStart, "floor two pre-boss level should be harder than floor start");
  assert(floorTwoBossTrigger === floorTwoPreBoss, "floor two boss-trigger level should not increase spawn pressure beyond the pre-boss level");
  assert(floorThreeStart < floorTwoPreBoss, `floor three start should step back from floor two pre-boss pressure (${floorThreeStart} >= ${floorTwoPreBoss})`);
  assertRatioInRange("floor three start", floorThreeStart, game.config.enemy.levelSpawnRateBase + (game.getMinimumLevelForFloorStart(3) - 1) * 0.1, 0.85, 0.9);
  assertRatioInRange("floor five start", floorFiveStart, game.config.enemy.levelSpawnRateCap, 0.85, 0.9);
  assertRatioInRange("floor ten start", floorTenStart, game.config.enemy.levelSpawnRateCap, 0.85, 0.9);
  assert(floorFivePreBoss <= floorThreePreBoss * 1.05 + 0.001, "floor five cap exceeded 5% over floor three peak");
  assert(floorSixPreBoss <= floorThreePreBoss * 1.10 + 0.001, "floor six cap exceeded 10% over floor three peak");
  assert(floorSevenPreBoss <= game.config.enemy.levelSpawnRateCap, "floor seven cap exceeded global max");
  assert(floorTenPreBoss <= game.config.enemy.levelSpawnRateCap, "floor ten cap exceeded global max");

  return {
    floor1Level1: round(initial),
    floor1PreBoss: round(floorOnePreBoss),
    floor1BossTrigger: round(floorOneBossTrigger),
    floor2Start: round(floorTwoStart),
    floor2Early: round(floorTwoEarly),
    floor2PreBoss: round(floorTwoPreBoss),
    floor2BossTrigger: round(floorTwoBossTrigger),
    floor3Start: round(floorThreeStart),
    floor3PreBoss: round(floorThreePreBoss),
    floor5Start: round(floorFiveStart),
    floor5PreBoss: round(floorFivePreBoss),
    floor6PreBoss: round(floorSixPreBoss),
    floor7PreBoss: round(floorSevenPreBoss),
    floor10Start: round(floorTenStart),
    floor10PreBoss: round(floorTenPreBoss)
  };
}

const result = validateFloorStepSpawnScale();
console.log(JSON.stringify(result, null, 2));
