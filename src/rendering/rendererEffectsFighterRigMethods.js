import { getWarriorDoctrine, getWarriorWeaponForm, hasWarriorEldritchInvestment } from "../game/warriorTalentTree.js";
import { getWarriorDirectionIndexFromVector, getWarriorFrameSockets } from "./warriorSpriteSheet.js";

export function getWarriorRigPose(player, screenX, screenY, walkPhase = 0, attackPulse = 0) {
  const dirX = Number.isFinite(player?.dirX) ? player.dirX : 1;
  const dirY = Number.isFinite(player?.dirY) ? player.dirY : 0;
  const facing = getWarriorDirectionIndexFromVector(dirX, dirY);
  const frame = ((Math.floor(walkPhase * 6) % 6) + 6) % 6;
  const cooldown = Math.max(0, Math.min(1, attackPulse));
  const attackFrame = Math.max(0, Math.min(5, Math.round((1 - cooldown) * 5)));
  const sockets = getWarriorFrameSockets(facing, frame, attackFrame);
  const chestX = screenX + sockets.chest[0];
  const chestY = screenY + sockets.chest[1];
  const rearShoulderX = screenX + sockets.rearShoulder[0];
  const rearShoulderY = screenY + sockets.rearShoulder[1];
  const frontShoulderX = screenX + sockets.frontShoulder[0];
  const frontShoulderY = screenY + sockets.frontShoulder[1];
  const swordHandX = screenX + sockets.frontHand[0];
  const swordHandY = screenY + sockets.frontHand[1];
  const guardHandX = screenX + sockets.rearHand[0];
  const guardHandY = screenY + sockets.rearHand[1];
  return {
    aimAngle: facing * (Math.PI / 4),
    facing,
    frame,
    attackFrame,
    sockets,
    ax: sockets.ax,
    ay: sockets.ay,
    px: sockets.px,
    py: sockets.py,
    rawAx: sockets.ax,
    rawAy: sockets.ay,
    rawPx: sockets.px,
    rawPy: sockets.py,
    chestX,
    chestY,
    rearShoulderX,
    rearShoulderY,
    frontShoulderX,
    frontShoulderY,
    swordHandX,
    swordHandY,
    guardHandX,
    guardHandY
  };
}

export function getWarriorSpearPose(rigPose, attackPulse = 0) {
  const cooldown = Math.max(0, Math.min(1, attackPulse));
  const thrust = Math.sin((1 - cooldown) * Math.PI);
  const recovery = cooldown * cooldown;
  const { rawAx, rawAy, rawPx, rawPy, frontShoulderX, frontShoulderY, rearShoulderX, rearShoulderY } = rigPose;
  const frontReach = 12 + thrust * 5 - recovery * 2;
  const rearReach = 6.5 + thrust * 2;
  const spearHandX = frontShoulderX + rawAx * frontReach + rawPx * (0.8 + thrust * 0.6);
  const spearHandY = frontShoulderY + rawAy * frontReach + rawPy * (0.8 + thrust * 0.6);
  const braceHandX = rearShoulderX + rawAx * rearReach - rawPx * (1.8 + thrust * 0.5);
  const braceHandY = rearShoulderY + rawAy * rearReach - rawPy * (1.8 + thrust * 0.5);
  const shaftCenterX = (spearHandX * 0.68) + (braceHandX * 0.32);
  const shaftCenterY = (spearHandY * 0.68) + (braceHandY * 0.32);
  return {
    ax: rawAx,
    ay: rawAy,
    px: rawPx,
    py: rawPy,
    thrust,
    spearHandX,
    spearHandY,
    braceHandX,
    braceHandY,
    buttX: shaftCenterX - rawAx * (16 - thrust * 2),
    buttY: shaftCenterY - rawAy * (16 - thrust * 2),
    tipX: shaftCenterX + rawAx * (29 + thrust * 14 - recovery * 4),
    tipY: shaftCenterY + rawAy * (29 + thrust * 14 - recovery * 4)
  };
}

