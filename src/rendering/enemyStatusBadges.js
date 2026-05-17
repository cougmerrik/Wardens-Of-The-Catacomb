export function drawEnemyStatusBadge(type, x, y) {
  const ctx = this.ctx;
  ctx.save();
  ctx.lineWidth = 1.3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (type === "bleed") {
    ctx.fillStyle = "rgba(214, 46, 68, 0.94)";
    ctx.strokeStyle = "rgba(255, 205, 214, 0.9)";
    ctx.beginPath();
    ctx.moveTo(x, y - 7);
    ctx.bezierCurveTo(x + 6, y - 1, x + 5, y + 7, x, y + 8);
    ctx.bezierCurveTo(x - 5, y + 7, x - 6, y - 1, x, y - 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (type === "mark") {
    ctx.fillStyle = "rgba(255, 211, 94, 0.94)";
    ctx.strokeStyle = "rgba(91, 57, 12, 0.78)";
    ctx.beginPath();
    ctx.moveTo(x, y - 7);
    ctx.lineTo(x + 7, y);
    ctx.lineTo(x, y + 7);
    ctx.lineTo(x - 7, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(80, 48, 12, 0.65)";
    ctx.fillRect(x - 1, y - 4, 2, 8);
  } else if (type === "slow") {
    ctx.strokeStyle = "rgba(137, 219, 255, 0.96)";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6);
      ctx.stroke();
    }
  } else if (type === "poison") {
    ctx.fillStyle = "rgba(93, 222, 118, 0.92)";
    ctx.strokeStyle = "rgba(212, 255, 209, 0.82)";
    ctx.beginPath();
    ctx.arc(x - 3, y + 1, 4, 0, Math.PI * 2);
    ctx.arc(x + 3, y + 1, 4, 0, Math.PI * 2);
    ctx.arc(x, y - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (type === "weakened") {
    ctx.strokeStyle = "rgba(196, 206, 224, 0.95)";
    for (const [left, top, right, bottom] of [[-6, -5, 6, -5], [-4, 1, 4, 1]]) {
      ctx.beginPath();
      ctx.moveTo(x + left, y + top);
      ctx.lineTo(x, y + bottom + 3);
      ctx.lineTo(x + right, y + top);
      ctx.stroke();
    }
  } else if (type === "charm") {
    ctx.strokeStyle = "rgba(142, 184, 255, 0.95)";
    ctx.fillStyle = "rgba(142, 184, 255, 0.18)";
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawEnemyAdditionalStatusIcons(enemy, screenX, screenY) {
  const statuses = [];
  if ((enemy.rangerMarkedTimer || 0) > 0) statuses.push("mark");
  if ((enemy.slowTimer || 0) > 0) statuses.push("slow");
  if ((enemy.weakenedTimer || 0) > 0) statuses.push("weakened");
  if ((enemy.tempMageCharmTimer || 0) > 0) statuses.push("charm");
  if (statuses.length === 0) return;
  const reserved = [];
  if ((enemy.curseTimer || 0) > 0) reserved.push(-10);
  if ((enemy.burningTimer || 0) > 0) reserved.push(0);
  if ((enemy.rotTimer || 0) > 0) reserved.push(10);
  if ((enemy.bleedTimer || 0) > 0) reserved.push(-20);
  if ((enemy.poisonSlowTimer || 0) > 0) reserved.push(20);
  const candidates = [-30, -20, 20, 30, -40, 40, -50, 50];
  const y = Math.floor(screenY + enemy.size * 0.42);
  statuses.forEach((status, index) => {
    const offset = candidates.find((candidate) => !reserved.includes(candidate)) ?? (20 + index * 10);
    reserved.push(offset);
    this.drawEnemyStatusBadge(status, Math.floor(screenX + offset), y);
  });
}
