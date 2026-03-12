export class RendererRuntimeBase {
  constructor(canvas, ctx, config) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.config = config;
    this.sidebarWidth = this.config.hud.sidebarWidth;
    this.topHudHeight = this.config.hud.topHudHeight;
    this.sidebarPadding = 12;
    this.ctx.imageSmoothingEnabled = false;
    this.playerSpriteSheet = this.createPlayerSpriteSheet();
    this.keySprite = this.createKeySprite();
    this.goldBagSprite = this.createGoldBagSprite();
    this.potionSprite = this.createPotionSprite();
  }

  createPlayerSpriteSheet() {
    const frame = this.config.player.spriteFrame;
    const dirs = this.config.player.spriteDirections;
    const frames = this.config.player.spriteFramesPerDir;
    const sheet = document.createElement("canvas");
    sheet.width = frame * frames;
    sheet.height = frame * dirs;
    const sctx = sheet.getContext("2d");
    sctx.imageSmoothingEnabled = false;

    for (let dir = 0; dir < dirs; dir++) {
      const angle = (dir / dirs) * Math.PI * 2;
      for (let f = 0; f < frames; f++) {
        const ox = f * frame;
        const oy = dir * frame;
        this.drawArcherFrame(sctx, ox, oy, angle, f);
      }
    }
    return sheet;
  }

  drawArcherFrame(sctx, ox, oy, angle, frameIndex) {
    const frame = this.config.player.spriteFrame;
    const cx = ox + frame / 2;
    const cy = oy + frame / 2;
    const bob = frameIndex === 0 ? -1.3 : 1.3;
    const stride = frameIndex === 0 ? -1 : 1;
    const faceDirX = Math.cos(angle);
    const faceDirY = Math.sin(angle);
    const headY = cy - 8 + bob;
    const torsoY = cy + 3 + bob;

    sctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    sctx.beginPath();
    sctx.ellipse(cx, cy + 18, 10.5, 3.6, 0, 0, Math.PI * 2);
    sctx.fill();

    sctx.fillStyle = "#3a7d4d";
    sctx.beginPath();
    sctx.ellipse(cx, torsoY, 9.5, 12, 0, 0, Math.PI * 2);
    sctx.fill();
    sctx.fillStyle = "#62b276";
    sctx.beginPath();
    sctx.ellipse(cx - 2.3, torsoY - 2.5, 4.1, 6.7, 0, 0, Math.PI * 2);
    sctx.fill();
    sctx.fillStyle = "#26492f";
    sctx.fillRect(cx - 2, torsoY - 10, 4, 19);

    sctx.fillStyle = "#e7c7a1";
    sctx.beginPath();
    sctx.ellipse(cx, headY, 6.4, 7.3, 0, 0, Math.PI * 2);
    sctx.fill();
    sctx.fillStyle = "#2f5d3b";
    sctx.beginPath();
    sctx.moveTo(cx - 8.5, headY + 2);
    sctx.lineTo(cx + 8.5, headY + 2);
    sctx.lineTo(cx + 6.3, headY - 9.5);
    sctx.lineTo(cx - 6.3, headY - 9.5);
    sctx.closePath();
    sctx.fill();
    sctx.fillStyle = "#8b6540";
    sctx.beginPath();
    sctx.ellipse(cx, headY - 1.8, 5.8, 3.8, 0, Math.PI, Math.PI * 2);
    sctx.fill();

    const eyeX = faceDirX * 2.1;
    const eyeY = faceDirY * 1.4;
    sctx.fillStyle = "#1a232f";
    sctx.fillRect(cx - 2.5 + eyeX, headY - 1 + eyeY, 1.7, 1.3);
    sctx.fillRect(cx + 0.8 + eyeX, headY - 1 + eyeY, 1.7, 1.3);

    sctx.fillStyle = "#2d4f7d";
    sctx.beginPath();
    sctx.ellipse(cx - 3.7, cy + 15.8 - stride * 1.4, 3, 8.2, 0, 0, Math.PI * 2);
    sctx.ellipse(cx + 3.7, cy + 15.8 + stride * 1.4, 3, 8.2, 0, 0, Math.PI * 2);
    sctx.fill();
    sctx.fillStyle = "#1d3048";
    sctx.fillRect(cx - 6.4, cy + 22.5 - stride * 1.4, 4.8, 2.2);
    sctx.fillRect(cx + 1.6, cy + 22.5 + stride * 1.4, 4.8, 2.2);

    sctx.fillStyle = "#6f5534";
    sctx.beginPath();
    sctx.ellipse(cx - 7, torsoY + 2, 1.6, 4.8, -0.4, 0, Math.PI * 2);
    sctx.fill();
    sctx.fillStyle = "#c4433b";
    sctx.fillRect(cx - 8.3, torsoY + 1.4, 2.6, 1.4);

  }

  drawPlayerAimingRig(player, screenX, screenY, walkPhase = 0, firePulse = 0) {
    const ctx = this.ctx;
    const aimAngle = Math.atan2(player.dirY || 0, player.dirX || 1);
    const ax = Math.cos(aimAngle);
    const ay = Math.sin(aimAngle);
    const px = -ay;
    const py = ax;

    const chestX = screenX;
    const chestY = screenY - 8 + Math.sin(walkPhase * Math.PI * 2) * 0.9;
    const shoulderSpread = 4.6;

    const rearShoulderX = chestX - px * shoulderSpread;
    const rearShoulderY = chestY - py * shoulderSpread;
    const frontShoulderX = chestX + px * shoulderSpread;
    const frontShoulderY = chestY + py * shoulderSpread;

    // Recoil pulse after a shot: draw hand snaps back and string oscillates briefly.
    const recoil = Math.max(0, Math.min(1, firePulse));
    const bowGripX = chestX + ax * 14 + px * 0.8;
    const bowGripY = chestY + ay * 14 + py * 0.8;
    const drawHandX = chestX + ax * (8 - recoil * 5.5) - px * 1.6;
    const drawHandY = chestY + ay * (8 - recoil * 5.5) - py * 1.6;
    const stringKick = Math.sin(recoil * Math.PI) * 2.6;

    const drawArm = (sx, sy, hx, hy, sleeve, skin, elbowBendSign) => {
      const vx = hx - sx;
      const vy = hy - sy;
      const len = Math.hypot(vx, vy) || 1;
      const nx = -vy / len;
      const ny = vx / len;
      const bend = 2.2 * elbowBendSign;
      const ex = sx + vx * 0.52 + nx * bend;
      const ey = sy + vy * 0.52 + ny * bend;

      ctx.strokeStyle = sleeve;
      ctx.lineWidth = 3.8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.strokeStyle = skin;
      ctx.lineWidth = 3.1;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(hx, hy);
      ctx.stroke();
    };

    // Rear arm draws string (behind bow).
    drawArm(rearShoulderX, rearShoulderY, drawHandX, drawHandY, "#2d5132", "#e4c39c", -1);

    // Bow.
    ctx.strokeStyle = "#6d4a2c";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(bowGripX + px * -8, bowGripY + py * -8);
    ctx.quadraticCurveTo(bowGripX + ax * 12, bowGripY + ay * 12, bowGripX + px * 8, bowGripY + py * 8);
    ctx.stroke();

    // Bow string bends toward draw hand and ripples briefly on shot.
    ctx.strokeStyle = "#e5d4af";
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(bowGripX + px * -8, bowGripY + py * -8);
    ctx.quadraticCurveTo(drawHandX - ax * stringKick, drawHandY - ay * stringKick, bowGripX + px * 8, bowGripY + py * 8);
    ctx.stroke();

    // Arrow nocked to the string hand.
    const arrowTailX = drawHandX - ax * 1.4;
    const arrowTailY = drawHandY - ay * 1.4;
    const arrowHeadX = bowGripX + ax * 12.5;
    const arrowHeadY = bowGripY + ay * 12.5;
    ctx.strokeStyle = "#d3c59d";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(arrowTailX, arrowTailY);
    ctx.lineTo(arrowHeadX, arrowHeadY);
    ctx.stroke();
    ctx.fillStyle = "#ecdfc1";
    ctx.beginPath();
    ctx.moveTo(arrowHeadX, arrowHeadY);
    ctx.lineTo(arrowHeadX - ax * 3.9 + px * 1.9, arrowHeadY - ay * 3.9 + py * 1.9);
    ctx.lineTo(arrowHeadX - ax * 3.9 - px * 1.9, arrowHeadY - ay * 3.9 - py * 1.9);
    ctx.closePath();
    ctx.fill();

    // Front arm holds bow (drawn on top).
    drawArm(frontShoulderX, frontShoulderY, bowGripX, bowGripY, "#355f3b", "#e4c39c", 1);

    // Shoulder joints.
    ctx.fillStyle = "#e4c39c";
    ctx.beginPath();
    ctx.arc(rearShoulderX, rearShoulderY, 1.2, 0, Math.PI * 2);
    ctx.arc(frontShoulderX, frontShoulderY, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  createKeySprite() {
    const sprite = document.createElement("canvas");
    sprite.width = 16;
    sprite.height = 16;
    const sctx = sprite.getContext("2d");
    sctx.fillStyle = "#f2cc69";
    sctx.beginPath();
    sctx.arc(5, 5, 3.5, 0, Math.PI * 2);
    sctx.fill();
    sctx.fillStyle = "#0f1218";
    sctx.beginPath();
    sctx.arc(5, 5, 1.5, 0, Math.PI * 2);
    sctx.fill();
    sctx.fillStyle = "#e8bc4f";
    sctx.fillRect(7, 4, 7, 2.4);
    sctx.fillRect(11, 6, 2.2, 2.2);
    sctx.fillRect(13, 6, 1.6, 3.8);
    sctx.fillRect(10, 6, 1.8, 3.2);
    sctx.fillStyle = "rgba(255, 246, 210, 0.7)";
    sctx.fillRect(8, 4.3, 4.5, 0.8);
    return sprite;
  }

  createGoldBagSprite() {
    const sprite = document.createElement("canvas");
    sprite.width = 24;
    sprite.height = 24;
    const sctx = sprite.getContext("2d");

    sctx.fillStyle = "rgba(0, 0, 0, 0.32)";
    sctx.beginPath();
    sctx.ellipse(12, 19, 7.8, 2.8, 0, 0, Math.PI * 2);
    sctx.fill();

    sctx.fillStyle = "#7b4f2c";
    sctx.beginPath();
    sctx.moveTo(5, 10);
    sctx.quadraticCurveTo(6, 6, 9, 5);
    sctx.lineTo(15, 5);
    sctx.quadraticCurveTo(18, 6, 19, 10);
    sctx.lineTo(18, 18);
    sctx.quadraticCurveTo(12, 21, 6, 18);
    sctx.closePath();
    sctx.fill();

    sctx.fillStyle = "#5f3d22";
    sctx.fillRect(7, 8, 10, 2);
    sctx.fillStyle = "#9a6a3c";
    sctx.fillRect(9, 7, 6, 1);

    sctx.fillStyle = "#d8b34f";
    sctx.beginPath();
    sctx.arc(10, 14, 1.9, 0, Math.PI * 2);
    sctx.arc(14, 15, 1.8, 0, Math.PI * 2);
    sctx.arc(12, 12, 1.6, 0, Math.PI * 2);
    sctx.fill();

    return sprite;
  }

  createPotionSprite() {
    const sprite = document.createElement("canvas");
    sprite.width = 20;
    sprite.height = 24;
    const sctx = sprite.getContext("2d");

    sctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    sctx.beginPath();
    sctx.ellipse(10, 20, 6.8, 2.5, 0, 0, Math.PI * 2);
    sctx.fill();

    sctx.fillStyle = "#a6b8cf";
    sctx.fillRect(8, 3, 4, 3);
    sctx.fillStyle = "#7f95b5";
    sctx.fillRect(8, 6, 4, 2);

    sctx.fillStyle = "#8f2020";
    sctx.beginPath();
    sctx.moveTo(5, 9);
    sctx.quadraticCurveTo(5, 6, 8, 6);
    sctx.lineTo(12, 6);
    sctx.quadraticCurveTo(15, 6, 15, 9);
    sctx.lineTo(15, 13);
    sctx.quadraticCurveTo(15, 18, 10, 19);
    sctx.quadraticCurveTo(5, 18, 5, 13);
    sctx.closePath();
    sctx.fill();

    sctx.fillStyle = "#d24a4a";
    sctx.beginPath();
    sctx.ellipse(9, 12, 3, 4.5, -0.2, 0, Math.PI * 2);
    sctx.fill();
    sctx.fillStyle = "rgba(255, 220, 220, 0.7)";
    sctx.fillRect(8, 9, 1.2, 4);

    return sprite;
  }

}
