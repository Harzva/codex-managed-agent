import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(desktopRoot, "..");
const vsixHost = path.join(repoRoot, "cma", "src", "host");
const desktopVendor = path.join(desktopRoot, "vendor");

const copyGroups = [
  {
    from: path.join(vsixHost, "node-backend"),
    to: path.join(desktopVendor, "cma-node-backend"),
    files: [
      "node-backend.test.js",
      "parity-smoke.test.js",
      "server.js",
      "session-git.js",
      "session-lifecycle.js",
      "session-store.js",
      "session-worker-pool.js",
      "session-worker.js",
      "usage-report.js",
    ],
  },
  {
    from: vsixHost,
    to: desktopVendor,
    files: [
      "platform-runtime.js",
    ],
  },
];

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  return path.relative(repoRoot, target).replaceAll(path.sep, "/");
}

const copied = [];
for (const group of copyGroups) {
  for (const file of group.files) {
    const source = path.join(group.from, file);
    const target = path.join(group.to, file);
    if (!fs.existsSync(source)) {
      throw new Error(`Missing VSIX host source: ${path.relative(repoRoot, source)}`);
    }
    copied.push(copyFile(source, target));
  }
}

console.log(`Synced ${copied.length} VSIX host files into desktop vendor:`);
for (const file of copied) {
  console.log(`- ${file}`);
}
