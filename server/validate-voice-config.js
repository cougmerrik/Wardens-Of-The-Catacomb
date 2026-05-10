import { buildVoiceRoomConfig, resolveVoiceConfig } from "./net/voiceConfig.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const disabled = resolveVoiceConfig({ env: {}, argv: [] });
  assert(disabled.enabled === false, "voice should be disabled without an Agora app id");
  assert(buildVoiceRoomConfig(disabled, "alpha").enabled === false, "disabled server config should not expose a voice room");

  const fromEnv = resolveVoiceConfig({ env: { AGORA_APP_ID: " env-app " }, argv: [] });
  assert(fromEnv.enabled === true, "voice should be enabled from AGORA_APP_ID");
  assert(fromEnv.appId === "env-app", "env app id should be trimmed");

  const fromCli = resolveVoiceConfig({
    env: { AGORA_APP_ID: "env-app" },
    argv: ["--agora-app-id", "cli-app", "--agora-token=token-value"]
  });
  assert(fromCli.enabled === true, "voice should be enabled from --agora-app-id");
  assert(fromCli.appId === "cli-app", "CLI app id should override env app id");
  assert(fromCli.token === "token-value", "CLI token should be read");

  const room = buildVoiceRoomConfig(fromCli, "raid room");
  assert(room.enabled === true, "voice room should be enabled");
  assert(room.provider === "agora", "voice provider should be Agora");
  assert(room.appId === "cli-app", "voice room should include Agora app id");
  assert(room.channel === "wardens-raid-room", `unexpected voice channel: ${room.channel}`);

  console.log("Voice config validation passed.");
}

main();
