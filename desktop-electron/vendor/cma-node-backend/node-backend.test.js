const assert = require("assert/strict");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { buildWatchSnapshot, createNodeBackendServer, requireWatchWriteAuth } = require("./server");
const {
  closeSessionWorkerPool,
  discoverSessionThreads,
  discoverSessionThreadsParallel,
  findSessionFiles,
  inferThreadLifecycleFromEvents,
  normalizeThreadDetail,
  normalizeThreadsResponse,
  readSessionIndex,
  readThreadState,
} = require("./session-store");

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
    preview_logs: [{ ts: FIXTURE_NOW - 60, message: "running" }],
    history: [{ role: "user", content: "continue" }],
    user_command_count: 1,
    assistant_message_count: 2,
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
  },
  {
    id: "thread-deleted",
    title: "Deleted thread",
    updated_at: FIXTURE_NOW - 900,
    soft_deleted: true,
  },
  {
    id: "thread-archived",
    title: "Archived thread",
    updated_at: FIXTURE_NOW - 600,
    archived: 1,
    status: "archived",
  },
];

function writeRolloutFixture(root) {
  const sessionsDir = path.join(root, "sessions", "2026", "04", "18");
  const projectDir = path.join(root, "project");
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.mkdirSync(projectDir, { recursive: true });
  const sessionId = "019d24c8-f967-7583-bba7-8b1c750b5aa0";
  const rolloutPath = path.join(sessionsDir, `rollout-2026-04-18T01-00-00-${sessionId}.jsonl`);
  const lines = [
    {
      timestamp: "2026-04-18T01:00:00.000Z",
      type: "session_meta",
      payload: {
        id: sessionId,
        timestamp: "2026-04-18T01:00:00.000Z",
        source: "cli",
        cwd: projectDir,
        model_provider: "openai",
        model: "gpt-5.4",
        reasoning_effort: "medium",
        sandbox_policy: { mode: "workspace-write" },
        approval_policy: "never",
        cli_version: "0.1.0",
      },
    },
    {
      timestamp: "2026-04-18T01:01:00.000Z",
      type: "turn_context",
      payload: {
        turn_id: "turn-alpha",
        model: "gpt-5.4",
        effort: "high",
        collaboration_mode: {
          settings: {
            model: "gpt-5.4-mini",
            reasoning_effort: "medium",
          },
        },
      },
    },
    {
      timestamp: "2026-04-18T01:01:10.000Z",
      type: "response_item",
      payload: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "Summarize the dashboard state" }],
      },
    },
    {
      timestamp: "2026-04-18T01:02:00.000Z",
      type: "response_item",
      payload: {
        type: "function_call",
        name: "exec_command",
      },
    },
    {
      timestamp: "2026-04-18T01:03:00.000Z",
      type: "response_item",
      payload: {
        type: "function_call",
        name: "exec_command",
      },
    },
    {
      timestamp: "2026-04-18T01:04:00.000Z",
      type: "response_item",
      payload: {
        type: "custom_tool_call",
        name: "apply_patch",
      },
    },
    {
      timestamp: "2026-04-18T01:05:00.000Z",
      type: "response_item",
      payload: {
        type: "web_search_call",
      },
    },
    {
      timestamp: "2026-04-18T01:06:00.000Z",
      type: "response_item",
      payload: {
        type: "function_call_output",
        name: "exec_command",
      },
    },
    {
      timestamp: "2026-04-18T01:07:00.000Z",
      type: "response_item",
      payload: {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "Used exec_command in prose only" }],
      },
    },
    {
      timestamp: "2026-04-18T01:07:30.000Z",
      type: "event_msg",
      payload: {
        type: "context_compacted",
        message: "Context compacted",
      },
    },
    {
      timestamp: "2026-04-18T01:08:00.000Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: { total_token_usage: { total_tokens: 4321 } },
      },
    },
  ];
  fs.writeFileSync(rolloutPath, `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`, "utf8");
  return { rolloutPath, sessionId, projectDir };
}

async function getJson(server, pathname) {
  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      http.get(`http://127.0.0.1:${port}${pathname}`, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        });
      }).on("error", reject);
    });
  }).finally(() => {
    server.close();
  });
}

function requestJson(baseUrl, method, pathname, body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request(`${baseUrl}${pathname}`, {
      method,
      headers: payload ? {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(payload),
      } : undefined,
    }, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => {
        responseBody += chunk;
      });
      res.on("end", () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(responseBody) });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

