import { AgoraTransport } from "./AgoraTransport.js";
import { AudioGraph } from "./AudioGraph.js";
import { SpatialAudio } from "./SpatialAudio.js";
import {
  getStoredVoiceChatEnabled,
  getStoredVoiceChatVolume,
  normalizeVoiceChatVolume,
  persistVoiceChatEnabled,
  persistVoiceChatVolume
} from "../audio/audioSettings.js";

export class VoiceManager {
  constructor() {
    this.audioGraph = new AudioGraph();
    this.spatialAudio = new SpatialAudio({ audioGraph: this.audioGraph });
    this.transport = new AgoraTransport({
      onRemoteTrack: (playerId, track) => this.attachRemoteTrack(playerId, track),
      onRemoteLeft: (playerId) => this.audioGraph.disconnectRemote(playerId)
    });
    this.config = { enabled: false };
    this.localPlayerId = null;
    this.state = "disabled";
    this.lastError = "";
    this.userEnabled = getStoredVoiceChatEnabled();
    this.voiceVolume = getStoredVoiceChatVolume();
    this.audioGraph.setVoiceVolume(this.voiceVolume);
  }

  configure(config = {}) {
    this.config = config && config.enabled ? { ...config } : { enabled: false };
    if (!this.config.enabled || !this.userEnabled) {
      this.state = "disabled";
      this.lastError = "";
    }
  }

  async join({ config = this.config, playerId } = {}) {
    this.configure(config);
    this.localPlayerId = typeof playerId === "string" && playerId ? playerId : this.localPlayerId;
    if (!this.userEnabled || !this.config.enabled || !this.localPlayerId) return false;
    this.state = "joining";
    this.lastError = "";
    try {
      await this.audioGraph.resume();
      await this.transport.join({
        appId: this.config.appId,
        channel: this.config.channel,
        token: this.config.token || null,
        uid: this.localPlayerId,
        sdkUrl: this.config.sdkUrl
      });
      this.state = "joined";
      return true;
    } catch (error) {
      this.state = "error";
      this.lastError = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  syncServerConfig(game, config) {
    if (!config || typeof config !== "object") return;
    this.configure(config);
    if (game) {
      game.networkVoice = this.config;
      game.voiceDebug = this.getDebugState();
    }
  }

  joinServerRoom(game, config, playerId) {
    if (!config || typeof config !== "object") return Promise.resolve(false);
    this.syncServerConfig(game, config);
    return this.join({ config: this.config, playerId }).then(() => {
      if (game) game.voiceDebug = this.getDebugState();
    });
  }

  attachRemoteTrack(playerId, track) {
    if (!playerId || playerId === this.localPlayerId || !track) return;
    if (!this.audioGraph.connectRemoteTrack(playerId, track) && typeof track.play === "function") {
      try {
        track.play();
      } catch {}
    }
  }

  update(game) {
    if (!this.userEnabled || this.state !== "joined") return;
    this.spatialAudio.update(game, this.localPlayerId);
  }

  setUserEnabled(enabled, { persist = true } = {}) {
    this.userEnabled = !!enabled;
    if (persist) persistVoiceChatEnabled(this.userEnabled);
    if (!this.userEnabled) this.leave();
    else if (this.config?.enabled && this.state === "disabled") this.state = "idle";
  }

  setVoiceVolume(volume, { persist = true } = {}) {
    this.voiceVolume = normalizeVoiceChatVolume(volume);
    this.audioGraph.setVoiceVolume(this.voiceVolume);
    if (persist) persistVoiceChatVolume(this.voiceVolume);
  }

  async leave() {
    await this.transport.leave();
    this.audioGraph.disconnectAll();
    this.state = this.config?.enabled ? "idle" : "disabled";
  }

  getDebugState() {
    return {
      enabled: !!this.config?.enabled,
      userEnabled: !!this.userEnabled,
      volume: this.voiceVolume,
      provider: this.config?.provider || "",
      channel: this.config?.channel || "",
      state: this.state,
      lastError: this.lastError,
      remoteTrackCount: this.audioGraph.remoteNodes.size,
      spatialZone: this.spatialAudio.lastZone?.key || ""
    };
  }
}
