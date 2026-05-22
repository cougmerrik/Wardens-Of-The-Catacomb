function wrapTooltipLine(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (!current || ctx.measureText(next).width <= maxWidth) current = next;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function drawSkillTooltip(ctx, renderer, mouseX, mouseY, tooltip) {
  if (!tooltip) return;
  const sourceLines = [{ text: tooltip.title, title: true }, ...tooltip.lines.map((text) => ({ text }))];
  if (tooltip.requirement) sourceLines.push({ text: `Requirement: ${tooltip.requirement}`, requirement: true });
  ctx.save();
  const padding = 10;
  const maxBoxW = Math.min(460, renderer.canvas.width - 20);
  const maxTextW = Math.max(140, maxBoxW - padding * 2);
  const rows = [];
  for (const line of sourceLines) {
    ctx.font = line.title ? "bold 13px Trebuchet MS" : "12px Trebuchet MS";
    for (const text of wrapTooltipLine(ctx, line.text, maxTextW)) rows.push({ ...line, text });
  }
  let width = 0;
  for (const row of rows) {
    ctx.font = row.title ? "bold 13px Trebuchet MS" : "12px Trebuchet MS";
    width = Math.max(width, ctx.measureText(row.text).width);
  }
  const lineH = 16;
  const boxW = Math.min(maxBoxW, Math.ceil(width + padding * 2));
  const boxH = rows.length * lineH + padding * 2 - 4;
  const x = Math.max(10, Math.min(renderer.canvas.width - boxW - 10, mouseX + 16));
  const y = Math.max(26, Math.min(renderer.canvas.height - boxH - 10, mouseY - 10));
  ctx.fillStyle = "rgba(8, 11, 17, 0.97)";
  ctx.fillRect(x, y, boxW, boxH);
  ctx.strokeStyle = "rgba(154, 219, 194, 0.78)";
  ctx.strokeRect(x + 0.5, y + 0.5, boxW - 1, boxH - 1);
  rows.forEach((row, index) => {
    ctx.fillStyle = row.title ? "#f6f0df" : row.requirement ? "#ffcf9b" : "#d8e0ec";
    ctx.font = row.title ? "bold 13px Trebuchet MS" : "12px Trebuchet MS";
    ctx.fillText(row.text, x + padding, y + padding + 12 + index * lineH);
  });
  ctx.restore();
}
