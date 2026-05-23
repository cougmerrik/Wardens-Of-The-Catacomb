import { updateDebugHudFrameStats, updateDebugHudNetworkStats } from "./debugHudStats.js";
import { tickGameplayTips } from "../game/gameplayTips.js";

export function stepNetworkEnemyPresentation(enemies, dt) {
  if (!Array.isArray(enemies) || !Number.isFinite(dt) || dt <= 0) return;
  for (const enemy of enemies) {
    if (!enemy) continue;
    enemy.hpBarTimer = Math.max(0, (Number.isFinite(enemy.hpBarTimer) ? enemy.hpBarTimer : 0) - dt);
    enemy.burningTimer = Math.max(0, (Number.isFinite(enemy.burningTimer) ? enemy.burningTimer : 0) - dt);
    enemy.curseTimer = Math.max(0, (Number.isFinite(enemy.curseTimer) ? enemy.curseTimer : 0) - dt);
    enemy.rotTimer = Math.max(0, (Number.isFinite(enemy.rotTimer) ? enemy.rotTimer : 0) - dt);
    enemy.slowTimer = Math.max(0, (Number.isFinite(enemy.slowTimer) ? enemy.slowTimer : 0) - dt);
    enemy.poisonSlowTimer = Math.max(0, (Number.isFinite(enemy.poisonSlowTimer) ? enemy.poisonSlowTimer : 0) - dt);
    enemy.confusionTimer = Math.max(0, (Number.isFinite(enemy.confusionTimer) ? enemy.confusionTimer : 0) - dt);
    enemy.weakenedTimer = Math.max(0, (Number.isFinite(enemy.weakenedTimer) ? enemy.weakenedTimer : 0) - dt);
    enemy.bleedTimer = Math.max(0, (Number.isFinite(enemy.bleedTimer) ? enemy.bleedTimer : 0) - dt);
    enemy.rangerMarkedTimer = Math.max(0, (Number.isFinite(enemy.rangerMarkedTimer) ? enemy.rangerMarkedTimer : 0) - dt);
    enemy.tempMageCharmTimer = Math.max(0, (Number.isFinite(enemy.tempMageCharmTimer) ? enemy.tempMageCharmTimer : 0) - dt);
    if (enemy.burningTimer <= 0) enemy.burningDps = 0;
    if (enemy.rotTimer <= 0) enemy.rotDps = 0;
    if (enemy.bleedTimer <= 0) enemy.bleedDps = 0;
    if (enemy.rangerMarkedTimer <= 0) enemy.rangerMarkedBy = null;
  }
}

export function applyNetworkSnapshot({
  game,
  state,
  controller = false,
  ackSeq = 0,
  applySnapshotToGame,
  isNetworkController,
  localPlayerId,
  netPredictedProjectiles,
  netPendingInputs,
  netLastAckSeq,
  netSnapshotJitterMs,
  netLastSnapshotGapMs,
  syncMusicForGame
}) {
  const next = applySnapshotToGame({
    game,
    state,
    controller,
    ackSeq,
    isNetworkController,
    localPlayerId,
    netPredictedProjectiles,
    netPendingInputs,
    netLastAckSeq,
    snapshotJitterMs: netSnapshotJitterMs,
    frameGapMs: netLastSnapshotGapMs
  });
  if (game.gameOver && !game.deathTransition?.active && typeof game.triggerGameOver === "function") {
    game.triggerGameOver();
  }
  return next;
}

