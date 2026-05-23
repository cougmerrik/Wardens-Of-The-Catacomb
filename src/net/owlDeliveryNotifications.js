export function applyOwlDeliveryNotifications(game, owlDelivery) {
  const events = Array.isArray(owlDelivery?.notificationEvents) ? owlDelivery.notificationEvents : [];
  if (!events.length || typeof game?.pushMultiplayerNotification !== "function") return;
  if (!(game.owlDeliveryNotificationIds instanceof Set)) game.owlDeliveryNotificationIds = new Set();
  for (const event of events) {
    if (!event?.id || game.owlDeliveryNotificationIds.has(event.id) || typeof event.text !== "string") continue;
    game.owlDeliveryNotificationIds.add(event.id);
    game.pushMultiplayerNotification(event.text);
  }
  if (game.owlDeliveryNotificationIds.size > 80) {
    game.owlDeliveryNotificationIds = new Set(Array.from(game.owlDeliveryNotificationIds).slice(-40));
  }
}
