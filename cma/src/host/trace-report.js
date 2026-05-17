const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

function shortText(value, limit = 160) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}…` : text;
}

function slugify(value, fallback = "trace-report") {
  const text = String(value || "").trim().toLowerCase();
  const next = text.replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
  return next || fallback;
}

function listSection(items = [], renderItem, emptyText) {
  const rows = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!rows.length) return `- ${emptyText}`;
  return rows.map((item) => `- ${renderItem(item)}`).join("\n");
}

function formatFileLink(filePath) {
  const nextPath = String(filePath || "").trim();
  if (!nextPath) return "";
  return pathToFileURL(nextPath).href;
}

function findMatchingTeamTask(teamCoordination, threadId) {
  const nextThreadId = String(threadId || "").trim();
  if (!nextThreadId) return null;
  const tasks = Array.isArray(teamCoordination && teamCoordination.tasks) ? teamCoordination.tasks : [];
  return tasks.find((task) => {
    const runtime = task && task.runtime && typeof task.runtime === "object" ? task.runtime : {};
    return String(runtime.thread_id || "").trim() === nextThreadId || String(task?.owner || "").trim() === nextThreadId;
  }) || null;
}

function buildTimeline(task, detail) {
  const taskEvents = Array.isArray(task?.trace_preview?.events)
    ? task.trace_preview.events.map((event) => ({ ...event, lane: task.trace_preview.lane || "task" }))
    : [];
  const threadEvents = Array.isArray(detail?.thread_trace_preview?.events)
    ? detail.thread_trace_preview.events.map((event) => ({ ...event, lane: "thread" }))
    : [];
  return [...taskEvents, ...threadEvents]
    .filter((event) => event && (event.summary || event.copy || event.title))
    .sort((a, b) => {
      const timeA = Date.parse(a.timestamp || "") || 0;
      const timeB = Date.parse(b.timestamp || "") || 0;
      return timeA - timeB;
    });
}

function buildTraceReportMarkdown(payload = {}) {
  const detail = payload && payload.detail && typeof payload.detail === "object" ? payload.detail : {};
  const thread = detail && detail.thread && typeof detail.thread === "object" ? detail.thread : {};
  const tracePreview = detail && detail.thread_trace_preview && typeof detail.thread_trace_preview === "object"
    ? detail.thread_trace_preview
    : {};
  const counts = tracePreview.counts && typeof tracePreview.counts === "object" ? tracePreview.counts : {};
  const sourceSummary = tracePreview.source_summary && typeof tracePreview.source_summary === "object"
    ? tracePreview.source_summary
    : {};
  const teamCoordination = payload && payload.teamCoordination && typeof payload.teamCoordination === "object"
    ? payload.teamCoordination
    : {};
  const teamTask = findMatchingTeamTask(teamCoordination, thread.id || payload.threadId || "");
  const runtime = teamTask && teamTask.runtime && typeof teamTask.runtime === "object" ? teamTask.runtime : {};
  const traceFiles = teamTask && teamTask.trace_files && typeof teamTask.trace_files === "object" ? teamTask.trace_files : {};
  const exportedAt = new Date(payload.exportedAt || Date.now()).toISOString();
  const title = thread.title || thread.id || (teamTask && teamTask.title) || "Trace Report";
  const timeline = buildTimeline(teamTask, detail);
  const rawTracePaths = [
    { label: "Task trace JSONL", path: traceFiles.task && traceFiles.task.exists ? traceFiles.task.path : "" },
    { label: "Run trace JSONL", path: traceFiles.run && traceFiles.run.exists ? traceFiles.run.path : "" },
    { label: "Thread trace JSONL", path: sourceSummary.trace_lane || (traceFiles.thread && traceFiles.thread.exists ? traceFiles.thread.path : "") },
    { label: "Run log", path: runtime.log_path || "" },
  ].filter((item) => item.path);
  return [
    `# Trace Report: ${title}`,
    "",
    `Exported at: ${exportedAt}`,
    "",
    "This report summarizes product-level trace evidence captured by Codex-Managed-Agent.",
    "It is not a raw Codex API request/response capture.",
    "",
    "## Scope",
    "",
    `- Thread: ${thread.id || "-"}`,
    `- Workspace: ${thread.cwd || teamCoordination.workspace || sourceSummary.workspace_path || "-"}`,
    `- Task: ${teamTask ? `${teamTask.task_id || "-"} (${teamTask.status || "unknown"})` : "No linked Team task"}`,
    `- Run: ${runtime.run_id || "No linked run"}`,
    `- Updated: ${sourceSummary.updated || thread.updated_at_iso || "-"}`,
    "",
    "## Evidence Summary",
    "",
    `- Thread evidence: ${Number(counts.messages || 0)} messages, ${Number(counts.logs || 0)} logs, ${Number(counts.commands || 0)} commands, ${Number(counts.checks || 0)} checks, ${Number(counts.errors || 0)} errors, ${Number(counts.raw_jsonl || 0)} raw trace events.`,
    `- Task evidence: ${teamTask ? `${teamTask.trace_preview?.lane || "task"} lane with ${Array.isArray(teamTask.trace_preview?.events) ? teamTask.trace_preview.events.length : 0} preview events.` : "No Team task evidence linked to this thread."}`,
    `- Run evidence: ${runtime.run_id ? `run ${runtime.run_id}${runtime.pid ? `, pid ${runtime.pid}` : ""}${runtime.state ? `, state ${runtime.state}` : ""}` : "No run envelope linked to this thread."}`,
    `- Process summary: ${sourceSummary.process || "No live process"}`,
    "",
    "## Timeline",
    "",
    listSection(
      timeline,
      (event) => `[${event.lane || event.scope || "trace"}] ${(event.timestamp || "-")} ${event.title || event.kind || event.status || "Trace event"}${event.summary || event.copy ? ` - ${shortText(event.summary || event.copy, 200)}` : ""}`,
      "No trace timeline entries are available yet.",
    ),
    "",
    "## Files",
    "",
    listSection(
      tracePreview.file_events,
      (item) => `${item.path || shortText(item.summary, 120) || "-"}${item.timestamp ? ` (${item.timestamp})` : ""}`,
      "No structured file events are available in the current thread trace lane.",
    ),
    "",
    "## Commands",
    "",
    listSection(
      tracePreview.command_events,
      (item) => `${item.label || item.source || "command"}: ${item.command || shortText(item.summary, 160) || "-"}${item.count > 0 ? ` x${item.count}` : ""}${item.timestamp ? ` (${item.timestamp})` : ""}`,
      "No structured command events are available in the current thread trace lane.",
    ),
    "",
    "## Checks",
    "",
    listSection(
      tracePreview.check_events,
      (item) => `${item.summary || "-"}${item.timestamp ? ` (${item.timestamp})` : ""}`,
      "No structured check events are available in the current thread trace lane.",
    ),
    "",
    "## Errors",
    "",
    listSection(
      tracePreview.error_events,
      (item) => `${item.summary || "-"}${item.timestamp ? ` (${item.timestamp})` : ""}`,
      "No structured error events are available in the current thread trace lane.",
    ),
    "",
    "## Raw Trace Links",
    "",
    listSection(
      rawTracePaths,
      (item) => `${item.label}: [${item.path}](${formatFileLink(item.path)})`,
      "No local raw trace files are linked to this report yet.",
    ),
    "",
  ].join("\n");
}

