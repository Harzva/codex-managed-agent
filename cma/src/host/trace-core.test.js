const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

const {
  readTrace,
  readTraceIndex,
  resolveTraceLanePaths,
  resolveTraceIndexPath,
  resolveTracePath,
  resolveTraceThreadId,
  summarizeTrace,
  tailTrace,
  writeTeamTrace,
  writeTrace,
} = require("./trace-core");

function createPaths(t) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-trace-core-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, ".codex-team");
  return {
    workspace,
    root,
    taskTracesDir: path.join(root, "traces", "tasks"),
    threadTracesDir: path.join(root, "traces", "threads"),
    runsDir: path.join(root, "runs"),
  };
}

test("trace-core resolves stable task, run, and thread lane paths", (t) => {
  const paths = createPaths(t);
  assert.equal(
    resolveTracePath(paths, { scope: "task", task_id: "task alpha" }),
    path.join(paths.taskTracesDir, "task-alpha.jsonl"),
  );
  assert.equal(
    resolveTracePath(paths, { scope: "run", run_id: "run alpha" }),
    path.join(paths.runsDir, "run-alpha", "trace.jsonl"),
  );
  assert.equal(
    resolveTracePath(paths, { scope: "thread", thread_id: "thread/alpha" }),
    path.join(paths.threadTracesDir, "thread-alpha.jsonl"),
  );
  assert.equal(resolveTraceThreadId("pending-team-worker-123"), "");
  assert.deepEqual(
    resolveTraceLanePaths(paths, { task_id: "task alpha", run_id: "run alpha", thread_id: "thread/alpha" }).map((lane) => lane.scope),
    ["task", "run", "thread"],
  );
});

test("trace-core writes, reads, tails, and summarizes append-only JSONL events", (t) => {
  const paths = createPaths(t);
  let seq = 0;
  const idFactory = (prefix) => `${prefix}-${++seq}`;
  writeTrace(paths, {
    kind: "run.dispatch_started",
    task_id: "task-alpha",
    run_id: "run-alpha",
    thread_id: "thread-alpha",
    summary: "Dispatch started.",
    status: "running",
    evidence: { pid: 1234 },
  }, { makeEventId: idFactory, toIso: () => "2026-04-25T01:00:00.000Z" });
  writeTrace(paths, {
    kind: "run.result_captured",
    task_id: "task-alpha",
    run_id: "run-alpha",
    thread_id: "thread-alpha",
    summary: "Result captured.",
    status: "completed",
  }, { makeEventId: idFactory, toIso: () => "2026-04-25T01:05:00.000Z" });

  const taskTracePath = resolveTracePath(paths, { scope: "task", task_id: "task-alpha" });
  const taskEntries = readTrace(taskTracePath);
  assert.equal(taskEntries.length, 2);
  assert.equal(taskEntries[0].event_id, "traceevt-1");
  assert.equal(taskEntries[0].workspace_id, path.basename(paths.workspace));
  assert.equal(taskEntries[1].kind, "run.result_captured");

  const tail = tailTrace(taskTracePath, 1);
  assert.equal(tail.length, 1);
  assert.equal(tail[0].summary, "Result captured.");

  const summary = summarizeTrace(taskTracePath, 2);
  assert.equal(summary.exists, true);
  assert.equal(summary.event_count, 2);
  assert.equal(summary.last_event_at, "2026-04-25T01:05:00.000Z");
  assert.equal(summary.index_path, resolveTraceIndexPath(taskTracePath));
  assert.deepEqual(summary.kinds, ["run.dispatch_started", "run.result_captured"]);
  assert.equal(summary.events[0].scope, "task");
  assert.equal(summary.events[1].status, "completed");

  const index = readTraceIndex(taskTracePath);
  assert.ok(index);
  assert.equal(index.event_count, 2);
  assert.equal(index.last_event_at, "2026-04-25T01:05:00.000Z");
  assert.deepEqual(index.kinds, ["run.dispatch_started", "run.result_captured"]);
});

test("trace-core provides a dedicated Team writer", (t) => {
  const paths = createPaths(t);
  writeTeamTrace(paths, {
    kind: "task.created",
    task_id: "task-team-alpha",
    thread_id: "thread-team-alpha",
    summary: "Task created.",
  }, {
    makeEventId: (prefix) => `${prefix}-team-1`,
    toIso: () => "2026-04-25T01:10:00.000Z",
  });

  const taskTracePath = resolveTracePath(paths, { scope: "task", task_id: "task-team-alpha" });
  const taskEntries = readTrace(taskTracePath);
  assert.equal(taskEntries.length, 1);
  assert.equal(taskEntries[0].event_id, "traceevt-team-1");
  assert.equal(taskEntries[0].source, "team_core");
  assert.equal(taskEntries[0].summary, "Task created.");
});

test("trace-core rebuilds index metadata when the sidecar is missing", (t) => {
  const paths = createPaths(t);
  writeTrace(paths, {
    kind: "thread.message_observed",
    thread_id: "thread-alpha",
    summary: "User message observed: Continue.",
    payload: { role: "user" },
  }, {
    makeEventId: (prefix) => `${prefix}-1`,
    toIso: () => "2026-04-25T01:15:00.000Z",
  });

  const threadTracePath = resolveTracePath(paths, { scope: "thread", thread_id: "thread-alpha" });
  const indexPath = resolveTraceIndexPath(threadTracePath);
  fs.rmSync(indexPath, { force: true });

  const summary = summarizeTrace(threadTracePath, 1);
  assert.equal(summary.event_count, 1);
  assert.equal(summary.index_path, indexPath);
  assert.equal(fs.existsSync(indexPath), true);

  const index = readTraceIndex(threadTracePath);
  assert.ok(index);
  assert.equal(index.event_count, 1);
  assert.deepEqual(index.kinds, ["thread.message_observed"]);
});
