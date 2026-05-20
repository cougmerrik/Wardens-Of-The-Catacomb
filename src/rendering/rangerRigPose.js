export function getRangerRigPose(player, screenX, screenY, walkPhase = 0, weaponMode = "ranged") {
  const aimAngle = Math.atan2(player?.dirY || 0, player?.dirX || 1);
  const facing = Number.isFinite(player?.facing) ? Math.max(0, Math.min(7, Math.floor(player.facing))) : null;
  const facingAngle = facing == null ? aimAngle : (facing / 8) * Math.PI * 2;
  const ax = Math.cos(aimAngle);
  const ay = Math.sin(aimAngle);
  const torsoX = Math.cos(facingAngle);
  const torsoY = Math.sin(facingAngle);
  const sideAbs = Math.abs(torsoX);
  const sx = sideAbs > 0.7 ? Math.sign(torsoX || 1) * 0.28 : 1;
  const sy = sideAbs > 0.7 ? 0.32 : 0;
  const chestX = screenX - torsoX * 0.9;
  const chestY = screenY - 8 + Math.sin(walkPhase * Math.PI * 2) * 0.9 - torsoY * 0.6;
  const shoulderSpread = sideAbs > 0.7 ? (weaponMode === "melee" ? 2.6 : 2.9) : (weaponMode === "melee" ? 4.15 : 4.45);
  const shoulderForward = weaponMode === "melee" ? 0.35 : 0.75;
  const rearShoulderX = chestX - sx * shoulderSpread + torsoX * shoulderForward;
  const rearShoulderY = chestY - sy * shoulderSpread + torsoY * shoulderForward;
  const frontShoulderX = chestX + sx * shoulderSpread + torsoX * shoulderForward;
  const frontShoulderY = chestY + sy * shoulderSpread + torsoY * shoulderForward;
  return {
    aimAngle,
    ax,
    ay,
    px: -ay,
    py: ax,
    torsoX,
    torsoY,
    chestX,
    chestY,
    rearShoulderX,
    rearShoulderY,
    frontShoulderX,
    frontShoulderY,
    shoulderRadius: Math.max(
      Math.hypot(rearShoulderX - chestX, rearShoulderY - chestY),
      Math.hypot(frontShoulderX - chestX, frontShoulderY - chestY)
    )
  };
}

export function getRangerHandTargets(pose, firePulse = 0, weaponMode = "ranged", style = "longbow") {
  const recoil = Math.max(0, Math.min(1, firePulse));
  const { ax, ay, px, py, rearShoulderX, rearShoulderY, frontShoulderX, frontShoulderY } = pose;

  if (style === "longbow" && weaponMode !== "melee") {
    const bowReach = 11.8;
    const drawReach = 8.2 - recoil * 4.2;
    return {
      bowGripX: frontShoulderX + ax * bowReach + px * 1.1,
      bowGripY: frontShoulderY + ay * bowReach + py * 1.1,
      drawHandX: rearShoulderX + ax * drawReach - px * 1.2,
      drawHandY: rearShoulderY + ay * drawReach - py * 1.2
    };
  }

  if (weaponMode === "melee" && style === "longbow") {
    return {
      guardHandX: frontShoulderX + ax * 8.6 + px * 1.1,
      guardHandY: frontShoulderY + ay * 8.6 + py * 1.1,
      braceHandX: rearShoulderX + ax * 4.2 - px * 2.8,
      braceHandY: rearShoulderY + ay * 4.2 - py * 2.8
    };
  }

  const mainReach = 10.6 - recoil * 2.2;
  return {
    mainHandX: frontShoulderX + ax * mainReach + px * 1.1,
    mainHandY: frontShoulderY + ay * mainReach + py * 1.1,
    offHandX: rearShoulderX + ax * 6.2 - px * 2.7,
    offHandY: rearShoulderY + ay * 6.2 - py * 2.7
  };
}
