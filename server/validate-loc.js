import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REVIEW_THRESHOLD = 800;
const LARGE_GROWTH_REVIEW_THRESHOLD = 150;

function runGit(args) {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

function collectFiles() {
  const statusOutput = runGit(["status", "--porcelain=v1"]);
  const sets = [
    runGit(["diff", "--name-only", "main...HEAD"]),
    runGit(["diff", "--name-only"]),
    runGit(["diff", "--cached", "--name-only"]),
    runGit(["ls-files", "--others", "--exclude-standard"]),
    statusOutput
  ];
  const files = new Set();
  for (const output of sets) {
    for (const line of output.split(/\r?\n/)) {
      const trimmed = line.startsWith(" ") || line.startsWith("M") || line.startsWith("A") || line.startsWith("D") || line.startsWith("R") || line.startsWith("C") || line.startsWith("U")
        ? line.slice(3).trim()
        : line.trim();
      if (!trimmed) continue;
      const ext = extname(trimmed).toLowerCase();
      if ((trimmed.startsWith("src/") || trimmed.startsWith("server/")) && ext === ".js") {
        files.add(trimmed);
      }
    }
  }
  return [...files].sort();
}

function countLines(path) {
  const text = readFileSync(resolve(process.cwd(), path), "utf8");
  return text === "" ? 0 : text.split(/\r?\n/).length;
}

function getBaseLines(path) {
  const text = runGit(["show", `main:${path}`]);
  if (!text) return null;
  return text === "" ? 0 : text.split(/\r?\n/).length;
}

function main() {
  const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
  process.chdir(projectRoot);
  const files = collectFiles();
  const results = [];
  const advisories = [];
  for (const file of files) {
    try {
      const stats = statSync(resolve(process.cwd(), file));
      if (!stats.isFile()) continue;
      const lines = countLines(file);
      const baseLines = getBaseLines(file);
      const delta = baseLines == null ? lines : lines - baseLines;
      results.push({ file, lines, baseLines, delta });
      if (lines >= REVIEW_THRESHOLD || delta >= LARGE_GROWTH_REVIEW_THRESHOLD) {
        advisories.push({ file, lines, baseLines, delta, reason: "review module cohesion; LOC is advisory only" });
      }
    } catch {
      // ignore deleted or transient paths
    }
  }
  console.log(JSON.stringify({ checkedFiles: results, advisories }, null, 2));
}

main();
