const vscode = require("vscode");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const https = require("https");
const { rebuildPersistedUsageReport } = require("./usage-ledger");

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function currentDateStamp() {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
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
  const candidates = [primary];
  const hostname = url.hostname || "127.0.0.1";
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  const isLocalHost = ["127.0.0.1", "localhost"].includes(hostname);
  if (isLocalHost && port === "8787") {
    candidates.push(withPort(primary, 8788));
  }
  return [...new Set(candidates)];
}

function getConfig() {
  const config = vscode.workspace.getConfiguration("codexAgent");
  return {
    baseUrl: ensureTrailingSlash(config.get("baseUrl") || "http://127.0.0.1:8787/"),
    autoStartServer: config.get("autoStartServer", true),
    pythonPath: config.get("pythonPath", ""),
    serverRoot: config.get("serverRoot", ""),
    defaultSurface: config.get("defaultSurface", "fullscreen"),
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function postLifecycleAction(baseUrl, action, ids, deleteFiles = true) {
  return httpRequestJson("POST", `${baseUrl}api/threads/lifecycle`, {
    action,
    ids,
    delete_files: deleteFiles,
  });
}

async function postRenameThread(baseUrl, threadId, title) {
  return httpRequestJson("POST", `${baseUrl}api/thread/${encodeURIComponent(threadId)}/rename`, {
    title,
  });
}

async function postScanCodexSessions(baseUrl, limit = 500) {
  return httpRequestJson("POST", `${baseUrl}api/threads/scan-codex-sessions`, {
    limit,
  }, 20000);
}

async function probeServer(baseUrl) {
  try {
    const payload = await httpGetJson(`${baseUrl}api/threads?limit=1`, 2500);
    return { ok: true, payload };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function probeFirstReachableBaseUrl(config) {
  const candidates = getCandidateBaseUrls(config);
  for (const baseUrl of candidates) {
    const probe = await probeServer(baseUrl);
    if (probe.ok) {
      return { ok: true, baseUrl, payload: probe.payload, fallback: baseUrl !== ensureTrailingSlash(config.baseUrl) };
    }
  }
  return { ok: false, baseUrl: ensureTrailingSlash(config.baseUrl) };
}

function isValidServerRoot(root) {
  return Boolean(root) && fs.existsSync(path.join(root, "codex_manager", "app.py"));
}

function findWorkspaceServerRoot() {
  const folders = vscode.workspace.workspaceFolders || [];
  for (const folder of folders) {
    const workspaceRoot = folder.uri.fsPath;
    const direct = path.join(workspaceRoot, "codex_manager");
    if (isValidServerRoot(direct)) return direct;
    if (isValidServerRoot(workspaceRoot)) return workspaceRoot;
  }
  return "";
}

function resolveServerPaths(extensionUri) {
  const config = getConfig();
  const extensionDir = extensionUri.fsPath;
  const bundledRoot = extensionDir;
  const packagedRoot = path.resolve(extensionDir, "..");
  const workspaceRoot = findWorkspaceServerRoot();
  const appRoot =
    (config.serverRoot && isValidServerRoot(config.serverRoot) && config.serverRoot) ||
    workspaceRoot ||
    (isValidServerRoot(bundledRoot) ? bundledRoot : "") ||
    (isValidServerRoot(packagedRoot) ? packagedRoot : "");

  const venvPython = appRoot
    ? (process.platform === "win32"
      ? path.join(appRoot, ".venv", "Scripts", "python.exe")
      : path.join(appRoot, ".venv", "bin", "python3"))
    : "";

  return {
    appRoot,
    venvPython,
    logDir: os.tmpdir(),
  };
}

function detectPythonBinary(extensionUri) {
  const config = getConfig();
  const paths = resolveServerPaths(extensionUri);
  if (config.pythonPath && fs.existsSync(config.pythonPath)) {
    return config.pythonPath;
  }
  if (fs.existsSync(paths.venvPython)) {
    return paths.venvPython;
  }
  return "python3";
}

async function startServer(extensionUri) {
  const config = getConfig();
  const paths = resolveServerPaths(extensionUri);
  if (!paths.appRoot) {
    return {
      ok: false,
      started: false,
      logPath: paths.logPath,
      error: "Cannot locate server root. Set codexAgent.serverRoot or open the workspace containing codex_manager/.",
    };
  }
  const pythonBinary = detectPythonBinary(extensionUri);
  const candidates = getCandidateBaseUrls(config);

  for (const candidateBaseUrl of candidates) {
    const parsed = new URL(candidateBaseUrl);
    const port = parsed.port || "8787";
    const host = parsed.hostname || "127.0.0.1";
    const logPath = path.join(paths.logDir, `codex_agent_vscode_${currentDateStamp()}_${port}.log`);
    const out = fs.openSync(logPath, "a");
    const args = ["-m", "uvicorn", "codex_manager.app:app", "--host", host, "--port", port];
    const child = childProcess.spawn(pythonBinary, args, {
      cwd: paths.appRoot,
      detached: true,
      stdio: ["ignore", out, out],
    });
    child.unref();

    for (let i = 0; i < 8; i += 1) {
      const probe = await probeServer(candidateBaseUrl);
      if (probe.ok) {
        return {
          ok: true,
          started: true,
          logPath,
          baseUrl: candidateBaseUrl,
          fallback: candidateBaseUrl !== ensureTrailingSlash(config.baseUrl),
        };
      }
      await delay(400);
    }
  }

  return {
    ok: false,
    started: false,
    logPath: path.join(paths.logDir, `codex_agent_vscode_${currentDateStamp()}.log`),
    error: `Server did not become ready on ${candidates.join(" or ")}`,
  };
}

function summarizeServiceState(ok, extra = {}) {
  return {
    ok,
    ...extra,
  };
}

async function fetchDashboardState(baseUrl) {
  const [threadsPayload, runningPayload, insightsPayload] = await Promise.all([
    httpGetJson(
      `${baseUrl}api/threads?limit=500&sort=updated_desc&include_logs=true&preview_limit=2&include_history=false&scope=all`,
      4000,
    ),
    httpGetJson(
      `${baseUrl}api/threads?limit=16&status=running&sort=log_desc&include_logs=true&preview_limit=4&include_history=true&history_limit=4&scope=live`,
      4000,
    ),
    httpGetJson(`${baseUrl}api/insights/report`, 1500).catch(() => readPersistedInsightsReport()),
  ]);

  return {
    threads: threadsPayload.items || [],
    threadsMeta: threadsPayload.meta || {},
    runningThreads: runningPayload.items || [],
    runningMeta: runningPayload.meta || {},
    insights: synthesizeInteractionHeatmap(mergeTokenInsightSections(insightsPayload || null)),
  };
}

async function fetchThreadDetail(baseUrl, threadId) {
  if (!threadId) return null;
  return httpGetJson(`${baseUrl}api/thread/${encodeURIComponent(threadId)}?log_limit=120`, 4000);
}

module.exports = {
  getConfig,
  setBaseUrlPort,
  summarizeServiceState,
  fetchDashboardState,
  fetchThreadDetail,
  postLifecycleAction,
  postRenameThread,
  postScanCodexSessions,
  probeServer,
  probeFirstReachableBaseUrl,
  startServer,
};
