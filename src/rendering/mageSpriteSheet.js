function ellipse(ctx, x, y, rx, ry, color, rot = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}

function poly(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

function strokeLine(ctx, points, color, width = 2, cap = "round") {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = cap;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.stroke();
}

export function getMageDirectionIndexFromVector(dirX = 1, dirY = 0) {
  const angle = Math.atan2(Number.isFinite(dirY) ? dirY : 0, Number.isFinite(dirX) ? dirX : 1);
  return ((Math.round(((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8) + 8) % 8;
}

function makeLeg(sideX, sideY, forwardX, forwardY, sideOffset, swing, lift) {
  const hipX = sideX * sideOffset * 0.45;
  const hipY = 9.5 + sideY * sideOffset * 0.12;
  const footX = sideX * sideOffset + forwardX * swing * 1.55;
  const footY = 20 + sideY * sideOffset * 0.16 + forwardY * swing * 1.35 - lift;
  return {
    hipX,
    hipY,
    kneeX: (hipX + footX) * 0.5 + sideX * Math.sign(sideOffset || 1) * 0.7,
    kneeY: (hipY + footY) * 0.5 + 1.2,
    footX,
    footY
  };
}

export function getMageFramePose(faceDirX = 1, faceDirY = 0, frameIndex = 0) {
  const frame = ((Math.floor(frameIndex) % 6) + 6) % 6;
  const stride = [-1, -0.55, 0.1, 1, 0.55, -0.1][frame];
  const lift = [0, 0.85, 0.25, 0, 0.85, 0.25][frame];
  const len = Math.hypot(faceDirX, faceDirY) || 1;
  const forwardX = faceDirX / len;
  const forwardY = faceDirY / len;
  const profile = Math.abs(forwardX);
  const sideX = 1 - profile;
  const sideY = profile * Math.sign(forwardX || 1);
  const spread = 2.2 + (1 - profile) * 0.7;
  const rearLeg = makeLeg(sideX, sideY, forwardX, forwardY, -spread, stride, stride < 0 ? lift : 0.1);
  const frontLeg = makeLeg(sideX, sideY, forwardX, forwardY, spread, -stride, stride > 0 ? lift : 0.1);
  return {
    frame,
    stride,
    bob: frame === 1 || frame === 4 ? -0.65 : frame === 2 || frame === 5 ? -0.2 : 0.35,
    robeSwayX: stride * sideX * 0.35,
    hoodSwayX: stride * sideX * 0.45,
    rearLeg,
    frontLeg
  };
}

export function getMageFrameProfile(faceDirX = 1, faceDirY = 0) {
  const side = Math.abs(faceDirX);
  const vertical = Math.abs(faceDirY);
  return {
    side,
    vertical,
    back: faceDirY < -0.38,
    front: faceDirY > 0.38,
    sideProfile: side > 0.72 && vertical < 0.45,
    diagonal: side > 0.35 && vertical > 0.35
  };
}

export function getMageStaffGeometry(cx, cy, faceDirX = 1, faceDirY = 0, frameIndex = 0) {
  const pose = getMageFramePose(faceDirX, faceDirY, frameIndex);
  const profile = getMageFrameProfile(faceDirX, faceDirY);
  const sideSign = faceDirX < -0.1 ? -1 : 1;
  const sideOffset = profile.sideProfile
    ? -sideSign * 6.8
    : profile.diagonal
    ? -sideSign * (profile.back ? 11.2 : 10.2)
    : profile.back
    ? 7
    : -7;
  const lean = profile.sideProfile ? sideSign * 2.4 : profile.diagonal ? sideSign * 4.6 : faceDirX * 1.4;
  const handX = cx + sideOffset + pose.robeSwayX * 0.4;
  const handY = cy - 1 + pose.bob;
  const baseX = handX - lean * 0.75;
  const baseY = cy + 21;
  const tipX = handX + lean;
  const tipY = cy - 22 + (profile.back ? -1 : 0);
  return {
    handX,
    handY,
    baseX,
    baseY,
    tipX,
    tipY,
    orbX: tipX,
    orbY: tipY - 2,
    sideOffset
  };
}

export function getMageStaffLayer(faceDirX = 1, faceDirY = 0) {
  const profile = getMageFrameProfile(faceDirX, faceDirY);
  return profile.back ? "under" : "over";
}

export function drawMageFrame(ctx, config, ox, oy, angle, frameIndex, visualSpec = null) {
  const sourceFrame = config.player.spriteFrame;
  if (sourceFrame !== 64) {
    const scale = sourceFrame / 64;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    drawMageFrameLogical(ctx, { ...config, player: { ...config.player, spriteFrame: 64 } }, 0, 0, angle, frameIndex, visualSpec);
    ctx.restore();
    return;
  }
  drawMageFrameLogical(ctx, config, ox, oy, angle, frameIndex, visualSpec);
}

function drawMageFrameLogical(ctx, config, ox, oy, angle, frameIndex, visualSpec = null) {
  const cx = ox + 32;
  const cy = oy + 32;
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const pose = getMageFramePose(dirX, dirY, frameIndex);
  const profile = getMageFrameProfile(dirX, dirY);
  const costume = visualSpec?.costume || {};
  const robe = costume.robe || "#283044";
  const robeDark = costume.robeDark || "#171d2b";
  const trim = costume.trim || "#8eb8ff";
  const hood = costume.hood || "#1d2435";
  const skin = costume.skin || "#d5c1a3";
  const hair = costume.hair || "#d9d2bf";
  const side = Math.max(-1, Math.min(1, dirX));
  const sideAbs = Math.abs(side);
  const diagShift = profile.diagonal ? side * 2.7 : 0;
  const diagShoulder = profile.diagonal ? side * 1.6 : 0;
  const bodyX = cx + side * 0.9 + diagShift + pose.robeSwayX;
  const bodyY = cy + 7 + pose.bob + (profile.diagonal ? dirY * 0.7 : 0);
  const headX = cx + side * (profile.sideProfile ? 2.2 : profile.diagonal ? 2.4 : 0.9) + pose.hoodSwayX;
  const headY = cy - 10 + pose.bob + (profile.back ? 0.9 : 0);
  const staffGeo = getMageStaffGeometry(cx, cy, dirX, dirY, frameIndex);

  ellipse(ctx, cx, cy + 23, 11, 3.3, "rgba(0, 0, 0, 0.28)");

  drawMageLeg(ctx, cx, cy, pose.rearLeg, robeDark, "#111722");
  drawMageLeg(ctx, cx, cy, pose.frontLeg, robe, "#151b28");

  poly(ctx, [
    [bodyX - (profile.sideProfile ? 6.2 : 9.5) + diagShoulder, bodyY - 11],
    [bodyX + (profile.sideProfile ? 6.2 : 9.5) + diagShoulder, bodyY - 11],
    [bodyX + (profile.sideProfile ? 8.2 : 12) - diagShoulder * 0.3, bodyY + 18],
    [bodyX + (profile.sideProfile ? 3.2 : 6.8) - diagShoulder * 0.5, bodyY + 21],
    [bodyX - (profile.sideProfile ? 3.2 : 6.8) - diagShoulder * 0.5, bodyY + 21],
    [bodyX - (profile.sideProfile ? 8.2 : 12) - diagShoulder * 0.3, bodyY + 18]
  ], robe);
  poly(ctx, [
    [bodyX - (profile.sideProfile ? 2.4 : 4.2), bodyY - 10],
    [bodyX + (profile.sideProfile ? 2.4 : 4.2), bodyY - 10],
    [bodyX + (profile.sideProfile ? 3.1 : 5.5), bodyY + 19],
    [bodyX - (profile.sideProfile ? 3.1 : 5.5), bodyY + 19]
  ], robeDark);
  strokeLine(ctx, [[bodyX - 7 + diagShoulder, bodyY - 8], [bodyX + 6.5 - diagShoulder, bodyY + 17]], trim, 1.3);
  strokeLine(ctx, [[bodyX + 6.7 + diagShoulder * 0.5, bodyY - 7], [bodyX - 4.7 - diagShoulder * 0.5, bodyY + 17]], "#d6b66e", 1.15);
  ellipse(ctx, bodyX + diagShoulder * 0.35, bodyY + 1, profile.sideProfile ? 2.2 : 3.1, 4.2, "rgba(142, 184, 255, 0.32)");

  drawSleeves(ctx, bodyX, bodyY, profile, side, robeDark, trim, staffGeo);

  ellipse(ctx, headX, headY, profile.sideProfile ? 5.2 : 6.5, 7.2, hood);
  poly(ctx, [
    [headX - (profile.sideProfile ? 5.6 : 7.1), headY + 0.5],
    [headX + (profile.sideProfile ? 5.6 : 7.1), headY + 0.5],
    [headX + (profile.sideProfile ? 4.6 : 5.2), headY - 8.2],
    [headX - (profile.sideProfile ? 4.6 : 5.2), headY - 8.2]
  ], hood);
  if (profile.back) {
    ellipse(ctx, headX + (profile.diagonal ? side * 1.2 : 0), headY - 2.4, profile.sideProfile ? 4 : profile.diagonal ? 4.6 : 5.4, 3.2, hair);
    strokeLine(ctx, [[headX - 4.5, headY + 5.2], [headX + 4.5, headY + 5.2]], trim, 1.2);
  } else {
    ellipse(ctx, headX + side * (profile.sideProfile ? 1.6 : profile.diagonal ? 0.9 : 0), headY + 0.5, profile.sideProfile ? 3.8 : profile.diagonal ? 4.2 : 4.7, 5.5, skin);
    ellipse(ctx, headX - side * (profile.diagonal ? 0.7 : 0.3), headY - 4.7, profile.sideProfile ? 4.1 : profile.diagonal ? 4.5 : 5.1, 2.3, hair);
    ctx.fillStyle = "#111722";
    if (profile.sideProfile) {
      ctx.fillRect(headX + side * 2.5, headY - 0.9, 1.5 * Math.sign(side || 1), 1.3);
    } else {
      ctx.fillRect(headX - 2.8 + side * 0.5, headY - 0.9, 1.4, 1.2);
      ctx.fillRect(headX + 1.4 + side * 0.5, headY - 0.9, 1.4, 1.2);
    }
    ctx.fillStyle = trim;
    ctx.fillRect(headX - 4.6, headY - 7.1, 9.2, 1.3);
  }
}

function drawMageLeg(ctx, cx, cy, leg, cloth, boot) {
  strokeLine(ctx, [[cx + leg.hipX, cy + leg.hipY], [cx + leg.kneeX, cy + leg.kneeY], [cx + leg.footX, cy + leg.footY]], cloth, 3.2);
  strokeLine(ctx, [[cx + leg.footX - 1.9, cy + leg.footY + 0.6], [cx + leg.footX + 1.9, cy + leg.footY + 0.6]], boot, 2.3);
}

function drawSleeves(ctx, bodyX, bodyY, profile, side, sleeve, trim, staffGeo) {
  const shoulderSpread = profile.sideProfile ? 3.3 : 7.2;
  const leftShoulder = [bodyX - shoulderSpread, bodyY - 7.3];
  const rightShoulder = [bodyX + shoulderSpread, bodyY - 7.3];
  const staffHand = [staffGeo.handX, staffGeo.handY];
  const freeHand = profile.sideProfile
    ? [bodyX + side * 7.2, bodyY + 3.5]
    : [bodyX - Math.sign(staffGeo.sideOffset || -1) * 6.2, bodyY + 3.2];
  const staffShoulder = staffGeo.sideOffset > 0 ? rightShoulder : leftShoulder;
  const freeShoulder = staffGeo.sideOffset > 0 ? leftShoulder : rightShoulder;
  strokeLine(ctx, [staffShoulder, [(staffShoulder[0] + staffHand[0]) * 0.5, bodyY - 1.2], staffHand], sleeve, 3.3);
  strokeLine(ctx, [freeShoulder, [(freeShoulder[0] + freeHand[0]) * 0.5, bodyY - 0.2], freeHand], sleeve, 3.1);
  ellipse(ctx, staffHand[0], staffHand[1], 1.8, 2.1, trim);
  ellipse(ctx, freeHand[0], freeHand[1], 1.5, 1.9, "#d5c1a3");
}
