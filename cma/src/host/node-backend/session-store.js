const fs = require("fs");
const fsp = fs.promises;
const os = require("os");
const path = require("path");
const childProcess = require("child_process");
const {
  emptyGitBranchMetadata,
  gitBranchMetadataForCwd,
} = require("./session-git");
const {
  collectConversationHistoryFromEvents,
  inferThreadLifecycleFromEvents,
  isCompactionEvent,
  isEnvironmentContextMessage,
  messageTextFromContent,
  normalizeThreadLifecycle,
  normalizeToolCallCounts,
  toolNameFromResponsePayload,
} = require("./session-lifecycle");
const VALID_SORTS = new Set(["updated_desc", "updated_asc", "created_desc", "created_asc", "log_desc", "log_asc"]);
const VALID_SCOPES = new Set(["live", "all", "soft_deleted"]);
const TOOL_CALL_COUNTS_LIMIT = 16;
const TOOL_NAME_MAX_LENGTH = 48;
const LIFECYCLE_MARKER_LIMIT = 8;
const LIFECYCLE_TOOL_LIMIT = 4;
const GIT_BRANCH_MAX_LENGTH = 64;
const GIT_BRANCH_TIMEOUT_MS = 120;
const SUMMARY_HEAD_LINES = 240;
const SUMMARY_TAIL_BYTES = 256 * 1024;
const DISCOVERY_CONCURRENCY = 8;
const DISCOVERY_WORKER_COUNT = Math.max(
  1,
  Math.min(8, typeof os.availableParallelism === "function" ? os.availableParallelism() : 2),
);
const SESSION_INDEX_VERSION = 3;
const SESSION_INDEX_FILENAME = "node-backend-session-index.json";
const LEGACY_SESSION_INDEX_FILENAME = "node-fallback-session-index.json";
const THREAD_STATE_VERSION = 1;
const THREAD_STATE_FILENAME = "node-backend-thread-state.json";
const LEGACY_THREAD_STATE_FILENAME = "node-fallback-thread-state.json";
const OFFICIAL_STATE_DB_FILENAME = "state_5.sqlite";
const DETAIL_EVENT_CACHE_MAX = 50;

const detailEventCache = new Map();
let sessionWorkerPoolModule = null;

function loadSessionWorkerPool() {
  if (!sessionWorkerPoolModule) {
    sessionWorkerPoolModule = require("./session-worker-pool");
  }
  return sessionWorkerPoolModule;
}

function getSessionWorkerPool(workerCount) {
  return loadSessionWorkerPool().getSessionWorkerPool(workerCount);
}

async function closeSessionWorkerPool() {
  if (!sessionWorkerPoolModule) return;
  await sessionWorkerPoolModule.closeSessionWorkerPool();
}

function unixNow() {
  return Math.floor(Date.now() / 1000);
}

function toUnixSeconds(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 100000000000 ? Math.floor(value / 1000) : Math.floor(value);
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return toUnixSeconds(numeric);
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
}

