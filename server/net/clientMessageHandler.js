import { normalizeBoardType, sanitizeHandle } from "../leaderboardStore.js";
import { enqueueClientInput, getProcessedInputSeq } from "./clientInputQueue.js";

export function handleActionMessage(room, clientId, action) {
  if (!action || typeof action !== "object" || typeof action.kind !== "string") return;
  const kind = action.kind;
  const sim = room.sim;
  const isPauseOwner = room.pauseOwnerId === clientId;
  const playerAlive = (sim.player?.health || 0) > 0;
  const syncPauseOwnerActiveState = () => {
    if (room.phase !== "active" || typeof room.syncPrimaryActivePlayerFromSim !== "function") return;
    room.syncPrimaryActivePlayerFromSim();
  };
  if (kind === "togglePause") {
    if (!isPauseOwner) return;
    if (sim.skillTreeOpen) {
      sim.toggleSkillTree(false);
      sim.paused = false;
    }
    else if (sim.statsPanelOpen) sim.toggleStatsPanel(false);
    else if (!sim.gameOver) sim.paused = !sim.paused;
    return;
  }
  if (kind === "toggleShop") {
    if (!isPauseOwner) return;
    if (!playerAlive) return;
    const nextOpen = !sim.shopOpen;
    sim.toggleShop(nextOpen);
    return;
  }
  if (kind === "closeShop") {
    if (!isPauseOwner) return;
    sim.toggleShop(false);
    return;
  }
  if (kind === "toggleSkillTree") {
    if (!isPauseOwner) return;
    if (!playerAlive) return;
    const nextOpen = !sim.skillTreeOpen;
    sim.toggleSkillTree(nextOpen);
    sim.paused = nextOpen;
    return;
  }
  if (kind === "closeSkillTree") {
    if (!isPauseOwner) return;
    sim.toggleSkillTree(false);
    sim.paused = false;
    return;
  }
  if (kind === "toggleStats") {
    if (!isPauseOwner) return;
    sim.toggleStatsPanel();
    return;
  }
  if (kind === "closeStats") {
    if (!isPauseOwner) return;
    sim.toggleStatsPanel(false);
    return;
  }
  if (kind === "setStatsView" && (action.view === "run" || action.view === "character")) {
    if (!isPauseOwner) return;
    sim.statsPanelView = action.view;
    return;
  }
  if (kind === "buyUpgrade" && typeof action.key === "string") {
    if (isPauseOwner) {
      if (!playerAlive) return;
      sim.buyUpgrade(action.key);
      syncPauseOwnerActiveState();
      return;
    }
    if (room.phase !== "active" || typeof room.performActionForActivePlayer !== "function") return;
    room.performActionForActivePlayer(clientId, (context) => {
      if (typeof context.buyUpgrade !== "function") return false;
      return context.buyUpgrade(action.key);
    });
    return;
  }
  if (kind === "useConsumableSlot" && Number.isFinite(action.slot)) {
    const slot = Math.max(0, Math.min(4, Math.floor(action.slot)));
    if (isPauseOwner) {
      if (!playerAlive) return;
      if (typeof sim.useConsumableSlot === "function") sim.useConsumableSlot(slot);
      return;
    }
    if (room.phase !== "active" || typeof room.performActionForActivePlayer !== "function") return;
    room.performActionForActivePlayer(clientId, (context) => {
      if (typeof context.useConsumableSlot !== "function") return false;
      return context.useConsumableSlot(slot);
    });
    return;
  }
  if (kind === "spendSkill" && typeof action.key === "string") {
    if (isPauseOwner) {
      if (!playerAlive) return;
      sim.spendSkillPoint(action.key);
      syncPauseOwnerActiveState();
      return;
    }
    if (room.phase !== "active" || typeof room.performActionForActivePlayer !== "function") return;
    room.performActionForActivePlayer(clientId, (context) => {
      if (typeof context.spendSkillPoint !== "function") return false;
      return context.spendSkillPoint(action.key);
    });
    return;
  }
  if (kind === "refundSkills") {
    if (isPauseOwner) {
      if (!playerAlive) return;
      if (typeof sim.refundAllSkills !== "function") return;
      sim.refundAllSkills();
      syncPauseOwnerActiveState();
      return;
    }
    if (room.phase !== "active" || typeof room.performActionForActivePlayer !== "function") return;
    room.performActionForActivePlayer(clientId, (context) => {
      if (typeof context.refundAllSkills !== "function") return false;
      return context.refundAllSkills();
    });
    return;
  }
  if (kind === "debugGrantProgress") {
    const goldDelta = Number.isFinite(action.goldDelta) ? Math.max(0, Math.floor(action.goldDelta)) : 0;
    const skillPointDelta = Number.isFinite(action.skillPointDelta) ? Math.max(0, Math.floor(action.skillPointDelta)) : 0;
    const levelDelta = Number.isFinite(action.levelDelta) ? Math.max(0, Math.floor(action.levelDelta)) : 0;
    if (goldDelta <= 0 && skillPointDelta <= 0 && levelDelta <= 0) return;
    if (isPauseOwner) {
      if (!playerAlive) return;
      sim.gold = Math.max(0, (Number.isFinite(sim.gold) ? sim.gold : 0) + goldDelta);
      sim.skillPoints = Math.max(0, (Number.isFinite(sim.skillPoints) ? sim.skillPoints : 0) + skillPointDelta);
      sim.level = Math.max(1, (Number.isFinite(sim.level) ? sim.level : 1) + levelDelta);
      if (sim.player) sim.player.level = sim.level;
      syncPauseOwnerActiveState();
      return;
    }
    const activeState = room.activePlayers instanceof Map ? room.activePlayers.get(clientId) : null;
    if (activeState) {
      activeState.gold = Math.max(0, (Number.isFinite(activeState.gold) ? activeState.gold : 0) + goldDelta);
      activeState.skillPoints = Math.max(0, (Number.isFinite(activeState.skillPoints) ? activeState.skillPoints : 0) + skillPointDelta);
      activeState.level = Math.max(1, (Number.isFinite(activeState.level) ? activeState.level : 1) + levelDelta);
      return;
    }
    if (room.phase !== "active" || typeof room.performActionForActivePlayer !== "function") return;
    room.performActionForActivePlayer(clientId, (context) => {
      context.gold = Math.max(0, (Number.isFinite(context.gold) ? context.gold : 0) + goldDelta);
      context.skillPoints = Math.max(0, (Number.isFinite(context.skillPoints) ? context.skillPoints : 0) + skillPointDelta);
      context.level = Math.max(1, (Number.isFinite(context.level) ? context.level : 1) + levelDelta);
      if (context.player) context.player.level = context.level;
      return true;
    });
    return;
  }
  if (kind === "debugSetPlayerHealth") {
    const nextHealth = Number.isFinite(action.health) ? Math.max(0, action.health) : NaN;
    if (!Number.isFinite(nextHealth)) return;
    if (isPauseOwner) {
      sim.player.health = Math.min(sim.player.maxHealth || nextHealth, nextHealth);
      if (sim.player.health <= 0 && typeof sim.triggerGameOver === "function") sim.triggerGameOver();
      syncPauseOwnerActiveState();
      return;
    }
    const activeState = room.activePlayers instanceof Map ? room.activePlayers.get(clientId) : null;
    if (!activeState) return;
    activeState.health = Math.min(activeState.maxHealth || nextHealth, nextHealth);
    activeState.alive = activeState.health > 0;
    return;
  }
}

