const BRAZIER_SHEET_PATH = "./assets/images/environment/catacomb/brazier/catacomb_brazier_states_17f_48.png";
const FRAME_SIZE = 48;
const LIT_FIRST_FRAME = 5;
const LIT_FRAME_COUNT = 6;
const IGNITE_FIRST_FRAME = 1;
const IGNITE_FRAME_COUNT = 4;
const EXTINGUISH_FIRST_FRAME = 11;
const EXTINGUISH_FRAME_COUNT = 6;
const IGNITE_FRAME_MS = 100;
const DEFAULT_FRAME_MS = 125;

let sheetRecord = null;
const playbackById = new Map();

function getSheetRecord() {
  if (sheetRecord) return sheetRecord;
  if (typeof Image !== "function") return null;
  const record = { image: new Image(), loaded: false, failed: false };
  record.image.addEventListener("load", () => { record.loaded = true; }, { once: true });
  record.image.addEventListener("error", () => { record.failed = true; }, { once: true });
  record.image.src = BRAZIER_SHEET_PATH;
  sheetRecord = record;
  return record;
}

function getPlayback(torch, nowMs) {
  const id = typeof torch?.id === "string" ? torch.id : "__anonymous_brazier";
  const lit = torch?.lit !== false;
  let playback = playbackById.get(id);
  if (!playback) {
    playback = { lit, transition: null, changedAtMs: nowMs };
    playbackById.set(id, playback);
  } else if (playback.lit !== lit) {
    playback.lit = lit;
    playback.transition = lit ? "ignite" : "extinguish";
    const authoritativeChangedAtMs = Number.isFinite(torch?.litChangedAt) ? Math.max(0, torch.litChangedAt * 1000) : nowMs;
    playback.changedAtMs = Math.min(nowMs, authoritativeChangedAtMs);
  }
  return playback;
}

export function getBrazierFrame(torch, timeSeconds = 0) {
  const nowMs = Math.max(0, Number.isFinite(timeSeconds) ? timeSeconds * 1000 : 0);
  const playback = getPlayback(torch, nowMs);
  const elapsedMs = Math.max(0, nowMs - playback.changedAtMs);
  if (playback.transition === "ignite") {
    const offset = Math.floor(elapsedMs / IGNITE_FRAME_MS);
    if (offset < IGNITE_FRAME_COUNT) return IGNITE_FIRST_FRAME + offset;
    playback.transition = null;
  } else if (playback.transition === "extinguish") {
    const offset = Math.floor(elapsedMs / DEFAULT_FRAME_MS);
    if (offset < EXTINGUISH_FRAME_COUNT) return EXTINGUISH_FIRST_FRAME + offset;
    playback.transition = null;
  }
  if (!playback.lit) return 0;
  return LIT_FIRST_FRAME + Math.floor(nowMs / DEFAULT_FRAME_MS) % LIT_FRAME_COUNT;
}

export function drawBrazierSprite(ctx, game, torch, screenX, screenY) {
  if (torch?.variant !== "brazier") return false;
  const record = getSheetRecord();
  if (!record || !record.loaded || record.failed) return false;
  const frame = getBrazierFrame(torch, game?.time);
  const tile = Number.isFinite(game?.config?.map?.tile) ? game.config.map.tile : 32;
  const renderSize = Math.max(32, Math.round(tile * 1.5));
  const previousSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    record.image,
    frame * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE,
    Math.round(screenX - renderSize * 0.5), Math.round(screenY - renderSize * 0.68), renderSize, renderSize
  );
  ctx.imageSmoothingEnabled = previousSmoothing;
  return true;
}

export function resetBrazierSpritePlaybackForTests() {
  playbackById.clear();
  sheetRecord = null;
}