function resolveReportDirectory(payload = {}) {
  const detail = payload && payload.detail && typeof payload.detail === "object" ? payload.detail : {};
  const thread = detail && detail.thread && typeof detail.thread === "object" ? detail.thread : {};
  const teamCoordination = payload && payload.teamCoordination && typeof payload.teamCoordination === "object"
    ? payload.teamCoordination
    : {};
  const baseDir = String(teamCoordination.workspace || thread.cwd || process.cwd() || os.tmpdir()).trim() || os.tmpdir();
  if (teamCoordination && teamCoordination.workspace) {
    return path.join(baseDir, ".codex-team", "reports");
  }
  return path.join(baseDir, ".codex", "trace-reports");
}

function writeTraceReport(payload = {}) {
  const detail = payload && payload.detail && typeof payload.detail === "object" ? payload.detail : {};
  const thread = detail && detail.thread && typeof detail.thread === "object" ? detail.thread : {};
  const exportedAt = new Date(payload.exportedAt || Date.now());
  const stamp = exportedAt.toISOString().replace(/[:-]/g, "").replace(/\.\d{3}Z$/, "Z");
  const fileName = `${stamp}-${slugify(thread.id || thread.title || "trace-report")}.md`;
  const reportDir = resolveReportDirectory(payload);
  const filePath = path.join(reportDir, fileName);
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(filePath, `${buildTraceReportMarkdown({ ...payload, exportedAt: exportedAt.toISOString() })}\n`, "utf8");
  return filePath;
}

module.exports = {
  buildTraceReportMarkdown,
  findMatchingTeamTask,
  resolveReportDirectory,
  writeTraceReport,
};
