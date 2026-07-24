import { access, copyFile, mkdtemp, mkdir, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(toolDir, "../..");
const manifest = resolve(toolDir, "minotaur-boss.asset.json");
const outputFlag = process.argv.indexOf("--output");
const requestedOutput = outputFlag >= 0 ? process.argv[outputFlag + 1] : null;
const output = requestedOutput ? resolve(requestedOutput) : await mkdtemp(resolve(tmpdir(), "wardens-minotaur-"));
const blender = process.env.BLENDER_BIN || "/home/merrik/apps/blender-5.2.0-linux-x64/blender";
const extractedAseprite = "/tmp/squashfs-root/AppRun";
const aseprite = process.env.ASEPRITE_BIN || (existsSync(extractedAseprite) ? extractedAseprite : "/home/merrik/apps/Aseprite_1.3.17.2-x64.AppImage");
const dryRun = process.argv.includes("--dry-run");
const promote = process.argv.includes("--promote");
const skipBlender = process.argv.includes("--skip-blender");

await mkdir(output, { recursive: true });

function run(label, command, args) {
  console.log(`${label}: ${command} ${args.join(" ")}`);
  if (dryRun) return;
  const result = spawnSync(command, args, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.status !== 0 || /Traceback \(most recent call last\):/.test(result.stderr || "")) {
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}`);
  }
}

if (!skipBlender) {
  run("Blender minotaur generation", blender, [
    "--background",
    "--factory-startup",
    "--python",
    resolve(toolDir, "generate_minotaur_boss.py"),
    "--",
    "--manifest",
    manifest,
    "--output",
    output,
  ]);
}
if (!dryRun) await access(resolve(output, "minotaur_boss.build-report.json"));

if (!dryRun) {
  const report = JSON.parse(await readFile(resolve(output, "minotaur_boss.build-report.json"), "utf8"));
  if (report.atlas?.file) {
    for (const sheet of report.atlas?.sheets || []) {
      const base = `minotaur_${sheet.variant}_${sheet.action}_8dir_${sheet.frames}f`;
      const rawSheet = resolve(output, `raw_${base}.png`);
      run("Minotaur atlas crop", "convert", [
        resolve(output, report.atlas.file),
        "-crop",
        `${sheet.width}x${sheet.height}+${sheet.x}+${sheet.y}`,
        "+repage",
        rawSheet,
      ]);
      run("Minotaur crop alpha guard", "convert", [
        rawSheet,
        "-alpha",
        "set",
        "-region",
        `${sheet.width}x8+0+0`,
        "-channel",
        "A",
        "-evaluate",
        "set",
        "0",
        "+channel",
        rawSheet,
      ]);
    }
  }
}

run("Aseprite minotaur assembly", aseprite, [
  "--batch",
  "-script-param",
  `manifest=${manifest}`,
  "-script-param",
  `input=${output}`,
  "-script-param",
  `output=${output}`,
  "--script",
  resolve(toolDir, "compose_minotaur_boss.lua"),
]);
run("Minotaur pipeline validation", process.execPath, [resolve(toolDir, "validate-minotaur-pipeline.js"), "--manifest", manifest, "--output", output]);

if (promote && !dryRun) {
  const runtimeDir = resolve(repoRoot, "assets/images/enemies/minotaur");
  const asepriteDir = resolve(repoRoot, "art/aseprite/minotaur_boss");
  const blenderDir = resolve(repoRoot, "art/blender/minotaur_boss");
  await Promise.all([mkdir(runtimeDir, { recursive: true }), mkdir(asepriteDir, { recursive: true }), mkdir(blenderDir, { recursive: true })]);
  const files = await readdir(output);
  const asepriteFiles = await readdir(resolve(output, "aseprite"));
  await Promise.all([
    copyFile(resolve(output, "minotaur_boss.generated.blend"), resolve(blenderDir, "minotaur_boss.generated.blend")),
    copyFile(resolve(output, "minotaur_boss.build-report.json"), resolve(blenderDir, "minotaur_boss.build-report.json")),
    copyFile(manifest, resolve(runtimeDir, "minotaur_boss_sheets.json")),
    ...files
      .filter((file) => /^minotaur_.*_8dir_\df\.png$/.test(file))
      .map((file) => copyFile(resolve(output, file), resolve(runtimeDir, file))),
    ...asepriteFiles
      .filter((file) => /^minotaur_.*_8dir_\df\.aseprite$/.test(file))
      .map((file) => copyFile(resolve(output, "aseprite", file), resolve(asepriteDir, file))),
  ]);
  console.log(`Promoted reviewed minotaur outputs into ${runtimeDir}`);
}

console.log(`Minotaur build complete: ${output}`);
