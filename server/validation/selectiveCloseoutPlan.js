export const BROAD_CHANGE_FILE_LIMIT = 25;

export const FULL_CLOSEOUT_GATES = [
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
  "validate:network-two-client-damage",
  "validate:network-archer",
  "validate:network-audio",
  "validate:network-pause",
  "validate:network-ui",
  "validate:network-refund",
  "perf:test",
  "perf:network-browser",
  "perf:floor-scaling"
];

const CORE_GATES = ["check", "validate:loc"];
const GAMEPLAY_GATES = ["validate:boss", "validate:tactics", "validate:minotaur", "validate:solo-xp", "validate:skill-refund", "validate:dev-start"];
const NETWORK_SMOKE_GATES = ["validate:network-transport", "validate:network-join", "validate:network-combat-hit"];
const NETWORK_FULL_GATES = [
  "validate:network-join",
  "validate:network-combat",
  "validate:network-combat-hit",
  "validate:network-shop",
  "validate:network-two-client-damage",
  "validate:network-archer",
  "validate:network-audio",
  "validate:network-pause",
  "validate:network-ui",
  "validate:network-refund"
];
const LIGHTING_GATES = [
  "validate:lighting-state",
  "validate:lighting-placement",
  "validate:lighting-render",
  "validate:lighting-interaction",
  "validate:lighting-enemies",
  "validate:lighting-network"
];

function normalizePath(file) {
  return typeof file === "string" ? file.trim().replaceAll("\\", "/") : "";
}

function addAll(target, gates) {
  for (const gate of gates) target.add(gate);
}

function isGeneratedOrArtifact(file) {
  return file.startsWith("artifacts/") || file.startsWith("www/");
}

function isRuntimeJs(file) {
  return file.endsWith(".js") || file.endsWith(".ts") || file.endsWith(".json");
}

function isBrowserNetworkValidator(file) {
  return /^server\/validate-network-(join|combat|combat-hit|shop|two-client-damage|archer|audio|pause|ui|refund|transport)\.js$/.test(file);
}

export function buildSelectiveCloseoutPlan(files, { broadChangeFileLimit = BROAD_CHANGE_FILE_LIMIT } = {}) {
  const changedFiles = Array.from(new Set(files.map(normalizePath).filter(Boolean))).filter((file) => !isGeneratedOrArtifact(file));
  const gates = new Set(CORE_GATES);
  const reasons = [];

  if (changedFiles.length === 0) {
    return {
      mode: "selective",
      changedFiles,
      gates: Array.from(gates),
      reasons: ["No relevant changed files detected; running core gates only."]
    };
  }

  const sourceFiles = changedFiles.filter(isRuntimeJs);
  if (sourceFiles.length > broadChangeFileLimit) {
    return {
      mode: "full",
      changedFiles,
      gates: FULL_CLOSEOUT_GATES,
      reasons: [`${sourceFiles.length} runtime/config files changed, which exceeds the selective limit of ${broadChangeFileLimit}.`]
    };
  }

  for (const file of changedFiles) {
    if (file === "package-lock.json" || file === "package.json") {
      reasons.push(`${file}: package or validation command metadata changed`);
      addAll(gates, ["validate:network-transport", "validate:mobile-transport", "validate:network-framework"]);
    }
    if (file === "server/run-validation-suite.js" || file === "server/validation/selectiveCloseoutPlan.js" || file === "server/validate-selective-closeout-plan.js") {
      reasons.push(`${file}: selective validation planning changed`);
      gates.add("validate:selective-closeout-plan");
    }
    if (file === "docs/NETWORK_FRAMEWORK_EVALUATION.md" || file === "server/validate-network-framework-evaluation.js") {
      reasons.push(`${file}: network framework evaluation changed`);
      gates.add("validate:network-framework");
    }
    if (file.startsWith("docs/")) {
      continue;
    }
    if (
      file === "scripts/mobileTransportDefaults.js" ||
      file === "scripts/prepare-capacitor-web.js" ||
      file === "src/runtime/runtimeConfig.js" ||
      file === "capacitor.config.ts" ||
      file.startsWith("android/")
    ) {
      reasons.push(`${file}: mobile runtime transport configuration changed`);
      addAll(gates, ["validate:mobile-transport", "build:android:web"]);
    }
    if (
      file === "server/networkServer.js" ||
      file.startsWith("server/net/") ||
      file.startsWith("src/net/") ||
      file.startsWith("src/bootstrap/network") ||
      isBrowserNetworkValidator(file)
    ) {
      reasons.push(`${file}: multiplayer networking changed`);
      addAll(gates, NETWORK_SMOKE_GATES);
    }
    if (file === "server/net/AuthoritativeRoom.js" || file === "server/net/clientMessageHandler.js") {
      reasons.push(`${file}: authoritative room/message handling changed`);
      addAll(gates, NETWORK_FULL_GATES);
    }
    if (file.startsWith("src/audio/")) {
      reasons.push(`${file}: audio runtime changed`);
      gates.add("validate:network-audio");
    }
    if (file.startsWith("src/rendering/hud/")) {
      reasons.push(`${file}: HUD/UI rendering changed`);
      gates.add("validate:network-ui");
    }
    if (
      file === "src/configLighting.js" ||
      file === "src/game/world/lighting.js" ||
      file.includes("Lighting") ||
      file.includes("lighting")
    ) {
      reasons.push(`${file}: lighting behavior changed`);
      addAll(gates, LIGHTING_GATES);
    }
    if (
      file === "src/Game.js" ||
      file === "src/config.js" ||
      file.startsWith("src/game/") ||
      file.startsWith("src/sim/")
    ) {
      reasons.push(`${file}: gameplay/runtime simulation changed`);
      addAll(gates, GAMEPLAY_GATES);
    }
    if (file.startsWith("src/rendering/")) {
      reasons.push(`${file}: rendering runtime changed`);
      gates.add("validate:dev-start");
    }
    if (file === "server/perfRunner.js") gates.add("perf:test");
    if (file === "server/perfNetworkBrowser.js") gates.add("perf:network-browser");
    if (file === "server/perfFloorScaling.js") gates.add("perf:floor-scaling");
  }

  return {
    mode: "selective",
    changedFiles,
    gates: Array.from(gates).filter((gate) => FULL_CLOSEOUT_GATES.includes(gate) || gate.startsWith("validate:") || gate === "build:android:web"),
    reasons: Array.from(new Set(reasons))
  };
}
