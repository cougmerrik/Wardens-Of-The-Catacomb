function setParam(param, value, audioContext, smoothingSec = 0.08) {
  if (!param) return;
  const next = Number.isFinite(value) ? value : 0;
  try {
    param.setTargetAtTime(next, audioContext.currentTime, smoothingSec);
  } catch {
    param.value = next;
  }
}

export class AudioGraph {
  constructor({ audioContext = null } = {}) {
    const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
    this.audioContext = audioContext || (Ctor ? new Ctor() : null);
    this.remoteNodes = new Map();
    this.lastRemoteState = new Map();
    this.voiceVolume = 1;
  }

  get available() {
    return !!this.audioContext;
  }

  async resume() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      await this.audioContext.resume().catch(() => {});
    }
  }

  connectRemoteTrack(playerId, remoteAudioTrack) {
    if (!this.audioContext || !playerId || !remoteAudioTrack) return false;
    this.disconnectRemote(playerId);
    const mediaTrack =
      typeof remoteAudioTrack.getMediaStreamTrack === "function" ? remoteAudioTrack.getMediaStreamTrack() : null;
    if (!mediaTrack) return false;
    const stream = new MediaStream([mediaTrack]);
    const source = this.audioContext.createMediaStreamSource(stream);
    const gain = this.audioContext.createGain();
    const panner = typeof this.audioContext.createStereoPanner === "function" ? this.audioContext.createStereoPanner() : null;
    const filter = this.audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 16000;
    filter.Q.value = 0.0001;
    if (panner) {
      source.connect(gain);
      gain.connect(filter);
      filter.connect(panner);
      panner.connect(this.audioContext.destination);
    } else {
      source.connect(gain);
      gain.connect(filter);
      filter.connect(this.audioContext.destination);
    }
    this.remoteNodes.set(playerId, { source, gain, panner, filter, stream, remoteAudioTrack, connectedAtMs: Date.now() });
    return true;
  }

  updateRemote(playerId, { gain = 1, pan = 0, filterFrequency = 16000 } = {}) {
    const entry = this.remoteNodes.get(playerId);
    if (!entry || !this.audioContext) return;
    const remoteGain = Math.max(0, Math.min(1, gain));
    const finalGain = remoteGain * this.voiceVolume;
    const nextPan = Math.max(-1, Math.min(1, pan));
    const nextFilterFrequency = Math.max(280, Math.min(16000, filterFrequency));
    setParam(entry.gain?.gain, finalGain, this.audioContext);
    if (entry.panner) setParam(entry.panner.pan, nextPan, this.audioContext);
    if (entry.filter) setParam(entry.filter.frequency, nextFilterFrequency, this.audioContext, 0.12);
    this.lastRemoteState.set(playerId, {
      gain: remoteGain,
      finalGain,
      pan: nextPan,
      filterFrequency: nextFilterFrequency,
      updatedAtMs: Date.now()
    });
  }

  setVoiceVolume(volume) {
    this.voiceVolume = Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 1));
  }

  disconnectRemote(playerId) {
    const entry = this.remoteNodes.get(playerId);
    if (!entry) return;
    for (const node of [entry.source, entry.gain, entry.filter, entry.panner]) {
      if (node && typeof node.disconnect === "function") {
        try {
          node.disconnect();
        } catch {}
      }
    }
    this.remoteNodes.delete(playerId);
    this.lastRemoteState.delete(playerId);
  }

  renameRemote(oldPlayerId, nextPlayerId) {
    if (!oldPlayerId || !nextPlayerId || oldPlayerId === nextPlayerId) return false;
    const entry = this.remoteNodes.get(oldPlayerId);
    if (!entry) return false;
    if (this.remoteNodes.has(nextPlayerId)) this.disconnectRemote(nextPlayerId);
    this.remoteNodes.delete(oldPlayerId);
    this.remoteNodes.set(nextPlayerId, entry);
    const state = this.lastRemoteState.get(oldPlayerId);
    if (state) {
      this.lastRemoteState.delete(oldPlayerId);
      this.lastRemoteState.set(nextPlayerId, state);
    }
    return true;
  }

  retainRemotePlayers(playerIds) {
    const keep = playerIds instanceof Set ? playerIds : new Set(playerIds || []);
    for (const playerId of Array.from(this.remoteNodes.keys())) {
      if (!keep.has(playerId)) this.disconnectRemote(playerId);
    }
  }

  disconnectAll() {
    for (const playerId of Array.from(this.remoteNodes.keys())) this.disconnectRemote(playerId);
  }
}
