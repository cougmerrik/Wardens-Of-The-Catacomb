import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const manifestFlag = process.argv.indexOf("--manifest");
const outputFlag = process.argv.indexOf("--output");
const manifestPath = resolve(manifestFlag >= 0 ? process.argv[manifestFlag + 1] : resolve(toolDir, "minotaur-boss.asset.json"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.asset, "minotaur_boss");
assert.equal(manifest.frame.width, 128);
assert.equal(manifest.frame.height, 128);
assert.deepEqual(manifest.directionRows, ["E", "SE", "S", "SW", "W", "NW", "N", "NE"]);
assert.equal(manifest.variants.length, 2);
assert.deepEqual(manifest.variants.map(({ variant }) => variant), ["normal", "damaged"]);
assert.ok(manifest.triangleBudget <= 9000);

function pngSize(buffer) {
  assert.equal(buffer.toString("ascii", 1, 4), "PNG");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), colorType: buffer[25] };
}

if (!process.argv.includes("--manifest-only")) {
  assert.ok(outputFlag >= 0 && process.argv[outputFlag + 1], "--output is required");
  const output = resolve(process.argv[outputFlag + 1]);
  const report = JSON.parse(await readFile(resolve(output, manifest.outputs.report), "utf8"));
  assert.equal(report.asset, manifest.asset);
  assert.equal(report.frameWidth, 128);
  assert.equal(report.frameHeight, 128);
  assert.deepEqual(report.directionRows, manifest.directionRows);
  assert.deepEqual(report.variants, manifest.variants.map(({ variant }) => variant));
  assert.deepEqual(report.actions.map(({ action, frames }) => [action, frames]), manifest.actions.map(({ action, frames }) => [action, frames]));
  assert.equal(report.modeling, "low-poly 3D primitives");
  assert.equal(report.atlas?.directRawSheets, true);
  assert.equal(report.atlas?.file, null);
  assert.equal(report.camera?.directionMode, "rotated 3D model per declared direction row");
  assert.equal(report.flatShaded, true);
  assert.ok(report.triangles > 0, "triangle count should be measured");
  assert.ok(report.triangles <= report.triangleBudget, `triangles ${report.triangles} exceed budget ${report.triangleBudget}`);

  await readFile(resolve(output, manifest.outputs.blend));
  for (const variant of manifest.variants) {
    for (const action of manifest.actions) {
      const base = `minotaur_${variant.variant}_${action.action}_8dir_${action.frames}f`;
      const raw = pngSize(await readFile(resolve(output, `raw_${base}.png`)));
      const sheet = pngSize(await readFile(resolve(output, `${base}.png`)));
      await readFile(resolve(output, "aseprite", `${base}.aseprite`));
      assert.equal(raw.width, 128 * action.frames, `${base} raw width`);
      assert.equal(raw.height, 128 * manifest.directionRows.length, `${base} raw height`);
      assert.equal(sheet.width, raw.width, `${base} sheet width`);
      assert.equal(sheet.height, raw.height, `${base} sheet height`);
      assert.equal(sheet.colorType, 6, `${base} sheet should be RGBA`);
    }
  }
}

console.log("Minotaur Blender/Aseprite pipeline validation passed.");
