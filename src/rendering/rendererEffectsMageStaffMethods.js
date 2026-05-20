import { getMageFrameProfile, getMageStaffLayer } from "./mageSpriteSheet.js";

export function getMageStaffRigGeometry(player, screenX, screenY, firePulse = 0) {
  const recoil = Math.max(0, Math.min(1, Number.isFinite(firePulse) ? firePulse : 0));
  const len = Math.hypot(player?.dirX || 0, player?.dirY || 0) || 1;
  const ax = (player?.dirX || 1) / len;
  const ay = (player?.dirY || 0) / len;
  const px = -ay;
  const py = ax;
  const profile = getMageFrameProfile(ax, ay);
  const side = ax < -0.1 ? -1 : 1;
  const staffSide = profile.sideProfile || profile.diagonal ? -side : profile.back ? 1 : -1;
  const castReach = recoil * 5.2;
  const tilt = 2.8 + recoil * 3.2;
  const handX = screenX + px * staffSide * 6.4 + ax * castReach * 0.72;
  const handY = screenY - 10 + py * staffSide * 4.8 + ay * castReach * 0.72;
  const shaftX = px * staffSide * 3.4 + ax * tilt;
  const shaftY = -24 + py * staffSide * 1.4 + ay * tilt * 0.45;
  const baseX = handX - shaftX * 0.72;
  const baseY = handY - shaftY * 0.72;
  const tipX = handX + shaftX * 0.28;
  const tipY = handY + shaftY * 0.28;
  return {
    layer: getMageStaffLayer(ax, ay),
    recoil,
    px,
    py,
    handX,
    handY,
    baseX,
    baseY,
    tipX,
    tipY,
    orbX: tipX,
    orbY: tipY - 2,
    orbRadius: 3 + recoil * 1.35
  };
}

export function getMageGreenFlameBladeGeometry(player, screenX, screenY, firePulse = 0) {
  const staff = getMageStaffRigGeometry(player, screenX, screenY, firePulse);
  const recoil = staff.recoil;
  const len = Math.hypot(player?.dirX || 0, player?.dirY || 0) || 1;
  const ax = (player?.dirX || 1) / len;
  const ay = (player?.dirY || 0) / len;
  const side = ax < -0.1 ? -1 : 1;
  const phase = 1 - recoil;
  const attackAmount = recoil > 0.02 ? Math.sin(Math.max(0, Math.min(1, phase)) * Math.PI) : 0;
  const swingOffset = recoil > 0.02 ? (-0.82 + phase * 1.52) * side : -0.22 * side;
  const angle = Math.atan2(ay, ax) + swingOffset;
  const bx = Math.cos(angle);
  const by = Math.sin(angle);
  const bpx = -by;
  const bpy = bx;
  const bladeGripDrop = 7.5;
  const handX = staff.handX + ax * 2.4 + staff.px * side * 0.8;
  const handY = staff.handY + ay * 2.4 + staff.py * side * 0.8 + bladeGripDrop;
  const handleBaseX = handX - bx * 4.4;
  const handleBaseY = handY - by * 4.4;
  const guardLeftX = handX - bx * 0.8 - bpx * 4.2;
  const guardLeftY = handY - by * 0.8 - bpy * 4.2;
  const guardRightX = handX - bx * 0.8 + bpx * 4.2;
  const guardRightY = handY - by * 0.8 + bpy * 4.2;
  const bladeLength = 18.5 + attackAmount * 6.5;
  const tipX = handX + bx * bladeLength;
  const tipY = handY + by * bladeLength;
  const flameLift = 1.6 + attackAmount * 1.8;
  return {
    layer: staff.layer,
    recoil,
    attackAmount,
    angle,
    bx,
    by,
    bpx,
    bpy,
    handX,
    handY,
    handleBaseX,
    handleBaseY,
    guardLeftX,
    guardLeftY,
    guardRightX,
    guardRightY,
    tipX,
    tipY,
    flameLeftX: tipX - bx * 5.8 - bpx * flameLift,
    flameLeftY: tipY - by * 5.8 - bpy * flameLift,
    flameRightX: tipX - bx * 5.8 + bpx * flameLift,
    flameRightY: tipY - by * 5.8 + bpy * flameLift,
    arcRadius: 22 + attackAmount * 5
  };
}

