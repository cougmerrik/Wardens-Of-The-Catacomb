import { createWebSocketTransport } from "./transports/WebSocketTransport.js";

export class NetClient {
  constructor(url, { transportFactory = createWebSocketTransport } = {}) {
    this.url = url;
    this.transportFactory = transportFactory;
    this.transport = null;
    this.handlers = new Map();
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(fn);
  }

  emit(type, payload = {}) {
    const list = this.handlers.get(type) || [];
    for (const fn of list) fn(payload);
  }

  connect() {
    if (this.transport && (this.transport.isOpen() || this.transport.isConnecting())) return;
    this.transport = this.transportFactory(this.url);
    this.transport.on("open", () => this.emit("open", {}));
    this.transport.on("close", () => this.emit("close", {}));
    this.transport.on("error", (err) => this.emit("error", err));
    this.transport.on("message", (evt) => {
      let msg = null;
      try {
        msg = JSON.parse(evt.data);
      } catch {
        this.emit("error", { err: new Error("Invalid JSON from server") });
        return;
      }
      if (!msg || typeof msg.type !== "string") return;
      this.emit(msg.type, msg);
      this.emit("message", msg);
    });
    this.transport.connect();
  }

  send(type, payload = {}) {
    if (!this.transport) return false;
    return this.transport.send(JSON.stringify({ type, ...payload }));
  }

  join(roomId, name, classType, protocolVersion = 2) {
    return this.send("join", { roomId, name, classType, protocolVersion });
  }

  sendInput(input) {
    return this.send("input", { input });
  }

  sendLobbyUpdate(payload = {}) {
    return this.send("room.lobbyUpdate", payload);
  }

  sendPing(clientTime) {
    return this.send("net.ping", { clientTime });
  }

  takeControl() {
    return this.send("room.takeControl", {});
  }

  sendAction(action) {
    return this.send("action", { action });
  }

  returnRoomToLobby() {
    return this.send("room.returnToLobby", {});
  }

  disconnect() {
    if (this.transport) this.transport.close();
    this.transport = null;
  }
}
