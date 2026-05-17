#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function listJson(dirPath) {
  try {
    return fs.readdirSync(dirPath)
      .filter((name) => name.endsWith(".json"))
      .map((name) => readJson(path.join(dirPath, name), null))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function failureId(task, pattern) {
  return "failure-" + crypto.createHash("sha1").update(`${task.task_id}:${pattern}`).digest("hex").slice(0, 12);
}

const workspace = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const root = path.join(workspace, ".codex-team");
const bankPath = path.join(root, "failure_bank.json");
const bank = readJson(bankPath, { failures: [] });
const existing = new Set((bank.failures || []).map((item) => item.id));
const tasks = listJson(path.join(root, "tasks"));
const additions = [];

tasks.forEach((task) => {
  const status = String(task.status || "");
  const result = task.result || {};
  if (status === "blocked") {
    const pattern = `Blocked: ${task.last_error || (result && result.summary) || task.goal || task.title}`;
    const id = failureId(task, pattern);
    if (!existing.has(id)) additions.push({ id, created_at: new Date().toISOString(), pattern, avoid: "Add a local_patch or reassign with clearer acceptance criteria.", source_task_id: task.task_id });
  }
  if (status === "completed" && (!Array.isArray(result.checks_run) || result.checks_run.length === 0)) {
    const pattern = "Completed without checks_run evidence";
    const id = failureId(task, pattern);
    if (!existing.has(id)) additions.push({ id, created_at: new Date().toISOString(), pattern, avoid: "Require checks_run before supervisor accepts completion.", source_task_id: task.task_id });
  }
});

const next = { failures: [...(bank.failures || []), ...additions] };
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(bankPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ workspace, added: additions.length, failure_bank: bankPath, failures: next.failures }, null, 2));
