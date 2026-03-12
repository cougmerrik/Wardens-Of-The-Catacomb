import { Game } from "./src/Game.js";
import { NetClient } from "./src/net/NetClient.js";
import { applyMapStateToGame, applyMapMetaToGame, applyMapChunkToGame, applySnapshotToGame, syncByIdLerp } from "./src/net/clientStateSync.js";

const canvas = document.getElementById("game");
const selector = document.getElementById("character-select");
const classButtons = Array.from(document.querySelectorAll("[data-class-option]"));
const startButton = document.getElementById("start-game");
const startNetworkButton = document.getElementById("start-network-game");
const serverUrlInput = document.getElementById("net-server-url");
const roomIdInput = document.getElementById("net-room-id");
const playerNameInput = document.getElementById("net-player-name");
const networkSession = document.getElementById("network-session");
const networkStatus = document.getElementById("network-status");
const networkTakeControl = document.getElementById("network-take-control");
const networkLeave = document.getElementById("network-leave");
let selectedClass = "archer";
let currentGame = null;
let netClient = null;
let netInputTimer = 0;
let netRenderRaf = 0;
let netPlayerId = null;
let netControllerId = null;
let netInputSeq = 0;
let netLastAckSeq = 0;
let netPendingInputs = [];
let netMapSignature = "";
let netPendingSnapshot = null;
const NET_INPUT_DT = 1 / 60;
const NET_RENDER_DELAY_MS_CONTROLLER = 8;
const NET_RENDER_DELAY_MS_SPECTATOR = 48;
const NET_MAX_SNAPSHOT_BUFFER = 20;
const NET_MIN_SEND_MS = 12;
const NET_FORCE_SEND_IDLE_MS = 66;
let netSnapshotBuffer = [];
let netLastInputSendAt = 0;
let netLastSentInput = null;
let netLastInputProcessAt = 0;
let netMapChunksReceived = 0;

function updateNetworkStatus(text) {
  if (networkStatus) networkStatus.textContent = text;
  if (currentGame && currentGame.networkEnabled) currentGame.networkLoadingMessage = text;
}

