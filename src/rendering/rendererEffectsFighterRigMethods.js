import { getWarriorDoctrine, getWarriorWeaponForm, hasWarriorEldritchInvestment } from "../game/warriorTalentTree.js";

export const rendererEffectsFighterRigMethods = {
  drawPlayerFighterRig(player, screenX, screenY, walkPhase = 0, attackPulse = 0) {
    const ctx = this.ctx;
    const aimAngle = Math.atan2(player.dirY || 0, player.dirX || 1);
    const ax = Math.cos(aimAngle);
    const ay = Math.sin(aimAngle);
    const px = -ay;
    const py = ax;
    const chestX = screenX;
    const chestY = screenY - 8 + Math.sin(walkPhase * Math.PI * 2) * 0.6;
    const shoulderSpread = 4.7;
    const rearShoulderX = chestX - px * shoulderSpread;
    const rearShoulderY = chestY - py * shoulderSpread;
    const frontShoulderX = chestX + px * shoulderSpread;
    const frontShoulderY = chestY + py * shoulderSpread;
    const swing = 1 - Math.max(0, Math.min(1, attackPulse));
    const swordHandX = chestX + ax * (12 + swing * 4.5) + px * 1.8;
    const swordHandY = chestY + ay * (12 + swing * 4.5) + py * 1.8;
    const guardHandX = chestX + ax * (8 + swing * 1.2) - px * 3.8;
    const guardHandY = chestY + ay * (8 + swing * 1.2) - py * 3.8;

    const drawArm = (sx, sy, hx, hy, color, bendSign) => {
      const vx = hx - sx;
      const vy = hy - sy;
      const len = Math.hypot(vx, vy) || 1;
      const nx = -vy / len;
      const ny = vx / len;
      const elbow = 2.3 * bendSign;
      const ex = sx + vx * 0.53 + nx * elbow;
      const ey = sy + vy * 0.53 + ny * elbow;

      ctx.strokeStyle = color;
      ctx.lineWidth = 3.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.lineTo(hx, hy);
      ctx.stroke();
    };

    drawArm(rearShoulderX, rearShoulderY, guardHandX, guardHandY, "#6f8aa8", -1);
    drawArm(frontShoulderX, frontShoulderY, swordHandX, swordHandY, "#8ca1bd", 1);

    const weaponForm = getWarriorWeaponForm(player);
    const gripX = swordHandX;
    const gripY = swordHandY;
    const pommelX = gripX - ax * 3;
    const pommelY = gripY - ay * 3;

    if (weaponForm === "longspear") {
      const buttX = gripX - ax * 13;
      const buttY = gripY - ay * 13;
      const tipX = gripX + ax * 24;
      const tipY = gripY + ay * 24;
      ctx.strokeStyle = "#7e6444";
      ctx.lineWidth = 3.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(buttX, buttY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.fillStyle = "#d8e3ef";
      ctx.beginPath();
      ctx.moveTo(tipX + ax * 6, tipY + ay * 6);
      ctx.lineTo(tipX - ax * 1.5 + px * 4.6, tipY - ay * 1.5 + py * 4.6);
      ctx.lineTo(tipX - ax * 1.5 - px * 4.6, tipY - ay * 1.5 - py * 4.6);
      ctx.closePath();
      ctx.fill();
    } else if (weaponForm === "warWhip") {
      const handleTipX = gripX + ax * 4;
      const handleTipY = gripY + ay * 4;
      const coil1X = gripX + px * 4.5 - ax * 0.5;
      const coil1Y = gripY + py * 4.5 - ay * 0.5;
      const coil2X = gripX - px * 3.8 - ax * 1.4;
      const coil2Y = gripY - py * 3.8 - ay * 1.4;
      const tailX = gripX + ax * 5.5 - px * 2;
      const tailY = gripY + ay * 5.5 - py * 2;
      ctx.strokeStyle = "#8f6a44";
      ctx.lineWidth = 3.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(pommelX, pommelY);
      ctx.lineTo(handleTipX, handleTipY);
      ctx.stroke();
      ctx.strokeStyle = "#d3b489";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(gripX, gripY);
      ctx.bezierCurveTo(coil1X, coil1Y, coil2X, coil2Y, tailX, tailY);
      ctx.stroke();
      ctx.strokeStyle = "rgba(240, 224, 193, 0.85)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(gripX - ax * 0.8, gripY - ay * 0.8, 3.8, aimAngle - Math.PI * 0.45, aimAngle + Math.PI * 0.95);
      ctx.stroke();
    } else if (weaponForm === "twinHatchets") {
      const mainTipX = gripX + ax * 10;
      const mainTipY = gripY + ay * 10;
      const mainBackX = gripX - ax * 2.8;
      const mainBackY = gripY - ay * 2.8;
      ctx.strokeStyle = "#7e6444";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(mainBackX, mainBackY);
      ctx.lineTo(mainTipX, mainTipY);
      ctx.stroke();
      ctx.fillStyle = "#d8e3ef";
      ctx.beginPath();
      ctx.moveTo(mainTipX + px * 3.8, mainTipY + py * 3.8);
      ctx.lineTo(mainTipX + ax * 2, mainTipY + ay * 2);
      ctx.lineTo(mainTipX - px * 3.8, mainTipY - py * 3.8);
      ctx.lineTo(gripX + ax * 3, gripY + ay * 3);
      ctx.closePath();
      ctx.fill();

      const offGripX = guardHandX;
      const offGripY = guardHandY;
      const offTipX = offGripX + ax * 8;
      const offTipY = offGripY + ay * 8;
      const offBackX = offGripX - ax * 2.2;
      const offBackY = offGripY - ay * 2.2;
      ctx.strokeStyle = "#7e6444";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(offBackX, offBackY);
      ctx.lineTo(offTipX, offTipY);
      ctx.stroke();
      ctx.fillStyle = "#cfd9e5";
      ctx.beginPath();
      ctx.moveTo(offTipX + px * 3, offTipY + py * 3);
      ctx.lineTo(offTipX + ax * 1.4, offTipY + ay * 1.4);
      ctx.lineTo(offTipX - px * 3, offTipY - py * 3);
      ctx.lineTo(offGripX + ax * 2.4, offGripY + ay * 2.4);
      ctx.closePath();
      ctx.fill();
    } else {
      const bladeLen = 15.5;
      const tipX = gripX + ax * bladeLen;
      const tipY = gripY + ay * bladeLen;
      const crossX = gripX - ax * 2.2;
      const crossY = gripY - ay * 2.2;
      ctx.strokeStyle = "#d8e3ef";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(crossX, crossY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.strokeStyle = "#a08b5f";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(crossX + px * 4.2, crossY + py * 4.2);
      ctx.lineTo(crossX - px * 4.2, crossY - py * 4.2);
      ctx.stroke();
    }

    if (hasWarriorEldritchInvestment(player) && (player?.blockBonusTimer || 0) > 0) {
      const wardAlpha = Math.max(0.2, Math.min(0.8, (player.blockBonusTimer || 0) / 0.9));
      ctx.strokeStyle = `rgba(146, 128, 255, ${wardAlpha})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(chestX, chestY - 1, 16, 18, aimAngle * 0.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(211, 202, 255, ${wardAlpha * 0.8})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(chestX - 7, chestY - 10);
      ctx.lineTo(chestX + 7, chestY - 10);
      ctx.moveTo(chestX - 9, chestY + 2);
      ctx.lineTo(chestX + 9, chestY + 2);
      ctx.moveTo(chestX, chestY - 13);
      ctx.lineTo(chestX, chestY + 7);
      ctx.stroke();
    }
    if (player?.warriorRuntime?.shockReleaseReady) {
      const shockColor = getWarriorDoctrine(player) === "eldritch"
        ? "157, 123, 255"
        : getWarriorDoctrine(player) === "paladin"
        ? "245, 207, 111"
        : getWarriorDoctrine(player) === "gladiator"
        ? "214, 180, 135"
        : "220, 110, 98";
      const pulse = 0.42 + Math.sin((player.animTime || 0) * 8) * 0.12;
      ctx.strokeStyle = `rgba(${shockColor}, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(chestX, chestY + 8, 12.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(${shockColor}, ${pulse * 0.75})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(chestX, chestY + 8, 17, Math.PI * 0.15, Math.PI * 1.85);
      ctx.stroke();
    }
    if (getWarriorDoctrine(player) === "gladiator" && (player?.warriorRageActiveTimer || 0) > 0) {
      const auraAlpha = 0.42 + Math.sin((player.animTime || 0) * 6) * 0.08;
      ctx.strokeStyle = `rgba(226, 208, 178, ${auraAlpha})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(chestX, chestY, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(168, 140, 94, ${auraAlpha * 0.8})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(chestX, chestY, 13, Math.PI * 0.12, Math.PI * 1.88);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(chestX - 8, chestY);
      ctx.lineTo(chestX + 8, chestY);
      ctx.moveTo(chestX, chestY - 8);
      ctx.lineTo(chestX, chestY + 8);
      ctx.stroke();
    }
  },

};
