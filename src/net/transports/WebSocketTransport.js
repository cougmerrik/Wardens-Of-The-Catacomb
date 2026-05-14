import { createTransportEventTarget } from "./transportEvents.js";

export function createWebSocketTransport(url, { WebSocketImpl = globalThis.WebSocket } = {}) {
  const events = createTransportEventTarget();
  let socket = null;

  return {
    on: events.on,
    get bufferedAmount() {
      return Number.isFinite(socket?.bufferedAmount) ? socket.bufferedAmount : 0;
    },
    isOpen() {
      return !!socket && socket.readyState === WebSocketImpl.OPEN;
    },
    isConnecting() {
      return !!socket && socket.readyState === WebSocketImpl.CONNECTING;
    },
    connect() {
      if (this.isOpen() || this.isConnecting()) return;
      socket = new WebSocketImpl(url);
      socket.addEventListener("open", () => events.emit("open", {}));
      socket.addEventListener("close", () => events.emit("close", {}));
      socket.addEventListener("error", (err) => events.emit("error", { err }));
      socket.addEventListener("message", (evt) => events.emit("message", { data: evt.data }));
    },
    send(data) {
      if (!this.isOpen()) return false;
      socket.send(data);
      return true;
    },
    close() {
      if (socket) socket.close();
      socket = null;
    }
  };
}