export function getWarriorHatchetGeometry(gripX, gripY, ax, ay, px, py, scale = 1) {
  const handleBack = 4.2 * scale;
  const handleForward = 10.8 * scale;
  const eyeX = gripX + ax * handleForward;
  const eyeY = gripY + ay * handleForward;
  return {
    handleStart: [gripX - ax * handleBack, gripY - ay * handleBack],
    handleEnd: [eyeX + ax * 1.2 * scale, eyeY + ay * 1.2 * scale],
    eye: [eyeX, eyeY],
    poll: [
      [eyeX - ax * 3.4 * scale + px * 2.3 * scale, eyeY - ay * 3.4 * scale + py * 2.3 * scale],
      [eyeX - ax * 1.0 * scale + px * 2.4 * scale, eyeY - ay * 1.0 * scale + py * 2.4 * scale],
      [eyeX - ax * 1.0 * scale - px * 2.4 * scale, eyeY - ay * 1.0 * scale - py * 2.4 * scale],
      [eyeX - ax * 3.4 * scale - px * 2.3 * scale, eyeY - ay * 3.4 * scale - py * 2.3 * scale]
    ],
    cheek: [
      [eyeX - ax * 1.2 * scale + px * 3.2 * scale, eyeY - ay * 1.2 * scale + py * 3.2 * scale],
      [eyeX + ax * 2.0 * scale + px * 6.1 * scale, eyeY + ay * 2.0 * scale + py * 6.1 * scale],
      [eyeX + ax * 5.0 * scale + px * 2.7 * scale, eyeY + ay * 5.0 * scale + py * 2.7 * scale],
      [eyeX + ax * 4.4 * scale - px * 3.4 * scale, eyeY + ay * 4.4 * scale - py * 3.4 * scale],
      [eyeX + ax * 0.4 * scale - px * 5.9 * scale, eyeY + ay * 0.4 * scale - py * 5.9 * scale],
      [eyeX - ax * 1.7 * scale - px * 2.1 * scale, eyeY - ay * 1.7 * scale - py * 2.1 * scale]
    ],
    edge: [
      [eyeX + ax * 2.0 * scale + px * 6.1 * scale, eyeY + ay * 2.0 * scale + py * 6.1 * scale],
      [eyeX + ax * 5.0 * scale + px * 2.7 * scale, eyeY + ay * 5.0 * scale + py * 2.7 * scale],
      [eyeX + ax * 4.4 * scale - px * 3.4 * scale, eyeY + ay * 4.4 * scale - py * 3.4 * scale],
      [eyeX + ax * 0.4 * scale - px * 5.9 * scale, eyeY + ay * 0.4 * scale - py * 5.9 * scale]
    ]
  };
}

export function getWarriorTwinHatchetPose(rigPose, attackPulse = 0) {
  const cooldown = Math.max(0, Math.min(1, attackPulse));
  const phase = 1 - cooldown;
  const chop = Math.sin(phase * Math.PI);
  const cross = Math.sin((phase - 0.5) * Math.PI);
  const { rawAx, rawAy, rawPx, rawPy, frontShoulderX, frontShoulderY, rearShoulderX, rearShoulderY } = rigPose;
  const mainReach = 8.6 + chop * 2.9 + phase * 1.4;
  const offReach = 7.2 + chop * 2.3 + phase * 1.2;
  const mainSide = -1.9 - cross * 1.7;
  const offSide = 2.2 + cross * 1.5;
  const mainGripX = frontShoulderX + rawAx * mainReach + rawPx * mainSide;
  const mainGripY = frontShoulderY + rawAy * mainReach + rawPy * mainSide;
  const offGripX = rearShoulderX + rawAx * offReach + rawPx * offSide;
  const offGripY = rearShoulderY + rawAy * offReach + rawPy * offSide;
  const mainAngle = Math.atan2(rawAy, rawAx) + (-1.55 + phase * 1.7);
  const offAngle = Math.atan2(rawAy, rawAx) + (1.55 - phase * 1.55);
  const mainAx = Math.cos(mainAngle);
  const mainAy = Math.sin(mainAngle);
  const offAx = Math.cos(offAngle);
  const offAy = Math.sin(offAngle);
  return {
    chop,
    cross,
    mainGripX,
    mainGripY,
    offGripX,
    offGripY,
    mainAx,
    mainAy,
    mainPx: -mainAy,
    mainPy: mainAx,
    offAx,
    offAy,
    offPx: -offAy,
    offPy: offAx
  };
}

