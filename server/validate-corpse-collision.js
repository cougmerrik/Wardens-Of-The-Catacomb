import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { GameSim } from "../src/sim/GameSim.js";
import { stepGame } from "../src/game/gameStep.js";
import { applySnapshotToGame } from "../src/net/clientStateSync.js";

function placeEntityAtPlayer(game, enemy) {
  enemy.x = game.player.x;
  enemy.y = game.player.y;
  enemy.lastX = enemy.x;
  enemy.lastY = enemy.y;
  enemy.size = Number.isFinite(enemy.size) ? enemy.size : 24;
  return enemy;
}

function validateDeadBodiesDoNotSeparateFromPlayer() {
  const game = new GameSim({ classType: "fighter", viewportWidth: 960, viewportHeight: 640 });
  game.player.dirX = 1;
  game.player.dirY = 0;
  const corpse = placeEntityAtPlayer(game, {
    id: "dead-goblin",
    type: "goblin",
    hp: 0
  });
  const before = { x: corpse.x, y: corpse.y };
  game.separateEnemyFromPlayer(corpse);
  assert.equal(corpse.x, before.x, "dead enemy body should not be pushed by player separation");
  assert.equal(corpse.y, before.y, "dead enemy body should not be pushed by player separation");
  return { corpseX: corpse.x, corpseY: corpse.y };
}

function validateLivingEnemiesStillSeparateFromPlayer() {
  const game = new GameSim({ classType: "fighter", viewportWidth: 960, viewportHeight: 640 });
  game.player.dirX = 1;
  game.player.dirY = 0;
  const enemy = placeEntityAtPlayer(game, {
    id: "living-goblin",
    type: "goblin",
    hp: 8
  });
  const before = { x: enemy.x, y: enemy.y };
  game.separateEnemyFromPlayer(enemy);
  assert.ok(
    Math.abs(enemy.x - before.x) > 0.01 || Math.abs(enemy.y - before.y) > 0.01,
    "living enemy should still be pushed out of the player footprint"
  );
  return { before, after: { x: enemy.x, y: enemy.y } };
}

function validateCollapsedSkeletonDoesNotSeparateFromPlayer() {
  const game = new GameSim({ classType: "fighter", viewportWidth: 960, viewportHeight: 640 });
  game.player.dirX = 1;
  game.player.dirY = 0;
  const skeleton = placeEntityAtPlayer(game, {
    id: "collapsed-skeleton",
    type: "skeleton_warrior",
    hp: 10,
    collapsed: true,
    collapseTimer: 1.5
  });
  const before = { x: skeleton.x, y: skeleton.y };
  game.separateEnemyFromPlayer(skeleton);
  assert.equal(skeleton.x, before.x, "collapsed skeleton body should not be pushed by player separation");
  assert.equal(skeleton.y, before.y, "collapsed skeleton body should not be pushed by player separation");
  return { skeletonX: skeleton.x, skeletonY: skeleton.y };
}

function validateStepIgnoresCorpseContact() {
  const game = new GameSim({ classType: "fighter", viewportWidth: 960, viewportHeight: 640 });
  game.enemySpawnTimer = 999;
  game.player.hitCooldown = 0;
  const healthBefore = game.player.health;
  const corpse = placeEntityAtPlayer(game, {
    id: "dead-contact",
    type: "goblin",
    hp: 0,
    hitCooldown: 0
  });
  game.enemies = [corpse];
  stepGame(game, 0.016, { processUi: false });
  assert.equal(game.player.health, healthBefore, "dead enemy body should not deal contact damage");
  assert.equal(corpse.hp, 0, "corpse state should be preserved for rendering/cleanup");
  return { healthBefore, healthAfter: game.player.health };
}

