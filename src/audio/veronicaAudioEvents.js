const VERONICA_SOUNDS = {
  veronica_entrance: "./assets/sounds/veronica_entrance.mp3",
  veronica_hurt: "./assets/sounds/veronica_hurt.mp3",
  veronica_dead: "./assets/sounds/veronica_dead.mp3"
};

export class VeronicaAudioEvents {
  constructor(createAudio) {
    this.audios = Object.fromEntries(
      Object.entries(VERONICA_SOUNDS).map(([kind, src]) => [kind, createAudio(src, { loop: false })])
    );
    this.playedEventIds = new Set();
    this.lastHurtAtMs = -Infinity;
  }

  refreshVolumes(setAudioBaseVolume, getAudioBaseVolume) {
    for (const audio of Object.values(this.audios || {})) {
      setAudioBaseVolume(audio, getAudioBaseVolume(audio, 1));
    }
  }

  setMuted(muted) {
    for (const audio of Object.values(this.audios || {})) audio.muted = !!muted;
  }

  play(events, { muted, attemptAudioPlay }) {
    if (!Array.isArray(events) || muted) return;
    const nowMs = performance.now();
    for (const event of events) {
      if (!event || typeof event.id !== "string" || this.playedEventIds.has(event.id)) continue;
      const audio = this.audios?.[event.kind];
      if (!audio) continue;
      if (event.kind === "veronica_hurt" && nowMs - this.lastHurtAtMs < 5000) {
        this.playedEventIds.add(event.id);
        continue;
      }
      this.playedEventIds.add(event.id);
      if (this.playedEventIds.size > 80) this.playedEventIds = new Set(Array.from(this.playedEventIds).slice(-40));
      if (event.kind === "veronica_hurt") this.lastHurtAtMs = nowMs;
      audio.pause();
      audio.currentTime = 0;
      attemptAudioPlay(audio, event.kind);
    }
  }
}
