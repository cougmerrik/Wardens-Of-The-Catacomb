import { Game } from "../src/Game.js";
import { stepGame } from "../src/game/gameStep.js";
import { vecLength } from "../src/utils.js";
import { canSpendNecromancerNode, getNecromancerTalentDef } from "../src/game/necromancerTalentTree.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeMage() {
  const game = new Game(null, { headless: true, classType: "necromancer" });
  game.level = 12;
  game.skillPoints = 7;
  game.player.id = "mage";
  game.player.classType = "necromancer";
  game.input = game.input || { mouse: {} };
  game.input.mouse = game.input.mouse || {};
  return game;
}

const game = makeMage();
assert(getNecromancerTalentDef("frozenOrbCantrip")?.description?.some((line) => line.includes("30%")), "Frozen Orb tooltip should state its implemented 30% Chill slow");
assert(canSpendNecromancerNode(game, "frozenOrbCantrip"), "Frozen Orb should be spendable as a tier-1 cantrip");
assert(game.spendSkillPoint("frozenOrbCantrip"), "spendSkillPoint failed for Frozen Orb");
game.input.mouse.worldX = game.player.x + 120;
game.input.mouse.worldY = game.player.y;
game.fire(1, 0);
const orb = game.bullets.find((bullet) => bullet.projectileType === "mage_frozenOrb");
assert(orb, "Frozen Orb should create a frozen orb projectile");
assert(orb.mageCantrip === "frozenOrbCantrip", "Frozen Orb should preserve the selected cantrip key");
assert(vecLength(orb.vx || 0, orb.vy || 0) < 180, "Frozen Orb should move slowly");
assert((orb.damage || 0) < game.getPrimaryDamage(), "Frozen Orb direct damage should be lower than base primary damage");
stepGame(game, 0.2, { processUi: false });
const pulseShards = game.bullets.filter((bullet) => bullet.projectileType === "mage_frozenOrbShard" && bullet.frozenOrbPulseShard);
assert(pulseShards.length >= 4, "Frozen Orb should pulse smaller cold shards while traveling");
assert(pulseShards.every((bullet) => (bullet.slowDuration || 0) > 0 && (bullet.damage || 0) < (orb.damage || 0)), "Pulse shards should be lower-damage slowing shards");

const enemy = { id: "frozen-orb-target", type: "goblin", x: game.player.x + 40, y: game.player.y, size: 20, hp: 20, maxHp: 20 };
game.enemies.push(enemy);
game.bullets.push({
  x: enemy.x,
  y: enemy.y,
  vx: 0,
  vy: 0,
  angle: 0,
  life: 1,
  size: 3.6,
  damage: 1,
  projectileType: "mage_frozenOrbShard",
  damageType: "cold",
  ownerId: game.player.id,
  slowDuration: 2.2,
  frozenOrbPulseShard: true,
  hitTargets: new Set()
});
stepGame(game, 1 / 60, { processUi: false });
assert((enemy.slowTimer || 0) > 0 && (enemy.slowPct || 0) >= 0.3, "Frozen Orb pulse shards should Chill/slow enemies on hit");
assert(!game.bullets.some((bullet) => bullet.projectileType === "mage_frozenOrbShard" && !bullet.frozenOrbPulseShard), "Frozen Orb shards should come from timed pulses, not collision splitting");
game.applyEnemyDamage(enemy, 999, "cold", game.player.id);
stepGame(game, 1 / 60, { processUi: false });
assert(enemy.hp <= 0 && (enemy.corpseTimer || 0) > 0, "slain chilled enemy should become a visible corpse");
assert((enemy.slowTimer || 0) <= 0 && (enemy.slowPct || 0) <= 0, "slain enemies should clear Chill state");

console.log(JSON.stringify({ ok: true, checks: ["frozen-orb-projectile", "frozen-orb-pulse-shards", "frozen-orb-chill", "chill-clears-on-death"] }, null, 2));
