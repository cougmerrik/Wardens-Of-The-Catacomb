import { execFileSync, spawnSync } from "node:child_process";
import process from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildSelectiveCloseoutPlan, FULL_CLOSEOUT_GATES } from "./validation/selectiveCloseoutPlan.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(projectRoot);

const SCRIPT_TARGETS = {
  check: "server/check-all.js",
  "validate:boss": "server/validate-floor-boss.js",
  "validate:spawn-scale": "server/validate-spawn-scale.js",
  "validate:xp-pacing": "server/validate-xp-pacing.js",
  "validate:tactics": "server/validate-tactics.js",
  "validate:minotaur": "server/validate-minotaur.js",
  "validate:solo-xp": "server/validate-solo-xp.js",
  "validate:skill-refund": "server/validate-skill-refund.js",
  "validate:player-death-healing": "server/validate-player-death-healing.js",
  "validate:dev-start": "server/validate-dev-start.js",
  "validate:music-sync": "server/validate-music-sync.js",
  "validate:loc": "server/validate-loc.js",
  "validate:lighting-state": "server/validate-lighting-state.js",
  "validate:lighting-placement": "server/validate-lighting-placement.js",
  "validate:lighting-render": "server/validate-lighting-render.js",
  "validate:lighting-interaction": "server/validate-lighting-interaction.js",
  "validate:lighting-enemies": "server/validate-lighting-enemies.js",
  "validate:lighting-network": "server/validate-lighting-network-sync.js",
  "validate:lighting-browser": "server/validate-lighting-browser.js",
  "validate:network-join": "server/validate-network-join.js",
  "validate:network-combat": "server/validate-network-combat.js",
  "validate:network-combat-hit": "server/validate-network-combat-hit.js",
  "validate:network-shop": "server/validate-network-shop.js",
  "validate:network-shared-rewards": "server/validate-network-shared-rewards.js",
  "validate:network-two-client-damage": "server/validate-network-two-client-damage.js",
  "validate:network-archer": "server/validate-network-archer.js",
  "validate:network-audio": "server/validate-network-audio.js",
  "validate:network-pause": "server/validate-network-pause.js",
  "validate:network-ui": "server/validate-network-ui.js",
  "validate:network-refund": "server/validate-network-refund.js",
  "validate:network-transport": "server/validate-network-transport.js",
  "validate:network-controller": "server/validate-network-controller-responsiveness.js",
  "validate:network-projectiles": "server/validate-network-projectile-prediction.js",
  "validate:network-smoothness": "server/validate-network-smoothness.js",
  "validate:network-input-telemetry": "server/validate-network-input-telemetry.js",
  "validate:network-state-corruption": "server/validate-network-state-corruption.js",
  "validate:network-status-parity": "server/validate-network-status-parity.js",
  "validate:mobile-transport": "server/validate-mobile-transport-defaults.js",
  "validate:network-framework": "server/validate-network-framework-evaluation.js",
  "validate:selective-closeout-plan": "server/validate-selective-closeout-plan.js",
  "build:android:web": "scripts/prepare-capacitor-web.js",
  "validate:network-bots": "server/validate-network-bots.js",
  "perf:test": "server/perfRunner.js",
  "perf:network-browser": "server/perfNetworkBrowser.js",
  "perf:floor-scaling": "server/perfFloorScaling.js"
};

