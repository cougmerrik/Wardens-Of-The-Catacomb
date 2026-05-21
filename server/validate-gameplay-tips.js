import { strict as assert } from "node:assert";
import { GameSim } from "../src/sim/GameSim.js";
import {
  createGameplayTipState,
  GAMEPLAY_RANDOM_TIPS,
  getStoredGameplayTipsEnabled,
  persistGameplayTipsEnabled,
  tickGameplayTips,
  triggerGameplayTip,
  triggerRandomGameplayTip
} from "../src/game/gameplayTips.js";

function makeStorage(initial = null) {
  const values = new Map();
  if (initial && typeof initial === "object") {
    for (const [key, value] of Object.entries(initial)) values.set(key, value);
  }
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };
}

function validatePreferenceStorage() {
  const storage = makeStorage();
  assert.equal(getStoredGameplayTipsEnabled(storage), true, "gameplay tips should default on");
  persistGameplayTipsEnabled(false, storage);
  assert.equal(getStoredGameplayTipsEnabled(storage), false, "gameplay tips disabled preference should persist");
  persistGameplayTipsEnabled(true, storage);
  assert.equal(getStoredGameplayTipsEnabled(storage), true, "gameplay tips enabled preference should persist");
}

function validateStartTip() {
  const game = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  assert.equal(game.gameplayTips.text, "TIP: Use WASD to move and click to fire. Right click to use your special ability.", "desktop start tip copy mismatch");
  assert.equal(game.gameplayTips.timer, 5, "start tip should last 5 seconds");
  tickGameplayTips(game, 4.5);
  assert.ok(game.gameplayTips.timer > 0, "start tip should remain before 5 seconds");
  tickGameplayTips(game, 0.6);
  assert.equal(game.gameplayTips.timer, 0, "start tip should expire after 5 seconds");
}

function validateDisabledStartTip() {
  const game = new GameSim({ classType: "archer", gameplayTipsEnabled: false, viewportWidth: 960, viewportHeight: 640 });
  assert.equal(game.gameplayTips.enabled, false, "disabled option should carry into game state");
  assert.equal(game.gameplayTips.text, "", "disabled gameplay tips should not show start text");
}

function validateLevelTwoText(classType, expectedSubject) {
  const game = new GameSim({ classType, viewportWidth: 960, viewportHeight: 640 });
  game.gameplayTips = createGameplayTipState(true);
  game.level = 2;
  triggerGameplayTip(game, "level2");
  assert.equal(game.gameplayTips.text, `TIP: Use Q to swap between ${expectedSubject}.`, `${classType} level 2 desktop tip mismatch`);
}

function validateAndroidText() {
  const game = new GameSim({ classType: "necromancer", platform: "android", viewportWidth: 960, viewportHeight: 640 });
  assert.ok(game.gameplayTips.text.includes("left touch area"), "android start tip should describe touch movement");
  game.gameplayTips = createGameplayTipState(true);
  game.level = 2;
  triggerGameplayTip(game, "level2");
  assert.equal(game.gameplayTips.text, "TIP: Tap Swap to swap between spells.", "android level 2 tip mismatch");
}

function validateLevelThreeClassText(classType, expectedText) {
  const game = new GameSim({ classType, viewportWidth: 960, viewportHeight: 640 });
  game.gameplayTips = createGameplayTipState(true);
  game.level = 3;
  triggerGameplayTip(game, "level3");
  assert.equal(game.gameplayTips.text, `TIP: ${expectedText}`, `${classType} level 3 tip mismatch`);
}

function validateRandomTips() {
  assert.ok(GAMEPLAY_RANDOM_TIPS.length >= 10, "random tips should include tips.txt content");
  assert.ok(GAMEPLAY_RANDOM_TIPS.includes("Rat archers are pure evil."), "tips.txt random tip missing");
  const game = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  game.gameplayTips = createGameplayTipState(true);
  game.level = 4;
  assert.equal(triggerRandomGameplayTip(game, () => 0), true, "random tip should trigger after level 3");
  assert.equal(game.gameplayTips.text, `TIP: ${GAMEPLAY_RANDOM_TIPS[0]}`, "random tip should be prefixed and selected from tips list");
  assert.ok(game.gameplayTips.randomCooldown >= 18, "random tip should schedule a follow-up delay");
}

function main() {
  validatePreferenceStorage();
  validateStartTip();
  validateDisabledStartTip();
  validateLevelTwoText("archer", "weapons");
  validateLevelTwoText("fighter", "stances");
  validateLevelTwoText("necromancer", "spells");
  validateAndroidText();
  validateLevelThreeClassText("archer", "Build up combo to strengthen your attacks.");
  validateLevelThreeClassText("necromancer", "Mana regenerates faster when you stop casting.");
  validateLevelThreeClassText("fighter", "Hit thing with stick.");
  validateRandomTips();
  console.log(JSON.stringify({ gameplayTips: "ok" }, null, 2));
}

main();
