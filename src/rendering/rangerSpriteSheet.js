export function drawArcherFrame(sctx, config, ox, oy, angle, frameIndex, visualSpec = null) {
  const sourceFrame = config.player.spriteFrame;
  if (sourceFrame !== 64) {
    const scale = sourceFrame / 64;
    sctx.save();
    sctx.translate(ox, oy);
    sctx.scale(scale, scale);
    drawArcherFrameLogical(sctx, { ...config, player: { ...config.player, spriteFrame: 64 } }, 0, 0, angle, frameIndex, visualSpec);
    sctx.restore();
    return;
  }
  drawArcherFrameLogical(sctx, config, ox, oy, angle, frameIndex, visualSpec);
}

function drawArcherFrameLogical(sctx, config, ox, oy, angle, frameIndex, visualSpec = null) {
  const frame = config.player.spriteFrame;
  const cx = ox + frame / 2;
  const cy = oy + frame / 2;
  const faceDirX = Math.cos(angle);
  const faceDirY = Math.sin(angle);
  const sideAbs = Math.abs(faceDirX);
  const back = faceDirY < -0.38;
  const front = faceDirY > 0.38;
  const pose = getRangerFramePose(faceDirX, faceDirY, frameIndex);
  const bob = pose.bob;
  const stride = pose.stride;
  const headY = cy - 8 + bob;
  const torsoY = cy + 3 + bob;
  const costume = visualSpec?.costume || {};
  const gear = new Set(visualSpec?.sprite?.gear || []);
  const accents = new Set(visualSpec?.sprite?.secondaryAccents || []);
  const hoodColor = costume.hood || "#2f5d3b";
  const tunicColor = costume.tunic || "#3a7d4d";
  const trimColor = costume.trim || "#62b276";
  const leatherColor = costume.leather || "#6f5534";
  const accentColor = costume.accent || "#8eb8ff";
  const hairColor = costume.hair || "#8b6540";
  const headX = cx + faceDirX * 1.4 + pose.hoodSwayX;
  const faceLift = front ? 0.65 : back ? -0.35 : faceDirY * 0.25;
  const torsoX = cx + faceDirX * 0.7 + pose.torsoSwayX;
  const quiverX = cx - faceDirX * 4.8 - faceDirY * 1.8;
  const quiverY = torsoY - faceDirY * 2.2;

  sctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  sctx.beginPath();
  sctx.ellipse(cx, cy + 18, 10.5, 3.6, 0, 0, Math.PI * 2);
  sctx.fill();

  if (gear.has("quiver") || gear.has("strongQuiver") || accents.has("strongQuiver")) {
    sctx.strokeStyle = leatherColor;
    sctx.lineWidth = 3.2;
    sctx.beginPath();
    sctx.moveTo(quiverX + 3.2, quiverY - 10.5);
    sctx.lineTo(quiverX + 7.8, quiverY + 8.5);
    sctx.stroke();
    sctx.fillStyle = accentColor;
    sctx.fillRect(quiverX + 6.4, quiverY - 12.5, 2.2, 6);
  }

  sctx.fillStyle = tunicColor;
  sctx.beginPath();
  sctx.ellipse(torsoX, torsoY, 8.3, 12.3, 0, 0, Math.PI * 2);
  sctx.fill();
  sctx.fillStyle = trimColor;
  sctx.beginPath();
  sctx.ellipse(torsoX - 2.4 + faceDirX * 1.2, torsoY - 2.8 + faceDirY * 0.5, 3.5, 6.4, 0, 0, Math.PI * 2);
  sctx.fill();
  sctx.fillStyle = hoodColor;
  sctx.fillRect(torsoX - 1.6, torsoY - 10, 3.2, 18.5);
  sctx.fillStyle = leatherColor;
  sctx.fillRect(torsoX - 8.2, torsoY - 0.5, 16.4, 2);
  if (accents.has("fireArrowTrim")) {
    sctx.fillStyle = "#ff9b52";
    sctx.fillRect(torsoX - 6.2, torsoY - 8.5, 12.4, 1.8);
  }

  sctx.fillStyle = "#e7c7a1";
  sctx.beginPath();
  sctx.ellipse(headX, headY + faceLift, sideAbs > 0.7 ? 4.9 : 5.9, 7.2, 0, 0, Math.PI * 2);
  sctx.fill();
  if (!back) {
    drawElfEar(sctx, headX, headY + faceLift, faceDirX, faceDirY, -1);
    drawElfEar(sctx, headX, headY + faceLift, faceDirX, faceDirY, 1);
  }

  sctx.fillStyle = hoodColor;
  sctx.beginPath();
  sctx.moveTo(headX - 8.5, headY + faceLift + 2);
  sctx.lineTo(headX + 8.5, headY + faceLift + 2);
  sctx.lineTo(headX + 6.3, headY + faceLift - 9.5);
  sctx.lineTo(headX - 6.3, headY + faceLift - 9.5);
  sctx.closePath();
  sctx.fill();
  sctx.fillStyle = hairColor;
  sctx.beginPath();
  sctx.ellipse(headX, headY + faceLift - 1.8, back ? 6.3 : 5.4, back ? 4.6 : 3.7, 0, Math.PI, Math.PI * 2);
  sctx.fill();
  if (!back) sctx.fillRect(headX - faceDirX * 3.6 + 1.5, headY + faceLift - 1.8, 2.2, 8.8);
  sctx.fillStyle = trimColor;
  sctx.fillRect(headX - 4.4, headY + faceLift - 8.4, 8.8, 1.7);

  if (!back) {
    const eyeX = faceDirX * (sideAbs > 0.7 ? 2.4 : 2.1);
    const eyeY = front ? 0.8 : faceDirY * 0.8;
    sctx.fillStyle = "#1a232f";
    if (sideAbs > 0.7) {
      sctx.fillRect(headX + eyeX, headY + faceLift - 1 + eyeY, 1.7, 1.3);
    } else {
      sctx.fillRect(headX - 2.5 + eyeX, headY + faceLift - 1 + eyeY, 1.7, 1.3);
      sctx.fillRect(headX + 0.8 + eyeX, headY + faceLift - 1 + eyeY, 1.7, 1.3);
    }
  }

  const legColor = visualSpec?.weapon === "twinDaggers" ? "#26394b" : "#2d4f7d";
  const bootColor = "#1d3048";
  drawRangerLeg(sctx, cx, cy, pose.rearLeg, "#213851", bootColor, -1);
  drawRangerLeg(sctx, cx, cy, pose.frontLeg, legColor, bootColor, 1);

  drawGearAccents(sctx, cx, torsoY, gear, accents);

  sctx.fillStyle = leatherColor;
  sctx.beginPath();
  sctx.ellipse(cx - 7, torsoY + 2, 1.6, 4.8, -0.4, 0, Math.PI * 2);
  sctx.fill();
  sctx.fillStyle = accentColor;
  sctx.fillRect(cx - 8.3, torsoY + 1.4, 2.6, 1.4);
}

