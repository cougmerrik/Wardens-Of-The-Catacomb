import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { serializeState } from "./net/stateSerialization.js";
import {
  MINOTAUR_DIRECTION_ROWS,
  MINOTAUR_FRAME_SIZE,
  MINOTAUR_SHEETS,
  MINOTAUR_VARIANTS,
  drawMinotaurBossSprite,
  getMinotaurAction,
  getMinotaurDirectionIndex,
  getMinotaurFrameIndex,
  getMinotaurVariant,
} from "../src/rendering/minotaurBossSpriteSheet.js";

const repoRoot = resolve(import.meta.dirname, "..");
const manifestPath = resolve(repoRoot, "assets/images/enemies/minotaur/minotaur_boss_sheets.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

function readPngSize(buffer) {
  assert.equal(buffer.toString("ascii", 1, 4), "PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.asset, "minotaur_boss");
assert.equal(manifest.source, "Blender-to-Aseprite sprite pipeline");
assert.deepEqual(manifest.frame, { width: MINOTAUR_FRAME_SIZE, height: MINOTAUR_FRAME_SIZE });
assert.deepEqual(manifest.directionRows, MINOTAUR_DIRECTION_ROWS);
assert.deepEqual(manifest.variants.map((entry) => entry.variant), MINOTAUR_VARIANTS);
assert.equal(manifest.visual.body, "bulky massive muscular minotaur");
assert.equal(manifest.visual.horns, "huge horns, damaged variant has one broken horn");
assert.ok(manifest.visual.special.includes("foot stamp before charge"));
assert.ok(manifest.visual.special.includes("lowered head while charging"));
assert.ok(manifest.visual.special.includes("head roll triumph after killing a player"));
assert.ok(manifest.visual.special.includes("collapse death"));

for (const action of manifest.actions) {
  const sheet = MINOTAUR_SHEETS[action.action];
  assert.ok(sheet, `renderer missing minotaur sheet ${action.action}`);
  assert.equal(sheet.frames, action.frames, `${action.action} frame count mismatch`);
  assert.equal(sheet.loop, action.loop, `${action.action} loop flag mismatch`);
  for (const variant of MINOTAUR_VARIANTS) {
    const pngPath = resolve(repoRoot, `assets/images/enemies/minotaur/minotaur_${variant}_${action.action}_8dir_${action.frames}f.png`);
    const asepritePath = resolve(repoRoot, `art/aseprite/minotaur_boss/minotaur_${variant}_${action.action}_8dir_${action.frames}f.aseprite`);
    const size = readPngSize(await readFile(pngPath));
    await access(asepritePath);
    assert.equal(size.width, MINOTAUR_FRAME_SIZE * action.frames, `${variant} ${action.action} width`);
    assert.equal(size.height, MINOTAUR_FRAME_SIZE * MINOTAUR_DIRECTION_ROWS.length, `${variant} ${action.action} height`);
  }
}

await access(resolve(repoRoot, "art/blender/minotaur_boss/minotaur_boss.generated.blend"));
await access(resolve(repoRoot, "art/blender/minotaur_boss/minotaur_boss.build-report.json"));

assert.equal(getMinotaurDirectionIndex(1, 0), 0);
assert.equal(getMinotaurDirectionIndex(Math.SQRT1_2, Math.SQRT1_2), 1);
assert.equal(getMinotaurDirectionIndex(0, 1), 2);
assert.equal(getMinotaurDirectionIndex(-1, 0), 4);
assert.equal(getMinotaurDirectionIndex(0, -1), 6);

assert.equal(getMinotaurVariant({ hp: 51, maxHp: 100 }), "normal");
assert.equal(getMinotaurVariant({ hp: 50, maxHp: 100 }), "damaged");
assert.equal(getMinotaurAction({ hp: 0, maxHp: 100 }), "death");
assert.equal(getMinotaurAction({ hp: 80, maxHp: 100, triumphTimer: 0.6 }), "triumph");
assert.equal(getMinotaurAction({ hp: 80, maxHp: 100, chargeTimer: 0.2 }), "charge");
assert.equal(getMinotaurAction({ hp: 80, maxHp: 100, chargeWindupTimer: 0.2 }), "windup");
assert.equal(getMinotaurAction({ hp: 80, maxHp: 100, tactics: { phase: "stomp" } }), "stomp");
assert.equal(getMinotaurFrameIndex({ hp: 0, corpseTimer: 18 }, "death", 0), 0);
assert.equal(getMinotaurFrameIndex({ hp: 0, corpseTimer: 0 }, "death", 0), MINOTAUR_SHEETS.death.frames - 1);

const ctx = {
  imageSmoothingEnabled: true,
  drawImage() {},
};
assert.equal(drawMinotaurBossSprite(ctx, { time: 0 }, { type: "minotaur", hp: 90, maxHp: 100, size: 34 }, 64, 96), false, "loader should fail softly before browser Image exists");

const enemy = {
  type: "minotaur",
  isFloorBoss: true,
  x: 64,
  y: 96,
  lastX: 62,
  lastY: 96,
  dirX: 0,
  dirY: -1,
  size: 34,
  hp: 40,
  maxHp: 100,
  chargeTimer: 0.2,
  chargeWindupTimer: 0.1,
  chargeDirX: -1,
  chargeDirY: 0,
  triumphTimer: 0.7,
  tactics: { key: "minotaur", phase: "charging", phaseTime: 0.2 },
};
const state = serializeState({
  sim: {
    config: { map: { tile: 32 } },
    canvas: { height: 640 },
    player: { x: 64, y: 96 },
    worldWidth: 512,
    worldHeight: 512,
    floor: 2,
    level: 10,
    score: 0,
    gold: 0,
    experience: 0,
    expToNextLevel: 100,
    enemies: [enemy],
    drops: [],
    lightSources: [],
    breakables: [],
    wallTraps: [],
    bullets: [],
    fireArrows: [],
    fireZones: [],
    meleeSwings: [],
  },
});
const serializedMinotaur = state.enemies.find((entry) => entry.type === "minotaur");
assert.equal(serializedMinotaur.dirX, enemy.dirX, "network state should preserve zero-valued minotaur facing");
assert.equal(serializedMinotaur.dirY, enemy.dirY, "network state should preserve minotaur facing");
assert.equal(serializedMinotaur.lastX, enemy.lastX, "network state should preserve minotaur horizontal movement");
assert.equal(serializedMinotaur.lastY, enemy.lastY, "network state should preserve minotaur vertical movement");
assert.equal(serializedMinotaur.chargeTimer, enemy.chargeTimer);
assert.equal(serializedMinotaur.chargeWindupTimer, enemy.chargeWindupTimer);
assert.equal(serializedMinotaur.chargeDirX, enemy.chargeDirX);
assert.equal(serializedMinotaur.triumphTimer, enemy.triumphTimer);
assert.equal(serializedMinotaur.tactics.phase, "charging");

console.log("Minotaur sprite validation passed.");
