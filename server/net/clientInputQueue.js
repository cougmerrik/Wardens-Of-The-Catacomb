const MAX_INPUT_QUEUE_DEPTH = 96;

function finiteSeq(value) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function resetClientInputState(client, makeDefaultInput) {
  if (!client) return;
  client.input = typeof makeDefaultInput === "function" ? makeDefaultInput() : { seq: 0 };
  client.inputQueue = [];
  client.lastInputSeq = 0;
  client.lastReceivedInputSeq = 0;
  client.lastProcessedInputSeq = 0;
  client.droppedInputCount = 0;
}

export function enqueueClientInput(client, rawInput, { sanitizeInput }) {
  if (!client || typeof sanitizeInput !== "function") return false;
  if (!Array.isArray(client.inputQueue)) client.inputQueue = [];
  const previous = client.inputQueue.length > 0
    ? client.inputQueue[client.inputQueue.length - 1]
    : client.input;
  const input = sanitizeInput(rawInput, previous);
  const seq = finiteSeq(input.seq);
  if (seq <= finiteSeq(client.lastReceivedInputSeq)) return false;
  input.seq = seq;
  client.inputQueue.push(input);
  client.lastInputSeq = seq;
  client.lastReceivedInputSeq = seq;
  if (client.inputQueue.length > MAX_INPUT_QUEUE_DEPTH) {
    const dropCount = client.inputQueue.length - MAX_INPUT_QUEUE_DEPTH;
    client.inputQueue.splice(0, dropCount);
    client.droppedInputCount = finiteSeq(client.droppedInputCount) + dropCount;
  }
  return true;
}

export function promoteQueuedClientInput(client) {
  if (!client || !Array.isArray(client.inputQueue) || client.inputQueue.length === 0) return false;
  const input = client.inputQueue[client.inputQueue.length - 1];
  client.input = { ...input };
  client.lastProcessedInputSeq = finiteSeq(input.seq);
  client.inputQueue.length = 0;
  return true;
}

export function getProcessedInputSeq(client) {
  return finiteSeq(client?.lastProcessedInputSeq);
}

export function getReceivedInputSeq(client) {
  return finiteSeq(client?.lastReceivedInputSeq ?? client?.lastInputSeq);
}

export function getInputQueueDepth(client) {
  return Array.isArray(client?.inputQueue) ? client.inputQueue.length : 0;
}
