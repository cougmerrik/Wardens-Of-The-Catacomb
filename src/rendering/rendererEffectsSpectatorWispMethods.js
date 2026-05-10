export const rendererEffectsSpectatorWispMethods = {
  getSpectatorWispAnchorOffset(spectatorId, targetSize = 22) {
    const slots = [
      { x: 0, y: -1.25 },
      { x: -1.08, y: -0.55 },
      { x: 1.08, y: -0.55 },
      { x: -0.72, y: 0.78 },
      { x: 0.72, y: 0.78 }
    ];
    const text = typeof spectatorId === "string" && spectatorId ? spectatorId : "spectator";
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
    const slot = slots[Math.abs(hash) % slots.length];
    const radius = Math.max(18, targetSize * 1.15);
    return { x: slot.x * radius, y: slot.y * radius };
  },

  getSpectatorWispEntries(game) {
    if (!game?.networkEnabled) return [];
    const entries = [];
    const roster = Array.isArray(game.networkRosterPlayers) ? game.networkRosterPlayers : [];
    const localId = typeof game.networkLocalPlayerId === "string" ? game.networkLocalPlayerId : "";
    const localDead = Number.isFinite(game.player?.health) ? game.player.health <= 0 : game.player?.alive === false;
    if (localDead && typeof game.spectateTargetId === "string" && game.spectateTargetId) {
      const localRoster = roster.find((player) => player?.id === localId) || null;
      entries.push({ id: localId || "local", targetId: game.spectateTargetId, color: localRoster?.color || "#58a6ff" });
    }
    for (const player of Array.isArray(game.remotePlayers) ? game.remotePlayers : []) {
      if (!player || player.alive !== false || typeof player.spectateTargetId !== "string" || !player.spectateTargetId) continue;
      entries.push({ id: player.id || `remote-${entries.length}`, targetId: player.spectateTargetId, color: player.color || "#58a6ff" });
    }
    return entries;
  },

  findSpectatorWispTarget(game, targetId) {
    if (!targetId) return null;
    const localId = typeof game.networkLocalPlayerId === "string" ? game.networkLocalPlayerId : "";
    const localAlive = Number.isFinite(game.player?.health) ? game.player.health > 0 : game.player?.alive !== false;
    if (targetId === localId && localAlive) return game.player;
    return (Array.isArray(game.remotePlayers) ? game.remotePlayers : []).find((player) => player?.id === targetId && player.alive !== false) || null;
  },

  drawSpectatorWisps(game, cameraX, cameraY) {
    const entries = this.getSpectatorWispEntries(game);
    if (entries.length === 0) return;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (!game.spectatorWispRenderState || typeof game.spectatorWispRenderState !== "object") game.spectatorWispRenderState = {};
    const activeIds = new Set();
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      const target = this.findSpectatorWispTarget(game, entry.targetId);
      if (!target) continue;
      activeIds.add(entry.id);
      const offset = this.getSpectatorWispAnchorOffset(entry.id, target.size || 22);
      const state = this.updateSpectatorWispState(game, entry, { x: target.x + offset.x, y: target.y + offset.y }, now);
      this.drawSpectatorWisp(state.x - cameraX, state.y - cameraY - 30, entry.color, state.alpha, now * 0.001 + i);
    }
    for (const id of Object.keys(game.spectatorWispRenderState)) {
      if (!activeIds.has(id)) delete game.spectatorWispRenderState[id];
    }
  },

  updateSpectatorWispState(game, entry, target, now) {
    const state = game.spectatorWispRenderState[entry.id] || {
      targetId: entry.targetId,
      pendingTargetId: "",
      phase: "fadeIn",
      alpha: 0,
      x: target.x,
      y: target.y,
      lastAt: now
    };
    const dt = Math.min(0.08, Math.max(0, (now - (state.lastAt || now)) / 1000));
    state.lastAt = now;
    if (entry.targetId !== state.targetId && entry.targetId !== state.pendingTargetId) {
      state.pendingTargetId = entry.targetId;
      state.phase = "fadeOut";
    }
    if (state.phase === "fadeOut") {
      state.alpha = Math.max(0, state.alpha - dt * 3.2);
      if (state.alpha <= 0.01) {
        state.targetId = state.pendingTargetId || entry.targetId;
        state.pendingTargetId = "";
        state.phase = "fadeIn";
        state.x = target.x;
        state.y = target.y;
      }
    } else {
      state.alpha = Math.min(1, state.alpha + dt * 2.8);
      state.x = target.x;
      state.y = target.y;
    }
    game.spectatorWispRenderState[entry.id] = state;
    return state;
  },

  drawSpectatorWisp(screenX, screenY, color, alpha = 1, time = 0) {
    if (alpha <= 0.01) return;
    const ctx = this.ctx;
    const bob = Math.sin(time * 3.2) * 2.2;
    const pulse = 0.68 + Math.sin(time * 4.6) * 0.12;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(0.58, alpha * 0.58));
    ctx.translate(screenX, screenY + bob);
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    const glow = ctx.createRadialGradient(0, 0, 1.5, 0, 0, 11);
    glow.addColorStop(0, color);
    glow.addColorStop(0.48, color);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(0, 0, 7 * pulse, 9 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(235, 246, 255, 0.42)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
};