export function startNetworkRenderLoopRuntime({
  game,
  getCurrentGame,
  handleNetworkUiActions,
  getNetClient,
  isNetworkController,
  getRenderDelayMs,
  estimateServerNowMs,
  getAckSeqForPacket,
  consumeSnapshotForRender,
  netSnapshotBuffer,
  maxSnapshotBuffer,
  applySnapshot,
  collectInput,
  predictFromInput,
  canRunPredictedCollision,
  prunePredictedProjectiles,
  updatePredictedProjectiles,
  updateNetworkProjectilePresentation,
  netPredictedProjectiles,
  updateVoice,
  setNetRenderRaf
}) {
  const predictedProjectileTtlMs = 220;
  const predictedProjectileRenderTtlMs = 120;
  let lastFrameAt = performance.now();
  const stepClientFloatingTexts = (texts, dt) => {
    if (!Array.isArray(texts) || texts.length === 0) return texts;
    for (const ft of texts) {
      if (!ft) continue;
      ft.life = Math.max(0, (Number.isFinite(ft.life) ? ft.life : 0) - dt);
      ft.y -= (Number.isFinite(ft.vy) ? ft.vy : 22) * dt;
    }
    return texts.filter((ft) => ft && ft.life > 0);
  };

  const loop = (now) => {
    if (!getCurrentGame() || getCurrentGame() !== game) return;
    const targetFrameMs = isNetworkController() ? 0 : 1000 / 45;
    if (targetFrameMs > 0 && now - lastFrameAt < targetFrameMs) {
      setNetRenderRaf(requestAnimationFrame(loop));
      return;
    }
    const frameMs = now - lastFrameAt;
    const dt = Math.min(frameMs / 1000, 0.05);
    lastFrameAt = now;
    updateDebugHudFrameStats(game, frameMs);
    handleNetworkUiActions(game, typeof getNetClient === "function" ? getNetClient() : null, isNetworkController());
    const renderDelay = getRenderDelayMs();
    const targetRecvTime = performance.now() - renderDelay;
    const estimatedServerNow = estimateServerNowMs();
    const targetServerTime = Number.isFinite(estimatedServerNow) ? estimatedServerNow - renderDelay : NaN;
    const pkt = consumeSnapshotForRender(netSnapshotBuffer, targetServerTime, targetRecvTime, maxSnapshotBuffer);
    if (pkt) {
      updateDebugHudNetworkStats(game, {
        role: isNetworkController() ? "Controller" : "Spectator",
        renderDelayMs: renderDelay,
        latencyMs: Number.isFinite(estimatedServerNow) && Number.isFinite(pkt.serverTime) ? Math.max(0, estimatedServerNow - pkt.serverTime) : NaN,
        snapshotAgeMs: Number.isFinite(pkt.recvTime) ? Math.max(0, performance.now() - pkt.recvTime) : NaN,
        snapshotBuffer: netSnapshotBuffer.length
      });
      const stateWithServerTime =
        pkt?.state && typeof pkt.state === "object" && (Number.isFinite(pkt.serverTime) || pkt.lastActionSeqByPlayer)
          ? { ...pkt.state, serverTime: pkt.serverTime, lastActionSeqByPlayer: pkt.lastActionSeqByPlayer }
          : pkt.state;
      const ackSeq = typeof getAckSeqForPacket === "function"
        ? getAckSeqForPacket(pkt)
        : Number.isFinite(pkt.lastInputSeq) ? pkt.lastInputSeq : 0;
      applySnapshot(game, stateWithServerTime, isNetworkController(), ackSeq);
    }
    if (isNetworkController() && game.networkRole !== "Spectating" && (game.player?.health || 0) > 0) {
      const input = collectInput(game, false);
      if (game.networkReady && typeof predictFromInput === "function") {
        predictFromInput(game, input, dt, typeof canRunPredictedCollision === "function" ? canRunPredictedCollision() : false);
      }
      if (input.hasAim) {
        if (Number.isFinite(input.aimDirX) && Number.isFinite(input.aimDirY)) {
          const alen = Math.hypot(input.aimDirX, input.aimDirY) || 1;
          game.player.dirX = input.aimDirX / alen;
          game.player.dirY = input.aimDirY / alen;
        } else {
          const ax = input.aimX - game.player.x;
          const ay = input.aimY - game.player.y;
          const alen = Math.hypot(ax, ay) || 1;
          game.player.dirX = ax / alen;
          game.player.dirY = ay / alen;
        }
      }
    }
    if (typeof game.updateDeathTransition === "function") game.updateDeathTransition(dt);
    if (typeof game.tickMultiplayerNotifications === "function") game.tickMultiplayerNotifications(dt);
    tickGameplayTips(game, dt);
    if (Array.isArray(game.map) && game.map.length > 0) {
      if (game.player.health > 0 || !game.getSpectateTargetEntity) game.revealAroundPlayer();
      else {
        const target = game.getSpectateTargetEntity();
        if (target) {
          const originalX = game.player.x;
          const originalY = game.player.y;
          game.player.x = target.x;
          game.player.y = target.y;
          game.revealAroundPlayer();
          game.player.x = originalX;
          game.player.y = originalY;
        } else {
          game.revealAroundPlayer();
        }
      }
    }
    game.floatingTexts = stepClientFloatingTexts(game.floatingTexts, dt);
    if (!game.paused) stepNetworkEnemyPresentation(game.enemies, dt);
    if (typeof updatePredictedProjectiles === "function") updatePredictedProjectiles(game, netPredictedProjectiles, dt);
    if (typeof updateNetworkProjectilePresentation === "function") updateNetworkProjectilePresentation(game, dt);
    prunePredictedProjectiles(netPredictedProjectiles, performance.now(), predictedProjectileTtlMs, game, predictedProjectileRenderTtlMs);
    if (typeof updateVoice === "function") updateVoice(game);
    game.renderer.draw(game);
    setNetRenderRaf(requestAnimationFrame(loop));
  };

  setNetRenderRaf(requestAnimationFrame(loop));
}
