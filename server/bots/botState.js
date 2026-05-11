const COLLECTION_KEYS = [
  "enemies",
  "drops",
  "lightSources",
  "breakables",
  "wallTraps",
  "bullets",
  "fireArrows",
  "fireZones",
  "meleeSwings"
];

function applyCollectionDelta(previous, delta) {
  const byId = new Map();
  for (const item of Array.isArray(previous) ? previous : []) {
    if (item && typeof item.id === "string") byId.set(item.id, { ...item });
  }
  if (Array.isArray(delta?.despawn)) {
    for (const id of delta.despawn) byId.delete(id);
  }
  if (Array.isArray(delta?.update)) {
    for (const patch of delta.update) {
      if (!patch || typeof patch.id !== "string") continue;
      byId.set(patch.id, { ...(byId.get(patch.id) || { id: patch.id }), ...patch });
    }
  }
  if (Array.isArray(delta?.spawn)) {
    for (const item of delta.spawn) {
      if (!item || typeof item.id !== "string") continue;
      byId.set(item.id, { ...item });
    }
  }
  return Array.from(byId.values());
}

export function createEmptyBotState() {
  return {
    roomId: "",
    phase: "",
    playerId: "",
    ownerId: "",
    pauseOwnerId: "",
    controllerId: "",
    roster: [],
    mapSignature: "",
    map: null,
    latest: {
      players: [],
      enemies: [],
      drops: [],
      lightSources: [],
      breakables: [],
      wallTraps: [],
      bullets: [],
      fireArrows: [],
      fireZones: [],
      meleeSwings: []
    },
    meta: null,
    snapshots: 0
  };
}

export function applyBotMessageState(state, msg) {
  if (!state || !msg || typeof msg !== "object") return state;
  if (typeof msg.roomId === "string") state.roomId = msg.roomId;
  if (typeof msg.phase === "string") state.phase = msg.phase;
  if (typeof msg.ownerId === "string") state.ownerId = msg.ownerId;
  if (typeof msg.pauseOwnerId === "string") state.pauseOwnerId = msg.pauseOwnerId;
  if (typeof msg.controllerId === "string") state.controllerId = msg.controllerId;

  if (msg.type === "join.ok") {
    if (typeof msg.playerId === "string") state.playerId = msg.playerId;
    return state;
  }

  if (msg.type === "room.roster") {
    state.roster = Array.isArray(msg.players) ? msg.players.map((player) => ({ ...player })) : [];
    return state;
  }

  if (msg.type === "room.started") {
    state.phase = "active";
    return state;
  }

  if (msg.type === "state.map" || msg.type === "state.mapMeta") {
    if (typeof msg.mapSignature === "string") state.mapSignature = msg.mapSignature;
    if (msg.type === "state.map") state.map = msg.map || null;
    return state;
  }

  if (msg.type === "state.meta") {
    state.meta = msg.meta && typeof msg.meta === "object" ? msg.meta : msg;
    if (typeof state.meta.roomPhase === "string") state.phase = state.meta.roomPhase;
    return state;
  }

  if (msg.type !== "state.snapshot" || !msg.state || typeof msg.state !== "object") return state;

  const snapshot = msg.state;
  state.snapshots += 1;
  state.phase = typeof msg.phase === "string" ? msg.phase : state.phase;
  state.mapSignature = typeof snapshot.mapSignature === "string" ? snapshot.mapSignature : state.mapSignature;

  const next = { ...state.latest, ...snapshot };
  const delta = snapshot.delta && typeof snapshot.delta === "object" ? snapshot.delta : null;
  if (delta) {
    for (const key of COLLECTION_KEYS) {
      next[key] = applyCollectionDelta(delta.keyframe ? [] : state.latest[key], delta[key]);
    }
  }
  state.latest = next;
  return state;
}

export function getLocalPlayer(state) {
  const players = Array.isArray(state?.latest?.players) ? state.latest.players : [];
  const player = players.find((entry) => entry?.id === state.playerId);
  return player || state?.latest?.player || null;
}
