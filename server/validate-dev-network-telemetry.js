import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { handleDevNetworkTelemetryRequest } from "./devNetworkTelemetryApi.js";

const PORT = Number.parseInt(process.env.PORT || "8499", 10);

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function buildRenderContext(overrides = {}) {
  return {
    rendererMode: "canvas2d",
    userAgent: "validator-browser",
    platform: "Linux x86_64",
    hardwareConcurrency: 8,
    deviceMemory: 8,
    devicePixelRatio: 1.25,
    windowInnerWidth: 1280,
    windowInnerHeight: 900,
    windowOuterWidth: 1280,
    windowOuterHeight: 960,
    screenWidth: 1920,
    screenHeight: 1080,
    screenAvailWidth: 1920,
    screenAvailHeight: 1040,
    screenColorDepth: 24,
    visualViewportWidth: 1280,
    visualViewportHeight: 900,
    visualViewportScale: 1,
    canvasWidth: 1280,
    canvasHeight: 900,
    canvasClientWidth: 1280,
    canvasClientHeight: 900,
    pageVisible: true,
    documentHidden: false,
    documentHasFocus: true,
    documentVisibilityState: "visible",
    devHudEnabled: true,
    telemetryActive: true,
    telemetrySampleIntervalMs: 1000,
    prefersReducedMotion: false,
    prefersReducedData: null,
    updateSlow: false,
    displayModeBrowser: true,
    displayModeFullscreen: false,
    anyPointerCoarse: false,
    hoverNone: false,
    observedFrameWindowFps: 30,
    observedFrameWindowAvgMs: 33.3,
    observedFrameWindowP95Ms: 34,
    observedFrameWindowMaxMs: 40,
    ...overrides
  };
}

