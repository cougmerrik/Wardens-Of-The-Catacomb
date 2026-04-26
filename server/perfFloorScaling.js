import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { performance } from "node:perf_hooks";
import { GameSim } from "../src/sim/GameSim.js";
import { diffMetric, mean, percentile, readBaseline } from "./perf/helpers.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(projectRoot);

const OUTPUT_PATH = resolve(projectRoot, "artifacts", "perf", "floor-scaling-latest.json");
const BASELINE_PATH = resolve(projectRoot, "artifacts", "perf", "floor-scaling-baseline.json");
const STEP_MS = 1000 / 60;
const DURATION_MS = 2200;
const SCENARIO_ATTEMPTS = 3;
const MAP_ONLY_AVG_LIMIT = 1.35;
const LOADED_AVG_LIMIT = 2;
const LOADED_P95_LIMIT = 1.45;
const LOADED_AVG_WARNING_LIMIT = 1.35;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeInput(stepIndex, loaded) {
  const t = (stepIndex * STEP_MS) / 1000;
  return {
    moveX: Math.cos(t * 1.7),
    moveY: Math.sin(t * 1.3),
    hasAim: true,
    aimX: 500 + Math.cos(t * 2.2) * 120,
    aimY: 320 + Math.sin(t * 1.9) * 120,
    firePrimaryQueued: loaded ? stepIndex % 10 === 0 : false,
    firePrimaryHeld: loaded ? stepIndex % 2 === 0 : false,
    fireAltQueued: false,
    modeSwapQueued: false
  };
}

function placeEnemyPack(sim, count) {
  const tile = sim.config.map.tile;
  const spawnMethods = [
    "spawnGhost",
    "spawnSkeletonWarrior",
    "spawnRatArcher",
    "spawnMummy",
    "spawnAnimatedArmor",
    "spawnPrisoner"
  ].filter((key) => typeof sim[key] === "function");
  for (let i = 0; i < count; i++) {
    const angle = (i / Math.max(1, count)) * Math.PI * 2;
    const ring = 7 + Math.floor(i / 8) * 1.6;
    const targetX = sim.player.x + Math.cos(angle) * ring * tile;
    const targetY = sim.player.y + Math.sin(angle) * ring * tile;
    const point = sim.findNearestSafePoint(targetX, targetY, 14);
    const method = spawnMethods[i % spawnMethods.length];
    const enemy = sim[method](point.x, point.y);
    if (!enemy) continue;
    enemy.lastX = enemy.x;
    enemy.lastY = enemy.y;
    sim.enemies.push(enemy);
  }
}

function runScenario(name, floor, enemyMode = "none") {
  const sim = new GameSim({
    classType: "archer",
    viewportWidth: 960,
    viewportHeight: 640
  });
  if (floor > 1 && typeof sim.applyDebugStartingFloor === "function") {
    sim.applyDebugStartingFloor(floor);
  }
  const activeEnemyCap = typeof sim.getActiveEnemyCap === "function" ? sim.getActiveEnemyCap() : 0;
  if (enemyMode === "cap") {
    placeEnemyPack(sim, activeEnemyCap);
  }
  const steps = Math.max(1, Math.floor(DURATION_MS / STEP_MS));
  const timings = [];
  for (let i = 0; i < steps; i++) {
    const t0 = performance.now();
    sim.tick(STEP_MS / 1000, makeInput(i, enemyMode === "cap"));
    timings.push(performance.now() - t0);
  }
  return {
    name,
    floor,
    enemyMode,
    mapWidth: sim.mapWidth,
    mapHeight: sim.mapHeight,
    mapTiles: sim.mapWidth * sim.mapHeight,
    armorStands: Array.isArray(sim.armorStands) ? sim.armorStands.length : 0,
    breakables: Array.isArray(sim.breakables) ? sim.breakables.length : 0,
    wallTraps: Array.isArray(sim.wallTraps) ? sim.wallTraps.length : 0,
    enemyCount: Array.isArray(sim.enemies) ? sim.enemies.length : 0,
    activeEnemyCap,
    avgTickMs: mean(timings),
    p95TickMs: percentile(timings, 95)
  };
}

function summarizeAttempt(run, attempt) {
  return {
    attempt,
    avgTickMs: run.avgTickMs,
    p95TickMs: run.p95TickMs,
    enemyCount: run.enemyCount,
    breakables: run.breakables,
    wallTraps: run.wallTraps
  };
}

function runBestScenario(name, floor, enemyMode = "none", attempts = SCENARIO_ATTEMPTS) {
  const runs = [];
  for (let i = 0; i < attempts; i++) {
    runs.push(runScenario(name, floor, enemyMode));
  }
  const best = [...runs].sort((a, b) => a.avgTickMs - b.avgTickMs || a.p95TickMs - b.p95TickMs)[0];
  return {
    ...best,
    attempts: runs.map((run, index) => summarizeAttempt(run, index + 1))
  };
}

function formatAttempts(run) {
  return run.attempts.map((attempt) => (
    `#${attempt.attempt} avg=${attempt.avgTickMs.toFixed(3)} p95=${attempt.p95TickMs.toFixed(3)} enemies=${attempt.enemyCount}`
  )).join("; ");
}

