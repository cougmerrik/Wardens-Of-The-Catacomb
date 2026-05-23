import {
  canSpendRangerNode,
  getRangerTalentDefs,
  getRangerTierLabel
} from "./rangerTalentTree.js";
import {
  canSpendNecromancerNode,
  getMageTierLabel,
  getNecromancerTalentDefs
} from "./necromancerTalentTree.js";
import {
  canSpendWarriorNode,
  getWarriorTalentDefs
} from "./warriorTalentTree.js";

export const SKILL_POINT_POPUP_DURATION = 8;
export const SKILL_POINT_POPUP_FADE_SECONDS = 1;
const WARRIOR_TIER_LABELS = {
  1: "Weapon",
  2: "Stance",
  3: "Stance",
  4: "Doctrine",
  5: "General",
  6: "Capstone"
};

export function ensureSkillPointPopupState(game) {
  if (!game) return null;
  if (!game.skillPointPopup || typeof game.skillPointPopup !== "object") {
    game.skillPointPopup = {
      active: null,
      queue: [],
      nextId: 1,
      lastSkillPoints: Number.isFinite(game.skillPoints) ? Math.max(0, Math.floor(game.skillPoints)) : 0
    };
  }
  if (!Array.isArray(game.skillPointPopup.queue)) game.skillPointPopup.queue = [];
  if (!Number.isFinite(game.skillPointPopup.nextId)) game.skillPointPopup.nextId = 1;
  return game.skillPointPopup;
}

function now(game) {
  return Number.isFinite(game?.time) ? game.time : 0;
}

function startNextPopup(game, state) {
  if (state.active || state.queue.length <= 0) return;
  const next = state.queue.shift();
  state.active = { ...next, startedAt: now(game) };
}

export function enqueueSkillPointPopup(game, count = 1) {
  const state = ensureSkillPointPopupState(game);
  if (!state) return;
  const safeCount = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
  for (let i = 0; i < safeCount; i++) state.queue.push({ id: state.nextId++ });
  startNextPopup(game, state);
}

export function syncSkillPointPopupQueue(game) {
  const state = ensureSkillPointPopupState(game);
  if (!state) return;
  const current = Number.isFinite(game.skillPoints) ? Math.max(0, Math.floor(game.skillPoints)) : 0;
  if (!Number.isFinite(state.lastSkillPoints)) state.lastSkillPoints = current;
  if (current > state.lastSkillPoints) enqueueSkillPointPopup(game, current - state.lastSkillPoints);
  if (current < state.lastSkillPoints) {
    for (let i = current; i < state.lastSkillPoints; i++) dismissSkillPointPopup(game);
  }
  state.lastSkillPoints = current;
  if (current <= 0) dismissSkillPointPopup(game, { clearQueue: true });
}

export function dismissSkillPointPopup(game, options = {}) {
  const state = ensureSkillPointPopupState(game);
  if (!state) return;
  state.active = null;
  if (options.clearQueue) state.queue.length = 0;
  else startNextPopup(game, state);
  if (options.syncSkillPoints && Number.isFinite(game.skillPoints)) {
    state.lastSkillPoints = Math.max(0, Math.floor(game.skillPoints));
  }
}

export function markSkillPointPopupSpendPending(game, options = {}) {
  const state = ensureSkillPointPopupState(game);
  if (!state?.active) return false;
  const current = Number.isFinite(game.skillPoints) ? Math.max(0, Math.floor(game.skillPoints)) : 0;
  state.active.startedAt = now(game);
  state.active.spendPending = true;
  state.active.spendPendingSkillPoints = current;
  if (Number.isFinite(options.actionSeq)) state.active.spendPendingActionSeq = Math.max(0, Math.floor(options.actionSeq));
  return true;
}

export function resolveSkillPointPopupPendingSpend(game, options = {}) {
  const state = ensureSkillPointPopupState(game);
  if (!state?.active?.spendPending) return false;
  const pendingActionSeq = Number.isFinite(state.active.spendPendingActionSeq)
    ? Math.max(0, Math.floor(state.active.spendPendingActionSeq))
    : 0;
  const acknowledgedActionSeq = Number.isFinite(options.acknowledgedActionSeq)
    ? Math.max(0, Math.floor(options.acknowledgedActionSeq))
    : pendingActionSeq;
  if (pendingActionSeq > 0 && acknowledgedActionSeq < pendingActionSeq) return false;
  const current = Number.isFinite(game.skillPoints) ? Math.max(0, Math.floor(game.skillPoints)) : 0;
  const pendingSkillPoints = Number.isFinite(state.active.spendPendingSkillPoints)
    ? Math.max(0, Math.floor(state.active.spendPendingSkillPoints))
    : Number.isFinite(state.lastSkillPoints)
    ? Math.max(0, Math.floor(state.lastSkillPoints))
    : current;
  if (current < pendingSkillPoints) {
    for (let i = current; i < pendingSkillPoints; i++) dismissSkillPointPopup(game);
    state.lastSkillPoints = current;
    return true;
  }
  state.active.spendPending = false;
  delete state.active.spendPendingSkillPoints;
  delete state.active.spendPendingActionSeq;
  state.active.startedAt = now(game);
  return true;
}

export function updateSkillPointPopup(game) {
  const state = ensureSkillPointPopupState(game);
  if (!state) return null;
  syncSkillPointPopupQueue(game);
  startNextPopup(game, state);
  if (!state.active) return null;
  if (state.active.spendPending) return state.active;
  const elapsed = now(game) - state.active.startedAt;
  if (elapsed >= SKILL_POINT_POPUP_DURATION) {
    dismissSkillPointPopup(game);
    return state.active;
  }
  return state.active;
}

function getClassSkillAdapter(game) {
  if (game?.isArcherClass?.()) {
    return {
      defs: getRangerTalentDefs(),
      canSpend: (key) => canSpendRangerNode(game, key),
      tierLabel: (tier) => getRangerTierLabel(tier)
    };
  }
  if (game?.isNecromancerClass?.()) {
    return {
      defs: getNecromancerTalentDefs(),
      canSpend: (key) => canSpendNecromancerNode(game, key),
      tierLabel: (tier) => getMageTierLabel(tier)
    };
  }
  if (game?.isWarriorClass?.()) {
    return {
      defs: getWarriorTalentDefs(),
      canSpend: (key) => canSpendWarriorNode(game, key),
      tierLabel: (tier) => WARRIOR_TIER_LABELS[tier] || `Tier ${tier}`
    };
  }
  return null;
}

export function getSkillPointPopupTier(game) {
  if (!game || Math.max(0, Math.floor(game.skillPoints || 0)) <= 0) return null;
  const adapter = getClassSkillAdapter(game);
  if (!adapter) return null;
  const defs = adapter.defs.filter((def) => def && adapter.canSpend(def.key));
  if (defs.length <= 0) return null;
  const tier = Math.min(...defs.map((def) => Math.max(1, Math.floor(def.tier || 1))));
  const tierDefs = defs.filter((def) => Math.max(1, Math.floor(def.tier || 1)) === tier);
  return {
    tier,
    label: adapter.tierLabel(tier),
    defs: tierDefs
  };
}

export function handleSkillPointPopupClick(game, x, y, onSpend) {
  const nodes = Array.isArray(game?.uiRects?.skillPointPopupNodes) ? game.uiRects.skillPointPopupNodes : [];
  for (const node of nodes) {
    const rect = node?.rect;
    if (!rect || x < rect.x || y < rect.y || x > rect.x + rect.w || y > rect.y + rect.h) continue;
    if (typeof onSpend === "function") onSpend(node);
    return true;
  }
  return false;
}
