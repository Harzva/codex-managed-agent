import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(desktopRoot, "..");
const vsixHost = path.join(repoRoot, "cma", "src", "host");
const desktopVendor = path.join(desktopRoot, "vendor");

const pairs = [
  ["node-backend/node-backend.test.js", "cma-node-backend/node-backend.test.js"],
  ["node-backend/parity-smoke.test.js", "cma-node-backend/parity-smoke.test.js"],
  ["node-backend/server.js", "cma-node-backend/server.js"],
  ["node-backend/session-git.js", "cma-node-backend/session-git.js"],
  ["node-backend/session-lifecycle.js", "cma-node-backend/session-lifecycle.js"],
  ["node-backend/session-store.js", "cma-node-backend/session-store.js"],
  ["node-backend/session-worker-pool.js", "cma-node-backend/session-worker-pool.js"],
  ["node-backend/session-worker.js", "cma-node-backend/session-worker.js"],
  ["node-backend/usage-report.js", "cma-node-backend/usage-report.js"],
  ["account-http.js", "account-http.js"],
  ["account-manager.js", "account-manager.js"],
  ["account-manager.test.js", "account-manager.test.js"],
  ["account-usage.js", "account-usage.js"],
  ["platform-runtime.js", "platform-runtime.js"],
  ["usage-ledger.js", "usage-ledger.js"],
];

function readNormalized(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

const mismatches = [];
for (const [sourceRel, targetRel] of pairs) {
  const source = path.join(vsixHost, sourceRel);
  const target = path.join(desktopVendor, targetRel);
  if (!fs.existsSync(source) || !fs.existsSync(target)) {
    mismatches.push(`${sourceRel} -> ${targetRel}: missing file`);
    continue;
  }
  if (readNormalized(source) !== readNormalized(target)) {
    mismatches.push(`${sourceRel} -> ${targetRel}: content differs`);
  }
}

if (mismatches.length) {
  console.error("Desktop vendor is out of sync with cma/src/host:");
  for (const mismatch of mismatches) {
    console.error(`- ${mismatch}`);
  }
  console.error("Run: npm run sync:vsix-host");
  process.exit(1);
}

console.log(`Desktop vendor parity OK (${pairs.length} files).`);