export function getWarriorWhipPose(rigPose, attackPulse = 0) {
  const cooldown = Math.max(0, Math.min(1, attackPulse));
  const phase = 1 - cooldown;
  const lash = Math.sin(phase * Math.PI);
  const recoil = Math.sin((phase - 0.35) * Math.PI);
  const { rawAx, rawAy, rawPx, rawPy, frontShoulderX, frontShoulderY, rearShoulderX, rearShoulderY } = rigPose;
  const gripReach = 8.4 + lash * 2.2 + phase * 1.3;
  const gripSide = -1.2 - recoil * 1.4;
  const braceReach = 4.7 + lash * 0.7;
  const braceSide = 1.8 + recoil * 0.5;
  const gripX = frontShoulderX + rawAx * gripReach + rawPx * gripSide;
  const gripY = frontShoulderY + rawAy * gripReach + rawPy * gripSide;
  const braceHandX = rearShoulderX + rawAx * braceReach + rawPx * braceSide;
  const braceHandY = rearShoulderY + rawAy * braceReach + rawPy * braceSide;
  const handleStartX = gripX - rawAx * 4.2 + rawPx * 0.6;
  const handleStartY = gripY - rawAy * 4.2 + rawPy * 0.6;
  const handleTipX = gripX + rawAx * 4.8 - rawPx * 0.4;
  const handleTipY = gripY + rawAy * 4.8 - rawPy * 0.4;
  const coil1X = gripX + rawAx * (3.5 + lash * 4.5) + rawPx * (4.5 + recoil * 2.2);
  const coil1Y = gripY + rawAy * (3.5 + lash * 4.5) + rawPy * (4.5 + recoil * 2.2);
  const coil2X = gripX + rawAx * (7.5 + lash * 8.5) - rawPx * (5.4 - recoil * 1.4);
  const coil2Y = gripY + rawAy * (7.5 + lash * 8.5) - rawPy * (5.4 - recoil * 1.4);
  const tailX = gripX + rawAx * (12 + lash * 12) - rawPx * (1.4 + recoil * 3.6);
  const tailY = gripY + rawAy * (12 + lash * 12) - rawPy * (1.4 + recoil * 3.6);
  return {
    lash,
    recoil,
    gripX,
    gripY,
    braceHandX,
    braceHandY,
    handleStartX,
    handleStartY,
    handleTipX,
    handleTipY,
    coil1X,
    coil1Y,
    coil2X,
    coil2Y,
    tailX,
    tailY
  };
}

