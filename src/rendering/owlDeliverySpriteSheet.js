const SPRITE_GRID = 32;
const SPRITE_DRAW_SIZE = 48;

const COLORS = {
  body: "#2a1612",
  wingDark: "#4a1f16",
  wingHot: "#b83a19",
  flame: "#f06b22",
  glow: "#ffb347",
  ash: "#4b3a35"
};

function buildPhoenixFrame(wing = 0) {
  const pixels = [];
  const add = (points, color) => points.forEach(([x, y]) => pixels.push({ x, y, color }));
  add([[15, 15], [16, 15], [14, 16], [15, 16], [16, 16], [17, 16], [14, 17], [15, 17], [16, 17], [15, 18], [16, 18]], COLORS.body);
  add([[17, 14], [18, 14], [18, 15]], COLORS.body);
  add([[17, 14], [19, 15]], COLORS.glow);
  add([[12, 18], [11, 19], [10, 20], [13, 19], [12, 20], [14, 20]], COLORS.wingHot);
  add([[9, 21], [11, 21], [13, 21]], COLORS.flame);
  add([[15, 19], [17, 19], [15, 20], [17, 20]], COLORS.ash);
  if (wing === 0) {
    add([[13, 14], [12, 13], [11, 12], [10, 11], [12, 14], [11, 13], [10, 12], [19, 14], [20, 13], [21, 12], [22, 11], [20, 14], [21, 13], [22, 12]], COLORS.wingDark);
    add([[10, 10], [9, 9], [22, 10], [23, 9]], COLORS.wingHot);
  } else if (wing === 1) {
    add([[13, 15], [12, 15], [11, 15], [10, 15], [12, 16], [11, 16], [10, 16], [19, 15], [20, 15], [21, 15], [22, 15], [20, 16], [21, 16], [22, 16]], COLORS.wingDark);
    add([[9, 15], [23, 15], [10, 17], [22, 17]], COLORS.wingHot);
  } else {
    add([[13, 17], [12, 18], [11, 19], [10, 20], [12, 17], [11, 18], [19, 17], [20, 18], [21, 19], [22, 20], [20, 17], [21, 18]], COLORS.wingDark);
    add([[9, 21], [23, 21], [10, 20], [22, 20]], COLORS.wingHot);
  }
  add([[15, 15], [16, 16], [14, 17], [18, 14]], COLORS.wingHot);
  add([[16, 15], [17, 16]], COLORS.flame);
  return pixels;
}

function buildPhoenixDeathFrame(step = 0) {
  const pixels = [];
  const add = (points, color) => points.forEach(([x, y]) => pixels.push({ x, y, color }));
  if (step === 0) return buildPhoenixFrame(2);
  if (step === 1) {
    add([[14, 18], [15, 18], [16, 18], [17, 18], [15, 19], [16, 19], [18, 17], [19, 17]], COLORS.body);
    add([[19, 17]], COLORS.glow);
    add([[12, 17], [11, 18], [10, 19], [20, 19], [21, 20]], COLORS.wingDark);
    add([[10, 20], [21, 21], [13, 19], [16, 20]], COLORS.wingHot);
    add([[9, 22], [12, 22], [18, 22]], COLORS.flame);
  } else if (step === 2) {
    add([[12, 21], [13, 21], [14, 21], [15, 21], [16, 21], [17, 21], [18, 20], [19, 20]], COLORS.body);
    add([[19, 20]], COLORS.glow);
    add([[10, 20], [11, 21], [18, 22], [19, 22], [20, 22]], COLORS.wingDark);
    add([[11, 22], [15, 22], [20, 21]], COLORS.wingHot);
    add([[9, 23], [13, 23], [17, 23], [21, 23]], COLORS.flame);
  } else if (step === 3) {
    add([[12, 22], [13, 22], [14, 22], [15, 22], [16, 22], [17, 22], [18, 22]], COLORS.body);
    add([[11, 21], [14, 20], [17, 20], [20, 21]], COLORS.wingHot);
    add([[10, 22], [13, 19], [16, 18], [19, 19], [21, 22]], COLORS.flame);
    add([[12, 18], [18, 17], [15, 16]], COLORS.glow);
    add([[9, 24], [12, 24], [15, 24], [18, 24], [21, 24]], COLORS.ash);
  } else if (step === 4) {
    add([[13, 22], [14, 22], [15, 22], [16, 22], [17, 22]], COLORS.ash);
    add([[12, 21], [14, 19], [16, 18], [18, 20], [20, 22]], COLORS.flame);
    add([[13, 18], [15, 16], [17, 17], [19, 19]], COLORS.glow);
    add([[11, 23], [15, 23], [19, 23]], COLORS.wingHot);
  } else if (step === 5) {
    add([[13, 23], [14, 23], [15, 23], [16, 23], [17, 23], [18, 23]], COLORS.ash);
    add([[12, 22], [16, 21], [20, 22]], COLORS.flame);
    add([[14, 20], [18, 19]], COLORS.glow);
  } else if (step === 6) {
    add([[13, 24], [15, 24], [17, 24], [19, 24]], COLORS.ash);
    add([[14, 22], [16, 21], [18, 22]], COLORS.flame);
    add([[15, 20], [18, 19]], COLORS.glow);
  } else {
    add([[14, 24], [16, 24], [18, 24]], COLORS.ash);
    add([[15, 22], [18, 21]], COLORS.wingHot);
    add([[16, 19]], COLORS.glow);
  }
  return pixels;
}

const FLIGHT_FRAMES = [buildPhoenixFrame(0), buildPhoenixFrame(1), buildPhoenixFrame(2), buildPhoenixFrame(1)];
const DEATH_FRAMES = Array.from({ length: 8 }, (_, index) => buildPhoenixDeathFrame(index));

function selectFrame(owl, gameTime) {
  const t = Number.isFinite(gameTime) ? gameTime : 0;
  if (owl?.state === "slain") {
    const corpseTime = Number.isFinite(owl.slainTimer) ? owl.slainTimer : 0;
    const progress = Math.max(0, Math.min(1, 1 - corpseTime / 2.5));
    return DEATH_FRAMES[Math.min(DEATH_FRAMES.length - 1, Math.floor(progress * DEATH_FRAMES.length))];
  }
  const rate = owl?.state === "waiting" ? 4 : 9;
  return FLIGHT_FRAMES[Math.floor(t * rate) % FLIGHT_FRAMES.length];
}

export function drawVeronicaSpriteFrame(renderer, owl, x, y, scale, gameTime) {
  const ctx = renderer?.ctx;
  if (!ctx) return false;
  const frame = selectFrame(owl, gameTime);
  const pixelSize = (SPRITE_DRAW_SIZE * scale) / SPRITE_GRID;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x - (SPRITE_DRAW_SIZE * scale) * 0.5, y - (SPRITE_DRAW_SIZE * scale) * 0.62);
  for (const pixel of frame) {
    ctx.fillStyle = pixel.color;
    ctx.fillRect(pixel.x * pixelSize, pixel.y * pixelSize, pixelSize, pixelSize);
  }
  ctx.restore();
  return true;
}

export function drawVeronicaEffectFrame() {
  return false;
}
