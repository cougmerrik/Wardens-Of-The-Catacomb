export function createWsClientTransport(ws) {
  return {
    raw: ws,
    get bufferedAmount() {
      return Number.isFinite(ws?.bufferedAmount) ? ws.bufferedAmount : 0;
    },
    isOpen() {
      return !!ws && ws.readyState === ws.OPEN;
    },
    onMessage(fn) {
      ws.on("message", fn);
    },
    onClose(fn) {
      ws.on("close", fn);
    },
    send(data) {
      if (!this.isOpen()) return false;
      ws.send(data);
      return true;
    },
    sendJson(payload) {
      return this.send(JSON.stringify(payload));
    },
    close() {
      if (ws && typeof ws.close === "function") ws.close();
    }
  };
}
