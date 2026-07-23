export const STATUE_ENEMY_FRAME_SIZE = 128;
export const STATUE_ENEMY_DIRECTION_ROWS = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
export const STATUE_ENEMY_SHEETS = {
  dormant: { path: "./assets/images/enemies/statue/statue_enemy_dormant_8dir_1f.png", frames: 1, loop: false },
  idle: { path: "./assets/images/enemies/statue/statue_enemy_idle_8dir_4f.png", frames: 4, loop: true },
  walk: { path: "./assets/images/enemies/statue/statue_enemy_walk_8dir_6f.png", frames: 6, loop: true },
  attack: { path: "./assets/images/enemies/statue/statue_enemy_attack_8dir_6f.png", frames: 6, loop: false },
  hurt: { path: "./assets/images/enemies/statue/statue_enemy_hurt_8dir_4f.png", frames: 4, loop: false },
  death: { path: "./assets/images/enemies/statue/statue_enemy_death_8dir_8f.png", frames: 8, loop: false },
};

const FPS = 10;
const PIVOT_Y = 101 / STATUE_ENEMY_FRAME_SIZE;
const records = new Map();

function getSheetRecord(action) {
  const sheet = STATUE_ENEMY_SHEETS[action] || STATUE_ENEMY_SHEETS.idle;
  if (records.has(action)) return records.get(action);
  if (typeof Image !== "function") return null;
  const record = { image: new Image(), loaded: false, failed: false, sheet };
  record.image.addEventListener("load", () => { record.loaded = true; }, { once: true });
  record.image.addEventListener("error", () => { record.failed = true; }, { once: true });
  record.image.src = sheet.path;
  records.set(action, record);
  return record;
}

export function getStatueEnemyDirectionIndex(dirX = 1, dirY = 0) {
  const len = Math.hypot(dirX || 0, dirY || 0);
  if (len <= 0.001) return 0;
  const angle = Math.atan2(dirY / len, dirX / len);
  return (Math.round(angle / (Math.PI / 4)) + 8) % 8;
}

function getEnemyMotionVector(enemy) {
  const moveX = Number.isFinite(enemy?.x) && Number.isFinite(enemy?.lastX) ? enemy.x - enemy.lastX : 0;
  const moveY = Number.isFinite(enemy?.y) && Number.isFinite(enemy?.lastY) ? enemy.y - enemy.lastY : 0;
  if (Math.hypot(moveX, moveY) > 0.05) return { x: moveX, y: moveY, moving: true };
  const dirX = Number.isFinite(enemy?.dirX) ? enemy.dirX : 1;
  const dirY = Number.isFinite(enemy?.dirY) ? enemy.dirY : 0;
  return { x: dirX, y: dirY, moving: false };
}

function getEnemyAction(enemy) {
  if ((enemy?.hp || 0) <= 0) return "death";
  if ((enemy?.hpBarTimer || 0) > 0 && Number.isFinite(enemy?.hp) && Number.isFinite(enemy?.maxHp) && enemy.hp < enemy.maxHp) return "hurt";
  return getEnemyMotionVector(enemy).moving ? "walk" : "idle";
}

function drawStatueFrame(ctx, action, directionIndex, frame, screenX, screenY, renderSize) {
  const record = getSheetRecord(action);
  if (!record || !record.loaded || record.failed) return false;
  const frameSize = STATUE_ENEMY_FRAME_SIZE;
  const drawX = Math.round(screenX - renderSize * 0.5);
  const drawY = Math.round(screenY - renderSize * PIVOT_Y);
  const previousSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    record.image,
    frame * frameSize,
    directionIndex * frameSize,
    frameSize,
    frameSize,
    drawX,
    drawY,
    renderSize,
    renderSize
  );
  ctx.imageSmoothingEnabled = previousSmoothing;
  return true;
}

function drawStatuePlaceholder(ctx, screenX, screenY, renderSize, litEyes = true) {
  const half = renderSize * 0.5;
  const ground = screenY;
  const scale = renderSize / STATUE_ENEMY_FRAME_SIZE;
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.ellipse(screenX, ground + 4 * scale, half * 0.42, half * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#53575f";
  ctx.fillRect(Math.round(screenX - 10 * scale), Math.round(ground - 52 * scale), Math.round(20 * scale), Math.round(33 * scale));
  ctx.fillStyle = "#a5a8ad";
  ctx.fillRect(Math.round(screenX - 6 * scale), Math.round(ground - 49 * scale), Math.round(12 * scale), Math.round(24 * scale));
  ctx.fillStyle = "#777b82";
  ctx.fillRect(Math.round(screenX - 7 * scale), Math.round(ground - 70 * scale), Math.round(14 * scale), Math.round(15 * scale));
  ctx.fillStyle = "#6a523b";
  ctx.fillRect(Math.round(screenX + 18 * scale), Math.round(ground - 79 * scale), Math.max(1, Math.round(4 * scale)), Math.round(70 * scale));
  ctx.fillStyle = "#c7ccd5";
  ctx.beginPath();
  ctx.moveTo(screenX + 20 * scale, ground - 92 * scale);
  ctx.lineTo(screenX + 29 * scale, ground - 79 * scale);
  ctx.lineTo(screenX + 11 * scale, ground - 79 * scale);
  ctx.closePath();
  ctx.fill();
  if (litEyes) {
    ctx.fillStyle = "#ff3434";
    ctx.fillRect(Math.round(screenX - 5 * scale), Math.round(ground - 64 * scale), Math.max(1, Math.round(3 * scale)), Math.max(1, Math.round(3 * scale)));
    ctx.fillRect(Math.round(screenX + 3 * scale), Math.round(ground - 64 * scale), Math.max(1, Math.round(3 * scale)), Math.max(1, Math.round(3 * scale)));
  }
}

export function drawStatueArmorStandSprite(ctx, game, stand, screenX, screenY) {
  if (stand?.variant) return false;
  const size = Number.isFinite(stand?.size) ? stand.size : 24;
  const renderSize = Math.max(42, Math.round(size * 2));
  if (drawStatueFrame(ctx, "dormant", 0, 0, screenX, screenY, renderSize)) return true;
  drawStatuePlaceholder(ctx, screenX, screenY, renderSize, !!stand?.animated && !stand?.activated);
  return true;
}

export function drawStatueEnemySprite(ctx, game, enemy, screenX, screenY) {
  if (enemy?.variant) return false;
  const motion = getEnemyMotionVector(enemy);
  const action = getEnemyAction(enemy);
  const sheet = STATUE_ENEMY_SHEETS[action] || STATUE_ENEMY_SHEETS.idle;
  const frame = sheet.loop
    ? Math.floor(Math.max(0, game?.time || 0) * FPS) % sheet.frames
    : Math.min(sheet.frames - 1, Math.floor(Math.max(0, game?.time || 0) * FPS) % sheet.frames);
  const directionIndex = getStatueEnemyDirectionIndex(motion.x, motion.y);
  const size = Number.isFinite(enemy?.size) ? enemy.size : 24;
  const renderSize = Math.max(44, Math.round(size * 2.05));
  if (drawStatueFrame(ctx, action, directionIndex, frame, screenX, screenY, renderSize)) return true;
  drawStatuePlaceholder(ctx, screenX, screenY, renderSize, true);
  return true;
}

export function resetStatueEnemySpriteSheetsForTests() {
  records.clear();
}