function toIsoLocal(seconds) {
  if (!seconds) return null;
  const date = new Date(Number(seconds) * 1000);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function ageSeconds(seconds, now) {
  if (!seconds) return null;
  return Math.max(0, Number(now || unixNow()) - Number(seconds));
}

function humanAge(seconds) {
  if (seconds === null || seconds === undefined) return "";
  const value = Math.max(0, Number(seconds) || 0);
  if (value < 60) return `${value}s`;
  const minutes = Math.floor(value / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function humanBytes(value) {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let next = bytes / 1024;
  let index = 0;
  while (next >= 1024 && index < units.length - 1) {
    next /= 1024;
    index += 1;
  }
  return `${next.toFixed(next >= 10 ? 0 : 1)} ${units[index]}`;
}

function parseJsonMaybe(value) {
  if (!value || typeof value !== "string") return value || null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function cleanText(value, max = 500) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? text.slice(0, max).trimEnd() : text;
}

function cleanTextBlock(value, max = 8000) {
  const text = String(value || "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return "";
  return text.length > max ? text.slice(0, max).trimEnd() : text;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function fileSizeBytes(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return 0;
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function fileSignature(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return {
      size: stat.size,
      mtimeMs: stat.mtimeMs,
    };
  } catch {
    return null;
  }
}

async function fileSizeBytesAsync(filePath) {
  try {
    if (!filePath) return 0;
    return (await fsp.stat(filePath)).size;
  } catch {
    return 0;
  }
}

function normalizePathForCompare(value) {
  if (!value) return "";
  try {
    return path.resolve(String(value));
  } catch {
    return String(value || "");
  }
}

function pathIsInside(childPath, parentPath) {
  const child = normalizePathForCompare(childPath);
  const parent = normalizePathForCompare(parentPath);
  if (!child || !parent) return false;
  const relative = path.relative(parent, child);
  return relative === "" || (relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function codexHomePath(options = {}) {
  return String(options.codexHome || path.join(os.homedir(), ".codex"));
}

function officialStateDbPath(options = {}) {
  if (options.officialStateDbPath) return String(options.officialStateDbPath);
  return path.join(codexHomePath(options), OFFICIAL_STATE_DB_FILENAME);
}

function defaultProcess() {
  return { pid: null, alive: false, summary: null };
}

function computeStatus(thread, now) {
  const process = safeObject(thread.process);
  if (process.alive) return "running";
  if (thread.archived) return "archived";
  const logAge = ageSeconds(thread.last_log_ts, now);
  const updatedAge = ageSeconds(thread.updated_at, now);
  const recentAge = logAge === null ? updatedAge : Math.min(logAge, updatedAge === null ? logAge : updatedAge);
  if (recentAge !== null && recentAge <= 15 * 60) return "active";
  if (recentAge !== null && recentAge <= 24 * 60 * 60) return "recent";
  return "idle";
}

function officialThreadMetadataFromRows(rows) {
  const byId = new Map();
  const byPath = new Map();
  safeArray(rows).forEach((row) => {
    const data = safeObject(row);
    const id = String(data.id || "").trim();
    const rolloutPath = String(data.rollout_path || "").trim();
    const updatedAtMs = Number(data.updated_at_ms || 0);
    const updatedAt = toUnixSeconds(updatedAtMs || data.updated_at);
    const record = {
      id,
      rollout_path: rolloutPath,
      archived: Number(data.archived || 0) ? 1 : 0,
      archived_at: toUnixSeconds(data.archived_at),
      title: cleanText(data.title, 240),
      cwd: String(data.cwd || "").trim(),
      model_provider: String(data.model_provider || "").trim(),
      updated_at: updatedAt,
      updated_at_iso: toIsoLocal(updatedAt),
    };
    if (id) byId.set(id, record);
    if (rolloutPath) byPath.set(normalizePathForCompare(rolloutPath), record);
  });
  byId.byPath = byPath;
  return byId;
}

function readOfficialThreadMetadata(options = {}) {
  if (options.officialThreadMetadata instanceof Map) return options.officialThreadMetadata;
  if (options.officialThreadMetadata && typeof options.officialThreadMetadata === "object") {
    return officialThreadMetadataFromRows(Object.values(options.officialThreadMetadata));
  }
  const dbPath = officialStateDbPath(options);
  try {
    if (!dbPath || !fs.existsSync(dbPath)) return new Map();
    if (typeof options.sqliteRunner === "function") {
      return officialThreadMetadataFromRows(options.sqliteRunner(dbPath));
    }
    const sql = "SELECT id, rollout_path, archived, archived_at, title, cwd, model_provider, updated_at, updated_at_ms FROM threads;";
    const output = childProcess.execFileSync("sqlite3", ["-readonly", "-json", dbPath, sql], {
      encoding: "utf8",
      timeout: Number(options.sqliteTimeout || 1800),
      stdio: ["ignore", "pipe", "pipe"],
    });
    return officialThreadMetadataFromRows(JSON.parse(String(output || "[]")));
  } catch {
    return new Map();
  }
}

function applyOfficialThreadMetadata(thread, officialMetadata, options = {}) {
  const next = thread && typeof thread === "object" ? { ...thread } : null;
  if (!next || !next.id || !officialMetadata) return next;
  const byPath = officialMetadata.byPath instanceof Map ? officialMetadata.byPath : new Map();
  const record = officialMetadata.get(next.id) || byPath.get(normalizePathForCompare(next.rollout_path || ""));
  if (!record) return next;
  if (record.title) {
    next.title = record.title;
    next.db_title = record.title;
  }
  if (record.cwd) next.cwd = record.cwd;
  if (record.model_provider) next.model_provider = record.model_provider;
  if (record.rollout_path && !next.rollout_path) next.rollout_path = record.rollout_path;
  if (record.updated_at) {
    next.updated_at = record.updated_at;
    next.updated_at_iso = record.updated_at_iso || toIsoLocal(record.updated_at);
  }
  if (record.archived) {
    next.archived = 1;
    next.archived_at = record.archived_at || next.archived_at || null;
  }
  next.status = computeStatus(next, options.now || unixNow());
  return next;
}

function readProcessRows(options = {}) {
  if (Array.isArray(options.processRows)) return options.processRows;
  try {
    const output = childProcess.execFileSync("ps", ["-eo", "pid=,command="], {
      encoding: "utf8",
      timeout: Number(options.processTimeout || 1000),
      stdio: ["ignore", "pipe", "ignore"],
    });
    return String(output || "").split(/\r?\n/).map((line) => {
      const match = line.match(/^\s*(\d+)\s+(.+)$/);
      return match ? { pid: Number(match[1]), command: match[2] } : null;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function shellContainsToken(command, token) {
  const escaped = String(token || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Boolean(escaped && new RegExp(`(^|\\s|["'])${escaped}($|\\s|["'])`).test(String(command || "")));
}

function processEvidenceForThread(thread, processRows) {
  const threadId = String(thread && thread.id || "").trim();
  if (!threadId) return null;
  const direct = safeArray(processRows).find((row) => {
    const command = String(row && row.command || "");
    return /\bcodex\b/i.test(command) && /\bresume\b/i.test(command) && shellContainsToken(command, threadId);
  });
  if (!direct) return null;
  return {
    pid: Number(direct.pid || 0) || null,
    alive: true,
    summary: "Codex CLI resume process detected for this session.",
    command: cleanText(direct.command, 500),
  };
}

function applyProcessEvidence(thread, processRows) {
  const next = thread && typeof thread === "object" ? { ...thread } : null;
  if (!next || !next.id || next.soft_deleted) return next;
  const evidence = processEvidenceForThread(next, processRows);
  if (!evidence) return next;
  next.process = evidence;
  next.status = "running";
  return next;
}

function normalizeThreadSummary(rawThread, options = {}) {
  const raw = safeObject(rawThread);
  const now = Number(options.now || unixNow());
  const previewLogs = safeArray(raw.preview_logs);
  const history = safeArray(raw.history);
  const threadId = String(raw.id || raw.thread_id || raw.session_id || "").trim();
  const rolloutPath = raw.rollout_path || raw.path || raw.filePath || raw.file_path || "";
  const createdAt = toUnixSeconds(raw.created_at || raw.createdAt || raw.started_at || raw.timestamp);
  const updatedAt = toUnixSeconds(raw.updated_at || raw.updatedAt || raw.finished_at || raw.last_modified || createdAt);
  const lastLogTs = toUnixSeconds(raw.last_log_ts || raw.lastLogTs || raw.log_ts);
  const storageBytes = Number(raw.storage_bytes ?? raw.storageBytes ?? fileSizeBytes(rolloutPath));
  const archived = Boolean(raw.archived);
  const softDeleted = Boolean(raw.soft_deleted);
  const toolCallCounts = normalizeToolCallCounts(raw.tool_call_counts);
  const toolCallCount = Math.max(0, Math.round(Number(raw.tool_call_count ?? toolCallCounts.reduce((sum, item) => sum + item.count, 0))));
  const gitStatus = raw.git_branch_status || (raw.git_branch ? "known" : undefined);
  const normalized = {
    id: threadId,
    title: String(raw.title || raw.db_title || raw.prompt || threadId || "Thread"),
    db_title: raw.db_title || raw.title || null,
    cwd: raw.cwd || raw.working_directory || "",
    archived: archived ? 1 : 0,
    status: raw.status || "idle",
    created_at: createdAt,
    updated_at: updatedAt,
    created_at_iso: raw.created_at_iso || toIsoLocal(createdAt),
    updated_at_iso: raw.updated_at_iso || toIsoLocal(updatedAt),
    updated_age: raw.updated_age || humanAge(ageSeconds(updatedAt, now)),
    last_log_ts: lastLogTs,
    last_log_iso: raw.last_log_iso || toIsoLocal(lastLogTs),
    log_age: raw.log_age || humanAge(ageSeconds(lastLogTs, now)),
    log_count: Number(raw.log_count || 0),
    tokens_used: Number(raw.tokens_used || raw.total_tokens || 0),
    has_user_event: Number(raw.has_user_event || 0),
    model_provider: raw.model_provider || raw.provider || null,
    model: raw.model || null,
    reasoning_effort: raw.reasoning_effort || null,
    sandbox_policy: parseJsonMaybe(raw.sandbox_policy),
    approval_mode: raw.approval_mode || null,
    cli_version: raw.cli_version || null,
    rollout_path: rolloutPath,
    storage_bytes: storageBytes,
    storage_label: raw.storage_label || humanBytes(storageBytes),
    source: raw.source || "node-backend",
    process: safeObject(raw.process).pid || safeObject(raw.process).alive ? safeObject(raw.process) : defaultProcess(),
    process_uuid: raw.process_uuid || null,
    preview_logs: previewLogs.slice(0, Number(options.previewLimit || previewLogs.length || 0)),
    soft_deleted: softDeleted,
    soft_deleted_at: raw.soft_deleted_at || null,
    history: history.slice(0, Number(options.historyLimit || history.length || 0)),
    compaction_count: Number(raw.compaction_count || 0),
    last_compacted_at: raw.last_compacted_at || null,
    user_command_count: Number(raw.user_command_count || 0),
    assistant_message_count: Number(raw.assistant_message_count || 0),
    rollout_user_message_count: Number(raw.rollout_user_message_count || 0),
    tool_call_count: toolCallCount,
    tool_call_counts: toolCallCounts,
    lifecycle: normalizeThreadLifecycle(raw.lifecycle),
    git_branch: raw.git_branch || null,
    git_branch_status: gitStatus || null,
    git_branch_error: raw.git_branch_error || null,
    git_has_remote: Boolean(raw.git_has_remote),
    git_remote_name: raw.git_remote_name || null,
  };
  normalized.status = raw.status || computeStatus(normalized, now);
  return normalized;
}

function normalizeQuery(query = {}) {
  const limit = Math.min(500, Math.max(1, Number(query.limit || 100)));
  const offset = Math.max(0, Number(query.offset || 0));
  const sort = VALID_SORTS.has(query.sort) ? query.sort : "updated_desc";
  const scope = VALID_SCOPES.has(query.scope) ? query.scope : "live";
  return {
    q: String(query.q || "").trim(),
    ids: String(query.ids || "").split(",").map((item) => item.trim()).filter(Boolean),
    archived: query.archived === undefined || query.archived === null || query.archived === "" ? null : Number(query.archived),
    status: String(query.status || "").trim(),
    scope,
    limit,
    offset,
    sort,
    include_logs: query.include_logs === true || query.include_logs === "true",
    include_history: query.include_history === true || query.include_history === "true",
    include_git: query.include_git === true || query.include_git === "true",
    history_limit: Math.min(24, Math.max(1, Number(query.history_limit || 6))),
    preview_limit: Math.min(8, Math.max(1, Number(query.preview_limit || 3))),
  };
}

function matchesQuery(thread, query) {
  if (query.ids.length && !query.ids.includes(thread.id)) return false;
  if (query.q) {
    const haystack = `${thread.title} ${thread.id} ${thread.cwd}`.toLowerCase();
    if (!haystack.includes(query.q.toLowerCase())) return false;
  }
  if (query.archived === 0 && thread.archived) return false;
  if (query.archived === 1 && !thread.archived) return false;
  if (query.status && thread.status !== query.status) return false;
  if (query.scope === "live" && (thread.soft_deleted || thread.archived)) return false;
  if (query.scope === "soft_deleted" && !thread.soft_deleted) return false;
  return true;
}

function matchesScope(thread, scope) {
  if (scope === "live") return !thread.soft_deleted && !thread.archived;
  if (scope === "soft_deleted") return Boolean(thread.soft_deleted);
  return true;
}

function compareThreads(sort) {
  const direction = sort.endsWith("_asc") ? 1 : -1;
  const field = sort.startsWith("created") ? "created_at" : sort.startsWith("log") ? "last_log_ts" : "updated_at";
  return (left, right) => {
    const a = Number(left[field] || 0);
    const b = Number(right[field] || 0);
    if (a === b) return String(left.id).localeCompare(String(right.id));
    return a > b ? direction : -direction;
  };
}

function buildCounts(threads) {
  const counts = { running: 0, active: 0, recent: 0, idle: 0, archived: 0 };
  threads.forEach((thread) => {
    counts[thread.status] = (counts[thread.status] || 0) + 1;
  });
  return counts;
}

function normalizeThreadsResponse(rawThreads, queryInput = {}, options = {}) {
  const now = Number(options.now || unixNow());
  const query = normalizeQuery(queryInput);
  const scanStats = safeObject(options.scanStats || (rawThreads && rawThreads.scanStats));
  const normalized = safeArray(rawThreads)
    .map((thread) => normalizeThreadSummary(thread, { now, previewLimit: query.preview_limit, historyLimit: query.history_limit }))
    .filter((thread) => thread.id);
  const filtered = normalized.filter((thread) => matchesQuery(thread, query)).sort(compareThreads(query.sort));
  const items = filtered.slice(query.offset, query.offset + query.limit).map((thread) => ({
    ...thread,
    preview_logs: query.include_logs ? thread.preview_logs : [],
    history: query.include_history ? thread.history : [],
  }));
  return {
    meta: {
      now,
      now_iso: toIsoLocal(now),
      total: filtered.length,
      limit: query.limit,
      offset: query.offset,
      q: query.q || null,
      archived: query.archived,
      status: query.status || null,
      scope: query.scope,
      sort: query.sort,
      effective_sort: query.sort,
      counts: buildCounts(normalized.filter((thread) => matchesScope(thread, query.scope))),
      soft_deleted_total: normalized.filter((thread) => thread.soft_deleted).length,
      backendMode: "node",
      readOnly: false,
      scan_stats: Object.keys(scanStats).length ? scanStats : null,
    },
    items,
  };
}

function collectSessionLogsFromEvents(events, limit) {
  const max = Math.min(120, Math.max(1, Number(limit || 20)));
  const logs = [];
  safeArray(events).forEach((event, index) => {
    const obj = safeObject(event);
    const timestamp = toUnixSeconds(obj.timestamp);
    if (obj.type === "response_item") {
      const payload = safeObject(obj.payload);
      if (payload.type === "tool_use" || payload.type.endsWith("_call")) {
        logs.push({
          ts: toIsoLocal(timestamp) || "",
          ts_iso: toIsoLocal(timestamp) || "",
          source_index: index,
          level: "tool_call",
          message: String(payload.name || payload.tool_name || ""),
          target: String(payload.input || ""),
        });
      }
    } else if (obj.type === "execution_log" || obj.type === "execution.stdout" || obj.type === "execution.stderr") {
      logs.push({
        ts: toIsoLocal(timestamp) || "",
        ts_iso: toIsoLocal(timestamp) || "",
        source_index: index,
        level: obj.type.endsWith("stderr") ? "error" : "log",
        message: safeObject(obj.payload).message || safeObject(obj.payload).text || "",
        target: "",
      });
    } else if (obj.type === "event_msg" && safeObject(obj.payload).type === "token_count") {
      logs.push({
        ts: toIsoLocal(timestamp) || "",
        ts_iso: toIsoLocal(timestamp) || "",
        source_index: index,
        level: "metric",
        message: `token_count: ${safeObject(safeObject(obj.payload).info).total_token_usage?.total_tokens || "?"}`,
        target: "",
      });
    }
  });
  return logs.slice(-max);
}

function detailEventCacheKey(filePath) {
  if (!filePath) return null;
  const sig = fileSignature(filePath);
  return sig ? `${filePath}::${sig.size}::${sig.mtimeMs}` : null;
}

function trimDetailEventCache() {
  if (detailEventCache.size <= DETAIL_EVENT_CACHE_MAX) return;
  const keys = [...detailEventCache.keys()];
  const toDelete = keys.slice(0, keys.length - DETAIL_EVENT_CACHE_MAX);
  toDelete.forEach((key) => detailEventCache.delete(key));
}

async function normalizeThreadDetail(rawThread, options = {}) {
  const now = Number(options.now || unixNow());
  const raw = safeObject(rawThread);
  const historyLimit = Math.min(240, Math.max(1, Number(options.historyLimit || 16)));
  const logLimit = Math.min(120, Math.max(0, Number(options.logLimit || 20)));
  const rolloutPath = raw.rollout_path || raw.path || raw.filePath || raw.file_path || "";
  const existingHistory = safeArray(raw.history);
  let detailLifecycle = safeObject(raw.lifecycle);
  let detailHistory = existingHistory.length
    ? existingHistory.slice(-historyLimit)
    : [];
  let detailLogs = safeArray(raw.logs);
  if ((!detailHistory.length || !detailLogs.length) && rolloutPath) {
    const cacheKey = detailEventCacheKey(rolloutPath);
    let sampleEvents;
    if (cacheKey && detailEventCache.has(cacheKey)) {
      sampleEvents = detailEventCache.get(cacheKey);
    } else {
      sampleEvents = await readJsonlSummarySampleAsync(rolloutPath);
      if (cacheKey) {
        detailEventCache.set(cacheKey, sampleEvents);
        trimDetailEventCache();
      }
    }
    if (!detailHistory.length) {
      detailHistory = collectConversationHistoryFromEvents(sampleEvents, { limit: historyLimit });
    }
    if (!detailLogs.length && logLimit > 0) {
      detailLogs = collectSessionLogsFromEvents(sampleEvents, logLimit);
    }
    if (!Object.keys(detailLifecycle).length) {
      detailLifecycle = inferThreadLifecycleFromEvents(sampleEvents);
    }
  }
  const thread = normalizeThreadSummary(
    { ...raw, history: detailHistory, lifecycle: detailLifecycle },
    { now, previewLimit: Number(options.previewLimit || 8), historyLimit },
  );
  if (!thread.id) {
    const error = new Error("thread not found");
    error.statusCode = 404;
    throw error;
  }
  return {
    meta: {
      now,
      now_iso: toIsoLocal(now),
      backendMode: "node",
      readOnly: false,
    },
    thread,
    logs: detailLogs,
    hint_commands: {
      resume: `codex resume ${thread.id}`,
      fork: `codex fork ${thread.id}`,
    },
  };
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

async function readJsonlAsync(filePath) {
  try {
    if (!filePath) return [];
    return parseJsonLines(await fsp.readFile(filePath, "utf8"));
  } catch {
    return [];
  }
}

function parseJsonLines(text) {
  return String(text || "")
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
}

function readJsonlSummarySample(filePath, options = {}) {
  let fd;
  try {
    if (!filePath || !fs.existsSync(filePath)) return [];
    const stat = fs.statSync(filePath);
    const headLines = Math.max(20, Number(options.headLines || SUMMARY_HEAD_LINES));
    const tailBytes = Math.max(16 * 1024, Number(options.tailBytes || SUMMARY_TAIL_BYTES));
    if (stat.size <= tailBytes * 2) return readJsonl(filePath);
    fd = fs.openSync(filePath, "r");
    const headBuffer = Buffer.alloc(Math.min(stat.size, tailBytes));
    const headRead = fs.readSync(fd, headBuffer, 0, headBuffer.length, 0);
    const tailBuffer = Buffer.alloc(Math.min(stat.size, tailBytes));
    const tailStart = Math.max(0, stat.size - tailBuffer.length);
    const tailRead = fs.readSync(fd, tailBuffer, 0, tailBuffer.length, tailStart);
    const head = headBuffer.subarray(0, headRead).toString("utf8").split(/\r?\n/, headLines).join("\n");
    const tail = tailBuffer.subarray(0, tailRead).toString("utf8");
    const events = parseJsonLines(`${head}\n${tail}`);
    if (!events.length && stat.size > 0) return parseJsonLines(head);
    return events;
  } catch {
    return [];
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {}
    }
  }
}

async function readJsonlSummarySampleAsync(filePath, options = {}) {
  let fileHandle;
  try {
    if (!filePath) return [];
    const stat = await fsp.stat(filePath);
    const headLines = Math.max(20, Number(options.headLines || SUMMARY_HEAD_LINES));
    const tailBytes = Math.max(16 * 1024, Number(options.tailBytes || SUMMARY_TAIL_BYTES));
    if (stat.size <= tailBytes * 2) return readJsonlAsync(filePath);
    fileHandle = await fsp.open(filePath, "r");
    const headBuffer = Buffer.alloc(Math.min(stat.size, tailBytes));
    const headRead = await fileHandle.read(headBuffer, 0, headBuffer.length, 0);
    const tailBuffer = Buffer.alloc(Math.min(stat.size, tailBytes));
    const tailStart = Math.max(0, stat.size - tailBuffer.length);
    const tailRead = await fileHandle.read(tailBuffer, 0, tailBuffer.length, tailStart);
    const head = headBuffer.subarray(0, headRead.bytesRead).toString("utf8").split(/\r?\n/, headLines).join("\n");
    const tail = tailBuffer.subarray(0, tailRead.bytesRead).toString("utf8");
    const events = parseJsonLines(`${head}\n${tail}`);
    if (!events.length && stat.size > 0) return parseJsonLines(head);
    return events;
  } catch {
    return [];
  } finally {
    if (fileHandle) {
      try {
        await fileHandle.close();
      } catch {}
    }
  }
}

function sessionIdFromPath(filePath) {
  const basename = path.basename(String(filePath || ""));
  const match = basename.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match ? match[1] : path.basename(basename, path.extname(basename));
}

function sessionSearchRoot(options = {}) {
  if (options.sessionsDir) return String(options.sessionsDir);
  return path.join(codexHomePath(options), "sessions");
}

function sessionSearchRoots(options = {}) {
  if (options.sessionsDir) return [String(options.sessionsDir)];
  const codexHome = codexHomePath(options);
  return [
    path.join(codexHome, "sessions"),
    path.join(codexHome, "archived_sessions"),
  ];
}

function isArchivedSessionFile(filePath, options = {}) {
  if (options.sessionsDir) return Boolean(options.archivedSessionSource);
  return pathIsInside(filePath, path.join(codexHomePath(options), "archived_sessions"));
}

function findSessionFiles(options = {}) {
  const limit = Number(options.limit || 0);
  const files = [];
  function visit(dirPath) {
    let entries = [];
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }
    entries.forEach((entry) => {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
      } else if (entry.isFile() && /^rollout-.*\.jsonl$/.test(entry.name)) {
        files.push(entryPath);
      }
    });
  }
  sessionSearchRoots(options).forEach((root) => visit(root));
  const sorted = files.sort((left, right) => {
    const leftMtime = fileMtimeMs(left);
    const rightMtime = fileMtimeMs(right);
    if (leftMtime === rightMtime) return left.localeCompare(right);
    return rightMtime - leftMtime;
  });
  return limit > 0 ? sorted.slice(0, limit) : sorted;
}

function applySessionFileSource(thread, filePath, options = {}) {
  const next = thread && typeof thread === "object" ? { ...thread } : null;
  if (!next) return next;
  if (isArchivedSessionFile(filePath || next.rollout_path, options)) {
    next.archived = 1;
    next.status = "archived";
  }
  return next;
}

function fileMtimeMs(filePath) {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

function fileTimes(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return {
      created_at: toUnixSeconds(stat.birthtimeMs || stat.ctimeMs),
      updated_at: toUnixSeconds(stat.mtimeMs),
    };
  } catch {
    const now = unixNow();
    return { created_at: now, updated_at: now };
  }
}

async function fileTimesAsync(filePath) {
  try {
    const stat = await fsp.stat(filePath);
    return {
      created_at: toUnixSeconds(stat.birthtimeMs || stat.ctimeMs),
      updated_at: toUnixSeconds(stat.mtimeMs),
    };
  } catch {
    const now = unixNow();
    return { created_at: now, updated_at: now };
  }
}

function summarizeSessionEvents(filePath, events, statBytes, times, options = {}) {
  let sessionMeta = {};
  let turnModel = "";
  let turnReasoningEffort = "";
  let firstUserMessage = "";
  let updatedAt = times.updated_at;
  let tokensUsed = 0;
  let hasUserEvent = 0;
  let userCommandCount = 0;
  let assistantMessageCount = 0;
  let compactionCount = 0;
  let lastCompactedAt = null;
  let threadId = sessionIdFromPath(filePath);
  const toolCounts = new Map();
  events.forEach((event) => {
    const obj = safeObject(event);
    const payload = safeObject(obj.payload);
    const timestamp = toUnixSeconds(obj.timestamp);
    if (timestamp !== null) updatedAt = Math.max(updatedAt || timestamp, timestamp);
    const toolName = obj.type === "response_item" ? toolNameFromResponsePayload(payload) : null;
    if (toolName) {
      toolCounts.set(toolName, (toolCounts.get(toolName) || 0) + 1);
    }
    if (obj.type === "session_meta" && Object.keys(payload).length) {
      sessionMeta = payload;
      threadId = String(payload.id || threadId).trim();
    } else if (obj.type === "thread.started" && obj.thread_id) {
      threadId = String(obj.thread_id).trim();
    } else if (obj.type === "turn_context" && Object.keys(payload).length) {
      if (payload.model) turnModel = String(payload.model || "").trim();
      if (payload.effort) turnReasoningEffort = String(payload.effort || "").trim();
      const collaborationSettings = safeObject(safeObject(payload.collaboration_mode).settings);
      if (!turnModel && collaborationSettings.model) {
        turnModel = String(collaborationSettings.model || "").trim();
      }
      if (!turnReasoningEffort && collaborationSettings.reasoning_effort) {
        turnReasoningEffort = String(collaborationSettings.reasoning_effort || "").trim();
      }
    } else if (obj.type === "response_item" && payload.type === "message") {
      const text = messageTextFromContent(payload.content);
      if (payload.role === "user" && text && !isEnvironmentContextMessage(text)) {
        userCommandCount += 1;
        if (!firstUserMessage) {
          firstUserMessage = cleanText(text, 500);
          hasUserEvent = 1;
        }
      } else if (payload.role === "assistant") {
        assistantMessageCount += 1;
      }
    } else if (obj.type === "event_msg" && payload.type === "user_message") {
      const text = cleanText(payload.message, 500);
      if (text && !isEnvironmentContextMessage(text)) {
        userCommandCount += 1;
      }
      if (text && !firstUserMessage) {
        firstUserMessage = text;
        hasUserEvent = 1;
      }
    } else if (obj.type === "event_msg" && payload.type === "token_count") {
      const totalUsage = safeObject(safeObject(payload.info).total_token_usage);
      tokensUsed = Math.max(tokensUsed, Number(totalUsage.total_tokens || 0));
    }
    if (isCompactionEvent(obj, payload)) {
      compactionCount += 1;
      const compactedAt = toIsoLocal(timestamp);
      if (compactedAt) lastCompactedAt = compactedAt;
    }
  });
  const toolCallCounts = [...toolCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, TOOL_CALL_COUNTS_LIMIT);
  const createdAt = toUnixSeconds(sessionMeta.timestamp) || times.created_at;
  const title = cleanText(firstUserMessage || sessionMeta.source || threadId, 240) || threadId;
  const shouldIncludeGit = options.includeGit !== false;
  const gitBranchMetadata = shouldIncludeGit ? gitBranchMetadataForCwd(sessionMeta.cwd || "", options.gitCache) : emptyGitBranchMetadata("not_requested");
  return normalizeThreadSummary({
    id: threadId,
    title,
    cwd: sessionMeta.cwd || "",
    created_at: createdAt,
    updated_at: updatedAt,
    source: sessionMeta.source || "cli",
    model_provider: sessionMeta.model_provider || "openai",
    model: turnModel || sessionMeta.model || "",
    reasoning_effort: turnReasoningEffort || sessionMeta.reasoning_effort || "",
    sandbox_policy: JSON.stringify(sessionMeta.sandbox_policy || {}),
    approval_mode: sessionMeta.approval_policy || "",
    tokens_used: tokensUsed,
    has_user_event: hasUserEvent,
    user_command_count: userCommandCount,
    rollout_user_message_count: userCommandCount,
    assistant_message_count: assistantMessageCount,
    compaction_count: compactionCount,
    last_compacted_at: lastCompactedAt,
    cli_version: sessionMeta.cli_version || "",
    rollout_path: filePath,
    storage_bytes: statBytes,
    first_user_message: firstUserMessage,
    tool_call_count: toolCallCounts.reduce((sum, item) => sum + item.count, 0),
    tool_call_counts: toolCallCounts,
    lifecycle: inferThreadLifecycleFromEvents(events),
    ...gitBranchMetadata,
    status: "idle",
  });
}

function summarizeSessionFile(filePath, options = {}) {
  const events = options.full ? readJsonl(filePath) : readJsonlSummarySample(filePath, options);
  const statBytes = fileSizeBytes(filePath);
  const times = fileTimes(filePath);
  return summarizeSessionEvents(filePath, events, statBytes, times, options);
}

async function summarizeSessionFileAsync(filePath, options = {}) {
  const [events, statBytes, times] = await Promise.all([
    options.full ? readJsonlAsync(filePath) : readJsonlSummarySampleAsync(filePath, options),
    fileSizeBytesAsync(filePath),
    fileTimesAsync(filePath),
  ]);
  return summarizeSessionEvents(filePath, events, statBytes, times, options);
}

async function mapLimit(items, concurrency, mapper) {
  const list = Array.isArray(items) ? items : [];
  const limit = Math.max(1, Math.min(list.length || 1, Number(concurrency || DISCOVERY_CONCURRENCY)));
  const results = new Array(list.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < list.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(list[index], index);
    }
  }
  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

function attachScanStats(threads, stats, options = {}) {
  const list = Array.isArray(threads) ? threads : [];
  const payload = {
    ...stats,
    durationMs: Math.max(0, Date.now() - Number(stats.startedAt || Date.now())),
  };
  delete payload.startedAt;
  options.scanStats = payload;
  Object.defineProperty(list, "scanStats", {
    value: payload,
    enumerable: false,
    configurable: true,
  });
  return list;
}

async function summarizeSessionFilesWithWorkers(files, options = {}) {
  const list = Array.isArray(files) ? files : [];
  if (!list.length) return [];
  const workerCount = Math.max(1, Math.min(list.length, Number(options.workerCount || DISCOVERY_WORKER_COUNT)));
  if (workerCount <= 1) {
    return mapLimit(list, 1, (filePath) => summarizeSessionFileAsync(filePath, options));
  }
  const pool = options.workerPool || getSessionWorkerPool(workerCount);
  return Promise.all(list.map((filePath, index) => pool.run(filePath, options, index)));
}

function sessionIndexPath(options = {}) {
  if (options.indexPath) return String(options.indexPath);
  if (options.sessionIndexPath) return String(options.sessionIndexPath);
  const codexHome = options.codexHome || path.join(os.homedir(), ".codex");
  return path.join(String(codexHome), SESSION_INDEX_FILENAME);
}

function sessionIndexReadPath(options = {}) {
  const primaryPath = sessionIndexPath(options);
  if (options.indexPath || options.sessionIndexPath || fs.existsSync(primaryPath)) return primaryPath;
  const codexHome = options.codexHome || path.join(os.homedir(), ".codex");
  const legacyPath = path.join(String(codexHome), LEGACY_SESSION_INDEX_FILENAME);
  return fs.existsSync(legacyPath) ? legacyPath : primaryPath;
}

function emptySessionIndex() {
  return {
    version: SESSION_INDEX_VERSION,
    entries: {},
  };
}

function threadStatePath(options = {}) {
  if (options.threadStatePath) return String(options.threadStatePath);
  const codexHome = options.codexHome || path.join(os.homedir(), ".codex");
  return path.join(String(codexHome), THREAD_STATE_FILENAME);
}

function threadStateReadPath(options = {}) {
  const primaryPath = threadStatePath(options);
  if (options.threadStatePath || fs.existsSync(primaryPath)) return primaryPath;
  const codexHome = options.codexHome || path.join(os.homedir(), ".codex");
  const legacyPath = path.join(String(codexHome), LEGACY_THREAD_STATE_FILENAME);
  return fs.existsSync(legacyPath) ? legacyPath : primaryPath;
}

function emptyThreadState() {
  return {
    version: THREAD_STATE_VERSION,
    threads: {},
  };
}

function readThreadState(options = {}) {
  try {
    const parsed = JSON.parse(fs.readFileSync(threadStateReadPath(options), "utf8"));
    if (!parsed || parsed.version !== THREAD_STATE_VERSION || !parsed.threads || typeof parsed.threads !== "object") {
      return emptyThreadState();
    }
    return parsed;
  } catch {
    return emptyThreadState();
  }
}

function writeThreadState(options = {}, state = emptyThreadState()) {
  const statePath = threadStatePath(options);
  const tmpPath = `${statePath}.tmp-${process.pid}`;
  try {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(tmpPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    fs.renameSync(tmpPath, statePath);
  } catch {
    try {
      fs.rmSync(tmpPath, { force: true });
    } catch {}
  }
}

function applyThreadState(thread, state, options = {}) {
  const next = thread && typeof thread === "object" ? { ...thread } : null;
  if (!next || !next.id) return next;
  const record = safeObject(safeObject(state).threads && safeObject(state).threads[next.id]);
  if (!Object.keys(record).length) return next;
  if (typeof record.title === "string" && record.title.trim()) {
    next.title = cleanText(record.title, 240);
    next.db_title = next.title;
  }
  if (typeof record.archived === "boolean") next.archived = record.archived ? 1 : 0;
  if (typeof record.soft_deleted === "boolean") next.soft_deleted = record.soft_deleted;
  if (record.soft_deleted_at !== undefined) next.soft_deleted_at = record.soft_deleted_at;
  next.status = computeStatus(next, options.now || unixNow());
  return next;
}

function applyThreadStateList(threads, state, options = {}) {
  return safeArray(threads).map((thread) => applyThreadState(thread, state, options)).filter((thread) => thread && thread.id);
}

function normalizeThreadIds(ids) {
  return safeArray(ids)
    .map((id) => String(id || "").trim())
    .filter(Boolean);
}

function applyLifecycleAction(options = {}, action, ids) {
  const normalizedAction = String(action || "").trim();
  const targetIds = normalizeThreadIds(ids);
  const skipped = [];
  const updated = [];
  if (!targetIds.length) return { ok: true, updated, deleted: [], skipped };
  if (normalizedAction === "hard_delete") {
    const error = new Error("Node backend does not support hard_delete.");
    error.statusCode = 409;
    throw error;
  }
  const patches = {
    archive: { archived: true, soft_deleted: false, soft_deleted_at: null },
    unarchive: { archived: false },
    soft_delete: { archived: false, soft_deleted: true, soft_deleted_at: new Date().toISOString() },
    restore: { archived: false, soft_deleted: false, soft_deleted_at: null },
  };
  const patch = patches[normalizedAction];
  if (!patch) {
    const error = new Error(`unsupported lifecycle action: ${normalizedAction}`);
    error.statusCode = 400;
    throw error;
  }
  const state = readThreadState(options);
  targetIds.forEach((id) => {
    if (!id) {
      skipped.push({ id, reason: "missing id" });
      return;
    }
    state.threads[id] = {
      ...safeObject(state.threads[id]),
      ...patch,
      updated_at: new Date().toISOString(),
    };
    updated.push({ id });
  });
  writeThreadState(options, state);
  return { ok: true, updated, deleted: [], skipped };
}

function readSessionIndex(options = {}) {
  try {
    const parsed = JSON.parse(fs.readFileSync(sessionIndexReadPath(options), "utf8"));
    if (!parsed || parsed.version !== SESSION_INDEX_VERSION || !parsed.entries || typeof parsed.entries !== "object") {
      return emptySessionIndex();
    }
    return parsed;
  } catch {
    return emptySessionIndex();
  }
}

function writeSessionIndex(options = {}, index = emptySessionIndex()) {
  const indexPath = sessionIndexPath(options);
  const tmpPath = `${indexPath}.tmp-${process.pid}`;
  try {
    fs.mkdirSync(path.dirname(indexPath), { recursive: true });
    fs.writeFileSync(tmpPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
    fs.renameSync(tmpPath, indexPath);
  } catch {
    try {
      fs.rmSync(tmpPath, { force: true });
    } catch {}
  }
}

function sessionIndexEntryKey(filePath, options = {}) {
  return JSON.stringify({
    filePath: String(filePath || ""),
    includeGit: options.includeGit !== false,
    full: Boolean(options.full),
    headLines: Number(options.headLines || SUMMARY_HEAD_LINES),
    tailBytes: Number(options.tailBytes || SUMMARY_TAIL_BYTES),
  });
}

function sessionIndexEntryMatches(entry, signature) {
  return Boolean(
    entry &&
    signature &&
    entry.thread &&
    Number(entry.size) === Number(signature.size) &&
    Number(entry.mtimeMs) === Number(signature.mtimeMs)
  );
}

function refreshIndexedThread(thread, options = {}, gitCache) {
  if (!thread || !thread.id) return thread;
  if (options.includeGit === false) {
    return {
      ...thread,
      ...emptyGitBranchMetadata("not_requested"),
    };
  }
  return {
    ...thread,
    ...gitBranchMetadataForCwd(thread.cwd || "", gitCache),
  };
}

function finalizeDiscoveredThreads(threads, options = {}) {
  const officialMetadata = readOfficialThreadMetadata(options);
  const threadState = readThreadState(options);
  const processRows = readProcessRows(options);
  return applyThreadStateList(
    safeArray(threads)
      .map((thread) => applySessionFileSource(thread, thread && thread.rollout_path, options))
      .map((thread) => applyOfficialThreadMetadata(thread, officialMetadata, options))
      .map((thread) => applyProcessEvidence(thread, processRows))
      .filter((thread) => thread && thread.id),
    threadState,
    options,
  );
}

function discoverSessionThreads(options = {}) {
  const gitCache = new Map();
  const threads = findSessionFiles(options)
    .map((filePath) => applySessionFileSource(summarizeSessionFile(filePath, { ...options, gitCache }), filePath, options))
    .filter((thread) => thread && thread.id);
  return finalizeDiscoveredThreads(threads, options);
}

async function discoverSessionThreadsParallel(options = {}) {
  const startedAt = Date.now();
  const files = findSessionFiles(options);
  const useWorkers = options.useWorkers !== false && files.length > 1;
  const baseStats = {
    totalFiles: files.length,
    indexed: 0,
    reparsed: 0,
    workerCount: 0,
    indexPath: options.useIndex === false ? null : sessionIndexPath(options),
    indexEnabled: options.useIndex !== false,
    startedAt,
  };
  const gitCache = new Map();
  if (options.useIndex !== false) {
    const index = readSessionIndex(options);
    const staleJobs = [];
    const threads = new Array(files.length);
    let changed = false;

    files.forEach((filePath, position) => {
      const key = sessionIndexEntryKey(filePath, options);
      const signature = fileSignature(filePath);
      if (sessionIndexEntryMatches(index.entries[key], signature)) {
        baseStats.indexed += 1;
        threads[position] = applySessionFileSource(refreshIndexedThread(index.entries[key].thread, options, gitCache), filePath, options);
        return;
      }
      staleJobs.push({ filePath, position, key, signature });
    });

    Object.keys(index.entries).forEach((key) => {
      const entry = index.entries[key];
      if (entry && entry.filePath && !fs.existsSync(entry.filePath)) {
        delete index.entries[key];
        changed = true;
      }
    });

    if (staleJobs.length) {
      baseStats.reparsed = staleJobs.length;
      baseStats.workerCount = useWorkers
        ? Math.max(1, Math.min(staleJobs.length, Number(options.workerCount || DISCOVERY_WORKER_COUNT)))
        : 0;
      const freshThreads = useWorkers
        ? await summarizeSessionFilesWithWorkers(staleJobs.map((job) => job.filePath), options)
        : await mapLimit(staleJobs, options.concurrency || DISCOVERY_CONCURRENCY, (job) =>
            summarizeSessionFileAsync(job.filePath, { ...options, gitCache }));
      freshThreads.forEach((thread, indexInBatch) => {
        const job = staleJobs[indexInBatch];
        threads[job.position] = applySessionFileSource(thread, job.filePath, options);
        if (thread && thread.id && job.signature) {
          index.entries[job.key] = {
            filePath: job.filePath,
            size: job.signature.size,
            mtimeMs: job.signature.mtimeMs,
            thread,
          };
          changed = true;
        }
      });
    }

    if (changed) writeSessionIndex(options, index);
    return attachScanStats(finalizeDiscoveredThreads(threads.filter((thread) => thread && thread.id), options), baseStats, options);
  }

  baseStats.reparsed = files.length;
  baseStats.workerCount = useWorkers
    ? Math.max(1, Math.min(files.length, Number(options.workerCount || DISCOVERY_WORKER_COUNT)))
    : 0;
  const threads = useWorkers
    ? await summarizeSessionFilesWithWorkers(files, options)
    : await mapLimit(files, options.concurrency || DISCOVERY_CONCURRENCY, (filePath) =>
        summarizeSessionFileAsync(filePath, { ...options, gitCache }));
  return attachScanStats(finalizeDiscoveredThreads(threads.map((thread, index) =>
    applySessionFileSource(thread, files[index], options)).filter((thread) => thread && thread.id), options), baseStats, options);
}

module.exports = {
  applyLifecycleAction,
  closeSessionWorkerPool,
  discoverSessionThreads,
  discoverSessionThreadsParallel,
  findSessionFiles,
  inferThreadLifecycleFromEvents,
  officialThreadMetadataFromRows,
  readSessionIndex,
  readThreadState,
  normalizeThreadDetail,
  normalizeThreadSummary,
  normalizeThreadsResponse,
  readJsonl,
  sessionIndexPath,
  summarizeSessionFile,
  summarizeSessionFileAsync,
  threadStatePath,
};
