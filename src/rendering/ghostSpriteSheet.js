const ASSET_ROOT = "./assets/images/enemies/ghost_family";
const CELL_SIZE = 128;
const RENDER_SIZE = 44;
const PIVOT_X = 64;
const PIVOT_Y = 104;
const PRESENTATION_FPS = 10;
const GHOST_CORPSE_DURATION = 30;
const PALETTE_FILTERS = Object.freeze({
  cold_haunt: "saturate(0.18) brightness(1.55) contrast(0.88)",
  malignant_haunt: "sepia(0.72) saturate(1.8) hue-rotate(62deg) brightness(1.38) contrast(0.9)"
});

export const GHOST_VARIANTS = ["hollow_ghost", "veiled_specter", "shackled_poltergeist"];
export const GHOST_PALETTES = ["cold_haunt", "malignant_haunt"];
export const GHOST_ACTIONS = Object.freeze({
  hover: { frames: 6, loop: true },
  move: { frames: 8, loop: true },
  primary_attack: { frames: 8, loop: false },
  siphon: { frames: 8, loop: true },
  hurt: { frames: 4, loop: false },
  death: { frames: 10, loop: false }
});

const records = new Map();

function normalize(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function getRecord(variant, action, pass) {
  const spec = GHOST_ACTIONS[action];
  const key = `${variant}_${action}_${pass}`;
  if (records.has(key)) return records.get(key);
  if (typeof Image !== "function") return null;
  const record = { image: new Image(), loaded: false, failed: false };
  record.image.addEventListener("load", () => { record.loaded = true; }, { once: true });
  record.image.addEventListener("error", () => { record.failed = true; }, { once: true });
  record.image.src = `${ASSET_ROOT}/${variant}_${action}_8dir_${spec.frames}f_${pass}.png`;
  records.set(key, record);
  return record;
}

export function getGhostDirectionIndex(dirX = 1, dirY = 0) {
  if (!Number.isFinite(dirX) || !Number.isFinite(dirY) || Math.hypot(dirX, dirY) < 0.001) return 0;
  const eighthTurn = Math.PI / 4;
  return (Math.round(Math.atan2(dirY, dirX) / eighthTurn) + 8) % 8;
}

export function getGhostPresentation(enemy, timeSeconds = 0) {
  const variant = normalize(enemy?.ghostVariant, GHOST_VARIANTS, GHOST_VARIANTS[0]);
  const palette = normalize(enemy?.ghostPalette, GHOST_PALETTES, GHOST_PALETTES[0]);
  const action = (enemy?.hp || 0) <= 0
    ? "death"
    : normalize(enemy?.ghostAction, Object.keys(GHOST_ACTIONS), "hover");
  const spec = GHOST_ACTIONS[action];
  const elapsedSeconds = action === "death"
    ? GHOST_CORPSE_DURATION - (Number.isFinite(enemy?.corpseTimer) ? enemy.corpseTimer : GHOST_CORPSE_DURATION)
    : spec.loop
      ? (Number.isFinite(timeSeconds) ? timeSeconds : 0) + (Number.isFinite(enemy?.ghostAnimationPhase) ? enemy.ghostAnimationPhase : 0)
      : (Number.isFinite(timeSeconds) ? timeSeconds : 0) - (Number.isFinite(enemy?.ghostActionStartedAt) ? enemy.ghostActionStartedAt : 0);
  const elapsedFrames = Math.max(0, Math.floor(elapsedSeconds * PRESENTATION_FPS));
  const frame = spec.loop ? elapsedFrames % spec.frames : Math.min(spec.frames - 1, elapsedFrames);
  const complete = !spec.loop && elapsedFrames >= spec.frames;
  return { variant, palette, action, frame, complete, direction: getGhostDirectionIndex(enemy?.dirX, enemy?.dirY) };
}

function drawPass(ctx, record, presentation, screenX, screenY, alpha, composite = "source-over") {
  if (!record?.loaded || record.failed) return false;
  const drawX = Math.round(screenX - PIVOT_X * (RENDER_SIZE / CELL_SIZE));
  const drawY = Math.round(screenY - PIVOT_Y * (RENDER_SIZE / CELL_SIZE));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = composite;
  ctx.filter = PALETTE_FILTERS[presentation.palette];
  ctx.drawImage(
    record.image,
    presentation.frame * CELL_SIZE, presentation.direction * CELL_SIZE, CELL_SIZE, CELL_SIZE,
    drawX, drawY, RENDER_SIZE, RENDER_SIZE
  );
  ctx.restore();
  return true;
}

export function drawGhostSprite(ctx, enemy, screenX, screenY, timeSeconds = 0) {
  const presentation = getGhostPresentation(enemy, timeSeconds);
  const color = getRecord(presentation.variant, presentation.action, "color");
  const shadow = getRecord(presentation.variant, presentation.action, "shadow");
  const glow = getRecord(presentation.variant, presentation.action, "glow");
  if (!color?.loaded || color.failed) return false;
  drawPass(ctx, shadow, presentation, screenX, screenY, 0.42);
  drawPass(ctx, color, presentation, screenX, screenY, enemy?.isControlledUndead ? 0.92 : 0.78);
  drawPass(ctx, glow, presentation, screenX, screenY, 0.62, "screen");
  if (enemy?.isControlledUndead) {
    const accent = typeof enemy.controlledColor === "string" && enemy.controlledColor ? enemy.controlledColor : "#9eb8ff";
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(Math.round(screenX), Math.round(screenY + 5), 10, 3.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  return true;
}

export function resetGhostSpriteCacheForTests() {
  records.clear();
}
