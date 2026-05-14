import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { safeSend } from "./net/serverHelpers.js";
import { createWsClientTransport } from "./net/transports/WsClientTransport.js";
import { NetClient } from "../src/net/NetClient.js";
import { createLocalTransportPair } from "../src/net/transports/LocalTransport.js";

async function waitUntil(fn, label, timeoutMs = 1000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (fn()) return;
    await delay(10);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

class FakeWs extends EventEmitter {
  constructor() {
    super();
    this.OPEN = 1;
    this.CLOSED = 3;
    this.readyState = this.OPEN;
    this.bufferedAmount = 0;
    this.sent = [];
    this.closeCount = 0;
  }

  send(data) {
    this.sent.push(data);
  }

  close() {
    this.closeCount += 1;
    this.readyState = this.CLOSED;
    this.emit("close");
  }
}

const fakeWs = new FakeWs();
const serverTransport = createWsClientTransport(fakeWs);
const seenRawMessages = [];
let serverClosed = false;

serverTransport.onMessage((raw) => {
  seenRawMessages.push(raw.toString());
});
serverTransport.onClose(() => {
  serverClosed = true;
});

assert.equal(serverTransport.isOpen(), true);
assert.equal(serverTransport.bufferedAmount, 0);
assert.equal(serverTransport.send("raw-payload"), true);
assert.equal(serverTransport.sendJson({ type: "hello", ok: true }), true);
assert.equal(safeSend(serverTransport, { type: "safe", ok: true }), true);
assert.deepEqual(fakeWs.sent, [
  "raw-payload",
  JSON.stringify({ type: "hello", ok: true }),
  JSON.stringify({ type: "safe", ok: true })
]);

fakeWs.bufferedAmount = 128;
assert.equal(serverTransport.bufferedAmount, 128);
fakeWs.emit("message", Buffer.from("client-payload"));
assert.deepEqual(seenRawMessages, ["client-payload"]);

serverTransport.close();
assert.equal(serverClosed, true);
assert.equal(fakeWs.closeCount, 1);
assert.equal(serverTransport.isOpen(), false);
assert.equal(serverTransport.send("after-close"), false);
assert.equal(serverTransport.sendJson({ type: "closed" }), false);
assert.equal(safeSend(serverTransport, { type: "closed" }), false);

const pair = createLocalTransportPair();
const seenByServer = [];
const seenByClient = [];
let opened = false;
let closed = false;
let invalidJsonError = null;

pair.server.on("message", ({ data }) => {
  const msg = JSON.parse(data);
  seenByServer.push(msg);
  if (msg.type === "join") {
    pair.server.send(JSON.stringify({ type: "join.ok", roomId: msg.roomId, controllerId: "p_local" }));
  }
});

const client = new NetClient("local://test", {
  transportFactory: () => pair.client
});

client.on("open", () => {
  opened = true;
});
client.on("join.ok", (msg) => {
  seenByClient.push(msg);
});
client.on("error", (msg) => {
  invalidJsonError = msg.err || msg;
});
client.on("close", () => {
  closed = true;
});

pair.server.connect();
client.connect();
await waitUntil(() => opened, "client open event");

assert.equal(client.join("lobby", "Tester", "archer"), true);
assert.equal(client.sendInput({ seq: 1, moveX: 1, moveY: 0 }), true);

await waitUntil(() => seenByServer.length >= 2, "server messages");
await waitUntil(() => seenByClient.length >= 1, "client join response");

assert.deepEqual(seenByServer[0], {
  type: "join",
  roomId: "lobby",
  name: "Tester",
  classType: "archer",
  protocolVersion: 2
});
assert.deepEqual(seenByServer[1], {
  type: "input",
  input: { seq: 1, moveX: 1, moveY: 0 }
});
assert.deepEqual(seenByClient[0], {
  type: "join.ok",
  roomId: "lobby",
  controllerId: "p_local"
});

pair.server.send("{bad json");
await waitUntil(() => invalidJsonError, "invalid JSON error");
assert.match(invalidJsonError.message, /Invalid JSON/);

client.disconnect();
await waitUntil(() => closed, "client close event");
assert.equal(client.send("input", { input: { seq: 2 } }), false);

console.log("Network transport abstraction validation passed.");
