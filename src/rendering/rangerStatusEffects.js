import { getRangerEffectVisualSpec } from "./rangerVisualPresentation.js";

export function getRangerStatusEffectLayers(source = null) {
  const runtime = source?.rangerRuntime || source?.player?.rangerRuntime || {};
  const layers = [];
  const add = (type, active, radius, alpha) => {
    if (!active) return;
    const spec = getRangerEffectVisualSpec(source, type, {
      active: {
        stealth: (runtime.shadowVeilTimer || 0) > 0,
        poison: (runtime.venomCooldownTimer || 0) > 0,
        marked: (runtime.quarryStacks || 0) > 0,
        combo: (runtime.combo || 0) >= 5
      }
    });
    layers.push({ type, radius, alpha, color: spec.color, primary: spec.primary, overlays: spec.overlays });
  };
  add("swap", (runtime.swapBuffTimer || 0) > 0, 18, 0.34);
  add("buff", (runtime.shadowVeilTimer || 0) > 0, 21, 0.42);
  add("hit", (runtime.venomCooldownTimer || 0) > 0, 13, 0.36);
  add("hit", (runtime.quarryStacks || 0) > 0, 16 + Math.min(3, runtime.quarryStacks || 0) * 2, 0.3);
  add("capstone", (runtime.combo || 0) >= 10 || (runtime.apexPredatorAnnounceTier || 0) > 0, 24, 0.28);
  return layers;
}

export function drawRangerStatusEffects(ctx, source, screenX, screenY, time = 0) {
  const layers = getRangerStatusEffectLayers(source);
  if (layers.length === 0) return;
  ctx.save();
  ctx.translate(screenX, screenY);
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const pulse = 0.92 + Math.sin(time * (5.2 + i) + i * 1.7) * 0.08;
    const radius = layer.radius * pulse;
    ctx.globalAlpha = layer.alpha;
    ctx.strokeStyle = layer.color || "#8eb8ff";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, -5, radius, 0, Math.PI * 2);
    ctx.stroke();
    drawLayerPixels(ctx, layer, radius, time + i);
  }
  ctx.restore();
}

function drawLayerPixels(ctx, layer, radius, time) {
  const count = layer.overlays.includes("poisonDroplet") ? 3 : layer.overlays.includes("markedHitFlash") ? 4 : 2;
  ctx.fillStyle = layer.overlays.includes("poisonDroplet")
    ? "#8ae06f"
    : layer.overlays.includes("breakStealthFlash")
    ? "#9c88ff"
    : layer.overlays.includes("shortRedFlecks")
    ? "#d36a62"
    : layer.color || "#d8f4ff";
  for (let n = 0; n < count; n++) {
    const a = time * 1.9 + n * ((Math.PI * 2) / count);
    const x = Math.cos(a) * radius * 0.72;
    const y = -5 + Math.sin(a) * radius * 0.42;
    ctx.fillRect(x - 1, y - 1, 2, 2);
  }
}
