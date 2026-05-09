export { drawShopMenu } from "./shopMenu.js";
import { drawRangerSkillTreeMenu } from "./rangerSkillTreeMenu.js";
import { drawWarriorSkillTreeMenu } from "./warriorSkillTreeMenu.js";
import { drawNecromancerSkillTreeMenu } from "./necromancerSkillTreeMenu.js";

function drawSkillTreeFrame(renderer, game, layout, frameStyle) {
  game.uiRects.skillRefundButton = null;
  const ctx = renderer.ctx;
  const menuW = layout.isAndroid ? Math.min(layout.playW - 18, 560) : 520;
  const menuH = Math.min(renderer.canvas.height - (layout.isAndroid ? 18 : 30), 560);
  const menuX = Math.floor((layout.playW - menuW) / 2);
  const menuY = Math.floor((renderer.canvas.height - menuH) / 2);

  ctx.fillStyle = "rgba(4, 7, 11, 0.78)";
  ctx.fillRect(0, 0, layout.playW, renderer.canvas.height);

  ctx.fillStyle = frameStyle.fill;
  ctx.fillRect(menuX, menuY, menuW, menuH);
  ctx.strokeStyle = frameStyle.stroke;
  ctx.lineWidth = 1.4;
  ctx.strokeRect(menuX, menuY, menuW, menuH);

  const closeRect = layout.isAndroid
    ? { x: menuX + menuW - 42, y: menuY + 8, w: 28, h: 28 }
    : { x: menuX + menuW - 34, y: menuY + 10, w: 20, h: 20 };
  game.uiRects.skillTreeClose = closeRect;
  ctx.fillStyle = "rgba(140, 78, 78, 0.9)";
  ctx.fillRect(closeRect.x, closeRect.y, closeRect.w, closeRect.h);
  ctx.fillStyle = "#f4ece6";
  ctx.font = layout.isAndroid ? "bold 18px Trebuchet MS" : "bold 14px Trebuchet MS";
  ctx.fillText("X", closeRect.x + (layout.isAndroid ? 8 : 6), closeRect.y + (layout.isAndroid ? 20 : 15));

  return { menuX, menuY, menuW, menuH };
}

export function drawSkillTreeMenu(renderer, game, layout) {
  if (game.isArcherClass && game.isArcherClass()) {
    const frame = drawSkillTreeFrame(renderer, game, layout, {
      fill: "rgba(16, 11, 21, 0.95)",
      stroke: "rgba(179, 136, 215, 0.75)"
    });
    drawRangerSkillTreeMenu(renderer, game, layout, frame);
    return;
  }

  if (game.isWarriorClass && game.isWarriorClass()) {
    const frame = drawSkillTreeFrame(renderer, game, layout, {
      fill: "rgba(24, 17, 13, 0.95)",
      stroke: "rgba(196, 138, 95, 0.75)"
    });
    drawWarriorSkillTreeMenu(renderer, game, layout, frame);
    return;
  }

  if (game.isNecromancerClass && game.isNecromancerClass()) {
    const frame = drawSkillTreeFrame(renderer, game, layout, {
      fill: "rgba(17, 12, 24, 0.95)",
      stroke: "rgba(154, 120, 214, 0.75)"
    });
    drawNecromancerSkillTreeMenu(renderer, game, layout, frame);
  }
}
