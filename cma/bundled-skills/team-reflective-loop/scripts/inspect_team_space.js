#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function readJson(filePath, fallback = null) {
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
      .map((name) => readJson(path.join(dirPath, name)))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function tailJsonl(filePath, limit = 8) {
  try {
    return fs.readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-limit)
      .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

const workspace = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const root = path.join(workspace, ".codex-team");
const tasks = listJson(path.join(root, "tasks"));
const agents = listJson(path.join(root, "agents"));
const events = tailJsonl(path.join(root, "events", "events.jsonl"));
const summary = tasks.reduce((acc, task) => {
  const status = String(task.status || "unknown");
  acc[status] = (acc[status] || 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({
  workspace,
  team_available: fs.existsSync(root),
  team_space: readJson(path.join(root, "team-space.json"), null),
  task_count: tasks.length,
  task_status: summary,
  agent_count: agents.length,
  agents: agents.map((agent) => ({
    agent_id: agent.agent_id,
    state: agent.state,
    current_task_id: agent.current_task_id || "",
    heartbeat_at: agent.heartbeat_at || "",
  })),
  recent_events: events,
}, null, 2));
