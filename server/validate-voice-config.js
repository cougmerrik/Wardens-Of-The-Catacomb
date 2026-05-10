import { buildAgoraVoiceUid, buildVoiceClientConfig, buildVoiceRoomConfig, resolveVoiceConfig } from "./net/voiceConfig.js";
import { SpatialAudio } from "../src/voice/SpatialAudio.js";
import { VoiceManager } from "../src/voice/VoiceManager.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
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

  const retainCalls = [];
  const updates = [];
  const spatial = new SpatialAudio({
    audioGraph: {
      retainRemotePlayers: (ids) => retainCalls.push(Array.from(ids || [])),
      updateRemote: (id, state) => updates.push({ id, state })
    }
  });
  spatial.update({ player: { x: 0, y: 0 }, remotePlayers: [] }, "local");
  assert(retainCalls.length === 0, "spatial audio should not disconnect tracks before remote player snapshots arrive");
  spatial.update({ player: { x: 0, y: 0 }, remotePlayers: [{ id: "remote", x: 32, y: 0 }] }, "local");
  assert(updates.length === 1 && updates[0].id === "remote", "spatial audio should update known remote players");
  assert(retainCalls.length === 1 && retainCalls[0][0] === "remote", "spatial audio should retain known remote player tracks");

  const voiceManager = new VoiceManager();
  const rawUid = "123456";
  voiceManager.audioGraph.remoteNodes.set(rawUid, { marker: "remote-track" });
  voiceManager.syncRoster([{ id: "p_remote", voiceUid: 123456 }]);
  assert(!voiceManager.audioGraph.remoteNodes.has(rawUid), "raw Agora uid remote track should be re-keyed after roster sync");
  assert(voiceManager.audioGraph.remoteNodes.get("p_remote")?.marker === "remote-track", "remote track should be keyed by Wardens player id");
  await voiceManager.leave();

  const fallbackVolumes = [];
  let fallbackPlayed = false;
  let fallbackStopped = false;
  const fallbackGraph = new VoiceManager().audioGraph;
  const fallbackConnected = fallbackGraph.connectRemoteTrack("p_fallback", {
    play: () => {
      fallbackPlayed = true;
    },
    stop: () => {
      fallbackStopped = true;
    },
    setVolume: (volume) => {
      fallbackVolumes.push(volume);
    }
  });
  assert(fallbackConnected === true, "fallback Agora remote track should connect without a MediaStreamTrack");
  assert(fallbackPlayed === true, "fallback Agora remote track should play");
  assert(fallbackGraph.remoteNodes.get("p_fallback")?.fallbackPlayback === true, "fallback remote track should be retained");
  fallbackGraph.setVoiceVolume(0.5);
  fallbackGraph.updateRemote("p_fallback", { gain: 0.4 });
  assert(fallbackVolumes.at(-1) === 20, "fallback remote track volume should follow spatial gain and voice volume");
  fallbackGraph.disconnectRemote("p_fallback");
  assert(fallbackStopped === true, "fallback remote track should stop on disconnect");

  console.log("Voice config validation passed.");
}

main();
