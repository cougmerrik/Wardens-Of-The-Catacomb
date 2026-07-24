import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(toolDir, "../..");
const outputDir = resolve(repoRoot, "assets/images/enemies/statue");
const cellSize = 128;
const rows = 8;

const sheets = [
  { action: "dormant", frames: 1 },
  { action: "idle", frames: 4 },
  { action: "walk", frames: 6 },
  { action: "attack", frames: 6 },
  { action: "hurt", frames: 4 },
  { action: "death", frames: 8 },
];

const colors = {
  shadow: "#202329",
  stoneDark: "#53575f",
  stone: "#777b82",
  stoneLight: "#a5a8ad",
  crack: "#30333a",
  eye: "#ff3434",
  eyeGlow: "rgba(255, 52, 52, 0.35)",
  spearWood: "#6a523b",
  spearTip: "#c7ccd5",
  spearDark: "#33373f",
};

function rect(x, y, w, h, fill) {
  return `<rect x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(w)}" height="${Math.round(h)}" fill="${fill}"/>`;
}

function polygon(points, fill) {
  return `<polygon points="${points.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join(" ")}" fill="${fill}"/>`;
}

function ellipse(cx, cy, rx, ry, fill, opacity = 1) {
  return `<ellipse cx="${Math.round(cx)}" cy="${Math.round(cy)}" rx="${Math.round(rx)}" ry="${Math.round(ry)}" fill="${fill}" opacity="${opacity}"/>`;
}

function directionPose(row) {
  const angle = row * Math.PI / 4;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const side = dx < -0.38 ? -1 : dx > 0.38 ? 1 : 0;
  const rear = dy < -0.38;
  const front = dy > 0.38;
  const widthScale = side ? 0.84 : 1;
  return { dx, dy, side, rear, front, widthScale };
}

function actionPose(action, frame, frameCount) {
  const phase = frameCount > 1 ? frame / frameCount : 0;
  if (action === "walk") {
    const step = Math.sin(phase * Math.PI * 2);
    return { bob: Math.abs(step) * 3, arm: step * 4, leg: step * 5, spear: step * 2 };
  }
  if (action === "attack") {
    const windup = frame <= 1 ? -8 : frame <= 3 ? 10 : 2;
    return { bob: frame === 3 ? 2 : 0, arm: windup, leg: 0, spear: windup * 1.4, attack: frame };
  }
  if (action === "hurt") return { bob: frame % 2 ? -2 : 0, arm: -3, leg: 0, spear: -4, hurt: frame };
  if (action === "death") return { death: frame / Math.max(1, frameCount - 1) };
  if (action === "idle") return { bob: Math.sin(phase * Math.PI * 2) * 1.2, arm: 0, leg: 0, spear: 0 };
  return { bob: 0, arm: 0, leg: 0, spear: 0, dormant: true };
}

