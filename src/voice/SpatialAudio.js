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

  update(game, localPlayerId = null) {
    if (!this.audioGraph || !game?.player) return;
    const listener = game.player;
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
      const distance = Math.hypot((remote.x || 0) - (listener.x || 0), (remote.y || 0) - (listener.y || 0));
      const spectatorBlocked =
        remote.alive === false &&
        typeof remote.spectateTargetId === "string" &&
        localPlayerId &&
        remote.spectateTargetId !== localPlayerId;
      const occlusion = computeOcclusion(game, listener, remote, this.rules);
      const gain = spectatorBlocked ? 0 : computeDistanceGain(distance, this.rules) * occlusion.gain;
      const pan = computeStereoPan(listener, remote);
      remoteDebug.push({
        id: remote.id,
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
