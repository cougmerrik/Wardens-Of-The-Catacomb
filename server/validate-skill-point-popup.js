import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { GameSim } from "../src/sim/GameSim.js";
import { handleUiClicks } from "../src/game/world/uiEconomy.js";
import { handleNetworkUiActions } from "../src/net/sessionInteraction.js";
import {
  SKILL_POINT_POPUP_DURATION,
  SKILL_POINT_POPUP_RETRY_DELAY,
  dismissSkillPointPopup,
  getSkillPointPopupTier,
  resolveSkillPointPopupPendingSpend,
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

function validateUnspentPopupRetry() {
  const game = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  game.level = 2;
  game.skillPoints = 1;
  syncSkillPointPopupQueue(game);
  const firstId = game.skillPointPopup.active.id;

  game.time = SKILL_POINT_POPUP_DURATION + 0.1;
  updateSkillPointPopup(game);
  assert.equal(game.skillPointPopup.active, null, "expired unspent popup should close before retry delay");
  assert.equal(game.skillPointPopup.queue.length, 0, "expired unspent popup should not immediately requeue");
  assert.equal(game.skillPointPopup.retryAt, game.time + SKILL_POINT_POPUP_RETRY_DELAY, "expired unspent popup should schedule a 15s retry");

  game.time += SKILL_POINT_POPUP_RETRY_DELAY - 0.1;
  syncSkillPointPopupQueue(game);
  assert.equal(game.skillPointPopup.active, null, "unspent popup should stay hidden before retry delay");
  game.time += 0.1;
  syncSkillPointPopupQueue(game);
  assert(game.skillPointPopup.active, "unspent popup should reopen after retry delay");
  assert(game.skillPointPopup.active.id > firstId, "retry should use a newly queued popup");
  assert.equal(game.skillPointPopup.retryAt, null, "retry should clear after popup reopens");

  game.skillPoints = 0;
  syncSkillPointPopupQueue(game);
  assert.equal(game.skillPointPopup.retryAt, null, "spending all skill points should clear pending retry");
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

function validateNetworkPopupClickWaitsForAuthoritativeSpend() {
  const game = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  game.level = 5;
  game.skillPoints = 3;
  syncSkillPointPopupQueue(game);
  const tier = getSkillPointPopupTier(game);
  const activeId = game.skillPointPopup.active.id;
  const sentActions = [];
  game.networkEnabled = true;
  game.networkRoomPhase = "active";
  game.networkLocalPlayerId = "p_local";
  game.networkPauseOwnerId = "p_owner";
  game.uiRects.skillPointPopupNodes = [{
    key: tier.defs[0].key,
    rect: { x: 10, y: 10, w: 50, h: 50 }
  }];
  game.time = SKILL_POINT_POPUP_DURATION - 0.1;
  game.input = createClickInput({ x: 20, y: 20 });
  handleNetworkUiActions(game, { sendAction: (action) => sentActions.push(action) }, false);
  assert.equal(sentActions.length, 1, "network popup click should send one spend action");
  assert.equal(sentActions[0].kind, "spendSkill", "network popup click should send a spend action");
  assert.equal(sentActions[0].key, tier.defs[0].key, "network popup click should send the clicked skill key");
  assert.equal(sentActions[0].clientActionSeq, 1, "network popup click should include an action sequence");
  assert.equal(game.skillPointPopup.active.id, activeId, "network popup click should not advance before authoritative spend");
  assert.equal(game.skillPointPopup.active.spendPending, true, "network popup click should freeze timeout advancement");
  assert.equal(game.skillPointPopup.active.startedAt, game.time, "network popup click should restart the visible timeout while acknowledgement is pending");
  assert.equal(game.skillPointPopup.queue.length, 2, "network popup click should preserve queued popups until snapshot sync");
  game.input = createClickInput({ x: 20, y: 20 });
  handleNetworkUiActions(game, { sendAction: (action) => sentActions.push(action) }, false);
  assert.equal(sentActions.length, 1, "pending network popup should not send duplicate spends before acknowledgement");
  game.time += SKILL_POINT_POPUP_DURATION + 0.5;
  updateSkillPointPopup(game);
  assert.equal(game.skillPointPopup.active.id, activeId, "pending network popup should not timeout before authoritative spend");
  assert.equal(game.skillPointPopup.queue.length, 2, "pending network popup timeout should not consume queued popups");
  assert.equal(resolveSkillPointPopupPendingSpend(game, { acknowledgedActionSeq: 0 }), false, "stale snapshots should not resolve pending popup spends");
  assert.equal(game.skillPointPopup.active.spendPending, true, "stale snapshots should leave pending popup frozen");
  game.skillPoints = 2;
  assert(resolveSkillPointPopupPendingSpend(game, { acknowledgedActionSeq: 1 }), "authoritative spend should resolve pending popup");
  assert.equal(game.skillPointPopup.active.id, activeId + 1, "authoritative spend should advance the popup queue");
  assert.equal(game.skillPointPopup.queue.length, 1, "authoritative spend should leave later popup points queued");
  syncSkillPointPopupQueue(game);
  assert.equal(game.skillPointPopup.active.id, activeId + 1, "resolved authoritative spend should not double advance on later queue sync");
}

function validateRejectedNetworkPopupSpendUnfreezes() {
  const game = new GameSim({ classType: "archer", viewportWidth: 960, viewportHeight: 640 });
  game.level = 5;
  game.skillPoints = 3;
  syncSkillPointPopupQueue(game);
  const tier = getSkillPointPopupTier(game);
  const activeId = game.skillPointPopup.active.id;
  game.networkEnabled = true;
  game.networkRoomPhase = "active";
  game.networkLocalPlayerId = "p_local";
  game.networkPauseOwnerId = "p_owner";
  game.uiRects.skillPointPopupNodes = [{
    key: tier.defs[0].key,
    rect: { x: 10, y: 10, w: 50, h: 50 }
  }];
  game.input = createClickInput({ x: 20, y: 20 });
  handleNetworkUiActions(game, { sendAction() {} }, false);
  game.time = SKILL_POINT_POPUP_DURATION + 0.5;
  updateSkillPointPopup(game);
  assert.equal(game.skillPointPopup.active.id, activeId, "pending rejected popup should remain frozen before snapshot reconciliation");
  assert.equal(resolveSkillPointPopupPendingSpend(game, { acknowledgedActionSeq: 0 }), false, "stale rejected-spend snapshots should not unfreeze the active popup");
  assert(resolveSkillPointPopupPendingSpend(game, { acknowledgedActionSeq: 1 }), "unchanged authoritative skill points should clear pending spend");
  assert.equal(game.skillPointPopup.active.spendPending, false, "rejected spend should unfreeze the active popup");
  game.time += SKILL_POINT_POPUP_DURATION + 0.5;
  updateSkillPointPopup(game);
  assert.equal(game.skillPointPopup.active.id, activeId + 1, "unfrozen rejected popup should resume normal timeout advancement");
}

function validateWiring() {
  const scene = read("src/rendering/runtimeSceneDrawMethods.js");
  const rendererScene = read("src/rendering/RendererRuntimeScene.js");
  const localUi = read("src/game/world/uiEconomy.js");
  const networkUi = read("src/net/sessionInteraction.js");
  const clientSync = read("src/net/clientStateSync.js");
  const serverRoom = read("server/net/AuthoritativeRoom.js");
  const serverMessages = read("server/net/clientMessageHandler.js");
  const input = read("src/InputController.js");
  const popup = read("src/rendering/hud/skillPointPopup.js");
  assert(scene.includes("drawSkillPointPopup"), "XP HUD should draw the skill point popup above the lantern gauge");
  assert(rendererScene.includes("skillPointPopupNodes = []"), "renderer should reset popup node rects every frame");
  assert(localUi.includes("handleSkillPointPopupClick"), "local UI should handle popup skill clicks");
  assert(!localUi.includes("spendSkillPoint(node.key) && dismissSkillPointPopup"), "local popup clicks should not dismiss twice after spending");
  assert(networkUi.includes("handleSkillPointPopupClick"), "network UI should handle popup skill clicks");
  assert(clientSync.includes("resolveSkillPointPopupPendingSpend"), "network snapshots should clear rejected pending popup spends");
  assert(serverRoom.includes("lastActionSeqByPlayer"), "network snapshots should include action acknowledgements");
  assert(serverMessages.includes("clientActionSeq"), "server should record client action acknowledgements");
  assert(input.includes("skillPointPopupNodes"), "touch routing should treat popup skill cards as UI");
  assert(popup.includes("drawSkillTooltip"), "popup skill cards should keep mouseover tooltips");
  assert(popup.includes("getPopupSkillTooltip"), "popup skill cards should use class skill tooltips");
  assert(popup.includes("ctx.fillStyle = \"#000000\""), "popup skill icons should draw on a black square background");
  assert(popup.includes("ctx.imageSmoothingEnabled = false"), "popup skill icons should force nearest-neighbor scaling");
  assert(popup.includes("const cardSize"), "popup skill cards should use square icon boxes");
  assert(popup.includes("drawSkillIcon(ctx, game, def, iconRect, false, 0)"), "popup skill icons should fill their square boxes");
}

validatePopupQueue();
validateUnspentPopupRetry();
validateSpendDismissal();
validateLocalPopupClickDoesNotSkipQueue();
validateNetworkPopupClickWaitsForAuthoritativeSpend();
validateRejectedNetworkPopupSpendUnfreezes();
validateWiring();
console.log(JSON.stringify({ skillPointPopup: "ok" }, null, 2));
