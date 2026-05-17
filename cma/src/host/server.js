const vscode = require("vscode");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const https = require("https");
const net = require("net");
const { rebuildPersistedUsageReport } = require("./usage-ledger");
const { createNodeBackendServer } = require("./node-backend/server");

const SERVER_PORT_SCAN_COUNT = 80;
let nodeBackendServerState = null;

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function withPort(urlString, port) {
  const url = new URL(urlString);
  url.port = String(port);
  return ensureTrailingSlash(url.toString());
}

function parsePortLike(value) {
  const digits = String(value || "").trim();
  if (!/^\d{2,5}$/.test(digits)) return null;
  const port = Number(digits);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return String(port);
}

function getCandidateBaseUrls(config) {
  const primary = ensureTrailingSlash(config.baseUrl || "http://127.0.0.1:8787/");
  const url = new URL(primary);
  const hostname = url.hostname || "127.0.0.1";
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  const isLocalHost = ["127.0.0.1", "localhost"].includes(hostname);
  if (!isLocalHost) {
    return [primary];
  }
  const startPort = Number(port);
  if (!Number.isInteger(startPort) || startPort < 1 || startPort > 65535) {
    return [primary];
  }
  const candidates = [];
  const count = Math.min(SERVER_PORT_SCAN_COUNT, 65536 - startPort);
  for (let offset = 0; offset < count; offset += 1) {
    candidates.push(withPort(primary, startPort + offset));
  }
  return [...new Set(candidates)];
}

function summarizeBaseUrlCandidates(candidates) {
  const urls = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  if (!urls.length) return "no candidate URLs";
  if (urls.length <= 4) return urls.join(" or ");
  const first = urls[0];
  const last = urls[urls.length - 1];
  return `${first} through ${last} (${urls.length} candidates)`;
}

function isLocalBaseUrl(baseUrl) {
  try {
    const url = new URL(baseUrl);
    return ["127.0.0.1", "localhost"].includes(url.hostname || "");
  } catch {
    return false;
  }
}

function nodeBackendCapabilities() {
  return {
    threads: true,
    threadDetail: true,
    insights: true,
    scanSessions: true,
    lifecycle: true,
    watch: true,
    rename: false,
    hardDelete: false,
  };
}

function serviceMetadataFromPayload(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const metadata = {};
  if (typeof source.backendMode === "string" && source.backendMode.trim()) {
    const backendMode = source.backendMode.trim();
    metadata.backendMode = backendMode === "node-fallback" || backendMode === "node-backend" ? "node" : backendMode;
  }
  if (typeof source.backendSource === "string" && source.backendSource.trim()) {
    const backendSource = source.backendSource.trim();
    metadata.backendSource = backendSource === "fallback" ? "local" : backendSource;
  }
  if (typeof source.readOnly === "boolean") {
    metadata.readOnly = source.readOnly;
  }
  if (source.capabilities && typeof source.capabilities === "object" && !Array.isArray(source.capabilities)) {
    metadata.capabilities = source.capabilities;
  }
  return metadata;
}

function getConfig() {
  const config = vscode.workspace.getConfiguration("codexAgent");
  return {
    baseUrl: ensureTrailingSlash(config.get("baseUrl") || "http://127.0.0.1:8787/"),
    defaultSurface: config.get("defaultSurface", "fullscreen"),
    smartMode: config.get("smartMode", false),
  };
}

async function setBaseUrlPort(portLike) {
  const nextPort = parsePortLike(portLike);
  if (!nextPort) {
    throw new Error(`Invalid port: ${portLike}`);
  }
  const config = vscode.workspace.getConfiguration("codexAgent");
  const current = ensureTrailingSlash(config.get("baseUrl") || "http://127.0.0.1:8787/");
  const next = withPort(current, nextPort);
  await config.update("baseUrl", next, vscode.ConfigurationTarget.Workspace);
  return next;
}

