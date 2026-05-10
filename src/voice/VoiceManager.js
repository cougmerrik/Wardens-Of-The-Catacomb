import { AgoraTransport } from "./AgoraTransport.js";
import { AudioGraph } from "./AudioGraph.js";
import { SpatialAudio } from "./SpatialAudio.js";
import {
  getStoredVoiceChatEnabled,
  getStoredVoiceChatMode,
  getStoredVoiceChatPushToTalkKey,
  getStoredVoiceChatVolume,
  normalizeVoiceChatVolume,
  persistVoiceChatEnabled,
  normalizePushToTalkKey,
  normalizeVoiceChatMode,
  persistVoiceChatMode,
  persistVoiceChatPushToTalkKey,
  persistVoiceChatVolume
} from "../audio/audioSettings.js";

export class VoiceManager {
  constructor() {
    this.audioGraph = new AudioGraph();
    this.spatialAudio = new SpatialAudio({ audioGraph: this.audioGraph });
    this.transport = new AgoraTransport({
      onRemoteTrack: (playerId, track) => this.attachRemoteTrack(playerId, track),
      onRemoteLeft: (playerId) => this.audioGraph.disconnectRemote(this.resolvePlayerId(playerId))
    });
    this.config = { enabled: false };
    this.localPlayerId = null;
    this.localVoiceUid = null;
    this.voiceUidToPlayerId = new Map();
    this.state = "disabled";
    this.lastError = "";
    this.userEnabled = getStoredVoiceChatEnabled();
    this.transmissionMode = getStoredVoiceChatMode();
    this.pushToTalkKey = getStoredVoiceChatPushToTalkKey();
    this.keysDown = new Set();
    this.voiceVolume = getStoredVoiceChatVolume();
    this.audioGraph.setVoiceVolume(this.voiceVolume);
    this.handleKeyDown = (event) => this.setPushKeyDown(event, true);
    this.handleKeyUp = (event) => this.setPushKeyDown(event, false);
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", this.handleKeyDown);
      window.addEventListener("keyup", this.handleKeyUp);
      window.addEventListener("blur", () => {
        this.keysDown.clear();
        this.syncMicMutedState();
      });
    }
    this.syncMicMutedState();
  }

  configure(config = {}) {
    if (config && config.enabled) {
      const sameRoom =
        this.config?.enabled &&
        this.config.appId === config.appId &&
        this.config.channel === config.channel;
      this.config = {
        ...config,
        token: config.token || (sameRoom ? this.config.token : null),
        tokenExpiresAt: config.tokenExpiresAt || (sameRoom ? this.config.tokenExpiresAt : 0)
      };
    } else {
      this.config = { enabled: false };
    }
    if (!this.config.enabled || !this.userEnabled) {
      this.state = "disabled";
      this.lastError = "";
    }
  }

  async join({ config = this.config, playerId, voiceUid = null } = {}) {
    this.configure(config);
    this.localPlayerId = typeof playerId === "string" && playerId ? playerId : this.localPlayerId;
    if (Number.isFinite(voiceUid)) this.localVoiceUid = Math.max(1, Math.floor(voiceUid));
    if (!this.userEnabled || !this.config.enabled || !this.localPlayerId) return false;
    this.state = "joining";
    this.lastError = "";
    try {
      await this.audioGraph.resume();
      await this.transport.join({
        appId: this.config.appId,
        channel: this.config.channel,
        token: this.config.token || null,
        uid: this.localVoiceUid || this.localPlayerId,
        sdkUrl: this.config.sdkUrl
      });
      await this.syncMicMutedState();
      this.state = "joined";
      return true;
    } catch (error) {
      this.state = "error";
      this.lastError = this.describeJoinError(error);
      return false;
    }
  }

  describeJoinError(error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("CAN_NOT_GET_GATEWAY_SERVER") || message.includes("dynamic use static key")) {
      return "Agora token required for this App ID. Set AGORA_APP_CERTIFICATE on the server or use an unsecured test App ID.";
    }
    return message;
  }

  syncServerConfig(game, config) {
    if (!config || typeof config !== "object") return;
    this.configure(config);
    if (game) {
      game.networkVoice = this.config;
      game.voiceDebug = this.getDebugState();
    }
  }

  joinServerRoom(game, config, playerId, voiceUid = null) {
    if (!config || typeof config !== "object") return Promise.resolve(false);
    this.syncServerConfig(game, config);
    return this.join({ config: this.config, playerId, voiceUid }).then(() => {
      if (game) game.voiceDebug = this.getDebugState();
    });
  }

  attachRemoteTrack(playerId, track) {
    const resolvedPlayerId = this.resolvePlayerId(playerId);
    if (!resolvedPlayerId || resolvedPlayerId === this.localPlayerId || !track) return;
    if (!this.audioGraph.connectRemoteTrack(resolvedPlayerId, track) && typeof track.play === "function") {
      try {
        track.play();
      } catch {}
    }
  }

  resolvePlayerId(playerId) {
    return this.voiceUidToPlayerId.get(String(playerId)) || playerId;
  }

  syncRoster(players) {
    this.voiceUidToPlayerId.clear();
    for (const player of Array.isArray(players) ? players : []) {
      if (!player || typeof player.id !== "string" || !Number.isFinite(player.voiceUid)) continue;
      const voiceUid = String(Math.floor(player.voiceUid));
      this.voiceUidToPlayerId.set(voiceUid, player.id);
      this.audioGraph.renameRemote(voiceUid, player.id);
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
    this.syncMicMutedState();
  }

  setVoiceVolume(volume, { persist = true } = {}) {
    this.voiceVolume = normalizeVoiceChatVolume(volume);
    this.audioGraph.setVoiceVolume(this.voiceVolume);
    if (persist) persistVoiceChatVolume(this.voiceVolume);
  }

  setTransmissionMode(mode, { persist = true } = {}) {
    this.transmissionMode = normalizeVoiceChatMode(mode);
    if (persist) persistVoiceChatMode(this.transmissionMode);
    this.syncMicMutedState();
  }

  setPushToTalkKey(key, { persist = true } = {}) {
    this.pushToTalkKey = normalizePushToTalkKey(key);
    if (persist) persistVoiceChatPushToTalkKey(this.pushToTalkKey);
    this.syncMicMutedState();
  }

  setPushKeyDown(event, down) {
    if (!event || typeof event.key !== "string") return;
    const key = normalizePushToTalkKey(event.key, "");
    if (!key) return;
    if (down) this.keysDown.add(key);
    else this.keysDown.delete(key);
    if (key === this.pushToTalkKey) this.syncMicMutedState();
  }

  isPushToTalkHeld() {
    return this.keysDown.has(this.pushToTalkKey);
  }

  shouldMuteLocalMic() {
    if (!this.userEnabled) return true;
    if (this.transmissionMode === "muted") return true;
    if (this.transmissionMode === "pushToTalk") return !this.isPushToTalkHeld();
    return false;
  }

  async syncMicMutedState() {
    await this.transport.setMuted(this.shouldMuteLocalMic());
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
      muted: this.shouldMuteLocalMic(),
      transmissionMode: this.transmissionMode,
      pushToTalkKey: this.pushToTalkKey,
      pushToTalkHeld: this.isPushToTalkHeld(),
      volume: this.voiceVolume,
      provider: this.config?.provider || "",
      channel: this.config?.channel || "",
      state: this.state,
      lastError: this.lastError,
      remoteTrackCount: this.audioGraph.remoteNodes.size,
      remoteTrackIds: Array.from(this.audioGraph.remoteNodes.keys()),
      remoteTrackStates: Array.from(this.audioGraph.remoteNodes.entries()).map(([id, entry]) => ({
        id,
        connectedAtMs: entry?.connectedAtMs || 0,
        spatial: this.audioGraph.lastRemoteState.get(id) || null
      })),
      voiceUidMap: Array.from(this.voiceUidToPlayerId.entries()).map(([voiceUid, playerId]) => ({ voiceUid, playerId })),
      localVoiceUid: this.localVoiceUid,
      transportJoined: !!this.transport.joined,
      transportChannel: this.transport.channel || "",
      transportUid: this.transport.uid,
      spatialZone: this.spatialAudio.lastZone?.key || "",
      spatialRemoteCount: this.spatialAudio.lastRemoteCount,
      spatialActiveRemoteIds: this.spatialAudio.lastActiveRemoteIds.slice(),
      spatialRemoteDebug: this.spatialAudio.lastRemoteDebug.slice(),
      spatialUpdatedAtMs: this.spatialAudio.lastUpdateAtMs
    };
  }
}
