export function resolveReverbZone(game, listener = null) {
  const biomeKey = typeof game?.biomeKey === "string" ? game.biomeKey : "";
  const floor = Number.isFinite(game?.floor) ? game.floor : 1;
  const y = Number.isFinite(listener?.y) ? listener.y : Number.isFinite(game?.player?.y) ? game.player.y : 0;
  if (biomeKey.includes("crypt") || floor >= 8) return { key: "crypt", wetGain: 0.18 };
  if (biomeKey.includes("cave") || y > (game?.worldHeight || 0) * 0.58) return { key: "cave", wetGain: 0.13 };
  return { key: "dungeon", wetGain: 0.08 };
}
