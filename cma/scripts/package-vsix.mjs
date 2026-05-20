#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const publisherDir = join(root, "publisher");
const target = readTarget(process.argv.slice(2));
const vsceBin = join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "vsce.cmd" : "vsce",
);

if (!existsSync(vsceBin)) {
  console.error("Missing local vsce binary. Run npm ci or npm install in cma/ first.");
  process.exit(1);
}

mkdirSync(publisherDir, { recursive: true });

const outputName = target
  ? `codex-managed-agent-${packageJson.version}-${target}.vsix`
  : `codex-managed-agent-${packageJson.version}.vsix`;
const outputPath = join("publisher", outputName);
const packageArgs = ["package"];
if (target) {
  packageArgs.push("--target", target);
}
packageArgs.push("--out", outputPath);

const result =
  process.platform === "win32"
    ? spawnSync(
        process.env.ComSpec || "cmd.exe",
        ["/d", "/c", "call", vsceBin, ...packageArgs],
        { cwd: root, stdio: "inherit" },
      )
    : spawnSync(vsceBin, packageArgs, {
        cwd: root,
        stdio: "inherit",
      });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);

function readTarget(args) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = String(args[index] || "");
    if (arg === "--target") {
      const value = String(args[index + 1] || "").trim();
      if (!value) {
        console.error("Missing VS Code target after --target.");
        process.exit(1);
      }
      return value;
    }
    if (arg.startsWith("--target=")) {
      const value = arg.slice("--target=".length).trim();
      if (!value) {
        console.error("Missing VS Code target after --target=.");
        process.exit(1);
      }
      return value;
    }
  }
  return "";
}
