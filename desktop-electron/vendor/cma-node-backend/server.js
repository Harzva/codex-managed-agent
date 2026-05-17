const http = require("http");
const fs = require("fs");
const childProcess = require("child_process");
const { URL } = require("url");
const os = require("os");
const path = require("path");
const {
  applyLifecycleAction,
  closeSessionWorkerPool,
  discoverSessionThreadsParallel,
  normalizeThreadDetail,
  normalizeThreadsResponse,
} = require("./session-store");
const { readPersistedUsageReport } = require("./usage-report");

const THREAD_LIST_CACHE_TTL_MS = 1500;
const WATCHLIST_FILENAME = "watchlist.json";
const WATCH_ACTIONS_FILENAME = "watch-actions.jsonl";

function jsonResponse(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function queryObject(searchParams) {
  const query = {};
  for (const [key, value] of searchParams.entries()) {
    query[key] = value;
  }
  return query;
}

function healthPayload() {
  return {
    ok: true,
    status: "ok",
    backendMode: "node",
    backendSource: "local",
    readOnly: false,
    capabilities: {
      threads: true,
      threadDetail: true,
      insights: true,
      scanSessions: true,
      lifecycle: true,
      watch: true,
      rename: false,
      hardDelete: false,
    },
  };
}

function parseCodexVersionText(raw) {
  const firstLine = String(raw || "")
    .split(/\r?\n/)
    .map((value) => String(value || "").trim())
    .find((value) => value);
  if (!firstLine) return "";
  const match = firstLine.match(/(\d+\.\d+(?:\.\d+)?(?:[-+._][A-Za-z0-9.+-]+)*)/);
  return match ? match[0] : firstLine;
}

function classifyCodexExecutableSource(executablePath) {
  const raw = String(executablePath || "").trim();
  if (!raw) return { primary: "unknown", labels: ["unknown"] };

  const normalizedPath = path.normalize(raw).replace(/\\/g, "/");
  const pathLower = normalizedPath.toLowerCase();
  const home = (os.homedir() || "").replace(/\\/g, "/").toLowerCase();
  const resourcesPath = String(process.resourcesPath || "").replace(/\\/g, "/").toLowerCase();
  const cwd = String(process.cwd() || "").replace(/\\/g, "/").toLowerCase();
  const labelSet = new Set();

  const executableName = path.basename(normalizedPath).toLowerCase();
  if (executableName !== "codex" && executableName !== "codex.cmd" && executableName !== "codex.sh" && executableName !== "codex.bat") {
    labelSet.add("wrapper");
  }

  try {
    const stats = fs.lstatSync(raw);
    if (stats.isSymbolicLink()) {
      labelSet.add("symlink");
    }
  } catch {
    // If this fails, keep only content-based labels; this is non-fatal for inventory output.
  }

  if (home) {
    if (pathLower.startsWith(`${home}/.local/bin/`) || pathLower.startsWith(`${home}/bin/`) || pathLower.startsWith(`${home}/.npm/`) || pathLower.startsWith(`${home}/.npm-global/`)) {
      labelSet.add("user");
    }
  }

  if (pathLower.startsWith("/usr/local/bin/") || pathLower.startsWith("/usr/bin/") || pathLower.startsWith("/usr/sbin/") || pathLower.startsWith("/opt/homebrew/bin/") || pathLower.startsWith("/bin/") || pathLower.startsWith("/sbin/")) {
    labelSet.add("system");
  }

  if (cwd && (pathLower === `${cwd}/node_modules/.bin/codex` || pathLower.startsWith(`${cwd}/node_modules/.bin/`))) {
    labelSet.add("workspace");
  }

  if (resourcesPath && pathLower.startsWith(resourcesPath)) {
    labelSet.add("bundled");
  }

  if (!labelSet.size) {
    labelSet.add("unknown");
  }

  const preferredOrder = ["workspace", "user", "system", "bundled", "wrapper", "symlink", "unknown"];
  let primary = "unknown";
  for (const candidate of preferredOrder) {
    if (labelSet.has(candidate)) {
      primary = candidate;
      break;
    }
  }

  return {
    primary,
    labels: [...preferredOrder.filter((label) => labelSet.has(label)), ...Array.from(labelSet).filter((label) => !preferredOrder.includes(label))],
  };
}

function detectCodexExecutablePath(command, env) {
  const lookupCommand = process.platform === "win32" ? "where" : "which";
  const lookup = childProcess.spawnSync(lookupCommand, process.platform === "win32" ? [command] : ["-a", command], {
    encoding: "utf8",
    timeout: 2000,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (lookup.error || lookup.status !== 0) return null;
  const rawPath = String(lookup.stdout || "").split(/\r?\n/).find((line) => line && line.trim());
  return rawPath ? String(rawPath).trim() : null;
}

function collectCodexExecutablePaths(command, env = process.env) {
  const lookupCommand = process.platform === "win32" ? "where" : "which";
  const lookup = childProcess.spawnSync(lookupCommand, process.platform === "win32" ? [command] : ["-a", command], {
    encoding: "utf8",
    timeout: 2000,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const candidateSet = new Set();

  if (!lookup.error && lookup.status === 0) {
    String(lookup.stdout || "")
      .split(/\r?\n/)
      .map((entry) => String(entry || "").trim())
      .filter(Boolean)
      .forEach((entry) => candidateSet.add(entry));
  }

  const pathEntries = String((env && env.PATH) || "")
    .split(process.platform === "win32" ? ";" : ":")
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);

  pathEntries.forEach((entry) => {
    const joined = path.join(entry, process.platform === "win32" ? `${command}.cmd` : command);
    candidateSet.add(joined);
  });

  [
    path.join(os.homedir(), ".local", "bin", command),
    path.join(os.homedir(), "bin", command),
    "/usr/local/bin/codex",
    "/usr/bin/codex",
    "/opt/homebrew/bin/codex",
    path.join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? `${command}.cmd` : command),
  ].forEach((entry) => {
    candidateSet.add(entry);
  });

  return [...candidateSet];
}

function dedupePaths(values) {
  const seen = new Set();
  const out = [];
  for (const value of values || []) {
    const text = String(value || "").trim();
    if (!text) continue;
    const resolved = (() => {
      try {
        return fs.realpathSync(text);
      } catch {
        return text;
      }
    })();
    const key = process.platform === "win32" ? resolved.toLowerCase() : resolved;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(resolved);
  }
  return out;
}

function readCodexVersionAtPath(command, executablePath, env = process.env, source = "candidate") {
  const installSource = classifyCodexExecutableSource(executablePath);
  const probe = childProcess.spawnSync(executablePath, ["--version"], {
    encoding: "utf8",
    timeout: 2500,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const checkedAt = new Date().toISOString();
  const basePayload = {
    ok: false,
    command,
    path: executablePath,
    source,
    installSource: installSource.primary,
    installSourceTags: installSource.labels,
    checkedAt,
  };
  if (probe.error) {
    return {
      ...basePayload,
      error: probe.error.message || "codex version probe failed",
    };
  }
  if (probe.status !== 0) {
    return {
      ...basePayload,
      error: String((probe.stderr || probe.stdout || "codex --version returned non-zero exit status")).trim(),
    };
  }
  return {
    ...basePayload,
    ok: true,
    version: parseCodexVersionText(probe.stdout || probe.stderr),
  };
}

function readCodexInventory(options = {}) {
  const command = String(options.command || "codex").trim() || "codex";
  const env = {
    ...process.env,
    ...(options.env && typeof options.env === "object" ? options.env : {}),
  };
  const active = readActiveCodex({ command, env });
  const activePath = active.path || null;
  const items = dedupePaths([activePath, ...collectCodexExecutablePaths(command, env)]).map((candidatePath) => {
    return readCodexVersionAtPath(
      command,
      candidatePath,
      env,
      candidatePath === activePath ? "active" : "candidate",
    );
  });

  return {
    ok: true,
    command,
    activePath,
    checkedAt: new Date().toISOString(),
    items,
  };
}

function readActiveCodex(options = {}) {
  const command = String(options.command || "codex").trim() || "codex";
  const env = {
    ...process.env,
    ...(options.env && typeof options.env === "object" ? options.env : {}),
  };
  const commandPath = detectCodexExecutablePath(command, env);
  const probe = childProcess.spawnSync(command, ["--version"], {
    encoding: "utf8",
    timeout: 2500,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (probe.error) {
    return {
      ok: false,
      command,
      error: probe.error.message || "codex version probe failed",
      checkedAt: new Date().toISOString(),
      source: commandPath ? "path" : "env",
      path: commandPath || null,
    };
  }
  if (probe.status !== 0) {
    return {
      ok: false,
      command,
      error: String((probe.stderr || probe.stdout || "codex --version returned non-zero exit status")).trim(),
      checkedAt: new Date().toISOString(),
      source: commandPath ? "path" : "env",
      path: commandPath || null,
    };
  }
  return {
    ok: true,
    command,
    path: commandPath || null,
    version: parseCodexVersionText(probe.stdout || probe.stderr),
    source: commandPath ? "path+version" : "version-only",
    checkedAt: new Date().toISOString(),
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function threadListCacheKey(options, query) {
  const codexHome = options.codexHome || "";
  const sessionsDir = options.sessionsDir || "";
  const includeGit = query.include_git === undefined ? "default" : String(query.include_git);
  const limit = Math.max(Number(options.limit || 0), Math.min(500, Math.max(1, Number(query.limit || 100))) + Math.max(0, Number(query.offset || 0)));
  return JSON.stringify({ codexHome, sessionsDir, includeGit, limit });
}

function createCachedThreadLister(options = {}) {
  const cache = new Map();
  async function listCachedThreads(query = {}) {
    const key = threadListCacheKey(options, query);
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && cached.value && cached.expiresAt > now) return cached.value;
    if (cached && cached.promise) return cached.promise;
    const limit = Math.max(Number(options.limit || 0), Math.min(500, Math.max(1, Number(query.limit || 100))) + Math.max(0, Number(query.offset || 0)));
    const promise = discoverSessionThreadsParallel({
      ...options,
      limit,
      includeGit: query.include_git === undefined ? true : (query.include_git === true || query.include_git === "true"),
    }).then((threads) => {
      cache.set(key, {
        value: threads,
        expiresAt: Date.now() + Number(options.cacheTtlMs || THREAD_LIST_CACHE_TTL_MS),
      });
      return threads;
    }).catch((error) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, { promise, expiresAt: now + Number(options.cacheTtlMs || THREAD_LIST_CACHE_TTL_MS) });
    return promise;
  }
  listCachedThreads.clearCache = () => cache.clear();
  return listCachedThreads;
}

function parseWatchIds(value) {
  return String(value || "")
    .split(",")
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function watchStatePath(options = {}) {
  const homeDir = options.homeDir || os.homedir();
  return path.join(homeDir, ".codex-managed-agent", WATCHLIST_FILENAME);
}

function watchActionsPath(options = {}) {
  const homeDir = options.homeDir || os.homedir();
  return path.join(homeDir, ".codex-managed-agent", WATCH_ACTIONS_FILENAME);
}

function normalizeWatchlistEntry(entry) {
  if (typeof entry === "string") {
    const id = entry.trim();
    return id ? { kind: "thread", id, auto_continue: normalizeWatchAutoContinueConfig({}) } : null;
  }
  if (!entry || typeof entry !== "object") return null;
  const kind = String(entry.kind || entry.type || "thread").trim() || "thread";
  const id = String(entry.id || entry.threadId || entry.thread_id || entry.taskId || entry.task_id || "").trim();
  if (!id) return null;
  if (kind !== "thread" && kind !== "task") return null;
  return {
    kind,
    id,
    title: typeof entry.title === "string" ? entry.title : "",
    addedAt: typeof entry.addedAt === "string" ? entry.addedAt : "",
    auto_continue: normalizeWatchAutoContinueConfig(entry.auto_continue || entry.autoContinue || {}),
  };
}

function finiteNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function normalizeWatchAutoContinueConfig(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const maxCount = finiteNonNegativeInteger(source.max_count ?? source.maxCount ?? source.total, 0);
  const consumedCount = finiteNonNegativeInteger(source.consumed_count ?? source.consumedCount, 0);
  const remainingDefault = Math.max(0, maxCount - consumedCount);
  const rawRemaining = finiteNonNegativeInteger(source.remaining_count ?? source.remainingCount ?? source.remaining, remainingDefault);
  const remainingCount = maxCount > 0 ? Math.min(rawRemaining, maxCount) : rawRemaining;
  return {
    enabled: Boolean(source.enabled),
    max_count: maxCount,
    remaining_count: remainingCount,
    consumed_count: consumedCount,
    prompt: String(source.prompt || "continue").trim() || "continue",
    last_completed_turn_signature: String(source.last_completed_turn_signature || source.lastCompletedTurnSignature || "").trim(),
    last_launch_at: typeof source.last_launch_at === "string" ? source.last_launch_at : "",
    last_stop_reason: String(source.last_stop_reason || source.lastStopReason || "").trim(),
    last_launch_status: String(source.last_launch_status || source.lastLaunchStatus || "").trim(),
    account_health: normalizeWatchAccountHealth(source.account_health || source.accountHealth || {}),
    session_binding: normalizeWatchSessionBinding(source.session_binding || source.sessionBinding || {}),
    session_binding_required: Boolean(source.session_binding_required || source.sessionBindingRequired),
  };
}

function normalizeWatchAccountHealth(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    token_health: String(source.token_health || source.tokenHealth || "").trim(),
    rate_limited: Boolean(source.rate_limited || source.rateLimited),
    retry_available_at: typeof source.retry_available_at === "string" ? source.retry_available_at : (typeof source.retryAvailableAt === "string" ? source.retryAvailableAt : ""),
  };
}

function normalizeWatchSessionBinding(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    worker_thread_id: String(source.worker_thread_id || source.workerThreadId || "").trim(),
    run_id: String(source.run_id || source.runId || "").trim(),
  };
}

function completedTurnSignature(lifecycle) {
  const marker = String(lifecycle && lifecycle.last_marker || "");
  const eventAt = String(lifecycle && lifecycle.last_event_at || "");
  return marker.startsWith("event:task_complete") ? `${marker}@${eventAt || "unknown"}` : "";
}

function deriveWatchAutoContinueState(thread, watchEntry) {
  const lifecycle = thread && thread.lifecycle && typeof thread.lifecycle === "object" ? thread.lifecycle : {};
  const config = normalizeWatchAutoContinueConfig(watchEntry && watchEntry.auto_continue);
  const signature = completedTurnSignature(lifecycle);
  const hasFiniteCount = Number.isInteger(config.max_count) && config.max_count > 0;
  const lifecycleState = String(lifecycle.state || "").trim();
  const tokenHealth = String(config.account_health.token_health || "").trim();
  const tokenBlocks = tokenHealth === "invalid" || tokenHealth === "expired" || tokenHealth === "refresh_failed";
  const quotaBlocks = tokenHealth === "rate_limited" || config.account_health.rate_limited;
  const boundThreadId = config.session_binding.worker_thread_id;
  const currentThreadId = String(thread && (thread.id || thread.thread_id) || "");
  let launchable = false;
  let blockedReason = "disabled";
  if (!config.enabled && config.last_stop_reason === "user_stopped") {
    blockedReason = "user_stops_auto_continue";
  } else if (!config.enabled) {
    blockedReason = "disabled";
  } else if (config.last_launch_status === "failed") {
    blockedReason = "resume_launch_fails";
  } else if (tokenBlocks) {
    blockedReason = "token_or_account_health_blocks_work";
  } else if (quotaBlocks) {
    blockedReason = "quota_or_rate_limit_blocks_work";
  } else if (config.session_binding_required && !boundThreadId) {
    blockedReason = "session_binding_is_missing_or_changed";
  } else if (boundThreadId && currentThreadId && boundThreadId !== currentThreadId) {
    blockedReason = "session_binding_is_missing_or_changed";
  } else if (lifecycleState === "running" || lifecycleState === "queued") {
    blockedReason = "thread_is_running_or_queued";
  } else if (!hasFiniteCount) {
    blockedReason = "finite_count_required";
  } else if (config.remaining_count <= 0) {
    blockedReason = "remaining_count_reaches_zero";
  } else if (!signature) {
    blockedReason = "latest_turn_is_not_task_complete";
  } else if (config.last_completed_turn_signature && config.last_completed_turn_signature === signature) {
    blockedReason = "completed_turn_already_consumed";
  } else {
    launchable = true;
    blockedReason = "";
  }
  return {
    enabled: config.enabled,
    max_count: config.max_count,
    remaining_count: config.remaining_count,
    consumed_count: config.consumed_count,
    prompt: config.prompt,
    last_completed_turn_signature: config.last_completed_turn_signature,
    current_completed_turn_signature: signature,
    last_launch_at: config.last_launch_at,
    last_stop_reason: config.last_stop_reason || blockedReason || "",
    last_launch_status: config.last_launch_status,
    account_health: config.account_health,
    session_binding: config.session_binding,
    session_binding_required: config.session_binding_required,
    requires_explicit_task_complete: true,
    requires_finite_count: true,
    launchable,
    blocked_reason: blockedReason,
  };
}

function normalizeWatchlist(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const entries = Array.isArray(source.items)
    ? source.items
    : [
        ...parseWatchIds(source.thread_ids || source.threadIds || source.threads).map((id) => ({ kind: "thread", id })),
        ...parseWatchIds(source.task_ids || source.taskIds || source.tasks).map((id) => ({ kind: "task", id })),
      ];
  const seen = new Set();
  const items = [];
  for (const entry of entries) {
    const normalized = normalizeWatchlistEntry(entry);
    if (!normalized) continue;
    const key = `${normalized.kind}:${normalized.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(normalized);
  }
  return {
    version: Number(source.version || 1),
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : null,
    items,
  };
}

function readWatchlist(options = {}) {
  if (typeof options.readWatchlist === "function") {
    return normalizeWatchlist(options.readWatchlist(options));
  }
  const filePath = watchStatePath(options);
  try {
    if (!fs.existsSync(filePath)) return normalizeWatchlist({});
    return normalizeWatchlist(JSON.parse(fs.readFileSync(filePath, "utf8")));
  } catch {
    return normalizeWatchlist({});
  }
}

function writeJsonAtomic(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  try {
    fs.chmodSync(tmp, 0o600);
  } catch {
    // Best-effort on non-POSIX filesystems.
  }
  fs.renameSync(tmp, filePath);
}

function writeWatchlist(options = {}, watchlist) {
  const normalized = normalizeWatchlist({
    ...watchlist,
    updatedAt: new Date(Number(options.now || Date.now() / 1000) * 1000).toISOString(),
  });
  if (typeof options.writeWatchlist === "function") {
    options.writeWatchlist(normalized, options);
    return normalized;
  }
  writeJsonAtomic(watchStatePath(options), normalized);
  return normalized;
}

function sameWatchEntry(a, b) {
  return String(a && a.kind || "thread") === String(b && b.kind || "thread")
    && String(a && a.id || "") === String(b && b.id || "");
}

function updateWatchAutoContinue(options = {}, body = {}) {
  const kind = String(body.kind || body.type || "thread").trim() || "thread";
  const id = String(body.id || body.threadId || body.thread_id || body.taskId || body.task_id || "").trim();
  if (!id) {
    const error = new Error("watch auto-continue update requires an id");
    error.statusCode = 400;
    throw error;
  }
  if (kind !== "thread" && kind !== "task") {
    const error = new Error("watch auto-continue kind must be thread or task");
    error.statusCode = 400;
    throw error;
  }
  const watchlist = readWatchlist(options);
  const target = { kind, id };
  const nextItems = watchlist.items.slice();
  let index = nextItems.findIndex((entry) => sameWatchEntry(entry, target));
  if (index < 0) {
    nextItems.push({
      kind,
      id,
      title: typeof body.title === "string" ? body.title : "",
      addedAt: new Date(Number(options.now || Date.now() / 1000) * 1000).toISOString(),
      auto_continue: normalizeWatchAutoContinueConfig({}),
    });
    index = nextItems.length - 1;
  }

  const existing = nextItems[index];
  const incoming = {
    ...existing.auto_continue,
    ...(body.auto_continue && typeof body.auto_continue === "object" ? body.auto_continue : {}),
  };
  ["enabled", "max_count", "maxCount", "remaining_count", "remainingCount", "remaining", "consumed_count", "consumedCount", "prompt", "last_completed_turn_signature", "lastCompletedTurnSignature", "last_launch_at", "last_stop_reason", "lastStopReason"].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(body, key)) incoming[key] = body[key];
  });
  let nextConfig = normalizeWatchAutoContinueConfig(incoming);
  if (body.reset === true || body.reset_count === true || body.resetCount === true) {
    nextConfig = {
      ...nextConfig,
      remaining_count: nextConfig.max_count,
      consumed_count: 0,
      last_completed_turn_signature: "",
      last_launch_at: "",
      last_stop_reason: "reset",
    };
  }

  nextItems[index] = {
    ...existing,
    title: typeof body.title === "string" ? body.title : existing.title,
    auto_continue: nextConfig,
  };
  return writeWatchlist(options, {
    version: watchlist.version || 1,
    items: nextItems,
  });
}

function appendWatchAction(options = {}, event = {}) {
  const payload = {
    type: "watch.action",
    action: String(event.action || ""),
    kind: String(event.kind || "thread"),
    id: String(event.id || ""),
    reason: String(event.reason || ""),
    at: new Date(Number(options.now || Date.now() / 1000) * 1000).toISOString(),
  };
  if (typeof options.appendWatchAction === "function") {
    options.appendWatchAction(payload, options);
    return payload;
  }
  const filePath = watchActionsPath(options);
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
  return payload;
}

function applyWatchControl(options = {}, body = {}) {
  const action = String(body.action || "").trim();
  if (action !== "stop" && action !== "resume") {
    const error = new Error("watch control action must be stop or resume");
    error.statusCode = 400;
    throw error;
  }
  const id = String(body.id || body.threadId || body.thread_id || body.taskId || body.task_id || "").trim();
  if (!id) {
    const error = new Error("watch control requires an id");
    error.statusCode = 400;
    throw error;
  }
  const reason = String(body.reason || (action === "stop" ? "user_stopped" : "user_resumed")).trim();
  const kind = String(body.kind || "thread").trim() || "thread";
  const watchlist = updateWatchAutoContinue(options, {
    ...body,
    kind,
    id,
    enabled: action === "resume",
    last_stop_reason: action === "stop" ? "user_stopped" : "user_resumed",
    last_launch_status: "",
  });
  const trace = appendWatchAction(options, {
    action,
    kind,
    id,
    reason,
  });
  return { watchlist, trace };
}

function isLocalRequest(req) {
  const address = String(req && req.socket && req.socket.remoteAddress || "");
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1" || address === "";
}

function watchWriteAuthToken(options = {}) {
  return String(options.watchAuthToken || process.env.CMA_WATCH_AUTH_TOKEN || "").trim();
}

function requestAuthToken(req) {
  const headers = (req && req.headers) || {};
  const authorization = String(headers.authorization || headers.Authorization || "").trim();
  const bearer = authorization.match(/^Bearer\s+(.+)$/i);
  if (bearer) return bearer[1].trim();
  return String(headers["x-cma-watch-token"] || headers["X-CMA-Watch-Token"] || "").trim();
}

function requireWatchWriteAuth(req, options = {}) {
  if (isLocalRequest(req)) return;
  const expected = watchWriteAuthToken(options);
  if (expected && requestAuthToken(req) === expected) return;
  const error = new Error("watch write actions require local access or a valid watch auth token");
  error.statusCode = 403;
  throw error;
}

function normalizeWatchItem(thread, watchEntry) {
  const lifecycle = thread && thread.lifecycle && typeof thread.lifecycle === "object"
    ? thread.lifecycle
    : {
        state: "unknown",
        attention: "unknown",
        reason: "Lifecycle evidence is not available for this item.",
      };
  const processSummary = thread && thread.process && typeof thread.process === "object" ? thread.process : {};
  return {
    kind: "thread",
    id: String((thread && (thread.id || thread.thread_id)) || ""),
    title: String((thread && thread.title) || (thread && (thread.id || thread.thread_id)) || "Untitled thread"),
    cwd: (thread && thread.cwd) || "",
    updated_at: Number(thread && thread.updated_at || 0),
    model: (thread && thread.model) || "",
    lifecycle: {
      state: String(lifecycle.state || "unknown"),
      attention: String(lifecycle.attention || "unknown"),
      reason: String(lifecycle.reason || ""),
      last_marker: lifecycle.last_marker || "",
      recent_markers: Array.isArray(lifecycle.recent_markers) ? lifecycle.recent_markers.slice(0, 8) : [],
      recent_tools: Array.isArray(lifecycle.recent_tools) ? lifecycle.recent_tools.slice(0, 8) : [],
      last_event_at: lifecycle.last_event_at || null,
    },
    process: {
      pid: processSummary.pid || null,
      running: Boolean(processSummary.running),
      summary: processSummary.summary || "",
    },
    auto_continue: deriveWatchAutoContinueState(thread, watchEntry),
    actions: {
      readOnly: true,
      writeActionsRequireAuth: true,
      canStop: false,
      canResume: false,
      canConfigureAutoContinue: false,
    },
  };
}

function buildWatchSnapshot(rawThreads, query = {}, options = {}) {
  const explicitIds = parseWatchIds(query.ids || query.thread_ids || query.watch_ids);
  const watchlist = readWatchlist(options);
  const watchThreadIds = explicitIds.length
    ? explicitIds
    : watchlist.items.filter((item) => item.kind === "thread").map((item) => item.id);
  const watchTaskIds = watchlist.items.filter((item) => item.kind === "task").map((item) => item.id);
  const watchEntryByThreadId = new Map(watchlist.items
    .filter((item) => item.kind === "thread")
    .map((item) => [String(item.id), item]));
  const normalized = normalizeThreadsResponse(rawThreads, {
    ...query,
    scope: query.scope || "live",
    include_logs: query.include_logs || "false",
    include_history: query.include_history || "false",
  }, options);
  const requestedIds = new Set(watchThreadIds);
  const limit = Math.min(100, Math.max(1, Number(query.limit || 25)));
  const items = (normalized.items || [])
    .filter((thread) => !requestedIds.size || requestedIds.has(String(thread.id || thread.thread_id || "")))
    .slice(0, limit)
    .map((thread) => normalizeWatchItem(thread, watchEntryByThreadId.get(String(thread.id || thread.thread_id || ""))));
  return {
    ok: true,
    backendMode: "node",
    backendSource: "local",
    readOnly: true,
    surface: "watch",
    generatedAt: new Date(Number(options.now || Date.now() / 1000) * 1000).toISOString(),
    meta: {
      total: items.length,
      requestedIds: Array.from(requestedIds),
      sourceTotal: normalized.meta && typeof normalized.meta.total === "number" ? normalized.meta.total : items.length,
      watchlist: {
        configured: Boolean(watchlist.items.length),
        threadIds: watchThreadIds,
        taskIds: watchTaskIds,
        unsupportedTaskIds: watchTaskIds,
        updatedAt: watchlist.updatedAt,
      },
      policy: {
        remoteWriteActionsRequireAuth: true,
        autoContinueDefaultEnabled: false,
        autoContinueRequiresExplicitTaskComplete: true,
        autoContinueRequiresFiniteCount: true,
      },
    },
    items,
  };
}

function createNodeBackendHandler(options = {}) {
  const listThreads = typeof options.listThreads === "function"
    ? options.listThreads
    : createCachedThreadLister(options);
  const getThread = typeof options.getThread === "function" ? options.getThread : (threadId) => {
    return Promise.resolve(listThreads()).then((threads) => {
      return (Array.isArray(threads) ? threads : []).find((thread) => String(thread.id || thread.thread_id) === String(threadId));
    });
  };
  const readUsageReport = typeof options.readUsageReport === "function" ? options.readUsageReport : readPersistedUsageReport;
  const resolveActiveCodex = typeof options.readActiveCodex === "function" ? options.readActiveCodex : readActiveCodex;
  const resolveCodexInventory = typeof options.readCodexInventory === "function" ? options.readCodexInventory : readCodexInventory;

  return async function handleNodeBackendRequest(req, res) {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      if (req.method === "GET" && url.pathname === "/api/health") {
        return jsonResponse(res, 200, healthPayload());
      }
      if (req.method === "GET" && url.pathname === "/api/threads") {
        const query = queryObject(url.searchParams);
        return jsonResponse(res, 200, normalizeThreadsResponse(await listThreads(query), query, options));
      }
      if (req.method === "GET" && url.pathname === "/api/watch") {
        const query = queryObject(url.searchParams);
        const threads = await listThreads({
          ...query,
          scope: query.scope || "live",
          limit: query.source_limit || query.limit || 100,
          include_logs: query.include_logs || "false",
          include_history: query.include_history || "false",
        });
        return jsonResponse(res, 200, buildWatchSnapshot(threads, query, options));
      }
      if (req.method === "POST" && url.pathname === "/api/watch/auto-continue") {
        requireWatchWriteAuth(req, options);
        const body = await readJsonBody(req);
        const watchlist = updateWatchAutoContinue(options, body);
        const query = { ids: body.id || body.threadId || body.thread_id || "" };
        const threads = await listThreads({
          scope: "live",
          limit: 100,
          include_logs: "false",
          include_history: "false",
        });
        if (typeof listThreads.clearCache === "function") listThreads.clearCache();
        return jsonResponse(res, 200, {
          ok: true,
          watchlist,
          snapshot: buildWatchSnapshot(threads, query, {
            ...options,
            readWatchlist: () => watchlist,
          }),
        });
      }
      if (req.method === "POST" && url.pathname === "/api/watch/control") {
        requireWatchWriteAuth(req, options);
        const body = await readJsonBody(req);
        const result = applyWatchControl(options, body);
        if (typeof listThreads.clearCache === "function") listThreads.clearCache();
        return jsonResponse(res, 200, {
          ok: true,
          action: result.trace,
          watchlist: result.watchlist,
        });
      }
      const detailMatch = req.method === "GET" && url.pathname.match(/^\/api\/thread\/([^/]+)$/);
      if (detailMatch) {
        const threadId = decodeURIComponent(detailMatch[1]);
        const query = queryObject(url.searchParams);
        const rawThread = await getThread(threadId);
        if (!rawThread) return jsonResponse(res, 404, { detail: `thread not found: ${threadId}` });
        return jsonResponse(res, 200, await normalizeThreadDetail(rawThread, {
          ...options,
          historyLimit: query.history_limit || options.historyLimit || 16,
          logLimit: query.log_limit || options.logLimit || 20,
        }));
      }
      if (req.method === "GET" && url.pathname === "/api/insights/report") {
        return jsonResponse(res, 200, readUsageReport(options));
      }
      if (req.method === "GET" && url.pathname === "/api/codex/active") {
        return jsonResponse(res, 200, resolveActiveCodex(options));
      }
      if (req.method === "GET" && url.pathname === "/api/codex/inventory") {
        return jsonResponse(res, 200, resolveCodexInventory(options));
      }
      if (req.method === "POST" && url.pathname === "/api/threads/scan-codex-sessions") {
        const body = await readJsonBody(req);
        if (typeof listThreads.clearCache === "function") listThreads.clearCache();
        return jsonResponse(res, 200, {
          ok: true,
          backendMode: "node",
          readOnly: false,
          summary: {
            imported: 0,
            refreshed: true,
            limit: Number(body.limit || 500),
          },
        });
      }
      if (req.method === "POST" && url.pathname === "/api/threads/lifecycle") {
        const body = await readJsonBody(req);
        const payload = applyLifecycleAction(options, body.action, body.ids);
        if (typeof listThreads.clearCache === "function") listThreads.clearCache();
        return jsonResponse(res, 200, payload);
      }
      const renameMatch = req.method === "POST" && url.pathname.match(/^\/api\/thread\/([^/]+)\/rename$/);
      if (renameMatch) {
        return jsonResponse(res, 410, { detail: "rename is not supported by the Node backend" });
      }
      return jsonResponse(res, 404, { detail: "node backend route not found" });
    } catch (error) {
      const statusCode = error && error.statusCode ? error.statusCode : 500;
      return jsonResponse(res, statusCode, { detail: error && error.message ? error.message : "node backend error" });
    }
  };
}

function createNodeBackendServer(options = {}) {
  const server = http.createServer(createNodeBackendHandler(options));
  server.on("close", () => {
    closeSessionWorkerPool().catch(() => {});
  });
  return server;
}

module.exports = {
  createNodeBackendHandler,
  createNodeBackendServer,
  buildWatchSnapshot,
  healthPayload,
  readWatchlist,
  writeWatchlist,
  updateWatchAutoContinue,
  applyWatchControl,
  requireWatchWriteAuth,
  readCodexInventory,
  readActiveCodex,
};
