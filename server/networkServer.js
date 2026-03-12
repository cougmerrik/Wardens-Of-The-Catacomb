import { WebSocketServer } from "ws";
import { GameSim } from "../src/sim/GameSim.js";

const PORT = Number.parseInt(process.env.PORT || "8090", 10);
// Higher rates reduce perceived input latency and visual jitter.
const TICK_RATE = Number.parseInt(process.env.TICK_RATE || "72", 10);
const SNAPSHOT_RATE = Number.parseInt(process.env.SNAPSHOT_RATE || "30", 10);
const MAP_CHUNK_SIZE = Number.parseInt(process.env.MAP_CHUNK_SIZE || "24", 10);
const MAP_CHUNK_RADIUS = Number.parseInt(process.env.MAP_CHUNK_RADIUS || "2", 10);
const MAP_CHUNK_PUSH_MS = Number.parseInt(process.env.MAP_CHUNK_PUSH_MS || "120", 10);
const MAX_ROOMS = 64;
const MAX_PEERS_PER_ROOM = 8;
const MAX_WS_BUFFERED_BYTES = Number.parseInt(process.env.MAX_WS_BUFFERED_BYTES || "262144", 10);

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function clamp(v, lo, hi) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(lo, Math.min(hi, v));
}

function normClassType(value) {
  return value === "fighter" || value === "warrior" ? "fighter" : "archer";
}

function getStableId(room, domain, prefix, obj) {
  if (!obj || typeof obj !== "object") return `${prefix}_0`;
  const map = room.idMaps[domain];
  if (map.has(obj)) return map.get(obj);
  const id = `${prefix}_${room.idCounters[domain]++}`;
  map.set(obj, id);
  return id;
}

function makeDefaultInput() {
  return {
    seq: 0,
    moveX: 0,
    moveY: 0,
    hasAim: false,
    aimX: 0,
    aimY: 0,
    firePrimaryQueued: false,
    firePrimaryHeld: false,
    fireAltQueued: false
  };
}

function sanitizeInput(raw, previous) {
  const next = { ...previous };
  if (raw && typeof raw === "object") {
    next.seq = Number.isFinite(raw.seq) ? Math.max(0, Math.floor(raw.seq)) : next.seq;
    next.moveX = clamp(raw.moveX, -1, 1);
    next.moveY = clamp(raw.moveY, -1, 1);
    next.hasAim = !!raw.hasAim;
    next.aimX = Number.isFinite(raw.aimX) ? raw.aimX : next.aimX;
    next.aimY = Number.isFinite(raw.aimY) ? raw.aimY : next.aimY;
    next.firePrimaryQueued = !!raw.firePrimaryQueued;
    next.firePrimaryHeld = !!raw.firePrimaryHeld;
    next.fireAltQueued = !!raw.fireAltQueued;
  }
  return next;
}

function shallowPlayerState(simPlayer) {
  return {
    x: simPlayer.x,
    y: simPlayer.y,
    size: simPlayer.size,
    health: simPlayer.health,
    maxHealth: simPlayer.maxHealth,
    dirX: simPlayer.dirX,
    dirY: simPlayer.dirY,
    facing: simPlayer.facing,
    moving: simPlayer.moving,
    classType: simPlayer.classType
  };
}

function serializeBullet(room, b, domain = "bullet", prefix = "b") {
  return {
    id: getStableId(room, domain, prefix, b),
    x: b.x,
    y: b.y,
    vx: b.vx,
    vy: b.vy,
    angle: b.angle,
    life: b.life,
    size: b.size
  };
}

function serializeEnemy(room, e) {
  return {
    id: getStableId(room, "enemy", "e", e),
    type: e.type,
    x: e.x,
    y: e.y,
    size: e.size,
    hp: e.hp,
    maxHp: e.maxHp,
    hpBarTimer: e.hpBarTimer || 0,
    goldEaten: e.goldEaten || 0,
    damageMin: e.damageMin,
    damageMax: e.damageMax
  };
}

function serializeDrop(room, d) {
  return {
    id: getStableId(room, "drop", "d", d),
    type: d.type,
    x: d.x,
    y: d.y,
    size: d.size,
    amount: d.amount,
    life: d.life
  };
}

