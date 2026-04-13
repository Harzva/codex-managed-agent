const vscode = require("vscode");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const https = require("https");

function getConfig() {
  const config = vscode.workspace.getConfiguration("codexAgent");
  return {
    baseUrl: ensureTrailingSlash(config.get("baseUrl") || "http://127.0.0.1:8787/"),
    autoStartServer: config.get("autoStartServer", true),
    pythonPath: config.get("pythonPath", ""),
    serverRoot: config.get("serverRoot", ""),
  };
}

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const [threadsPayload, runningPayload] = await Promise.all([
    httpGetJson(
      `${baseUrl}api/threads?limit=500&sort=updated_desc&include_logs=true&preview_limit=2&include_history=false&scope=all`,
      4000,
    ),
    httpGetJson(
      `${baseUrl}api/threads?limit=16&status=running&sort=log_desc&include_logs=true&preview_limit=4&include_history=false&scope=live`,
      4000,
    ),
  ]);

  return {
    threads: threadsPayload.items || [],
    threadsMeta: threadsPayload.meta || {},
    runningThreads: runningPayload.items || [],
    runningMeta: runningPayload.meta || {},
  };
}

async function fetchThreadDetail(baseUrl, threadId) {
  if (!threadId) return null;
  return httpGetJson(`${baseUrl}api/thread/${encodeURIComponent(threadId)}?log_limit=120`, 4000);
}

class CodexAgentPanel {
  constructor(extensionUri) {
    this.extensionUri = extensionUri;
    this.panel = undefined;
    this.sidebarView = undefined;
    this.bottomView = undefined;
    this.refreshTimer = undefined;
    this.selectedThreadId = undefined;
    this.editorSurface = "editor";
    this.lastActionNotice = "";
    this.configWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration("codexAgent.baseUrl") ||
        event.affectsConfiguration("codexAgent.autoStartServer") ||
        event.affectsConfiguration("codexAgent.pythonPath") ||
        event.affectsConfiguration("codexAgent.serverRoot")
      ) {
        this.refresh();
      }
    });
  }

  dispose() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = undefined;
    this.configWatcher?.dispose();
  }

  ensureRefreshLoop() {
    if (this.refreshTimer) return;
    this.refreshTimer = setInterval(() => {
      this.refresh({ silent: true });
    }, 4000);
  }

  hasSurface() {
    return Boolean(this.panel || this.sidebarView || this.bottomView);
  }

  attachWebview(webview) {
    webview.options = {
      enableScripts: true,
    };
    webview.html = getWebviewHtml();
    webview.onDidReceiveMessage(async (message) => {
      if (message.type === "reload") {
        await this.refresh();
      }
      if (message.type === "startServer") {
        await this.ensureServer({ forceStart: true });
        await this.refresh();
      }
      if (message.type === "openExternal") {
        await this.openExternal();
      }
      if (message.type === "openPanel") {
        await this.focus();
      }
      if (message.type === "openBeside") {
        this.editorSurface = "editor";
        this.createOrShow(vscode.ViewColumn.Beside);
      }
      if (message.type === "moveToNewWindow") {
        await this.moveToNewWindow();
      }
      if (message.type === "showSidebar") {
        await this.showSidebar();
      }
      if (message.type === "showBottomPanel") {
        await this.showBottomPanel();
      }
      if (message.type === "maximizeDashboard") {
        await this.maximizeDashboard();
      }
      if (message.type === "selectThread") {
        this.selectedThreadId = message.threadId || undefined;
        await this.refresh({ silent: true });
      }
      if (message.type === "lifecycle") {
        await this.runLifecycleAction(message.action, message.threadId);
      }
      if (message.type === "lifecycleBatch") {
        await this.runLifecycleAction(message.action, Array.isArray(message.threadIds) ? message.threadIds : []);
      }
      if (message.type === "copyText") {
        await this.copyText(message.text, message.label);
      }
      if (message.type === "runCommand") {
        await this.runCommandInTerminal(message.command, message.label);
      }
    });
  }

  resolveSidebarView(webviewView) {
    this.sidebarView = webviewView;
    this.attachWebview(webviewView.webview);
    this.ensureRefreshLoop();
    this.refresh({ silent: true });
    webviewView.onDidDispose(() => {
      if (this.sidebarView === webviewView) this.sidebarView = undefined;
    });
  }

  resolveBottomView(webviewView) {
    this.bottomView = webviewView;
    this.attachWebview(webviewView.webview);
    this.ensureRefreshLoop();
    this.refresh({ silent: true });
    webviewView.onDidDispose(() => {
      if (this.bottomView === webviewView) this.bottomView = undefined;
    });
  }

  createOrShow(viewColumn = vscode.ViewColumn.One) {
    if (this.panel) {
      this.panel.reveal(viewColumn);
      return this.panel;
    }

    this.panel = vscode.window.createWebviewPanel(
      "codexManagedAgent.dashboard",
      "Codex-Managed-Agent",
      { viewColumn, preserveFocus: false },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    this.attachWebview(this.panel.webview);
    this.ensureRefreshLoop();
    this.refresh();

    this.panel.onDidDispose(() => {
      this.panel = undefined;
      if (!this.hasSurface() && this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = undefined;
      }
    });

    return this.panel;
  }

  async focus() {
    this.editorSurface = "editor";
    this.createOrShow();
    await this.refresh({ silent: true });
  }

  async openBeside() {
    this.editorSurface = "editor";
    this.createOrShow(vscode.ViewColumn.Beside);
    await this.refresh({ silent: true });
  }

  async showSidebar() {
    await vscode.commands.executeCommand("workbench.view.extension.codexManagedAgentSidebar");
    await this.refresh({ silent: true });
  }

  async showBottomPanel() {
    await vscode.commands.executeCommand("workbench.view.extension.codexManagedAgentPanel");
    await this.refresh({ silent: true });
  }

  async moveToNewWindow() {
    this.editorSurface = "editor";
    this.createOrShow();
    await vscode.commands.executeCommand("workbench.action.moveEditorToNewWindow");
    await this.refresh({ silent: true });
  }

  async maximizeDashboard() {
    this.editorSurface = "fullscreen";
    this.createOrShow();
    await vscode.commands.executeCommand("workbench.action.maximizeEditor");
    await this.refresh({ silent: true });
  }

  async ensureServer(options = {}) {
    const config = getConfig();
    const probe = await probeServer(config.baseUrl);
    if (probe.ok) {
      return summarizeServiceState(true, {
        baseUrl: config.baseUrl,
        autoStarted: false,
        message: "Connected",
      });
    }

    if (!config.autoStartServer && !options.forceStart) {
      return summarizeServiceState(false, {
        baseUrl: config.baseUrl,
        autoStarted: false,
        message: probe.error || "Server not reachable",
      });
    }

    const start = await startServer(this.extensionUri);
    if (!start.ok) {
      return summarizeServiceState(false, {
        baseUrl: config.baseUrl,
        autoStarted: true,
        message: start.error || "Failed to start server",
        logPath: start.logPath,
      });
    }

    return summarizeServiceState(true, {
      baseUrl: config.baseUrl,
      autoStarted: true,
      message: "Server started",
      logPath: start.logPath,
    });
  }

  async runLifecycleAction(action, threadIdsOrOne) {
    const ids = Array.isArray(threadIdsOrOne)
      ? threadIdsOrOne.map((item) => String(item || "").trim()).filter(Boolean)
      : [String(threadIdsOrOne || "").trim()].filter(Boolean);
    if (!ids.length) return;
    const config = getConfig();
    try {
      const result = await postLifecycleAction(config.baseUrl, action, ids, true);
      const updatedCount = Array.isArray(result.updated) ? result.updated.length : 0;
      const deletedCount = Array.isArray(result.deleted) ? result.deleted.length : 0;
      const skippedCount = Array.isArray(result.skipped) ? result.skipped.length : 0;
      this.lastActionNotice = `${action}: updated ${updatedCount}${deletedCount ? `, deleted ${deletedCount}` : ""}${skippedCount ? `, skipped ${skippedCount}` : ""}`;
      const stillExists = action !== "hard_delete";
      if (!stillExists && ids.includes(this.selectedThreadId)) {
        this.selectedThreadId = undefined;
      }
      vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 3200);
      await this.refresh();
    } catch (error) {
      this.lastActionNotice = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`);
      await this.refresh({ silent: true });
    }
  }

  async copyText(text, label = "Copied") {
    if (!text) return;
    await vscode.env.clipboard.writeText(String(text));
    this.lastActionNotice = `${label} copied`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 2400);
    await this.refresh({ silent: true });
  }

  async runCommandInTerminal(command, label = "Command") {
    if (!command) return;
    const terminal = vscode.window.createTerminal({ name: "Codex-Managed-Agent" });
    terminal.show(true);
    terminal.sendText(String(command), true);
    this.lastActionNotice = `${label} sent to terminal`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 2600);
  }

  async refresh(options = {}) {
    if (!this.hasSurface()) return;

    const service = await this.ensureServer();
    if (!service.ok) {
      this.broadcastState({
        type: "state",
        service,
        dashboard: null,
        selectedThreadId: this.selectedThreadId,
        actionNotice: this.lastActionNotice,
      });
      if (!options.silent) {
        vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${service.message}`, 2500);
      }
      return;
    }

    try {
      const dashboard = await fetchDashboardState(service.baseUrl);
      if (!this.selectedThreadId && dashboard.threads.length) {
        this.selectedThreadId = dashboard.threads[0].id;
      }
      const hasSelected = dashboard.threads.some((thread) => thread.id === this.selectedThreadId);
      if (!hasSelected) {
        this.selectedThreadId = dashboard.threads[0]?.id;
      }
      const detail = this.selectedThreadId
        ? await fetchThreadDetail(service.baseUrl, this.selectedThreadId).catch(() => null)
        : null;

      this.broadcastState({
        type: "state",
        service,
        dashboard,
        selectedThreadId: this.selectedThreadId,
        detail,
        actionNotice: this.lastActionNotice,
      });
      if (!options.silent) {
        vscode.window.setStatusBarMessage("Codex-Managed-Agent ready", 1800);
      }
    } catch (error) {
      this.broadcastState({
        type: "state",
        service: summarizeServiceState(false, {
          baseUrl: service.baseUrl,
          autoStarted: service.autoStarted,
          message: error instanceof Error ? error.message : String(error),
          logPath: service.logPath,
        }),
        dashboard: null,
        selectedThreadId: this.selectedThreadId,
        actionNotice: this.lastActionNotice,
      });
    }
  }

  async openExternal() {
    const config = getConfig();
    const target = await vscode.env.asExternalUri(vscode.Uri.parse(config.baseUrl));
    await vscode.env.openExternal(target);
  }

  postMessage(payload) {
    if (this.panel) this.panel.webview.postMessage(payload);
    if (this.sidebarView) this.sidebarView.webview.postMessage(payload);
    if (this.bottomView) this.bottomView.webview.postMessage(payload);
  }

  broadcastState(payload) {
    if (this.panel) {
      this.panel.webview.postMessage({
        ...payload,
        currentSurface: this.editorSurface,
      });
    }
    if (this.sidebarView) {
      this.sidebarView.webview.postMessage({
        ...payload,
        currentSurface: "left",
      });
    }
    if (this.bottomView) {
      this.bottomView.webview.postMessage({
        ...payload,
        currentSurface: "bottom",
      });
    }
  }
}

