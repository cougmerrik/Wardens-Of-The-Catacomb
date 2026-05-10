const MASTER_VOLUME_STORAGE_KEY = "wardens.masterVolume";
const VOICE_CHAT_ENABLED_STORAGE_KEY = "wardens.voiceChatEnabled";
const VOICE_CHAT_VOLUME_STORAGE_KEY = "wardens.voiceChatVolume";
const VOICE_CHAT_MODE_STORAGE_KEY = "wardens.voiceChatMode";
const VOICE_CHAT_PUSH_TO_TALK_KEY_STORAGE_KEY = "wardens.voiceChatPushToTalkKey";
const DEFAULT_MASTER_VOLUME = 0.25;
const DEFAULT_VOICE_CHAT_ENABLED = false;
const DEFAULT_VOICE_CHAT_VOLUME = 0.8;
export const VOICE_CHAT_MODE_OPEN_MIC = "openMic";
export const VOICE_CHAT_MODE_PUSH_TO_TALK = "pushToTalk";
export const VOICE_CHAT_MODE_MUTED = "muted";
const DEFAULT_VOICE_CHAT_MODE = VOICE_CHAT_MODE_OPEN_MIC;
const DEFAULT_VOICE_CHAT_PUSH_TO_TALK_KEY = "v";

export function normalizeMasterVolume(value, fallback = DEFAULT_MASTER_VOLUME) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, numeric));
}

export function getStoredMasterVolume(storage = globalThis?.localStorage) {
  try {
    const raw = storage?.getItem?.(MASTER_VOLUME_STORAGE_KEY);
    if (raw == null || raw === "") return DEFAULT_MASTER_VOLUME;
    return normalizeMasterVolume(raw, DEFAULT_MASTER_VOLUME);
  } catch {
    return DEFAULT_MASTER_VOLUME;
  }
}

export function persistMasterVolume(volume, storage = globalThis?.localStorage) {
  try {
    storage?.setItem?.(MASTER_VOLUME_STORAGE_KEY, String(normalizeMasterVolume(volume)));
  } catch {}
}

export function syncGlobalMasterVolume(volume) {
  if (typeof window === "undefined") return;
  window.__WOTC_MASTER_VOLUME__ = normalizeMasterVolume(volume);
}

export function getStoredVoiceChatEnabled(storage = globalThis?.localStorage) {
  try {
    const raw = storage?.getItem?.(VOICE_CHAT_ENABLED_STORAGE_KEY);
    if (raw == null || raw === "") return DEFAULT_VOICE_CHAT_ENABLED;
    return raw !== "0" && raw !== "false";
  } catch {
    return DEFAULT_VOICE_CHAT_ENABLED;
  }
}

export function persistVoiceChatEnabled(enabled, storage = globalThis?.localStorage) {
  try {
    storage?.setItem?.(VOICE_CHAT_ENABLED_STORAGE_KEY, enabled ? "1" : "0");
  } catch {}
}

export function normalizeVoiceChatVolume(value, fallback = DEFAULT_VOICE_CHAT_VOLUME) {
  return normalizeMasterVolume(value, fallback);
}

export function getStoredVoiceChatVolume(storage = globalThis?.localStorage) {
  try {
    const raw = storage?.getItem?.(VOICE_CHAT_VOLUME_STORAGE_KEY);
    if (raw == null || raw === "") return DEFAULT_VOICE_CHAT_VOLUME;
    return normalizeVoiceChatVolume(raw, DEFAULT_VOICE_CHAT_VOLUME);
  } catch {
    return DEFAULT_VOICE_CHAT_VOLUME;
  }
}

export function persistVoiceChatVolume(volume, storage = globalThis?.localStorage) {
  try {
    storage?.setItem?.(VOICE_CHAT_VOLUME_STORAGE_KEY, String(normalizeVoiceChatVolume(volume)));
  } catch {}
}

export function normalizeVoiceChatMode(mode, fallback = DEFAULT_VOICE_CHAT_MODE) {
  return mode === VOICE_CHAT_MODE_PUSH_TO_TALK || mode === VOICE_CHAT_MODE_MUTED || mode === VOICE_CHAT_MODE_OPEN_MIC ? mode : fallback;
}

export function getStoredVoiceChatMode(storage = globalThis?.localStorage) {
  try {
    const raw = storage?.getItem?.(VOICE_CHAT_MODE_STORAGE_KEY);
    return normalizeVoiceChatMode(raw, DEFAULT_VOICE_CHAT_MODE);
  } catch {
    return DEFAULT_VOICE_CHAT_MODE;
  }
}

export function persistVoiceChatMode(mode, storage = globalThis?.localStorage) {
  try {
    storage?.setItem?.(VOICE_CHAT_MODE_STORAGE_KEY, normalizeVoiceChatMode(mode));
  } catch {}
}

export function normalizePushToTalkKey(key, fallback = DEFAULT_VOICE_CHAT_PUSH_TO_TALK_KEY) {
  if (typeof key !== "string") return fallback;
  const normalized = key.trim().toLowerCase();
  return normalized ? normalized.slice(0, 32) : fallback;
}

export function getStoredVoiceChatPushToTalkKey(storage = globalThis?.localStorage) {
  try {
    const raw = storage?.getItem?.(VOICE_CHAT_PUSH_TO_TALK_KEY_STORAGE_KEY);
    return normalizePushToTalkKey(raw, DEFAULT_VOICE_CHAT_PUSH_TO_TALK_KEY);
  } catch {
    return DEFAULT_VOICE_CHAT_PUSH_TO_TALK_KEY;
  }
}

export function persistVoiceChatPushToTalkKey(key, storage = globalThis?.localStorage) {
  try {
    storage?.setItem?.(VOICE_CHAT_PUSH_TO_TALK_KEY_STORAGE_KEY, normalizePushToTalkKey(key));
  } catch {}
}