function setSelectedClass(classType) {
  selectedClass = classType === "fighter" || classType === "warrior" ? "fighter" : "archer";
  for (const button of classButtons) {
    const option = button.dataset.classOption === "warrior" ? "fighter" : button.dataset.classOption;
    const isActive = option === selectedClass;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
}

function stopNetworkSession() {
  if (netRenderRaf) {
    cancelAnimationFrame(netRenderRaf);
    netRenderRaf = 0;
  }
  if (netInputTimer) {
    clearInterval(netInputTimer);
    netInputTimer = 0;
  }
  if (netClient) {
    netClient.disconnect();
    netClient = null;
  }
  netPlayerId = null;
  netControllerId = null;
  netInputSeq = 0;
  netLastAckSeq = 0;
  netPendingInputs = [];
  netMapSignature = "";
  netPendingSnapshot = null;
  netSnapshotBuffer = [];
  netLastInputSendAt = 0;
  netLastSentInput = null;
  netLastInputProcessAt = 0;
  netMapChunksReceived = 0;
  if (networkSession) networkSession.hidden = true;
}

function cleanupCurrentGame() {
  if (currentGame) {
    currentGame.stop();
    currentGame = null;
  }
}

function returnToMenu() {
  stopNetworkSession();
  cleanupCurrentGame();
  if (selector) selector.hidden = false;
}

function isNetworkController() {
  return !!(netControllerId && netPlayerId && netControllerId === netPlayerId);
}

function applySnapshot(game, state, controller = false, ackSeq = 0) {
  const next = applySnapshotToGame({
    game,
    state,
    controller,
    ackSeq,
    isNetworkController: isNetworkController(),
    netPendingInputs,
    netLastAckSeq
  });
  netPendingInputs = next.netPendingInputs;
  netLastAckSeq = next.netLastAckSeq;
}

function collectInput(game, consumeQueued = true) {
  const keys = game.input.keys;
  let moveX = 0;
  let moveY = 0;
  if (keys.has("arrowleft") || keys.has("a")) moveX -= 1;
  if (keys.has("arrowright") || keys.has("d")) moveX += 1;
  if (keys.has("arrowup") || keys.has("w")) moveY -= 1;
  if (keys.has("arrowdown") || keys.has("s")) moveY += 1;
  return {
    moveX,
    moveY,
    hasAim: !!game.input.mouse.hasAim,
    aimX: game.input.mouse.worldX,
    aimY: game.input.mouse.worldY,
    firePrimaryQueued: consumeQueued ? game.input.consumeLeftQueued() : false,
    firePrimaryHeld: !!game.input.mouse.leftDown,
    fireAltQueued: consumeQueued ? game.input.consumeRightQueued() : false
  };
}

function shouldSendNetworkInput(input, nowMs) {
  if (!netLastSentInput) return true;
  const prev = netLastSentInput;
  const changedMove = input.moveX !== prev.moveX || input.moveY !== prev.moveY;
  const changedAimMode = input.hasAim !== prev.hasAim;
  const changedAimPos =
    input.hasAim &&
    prev.hasAim &&
    (Math.abs(input.aimX - prev.aimX) > 1.5 || Math.abs(input.aimY - prev.aimY) > 1.5);
  const hasAction = !!input.firePrimaryQueued || !!input.fireAltQueued;
  if (changedMove || changedAimMode || changedAimPos || hasAction) return true;
  return nowMs - netLastInputSendAt >= NET_FORCE_SEND_IDLE_MS;
}

function handleNetworkUiActions(game) {
  if (!netClient || !isNetworkController()) {
    game.input.consumeUiLeftClicks();
    if (game.input.consumeWheelDelta) game.input.consumeWheelDelta();
    return;
  }
  const wheelDelta = game.input.consumeWheelDelta ? game.input.consumeWheelDelta() : 0;
  if (wheelDelta !== 0 && (game.skillTreeOpen || game.shopOpen)) {
    const target = game.skillTreeOpen
      ? { area: game.uiRects.skillTreeScrollArea, max: game.uiRects.skillTreeScrollMax, key: "skillTree" }
      : { area: game.uiRects.shopScrollArea, max: game.uiRects.shopScrollMax, key: "shop" };
    const max = Number.isFinite(target.max) ? target.max : 0;
    const step = Math.sign(wheelDelta) * Math.max(36, Math.abs(wheelDelta));
    const next = (game.uiScroll?.[target.key] || 0) + step;
    game.uiScroll[target.key] = Math.max(0, Math.min(max, next));
  }
  if (game.input.consumeKeyQueued("escape")) {
    netClient.sendAction({ kind: "escape" });
  }
  const clicks = game.input.consumeUiLeftClicks();
  if (clicks.length === 0) return;

  const hit = (x, y, rect) => game.pointInRect(x, y, rect);
  for (const click of clicks) {
    if (hit(click.x, click.y, game.uiRects.shopButton)) {
      netClient.sendAction({ kind: "toggleShop" });
      continue;
    }
    if (hit(click.x, click.y, game.uiRects.shopClose)) {
      netClient.sendAction({ kind: "closeShop" });
      continue;
    }
    if (hit(click.x, click.y, game.uiRects.skillTreeButton)) {
      netClient.sendAction({ kind: "toggleSkillTree" });
      continue;
    }
    if (hit(click.x, click.y, game.uiRects.skillTreeClose)) {
      netClient.sendAction({ kind: "closeSkillTree" });
      continue;
    }
    if (hit(click.x, click.y, game.uiRects.statsButton)) {
      netClient.sendAction({ kind: "toggleStats" });
      continue;
    }
    if (hit(click.x, click.y, game.uiRects.statsClose)) {
      netClient.sendAction({ kind: "closeStats" });
      continue;
    }
    const itemRects = game.uiRects.shopItems || [];
    for (const item of itemRects) {
      if (hit(click.x, click.y, item.rect)) {
        netClient.sendAction({ kind: "buyUpgrade", key: item.key });
        break;
      }
    }
    if (hit(click.x, click.y, game.uiRects.skillFireArrowNode)) {
      netClient.sendAction({ kind: "spendSkill", key: "fireArrow" });
      continue;
    }
    if (hit(click.x, click.y, game.uiRects.skillPiercingNode)) {
      netClient.sendAction({ kind: "spendSkill", key: "piercingStrike" });
      continue;
    }
    if (hit(click.x, click.y, game.uiRects.skillMultiarrowNode)) {
      netClient.sendAction({ kind: "spendSkill", key: "multiarrow" });
      continue;
    }
    if (hit(click.x, click.y, game.uiRects.skillWarriorMomentumNode)) {
      netClient.sendAction({ kind: "spendSkill", key: "warriorMomentum" });
      continue;
    }
    if (hit(click.x, click.y, game.uiRects.skillWarriorRageNode)) {
      netClient.sendAction({ kind: "spendSkill", key: "warriorRage" });
    }
  }
}

function updateNetworkRole(game) {
  if (!game) return;
  const role = isNetworkController() ? "Controller" : "Spectator";
  game.networkEnabled = true;
  game.networkRole = role;
  if (networkTakeControl) networkTakeControl.disabled = role === "Controller";
}

function predictFromInput(game, input, dt) {
  if (!isNetworkController()) return;
  if (!netMapSignature) return;
  let mx = input.moveX;
  let my = input.moveY;
  if (mx || my) {
    const len = Math.hypot(mx, my) || 1;
    const speed = game.getPlayerMoveSpeed();
    game.moveWithCollision(game.player, (mx / len) * speed * dt, (my / len) * speed * dt);
    game.player.moving = true;
  } else {
    game.player.moving = false;
  }

  if (input.hasAim) {
    const ax = input.aimX - game.player.x;
    const ay = input.aimY - game.player.y;
    const alen = Math.hypot(ax, ay) || 1;
    game.player.dirX = ax / alen;
    game.player.dirY = ay / alen;
  }
}

function startNetworkRenderLoop(game) {
  const consumeSnapshotForRender = (targetTime) => {
    if (netSnapshotBuffer.length === 0) return null;
    // Keep buffer bounded and drop stale backlog to prevent catch-up bursts.
    if (netSnapshotBuffer.length > NET_MAX_SNAPSHOT_BUFFER) {
      netSnapshotBuffer.splice(0, netSnapshotBuffer.length - NET_MAX_SNAPSHOT_BUFFER);
    }
    let chosenIndex = -1;
    for (let i = 0; i < netSnapshotBuffer.length; i++) {
      if (netSnapshotBuffer[i].recvTime <= targetTime) chosenIndex = i;
      else break;
    }
    if (chosenIndex < 0) {
      // Nothing old enough yet; avoid rendering far behind by trimming excessive queue growth.
      if (netSnapshotBuffer.length > 10) {
        const keep = netSnapshotBuffer.slice(-6);
        netSnapshotBuffer.length = 0;
        netSnapshotBuffer.push(...keep);
      }
      return null;
    }
    const chosen = netSnapshotBuffer[chosenIndex];
    // Drop all snapshots up to chosen; render at most one snapshot per frame.
    netSnapshotBuffer.splice(0, chosenIndex + 1);
    return chosen;
  };

  const loop = () => {
    if (!currentGame || currentGame !== game) return;
    handleNetworkUiActions(game);
    const renderDelay = isNetworkController() ? NET_RENDER_DELAY_MS_CONTROLLER : NET_RENDER_DELAY_MS_SPECTATOR;
    const targetTime = performance.now() - renderDelay;
    const pkt = consumeSnapshotForRender(targetTime);
    if (pkt) {
      applySnapshot(
        game,
        pkt.state,
        isNetworkController(),
        Number.isFinite(pkt.lastInputSeq) ? pkt.lastInputSeq : 0
      );
      game.networkReady = true;
    }
    if (isNetworkController()) {
      const input = collectInput(game, false);
      if (input.hasAim) {
        const ax = input.aimX - game.player.x;
        const ay = input.aimY - game.player.y;
        const alen = Math.hypot(ax, ay) || 1;
        game.player.dirX = ax / alen;
        game.player.dirY = ay / alen;
      }
    }
    if (Array.isArray(game.map) && game.map.length > 0) game.revealAroundPlayer();
    game.renderer.draw(game);
    netRenderRaf = requestAnimationFrame(loop);
  };
  netRenderRaf = requestAnimationFrame(loop);
}

function startLocalGame() {
  stopNetworkSession();
  if (selector) selector.hidden = true;
  cleanupCurrentGame();
  currentGame = new Game(canvas, {
    classType: selectedClass,
    onReturnToMenu: returnToMenu
  });
  currentGame.start();
}

function startNetworkGame() {
  stopNetworkSession();
  if (selector) selector.hidden = true;
  if (networkSession) networkSession.hidden = false;
  cleanupCurrentGame();

  const wsUrl = serverUrlInput && serverUrlInput.value ? serverUrlInput.value.trim() : "ws://localhost:8090";
  const roomId = roomIdInput && roomIdInput.value ? roomIdInput.value.trim() : "lobby";
  const name = playerNameInput && playerNameInput.value ? playerNameInput.value.trim() : "Player";

  const game = new Game(canvas, {
    classType: selectedClass,
    onReturnToMenu: returnToMenu
  });
  game.networkEnabled = true;
  game.networkRole = "Connecting";
  game.networkReady = false;
  game.networkHasMap = false;
  game.networkHasChunks = false;
  game.networkLoadingMessage = "Connecting...";
  currentGame = game;
  updateNetworkStatus(`Connecting to ${wsUrl}...`);
  startNetworkRenderLoop(game);

  netClient = new NetClient(wsUrl);
  netClient.on("open", () => {
    updateNetworkStatus(`Connected. Joining room "${roomId}"...`);
    netClient.join(roomId, name, selectedClass);
  });
  netClient.on("hello", (msg) => {
    netPlayerId = msg.playerId || null;
  });
  netClient.on("join.ok", (msg) => {
    netControllerId = msg.controllerId || null;
    updateNetworkRole(game);
    updateNetworkStatus(`Joined "${msg.roomId}" as ${game.networkRole}`);
  });
  netClient.on("room.roster", (msg) => {
    netControllerId = msg.controllerId || null;
    updateNetworkRole(game);
    const players = Array.isArray(msg.players) ? msg.players.length : 0;
    updateNetworkStatus(`Room: ${players} connected | Role: ${game.networkRole}`);
  });
  const handleMapReady = () => {
    if (!game.networkHasMap || !game.networkHasChunks) return;
    if (netPendingSnapshot && (!netPendingSnapshot.mapSignature || netPendingSnapshot.mapSignature === netMapSignature)) {
      netSnapshotBuffer.push({ recvTime: performance.now(), ...netPendingSnapshot });
      netPendingSnapshot = null;
    }
    updateNetworkRole(game);
    updateNetworkStatus(`Room synced | Role: ${game.networkRole}`);
    game.networkReady = true;
  };

  netClient.on("state.mapMeta", (msg) => {
    netMapSignature = applyMapMetaToGame(game, msg) || netMapSignature;
    netPendingInputs = [];
    netLastAckSeq = 0;
    netSnapshotBuffer = [];
    netMapChunksReceived = 0;
    game.networkHasMap = true;
    game.networkHasChunks = false;
    game.armorStands = syncByIdLerp(game.armorStands, msg.armorStands, 1);
    updateNetworkStatus("Loading nearby map chunks...");
  });
  netClient.on("state.mapChunk", (msg) => {
    const chunkSig = typeof msg.mapSignature === "string" ? msg.mapSignature : "";
    if (chunkSig && netMapSignature && chunkSig !== netMapSignature) return;
    if (applyMapChunkToGame(game, msg)) {
      netMapChunksReceived += 1;
      if (netMapChunksReceived >= 1) {
        game.networkHasChunks = true;
        handleMapReady();
      }
    }
  });
  // Backward-compatibility with pre-chunk servers.
  netClient.on("state.map", (msg) => {
    netMapSignature = applyMapStateToGame(game, msg) || netMapSignature;
    netPendingInputs = [];
    netLastAckSeq = 0;
    netSnapshotBuffer = [];
    game.networkHasMap = true;
    game.networkHasChunks = true;
    game.armorStands = syncByIdLerp(game.armorStands, msg.armorStands, 1);
    handleMapReady();
  });
  netClient.on("state.snapshot", (msg) => {
    netControllerId = msg.controllerId || netControllerId;
    const snapshotSig = typeof msg.mapSignature === "string" ? msg.mapSignature : "";
    if (snapshotSig && netMapSignature && snapshotSig !== netMapSignature) {
      netPendingSnapshot = msg;
      game.networkReady = false;
      game.networkHasChunks = false;
      netMapChunksReceived = 0;
      updateNetworkStatus("Synchronizing floor data...");
      updateNetworkRole(game);
      return;
    }
    if (snapshotSig && !netMapSignature) {
      netPendingSnapshot = msg;
      game.networkReady = false;
      game.networkHasChunks = false;
      updateNetworkStatus("Waiting for map meta...");
      updateNetworkRole(game);
      return;
    }
    netSnapshotBuffer.push({ recvTime: performance.now(), ...msg });
    if (netSnapshotBuffer.length > NET_MAX_SNAPSHOT_BUFFER * 2) {
      netSnapshotBuffer.splice(0, netSnapshotBuffer.length - NET_MAX_SNAPSHOT_BUFFER);
    }
    if (game.networkHasMap && game.networkHasChunks) game.networkReady = true;
    updateNetworkRole(game);
  });
  netClient.on("warn", (msg) => updateNetworkStatus(`Warning: ${msg.message || "Server warning"}`));
  netClient.on("error", (msg) => updateNetworkStatus(`Error: ${msg.message || "Connection error"}`));
  netClient.on("close", () => {
    game.networkReady = false;
    updateNetworkStatus("Disconnected from server");
  });
  netClient.connect();

  netInputTimer = setInterval(() => {
    if (!netClient || !currentGame || currentGame !== game) return;
    const input = collectInput(game, true);
    input.seq = ++netInputSeq;
    const nowMs = performance.now();
    const inputDt = netLastInputProcessAt > 0 ? Math.min(0.05, Math.max(0.001, (nowMs - netLastInputProcessAt) / 1000)) : NET_INPUT_DT;
    netLastInputProcessAt = nowMs;
    if (nowMs - netLastInputSendAt < NET_MIN_SEND_MS && !input.firePrimaryQueued && !input.fireAltQueued) {
      return;
    }
    if (!shouldSendNetworkInput(input, nowMs)) return;
    netLastInputSendAt = nowMs;
    netLastSentInput = {
      moveX: input.moveX,
      moveY: input.moveY,
      hasAim: input.hasAim,
      aimX: input.aimX,
      aimY: input.aimY,
      firePrimaryQueued: input.firePrimaryQueued,
      fireAltQueued: input.fireAltQueued
    };
    if (!isNetworkController()) {
      input.firePrimaryQueued = false;
      input.firePrimaryHeld = false;
      input.fireAltQueued = false;
    } else {
      predictFromInput(game, input, inputDt);
      netPendingInputs.push({
        seq: input.seq,
        dt: inputDt,
        moveX: input.moveX,
        moveY: input.moveY,
        hasAim: input.hasAim,
        aimX: input.aimX,
        aimY: input.aimY
      });
      if (netPendingInputs.length > 120) {
        netPendingInputs.splice(0, netPendingInputs.length - 120);
      }
    }
    netClient.sendInput(input);
  }, 16);
}

if (!canvas) {
  throw new Error("Game canvas not found.");
}

if (!selector || !startButton || classButtons.length === 0) {
  currentGame = new Game(canvas, { classType: "archer" });
  currentGame.start();
} else {
  setSelectedClass("archer");
  for (const button of classButtons) {
    button.addEventListener("click", () => setSelectedClass(button.dataset.classOption));
  }
  startButton.addEventListener("click", startLocalGame);
  if (startNetworkButton) startNetworkButton.addEventListener("click", startNetworkGame);
  if (networkTakeControl) {
    networkTakeControl.addEventListener("click", () => {
      if (netClient) netClient.takeControl();
    });
  }
  if (networkLeave) networkLeave.addEventListener("click", returnToMenu);
}
