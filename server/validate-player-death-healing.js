import { strict as assert } from "node:assert";
import { GameSim } from "../src/sim/GameSim.js";

function killPlayer(game) {
  game.player.health = 0;
  game.player.alive = false;
  game.gameOver = false;
}

function assertDeadPlayer(game, label) {
  assert.equal(game.player.health, 0, `${label}: dead player health changed`);
  assert.equal(game.player.alive, false, `${label}: dead player was revived`);
}

function main() {
  const game = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  game.player.maxHealth = 100;
  game.player.health = 40;
  game.player.alive = true;

  killPlayer(game);
  game.applyPlayerHealing(25);
  assertDeadPlayer(game, "direct healing");

  killPlayer(game);
  game.applyHealingToPlayerEntity(game.player, 25);
  assertDeadPlayer(game, "entity healing");

  killPlayer(game);
  game.passiveRegenTimer = 0;
  game.classSpec = { ...(game.classSpec || {}), passiveRegenPct: 0.05 };
  game.tick(2.1, {});
  assertDeadPlayer(game, "passive class regeneration");

  killPlayer(game);
  game.rangerRuntime.foragerRegenTimer = 3;
  game.tick(0.5, {});
  assertDeadPlayer(game, "ranger forager regeneration");

  killPlayer(game);
  game.warriorRageVictoryRushPool = 30;
  game.warriorRageVictoryRushTimer = 3;
  game.tick(0.5, {});
  assertDeadPlayer(game, "warrior victory rush regeneration");

  killPlayer(game);
  game.necromancerRuntime.vigorHealPool = 30;
  game.necromancerRuntime.vigorTimer = 3;
  game.tick(0.5, {});
  assertDeadPlayer(game, "necromancer vigor regeneration");

  killPlayer(game);
  game.consumables.effects.regenerationPotion.timer = 10;
  game.consumables.effects.regenerationPotion.total = 10;
  game.consumables.effects.regenerationPotion.healPool = 20;
  game.tick(0.5, {});
  assertDeadPlayer(game, "consumable regeneration");

  killPlayer(game);
  game.applyPlayerHealing(25, { allowRevive: true });
  assert.equal(game.player.health, 25, "explicit revive healing should still be possible");

  console.log(JSON.stringify({
    playerDeathHealing: "ok"
  }, null, 2));
}

main();