function serializeBreakable(room, b) {
  return {
    id: getStableId(room, "breakable", "br", b),
    type: b.type,
    x: b.x,
    y: b.y,
    size: b.size,
    hp: b.hp
  };
}

function getTileChar(map, x, y) {
  if (!map || y < 0 || y >= map.length || x < 0) return "#";
  const row = map[y];
  if (typeof row === "string") return row[x] || "#";
  if (Array.isArray(row)) return row[x] || "#";
  return "#";
}

function makeActiveBounds(sim, padTiles = 10) {
  const tile = sim.config?.map?.tile || 32;
  const pad = Math.max(0, padTiles) * tile;
  const playW = typeof sim.getPlayAreaWidth === "function" ? sim.getPlayAreaWidth() : 960;
  const viewH = Number.isFinite(sim?.canvas?.height) ? sim.canvas.height : 640;
  const cam =
    typeof sim.getCamera === "function"
      ? sim.getCamera()
      : {
          x: Math.max(0, (sim.player?.x || 0) - playW / 2),
          y: Math.max(0, (sim.player?.y || 0) - viewH / 2)
        };
  return {
    left: cam.x - pad,
    top: cam.y - pad,
    right: cam.x + playW + pad,
    bottom: cam.y + viewH + pad
  };
}

function isInsideBounds(obj, bounds, extra = 0) {
  if (!obj || !bounds) return false;
  const x = Number.isFinite(obj.x) ? obj.x : 0;
  const y = Number.isFinite(obj.y) ? obj.y : 0;
  const size = Number.isFinite(obj.size) ? obj.size : 0;
  const r = Math.max(0, size * 0.5 + extra);
  return x + r >= bounds.left && x - r <= bounds.right && y + r >= bounds.top && y - r <= bounds.bottom;
}

function serializeState(room) {
  const sim = room.sim;
  const activeBounds = makeActiveBounds(sim, 10);
  const activeEnemies = sim.enemies.filter((e) => isInsideBounds(e, activeBounds, 72));
  const activeDrops = sim.drops.filter((d) => isInsideBounds(d, activeBounds, 64));
  const activeBreakables = (sim.breakables || []).filter((b) => isInsideBounds(b, activeBounds, 72));
  const activeBullets = sim.bullets.filter((b) => isInsideBounds(b, activeBounds, 160));
  const activeFireArrows = sim.fireArrows.filter((a) => isInsideBounds(a, activeBounds, 180));
  const activeFireZones = sim.fireZones.filter((z) => isInsideBounds(z, activeBounds, (Number.isFinite(z.radius) ? z.radius : 0) + 42));
  const activeMeleeSwings = sim.meleeSwings.filter((s) => isInsideBounds(s, activeBounds, (Number.isFinite(s.range) ? s.range : 0) + 32));
  const activeTexts = sim.floatingTexts.filter((t) => isInsideBounds(t, activeBounds, 36));
  return {
    mapSignature: `${sim.floor}:${sim.mapWidth}x${sim.mapHeight}`,
    time: sim.time,
    floor: sim.floor,
    level: sim.level,
    score: sim.score,
    gold: sim.gold,
    experience: sim.experience,
    expToNextLevel: sim.expToNextLevel,
    skillPoints: sim.skillPoints,
    hasKey: sim.hasKey,
    gameOver: sim.gameOver,
    paused: sim.paused,
    shopOpen: sim.shopOpen,
    skillTreeOpen: sim.skillTreeOpen,
    statsPanelOpen: sim.statsPanelOpen,
    warriorMomentumTimer: sim.warriorMomentumTimer || 0,
    warriorRageActiveTimer: sim.warriorRageActiveTimer || 0,
    warriorRageCooldownTimer: sim.warriorRageCooldownTimer || 0,
    skills: sim.skills,
    upgrades: sim.upgrades,
    player: shallowPlayerState(sim.player),
    door: { ...sim.door },
    pickup: { ...sim.pickup },
    enemies: activeEnemies.map((e) => serializeEnemy(room, e)),
    drops: activeDrops.map((d) => serializeDrop(room, d)),
    breakables: activeBreakables.map((b) => serializeBreakable(room, b)),
    bullets: activeBullets.map((b) => serializeBullet(room, b, "bullet", "b")),
    fireArrows: activeFireArrows.map((a) => serializeBullet(room, a, "fireArrow", "fa")),
    fireZones: activeFireZones.map((z) => ({ id: getStableId(room, "fireZone", "fz", z), x: z.x, y: z.y, radius: z.radius, life: z.life })),
    meleeSwings: activeMeleeSwings.map((s) => ({
      id: getStableId(room, "meleeSwing", "ms", s),
      x: s.x,
      y: s.y,
      angle: s.angle,
      arc: s.arc,
      range: s.range,
      life: s.life
    })),
    floatingTexts: activeTexts.slice(-12).map((t) => ({
      id: getStableId(room, "floatingText", "ft", t),
      x: t.x,
      y: t.y,
      text: t.text,
      color: t.color,
      life: t.life,
      size: t.size,
      maxLife: t.maxLife,
      vy: t.vy
    }))
  };
}

