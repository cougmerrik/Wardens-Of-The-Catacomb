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

function makeRogueGame({ melee = false, smoke = false, stealth = true } = {}) {
  const game = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  game.rangerTalents = createRangerTalentState();
  game.player.rangerTalents = game.rangerTalents;
  game.rangerTalents.longbow.points = 1;
  game.rangerTalents.ambush.points = 1;
  game.rangerTalents.roguePath.points = 1;
  game.rangerTalents.shadowVeil.points = 1;
  game.rangerRuntime.weaponMode = melee ? "melee" : "ranged";
  game.rangerRuntime.shadowVeilTimer = stealth ? 1 : 0;
  game.player.fireCooldown = 0;
  game.player.x = 240;
  game.player.y = 240;
  if (smoke) {
    game.rangerRuntime.shadowVeilTimer = 0;
    game.fireZones.push({ x: game.player.x, y: game.player.y, radius: 80, life: 2, zoneType: "smokeBomb" });
  }
  return game;
}

function getFirstProjectile(game) {
  const projectile = game.bullets[0];
  assert(projectile, "ranged attack should spawn a projectile");
  return projectile;
}

function validateRangedStealthDamage() {
  const game = makeRogueGame();
  withRandom(0.99, () => game.fire(1, 0));
  const projectile = getFirstProjectile(game);
  assert.equal(projectile.damageMult, 1.24 * 2, "rogue ranged stealth attack should double projectile damage multiplier");
  assert.equal(projectile.critMultiplier, 1, "high crit roll should not crit");
  assert.equal(game.rangerRuntime.shadowVeilTimer, 0, "ranged stealth attack should consume shadow veil");
}

function validateRangedStealthCrit() {
  const game = makeRogueGame();
  withRandom(0.1, () => game.fire(1, 0));
  const projectile = getFirstProjectile(game);
  assert.equal(projectile.damageMult, 1.24 * 2, "critical rogue stealth attack should keep double damage");
  assert.equal(projectile.critMultiplier, 1.5, "rogue stealth attack should have a 33% critical chance");
}

function validateSmokeStealthDamage() {
  const game = makeRogueGame({ smoke: true });
  withRandom(0.99, () => game.fire(1, 0));
  assert.equal(getFirstProjectile(game).damageMult, 1.24 * 2, "rogue attack from smoke should count as stealth damage");
}

function validateNonRogueStealthIgnored() {
  const game = makeRogueGame();
  game.rangerTalents.roguePath.points = 0;
  withRandom(0.1, () => game.fire(1, 0));
  const projectile = getFirstProjectile(game);
  assert.equal(projectile.damageMult, 1.24, "non-rogue stealth should not get rogue double damage");
  assert.equal(projectile.critMultiplier, 1, "non-rogue stealth should not get rogue crit chance");
}

function validateMeleeStealthDamage() {
  const game = makeRogueGame({ melee: true });
  game.rollPrimaryDamage = () => 10;
  game.getEnemyDefenseScale = () => 1;
  const enemy = { id: "rogue-melee-target", type: "goblin", x: game.player.x + 26, y: game.player.y, size: 20, hp: 100, maxHp: 100 };
  game.enemies = [enemy];
  withRandom(0.99, () => game.performMeleeAttack(1, 0));
  assert.equal(Math.round((100 - enemy.hp) * 100) / 100, 10 * 0.42 * 2, "rogue melee stealth attack should double melee damage");
  assert.equal(game.rangerRuntime.shadowVeilTimer, 0, "melee stealth attack should consume shadow veil");
}

validateRangedStealthDamage();
validateRangedStealthCrit();
validateSmokeStealthDamage();
validateNonRogueStealthIgnored();
validateMeleeStealthDamage();

console.log("Rogue stealth damage validation passed");