export const rendererEffectsMageStaffMethods = {
  drawPlayerMageStaffRig(player, screenX, screenY, firePulse = 0, layer = "over") {
    const ctx = this.ctx;
    const mageVisual = this.getMagePathPresentation(player);
    if (mageVisual.weapon === "greenFlameBlade") {
      this.drawPlayerMageGreenFlameBladeRig(player, screenX, screenY, firePulse, layer, mageVisual);
      return;
    }
    const motion = getMageStaffRigGeometry(player, screenX, screenY, firePulse);
    if (motion.layer !== layer) return;
    const alpha = Math.max(0, Math.min(1, 0.88 + motion.recoil * 0.12));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#24170f";
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(motion.baseX, motion.baseY);
    ctx.lineTo(motion.tipX, motion.tipY);
    ctx.stroke();
    ctx.strokeStyle = mageVisual.staff || "#7a5130";
    ctx.lineWidth = 2.7;
    ctx.beginPath();
    ctx.moveTo(motion.baseX, motion.baseY);
    ctx.lineTo(motion.tipX, motion.tipY);
    ctx.stroke();
    ctx.strokeStyle = mageVisual.staffWrap || "#b28d5f";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(motion.handX - motion.px * 2.3, motion.handY - motion.py * 2.3);
    ctx.lineTo(motion.handX + motion.px * 2.3, motion.handY + motion.py * 2.3);
    ctx.stroke();
    ctx.fillStyle = mageVisual.orb || "#9edcff";
    ctx.beginPath();
    ctx.arc(motion.tipX, motion.tipY - 2, motion.orbRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  drawPlayerMageGreenFlameBladeRig(player, screenX, screenY, firePulse = 0, layer = "over", mageVisual = null) {
    const ctx = this.ctx;
    const visual = mageVisual || this.getMagePathPresentation(player);
    const blade = getMageGreenFlameBladeGeometry(player, screenX, screenY, firePulse);
    if (blade.layer !== layer) return;
    const alpha = Math.max(0, Math.min(1, 0.9 + blade.recoil * 0.1));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (blade.attackAmount > 0.08) {
      const start = blade.angle - 0.78;
      const end = blade.angle + 0.58;
      const grad = ctx.createRadialGradient(screenX, screenY - 6, 2, screenX, screenY - 6, blade.arcRadius + 5);
      grad.addColorStop(0, "rgba(56, 255, 100, 0)");
      grad.addColorStop(0.72, "rgba(67, 255, 84, 0.2)");
      grad.addColorStop(1, "rgba(210, 255, 191, 0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 7.4;
      ctx.beginPath();
      ctx.arc(screenX, screenY - 6, blade.arcRadius, start, end, blade.bx < 0);
      ctx.stroke();
    }
    ctx.strokeStyle = "#1a1f16";
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(blade.handleBaseX, blade.handleBaseY);
    ctx.lineTo(blade.handX, blade.handY);
    ctx.stroke();
    ctx.strokeStyle = visual.staffWrap || "#9cff9c";
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(blade.guardLeftX, blade.guardLeftY);
    ctx.lineTo(blade.guardRightX, blade.guardRightY);
    ctx.stroke();
    ctx.strokeStyle = visual.bladeEdge || "#26c95a";
    ctx.lineWidth = 6.2 + blade.attackAmount * 1.5;
    ctx.beginPath();
    ctx.moveTo(blade.handX, blade.handY);
    ctx.quadraticCurveTo(blade.flameLeftX, blade.flameLeftY, blade.tipX, blade.tipY);
    ctx.stroke();
    ctx.strokeStyle = visual.bladeMid || "#77ff6d";
    ctx.lineWidth = 4.2 + blade.attackAmount;
    ctx.beginPath();
    ctx.moveTo(blade.handX + blade.bpx * 0.8, blade.handY + blade.bpy * 0.8);
    ctx.quadraticCurveTo(blade.flameRightX, blade.flameRightY, blade.tipX, blade.tipY);
    ctx.stroke();
    ctx.strokeStyle = visual.bladeCore || "#ddffd2";
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(blade.handX, blade.handY);
    ctx.lineTo(blade.tipX, blade.tipY);
    ctx.stroke();
    ctx.fillStyle = visual.bladeCore || "#ddffd2";
    ctx.beginPath();
    ctx.arc(blade.tipX, blade.tipY, 2.1 + blade.attackAmount * 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};
