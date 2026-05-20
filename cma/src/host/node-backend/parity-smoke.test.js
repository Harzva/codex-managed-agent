const assert = require("assert/strict");
const http = require("http");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { createNodeBackendServer, readCodexInventory } = require("./server");

const FIXTURE_NOW = 1713390000;

const fixtureThreads = [
  {
    id: "thread-alpha",
    title: "Alpha dashboard work",
    cwd: "/tmp/workspace",
    created_at: FIXTURE_NOW - 3600,
    updated_at: FIXTURE_NOW - 120,
    model_provider: "openai",
    model: "gpt-5.4",
    reasoning_effort: "medium",
    sandbox_policy: "{\"mode\":\"workspace-write\"}",
    approval_mode: "never",
    tokens_used: 1234,
    rollout_path: "/tmp/thread-alpha.jsonl",
    storage_bytes: 2048,
    preview_logs: [{ ts: FIXTURE_NOW - 60, message: "ready" }],
    history: [{ role: "user", content: "continue" }],
    logs: [{ ts: FIXTURE_NOW - 60, level: "INFO", message: "ready" }],
    user_command_count: 1,
    assistant_message_count: 2,
    rollout_user_message_count: 1,
    tool_call_count: 3,
    tool_call_counts: [
      { name: "exec_command", count: 2 },
      { name: "apply_patch", count: 1 },
    ],
    git_branch: "main",
    git_branch_status: "known",
    git_branch_error: null,
    git_has_remote: true,
    git_remote_name: "origin",
    lifecycle: {
      state: "completed",
      attention: "completed",
      reason: "Recent tail contains an explicit task_complete marker.",
      last_marker: "event:task_complete:",
      recent_markers: ["event:task_started:", "event:task_complete:"],
      recent_tools: ["exec_command"],
      last_event_at: "2026-05-07T12:00:00.000Z",
    },
  },
];

const fixtureUsageReport = {
  summary: { total_tokens: 1234 },
  activity: {},
  analysis_views: [],
  recent_token_days: [],
  token_top_threads: [],
  keywords: [],
  guidance: [],
};
const fixtureActiveCodex = {
  ok: true,
  command: "codex",
  path: "/usr/local/bin/codex",
  version: "0.128.0",
  source: "path+version",
  checkedAt: "2026-05-07T10:00:00.000Z",
};
const fixtureCodexInventory = {
  ok: true,
  command: "codex",
  activePath: "/usr/local/bin/codex",
  checkedAt: "2026-05-07T10:00:00.100Z",
  items: [
    {
      ok: true,
      command: "codex",
      path: "/usr/local/bin/codex",
      source: "active",
      installSource: "system",
      installSourceTags: ["system"],
      checkedAt: "2026-05-07T10:00:00.100Z",
      version: "0.128.0",
    },
    {
      ok: true,
      command: "codex",
      path: "/usr/bin/codex",
      source: "candidate",
      installSource: "system",
      installSourceTags: ["system"],
      checkedAt: "2026-05-07T10:00:00.100Z",
      version: "0.118.0",
    },
  ],
};
const fixtureWatchlist = {
  version: 1,
  updatedAt: "2026-05-07T12:00:00.000Z",
  items: [
    {
      kind: "thread",
      id: "thread-alpha",
      title: "Alpha dashboard work",
      auto_continue: {
        enabled: true,
        max_count: 2,
        remaining_count: 2,
        consumed_count: 0,
        prompt: "continue",
      },
    },
    { kind: "task", id: "task-alpha", title: "Alpha task" },
  ],
};

function requiredKeys(object, keys) {
  keys.forEach((key) => {
    assert.ok(Object.prototype.hasOwnProperty.call(object, key), `missing key: ${key}`);
  });
}

function getJson(baseUrl, pathname) {
  return new Promise((resolve, reject) => {
    http.get(`${baseUrl}${pathname}`, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        } catch (error) {
          reject(error);
        }
      });
    }).on("error", reject);
  });
}