function drawStatue(x0, y0, row, action, frame, frameCount) {
  const dir = directionPose(row);
  const pose = actionPose(action, frame, frameCount);
  const parts = [];
  const cx = x0 + cellSize * 0.5;
  const ground = y0 + 101;
  const death = pose.death || 0;
  const crouch = death * 38;
  const lean = death * (dir.side || 1) * 13 + (pose.hurt ? (dir.side || 1) * 4 : 0);
  const y = ground - (pose.bob || 0) + crouch;
  const bodyW = 25 * dir.widthScale + death * 10;
  const headW = 15 * dir.widthScale;
  const bodyTop = y - 54 + death * 20;
  const bodyBottom = y - 23 + death * 11;
  const hiddenByDeath = death > 0.88;

  parts.push(ellipse(cx + lean, ground + 4, 27, 8, "rgba(0, 0, 0, 0.35)"));

  if (death > 0.72) {
    parts.push(rect(cx - 24, ground - 8, 28, 10, colors.stoneDark));
    parts.push(rect(cx + 3, ground - 13, 21, 11, colors.stone));
    parts.push(rect(cx - 8, ground - 22, 18, 12, colors.stoneLight));
    parts.push(rect(cx - 23, ground - 18, 5, 17, colors.spearWood));
    parts.push(polygon([[cx - 25, ground - 21], [cx - 18, ground - 18], [cx - 24, ground - 13]], colors.spearTip));
    return parts.join("");
  }

  const legSpread = 8 + Math.abs(pose.leg || 0) * 0.3;
  parts.push(rect(cx - legSpread + lean * 0.2, y - 23, 8, 24 - death * 8, colors.stoneDark));
  parts.push(rect(cx + legSpread - 8 + lean * 0.2, y - 23, 8, 24 - death * 8, colors.stoneDark));
  parts.push(rect(cx - legSpread - 2 + Math.max(0, pose.leg || 0), y - 2, 13, 5, colors.shadow));
  parts.push(rect(cx + legSpread - 10 - Math.min(0, pose.leg || 0), y - 2, 13, 5, colors.shadow));

  parts.push(polygon([
    [cx - bodyW * 0.55 + lean, bodyBottom],
    [cx - bodyW * 0.78 + lean, bodyTop + 9],
    [cx - bodyW * 0.35 + lean, bodyTop],
    [cx + bodyW * 0.42 + lean, bodyTop],
    [cx + bodyW * 0.78 + lean, bodyTop + 9],
    [cx + bodyW * 0.55 + lean, bodyBottom],
  ], colors.stone));
  parts.push(polygon([
    [cx - bodyW * 0.22 + lean, bodyTop + 5],
    [cx + bodyW * 0.3 + lean, bodyTop + 3],
    [cx + bodyW * 0.42 + lean, bodyBottom - 4],
    [cx - bodyW * 0.12 + lean, bodyBottom - 2],
  ], colors.stoneLight));
  parts.push(rect(cx - 4 + lean, bodyTop + 9, 3, 20, colors.crack));
  parts.push(rect(cx + 4 + lean, bodyTop + 18, 10, 2, colors.crack));

  const shoulderY = bodyTop + 6;
  const armSwing = pose.arm || 0;
  parts.push(rect(cx - bodyW * 0.9 + lean, shoulderY + Math.max(0, armSwing * 0.25), 9, 25, colors.stoneDark));
  parts.push(rect(cx + bodyW * 0.65 + lean, shoulderY + Math.max(0, -armSwing * 0.25), 9, 25, colors.stoneDark));
  parts.push(rect(cx - bodyW * 0.98 + lean, shoulderY - 3, 12, 9, colors.stoneLight));
  parts.push(rect(cx + bodyW * 0.62 + lean, shoulderY - 3, 12, 9, colors.stoneLight));

  const spearSide = dir.side || 1;
  const spearTilt = (pose.spear || 0) + (dir.front ? 4 : dir.rear ? -4 : 0);
  const spearX = cx + spearSide * (22 - death * 6) + lean;
  const spearTop = y - 73 - Math.max(0, spearTilt);
  const spearBottom = y - 6 + Math.min(0, spearTilt);
  if (!pose.dormant || row === 0 || row === 4) {
    parts.push(polygon([
      [spearX - 2, spearBottom],
      [spearX + 2, spearBottom],
      [spearX + 4 + spearTilt * 0.12, spearTop],
      [spearX + spearTilt * 0.12, spearTop],
    ], colors.spearWood));
    parts.push(polygon([
      [spearX + 2 + spearTilt * 0.12, spearTop - 13],
      [spearX + 10 + spearTilt * 0.12, spearTop],
      [spearX - 6 + spearTilt * 0.12, spearTop],
    ], colors.spearTip));
    parts.push(rect(spearX - 2 + spearTilt * 0.12, spearTop, 7, 4, colors.spearDark));
  }

  const headY = bodyTop - 15 + death * 9;
  parts.push(rect(cx - headW * 0.5 + lean, headY, headW, 15, colors.stoneDark));
  parts.push(rect(cx - headW * 0.34 + lean, headY + 2, headW * 0.68, 10, colors.stoneLight));
  if (!dir.rear && !hiddenByDeath) {
    parts.push(ellipse(cx - 4 * dir.widthScale + lean, headY + 7, 3, 3, colors.eyeGlow, pose.dormant ? 0.45 : 0.72));
    parts.push(ellipse(cx + 4 * dir.widthScale + lean, headY + 7, 3, 3, colors.eyeGlow, pose.dormant ? 0.45 : 0.72));
    parts.push(rect(cx - 5 * dir.widthScale + lean, headY + 6, 3, 3, colors.eye));
    parts.push(rect(cx + 3 * dir.widthScale + lean, headY + 6, 3, 3, colors.eye));
  }

  if (pose.hurt) {
    parts.push(rect(cx - 16 + lean, headY - 6, 6, 3, "#d7dade"));
    parts.push(rect(cx + 15 + lean, bodyTop + 3, 4, 4, "#d7dade"));
  }

  return parts.join("");
}

function renderSheet(sheet) {
  const width = sheet.frames * cellSize;
  const height = rows * cellSize;
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let frame = 0; frame < sheet.frames; frame += 1) {
      cells.push(drawStatue(frame * cellSize, row * cellSize, row, sheet.action, frame, sheet.frames));
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">
<rect width="${width}" height="${height}" fill="none"/>
${cells.join("\n")}
</svg>
`;
}

await mkdir(outputDir, { recursive: true });

const manifest = {
  schemaVersion: 1,
  asset: "statue_enemy",
  source: "Blender-to-Aseprite accepted sprite contract",
  frame: { width: cellSize, height: cellSize },
  directionRows: ["E", "SE", "S", "SW", "W", "NW", "N", "NE"],
  actions: sheets.map(({ action, frames }) => ({ action, frames, loop: action === "idle" || action === "walk" })),
  visual: {
    body: "grey flat-shaded statue",
    eyes: "red",
    weapon: "spear"
  }
};

for (const sheet of sheets) {
  const base = `statue_enemy_${sheet.action}_8dir_${sheet.frames}f`;
  const svg = renderSheet(sheet);
  const svgPath = resolve(outputDir, `${base}.svg`);
  const pngPath = resolve(outputDir, `${base}.png`);
  await writeFile(svgPath, svg);
  const result = spawnSync("convert", ["-background", "none", svgPath, pngPath], { encoding: "utf8" });
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`convert failed for ${base}`);
  }
}

await writeFile(resolve(outputDir, "statue_enemy_sheets.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated statue enemy sheets in ${outputDir}`);
