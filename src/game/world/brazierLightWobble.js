function getStableLightPhase(id) {
  const text = typeof id === "string" ? id : "brazier";
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) / 4294967296) * Math.PI * 2;
}

export function getBrazierLightWobble(game, light, radius, cfg = {}) {
  const time = Number.isFinite(game?.time) ? game.time : 0;
  const speed = Number.isFinite(cfg.brazierLightWobbleSpeed) ? Math.max(0, cfg.brazierLightWobbleSpeed) : 1.7;
  const radiusAmount = Number.isFinite(cfg.brazierLightWobbleRadius) ? Math.max(0, Math.min(0.08, cfg.brazierLightWobbleRadius)) : 0.025;
  const intensityAmount = Number.isFinite(cfg.brazierLightWobbleIntensity) ? Math.max(0, Math.min(0.08, cfg.brazierLightWobbleIntensity)) : 0.035;
  const phase = getStableLightPhase(light?.id);
  const primary = Math.sin(time * speed * Math.PI * 2 + phase);
  const secondary = Math.sin(time * speed * Math.PI * 3.73 + phase * 1.91);
  const wobble = (primary + secondary * 0.42) / 1.42;
  return {
    radius: radius * (1 + wobble * radiusAmount),
    lightIntensity: Math.max(0, Math.min(1, 0.965 + wobble * intensityAmount)),
    wobble
  };
}