function validateNetworkCorpseSnapshotDoesNotBlock() {
  const game = new GameSim({ classType: "fighter", viewportWidth: 960, viewportHeight: 640 });
  game.enemySpawnTimer = 999;
  const healthBefore = game.player.health;
  applySnapshotToGame({
    game,
    state: {
      player: { ...game.player },
      enemies: [
        {
          id: "network-corpse",
          type: "goblin",
          x: game.player.x,
          y: game.player.y,
          lastX: game.player.x,
          lastY: game.player.y,
          hp: 0,
          maxHp: 8,
          size: 24,
          deathProcessed: true,
          corpseTimer: 8
        }
      ]
    },
    controller: false
  });
  assert.equal(game.enemies.length, 1, "network corpse snapshot should remain present for rendering");
  stepGame(game, 0.016, { processUi: false });
  assert.equal(game.player.health, healthBefore, "network corpse snapshot should not deal contact damage");
  return { syncedEnemies: game.enemies.length, healthBefore, healthAfter: game.player.health };
}

function validateProjectilesIgnoreSlainBodies() {
  const game = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  game.enemySpawnTimer = 999;
  game.enemies = [
    {
      id: "projectile-corpse",
      type: "goblin",
      x: game.player.x + 48,
      y: game.player.y,
      lastX: game.player.x + 48,
      lastY: game.player.y,
      size: 26,
      hp: 0,
      maxHp: 10,
      deathProcessed: true,
      corpseTimer: 8
    }
  ];
  game.bullets = [
    {
      x: game.enemies[0].x,
      y: game.enemies[0].y,
      vx: 0,
      vy: 0,
      life: 1,
      size: 8,
      damage: 999,
      projectileType: "ranger_longbow",
      ownerId: game.player.id || null
    }
  ];
  const floatingBefore = game.floatingTexts.length;
  stepGame(game, 0.016, { processUi: false });
  assert.equal(game.enemies[0].hp, 0, "projectile should not damage a slain body");
  assert.ok(game.bullets[0]?.life > 0.9, "projectile should not be consumed by a slain body");
  assert.equal(game.floatingTexts.length, floatingBefore, "projectile impact on slain body should not create floating damage text");
  return { bulletLife: game.bullets[0]?.life, floatingTexts: game.floatingTexts.length };
}

function validateSpecialProjectilesIgnoreSlainBodies() {
  const game = new GameSim({ classType: "necromancer", viewportWidth: 960, viewportHeight: 640 });
  game.enemySpawnTimer = 999;
  game.enemies = [
    {
      id: "deathbolt-corpse",
      type: "goblin",
      x: game.player.x + 48,
      y: game.player.y,
      lastX: game.player.x + 48,
      lastY: game.player.y,
      size: 26,
      hp: 0,
      maxHp: 10,
      deathProcessed: true,
      corpseTimer: 8
    }
  ];
  game.bullets = [
    {
      x: game.enemies[0].x,
      y: game.enemies[0].y,
      vx: 0,
      vy: 0,
      life: 1,
      size: 10,
      damage: 999,
      projectileType: "deathBolt",
      ownerId: game.player.id || null
    }
  ];
  const zonesBefore = game.fireZones.length;
  const floatingBefore = game.floatingTexts.length;
  stepGame(game, 0.016, { processUi: false });
  assert.equal(game.enemies[0].hp, 0, "special projectile should not damage a slain body");
  assert.ok(game.bullets[0]?.life > 0.9, "special projectile should not detonate on a slain body");
  assert.equal(game.fireZones.length, zonesBefore, "special projectile should not create hit effects on a slain body");
  assert.equal(game.floatingTexts.length, floatingBefore, "special projectile should not create floating damage text on a slain body");
  return { bulletLife: game.bullets[0]?.life, fireZones: game.fireZones.length, floatingTexts: game.floatingTexts.length };
}

function validateDirectDamageIgnoresSlainBodies() {
  const game = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  const corpse = {
    id: "direct-damage-corpse",
    type: "goblin",
    x: game.player.x + 48,
    y: game.player.y,
    size: 24,
    hp: 0,
    maxHp: 8,
    deathProcessed: true,
    corpseTimer: 8
  };
  const floatingBefore = game.floatingTexts.length;
  game.applyEnemyDamage(corpse, 999, "arrow", game.player.id || null);
  assert.equal(corpse.hp, 0, "direct damage should not mutate slain body hp");
  assert.equal(game.floatingTexts.length, floatingBefore, "direct damage against slain body should not create floating damage text");
  return { hp: corpse.hp, floatingTexts: game.floatingTexts.length };
}

