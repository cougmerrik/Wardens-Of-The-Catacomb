export function installDebugRuntime({ getCurrentGame, getMusicDebugState, getNetworkDebugState, getVoiceDebugState = null }) {
  if (typeof window === "undefined") return;
  window.__WOTC_DEBUG__ = {
    getState() {
      const game = typeof getCurrentGame === "function" ? getCurrentGame() : null;
      if (!game) return null;
      const tileSize = game.config?.map?.tile || 32;
      const playerX = Number.isFinite(game.player?.x) ? game.player.x : 0;
      const playerY = Number.isFinite(game.player?.y) ? game.player.y : 0;
      const tileX = Math.floor(playerX / tileSize);
      const tileY = Math.floor(playerY / tileSize);
      const tile =
        Array.isArray(game.map) && tileY >= 0 && tileX >= 0 && tileY < game.map.length && tileX < game.map[0].length
          ? (typeof game.map[tileY] === "string" ? game.map[tileY][tileX] : game.map[tileY][tileX])
          : null;
      const radius = Math.max(4, (game.player?.size || 20) * 0.5);
      const walkable =
        typeof game.isPositionWalkable === "function"
          ? game.isPositionWalkable(playerX, playerY, radius, true)
          : null;
      const camera = typeof game.getCamera === "function" ? game.getCamera() : { x: 0, y: 0 };
      const hostiles = Array.isArray(game.enemies)
        ? game.enemies
            .filter((enemy) => enemy && (!game.isEnemyFriendlyToPlayer || !game.isEnemyFriendlyToPlayer(enemy)) && (enemy.hp || 0) > 0)
            .map((enemy) => ({
              id: enemy.id || null,
              type: enemy.type || "",
              x: enemy.x,
              y: enemy.y,
              hp: enemy.hp,
              maxHp: enemy.maxHp,
              hpBarTimer: Number.isFinite(enemy.hpBarTimer) ? enemy.hpBarTimer : 0,
              burningTimer: Number.isFinite(enemy.burningTimer) ? enemy.burningTimer : 0,
              curseTimer: Number.isFinite(enemy.curseTimer) ? enemy.curseTimer : 0,
              rotTimer: Number.isFinite(enemy.rotTimer) ? enemy.rotTimer : 0,
              burningDps: Number.isFinite(enemy.burningDps) ? enemy.burningDps : 0,
              rotDps: Number.isFinite(enemy.rotDps) ? enemy.rotDps : 0,
              size: enemy.size || 0,
              distToPlayer: Math.hypot((enemy.x || 0) - playerX, (enemy.y || 0) - playerY),
              screenX: (enemy.x || 0) - camera.x,
              screenY: (enemy.y || 0) - camera.y
            }))
            .sort((a, b) => a.distToPlayer - b.distToPlayer)
            .slice(0, 12)
        : [];
      const lightSources = Array.isArray(game.lightSources) ? game.lightSources : [];
      const activeLightSources = typeof game.getActiveLightSources === "function" ? game.getActiveLightSources() : [];
      const torchLightSources = lightSources.filter((source) => source && source.type === "torch");
      const pointLevels = (tree) => Object.fromEntries(
        Object.entries(tree || {}).map(([key, node]) => [
          key,
          Number.isFinite(node?.points) ? Math.max(0, Math.floor(node.points)) : 0
        ])
      );
      const talentLevels = {
        ...pointLevels(game.rangerTalents),
        ...pointLevels(game.warriorTalents),
        ...pointLevels(game.necromancerTalents)
      };
      const projectileDebug = [
        ...((Array.isArray(game.bullets) ? game.bullets : []).map((projectile) => ({ projectile, kind: "bullet" }))),
        ...((Array.isArray(game.fireArrows) ? game.fireArrows : []).map((projectile) => ({ projectile, kind: "fireArrow" })))
      ].filter(({ projectile }) => projectile).map(({ projectile, kind }) => {
        const screenX = (projectile.x || 0) - camera.x;
        const screenY = (projectile.y || 0) - camera.y;
        return {
          source: projectile.predicted ? "predictedRendered" : "authoritative",
          kind,
          x: projectile.x,
          y: projectile.y,
          screenX,
          screenY,
          onScreen: screenX >= -32 && screenY >= -32 && screenX <= 992 && screenY <= 672,
          vx: projectile.vx || 0,
          vy: projectile.vy || 0,
          angle: projectile.angle,
          life: projectile.life,
          ownerId: projectile.ownerId || "",
          faction: projectile.faction || "player",
          spawnSeq: projectile.spawnSeq || 0,
          projectileType: projectile.projectileType || "bullet"
        };
      });
      const spentSkillPoints = typeof game.getSpentSkillPointCount === "function" ? game.getSpentSkillPointCount() : 0;
      const refundCost = typeof game.getSkillRefundCost === "function" ? game.getSkillRefundCost(spentSkillPoints, game.refundCount) : 0;
      return {
        gameOver: !!game.gameOver,
        networkReady: !!game.networkReady,
        networkHasMap: !!game.networkHasMap,
        networkHasChunks: !!game.networkHasChunks,
        networkRole: game.networkRole || "",
        debugHud: game.debugHudStats && typeof game.debugHudStats === "object"
          ? {
              enabled: !!game.debugHudEnabled,
              fps: Number.isFinite(game.debugHudStats.fps) ? game.debugHudStats.fps : 0,
              frameMs: Number.isFinite(game.debugHudStats.frameMs) ? game.debugHudStats.frameMs : 0,
              rawFps: Number.isFinite(game.debugHudStats.rawFps) ? game.debugHudStats.rawFps : 0,
              rawFrameMs: Number.isFinite(game.debugHudStats.rawFrameMs) ? game.debugHudStats.rawFrameMs : 0,
              frameCount: Number.isFinite(game.debugHudStats.frameCount) ? game.debugHudStats.frameCount : 0,
              frameWindowFps: Number.isFinite(game.debugHudStats.frameWindowFps) ? game.debugHudStats.frameWindowFps : 0,
              frameWindowAvgMs: Number.isFinite(game.debugHudStats.frameWindowAvgMs) ? game.debugHudStats.frameWindowAvgMs : 0,
              frameWindowP95Ms: Number.isFinite(game.debugHudStats.frameWindowP95Ms) ? game.debugHudStats.frameWindowP95Ms : 0,
              frameWindowMaxMs: Number.isFinite(game.debugHudStats.frameWindowMaxMs) ? game.debugHudStats.frameWindowMaxMs : 0,
              frameWindowSampleCount: Number.isFinite(game.debugHudStats.frameWindowSampleCount) ? game.debugHudStats.frameWindowSampleCount : 0,
              frameSpikeCount: Number.isFinite(game.debugHudStats.frameSpikeCount) ? game.debugHudStats.frameSpikeCount : 0,
              recentFrameSpikes: Array.isArray(game.debugHudStats.recentFrameSpikes)
                ? game.debugHudStats.recentFrameSpikes.slice(-8).map((entry) => ({ ...entry }))
                : [],
              network: game.debugHudStats.network && typeof game.debugHudStats.network === "object"
                ? { ...game.debugHudStats.network }
                : null,
              rect: game.debugHudStatsRect && typeof game.debugHudStatsRect === "object"
                ? { ...game.debugHudStatsRect }
                : null,
              uiRect: game.networkStatsPanelRect && typeof game.networkStatsPanelRect === "object"
                ? { ...game.networkStatsPanelRect }
                : null
            }
          : null,
        floor: game.floor,
        player: {
          x: playerX,
          y: playerY,
          size: game.player?.size || 0,
          health: game.player?.health || 0,
          classType: game.player?.classType || game.classType || "",
          level: Number.isFinite(game.level) ? game.level : (game.player?.level || 1),
          dirX: game.player?.dirX || 0,
          dirY: game.player?.dirY || 0,
          fireCooldown: game.player?.fireCooldown || 0,
          fireArrowCooldown: game.player?.fireArrowCooldown || 0,
          lanternFuel: Number.isFinite(game.player?.lanternFuel) ? game.player.lanternFuel : null,
          lightRadius: typeof game.getPlayerLightRadius === "function" ? game.getPlayerLightRadius(game.player) : null
        },
        remotePlayers: Array.isArray(game.remotePlayers)
          ? game.remotePlayers.slice(0, 8).map((player) => ({
              id: player?.id || null,
              handle: player?.handle || player?.name || "",
              x: Number.isFinite(player?.x) ? player.x : 0,
              y: Number.isFinite(player?.y) ? player.y : 0,
              screenX: (Number.isFinite(player?.x) ? player.x : 0) - camera.x,
              screenY: (Number.isFinite(player?.y) ? player.y : 0) - camera.y,
              health: Number.isFinite(player?.health) ? player.health : 0,
              classType: player?.classType || "",
              alive: player?.alive !== false
            }))
          : [],
        aim: {
          x: Number.isFinite(game.input?.mouse?.worldX) ? game.input.mouse.worldX : null,
          y: Number.isFinite(game.input?.mouse?.worldY) ? game.input.mouse.worldY : null,
          hasAim: !!game.input?.mouse?.hasAim
        },
        camera,
        tile: {
          x: tileX,
          y: tileY,
          value: tile
        },
        walkable,
        hostiles,
        lighting: {
          enabled: game.config?.lighting?.enabled !== false,
          ambientDarknessAlpha: Number.isFinite(game.config?.lighting?.ambientDarknessAlpha) ? game.config.lighting.ambientDarknessAlpha : null,
          maxDarknessAlpha: Number.isFinite(game.config?.lighting?.maxDarknessAlpha) ? game.config.lighting.maxDarknessAlpha : null,
          lanternFuel: Number.isFinite(game.player?.lanternFuel) ? game.player.lanternFuel : null,
          playerLightRadius: typeof game.getPlayerLightRadius === "function" ? game.getPlayerLightRadius(game.player) : null,
          lightSourceCount: lightSources.length,
          torchCount: torchLightSources.length,
          litTorchCount: torchLightSources.filter((source) => source.lit !== false).length,
          unlitTorchCount: torchLightSources.filter((source) => source.lit === false).length,
          activeLightSourceCount: Array.isArray(activeLightSources) ? activeLightSources.length : 0,
          torches: torchLightSources.slice(0, 12).map((source) => ({
            id: source.id || null,
            x: source.x,
            y: source.y,
            screenX: (source.x || 0) - camera.x,
            screenY: (source.y || 0) - camera.y,
            distToPlayer: Math.hypot((source.x || 0) - playerX, (source.y || 0) - playerY),
            lit: source.lit !== false,
            lightRadius: source.lightRadius || 0
          })),
          firstTorch: torchLightSources.length > 0
            ? {
                id: torchLightSources[0].id || null,
                x: torchLightSources[0].x,
                y: torchLightSources[0].y,
                lit: torchLightSources[0].lit !== false,
                lightRadius: torchLightSources[0].lightRadius || 0
              }
            : null
        },
        combat: {
          meleeSwingCount: Array.isArray(game.meleeSwings) ? game.meleeSwings.length : 0,
          bulletCount: Array.isArray(game.bullets) ? game.bullets.length : 0,
          fireArrowCount: Array.isArray(game.fireArrows) ? game.fireArrows.length : 0,
          predictedRenderedProjectileCount: Array.isArray(game.bullets)
            ? game.bullets.filter((projectile) => projectile?.predicted).length
            : 0,
          predictedProjectileCount: game.networkPredictedProjectiles instanceof Map
            ? Array.from(game.networkPredictedProjectiles.values()).reduce((count, list) => count + (Array.isArray(list) ? list.length : 0), 0)
            : 0,
          visibleRangerProjectileCount: projectileDebug.filter((projectile) =>
            projectile.onScreen &&
            projectile.faction !== "enemy" &&
            (projectile.kind === "fireArrow" || String(projectile.projectileType || "").startsWith("ranger_"))
          ).length,
          visibleProjectiles: projectileDebug.filter((projectile) => projectile.onScreen).slice(-24),
          floatingTextCount: Array.isArray(game.floatingTexts) ? game.floatingTexts.length : 0,
          recentFloatingTexts: Array.isArray(game.floatingTexts)
            ? game.floatingTexts.slice(-6).map((entry) => ({
                text: entry.text,
                color: entry.color,
                x: entry.x,
                y: entry.y,
                life: entry.life
              }))
            : [],
          ownedProjectiles: [
            ...((Array.isArray(game.bullets) ? game.bullets : [])
              .filter((projectile) => {
                const netState = typeof getNetworkDebugState === "function" ? getNetworkDebugState() : null;
                return !netState?.playerId || projectile.ownerId === netState.playerId;
              })
              .slice(-8)
              .map((projectile) => ({
                source: projectile.predicted ? "predictedRendered" : "authoritative",
                kind: "bullet",
                x: projectile.x,
                y: projectile.y,
                vx: projectile.vx || 0,
                vy: projectile.vy || 0,
                angle: projectile.angle,
                life: projectile.life,
                spawnSeq: projectile.spawnSeq || 0,
                projectileType: projectile.projectileType || "bullet"
              }))),
            ...((game.networkPredictedProjectiles instanceof Map
              ? Array.from(game.networkPredictedProjectiles.values()).flat()
              : [])
              .filter((projectile) => projectile && projectile.type === "bullet")
              .slice(-8)
              .map((projectile) => ({
                source: "predicted",
                kind: projectile.type,
                x: projectile.x,
                y: projectile.y,
                vx: projectile.vx || 0,
                vy: projectile.vy || 0,
                angle: projectile.angle,
                life: projectile.life,
                spawnSeq: projectile.seq || 0,
                projectileType: projectile.type || "bullet",
                createdAt: projectile.createdAt || 0
              })))
          ],
          recentPlayerShots: Array.isArray(game.recentPlayerShots)
            ? game.recentPlayerShots.slice(-8).map((shot) => ({
                atMs: shot.atMs,
                source: shot.source || "",
                moving: !!shot.moving,
                playerX: shot.playerX,
                playerY: shot.playerY,
                aimX: shot.aimX,
                aimY: shot.aimY,
                intendedAngle: shot.intendedAngle,
                volleyAngles: Array.isArray(shot.volleyAngles) ? shot.volleyAngles.slice() : [],
                multishotCount: shot.multishotCount || 0,
                projectileSpeed: shot.projectileSpeed || 0,
                fireCooldown: shot.fireCooldown || 0,
                seq: shot.seq || 0
              }))
            : []
        },
        net: typeof getNetworkDebugState === "function" ? getNetworkDebugState() : null,
        networkPerf: game.networkPerf && typeof game.networkPerf === "object"
          ? {
              appliedSnapshotCount: game.networkPerf.appliedSnapshotCount || 0,
              lastCorrectionPx: game.networkPerf.lastCorrectionPx || 0,
              maxCorrectionPx: game.networkPerf.maxCorrectionPx || 0,
              hardSnapCount: game.networkPerf.hardSnapCount || 0,
              softCorrectionCount: game.networkPerf.softCorrectionCount || 0,
              settleCorrectionCount: game.networkPerf.settleCorrectionCount || 0,
              blockedSnapCount: game.networkPerf.blockedSnapCount || 0,
              postLoadCorrectionReady: !!game.networkPerf.postLoadCorrectionReady,
              postLoadCorrectionFloor: Number.isFinite(game.networkPerf.postLoadCorrectionFloor) ? game.networkPerf.postLoadCorrectionFloor : null,
              postLoadCorrectionStartedAtMs: game.networkPerf.postLoadCorrectionStartedAtMs || 0,
              postLoadCorrectionSnapshotStart: game.networkPerf.postLoadCorrectionSnapshotStart || 0,
              postLoadLastCorrectionPx: game.networkPerf.postLoadLastCorrectionPx || 0,
              postLoadMaxCorrectionPx: game.networkPerf.postLoadMaxCorrectionPx || 0,
              postLoadHardSnapCount: game.networkPerf.postLoadHardSnapCount || 0,
              postLoadSoftCorrectionCount: game.networkPerf.postLoadSoftCorrectionCount || 0,
              postLoadSettleCorrectionCount: game.networkPerf.postLoadSettleCorrectionCount || 0,
              postLoadBlockedSnapCount: game.networkPerf.postLoadBlockedSnapCount || 0,
              recentPostLoadCorrections: Array.isArray(game.networkPerf.recentPostLoadCorrections)
                ? game.networkPerf.recentPostLoadCorrections.slice(-8).map((entry) => ({ ...entry }))
                : [],
              networkFlightEventId: game.networkPerf.networkFlightEventId || 0,
              recentFlightEvents: Array.isArray(game.networkPerf.recentFlightEvents)
                ? game.networkPerf.recentFlightEvents.slice(-24).map((entry) => ({ ...entry }))
                : [],
              projectileReconcileRejects: game.networkPerf.projectileReconcileRejects || 0,
              recentProjectileReconcileRejects: Array.isArray(game.networkPerf.recentProjectileReconcileRejects)
                ? game.networkPerf.recentProjectileReconcileRejects.slice(-8).map((entry) => ({ ...entry }))
                : [],
              networkStateAnomalyEventId: game.networkPerf.networkStateAnomalyEventId || 0,
              recentStateAnomalies: Array.isArray(game.networkPerf.recentStateAnomalies)
                ? game.networkPerf.recentStateAnomalies.slice(-12).map((entry) => ({ ...entry }))
                : [],
              serverStateAnomalyEventId: game.networkPerf.serverStateAnomalyEventId || 0,
              recentServerStateAnomalies: Array.isArray(game.networkPerf.recentServerStateAnomalies)
                ? game.networkPerf.recentServerStateAnomalies.slice(-12).map((entry) => ({ ...entry }))
                : []
            }
          : null,
        ui: {
          paused: !!game.paused,
          shopOpen: !!game.shopOpen,
          skillTreeOpen: !!game.skillTreeOpen,
          statsPanelOpen: !!game.statsPanelOpen,
          gold: Number.isFinite(game.gold) ? game.gold : 0,
          skillPoints: Number.isFinite(game.skillPoints) ? game.skillPoints : 0,
          shopButton: game.uiRects?.shopButton || null,
          skillTreeButton: game.uiRects?.skillTreeButton || null,
          shopClose: game.uiRects?.shopClose || null,
          skillTreeClose: game.uiRects?.skillTreeClose || null,
          refundButton: game.uiRects?.skillRefundButton || null,
          refundCount: Math.max(0, Number.isFinite(game.refundCount) ? Math.floor(game.refundCount) : 0),
          refundCost,
          spentSkillPoints,
          skillTreeNodes: Array.isArray(game.uiRects?.skillTreeNodes)
            ? game.uiRects.skillTreeNodes.map((entry) => ({
                key: entry?.key || "",
                kind: entry?.kind || "node",
                rect: entry?.rect || null
              }))
            : [],
          talentLevels,
          shopItems: Array.isArray(game.uiRects?.shopItems)
            ? game.uiRects.shopItems.slice(0, 4).map((entry) => ({
                key: entry.key,
                rect: entry.rect
              }))
            : [],
          shopStock: Array.isArray(game.shopStock)
            ? game.shopStock.slice(0, 5).map((entry) => ({
                key: entry?.key || "",
                stock: Number.isFinite(entry?.stock) ? entry.stock : 0
              }))
            : [],
          consumables: {
            activeSlots: Array.isArray(game.consumables?.activeSlots)
              ? game.consumables.activeSlots.map((slot) => ({
                  key: slot?.key || "",
                  count: Number.isFinite(slot?.count) ? slot.count : 0,
                  cooldownRemaining: Number.isFinite(slot?.cooldownRemaining) ? slot.cooldownRemaining : 0
                }))
              : [],
            passiveSlots: Array.isArray(game.consumables?.passiveSlots)
              ? game.consumables.passiveSlots.map((slot) => ({
                  key: slot?.key || "",
                  count: Number.isFinite(slot?.count) ? slot.count : 0,
                  cooldownRemaining: Number.isFinite(slot?.cooldownRemaining) ? slot.cooldownRemaining : 0
                }))
              : [],
            sharedCooldown: Number.isFinite(game.consumables?.sharedCooldown) ? game.consumables.sharedCooldown : 0
          },
          skillNodes: Array.isArray(game.uiRects?.skillTreeNodes) ? game.uiRects.skillTreeNodes : [],
          recentUiClicks: Array.isArray(game.input?.mouse?.recentUiLeftClicks)
            ? game.input.mouse.recentUiLeftClicks.slice(-8)
            : [],
          networkUiDebug: game.networkUiDebug && typeof game.networkUiDebug === "object"
            ? {
                lastClick: game.networkUiDebug.lastClick || null,
                lastHit: game.networkUiDebug.lastHit || "",
                lastActionKind: game.networkUiDebug.lastActionKind || "",
                recentActions: Array.isArray(game.networkUiDebug.recentActions)
                  ? game.networkUiDebug.recentActions.slice(-8)
                  : []
              }
            : null
        },
        audio: typeof getMusicDebugState === "function" ? getMusicDebugState() : null,
        voice: typeof getVoiceDebugState === "function" ? getVoiceDebugState() : game.voiceDebug || null,
        documentHasFocus: typeof document.hasFocus === "function" ? document.hasFocus() : null,
        documentVisibilityState: typeof document.visibilityState === "string" ? document.visibilityState : ""
      };
    },
    run(command, data = {}) {
      const game = typeof getCurrentGame === "function" ? getCurrentGame() : null;
      if (!game) return { ok: false, error: "gameUnavailable" };
      if (command === "setFirstTorchLit") {
        const torchId = typeof data?.id === "string" ? data.id : null;
        const torch = Array.isArray(game.lightSources)
          ? game.lightSources.find((source) => source && source.type === "torch" && (!torchId || source.id === torchId))
          : null;
        if (!torch) return { ok: false, error: "torchUnavailable" };
        torch.lit = data?.lit !== false;
        if (torch.lit) torch.snuffCooldown = 0;
        return { ok: true, id: torch.id || null, lit: torch.lit };
      }
      if (command === "dumpNetworkFlightRecorder") {
        const perf = game.networkPerf && typeof game.networkPerf === "object" ? game.networkPerf : {};
        return {
          ok: true,
          eventId: Number.isFinite(perf.networkFlightEventId) ? perf.networkFlightEventId : 0,
          events: Array.isArray(perf.recentFlightEvents) ? perf.recentFlightEvents.map((entry) => ({ ...entry })) : [],
          corrections: Array.isArray(perf.recentCorrections) ? perf.recentCorrections.map((entry) => ({ ...entry })) : [],
          postLoadCorrections: Array.isArray(perf.recentPostLoadCorrections) ? perf.recentPostLoadCorrections.map((entry) => ({ ...entry })) : []
        };
      }
      return { ok: false, error: "unknownCommand" };
    }
  };
}