export function getRangerFramePose(faceDirX = 1, faceDirY = 0, frameIndex = 0) {
  const cycle = [-1, -0.55, 0.12, 1, 0.55, -0.12];
  const lift = [0, 1.25, 0.55, 0, 1.25, 0.55];
  const frame = ((Math.floor(frameIndex) % 6) + 6) % 6;
  const stride = cycle[frame];
  const dirLen = Math.hypot(faceDirX, faceDirY) || 1;
  const forwardX = faceDirX / dirLen;
  const forwardY = faceDirY / dirLen;
  const profile = Math.abs(forwardX);
  const sideX = 1 - profile;
  const sideY = profile * Math.sign(forwardX || 1);
  const baseSpread = 2.6 + (1 - profile) * 1.1;
  const stepReach = 2.1 + profile * 1.8;
  const rearSwing = stride;
  const frontSwing = -stride;
  const rearLift = stride < 0 ? lift[frame] : 0.1;
  const frontLift = stride > 0 ? lift[frame] : 0.1;
  const rearLeg = makeRangerLegPose(sideX, sideY, forwardX, forwardY, -baseSpread, rearSwing, stepReach, rearLift, -1);
  const frontLeg = makeRangerLegPose(sideX, sideY, forwardX, forwardY, baseSpread, frontSwing, stepReach, frontLift, 1);
  return {
    stride,
    bob: frame === 1 || frame === 4 ? -0.95 : frame === 2 || frame === 5 ? -0.25 : 0.55,
    torsoSwayX: stride * sideX * 0.35,
    hoodSwayX: stride * sideX * 0.55,
    rearFootX: rearLeg.footX,
    rearFootY: rearLeg.footY,
    frontFootX: frontLeg.footX,
    frontFootY: frontLeg.footY,
    rearLeg,
    frontLeg
  };
}