class Room {
  constructor(id, classType) {
    this.id = id;
    this.sim = new GameSim({
      classType,
      viewportWidth: 960,
      viewportHeight: 640
    });
    this.clients = new Map();
    this.controllerId = null;
    this.lastTickMs = Date.now();
    this.lastSnapshotMs = 0;
    this.lastChunkPushMs = 0;
    this.lastMapSignature = this.mapSignature();
    this.clientChunkState = new Map();
    this.idCounters = {
      enemy: 1,
      drop: 1,
      bullet: 1,
      fireArrow: 1,
      fireZone: 1,
      meleeSwing: 1,
      armorStand: 1,
      floatingText: 1,
      breakable: 1
    };
    this.idMaps = {
      enemy: new WeakMap(),
      drop: new WeakMap(),
      bullet: new WeakMap(),
      fireArrow: new WeakMap(),
      fireZone: new WeakMap(),
      meleeSwing: new WeakMap(),
      armorStand: new WeakMap(),
      floatingText: new WeakMap(),
      breakable: new WeakMap()
    };
  }

  mapSignature() {
    return `${this.sim.floor}:${this.sim.mapWidth}x${this.sim.mapHeight}`;
  }

  addClient(client) {
    this.clients.set(client.id, client);
    this.clientChunkState.set(client.id, { sent: new Set() });
    if (!this.controllerId) this.controllerId = client.id;
  }

  removeClient(clientId) {
    this.clients.delete(clientId);
    this.clientChunkState.delete(clientId);
    if (this.controllerId === clientId) {
      const next = this.clients.keys().next();
      this.controllerId = next.done ? null : next.value;
    }
  }

  isEmpty() {
    return this.clients.size === 0;
  }

  getControllerInput() {
    if (!this.controllerId) return makeDefaultInput();
    const client = this.clients.get(this.controllerId);
    return client ? client.input : makeDefaultInput();
  }

  tick(nowMs) {
    const dt = Math.min((nowMs - this.lastTickMs) / 1000, 0.05);
    this.lastTickMs = nowMs;
    this.sim.tick(dt, this.getControllerInput());
    const c = this.clients.get(this.controllerId);
    if (c) {
      c.input.firePrimaryQueued = false;
      c.input.fireAltQueued = false;
    }
  }

  broadcast(type, payload) {
    const msg = JSON.stringify({ type, roomId: this.id, ...payload });
    for (const c of this.clients.values()) {
      if (c.ws.readyState !== c.ws.OPEN) continue;
      if (type === "state.snapshot" && c.ws.bufferedAmount > MAX_WS_BUFFERED_BYTES) continue;
      c.ws.send(msg);
    }
  }

  broadcastRoster() {
    this.broadcast("room.roster", {
      controllerId: this.controllerId,
      players: Array.from(this.clients.values()).map((c) => ({ id: c.id, name: c.name, classType: c.classType }))
    });
  }

  sendMapMeta(toClient = null) {
    const payload = {
      mapSignature: this.mapSignature(),
      floor: this.sim.floor,
      mapWidth: this.sim.mapWidth,
      mapHeight: this.sim.mapHeight,
      tileSize: this.sim.config.map.tile,
      armorStands: this.sim.armorStands.map((s) => ({
        id: getStableId(this, "armorStand", "as", s),
        x: s.x,
        y: s.y,
        size: s.size,
        animated: !!s.animated,
        activated: !!s.activated
      }))
    };
    if (toClient) {
      if (toClient.ws.readyState === toClient.ws.OPEN) {
        toClient.ws.send(JSON.stringify({ type: "state.mapMeta", roomId: this.id, ...payload }));
      }
      return;
    }
    this.broadcast("state.mapMeta", payload);
  }

