const fs = require("fs");
const path = require("path");

function safeName(value, fallback = "workspace") {
  const text = String(value || "").trim();
  const next = text.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
  return next || fallback;
}

function toIso(value = Date.now()) {
  return new Date(value).toISOString();
}

function readJsonl(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function readJson(filePath, fallback = null) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function appendJsonl(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function isTraceableThreadId(threadId) {
  const nextThreadId = String(threadId || "").trim();
  if (!nextThreadId) return false;
  return !nextThreadId.startsWith("pending-team-worker-") && !nextThreadId.startsWith("pending-new-agent-");
}

function resolveTraceThreadId(value) {
  const nextThreadId = String(value || "").trim();
  return isTraceableThreadId(nextThreadId) ? nextThreadId : "";
}

function workspaceTraceId(paths) {
  return safeName(path.basename(paths && paths.workspace ? paths.workspace : "") || "workspace", "workspace");
}

function resolveTracePath(paths, target = {}) {
  if (!paths || typeof paths !== "object") return "";
  const scope = String(target.scope || "").trim();
  if (scope === "task") {
    const taskId = safeName(target.task_id || "", "");
    return taskId && paths.taskTracesDir ? path.join(paths.taskTracesDir, `${taskId}.jsonl`) : "";
  }
  if (scope === "run") {
    const runId = safeName(target.run_id || "", "");
    return runId && paths.runsDir ? path.join(paths.runsDir, runId, "trace.jsonl") : "";
  }
  if (scope === "thread") {
    const threadId = resolveTraceThreadId(target.thread_id);
    return threadId && paths.threadTracesDir ? path.join(paths.threadTracesDir, `${safeName(threadId, "thread")}.jsonl`) : "";
  }
  return "";
}

function resolveTraceLanePaths(paths, trace = {}) {
  return ["task", "run", "thread"]
    .map((scope) => ({ scope, filePath: resolveTracePath(paths, { scope, ...trace }) }))
    .filter((lane) => lane.filePath);
}

function resolveTraceIndexPath(filePath) {
  const nextPath = String(filePath || "").trim();
  if (!nextPath) return "";
  return nextPath.endsWith(".jsonl")
    ? nextPath.replace(/\.jsonl$/i, ".index.json")
    : `${nextPath}.index.json`;
}

function traceFileStat(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const stat = fs.statSync(filePath);
    return {
      size: Number(stat.size || 0),
      mtime_ms: Number(stat.mtimeMs || 0),
    };
  } catch {
    return null;
  }
}

function buildTraceIndex(filePath, entries = []) {
  const list = Array.isArray(entries) ? entries : [];
  const last = list[list.length - 1] || null;
  const stat = traceFileStat(filePath);
  return {
    version: 1,
    file_path: String(filePath || ""),
    file_size: Number(stat && stat.size || 0),
    file_mtime_ms: Number(stat && stat.mtime_ms || 0),
    event_count: list.length,
    lane: String((last && last.scope) || ""),
    kinds: Array.from(new Set(list.map((entry) => String((entry && entry.kind) || "").trim()).filter(Boolean))),
    last_event_at: String((last && last.ts) || ""),
    updated_at: toIso(),
  };
}

function readTraceIndex(filePath) {
  const index = readJson(resolveTraceIndexPath(filePath), null);
  if (!index || typeof index !== "object") return null;
  if (Number(index.version || 0) !== 1) return null;
  return index;
}

function writeTraceIndex(filePath, index) {
  const indexPath = resolveTraceIndexPath(filePath);
  if (!indexPath) return;
  writeJson(indexPath, index);
}

function updateTraceIndex(filePath, entry) {
  const current = readTraceIndex(filePath);
  const stat = traceFileStat(filePath);
  const kind = String((entry && entry.kind) || "").trim();
  const lane = String((entry && entry.scope) || "");
  const kinds = new Set(Array.isArray(current && current.kinds) ? current.kinds : []);
  if (kind) kinds.add(kind);
  writeTraceIndex(filePath, {
    version: 1,
    file_path: String(filePath || ""),
    file_size: Number(stat && stat.size || 0),
    file_mtime_ms: Number(stat && stat.mtime_ms || 0),
    event_count: Math.max(0, Number(current && current.event_count || 0)) + 1,
    lane: lane || String(current && current.lane || ""),
    kinds: [...kinds],
    last_event_at: String((entry && entry.ts) || ""),
    updated_at: toIso(),
  });
}

function ensureTraceIndex(filePath) {
  const nextPath = String(filePath || "").trim();
  if (!nextPath || !fs.existsSync(nextPath)) {
    return {
      version: 1,
      file_path: nextPath,
      file_size: 0,
      file_mtime_ms: 0,
      event_count: 0,
      lane: "",
      kinds: [],
      last_event_at: "",
      updated_at: toIso(),
    };
  }
  const stat = traceFileStat(nextPath);
  const current = readTraceIndex(nextPath);
  if (
    current
    && Number(current.file_size || 0) === Number(stat && stat.size || 0)
    && Number(current.file_mtime_ms || 0) === Number(stat && stat.mtime_ms || 0)
  ) {
    return current;
  }
  const rebuilt = buildTraceIndex(nextPath, readTrace(nextPath));
  writeTraceIndex(nextPath, rebuilt);
  return rebuilt;
}

function writeTrace(paths, trace = {}, options = {}) {
  if (!paths || !paths.root || !trace || typeof trace !== "object") return [];
  const taskId = String(trace.task_id || "").trim();
  const runId = String(trace.run_id || "").trim();
  const threadId = resolveTraceThreadId(trace.thread_id);
  if (!taskId && !runId && !threadId) return [];
  const lanes = resolveTraceLanePaths(paths, { ...trace, thread_id: threadId });
  if (!lanes.length) return [];
  const makeEventId = typeof options.makeEventId === "function" ? options.makeEventId : null;
  const nextIso = typeof options.toIso === "function" ? options.toIso : toIso;
  const base = {
    schema_version: 1,
    kind: String(trace.kind || "trace.note"),
    ts: String(trace.ts || nextIso()),
    task_id: taskId || undefined,
    thread_id: threadId || undefined,
    run_id: runId || undefined,
    agent_id: String(trace.agent_id || "").trim() || undefined,
    workspace_id: workspaceTraceId(paths),
    workspace_path: paths.workspace || undefined,
    source: String(trace.source || "team_core"),
    status: String(trace.status || "").trim() || undefined,
    summary: String(trace.summary || "").trim() || undefined,
    evidence: trace.evidence && typeof trace.evidence === "object" ? trace.evidence : {},
    payload: trace.payload && typeof trace.payload === "object" ? trace.payload : {},
  };
  lanes.forEach((lane) => {
    const entry = {
      ...base,
      event_id: makeEventId ? makeEventId("traceevt") : undefined,
      scope: lane.scope,
    };
    appendJsonl(lane.filePath, entry);
    updateTraceIndex(lane.filePath, entry);
  });
  return lanes;
}

function writeTeamTrace(paths, trace = {}, options = {}) {
  return writeTrace(paths, {
    ...trace,
    source: "team_core",
  }, options);
}

function writeThreadTrace(paths, trace = {}, options = {}) {
  return writeTrace(paths, {
    ...trace,
    source: "thread_page",
  }, options);
}

function readTrace(filePath) {
  return readJsonl(filePath);
}

function tailTrace(filePath, limit = 20) {
  return readTrace(filePath).slice(-Math.max(1, Number(limit) || 20));
}

function summarizeTrace(filePath, limit = 8) {
  const index = ensureTraceIndex(filePath);
  const tail = tailTrace(filePath, limit);
  return {
    filePath: String(filePath || ""),
    exists: Boolean(filePath) && fs.existsSync(filePath),
    event_count: Number(index && index.event_count || 0),
    lane: String(index && index.lane || ""),
    kinds: Array.isArray(index && index.kinds) ? index.kinds : [],
    last_event_at: String(index && index.last_event_at || ""),
    index_path: resolveTraceIndexPath(filePath),
    events: tail.map((entry) => ({
      kind: String((entry && entry.kind) || "trace.note"),
      timestamp: String((entry && entry.ts) || ""),
      summary: String((entry && entry.summary) || ""),
      status: String((entry && entry.status) || ""),
      scope: String((entry && entry.scope) || ""),
      source: String((entry && entry.source) || "team_core"),
    })),
  };
}

module.exports = {
  readTrace,
  readTraceIndex,
  resolveTraceLanePaths,
  resolveTraceIndexPath,
  resolveTracePath,
  resolveTraceThreadId,
  summarizeTrace,
  tailTrace,
  writeTeamTrace,
  writeThreadTrace,
  writeTrace,
};