function validateGhostDeathLeavesRemnant() {
  const game = new GameSim({ classType: "fighter", viewportWidth: 960, viewportHeight: 640 });
  game.enemySpawnTimer = 999;
  const ghost = game.spawnGhost(game.player.x + 48, game.player.y);
  ghost.id = "ghost-remnant";
  ghost.hp = 0;
  ghost.lastDamageOwnerId = game.player.id || null;
  game.enemies = [ghost];
  stepGame(game, 0.016, { processUi: false });
  assert.equal(game.enemies.length, 1, "slain ghost should remain temporarily as a floor remnant");
  assert.equal(game.enemies[0].hp, 0, "ghost remnant should stay dead");
  assert.equal(game.enemies[0].deathProcessed, true, "ghost remnant should mark rewards as processed");
  assert.ok(game.enemies[0].corpseTimer > 0, "ghost remnant should have a visible lifetime");
  return { remnantType: game.enemies[0].type, corpseTimer: game.enemies[0].corpseTimer };
}

function validateAllEnemyDeathsLeaveRemnants() {
  const samples = [
    ["goblin", (game) => ({ id: "dead-goblin", type: "goblin", x: game.player.x + 48, y: game.player.y, size: 22, hp: 0, maxHp: 8, goldEaten: 0 })],
    ["armor", (game) => ({ id: "dead-armor", type: "armor", x: game.player.x + 48, y: game.player.y, size: 26, hp: 0, maxHp: 18 })],
    ["mimic", (game) => game.spawnMimic(game.player.x + 48, game.player.y)],
    ["mummy", (game) => game.spawnMummy(game.player.x + 48, game.player.y)],
    ["prisoner", (game) => game.spawnPrisoner(game.player.x + 48, game.player.y)],
    ["rat_archer", (game) => game.spawnRatArcher(game.player.x + 48, game.player.y)],
    ["skeleton_warrior", (game) => game.spawnSkeletonWarrior(game.player.x + 48, game.player.y)],
    ["skeleton", (game) => game.spawnSkeleton(game.player.x + 48, game.player.y)],
    ["shardling", (game) => game.spawnShardling(game.player.x + 48, game.player.y)],
    ["wolf", (game) => ({ id: "dead-wolf", type: "wolf", x: game.player.x + 48, y: game.player.y, size: 24, hp: 0, maxHp: 14 })],
    ["flaming_sphere", (game) => ({ id: "dead-flaming-sphere", type: "flaming_sphere", x: game.player.x + 48, y: game.player.y, size: 24, hp: 0, maxHp: 10 })]
  ];
  const results = {};
  for (const [type, createEnemy] of samples) {
    const game = new GameSim({ classType: "fighter", viewportWidth: 960, viewportHeight: 640 });
    game.enemySpawnTimer = 999;
    const enemy = createEnemy(game);
    enemy.id = enemy.id || `dead-${type}`;
    enemy.type = type;
    enemy.hp = 0;
    enemy.lastDamageOwnerId = game.player.id || null;
    game.enemies = [enemy];
    stepGame(game, 0.016, { processUi: false });
    const remnant = game.enemies.find((candidate) => candidate === enemy || candidate.id === enemy.id);
    assert.ok(remnant, `${type} should remain temporarily as a slain body`);
    assert.equal(remnant.type, type, `${type} remnant should preserve type`);
    assert.equal(remnant.hp, 0, `${type} remnant should stay dead`);
    assert.equal(remnant.deathProcessed, true, `${type} remnant should mark rewards as processed`);
    assert.ok(remnant.corpseTimer > 0, `${type} remnant should have a visible lifetime`);
    results[type] = remnant.corpseTimer;
  }
  return results;
}