test("normalizes GET /api/threads Node backend shape", () => {
  const payload = normalizeThreadsResponse(fixtureThreads, {
    limit: "10",
    sort: "updated_desc",
    include_logs: "true",
    include_history: "true",
    scope: "live",
  }, { now: FIXTURE_NOW });

  assert.equal(typeof payload.meta.now, "number");
  assert.equal(payload.meta.backendMode, "node");
  assert.equal(payload.meta.readOnly, false);
  assert.equal(payload.meta.total, 1);
  assert.equal(payload.meta.soft_deleted_total, 1);
  assert.equal(payload.meta.counts.archived, 0);
  assert.equal(payload.items.length, 1);

  const [thread] = payload.items;
  assert.equal(thread.id, "thread-alpha");
  assert.equal(thread.status, "active");
  assert.equal(thread.archived, 0);
  assert.equal(thread.soft_deleted, false);
  assert.equal(thread.tokens_used, 1234);
  assert.equal(thread.tool_call_count, 3);
  assert.deepEqual(thread.tool_call_counts, [
    { name: "exec_command", count: 2 },
    { name: "apply_patch", count: 1 },
  ]);
  assert.equal(thread.git_branch, "main");
  assert.equal(thread.git_branch_status, "known");
  assert.equal(thread.git_has_remote, true);
  assert.equal(thread.git_remote_name, "origin");
  assert.equal(thread.storage_label, "2.0 KB");
  assert.deepEqual(thread.sandbox_policy, { mode: "workspace-write" });
  assert.equal(thread.preview_logs.length, 1);
  assert.equal(thread.history.length, 1);
  assert.ok(Object.prototype.hasOwnProperty.call(thread, "process"));
});

test("infers lifecycle state from bounded Codex markers", () => {
  const completed = inferThreadLifecycleFromEvents([
    { timestamp: "2026-04-18T01:00:00Z", type: "event_msg", payload: { type: "task_started" } },
    { timestamp: "2026-04-18T01:01:00Z", type: "response_item", payload: { type: "function_call", name: "exec_command" } },
    { timestamp: "2026-04-18T01:02:00Z", type: "event_msg", payload: { type: "task_complete" } },
  ]);
  assert.equal(completed.state, "completed");
  assert.equal(completed.attention, "completed");
  assert.deepEqual(completed.recent_tools, ["exec_command"]);

  const running = inferThreadLifecycleFromEvents([
    { timestamp: "2026-04-18T01:00:00Z", type: "event_msg", payload: { type: "task_started" } },
    { timestamp: "2026-04-18T01:01:00Z", type: "response_item", payload: { type: "function_call_output", name: "exec_command" } },
  ]);
  assert.equal(running.state, "running");
  assert.match(running.reason, /tool output/i);

  const needsAttention = inferThreadLifecycleFromEvents([
    { timestamp: "2026-04-18T01:00:00Z", type: "response_item", payload: { type: "message", role: "assistant", phase: "commentary", content: [{ type: "output_text", text: "Please confirm the target branch?" }] } },
  ]);
  assert.equal(needsAttention.state, "needs_attention");
  assert.equal(needsAttention.attention, "needs_attention");

  const queued = inferThreadLifecycleFromEvents([
    { timestamp: "2026-04-18T01:00:00Z", type: "event_msg", payload: { type: "user_message", message: "continue" } },
  ]);
  assert.equal(queued.state, "queued");

  const aborted = inferThreadLifecycleFromEvents([
    { timestamp: "2026-04-18T01:00:00Z", type: "event_msg", payload: { type: "turn_aborted" } },
  ]);
  assert.equal(aborted.state, "aborted");
});

test("normalizes thread scope semantics without relying on archived query flags", () => {
  const live = normalizeThreadsResponse(fixtureThreads, {
    scope: "live",
    limit: "20",
  }, { now: FIXTURE_NOW });
  assert.deepEqual(live.items.map((thread) => thread.id), ["thread-alpha"]);
  assert.equal(live.meta.counts.archived, 0);

  const all = normalizeThreadsResponse(fixtureThreads, {
    scope: "all",
    limit: "20",
  }, { now: FIXTURE_NOW });
  assert.deepEqual(all.items.map((thread) => thread.id), ["thread-alpha", "thread-archived", "thread-deleted"]);
  assert.equal(all.meta.counts.archived, 1);

  const softDeleted = normalizeThreadsResponse(fixtureThreads, {
    scope: "soft_deleted",
    limit: "20",
  }, { now: FIXTURE_NOW });
  assert.deepEqual(softDeleted.items.map((thread) => thread.id), ["thread-deleted"]);
});

