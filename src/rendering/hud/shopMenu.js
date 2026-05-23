import { drawConsumableItemIcon, getConsumableItemIconStatus } from "./consumableItemIcons.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function drawConsumablePlaceholder(ctx, key, x, y, size, accent = "rgba(126, 168, 255, 0.16)") {
  if (drawConsumableItemIcon(ctx, key, x, y, size, 2)) return;
  if (getConsumableItemIconStatus(key) === "loading") return;
  ctx.fillStyle = accent;
  ctx.fillRect(x + 3, y + 3, size - 6, size - 6);
  ctx.fillStyle = "#eef3ff";
  ctx.font = "bold 10px Trebuchet MS";
  ctx.fillText((key || "").slice(0, 2).toUpperCase(), x + 8, y + 19);
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines = [];
  let current = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]}`;
    if (ctx.measureText(next).width <= maxWidth) current = next;
    else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

function drawCoinGlyph(ctx, x, y, radius = 4) {
  ctx.fillStyle = "#f6c84f";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(102, 74, 19, 0.8)";
  ctx.stroke();
  ctx.fillStyle = "#fff3b3";
  ctx.beginPath();
  ctx.arc(x - radius * 0.3, y - radius * 0.3, Math.max(1, radius * 0.25), 0, Math.PI * 2);
  ctx.fill();
}

function pointInRect(x, y, rect) {
  return !!rect && x >= rect.x && y >= rect.y && x <= rect.x + rect.w && y <= rect.y + rect.h;
}

function getPlayerScreenCenter(renderer, game, layout) {
  const camera = typeof game.getCamera === "function" ? game.getCamera() : { x: 0, y: 0 };
  const playerX = Number.isFinite(game?.player?.x) ? game.player.x : layout.playW * 0.5 + (camera.x || 0);
  const playerY = Number.isFinite(game?.player?.y) ? game.player.y : renderer.canvas.height * 0.5 + (camera.y || 0);
  const bottomLimit = renderer.canvas.height - layout.xpBarH - 28;
  return {
    x: clamp(playerX - (camera.x || 0), 72, layout.playW - 72),
    y: clamp(playerY - (camera.y || 0), layout.topHudH + 72, bottomLimit)
  };
}

function getRadialPosition(index, count, center, radius, nodeSize, layout, canvasHeight) {
  const step = count > 1 ? (Math.PI * 2) / count : 0;
  const angle = -Math.PI / 2 + index * step;
  const x = center.x + Math.cos(angle) * radius - nodeSize * 0.5;
  const y = center.y + Math.sin(angle) * radius - nodeSize * 0.5;
  return {
    x: Math.floor(clamp(x, 10, layout.playW - nodeSize - 10)),
    y: Math.floor(clamp(y, layout.topHudH + 10, canvasHeight - layout.xpBarH - nodeSize - 10)),
    w: nodeSize,
    h: nodeSize
  };
}

function drawTexturedCircle(ctx, cx, cy, radius, disabled) {
  const gradient = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.35, radius * 0.1, cx, cy, radius);
  if (disabled) {
    gradient.addColorStop(0, "#9aa0a8");
    gradient.addColorStop(0.58, "#626a72");
    gradient.addColorStop(1, "#353a42");
  } else {
    gradient.addColorStop(0, "#d8c695");
    gradient.addColorStop(0.48, "#a9823a");
    gradient.addColorStop(1, "#57431d");
  }
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = disabled ? "rgba(205, 211, 220, 0.38)" : "rgba(218, 198, 140, 0.62)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = disabled ? "rgba(36, 39, 45, 0.26)" : "rgba(68, 53, 25, 0.24)";
  ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.arc(cx + i * radius * 0.18, cy + i * radius * 0.1, radius * (0.54 + i * 0.08), Math.PI * 0.18, Math.PI * 1.25);
    ctx.stroke();
  }
}

function drawShopNode(ctx, item, rect, canBuy) {
  const disabled = !canBuy;
  const circleRadius = Math.floor(Math.min(rect.w, rect.h - 16) * 0.38);
  const cx = Math.floor(rect.x + rect.w * 0.5);
  const cy = Math.floor(rect.y + circleRadius + 2);
  const iconSize = Math.floor(circleRadius * 1.74);
  const iconX = cx - Math.floor(iconSize * 0.5);
  const iconY = cy - Math.floor(iconSize * 0.5);
  const priceText = `${Math.max(0, Math.floor(item.priceForFloor || 0))}`;
  const stockText = `${Math.max(0, Math.floor(item.stock || 0))}/${Math.max(0, Math.floor(item.maxInventory || 0))}`;

  drawTexturedCircle(ctx, cx, cy, circleRadius, disabled);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, circleRadius - 3, 0, Math.PI * 2);
  ctx.clip();
  drawConsumablePlaceholder(ctx, item.key, iconX, iconY, iconSize, item.type === "Passive" ? "rgba(210, 168, 255, 0.16)" : "rgba(126, 168, 255, 0.16)");
  if (disabled) {
    ctx.fillStyle = "rgba(105, 111, 119, 0.58)";
    ctx.fillRect(cx - circleRadius, cy - circleRadius, circleRadius * 2, circleRadius * 2);
  }
  ctx.restore();

  ctx.font = "bold 12px Trebuchet MS";
  const gap = 4;
  const coinR = 4;
  const priceW = ctx.measureText(priceText).width;
  const stockW = ctx.measureText(stockText).width;
  const totalW = priceW + gap + coinR * 2 + gap + stockW;
  let x = rect.x + (rect.w - totalW) * 0.5;
  const y = cy + circleRadius + 9;
  ctx.textAlign = "center";
  ctx.fillStyle = disabled ? "#a0a6b0" : "#f4efe1";
  ctx.fillText(priceText, x + priceW * 0.5, y);
  x += priceW + gap + coinR;
  drawCoinGlyph(ctx, x, y - 4, coinR);
  x += coinR + gap;
  ctx.fillText(stockText, x + stockW * 0.5, y);
  ctx.textAlign = "left";
}

function drawShopTooltip(ctx, item, failure, mouseX, mouseY, layout, canvasHeight) {
  const lines = [
    { text: item.name, title: true },
    { text: `${item.type} - ${item.rarity} - ${item.priceForFloor}g`, meta: true },
    ...wrapText(ctx, item.effect, 238).map((text) => ({ text }))
  ];
  if (failure) lines.push({ text: failure, failure: true });

  const width = 270;
  const height = 18 + lines.length * 16;
  const x = Math.floor(clamp(mouseX + 16, 8, layout.playW - width - 8));
  const y = Math.floor(clamp(mouseY + 16, layout.topHudH + 8, canvasHeight - height - 8));

  ctx.fillStyle = "rgba(7, 10, 16, 0.96)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(176, 190, 220, 0.72)";
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    ctx.font = line.title ? "bold 14px Trebuchet MS" : "12px Trebuchet MS";
    ctx.fillStyle = line.title ? "#f4efe1" : line.failure ? "#d8aa8e" : line.meta ? "#9eb6df" : "#cbd5e6";
    ctx.fillText(line.text, x + 10, y + 18 + i * 16);
  }
}

export function drawShopMenu(renderer, game, layout) {
  const ctx = renderer.ctx;
  const items = typeof game.getShopItems === "function" ? game.getShopItems() : [];
  const center = getPlayerScreenCenter(renderer, game, layout);
  const nodeSize = layout.isAndroid ? 78 : 72;
  const radius = layout.isAndroid ? 86 : 80;
  const mouseX = Number.isFinite(game?.input?.mouse?.screenX) ? game.input.mouse.screenX : -1;
  const mouseY = Number.isFinite(game?.input?.mouse?.screenY) ? game.input.mouse.screenY : -1;
  let tooltip = null;
  const pinned = game?.uiPinnedTooltip?.source === "shop" ? game.uiPinnedTooltip : null;

  game.uiRects.shopClose = null;
  game.uiRects.shopScrollArea = null;
  game.uiRects.shopScrollMax = 0;
  if (game.uiScroll?.shop) game.uiScroll.shop = 0;

  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.fillRect(0, layout.topHudH, layout.playW, renderer.canvas.height - layout.topHudH - layout.xpBarH);

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const failure = typeof game.getShopFailureReason === "function" ? game.getShopFailureReason(item.key) : "";
    const rect = getRadialPosition(i, items.length, center, radius, nodeSize, layout, renderer.canvas.height);
    const canBuy = !failure;
    game.uiRects.shopItems.push({ key: item.key, rect });
    drawShopNode(ctx, item, rect, canBuy);
    if (pointInRect(mouseX, mouseY, rect)) tooltip = { item, failure };
    if (pinned?.key === item.key) tooltip = { item, failure, x: rect.x + rect.w, y: rect.y };
  }

  if (tooltip) {
    drawShopTooltip(
      ctx,
      tooltip.item,
      tooltip.failure,
      Number.isFinite(tooltip.x) ? tooltip.x : mouseX,
      Number.isFinite(tooltip.y) ? tooltip.y : mouseY,
      layout,
      renderer.canvas.height
    );
  }
}