export const rendererEffectsFighterRigMethods = {
  drawPlayerFighterRig(player, screenX, screenY, walkPhase = 0, attackPulse = 0, visualSpec = null) {
    const ctx = this.ctx;
    const pose = getWarriorRigPose(player, screenX, screenY, walkPhase, attackPulse);
    const { aimAngle, rawAx, rawAy, rawPx, rawPy, chestX, chestY, rearShoulderX, rearShoulderY, frontShoulderX, frontShoulderY, swordHandX, swordHandY, guardHandX, guardHandY } = pose;
    const weaponAngle = Math.atan2(rawAy, rawAx);
    const ax = rawAx;
    const ay = rawAy;
    const px = rawPx;
    const py = rawPy;

    const drawArm = (sx, sy, hx, hy, color, bendSign) => {
      const vx = hx - sx;
      const vy = hy - sy;
      const len = Math.hypot(vx, vy) || 1;
      const nx = -vy / len;
      const ny = vx / len;
      const elbow = (1.7 + Math.min(1, len / 18) * 1.1) * bendSign;
      const ex = sx + vx * 0.48 + nx * elbow;
      const ey = sy + vy * 0.48 + ny * elbow;

      ctx.strokeStyle = color;
      ctx.lineWidth = 3.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.lineTo(hx, hy);
      ctx.stroke();
    };

    const costume = visualSpec?.costume || {};
    const weaponVisual = visualSpec?.weaponVisual || {};
    const rearArm = costume.armorDark || "#6f8aa8";
    const frontArm = costume.armor || "#8ca1bd";
    const blade = weaponVisual.blade || "#d8e3ef";
    const haft = weaponVisual.haft || "#7e6444";
    const guard = weaponVisual.guard || costume.trim || "#a08b5f";
    const accent = costume.accent || weaponVisual.trail || "#d8e3ef";

    const weaponForm = visualSpec?.weapon || getWarriorWeaponForm(player);
    const twinHatchetPose = weaponForm === "twinHatchets" ? getWarriorTwinHatchetPose(pose, attackPulse) : null;
    const whipPose = weaponForm === "warWhip" ? getWarriorWhipPose(pose, attackPulse) : null;
    if (weaponForm === "twinHatchets") {
      drawArm(rearShoulderX, rearShoulderY, twinHatchetPose.offGripX, twinHatchetPose.offGripY, rearArm, -1);
      drawArm(frontShoulderX, frontShoulderY, twinHatchetPose.mainGripX, twinHatchetPose.mainGripY, frontArm, 1);
    } else if (weaponForm === "warWhip") {
      drawArm(rearShoulderX, rearShoulderY, whipPose.braceHandX, whipPose.braceHandY, rearArm, -1);
      drawArm(frontShoulderX, frontShoulderY, whipPose.gripX, whipPose.gripY, frontArm, 1);
    } else if (weaponForm !== "longspear") {
      drawArm(rearShoulderX, rearShoulderY, guardHandX, guardHandY, rearArm, -1);
      drawArm(frontShoulderX, frontShoulderY, swordHandX, swordHandY, frontArm, 1);
    }
    const gripX = swordHandX;
    const gripY = swordHandY;
    const pommelX = gripX - ax * 3;
    const pommelY = gripY - ay * 3;
    const drawHatchet = (hx, hy, hatchetAx, hatchetAy, hatchetPx, hatchetPy, hatchetScale, mirrored = false) => {
      const side = mirrored ? -1 : 1;
      const geometry = getWarriorHatchetGeometry(hx, hy, hatchetAx, hatchetAy, hatchetPx * side, hatchetPy * side, hatchetScale);
      ctx.strokeStyle = haft;
      ctx.lineWidth = 2.4 * hatchetScale;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(geometry.handleStart[0], geometry.handleStart[1]);
      ctx.lineTo(geometry.handleEnd[0], geometry.handleEnd[1]);
      ctx.stroke();

      ctx.fillStyle = guard;
      ctx.beginPath();
      for (const [index, point] of geometry.poll.entries()) {
        if (index === 0) ctx.moveTo(point[0], point[1]);
        else ctx.lineTo(point[0], point[1]);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = blade;
      ctx.beginPath();
      for (const [index, point] of geometry.cheek.entries()) {
        if (index === 0) ctx.moveTo(point[0], point[1]);
        else ctx.lineTo(point[0], point[1]);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.1 * hatchetScale;
      ctx.beginPath();
      ctx.moveTo(geometry.edge[0][0], geometry.edge[0][1]);
      ctx.quadraticCurveTo(geometry.edge[1][0], geometry.edge[1][1], geometry.edge[2][0], geometry.edge[2][1]);
      ctx.quadraticCurveTo(geometry.edge[2][0] - hatchetAx * 1.5 * hatchetScale, geometry.edge[2][1] - hatchetAy * 1.5 * hatchetScale, geometry.edge[3][0], geometry.edge[3][1]);
      ctx.stroke();

      ctx.fillStyle = haft;
      ctx.beginPath();
      ctx.arc(geometry.eye[0], geometry.eye[1], Math.max(1.2, 1.7 * hatchetScale), 0, Math.PI * 2);
      ctx.fill();
    };

    if (weaponForm === "longspear") {
      const spear = getWarriorSpearPose(pose, attackPulse);
      drawArm(rearShoulderX, rearShoulderY, spear.braceHandX, spear.braceHandY, rearArm, -1);
      drawArm(frontShoulderX, frontShoulderY, spear.spearHandX, spear.spearHandY, frontArm, 1);
      ctx.strokeStyle = haft;
      ctx.lineWidth = 3.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(spear.buttX, spear.buttY);
      ctx.lineTo(spear.tipX, spear.tipY);
      ctx.stroke();
      ctx.strokeStyle = guard;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(spear.spearHandX - spear.px * 3.8, spear.spearHandY - spear.py * 3.8);
      ctx.lineTo(spear.spearHandX + spear.px * 3.8, spear.spearHandY + spear.py * 3.8);
      ctx.stroke();
      ctx.fillStyle = blade;
      ctx.beginPath();
      ctx.moveTo(spear.tipX + spear.ax * 7, spear.tipY + spear.ay * 7);
      ctx.lineTo(spear.tipX - spear.ax * 1.8 + spear.px * 4.8, spear.tipY - spear.ay * 1.8 + spear.py * 4.8);
      ctx.lineTo(spear.tipX - spear.ax * 1.8 - spear.px * 4.8, spear.tipY - spear.ay * 1.8 - spear.py * 4.8);
      ctx.closePath();
      ctx.fill();
    } else if (weaponForm === "warWhip") {
      ctx.strokeStyle = haft;
      ctx.lineWidth = 3.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(whipPose.handleStartX, whipPose.handleStartY);
      ctx.lineTo(whipPose.handleTipX, whipPose.handleTipY);
      ctx.stroke();
      ctx.strokeStyle = blade;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(whipPose.handleTipX, whipPose.handleTipY);
      ctx.bezierCurveTo(whipPose.coil1X, whipPose.coil1Y, whipPose.coil2X, whipPose.coil2Y, whipPose.tailX, whipPose.tailY);
      ctx.stroke();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(whipPose.gripX - ax * 0.5, whipPose.gripY - ay * 0.5, 3.8, weaponAngle - Math.PI * 0.45, weaponAngle + Math.PI * 0.95);
      ctx.stroke();
    } else if (weaponForm === "twinHatchets") {
      if (attackPulse > 0.01) {
        ctx.save();
        ctx.globalAlpha = 0.32 + twinHatchetPose.chop * 0.32;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.8;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(chestX, chestY, 20, weaponAngle - 1.05, weaponAngle - 0.12);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(chestX, chestY, 16, weaponAngle + 0.18, weaponAngle + 1.22);
        ctx.stroke();
        ctx.restore();
      }
      drawHatchet(twinHatchetPose.mainGripX, twinHatchetPose.mainGripY, twinHatchetPose.mainAx, twinHatchetPose.mainAy, twinHatchetPose.mainPx, twinHatchetPose.mainPy, 1, false);
      drawHatchet(twinHatchetPose.offGripX, twinHatchetPose.offGripY, twinHatchetPose.offAx, twinHatchetPose.offAy, twinHatchetPose.offPx, twinHatchetPose.offPy, 0.88, true);
    } else {
      const bladeLen = 15.5;
      const tipX = gripX + ax * bladeLen;
      const tipY = gripY + ay * bladeLen;
      const crossX = gripX - ax * 2.2;
      const crossY = gripY - ay * 2.2;
      ctx.strokeStyle = blade;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(crossX, crossY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.strokeStyle = guard;
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