function isTcpPortOpen(host, port, timeoutMs = 250) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (open) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(Number(port), host);
  });
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function toIsoDay(date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, delta) {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

function monthLabel(date) {
  return date.toLocaleString("en-US", { month: "short" });
}

function interactionLevel(count, maxCount) {
  if (count <= 0 || maxCount <= 0) return 0;
  const ratio = count / maxCount;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

function synthesizeInteractionHeatmap(report) {
  if (!report || typeof report !== "object" || report.interaction_heatmap) return report;
  const recentDays = Array.isArray(report.activity?.recent_days) ? report.activity.recent_days : [];
  if (!recentDays.length) return report;

  const countsByDay = new Map();
  recentDays.forEach((item) => {
    const day = String(item?.day || "").trim();
    const count = Number(item?.count || 0);
    if (!day) return;
    countsByDay.set(day, count);
  });

  const availableDays = [...countsByDay.keys()].sort();
  const latestKnownDay = availableDays[availableDays.length - 1];
  const anchor = latestKnownDay && !Number.isNaN(Date.parse(latestKnownDay))
    ? startOfDay(new Date(latestKnownDay))
    : startOfDay(new Date(report.generated_at || Date.now()));
  const weekCount = Math.max(16, Math.min(53, Math.ceil(Math.max(availableDays.length, 84) / 7)));
  const totalDayCount = weekCount * 7;
  const firstCell = addDays(anchor, -(totalDayCount - 1));
  const alignedStart = addDays(firstCell, -((firstCell.getDay() + 6) % 7));
  const alignedEnd = addDays(alignedStart, totalDayCount - 1);
  const finalDayCount = Math.round((alignedEnd - alignedStart) / 86400000) + 1;
  const days = [];
  const monthLabels = [];
  let previousMonth = "";
  for (let index = 0; index < finalDayCount; index += 1) {
    const current = addDays(alignedStart, index);
    const isoDay = toIsoDay(current);
    const count = Number(countsByDay.get(isoDay) || 0);
    const weekIndex = Math.floor(index / 7);
    const dayOfWeek = (current.getDay() + 6) % 7;
    const currentMonth = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
    if (dayOfWeek === 0 && currentMonth !== previousMonth) {
      monthLabels.push({
        label: monthLabel(current),
        week_index: weekIndex,
      });
      previousMonth = currentMonth;
    }
    days.push({
      date: isoDay,
      count,
      week_index: weekIndex,
      day_index: dayOfWeek,
    });
  }

  const maxCount = Math.max(...days.map((item) => item.count), 0);
  const activeDays = days.filter((item) => item.count > 0).length;
  const totalInputs = Number(report.summary?.total_inputs || days.reduce((sum, item) => sum + item.count, 0));
  const windowLabel = `${Math.round(finalDayCount / 7)} weeks`;
  const interactionHeatmap = {
    days: days.map((item) => ({
      ...item,
      level: interactionLevel(item.count, maxCount),
    })),
    month_labels: monthLabels,
    weekday_labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    max_count: maxCount,
    total_inputs: totalInputs,
    active_days: Number(report.summary?.active_days || activeDays),
    window_label: windowLabel,
    basis: "Codex CLI and loop turns count here once they produce a real Codex response. Idle daemon time does not count.",
  };

  return {
    ...report,
    interaction_heatmap: interactionHeatmap,
  };
}

function readPersistedInsightsReport() {
  try {
    rebuildPersistedUsageReport();
    const reportPath = path.join(os.homedir(), ".codex", "codex_managed_agent_usage_report.json");
    if (!fs.existsSync(reportPath)) return null;
    const reportStats = fs.statSync(reportPath);
    let report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    report = synthesizeInteractionHeatmap(report);
    if (report && typeof report === "object") {
      if (!report.report_source) {
        report.report_source = "persisted";
      }
      if (!report.report_persisted_at) {
        report.report_persisted_at = reportStats.mtimeMs;
      }
    }
    return report;
  } catch {
    return null;
  }
}

function hasTokenInsightSections(report) {
  return Boolean(
    report
      && report.summary
      && Number(report.summary.total_tokens || 0) > 0
      && report.activity
      && Array.isArray(report.activity.recent_token_days)
      && report.activity.recent_token_days.length
      && Array.isArray(report.token_top_threads)
      && report.token_top_threads.length,
  );
}

function mergeTokenInsightSections(report) {
  if (hasTokenInsightSections(report)) return report;
  const fallback = readPersistedInsightsReport();
  if (!hasTokenInsightSections(fallback)) return report || fallback;
  const next = { ...(report || {}) };
  next.summary = {
    ...(report && report.summary ? report.summary : {}),
    ...(fallback.summary || {}),
  };
  next.activity = {
    ...(report && report.activity ? report.activity : {}),
    ...(fallback.activity || {}),
  };
  next.token_top_threads = fallback.token_top_threads || [];
  next.analysis_views = Array.isArray(fallback.analysis_views) ? fallback.analysis_views : next.analysis_views;
  next.report_source = next.report_source || fallback.report_source || "persisted";
  next.report_persisted_at = next.report_persisted_at || fallback.report_persisted_at;
  return next;
}

function httpRequestJson(method, urlString, body, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const client = url.protocol === "https:" ? https : http;
    const payload = body ? Buffer.from(JSON.stringify(body), "utf8") : undefined;
    const req = client.request(url, {
      method,
      timeout: timeoutMs,
      headers: {
        Accept: "application/json",
        ...(payload ? { "Content-Type": "application/json", "Content-Length": String(payload.length) } : {}),
      },
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        if (!res.statusCode || res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode || "ERR"} for ${urlString}${raw ? `: ${raw}` : ""}`));
          return;
        }
        try {
          resolve(raw ? JSON.parse(raw) : {});
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error(`Timeout requesting ${urlString}`));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

function httpGetJson(urlString, timeoutMs = 3000) {
  return httpRequestJson("GET", urlString, undefined, timeoutMs);
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

async function postLifecycleAction(baseUrl, action, ids, deleteFiles = true) {
  return httpRequestJson("POST", `${baseUrl}api/threads/lifecycle`, {
    action,
    ids,
    delete_files: deleteFiles,
  });
}

async function postScanCodexSessions(baseUrl, limit = 500) {
  return httpRequestJson("POST", `${baseUrl}api/threads/scan-codex-sessions`, {
    limit,
  }, 20000);
}

async function postWatchAutoContinue(baseUrl, body = {}) {
  return httpRequestJson("POST", `${baseUrl}api/watch/auto-continue`, body, 5000);
}

async function postWatchControl(baseUrl, body = {}) {
  return httpRequestJson("POST", `${baseUrl}api/watch/control`, body, 5000);
}

async function probeServer(baseUrl) {
  try {
    const payload = await httpGetJson(`${baseUrl}api/health`, 1500);
    return { ok: true, payload };
  } catch (error) {
    try {
      const payload = await httpGetJson(`${baseUrl}api/threads?limit=1`, 2500);
      return { ok: true, payload: { ok: true, status: "ok", probe: "threads", threadsMeta: payload && payload.meta } };
    } catch (fallbackError) {
      return { ok: false, error: error instanceof Error ? error.message : String(error), fallbackError: errorMessage(fallbackError) };
    }
  }
}

async function startServer(extensionUri) {
  const config = getConfig();
  return startNodeBackendFromCandidates(getCandidateBaseUrls(config), "node-runtime");
}

async function closeNodeBackendServer() {
  const current = nodeBackendServerState;
  nodeBackendServerState = null;
  if (!current || !current.server) return;
  await new Promise((resolve) => {
    current.server.close(() => resolve());
  }).catch(() => {});
}

function nodeBackendResult(baseUrl, reason, started, logPath) {
  return {
    ok: true,
    started,
    baseUrl,
    logPath: logPath || undefined,
    fallback: true,
    backendMode: "node",
    backendSource: "local",
    readOnly: false,
    capabilities: nodeBackendCapabilities(),
    message: `Started Node backend (${reason}).`,
  };
}

async function startNodeBackendServer(candidateBaseUrl, reason, logPath) {
  if (!isLocalBaseUrl(candidateBaseUrl)) {
    return { ok: false, error: "Node backend only starts on local base URLs." };
  }
  if (nodeBackendServerState && nodeBackendServerState.baseUrl === candidateBaseUrl) {
    const probe = await probeServer(candidateBaseUrl);
    if (probe.ok) {
      return nodeBackendResult(candidateBaseUrl, reason || "existing", false, logPath);
    }
    await closeNodeBackendServer();
  } else if (nodeBackendServerState) {
    await closeNodeBackendServer();
  }

  const existingProbe = await probeServer(candidateBaseUrl);
  if (existingProbe.ok) {
    return nodeBackendResult(candidateBaseUrl, reason || "existing-node", false, logPath);
  }

  const parsed = new URL(candidateBaseUrl);
  const host = parsed.hostname || "127.0.0.1";
  const port = parsed.port || "8787";
  if (await isTcpPortOpen(host, port)) {
    return { ok: false, error: `Port ${port} is occupied.` };
  }

  const server = createNodeBackendServer();
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(Number(port), host, resolve);
    });
    nodeBackendServerState = { server, baseUrl: candidateBaseUrl };
    const probe = await probeServer(candidateBaseUrl);
    if (!probe.ok) {
      await closeNodeBackendServer();
      return { ok: false, error: probe.error || "Node backend did not pass health probe." };
    }
    return nodeBackendResult(candidateBaseUrl, reason || "node-backend", true, logPath);
  } catch (error) {
    try {
      server.close();
    } catch {}
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function startNodeBackendFromCandidates(candidates, reason) {
  for (const candidateBaseUrl of candidates || []) {
    const start = await startNodeBackendServer(candidateBaseUrl, reason);
    if (start.ok) return start;
  }
  return { ok: false, error: "No local Node backend candidate could be started." };
}

function summarizeServiceState(ok, extra = {}) {
  const backendMode = extra.backendMode || (ok ? "configured" : "unavailable");
  const readOnly = typeof extra.readOnly === "boolean" ? extra.readOnly : !ok;
  const defaultCapabilities = ok && !readOnly
    ? {
        threads: true,
        threadDetail: true,
        insights: true,
        scanSessions: true,
        lifecycle: true,
        watch: true,
        rename: false,
        hardDelete: true,
      }
    : {
        threads: false,
        threadDetail: false,
        insights: false,
        scanSessions: false,
        lifecycle: false,
        watch: false,
        rename: false,
        hardDelete: false,
      };
  return {
    ok,
    ...extra,
    backendMode,
    backendSource: extra.backendSource || "configured",
    readOnly,
    capabilities: {
      ...defaultCapabilities,
      ...(extra.capabilities || {}),
    },
  };
}

async function fetchDashboardState(baseUrl, options = {}) {
  const warnings = [];
  const scope = options.scope || "live";
  const archivedFilter = scope === "live" ? "&archived=0" : "";
  const lightThreadsPayload = await httpGetJson(
    `${baseUrl}api/threads?limit=500&sort=updated_desc&include_logs=false&include_history=false&include_git=true&scope=${encodeURIComponent(scope)}${archivedFilter}`,
    4000,
  );

  const [threadsWithLogsResult, runningResult, insightsResult, activeCodexResult, codexInventoryResult, watchResult] = await Promise.all([
    httpGetJson(
      `${baseUrl}api/threads?limit=500&sort=updated_desc&include_logs=true&preview_limit=2&include_history=false&include_git=true&scope=${encodeURIComponent(scope)}${archivedFilter}`,
      6000,
    )
      .then((payload) => ({ ok: true, payload }))
      .catch((error) => ({ ok: false, error: errorMessage(error) })),
    httpGetJson(
      `${baseUrl}api/threads?limit=128&sort=log_desc&status=running&include_logs=true&preview_limit=4&include_history=false&include_git=true&scope=all`,
      6000,
    )
      .then((payload) => ({
        ok: true,
        payload: {
          ...payload,
          items: (payload.items || []).filter((thread) => thread && thread.status === "running").slice(0, 16),
        },
      }))
      .catch((error) => ({ ok: false, error: errorMessage(error) })),
    httpGetJson(`${baseUrl}api/insights/report`, 1800)
      .then((payload) => ({ ok: true, payload }))
      .catch((error) => ({ ok: false, error: errorMessage(error), payload: readPersistedInsightsReport() })),
    httpGetJson(`${baseUrl}api/codex/active`, 1800)
      .then((payload) => ({ ok: true, payload }))
      .catch((error) => ({ ok: false, error: errorMessage(error) })),
    httpGetJson(`${baseUrl}api/codex/inventory`, 1800)
      .then((payload) => ({ ok: true, payload }))
      .catch((error) => ({ ok: false, error: errorMessage(error) })),
    httpGetJson(`${baseUrl}api/watch`, 1800)
      .then((payload) => ({ ok: true, payload }))
      .catch((error) => ({ ok: false, error: errorMessage(error) })),
  ]);

  if (!threadsWithLogsResult.ok) warnings.push(`Thread log previews unavailable: ${threadsWithLogsResult.error}`);

  const threadsPayload = threadsWithLogsResult.ok ? threadsWithLogsResult.payload : lightThreadsPayload;
  const runningPayload = runningResult.ok ? runningResult.payload : { items: [], meta: { partial: true } };
  const insightsPayload = insightsResult.payload;
  const activeCodexPayload = activeCodexResult.payload;
  const codexInventoryPayload = codexInventoryResult.payload;

  if (!codexInventoryResult.ok) warnings.push(`Codex inventory unavailable: ${codexInventoryResult.error}`);
  if (!watchResult.ok) warnings.push(`Watch surface unavailable: ${watchResult.error}`);

  return {
    threads: threadsPayload.items || [],
    threadsMeta: {
      ...(threadsPayload.meta || {}),
      lightFallback: !threadsWithLogsResult.ok,
      scope,
    },
    runningThreads: runningPayload.items || [],
    runningMeta: {
      ...(runningPayload.meta || {}),
      partial: !runningResult.ok,
      error: runningResult.ok ? undefined : runningResult.error,
    },
    insights: synthesizeInteractionHeatmap(mergeTokenInsightSections(insightsPayload || null)),
    activeCodex: activeCodexPayload && activeCodexPayload.ok ? activeCodexPayload : null,
    activeCodexError: activeCodexResult.ok ? undefined : activeCodexResult.error,
    codexInventory: codexInventoryPayload && codexInventoryPayload.ok ? codexInventoryPayload : null,
    codexInventoryError: codexInventoryResult.ok ? undefined : codexInventoryResult.error,
    watch: watchResult.ok && watchResult.payload && watchResult.payload.ok ? watchResult.payload : null,
    watchError: watchResult.ok ? undefined : watchResult.error,
    refreshWarnings: warnings,
    partial: warnings.length > 0,
  };
}

async function fetchRunningThreadsState(baseUrl) {
  const payload = await httpGetJson(
    `${baseUrl}api/threads?limit=128&sort=log_desc&status=running&include_logs=true&preview_limit=4&include_history=false&include_git=true&scope=all`,
    5000,
  );
  return {
    runningThreads: (payload.items || []).filter((thread) => thread && thread.status === "running"),
    runningMeta: {
      ...(payload.meta || {}),
      clientFilteredRunning: true,
    },
  };
}

async function fetchThreadsByIds(baseUrl, threadIds, options = {}) {
  const ids = [...new Set((threadIds || []).map((id) => String(id || "").trim()).filter(Boolean))]
    .filter((id) => !id.startsWith("pending-new-agent-"))
    .slice(0, 80);
  if (!ids.length) {
    return {
      threads: [],
      threadsMeta: { ids: [], total: 0 },
    };
  }
  const query = new URLSearchParams({
    ids: ids.join(","),
    limit: String(Math.min(500, Math.max(1, ids.length))),
    sort: "updated_desc",
    include_logs: options.includeLogs === false ? "false" : "true",
    preview_limit: String(options.previewLimit || 2),
    include_history: options.includeHistory ? "true" : "false",
    include_git: "true",
    scope: options.scope || "all",
  });
  const payload = await httpGetJson(`${baseUrl}api/threads?${query.toString()}`, 5000);
  return {
    threads: payload.items || [],
    threadsMeta: payload.meta || {},
  };
}

async function fetchThreadDetail(baseUrl, threadId) {
  if (!threadId) return null;
  return httpGetJson(`${baseUrl}api/thread/${encodeURIComponent(threadId)}?log_limit=30&history_limit=16`, 8000);
}

module.exports = {
  getConfig,
  setBaseUrlPort,
  serviceMetadataFromPayload,
  summarizeServiceState,
  fetchDashboardState,
  fetchRunningThreadsState,
  fetchThreadsByIds,
  fetchThreadDetail,
  postLifecycleAction,
  postScanCodexSessions,
  postWatchAutoContinue,
  postWatchControl,
  probeServer,
  closeNodeBackendServer,
  startNodeBackendServer,
  startServer,
};
