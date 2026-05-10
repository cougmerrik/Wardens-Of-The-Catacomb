const AGORA_CDN_URL = "https://download.agora.io/sdk/release/AgoraRTC_N.js";

function readArgValue(args, key) {
  const eqPrefix = `${key}=`;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === key) return typeof args[i + 1] === "string" ? args[i + 1] : "";
    if (typeof arg === "string" && arg.startsWith(eqPrefix)) return arg.slice(eqPrefix.length);
  }
  return "";
}

function sanitizeAppId(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeToken(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function resolveVoiceConfig({ env = process.env, argv = process.argv.slice(1) } = {}) {
  const appId = sanitizeAppId(
    readArgValue(argv, "--agora-app-id") ||
      readArgValue(argv, "--voice-agora-app-id") ||
      env.AGORA_APP_ID ||
      env.VOICE_AGORA_APP_ID ||
      ""
  );
  const token = sanitizeToken(
    readArgValue(argv, "--agora-token") ||
      readArgValue(argv, "--voice-agora-token") ||
      env.AGORA_TOKEN ||
      env.AGORA_RTC_TOKEN ||
      env.VOICE_AGORA_TOKEN ||
      ""
  );
  const sdkUrl = sanitizeAppId(env.AGORA_SDK_URL || env.VOICE_AGORA_SDK_URL || AGORA_CDN_URL) || AGORA_CDN_URL;
  return {
    enabled: !!appId,
    provider: "agora",
    appId,
    token,
    sdkUrl
  };
}

export function buildVoiceRoomConfig(baseConfig, roomId) {
  if (!baseConfig || !baseConfig.enabled) return { enabled: false };
  const normalizedRoom = typeof roomId === "string" ? roomId.trim().slice(0, 48).replace(/[^A-Za-z0-9_-]/g, "-") : "";
  const channel = normalizedRoom ? `wardens-${normalizedRoom}` : "wardens-lobby";
  return {
    enabled: true,
    provider: "agora",
    appId: baseConfig.appId,
    token: baseConfig.token || null,
    sdkUrl: baseConfig.sdkUrl,
    channel
  };
}

export function buildAgoraVoiceUid(playerId) {
  const text = typeof playerId === "string" && playerId ? playerId : "player";
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}