test("normalizes GET /api/thread/{thread_id} Node backend shape", async () => {
  const payload = await normalizeThreadDetail({
    ...fixtureThreads[0],
    logs: [{ ts: FIXTURE_NOW - 60, ts_iso: "2024-04-17T20:19:00.000Z", level: "INFO", message: "ready" }],
  }, { now: FIXTURE_NOW });

  assert.equal(payload.meta.backendMode, "node");
  assert.equal(payload.meta.readOnly, false);
  assert.equal(payload.thread.id, "thread-alpha");
  assert.equal(payload.thread.history.length, 1);
  assert.equal(payload.thread.tool_call_count, 3);
  assert.deepEqual(payload.thread.tool_call_counts, [
    { name: "exec_command", count: 2 },
    { name: "apply_patch", count: 1 },
  ]);
  assert.equal(payload.thread.git_branch, "main");
  assert.equal(payload.thread.git_branch_status, "known");
  assert.equal(payload.thread.git_has_remote, true);
  assert.equal(payload.thread.git_remote_name, "origin");
  assert.equal(payload.logs.length, 1);
  assert.equal(payload.hint_commands.resume, "codex resume thread-alpha");
  assert.equal(payload.hint_commands.fork, "codex fork thread-alpha");
});

test("serves thread detail when the default store is async", async () => {
  const server = createNodeBackendServer({
    now: FIXTURE_NOW,
    listThreads: async () => fixtureThreads,
  });
  const response = await getJson(server, "/api/thread/thread-alpha");

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.thread.id, "thread-alpha");
});

