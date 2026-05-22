import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { GameSim } from "../src/sim/GameSim.js";
import { handleUiClicks } from "../src/game/world/uiEconomy.js";
import {
  SKILL_POINT_POPUP_DURATION,
  dismissSkillPointPopup,
  getSkillPointPopupTier,
  syncSkillPointPopupQueue,
  updateSkillPointPopup
} from "../src/game/skillPointPopup.js";

function read(path) {
  return readFileSync(path, "utf8");
}

function validatePopupQueue() {
  const game = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  game.level = 2;
  game.skillPoints = 1;
  syncSkillPointPopupQueue(game);
  assert(game.skillPointPopup.active, "skill point increase should open a popup");
  assert.equal(game.skillPointPopup.queue.length, 0, "single skill point should not leave queued popups");
  const firstId = game.skillPointPopup.active.id;
  const tier = getSkillPointPopupTier(game);
  assert.equal(tier.tier, 1, "first archer skill popup should show tier 1");
  assert(tier.defs.length > 0, "popup should expose spendable tier 1 options");
  assert(tier.defs.every((def) => def.tier === tier.tier), "popup should only expose one tier");

  game.skillPoints = 3;
  syncSkillPointPopupQueue(game);
  assert.equal(game.skillPointPopup.queue.length, 2, "extra skill point gains should queue behind the active popup");
  game.time = SKILL_POINT_POPUP_DURATION + 0.1;
  updateSkillPointPopup(game);
  assert(game.skillPointPopup.active, "expired popup should advance to the next queued popup");
  assert.equal(game.skillPointPopup.active.id, firstId + 1, "timeout should not skip the next queued popup");
  assert.equal(game.skillPointPopup.queue.length, 1, "timeout should preserve later queued popups");

  game.time += 1;
  game.skillPoints = 4;
  syncSkillPointPopupQueue(game);
  assert.equal(game.skillPointPopup.queue.length, 2, "new skill point gain should queue behind the advanced popup");
  dismissSkillPointPopup(game, { clearQueue: true });
}

function validateSpendDismissal() {
  const game = new GameSim({ classType: "necromancer", viewportWidth: 960, viewportHeight: 640 });
  game.level = 2;
  game.skillPoints = 1;
  syncSkillPointPopupQueue(game);
  const tier = getSkillPointPopupTier(game);
  assert.equal(tier.tier, 1, "first mage skill popup should show tier 1");
  assert(game.spendSkillPoint(tier.defs[0].key), "popup skill option should spend through normal skill logic");
  assert.equal(game.skillPointPopup.active, null, "spending a popup skill should dismiss the popup");
}

function createClickInput(click) {
  return {
    consumeKeyQueued() {
      return false;
    },
    consumeWheelDelta() {
      return 0;
    },
    consumeUiLeftClicks() {
      return click ? [click] : [];
    }
  };
}

function validateLocalPopupClickDoesNotSkipQueue() {
  const game = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  game.applyDebugStartingFloor(2);
  syncSkillPointPopupQueue(game);
  assert.equal(game.level, 5, "dev floor 2 should seed level 5");
  assert.equal(game.skillPoints, 3, "dev floor 2 should seed 3 skill points");
  assert(game.skillPointPopup.active, "dev floor 2 should show first skill popup");
  assert.equal(game.skillPointPopup.queue.length, 2, "dev floor 2 should queue all remaining skill popups");

  const tier = getSkillPointPopupTier(game);
  game.uiRects.skillPointPopupNodes = [{
    key: tier.defs[0].key,
    rect: { x: 10, y: 10, w: 50, h: 50 }
  }];
  game.input = createClickInput({ x: 20, y: 20 });
  handleUiClicks(game);
  assert.equal(game.skillPoints, 2, "local popup click should spend one skill point");
  assert(game.skillPointPopup.active, "local popup click should advance to the next popup");
  assert.equal(game.skillPointPopup.active.id, 2, "local popup click should not skip the next queued popup");
  assert.equal(game.skillPointPopup.queue.length, 1, "local popup click should leave one queued popup");
}

function validateWiring() {
  const scene = read("src/rendering/runtimeSceneDrawMethods.js");
  const rendererScene = read("src/rendering/RendererRuntimeScene.js");
  const localUi = read("src/game/world/uiEconomy.js");
  const networkUi = read("src/net/sessionInteraction.js");
  const input = read("src/InputController.js");
  const popup = read("src/rendering/hud/skillPointPopup.js");
  assert(scene.includes("drawSkillPointPopup"), "XP HUD should draw the skill point popup above the lantern gauge");
  assert(rendererScene.includes("skillPointPopupNodes = []"), "renderer should reset popup node rects every frame");
  assert(localUi.includes("handleSkillPointPopupClick"), "local UI should handle popup skill clicks");
  assert(!localUi.includes("spendSkillPoint(node.key) && dismissSkillPointPopup"), "local popup clicks should not dismiss twice after spending");
  assert(networkUi.includes("handleSkillPointPopupClick"), "network UI should handle popup skill clicks");
  assert(input.includes("skillPointPopupNodes"), "touch routing should treat popup skill cards as UI");
  assert(popup.includes("drawSkillTooltip"), "popup skill cards should keep mouseover tooltips");
  assert(popup.includes("getPopupSkillTooltip"), "popup skill cards should use class skill tooltips");
}

validatePopupQueue();
validateSpendDismissal();
validateLocalPopupClickDoesNotSkipQueue();
validateWiring();
console.log(JSON.stringify({ skillPointPopup: "ok" }, null, 2));
