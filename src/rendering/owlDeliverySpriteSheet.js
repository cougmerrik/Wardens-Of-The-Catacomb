const VERONICA_SPRITE_SRC = "./assets/images/veronicaSpriteSheet.svg";
const FRAME_SIZE = 48;
const FRAME_COUNT = 8;

function getSpriteRecord(renderer) {
  if (!renderer || typeof Image === "undefined") return null;
  if (renderer.veronicaSpriteSheet) return renderer.veronicaSpriteSheet;
  const record = { image: new Image(), loaded: false, failed: false };
  record.image.onload = () => {
    record.loaded = true;
  };
  record.image.onerror = () => {
    record.failed = true;
  };
  record.image.src = VERONICA_SPRITE_SRC;
  renderer.veronicaSpriteSheet = record;
  return record;
}

function selectFrame(owl, gameTime) {
  if (owl.state === "slain") return 7;
  if ((owl.underAttackTimer || 0) > 0) return 6;
  if (owl.state === "waiting") return [2, 3, 4, 3][Math.floor(gameTime * 7) % 4];
  if (owl.state === "portal") return 7;
  if (owl.state === "flying") return 2 + (Math.floor(gameTime * 9) % 3);
  return Math.floor(gameTime * 3) % 2;
}

export function drawVeronicaSpriteFrame(renderer, owl, x, y, scale, gameTime) {
  const record = getSpriteRecord(renderer);
  if (!record?.loaded || record.failed) return false;
  const ctx = renderer.ctx;
  const frame = Math.max(0, Math.min(FRAME_COUNT - 1, selectFrame(owl, gameTime)));
  const drawSize = FRAME_SIZE * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(record.image, frame * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE, x - drawSize * 0.5, y - drawSize * 0.55, drawSize, drawSize);
  ctx.restore();
  return true;
}