async function withFixtureServer(run) {
  const server = createNodeBackendServer({
    now: FIXTURE_NOW,
    listThreads: () => fixtureThreads,
    readUsageReport: () => fixtureUsageReport,
    readActiveCodex: () => fixtureActiveCodex,
    readCodexInventory: () => fixtureCodexInventory,
    readWatchlist: () => fixtureWatchlist,
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("fixture smoke covers Node backend parity endpoints", async () => {
  await withFixtureServer(async (baseUrl) => {
    const health = await getJson(baseUrl, "/api/health");
    assert.equal(health.statusCode, 200);
    requiredKeys(health.body, ["ok", "status", "backendMode", "backendSource", "readOnly", "capabilities"]);
    assert.equal(health.body.ok, true);
    assert.equal(health.body.backendMode, "node");
    assert.equal(health.body.backendSource, "local");
    assert.equal(health.body.readOnly, false);
    assert.deepEqual(health.body.capabilities, {
      threads: true,
      threadDetail: true,
      insights: true,
      scanSessions: true,
      lifecycle: true,
      watch: true,
      rename: false,
      hardDelete: false,
    });

    const threads = await getJson(baseUrl, "/api/threads?include_logs=true&include_history=true&scope=live");
    assert.equal(threads.statusCode, 200);
    requiredKeys(threads.body, ["meta", "items"]);
    requiredKeys(threads.body.meta, ["now", "now_iso", "total", "limit", "offset", "sort", "counts", "soft_deleted_total", "backendMode", "readOnly"]);
    assert.equal(threads.body.meta.backendMode, "node");
    assert.equal(threads.body.meta.readOnly, false);
    assert.equal(threads.body.items.length, 1);
    requiredKeys(threads.body.items[0], [
      "id",
      "title",
      "cwd",
      "status",
      "created_at",
      "updated_at",
      "model_provider",
      "model",
      "reasoning_effort",
      "tokens_used",
      "storage_bytes",
      "storage_label",
      "process",
      "preview_logs",
      "history",
      "tool_call_count",
      "tool_call_counts",
      "git_branch",
      "git_branch_status",
      "git_branch_error",
      "git_has_remote",
      "git_remote_name",
    ]);
    assert.equal(threads.body.items[0].tool_call_count, 3);
    assert.deepEqual(threads.body.items[0].tool_call_counts, [
      { name: "exec_command", count: 2 },
      { name: "apply_patch", count: 1 },
    ]);
    assert.equal(threads.body.items[0].git_branch, "main");
    assert.equal(threads.body.items[0].git_branch_status, "known");
    assert.equal(threads.body.items[0].git_has_remote, true);
    assert.equal(threads.body.items[0].git_remote_name, "origin");

    const detail = await getJson(baseUrl, "/api/thread/thread-alpha");
    assert.equal(detail.statusCode, 200);
    requiredKeys(detail.body, ["meta", "thread", "logs", "hint_commands"]);
    requiredKeys(detail.body.thread, ["id", "title", "history", "tokens_used", "sandbox_policy", "tool_call_count", "tool_call_counts", "git_branch", "git_branch_status", "git_branch_error", "git_has_remote", "git_remote_name"]);
    assert.equal(detail.body.thread.tool_call_count, 3);
    assert.deepEqual(detail.body.thread.tool_call_counts, [
      { name: "exec_command", count: 2 },
      { name: "apply_patch", count: 1 },
    ]);
    requiredKeys(detail.body.hint_commands, ["resume", "fork"]);

    const insights = await getJson(baseUrl, "/api/insights/report");
    assert.equal(insights.statusCode, 200);
    requiredKeys(insights.body, ["summary", "activity", "analysis_views", "recent_token_days", "token_top_threads", "keywords", "guidance"]);

    const activeCodex = await getJson(baseUrl, "/api/codex/active");
    assert.equal(activeCodex.statusCode, 200);
    requiredKeys(activeCodex.body, ["ok", "command", "path", "version", "source", "checkedAt"]);
    assert.equal(activeCodex.body.ok, true);
    assert.equal(activeCodex.body.command, "codex");
    assert.equal(activeCodex.body.path, "/usr/local/bin/codex");
    assert.equal(activeCodex.body.version, "0.128.0");

    const inventory = await getJson(baseUrl, "/api/codex/inventory");
    assert.equal(inventory.statusCode, 200);
    requiredKeys(inventory.body, ["ok", "command", "activePath", "checkedAt", "items"]);
    assert.equal(inventory.body.ok, true);
    assert.equal(inventory.body.command, "codex");
    assert.equal(inventory.body.activePath, "/usr/local/bin/codex");
    assert.equal(Array.isArray(inventory.body.items), true);
    assert.equal(inventory.body.items.length, 2);
    requiredKeys(inventory.body.items[0], ["ok", "command", "path", "source", "checkedAt"]);
    requiredKeys(inventory.body.items[0], ["installSource", "installSourceTags"]);
    requiredKeys(inventory.body.items[1], ["installSource", "installSourceTags"]);
    assert.equal(inventory.body.items[0].installSource, "system");
    assert.equal(inventory.body.items[1].installSource, "system");
    assert.equal(inventory.body.items[0].installSourceTags.includes("system"), true);
    assert.equal(inventory.body.items[1].installSourceTags.includes("system"), true);

    const watch = await getJson(baseUrl, "/api/watch");
    assert.equal(watch.statusCode, 200);
    requiredKeys(watch.body, ["ok", "backendMode", "backendSource", "readOnly", "surface", "generatedAt", "meta", "items"]);
    assert.equal(watch.body.ok, true);
    assert.equal(watch.body.surface, "watch");
    assert.equal(watch.body.readOnly, true);
    assert.equal(watch.body.meta.policy.remoteWriteActionsRequireAuth, true);
    assert.equal(watch.body.meta.policy.autoContinueDefaultEnabled, false);
    assert.equal(watch.body.meta.policy.autoContinueRequiresExplicitTaskComplete, true);
    assert.equal(watch.body.meta.policy.autoContinueRequiresFiniteCount, true);
    assert.equal(watch.body.meta.watchlist.configured, true);
    assert.deepEqual(watch.body.meta.watchlist.threadIds, ["thread-alpha"]);
    assert.deepEqual(watch.body.meta.watchlist.taskIds, ["task-alpha"]);
    assert.deepEqual(watch.body.meta.watchlist.unsupportedTaskIds, ["task-alpha"]);
    assert.equal(watch.body.items.length, 1);
    requiredKeys(watch.body.items[0], ["kind", "id", "title", "lifecycle", "process", "auto_continue", "actions"]);
    assert.equal(watch.body.items[0].kind, "thread");
    assert.equal(watch.body.items[0].id, "thread-alpha");
    assert.equal(watch.body.items[0].actions.readOnly, true);
    assert.equal(watch.body.items[0].actions.writeActionsRequireAuth, true);
    assert.equal(watch.body.items[0].auto_continue.enabled, true);
    assert.equal(watch.body.items[0].auto_continue.max_count, 2);
    assert.equal(watch.body.items[0].auto_continue.remaining_count, 2);
    assert.equal(watch.body.items[0].auto_continue.requires_explicit_task_complete, true);
    assert.equal(watch.body.items[0].auto_continue.requires_finite_count, true);
    assert.equal(watch.body.items[0].auto_continue.launchable, true);
    assert.match(watch.body.items[0].auto_continue.current_completed_turn_signature, /^event:task_complete:/);
  });
});

test("readCodexInventory captures mixed active/stale versions and unreadable paths", () => {
  const originalSpawnSync = childProcess.spawnSync;
  const originalRealpathSync = fs.realpathSync;
  const lookupCommand = process.platform === "win32" ? "where" : "which";
  const exeName = process.platform === "win32" ? "codex.cmd" : "codex";
  const pathSep = process.platform === "win32" ? ";" : ":";
  const localPath = process.platform === "win32"
    ? path.join(os.homedir(), "AppData", "Roaming", "npm", "codex.cmd")
    : `${os.homedir()}/.local/bin/codex`;
  const userPath = process.platform === "win32" ? "C:\\Program Files\\Codex\\codex.exe" : "/usr/local/bin/codex";
  const systemPath = process.platform === "win32" ? "C:\\ProgramData\\Codex\\codex.exe" : "/usr/bin/codex";
  const workspacePath = path.join(process.cwd(), "node_modules", ".bin", exeName);
  const calls = [];

  childProcess.spawnSync = (command, args) => {
    calls.push({ command: String(command || ""), args: Array.isArray(args) ? args.slice() : [] });
    if (command === lookupCommand) {
      return {
        status: 0,
        stdout: `${userPath}\n${systemPath}\n${localPath}\n${workspacePath}\n`,
        stderr: "",
      };
    }
    if ([userPath, systemPath, localPath, workspacePath].includes(String(command)) && Array.isArray(args) && args[0] === "--version") {
      if (command === userPath) {
        return { status: 0, stdout: "codex 0.128.0", stderr: "", };
      }
      if (command === systemPath) {
        return { status: 0, stdout: "codex 0.118.0", stderr: "", };
      }
      if (command === localPath) {
        return { status: 1, stdout: "", stderr: "permission denied", };
      }
      return { status: 1, stdout: "", stderr: "not executable", };
    }
    return { status: 1, stdout: "", stderr: "unexpected command", };
  };
  fs.realpathSync = (value) => String(value || "");

  try {
    const inventory = readCodexInventory({
      command: "codex",
      env: { PATH: [path.dirname(userPath), path.dirname(systemPath), path.dirname(localPath)].join(pathSep) },
    });
    assert.equal(inventory.ok, true);
    assert.equal(inventory.activePath, userPath);
    assert.equal(inventory.items.length >= 2, true);

    const activeItem = inventory.items.find((item) => item.path === inventory.activePath);
    const staleItemExists = inventory.items.some((item) => item.version === "0.118.0");
    const unreadableItemExists = inventory.items.some((item) => item.ok === false && /permission denied|not executable/.test(item.error || ""));

    assert.equal(Boolean(activeItem && activeItem.ok), true);
    assert.equal(staleItemExists, true);
    assert.equal(activeItem.version, "0.128.0");
    assert.equal(unreadableItemExists, true);
    assert.equal(calls.some((call) => call.command === lookupCommand), true);
  } finally {
    childProcess.spawnSync = originalSpawnSync;
    fs.realpathSync = originalRealpathSync;
  }
});