function makeRangerLegPose(sideX, sideY, forwardX, forwardY, sideOffset, swing, reach, lift, bendSide) {
  const hipX = sideX * sideOffset * 0.72;
  const hipY = 9.6 + sideY * sideOffset * 0.18;
  const footX = sideX * sideOffset + forwardX * swing * reach;
  const footY = 21.4 + sideY * sideOffset * 0.22 + forwardY * swing * reach - lift;
  const bend = bendSide * (1.15 + lift * 0.22);
  const kneeX = (hipX + footX) * 0.5 + sideX * bend + forwardX * swing * 0.35;
  const kneeY = (hipY + footY) * 0.5 + 1.6 + sideY * bend * 0.3;
  return { hipX, hipY, kneeX, kneeY, footX, footY, lift, bootHalf: 2.4 };
}

function drawRangerLeg(ctx, cx, cy, leg, trouser, boot) {
  ctx.strokeStyle = trouser;
  ctx.lineWidth = 3.1;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx + leg.hipX, cy + leg.hipY);
  ctx.lineTo(cx + leg.kneeX, cy + leg.kneeY);
  ctx.lineTo(cx + leg.footX, cy + leg.footY);
  ctx.stroke();
  ctx.strokeStyle = boot;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx + leg.footX - leg.bootHalf, cy + leg.footY + 0.3);
  ctx.lineTo(cx + leg.footX + leg.bootHalf, cy + leg.footY + 0.3);
  ctx.stroke();
}

function drawElfEar(sctx, cx, headY, faceDirX, faceDirY, side) {
  sctx.fillStyle = "#e7c7a1";
  sctx.beginPath();
  sctx.moveTo(cx + side * 5.5 + faceDirX * 1.2, headY - 1.2 + faceDirY * 0.6);
  sctx.lineTo(cx + side * 10.4 + faceDirX * 1.8, headY - 3.2 + faceDirY * 0.8);
  sctx.lineTo(cx + side * 5.9 + faceDirX * 1.1, headY + 1.1 + faceDirY * 0.4);
  sctx.closePath();
  sctx.fill();
}

function drawGearAccents(sctx, cx, torsoY, gear, accents) {
  if (gear.has("knifeBelt")) {
    sctx.fillStyle = "#dce6e2";
    sctx.fillRect(cx - 9.5, torsoY + 4.2, 2, 5);
    sctx.fillRect(cx + 7.5, torsoY + 4.2, 2, 5);
  }
  if (gear.has("pairedDaggers")) {
    sctx.strokeStyle = "#b7f4dc";
    sctx.lineWidth = 1.5;
    sctx.beginPath();
    sctx.moveTo(cx - 9.5, torsoY + 5);
    sctx.lineTo(cx - 13, torsoY + 10);
    sctx.moveTo(cx + 9.5, torsoY + 5);
    sctx.lineTo(cx + 13, torsoY + 10);
    sctx.stroke();
  }
  if (gear.has("smallPistol")) {
    sctx.fillStyle = "#e7d08c";
    sctx.fillRect(cx + 7.6, torsoY + 3.2, 5.2, 2.4);
  }
  if (gear.has("rapier")) {
    sctx.strokeStyle = "#e7d08c";
    sctx.lineWidth = 1.3;
    sctx.beginPath();
    sctx.moveTo(cx - 8.5, torsoY + 5);
    sctx.lineTo(cx - 13.5, torsoY + 12);
    sctx.stroke();
  }
  if (accents.has("wolfPactCharm")) {
    sctx.fillStyle = "#fff0bd";
    sctx.fillRect(cx - 1.3, torsoY + 2.8, 2.6, 2.6);
  }
  if (accents.has("executionMark")) {
    sctx.fillStyle = "#d36a62";
    sctx.fillRect(cx + 4.8, torsoY - 3.2, 2, 4.8);
  }
}