test("persists local watch auto-continue count controls", async (t) => {
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "cma-watch-state-"));
  t.after(() => fs.rmSync(homeDir, { recursive: true, force: true }));
  const watchedThreads = [{
    ...fixtureThreads[0],
    lifecycle: {
      state: "completed",
      attention: "completed",
      reason: "Recent tail contains an explicit task_complete marker.",
      last_marker: "event:task_complete:",
      recent_markers: ["event:task_started:", "event:task_complete:"],
      recent_tools: ["exec_command"],
      last_event_at: "2026-05-07T12:00:00.000Z",
    },
  }];
  const server = createNodeBackendServer({
    now: FIXTURE_NOW,
    homeDir,
    listThreads: async () => watchedThreads,
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    const configured = await requestJson(baseUrl, "POST", "/api/watch/auto-continue", {
      kind: "thread",
      id: "thread-alpha",
      enabled: true,
      max_count: 3,
      remaining_count: 3,
      consumed_count: 0,
      prompt: "continue",
    });
    assert.equal(configured.statusCode, 200);
    assert.equal(configured.body.ok, true);
    assert.equal(configured.body.snapshot.items[0].auto_continue.launchable, true);
    assert.equal(configured.body.snapshot.items[0].auto_continue.max_count, 3);
    assert.equal(configured.body.snapshot.items[0].auto_continue.remaining_count, 3);

    const watchStatePath = path.join(homeDir, ".codex-managed-agent", "watchlist.json");
    const stored = JSON.parse(fs.readFileSync(watchStatePath, "utf8"));
    assert.equal(stored.items[0].id, "thread-alpha");
    assert.equal(stored.items[0].auto_continue.enabled, true);
    assert.equal(stored.items[0].auto_continue.max_count, 3);

    const reset = await requestJson(baseUrl, "POST", "/api/watch/auto-continue", {
      kind: "thread",
      id: "thread-alpha",
      max_count: 5,
      remaining_count: 1,
      consumed_count: 4,
      last_completed_turn_signature: "event:task_complete:@old",
      reset: true,
    });
    assert.equal(reset.statusCode, 200);
    const resetConfig = reset.body.watchlist.items[0].auto_continue;
    assert.equal(resetConfig.max_count, 5);
    assert.equal(resetConfig.remaining_count, 5);
    assert.equal(resetConfig.consumed_count, 0);
    assert.equal(resetConfig.last_completed_turn_signature, "");
    assert.equal(resetConfig.last_stop_reason, "reset");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("watch auto-continue reports explicit stop conditions", () => {
  const completedThread = {
    ...fixtureThreads[0],
    lifecycle: {
      state: "completed",
      attention: "completed",
      reason: "done",
      last_marker: "event:task_complete:",
      last_event_at: "2026-05-07T12:00:00.000Z",
    },
  };
  const runningThread = {
    ...completedThread,
    id: "thread-running",
    lifecycle: {
      state: "running",
      attention: "active",
      reason: "tool output",
      last_marker: "response:function_call_output:",
      last_event_at: "2026-05-07T12:01:00.000Z",
    },
  };
  const snapshot = buildWatchSnapshot([completedThread, runningThread], {}, {
    now: FIXTURE_NOW,
    readWatchlist: () => ({
      items: [
        {
          kind: "thread",
          id: "thread-alpha",
          auto_continue: {
            enabled: true,
            max_count: 2,
            remaining_count: 2,
            account_health: { token_health: "expired" },
          },
        },
        {
          kind: "thread",
          id: "thread-running",
          auto_continue: {
            enabled: true,
            max_count: 2,
            remaining_count: 2,
          },
        },
      ],
    }),
  });
  const byId = new Map(snapshot.items.map((item) => [item.id, item]));
  assert.equal(byId.get("thread-alpha").auto_continue.launchable, false);
  assert.equal(byId.get("thread-alpha").auto_continue.blocked_reason, "token_or_account_health_blocks_work");
  assert.equal(byId.get("thread-running").auto_continue.launchable, false);
  assert.equal(byId.get("thread-running").auto_continue.blocked_reason, "thread_is_running_or_queued");

  const bindingSnapshot = buildWatchSnapshot([completedThread], {}, {
    now: FIXTURE_NOW,
    readWatchlist: () => ({
      items: [{
        kind: "thread",
        id: "thread-alpha",
        auto_continue: {
          enabled: true,
          max_count: 2,
          remaining_count: 2,
          session_binding_required: true,
        },
      }],
    }),
  });
  assert.equal(bindingSnapshot.items[0].auto_continue.blocked_reason, "session_binding_is_missing_or_changed");
});

test("persists watch stop and resume controls with trace evidence", async (t) => {
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "cma-watch-control-"));
  t.after(() => fs.rmSync(homeDir, { recursive: true, force: true }));
  const server = createNodeBackendServer({
    now: FIXTURE_NOW,
    homeDir,
    listThreads: async () => fixtureThreads,
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await requestJson(baseUrl, "POST", "/api/watch/auto-continue", {
      kind: "thread",
      id: "thread-alpha",
      enabled: true,
      max_count: 2,
      remaining_count: 2,
    });

    const stop = await requestJson(baseUrl, "POST", "/api/watch/control", {
      kind: "thread",
      id: "thread-alpha",
      action: "stop",
      reason: "manual pause",
    });
    assert.equal(stop.statusCode, 200);
    assert.equal(stop.body.action.action, "stop");
    assert.equal(stop.body.watchlist.items[0].auto_continue.enabled, false);
    assert.equal(stop.body.watchlist.items[0].auto_continue.last_stop_reason, "user_stopped");

    const resume = await requestJson(baseUrl, "POST", "/api/watch/control", {
      kind: "thread",
      id: "thread-alpha",
      action: "resume",
    });
    assert.equal(resume.statusCode, 200);
    assert.equal(resume.body.action.action, "resume");
    assert.equal(resume.body.watchlist.items[0].auto_continue.enabled, true);
    assert.equal(resume.body.watchlist.items[0].auto_continue.last_stop_reason, "user_resumed");

    const actionPath = path.join(homeDir, ".codex-managed-agent", "watch-actions.jsonl");
    const lines = fs.readFileSync(actionPath, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    assert.deepEqual(lines.map((line) => line.action), ["stop", "resume"]);
    assert.equal(lines[0].type, "watch.action");
    assert.equal(lines[0].reason, "manual pause");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("watch write auth allows local requests and token-gates non-local writes", () => {
  assert.doesNotThrow(() => requireWatchWriteAuth({
    socket: { remoteAddress: "127.0.0.1" },
    headers: {},
  }, {}));

  assert.throws(() => requireWatchWriteAuth({
    socket: { remoteAddress: "203.0.113.7" },
    headers: {},
  }, { watchAuthToken: "secret" }), /valid watch auth token/);

  assert.doesNotThrow(() => requireWatchWriteAuth({
    socket: { remoteAddress: "203.0.113.7" },
    headers: { authorization: "Bearer secret" },
  }, { watchAuthToken: "secret" }));

  assert.doesNotThrow(() => requireWatchWriteAuth({
    socket: { remoteAddress: "203.0.113.7" },
    headers: { "x-cma-watch-token": "secret" },
  }, { watchAuthToken: "secret" }));
});

test("discovers rollout JSONL sessions from a directory", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-node-backend-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { rolloutPath, sessionId, projectDir } = writeRolloutFixture(root);

  const files = findSessionFiles({ codexHome: root });
  assert.deepEqual(files, [rolloutPath]);

  const threads = discoverSessionThreads({ codexHome: root, now: FIXTURE_NOW });
  assert.equal(threads.length, 1);
  const [thread] = threads;
  assert.equal(thread.id, sessionId);
  assert.equal(thread.title, "Summarize the dashboard state");
  assert.equal(thread.cwd, projectDir);
  assert.equal(thread.tokens_used, 4321);
  assert.equal(thread.model, "gpt-5.4");
  assert.equal(thread.reasoning_effort, "high");
  assert.equal(thread.tool_call_count, 4);
  assert.deepEqual(thread.tool_call_counts, [
    { name: "exec_command", count: 2 },
    { name: "apply_patch", count: 1 },
    { name: "web_search_call", count: 1 },
  ]);
  assert.equal(thread.git_branch, null);
  assert.equal(thread.git_branch_status, "not_git_repo");
  assert.equal(thread.git_has_remote, false);
  assert.equal(thread.git_remote_name, null);
  assert.equal(thread.has_user_event, 1);
  assert.equal(thread.user_command_count, 1);
  assert.equal(thread.rollout_user_message_count, 1);
  assert.equal(thread.assistant_message_count, 1);
  assert.equal(thread.compaction_count, 1);
  assert.equal(thread.last_compacted_at, "2026-04-18T01:07:30.000Z");
  assert.equal(thread.lifecycle.state, "waiting");
  assert.match(thread.lifecycle.reason, /without an explicit task_complete/i);
  assert.deepEqual(thread.lifecycle.recent_tools, ["exec_command", "apply_patch", "web_search_call"]);
  assert.match(thread.lifecycle.last_assistant_preview, /Used exec_command/);
  assert.equal(thread.rollout_path, rolloutPath);
  assert.equal(thread.source, "cli");
  assert.deepEqual(thread.sandbox_policy, { mode: "workspace-write" });
});

test("discovers archived rollout JSONL sessions from archived_sessions", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-node-backend-archive-dir-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { rolloutPath, sessionId } = writeRolloutFixture(root);
  const archivedDir = path.join(root, "archived_sessions");
  const archivedPath = path.join(archivedDir, path.basename(rolloutPath));
  fs.mkdirSync(archivedDir, { recursive: true });
  fs.renameSync(rolloutPath, archivedPath);

  const files = findSessionFiles({ codexHome: root });
  assert.deepEqual(files, [archivedPath]);

  const threads = discoverSessionThreads({ codexHome: root, now: FIXTURE_NOW, processRows: [] });
  assert.equal(threads.length, 1);
  assert.equal(threads[0].id, sessionId);
  assert.equal(threads[0].rollout_path, archivedPath);
  assert.equal(threads[0].archived, 1);
  assert.equal(threads[0].status, "archived");

  const archivedPayload = normalizeThreadsResponse(threads, { scope: "all", archived: "1" }, { now: FIXTURE_NOW });
  assert.equal(archivedPayload.items.length, 1);
  assert.equal(archivedPayload.items[0].id, sessionId);
});

test("official SQLite thread metadata can mark sessions as archived", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-node-backend-official-state-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { rolloutPath, sessionId } = writeRolloutFixture(root);

  const threads = discoverSessionThreads({
    codexHome: root,
    now: FIXTURE_NOW,
    processRows: [],
    officialThreadMetadata: {
      [sessionId]: {
        id: sessionId,
        rollout_path: rolloutPath,
        archived: 1,
        archived_at: FIXTURE_NOW - 30,
        title: "Official archived title",
        cwd: "/official/cwd",
        model_provider: "openai",
        updated_at: FIXTURE_NOW + 10,
      },
    },
  });

  assert.equal(threads.length, 1);
  assert.equal(threads[0].id, sessionId);
  assert.equal(threads[0].archived, 1);
  assert.equal(threads[0].status, "archived");
  assert.equal(threads[0].title, "Official archived title");
  assert.equal(threads[0].cwd, "/official/cwd");
  assert.equal(threads[0].updated_at, FIXTURE_NOW + 10);
});

test("unreadable official SQLite state does not block JSONL discovery", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-node-backend-bad-state-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { sessionId } = writeRolloutFixture(root);
  fs.writeFileSync(path.join(root, "state_5.sqlite"), "not a sqlite database", "utf8");

  const threads = discoverSessionThreads({ codexHome: root, now: FIXTURE_NOW, processRows: [] });
  assert.equal(threads.length, 1);
  assert.equal(threads[0].id, sessionId);
  assert.equal(threads[0].archived, 0);
});

test("running status requires explicit Codex resume process evidence", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-node-backend-running-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { sessionId } = writeRolloutFixture(root);

  const stopped = discoverSessionThreads({
    codexHome: root,
    now: FIXTURE_NOW,
    processRows: [
      { pid: 111, command: `code --reuse-window openai-codex://local/${sessionId}` },
      { pid: 112, command: `node helper ${sessionId}` },
    ],
  });
  assert.notEqual(stopped[0].status, "running");
  assert.equal(stopped[0].process.alive, false);

  const running = discoverSessionThreads({
    codexHome: root,
    now: FIXTURE_NOW,
    processRows: [
      { pid: 222, command: `/usr/bin/codex resume ${sessionId}` },
    ],
  });
  assert.equal(running[0].status, "running");
  assert.equal(running[0].process.alive, true);
  assert.equal(running[0].process.pid, 222);
});

