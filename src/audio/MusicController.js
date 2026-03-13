const TITLE_TRACK = {
  title: "Ward the Catacombs",
  src: "./assets/Ward%20the%20Catacombs.mp3"
};

const GAMEPLAY_TRACKS = [
  {
    title: "Evil Lair",
    src: "./assets/Evil%20Lair.mp3"
  },
  {
    title: "Hidden Danger",
    src: "./assets/Hidden%20Danger.mp3"
  },
  {
    title: "The Crypt",
    src: "./assets/The%20Crypt.mp3"
  }
];

const TRACKS = [TITLE_TRACK, ...GAMEPLAY_TRACKS];
const FADE_DURATION_MS = 900;

export class MusicController {
  constructor() {
    this.tracks = TRACKS.map((track) => ({
      ...track,
      audio: this.createAudio(track.src)
    }));
    this.currentTrack = null;
    this.currentMode = "menu";
    this.currentFloor = null;
    this.muted = false;
    this.fadeRaf = 0;
    this.transitionToken = 0;

    this.handleUnlock = this.handleUnlock.bind(this);
    this.handleMuteToggle = this.handleMuteToggle.bind(this);

    window.addEventListener("pointerdown", this.handleUnlock, { passive: true });
    window.addEventListener("keydown", this.handleUnlock);
    window.addEventListener("keydown", this.handleMuteToggle);
  }

  createAudio(src) {
    const audio = new Audio(src);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 1;
    return audio;
  }

  resolveTrack(trackLike) {
    if (!trackLike) return null;
    const title = typeof trackLike.title === "string" ? trackLike.title : null;
    const src = typeof trackLike.src === "string" ? trackLike.src : null;
    return this.tracks.find((track) => (title && track.title === title) || (src && track.src === src)) || null;
  }

  cancelFade() {
    this.transitionToken += 1;
    if (this.fadeRaf) {
      cancelAnimationFrame(this.fadeRaf);
      this.fadeRaf = 0;
    }
  }

  handleUnlock() {
    if (this.muted) return;
    if (this.currentTrack?.audio?.paused) this.playCurrentTrack();
  }

  handleMuteToggle(event) {
    if (!event || typeof event.key !== "string") return;
    if (event.key.toLowerCase() !== "m" || event.repeat) return;
    this.setMuted(!this.muted);
  }

  setMuted(muted) {
    this.muted = !!muted;
    for (const track of this.tracks) track.audio.muted = this.muted;
    if (this.muted) {
      this.cancelFade();
      this.pauseCurrentTrack();
      return;
    }
    this.playCurrentTrack();
  }

  pauseCurrentTrack() {
    this.cancelFade();
    if (this.currentTrack?.audio) {
      this.currentTrack.audio.pause();
      this.currentTrack.audio.volume = 1;
    }
  }

  playCurrentTrack({ reset = false } = {}) {
    if (!this.currentTrack || this.muted) return;
    const audio = this.currentTrack.audio;
    if (reset) audio.currentTime = 0;
    audio.volume = 1;
    const playAttempt = audio.play();
    if (playAttempt && typeof playAttempt.catch === "function") playAttempt.catch(() => {});
  }

  fadeAudio(audio, from, to, durationMs, token, onDone) {
    const startedAt = performance.now();
    const step = (now) => {
      if (token !== this.transitionToken) return;
      const elapsed = Math.max(0, now - startedAt);
      const progress = durationMs <= 0 ? 1 : Math.min(1, elapsed / durationMs);
      audio.volume = from + (to - from) * progress;
      if (progress >= 1) {
        this.fadeRaf = 0;
        if (typeof onDone === "function") onDone();
        return;
      }
      this.fadeRaf = requestAnimationFrame(step);
    };
    this.fadeRaf = requestAnimationFrame(step);
  }

  transitionToTrack(track, { reset = true, immediate = false } = {}) {
    if (!track) return;
    const previousTrack = this.currentTrack;
    const previousAudio = previousTrack?.audio || null;
    const nextAudio = track.audio;

    if (this.muted) {
      this.cancelFade();
      if (previousAudio && previousAudio !== nextAudio) {
        previousAudio.pause();
        previousAudio.volume = 1;
      }
      this.currentTrack = track;
      if (reset) nextAudio.currentTime = 0;
      nextAudio.volume = 1;
      return;
    }

    if (!previousAudio || immediate) {
      this.cancelFade();
      if (previousAudio && previousAudio !== nextAudio) {
        previousAudio.pause();
        previousAudio.volume = 1;
      }
      this.currentTrack = track;
      nextAudio.volume = 1;
      this.playCurrentTrack({ reset });
      return;
    }

    if (previousTrack === track && !reset) {
      this.playCurrentTrack();
      return;
    }

    this.cancelFade();
    const token = this.transitionToken;

    this.fadeAudio(previousAudio, previousAudio.volume, 0, FADE_DURATION_MS * 0.5, token, () => {
      previousAudio.pause();
      previousAudio.volume = 1;
      this.currentTrack = track;
      if (reset) nextAudio.currentTime = 0;
      nextAudio.volume = 0;
      const playAttempt = nextAudio.play();
      if (playAttempt && typeof playAttempt.catch === "function") playAttempt.catch(() => {});
      this.fadeAudio(nextAudio, 0, 1, FADE_DURATION_MS * 0.5, token, () => {
        nextAudio.volume = 1;
      });
    });
  }

  playMenuMusic() {
    this.currentMode = "menu";
    this.currentFloor = null;
    this.transitionToTrack(this.resolveTrack(TITLE_TRACK), {
      reset: false,
      immediate: !this.currentTrack
    });
  }

  playGameplayMusic(floor, trackLike = null) {
    const normalizedFloor = Number.isFinite(floor) ? Math.max(1, Math.floor(floor)) : 1;
    const floorChanged = this.currentMode !== "gameplay" || this.currentFloor !== normalizedFloor;
    this.currentMode = "gameplay";
    this.currentFloor = normalizedFloor;
    const nextTrack = trackLike
      ? this.resolveTrack(trackLike)
      : floorChanged
      ? this.resolveTrack(GAMEPLAY_TRACKS[Math.floor(Math.random() * Math.max(1, GAMEPLAY_TRACKS.length))] || TITLE_TRACK)
      : this.currentTrack;
    if (!nextTrack) return;
    this.transitionToTrack(nextTrack, {
      reset: floorChanged || !!trackLike,
      immediate: !this.currentTrack
    });
  }
}
