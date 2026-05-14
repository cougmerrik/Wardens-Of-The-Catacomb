import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { ANDROID_DEFAULT_WS_URL, buildAndroidRuntimeConfigEnv } from "../scripts/mobileTransportDefaults.js";
import { resolveActiveServerUrl, resolveLeaderboardApiUrl } from "../src/runtime/runtimeConfig.js";

const repoRoot = process.cwd();
const androidEnv = buildAndroidRuntimeConfigEnv({});

assert.equal(ANDROID_DEFAULT_WS_URL.startsWith("wss://"), true, "Android default multiplayer URL must use wss://");
assert.equal(androidEnv.GAME_PLATFORM, "android");
assert.equal(androidEnv.GAME_WS_URL, ANDROID_DEFAULT_WS_URL);
assert.equal(androidEnv.GAME_SHOW_GAMEPLAY_ADS, "false");
assert.equal(androidEnv.GAME_ALLOW_SERVER_URL_OVERRIDE, "true");

assert.equal(
  buildAndroidRuntimeConfigEnv({
    GAME_WS_URL: "ws://127.0.0.1:8090",
    GAME_PLATFORM: "android-dev"
  }).GAME_WS_URL,
  "ws://127.0.0.1:8090",
  "local/test overrides should remain possible"
);

assert.equal(
  resolveActiveServerUrl({
    runtimeConfig: { defaultWsUrl: ANDROID_DEFAULT_WS_URL },
    storage: null,
    locationObject: { protocol: "https:", hostname: "mobile.local" }
  }),
  ANDROID_DEFAULT_WS_URL
);
assert.equal(
  resolveLeaderboardApiUrl({
    runtimeConfig: { defaultWsUrl: ANDROID_DEFAULT_WS_URL },
    locationObject: { protocol: "https:", hostname: "mobile.local" }
  }),
  "https://wardens-of-the-catacomb-production.up.railway.app/api/leaderboard"
);

const outputDir = resolve(tmpdir(), `wotc-mobile-config-${process.pid}`);
const outputFile = resolve(outputDir, "config.js");
mkdirSync(outputDir, { recursive: true });
try {
  const build = spawnSync(process.execPath, [resolve(repoRoot, "scripts/build-runtime-config.js")], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      ...androidEnv,
      GAME_RUNTIME_CONFIG_OUTPUT: outputFile
    }
  });
  assert.equal(build.status, 0, build.stderr || build.stdout);
  const configJs = readFileSync(outputFile, "utf8");
  assert.equal(configJs.includes("ws://"), false, "generated Android default config should not include cleartext ws://");
  const json = configJs.match(/Object\.freeze\(([\s\S]*)\);\s*$/)?.[1];
  assert.ok(json, "generated runtime config should be parseable");
  const generated = JSON.parse(json);
  assert.equal(generated.platform, "android");
  assert.equal(generated.defaultWsUrl, ANDROID_DEFAULT_WS_URL);
  assert.equal(generated.showGameplayAds, false);
  assert.equal(generated.allowServerUrlOverride, true);
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}

const manifest = readFileSync(resolve(repoRoot, "android/app/src/main/AndroidManifest.xml"), "utf8");
assert.equal(/usesCleartextTraffic\s*=\s*"true"/.test(manifest), false, "Android manifest should not broadly allow cleartext traffic");
assert.equal(/networkSecurityConfig\s*=/.test(manifest), false, "Android manifest should not attach a broad network security config");

console.log("Mobile transport defaults validation passed.");