async function main() {
  const sessionId = `validate-frame-spike-${Date.now()}`;
  const server = createServer((req, res) => {
    if (req.url === "/api/dev-network-telemetry") {
      handleDevNetworkTelemetryRequest(req, res);
      return;
    }
    res.statusCode = 404;
    res.end();
  });

  try {
    await listen(server, PORT);
    const payload = {
      sessionId,
      samples: [
        {
          kind: "sample",
          at: new Date().toISOString(),
          elapsedMs: 1000,
          pageVisible: true,
          documentHasFocus: true,
          documentVisibilityState: "visible",
          renderContext: buildRenderContext(),
          gameActive: true,
          gameOver: false,
          paused: false,
          networkReady: true,
          networkRole: "Active",
          floor: 1,
          projectileReconcileRejects: 1,
          projectileReconcileRejectDelta: 1,
          networkStateAnomalyEventId: 5,
          recentStateAnomalies: [
            {
              id: 4,
              atMs: 940,
              kind: "enemyStatusFanout",
              keyframe: true,
              ackSeq: 12,
              enemyCount: 6,
              tripleStatusCount: 5,
              fullHpBarCount: 5,
              localMimicTimer: 0,
              remoteMimicCount: 0,
              remotePlayerIds: []
            },
            {
              id: 5,
              atMs: 980,
              kind: "playerMimicRuntimeVisible",
              keyframe: false,
              ackSeq: 13,
              enemyCount: null,
              tripleStatusCount: null,
              fullHpBarCount: null,
              localMimicTimer: 0,
              remoteMimicCount: 1,
              remotePlayerIds: ["owner"]
            }
          ],
          serverStateAnomalyEventId: 7,
          recentServerStateAnomalies: [
            {
              id: 7,
              atMs: 990,
              snapshotSeq: 44,
              kind: "enemyStatusFanout",
              paused: false,
              context: { source: "activePlayerAction", playerId: "owner" },
              enemyCount: 6,
              tripleStatusCount: 5,
              tripleStatusEnemies: [{ id: "e_1", burningTimer: 1, curseTimer: 1, rotTimer: 1 }],
              mimicPlayers: [],
              classMismatches: []
            }
          ],
          recentProjectileReconcileRejects: [{
            id: 3,
            atMs: 975,
            reason: "positionMismatch",
            source: "clientProjectileReconcile",
            projectileType: "bullet",
            ownerId: "local-ranger",
            spawnSeq: 42,
            bucketSeq: 41,
            exactSeq: false,
            distancePx: 72.25,
            maxDistancePx: 48,
            authoritativeX: 320.5,
            authoritativeY: 160.25,
            predictedX: 248.25,
            predictedY: 160.25,
            predictedType: "bullet"
          }]
        },
        {
          kind: "frameSpike",
          at: new Date().toISOString(),
          elapsedMs: 1234,
          spikeId: 7,
          spikeAtMs: 1200,
          frameMs: 83.4,
          rawFps: 12,
          frameWindowFps: 52.2,
          frameWindowP95Ms: 31.6,
          frameWindowMaxMs: 83.4,
          frameWindowSampleCount: 64,
          pageVisible: true,
          documentHasFocus: true,
          documentVisibilityState: "visible",
          renderContext: buildRenderContext({ observedFrameWindowFps: 52.2, observedFrameWindowP95Ms: 31.6, observedFrameWindowMaxMs: 83.4 }),
          gameActive: true,
          gameOver: false,
          paused: false,
          networkReady: true,
          networkRole: "Active",
          floor: 1,
          pingMs: 0.4,
          latencyMs: 0.2,
          jitterMs: 4.5,
          snapshotBuffer: 0,
          pendingInputs: 2,
          unackedInputs: 3,
          gapMs: 50,
          appliedSnapshotCount: 24,
          lastCorrectionPx: 2.5,
          maxCorrectionPx: 120,
          postLoadLastCorrectionPx: 2.5,
          postLoadMaxCorrectionPx: 6,
          hardSnapCount: 1,
          blockedSnapCount: 0,
          projectileReconcileRejects: 0,
          visibleProjectiles: 2,
          visibleRangerProjectiles: 1,
          ownedProjectiles: 1,
          recentShotCount: 4
        }
      ]
    };
    const response = await fetch(`http://127.0.0.1:${PORT}/api/dev-network-telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.status !== 200) {
      throw new Error(`telemetry POST failed: ${response.status} ${await response.text()}`);
    }
    const result = await response.json();
    assert.equal(result.accepted, true, "telemetry API should accept frame spike payload");
    assert.equal(result.sampleCount, 2, "telemetry API should count sample and frame spike payloads");
    assert.equal(typeof result.path, "string", "telemetry API should return artifact path");

    const lines = readFileSync(result.path, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    const sample = lines.find((entry) => entry.kind === "sample" && entry.sessionId === sessionId);
    assert(sample, "artifact should contain a sample entry");
    assert.equal(sample.projectileReconcileRejectDelta, 1, "sample should preserve projectile reject delta");
    assert.equal(sample.recentProjectileReconcileRejects?.length, 1, "sample should preserve recent projectile reject events");
    assert.equal(sample.recentProjectileReconcileRejects[0].reason, "positionMismatch", "projectile reject should preserve reason");
    assert.equal(sample.recentProjectileReconcileRejects[0].source, "clientProjectileReconcile", "projectile reject should preserve source");
    assert.equal(sample.recentProjectileReconcileRejects[0].spawnSeq, 42, "projectile reject should preserve authoritative spawn seq");
    assert.equal(sample.recentProjectileReconcileRejects[0].bucketSeq, 41, "projectile reject should preserve predicted bucket seq");
    assert.equal(sample.recentProjectileReconcileRejects[0].distancePx, 72.25, "projectile reject should preserve distance");
    assert.equal(sample.recentProjectileReconcileRejects[0].maxDistancePx, 48, "projectile reject should preserve max distance");
    assert.equal(sample.networkStateAnomalyEventId, 5, "sample should preserve network state anomaly event id");
    assert.equal(sample.recentStateAnomalies?.length, 2, "sample should preserve recent state anomaly events");
    assert.equal(sample.recentStateAnomalies[0].kind, "enemyStatusFanout", "state anomaly should preserve enemy status kind");
    assert.equal(sample.recentStateAnomalies[0].tripleStatusCount, 5, "state anomaly should preserve triple status count");
    assert.equal(sample.recentStateAnomalies[1].kind, "playerMimicRuntimeVisible", "state anomaly should preserve player mimic kind");
    assert.equal(sample.recentStateAnomalies[1].remoteMimicCount, 1, "state anomaly should preserve remote mimic count");
    assert.deepEqual(sample.recentStateAnomalies[1].remotePlayerIds, ["owner"], "state anomaly should preserve remote player ids");
    assert.equal(sample.serverStateAnomalyEventId, 7, "sample should preserve server state anomaly event id");
    assert.equal(sample.recentServerStateAnomalies?.length, 1, "sample should preserve server state anomalies");
    assert.equal(sample.recentServerStateAnomalies[0].context?.source, "activePlayerAction", "server anomaly should preserve source context");
    assert.equal(sample.recentServerStateAnomalies[0].tripleStatusEnemies?.[0]?.id, "e_1", "server anomaly should preserve enemy samples");
    assert.equal(sample.renderContext?.rendererMode, "canvas2d", "sample should preserve renderer mode");
    assert.equal(sample.renderContext?.devicePixelRatio, 1.25, "sample should preserve device pixel ratio");
    assert.equal(sample.renderContext?.visualViewportWidth, 1280, "sample should preserve visual viewport width");
    assert.equal(sample.renderContext?.canvasWidth, 1280, "sample should preserve canvas width");
    assert.equal(sample.renderContext?.documentHidden, false, "sample should preserve document hidden state");
    assert.equal(sample.renderContext?.telemetryActive, true, "sample should preserve telemetry active state");
    assert.equal(sample.renderContext?.prefersReducedMotion, false, "sample should preserve reduced-motion state");
    assert.equal(sample.renderContext?.displayModeBrowser, true, "sample should preserve display-mode state");
    assert.equal(sample.renderContext?.observedFrameWindowFps, 30, "sample should preserve observed rAF cadence");
    const spike = lines.find((entry) => entry.kind === "frameSpike" && entry.sessionId === sessionId);
    assert(spike, "artifact should contain a frameSpike entry");
    assert.equal(spike.frameMs, 83.4, "frame spike should preserve frame duration");
    assert.equal(spike.spikeId, 7, "frame spike should preserve spike id");
    assert.equal(spike.networkRole, "Active", "frame spike should include network role");
    assert.equal(spike.pendingInputs, 2, "frame spike should include input backlog");
    assert.equal(spike.visibleRangerProjectiles, 1, "frame spike should include projectile context");
    assert.equal(spike.postLoadMaxCorrectionPx, 6, "frame spike should include post-load correction context");
    assert.equal(spike.renderContext?.observedFrameWindowFps, 52.2, "frame spike should preserve render context");
    assert.equal(spike.renderContext?.observedFrameWindowMaxMs, 83.4, "frame spike should preserve frame-window max context");
    console.log("Dev network telemetry validation passed.");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
