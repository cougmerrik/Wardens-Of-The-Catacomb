import agoraToken from "agora-token";

const AGORA_CDN_URL = "https://download.agora.io/sdk/release/AgoraRTC_N.js";
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60;
const MAX_TOKEN_TTL_SECONDS = 24 * 60 * 60;
const { RtcRole, RtcTokenBuilder } = agoraToken;

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

function sanitizeCertificate(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function readPositiveInteger(args, env, argKey, envKeys, fallback) {
  const argValue = readArgValue(args, argKey);
  const raw = argValue || envKeys.map((key) => env[key]).find((value) => typeof value === "string" && value.trim()) || "";
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(MAX_TOKEN_TTL_SECONDS, Math.floor(parsed));
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
  const appCertificate = sanitizeCertificate(
    readArgValue(argv, "--agora-app-certificate") ||
      readArgValue(argv, "--voice-agora-app-certificate") ||
      env.AGORA_APP_CERTIFICATE ||
      env.VOICE_AGORA_APP_CERTIFICATE ||
      ""
  );
  const tokenTtlSeconds = readPositiveInteger(
    argv,
    env,
    "--agora-token-ttl-seconds",
    ["AGORA_TOKEN_TTL_SECONDS", "VOICE_AGORA_TOKEN_TTL_SECONDS"],
    DEFAULT_TOKEN_TTL_SECONDS
  );
  const sdkUrl = sanitizeAppId(env.AGORA_SDK_URL || env.VOICE_AGORA_SDK_URL || AGORA_CDN_URL) || AGORA_CDN_URL;
  return {
    enabled: !!appId,
    provider: "agora",
    appId,
    appCertificate,
    token,
    tokenTtlSeconds,
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
    appCertificate: baseConfig.appCertificate || "",
    token: baseConfig.token || null,
    tokenTtlSeconds: baseConfig.tokenTtlSeconds || DEFAULT_TOKEN_TTL_SECONDS,
    sdkUrl: baseConfig.sdkUrl,
    channel
  };
}

export function buildVoiceClientConfig(roomConfig, playerId, { nowSeconds = Math.floor(Date.now() / 1000) } = {}) {
  if (!roomConfig || !roomConfig.enabled) return { enabled: false };
  const hasPlayerId = typeof playerId === "string" && !!playerId;
  const uid = hasPlayerId ? buildAgoraVoiceUid(playerId) : 0;
  const tokenExpiresAt = nowSeconds + (roomConfig.tokenTtlSeconds || DEFAULT_TOKEN_TTL_SECONDS);
  const generatedToken = roomConfig.appCertificate && hasPlayerId
    ? RtcTokenBuilder.buildTokenWithUid(
      roomConfig.appId,
      roomConfig.appCertificate,
      roomConfig.channel,
      uid,
      RtcRole.PUBLISHER,
      tokenExpiresAt,
      tokenExpiresAt
    )
    : null;
  const token = generatedToken || roomConfig.token || null;
  return {
    enabled: true,
    provider: "agora",
    appId: roomConfig.appId,
    token,
    tokenExpiresAt: token ? tokenExpiresAt : 0,
    sdkUrl: roomConfig.sdkUrl,
    channel: roomConfig.channel,
    tokenMode: roomConfig.appCertificate ? "server-generated" : roomConfig.token ? "static" : "none"
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
