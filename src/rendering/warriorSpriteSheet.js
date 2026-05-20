function drawEllipse(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPoly(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

function hasAccent(spec, key) {
  return Array.isArray(spec?.sprite?.secondaryAccents) && spec.sprite.secondaryAccents.includes(key);
}

export function getWarriorFramePose(faceDirX = 1, faceDirY = 0, frameIndex = 0) {
  const frame = ((Math.floor(frameIndex) % 6) + 6) % 6;
  const cycle = [-1, -0.55, 0.12, 1, 0.55, -0.12];
  const lift = [0, 0.85, 0.25, 0, 0.85, 0.55];
  const dirLen = Math.hypot(faceDirX, faceDirY) || 1;
  const forwardX = faceDirX / dirLen;
  const forwardY = faceDirY / dirLen;
  const side = Math.max(-1, Math.min(1, forwardX));
  const sideAbs = Math.abs(side);
  const sideVectorX = 1 - sideAbs;
  const sideVectorY = sideAbs * Math.sign(forwardX || 1);
  const stride = cycle[frame];
  const baseSpread = 1.7 + sideAbs * 1.55;
  const stepReach = 1.7 + sideAbs * 1.9;
  const leftLift = stride < 0 ? lift[frame] : 0;
  const rightLift = stride > 0 ? lift[frame] : 0;
  const leftLeg = makeWarriorLegPose(sideVectorX, sideVectorY, forwardX, forwardY, -baseSpread, stride, stepReach, leftLift, -1);
  const rightLeg = makeWarriorLegPose(sideVectorX, sideVectorY, forwardX, forwardY, baseSpread, -stride, stepReach, rightLift, 1);
  return {
    frame,
    stride,
    side,
    sideAbs,
    leftKneeOffsetX: leftLeg.kneeX,
    rightKneeOffsetX: rightLeg.kneeX,
    leftKneeOffsetY: leftLeg.kneeY,
    rightKneeOffsetY: rightLeg.kneeY,
    leftFootOffsetX: leftLeg.footX,
    rightFootOffsetX: rightLeg.footX,
    leftFootOffsetY: leftLeg.footY,
    rightFootOffsetY: rightLeg.footY,
    leftLeg,
    rightLeg
  };
}

function makeWarriorLegPose(sideX, sideY, forwardX, forwardY, sideOffset, swing, reach, lift, bendSide) {
  const hipX = sideX * sideOffset * 0.64;
  const hipY = sideY * sideOffset * 0.18;
  const footX = sideX * sideOffset + forwardX * swing * reach;
  const footY = sideY * sideOffset * 0.25 + forwardY * swing * reach - lift;
  const kneeX = (hipX + footX) * 0.52 + sideX * bendSide * (0.9 + lift * 0.18);
  const kneeY = (hipY + footY) * 0.48 + 3.2 + sideY * bendSide * 0.25;
  return { hipX, hipY, kneeX, kneeY, footX, footY, lift };
}

export function getWarriorDirectionIndexFromVector(dirX = 1, dirY = 0) {
  const angle = Math.atan2(Number.isFinite(dirY) ? dirY : 0, Number.isFinite(dirX) ? dirX : 1);
  return ((Math.round(((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8) + 8) % 8;
}

const WARRIOR_SOCKET_DIRECTIONS = [
  {
    ax: 1,
    ay: 0,
    px: 0,
    py: 1,
    chest: [0, -8],
    rearShoulder: [-1.8, -9.2],
    frontShoulder: [3.4, -7.9],
    rearHandBase: [6.4, -5.8],
    frontHandBase: [14.2, -6.8]
  },
  {
    ax: 0.707,
    ay: 0.707,
    px: -0.707,
    py: 0.707,
    chest: [0.5, -7.8],
    rearShoulder: [-2.8, -9],
    frontShoulder: [2.5, -6.8],
    rearHandBase: [3.9, -2.5],
    frontHandBase: [10.8, 2.5]
  },
  {
    ax: 0,
    ay: 1,
    px: -1,
    py: 0,
    chest: [0, -7.5],
    rearShoulder: [-4.3, -8.2],
    frontShoulder: [4.3, -8.2],
    rearHandBase: [-1.9, -1.5],
    frontHandBase: [2.4, 6.4]
  },
  {
    ax: -0.707,
    ay: 0.707,
    px: -0.707,
    py: -0.707,
    chest: [-0.5, -7.8],
    rearShoulder: [2.8, -9],
    frontShoulder: [-2.5, -6.8],
    rearHandBase: [-3.9, -2.5],
    frontHandBase: [-10.8, 2.5]
  },
  {
    ax: -1,
    ay: 0,
    px: 0,
    py: -1,
    chest: [0, -8],
    rearShoulder: [1.8, -9.2],
    frontShoulder: [-3.4, -7.9],
    rearHandBase: [-6.4, -5.8],
    frontHandBase: [-14.2, -6.8]
  },
  {
    ax: -0.707,
    ay: -0.707,
    px: 0.707,
    py: -0.707,
    chest: [-0.5, -8.4],
    rearShoulder: [2.8, -7.8],
    frontShoulder: [-2.5, -9.8],
    rearHandBase: [-3.8, -12.4],
    frontHandBase: [-10.6, -17]
  },
  {
    ax: 0,
    ay: -1,
    px: 1,
    py: 0,
    chest: [0, -8.5],
    rearShoulder: [4.2, -8.1],
    frontShoulder: [-4.2, -8.1],
    rearHandBase: [1.6, -14],
    frontHandBase: [-2.4, -21.2]
  },
  {
    ax: 0.707,
    ay: -0.707,
    px: 0.707,
    py: 0.707,
    chest: [0.5, -8.4],
    rearShoulder: [-2.8, -7.8],
    frontShoulder: [2.5, -9.8],
    rearHandBase: [3.8, -12.4],
    frontHandBase: [10.6, -17]
  }
];

const WARRIOR_ATTACK_SOCKET_FRAMES = [
  { reach: -1.4, sweep: -0.6 },
  { reach: 0.5, sweep: 0.3 },
  { reach: 2.7, sweep: 1.2 },
  { reach: 4.4, sweep: 1.7 },
  { reach: 2.1, sweep: 0.8 },
  { reach: -0.5, sweep: -0.2 }
];

function offsetPoint(base, ax, ay, px, py, reach, sweep) {
  return [
    base[0] + ax * reach + px * sweep,
    base[1] + ay * reach + py * sweep
  ];
}

export function getWarriorFrameSockets(facing = 0, frameIndex = 0, attackFrameIndex = 0) {
  const direction = WARRIOR_SOCKET_DIRECTIONS[((Math.round(facing) % 8) + 8) % 8];
  const frame = ((Math.floor(frameIndex) % 6) + 6) % 6;
  const attackFrame = ((Math.floor(attackFrameIndex) % 6) + 6) % 6;
  const bob = [0, -0.3, -0.1, 0.2, -0.2, 0.1][frame];
  const attack = WARRIOR_ATTACK_SOCKET_FRAMES[attackFrame];
  const rearHand = offsetPoint(direction.rearHandBase, direction.ax, direction.ay, direction.px, direction.py, attack.reach * 0.55, -attack.sweep * 0.55);
  const frontHand = offsetPoint(direction.frontHandBase, direction.ax, direction.ay, direction.px, direction.py, attack.reach, attack.sweep);
  return {
    facing: ((Math.round(facing) % 8) + 8) % 8,
    frame,
    attackFrame,
    ax: direction.ax,
    ay: direction.ay,
    px: direction.px,
    py: direction.py,
    chest: [direction.chest[0], direction.chest[1] + bob],
    rearShoulder: [direction.rearShoulder[0], direction.rearShoulder[1] + bob],
    frontShoulder: [direction.frontShoulder[0], direction.frontShoulder[1] + bob],
    rearHand: [rearHand[0], rearHand[1] + bob],
    frontHand: [frontHand[0], frontHand[1] + bob],
    weaponGrip: [frontHand[0], frontHand[1] + bob],
    weaponTip: [frontHand[0] + direction.ax * 15.5, frontHand[1] + direction.ay * 15.5 + bob]
  };
}

export function drawWarriorFrame(ctx, config, ox, oy, angle, frameIndex, visualSpec = null) {
  const sourceFrame = config.player.spriteFrame;
  if (sourceFrame !== 64) {
    const scale = sourceFrame / 64;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    drawWarriorFrameLogical(ctx, { ...config, player: { ...config.player, spriteFrame: 64 } }, 0, 0, angle, frameIndex, visualSpec);
    ctx.restore();
    return;
  }
  drawWarriorFrameLogical(ctx, config, ox, oy, angle, frameIndex, visualSpec);
}

function drawWarriorFrameLogical(ctx, config, ox, oy, angle, frameIndex, visualSpec = null) {
  const c = visualSpec?.costume || {};
  const armor = c.armor || "#6f7870";
  const armorDark = c.armorDark || "#343a38";
  const trim = c.trim || "#a89770";
  const leather = c.leather || "#6b4428";
  const cloak = c.cloak || "#20241d";
  const accent = c.accent || "#c8d0c4";
  const hair = c.hair || "#b8b5a5";
  const beard = c.beard || "#8f8c80";
  const skin = c.skin || "#c89168";
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const side = Math.max(-1, Math.min(1, dirX));
  const back = dirY < -0.38;
  const front = dirY > 0.38;
  const pose = getWarriorFramePose(dirX, dirY, frameIndex);
  const cx = ox + 32;
  const headX = cx + side * 2.1;
  const headY = oy + 17 + (back ? 1 : 0);
  const torsoX = cx + side * 1.1;
  const torsoY = oy + 37;
  const sideAbs = pose.sideAbs;

  drawEllipse(ctx, cx + side * -1.4, oy + 41, 14.5, 17, cloak);
  drawPoly(ctx, [
    [cx - 15 + side * -1.4, oy + 25],
    [cx + 15 + side * -1.4, oy + 25],
    [cx + 12, oy + 60],
    [cx - 12, oy + 60]
  ], cloak);

  const pauldronSpread = sideAbs > 0.7 ? 6.6 : 10.5;
  drawEllipse(ctx, torsoX - pauldronSpread, oy + 31, sideAbs > 0.7 ? 4.2 : 6, 6, armorDark);
  drawEllipse(ctx, torsoX + pauldronSpread, oy + 31, sideAbs > 0.7 ? 4.2 : 6, 6, armorDark);
  drawEllipse(ctx, torsoX - pauldronSpread, oy + 30, sideAbs > 0.7 ? 3.4 : 4.6, 4.4, armor);
  drawEllipse(ctx, torsoX + pauldronSpread, oy + 30, sideAbs > 0.7 ? 3.4 : 4.6, 4.4, armor);
  drawPoly(ctx, [
    [torsoX - 10, oy + 29],
    [torsoX + 10, oy + 29],
    [torsoX + 8, oy + 52],
    [torsoX - 8, oy + 52]
  ], armor);
  drawPoly(ctx, [
    [torsoX - 6.5, oy + 31],
    [torsoX + 6.5, oy + 31],
    [torsoX + 4, oy + 49],
    [torsoX - 4, oy + 49]
  ], armorDark);
  ctx.strokeStyle = trim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(torsoX - 8, oy + 34);
  ctx.lineTo(torsoX + 8, oy + 48);
  ctx.moveTo(torsoX + 7, oy + 34);
  ctx.lineTo(torsoX - 7, oy + 48);
  ctx.stroke();
  drawEllipse(ctx, torsoX, oy + 35, 3.6, 4.2, accent);
  ctx.fillStyle = armorDark;
  ctx.fillRect(torsoX - 1, oy + 33, 2, 5);
  ctx.fillRect(torsoX - 3, oy + 35, 6, 1);

  const leftHipX = torsoX - 5.4;
  const rightHipX = torsoX + 5.4;
  const hipY = oy + 51;
  const leftKneeX = leftHipX + pose.leftLeg.kneeX;
  const rightKneeX = rightHipX + pose.rightLeg.kneeX;
  const leftKneeY = oy + 56 + pose.leftLeg.kneeY;
  const rightKneeY = oy + 56 + pose.rightLeg.kneeY;
  const leftFootX = leftHipX + pose.leftLeg.footX;
  const rightFootX = rightHipX + pose.rightLeg.footX;
  const leftFootY = oy + 62 + pose.leftLeg.footY;
  const rightFootY = oy + 62 + pose.rightLeg.footY;
  const drawLeg = (hipX, hipYPos, kneeX, kneeY, footX, footY, depth = 0) => {
    const thigh = depth > 0 ? "#5f4631" : "#493525";
    const greave = depth > 0 ? "#59615b" : "#343a38";
    const knee = depth > 0 ? "#7a8178" : "#3f4541";
    const boot = depth > 0 ? "#292d2a" : "#222623";
    ctx.strokeStyle = thigh;
    ctx.lineWidth = 5.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(hipX, hipYPos);
    ctx.lineTo(kneeX, kneeY);
    ctx.stroke();
    ctx.strokeStyle = greave;
    ctx.lineWidth = 4.4;
    ctx.beginPath();
    ctx.moveTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();
    drawEllipse(ctx, kneeX, kneeY, 2.4, 2.1, knee);
    drawPoly(ctx, [
      [footX - 4.2, footY - 1.2],
      [footX + 3.2, footY - 1.2],
      [footX + 4.8, footY + 2.2],
      [footX - 5.2, footY + 2.2]
    ], boot);
    ctx.fillStyle = depth > 0 ? "#424941" : "#1d201e";
    ctx.fillRect(footX - 3.6, footY - 1.4, 6.8, 1.2);
  };
  const rearFirst = side > 0 ? back : !back;
  if (rearFirst) {
    drawLeg(rightHipX, hipY, rightKneeX, rightKneeY, rightFootX, rightFootY);
    drawLeg(leftHipX, hipY, leftKneeX, leftKneeY, leftFootX, leftFootY, 1);
  } else {
    drawLeg(leftHipX, hipY, leftKneeX, leftKneeY, leftFootX, leftFootY);
    drawLeg(rightHipX, hipY, rightKneeX, rightKneeY, rightFootX, rightFootY, 1);
  }

  if (!front && sideAbs > 0.35) {
    const hiltBaseX = torsoX + side * 8.5;
    const hiltBaseY = oy + 25;
    ctx.strokeStyle = leather;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hiltBaseX, hiltBaseY);
    ctx.lineTo(hiltBaseX + side * 4.5, oy + 44);
    ctx.stroke();
    ctx.strokeStyle = trim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hiltBaseX - side * 3, hiltBaseY + 1);
    ctx.lineTo(hiltBaseX + side * 3, hiltBaseY - 1);
    ctx.stroke();
  }

  drawEllipse(ctx, headX, headY, 8.2, 9.5, skin);
  if (back) {
    drawEllipse(ctx, headX, headY - 1, 9.5, 9, hair);
    ctx.strokeStyle = "#6f6b61";
    ctx.lineWidth = 1;
    for (let i = -5; i <= 5; i += 2.5) {
      ctx.beginPath();
      ctx.moveTo(headX + i, headY - 8);
      ctx.lineTo(headX + i * 0.5, headY + 4);
      ctx.stroke();
    }
    ctx.strokeStyle = cloak;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(headX - 5, headY + 4);
    ctx.lineTo(headX + 5, headY + 4);
    ctx.stroke();
  } else {
    drawEllipse(ctx, headX, headY - 5, 8.8, 5.2, hair);
    drawEllipse(ctx, headX, headY + 6, 6.4, 5.5, beard);
    ctx.strokeStyle = "#5e564b";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(headX - 5.4 + side * 0.8, headY - 2.1);
    ctx.lineTo(headX - 1.2 + side * 0.8, headY - 2.9);
    ctx.moveTo(headX + 1.7 + side * 0.8, headY - 2.9);
    ctx.lineTo(headX + 5.5 + side * 0.8, headY - 2);
    ctx.stroke();
    ctx.fillStyle = "#1a1a18";
    if (sideAbs > 0.7) {
      ctx.fillRect(headX + side * 2, headY - 1, 2, 1);
    } else {
      ctx.fillRect(headX - 4 + side * 1, headY - 1, 2, 1);
        ctx.fillRect(headX + 3 + side * 1, headY - 1, 2, 1);
    }
    ctx.strokeStyle = "#8a5f45";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(headX + side * 1.2, headY);
    ctx.lineTo(headX + side * 2.2, headY + 3.5);
    ctx.stroke();
    ctx.strokeStyle = "#d0a17c";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(headX - 5.5, headY + 1.5);
    ctx.lineTo(headX - 2.5, headY + 2.4);
    ctx.moveTo(headX + 2.5, headY + 2.4);
    ctx.lineTo(headX + 5.5, headY + 1.5);
    ctx.stroke();
    ctx.strokeStyle = "#6f6b61";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(headX - 4.2, headY + 5.2);
    ctx.lineTo(headX, headY + 7.2);
    ctx.lineTo(headX + 4.2, headY + 5.2);
    ctx.stroke();
    ctx.strokeStyle = "#5d5146";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(headX - 5, headY + 3);
    ctx.lineTo(headX + 5, headY + 3);
    ctx.stroke();
  }
  ctx.strokeStyle = hair;
  ctx.lineWidth = 1.2;
  for (let i = -3; i <= 3; i += 2) {
    ctx.beginPath();
    ctx.moveTo(headX + i, headY - 9);
    ctx.lineTo(headX + i * 0.6 + side * 2, headY - 2);
    ctx.stroke();
  }

  if (hasAccent(visualSpec, "arcaneRunes") || hasAccent(visualSpec, "spellbladeRunes")) {
    ctx.fillStyle = accent;
    ctx.fillRect(torsoX - 5, oy + 39, 2, 2);
    ctx.fillRect(torsoX + 4, oy + 43, 2, 2);
  }
  if (hasAccent(visualSpec, "redWarPaint") || hasAccent(visualSpec, "ravagerScars")) {
    ctx.strokeStyle = "#8f2e27";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(headX - 3, headY - 5);
    ctx.lineTo(headX + 3, headY + 2);
    ctx.stroke();
  }
  if (hasAccent(visualSpec, "holyTrim") || hasAccent(visualSpec, "towerShieldClasp")) {
    ctx.strokeStyle = "#f3ddb0";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(torsoX - 6.5, oy + 32, 13, 17);
  }
}
