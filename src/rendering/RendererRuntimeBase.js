import { drawDebugStatsHud } from "./hud/index.js";
import { drawMageFrame } from "./mageSpriteSheet.js";
import { drawArcherFrame } from "./rangerSpriteSheet.js";
import { drawWarriorFrame } from "./warriorSpriteSheet.js";
import { getRangerHandTargets, getRangerRigPose } from "./rangerRigPose.js";
import { getThrowingKnifeMeleePresentation, getThrowingKnifeReloadState } from "./rangerThrowingKnifeReload.js";

export class RendererRuntimeBase {
  constructor(canvas, ctx, config) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.config = config;
    this.sidebarWidth = this.config.hud.sidebarWidth;
    this.topHudHeight = this.config.hud.topHudHeight;
    this.sidebarPadding = 12;
    this.ctx.imageSmoothingEnabled = false;
    this.playerSpriteSheetCache = new Map();
    this.playerSpriteSheet = this.createPlayerSpriteSheet();
    this.keySprite = this.createKeySprite();
    this.goldBagSprite = this.createGoldBagSprite();
    this.potionSprite = this.createPotionSprite();
  }

  drawDebugStatsHud(game, layout) {
    drawDebugStatsHud(this, game, layout);
  }

  createPlayerSpriteSheet(visualSpec = null) {
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
        if (visualSpec?.classKey === "mage") this.drawMageFrame(sctx, ox, oy, angle, f, visualSpec);
        else if (visualSpec?.classKey === "warrior") this.drawWarriorFrame(sctx, ox, oy, angle, f, visualSpec);
        else this.drawArcherFrame(sctx, ox, oy, angle, f, visualSpec);
      }
    }
    return sheet;
  }

  getPlayerSpriteSheet(visualSpec = null) {
    if (!visualSpec) return this.playerSpriteSheet;
    const key = [
      visualSpec.classKey || "ranger",
      visualSpec.weapon || "longbow",
      visualSpec.doctrine || "none",
      visualSpec.path || "none",
      visualSpec.modifier || "none",
      visualSpec.swapStyle || "none",
      visualSpec.stanceA || "none",
      visualSpec.stanceB || "none",
      visualSpec.capstone || "none",
      ...(Array.isArray(visualSpec.extras) ? visualSpec.extras : []),
      ...(Array.isArray(visualSpec.generalSkills) ? visualSpec.generalSkills : [])
    ].join("|");
    if (!this.playerSpriteSheetCache.has(key)) {
      this.playerSpriteSheetCache.set(key, this.createPlayerSpriteSheet(visualSpec));
    }
    return this.playerSpriteSheetCache.get(key);
  }

  drawArcherFrame(sctx, ox, oy, angle, frameIndex, visualSpec = null) {
    drawArcherFrame(sctx, this.config, ox, oy, angle, frameIndex, visualSpec);
  }

  drawWarriorFrame(sctx, ox, oy, angle, frameIndex, visualSpec = null) {
    drawWarriorFrame(sctx, this.config, ox, oy, angle, frameIndex, visualSpec);
  }

  drawMageFrame(sctx, ox, oy, angle, frameIndex, visualSpec = null) {
    drawMageFrame(sctx, this.config, ox, oy, angle, frameIndex, visualSpec);
  }

  drawPlayerAimingRig(player, screenX, screenY, walkPhase = 0, firePulse = 0, weaponStyle = "longbow") {
    const ctx = this.ctx;
    const visualSpec = weaponStyle && typeof weaponStyle === "object" ? weaponStyle : null;
    const selectedStyle = visualSpec?.weaponVisual?.style || weaponStyle;
    const style = ["rapierPistol", "twinDaggers", "throwingKnives"].includes(selectedStyle) ? selectedStyle : "longbow";
    const weaponMode = visualSpec?.weaponMode === "melee" ? "melee" : "ranged";
    const pose = getRangerRigPose(player, screenX, screenY, walkPhase, weaponMode);
    const { ax, ay, px, py, rearShoulderX, rearShoulderY, frontShoulderX, frontShoulderY } = pose;
    const costume = visualSpec?.costume || {};
    const projectile = visualSpec?.projectile || {};
    const effects = visualSpec?.effects || {};
    const rearSleeve = costume.hood || "#2d5132";
    const frontSleeve = costume.tunic || "#355f3b";
    const leather = costume.leather || "#6d4a2c";
    const trim = costume.trim || "#62b276";
    const accent = costume.accent || visualSpec?.weaponVisual?.color || "#8eb8ff";
    const weaponColor = visualSpec?.weaponVisual?.color || accent;
    const arrowHeadColor = projectile.head || "#ecdfc1";
    const trailColor = projectile.trail || "#d3c59d";

    // Recoil pulse after a shot: draw hand snaps back and string oscillates briefly.
    const recoil = Math.max(0, Math.min(1, firePulse));
    const handTargets = getRangerHandTargets(pose, recoil, weaponMode, style);
    const { bowGripX, bowGripY, drawHandX, drawHandY } = handTargets;
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

    if (style !== "longbow") {
      const { mainHandX, mainHandY, offHandX, offHandY } = handTargets;
      drawArm(rearShoulderX, rearShoulderY, offHandX, offHandY, rearSleeve, "#e4c39c", -1);
      drawArm(frontShoulderX, frontShoulderY, mainHandX, mainHandY, frontSleeve, "#e4c39c", 1);

      ctx.lineCap = "round";
      if (style === "rapierPistol") {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo((weaponMode === "melee" ? mainHandX : offHandX) - ax * 2, (weaponMode === "melee" ? mainHandY : offHandY) - ay * 2);
        ctx.lineTo((weaponMode === "melee" ? mainHandX : offHandX) + ax * 15, (weaponMode === "melee" ? mainHandY : offHandY) + ay * 15);
        ctx.stroke();
        const pistolX = weaponMode === "melee" ? offHandX : mainHandX;
        const pistolY = weaponMode === "melee" ? offHandY : mainHandY;
        const pistolAim = weaponMode === "melee" ? 0.35 : 1;
        ctx.strokeStyle = weaponColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pistolX - ax * 1.5, pistolY - ay * 1.5);
        ctx.lineTo(pistolX + ax * 9 * pistolAim - px * (weaponMode === "melee" ? 3 : 0), pistolY + ay * 9 * pistolAim - py * (weaponMode === "melee" ? 3 : 0));
        ctx.stroke();
        ctx.strokeStyle = leather;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(pistolX - px * 1.3, pistolY - py * 1.3);
        ctx.lineTo(pistolX - ax * 2 - px * 4, pistolY - ay * 2 - py * 4);
        ctx.stroke();
        if (recoil > 0.15) {
          ctx.fillStyle = projectile.impact === "muzzleFlash" ? "#ffd98a" : accent;
          ctx.beginPath();
          ctx.arc(pistolX + ax * 10, pistolY + ay * 10, 1.8 + recoil * 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const bladeColor = style === "twinDaggers" ? weaponColor : arrowHeadColor;
        const hiltColor = style === "twinDaggers" ? leather : trim;
        const knifeReload = getThrowingKnifeReloadState(player, firePulse, visualSpec);
        const knifeMelee = getThrowingKnifeMeleePresentation(visualSpec, player);
        const drawKnife = (hx, hy, side) => {
          ctx.strokeStyle = hiltColor;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(hx - px * side * 2.8, hy - py * side * 2.8);
          ctx.lineTo(hx + px * side * 2.8, hy + py * side * 2.8);
          ctx.stroke();
          ctx.strokeStyle = bladeColor;
          ctx.lineWidth = style === "twinDaggers" ? 2.3 : 1.8;
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(hx + ax * (style === "twinDaggers" ? 11 : 8), hy + ay * (style === "twinDaggers" ? 11 : 8));
          ctx.stroke();
          if (effects.hit === "shortRedFlecks") {
            ctx.fillStyle = "#d36a62";
            ctx.fillRect(hx + ax * 6 + px * side * 2, hy + ay * 6 + py * side * 2, 1.5, 1.5);
          }
        };
        const drawCloseCut = (hx, hy, side, primary = false) => {
          const cutPulse = 0.5 + Math.sin(recoil * Math.PI) * 0.5;
          ctx.strokeStyle = hiltColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(hx - px * side * 2.2, hy - py * side * 2.2);
          ctx.lineTo(hx + px * side * 2.2, hy + py * side * 2.2);
          ctx.stroke();
          ctx.strokeStyle = primary ? bladeColor : `${bladeColor}99`;
          ctx.lineWidth = primary ? 2.3 : 1.35;
          ctx.beginPath();
          ctx.moveTo(hx - ax * 2.5 - px * side * 2.5, hy - ay * 2.5 - py * side * 2.5);
          ctx.quadraticCurveTo(
            hx + ax * (1.2 + cutPulse) + px * side * (primary ? 5 : 3.5),
            hy + ay * (1.2 + cutPulse) + py * side * (primary ? 5 : 3.5),
            hx + ax * (primary ? knifeMelee.maxForwardPixels : knifeMelee.maxForwardPixels - 1.6) + px * side * 2.2,
            hy + ay * (primary ? knifeMelee.maxForwardPixels : knifeMelee.maxForwardPixels - 1.6) + py * side * 2.2
          );
          ctx.stroke();
          ctx.strokeStyle = primary ? `${bladeColor}bb` : `${bladeColor}66`;
          ctx.lineWidth = primary ? 1.2 : 0.9;
          ctx.beginPath();
          ctx.moveTo(hx - ax * 1.5 + px * side * 2, hy - ay * 1.5 + py * side * 2);
          ctx.lineTo(hx + ax * 3.8 - px * side * 2.8, hy + ay * 3.8 - py * side * 2.8);
          ctx.stroke();
        };
        const drawReleasedHand = (hx, hy, side) => {
          ctx.fillStyle = "#e4c39c";
          ctx.beginPath();
          ctx.arc(hx, hy, 1.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = `${weaponColor}${Math.round((1 - knifeReload.readyProgress) * 120)
            .toString(16)
            .padStart(2, "0")}`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(hx - ax * 3 + px * side * 1.5, hy - ay * 3 + py * side * 1.5);
          ctx.lineTo(hx + ax * 3 + px * side * 2.5, hy + ay * 3 + py * side * 2.5);
          ctx.stroke();
        };
        if (knifeMelee.active) {
          drawCloseCut(mainHandX, mainHandY, 1, knifeMelee.primaryHand === 1);
          drawCloseCut(offHandX, offHandY, -1, knifeMelee.primaryHand === -1);
        } else if (knifeReload.released) {
          if (knifeReload.thrownHand === -1) {
            drawKnife(mainHandX, mainHandY, 1);
            drawReleasedHand(offHandX, offHandY, -1);
          } else {
            drawReleasedHand(mainHandX, mainHandY, 1);
            drawKnife(offHandX, offHandY, -1);
          }
        } else {
          drawKnife(mainHandX, mainHandY, 1);
          drawKnife(offHandX, offHandY, -1);
        }
        if (effects.capstone === "shadowDuplicate") {
          ctx.globalAlpha = 0.45;
          ctx.strokeStyle = "#c7a5ff";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(mainHandX - ax * 4 - px * 3, mainHandY - ay * 4 - py * 3);
          ctx.lineTo(mainHandX + ax * 7 - px * 3, mainHandY + ay * 7 - py * 3);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      ctx.fillStyle = "#e4c39c";
      ctx.beginPath();
      ctx.arc(rearShoulderX, rearShoulderY, 1.2, 0, Math.PI * 2);
      ctx.arc(frontShoulderX, frontShoulderY, 1.2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (weaponMode === "melee") {
      const { guardHandX, guardHandY, braceHandX, braceHandY } = handTargets;
      drawArm(rearShoulderX, rearShoulderY, braceHandX, braceHandY, rearSleeve, "#e4c39c", -1);
      drawArm(frontShoulderX, frontShoulderY, guardHandX, guardHandY, frontSleeve, "#e4c39c", 1);

      ctx.lineCap = "round";
      ctx.strokeStyle = leather;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(guardHandX - ax * 10 - px * 5, guardHandY - ay * 10 - py * 5);
      ctx.lineTo(guardHandX + ax * 7 + px * 4, guardHandY + ay * 7 + py * 4);
      ctx.stroke();
      ctx.strokeStyle = weaponColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(guardHandX - ax * 7 - px * 4, guardHandY - ay * 7 - py * 4);
      ctx.lineTo(guardHandX + ax * 5 + px * 3, guardHandY + ay * 5 + py * 3);
      ctx.stroke();
      ctx.fillStyle = "#e4c39c";
      ctx.beginPath();
      ctx.arc(rearShoulderX, rearShoulderY, 1.2, 0, Math.PI * 2);
      ctx.arc(frontShoulderX, frontShoulderY, 1.2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Rear arm draws string (behind bow).
    drawArm(rearShoulderX, rearShoulderY, drawHandX, drawHandY, rearSleeve, "#e4c39c", -1);

    // Bow.
    ctx.strokeStyle = leather;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(bowGripX + px * -8, bowGripY + py * -8);
    ctx.quadraticCurveTo(bowGripX + ax * 12, bowGripY + ay * 12, bowGripX + px * 8, bowGripY + py * 8);
    ctx.stroke();
    ctx.strokeStyle = weaponColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(bowGripX + px * -6, bowGripY + py * -6);
    ctx.quadraticCurveTo(bowGripX + ax * 8, bowGripY + ay * 8, bowGripX + px * 6, bowGripY + py * 6);
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
    ctx.strokeStyle = trailColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(arrowTailX, arrowTailY);
    ctx.lineTo(arrowHeadX, arrowHeadY);
    ctx.stroke();
    ctx.fillStyle = arrowHeadColor;
    ctx.beginPath();
    ctx.moveTo(arrowHeadX, arrowHeadY);
    ctx.lineTo(arrowHeadX - ax * 3.9 + px * 1.9, arrowHeadY - ay * 3.9 + py * 1.9);
    ctx.lineTo(arrowHeadX - ax * 3.9 - px * 1.9, arrowHeadY - ay * 3.9 - py * 1.9);
    ctx.closePath();
    ctx.fill();
    if (effects.capstone === "stormFlash" || projectile.impact === "stormFork") {
      ctx.strokeStyle = "#d8f4ff";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(arrowHeadX - ax * 2, arrowHeadY - ay * 2);
      ctx.lineTo(arrowHeadX - ax * 5 + px * 3, arrowHeadY - ay * 5 + py * 3);
      ctx.lineTo(arrowHeadX - ax * 8 + px, arrowHeadY - ay * 8 + py);
      ctx.stroke();
    } else if (effects.buff === "emberBurst" && recoil > 0.1) {
      ctx.fillStyle = "#ffbd68";
      ctx.fillRect(arrowHeadX - ax * 4 + px * 2, arrowHeadY - ay * 4 + py * 2, 1.5, 1.5);
      ctx.fillRect(arrowHeadX - ax * 6 - px * 1, arrowHeadY - ay * 6 - py * 1, 1.2, 1.2);
    }

    // Front arm holds bow (drawn on top).
    drawArm(frontShoulderX, frontShoulderY, bowGripX, bowGripY, frontSleeve, "#e4c39c", 1);

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
