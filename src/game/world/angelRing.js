export function triggerAngelRing(game, payload = {}) {
  const beforeHealth = Number.isFinite(game.player?.health) ? game.player.health : 0;
  const healAmount = (game.player?.maxHealth || 0) * 0.5;
  if (typeof game.applyPlayerHealing === "function") game.applyPlayerHealing(healAmount, { suppressText: true });
  const afterHealth = Number.isFinite(game.player?.health) ? game.player.health : beforeHealth;
  const healed = Math.max(0, afterHealth - beforeHealth);
  const x = Number.isFinite(game.player?.x) ? game.player.x : 0;
  const y = Number.isFinite(game.player?.y) ? game.player.y : 0;
  if (Array.isArray(game.fireZones)) {
    const tile = Number.isFinite(game.config?.map?.tile) ? game.config.map.tile : 32;
    game.fireZones.push({
      x,
      y,
      radius: tile * 2.2,
      life: 0.55,
      totalLife: 0.55,
      zoneType: "angelRingBurst"
    });
  }
  if (healed > 0 && typeof game.spawnFloatingText === "function") {
    game.spawnFloatingText(
      x,
      y - 52,
      `+${Math.max(1, Math.round(healed))}`,
      typeof game.getHealingTextColor === "function" ? game.getHealingTextColor() : "#79e59a",
      0.95,
      15
    );
  }
  if (payload && typeof payload === "object") payload.preventDeath = true;
  return true;
}
