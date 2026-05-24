import { findOwlPath, getOwlTileSize, isOwlNavigableTile } from "./owlDeliveryNavigation.js";

const ENEMY_EVADE_TILES = 1;

function getTileSize(game) {
  return getOwlTileSize(game);
}

function canOwlOccupy(game, x, y) {
  const tile = getTileSize(game);
  return isOwlNavigableTile(game, Math.floor(x / tile), Math.floor(y / tile));
}

function findNearestOwlThreat(game, owl) {
  const tile = getTileSize(game);
  const evadeDistance = ENEMY_EVADE_TILES * tile;
  let nearest = null;
  for (const enemy of Array.isArray(game.enemies) ? game.enemies : []) {
    if (!enemy || (enemy.hp ?? 1) <= 0 || enemy.deathProcessed) continue;
    const dx = owl.x - (enemy.x || 0);
    const dy = owl.y - (enemy.y || 0);
    const dist = Math.hypot(dx, dy);
    if (dist <= evadeDistance && (!nearest || dist < nearest.dist)) nearest = { dx, dy, dist };
  }
  return nearest;
}

function moveOwlByVector(game, owl, dx, dy, speed, dt) {
  const len = Math.hypot(dx, dy);
  if (len <= 0 || speed <= 0 || dt <= 0) return false;
  const step = speed * dt;
  const ux = dx / len;
  const uy = dy / len;
  const candidates = [[ux, uy], [ux, 0], [0, uy]];
  for (let i = 1; i <= 6; i++) {
    const angle = i * Math.PI / 8;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    candidates.push([ux * cos - uy * sin, ux * sin + uy * cos]);
    candidates.push([ux * cos + uy * sin, -ux * sin + uy * cos]);
  }
  for (const [cx, cy] of candidates) {
    const nx = owl.x + cx * step;
    const ny = owl.y + cy * step;
    if (canOwlOccupy(game, nx, ny)) {
      owl.x = nx;
      owl.y = ny;
      return true;
    }
  }
  return false;
}

function getPathTarget(game, owl, tile) {
  if (owl.state !== "flying") return { x: owl.destX, y: owl.destY };
  const currentTile = { tx: Math.floor(owl.x / tile), ty: Math.floor(owl.y / tile) };
  const stalePath = !Array.isArray(owl.path) || owl.path.length <= 0 || owl.pathDestX !== owl.destX || owl.pathDestY !== owl.destY;
  if (stalePath) {
    owl.path = findOwlPath(game, owl.x, owl.y, owl.destX, owl.destY) || [];
    owl.pathDestX = owl.destX;
    owl.pathDestY = owl.destY;
  }
  while (owl.path.length > 1 && owl.path[0].tx === currentTile.tx && owl.path[0].ty === currentTile.ty) owl.path.shift();
  return owl.path[0] || { x: owl.destX, y: owl.destY };
}

export function moveOwlTowardDestination(game, owl, dt) {
  const tile = getTileSize(game);
  const threat = findNearestOwlThreat(game, owl);
  if (threat) {
    owl.pressureTimer = 0.8;
    const dx = threat.dist > 0 ? threat.dx / threat.dist : 1;
    const dy = threat.dist > 0 ? threat.dy / threat.dist : 0;
    moveOwlByVector(game, owl, dx, dy, owl.speed * 1.18, dt);
    return false;
  }
  owl.pressureTimer = Math.max(0, (owl.pressureTimer || 0) - dt);
  let targetX = owl.destX;
  let targetY = owl.destY;
  if (owl.state === "waiting" && owl.pressureTimer <= 0) {
    targetX = owl.destX + Math.sin(owl.phase || 0) * tile * 0.55;
    targetY = owl.destY + Math.sin((owl.phase || 0) * 2) * tile * 0.3;
  } else if (owl.state === "flying") {
    const waypoint = getPathTarget(game, owl, tile);
    targetX = waypoint.x;
    targetY = waypoint.y;
  }
  let dx = targetX - owl.x;
  let dy = targetY - owl.y;
  const dist = Math.hypot(dx, dy);
  const destDist = Math.hypot(owl.destX - owl.x, owl.destY - owl.y);
  if (owl.state === "flying" && destDist <= tile * 0.8) {
    owl.state = "waiting";
    owl.x = owl.destX;
    owl.y = owl.destY;
    return true;
  }
  if (owl.state === "waiting" && dist <= tile * 0.15) return false;
  dx /= dist || 1;
  dy /= dist || 1;
  if (owl.state === "flying") {
    for (const enemy of Array.isArray(game.enemies) ? game.enemies : []) {
      if (!enemy || (enemy.hp ?? 1) <= 0 || enemy.deathProcessed) continue;
      const ex = owl.x - (enemy.x || 0);
      const ey = owl.y - (enemy.y || 0);
      const ed = Math.hypot(ex, ey);
      if (ed > 0 && ed < tile * 6) {
        const weight = (tile * 6 - ed) / (tile * 6);
        dx += (ex / ed) * weight * 1.5;
        dy += (ey / ed) * weight * 1.5;
      }
    }
  }
  moveOwlByVector(game, owl, dx, dy, owl.state === "waiting" ? owl.speed * 0.42 : owl.speed, dt);
  return false;
}
