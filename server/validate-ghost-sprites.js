import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnGhost } from "../src/game/enemySpawnFactories.js";
import {
  GHOST_ACTIONS,
  GHOST_PALETTES,
  GHOST_VARIANTS,
  getGhostDirectionIndex,
  getGhostPresentation
} from "../src/rendering/ghostSpriteSheet.js";
import { serializeEnemy } from "./net/stateSerialization.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = path.join(root, "assets/images/enemies/ghost_family");

function readPngDimensions(file) {
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.toString("ascii", 1, 4), "PNG", `${file} must be a PNG`);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

const game = {
  config: { enemy: { ghostHpMin: 3, ghostHpMax: 7, ghostSpeedMin: 110, ghostSpeedMax: 150, ghostDamageMin: 10, ghostDamageMax: 16 } },
  rollScaledEnemyHealth: () => 5
};
const ghost = spawnGhost(game, 12, 24);
assert.ok(GHOST_VARIANTS.includes(ghost.ghostVariant), "spawned ghost should have a supported stable variant");
assert.ok(GHOST_PALETTES.includes(ghost.ghostPalette), "spawned ghost should have a supported stable palette");
assert.equal(ghost.size, 16, "ghost collision core should stay inside the wispy 44px presentation");

const serialized = serializeEnemy({}, { ...ghost, ghostVariant: "veiled_specter", ghostPalette: "malignant_haunt", ghostAction: "siphon", dirX: 0, dirY: -1, siphoning: true });
assert.equal(serialized.ghostVariant, "veiled_specter");
assert.equal(serialized.ghostPalette, "malignant_haunt");
assert.equal(serialized.ghostAction, "siphon");
assert.equal(serialized.ghostAnimationPhase, ghost.ghostAnimationPhase);
assert.equal(serialized.dirY, -1);
assert.equal(serialized.siphoning, true);

assert.deepEqual(
  [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]].map(([x, y]) => getGhostDirectionIndex(x, y)),
  [0, 1, 2, 3, 4, 5, 6, 7],
  "direction rows should match the runtime sheet order"
);
assert.equal(getGhostPresentation({ ...ghost, ghostAction: "siphon", ghostAnimationPhase: 0 }, 0.71).frame, 7);
assert.notEqual(
  getGhostPresentation({ ...ghost, ghostAction: "hover", ghostAnimationPhase: 0 }, 0).frame,
  getGhostPresentation({ ...ghost, ghostAction: "hover", ghostAnimationPhase: 0.3 }, 0).frame,
  "stable per-ghost phase should desynchronize looping animations"
);
assert.equal(getGhostPresentation({ ...ghost, hp: 0, corpseTimer: 29.5 }, 99).action, "death");
assert.equal(getGhostPresentation({ ...ghost, hp: 0, corpseTimer: 29.5 }, 99).frame, 5);
assert.equal(getGhostPresentation({ ...ghost, hp: 0, corpseTimer: 20 }, 99).frame, 9, "dead ghosts should hold the final death frame");
assert.equal(getGhostPresentation({ ...ghost, ghostAction: "primary_attack", ghostActionStartedAt: 2 }, 2.4).frame, 3);

let sheetCount = 0;
for (const variant of GHOST_VARIANTS) {
  for (const [action, spec] of Object.entries(GHOST_ACTIONS)) {
    for (const pass of ["color", "shadow", "silhouette", "glow"]) {
      const file = path.join(assetRoot, `${variant}_${action}_8dir_${spec.frames}f_${pass}.png`);
      assert.ok(fs.existsSync(file), `missing runtime ghost sheet: ${path.basename(file)}`);
      assert.deepEqual(readPngDimensions(file), [spec.frames * 128, 8 * 128], `${path.basename(file)} has invalid dimensions`);
      sheetCount += 1;
    }
  }
}

console.log(JSON.stringify({ variants: GHOST_VARIANTS.length, actions: Object.keys(GHOST_ACTIONS).length, sheets: sheetCount, networkFields: true, directionOrder: true }, null, 2));
