export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function vecLength(x, y) {
  return Math.hypot(x, y);
}

export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function directionIndexFromVector(dx, dy) {
  const angle = Math.atan2(dy, dx);
  const normalized = (angle + Math.PI * 2) % (Math.PI * 2);
  return Math.round(normalized / (Math.PI / 4)) % 8;
}