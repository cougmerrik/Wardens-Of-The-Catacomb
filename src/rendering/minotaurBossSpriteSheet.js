export const MINOTAUR_FRAME_SIZE = 128;
export const MINOTAUR_DIRECTION_ROWS = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
export const MINOTAUR_VARIANTS = ["normal", "damaged"];
export const MINOTAUR_SHEETS = {
  idle: { frames: 4, loop: true },
  walk: { frames: 6, loop: true },
  windup: { frames: 4, loop: true },
  charge: { frames: 4, loop: true },
  stomp: { frames: 6, loop: false },
  triumph: { frames: 6, loop: false },
  death: { frames: 8, loop: false },
};

const FPS = 10;
const PIVOT_Y = 103 / MINOTAUR_FRAME_SIZE;
const records = new Map();

function getSheetPath(variant, action, frames) {
  return `./assets/images/enemies/minotaur/minotaur_${variant}_${action}_8dir_${frames}f.png`;
}

function getSheetRecord(variant, action) {
  const safeVariant = MINOTAUR_VARIANTS.includes(variant) ? variant : "normal";
  const sheet = MINOTAUR_SHEETS[action] || MINOTAUR_SHEETS.idle;
  const key = `${safeVariant}:${action}`;
  if (records.has(key)) return records.get(key);
  if (typeof Image !== "function") return null;
  const record = {
    image: new Image(),
    loaded: false,
    failed: false,
    sheet,
    path: getSheetPath(safeVariant, action, sheet.frames),
  };
  record.image.addEventListener("load", () => { record.loaded = true; }, { once: true });
  record.image.addEventListener("error", () => { record.failed = true; }, { once: true });
  record.image.src = record.path;
  records.set(key, record);
  return record;
}

export function getMinotaurDirectionIndex(dirX = 1, dirY = 0) {
  const len = Math.hypot(dirX || 0, dirY || 0);
  if (len <= 0.001) return 0;
  const angle = Math.atan2(dirY / len, dirX / len);
  return (Math.round(angle / (Math.PI / 4)) + 8) % 8;
}

export function getMinotaurVariant(enemy) {
  const maxHp = Number.isFinite(enemy?.maxHp) && enemy.maxHp > 0 ? enemy.maxHp : null;
  const hp = Number.isFinite(enemy?.hp) ? enemy.hp : maxHp;
  if (maxHp && hp <= maxHp * 0.5) return "damaged";
  return "normal";
}

function getMotionVector(enemy) {
  if ((enemy?.chargeTimer || 0) > 0) {
    return {
      x: Number.isFinite(enemy?.chargeDirX) && Math.abs(enemy.chargeDirX) > 0.001 ? enemy.chargeDirX : 1,
      y: Number.isFinite(enemy?.chargeDirY) ? enemy.chargeDirY : 0,
      moving: true,
    };
  }
  const moveX = Number.isFinite(enemy?.x) && Number.isFinite(enemy?.lastX) ? enemy.x - enemy.lastX : 0;
  const moveY = Number.isFinite(enemy?.y) && Number.isFinite(enemy?.lastY) ? enemy.y - enemy.lastY : 0;
  if (Math.hypot(moveX, moveY) > 0.05) return { x: moveX, y: moveY, moving: true };
  return {
    x: Number.isFinite(enemy?.dirX) ? enemy.dirX : 1,
    y: Number.isFinite(enemy?.dirY) ? enemy.dirY : 0,
    moving: false,
  };
}

export function getMinotaurAction(enemy) {
  if ((enemy?.hp || 0) <= 0) return "death";
  if ((enemy?.triumphTimer || 0) > 0) return "triumph";
  if ((enemy?.chargeTimer || 0) > 0) return "charge";
  if ((enemy?.chargeWindupTimer || 0) > 0 || enemy?.tactics?.phase === "windup") return "windup";
  if (enemy?.tactics?.phase === "stomp") return "stomp";
  return getMotionVector(enemy).moving ? "walk" : "idle";
}

export function getMinotaurFrameIndex(enemy, action, gameTime = 0) {
  const sheet = MINOTAUR_SHEETS[action] || MINOTAUR_SHEETS.idle;
  if (action === "death") {
    const duration = 18;
    const remaining = Number.isFinite(enemy?.corpseTimer) ? enemy.corpseTimer : duration;
    const progress = Math.max(0, Math.min(1, 1 - remaining / duration));
    return Math.min(sheet.frames - 1, Math.floor(progress * sheet.frames));
  }
  if (action === "triumph") {
    const progress = Math.max(0, Math.min(1, 1 - (enemy?.triumphTimer || 0) / 1.2));
    return Math.min(sheet.frames - 1, Math.floor(progress * sheet.frames));
  }
  if (action === "stomp") {
    const phaseTime = Number.isFinite(enemy?.tactics?.phaseTime) ? enemy.tactics.phaseTime : gameTime;
    return Math.min(sheet.frames - 1, Math.floor(Math.max(0, phaseTime) * FPS));
  }
  return sheet.loop ? Math.floor(Math.max(0, gameTime) * FPS) % sheet.frames : 0;
}

function drawSheetFrame(ctx, variant, action, directionIndex, frame, screenX, screenY, renderSize) {
  const record = getSheetRecord(variant, action);
  if (!record || !record.loaded || record.failed) return false;
  const drawX = Math.round(screenX - renderSize * 0.5);
  const drawY = Math.round(screenY - renderSize * PIVOT_Y);
  const previousSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    record.image,
    frame * MINOTAUR_FRAME_SIZE,
    directionIndex * MINOTAUR_FRAME_SIZE,
    MINOTAUR_FRAME_SIZE,
    MINOTAUR_FRAME_SIZE,
    drawX,
    drawY,
    renderSize,
    renderSize
  );
  ctx.imageSmoothingEnabled = previousSmoothing;
  return true;
}

export function drawMinotaurBossSprite(ctx, game, enemy, screenX, screenY) {
  const action = getMinotaurAction(enemy);
  const variant = getMinotaurVariant(enemy);
  const motion = getMotionVector(enemy);
  const directionIndex = getMinotaurDirectionIndex(motion.x, motion.y);
  const frame = getMinotaurFrameIndex(enemy, action, game?.time || 0);
  const size = Number.isFinite(enemy?.size) ? enemy.size : 34;
  const renderSize = Math.max(86, Math.round(size * 3.05));
  return drawSheetFrame(ctx, variant, action, directionIndex, frame, screenX, screenY, renderSize);
}

export function resetMinotaurBossSpriteSheetsForTests() {
  records.clear();
}
