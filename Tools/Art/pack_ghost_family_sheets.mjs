import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const variants = ["hollow_ghost", "veiled_specter", "shackled_poltergeist"];
const directions = ["east", "southeast", "south", "southwest", "west", "northwest", "north", "northeast"];
const actions = {
  hover: { frames: 6, loop: true },
  move: { frames: 8, loop: true },
  primary_attack: { frames: 8, loop: false, hitFrame: 4 },
  siphon: { frames: 8, loop: true },
  hurt: { frames: 4, loop: false },
  death: { frames: 10, loop: false }
};
const passes = ["color", "shadow", "silhouette", "glow"];

function fail(message) {
  console.error(message);
  process.exit(2);
}

const [, , renderArg, outputArg, manifestArg] = process.argv;
if (!renderArg || !outputArg || !manifestArg) {
  fail("usage: node Tools/Art/pack_ghost_family_sheets.mjs <render-root> <new-sheet-dir> <new-manifest.json>");
}

const renderRoot = resolve(renderArg);
const outputRoot = resolve(outputArg);
const manifestPath = resolve(manifestArg);
if (!existsSync(renderRoot) || !statSync(renderRoot).isDirectory()) fail(`render root does not exist: ${renderRoot}`);
if (existsSync(manifestPath)) fail(`refusing to overwrite ${manifestPath}`);
if (existsSync(outputRoot) && readdirSync(outputRoot).length > 0) fail(`refusing to overwrite populated directory ${outputRoot}`);
mkdirSync(outputRoot, { recursive: true });

const sheets = [];
for (const variant of variants) {
  for (const [action, actionSpec] of Object.entries(actions)) {
    for (const pass of passes) {
      const inputs = [];
      for (const direction of directions) {
        for (let frame = 1; frame <= actionSpec.frames; frame++) {
          const input = join(renderRoot, variant, action, pass, `${direction}_${String(frame).padStart(2, "0")}.png`);
          if (!existsSync(input)) fail(`missing declared input ${input}`);
          inputs.push(input);
        }
      }
      const file = `${variant}_${action}_8dir_${actionSpec.frames}f_${pass}.png`;
      const output = join(outputRoot, file);
      const result = spawnSync("magick", [
        "montage",
        ...inputs,
        "-filter", "point",
        "-tile", `${actionSpec.frames}x8`,
        "-geometry", "128x128+0+0",
        "-background", "none",
        output
      ], { encoding: "utf8" });
      if (result.status !== 0) fail(`failed to pack ${file}: ${result.stderr || result.stdout}`);
      sheets.push({
        variant,
        action,
        pass,
        file,
        rows: directions.length,
        columns: actionSpec.frames,
        width: actionSpec.frames * 128,
        height: directions.length * 128
      });
    }
  }
}

const manifest = {
  schema: "wardens-ghost-sprite-family/v1",
  status: "raw-unindexed-prototype",
  sourceRenderRoot: renderRoot,
  outputRoot,
  variants,
  palettes: ["cold_haunt", "malignant_haunt"],
  directions,
  actions,
  passes,
  presentationFps: 10,
  rawFrameSize: [64, 64],
  cellSize: [128, 128],
  scale: { factor: 2, method: "nearest-neighbor" },
  pivot: [64, 104],
  worldLightRadius: 0,
  intentionalExceptions: [
    "Rear-facing and late-death glow cells may be fully transparent when the soul core is occluded.",
    "Sheets require indexed-palette and intentional-alpha cleanup before runtime integration."
  ],
  sheets
};

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ manifest: basename(manifestPath), sheets: sheets.length, outputRoot }, null, 2));
