#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const VALID_STATES = new Set(["queued", "assigned", "running", "blocked", "review", "completed", "failed", "stale"]);

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return { __invalid: error.message };
  }
}

function validateTask(filePath) {
  const task = readJson(filePath);
  const errors = [];
  const id = path.basename(filePath, ".json");
  if (task.__invalid) errors.push(`invalid json: ${task.__invalid}`);
  if (!task.task_id) errors.push("task_id is required");
  if (task.task_id && task.task_id !== id) errors.push("task_id must match filename");
  if (!task.title) errors.push("title is required");
  if (!task.owner) errors.push("owner is required");
  if (!task.goal) errors.push("goal is required");
  if (!VALID_STATES.has(String(task.status || ""))) errors.push(`invalid status: ${task.status || ""}`);
  ["dependencies", "inputs", "acceptance_criteria", "artifacts"].forEach((field) => {
    if (!Array.isArray(task[field])) errors.push(`${field} must be an array`);
  });
  return errors.length ? { file: filePath, errors } : null;
}

const workspace = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const root = path.join(workspace, ".codex-team");
const tasksDir = path.join(root, "tasks");
const errors = [];
if (!fs.existsSync(root)) errors.push({ file: root, errors: ["team space is missing"] });
if (fs.existsSync(tasksDir)) {
  fs.readdirSync(tasksDir)
    .filter((name) => name.endsWith(".json"))
    .forEach((name) => {
      const result = validateTask(path.join(tasksDir, name));
      if (result) errors.push(result);
    });
}
console.log(JSON.stringify({ ok: errors.length === 0, workspace, errors }, null, 2));
process.exitCode = errors.length ? 1 : 0;