  sendMapChunksToClient(client, nowMs = Date.now()) {
    if (!client || client.ws.readyState !== client.ws.OPEN) return;
    const chunkState = this.clientChunkState.get(client.id);
    if (!chunkState) return;
    const tile = this.sim.config.map.tile || 32;
    const ptx = Math.floor((this.sim.player?.x || 0) / tile);
    const pty = Math.floor((this.sim.player?.y || 0) / tile);
    const centerCx = Math.floor(ptx / MAP_CHUNK_SIZE);
    const centerCy = Math.floor(pty / MAP_CHUNK_SIZE);
    const sig = this.mapSignature();

    for (let cy = centerCy - MAP_CHUNK_RADIUS; cy <= centerCy + MAP_CHUNK_RADIUS; cy++) {
      for (let cx = centerCx - MAP_CHUNK_RADIUS; cx <= centerCx + MAP_CHUNK_RADIUS; cx++) {
        if (cx < 0 || cy < 0) continue;
        const key = `${sig}:${cx}:${cy}`;
        if (chunkState.sent.has(key) && nowMs - this.lastChunkPushMs < MAP_CHUNK_PUSH_MS) continue;
        const startX = cx * MAP_CHUNK_SIZE;
        const startY = cy * MAP_CHUNK_SIZE;
        if (startX >= this.sim.mapWidth || startY >= this.sim.mapHeight) continue;
        const chunkH = Math.max(0, Math.min(MAP_CHUNK_SIZE, this.sim.mapHeight - startY));
        const rows = [];
        for (let row = 0; row < chunkH; row++) {
          const y = startY + row;
          let s = "";
          const chunkW = Math.max(0, Math.min(MAP_CHUNK_SIZE, this.sim.mapWidth - startX));
          for (let col = 0; col < chunkW; col++) {
            s += getTileChar(this.sim.map, startX + col, y);
          }
          rows.push(s);
        }
        client.ws.send(
          JSON.stringify({
            type: "state.mapChunk",
            roomId: this.id,
            mapSignature: sig,
            cx,
            cy,
            chunkSize: MAP_CHUNK_SIZE,
            rows
          })
        );
        chunkState.sent.add(key);
      }
    }
    this.lastChunkPushMs = nowMs;
  }

  maybeBroadcastSnapshot(nowMs) {
    const intervalMs = 1000 / SNAPSHOT_RATE;
    if (nowMs - this.lastSnapshotMs < intervalMs) return;
    this.lastSnapshotMs = nowMs;
    const sig = this.mapSignature();
    if (sig !== this.lastMapSignature) {
      this.lastMapSignature = sig;
      for (const state of this.clientChunkState.values()) state.sent.clear();
      this.sendMapMeta();
    }
    for (const client of this.clients.values()) this.sendMapChunksToClient(client, nowMs);
    const controllerClient = this.clients.get(this.controllerId);
    this.broadcast("state.snapshot", {
      serverTime: nowMs,
      controllerId: this.controllerId,
      lastInputSeq: controllerClient ? controllerClient.lastInputSeq : 0,
      mapSignature: sig,
      state: serializeState(this)
    });
  }
}

const rooms = new Map();

function getOrCreateRoom(roomId, classType) {
  let room = rooms.get(roomId);
  if (!room) {
    if (rooms.size >= MAX_ROOMS) return null;
    room = new Room(roomId, classType);
    rooms.set(roomId, room);
  }
  return room;
}

function safeSend(ws, obj) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

const wss = new WebSocketServer({
  port: PORT,
  // Disabling per-message compression reduces CPU spikes/stalls in local realtime sessions.
  perMessageDeflate: false
});

