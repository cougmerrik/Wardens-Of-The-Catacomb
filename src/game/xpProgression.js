export function getXpToNextLevelForLevel(config, level) {
  const progression = config?.progression || {};
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  const base = Number.isFinite(progression.baseXpToLevel) ? Math.max(1, Math.floor(progression.baseXpToLevel)) : 30;
  const scaling = Number.isFinite(progression.xpLevelScaling) ? Math.max(1, progression.xpLevelScaling) : 1.35;
  const lateStart = Number.isFinite(progression.xpLateCurveStartLevel)
    ? Math.max(1, Math.floor(progression.xpLateCurveStartLevel))
    : Number.POSITIVE_INFINITY;

  if (safeLevel >= lateStart) {
    const lateBase = Number.isFinite(progression.xpLateBaseToLevel) ? Math.max(1, Math.floor(progression.xpLateBaseToLevel)) : base;
    const lateStep = Number.isFinite(progression.xpLateFloorStep) ? Math.max(0, progression.xpLateFloorStep) : 0;
    const lateCap = Number.isFinite(progression.xpLateCapToLevel) ? Math.max(lateBase, Math.floor(progression.xpLateCapToLevel)) : Number.POSITIVE_INFINITY;
    const lateFloorIndex = Math.max(0, Math.floor((safeLevel - lateStart) / 5));
    return Math.floor(Math.min(lateCap, lateBase + lateFloorIndex * lateStep));
  }

  let xp = base;
  for (let currentLevel = 1; currentLevel < safeLevel; currentLevel += 1) {
    xp = Math.floor(xp * scaling);
  }
  return Math.max(1, xp);
}

export function getNextXpToLevel(config, currentLevel) {
  return getXpToNextLevelForLevel(config, (Number.isFinite(currentLevel) ? Math.floor(currentLevel) : 1) + 1);
}
