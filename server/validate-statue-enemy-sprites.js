import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnAnimatedArmor } from "../src/game/enemySpawnFactories.js";
import { placeArmorStands } from "../src/game/world/spawnCombat.js";
import {
  STATUE_ENEMY_DIRECTION_ROWS,
  STATUE_ENEMY_FRAME_SIZE,
  STATUE_ENEMY_SHEETS,
  drawStatueArmorStandSprite,
  drawStatueEnemySprite,
  getStatueEnemyDirectionIndex,
} from "../src/rendering/statueEnemySpriteSheet.js";

const repoRoot = resolve(import.meta.dirname, "..");
const manifestPath = resolve(repoRoot, "assets/images/enemies/statue/statue_enemy_sheets.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.asset, "statue_enemy");
assert.deepEqual(manifest.frame, { width: STATUE_ENEMY_FRAME_SIZE, height: STATUE_ENEMY_FRAME_SIZE });
assert.deepEqual(manifest.directionRows, STATUE_ENEMY_DIRECTION_ROWS);
assert.equal(manifest.visual.body, "grey flat-shaded statue");
assert.equal(manifest.visual.eyes, "red");
assert.equal(manifest.visual.weapon, "spear");

function readPngSize(buffer) {
  assert.equal(buffer.toString("ascii", 1, 4), "PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
  };
}

for (const action of manifest.actions) {
  const sheet = STATUE_ENEMY_SHEETS[action.action];
  assert.ok(sheet, `renderer missing sheet for ${action.action}`);
  assert.equal(sheet.frames, action.frames, `${action.action} frame count mismatch`);
  assert.equal(sheet.loop, action.loop, `${action.action} loop flag mismatch`);
  const path = resolve(repoRoot, sheet.path.replace(/^\.\//, ""));
  const png = await readFile(path);
  const size = readPngSize(png);
  assert.equal(size.width, STATUE_ENEMY_FRAME_SIZE * action.frames, `${action.action} sheet width`);
  assert.equal(size.height, STATUE_ENEMY_FRAME_SIZE * STATUE_ENEMY_DIRECTION_ROWS.length, `${action.action} sheet height`);
}

assert.equal(getStatueEnemyDirectionIndex(1, 0), 0);
assert.equal(getStatueEnemyDirectionIndex(Math.SQRT1_2, Math.SQRT1_2), 1);
assert.equal(getStatueEnemyDirectionIndex(0, 1), 2);
assert.equal(getStatueEnemyDirectionIndex(-1, 0), 4);
assert.equal(getStatueEnemyDirectionIndex(0, -1), 6);

function createRecordingContext() {
  return {
    imageSmoothingEnabled: true,
    fillStyle: "",
    beginPath() {},
    ellipse() {},
    fill() {},
    fillRect() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    drawImage() {},
  };
}

assert.equal(drawStatueArmorStandSprite(createRecordingContext(), { time: 0 }, { size: 24, animated: true }, 64, 96), true);
assert.equal(drawStatueEnemySprite(createRecordingContext(), { time: 0 }, { size: 24, hp: 10, maxHp: 10, x: 64, y: 96, lastX: 63, lastY: 96 }, 64, 96), true);
assert.equal(drawStatueArmorStandSprite(createRecordingContext(), { time: 0 }, { size: 24, variant: "sewer_pool" }, 64, 96), false);
assert.equal(drawStatueEnemySprite(createRecordingContext(), { time: 0 }, { size: 24, variant: "gel_cube", hp: 10 }, 64, 96), false);

const armor = spawnAnimatedArmor({
  config: { enemy: { armorHpMin: 18, armorHpMax: 18, armorSpeed: 80, armorDamageMin: 20, armorDamageMax: 32 } },
  rollScaledEnemyHealth: (min) => min,
  getAnimatedArmorVariant: () => null,
}, 64, 96);
assert.equal(armor.type, "armor");
assert.equal(armor.size, 24, "default animated armor collision size should remain 24");

const standGame = {
  map: [
    "############".split(""),
    "#..........#".split(""),
    "#..#...#...#".split(""),
    "#..........#".split(""),
    "#.....#....#".split(""),
    "#..........#".split(""),
    "#..#.......#".split(""),
    "#..........#".split(""),
    "#.....#....#".split(""),
    "#..........#".split(""),
    "#..........#".split(""),
    "############".split(""),
  ],
  player: { x: 999, y: 999 },
  config: { map: { tile: 32 }, enemy: { armorStandCountFactor: 1, armorStandAnimatedChance: 0 } },
  armorStands: [],
  getArmorStandPlacementTiles: () => null,
  getArmorStandVariant: () => null,
  getCurrentBiomeRules: () => null,
};
placeArmorStands(standGame);
assert.ok(standGame.armorStands.length > 0, "default armor stand placement should create stands");
assert.ok(standGame.armorStands.every((stand) => stand.size === 24), "default armor stand collision size should remain 24");

console.log("Statue enemy sprite validation passed.");
