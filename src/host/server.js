const vscode = require("vscode");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const https = require("https");

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function getConfig() {
  const config = vscode.workspace.getConfiguration("codexAgent");
  return {
    baseUrl: ensureTrailingSlash(config.get("baseUrl") || "http://127.0.0.1:8787/"),
    autoStartServer: config.get("autoStartServer", true),
    pythonPath: config.get("pythonPath", ""),
    serverRoot: config.get("serverRoot", ""),
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readPersistedInsightsReport() {
  try {
    const reportPath = path.join(os.homedir(), ".codex", "codex_managed_agent_usage_report.json");
    if (!fs.existsSync(reportPath)) return null;
    const reportStats = fs.statSync(reportPath);
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
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

async function probeServer(baseUrl) {
  try {
    const payload = await httpGetJson(`${baseUrl}api/threads?limit=1`, 2500);
    return { ok: true, payload };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
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
  const packagedRoot = path.resolve(extensionDir, "..");
  const workspaceRoot = findWorkspaceServerRoot();
  const appRoot =
    (config.serverRoot && isValidServerRoot(config.serverRoot) && config.serverRoot) ||
    workspaceRoot ||
    (isValidServerRoot(packagedRoot) ? packagedRoot : "");

  const venvPython = appRoot
    ? (process.platform === "win32"
      ? path.join(appRoot, ".venv", "Scripts", "python.exe")
      : path.join(appRoot, ".venv", "bin", "python3"))
    : "";

  return {
    appRoot,
    venvPython,
    logPath: path.join(os.tmpdir(), "codex_agent_vscode.log"),
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
  const baseUrl = new URL(config.baseUrl);
  const port = baseUrl.port || "8787";
  const host = baseUrl.hostname || "127.0.0.1";

  const out = fs.openSync(paths.logPath, "a");
  const args = ["-m", "uvicorn", "codex_manager.app:app", "--host", host, "--port", port];
  const child = childProcess.spawn(pythonBinary, args, {
    cwd: paths.appRoot,
    detached: true,
    stdio: ["ignore", out, out],
  });
  child.unref();

  for (let i = 0; i < 20; i += 1) {
    const probe = await probeServer(config.baseUrl);
    if (probe.ok) {
      return { ok: true, started: true, logPath: paths.logPath };
    }
    await delay(500);
  }

  return {
    ok: false,
    started: false,
    logPath: paths.logPath,
    error: `Server did not become ready on ${config.baseUrl}`,
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
    insights: insightsPayload || null,
  };
}

async function fetchThreadDetail(baseUrl, threadId) {
  if (!threadId) return null;
  return httpGetJson(`${baseUrl}api/thread/${encodeURIComponent(threadId)}?log_limit=120`, 4000);
}

module.exports = {
  getConfig,
  summarizeServiceState,
  fetchDashboardState,
  fetchThreadDetail,
  postLifecycleAction,
  postRenameThread,
  probeServer,
  startServer,
};
