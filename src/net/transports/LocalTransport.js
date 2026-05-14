import { createTransportEventTarget } from "./transportEvents.js";

function createLocalEndpoint() {
  const events = createTransportEventTarget();
  return {
    peer: null,
    open: false,
    on: events.on,
    get bufferedAmount() {
      return 0;
    },
    isOpen() {
      return this.open;
    },
    isConnecting() {
      return false;
    },
    connect() {
      if (this.open) return;
      this.open = true;
      queueMicrotask(() => events.emit("open", {}));
    },
    send(data) {
      if (!this.open || !this.peer?.open) return false;
      queueMicrotask(() => this.peer.emitMessage(data));
      return true;
    },
    emitMessage(data) {
      events.emit("message", { data });
    },
    close() {
      if (!this.open) return;
      this.open = false;
      queueMicrotask(() => events.emit("close", {}));
      if (this.peer?.open) {
        this.peer.open = false;
        queueMicrotask(() => this.peer.emitClose());
      }
    },
    emitClose() {
      events.emit("close", {});
    },
    emitError(err) {
      events.emit("error", { err });
    }
  };
}

export function createLocalTransportPair() {
  const client = createLocalEndpoint();
  const server = createLocalEndpoint();
  client.peer = server;
  server.peer = client;
  return { client, server };
}
