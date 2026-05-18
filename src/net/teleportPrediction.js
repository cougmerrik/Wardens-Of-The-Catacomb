import { getRangerSelectedPath } from "../game/rangerTalentTree.js";
import { getMageSelectedPath } from "../game/necromancerTalentTree.js";

function getInputAimVector(entity, input) {
  if (input?.hasAim && Number.isFinite(input.aimX) && Number.isFinite(input.aimY)) {
    const dx = input.aimX - entity.x;
    const dy = input.aimY - entity.y;
    if (Math.hypot(dx, dy) > 0.001) return { dx, dy };
  }
  if (input?.hasAim && Number.isFinite(input.aimDirX) && Number.isFinite(input.aimDirY)) {
    const len = Math.hypot(input.aimDirX, input.aimDirY);
    if (len > 0.001) return { dx: input.aimDirX / len, dy: input.aimDirY / len };
  }
  return { dx: entity.dirX || 1, dy: entity.dirY || 0 };
}

function moveEntity(game, entity, dx, dy) {
  if (typeof game.moveWithCollisionSubsteps === "function") game.moveWithCollisionSubsteps(entity, dx, dy);
  else {
    entity.x += dx;
    entity.y += dy;
  }
}

function applyPredictedMageBlink(game, entity, input, { useFacing = false } = {}) {
  const aim = useFacing ? { dx: entity.dirX || 1, dy: entity.dirY || 0 } : getInputAimVector(entity, input);
  const len = Math.hypot(aim.dx, aim.dy) || 1;
  const tile = game.config?.map?.tile || 32;
  const maxDistance = tile * 4;
  const step = Math.max(8, tile * 0.35);
  let moveX = 0;
  let moveY = 0;
  for (let dist = step; dist <= maxDistance + 0.001; dist += step) {
    const clamped = Math.min(maxDistance, dist);
    const tx = entity.x + (aim.dx / len) * clamped;
    const ty = entity.y + (aim.dy / len) * clamped;
    if (typeof game.isWallAt === "function" && game.isWallAt(tx, ty, false)) break;
    moveX = (aim.dx / len) * clamped;
    moveY = (aim.dy / len) * clamped;
  }
  moveEntity(game, entity, moveX, moveY);
  return true;
}

function applyPredictedRangerShadowstep(game, entity, input) {
  const aim = getInputAimVector(entity, input);
  const len = Math.hypot(aim.dx, aim.dy) || 1;
  moveEntity(game, entity, (aim.dx / len) * 140, (aim.dy / len) * 140);
  return true;
}

export function applyPredictedTeleportAction(game, input, entity = game?.player) {
  if (!game || !entity || !input?.fireAltQueued) return false;
  if (game.classType === "archer" || entity.classType === "archer") {
    if (getRangerSelectedPath(game) !== "roguePath") return false;
    return applyPredictedRangerShadowstep(game, entity, input);
  }
  if (game.classType !== "necromancer" && entity.classType !== "necromancer") return false;
  const path = getMageSelectedPath(game);
  if (path === "necromancerPath") return false;
  return applyPredictedMageBlink(game, entity, input, { useFacing: path === "wizardPath" });
}
