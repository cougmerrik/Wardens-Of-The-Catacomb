export function applyShopRotationSnapshot(game, state) {
  if (Array.isArray(state?.shopStock)) {
    game.shopStock = state.shopStock.map((entry) => ({
      key: typeof entry?.key === "string" ? entry.key : "",
      stock: Number.isFinite(entry?.stock) ? Math.max(0, Math.floor(entry.stock)) : 0
    })).filter((entry) => entry.key);
  }
  if (!Array.isArray(state?.shopRotationEvents) || typeof game?.pushMultiplayerNotification !== "function") return;
  if (!(game.shopRotationNotificationIds instanceof Set)) game.shopRotationNotificationIds = new Set();
  for (const event of state.shopRotationEvents) {
    if (!event?.id || game.shopRotationNotificationIds.has(event.id) || typeof event.text !== "string") continue;
    game.shopRotationNotificationIds.add(event.id);
    game.pushMultiplayerNotification(event.text);
  }
  if (game.shopRotationNotificationIds.size > 80) {
    game.shopRotationNotificationIds = new Set(Array.from(game.shopRotationNotificationIds).slice(-40));
  }
}