wss.on("connection", (ws) => {
  if (ws._socket && typeof ws._socket.setNoDelay === "function") {
    ws._socket.setNoDelay(true);
  }
  const client = {
    id: uid("p"),
    ws,
    roomId: null,
    name: "Player",
    classType: "archer",
    input: makeDefaultInput(),
    lastInputSeq: 0
  };

  safeSend(ws, {
    type: "hello",
    playerId: client.id,
    protocol: 1,
    note: "Server authoritative alpha. One active controller per room; others are spectators."
  });

  ws.on("message", (raw) => {
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

    if (msg.type === "join") {
      const roomId = typeof msg.roomId === "string" && msg.roomId.trim() ? msg.roomId.trim().slice(0, 32) : "lobby";
      const classType = normClassType(msg.classType);
      const room = getOrCreateRoom(roomId, classType);
      if (!room) {
        safeSend(ws, { type: "error", message: "Room limit reached" });
        return;
      }
      if (room.clients.size >= MAX_PEERS_PER_ROOM) {
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
      client.name = typeof msg.name === "string" && msg.name.trim() ? msg.name.trim().slice(0, 20) : `Player-${client.id.slice(-4)}`;
      client.classType = classType;
      client.input = makeDefaultInput();
      room.addClient(client);

      safeSend(ws, {
        type: "join.ok",
        roomId: room.id,
        playerId: client.id,
        controllerId: room.controllerId,
        classType: room.sim.classType
      });
      room.sendMapMeta(client);
      room.sendMapChunksToClient(client, Date.now());
      safeSend(ws, {
        type: "state.snapshot",
        roomId: room.id,
        serverTime: Date.now(),
        controllerId: room.controllerId,
        lastInputSeq: room.clients.get(room.controllerId)?.lastInputSeq || 0,
        mapSignature: room.mapSignature(),
        state: serializeState(room)
      });
      room.broadcastRoster();
      return;
    }

    if (msg.type === "input") {
      if (!client.roomId || !rooms.has(client.roomId)) return;
      const room = rooms.get(client.roomId);
      if (room.controllerId !== client.id) {
        safeSend(ws, { type: "warn", message: "Spectators cannot control this room in phase-1." });
        return;
      }
      client.input = sanitizeInput(msg.input, client.input);
      client.lastInputSeq = client.input.seq || client.lastInputSeq;
      return;
    }

    if (msg.type === "action") {
      if (!client.roomId || !rooms.has(client.roomId)) return;
      const room = rooms.get(client.roomId);
      if (room.controllerId !== client.id) return;
      const action = msg.action;
      if (!action || typeof action !== "object" || typeof action.kind !== "string") return;
      const kind = action.kind;
      const sim = room.sim;
      if (kind === "escape") {
        if (sim.shopOpen) sim.toggleShop(false);
        else if (sim.skillTreeOpen) sim.toggleSkillTree(false);
        else if (!sim.gameOver) sim.paused = !sim.paused;
        return;
      }
      if (kind === "toggleShop") {
        sim.toggleShop();
        return;
      }
      if (kind === "closeShop") {
        sim.toggleShop(false);
        return;
      }
      if (kind === "toggleSkillTree") {
        sim.toggleSkillTree();
        return;
      }
      if (kind === "closeSkillTree") {
        sim.toggleSkillTree(false);
        return;
      }
      if (kind === "toggleStats") {
        sim.statsPanelOpen = !sim.statsPanelOpen;
        return;
      }
      if (kind === "closeStats") {
        sim.statsPanelOpen = false;
        return;
      }
      if (kind === "buyUpgrade" && typeof action.key === "string") {
        sim.buyUpgrade(action.key);
        return;
      }
      if (kind === "spendSkill" && typeof action.key === "string") {
        sim.spendSkillPoint(action.key);
      }
      return;
    }

    if (msg.type === "room.takeControl") {
      if (!client.roomId || !rooms.has(client.roomId)) return;
      const room = rooms.get(client.roomId);
      room.controllerId = client.id;
      room.broadcastRoster();
      return;
    }

    safeSend(ws, { type: "error", message: `Unknown message type: ${msg.type}` });
  });

  ws.on("close", () => {
    if (!client.roomId || !rooms.has(client.roomId)) return;
    const room = rooms.get(client.roomId);
    room.removeClient(client.id);
    if (room.isEmpty()) {
      rooms.delete(room.id);
    } else {
      room.broadcastRoster();
    }
  });
});

const tickMs = Math.floor(1000 / TICK_RATE);
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    room.tick(now);
    room.maybeBroadcastSnapshot(now);
  }
}, tickMs);

console.log(`Authoritative network server listening on ws://localhost:${PORT}`);