export function handleClientMessage(raw, context) {
  const {
    ws,
    client,
    rooms,
    getOrCreateRoom,
    normClassType,
    maxPeersPerRoom,
    makeDefaultInput,
    resetClientInputState,
    sanitizeInput,
    serializeState,
    buildJoinKeyframeState,
    safeSend,
    leaderboardStore
  } = context;

  let msg = null;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    safeSend(ws, { type: "error", message: "Invalid JSON" });
    return;
  }

  if (!msg || typeof msg !== "object" || typeof msg.type !== "string") {
    safeSend(ws, { type: "error", message: "Malformed message" });
    return;
  }

  if (msg.type === "leaderboard.get") {
    const boardType = normalizeBoardType(msg.boardType);
    safeSend(ws, {
      type: "leaderboard.rows",
      requestId: typeof msg.requestId === "string" ? msg.requestId : "",
      rows: leaderboardStore ? leaderboardStore.getRows(boardType) : []
    });
    return;
  }

  if (msg.type === "leaderboard.submit") {
    const run = msg.run && typeof msg.run === "object" ? msg.run : null;
    if (!run) {
      safeSend(ws, {
        type: "error",
        requestId: typeof msg.requestId === "string" ? msg.requestId : "",
        message: "Missing leaderboard run payload"
      });
      return;
    }
    const rows = leaderboardStore ? leaderboardStore.submitRun({ ...run, boardType: msg.boardType || run.boardType }) : [];
    safeSend(ws, {
      type: "leaderboard.rows",
      requestId: typeof msg.requestId === "string" ? msg.requestId : "",
      accepted: true,
      rows
    });
    return;
  }

  if (msg.type === "join") {
    const roomId = typeof msg.roomId === "string" && msg.roomId.trim() ? msg.roomId.trim().slice(0, 32) : "lobby";
    const classType = normClassType(msg.classType);
    const room = getOrCreateRoom(roomId, classType);
    if (!room) {
      safeSend(ws, { type: "error", message: "Room limit reached" });
      return;
    }
    if (room.clients.size >= maxPeersPerRoom) {
      safeSend(ws, { type: "error", message: "Room full" });
      return;
    }

    if (client.roomId && rooms.has(client.roomId)) {
      const oldRoom = rooms.get(client.roomId);
      oldRoom.removeClient(client.id);
      oldRoom.broadcastRoster();
      if (oldRoom.isEmpty()) rooms.delete(oldRoom.id);
    }

    client.roomId = room.id;
    client.name = typeof msg.name === "string" ? sanitizeHandle(msg.name) : `Player-${client.id.slice(-4)}`;
    client.classType = classType;
    client.protocolVersion =
      Number.isFinite(msg.protocolVersion) && msg.protocolVersion >= 1 ? Math.floor(msg.protocolVersion) : client.protocolVersion;
    if (typeof resetClientInputState === "function") resetClientInputState(client, makeDefaultInput);
    else client.input = makeDefaultInput();
    room.addClient(client);

    safeSend(ws, {
      type: "join.ok",
      roomId: room.id,
      playerId: client.id,
      phase: room.phase,
      ownerId: room.roomOwnerId,
      pauseOwnerId: room.pauseOwnerId,
      controllerId: room.controllerId,
      voiceUid: typeof room.getVoiceUid === "function" ? room.getVoiceUid(client.id) : null,
      classType: room.sim.classType,
      voice: typeof room.getVoiceRoomConfig === "function"
        ? room.getVoiceRoomConfig(client.id)
        : room.voiceConfig || { enabled: false }
    });
    if (room.phase === "active") {
      room.sendMapState(client);
      const joinFullState = serializeState(room);
      const joinState = client.protocolVersion >= 2 ? buildJoinKeyframeState(joinFullState) : joinFullState;
      safeSend(ws, {
        type: "state.snapshot",
        roomId: room.id,
        serverTime: Date.now(),
        snapshotSeq: room.snapshotSeq,
        phase: room.phase,
        ownerId: room.roomOwnerId,
        pauseOwnerId: room.pauseOwnerId,
        controllerId: room.controllerId,
        lastInputSeq: getProcessedInputSeq(room.clients.get(room.controllerId)),
        lastInputSeqByPlayer: room.getLastInputSeqByPlayer(),
        lastReceivedInputSeqByPlayer: room.getLastReceivedInputSeqByPlayer(),
        inputQueueDepthByPlayer: room.getInputQueueDepthByPlayer(),
        mapSignature: room.mapSignature(),
        state: joinState
      });
      room.sendMeta(client, Date.now(), true);
    }
    room.broadcastRoster();
    return;
  }

  if (msg.type === "input") {
    if (!client.roomId || !rooms.has(client.roomId)) return;
    const room = rooms.get(client.roomId);
    if (room.phase !== "active") return;
    enqueueClientInput(client, msg.input, { sanitizeInput });
    return;
  }

  if (msg.type === "room.lobbyUpdate") {
    if (!client.roomId || !rooms.has(client.roomId)) return;
    const room = rooms.get(client.roomId);
    if (room.phase !== "lobby") return;
    const changed = room.updateClientLobbyState(client.id, {
      classType: typeof msg.classType === "string" ? normClassType(msg.classType) : undefined,
      locked: typeof msg.locked === "boolean" ? msg.locked : undefined
    });
    const floorChanged = Object.prototype.hasOwnProperty.call(msg, "startingFloor")
      ? room.updateRequestedStartFloor(
        client.id,
        Number.isFinite(msg.startingFloor) ? Math.max(1, Math.min(15, Math.floor(msg.startingFloor))) : NaN
      )
      : false;
    const bossChanged = Object.prototype.hasOwnProperty.call(msg, "bossOverride")
      ? room.updateRequestedBossOverride(
        client.id,
        typeof msg.bossOverride === "string" ? msg.bossOverride : undefined
      )
      : false;
    const deathRulesChanged = Object.prototype.hasOwnProperty.call(msg, "deathRulesMode")
      ? room.updateRequestedDeathRulesMode(
        client.id,
        typeof msg.deathRulesMode === "string" ? msg.deathRulesMode : undefined
      )
      : false;
    if (changed || floorChanged || bossChanged || deathRulesChanged) room.broadcastRoster();
    return;
  }

  if (msg.type === "room.returnToLobby") {
    if (!client.roomId || !rooms.has(client.roomId)) return;
    const room = rooms.get(client.roomId);
    if (room.phase !== "active") return;
    if (!room.sim?.gameOver) return;
    if (typeof room.resetToLobby === "function") room.resetToLobby(Date.now());
    return;
  }

  if (msg.type === "state.snapshotAck") {
    if (!client.roomId || !rooms.has(client.roomId)) return;
    const seq = Number.isFinite(msg.snapshotSeq) ? Math.max(0, Math.floor(msg.snapshotSeq)) : 0;
    client.lastSnapshotAckSeq = Math.max(Number.isFinite(client.lastSnapshotAckSeq) ? client.lastSnapshotAckSeq : 0, seq);
    return;
  }

  if (msg.type === "net.ping") {
    safeSend(ws, {
      type: "net.pong",
      clientTime: Number.isFinite(msg.clientTime) ? msg.clientTime : null,
      serverTime: Date.now()
    });
    return;
  }

  if (msg.type === "action") {
    if (!client.roomId || !rooms.has(client.roomId)) return;
    const room = rooms.get(client.roomId);
    const clientActionSeq = Number.isFinite(msg.action?.clientActionSeq) ? Math.max(0, Math.floor(msg.action.clientActionSeq)) : 0;
    if (clientActionSeq > 0) client.lastActionSeq = Math.max(Number.isFinite(client.lastActionSeq) ? client.lastActionSeq : 0, clientActionSeq);
    handleActionMessage(room, client.id, msg.action);
    return;
  }

  if (msg.type === "room.takeControl") {
    if (!client.roomId || !rooms.has(client.roomId)) return;
    const room = rooms.get(client.roomId);
    room.pauseOwnerId = client.id;
    room.broadcastRoster();
    return;
  }

  if (msg.type === "perf.getMetrics") {
    if (!client.roomId || !rooms.has(client.roomId)) return;
    const room = rooms.get(client.roomId);
    safeSend(ws, {
      type: "perf.metrics",
      roomId: room.id,
      serverTime: Date.now(),
      metrics: room.getTelemetrySnapshot()
    });
    return;
  }

  safeSend(ws, { type: "error", message: `Unknown message type: ${msg.type}` });
}

export function handleClientClose(client, rooms) {
  if (!client.roomId || !rooms.has(client.roomId)) return;
  const room = rooms.get(client.roomId);
  room.removeClient(client.id);
  if (room.isEmpty()) {
    rooms.delete(room.id);
  } else {
    room.broadcastRoster();
  }
}
