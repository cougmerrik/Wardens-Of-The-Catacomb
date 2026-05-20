export function advanceThrowingKnifeVisualHand(runtime = null) {
  const state = runtime && typeof runtime === "object" ? runtime : {};
  const nextHand = state.throwingKnifeVisualHand === -1 ? -1 : 1;
  state.throwingKnifeLastThrownHand = nextHand;
  state.throwingKnifeVisualHand = nextHand === 1 ? -1 : 1;
  state.throwingKnifeVisualAttackSeq = Math.max(0, Math.floor(state.throwingKnifeVisualAttackSeq || 0)) + 1;
  return state;
}

export function getThrowingKnifeReloadState(player = null, firePulse = 0, visualSpec = null) {
  const weapon = visualSpec?.weaponVisual?.style || visualSpec?.weapon;
  const weaponMode = visualSpec?.weaponMode === "melee" ? "melee" : "ranged";
  const pulse = Math.max(0, Math.min(1, Number.isFinite(firePulse) ? firePulse : 0));
  const runtime = player?.rangerRuntime && typeof player.rangerRuntime === "object" ? player.rangerRuntime : {};
  const seqHand = Math.floor(runtime.throwingKnifeVisualAttackSeq || 0) % 2 === 0 ? -1 : 1;
  const thrownHand = runtime.throwingKnifeLastThrownHand === -1 || runtime.throwingKnifeLastThrownHand === 1
    ? runtime.throwingKnifeLastThrownHand
    : seqHand;
  if (weapon !== "throwingKnives" || weaponMode !== "ranged" || pulse <= 0) {
    return { released: false, readyProgress: 1, cooldownSeconds: 0, releaseSeconds: 0, thrownHand };
  }
  const currentCooldown = Math.max(0, Number.isFinite(player?.fireCooldown) ? player.fireCooldown : 0);
  const cooldownSeconds = currentCooldown > 0 ? currentCooldown / pulse : 0;
  const fallbackCooldown = 0.3;
  const effectiveCooldown = Math.max(0.08, cooldownSeconds || fallbackCooldown);
  const elapsedSeconds = Math.max(0, effectiveCooldown - currentCooldown);
  const releaseSeconds = Math.max(0.06, Math.min(0.18, effectiveCooldown * 0.38));
  const released = currentCooldown > 0 && elapsedSeconds < releaseSeconds;
  const readyProgress = released ? Math.max(0, Math.min(1, elapsedSeconds / releaseSeconds)) : 1;
  return { released, readyProgress, cooldownSeconds: effectiveCooldown, releaseSeconds, thrownHand };
}

export function getThrowingKnifeMeleePresentation(visualSpec = null, player = null) {
  const weapon = visualSpec?.weaponVisual?.style || visualSpec?.weapon;
  const weaponMode = visualSpec?.weaponMode === "melee" ? "melee" : "ranged";
  const runtime = player?.rangerRuntime && typeof player.rangerRuntime === "object" ? player.rangerRuntime : {};
  const sequence = Math.max(0, Math.floor(runtime.throwingKnifeVisualAttackSeq || 0));
  const primaryHand = sequence % 2 === 1 ? 1 : -1;
  if (weapon !== "throwingKnives" || weaponMode !== "melee") {
    return { active: false, profile: "none", reach: "normal", arcCount: 0, primaryHand };
  }
  return {
    active: true,
    profile: "closeCuts",
    reach: "close",
    arcCount: 2,
    primaryHand,
    secondaryAlpha: 0.55,
    maxForwardPixels: 5.5
  };
}