const SUITES = {
  core: ["check", "validate:music-sync", "validate:loc"],
  gameplay: ["validate:boss", "validate:spawn-scale", "validate:xp-pacing", "validate:tactics", "validate:minotaur", "validate:solo-xp", "validate:skill-refund", "validate:player-death-healing", "validate:dev-start"],
  lighting: [
    "validate:lighting-state",
    "validate:lighting-placement",
    "validate:lighting-render",
    "validate:lighting-interaction",
    "validate:lighting-enemies",
    "validate:lighting-network",
    "validate:lighting-browser"
  ],
  network: [
    "validate:network-join",
    "validate:network-combat",
    "validate:network-combat-hit",
    "validate:network-shop",
    "validate:network-shared-rewards",
    "validate:network-two-client-damage",
    "validate:network-archer",
    "validate:network-audio",
    "validate:network-pause",
    "validate:network-ui",
    "validate:network-refund",
    "validate:network-status-parity",
    "validate:network-bots"
  ],
  "network-stability": [
    "validate:network-transport",
    "validate:network-controller",
    "validate:network-projectiles",
    "validate:network-smoothness",
    "validate:network-input-telemetry",
    "validate:network-state-corruption",
    "validate:network-status-parity",
    "validate:network-join",
    "validate:network-combat-hit",
    "validate:network-archer"
  ],
  perf: ["perf:test", "perf:network-browser", "perf:floor-scaling"],
  "pre-commit": ["check", "validate:loc", "validate:boss", "validate:spawn-scale", "validate:xp-pacing", "validate:tactics", "validate:minotaur", "validate:solo-xp", "validate:skill-refund", "validate:player-death-healing", "validate:dev-start"],
  closeout: [
    "check",
    "validate:loc",
    "validate:boss",
    "validate:spawn-scale",
    "validate:xp-pacing",
    "validate:tactics",
    "validate:minotaur",
    "validate:solo-xp",
    "validate:skill-refund",
    "validate:player-death-healing",
    "validate:dev-start",
    "validate:network-join",
    "validate:network-combat",
    "validate:network-combat-hit",
    "validate:network-shop",
    "validate:network-shared-rewards",
    "validate:network-two-client-damage",
    "validate:network-archer",
    "validate:network-audio",
    "validate:network-pause",
    "validate:network-ui",
    "validate:network-refund",
    "validate:network-status-parity",
    "validate:network-bots",
    "perf:test",
    "perf:network-browser",
    "perf:floor-scaling"
  ],
  "closeout:selective": FULL_CLOSEOUT_GATES
};

function runScript(scriptName) {
  const relativeTarget = SCRIPT_TARGETS[scriptName];
  if (!relativeTarget) {
    throw new Error(`No target configured for validation script "${scriptName}"`);
  }

  const targetUrl = pathToFileURL(resolve(projectRoot, relativeTarget)).href;
  console.log(`\n=== ${scriptName} ===`);
  const startedAt = performance.now();
  const result = spawnSync(process.execPath, ["-e", "import(process.argv[1])", targetUrl], {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env
  });
  const elapsedSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
  const status = Number.isFinite(result.status) ? result.status : 1;
  const outcome = status === 0 ? "passed" : `failed with status ${status}`;
  console.log(`=== ${scriptName} ${outcome} in ${elapsedSeconds}s ===`);
  return { status, elapsedSeconds: Number(elapsedSeconds) };
}

