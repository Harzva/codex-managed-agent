const test = require("node:test");
const assert = require("node:assert/strict");

const { buildTraceReportMarkdown } = require("./trace-report");

test("buildTraceReportMarkdown summarizes product-level task, thread, and run evidence", () => {
  const markdown = buildTraceReportMarkdown({
    exportedAt: "2026-04-25T03:00:00.000Z",
    detail: {
      thread: {
        id: "thread-1",
        title: "Implement export report",
        cwd: "/workspace/project",
        updated_at_iso: "2026-04-25T02:59:00Z",
      },
      thread_trace_preview: {
        counts: {
          messages: 2,
          logs: 3,
          commands: 2,
          checks: 1,
          errors: 1,
          raw_jsonl: 5,
        },
        events: [
          {
            title: "Command activity observed",
            timestamp: "2026-04-25T02:58:00Z",
            copy: "2 structured command signals visible from the current thread trace.",
          },
        ],
        file_events: [
          {
            path: "src/host/trace-report.js",
            timestamp: "2026-04-25T02:58:10Z",
          },
        ],
        command_events: [
          {
            label: "Resume",
            command: "codex resume thread-1",
            timestamp: "2026-04-25T02:58:20Z",
          },
        ],
        check_events: [
          {
            summary: "Check observed in thread activity: node --test passed.",
            timestamp: "2026-04-25T02:58:30Z",
          },
        ],
        error_events: [
          {
            summary: "Error observed in thread activity: prior build failed once.",
            timestamp: "2026-04-25T02:58:40Z",
          },
        ],
        source_summary: {
          process: "No live process",
          updated: "just now",
          thread_id: "thread-1",
          trace_lane: "/workspace/project/.codex-team/traces/threads/thread-1.jsonl",
        },
      },
    },
    teamCoordination: {
      workspace: "/workspace/project",
      tasks: [
        {
          task_id: "task-1",
          title: "Export trace report",
          status: "running",
          owner: "thread-1",
          runtime: {
            thread_id: "thread-1",
            run_id: "run-1",
            pid: 4321,
            state: "running",
            log_path: "/workspace/project/team-worker.log",
          },
          trace_files: {
            task: { exists: true, path: "/workspace/project/.codex-team/traces/tasks/task-1.jsonl" },
            run: { exists: true, path: "/workspace/project/.codex-team/runs/run-1/trace.jsonl" },
            thread: { exists: true, path: "/workspace/project/.codex-team/traces/threads/thread-1.jsonl" },
          },
          trace_preview: {
            lane: "task",
            events: [
              {
                kind: "run.dispatch_started",
                timestamp: "2026-04-25T02:57:00Z",
                summary: "Dispatch started.",
              },
            ],
          },
        },
      ],
    },
  });

  assert.match(markdown, /product-level trace evidence captured by Codex-Managed-Agent/);
  assert.match(markdown, /It is not a raw Codex API request\/response capture/);
  assert.match(markdown, /Thread evidence: 2 messages, 3 logs, 2 commands, 1 checks, 1 errors, 5 raw trace events/);
  assert.match(markdown, /Task evidence: task lane with 1 preview events/);
  assert.match(markdown, /Run evidence: run run-1, pid 4321, state running/);
  assert.match(markdown, /\[task\] 2026-04-25T02:57:00Z/);
  assert.match(markdown, /\[thread\] 2026-04-25T02:58:00Z Command activity observed/);
  assert.match(markdown, /src\/host\/trace-report\.js/);
  assert.match(markdown, /codex resume thread-1/);
  assert.match(markdown, /node --test passed/);
  assert.match(markdown, /prior build failed once/);
  assert.match(markdown, /file:\/\/\/workspace\/project\/\.codex-team\/traces\/tasks\/task-1\.jsonl/);
  assert.match(markdown, /file:\/\/\/workspace\/project\/team-worker\.log/);
});
