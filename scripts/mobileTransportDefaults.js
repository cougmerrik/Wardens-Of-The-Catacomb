export const ANDROID_DEFAULT_WS_URL = "wss://wardens-of-the-catacomb-production.up.railway.app";

export function buildAndroidRuntimeConfigEnv(env = process.env) {
  return {
    GAME_PLATFORM: env.GAME_PLATFORM || "android",
    GAME_WS_URL: env.GAME_WS_URL || ANDROID_DEFAULT_WS_URL,
    GAME_SHOW_GAMEPLAY_ADS: env.GAME_SHOW_GAMEPLAY_ADS || "false",
    GAME_ALLOW_SERVER_URL_OVERRIDE: env.GAME_ALLOW_SERVER_URL_OVERRIDE || "true"
  };
}
