import { buildAgoraVoiceUid, buildVoiceClientConfig, buildVoiceRoomConfig, resolveVoiceConfig } from "./net/voiceConfig.js";

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
  const staticClientConfig = buildVoiceClientConfig(room, "p_test", { nowSeconds: 1000 });
  assert(staticClientConfig.token === "token-value", "static token should be forwarded to clients");
  assert(!Object.prototype.hasOwnProperty.call(staticClientConfig, "appCertificate"), "client config should not expose the App Certificate");
  assert(Number.isInteger(buildAgoraVoiceUid("p_test")) && buildAgoraVoiceUid("p_test") > 0, "voice uid should be a positive integer");
  assert(buildAgoraVoiceUid("p_test") === buildAgoraVoiceUid("p_test"), "voice uid should be stable");

  const fromCertificate = resolveVoiceConfig({
    env: {
      AGORA_APP_ID: "00000000000000000000000000000000",
      AGORA_APP_CERTIFICATE: "11111111111111111111111111111111",
      AGORA_TOKEN_TTL_SECONDS: "120"
    },
    argv: []
  });
  assert(fromCertificate.enabled === true, "voice should be enabled from secure Agora config");
  assert(fromCertificate.appCertificate === "11111111111111111111111111111111", "App Certificate should be read from env");
  assert(fromCertificate.tokenTtlSeconds === 120, "token TTL should be read from env");
  const secureRoom = buildVoiceRoomConfig(fromCertificate, "secure room");
  const genericSecureConfig = buildVoiceClientConfig(secureRoom, "", { nowSeconds: 2000 });
  assert(genericSecureConfig.token === null, "generic secure room broadcasts should not include a token");
  const secureClientConfig = buildVoiceClientConfig(secureRoom, "p_secure", { nowSeconds: 2000 });
  assert(secureClientConfig.tokenMode === "server-generated", "secure config should use server-generated tokens");
  assert(typeof secureClientConfig.token === "string" && secureClientConfig.token.length > 20, "secure config should include generated RTC token");
  assert(secureClientConfig.tokenExpiresAt === 2120, "secure token expiration should include TTL");
  assert(!Object.prototype.hasOwnProperty.call(secureClientConfig, "appCertificate"), "secure client config should not expose the App Certificate");

  console.log("Voice config validation passed.");
}

main();