class CodexAgentSidebarProvider {
  constructor(host) {
    this.host = host;
  }

  resolveWebviewView(webviewView) {
    this.host.resolveSidebarView(webviewView);
  }
}

class CodexAgentBottomProvider {
  constructor(host) {
    this.host = host;
  }

  resolveWebviewView(webviewView) {
    this.host.resolveBottomView(webviewView);
  }
}

function getWebviewHtml() {
  const nonce = String(Date.now());
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"
    />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Codex-Managed-Agent</title>
    <style>
      :root {
        --bg: #08101d;
        --panel: rgba(10, 18, 32, 0.96);
        --panel-soft: rgba(8, 16, 29, 0.88);
        --line: rgba(126, 231, 255, 0.12);
        --text: #ecf4ff;
        --muted: #90a7c7;
        --cyan: #7ee7ff;
        --green: #4bffb5;
        --gold: #ffd66b;
        --red: #ff7c88;
        --blue: #78aaff;
      }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        height: 100%;
      }
      body { padding: 12px; }
      .shell { display: grid; gap: 12px; }
      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 12px;
      }
      .topbar {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        align-items: start;
      }
      .title {
        font-size: 18px;
        font-weight: 800;
        line-height: 1.2;
      }
      .sub {
        color: var(--muted);
        margin-top: 4px;
        line-height: 1.45;
        font-size: 12px;
      }
      .actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      .switcher {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 8px;
      }
      button {
        min-height: 30px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid rgba(126, 231, 255, 0.24);
        background: rgba(17, 95, 177, 0.16);
        color: var(--text);
        cursor: pointer;
        font-size: 12px;
      }
      button:hover { border-color: rgba(126, 231, 255, 0.36); }
      .switch-btn.active {
        border-color: rgba(75, 255, 181, 0.45);
        box-shadow: inset 0 0 0 1px rgba(75, 255, 181, 0.18);
        background: rgba(29, 130, 92, 0.24);
        color: var(--green);
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
      }
      .metric {
        border-radius: 12px;
        padding: 10px;
        background: var(--panel-soft);
        border: 1px solid rgba(126, 231, 255, 0.08);
      }
      .metric-label {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .metric-value {
        margin-top: 6px;
        font-size: 20px;
        font-weight: 700;
      }
      .toolbar {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        margin-bottom: 10px;
      }
      .search {
        width: 100%;
        min-height: 34px;
        border-radius: 12px;
        border: 1px solid rgba(126, 231, 255, 0.12);
        background: rgba(5, 13, 25, 0.8);
        color: var(--text);
        padding: 0 12px;
        outline: none;
      }
      .search::placeholder { color: #6982a6; }
      .chip-row {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .chip {
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid rgba(126, 231, 255, 0.12);
        background: rgba(8, 18, 34, 0.72);
        color: var(--muted);
        cursor: pointer;
        font-size: 11px;
      }
      .chip.active {
        background: rgba(17, 95, 177, 0.22);
        color: var(--text);
        border-color: rgba(120, 170, 255, 0.3);
      }
      .chip:hover {
        border-color: rgba(126, 231, 255, 0.26);
        color: var(--text);
      }
      .sort-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .sort-label {
        color: var(--muted);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      details.fold {
        border-radius: 12px;
        background: rgba(8, 18, 34, 0.58);
        border: 1px solid rgba(126, 231, 255, 0.08);
      }
      details.fold > summary {
        list-style: none;
        cursor: pointer;
        padding: 12px;
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        user-select: none;
      }
      details.fold > summary::-webkit-details-marker { display: none; }
      .fold-body { padding: 0 12px 12px 12px; }
      .service-ok { color: var(--green); }
      .service-bad { color: var(--red); }
      .main-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.18fr) minmax(320px, 0.82fr);
        gap: 12px;
      }
      .section-title {
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }
      .running-row, .thread-row {
        padding: 10px;
        border-radius: 12px;
        border: 1px solid rgba(126, 231, 255, 0.08);
        background: rgba(8, 18, 34, 0.72);
        margin-bottom: 8px;
        transition: border-color 140ms ease, background 140ms ease, transform 140ms ease, box-shadow 140ms ease;
      }
      .running-row:hover, .thread-row:hover {
        border-color: rgba(120, 170, 255, 0.24);
        background: rgba(10, 21, 38, 0.9);
        transform: translateY(-1px);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.16);
      }
      .thread-row.active {
        border-color: rgba(120, 170, 255, 0.34);
        box-shadow: inset 0 0 0 1px rgba(120, 170, 255, 0.16);
      }
      .thread-row.selected {
        border-color: rgba(255, 214, 107, 0.3);
        box-shadow: inset 0 0 0 1px rgba(255, 214, 107, 0.14);
      }
      .row-head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid rgba(126, 231, 255, 0.16);
        color: var(--cyan);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .badge-running { color: var(--green); border-color: rgba(75, 255, 181, 0.18); }
      .badge-recent { color: var(--gold); border-color: rgba(255, 214, 107, 0.18); }
      .thread-title {
        margin-top: 6px;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.35;
      }
      .thread-topline {
        display: grid;
        grid-template-columns: auto auto 1fr auto;
        gap: 8px;
        align-items: center;
      }
      .select-btn {
        min-height: 24px;
        min-width: 24px;
        padding: 0;
        border-radius: 8px;
        font-size: 11px;
        background: rgba(8, 18, 34, 0.7);
        border-color: rgba(126, 231, 255, 0.12);
        color: var(--muted);
      }
      .select-btn.selected {
        color: var(--gold);
        border-color: rgba(255, 214, 107, 0.32);
        background: rgba(255, 214, 107, 0.08);
      }
      .pin-btn {
        min-height: 24px;
        padding: 0 8px;
        font-size: 11px;
        background: transparent;
        border-color: rgba(126, 231, 255, 0.1);
        color: var(--muted);
      }
      .pin-btn.pinned {
        color: var(--gold);
        border-color: rgba(255, 214, 107, 0.28);
        background: rgba(255, 214, 107, 0.08);
      }
      .mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .muted {
        color: var(--muted);
      }
      .preview {
        margin-top: 6px;
        color: var(--muted);
        line-height: 1.35;
        font-size: 12px;
      }
      .stack {
        display: grid;
        gap: 12px;
      }
      .group-block {
        margin-top: 8px;
        border-top: 1px solid rgba(126, 231, 255, 0.08);
        padding-top: 8px;
      }
      .group-block:first-child {
        margin-top: 0;
        border-top: none;
        padding-top: 0;
      }
      .group-summary {
        list-style: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        color: var(--muted);
        padding: 4px 0 8px 0;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .group-summary::-webkit-details-marker { display: none; }
      .group-count {
        font-size: 11px;
        color: #6e87aa;
      }
      .tabs {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 10px;
      }
      .tab {
        min-height: 34px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid rgba(126, 231, 255, 0.14);
        background: rgba(8, 18, 34, 0.72);
      }
      .tab.active {
        border-color: rgba(126, 231, 255, 0.3);
        background: rgba(17, 95, 177, 0.24);
      }
      .terminal {
        border-radius: 14px;
        border: 1px solid rgba(126, 231, 255, 0.08);
        background: #050d19;
        max-height: 240px;
        overflow: auto;
        padding: 10px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
      }
      .terminal-line {
        padding: 6px 0;
        border-bottom: 1px solid rgba(126, 231, 255, 0.06);
      }
      .section-note {
        color: var(--muted);
        font-size: 12px;
        margin-bottom: 8px;
      }
      .batch-bar {
        display: none;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        border: 1px solid rgba(126, 231, 255, 0.08);
        background: rgba(8, 15, 28, 0.74);
        border-radius: 14px;
        padding: 10px;
        margin-bottom: 10px;
      }
      .batch-bar.visible {
        display: flex;
      }
      .batch-bar.confirm {
        border-color: rgba(255, 214, 107, 0.2);
        background:
          linear-gradient(180deg, rgba(30, 20, 5, 0.64), rgba(13, 10, 5, 0.8)),
          rgba(8, 15, 28, 0.74);
        box-shadow: inset 0 0 0 1px rgba(255, 214, 107, 0.06);
      }
      .batch-bar.confirm.danger {
        border-color: rgba(255, 124, 136, 0.24);
        background:
          linear-gradient(180deg, rgba(47, 11, 17, 0.64), rgba(18, 8, 11, 0.82)),
          rgba(8, 15, 28, 0.74);
        box-shadow: inset 0 0 0 1px rgba(255, 124, 136, 0.07);
      }
      .batch-count {
        color: var(--text);
        font-size: 12px;
        font-weight: 700;
        margin-right: 4px;
      }
      .batch-intent {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid rgba(255, 214, 107, 0.22);
        background: rgba(255, 214, 107, 0.08);
        color: #ffeab0;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .batch-intent.danger {
        border-color: rgba(255, 124, 136, 0.24);
        background: rgba(122, 24, 40, 0.18);
        color: #ffd9dd;
      }
      .batch-preview {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.45;
      }
      .batch-spacer {
        flex: 1 1 auto;
      }
      .chip.warn-chip {
        border-color: rgba(255, 214, 107, 0.28);
        background: rgba(120, 76, 9, 0.18);
        color: #ffeab0;
      }
      .chip.danger-chip {
        border-color: rgba(255, 124, 136, 0.28);
        background: rgba(122, 24, 40, 0.2);
        color: #ffd9dd;
      }
      .chat-window {
        display: grid;
        gap: 10px;
      }
      .chat {
        border-radius: 12px;
        padding: 10px;
        background: rgba(8, 18, 34, 0.72);
        border: 1px solid rgba(126, 231, 255, 0.08);
      }
      .chat.user {
        border-color: rgba(255, 214, 107, 0.16);
      }
      .chat-head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 8px;
        color: var(--muted);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .empty {
        color: var(--muted);
        padding: 20px 0;
      }
      .footer-note {
        color: var(--muted);
        font-size: 12px;
      }
      .thread-list-compact .thread-row { cursor: pointer; }
      .thread-meta {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 6px;
      }
      .meta-pill {
        border: 1px solid rgba(126, 231, 255, 0.1);
        border-radius: 999px;
        padding: 2px 8px;
        color: var(--muted);
        font-size: 11px;
      }
      .drawer-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(4, 10, 20, 0.56);
        opacity: 0;
        pointer-events: none;
        transition: opacity 160ms ease;
      }
      .drawer-backdrop.open {
        opacity: 1;
        pointer-events: auto;
      }
      .drawer {
        position: fixed;
        top: 0;
        right: 0;
        width: min(500px, 94vw);
        height: 100vh;
        background:
          radial-gradient(circle at top right, rgba(120, 170, 255, 0.08), transparent 28%),
          linear-gradient(180deg, rgba(9, 16, 29, 0.98), rgba(6, 12, 23, 0.99));
        border-left: 1px solid rgba(126, 231, 255, 0.12);
        box-shadow: -20px 0 60px rgba(0, 0, 0, 0.32);
        transform: translateX(100%);
        transition: transform 180ms ease;
        display: grid;
        grid-template-rows: auto auto 1fr;
        z-index: 40;
      }
      .drawer.open { transform: translateX(0); }
      .drawer-head {
        padding: 18px 18px 14px 18px;
        border-bottom: 1px solid rgba(126, 231, 255, 0.08);
        display: grid;
        gap: 12px;
      }
      .drawer-kicker {
        color: #6f8fba;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      .drawer-topline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .drawer-title {
        font-size: 16px;
        font-weight: 800;
        line-height: 1.35;
      }
      .drawer-close {
        min-height: 28px;
        padding: 0 10px;
      }
      .drawer-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .drawer-summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }
      .drawer-stat {
        border: 1px solid rgba(126, 231, 255, 0.08);
        border-radius: 12px;
        background: rgba(8, 15, 28, 0.7);
        padding: 10px;
      }
      .drawer-stat-label {
        color: var(--muted);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .drawer-stat-value {
        margin-top: 6px;
        font-size: 13px;
        font-weight: 700;
      }
      .action-rail {
        padding: 12px 18px;
        border-bottom: 1px solid rgba(126, 231, 255, 0.08);
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }
      .action-rail.confirm {
        background:
          linear-gradient(180deg, rgba(30, 20, 5, 0.26), rgba(9, 16, 29, 0.02)),
          rgba(8, 15, 28, 0.32);
        box-shadow: inset 0 -1px 0 rgba(255, 214, 107, 0.08);
      }
      .action-rail.confirm.danger {
        background:
          linear-gradient(180deg, rgba(47, 11, 17, 0.3), rgba(9, 16, 29, 0.02)),
          rgba(8, 15, 28, 0.32);
        box-shadow: inset 0 -1px 0 rgba(255, 124, 136, 0.1);
      }
      .action-btn {
        min-height: 30px;
        padding: 0 12px;
        transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease, background 120ms ease;
      }
      .action-btn.with-icon {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .action-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.16);
      }
      .action-btn:active {
        transform: translateY(0);
        box-shadow: inset 0 0 0 1px rgba(126, 231, 255, 0.08);
      }
      .action-btn:hover .icon-badge {
        border-color: rgba(126, 231, 255, 0.28);
      }
      .action-btn.warn:hover .icon-badge.warn {
        border-color: rgba(255, 214, 107, 0.34);
      }
      .action-btn.danger:hover .icon-badge.danger {
        border-color: rgba(255, 124, 136, 0.34);
      }
      .action-btn.secondary {
        background: rgba(15, 24, 39, 0.86);
      }
      .action-btn.danger {
        border-color: rgba(255, 124, 136, 0.26);
        background: rgba(122, 24, 40, 0.2);
        color: #ffd9dd;
      }
      .action-btn.warn {
        border-color: rgba(255, 214, 107, 0.28);
        background: rgba(120, 76, 9, 0.18);
        color: #ffeab0;
      }
      .action-status {
        color: var(--muted);
        font-size: 12px;
        margin-left: auto;
      }
      .icon-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        border-radius: 999px;
        border: 1px solid rgba(126, 231, 255, 0.16);
        background: rgba(10, 20, 36, 0.9);
        color: #9dc4ff;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.06em;
        line-height: 1;
        box-shadow: inset 0 0 0 1px rgba(126, 231, 255, 0.04);
        transition: border-color 120ms ease, background 120ms ease, transform 120ms ease;
      }
      .icon-badge.warn {
        border-color: rgba(255, 214, 107, 0.24);
        background: rgba(120, 76, 9, 0.18);
        color: #ffeab0;
      }
      .icon-badge.danger {
        border-color: rgba(255, 124, 136, 0.24);
        background: rgba(122, 24, 40, 0.18);
        color: #ffd9dd;
      }
      .cmd-grid {
        display: grid;
        gap: 10px;
      }
      .cmd-card {
        border: 1px solid rgba(126, 231, 255, 0.08);
        border-radius: 12px;
        background: rgba(5, 13, 25, 0.42);
        padding: 10px;
        transition: border-color 140ms ease, transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
      }
      .cmd-card.unavailable {
        border-style: dashed;
        background: rgba(7, 14, 26, 0.38);
      }
      .cmd-card:hover {
        border-color: rgba(120, 170, 255, 0.18);
        background: rgba(8, 18, 34, 0.72);
        transform: translateY(-1px);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.16);
      }
      .cmd-card:active {
        transform: translateY(0);
        box-shadow: inset 0 0 0 1px rgba(126, 231, 255, 0.06);
      }
      .cmd-card:hover .icon-badge {
        transform: translateY(-1px);
      }
      .cmd-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      .cmd-headline {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .cmd-name {
        font-size: 12px;
        font-weight: 700;
      }
      .cmd-subhead {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 8px;
      }
      .cmd-hint {
        color: var(--muted);
        font-size: 11px;
      }
      .cmd-feedback {
        border-radius: 999px;
        border: 1px solid rgba(126, 231, 255, 0.14);
        background: rgba(10, 20, 36, 0.7);
        color: #a5c6f7;
        padding: 2px 8px;
        font-size: 11px;
        letter-spacing: 0.04em;
      }
      .cmd-feedback.success {
        border-color: rgba(75, 255, 181, 0.2);
        background: rgba(18, 73, 53, 0.24);
        color: #b8ffde;
      }
      .cmd-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 8px;
      }
      .drawer-scroll {
        overflow: auto;
        padding: 14px 18px 24px 18px;
        display: grid;
        gap: 14px;
      }
      .drawer-section {
        border: 1px solid rgba(126, 231, 255, 0.08);
        background: rgba(9, 17, 31, 0.78);
        border-radius: 16px;
        padding: 14px;
      }
      .drawer-section h4 {
        margin: 0 0 8px 0;
      }
      .section-heading {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }
      .kv-grid {
        display: grid;
        gap: 8px;
      }
      .kv {
        display: grid;
        gap: 4px;
      }
      .kv-label {
        color: var(--muted);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .kv-value {
        color: var(--text);
        font-size: 12px;
        line-height: 1.45;
        word-break: break-word;
      }
      .code-line {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
        color: var(--text);
        background: rgba(5, 13, 25, 0.8);
        border: 1px solid rgba(126, 231, 255, 0.08);
        border-radius: 10px;
        padding: 10px;
        word-break: break-all;
        transition: border-color 140ms ease, background 140ms ease;
      }
      .code-line.empty {
        color: #6e87aa;
        border-style: dashed;
      }
      .cmd-card:hover .code-line {
        border-color: rgba(120, 170, 255, 0.18);
        background: rgba(6, 15, 28, 0.92);
      }
      .cmd-card button[disabled] {
        opacity: 0.45;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
      .drawer-log {
        border-top: 1px solid rgba(126, 231, 255, 0.06);
        padding: 8px 0;
      }
      .drawer-log:first-child { border-top: none; padding-top: 0; }
      @media (max-width: 960px) {
        .meta-grid, .main-grid {
          grid-template-columns: 1fr;
        }
        .toolbar {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <section class="panel">
        <div class="topbar">
          <div>
            <div class="title">Codex-Managed-Agent</div>
            <div class="sub" id="heroSummary">Code thread workspace inside VS Code.</div>
            <div class="sub mono" id="surfaceLabel">Position: -</div>
            <div class="switcher">
              <button class="switch-btn" id="posLeft" type="button">Left</button>
              <button class="switch-btn" id="posBottom" type="button">Bottom</button>
              <button class="switch-btn" id="posEditor" type="button">Editor</button>
              <button class="switch-btn" id="posFullscreen" type="button">Fullscreen</button>
            </div>
          </div>
          <div class="actions">
            <button id="reload" type="button">Reload</button>
            <button id="startServer" type="button">Start 8787</button>
            <button id="external" type="button">Open Browser</button>
          </div>
        </div>
      </section>

      <section class="meta-grid" id="metrics"></section>

      <section class="main-grid">
        <div class="stack">
          <div class="panel">
            <div class="section-title">Running Agents</div>
            <div class="section-note" id="runningSummary">Recent live agents and process status.</div>
            <div id="runningList"></div>
          </div>
          <div class="panel">
            <div class="section-title">Threads</div>
            <div class="toolbar">
              <input id="threadSearch" class="search" type="search" placeholder="Search title, id, cwd" />
              <div class="chip-row">
                <button class="chip" data-filter="all" type="button">All</button>
                <button class="chip" data-filter="running" type="button">Running</button>
                <button class="chip" data-filter="recent" type="button">Recent</button>
                <button class="chip" data-filter="idle" type="button">Idle</button>
                <button class="chip" data-filter="archived" type="button">Archived</button>
                <button class="chip" data-filter="soft_deleted" type="button">Deleted</button>
                <button class="chip" data-toggle="pinned" type="button">Pinned</button>
                <span class="sort-row">
                  <span class="sort-label">Sort</span>
                  <button class="chip" data-sort="updated" type="button">Updated</button>
                  <button class="chip" data-sort="created" type="button">Created</button>
                  <button class="chip" data-sort="log" type="button">Log</button>
                </span>
              </div>
            </div>
            <div class="section-note" id="threadSummary">Showing running and recent threads first.</div>
            <div id="batchBar" class="batch-bar"></div>
            <div id="threadList" class="thread-list-compact"></div>
          </div>
        </div>
        <div class="stack">
          <div class="panel">
            <div class="section-title">Live Console</div>
            <div class="tabs" id="runningTabs"></div>
            <div class="terminal" id="terminal"></div>
          </div>
          <details class="fold" open>
            <summary>Conversation History</summary>
            <div class="fold-body">
              <div id="chatWindow" class="chat-window"></div>
            </div>
          </details>
          <details class="fold">
            <summary>Connection Details</summary>
            <div class="fold-body">
              <div class="sub mono" id="baseUrl">Base URL: -</div>
              <div class="footer-note" id="statusLine">Waiting for data...</div>
            </div>
          </details>
        </div>
      </section>
      <div id="drawerBackdrop" class="drawer-backdrop"></div>
      <aside id="threadDrawer" class="drawer">
        <div class="drawer-head">
          <div class="drawer-kicker">Inspector</div>
          <div class="drawer-topline">
            <div class="drawer-title" id="drawerTitle">Thread detail</div>
            <button id="drawerClose" class="drawer-close" type="button">Close</button>
          </div>
          <div class="drawer-meta" id="drawerMeta"></div>
          <div class="drawer-summary" id="drawerSummary"></div>
        </div>
        <div class="action-rail" id="drawerActions"></div>
        <div class="drawer-scroll" id="drawerBody"></div>
      </aside>
    </div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const persisted = vscode.getState() || {};
      const state = {
        selectedThreadId: undefined,
        payload: undefined,
        currentSurface: "editor",
        ui: {
          search: persisted.search || "",
          filter: persisted.filter || "all",
          sort: persisted.sort || "updated",
          pinnedOnly: Boolean(persisted.pinnedOnly),
          pinned: persisted.pinned || {},
          selected: persisted.selected || {},
          pendingBatch: undefined,
          pendingDrawerAction: undefined,
          commandFeedback: {},
          drawerOpen: persisted.drawerOpen !== false,
          groups: Object.assign({
            running: true,
            recent: true,
            idle: false,
            archived: false,
            soft_deleted: false
          }, persisted.groups || {})
        }
      };

      function persistUi() {
        vscode.setState({
          search: state.ui.search,
          filter: state.ui.filter,
          sort: state.ui.sort,
          pinnedOnly: state.ui.pinnedOnly,
          pinned: state.ui.pinned,
          selected: state.ui.selected,
          drawerOpen: state.ui.drawerOpen,
          groups: state.ui.groups
        });
      }

      function esc(value) {
        return (value ?? "").toString().replace(/[&<>"']/g, (ch) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "\\"": "&quot;",
          "'": "&#39;",
        }[ch]));
      }

      function short(value, len = 120) {
        if (!value) return "";
        return value.length > len ? value.slice(0, len) + "..." : value;
      }

      function statusBadge(status) {
        return '<span class="badge badge-' + esc(status) + '">' + esc(status) + '</span>';
      }

      const BATCH_ACTIONS = {
        archive: { label: "Archive" },
        unarchive: { label: "Unarchive" },
        restore: { label: "Restore" },
        soft_delete: {
          label: "Soft Delete",
          intentLabel: "Confirm Soft Delete",
          summary: "Move the selected threads into the deleted bucket.",
          confirmLabel: "Confirm Soft Delete",
          tone: "warn",
          requiresConfirm: true,
        },
        hard_delete: {
          label: "Hard Delete",
          intentLabel: "Confirm Hard Delete",
          summary: "Permanently remove the selected threads and their logs.",
          confirmLabel: "Delete Permanently",
          tone: "danger",
          requiresConfirm: true,
        },
      };

      function normalize(value) {
        return (value || "").toString().toLowerCase();
      }

      function getBatchActionMeta(action) {
        return BATCH_ACTIONS[action] || { label: action || "Action" };
      }

      function sameIdSet(left, right) {
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
        const sortedLeft = [...left].sort();
        const sortedRight = [...right].sort();
        return sortedLeft.every((id, index) => id === sortedRight[index]);
      }

      function setPendingBatch(action, threadIds) {
        state.ui.pendingBatch = {
          action,
          threadIds: [...threadIds],
        };
      }

      function clearPendingBatch() {
        state.ui.pendingBatch = undefined;
      }

      function setPendingDrawerAction(threadId, action) {
        state.ui.pendingDrawerAction = { threadId, action };
      }

      function clearPendingDrawerAction() {
        state.ui.pendingDrawerAction = undefined;
      }

      function getDrawerConfirmMeta(action) {
        if (action === "hard_delete") {
          return {
            tone: "danger",
            intentLabel: "Confirm Hard Delete",
            summary: "Permanently remove this thread and its logs.",
            confirmLabel: "Delete Permanently",
          };
        }
        return {
          tone: "warn",
          intentLabel: "Confirm Soft Delete",
          summary: "Move this thread into the deleted bucket.",
          confirmLabel: "Confirm Soft Delete",
        };
      }

      function summarizeThreadSelection(threads, threadIds) {
        const picked = threads
          .filter((thread) => threadIds.includes(thread.id))
          .slice(0, 3)
          .map((thread) => short(thread.title || thread.id || "thread", 28));
        if (!picked.length) return "";
        const remainder = threadIds.length - picked.length;
        return picked.join(", ") + (remainder > 0 ? " +" + remainder + " more" : "");
      }

      function isPinned(threadId) {
        return Boolean(state.ui.pinned[threadId]);
      }

      function togglePin(threadId) {
        if (state.ui.pinned[threadId]) {
          delete state.ui.pinned[threadId];
        } else {
          state.ui.pinned[threadId] = true;
        }
        persistUi();
        render(state.payload);
      }

      function isSelected(threadId) {
        return Boolean(state.ui.selected[threadId]);
      }

      function toggleSelected(threadId) {
        clearPendingBatch();
        if (state.ui.selected[threadId]) {
          delete state.ui.selected[threadId];
        } else {
          state.ui.selected[threadId] = true;
        }
        persistUi();
        render(state.payload);
      }

      function clearSelection() {
        clearPendingBatch();
        state.ui.selected = {};
        persistUi();
        render(state.payload);
      }

      function threadMatches(thread) {
        const query = normalize(state.ui.search).trim();
        const haystack = [
          thread.title,
          thread.id,
          thread.cwd,
          thread.updated_at_iso
        ].map(normalize).join(" ");

        const status = normalize(thread.status);
        const archived = Boolean(thread.archived) || status === "archived";
        const softDeleted = Boolean(thread.soft_deleted);
        const running = status === "running";
        const recent = status === "recent";
        const idle = !running && !recent && !archived && !softDeleted;

        const matchesQuery = !query || haystack.includes(query);
        const matchesFilter =
          state.ui.filter === "all" ||
          (state.ui.filter === "running" && running) ||
          (state.ui.filter === "recent" && recent) ||
          (state.ui.filter === "idle" && idle) ||
          (state.ui.filter === "archived" && archived) ||
          (state.ui.filter === "soft_deleted" && softDeleted);
        const matchesPinned = !state.ui.pinnedOnly || isPinned(thread.id);
        return matchesQuery && matchesFilter && matchesPinned;
      }

      function sortThreads(threads) {
        return [...threads].sort((a, b) => {
          const aPinned = isPinned(a.id) ? 1 : 0;
          const bPinned = isPinned(b.id) ? 1 : 0;
          if (aPinned !== bPinned) return bPinned - aPinned;
          if (state.ui.sort === "created") {
            return (Number(b.created_at || 0) - Number(a.created_at || 0))
              || (Number(b.updated_at || 0) - Number(a.updated_at || 0));
          }
          if (state.ui.sort === "log") {
            return (Number(b.last_log_ts || 0) - Number(a.last_log_ts || 0))
              || (Number(b.updated_at || 0) - Number(a.updated_at || 0));
          }
          return (Number(b.updated_at || 0) - Number(a.updated_at || 0))
            || (Number(b.last_log_ts || 0) - Number(a.last_log_ts || 0));
        });
      }

      function buildGroups(threads) {
        const groups = {
          running: [],
          recent: [],
          idle: [],
          archived: [],
          soft_deleted: []
        };
        for (const thread of sortThreads(threads)) {
          const status = normalize(thread.status);
          const archived = Boolean(thread.archived) || status === "archived";
          if (thread.soft_deleted) groups.soft_deleted.push(thread);
          else if (archived) groups.archived.push(thread);
          else if (status === "running") groups.running.push(thread);
          else if (status === "recent") groups.recent.push(thread);
          else groups.idle.push(thread);
        }
        return groups;
      }

      function renderGroup(groupKey, label, threads) {
        if (!threads.length) return "";
        const openAttr = state.ui.groups[groupKey] ? " open" : "";
        return '<details class="group-block"' + openAttr + ' data-group="' + esc(groupKey) + '">' +
          '<summary class="group-summary"><span>' + esc(label) + '</span><span class="group-count">' + esc(String(threads.length)) + '</span></summary>' +
          threads.map(renderThreadRow).join("") +
        '</details>';
      }

      function renderThreadRow(thread) {
        const active = state.selectedThreadId === thread.id ? " active" : "";
        const selectedClass = isSelected(thread.id) ? " selected" : "";
        const pinnedClass = isPinned(thread.id) ? " pinned" : "";
        return '<div class="thread-row' + active + selectedClass + '" data-thread-id="' + esc(thread.id) + '">' +
          '<div class="thread-topline">' +
            '<button class="select-btn' + (isSelected(thread.id) ? ' selected' : '') + '" data-select-thread="' + esc(thread.id) + '" type="button">' + (isSelected(thread.id) ? '✓' : '') + '</button>' +
            statusBadge(thread.status) +
            '<span class="mono muted">' + esc(thread.updated_at_iso || "") + '</span>' +
            '<button class="pin-btn' + pinnedClass + '" data-pin-thread="' + esc(thread.id) + '" type="button">' + (isPinned(thread.id) ? "Pinned" : "Pin") + '</button>' +
          '</div>' +
          '<div class="thread-title">' + esc(short(thread.title || "(no title)", 110)) + '</div>' +
          '<div class="thread-meta">' +
            '<span class="meta-pill mono">' + esc(short(thread.cwd || "-", 42)) + '</span>' +
            '<span class="meta-pill">' + esc(thread.soft_deleted ? "soft-deleted" : (thread.archived ? "archived" : (thread.status || "idle"))) + '</span>' +
          '</div>' +
        '</div>';
      }

      function renderDetail(payload) {
        const detail = payload && payload.detail;
        const dashboard = (payload && payload.dashboard) || { threads: [] };
        const drawer = document.getElementById("threadDrawer");
        const backdrop = document.getElementById("drawerBackdrop");
        const title = document.getElementById("drawerTitle");
        const meta = document.getElementById("drawerMeta");
        const summaryNode = document.getElementById("drawerSummary");
        const actionsNode = document.getElementById("drawerActions");
        const body = document.getElementById("drawerBody");
        const actionNotice = payload && payload.actionNotice;

        if (!state.ui.drawerOpen || !detail || !detail.thread) {
          clearPendingDrawerAction();
          drawer.classList.remove("open");
          backdrop.classList.remove("open");
          title.textContent = "Thread detail";
          meta.innerHTML = "";
          summaryNode.innerHTML = "";
          actionsNode.innerHTML = "";
          body.innerHTML = '<div class="drawer-section"><div class="empty">Select a thread to inspect details.</div></div>';
          return;
        }

        const thread = detail.thread || {};
        const summary = (dashboard.threads || []).find((item) => item.id === thread.id) || {};
        const logs = detail.logs || [];
        const history = thread.history || [];
        const isArchived = Boolean(thread.archived || summary.archived);
        const isSoftDeleted = Boolean(summary.soft_deleted || thread.soft_deleted);
        const processText = summary.process && summary.process.summary ? summary.process.summary : "No live process";
        const pendingDrawerAction = state.ui.pendingDrawerAction && state.ui.pendingDrawerAction.threadId === (thread.id || "")
          ? state.ui.pendingDrawerAction
          : undefined;
        if (state.ui.pendingDrawerAction && !pendingDrawerAction) {
          clearPendingDrawerAction();
        }
        const confirmMeta = pendingDrawerAction ? getDrawerConfirmMeta(pendingDrawerAction.action) : undefined;
        drawer.classList.add("open");
        backdrop.classList.add("open");
        title.textContent = thread.title || thread.id || "Thread detail";
        meta.innerHTML = [
          statusBadge(summary.status || thread.status || "idle"),
          '<span class="meta-pill mono">' + esc(thread.id || "") + '</span>',
          (thread.model || summary.model) ? '<span class="meta-pill">' + esc(thread.model || summary.model) + '</span>' : '',
          (thread.reasoning_effort || summary.reasoning_effort) ? '<span class="meta-pill">' + esc(thread.reasoning_effort || summary.reasoning_effort) + '</span>' : ''
        ].join("");
        summaryNode.innerHTML = [
          drawerStat("Updated", summary.updated_age || thread.updated_at_iso || "-"),
          drawerStat("Last Log", summary.log_age || (logs[0] && logs[0].age) || "-"),
          drawerStat("Process", processText)
        ].join("");
        actionsNode.className = "action-rail" + (pendingDrawerAction ? " confirm" + (confirmMeta.tone === "danger" ? " danger" : "") : "");
        actionsNode.innerHTML = pendingDrawerAction
          ? [
              '<span class="batch-intent' + (confirmMeta.tone === "danger" ? ' danger' : '') + '">' + esc(confirmMeta.intentLabel) + '</span>',
              '<span class="batch-preview">' + esc(confirmMeta.summary + " " + short(thread.title || thread.id || "thread", 52)) + '</span>',
              '<span class="batch-spacer"></span>',
              '<button class="action-btn secondary" data-drawer-cancel="true" type="button">Cancel</button>',
              '<button class="action-btn ' + esc(confirmMeta.tone) + '" data-drawer-confirm="' + esc(pendingDrawerAction.action) + '" data-drawer-thread="' + esc(thread.id || "") + '" type="button">' + esc(confirmMeta.confirmLabel) + '</button>'
            ].join("")
          : (
              isSoftDeleted
                ? [
                    renderActionButton("restore", "Restore", "secondary", "RS", thread.id || ""),
                    renderActionButton("hard_delete", "Hard Delete", "danger", "HD", thread.id || ""),
                    '<span class="action-status">' + esc(actionNotice || '') + '</span>'
                  ]
                : [
                    renderActionButton(isArchived ? "unarchive" : "archive", isArchived ? "Unarchive" : "Archive", "secondary", isArchived ? "UA" : "AR", thread.id || ""),
                    renderActionButton("soft_delete", "Soft Delete", "warn", "SD", thread.id || ""),
                    renderActionButton("hard_delete", "Hard Delete", "danger", "HD", thread.id || ""),
                    '<span class="action-status">' + esc(actionNotice || '') + '</span>'
                  ]
            ).join("");
        const resumeCommand = (detail.hint_commands && detail.hint_commands.resume) || "";
        const forkCommand = (detail.hint_commands && detail.hint_commands.fork) || "";
        body.innerHTML = [
          '<div class="drawer-section">' +
            renderSectionHeading("Overview", "OV") +
            '<div class="kv-grid">' +
              kv("Workspace", thread.cwd || summary.cwd || "-") +
              kv("Created", thread.created_at_iso || "-") +
              kv("Updated", thread.updated_at_iso || "-") +
              kv("Last Log", summary.last_log_iso || (logs[0] && logs[0].ts_iso) || "-") +
              kv("Provider", thread.model_provider || summary.model_provider || "-") +
              kv("CLI", thread.cli_version || summary.cli_version || "-") +
              kv("Tokens", String(summary.tokens_used || thread.tokens_used || 0)) +
              kv("Approval", thread.approval_mode || summary.approval_mode || "-") +
            '</div>' +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Commands", "CM") +
            '<div class="cmd-grid">' +
              renderCommandCard("Resume", resumeCommand, "Resume", thread.id || "") +
              renderCommandCard("Fork", forkCommand, "Fork", thread.id || "") +
            '</div>' +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Recent Logs", "LG") +
            (logs.length
              ? logs.slice(0, 12).map((log) =>
                  '<div class="drawer-log"><div class="chat-head"><span>' + esc(log.level || "INFO") + '</span><span>' + esc(log.ts_iso || "") + '</span></div><div class="kv-value">' + esc(log.message || "") + '</div></div>'
                ).join("")
              : '<div class="empty">No logs available.</div>') +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Conversation", "CV") +
            (history.length
              ? history.slice(0, 16).map((item) =>
                  '<div class="chat ' + esc(item.role || "assistant") + '"><div class="chat-head"><span>' + esc(item.role || "assistant") + '</span><span>' + esc(item.ts || "") + '</span></div><div>' + esc(item.text || "") + '</div></div>'
                ).join("")
              : '<div class="empty">No conversation history available.</div>') +
          '</div>'
        ].join("");
        document.querySelectorAll("[data-lifecycle-action]").forEach((node) => {
          node.addEventListener("click", () => {
            const action = node.dataset.lifecycleAction;
            const threadId = node.dataset.lifecycleThread;
            if (action === "hard_delete" || action === "soft_delete") {
              setPendingDrawerAction(threadId, action);
              render(state.payload);
              return;
            }
            vscode.postMessage({ type: "lifecycle", action, threadId });
          });
        });
        document.querySelectorAll("[data-drawer-cancel]").forEach((node) => {
          node.addEventListener("click", () => {
            clearPendingDrawerAction();
            render(state.payload);
          });
        });
        document.querySelectorAll("[data-drawer-confirm]").forEach((node) => {
          node.addEventListener("click", () => {
            const action = node.dataset.drawerConfirm;
            const threadId = node.dataset.drawerThread;
            clearPendingDrawerAction();
            render(state.payload);
            vscode.postMessage({ type: "lifecycle", action, threadId });
          });
        });
        document.querySelectorAll("[data-run-command]").forEach((node) => {
          node.addEventListener("click", () => {
            if (node.disabled) return;
            setCommandFeedback(node.dataset.commandThread, node.dataset.commandLabel || "Command", "Sent to terminal", "success");
            render(state.payload);
            vscode.postMessage({
              type: "runCommand",
              command: node.dataset.runCommand,
              label: node.dataset.commandLabel || "Command"
            });
          });
        });
        document.querySelectorAll("[data-copy-command]").forEach((node) => {
          node.addEventListener("click", () => {
            if (node.disabled) return;
            setCommandFeedback(node.dataset.commandThread, node.dataset.commandLabel || "Command", "Copied", "success");
            render(state.payload);
            vscode.postMessage({
              type: "copyText",
              text: node.dataset.copyCommand,
              label: node.dataset.commandLabel || "Command"
            });
          });
        });
      }

      function kv(label, value) {
        return '<div class="kv"><div class="kv-label">' + esc(label) + '</div><div class="kv-value">' + esc(value || "-") + '</div></div>';
      }

      function drawerStat(label, value) {
        return '<div class="drawer-stat"><div class="drawer-stat-label">' + esc(label) + '</div><div class="drawer-stat-value">' + esc(value || "-") + '</div></div>';
      }

      function renderIconBadge(code, tone = "default") {
        return '<span class="icon-badge' + (tone !== "default" ? ' ' + esc(tone) : '') + '">' + esc(code) + '</span>';
      }

      function commandFeedbackKey(threadId, commandLabel) {
        return (threadId || "thread") + ":" + (commandLabel || "command");
      }

      function setCommandFeedback(threadId, commandLabel, message, tone = "default") {
        state.ui.commandFeedback[commandFeedbackKey(threadId, commandLabel)] = { message, tone };
      }

      function renderSectionHeading(label, code) {
        return '<h4><span class="section-heading">' + renderIconBadge(code) + '<span>' + esc(label) + '</span></span></h4>';
      }

      function renderActionButton(action, label, tone, code, threadId) {
        const badgeTone = tone === "warn" || tone === "danger" ? tone : "default";
        return '<button class="action-btn ' + esc(tone) + ' with-icon" data-lifecycle-action="' + esc(action) + '" data-lifecycle-thread="' + esc(threadId) + '" type="button">' +
          renderIconBadge(code, badgeTone) +
          '<span>' + esc(label) + '</span>' +
        '</button>';
      }

      function renderCommandCard(label, command, commandLabel, threadId) {
        const available = Boolean(command);
        const feedback = state.ui.commandFeedback[commandFeedbackKey(threadId, commandLabel)];
        return '<div class="cmd-card' + (available ? '' : ' unavailable') + '">' +
          '<div class="cmd-head"><span class="cmd-headline">' + renderIconBadge(commandLabel === "Resume" ? "RS" : "FK") + '<span class="cmd-name">' + esc(label) + '</span></span><span class="meta-pill mono">' + esc(commandLabel) + '</span></div>' +
          '<div class="cmd-subhead"><span class="cmd-hint">' + esc(available ? 'Ready for terminal or clipboard' : 'Unavailable for this thread') + '</span>' +
            (feedback ? '<span class="cmd-feedback' + (feedback.tone === "success" ? ' success' : '') + '">' + esc(feedback.message) + '</span>' : '') +
          '</div>' +
          '<div class="code-line' + (available ? '' : ' empty') + '">' + esc(command || "No command available.") + '</div>' +
          '<div class="cmd-actions">' +
            '<button class="action-btn secondary" data-run-command="' + esc(command || "") + '" data-command-label="' + esc(commandLabel) + '" data-command-thread="' + esc(threadId || "") + '" type="button"' + (available ? '' : ' disabled') + '>Run</button>' +
            '<button class="action-btn secondary" data-copy-command="' + esc(command || "") + '" data-command-label="' + esc(commandLabel) + '" data-command-thread="' + esc(threadId || "") + '" type="button"' + (available ? '' : ' disabled') + '>Copy</button>' +
          '</div>' +
        '</div>';
      }

      function render(payload) {
        if (!payload) return;
        state.payload = payload;
        const service = payload.service || {};
        const dashboard = payload.dashboard || { threads: [], runningThreads: [], threadsMeta: { counts: {} } };
        state.selectedThreadId = payload.selectedThreadId;
        state.currentSurface = payload.currentSurface || "editor";

        document.getElementById("baseUrl").textContent = "Base URL: " + (service.baseUrl || "-");
        document.getElementById("surfaceLabel").textContent = "Position: " + ({
          left: "Left",
          bottom: "Bottom",
          editor: "Editor",
          fullscreen: "Fullscreen"
        }[state.currentSurface] || "Editor");
        document.getElementById("heroSummary").textContent =
          (dashboard.threads || []).length
            ? ((dashboard.threads || []).length + " threads loaded" + ((dashboard.runningThreads || []).length ? " · " + (dashboard.runningThreads || []).length + " running" : ""))
            : "Connect the local Codex Manager server to load your threads.";

        [
          ["posLeft", "left"],
          ["posBottom", "bottom"],
          ["posEditor", "editor"],
          ["posFullscreen", "fullscreen"]
        ].forEach(([id, surface]) => {
          document.getElementById(id).classList.toggle("active", state.currentSurface === surface);
        });

        const searchInput = document.getElementById("threadSearch");
        if (searchInput.value !== state.ui.search) searchInput.value = state.ui.search;
        document.querySelectorAll("[data-filter]").forEach((node) => {
          node.classList.toggle("active", node.dataset.filter === state.ui.filter);
        });
        document.querySelectorAll("[data-sort]").forEach((node) => {
          node.classList.toggle("active", node.dataset.sort === state.ui.sort);
        });
        document.querySelectorAll("[data-toggle='pinned']").forEach((node) => {
          node.classList.toggle("active", state.ui.pinnedOnly);
        });

        document.getElementById("statusLine").innerHTML =
          '<span class="' + (service.ok ? 'service-ok' : 'service-bad') + '">' +
          esc(service.ok ? (service.autoStarted ? 'Connected · auto-started' : 'Connected') : 'Disconnected') +
          "</span>" +
          " · " + esc(service.message || "") +
          (service.logPath ? " · log: " + esc(service.logPath) : "");

        const counts = (dashboard.threadsMeta && dashboard.threadsMeta.counts) || {};
        const filteredThreads = (dashboard.threads || []).filter(threadMatches);
        const existingIds = new Set((dashboard.threads || []).map((thread) => thread.id));
        Object.keys(state.ui.selected).forEach((id) => {
          if (!existingIds.has(id)) delete state.ui.selected[id];
        });
        const groups = buildGroups(filteredThreads);
        const visibleCount = filteredThreads.length;
        const selectedIds = filteredThreads.filter((thread) => isSelected(thread.id)).map((thread) => thread.id);
        const pendingBatch = state.ui.pendingBatch && sameIdSet(state.ui.pendingBatch.threadIds, selectedIds)
          ? state.ui.pendingBatch
          : undefined;
        if (state.ui.pendingBatch && !pendingBatch) {
          clearPendingBatch();
        }

        document.getElementById("metrics").innerHTML = [
          metric("Visible", visibleCount),
          metric("Running", counts.running || 0),
          metric("Archived", counts.archived || 0),
          metric("Soft Deleted", (dashboard.threadsMeta && dashboard.threadsMeta.soft_deleted_total) || 0)
        ].join("");
        document.getElementById("runningSummary").textContent =
          (dashboard.runningThreads || []).length
            ? ((dashboard.runningThreads || []).length + " active thread" + ((dashboard.runningThreads || []).length > 1 ? "s" : ""))
            : "No live agents currently running.";
        document.getElementById("threadSummary").textContent =
          visibleCount
            ? ("Showing " + visibleCount + " of " + (dashboard.threads || []).length + " loaded threads · sorted by " + state.ui.sort)
            : "No threads match the current search/filter.";
        const batchBar = document.getElementById("batchBar");
        const pendingMeta = pendingBatch ? getBatchActionMeta(pendingBatch.action) : undefined;
        const batchToneClass = pendingMeta && pendingMeta.tone === "danger" ? " danger" : "";
        batchBar.className = "batch-bar" + (filteredThreads.length ? " visible" : "") + (pendingBatch ? " confirm" + batchToneClass : "");
        batchBar.innerHTML = selectedIds.length
          ? (pendingBatch
            ? [
                '<span class="batch-count">' + esc(String(selectedIds.length)) + ' selected</span>',
                '<span class="batch-intent' + (pendingMeta.tone === "danger" ? ' danger' : '') + '">' + esc(pendingMeta.intentLabel || pendingMeta.label) + '</span>',
                '<span class="batch-preview">' + esc((pendingMeta.summary || "") + ' ' + summarizeThreadSelection(filteredThreads, selectedIds)).trim() + '</span>',
                '<span class="batch-spacer"></span>',
                '<button class="chip" data-batch-cancel="true" type="button">Cancel</button>',
                '<button class="chip ' + esc((pendingMeta.tone === "danger" ? "danger-chip" : "warn-chip")) + '" data-batch-confirm="true" type="button">' + esc(pendingMeta.confirmLabel || pendingMeta.label) + '</button>'
              ].join("")
            : [
                '<span class="batch-count">' + esc(String(selectedIds.length)) + ' selected</span>',
                '<button class="chip" data-batch-select="visible" type="button">Select Visible</button>',
                '<button class="chip" data-batch-clear="true" type="button">Clear</button>',
                '<button class="chip" data-batch-action="archive" type="button">Archive</button>',
                '<button class="chip" data-batch-action="unarchive" type="button">Unarchive</button>',
                '<button class="chip warn-chip" data-batch-action="soft_delete" type="button">Soft Delete</button>',
                '<button class="chip" data-batch-action="restore" type="button">Restore</button>',
                '<button class="chip danger-chip" data-batch-action="hard_delete" type="button">Hard Delete</button>',
                '<span class="batch-spacer"></span>',
                '<span class="action-status">' + esc((payload && payload.actionNotice) || '') + '</span>'
              ].join(""))
          : [
          '<button class="chip" data-batch-select="visible" type="button">Select Visible</button>',
          '<span class="action-status">Batch actions appear when threads are selected.</span>'
        ].join("");

        document.getElementById("runningList").innerHTML = (dashboard.runningThreads || []).map((thread) => {
          return '<div class="running-row">' +
            '<div class="row-head">' + statusBadge(thread.status) + '<span class="mono muted">' + esc(thread.id) + '</span></div>' +
            '<div class="thread-title">' + esc(short(thread.title || "(no title)", 100)) + '</div>' +
            '<div class="preview">' + esc(short((thread.process && thread.process.summary) || "no live pid", 120)) + '</div>' +
          '</div>';
        }).join("") || '<div class="empty">No running agents right now.</div>';

        document.getElementById("threadList").innerHTML = [
          renderGroup("running", "Running", groups.running),
          renderGroup("recent", "Recent", groups.recent),
          renderGroup("idle", "Idle", groups.idle),
          renderGroup("archived", "Archived", groups.archived),
          renderGroup("soft_deleted", "Soft Deleted", groups.soft_deleted)
        ].join("") || '<div class="empty">No threads loaded.</div>';

        document.querySelectorAll("[data-thread-id]").forEach((node) => {
          node.addEventListener("click", () => {
            state.ui.drawerOpen = true;
            persistUi();
            vscode.postMessage({ type: "selectThread", threadId: node.dataset.threadId });
          });
        });
        document.querySelectorAll("[data-select-thread]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleSelected(node.dataset.selectThread);
          });
        });
        document.querySelectorAll("[data-pin-thread]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            togglePin(node.dataset.pinThread);
          });
        });
        document.querySelectorAll("[data-group]").forEach((node) => {
          node.addEventListener("toggle", () => {
            state.ui.groups[node.dataset.group] = node.open;
            persistUi();
          });
        });
        document.querySelectorAll("[data-batch-select]").forEach((node) => {
          node.addEventListener("click", () => {
            clearPendingBatch();
            filteredThreads.forEach((thread) => {
              state.ui.selected[thread.id] = true;
            });
            persistUi();
            render(state.payload);
          });
        });
        document.querySelectorAll("[data-batch-clear]").forEach((node) => {
          node.addEventListener("click", () => {
            clearSelection();
          });
        });
        document.querySelectorAll("[data-batch-action]").forEach((node) => {
          node.addEventListener("click", () => {
            const action = node.dataset.batchAction;
            const threadIds = filteredThreads.filter((thread) => isSelected(thread.id)).map((thread) => thread.id);
            if (!threadIds.length) return;
            const meta = getBatchActionMeta(action);
            if (meta.requiresConfirm) {
              setPendingBatch(action, threadIds);
              render(state.payload);
              return;
            }
            vscode.postMessage({ type: "lifecycleBatch", action, threadIds });
          });
        });
        document.querySelectorAll("[data-batch-cancel]").forEach((node) => {
          node.addEventListener("click", () => {
            clearPendingBatch();
            render(state.payload);
          });
        });
        document.querySelectorAll("[data-batch-confirm]").forEach((node) => {
          node.addEventListener("click", () => {
            if (!state.ui.pendingBatch || !state.ui.pendingBatch.threadIds.length) return;
            const { action, threadIds } = state.ui.pendingBatch;
            clearPendingBatch();
            render(state.payload);
            vscode.postMessage({ type: "lifecycleBatch", action, threadIds });
          });
        });

        const runningThreads = dashboard.runningThreads || [];
        document.getElementById("runningTabs").innerHTML = [
          '<button class="tab ' + (state.selectedThreadId ? '' : 'active') + '" data-running-thread="">Overview</button>',
          ...runningThreads.map((thread) => '<button class="tab ' + (state.selectedThreadId === thread.id ? 'active' : '') + '" data-running-thread="' + esc(thread.id) + '">' + esc(short(thread.title || thread.id, 28)) + '</button>')
        ].join("");

        document.querySelectorAll("[data-running-thread]").forEach((node) => {
          node.addEventListener("click", () => {
            const threadId = node.dataset.runningThread || undefined;
            vscode.postMessage({ type: "selectThread", threadId });
          });
        });

        const selected = (dashboard.threads || []).find((thread) => thread.id === state.selectedThreadId) || filteredThreads[0] || runningThreads[0] || dashboard.threads[0];
        const terminalLogs = selected ? (selected.preview_logs || []) : [];
        document.getElementById("terminal").innerHTML = terminalLogs.map((log) => {
          return '<div class="terminal-line"><span class="muted">' + esc(log.ts_iso || "") + '</span> ' +
            '<strong>' + esc(log.level || "INFO") + '</strong> ' +
            esc(log.message || log.target || "log event") + '</div>';
        }).join("") || '<div class="empty">No recent log preview available.</div>';

        const detailThread = (payload.detail && payload.detail.thread) || {};
        const history = (detailThread.id && detailThread.id === (selected && selected.id) ? (detailThread.history || []) : []) || (selected ? (selected.history || []) : []);
        document.getElementById("chatWindow").innerHTML = history.map((item) => {
          return '<div class="chat ' + esc(item.role || "assistant") + '">' +
            '<div class="chat-head"><span>' + esc(item.role || "assistant") + '</span><span>' + esc(item.ts || "") + '</span></div>' +
            '<div>' + esc(item.text || "") + '</div>' +
          '</div>';
        }).join("") || '<div class="empty">Select a thread to inspect its chat history.</div>';

        renderDetail(payload);
      }

      function metric(label, value) {
        return '<div class="metric"><div class="metric-label">' + esc(label) + '</div><div class="metric-value">' + esc(String(value)) + '</div></div>';
      }

      window.addEventListener("message", (event) => {
        if (event.data && event.data.type === "state") {
          render(event.data);
        }
      });

      document.getElementById("reload").addEventListener("click", () => {
        vscode.postMessage({ type: "reload" });
      });
      document.getElementById("threadSearch").addEventListener("input", (event) => {
        state.ui.search = event.target.value || "";
        persistUi();
        render(state.payload);
      });
      document.querySelectorAll("[data-filter]").forEach((node) => {
        node.addEventListener("click", () => {
          state.ui.filter = node.dataset.filter;
          persistUi();
          render(state.payload);
        });
      });
      document.querySelectorAll("[data-sort]").forEach((node) => {
        node.addEventListener("click", () => {
          state.ui.sort = node.dataset.sort;
          persistUi();
          render(state.payload);
        });
      });
      document.querySelectorAll("[data-toggle='pinned']").forEach((node) => {
        node.addEventListener("click", () => {
          state.ui.pinnedOnly = !state.ui.pinnedOnly;
          persistUi();
          render(state.payload);
        });
      });
      document.getElementById("posLeft").addEventListener("click", () => {
        vscode.postMessage({ type: "showSidebar" });
      });
      document.getElementById("posBottom").addEventListener("click", () => {
        vscode.postMessage({ type: "showBottomPanel" });
      });
      document.getElementById("posEditor").addEventListener("click", () => {
        vscode.postMessage({ type: "openPanel" });
      });
      document.getElementById("posFullscreen").addEventListener("click", () => {
        vscode.postMessage({ type: "maximizeDashboard" });
      });
      document.getElementById("startServer").addEventListener("click", () => {
        vscode.postMessage({ type: "startServer" });
      });
      document.getElementById("external").addEventListener("click", () => {
        vscode.postMessage({ type: "openExternal" });
      });
      document.getElementById("drawerClose").addEventListener("click", () => {
        clearPendingDrawerAction();
        state.ui.drawerOpen = false;
        persistUi();
        render(state.payload);
      });
      document.getElementById("drawerBackdrop").addEventListener("click", () => {
        clearPendingDrawerAction();
        state.ui.drawerOpen = false;
        persistUi();
        render(state.payload);
      });
    </script>
  </body>
</html>`;
}

function activate(context) {
  const provider = new CodexAgentPanel(context.extensionUri);

  context.subscriptions.push(provider);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("codexAgent.sidebar", new CodexAgentSidebarProvider(provider), {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("codexAgent.bottom", new CodexAgentBottomProvider(provider), {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codexAgent.openPanel", async () => {
      await provider.focus();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codexAgent.openPanelBeside", async () => {
      await provider.openBeside();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codexAgent.showSidebar", async () => {
      await provider.showSidebar();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codexAgent.showBottomPanel", async () => {
      await provider.showBottomPanel();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codexAgent.maximizeDashboard", async () => {
      await provider.maximizeDashboard();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codexAgent.movePanelToNewWindow", async () => {
      await provider.moveToNewWindow();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codexAgent.refreshPanel", async () => {
      await provider.refresh();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codexAgent.openExternal", async () => {
      await provider.openExternal();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codexAgent.startServer", async () => {
      await provider.ensureServer({ forceStart: true });
      await provider.refresh();
    }),
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
