export function applyRemoteActionAimToContext(context, state, input) {
  if (!context || !state || !input || !input.hasAim) return;
  if (!Number.isFinite(input.aimX) || !Number.isFinite(input.aimY)) return;
  context.input = {
    ...(context.input && typeof context.input === "object" ? context.input : {}),
    mouse: {
      ...(context.input?.mouse && typeof context.input.mouse === "object" ? context.input.mouse : {}),
      worldX: input.aimX,
      worldY: input.aimY
    }
  };
}

export function getRemoteActionAimVector(state, input) {
  if (state && input?.hasAim && Number.isFinite(input.aimX) && Number.isFinite(input.aimY)) {
    const dx = input.aimX - state.x;
    const dy = input.aimY - state.y;
    if (Math.hypot(dx, dy) > 0.001) return { dx, dy };
  }
  if (input?.hasAim && Number.isFinite(input.aimDirX) && Number.isFinite(input.aimDirY)) {
    const len = Math.hypot(input.aimDirX, input.aimDirY);
    if (len > 0.001) return { dx: input.aimDirX / len, dy: input.aimDirY / len };
  }
  return { dx: state?.dirX || 1, dy: state?.dirY || 0 };
}