function validateBossDeathLeavesRemnant() {
  const game = new GameSim({ classType: "fighter", viewportWidth: 960, viewportHeight: 640 });
  while (game.floor < 2) game.advanceToNextFloor();
  game.level = game.getFloorBossTriggerLevel();
  assert.equal(game.updateFloorBossTrigger(), true, "minotaur boss should queue on even floor");
  const boss = game.spawnMinotaur(game.player.x + 160, game.player.y);
  game.enemies = [boss];
  game.markFloorBossActive();
  boss.hp = 0;
  boss.lastDamageOwnerId = game.player.id || null;
  stepGame(game, 0.016, { processUi: false });
  assert.equal(game.enemies.length, 1, "slain boss should remain temporarily as a body");
  assert.equal(game.enemies[0], boss, "boss remnant should preserve the boss entity");
  assert.equal(game.enemies[0].deathProcessed, true, "boss remnant should mark rewards as processed");
  assert.ok(game.enemies[0].corpseTimer >= 17.9, "boss body should use the longer boss corpse lifetime");
  assert.equal(game.getActiveFloorBossEnemy(), null, "dead boss body should not remain an active floor boss target");
  assert.equal(game.floorBoss?.phase, "portal", "boss death should still open the floor portal phase");
  return { type: boss.type, corpseTimer: boss.corpseTimer, floorBossPhase: game.floorBoss?.phase };
}

function validateDropsRenderAboveEnemyBodies() {
  const source = readFileSync(new URL("../src/rendering/RendererRuntimeScene.js", import.meta.url), "utf8");
  const bodyLayerIndex = source.indexOf("if (!this.isEnemyBodyLayer(enemy)) continue;");
  const dropsIndex = source.indexOf("this.drawDrops(game, cameraX, cameraY);");
  const liveLayerIndex = source.indexOf("if (this.isEnemyBodyLayer(enemy)) continue;");
  assert.ok(bodyLayerIndex >= 0, "renderer should draw enemy body layer before drops");
  assert.ok(dropsIndex > bodyLayerIndex, "drops should render after enemy body layer");
  assert.ok(liveLayerIndex > dropsIndex, "living enemies should render after drops");
  return { bodyLayerIndex, dropsIndex, liveLayerIndex };
}

function validateCorpseRendererCoversSlainEnemies() {
  const sceneSource = readFileSync(new URL("../src/rendering/RendererRuntimeScene.js", import.meta.url), "utf8");
  const enemyDrawSource = readFileSync(new URL("../src/rendering/runtimeSceneEnemyCorpseDrawMethods.js", import.meta.url), "utf8");
  assert.ok(sceneSource.includes("if ((enemy.hp || 0) <= 0) this.drawEnemyCorpse"), "dead enemies should route through generic corpse rendering");
  for (const type of ["goblin", "armor", "mimic", "mummy", "prisoner", "rat_archer", "skeleton", "skeleton_warrior", "shardling", "wolf", "flaming_sphere", "minotaur", "golem", "necromancer", "sonya", "leprechaun"]) {
    assert.ok(enemyDrawSource.includes(`${type}:`), `corpse renderer palette should include ${type}`);
  }
  return { routed: true };
}

function main() {
  const results = {
    deadBodySeparation: validateDeadBodiesDoNotSeparateFromPlayer(),
    livingEnemySeparation: validateLivingEnemiesStillSeparateFromPlayer(),
    collapsedSkeletonSeparation: validateCollapsedSkeletonDoesNotSeparateFromPlayer(),
    corpseContact: validateStepIgnoresCorpseContact(),
    networkCorpseSnapshot: validateNetworkCorpseSnapshotDoesNotBlock(),
    projectileCorpsePassThrough: validateProjectilesIgnoreSlainBodies(),
    specialProjectileCorpsePassThrough: validateSpecialProjectilesIgnoreSlainBodies(),
    directCorpseDamageIgnored: validateDirectDamageIgnoresSlainBodies(),
    ghostDeathRemnant: validateGhostDeathLeavesRemnant(),
    allEnemyDeathRemnants: validateAllEnemyDeathsLeaveRemnants(),
    bossDeathRemnant: validateBossDeathLeavesRemnant(),
    dropLayering: validateDropsRenderAboveEnemyBodies(),
    corpseRenderer: validateCorpseRendererCoversSlainEnemies()
  };
  console.log(JSON.stringify(results, null, 2));
}

main();
