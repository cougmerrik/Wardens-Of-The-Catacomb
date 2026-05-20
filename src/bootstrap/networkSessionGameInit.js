export function initializeNetworkGameState(game, predictedProjectiles) {
  game.networkEnabled = true;
  game.networkRole = "Connecting";
  game.networkReady = false;
  game.networkHasMap = false;
  game.networkHasChunks = false;
  game.networkChunkSync = true;
  game.networkLoadingMessage = "Connecting...";
  game.networkPerf = {
    appliedSnapshotCount: 0,
    lastCorrectionPx: 0,
    maxCorrectionPx: 0,
    hardSnapCount: 0,
    softCorrectionCount: 0,
    settleCorrectionCount: 0,
    blockedSnapCount: 0,
    postLoadCorrectionReady: false,
    postLoadCorrectionFloor: null,
    postLoadCorrectionStartedAtMs: 0,
    postLoadCorrectionSnapshotStart: 0,
    postLoadLastCorrectionPx: 0,
    postLoadMaxCorrectionPx: 0,
    postLoadHardSnapCount: 0,
    postLoadSoftCorrectionCount: 0,
    postLoadSettleCorrectionCount: 0,
    postLoadBlockedSnapCount: 0,
    recentPostLoadCorrections: [],
    serverSnapshotTelemetry: null
  };
  game.networkPredictedProjectiles = predictedProjectiles;
  game.map = [];
  game.mapWidth = 0;
  game.mapHeight = 0;
  game.worldWidth = 0;
  game.worldHeight = 0;
  game.enemies = [];
  game.drops = [];
  game.breakables = [];
  game.wallTraps = [];
  game.bullets = [];
  game.fireArrows = [];
  game.fireZones = [];
  game.meleeSwings = [];
  game.armorStands = [];
  game.lightSources = [];
  game.explored = [];
  game.navDistance = [];
  game.navPlayerTile = { x: -1, y: -1 };
}
