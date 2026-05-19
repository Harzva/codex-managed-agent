#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const publisherDir = join(root, "publisher");
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

const outputPath = join("publisher", `codex-managed-agent-${packageJson.version}.vsix`);
const result =
  process.platform === "win32"
    ? spawnSync(
        process.env.ComSpec || "cmd.exe",
        ["/d", "/c", "call", vsceBin, "package", "--out", outputPath],
        { cwd: root, stdio: "inherit" },
      )
    : spawnSync(vsceBin, ["package", "--out", outputPath], {
        cwd: root,
        stdio: "inherit",
      });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
