import { spawnSync } from "node:child_process";
import process from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(projectRoot);

const SCRIPT_TARGETS = {
  check: "server/check-all.js",
  "validate:boss": "server/validate-floor-boss.js",
  "validate:tactics": "server/validate-tactics.js",
  "validate:minotaur": "server/validate-minotaur.js",
  "validate:solo-xp": "server/validate-solo-xp.js",
  "validate:skill-refund": "server/validate-skill-refund.js",
  "validate:dev-start": "server/validate-dev-start.js",
  "validate:loc": "server/validate-loc.js",
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
  "perf:test": "server/perfRunner.js",
  "perf:network-browser": "server/perfNetworkBrowser.js",
  "perf:floor-scaling": "server/perfFloorScaling.js"
};

const SUITES = {
  core: ["check", "validate:loc"],
  gameplay: ["validate:boss", "validate:tactics", "validate:minotaur", "validate:solo-xp", "validate:skill-refund", "validate:dev-start"],
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
    "validate:network-refund"
  ],
  perf: ["perf:test", "perf:network-browser", "perf:floor-scaling"],
  "pre-commit": ["check", "validate:loc", "validate:boss", "validate:tactics", "validate:minotaur", "validate:solo-xp", "validate:skill-refund", "validate:dev-start"],
  closeout: [
    "check",
    "validate:loc",
    "validate:boss",
    "validate:tactics",
    "validate:minotaur",
    "validate:solo-xp",
    "validate:skill-refund",
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
    "perf:test",
    "perf:network-browser",
    "perf:floor-scaling"
  ]
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
    list: false
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

  const selectedScripts = selectScripts(scripts, options);
  if (options.list) {
    console.log(`Validation suite "${suiteName}" plan:`);
    for (const scriptName of selectedScripts) console.log(`- ${scriptName}`);
    return;
  }

  console.log(`Validation suite "${suiteName}" running ${selectedScripts.length}/${scripts.length} gate(s).`);
  if (options.only.length > 0) {
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
