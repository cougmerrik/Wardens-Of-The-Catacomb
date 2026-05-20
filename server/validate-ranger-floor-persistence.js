import { Game } from "../src/Game.js";
import { createRangerTalentState } from "../src/game/rangerTalentTree.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createRangerGame() {
  const game = new Game(null, { headless: true, classType: "archer" });
  game.rangerTalents = createRangerTalentState();
  game.player.rangerTalents = game.rangerTalents;
  game.rangerTalents.longbow.points = 1;
  game.rangerTalents.opportunist.points = 1;
  game.rangerTalents.precision.points = 1;
  game.rangerTalents.rangerPath.points = 1;
  return game;
}

const game = createRangerGame();
const beforeFloor = game.floor;
const beforeCount = game.getMultiarrowCount();
const beforeAngles = game.getMultiarrowAngles(0);

assert(beforeCount >= 2, `Ranger path should grant multishot before floor change, got ${beforeCount}`);
assert(beforeAngles.length === beforeCount, "pre-floor volley angle count should match multishot count");

game.rangerRuntime.combo = 20;
const comboCount = game.getMultiarrowCount();
assert(comboCount > beforeCount, `combo should add Ranger projectile pressure, got base ${beforeCount}, combo ${comboCount}`);

game.rangerRuntime.combo = 10;
const baseComboCooldown = game.getPlayerFireCooldown();
game.rangerTalents.precision.points = 0;
game.rangerTalents.flurry.points = 1;
const flurryCooldown = game.getPlayerFireCooldown();
assert(flurryCooldown < baseComboCooldown, `Flurry should reduce attack cooldown at combo tier 2, got base ${baseComboCooldown}, flurry ${flurryCooldown}`);

game.advanceToNextFloor();

const afterCount = game.getMultiarrowCount();
const afterAngles = game.getMultiarrowAngles(0);

assert(game.floor === beforeFloor + 1, `expected floor ${beforeFloor + 1}, got ${game.floor}`);
assert(game.rangerTalents?.rangerPath?.points === 1, "Ranger path talent should persist after floor change");
assert(afterCount >= 2, `Ranger path multishot should persist after floor change, got ${afterCount}`);
assert(afterAngles.length === afterCount, "post-floor volley angle count should match multishot count");

console.log("Ranger floor persistence validation passed.");