function main() {
  const startedAt = new Date().toISOString();
  const floor1 = runBestScenario("floor1_base", 1, "none");
  const floor4MapOnly = runBestScenario("floor4_mapOnly", 4, "none");
  const floor4Loaded = runBestScenario("floor4_loaded", 4, "cap");
  const baseline = readBaseline(BASELINE_PATH);
  const baselineGeometryChanged = !!(
    baseline &&
    (
      baseline.floor4MapOnly?.mapTiles !== floor4MapOnly.mapTiles ||
      baseline.floor4Loaded?.mapTiles !== floor4Loaded.mapTiles
    )
  );
  const effectiveBaseline = baselineGeometryChanged ? null : baseline;

  const artifact = {
    meta: {
      startedAt,
      finishedAt: new Date().toISOString(),
      mode: "floor-scaling",
      durationMs: DURATION_MS,
      attemptsPerScenario: SCENARIO_ATTEMPTS,
      baselinePath: BASELINE_PATH,
      thresholds: {
        mapOnlyAvgMultiplier: MAP_ONLY_AVG_LIMIT,
        loadedAvgMultiplier: LOADED_AVG_LIMIT,
        loadedP95Multiplier: LOADED_P95_LIMIT,
        loadedAvgWarningMultiplier: LOADED_AVG_WARNING_LIMIT
      }
    },
    floor1,
    floor4MapOnly,
    floor4Loaded,
    ratios: {
      mapTiles: floor4MapOnly.mapTiles / Math.max(1, floor1.mapTiles),
      armorStands: floor4MapOnly.armorStands / Math.max(1, floor1.armorStands),
      avgTick_floor4Map_vs_floor1: floor4MapOnly.avgTickMs / Math.max(0.0001, floor1.avgTickMs),
      avgTick_floor4Loaded_vs_floor4Map: floor4Loaded.avgTickMs / Math.max(0.0001, floor4MapOnly.avgTickMs),
      avgTick_floor4Loaded_vs_floor1: floor4Loaded.avgTickMs / Math.max(0.0001, floor1.avgTickMs)
    },
    comparison: effectiveBaseline
      ? {
          floor4MapOnly_avgTickMs: diffMetric(floor4MapOnly.avgTickMs, effectiveBaseline.floor4MapOnly?.avgTickMs),
          floor4MapOnly_p95TickMs: diffMetric(floor4MapOnly.p95TickMs, effectiveBaseline.floor4MapOnly?.p95TickMs),
          floor4Loaded_avgTickMs: diffMetric(floor4Loaded.avgTickMs, effectiveBaseline.floor4Loaded?.avgTickMs),
          floor4Loaded_p95TickMs: diffMetric(floor4Loaded.p95TickMs, effectiveBaseline.floor4Loaded?.p95TickMs),
          floor4Loaded_mapTiles: diffMetric(floor4Loaded.mapTiles, effectiveBaseline.floor4Loaded?.mapTiles)
        }
      : null,
    baselineCreated: !effectiveBaseline,
    baselineRefreshedForGeometryChange: baselineGeometryChanged,
    warnings: []
  };

  if (
    effectiveBaseline &&
    floor4Loaded.avgTickMs > (effectiveBaseline.floor4Loaded?.avgTickMs || floor4Loaded.avgTickMs) * LOADED_AVG_WARNING_LIMIT
  ) {
    artifact.warnings.push({
      metric: "floor4Loaded.avgTickMs",
      message: "Loaded floor avg tick exceeded soft warning threshold but stayed within hard perf gate.",
      attempts: floor4Loaded.attempts
    });
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  if (!effectiveBaseline) {
    writeFileSync(BASELINE_PATH, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  }

  if (effectiveBaseline) {
    assert(
      floor4MapOnly.avgTickMs <= (effectiveBaseline.floor4MapOnly?.avgTickMs || floor4MapOnly.avgTickMs) * MAP_ONLY_AVG_LIMIT,
      `floor4 map-only avg tick regressed too far: ${floor4MapOnly.avgTickMs.toFixed(3)}ms; attempts: ${formatAttempts(floor4MapOnly)}`
    );
    assert(
      floor4Loaded.avgTickMs <= (effectiveBaseline.floor4Loaded?.avgTickMs || floor4Loaded.avgTickMs) * LOADED_AVG_LIMIT,
      `floor4 loaded avg tick regressed too far: ${floor4Loaded.avgTickMs.toFixed(3)}ms; attempts: ${formatAttempts(floor4Loaded)}`
    );
    assert(
      floor4Loaded.p95TickMs <= (effectiveBaseline.floor4Loaded?.p95TickMs || floor4Loaded.p95TickMs) * LOADED_P95_LIMIT,
      `floor4 loaded p95 tick regressed too far: ${floor4Loaded.p95TickMs.toFixed(3)}ms; attempts: ${formatAttempts(floor4Loaded)}`
    );
  }

  console.log(
    JSON.stringify(
      {
        floor1: {
          map: `${floor1.mapWidth}x${floor1.mapHeight}`,
          avgTickMs: floor1.avgTickMs,
          p95TickMs: floor1.p95TickMs
        },
        floor4MapOnly: {
          map: `${floor4MapOnly.mapWidth}x${floor4MapOnly.mapHeight}`,
          avgTickMs: floor4MapOnly.avgTickMs,
          p95TickMs: floor4MapOnly.p95TickMs
        },
        floor4Loaded: {
          map: `${floor4Loaded.mapWidth}x${floor4Loaded.mapHeight}`,
          enemies: floor4Loaded.enemyCount,
          avgTickMs: floor4Loaded.avgTickMs,
          p95TickMs: floor4Loaded.p95TickMs,
          attempts: floor4Loaded.attempts
        },
        ratios: artifact.ratios,
        warnings: artifact.warnings,
        baselineCreated: artifact.baselineCreated,
        outputPath: OUTPUT_PATH
      },
      null,
      2
    )
  );
}

main();
