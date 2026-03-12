import { readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { spawnSync } from "node:child_process";

function collectJsFiles(dir, acc = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".git") continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) collectJsFiles(full, acc);
    else if (extname(full) === ".js") acc.push(full);
  }
  return acc;
}

const files = collectJsFiles(process.cwd());
let failed = 0;
for (const file of files) {
  const res = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (res.status !== 0) failed += 1;
}

if (failed > 0) {
  console.error(`node --check failed for ${failed} file(s)`);
  process.exit(1);
}
console.log(`node --check passed for ${files.length} file(s)`);