function parseArgs(argv) {
  const args = argv.slice(1);
  const scriptIndex = args.findIndex((arg) => arg.endsWith("run-validation-suite.js"));
  const relevantArgs = scriptIndex >= 0 ? args.slice(scriptIndex + 1) : args;
  const options = {
    suiteName: "core",
    from: null,
    until: null,
    only: [],
    list: false,
    base: "origin/main"
  };

  let suiteSet = false;
  for (let i = 0; i < relevantArgs.length; i += 1) {
    const arg = relevantArgs[i];
    if (!arg || arg === "--") continue;
    if (arg === "--list") {
      options.list = true;
      continue;
    }
    if (arg === "--from") {
      options.from = relevantArgs[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--from=")) {
      options.from = arg.slice("--from=".length);
      continue;
    }
    if (arg === "--until") {
      options.until = relevantArgs[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--until=")) {
      options.until = arg.slice("--until=".length);
      continue;
    }
    if (arg === "--only") {
      options.only.push(relevantArgs[i + 1]);
      i += 1;
      continue;
    }
    if (arg.startsWith("--only=")) {
      options.only.push(arg.slice("--only=".length));
      continue;
    }
    if (arg === "--base") {
      options.base = relevantArgs[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--base=")) {
      options.base = arg.slice("--base=".length);
      continue;
    }
    if (!suiteSet && SUITES[arg]) {
      options.suiteName = arg;
      suiteSet = true;
      continue;
    }
    if (!suiteSet && !arg.startsWith("-")) {
      throw new Error(`Unknown validation suite "${arg}". Known suites: ${Object.keys(SUITES).sort().join(", ")}`);
    }
    throw new Error(`Unknown validation option "${arg}"`);
  }

  return options;
}

function assertScriptInSuite(scriptName, suiteName, scripts, optionName) {
  if (!scriptName) return;
  if (!SCRIPT_TARGETS[scriptName]) {
    throw new Error(`Unknown validation script "${scriptName}" for ${optionName}`);
  }
  if (!scripts.includes(scriptName)) {
    throw new Error(`Validation script "${scriptName}" from ${optionName} is not in suite "${suiteName}"`);
  }
}

function selectScripts(scripts, options) {
  if (options.only.length > 0) {
    for (const scriptName of options.only) {
      assertScriptInSuite(scriptName, options.suiteName, scripts, "--only");
    }
    return options.only;
  }

  assertScriptInSuite(options.from, options.suiteName, scripts, "--from");
  assertScriptInSuite(options.until, options.suiteName, scripts, "--until");

  const fromIndex = options.from ? scripts.indexOf(options.from) : 0;
  const untilIndex = options.until ? scripts.indexOf(options.until) : scripts.length - 1;
  if (fromIndex > untilIndex) {
    throw new Error(`--from ${options.from} appears after --until ${options.until} in suite "${options.suiteName}"`);
  }
  return scripts.slice(fromIndex, untilIndex + 1);
}

function collectGitPaths(args, paths) {
  try {
    const output = execFileSync("git", args, { cwd: projectRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    for (const line of output.split(/\r?\n/)) {
      const file = line.trim();
      if (file) paths.add(file);
    }
  } catch {
    // Ignore missing refs or unavailable git state; the planner will fall back to whatever paths were found.
  }
}

function resolveMergeBase(baseRef) {
  if (!baseRef) return "";
  try {
    return execFileSync("git", ["merge-base", baseRef, "HEAD"], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return baseRef;
  }
}

function getChangedFilesForSelectiveCloseout(baseRef) {
  const paths = new Set();
  const base = resolveMergeBase(baseRef);
  if (base) collectGitPaths(["diff", "--name-only", "--diff-filter=ACMRTUXB", `${base}...HEAD`], paths);
  collectGitPaths(["diff", "--name-only", "--diff-filter=ACMRTUXB"], paths);
  collectGitPaths(["diff", "--cached", "--name-only", "--diff-filter=ACMRTUXB"], paths);
  collectGitPaths(["ls-files", "--others", "--exclude-standard"], paths);
  return Array.from(paths).sort();
}

function formatElapsed(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function main() {
  const options = parseArgs(process.argv);
  const suiteName = options.suiteName;
  const scripts = SUITES[suiteName];
  if (!scripts) {
    const known = Object.keys(SUITES).sort().join(", ");
    throw new Error(`Unknown validation suite "${suiteName}". Known suites: ${known}`);
  }

  const selectivePlan =
    suiteName === "closeout:selective"
      ? buildSelectiveCloseoutPlan(getChangedFilesForSelectiveCloseout(options.base))
      : null;
  const selectedScripts = selectivePlan ? selectivePlan.gates : selectScripts(scripts, options);
  if (options.list) {
    console.log(`Validation suite "${suiteName}" plan:`);
    if (selectivePlan) {
      console.log(`Mode: ${selectivePlan.mode}`);
      console.log(`Base: ${options.base}`);
      console.log("Changed files:");
      for (const file of selectivePlan.changedFiles) console.log(`- ${file}`);
      console.log("Reasons:");
      for (const reason of selectivePlan.reasons) console.log(`- ${reason}`);
    }
    for (const scriptName of selectedScripts) console.log(`- ${scriptName}`);
    return;
  }

  console.log(`Validation suite "${suiteName}" running ${selectedScripts.length}/${scripts.length} gate(s).`);
  if (selectivePlan) {
    console.log(`Selective closeout mode: ${selectivePlan.mode}; base: ${options.base}`);
    if (selectivePlan.reasons.length > 0) {
      console.log("Selection reasons:");
      for (const reason of selectivePlan.reasons) console.log(`- ${reason}`);
    }
  } else if (options.only.length > 0) {
    console.log("Running explicitly selected gate(s); run the full suite before final closeout.");
  } else if (selectedScripts[0] !== scripts[0]) {
    console.log(`Starting at "${selectedScripts[0]}"; run the full suite before final closeout.`);
  }

  const summary = [];
  const suiteStartedAt = performance.now();
  for (const scriptName of selectedScripts) {
    const result = runScript(scriptName);
    summary.push({ scriptName, ...result });
    if (result.status !== 0) {
      console.log("\nValidation summary:");
      for (const entry of summary) {
        const outcome = entry.status === 0 ? "PASS" : "FAIL";
        console.log(`- ${outcome} ${entry.scriptName} ${entry.elapsedSeconds.toFixed(1)}s`);
      }
      console.log(`\nAfter fixing the failure, resume with:`);
      console.log(`node server/run-validation-suite.js ${suiteName} --from ${scriptName}`);
      process.exit(result.status);
    }
  }

  const totalSeconds = (performance.now() - suiteStartedAt) / 1000;
  console.log("\nValidation summary:");
  for (const entry of summary) {
    console.log(`- PASS ${entry.scriptName} ${entry.elapsedSeconds.toFixed(1)}s`);
  }
  console.log(`\nValidation suite "${suiteName}" passed in ${formatElapsed(totalSeconds)}.`);
}

main();
