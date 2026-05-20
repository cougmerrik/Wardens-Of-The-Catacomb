import { Game } from "../src/Game.js";
import { stepGame } from "../src/game/gameStep.js";
import { getMageAttackLabel } from "../src/rendering/hud/mageHudState.js";
import { canSpendNecromancerNode } from "../src/game/necromancerTalentTree.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeMage() {
  const game = new Game(null, { headless: true, classType: "necromancer" });
  game.level = 12;
  game.skillPoints = 7;
  game.player.id = "mage";
  game.player.classType = "necromancer";
  game.necromancerRuntime.mana = 7;
  game.input = game.input || { mouse: {} };
  game.input.mouse = game.input.mouse || {};
  return game;
}

function spend(game, key) {
  assert(canSpendNecromancerNode(game, key), `expected ${key} to be spendable`);
  assert(game.spendSkillPoint(key), `spendSkillPoint failed for ${key}`);
}

export function validateMageBaselineTuning() {
  const baseGame = makeMage();
  const mageRange = baseGame.getPrimaryDamageRange();
  const mageAvg = baseGame.getPrimaryDamage();
  const rangerAvg = (baseGame.config.classes.archer.primaryDamageMin + baseGame.config.classes.archer.primaryDamageMax) * 0.5;
  const warriorAvg = (baseGame.config.classes.fighter.primaryDamageMin + baseGame.config.classes.fighter.primaryDamageMax) * 0.5;
  assert(mageAvg > rangerAvg, "Mage base damage should stay above ranger single-arrow damage");
  assert(mageAvg < warriorAvg, "Mage base damage should stay below warrior melee damage");
  assert(mageRange.max <= 2.8, "Mage base damage max should stay in the retuned early-game band");
  assert(baseGame.config.classes.necromancer.baseAttackCooldown >= 0.4, "Mage class baseline attack cooldown should not be instant-fast");
  baseGame.input.mouse.worldX = baseGame.player.x + 120;
  baseGame.input.mouse.worldY = baseGame.player.y;
  baseGame.fire(1, 0);
  const starter = baseGame.bullets.find((bullet) => bullet.projectileType === "mage_arcaneBolt");
  assert(starter, "Mage starter attack should be Arcane Bolt before a cantrip is selected");
  assert(!starter.burnDuration, "Mage starter Arcane Bolt should not get Fire Bolt burning for free");
  assert(starter.lightRadius > 0 && starter.lightIntensity > 0, "Mage starter Arcane Bolt should still emit modest projectile light");
  assert(getMageAttackLabel(baseGame) === "Arcane Bolt", "Mage HUD should label the no-cantrip starter attack as Arcane Bolt");
  const starterDps = (starter.damage || 0) / Math.max(0.01, baseGame.player.fireCooldown || 0);
  assert(starterDps < 4.2, `Mage starter Arcane Bolt direct DPS is too high: ${starterDps.toFixed(2)}`);

  const projectileCantrips = [
    ["fireBoltCantrip", 1, 6.2],
    ["frozenOrbCantrip", 1, 2.4],
    ["shockCantrip", 1, 4.4],
    ["arcaneMissileCantrip", 2, 6.5]
  ];
  for (const [cantrip, expectedProjectiles, maxDirectDps] of projectileCantrips) {
    const game = makeMage();
    spend(game, cantrip);
    game.necromancerRuntime.mana = game.getMageMaxMana();
    game.input.mouse.worldX = game.player.x + 120;
    game.input.mouse.worldY = game.player.y;
    game.fire(1, 0);
    const bullets = game.bullets.filter((bullet) => bullet.mageCantrip === cantrip);
    assert(bullets.length === expectedProjectiles, `${cantrip} projectile count changed`);
    if (cantrip === "fireBoltCantrip") {
      assert((bullets[0].burnDuration || 0) > 0, "Fire Bolt investment should add burning");
      assert(bullets[0].lightRadius > 0 && bullets[0].lightIntensity > 0, "Fire Bolt should carry projectile light metadata");
      assert(Math.abs(bullets[0].lightIntensity - 0.27) < 0.0001, "Fire Bolt projectile light should be 50% brighter than the 0.18 baseline");
      assert(game.getActiveLightSources().some((source) => source.sourceType === "mage_fireBolt" && source.radius > 0), "Fire Bolt should emit an active light source");
    }
    const directDps = bullets.reduce((sum, bullet) => sum + (bullet.damage || 0), 0) / Math.max(0.01, game.player.fireCooldown || 0);
    assert(directDps <= maxDirectDps, `${cantrip} direct DPS is overtuned: ${directDps.toFixed(2)} > ${maxDirectDps}`);
  }

  const greenFlame = makeMage();
  spend(greenFlame, "greenFlameBladeCantrip");
  greenFlame.necromancerRuntime.mana = greenFlame.getMageMaxMana();
  const enemy = { id: "gfb-tuning-target", type: "goblin", x: greenFlame.player.x + greenFlame.config.map.tile * 1.4, y: greenFlame.player.y, size: 20, hp: 30, maxHp: 30 };
  greenFlame.enemies.push(enemy);
  greenFlame.fire(1, 0);
  const greenFlameDamage = 30 - enemy.hp;
  assert(greenFlameDamage > 0, "Green-Flame Blade should damage the tuning target");
  const greenFlameDps = greenFlameDamage / Math.max(0.01, greenFlame.player.fireCooldown || 0);
  assert(greenFlame.player.fireCooldown >= 0.7, "Green-Flame Blade cooldown should stay slower than ranged cantrips");
  assert(greenFlameDps <= 5.2, `Green-Flame Blade direct DPS is overtuned: ${greenFlameDps.toFixed(2)} > 5.2`);
}

function validateBurningTextCadence() {
  const game = makeMage();
  const spawnedTexts = [];
  game.spawnFloatingText = (x, y, text, color, life = 0.75, size = 14) => {
    spawnedTexts.push({ x, y, text, color, life, size });
  };
  const enemy = {
    id: "burning-text-target",
    type: "goblin",
    x: game.player.x + 48,
    y: game.player.y,
    size: 20,
    hp: 30,
    maxHp: 30,
    burningTimer: 3,
    burningDps: 2,
    lastDamageOwnerId: game.player.id
  };
  game.enemies.push(enemy);
  for (let i = 0; i < 10; i++) stepGame(game, 0.25, { processUi: false });
  const damageTexts = spawnedTexts.filter((entry) => String(entry.text || "").startsWith("-"));
  assert(damageTexts.length === 2, `Burning should emit damage text once per second; saw ${damageTexts.length} texts`);
  assert(enemy.hp < 30 && enemy.hp > 26, `Burning should pulse bounded once-per-second damage through defense; hp=${enemy.hp}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validateMageBaselineTuning();
  validateBurningTextCadence();
  console.log(JSON.stringify({ ok: true, checks: ["mage-baseline-tuning", "starter-arcane-bolt", "burning-text-cadence"] }, null, 2));
}
