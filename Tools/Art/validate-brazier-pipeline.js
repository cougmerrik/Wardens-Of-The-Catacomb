import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDir = dirname(fileURLToPath(import.meta.url));
const manifestFlag = process.argv.indexOf('--manifest');
const outputFlag = process.argv.indexOf('--output');
const manifestPath = resolve(manifestFlag >= 0 ? process.argv[manifestFlag + 1] : resolve(toolDir, 'catacomb-brazier.asset.json'));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.frame.width, 48);
assert.equal(manifest.frame.height, 48);
assert.deepEqual(manifest.states.map(({ name, from, to }) => [name, from, to]), [
  ['unlit', 1, 1], ['ignite', 2, 5], ['lit', 6, 11], ['extinguish', 12, 17],
]);
assert.equal(manifest.states.at(-1).to, 17);
assert.ok(manifest.seed >= 0 && Number.isInteger(manifest.seed));
assert.ok(manifest.triangleBudget <= 600);

if (!process.argv.includes('--manifest-only')) {
  assert.ok(outputFlag >= 0 && process.argv[outputFlag + 1], '--output is required');
  const output = resolve(process.argv[outputFlag + 1]);
  const report = JSON.parse(await readFile(resolve(output, manifest.outputs.report), 'utf8'));
  assert.equal(report.frameWidth, 48);
  assert.equal(report.frameHeight, 48);
  assert.equal(report.frameCount, 17);
  assert.equal(report.flatShaded, true);
  assert.ok(report.triangles <= report.triangleBudget);

  const png = await readFile(resolve(output, manifest.outputs.sheet));
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  assert.equal(png.readUInt32BE(16), 48 * 17);
  assert.equal(png.readUInt32BE(20), 48);
  assert.equal(png[25], 6, 'sheet must use PNG RGBA color type');
  const data = JSON.parse(await readFile(resolve(output, manifest.outputs.data), 'utf8'));
  assert.equal(data.frames.length, 17);
  assert.deepEqual(data.frames.map(({ duration }) => duration), manifest.states.flatMap(({ from, to, durationMs }) => Array(to - from + 1).fill(durationMs)));
  for (const [index, frame] of data.frames.entries()) {
    assert.deepEqual(frame.frame, { x: index * 48, y: 0, w: 48, h: 48 });
    assert.equal(frame.rotated, false);
    assert.equal(frame.trimmed, false);
  }
  const tags = data.meta?.frameTags || [];
  assert.deepEqual(tags.map(({ name, from, to }) => [name, from + 1, to + 1]), manifest.states.map(({ name, from, to }) => [name, from, to]));
  console.log(`sheet sha256 ${createHash('sha256').update(png).digest('hex')}`);
}

console.log('Catacomb brazier pipeline validation passed.');
