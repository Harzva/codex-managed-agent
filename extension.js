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
    this.lastPayload = undefined;
    this.selectedThreadId = undefined;
    this.editorSurface = "editor";
    this.lastActionNotice = "";
    this.lastSuccessfulRefreshAt = "";
    this.previousRunningIds = new Set();
    this.recentCompletions = [];
    this.codexTabWatcher = vscode.window.tabGroups.onDidChangeTabs(() => {
      this.broadcastLinkState();
    });
    this.codexTabGroupWatcher = vscode.window.tabGroups.onDidChangeTabGroups(() => {
      this.broadcastLinkState();
    });
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
    this.codexTabWatcher?.dispose();
    this.codexTabGroupWatcher?.dispose();
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
      if (message.type === "restartServer") {
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
      if (message.type === "renameThread") {
        await this.renameThread(message.threadId, message.currentTitle);
      }
      if (message.type === "openInCodexEditor") {
        await this.openInCodexEditor(message.threadId);
      }
      if (message.type === "revealInCodexSidebar") {
        await this.revealInCodexSidebar(message.threadId);
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

  async renameThread(threadId, currentTitle = "") {
    if (!threadId) return;
    const nextTitle = await vscode.window.showInputBox({
      title: "Rename Codex thread",
      prompt: "Update the thread label used by Codex-Managed-Agent",
      value: String(currentTitle || ""),
      ignoreFocusOut: true,
      validateInput: (value) => String(value || "").trim() ? undefined : "Title cannot be empty",
    });
    if (nextTitle === undefined) return;
    const title = String(nextTitle).trim();
    if (!title) return;
    const config = getConfig();
    try {
      await postRenameThread(config.baseUrl, threadId, title);
      this.lastActionNotice = `Renamed thread to ${title}`;
      vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 2600);
      await this.refresh();
    } catch (error) {
      this.lastActionNotice = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`);
      await this.refresh({ silent: true });
    }
  }

  async openInCodexEditor(threadId) {
    if (!threadId) return;
    try {
      const uri = vscode.Uri.file(`/local/${threadId}`).with({ scheme: "openai-codex", authority: "route" });
      await vscode.commands.executeCommand("vscode.openWith", uri, "chatgpt.conversationEditor");
      this.lastActionNotice = "Opened thread in Codex editor";
      vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 2400);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Codex-Managed-Agent: Failed to open Codex editor: ${detail}`);
    }
  }

  async revealInCodexSidebar(threadId) {
    if (!threadId) return;
    try {
      await vscode.commands.executeCommand("chatgpt.openSidebar");
      const routeUri = vscode.Uri.parse(`vscode://openai.chatgpt/local/${encodeURIComponent(threadId)}`);
      await vscode.env.openExternal(routeUri);
      this.lastActionNotice = "Requested Codex sidebar route switch";
      vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 2400);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      vscode.window.showWarningMessage(`Codex-Managed-Agent: Could not steer Codex sidebar: ${detail}`);
    }
  }

  extractCodexThreadIdFromUri(uri) {
    if (!uri || uri.scheme !== "openai-codex" || uri.authority !== "route") return undefined;
    const match = String(uri.path || "").match(/^\/local\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : undefined;
  }

  extractCodexThreadIdFromTab(tab) {
    if (!tab || !tab.input) return undefined;
    const input = tab.input;
    try {
      if (input instanceof vscode.TabInputCustom) {
        if (input.viewType !== "chatgpt.conversationEditor") return undefined;
        return this.extractCodexThreadIdFromUri(input.uri);
      }
    } catch (error) {
    }
    if (input.viewType === "chatgpt.conversationEditor" && input.uri) {
      return this.extractCodexThreadIdFromUri(input.uri);
    }
    return undefined;
  }

  getCodexLinkState() {
    const openThreadIds = new Set();
    let focusedThreadId;
    for (const group of vscode.window.tabGroups.all || []) {
      for (const tab of group.tabs || []) {
        const threadId = this.extractCodexThreadIdFromTab(tab);
        if (!threadId) continue;
        openThreadIds.add(threadId);
        if (group.isActive && tab.isActive) {
          focusedThreadId = threadId;
        }
      }
    }
    return {
      openThreadIds: [...openThreadIds],
      focusedThreadId,
    };
  }

  broadcastLinkState() {
    if (!this.hasSurface() || !this.lastPayload) return;
    this.broadcastState(this.lastPayload);
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
        lastSuccessfulRefreshAt: this.lastSuccessfulRefreshAt,
      });
      if (!options.silent) {
        vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${service.message}`, 2500);
      }
      return;
    }

    try {
      const dashboard = await fetchDashboardState(service.baseUrl);
      const currentThreads = Array.isArray(dashboard.threads) ? dashboard.threads : [];
      const nextRunningIds = new Set((dashboard.runningThreads || []).map((thread) => thread.id));
      const completedEvents = [...this.previousRunningIds]
        .filter((threadId) => !nextRunningIds.has(threadId))
        .map((threadId) => {
          const thread = currentThreads.find((item) => item.id === threadId) || {};
          return {
            id: `${threadId}:${Date.now()}`,
            threadId,
            title: thread.title || threadId,
            status: thread.status || "completed",
            updatedAt: thread.updated_at_iso || "",
          };
        });
      if (completedEvents.length) {
        this.recentCompletions = [...completedEvents, ...this.recentCompletions].slice(0, 8);
        const label = completedEvents.length === 1
          ? completedEvents[0].title
          : `${completedEvents.length} threads`;
        vscode.window.showInformationMessage(`Codex-Managed-Agent: completed ${label}`);
      }
      this.previousRunningIds = nextRunningIds;
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
      this.lastSuccessfulRefreshAt = new Date().toISOString();

      this.broadcastState({
        type: "state",
        service,
        dashboard,
        selectedThreadId: this.selectedThreadId,
        detail,
        recentCompletions: this.recentCompletions,
        actionNotice: this.lastActionNotice,
        lastSuccessfulRefreshAt: this.lastSuccessfulRefreshAt,
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
        lastSuccessfulRefreshAt: this.lastSuccessfulRefreshAt,
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
    const enrichedPayload = {
      ...payload,
      codexLinkState: this.getCodexLinkState(),
    };
    this.lastPayload = enrichedPayload;
    if (this.panel) {
      this.panel.webview.postMessage({
        ...enrichedPayload,
        currentSurface: this.editorSurface,
      });
    }
    if (this.sidebarView) {
      this.sidebarView.webview.postMessage({
        ...enrichedPayload,
        currentSurface: "left",
      });
    }
    if (this.bottomView) {
      this.bottomView.webview.postMessage({
        ...enrichedPayload,
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
        --bg: #000000;
        --bg-top: #000000;
        --panel: rgba(255, 255, 255, 0.028);
        --panel-soft: rgba(255, 255, 255, 0.02);
        --panel-elevated: rgba(255, 255, 255, 0.042);
        --line: rgba(255, 255, 255, 0.06);
        --line-strong: rgba(255, 255, 255, 0.14);
        --text: #f8fafc;
        --text-strong: #ffffff;
        --muted: #a7b0c0;
        --muted-soft: #6b7280;
        --cyan: #8dd8ff;
        --green: #54f2b0;
        --gold: #ffd479;
        --red: #ff8f9f;
        --blue: #7c9dff;
        --purple: #c4a3ff;
        --shadow-lg: 0 24px 60px rgba(0, 0, 0, 0.48);
      }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        background: #000;
        color: var(--text);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        height: 100%;
      }
      body { padding: 12px; }
      .shell { display: grid; gap: 12px; max-width: 1720px; margin: 0 auto; }
      .panel {
        background:
          radial-gradient(circle at top right, rgba(124, 157, 255, 0.08), transparent 28%),
          radial-gradient(circle at bottom left, rgba(196, 163, 255, 0.05), transparent 26%),
          var(--panel);
        border: 1px solid var(--line);
        border-radius: 24px;
        padding: 14px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.46);
        backdrop-filter: blur(14px);
      }
      .topbar {
        display: grid;
        gap: 12px;
      }
      .topbar-head {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 16px;
        align-items: start;
      }
      .topbar-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
      }
      .brand-cluster {
        display: grid;
        gap: 8px;
      }
      .brand-line {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .title {
        font-size: 21px;
        font-weight: 800;
        line-height: 1.2;
        letter-spacing: -0.02em;
        color: var(--text-strong);
      }
      .sub {
        color: var(--muted);
        margin-top: 4px;
        line-height: 1.45;
        font-size: 12px;
      }
      .hero-stage {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .mascot-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 30px;
        padding: 0 12px 0 8px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.026);
        color: var(--muted);
        font-size: 11px;
        letter-spacing: 0.04em;
      }
      .mascot-face {
        display: grid;
        place-items: center;
        width: 24px;
        height: 24px;
        border-radius: 9px;
        background: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05));
        color: var(--text-strong);
        font-size: 14px;
      }
      .mascot-chip strong {
        color: var(--text);
        font-weight: 700;
      }
      .hero-kicker {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 22px;
        padding: 0 9px;
        border-radius: 999px;
        border: 1px solid rgba(126, 231, 255, 0.18);
        background: rgba(255, 255, 255, 0.024);
        color: var(--cyan);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin: 0;
      }
      .hero-meta {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .hero-pill {
        display: inline-flex;
        align-items: center;
        min-height: 26px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.026);
        color: var(--muted);
        font-size: 11px;
      }
      .actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      .topbar-nav-left,
      .topbar-nav-right {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .switcher {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .workspace-tabs {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .workspace-tab {
        min-height: 34px;
        padding: 0 14px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.03);
        color: var(--muted);
      }
      .workspace-tab:hover {
        color: var(--text);
      }
      .workspace-tab.active {
        color: var(--text);
        border-color: rgba(124, 157, 255, 0.28);
        background: linear-gradient(180deg, rgba(44, 60, 110, 0.48), rgba(24, 31, 56, 0.46));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
      }
      button {
        min-height: 30px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid rgba(126, 231, 255, 0.24);
        background: rgba(17, 95, 177, 0.14);
        color: var(--text);
        cursor: pointer;
        font-size: 12px;
        transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
      }
      button:hover {
        border-color: rgba(126, 231, 255, 0.36);
        transform: translateY(-1px);
        box-shadow: 0 10px 22px rgba(0, 0, 0, 0.14);
      }
      .switch-btn.active {
        border-color: rgba(75, 255, 181, 0.45);
        box-shadow: inset 0 0 0 1px rgba(75, 255, 181, 0.18);
        background: rgba(29, 130, 92, 0.24);
        color: var(--green);
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }
      .metric {
        border-radius: 18px;
        padding: 14px 14px 12px 14px;
        background: linear-gradient(180deg, rgba(255,255,255,0.038), rgba(255,255,255,0.014));
        border: 1px solid rgba(255,255,255,0.06);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
        position: relative;
        overflow: hidden;
      }
      .metric::before {
        content: "";
        position: absolute;
        top: 0;
        left: 18px;
        width: 42px;
        height: 3px;
        border-radius: 999px;
        background: linear-gradient(90deg, var(--blue), rgba(196,163,255,0.82));
      }
      .metric-label {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .metric-value {
        margin-top: 6px;
        font-size: 28px;
        font-weight: 700;
        letter-spacing: -0.03em;
      }
      .toolbar {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        margin-bottom: 12px;
      }
      .search {
        width: 100%;
        min-height: 34px;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.028);
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
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.025);
        color: var(--muted);
        cursor: pointer;
        font-size: 11px;
      }
      .chip.active {
        background: rgba(124, 157, 255, 0.18);
        color: var(--text-strong);
        border-color: rgba(124, 157, 255, 0.34);
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
        border-radius: 16px;
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
      .service-banner {
        display: none;
        margin-top: 12px;
        border-radius: 14px;
        border: 1px solid rgba(255, 124, 136, 0.14);
        background: rgba(60, 18, 28, 0.24);
        color: #ffd5da;
        padding: 10px 12px;
        font-size: 12px;
        line-height: 1.45;
      }
      .service-banner.visible {
        display: block;
      }
      .service-restart {
        border-color: rgba(255, 124, 136, 0.26);
        background: rgba(122, 24, 40, 0.2);
        color: #ffd9dd;
      }
      .completion-rail {
        display: none;
        gap: 10px;
        overflow: auto;
        padding-bottom: 2px;
      }
      .completion-rail.visible {
        display: flex;
      }
      .completion-card {
        min-width: 240px;
        max-width: 320px;
        padding: 12px 14px;
        border-radius: 16px;
        border: 1px solid rgba(75, 255, 181, 0.16);
        background: linear-gradient(180deg, rgba(8, 18, 20, 0.98), rgba(2, 7, 10, 0.98));
        box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);
        animation: completionPulse 2.4s ease-in-out infinite;
      }
      @keyframes completionPulse {
        0%, 100% { box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18); transform: translateY(0); }
        50% { box-shadow: 0 16px 34px rgba(33, 180, 123, 0.16); transform: translateY(-1px); }
      }
      .completion-head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
        margin-bottom: 8px;
      }
      .completion-title {
        font-size: 13px;
        font-weight: 700;
        line-height: 1.35;
      }
      .completion-meta {
        color: var(--muted);
        font-size: 11px;
      }
      .workspace-pane {
        display: none;
      }
      .workspace-pane.active {
        display: block;
      }
      .main-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.18fr) minmax(320px, 0.82fr);
        gap: 14px;
      }
      .overview-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
        gap: 14px;
      }
      .overview-digest {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 14px;
      }
      .summary-deck {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      .summary-card {
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015));
        padding: 14px;
      }
      .summary-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }
      .summary-value {
        margin-top: 8px;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      .summary-copy {
        margin-top: 6px;
        color: var(--muted-soft);
        font-size: 12px;
        line-height: 1.45;
      }
      .digest-rail {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .mini-thread {
        padding: 12px 14px;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.06);
        background: rgba(255,255,255,0.025);
      }
      .mini-thread-title {
        margin-top: 6px;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.35;
      }
      .mini-thread-meta {
        margin-top: 6px;
        color: var(--muted);
        font-size: 11px;
      }
      .single-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 14px;
      }
      .timeline-stack {
        display: grid;
        gap: 12px;
      }
      .timeline-card {
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,0.06);
        background: linear-gradient(180deg, rgba(255,255,255,0.032), rgba(255,255,255,0.014));
        padding: 14px;
      }
      .timeline-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        margin-bottom: 10px;
      }
      .timeline-title {
        font-size: 14px;
        font-weight: 700;
      }
      .timeline-events {
        display: grid;
        gap: 10px;
      }
      .timeline-event {
        display: grid;
        grid-template-columns: 16px minmax(0, 1fr);
        gap: 10px;
        align-items: start;
      }
      .timeline-dot {
        width: 10px;
        height: 10px;
        margin-top: 4px;
        border-radius: 999px;
        background: rgba(126, 231, 255, 0.95);
        box-shadow: 0 0 0 4px rgba(126, 231, 255, 0.08);
      }
      .timeline-dot.complete {
        background: rgba(75, 255, 181, 0.95);
        box-shadow: 0 0 0 4px rgba(75, 255, 181, 0.08);
      }
      .timeline-event-body {
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(126, 231, 255, 0.06);
      }
      .timeline-event:last-child .timeline-event-body {
        border-bottom: none;
        padding-bottom: 0;
      }
      .timeline-event-head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
        margin-bottom: 4px;
      }
      .timeline-event-title {
        font-size: 12px;
        font-weight: 700;
      }
      .timeline-event-copy {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.45;
      }
      .split-grid {
        display: grid;
        grid-template-columns: minmax(320px, 0.92fr) minmax(0, 1.08fr);
        gap: 14px;
      }
      .right-panel {
        padding: 0;
        overflow: hidden;
      }
      .subtabs {
        display: flex;
        gap: 8px;
        padding: 14px 14px 0 14px;
        border-bottom: 1px solid rgba(126, 231, 255, 0.08);
        background: linear-gradient(180deg, rgba(12, 23, 40, 0.5), rgba(10, 18, 32, 0));
      }
      .subtab {
        min-height: 34px;
        padding: 0 12px;
        border-radius: 12px 12px 0 0;
        border: 1px solid transparent;
        border-bottom-color: transparent;
        background: transparent;
        color: var(--muted);
        box-shadow: none;
        transform: none;
      }
      .subtab:hover {
        color: var(--text);
        background: rgba(16, 28, 48, 0.52);
        box-shadow: none;
      }
      .subtab.active {
        background: rgba(13, 24, 42, 0.9);
        color: var(--text);
        border-color: rgba(126, 231, 255, 0.1);
      }
      .subpane-wrap {
        padding: 14px;
      }
      .spotlight-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 14px;
        align-items: start;
      }
      .spotlight-title {
        margin-top: 8px;
        font-size: 22px;
        font-weight: 800;
        line-height: 1.2;
        letter-spacing: -0.03em;
      }
      .spotlight-copy {
        color: var(--muted);
        margin-top: 6px;
        line-height: 1.55;
      }
      .spotlight-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-self: center;
      }
      .spotlight-metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-top: 14px;
      }
      .spotlight-stat {
        border-radius: 14px;
        border: 1px solid rgba(126, 231, 255, 0.08);
        background: rgba(3, 7, 13, 0.98);
        padding: 12px;
      }
      .spotlight-stat-label {
        color: var(--muted);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .spotlight-stat-value {
        margin-top: 6px;
        font-size: 15px;
        font-weight: 700;
      }
      .subpane {
        display: none;
        animation: fadePane 160ms ease;
      }
      .subpane.active {
        display: block;
      }
      @keyframes fadePane {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
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
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,0.06);
        background: rgba(255,255,255,0.024);
        margin-bottom: 8px;
        transition: border-color 140ms ease, background 140ms ease, transform 140ms ease, box-shadow 140ms ease;
      }
      .running-row:hover, .thread-row:hover {
        border-color: rgba(124, 157, 255, 0.22);
        background: rgba(255,255,255,0.042);
        transform: translateY(-1px);
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.2);
      }
      .running-row {
        position: relative;
        overflow: hidden;
      }
      .running-row::after {
        content: "";
        position: absolute;
        left: 14px;
        right: 14px;
        bottom: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(126, 231, 255, 0.28), transparent);
      }
      .thread-row.active {
        border-color: rgba(124, 157, 255, 0.34);
        box-shadow: inset 0 0 0 1px rgba(124, 157, 255, 0.16);
      }
      .thread-row.codex-open,
      .running-row.codex-open {
        box-shadow: inset 0 0 0 1px rgba(120, 170, 255, 0.08);
      }
      .thread-row.codex-focused,
      .running-row.codex-focused {
        border-color: rgba(185, 152, 255, 0.24);
        box-shadow:
          inset 0 0 0 1px rgba(185, 152, 255, 0.12),
          0 0 0 1px rgba(185, 152, 255, 0.05);
      }
      .thread-row.selected {
        border-color: rgba(255, 214, 107, 0.3);
        box-shadow: inset 0 0 0 1px rgba(255, 214, 107, 0.14);
      }
      .progress-head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
        margin-top: 10px;
      }
      .progress-label {
        color: var(--muted);
        font-size: 11px;
      }
      .progress-value {
        color: var(--text);
        font-size: 11px;
        font-weight: 700;
      }
      .progress-track {
        margin-top: 6px;
        height: 7px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.05);
        overflow: hidden;
      }
      .progress-bar {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, rgba(126, 231, 255, 0.92), rgba(75, 255, 181, 0.92));
        position: relative;
        overflow: hidden;
      }
      .running-card .progress-bar {
        background: var(--card-band);
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
        transition: width 220ms ease, background 220ms ease;
      }
      .progress-bar::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent);
        animation: progressSweep 1.8s linear infinite;
      }
      @keyframes progressSweep {
        from { transform: translateX(-100%); }
        to { transform: translateX(220%); }
      }
      .progress-note {
        margin-top: 8px;
        color: var(--muted-soft);
        font-size: 11px;
        line-height: 1.4;
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
      .badge-board {
        color: #f2c27b;
        border-color: rgba(242, 194, 123, 0.22);
        background: rgba(116, 78, 22, 0.16);
      }
      .running-card .badge {
        border-color: var(--card-accent-border);
        color: var(--text-strong);
        background: rgba(255, 255, 255, 0.04);
      }
      .running-card .badge-running {
        color: #d6ffee;
        background: rgba(84, 242, 176, 0.08);
      }
      .running-card .badge-recent {
        color: #ffe6b3;
        background: rgba(255, 214, 107, 0.08);
      }
      .badge-codex-open {
        color: var(--blue);
        border-color: rgba(120, 170, 255, 0.24);
        background: rgba(40, 77, 134, 0.16);
      }
      .badge-codex-focused {
        color: #d8c4ff;
        border-color: rgba(185, 152, 255, 0.34);
        background: rgba(80, 54, 138, 0.22);
        box-shadow: inset 0 0 0 1px rgba(185, 152, 255, 0.12);
      }
      .badge-codex-linking {
        color: #aee9ff;
        border-color: rgba(126, 231, 255, 0.3);
        background: rgba(30, 90, 120, 0.18);
      }
      .thread-title {
        margin-top: 6px;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.35;
      }
      .thread-topline {
        display: grid;
        grid-template-columns: auto auto 1fr auto auto auto auto auto;
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
      .mini-action-btn {
        min-height: 24px;
        padding: 0 8px;
        font-size: 11px;
        background: transparent;
        border-color: rgba(126, 231, 255, 0.1);
        color: var(--muted);
      }
      .mini-action-btn:hover,
      .pin-btn:hover {
        color: var(--text);
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
        margin-bottom: 12px;
      }
      .tab {
        min-height: 36px;
        padding: 0 12px;
        border-radius: 12px;
        border: 1px solid rgba(126, 231, 255, 0.1);
        background: rgba(8, 18, 34, 0.84);
      }
      .tab.active {
        border-color: rgba(126, 231, 255, 0.24);
        background: linear-gradient(180deg, rgba(30, 83, 156, 0.28), rgba(12, 28, 52, 0.9));
      }
      .terminal {
        border-radius: 16px;
        border: 1px solid rgba(126, 231, 255, 0.08);
        background: linear-gradient(180deg, #07101d, #040a14);
        min-height: 320px;
        max-height: 420px;
        overflow: auto;
        padding: 12px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
      }
      .terminal-line {
        padding: 8px 0;
        border-bottom: 1px solid rgba(126, 231, 255, 0.06);
      }
      .chat-window {
        display: grid;
        gap: 10px;
        min-height: 320px;
        max-height: 520px;
        overflow: auto;
      }
      .connection-card {
        border-radius: 16px;
        border: 1px solid rgba(126, 231, 255, 0.08);
        background: linear-gradient(180deg, rgba(8, 18, 34, 0.82), rgba(6, 14, 25, 0.74));
        padding: 14px;
      }
      .connection-grid {
        display: grid;
        gap: 10px;
        margin-top: 10px;
      }
      .empty-state {
        min-height: 220px;
        display: grid;
        place-items: center;
        text-align: center;
        color: var(--muted-soft);
        border-radius: 16px;
        border: 1px dashed rgba(126, 231, 255, 0.08);
        background: rgba(7, 14, 26, 0.42);
        padding: 20px;
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
      .running-board-shell {
        display: grid;
        gap: 12px;
      }
      .running-board-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }
      .running-board-title {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .board-icon {
        width: 36px;
        height: 36px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        font-size: 18px;
        background: linear-gradient(180deg, rgba(124,157,255,0.18), rgba(196,163,255,0.1));
        border: 1px solid rgba(255,255,255,0.08);
        color: #fff;
      }
      .running-board-copy {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.45;
      }
      .board-view-shell {
        display: grid;
        gap: 12px;
      }
      .board-stage {
        min-height: 560px;
      }
      .board-stage .running-board-grid {
        min-height: 520px;
      }
      .running-board-grid {
        display: grid;
        grid-template-columns: repeat(15, minmax(0, 1fr));
        grid-auto-flow: dense;
        gap: 12px;
        min-height: 120px;
        padding: 4px;
        border-radius: 22px;
        transition: border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
        position: relative;
      }
      .running-board-grid.drag-over {
        border: 1px dashed rgba(141, 216, 255, 0.28);
        background: rgba(255,255,255,0.02);
        box-shadow: inset 0 0 0 1px rgba(141, 216, 255, 0.08);
      }
      .running-board-grid.drag-end::after {
        content: "";
        position: absolute;
        left: 16px;
        right: 16px;
        bottom: 6px;
        height: 3px;
        border-radius: 999px;
        background: linear-gradient(90deg, rgba(141,216,255,0.05), rgba(141,216,255,0.9), rgba(141,216,255,0.05));
        box-shadow: 0 0 0 1px rgba(141, 216, 255, 0.08), 0 0 18px rgba(141,216,255,0.18);
      }
      .running-card {
        --card-band: linear-gradient(90deg, rgba(124, 157, 255, 0.92), rgba(141, 216, 255, 0.82), rgba(196, 163, 255, 0.78));
        --card-band-glow: rgba(124, 157, 255, 0.16);
        --card-accent-border: rgba(150, 181, 255, 0.18);
        --card-active-glow: rgba(141, 216, 255, 0.08);
        grid-column: span 3;
        min-height: 208px;
        display: grid;
        grid-template-rows: auto auto 1fr auto;
        gap: 10px;
        padding: 14px;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.07);
        background:
          radial-gradient(circle at top right, rgba(124, 157, 255, 0.14), transparent 34%),
          linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.018));
        box-shadow: 0 18px 40px rgba(0,0,0,0.26);
        transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease, background 140ms ease;
        cursor: pointer;
        overflow: hidden;
        position: relative;
      }
      .running-card::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background:
          radial-gradient(circle at top right, var(--card-active-glow), transparent 42%),
          radial-gradient(circle at bottom left, rgba(255,255,255,0.022), transparent 32%);
        opacity: 0.88;
        pointer-events: none;
      }
      .running-card-topbar {
        position: absolute;
        top: 0;
        left: 18px;
        right: 18px;
        height: 4px;
        border-radius: 0 0 999px 999px;
        background: var(--card-band);
        opacity: 0.72;
        box-shadow: 0 0 18px var(--card-band-glow);
        transition: opacity 160ms ease, transform 160ms ease, box-shadow 160ms ease;
        z-index: 1;
        pointer-events: none;
      }
      .running-card.drop-before::before,
      .running-card.drop-after::before {
        content: "";
        position: absolute;
        top: 16px;
        bottom: 16px;
        width: 3px;
        border-radius: 999px;
        background: linear-gradient(180deg, rgba(141,216,255,0.08), rgba(141,216,255,0.95), rgba(141,216,255,0.08));
        box-shadow: 0 0 0 1px rgba(141,216,255,0.08), 0 0 18px rgba(141,216,255,0.2);
        z-index: 2;
      }
      .running-card.drop-before::before {
        left: 8px;
      }
      .running-card.drop-after::before {
        right: 8px;
      }
      .drop-slot {
        position: absolute;
        top: 14px;
        bottom: 14px;
        width: 56px;
        border-radius: 18px;
        border: 1px dashed rgba(141, 216, 255, 0.28);
        background: linear-gradient(180deg, rgba(141,216,255,0.14), rgba(141,216,255,0.05));
        box-shadow: inset 0 0 0 1px rgba(141, 216, 255, 0.06);
        opacity: 0;
        pointer-events: none;
        transition: opacity 120ms ease, transform 120ms ease;
        z-index: 1;
      }
      .drop-slot.left {
        left: -18px;
        transform: translateX(-4px);
      }
      .drop-slot.right {
        right: -18px;
        transform: translateX(4px);
      }
      .running-card.drop-before .drop-slot.left,
      .running-card.drop-after .drop-slot.right {
        opacity: 1;
        transform: translateX(0);
      }
      .running-card-bottom-line {
        position: absolute;
        inset: auto 14px 0 14px;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
        pointer-events: none;
      }
      .running-card:hover {
        transform: translateY(-3px) scale(1.004);
        border-color: var(--card-accent-border);
        background:
          radial-gradient(circle at top right, rgba(124, 157, 255, 0.18), transparent 34%),
          linear-gradient(180deg, rgba(255,255,255,0.065), rgba(255,255,255,0.024));
        box-shadow:
          0 28px 54px rgba(0,0,0,0.38),
          0 0 0 1px rgba(255,255,255,0.02),
          0 0 34px var(--card-active-glow);
      }
      .running-card:hover .running-card-topbar {
        opacity: 1;
        transform: scaleX(1.02);
        box-shadow: 0 0 24px rgba(255,255,255,0.08), 0 0 24px var(--card-band-glow);
      }
      .running-card.dragging {
        opacity: 1;
        transform: scale(0.985);
        border-style: dashed;
        border-color: rgba(141, 216, 255, 0.22);
        background:
          linear-gradient(180deg, rgba(141,216,255,0.06), rgba(141,216,255,0.02)),
          rgba(255,255,255,0.012);
        box-shadow: inset 0 0 0 1px rgba(141, 216, 255, 0.06);
      }
      .running-card.dragging > * {
        opacity: 0;
      }
      .running-card.dragging::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(180deg, rgba(141,216,255,0.04), rgba(141,216,255,0.01));
        z-index: 3;
        opacity: 1;
      }
      .running-card.drag-over {
        border-color: rgba(141, 216, 255, 0.32);
        box-shadow: inset 0 0 0 1px rgba(141, 216, 255, 0.16);
      }
      .running-card.size-m { grid-column: span 5; min-height: 228px; }
      .running-card.size-l { grid-column: span 6; min-height: 248px; }
      .running-card.board-attached {
        background:
          radial-gradient(circle at top right, rgba(242, 194, 123, 0.12), transparent 34%),
          linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.018));
      }
      .running-card.pinned-card {
        border-color: rgba(255, 212, 121, 0.26);
        background:
          radial-gradient(circle at top right, rgba(255, 212, 121, 0.14), transparent 34%),
          linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.018));
      }
      .running-card.running-live {
        --card-band: linear-gradient(90deg, rgba(84, 242, 176, 0.92), rgba(121, 237, 210, 0.82), rgba(141, 216, 255, 0.72));
        --card-band-glow: rgba(84, 242, 176, 0.18);
        --card-accent-border: rgba(95, 219, 175, 0.22);
        --card-active-glow: rgba(84, 242, 176, 0.08);
      }
      .running-card.board-attached {
        --card-band: linear-gradient(90deg, rgba(242, 194, 123, 0.92), rgba(255, 225, 171, 0.84), rgba(222, 186, 133, 0.7));
        --card-band-glow: rgba(242, 194, 123, 0.16);
        --card-accent-border: rgba(242, 194, 123, 0.22);
        --card-active-glow: rgba(242, 194, 123, 0.07);
      }
      .running-card.pinned-card .running-card-topbar {
        box-shadow: 0 0 20px rgba(255, 212, 121, 0.18);
      }
      .running-card.codex-card-focused {
        --card-band: linear-gradient(90deg, rgba(196, 163, 255, 0.92), rgba(222, 202, 255, 0.8), rgba(141, 216, 255, 0.68));
        --card-band-glow: rgba(196, 163, 255, 0.2);
        --card-accent-border: rgba(196, 163, 255, 0.28);
        --card-active-glow: rgba(196, 163, 255, 0.1);
        border-color: rgba(196, 163, 255, 0.3);
        box-shadow:
          inset 0 0 0 1px rgba(196, 163, 255, 0.14),
          0 24px 44px rgba(0,0,0,0.34),
          0 0 36px rgba(196, 163, 255, 0.1);
      }
      .running-card.codex-card-focused .running-card-topbar {
        animation: focusedPulse 2.6s ease-in-out infinite;
      }
      @keyframes focusedPulse {
        0% { opacity: 0.7; transform: scaleX(1); }
        50% { opacity: 1; transform: scaleX(1.04); }
        100% { opacity: 0.7; transform: scaleX(1); }
      }
      .running-card-top,
      .running-card-actions,
      .running-card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .running-card-top {
        align-items: flex-start;
      }
      .running-card-title {
        font-size: 14px;
        font-weight: 800;
        line-height: 1.4;
        color: var(--text-strong);
      }
      .running-card-subtitle,
      .running-card-note {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.5;
      }
      .running-card-body {
        display: grid;
        gap: 10px;
        align-content: start;
      }
      .size-switch {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px;
        border-radius: 999px;
        background: rgba(255,255,255,0.035);
        border: 1px solid rgba(255,255,255,0.08);
      }
      .size-chip {
        min-height: 22px;
        min-width: 22px;
        padding: 0 8px;
        border-radius: 999px;
        border: none;
        background: transparent;
        color: var(--muted);
        font-size: 10px;
        box-shadow: none;
        transform: none;
      }
      .size-chip.active {
        background: rgba(124, 157, 255, 0.2);
        color: var(--text-strong);
      }
      .size-chip:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
      .running-card-badges {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .running-card-control {
        display: grid;
        gap: 8px;
      }
      .control-label {
        color: var(--muted-soft);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        text-align: right;
      }
      .control-label.left {
        text-align: left;
      }
      .running-card-footer {
        padding-top: 10px;
        border-top: 1px solid rgba(255,255,255,0.06);
        align-items: flex-end;
      }
      .running-action-rail {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .tool-btn {
        min-height: 28px;
        padding: 0 10px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.03);
        color: var(--muted);
        font-size: 11px;
        font-weight: 600;
        box-shadow: none;
        transform: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .tool-btn:hover {
        color: var(--text-strong);
        border-color: rgba(124, 157, 255, 0.26);
        background: rgba(124, 157, 255, 0.12);
        box-shadow: none;
      }
      .tool-btn.primary {
        color: #d8e5ff;
        border-color: rgba(124, 157, 255, 0.22);
        background: rgba(124, 157, 255, 0.16);
      }
      .tool-btn.pin {
        color: var(--gold);
        border-color: rgba(255, 212, 121, 0.24);
        background: rgba(255, 212, 121, 0.08);
      }
      .tool-btn.board {
        color: #f2c27b;
        border-color: rgba(242, 194, 123, 0.22);
        background: rgba(116, 78, 22, 0.12);
      }
      .tool-btn.board.attached {
        color: #ffe7bb;
        border-color: rgba(242, 194, 123, 0.34);
        background: rgba(116, 78, 22, 0.22);
      }
      .tool-id {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.06);
        background: rgba(255,255,255,0.02);
        color: var(--muted-soft);
        font-size: 10px;
        letter-spacing: 0.04em;
      }
      .tool-icon {
        display: inline-grid;
        place-items: center;
        width: 15px;
        height: 15px;
        color: currentColor;
        opacity: 0.92;
        line-height: 0;
      }
      .tool-icon svg {
        width: 15px;
        height: 15px;
        stroke: currentColor;
        fill: none;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .thread-meta {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 6px;
      }
      .meta-pill {
        border: 1px solid rgba(255,255,255,0.08);
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
        .meta-grid, .main-grid, .overview-grid, .overview-digest, .split-grid, .spotlight-metrics, .summary-deck {
          grid-template-columns: 1fr;
        }
        .toolbar {
          grid-template-columns: 1fr;
        }
        .topbar-head, .spotlight-grid {
          grid-template-columns: 1fr;
        }
        .topbar-nav {
          align-items: flex-start;
        }
        .running-board-grid {
          grid-template-columns: repeat(6, minmax(0, 1fr));
        }
        .running-card,
        .running-card.size-m,
        .running-card.size-l {
          grid-column: span 3;
        }
      }
      @media (max-width: 680px) {
        body { padding: 10px; }
        .running-board-grid {
          grid-template-columns: 1fr;
        }
        .running-card,
        .running-card.size-m,
        .running-card.size-l {
          grid-column: span 1;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <section class="panel">
        <div class="topbar">
          <div class="topbar-head">
            <div class="brand-cluster">
              <div class="brand-line">
                <div class="hero-kicker">Agent Control Surface</div>
                <div class="title">Codex-Managed-Agent</div>
                <span class="hero-pill mono" id="serviceMeta">Service: -</span>
                <span class="hero-pill mono" id="surfaceLabel">Position: -</span>
              </div>
              <div class="sub" id="heroSummary">Code thread workspace inside VS Code.</div>
              <div class="hero-stage">
                <span class="mascot-chip"><span class="mascot-face">◕</span><strong>Night Ops</strong> calmer layout and softer chrome</span>
                <span class="mascot-chip"><span class="mascot-face">▣</span><strong>Board View</strong> attach important agents to a card wall</span>
              </div>
            </div>
            <div class="actions">
              <button id="reload" type="button">Reload</button>
              <button id="startServer" type="button">Start 8787</button>
              <button id="restartServer" class="service-restart" type="button" hidden>Restart 8787</button>
              <button id="external" type="button">Open Browser</button>
            </div>
          </div>
          <div class="topbar-nav">
            <div class="topbar-nav-left">
              <div class="workspace-tabs">
                <button class="workspace-tab" data-view="overview" type="button">Overview</button>
                <button class="workspace-tab" data-view="threads" type="button">Threads</button>
                <button class="workspace-tab" data-view="board" type="button">Board</button>
                <button class="workspace-tab" data-view="live" type="button">Live</button>
                <button class="workspace-tab" data-view="inspector" type="button">Inspector</button>
              </div>
              <button class="chip" id="soundToggle" type="button">Alert Sound</button>
            </div>
            <div class="topbar-nav-right">
              <div class="switcher">
                <button class="switch-btn" id="posLeft" type="button">Left</button>
                <button class="switch-btn" id="posBottom" type="button">Bottom</button>
                <button class="switch-btn" id="posEditor" type="button">Editor</button>
                <button class="switch-btn" id="posFullscreen" type="button">Fullscreen</button>
              </div>
            </div>
          </div>
        </div>
        <div id="serviceBanner" class="service-banner"></div>
      </section>
      <section id="completionRail" class="completion-rail"></section>

      <section class="workspace-pane" data-workspace-pane="overview">
        <section class="overview-digest">
          <div class="panel">
            <div class="section-title">Overview Snapshot</div>
            <div class="section-note">A denser workspace summary inspired by command palettes and inspector-first tools.</div>
            <div class="summary-deck" id="overviewDigest"></div>
          </div>
          <div class="panel">
            <div class="section-title">Focus Queue</div>
            <div class="section-note">Pinned and running agents stay visible here for quick context switching.</div>
            <div class="digest-rail" id="overviewRail"></div>
          </div>
        </section>
        <section class="meta-grid" id="metrics"></section>
        <section class="overview-grid">
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
            <div class="panel right-panel" id="rightPanel">
              <div class="subtabs" id="detailTabs">
                <button class="subtab" data-subtab="console" type="button">Console</button>
                <button class="subtab" data-subtab="history" type="button">History</button>
                <button class="subtab" data-subtab="connection" type="button">Connection</button>
              </div>
              <div class="subpane-wrap">
                <section class="subpane" data-pane="console">
                  <div class="section-title">Live Console</div>
                  <div class="section-note">Switch between running threads without leaving the inspector lane.</div>
                  <div class="tabs" id="runningTabs"></div>
                  <div class="terminal" id="terminal"></div>
                </section>
                <section class="subpane" data-pane="history">
                  <div class="section-title">Conversation History</div>
                  <div class="section-note" id="historySummary">Select a thread to inspect its chat history.</div>
                  <div id="chatWindow" class="chat-window"></div>
                </section>
                <section class="subpane" data-pane="connection">
                  <div class="section-title">Connection Details</div>
                  <div class="section-note">Local service, refresh state, and degraded-mode status.</div>
                  <div class="connection-card">
                    <div class="sub mono" id="baseUrl">Base URL: -</div>
                    <div class="connection-grid">
                      <div class="footer-note" id="statusLine">Waiting for data...</div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>
      </section>

      <section class="workspace-pane" data-workspace-pane="threads">
        <section class="single-grid">
          <div class="panel">
            <div class="running-board-shell">
              <div class="running-board-toolbar">
                <div class="running-board-title">
                  <div class="board-icon">◌</div>
                  <div>
                    <div class="section-title">Running Agent Board</div>
                    <div class="running-board-copy" id="runningBoardMeta">Resizable live cards with dense auto-flow layout.</div>
                  </div>
                </div>
                <div class="chip-row">
                  <button class="chip" data-open-board-view="true" type="button">Open Board</button>
                  <button class="chip" id="toggleLayoutLock" type="button">Lock Layout</button>
                  <button class="chip" id="resetRunningLayout" type="button">Reset Layout</button>
                </div>
              </div>
              <div id="runningBoardMirror" class="running-board-grid"></div>
            </div>
          </div>
          <div class="panel">
            <div class="section-title">Thread Explorer</div>
            <div class="section-note">Search, filter, pin, sort, and batch-manage the full workspace.</div>
            <div class="toolbar">
              <input id="threadSearchMirror" class="search" type="search" placeholder="Search title, id, cwd" />
              <div class="chip-row">
                <button class="chip" data-filter-mirror="all" type="button">All</button>
                <button class="chip" data-filter-mirror="running" type="button">Running</button>
                <button class="chip" data-filter-mirror="recent" type="button">Recent</button>
                <button class="chip" data-filter-mirror="idle" type="button">Idle</button>
                <button class="chip" data-filter-mirror="archived" type="button">Archived</button>
                <button class="chip" data-filter-mirror="soft_deleted" type="button">Deleted</button>
                <button class="chip" data-toggle-mirror="pinned" type="button">Pinned</button>
              </div>
            </div>
            <div class="section-note" id="threadSummaryMirror">Showing running and recent threads first.</div>
            <div id="batchBarMirror" class="batch-bar"></div>
            <div id="threadListMirror" class="thread-list-compact"></div>
          </div>
        </section>
      </section>

      <section class="workspace-pane" data-workspace-pane="board">
        <section class="single-grid">
          <div class="panel board-stage">
            <div class="board-view-shell">
              <div class="running-board-toolbar">
                <div class="running-board-title">
                  <div class="board-icon">✦</div>
                  <div>
                    <div class="section-title">Running Agent Board</div>
                    <div class="running-board-copy" id="runningBoardMetaPrimary">Pinned and attached agents stay here even when they stop running.</div>
                  </div>
                </div>
                <div class="chip-row">
                  <button class="chip" data-view="threads" type="button">Back to Threads</button>
                  <button class="chip" id="toggleLayoutLockPrimary" type="button">Lock Layout</button>
                  <button class="chip" id="resetRunningLayoutPrimary" type="button">Reset Layout</button>
                </div>
              </div>
              <div id="runningBoardPrimary" class="running-board-grid"></div>
            </div>
          </div>
        </section>
      </section>

      <section class="workspace-pane" data-workspace-pane="live">
        <section class="single-grid">
          <div class="panel">
            <div class="section-title">Live Agent Watch</div>
            <div class="section-note" id="runningSummaryMirror">Recent live agents and process status.</div>
            <div id="runningListMirror"></div>
          </div>
          <div class="panel">
            <div class="section-title">Live Timeline</div>
            <div class="section-note">Timeline of current log activity plus just-finished agents.</div>
            <div id="liveTimeline" class="timeline-stack"></div>
          </div>
        </section>
      </section>

      <section class="workspace-pane" data-workspace-pane="inspector">
        <section class="single-grid">
          <div class="panel">
            <div class="section-title">Selected Agent Spotlight</div>
            <div class="section-note">Keep the current thread in focus while the drawer handles deep inspection and lifecycle actions.</div>
            <div id="spotlightPanel"></div>
          </div>
        </section>
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
        lastAutoScrolledFocusedThreadId: undefined,
        draggedRunningThreadId: undefined,
        runningDropIndicator: undefined,
        seenCompletionIds: persisted.seenCompletionIds || {},
        ui: {
          currentView: persisted.currentView || "overview",
          search: persisted.search || "",
          filter: persisted.filter || "all",
          sort: persisted.sort || "updated",
          pinnedOnly: Boolean(persisted.pinnedOnly),
          soundEnabled: persisted.soundEnabled !== false,
          pinned: persisted.pinned || {},
          boardAttached: persisted.boardAttached || {},
          runningCardSizes: persisted.runningCardSizes || {},
          runningCardOrder: Array.isArray(persisted.runningCardOrder) ? persisted.runningCardOrder : [],
          layoutLocked: Boolean(persisted.layoutLocked),
          selected: persisted.selected || {},
          pendingBatch: undefined,
          pendingDrawerAction: undefined,
          pendingCodexLink: {},
          commandFeedback: {},
          rightPaneTab: persisted.rightPaneTab || "console",
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
          seenCompletionIds: state.seenCompletionIds,
          currentView: state.ui.currentView,
          search: state.ui.search,
          filter: state.ui.filter,
          sort: state.ui.sort,
          pinnedOnly: state.ui.pinnedOnly,
          soundEnabled: state.ui.soundEnabled,
          pinned: state.ui.pinned,
          boardAttached: state.ui.boardAttached,
          runningCardSizes: state.ui.runningCardSizes,
          runningCardOrder: state.ui.runningCardOrder,
          layoutLocked: state.ui.layoutLocked,
          selected: state.ui.selected,
          drawerOpen: state.ui.drawerOpen,
          rightPaneTab: state.ui.rightPaneTab,
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

      function renderToolIcon(name, filled = false) {
        const icons = {
          rename: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 11.5V13h1.5L11.8 5.7 10.3 4.2 3 11.5Z"></path><path d="M9.8 4.7 11.3 3.2 12.8 4.7 11.3 6.2"></path></svg>',
          open: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4h6v6"></path><path d="M5 11 12 4"></path><path d="M12 9.5V12H4V4h2.5"></path></svg>',
          codex: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5 12.5 5v6L8 13.5 3.5 11V5L8 2.5Z"></path><path d="M5.5 6.2 8 7.7l2.5-1.5"></path><path d="M8 7.8V11"></path></svg>',
          board: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="3" width="11" height="10" rx="2"></rect><path d="M7.5 3v10"></path><path d="M2.5 7.8h11"></path></svg>',
          pin: filled
            ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2 10.2 6l3.6.6-2.5 2.5.5 3.7L8 11l-3.8 1.8.5-3.7L2.2 6.6 5.8 6 8 2.2Z" style="fill:currentColor;stroke:none"></path></svg>'
            : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2 10.2 6l3.6.6-2.5 2.5.5 3.7L8 11l-3.8 1.8.5-3.7L2.2 6.6 5.8 6 8 2.2Z"></path></svg>',
        };
        return '<span class="tool-icon">' + (icons[name] || '') + '</span>';
      }

      function short(value, len = 120) {
        if (!value) return "";
        return value.length > len ? value.slice(0, len) + "..." : value;
      }

      function formatTimestamp(value) {
        if (!value) return "none";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      }

      function statusBadge(status) {
        return '<span class="badge badge-' + esc(status) + '">' + esc(status) + '</span>';
      }

      function prunePendingCodexLinks() {
        const now = Date.now();
        Object.keys(state.ui.pendingCodexLink).forEach((threadId) => {
          const entry = state.ui.pendingCodexLink[threadId];
          if (!entry || entry.expiresAt <= now) {
            delete state.ui.pendingCodexLink[threadId];
          }
        });
      }

      function setSelectedThread(threadId, options = {}) {
        if (!threadId) return;
        state.selectedThreadId = threadId;
        if (options.openDrawer) {
          state.ui.drawerOpen = true;
        }
        if (options.view) {
          state.ui.currentView = options.view;
        }
        persistUi();
      }

      function markCodexLinking(threadId, mode = "sidebar") {
        if (!threadId) return;
        state.ui.pendingCodexLink[threadId] = {
          mode,
          expiresAt: Date.now() + 12000,
        };
        setSelectedThread(threadId);
      }

      function threadGroupKey(thread) {
        if (!thread) return "recent";
        const status = normalize(thread.status);
        const archived = Boolean(thread.archived) || status === "archived";
        if (thread.soft_deleted) return "soft_deleted";
        if (archived) return "archived";
        if (status === "running") return "running";
        if (status === "recent") return "recent";
        return "idle";
      }

      function scrollFocusedCodexThreadIntoView(payload) {
        const focusedThreadId = payload && payload.codexLinkState && payload.codexLinkState.focusedThreadId;
        if (!focusedThreadId) {
          state.lastAutoScrolledFocusedThreadId = undefined;
          return;
        }
        if (state.lastAutoScrolledFocusedThreadId === focusedThreadId) {
          return;
        }
        state.lastAutoScrolledFocusedThreadId = focusedThreadId;
        window.requestAnimationFrame(() => {
          const targets = Array.from(document.querySelectorAll("[data-thread-id]"))
            .filter((node) => node.dataset.threadId === focusedThreadId);
          targets.forEach((node) => {
            const pane = node.closest(".workspace-pane");
            const visible = !pane || pane.classList.contains("active");
            if (visible || targets.length === 1) {
              node.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
            }
          });
        });
      }

      function syncFocusedCodexGroup(payload) {
        const focusedThreadId = payload && payload.codexLinkState && payload.codexLinkState.focusedThreadId;
        if (!focusedThreadId) return;
        const focusedThread = ((payload && payload.dashboard && payload.dashboard.threads) || []).find((thread) => thread.id === focusedThreadId);
        if (!focusedThread) return;
        const groupKey = threadGroupKey(focusedThread);
        if (!state.ui.groups[groupKey]) {
          state.ui.groups[groupKey] = true;
          persistUi();
        }
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

      function setRightPaneTab(tab) {
        state.ui.rightPaneTab = tab;
        persistUi();
        render(state.payload);
      }

      function setWorkspaceView(view) {
        state.ui.currentView = view;
        persistUi();
        render(state.payload);
      }

      function toggleSound() {
        state.ui.soundEnabled = !state.ui.soundEnabled;
        persistUi();
        render(state.payload);
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

      function isBoardAttached(threadId) {
        return Boolean(state.ui.boardAttached[threadId]);
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

      function toggleBoardAttach(threadId) {
        if (!threadId) return;
        if (state.ui.boardAttached[threadId]) {
          delete state.ui.boardAttached[threadId];
        } else {
          state.ui.boardAttached[threadId] = true;
        }
        persistUi();
        render(state.payload);
      }

      function getBoardThreads(dashboard) {
        const threadMap = new Map(((dashboard && dashboard.threads) || []).map((thread) => [thread.id, thread]));
        const boardMap = new Map();
        ((dashboard && dashboard.runningThreads) || []).forEach((thread) => {
          boardMap.set(thread.id, Object.assign({}, threadMap.get(thread.id) || {}, thread, { board_source: "running" }));
        });
        Object.keys(state.ui.boardAttached).forEach((threadId) => {
          if (!state.ui.boardAttached[threadId]) return;
          const thread = threadMap.get(threadId);
          if (!thread) return;
          const existing = boardMap.get(threadId);
          boardMap.set(threadId, Object.assign({}, thread, existing || {}, {
            board_source: existing ? "running" : "attached",
          }));
        });
        return Array.from(boardMap.values());
      }

      function getRunningCardSize(threadId) {
        const size = state.ui.runningCardSizes[threadId];
        return size === "m" || size === "l" ? size : "s";
      }

      function setRunningCardSize(threadId, size) {
        if (state.ui.layoutLocked) return;
        if (!threadId) return;
        const nextSize = size === "m" || size === "l" ? size : "s";
        state.ui.runningCardSizes[threadId] = nextSize;
        persistUi();
        render(state.payload);
      }

      function pruneRunningCardState(boardThreads) {
        const activeIds = new Set((boardThreads || []).map((thread) => thread.id));
        state.ui.runningCardOrder = state.ui.runningCardOrder.filter((threadId) => activeIds.has(threadId));
        Object.keys(state.ui.runningCardSizes).forEach((threadId) => {
          if (!activeIds.has(threadId)) {
            delete state.ui.runningCardSizes[threadId];
          }
        });
        Object.keys(state.ui.boardAttached).forEach((threadId) => {
          if (!activeIds.has(threadId) && !(((state.payload && state.payload.dashboard && state.payload.dashboard.threads) || []).some((thread) => thread.id === threadId))) {
            delete state.ui.boardAttached[threadId];
          }
        });
      }

      function orderRunningThreads(runningThreads) {
        const orderMap = new Map(state.ui.runningCardOrder.map((threadId, index) => [threadId, index]));
        return [...(runningThreads || [])].sort((a, b) => {
          const aOrder = orderMap.has(a.id) ? orderMap.get(a.id) : Number.POSITIVE_INFINITY;
          const bOrder = orderMap.has(b.id) ? orderMap.get(b.id) : Number.POSITIVE_INFINITY;
          if (aOrder !== bOrder) return aOrder - bOrder;
          const aPinned = isPinned(a.id) ? 1 : 0;
          const bPinned = isPinned(b.id) ? 1 : 0;
          if (aPinned !== bPinned) return bPinned - aPinned;
          return Number(b.updated_at || 0) - Number(a.updated_at || 0);
        });
      }

      function moveRunningCard(threadId, anchorThreadId, position = "before") {
        if (state.ui.layoutLocked) return;
        if (!threadId || threadId === anchorThreadId) return;
        const ordered = orderRunningThreads(getBoardThreads(state.payload && state.payload.dashboard)).map((thread) => thread.id);
        const withoutDragged = ordered.filter((id) => id !== threadId);
        const insertIndex = anchorThreadId ? withoutDragged.indexOf(anchorThreadId) : -1;
        if (insertIndex >= 0) {
          withoutDragged.splice(position === "after" ? insertIndex + 1 : insertIndex, 0, threadId);
        } else {
          withoutDragged.push(threadId);
        }
        state.ui.runningCardOrder = withoutDragged;
        persistUi();
        render(state.payload);
      }

      function setRunningDropIndicator(threadId, position) {
        state.runningDropIndicator = threadId && position ? { threadId, position } : undefined;
      }

      function clearRunningDropIndicator() {
        state.runningDropIndicator = undefined;
      }

      function syncRunningDropIndicatorDom() {
        document.querySelectorAll("[data-running-card]").forEach((card) => {
          const isTarget = state.runningDropIndicator && state.runningDropIndicator.threadId === card.dataset.runningCard;
          card.classList.toggle("drop-before", Boolean(isTarget && state.runningDropIndicator.position === "before"));
          card.classList.toggle("drop-after", Boolean(isTarget && state.runningDropIndicator.position === "after"));
        });
      }

      function toggleLayoutLock() {
        state.ui.layoutLocked = !state.ui.layoutLocked;
        persistUi();
        render(state.payload);
      }

      function resetRunningLayout() {
        state.ui.runningCardOrder = [];
        state.ui.runningCardSizes = {};
        state.ui.layoutLocked = false;
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

      function extractThreadProgress(thread) {
        const messages = (thread.preview_logs || []).map((item) => item.message || item.target || "").filter(Boolean);
        for (const message of messages) {
          const pctMatch = message.match(/(?:^|\\b)(100|[1-9]?\\d)\\s?%/);
          if (pctMatch) {
            const percent = Math.max(0, Math.min(100, Number(pctMatch[1])));
            return {
              percent,
              label: percent >= 100 ? "Completed" : "Estimated progress",
              note: short(message, 120),
            };
          }
          const ratioMatch = message.match(/(\\d{1,4})\\s*\\/\\s*(\\d{1,4})/);
          if (ratioMatch) {
            const current = Number(ratioMatch[1]);
            const total = Number(ratioMatch[2]);
            if (Number.isFinite(current) && Number.isFinite(total) && total > 0) {
              const percent = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
              return {
                percent,
                label: "Estimated progress",
                note: short(message, 120),
              };
            }
          }
        }
        return {
          percent: undefined,
          label: "Live status",
          note: messages[0] ? short(messages[0], 120) : "No explicit progress marker found in recent logs yet.",
        };
      }

      function boardBadge(thread) {
        if ((thread.board_source || "") === "attached" && normalize(thread.status) !== "running") {
          return '<span class="badge badge-board">Attached</span>';
        }
        return "";
      }

      function codexLinkMeta(threadId, payload = state.payload) {
        prunePendingCodexLinks();
        const linkState = (payload && payload.codexLinkState) || {};
        const openThreadIds = Array.isArray(linkState.openThreadIds) ? linkState.openThreadIds : [];
        const isFocused = Boolean(threadId) && linkState.focusedThreadId === threadId;
        const isOpen = Boolean(threadId) && openThreadIds.includes(threadId);
        if (isOpen || isFocused) {
          delete state.ui.pendingCodexLink[threadId];
        }
        const pending = Boolean(threadId) ? state.ui.pendingCodexLink[threadId] : undefined;
        return { isOpen, isFocused, pending };
      }

      function codexLinkBadge(threadId, payload = state.payload) {
        const link = codexLinkMeta(threadId, payload);
        if (link.isFocused) {
          return '<span class="badge badge-codex-focused">Codex Focused</span>';
        }
        if (link.isOpen) {
          return '<span class="badge badge-codex-open">Codex Open</span>';
        }
        if (link.pending) {
          return '<span class="badge badge-codex-linking">Linking...</span>';
        }
        return "";
      }

      function playCompletionTone() {
        if (!state.ui.soundEnabled) return;
        try {
          const Context = window.AudioContext || window.webkitAudioContext;
          if (!Context) return;
          const audio = new Context();
          const oscillator = audio.createOscillator();
          const gain = audio.createGain();
          oscillator.type = "triangle";
          oscillator.frequency.setValueAtTime(784, audio.currentTime);
          oscillator.frequency.linearRampToValueAtTime(988, audio.currentTime + 0.12);
          gain.gain.setValueAtTime(0.0001, audio.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.06, audio.currentTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.22);
          oscillator.connect(gain);
          gain.connect(audio.destination);
          oscillator.start();
          oscillator.stop(audio.currentTime + 0.24);
        } catch (error) {
        }
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
        const linkMeta = codexLinkMeta(thread.id);
        const linkBadge = codexLinkBadge(thread.id);
        const codexClass = linkMeta.isFocused ? " codex-focused" : (linkMeta.isOpen ? " codex-open" : "");
        return '<div class="thread-row' + active + selectedClass + codexClass + '" data-thread-id="' + esc(thread.id) + '">' +
          '<div class="thread-topline">' +
            '<button class="select-btn' + (isSelected(thread.id) ? ' selected' : '') + '" data-select-thread="' + esc(thread.id) + '" type="button">' + (isSelected(thread.id) ? '✓' : '') + '</button>' +
            statusBadge(thread.status) +
            '<span class="mono muted">' + esc(thread.updated_at_iso || "") + '</span>' +
            '<button class="mini-action-btn" data-rename-thread="' + esc(thread.id) + '" data-current-title="' + esc(thread.title || "") + '" type="button">Rename</button>' +
            '<button class="mini-action-btn" data-board-attach="' + esc(thread.id) + '" type="button">' + (isBoardAttached(thread.id) ? 'Attached' : 'Board') + '</button>' +
            '<button class="mini-action-btn" data-codex-thread="' + esc(thread.id) + '" type="button">Codex</button>' +
            linkBadge +
            '<button class="pin-btn' + pinnedClass + '" data-pin-thread="' + esc(thread.id) + '" type="button">' + (isPinned(thread.id) ? "Pinned" : "Pin") + '</button>' +
          '</div>' +
          '<div class="thread-title">' + esc(short(thread.title || "(no title)", 110)) + '</div>' +
          '<div class="thread-meta">' +
            '<span class="meta-pill mono">' + esc(short(thread.cwd || "-", 42)) + '</span>' +
            '<span class="meta-pill">' + esc(thread.soft_deleted ? "soft-deleted" : (thread.archived ? "archived" : (thread.status || "idle"))) + '</span>' +
          '</div>' +
        '</div>';
      }

      function renderSpotlight(thread, detail) {
        if (!thread && !(detail && detail.thread)) {
          return '<div class="empty-state">Select a thread to show the inspector spotlight.</div>';
        }
        const merged = Object.assign({}, thread || {}, (detail && detail.thread) || {});
        const progress = extractThreadProgress(merged);
        const linkMeta = codexLinkMeta(merged.id);
        const linkLabel = linkMeta.isFocused ? "Focused in Codex" : (linkMeta.isOpen ? "Open in Codex" : (linkMeta.pending ? "Linking to Codex" : "Not linked"));
        return '<div class="spotlight-grid">' +
          '<div>' +
            statusBadge(merged.status || "idle") +
            codexLinkBadge(merged.id) +
            '<div class="spotlight-title">' + esc(short(merged.title || merged.id || "Selected agent", 120)) + '</div>' +
            '<div class="spotlight-copy">' + esc(short(merged.cwd || "No workspace path available.", 140)) + '</div>' +
          '</div>' +
          '<div class="spotlight-actions">' +
            '<button class="chip" data-open-drawer="true" type="button">Open Drawer</button>' +
            '<button class="chip" data-rename-thread="' + esc(merged.id || "") + '" data-current-title="' + esc(merged.title || "") + '" type="button">Rename</button>' +
            '<button class="chip" data-open-codex-editor="' + esc(merged.id || "") + '" type="button">Open Codex</button>' +
            '<button class="chip" data-codex-thread="' + esc(merged.id || "") + '" type="button">Sidebar Codex</button>' +
            '<button class="chip" data-subtab-shortcut="history" type="button">History</button>' +
            '<button class="chip" data-subtab-shortcut="console" type="button">Console</button>' +
          '</div>' +
        '</div>' +
        '<div class="spotlight-metrics">' +
          '<div class="spotlight-stat"><div class="spotlight-stat-label">Updated</div><div class="spotlight-stat-value">' + esc(merged.updated_at_iso || merged.updated_age || "-") + '</div></div>' +
          '<div class="spotlight-stat"><div class="spotlight-stat-label">Progress</div><div class="spotlight-stat-value">' + esc(progress.percent !== undefined ? (String(progress.percent) + "%") : progress.label) + '</div></div>' +
          '<div class="spotlight-stat"><div class="spotlight-stat-label">Codex Link</div><div class="spotlight-stat-value">' + esc(linkLabel) + '</div></div>' +
          '<div class="spotlight-stat"><div class="spotlight-stat-label">Process</div><div class="spotlight-stat-value">' + esc((merged.process && merged.process.summary) || "No live process") + '</div></div>' +
        '</div>' +
        '<div class="progress-head"><span class="progress-label">' + esc(progress.label) + '</span><span class="progress-value">' + esc(progress.percent !== undefined ? (String(progress.percent) + "%") : (merged.status || "live")) + '</span></div>' +
        '<div class="progress-track"><div class="progress-bar" style="width:' + esc(String(progress.percent !== undefined ? progress.percent : 18)) + '%"></div></div>' +
        '<div class="progress-note">' + esc(progress.note) + '</div>';
      }

      function renderTimelineEvent(title, ts, copy, tone = "live") {
        return '<div class="timeline-event">' +
          '<div class="timeline-dot' + (tone === "complete" ? ' complete' : '') + '"></div>' +
          '<div class="timeline-event-body">' +
            '<div class="timeline-event-head"><span class="timeline-event-title">' + esc(title) + '</span><span class="completion-meta">' + esc(ts || "") + '</span></div>' +
            '<div class="timeline-event-copy">' + esc(copy || "") + '</div>' +
          '</div>' +
        '</div>';
      }

      function renderLiveTimeline(runningThreads, recentCompletions) {
        const cards = [];
        (runningThreads || []).forEach((thread) => {
          const logs = (thread.preview_logs || []).slice(0, 4);
          cards.push(
            '<div class="timeline-card">' +
              '<div class="timeline-header"><div class="timeline-title">' + esc(short(thread.title || thread.id || "Running thread", 56)) + '</div>' + statusBadge(thread.status || "running") + '</div>' +
              '<div class="timeline-events">' +
                (logs.length
                  ? logs.map((log) => renderTimelineEvent(log.level || "Log", log.ts_iso || "", short(log.message || log.target || "log event", 140))).join("")
                  : renderTimelineEvent("Waiting for logs", "", "The agent is running but no preview log is available yet.")) +
              '</div>' +
            '</div>'
          );
        });
        if (recentCompletions && recentCompletions.length) {
          cards.push(
            '<div class="timeline-card">' +
              '<div class="timeline-header"><div class="timeline-title">Completion Feed</div><span class="badge badge-running">Done</span></div>' +
              '<div class="timeline-events">' +
                recentCompletions.slice(0, 6).map((item) => renderTimelineEvent(short(item.title || item.threadId || "Completed thread", 64), item.updatedAt || "", "Agent finished and is ready for inspection.", "complete")).join("") +
              '</div>' +
            '</div>'
          );
        }
        return cards.join("") || '<div class="empty-state">No live timeline yet. Start a running agent to see event flow here.</div>';
      }

      function renderRunningBoard(boardThreads) {
        const ordered = orderRunningThreads(boardThreads);
        return ordered.map((thread) => {
          const progress = extractThreadProgress(thread);
          const linkMeta = codexLinkMeta(thread.id);
          const linkBadge = codexLinkBadge(thread.id);
          const size = getRunningCardSize(thread.id);
          const codexClass = linkMeta.isFocused ? " codex-card-focused" : "";
          const pinnedClass = isPinned(thread.id) ? " pinned-card" : "";
          const runningClass = normalize(thread.status) === "running" ? " running-live" : "";
          const attachedClass = thread.board_source === "attached" && !runningClass ? " board-attached" : "";
          const dropClass = state.runningDropIndicator && state.runningDropIndicator.threadId === thread.id
            ? (state.runningDropIndicator.position === "after" ? " drop-after" : " drop-before")
            : "";
          const subtitle = thread.board_source === "attached" && normalize(thread.status) !== "running"
            ? short((thread.updated_at_iso || "Attached to board") + " · " + (thread.cwd || "-"), size === "l" ? 96 : 72)
            : short(thread.cwd || "-", size === "l" ? 82 : 56);
          const preview = thread.board_source === "attached" && normalize(thread.status) !== "running"
            ? short((thread.preview || thread.db_title || "Attached thread ready for quick access from the board."), size === "l" ? 140 : 96)
            : short((thread.process && thread.process.summary) || "No live process detected", size === "l" ? 140 : 96);
          return '<article class="running-card size-' + esc(size) + runningClass + codexClass + pinnedClass + attachedClass + dropClass + '" data-running-card="' + esc(thread.id) + '" draggable="' + esc(state.ui.layoutLocked ? "false" : "true") + '">' +
            '<div class="running-card-topbar"></div>' +
            '<div class="running-card-bottom-line"></div>' +
            '<div class="drop-slot left"></div>' +
            '<div class="drop-slot right"></div>' +
            '<div class="running-card-top">' +
              '<div class="running-card-control">' +
                '<div class="control-label left">Status</div>' +
                '<div class="running-card-badges">' +
                  statusBadge(thread.status || "running") +
                  boardBadge(thread) +
                  linkBadge +
                '</div>' +
              '</div>' +
              '<div class="running-card-control">' +
                '<div class="control-label">Card Size</div>' +
                '<div class="size-switch">' +
                  '<button class="size-chip' + (size === "s" ? ' active' : '') + '" data-card-size="' + esc(thread.id) + '" data-card-size-value="s" type="button"' + (state.ui.layoutLocked ? ' disabled' : '') + '>S</button>' +
                  '<button class="size-chip' + (size === "m" ? ' active' : '') + '" data-card-size="' + esc(thread.id) + '" data-card-size-value="m" type="button"' + (state.ui.layoutLocked ? ' disabled' : '') + '>M</button>' +
                  '<button class="size-chip' + (size === "l" ? ' active' : '') + '" data-card-size="' + esc(thread.id) + '" data-card-size-value="l" type="button"' + (state.ui.layoutLocked ? ' disabled' : '') + '>L</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="running-card-body">' +
              '<div class="running-card-title">' + esc(short(thread.title || thread.id || "Running agent", size === "l" ? 96 : 64)) + '</div>' +
              '<div class="running-card-subtitle">' + esc(subtitle) + '</div>' +
              '<div class="preview">' + esc(preview) + '</div>' +
              '<div class="progress-head"><span class="progress-label">' + esc(progress.label) + '</span><span class="progress-value">' + esc(progress.percent !== undefined ? (String(progress.percent) + "%") : (thread.status || "live")) + '</span></div>' +
              '<div class="progress-track"><div class="progress-bar" style="width:' + esc(String(progress.percent !== undefined ? progress.percent : 18)) + '%"></div></div>' +
              '<div class="running-card-note">' + esc(progress.note) + '</div>' +
            '</div>' +
            '<div class="running-card-footer">' +
              '<div class="running-card-control">' +
                '<div class="control-label left">Actions</div>' +
                '<div class="running-action-rail">' +
                  '<button class="tool-btn" data-rename-thread="' + esc(thread.id) + '" data-current-title="' + esc(thread.title || "") + '" type="button">' + renderToolIcon('rename') + '<span>Rename</span></button>' +
                  '<button class="tool-btn primary" data-open-codex-editor="' + esc(thread.id) + '" type="button">' + renderToolIcon('open') + '<span>Open</span></button>' +
                  '<button class="tool-btn" data-codex-thread="' + esc(thread.id) + '" type="button">' + renderToolIcon('codex') + '<span>Codex</span></button>' +
                  '<button class="tool-btn board' + (isBoardAttached(thread.id) ? ' attached' : '') + '" data-board-attach="' + esc(thread.id) + '" type="button">' + renderToolIcon('board') + '<span>' + (isBoardAttached(thread.id) ? 'Attached' : 'Board') + '</span></button>' +
                  '<button class="tool-btn pin' + (isPinned(thread.id) ? ' pinned' : '') + '" data-pin-thread="' + esc(thread.id) + '" type="button">' + renderToolIcon('pin', isPinned(thread.id)) + '<span>' + (isPinned(thread.id) ? 'Pinned' : 'Pin') + '</span></button>' +
                '</div>' +
              '</div>' +
              '<div class="running-card-control">' +
                '<div class="control-label">Thread Id</div>' +
                '<span class="tool-id mono">' + esc(short(thread.id, 24)) + '</span>' +
              '</div>' +
            '</div>' +
          '</article>';
        }).join("") || '<div class="empty-state">No cards on the board yet. Attach threads from the explorer below, or wait for a running agent to appear automatically.</div>';
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
        const linkMeta = codexLinkMeta(thread.id, payload);
        const linkLabel = linkMeta.isFocused ? "Focused in Codex" : (linkMeta.isOpen ? "Open in Codex" : (linkMeta.pending ? "Linking to Codex" : "Not linked"));
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
          codexLinkBadge(thread.id, payload),
          '<span class="meta-pill mono">' + esc(thread.id || "") + '</span>',
          (thread.model || summary.model) ? '<span class="meta-pill">' + esc(thread.model || summary.model) + '</span>' : '',
          (thread.reasoning_effort || summary.reasoning_effort) ? '<span class="meta-pill">' + esc(thread.reasoning_effort || summary.reasoning_effort) + '</span>' : ''
        ].join("");
        summaryNode.innerHTML = [
          drawerStat("Updated", summary.updated_age || thread.updated_at_iso || "-"),
          drawerStat("Last Log", summary.log_age || (logs[0] && logs[0].age) || "-"),
          drawerStat("Codex Link", linkLabel),
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
                    renderQuickActionButton("rename", "Rename", "secondary", thread.id || "", thread.title || ""),
                    renderQuickActionButton("open_editor", "Open Codex", "secondary", thread.id || "", ""),
                    renderQuickActionButton("sidebar", "Sidebar Codex", "secondary", thread.id || "", ""),
                    renderActionButton("restore", "Restore", "secondary", "RS", thread.id || ""),
                    renderActionButton("hard_delete", "Hard Delete", "danger", "HD", thread.id || ""),
                    '<span class="action-status">' + esc(actionNotice || '') + '</span>'
                  ]
                : [
                    renderQuickActionButton("rename", "Rename", "secondary", thread.id || "", thread.title || ""),
                    renderQuickActionButton("open_editor", "Open Codex", "secondary", thread.id || "", ""),
                    renderQuickActionButton("sidebar", "Sidebar Codex", "secondary", thread.id || "", ""),
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
        document.querySelectorAll("[data-quick-action]").forEach((node) => {
          node.addEventListener("click", () => {
            const action = node.dataset.quickAction;
            const threadId = node.dataset.quickThread;
            if (action === "rename") {
              vscode.postMessage({ type: "renameThread", threadId, currentTitle: node.dataset.quickTitle || "" });
              return;
            }
            if (action === "open_editor") {
              markCodexLinking(threadId, "editor");
              render(state.payload);
              vscode.postMessage({ type: "openInCodexEditor", threadId });
              return;
            }
            if (action === "sidebar") {
              markCodexLinking(threadId, "sidebar");
              render(state.payload);
              vscode.postMessage({ type: "revealInCodexSidebar", threadId });
            }
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

      function renderQuickActionButton(action, label, tone, threadId, currentTitle) {
        return '<button class="action-btn ' + esc(tone) + '" data-quick-action="' + esc(action) + '" data-quick-thread="' + esc(threadId) + '" data-quick-title="' + esc(currentTitle || "") + '" type="button">' + esc(label) + '</button>';
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
        document.getElementById("serviceMeta").textContent =
          "Service: " + (!service.ok ? "Degraded" : (service.autoStarted ? "Auto-started" : "Connected")) +
          " · Last refresh: " + formatTimestamp(payload.lastSuccessfulRefreshAt);
        const threadCount = (dashboard.threads || []).length;
        const runningCount = (dashboard.runningThreads || []).length;
        const boardThreads = getBoardThreads(dashboard);
        const attachedOnlyCount = boardThreads.filter((thread) => (thread.board_source || "") === "attached" && normalize(thread.status) !== "running").length;
        const serviceBanner = document.getElementById("serviceBanner");
        const restartButton = document.getElementById("restartServer");
        document.getElementById("heroSummary").textContent =
          !service.ok
            ? "Local service unavailable. The panel is in degraded mode until the server recovers."
            : threadCount
              ? (threadCount + " threads loaded" + (runningCount ? " · " + runningCount + " running" : ""))
              : "Connected to the local service, but no threads were returned yet.";
        serviceBanner.className = "service-banner" + (service.ok ? "" : " visible");
        serviceBanner.textContent = service.ok
          ? ""
          : ("Degraded state: " + (service.message || "Server not reachable") + ". Use Restart 8787 to retry loading thread data.");
        restartButton.hidden = service.ok;
        restartButton.disabled = service.ok;

        [
          ["posLeft", "left"],
          ["posBottom", "bottom"],
          ["posEditor", "editor"],
          ["posFullscreen", "fullscreen"]
        ].forEach(([id, surface]) => {
          document.getElementById(id).classList.toggle("active", state.currentSurface === surface);
        });
        document.querySelectorAll("[data-view]").forEach((node) => {
          node.classList.toggle("active", node.dataset.view === state.ui.currentView);
        });
        document.querySelectorAll("[data-workspace-pane]").forEach((node) => {
          node.classList.toggle("active", node.dataset.workspacePane === state.ui.currentView);
        });
        const soundToggle = document.getElementById("soundToggle");
        soundToggle.classList.toggle("active", state.ui.soundEnabled);
        soundToggle.textContent = state.ui.soundEnabled ? "Alert Sound On" : "Alert Sound Off";

        const searchInput = document.getElementById("threadSearch");
        if (searchInput.value !== state.ui.search) searchInput.value = state.ui.search;
        const searchMirror = document.getElementById("threadSearchMirror");
        if (searchMirror.value !== state.ui.search) searchMirror.value = state.ui.search;
        document.querySelectorAll("[data-filter]").forEach((node) => {
          node.classList.toggle("active", node.dataset.filter === state.ui.filter);
        });
        document.querySelectorAll("[data-filter-mirror]").forEach((node) => {
          node.classList.toggle("active", node.dataset.filterMirror === state.ui.filter);
        });
        document.querySelectorAll("[data-sort]").forEach((node) => {
          node.classList.toggle("active", node.dataset.sort === state.ui.sort);
        });
        document.querySelectorAll("[data-toggle='pinned']").forEach((node) => {
          node.classList.toggle("active", state.ui.pinnedOnly);
        });
        document.querySelectorAll("[data-toggle-mirror='pinned']").forEach((node) => {
          node.classList.toggle("active", state.ui.pinnedOnly);
        });

        document.getElementById("statusLine").innerHTML =
          '<span class="' + (service.ok ? 'service-ok' : 'service-bad') + '">' +
          esc(service.ok ? (service.autoStarted ? 'Connected · auto-started' : 'Connected') : 'Disconnected') +
          "</span>" +
          " · " + esc(service.message || "") +
          (service.logPath ? " · log: " + esc(service.logPath) : "");

        const counts = (dashboard.threadsMeta && dashboard.threadsMeta.counts) || {};
        const recentCompletions = Array.isArray(payload.recentCompletions) ? payload.recentCompletions : [];
        const freshCompletions = recentCompletions.filter((item) => item && item.id && !state.seenCompletionIds[item.id]);
        if (freshCompletions.length) {
          freshCompletions.forEach((item) => {
            state.seenCompletionIds[item.id] = true;
          });
          persistUi();
          playCompletionTone();
        }
        const filteredThreads = (dashboard.threads || []).filter(threadMatches);
        const existingIds = new Set((dashboard.threads || []).map((thread) => thread.id));
        Object.keys(state.ui.selected).forEach((id) => {
          if (!existingIds.has(id)) delete state.ui.selected[id];
        });
        pruneRunningCardState(boardThreads);
        syncFocusedCodexGroup(payload);
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
        const pinnedThreads = filteredThreads.filter((thread) => isPinned(thread.id)).slice(0, 3);
        const freshestThread = filteredThreads[0];
        document.getElementById("overviewDigest").innerHTML = [
          '<div class="summary-card"><div class="summary-label">Newest Activity</div><div class="summary-value">' + esc(short((freshestThread && freshestThread.title) || "No visible thread", 48)) + '</div><div class="summary-copy">' + esc((freshestThread && freshestThread.updated_at_iso) || "Waiting for thread activity") + '</div></div>',
          '<div class="summary-card"><div class="summary-label">Board Focus</div><div class="summary-value">' + esc(String(boardThreads.length || 0)) + '</div><div class="summary-copy">' + esc(boardThreads.length ? (attachedOnlyCount ? attachedOnlyCount + " attached · " : "") + runningCount + " live cards on the board." : "Attach important agents to keep them visible.") + '</div></div>',
          '<div class="summary-card"><div class="summary-label">Live Health</div><div class="summary-value">' + esc(runningCount ? (String(runningCount) + " active") : "Quiet") + '</div><div class="summary-copy">' + esc(runningCount ? "Live pane tracks progress, timeline, and completion alerts." : "No active agents right now.") + '</div></div>'
        ].join("");
        document.getElementById("overviewRail").innerHTML = (pinnedThreads.length ? pinnedThreads : (dashboard.runningThreads || []).slice(0, 2)).map((thread) => {
          return '<div class="mini-thread">' +
            statusBadge(thread.status || "idle") +
            '<div class="mini-thread-title">' + esc(short(thread.title || thread.id || "Thread", 56)) + '</div>' +
            '<div class="mini-thread-meta">' + esc(short(thread.cwd || "-", 64)) + '</div>' +
          '</div>';
        }).join("") || '<div class="empty-state">No pinned or running agent to spotlight yet.</div>';
        const completionRail = document.getElementById("completionRail");
        completionRail.className = "completion-rail" + (recentCompletions.length ? " visible" : "");
        completionRail.innerHTML = recentCompletions.map((item) => {
          return '<div class="completion-card">' +
            '<div class="completion-head">' +
              '<span class="badge badge-running">Completed</span>' +
              '<span class="completion-meta">' + esc(item.updatedAt || "") + '</span>' +
            '</div>' +
            '<div class="completion-title">' + esc(short(item.title || item.threadId || "Thread complete", 68)) + '</div>' +
            '<div class="completion-meta">' + esc(item.status || "recent") + ' · click the thread list to inspect details</div>' +
          '</div>';
        }).join("");
        document.getElementById("runningSummary").textContent =
          (dashboard.runningThreads || []).length
            ? ((dashboard.runningThreads || []).length + " active thread" + ((dashboard.runningThreads || []).length > 1 ? "s" : ""))
            : "No live agents currently running.";
        document.getElementById("runningSummaryMirror").textContent = document.getElementById("runningSummary").textContent;
        const boardMetaText = boardThreads.length
          ? ("Auto-flow board · " + boardThreads.length + " card" + (boardThreads.length > 1 ? "s" : "") + " · " + runningCount + " running · " + attachedOnlyCount + " attached · drag to reorder, resize with S/M/L" + (state.ui.layoutLocked ? " · layout locked" : ""))
          : "No cards yet. Attach threads from the explorer, or wait for a running agent to appear automatically.";
        document.getElementById("runningBoardMeta").textContent = boardMetaText;
        document.getElementById("runningBoardMetaPrimary").textContent = boardMetaText;
        const lockButton = document.getElementById("toggleLayoutLock");
        lockButton.classList.toggle("active", state.ui.layoutLocked);
        lockButton.textContent = state.ui.layoutLocked ? "Unlock Layout" : "Lock Layout";
        const lockButtonPrimary = document.getElementById("toggleLayoutLockPrimary");
        lockButtonPrimary.classList.toggle("active", state.ui.layoutLocked);
        lockButtonPrimary.textContent = state.ui.layoutLocked ? "Unlock Layout" : "Lock Layout";
        document.getElementById("threadSummary").textContent =
          visibleCount
            ? ("Showing " + visibleCount + " of " + (dashboard.threads || []).length + " loaded threads · sorted by " + state.ui.sort)
            : "No threads match the current search/filter.";
        document.getElementById("threadSummaryMirror").textContent = document.getElementById("threadSummary").textContent;
        const batchBar = document.getElementById("batchBar");
        const pendingMeta = pendingBatch ? getBatchActionMeta(pendingBatch.action) : undefined;
        const batchToneClass = pendingMeta && pendingMeta.tone === "danger" ? " danger" : "";
        batchBar.className = "batch-bar" + (filteredThreads.length ? " visible" : "") + (pendingBatch ? " confirm" + batchToneClass : "");
        const batchMarkup = selectedIds.length
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
        batchBar.innerHTML = batchMarkup;
        document.getElementById("batchBarMirror").className = batchBar.className;
        document.getElementById("batchBarMirror").innerHTML = batchMarkup;

        const runningMarkup = (dashboard.runningThreads || []).map((thread) => {
          const progress = extractThreadProgress(thread);
          const linkMeta = codexLinkMeta(thread.id);
          const linkBadge = codexLinkBadge(thread.id);
          const codexClass = linkMeta.isFocused ? " codex-focused" : (linkMeta.isOpen ? " codex-open" : "");
          return '<div class="running-row' + codexClass + '">' +
            '<div class="row-head">' +
              '<span>' + statusBadge(thread.status) + '</span>' +
              '<span style="display:flex; gap:8px; align-items:center;"><button class="mini-action-btn" data-rename-thread="' + esc(thread.id) + '" data-current-title="' + esc(thread.title || "") + '" type="button">Rename</button><button class="mini-action-btn" data-codex-thread="' + esc(thread.id) + '" type="button">Codex</button>' + linkBadge + '<span class="mono muted">' + esc(thread.id) + '</span></span>' +
            '</div>' +
            '<div class="thread-title">' + esc(short(thread.title || "(no title)", 100)) + '</div>' +
            '<div class="preview">' + esc(short((thread.process && thread.process.summary) || "no live pid", 120)) + '</div>' +
            '<div class="progress-head"><span class="progress-label">' + esc(progress.label) + '</span><span class="progress-value">' + esc(progress.percent !== undefined ? (String(progress.percent) + "%") : (thread.status || "live")) + '</span></div>' +
            '<div class="progress-track"><div class="progress-bar" style="width:' + esc(String(progress.percent !== undefined ? progress.percent : 18)) + '%"></div></div>' +
            '<div class="progress-note">' + esc(progress.note) + '</div>' +
          '</div>';
        }).join("") || '<div class="empty">No running agents right now.</div>';
        document.getElementById("runningList").innerHTML = runningMarkup;
        document.getElementById("runningListMirror").innerHTML = runningMarkup;
        const runningBoardHtml = renderRunningBoard(boardThreads);
        document.getElementById("runningBoardMirror").innerHTML = runningBoardHtml;
        document.getElementById("runningBoardPrimary").innerHTML = runningBoardHtml;
        syncRunningDropIndicatorDom();
        document.getElementById("liveTimeline").innerHTML = renderLiveTimeline(dashboard.runningThreads || [], recentCompletions);

        const threadMarkup = [
          renderGroup("running", "Running", groups.running),
          renderGroup("recent", "Recent", groups.recent),
          renderGroup("idle", "Idle", groups.idle),
          renderGroup("archived", "Archived", groups.archived),
          renderGroup("soft_deleted", "Soft Deleted", groups.soft_deleted)
        ].join("") || '<div class="empty">No threads loaded.</div>';
        document.getElementById("threadList").innerHTML = threadMarkup;
        document.getElementById("threadListMirror").innerHTML = threadMarkup;
        scrollFocusedCodexThreadIntoView(payload);

        document.querySelectorAll("[data-thread-id]").forEach((node) => {
          node.addEventListener("click", () => {
            setSelectedThread(node.dataset.threadId, { openDrawer: true });
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
        document.querySelectorAll("[data-board-attach]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleBoardAttach(node.dataset.boardAttach);
          });
        });
        document.querySelectorAll("[data-card-size]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            setRunningCardSize(node.dataset.cardSize, node.dataset.cardSizeValue);
          });
        });
        document.querySelectorAll("[data-running-card]").forEach((node) => {
          node.addEventListener("dragstart", (event) => {
            if (state.ui.layoutLocked) {
              event.preventDefault();
              return;
            }
            state.draggedRunningThreadId = node.dataset.runningCard;
            node.classList.add("dragging");
            if (event.dataTransfer) {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", state.draggedRunningThreadId || "");
            }
          });
          node.addEventListener("dragover", (event) => {
            event.preventDefault();
            if (!state.draggedRunningThreadId || state.draggedRunningThreadId === node.dataset.runningCard) return;
            const rect = node.getBoundingClientRect();
            const position = event.clientX > rect.left + (rect.width / 2) ? "after" : "before";
            setRunningDropIndicator(node.dataset.runningCard, position);
            document.querySelectorAll(".running-board-grid").forEach((board) => board.classList.remove("drag-end"));
            syncRunningDropIndicatorDom();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
          });
          node.addEventListener("dragleave", () => {
            if (state.runningDropIndicator && state.runningDropIndicator.threadId === node.dataset.runningCard) {
              clearRunningDropIndicator();
              syncRunningDropIndicatorDom();
            }
          });
          node.addEventListener("drop", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const draggedId = state.draggedRunningThreadId || (event.dataTransfer && event.dataTransfer.getData("text/plain")) || "";
            if (!draggedId) return;
            const position = state.runningDropIndicator && state.runningDropIndicator.threadId === node.dataset.runningCard
              ? state.runningDropIndicator.position
              : "before";
            clearRunningDropIndicator();
            moveRunningCard(draggedId, node.dataset.runningCard, position);
            state.draggedRunningThreadId = undefined;
          });
          node.addEventListener("dragend", () => {
            state.draggedRunningThreadId = undefined;
            clearRunningDropIndicator();
            document.querySelectorAll("[data-running-card]").forEach((card) => {
              card.classList.remove("dragging");
            });
            document.querySelectorAll(".running-board-grid").forEach((board) => board.classList.remove("drag-over", "drag-end"));
            syncRunningDropIndicatorDom();
          });
        });
        document.querySelectorAll(".running-board-grid").forEach((runningBoard) => {
          runningBoard.addEventListener("dragover", (event) => {
            if (state.ui.layoutLocked) return;
            event.preventDefault();
            const targetCard = event.target.closest("[data-running-card]");
            if (!targetCard) {
              clearRunningDropIndicator();
              document.querySelectorAll(".running-board-grid").forEach((board) => board.classList.add("drag-over", "drag-end"));
              syncRunningDropIndicatorDom();
              if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
            }
          });
          runningBoard.addEventListener("dragleave", (event) => {
            if (!runningBoard.contains(event.relatedTarget)) {
              runningBoard.classList.remove("drag-over", "drag-end");
              clearRunningDropIndicator();
              syncRunningDropIndicatorDom();
            }
          });
          runningBoard.addEventListener("drop", (event) => {
            if (state.ui.layoutLocked) return;
            event.preventDefault();
            const targetCard = event.target.closest("[data-running-card]");
            document.querySelectorAll(".running-board-grid").forEach((board) => board.classList.remove("drag-over", "drag-end"));
            if (targetCard) return;
            const draggedId = state.draggedRunningThreadId || (event.dataTransfer && event.dataTransfer.getData("text/plain")) || "";
            if (!draggedId) return;
            clearRunningDropIndicator();
            moveRunningCard(draggedId);
            state.draggedRunningThreadId = undefined;
          });
        });
        document.querySelectorAll("[data-rename-thread]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            vscode.postMessage({
              type: "renameThread",
              threadId: node.dataset.renameThread,
              currentTitle: node.dataset.currentTitle || "",
            });
          });
        });
        document.querySelectorAll("[data-codex-thread]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            markCodexLinking(node.dataset.codexThread, "sidebar");
            render(state.payload);
            vscode.postMessage({
              type: "revealInCodexSidebar",
              threadId: node.dataset.codexThread,
            });
          });
        });
        document.querySelectorAll("[data-open-codex-editor]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            markCodexLinking(node.dataset.openCodexEditor, "editor");
            render(state.payload);
            vscode.postMessage({
              type: "openInCodexEditor",
              threadId: node.dataset.openCodexEditor,
            });
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
        document.querySelectorAll("[data-subtab]").forEach((node) => {
          node.classList.toggle("active", node.dataset.subtab === state.ui.rightPaneTab);
        });
        document.querySelectorAll("[data-pane]").forEach((node) => {
          node.classList.toggle("active", node.dataset.pane === state.ui.rightPaneTab);
        });
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
        }).join("") || '<div class="empty-state">No recent log preview available.</div>';

        const detailThread = (payload.detail && payload.detail.thread) || {};
        const history = (detailThread.id && detailThread.id === (selected && selected.id) ? (detailThread.history || []) : []) || (selected ? (selected.history || []) : []);
        document.getElementById("historySummary").textContent =
          history.length
            ? ("Showing " + history.length + " messages for " + short((selected && selected.title) || detailThread.title || "selected thread", 48))
            : "Select a thread to inspect its chat history.";
        document.getElementById("chatWindow").innerHTML = history.map((item) => {
          return '<div class="chat ' + esc(item.role || "assistant") + '">' +
            '<div class="chat-head"><span>' + esc(item.role || "assistant") + '</span><span>' + esc(item.ts || "") + '</span></div>' +
            '<div>' + esc(item.text || "") + '</div>' +
          '</div>';
        }).join("") || '<div class="empty-state">Select a thread to inspect its chat history.</div>';
        document.getElementById("spotlightPanel").innerHTML = renderSpotlight(selected, payload.detail);
        document.querySelectorAll("[data-open-drawer]").forEach((node) => {
          node.addEventListener("click", () => {
            state.ui.drawerOpen = true;
            persistUi();
            render(state.payload);
          });
        });
        document.querySelectorAll("[data-subtab-shortcut]").forEach((node) => {
          node.addEventListener("click", () => {
            state.ui.currentView = "overview";
            state.ui.rightPaneTab = node.dataset.subtabShortcut;
            persistUi();
            render(state.payload);
          });
        });

        renderDetail(payload);
      }

      function metric(label, value) {
        return '<div class="metric compact"><div class="metric-label">' + esc(label) + '</div><div class="metric-value">' + esc(String(value)) + '</div></div>';
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
      document.getElementById("threadSearchMirror").addEventListener("input", (event) => {
        state.ui.search = event.target.value || "";
        persistUi();
        render(state.payload);
      });
      document.querySelectorAll("[data-view]").forEach((node) => {
        node.addEventListener("click", () => {
          setWorkspaceView(node.dataset.view);
        });
      });
      document.getElementById("soundToggle").addEventListener("click", () => {
        toggleSound();
      });
      document.querySelectorAll("[data-subtab]").forEach((node) => {
        node.addEventListener("click", () => {
          setRightPaneTab(node.dataset.subtab);
        });
      });
      document.querySelectorAll("[data-filter]").forEach((node) => {
        node.addEventListener("click", () => {
          state.ui.filter = node.dataset.filter;
          persistUi();
          render(state.payload);
        });
      });
      document.querySelectorAll("[data-filter-mirror]").forEach((node) => {
        node.addEventListener("click", () => {
          state.ui.filter = node.dataset.filterMirror;
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
      document.querySelectorAll("[data-toggle-mirror='pinned']").forEach((node) => {
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
      document.getElementById("toggleLayoutLock").addEventListener("click", () => {
        toggleLayoutLock();
      });
      document.getElementById("toggleLayoutLockPrimary").addEventListener("click", () => {
        toggleLayoutLock();
      });
      document.getElementById("resetRunningLayout").addEventListener("click", () => {
        resetRunningLayout();
      });
      document.getElementById("resetRunningLayoutPrimary").addEventListener("click", () => {
        resetRunningLayout();
      });
      document.querySelectorAll("[data-open-board-view]").forEach((node) => {
        node.addEventListener("click", () => {
          setWorkspaceView("board");
        });
      });
      document.getElementById("restartServer").addEventListener("click", () => {
        vscode.postMessage({ type: "restartServer" });
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
