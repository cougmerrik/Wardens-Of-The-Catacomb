import assert from "node:assert/strict";
import { updateSkeleton } from "../src/game/enemyAi.js";
import { getPriorityTarget } from "../src/game/enemyAiShared.js";
import { moveEnemyTowardTargetPoint } from "../src/game/world/navigationCollision.js";
import { GameSim } from "../src/sim/GameSim.js";

function makePathingHarness() {
  const tile = 32;
  const game = {
    config: {
      map: { tile },
      enemy: {}
    },
    door: { open: true },
    breakables: [],
    map: [
      "#######",
      "#.....#",
      "#.###.#",
      "#...#.#",
      "###.#.#",
      "#.....#",
      "#######"
    ],
    enemies: [],
    player: {
      id: "player",
      x: tile * 5.5,
      y: tile * 3.5,
      size: 22,
      health: 100,
      maxHealth: 100,
      alive: true
    },
    isEnemyFriendlyToPlayer: () => false,
    setEnemyTacticPhase() {},
    moveEnemyTowardTarget(enemy, target, speedScale, dt, minDistance = 0) {
      this.moveEnemyTowardTargetPoint(enemy, target.x, target.y, speedScale, dt, minDistance, true);
    },
    moveEnemyTowardTargetPoint(enemy, targetX, targetY, speedScale, dt, minDistance = 0, usePathfinding = false) {
      moveEnemyTowardTargetPoint(this, enemy, targetX, targetY, speedScale, dt, minDistance, usePathfinding);
    }
  };
  return { game, tile };
}

function validateSharedPathingReachesAroundWalls() {
  const { game, tile } = makePathingHarness();
  const enemy = {
    id: "pathing-skeleton",
    type: "skeleton",
    x: tile * 1.5,
    y: tile * 3.5,
    size: 20,
    speed: 85,
    hp: 12,
    maxHp: 12,
    summonerBoss: true
  };
  game.enemies = [enemy];
  const startDist = Math.hypot(game.player.x - enemy.x, game.player.y - enemy.y);
  for (let i = 0; i < 120; i++) updateSkeleton(game, enemy, 1 / 30, 1);
  const endDist = Math.hypot(game.player.x - enemy.x, game.player.y - enemy.y);
  assert.ok(endDist <= 7, `summoned skeleton should path around wall to player, got ${endDist}`);
  assert.ok(endDist < startDist * 0.2, "summoned skeleton did not make enough pathing progress");
  assert.ok(enemy.x > tile * 4.5, "summoned skeleton did not navigate around the blocking wall");
  return { startDist, endDist, enemyX: enemy.x, enemyY: enemy.y };
}

function validateSharedPathingUnstuckSweep() {
  const { game, tile } = makePathingHarness();
  const enemy = {
    id: "stuck-skeleton",
    type: "skeleton",
    x: tile * 1.5,
    y: tile * 2.5,
    size: 20,
    speed: 85,
    hp: 12,
    maxHp: 12,
    _pathStuckTimer: 0.18
  };
  const target = { x: tile * 5.5, y: tile * 2.5 };
  const before = { x: enemy.x, y: enemy.y };
  moveEnemyTowardTargetPoint(game, enemy, target.x, target.y, 1, 1 / 30, 6, true);
  const moved = Math.hypot(enemy.x - before.x, enemy.y - before.y);
  assert.ok(moved > 0.01, "shared pathing unstuck sweep should move a blocked enemy");
  assert.ok(enemy.y !== before.y, "unstuck sweep should pick a non-direct wall-escape move when direct route is blocked");
  return { moved, before, after: { x: enemy.x, y: enemy.y } };
}

function validatePriorityTargetFallbackUsesNearestLivingPlayer() {
  const primary = { id: "primary", x: 960, y: 0, size: 22, health: 100, alive: true };
  const closer = { id: "closer", x: 160, y: 0, size: 22, health: 100, alive: true };
  const enemy = { id: "targeting-skeleton", type: "skeleton", x: 0, y: 0, size: 20, hp: 10 };
  const game = {
    config: { map: { tile: 32 }, enemy: {} },
    player: primary,
    enemies: [enemy],
    getLivingPlayerEntities: () => [primary, closer],
    isEnemyFriendlyToPlayer: () => false
  };
  const target = getPriorityTarget(game, enemy, 16);
  assert.equal(target, closer, "priority target fallback should use nearest living player, not livingPlayers[0]");
  return { targetId: target.id };
}

function validateGenericHostileTargetingUsesMultiplayerPlayers() {
  const game = new GameSim({ viewportWidth: 640, viewportHeight: 480 });
  game.player.id = "primary";
  game.player.x = 960;
  game.player.y = 0;
  game.player.health = 100;
  game.player.alive = true;
  const closer = { ...game.player, id: "closer", x: 40, y: 0, health: 100, alive: true };
  const armor = { id: "armor-targeting", type: "armor", x: 0, y: 0, size: 26, hp: 20, maxHp: 20 };
  game.networkActivePlayers = [game.player, closer];
  game.enemies = [armor];
  const target = game.getEnemyTargetPoint(armor);
  assert.equal(target, closer, "generic hostile targeting should use the closest living multiplayer player");
  return { targetId: target.id };
}

const results = {
  aroundWalls: validateSharedPathingReachesAroundWalls(),
  unstuckSweep: validateSharedPathingUnstuckSweep(),
  nearestFallback: validatePriorityTargetFallbackUsesNearestLivingPlayer(),
  genericMultiplayerTargeting: validateGenericHostileTargetingUsesMultiplayerPlayers()
};

console.log(JSON.stringify(results, null, 2));
