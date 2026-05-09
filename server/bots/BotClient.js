import { EventEmitter } from "node:events";
import WebSocket from "ws";
import { BotBrain } from "./BotBrain.js";
import { applyBotMessageState, createEmptyBotState, getLocalPlayer } from "./botState.js";

const INPUT_INTERVAL_MS = 50;

export class BotClient extends EventEmitter {
  constructor({
    url,
    roomId,
    name,
    classType,
    random = Math.random,
    inputIntervalMs = INPUT_INTERVAL_MS,
    logger = null
  }) {
    super();
    this.url = url;
    this.roomId = roomId || "lobby";
    this.name = name || "Bot";
    this.classType = classType || "archer";
    this.random = random;
    this.inputIntervalMs = inputIntervalMs;
    this.logger = logger;
    this.ws = null;
    this.state = createEmptyBotState();
    this.brain = new BotBrain({ random, classType: this.classType });
    this.seq = 0;
    this.inputTimer = null;
    this.readySent = false;
    this.closed = false;
    this.metrics = {
      name: this.name,
      classType: this.classType,
      joined: false,
      readied: false,
      started: false,
      connectedAtMs: 0,
      disconnectedAtMs: 0,
      snapshots: 0,
      inputsSent: 0,
      primaryInputsSent: 0,
      altInputsSent: 0,
      errors: [],
      deathObserved: false,
      lastHealth: null,
      lastLevel: 1
    };
  }

  connect() {
    if (this.ws) return;
    this.metrics.connectedAtMs = Date.now();
    this.ws = new WebSocket(this.url, { perMessageDeflate: false });
    this.ws.on("open", () => {
      this.log("connected");
      this.emit("open");
    });
    this.ws.on("message", (raw) => this.handleRawMessage(raw));
    this.ws.on("close", () => {
      this.metrics.disconnectedAtMs = Date.now();
      this.stopInputLoop();
      this.emit("close");
    });
    this.ws.on("error", (error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.metrics.errors.push(message);
      this.emit("botError", error);
    });
  }

  handleRawMessage(raw) {
    let msg = null;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      this.metrics.errors.push("Invalid JSON from server");
      return;
    }
    if (!msg || typeof msg.type !== "string") return;
    applyBotMessageState(this.state, msg);
    if (msg.type === "hello") this.joinRoom();
    if (msg.type === "join.ok") {
      this.metrics.joined = true;
      this.log(`joined ${this.roomId} as ${this.state.playerId}`);
      this.readyUp();
    }
    if (msg.type === "room.roster") this.readyUp();
    if (msg.type === "room.started") {
      this.metrics.started = true;
      this.startInputLoop();
    }
    if (msg.type === "state.snapshot") {
      this.metrics.snapshots = this.state.snapshots;
      this.send("state.snapshotAck", { snapshotSeq: msg.snapshotSeq || 0 });
      if (msg.phase === "active") {
        this.metrics.started = true;
        this.startInputLoop();
      }
      this.observePlayerState();
    }
    if (msg.type === "error") {
      this.metrics.errors.push(typeof msg.message === "string" ? msg.message : "Server error");
    }
    this.emit("message", msg);
  }

  joinRoom() {
    this.send("join", {
      roomId: this.roomId,
      name: this.name,
      classType: this.classType,
      protocolVersion: 2
    });
  }

  readyUp() {
    if (this.readySent || this.state.phase !== "lobby") return;
    const self = this.state.roster.find((player) => player?.id === this.state.playerId);
    if (self?.ready || self?.locked) {
      this.readySent = true;
      this.metrics.readied = true;
      return;
    }
    this.readySent = this.send("room.lobbyUpdate", {
      classType: this.classType,
      locked: true
    });
    this.metrics.readied = this.readySent;
    if (this.readySent) this.log("ready");
  }

  startInputLoop() {
    if (this.inputTimer || this.closed) return;
    this.inputTimer = setInterval(() => this.tickInput(), this.inputIntervalMs);
    this.tickInput();
  }

  stopInputLoop() {
    if (!this.inputTimer) return;
    clearInterval(this.inputTimer);
    this.inputTimer = null;
  }

  tickInput() {
    if (this.state.phase !== "active") return;
    const input = this.brain.chooseInput(this.state, Date.now(), ++this.seq);
    if (!this.send("input", { input })) return;
    this.metrics.inputsSent += 1;
    if (input.firePrimaryQueued || input.firePrimaryHeld) this.metrics.primaryInputsSent += 1;
    if (input.fireAltQueued) this.metrics.altInputsSent += 1;
  }

  observePlayerState() {
    const player = getLocalPlayer(this.state);
    if (!player) return;
    if (Number.isFinite(player.health)) {
      this.metrics.lastHealth = player.health;
      if (player.health <= 0 || player.alive === false) this.metrics.deathObserved = true;
    }
    if (Number.isFinite(player.level)) this.metrics.lastLevel = player.level;
  }

  send(type, payload = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify({ type, ...payload }));
    return true;
  }

  close() {
    this.closed = true;
    this.stopInputLoop();
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) this.ws.close();
    this.ws = null;
  }

  log(message) {
    if (typeof this.logger === "function") this.logger(`[${this.name}] ${message}`);
  }
}
