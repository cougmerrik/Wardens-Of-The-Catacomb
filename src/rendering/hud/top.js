import { formatTime } from "../../utils.js";

export function drawHud(renderer, game, layout) {
  const ctx = renderer.ctx;
  ctx.fillStyle = "rgba(5, 8, 14, 0.9)";
  ctx.fillRect(0, 0, layout.playW, layout.topHudH);
  ctx.fillStyle = "#f2efe3";
  ctx.font = "16px Trebuchet MS";
  ctx.fillText(`Score: ${game.score}`, 14, 24);
  ctx.fillText(`Time: ${formatTime(game.time)}`, 200, 24);
  ctx.fillText(`Floor: ${game.floor}`, 360, 24);
  ctx.fillText(`Class: ${game.classSpec?.label || "Unknown"}`, 468, 24);
  if (game.networkEnabled) {
    ctx.fillStyle = game.networkRole === "Controller" ? "#8fe3a2" : "#dfc670";
    ctx.fillText(`Net: ${game.networkRole || "Connected"}`, 690, 24);
  }
}

export function drawPausedOverlay(renderer, layout) {
  const ctx = renderer.ctx;
  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  ctx.fillRect(0, 0, layout.playW, renderer.canvas.height);
  ctx.fillStyle = "#f2efe3";
  ctx.font = "bold 42px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("Paused", layout.playW / 2, renderer.canvas.height / 2 - 4);
  ctx.font = "16px Trebuchet MS";
  ctx.fillText("Press Esc to resume", layout.playW / 2, renderer.canvas.height / 2 + 24);
  ctx.textAlign = "left";
}
