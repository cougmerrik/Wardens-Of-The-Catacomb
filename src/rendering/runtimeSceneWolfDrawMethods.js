export const runtimeSceneWolfDrawMethods = {
  drawWolf(enemy, screenX, screenY, time = 0) {
    const ctx = this.ctx;
    const half = (enemy.size || 22) * 0.5;
    const facing = (enemy.dirX || 1) < 0 ? -1 : 1;
    const bob = Math.sin((time || 0) * 8 + (enemy.x || 0) * 0.02) * 0.8;
    ctx.save();
    ctx.translate(screenX, screenY + bob);
    ctx.scale(facing, 1);

    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(0, half * 0.78, half * 1.15, half * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    const dire = !!enemy?.direWolf;
    ctx.fillStyle = dire ? "#8f98a4" : enemy?.isControlledUndead ? "#8b7a62" : "#6f6255";
    ctx.beginPath();
    ctx.ellipse(-half * 0.08, 0, half * 0.95, half * 0.48, -0.06, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = dire ? "#6d7680" : "#5b5148";
    ctx.beginPath();
    ctx.ellipse(half * 0.72, -half * 0.18, half * 0.46, half * 0.38, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = dire ? "#4d5660" : "#3f3834";
    ctx.beginPath();
    ctx.moveTo(half * 0.48, -half * 0.52);
    ctx.lineTo(half * 0.58, -half * 1.02);
    ctx.lineTo(half * 0.82, -half * 0.48);
    ctx.moveTo(half * 0.84, -half * 0.48);
    ctx.lineTo(half * 1.05, -half * 0.88);
    ctx.lineTo(half * 1.1, -half * 0.33);
    ctx.fill();

    ctx.fillStyle = "#1d1b1b";
    ctx.beginPath();
    ctx.arc(half * 1.05, -half * 0.22, half * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d8d0bd";
    ctx.fillRect(half * 0.66, -half * 0.32, half * 0.08, half * 0.08);

    ctx.fillStyle = dire ? "#5d6670" : "#4a4039";
    for (const x of [-0.55, -0.12, 0.28, 0.6]) ctx.fillRect(x * half, half * 0.24, half * 0.16, half * 0.62);

    ctx.strokeStyle = dire ? "#737d88" : "#5b5148";
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-half * 0.88, -half * 0.06);
    ctx.quadraticCurveTo(-half * 1.35, -half * 0.48, -half * 1.04, -half * 0.82);
    ctx.stroke();

    if (enemy?.isControlledUndead) {
      ctx.strokeStyle = dire ? "rgba(220, 228, 238, 0.82)" : "rgba(164, 220, 128, 0.65)";
      ctx.lineWidth = dire ? 2.4 : 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, half * (dire ? 1.22 : 1.14), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },

};
