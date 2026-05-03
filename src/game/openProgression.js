export const OPEN_PROGRESSION_TIER_COUNT = 6;

export const OPEN_PROGRESSION_TIER_LEVELS = Object.freeze({
  1: 2,
  2: 3,
  3: 5,
  4: 7,
  5: 9,
  6: 12
});

export const OPEN_PROGRESSION_SP_LEVELS = Object.freeze([2, 3, 5, 7, 9, 10, 12]);

const OPEN_PROGRESSION_SP_LEVEL_SET = new Set(OPEN_PROGRESSION_SP_LEVELS);

export function getOpenProgressionTierLevel(tier) {
  const safeTier = Number.isFinite(tier) ? Math.max(1, Math.min(OPEN_PROGRESSION_TIER_COUNT, Math.floor(tier))) : 1;
  return OPEN_PROGRESSION_TIER_LEVELS[safeTier] || 99;
}

export function getOpenProgressionSkillPointGainForLevel(level) {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  if (OPEN_PROGRESSION_SP_LEVEL_SET.has(safeLevel)) return 1;
  return safeLevel > 12 && safeLevel % 2 === 0 ? 1 : 0;
}
