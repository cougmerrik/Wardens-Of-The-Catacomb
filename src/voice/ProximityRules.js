export const DEFAULT_PROXIMITY_RULES = {
  nearPx: 72,
  farPx: 640,
  floorGain: 0.06,
  rolloff: 1.65,
  roomOcclusionGain: 0.55,
  closedDoorGain: 0.32
};

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function computeDistanceGain(distancePx, rules = DEFAULT_PROXIMITY_RULES) {
  const nearPx = Math.max(1, Number.isFinite(rules.nearPx) ? rules.nearPx : DEFAULT_PROXIMITY_RULES.nearPx);
  const farPx = Math.max(nearPx + 1, Number.isFinite(rules.farPx) ? rules.farPx : DEFAULT_PROXIMITY_RULES.farPx);
  const floorGain = clamp01(Number.isFinite(rules.floorGain) ? rules.floorGain : DEFAULT_PROXIMITY_RULES.floorGain);
  if (!Number.isFinite(distancePx) || distancePx <= nearPx) return 1;
  if (distancePx >= farPx) return floorGain;
  const t = clamp01((distancePx - nearPx) / (farPx - nearPx));
  const curve = 1 - Math.pow(t, Number.isFinite(rules.rolloff) ? Math.max(0.1, rules.rolloff) : DEFAULT_PROXIMITY_RULES.rolloff);
  return floorGain + (1 - floorGain) * curve;
}

export function computeStereoPan(listener, source, maxPanDistancePx = 360) {
  if (!listener || !source) return 0;
  const dx = (Number.isFinite(source.x) ? source.x : 0) - (Number.isFinite(listener.x) ? listener.x : 0);
  const denom = Math.max(1, Number.isFinite(maxPanDistancePx) ? maxPanDistancePx : 360);
  return Math.max(-1, Math.min(1, dx / denom));
}

export function hasClosedDoorBetween(game, listener, source) {
  const door = game?.door;
  if (!door || door.open === true) return false;
  if (!Number.isFinite(door.x) || !Number.isFinite(door.y) || !listener || !source) return false;
  const ax = Number.isFinite(listener.x) ? listener.x : 0;
  const ay = Number.isFinite(listener.y) ? listener.y : 0;
  const bx = Number.isFinite(source.x) ? source.x : 0;
  const by = Number.isFinite(source.y) ? source.y : 0;
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq <= 0.0001) return false;
  const t = Math.max(0, Math.min(1, ((door.x - ax) * abx + (door.y - ay) * aby) / lenSq));
  const px = ax + abx * t;
  const py = ay + aby * t;
  return Math.hypot(door.x - px, door.y - py) <= 52;
}

export function computeOcclusionGain(game, listener, source, rules = DEFAULT_PROXIMITY_RULES) {
  if (hasClosedDoorBetween(game, listener, source)) {
    return clamp01(Number.isFinite(rules.closedDoorGain) ? rules.closedDoorGain : DEFAULT_PROXIMITY_RULES.closedDoorGain);
  }
  return 1;
}
