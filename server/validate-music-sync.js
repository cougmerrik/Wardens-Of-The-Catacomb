import assert from "node:assert/strict";

let documentHasFocus = true;
const listenersByAudio = new WeakMap();

class FakeAudio {
  constructor(src) {
    this.src = src;
    this.currentSrc = src;
    this.paused = true;
    this.loop = false;
    this.preload = "";
    this.readyState = 4;
    this.volume = 1;
    this.muted = false;
    this._currentTime = 0;
    listenersByAudio.set(this, new Map());
  }

  get currentTime() {
    return this._currentTime;
  }

  set currentTime(value) {
    const next = Number.isFinite(value) ? Math.max(0, value) : 0;
    if (next !== this._currentTime) {
      this._currentTime = next;
      this.dispatchEvent("seeking");
    }
  }

  addEventListener(type, listener) {
    const listeners = listenersByAudio.get(this);
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(listener);
  }

  removeEventListener(type, listener) {
    listenersByAudio.get(this)?.get(type)?.delete(listener);
  }

  dispatchEvent(type) {
    for (const listener of listenersByAudio.get(this)?.get(type) || []) listener();
  }

  play() {
    this.paused = false;
    this.dispatchEvent("play");
    return Promise.resolve();
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    this.dispatchEvent("pause");
  }
}

globalThis.Audio = FakeAudio;
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
globalThis.window = {
  __WOTC_MASTER_VOLUME__: 0,
  addEventListener: () => {},
  removeEventListener: () => {}
};
globalThis.document = {
  visibilityState: "visible",
  hasFocus: () => documentHasFocus,
  addEventListener: () => {},
  removeEventListener: () => {}
};
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};

const { MusicController } = await import("../src/audio/MusicController.js");
const { syncMusicForGame } = await import("../src/bootstrap/gameUiRuntime.js");

function makeGame(overrides = {}) {
  return {
    floor: 3,
    paused: false,
    gameOver: false,
    networkEnabled: true,
    musicTrack: { title: "Evil Lair", src: "./assets/music/Evil%20Lair.mp3" },
    floorBoss: null,
    ...overrides
  };
}

function validatePausedSyncDoesNotChurn() {
  documentHasFocus = true;
  const music = new MusicController();
  const game = makeGame({ paused: true });
  syncMusicForGame(music, false, game);
  const baseline = music.getDebugState();
  for (let i = 0; i < 20; i += 1) syncMusicForGame(music, false, game);
  const after = music.getDebugState();
  assert.equal(after.currentMode, "gameplay", "paused sync should still select gameplay music");
  assert.equal(after.currentTrackPaused, true, "paused sync should leave gameplay music paused");
  assert.equal(after.playAttempts, baseline.playAttempts, "paused sync should not repeat play attempts");
  assert.equal(after.pauseCalls, baseline.pauseCalls, "paused sync should not repeat pause events");
  assert.equal(after.seekCount, baseline.seekCount, "paused sync should not repeat seek resets");
}

function validateUnfocusedSyncDoesNotChurn() {
  documentHasFocus = false;
  const music = new MusicController();
  const game = makeGame();
  syncMusicForGame(music, false, game);
  const baseline = music.getDebugState();
  for (let i = 0; i < 20; i += 1) syncMusicForGame(music, false, game);
  const after = music.getDebugState();
  assert.equal(after.currentTrackPaused, true, "unfocused sync should leave gameplay music paused");
  assert.equal(after.playAttempts, baseline.playAttempts, "unfocused sync should not repeat play attempts");
  assert.equal(after.pauseCalls, baseline.pauseCalls, "unfocused sync should not repeat pause events");
  assert.equal(after.seekCount, baseline.seekCount, "unfocused sync should not repeat seek resets");
}

function validateFocusedSyncPlaysOnce() {
  documentHasFocus = true;
  const music = new MusicController();
  const game = makeGame();
  syncMusicForGame(music, false, game);
  const baseline = music.getDebugState();
  for (let i = 0; i < 20; i += 1) syncMusicForGame(music, false, game);
  const after = music.getDebugState();
  assert.equal(after.currentTrackPaused, false, "focused sync should play gameplay music");
  assert.ok(after.playAttempts <= baseline.playAttempts + 1, "focused sync should not restart music every sync");
  assert.equal(after.seekCount, baseline.seekCount, "focused sync should not repeat seek resets");
}

validatePausedSyncDoesNotChurn();
validateUnfocusedSyncDoesNotChurn();
validateFocusedSyncPlaysOnce();

console.log(JSON.stringify({ musicSync: "ok" }, null, 2));
