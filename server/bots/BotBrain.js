import { getLocalPlayer } from "./botState.js";

const CLASS_RANGE = {
  archer: { ideal: 230, min: 150, max: 330 },
  fighter: { ideal: 58, min: 34, max: 96 },
  necromancer: { ideal: 190, min: 120, max: 280 }
};

function clampUnit(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}

function normalize(x, y) {
  const len = Math.hypot(x, y);
  if (!Number.isFinite(len) || len <= 0.0001) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

function isHostileEnemy(enemy) {
  if (!enemy || typeof enemy !== "object") return false;
  if (enemy.isControlledUndead) return false;
  if (enemy.collapsed && (enemy.collapseTimer || 0) > 0) return false;
  return !Number.isFinite(enemy.hp) || enemy.hp > 0;
}

function chooseNearest(source, items, predicate) {
  let best = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const item of Array.isArray(items) ? items : []) {
    if (!predicate(item)) continue;
    const dist = Math.hypot((item.x || 0) - source.x, (item.y || 0) - source.y);
    if (dist < bestDist) {
      best = item;
      bestDist = dist;
    }
  }
  return { item: best, dist: bestDist };
}

export class BotBrain {
  constructor({ random = Math.random, classType = "archer" } = {}) {
    this.random = random;
    this.classType = classType;
    this.wanderDir = normalize(this.random() * 2 - 1, this.random() * 2 - 1);
    this.nextWanderAtMs = 0;
    this.nextPrimaryQueueAtMs = 0;
    this.nextAltAtMs = 0;
    this.nextModeSwapAtMs = 0;
  }

  chooseInput(state, nowMs, seq) {
    const player = getLocalPlayer(state);
    if (!player || (Number.isFinite(player.health) && player.health <= 0) || player.alive === false) {
      return this.makeIdleInput(seq);
    }

    if (nowMs >= this.nextWanderAtMs) {
      this.wanderDir = normalize(this.random() * 2 - 1, this.random() * 2 - 1);
      this.nextWanderAtMs = nowMs + 900 + Math.floor(this.random() * 1700);
    }

    const classType = player.classType || this.classType || "archer";
    const range = CLASS_RANGE[classType] || CLASS_RANGE.archer;
    const target = chooseNearest(player, state.latest?.enemies, isHostileEnemy);
    const pickup = chooseNearest(player, state.latest?.drops, (drop) => !!drop && Number.isFinite(drop.x) && Number.isFinite(drop.y));

    let moveX = this.wanderDir.x * 0.45;
    let moveY = this.wanderDir.y * 0.45;
    let aimX = player.x + this.wanderDir.x * 160;
    let aimY = player.y + this.wanderDir.y * 160;
    let hasAim = true;

    if (target.item) {
      const dx = (target.item.x || 0) - player.x;
      const dy = (target.item.y || 0) - player.y;
      const toward = normalize(dx, dy);
      const strafe = normalize(-toward.y, toward.x);
      const strafeSign = this.random() < 0.5 ? -1 : 1;
      hasAim = true;
      aimX = target.item.x || aimX;
      aimY = target.item.y || aimY;
      if (target.dist < range.min) {
        moveX = -toward.x + strafe.x * 0.25 * strafeSign;
        moveY = -toward.y + strafe.y * 0.25 * strafeSign;
      } else if (target.dist > range.max) {
        moveX = toward.x + strafe.x * 0.18 * strafeSign;
        moveY = toward.y + strafe.y * 0.18 * strafeSign;
      } else {
        moveX = strafe.x * 0.7 * strafeSign;
        moveY = strafe.y * 0.7 * strafeSign;
      }
    } else if (pickup.item && pickup.dist < 360) {
      const towardPickup = normalize((pickup.item.x || 0) - player.x, (pickup.item.y || 0) - player.y);
      moveX = towardPickup.x;
      moveY = towardPickup.y;
    }

    const aimDir = normalize(aimX - player.x, aimY - player.y);
    const shouldQueuePrimary = hasAim && nowMs >= this.nextPrimaryQueueAtMs;
    if (shouldQueuePrimary) this.nextPrimaryQueueAtMs = nowMs + 260 + Math.floor(this.random() * 120);
    const shouldAlt = hasAim && nowMs >= this.nextAltAtMs && this.random() < 0.08;
    if (shouldAlt) this.nextAltAtMs = nowMs + 4200 + Math.floor(this.random() * 5200);
    const shouldModeSwap = nowMs >= this.nextModeSwapAtMs && this.random() < 0.015;
    if (shouldModeSwap) this.nextModeSwapAtMs = nowMs + 7000 + Math.floor(this.random() * 6000);

    return {
      seq,
      moveX: clampUnit(moveX),
      moveY: clampUnit(moveY),
      hasAim,
      aimX,
      aimY,
      aimDirX: aimDir.x,
      aimDirY: aimDir.y,
      swapAttackQueued: classType === "fighter" && shouldModeSwap,
      firePrimaryQueued: shouldQueuePrimary,
      firePrimaryHeld: hasAim,
      fireAltQueued: shouldAlt,
      modeSwapQueued: classType !== "fighter" && shouldModeSwap
    };
  }

  makeIdleInput(seq) {
    return {
      seq,
      moveX: 0,
      moveY: 0,
      hasAim: false,
      aimX: 0,
      aimY: 0,
      aimDirX: 0,
      aimDirY: 0,
      swapAttackQueued: false,
      firePrimaryQueued: false,
      firePrimaryHeld: false,
      fireAltQueued: false,
      modeSwapQueued: false
    };
  }
}
