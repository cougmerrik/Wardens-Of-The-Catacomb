export const runtimeSceneSkeletonWarriorDrawMethods = {
  drawSkeletonWarrior(enemy, screenX, screenY) {
    const ctx = this.ctx;
    const half = enemy.size * 0.5;
    const controlledColor = typeof enemy?.controlledColor === "string" && enemy.controlledColor ? enemy.controlledColor : null;
    if (enemy.collapsed) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
      ctx.beginPath();
      ctx.ellipse(screenX, screenY + half * 0.7, half, half * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      const reviveGlow = enemy.reviveAtEnd ? (enemy.reanimating ? 0.85 : 0.45) : 0;
      if (reviveGlow > 0) {
        ctx.strokeStyle = `rgba(145, 220, 255, ${reviveGlow})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(screenX, screenY + half * 0.2, half * 0.9, half * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = enemy.reviveAtEnd ? "#bfe8ff" : controlledColor ? hexToRgba(controlledColor, 0.84) : "#d7d9de";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenX - 7, screenY + 2);
      ctx.lineTo(screenX + 7, screenY - 1);
      ctx.moveTo(screenX - 6, screenY - 4);
      ctx.lineTo(screenX + 5, screenY + 5);
      ctx.moveTo(screenX - 2, screenY - 7);
      ctx.lineTo(screenX + 2, screenY + 7);
      ctx.stroke();
      if (enemy.reanimating) {
        ctx.fillStyle = "#dff8ff";
        ctx.font = "bold 10px Trebuchet MS";
        ctx.textAlign = "center";
        ctx.fillText("REVIVING", screenX, screenY - 12);
        ctx.textAlign = "left";
      }
      return;
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + half * 0.8, half * 0.92, half * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = controlledColor ? hexToRgba(controlledColor, 0.8) : "#d5d7dc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - 7);
    ctx.lineTo(screenX, screenY + 7);
    ctx.moveTo(screenX - 5, screenY - 2);
    ctx.lineTo(screenX + 5, screenY - 2);
    ctx.moveTo(screenX - 3, screenY + 7);
    ctx.lineTo(screenX - 6, screenY + 14);
    ctx.moveTo(screenX + 3, screenY + 7);
    ctx.lineTo(screenX + 6, screenY + 14);
    ctx.moveTo(screenX - 5, screenY + 1);
    ctx.lineTo(screenX - 9, screenY + 7);
    ctx.moveTo(screenX + 5, screenY + 1);
    ctx.lineTo(screenX + 9, screenY + 7);
    ctx.stroke();

    ctx.fillStyle = controlledColor ? hexToRgba(controlledColor, 0.9) : "#c7cad1";
    ctx.beginPath();
    ctx.arc(screenX, screenY - 11, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#49515e";
    ctx.fillRect(screenX - 2.5, screenY - 13, 2, 2);
    ctx.fillRect(screenX + 0.5, screenY - 13, 2, 2);

    const aimX = Number.isFinite(enemy.dirX) ? enemy.dirX : 1;
    const aimY = Number.isFinite(enemy.dirY) ? enemy.dirY : 0;
    const handX = screenX - 5;
    const handY = screenY + 1;
    const swordMidX = handX - 2;
    const swordMidY = handY - 10;
    const swordTipX = handX - 4 + aimX * 1.5;
    const swordTipY = handY - 18 + aimY * 1.5;
    ctx.strokeStyle = "#8f7450";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(swordMidX, swordMidY);
    ctx.stroke();
    ctx.strokeStyle = "#d9dce3";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(swordMidX, swordMidY);
    ctx.lineTo(swordTipX, swordTipY);
    ctx.stroke();
  },
};
