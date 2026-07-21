import { access, copyFile, mkdtemp, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(toolDir, '../..');
const manifest = resolve(toolDir, 'catacomb-brazier.asset.json');
const outputFlag = process.argv.indexOf('--output');
const requestedOutput = outputFlag >= 0 ? process.argv[outputFlag + 1] : null;
const output = requestedOutput ? resolve(requestedOutput) : await mkdtemp(resolve(tmpdir(), 'wardens-brazier-'));
const blender = process.env.BLENDER_BIN || 'blender';
const aseprite = process.env.ASEPRITE_BIN || 'aseprite';
const dryRun = process.argv.includes('--dry-run');
const promote = process.argv.includes('--promote');

await mkdir(output, { recursive: true });

function run(label, command, args) {
  console.log(`${label}: ${command} ${args.join(' ')}`);
  if (dryRun) return;
  const result = spawnSync(command, args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.status !== 0 || /Traceback \(most recent call last\):/.test(result.stderr || '')) {
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${label} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

run('Blender generation', blender, [
  '--background', '--factory-startup', '--python', resolve(toolDir, 'generate_catacomb_brazier.py'), '--',
  '--manifest', manifest, '--output', output,
]);
if (!dryRun) await access(resolve(output, 'catacomb_brazier.build-report.json'));

const editable = resolve(output, 'catacomb_brazier.generated.aseprite');
run('Aseprite assembly', aseprite, [
  '--batch', `-script-param`, `manifest=${manifest}`, `-script-param`, `input=${output}`,
  `-script-param`, `output=${editable}`, '--script', resolve(toolDir, 'compose_catacomb_brazier.lua'),
]);
run('Aseprite export', aseprite, [
  '--batch', editable, '--sheet-type', 'horizontal',
  '--sheet', resolve(output, 'catacomb_brazier_states_17f_48.png'),
  '--data', resolve(output, 'catacomb_brazier_states_17f_48.json'), '--format', 'json-array', '--list-tags',
]);
run('Validation', process.execPath, [resolve(toolDir, 'validate-brazier-pipeline.js'), '--manifest', manifest, '--output', output]);

if (promote && !dryRun) {
  const runtimeDir = resolve(repoRoot, 'assets/images/environment/catacomb/brazier');
  const asepriteDir = resolve(repoRoot, 'art/aseprite/catacomb_brazier');
  const blenderDir = resolve(repoRoot, 'art/blender/catacomb_brazier');
  await Promise.all([mkdir(runtimeDir, { recursive: true }), mkdir(asepriteDir, { recursive: true }), mkdir(blenderDir, { recursive: true })]);
  await Promise.all([
    copyFile(resolve(output, 'catacomb_brazier_states_17f_48.png'), resolve(runtimeDir, 'catacomb_brazier_states_17f_48.png')),
    copyFile(resolve(output, 'catacomb_brazier_states_17f_48.json'), resolve(runtimeDir, 'catacomb_brazier_states_17f_48.json')),
    copyFile(resolve(output, 'catacomb_brazier.generated.aseprite'), resolve(asepriteDir, 'catacomb_brazier.generated.aseprite')),
    copyFile(resolve(output, 'catacomb_brazier.generated.blend'), resolve(blenderDir, 'catacomb_brazier.generated.blend')),
  ]);
  console.log(`Promoted reviewed brazier outputs into ${runtimeDir}`);
}

console.log(`Brazier build complete: ${output}`);
