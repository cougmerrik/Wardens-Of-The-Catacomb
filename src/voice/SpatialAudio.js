import {
  DEFAULT_PROXIMITY_RULES,
  computeDistanceGain,
  computeOcclusion,
  computeStereoPan
} from "./ProximityRules.js";
import { resolveReverbZone } from "./ReverbZones.js";

export class SpatialAudio {
  constructor({ audioGraph, rules = DEFAULT_PROXIMITY_RULES } = {}) {
    this.audioGraph = audioGraph;
    this.rules = { ...DEFAULT_PROXIMITY_RULES, ...(rules || {}) };
    this.lastZone = null;
    this.lastRemoteCount = 0;
    this.lastActiveRemoteIds = [];
    this.lastRemoteDebug = [];
    this.lastUpdateAtMs = 0;
  }

  findPlayer(game, playerId, localPlayerId = null) {
    if (!playerId) return null;
    if (playerId === localPlayerId && game?.player) return game.player;
    return (Array.isArray(game?.remotePlayers) ? game.remotePlayers : []).find((player) => player?.id === playerId) || null;
  }

  resolveListener(game, localPlayerId = null) {
    const player = game?.player || null;
    if (
      player &&
      player.alive === false &&
      typeof game?.spectateTargetId === "string" &&
      game.spectateTargetId
    ) {
      return this.findPlayer(game, game.spectateTargetId, localPlayerId) || player;
    }
    return player;
  }

  resolveVoiceSource(game, remote, localPlayerId = null) {
    if (
      remote?.alive === false &&
      typeof remote.spectateTargetId === "string" &&
      remote.spectateTargetId
    ) {
      return this.findPlayer(game, remote.spectateTargetId, localPlayerId) || remote;
    }
    return remote;
  }

  update(game, localPlayerId = null) {
    if (!this.audioGraph || !game?.player) return;
    const listener = this.resolveListener(game, localPlayerId);
    if (!listener) return;
    const remotePlayers = Array.isArray(game.remotePlayers) ? game.remotePlayers : [];
    this.lastRemoteCount = remotePlayers.length;
    if (remotePlayers.length === 0) return;
    const activeRemoteIds = new Set();
    const remoteDebug = [];
    this.lastZone = resolveReverbZone(game, listener);
    this.lastUpdateAtMs = Date.now();
    for (const remote of remotePlayers) {
      if (!remote || typeof remote.id !== "string" || remote.id === localPlayerId) continue;
      activeRemoteIds.add(remote.id);
      const source = this.resolveVoiceSource(game, remote, localPlayerId);
      const distance = Math.hypot((source.x || 0) - (listener.x || 0), (source.y || 0) - (listener.y || 0));
      const spectatorBlocked =
        remote.alive === false &&
        typeof remote.spectateTargetId === "string" &&
        localPlayerId &&
        remote.spectateTargetId !== localPlayerId;
      const occlusion = computeOcclusion(game, listener, source, this.rules);
      const gain = spectatorBlocked ? 0 : computeDistanceGain(distance, this.rules) * occlusion.gain;
      const pan = computeStereoPan(listener, source);
      remoteDebug.push({
        id: remote.id,
        sourceId: source?.id || remote.id,
        distancePx: Math.round(distance),
        distanceTiles: Math.round((distance / (game.config?.map?.tile || 32)) * 10) / 10,
        gain: Math.round(gain * 1000) / 1000,
        pan: Math.round(pan * 1000) / 1000,
        filterFrequency: occlusion.filterFrequency,
        occlusionGain: occlusion.gain,
        spectatorBlocked
      });
      this.audioGraph.updateRemote(remote.id, {
        gain,
        pan,
        filterFrequency: occlusion.filterFrequency
      });
    }
    this.lastActiveRemoteIds = Array.from(activeRemoteIds);
    this.lastRemoteDebug = remoteDebug;
    this.audioGraph.retainRemotePlayers(activeRemoteIds);
  }
}
