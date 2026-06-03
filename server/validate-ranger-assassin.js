import { strict as assert } from "node:assert";
import { GameSim } from "../src/sim/GameSim.js";
import { createRangerTalentState } from "../src/game/rangerTalentTree.js";

function withRandom(value, fn) {
  const original = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

function makeAssassinGame(combo = 10) {
  const game = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  game.rangerTalents = createRangerTalentState();
  game.player.rangerTalents = game.rangerTalents;
  game.rangerTalents.longbow.points = 1;
  game.rangerTalents.ambush.points = 1;
  game.rangerTalents.assassinPath.points = 1;
  game.rangerRuntime.weaponMode = "ranged";
  game.rangerRuntime.combo = combo;
  game.player.fireCooldown = 0;
  game.player.x = 240;
  game.player.y = 240;
  game.rollPrimaryDamage = () => 10;
  game.getEnemyDefenseScale = () => 1;
  return game;
}

function pushProjectileAt(game, enemy, options = {}) {
  game.bullets.push({
    x: enemy.x,
    y: enemy.y,
    vx: 1,
    vy: 0,
    angle: 0,
    life: 1,
    size: 6,
    damage: Number.isFinite(options.damage) ? options.damage : 10,
    damageMult: 1,
    critMultiplier: 1,
    projectileType: "ranger_longbow",
    ownerId: game.player.id || null,
    assassinChainCount: options.chainCount || 0,
    hitTargets: new Set()
  });
}

function validateComboFlagsRangedChain() {
  const medium = makeAssassinGame(10);
  withRandom(0.99, () => medium.fire(1, 0));
  assert.equal(medium.bullets[0]?.assassinChainCount, 2, "assassin ranged attacks should chain at medium combo");
  assert.equal(medium.bullets[0]?.comboEnhanced, true, "assassin chain projectiles should be marked combo-enhanced");

  const low = makeAssassinGame(4);
  withRandom(0.99, () => low.fire(1, 0));
  assert.equal(low.bullets[0]?.assassinChainCount, 0, "assassin ranged attacks should not chain below medium combo");
}

function validateChainDamage() {
  const game = makeAssassinGame(10);
  const primary = { id: "primary", type: "goblin", x: 280, y: 240, size: 20, hp: 100, maxHp: 100 };
  const chain = { id: "chain", type: "goblin", x: 320, y: 240, size: 20, hp: 100, maxHp: 100 };
  game.enemies = [primary, chain];
  pushProjectileAt(game, primary, { chainCount: 2 });
  withRandom(0.99, () => game.tick(0.016));
  const primaryDamage = 100 - primary.hp;
  assert(primaryDamage > 0, "assassin projectile should damage the primary target");
  assert.equal(chain.hp, 100 - primaryDamage * 0.65, "assassin ranged chain should deal shock-like chain damage to a nearby enemy");
  assert(game.fireZones.some((zone) => zone.zoneType === "arcaneChain" && zone.damageType === "physical"), "assassin chain should spawn a chain visual");
}

function validateRangedExecuteSplash() {
  const game = makeAssassinGame(10);
  const target = { id: "execute-target", type: "goblin", x: 280, y: 240, size: 20, hp: 20, maxHp: 100 };
  game.enemies = [target];
  pushProjectileAt(game, target, { damage: 10 });
  withRandom(0.1, () => game.tick(0.016));
  assert.equal(target.hp <= 0, true, "assassin ranged hit should execute normal enemies below 15% hp");
  assert.equal(target.pendingAssassinExecuteKill, true, "assassin execute should mark the enemy as executed");
  assert(game.fireZones.some((zone) => zone.zoneType === "assassinExecuteSplash"), "ranged assassin execute should spawn a red splash visual");
}

function validateBossExecuteImmune() {
  const game = makeAssassinGame(10);
  const boss = { id: "boss", type: "mummy", x: 280, y: 240, size: 28, hp: 20, maxHp: 100, isBoss: true };
  game.enemies = [boss];
  pushProjectileAt(game, boss, { damage: 10 });
  withRandom(0.1, () => game.tick(0.016));
  assert(boss.hp > 0 && boss.hp < 20, "assassin passive execute should damage but not kill bosses");
  assert(!game.fireZones.some((zone) => zone.zoneType === "assassinExecuteSplash"), "boss hits should not spawn execute splash");
}

validateComboFlagsRangedChain();
validateChainDamage();
validateRangedExecuteSplash();
validateBossExecuteImmune();

console.log("Ranger assassin validation passed");
