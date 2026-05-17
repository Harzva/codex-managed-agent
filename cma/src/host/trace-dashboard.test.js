const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

const { buildTraceDashboardPayload, parseSessionReplay } = require("./trace-dashboard");

function writeJsonl(filePath, entries) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`, "utf8");
}

test("parseSessionReplay builds lightweight events, turns, tools, and tokens", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cma-trace-dashboard-"));
  const sessionPath = path.join(root, "rollout-thread-1.jsonl");
  writeJsonl(sessionPath, [
    { type: "session_meta", timestamp: "2026-04-24T01:00:00Z", payload: { id: "thread-1", cwd: root, model: "gpt-test", cli_version: "1.0.0" } },
    { type: "event_msg", timestamp: "2026-04-24T01:01:00Z", payload: { type: "task_started", turn_id: "turn-1" } },
    { type: "event_msg", timestamp: "2026-04-24T01:01:10Z", payload: { type: "user_message", message: "Please inspect trace." } },
    { type: "response_item", timestamp: "2026-04-24T01:01:20Z", payload: { type: "function_call", name: "exec_command", call_id: "call-1", arguments: JSON.stringify({ cmd: "node --test" }) } },
    { type: "event_msg", timestamp: "2026-04-24T01:01:30Z", payload: { type: "token_count", info: { total_token_usage: { total_tokens: 100 }, last_token_usage: { total_tokens: 40 }, model_context_window: 1000 } } },
    { type: "event_msg", timestamp: "2026-04-24T01:01:40Z", payload: { type: "agent_message", message: "Trace inspected." } },
    { type: "event_msg", timestamp: "2026-04-24T01:01:50Z", payload: { type: "task_complete", turn_id: "turn-1" } },
  ]);

  const replay = parseSessionReplay(sessionPath);
  assert.equal(replay.available, true);
  assert.equal(replay.session_meta.id, "thread-1");
  assert.equal(replay.counts.message, 2);
  assert.equal(replay.counts.tool_call, 1);
  assert.equal(replay.counts.token, 1);
  assert.equal(replay.turns.length, 1);
  assert.equal(replay.turns[0].status, "complete");
  assert.equal(replay.tool_counts[0].name, "exec_command");
  assert.equal(replay.token_series[0].context_tokens, 40);
});

test("parseSessionReplay extracts deterministic code-change metadata from patches and diffs", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cma-trace-dashboard-"));
  const sessionPath = path.join(root, "rollout-thread-diff.jsonl");
  const patchText = [
    "*** Begin Patch",
    "*** Update File: src/alpha.js",
    "@@",
    "-const value = 1;",
    "+const value = 2;",
    "+const label = \"ready\";",
    "*** End Patch",
  ].join("\n");
  const diffText = [
    "diff --git a/src/beta.js b/src/beta.js",
    "--- a/src/beta.js",
    "+++ b/src/beta.js",
    "@@ -1 +1,2 @@",
    "-old",
    "+new",
    "+extra",
  ].join("\n");

  writeJsonl(sessionPath, [
    { type: "session_meta", timestamp: "2026-04-24T01:00:00Z", payload: { id: "thread-diff", cwd: root } },
    { type: "response_item", timestamp: "2026-04-24T01:01:20Z", payload: { type: "custom_tool_call", name: "apply_patch", call_id: "patch-1", input: patchText } },
    { type: "response_item", timestamp: "2026-04-24T01:02:20Z", payload: { type: "function_call_output", name: "exec_command", call_id: "diff-1", output: diffText } },
  ]);

  const replay = parseSessionReplay(sessionPath);
  assert.equal(replay.code_changes.length, 2);
  assert.equal(replay.code_changes[0].diff.kind, "apply_patch");
  assert.deepEqual(replay.code_changes[0].diff.files, ["src/alpha.js"]);
  assert.equal(replay.code_changes[0].diff.additions, 2);
  assert.equal(replay.code_changes[0].diff.deletions, 1);
  assert.equal(replay.code_changes[1].diff.kind, "unified_diff");
  assert.deepEqual(replay.code_changes[1].diff.files, ["src/beta.js"]);
  assert.equal(replay.code_changes[1].diff.additions, 2);
  assert.equal(replay.code_changes[1].diff.deletions, 1);
  assert.ok(replay.events.some((event) => event.diff && event.diff.summary.includes("+2 -1")));
});

test("buildTraceDashboardPayload combines current trace, explorer, and selected session replay", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cma-trace-dashboard-"));
  const sessionPath = path.join(root, "rollout-thread-1.jsonl");
  writeJsonl(sessionPath, [
    { type: "session_meta", timestamp: "2026-04-24T01:00:00Z", payload: { id: "thread-1", cwd: root } },
    { type: "event_msg", timestamp: "2026-04-24T01:01:10Z", payload: { type: "user_message", message: "Trace me." } },
  ]);

  const payload = buildTraceDashboardPayload({
    selectedThreadId: "thread-1",
    dashboard: {
      threads: [
        {
          id: "thread-1",
          title: "Trace thread",
          cwd: root,
          status: "idle",
          updated_at_iso: "2026-04-24T02:00:00Z",
          rollout_path: sessionPath,
          rollout_user_message_count: 1,
          assistant_message_count: 1,
          tool_call_count: 2,
          log_count: 3,
          tokens_used: 100,
        },
      ],
    },
    detail: {
      thread: {
        id: "thread-1",
        title: "Trace thread",
        cwd: root,
        rollout_path: sessionPath,
      },
      thread_trace_preview: {
        events: [{ title: "User message observed", copy: "Trace me." }],
        counts: { raw_jsonl: 2 },
        source_summary: { trace_lane: path.join(root, ".codex-team", "traces", "threads", "thread-1.jsonl") },
      },
    },
    teamCoordination: {
      tasks: [
        { task_id: "task-1", owner: "thread-1", status: "running", trace_files: {}, trace_preview: {} },
      ],
    },
    includeSessionReplay: true,
  });

  assert.equal(payload.selected.id, "thread-1");
  assert.equal(payload.summary.raw_trace_events, 2);
  assert.equal(payload.explorer.thread_count, 1);
  assert.equal(payload.explorer.totals.commands, 2);
  assert.equal(payload.linked_team_trace.task_id, "task-1");
  assert.equal(payload.session_replay.available, true);
  assert.equal(payload.session_replay.counts.message, 1);
});
