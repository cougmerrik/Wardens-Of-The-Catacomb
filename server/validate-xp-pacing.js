import { GameSim } from "../src/sim/GameSim.js";
import { getXpToNextLevelForLevel } from "../src/game/xpProgression.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function getSpawnWeights(game, floor) {
  game.floor = floor;
  game.setBiomeKey(game.resolveFloorBiomeKey(floor));
  const enemy = game.config.enemy;
  const weights = {};
  let remaining = 1;
  const take = (type, chance) => {
    const weight = remaining * Math.max(0, Math.min(1, chance));
    if (weight > 0) weights[type] = (weights[type] || 0) + weight;
    remaining -= weight;
  };
  if (floor >= enemy.prisonerMinFloor) take("prisoner", enemy.prisonerSpawnChance);
  if (floor >= enemy.ratArcherMinFloor) take("rat_archer", game.getRatArcherSpawnChance());
  if (floor >= enemy.mummyMinFloor) take("mummy", enemy.mummySpawnChance);
  if (floor >= enemy.skeletonWarriorMinFloor) take("skeleton_warrior", enemy.skeletonWarriorSpawnChance);
  take("goblin", enemy.goblinSpawnChance);
  weights.ghost = (weights.ghost || 0) + remaining;
  return weights;
}

function getAverageXpPerEnemy(game, floor, level) {
  game.level = level;
  return Object.entries(getSpawnWeights(game, floor)).reduce(
    (sum, [type, weight]) => sum + weight * game.xpFromEnemy({ type, goldEaten: 0 }),
    0
  );
}

function getXpPerMinute(game, floor, level) {
  game.floor = floor;
  game.level = level;
  const spawnsPerMinute = 60 / game.getEnemySpawnInterval();
  return spawnsPerMinute * game.getEnemyPackSize() * getAverageXpPerEnemy(game, floor, level);
}

function estimateFloor(game, floor) {
  const startLevel = game.getMinimumLevelForFloorStart(floor);
  const triggerLevel = game.getFloorBossTriggerLevel(floor);
  let xpNeeded = 0;
  let minutes = 0;
  for (let level = startLevel; level < triggerLevel; level += 1) {
    const levelXp = getXpToNextLevelForLevel(game.config, level);
    xpNeeded += levelXp;
    minutes += levelXp / getXpPerMinute(game, floor, level);
  }
  return {
    floor,
    startLevel,
    triggerLevel,
    xpNeeded,
    minutes
  };
}

function round(value) {
  return Math.round(value * 10) / 10;
}

const game = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
const estimates = [];
for (let floor = 1; floor <= 10; floor += 1) {
  const estimate = estimateFloor(game, floor);
  estimates.push({
    ...estimate,
    minutes: round(estimate.minutes)
  });
}

for (const estimate of estimates) {
  if (estimate.floor <= 4) continue;
  assert(
    estimate.minutes >= 4.5 && estimate.minutes <= 5.5,
    `floor ${estimate.floor} expected 4.5-5.5 minutes, got ${estimate.minutes}`
  );
}

console.log(JSON.stringify(estimates, null, 2));