test("running process evidence stays visible for archived threads", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-node-backend-archived-running-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { rolloutPath, sessionId } = writeRolloutFixture(root);

  const threads = discoverSessionThreads({
    codexHome: root,
    now: FIXTURE_NOW,
    processRows: [
      { pid: 333, command: `/usr/bin/codex resume ${sessionId}` },
    ],
    officialThreadMetadata: {
      [sessionId]: {
        id: sessionId,
        rollout_path: rolloutPath,
        archived: 1,
        archived_at: FIXTURE_NOW - 30,
        title: "Archived but running",
      },
    },
  });

  assert.equal(threads.length, 1);
  assert.equal(threads[0].archived, 1);
  assert.equal(threads[0].status, "running");
  assert.equal(threads[0].process.alive, true);

  const runningPayload = normalizeThreadsResponse(threads, { scope: "all", status: "running" }, { now: FIXTURE_NOW });
  assert.deepEqual(runningPayload.items.map((thread) => thread.id), [sessionId]);
});

test("parallel discovery keeps a session index and reparses changed JSONL only", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-node-backend-index-"));
  const indexPath = path.join(root, "session-index.json");
  t.after(async () => {
    await closeSessionWorkerPool();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const { rolloutPath, sessionId } = writeRolloutFixture(root);
  const secondPath = rolloutPath.replace(sessionId, "119d24c8-f967-7583-bba7-8b1c750b5aa1");
  fs.copyFileSync(rolloutPath, secondPath);

  const firstScan = await discoverSessionThreadsParallel({
    codexHome: root,
    indexPath,
    now: FIXTURE_NOW,
    useWorkers: false,
  });
  assert.equal(firstScan.length, 2);
  assert.equal(firstScan.scanStats.totalFiles, 2);
  assert.equal(firstScan.scanStats.indexed, 0);
  assert.equal(firstScan.scanStats.reparsed, 2);
  assert.equal(fs.existsSync(indexPath), true);
  assert.equal(Object.keys(readSessionIndex({ indexPath }).entries).length, 2);

  fs.appendFileSync(rolloutPath, `${JSON.stringify({
    timestamp: "2026-04-18T01:09:00.000Z",
    type: "event_msg",
    payload: {
      type: "token_count",
      info: { total_token_usage: { total_tokens: 9999 } },
    },
  })}\n`, "utf8");
  const touchTime = new Date("2026-04-18T01:10:00.000Z");
  fs.utimesSync(rolloutPath, touchTime, touchTime);

  const secondScan = await discoverSessionThreadsParallel({
    codexHome: root,
    indexPath,
    now: FIXTURE_NOW,
    useWorkers: false,
  });
  const changedThread = secondScan.find((thread) => thread.rollout_path === rolloutPath);
  const unchangedThread = secondScan.find((thread) => thread.rollout_path === secondPath);
  assert.equal(secondScan.scanStats.totalFiles, 2);
  assert.equal(secondScan.scanStats.indexed, 1);
  assert.equal(secondScan.scanStats.reparsed, 1);
  assert.equal(changedThread.tokens_used, 9999);
  assert.equal(unchangedThread.tokens_used, 4321);
});

test("Node backend reads legacy sidecar state filenames", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-node-backend-legacy-state-"));
  try {
    fs.writeFileSync(path.join(root, "node-fallback-thread-state.json"), JSON.stringify({
      version: 1,
      threads: {
        "thread-alpha": { archived: true },
      },
    }), "utf8");
    const state = readThreadState({ codexHome: root });
    assert.equal(state.threads["thread-alpha"].archived, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("serves discovered sessions over HTTP without runtime wiring", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-node-backend-http-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { sessionId } = writeRolloutFixture(root);

  const listServer = createNodeBackendServer({ codexHome: root, now: FIXTURE_NOW });
  const listResponse = await getJson(listServer, "/api/threads?include_logs=true&include_history=true&scope=live");
  assert.equal(listResponse.statusCode, 200);
  assert.equal(listResponse.body.items.length, 1);
  assert.equal(listResponse.body.meta.scan_stats.totalFiles, 1);
  assert.equal(listResponse.body.meta.scan_stats.reparsed, 1);
  assert.equal(listResponse.body.items[0].id, sessionId);
  assert.equal(listResponse.body.items[0].title, "Summarize the dashboard state");
  assert.equal(listResponse.body.items[0].tool_call_count, 4);
  assert.equal(listResponse.body.items[0].git_branch_status, "not_git_repo");
  assert.equal(listResponse.body.items[0].git_has_remote, false);
  assert.deepEqual(listResponse.body.items[0].tool_call_counts, [
    { name: "exec_command", count: 2 },
    { name: "apply_patch", count: 1 },
    { name: "web_search_call", count: 1 },
  ]);

  const detailServer = createNodeBackendServer({ codexHome: root, now: FIXTURE_NOW });
  const detailResponse = await getJson(detailServer, `/api/thread/${sessionId}`);
  assert.equal(detailResponse.statusCode, 200);
  assert.equal(detailResponse.body.thread.id, sessionId);
  assert.equal(detailResponse.body.thread.tokens_used, 4321);
  assert.equal(detailResponse.body.thread.git_branch_status, "not_git_repo");
  assert.equal(detailResponse.body.thread.git_has_remote, false);
  assert.equal(detailResponse.body.thread.tool_call_count, 4);
  assert.deepEqual(detailResponse.body.thread.tool_call_counts, [
    { name: "exec_command", count: 2 },
    { name: "apply_patch", count: 1 },
    { name: "web_search_call", count: 1 },
  ]);
});

test("serves Node write routes with sidecar state", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-node-backend-write-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { sessionId } = writeRolloutFixture(root);
  const server = createNodeBackendServer({ codexHome: root, now: FIXTURE_NOW });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  t.after(() => server.close());

  const scan = await requestJson(baseUrl, "POST", "/api/threads/scan-codex-sessions", { limit: 10 });
  assert.equal(scan.statusCode, 200);
  assert.equal(scan.body.ok, true);
  assert.equal(scan.body.summary.refreshed, true);

  const rename = await requestJson(baseUrl, "POST", `/api/thread/${sessionId}/rename`, { title: "Node alias" });
  assert.equal(rename.statusCode, 410);
  assert.match(rename.body.detail, /not supported/);

  const lifecycle = await requestJson(baseUrl, "POST", "/api/threads/lifecycle", {
    action: "archive",
    ids: [sessionId],
  });
  assert.equal(lifecycle.statusCode, 200);
  assert.deepEqual(lifecycle.body.updated, [{ id: sessionId }]);

  const archived = await requestJson(baseUrl, "GET", "/api/threads?scope=all&archived=1", undefined);
  assert.equal(archived.statusCode, 200);
  assert.equal(archived.body.items.length, 1);
  assert.equal(archived.body.items[0].title, "Summarize the dashboard state");
  assert.equal(archived.body.items[0].archived, 1);

  const hardDelete = await requestJson(baseUrl, "POST", "/api/threads/lifecycle", {
    action: "hard_delete",
    ids: [sessionId],
  });
  assert.equal(hardDelete.statusCode, 409);
  assert.match(hardDelete.body.detail, /hard_delete/);
});
