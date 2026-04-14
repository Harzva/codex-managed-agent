const vscode = require("vscode");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const https = require("https");

const { getWebviewHtml } = require("./webview-template");

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

function shellSingleQuote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

function shortText(value, len = 120) {
  const text = String(value || "");
  return text.length > len ? `${text.slice(0, len)}...` : text;
}

function ensureDirSync(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function safeFileSlug(value, fallback = "thread") {
  return String(value || fallback).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || fallback;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readFileTail(filePath, maxBytes = 8192) {
  if (!filePath || !fs.existsSync(filePath)) return "";
  const stat = fs.statSync(filePath);
  const start = Math.max(0, stat.size - maxBytes);
  const fd = fs.openSync(filePath, "r");
  try {
    const length = stat.size - start;
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, start);
    return buffer.toString("utf8");
  } finally {
    fs.closeSync(fd);
  }
}

function readPersistedInsightsReport() {
  try {
    const reportPath = path.join(os.homedir(), ".codex", "codex_managed_agent_usage_report.json");
    if (!fs.existsSync(reportPath)) return null;
    return JSON.parse(fs.readFileSync(reportPath, "utf8"));
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

class CodexAgentPanel {
  constructor(extensionUri, storage) {
    this.extensionUri = extensionUri;
    this.storage = storage;
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
    this.autoContinueConfigs = this.storage.get("codexAgent.autoContinueConfigs", {});
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
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")],
    };
    webview.onDidReceiveMessage(async (message) => {
      if (message.type === "ready") {
        if (this.lastPayload) {
          this.broadcastState(this.lastPayload);
        } else {
          await this.refresh({ silent: true });
        }
      }
      if (message.type === "bootError") {
        const detail = message.error || "Unknown webview boot error";
        this.lastActionNotice = `Webview boot issue: ${detail}`;
        vscode.window.showErrorMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`);
      }
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
      if (message.type === "configureAutoContinue") {
        await this.configureAutoContinue(message.threadId, message.currentPrompt || "");
      }
      if (message.type === "setAutoContinue") {
        await this.setAutoContinue(message.threadId, message.prompt, message.count);
      }
      if (message.type === "clearAutoContinue") {
        await this.clearAutoContinue(message.threadId);
      }
      if (message.type === "sendPromptToThread") {
        await this.sendPromptToThread(message.threadId, message.prompt);
      }
      if (message.type === "openLogFile") {
        await this.openLogFile(message.path);
      }
    });
    webview.html = getWebviewHtml(webview, this.extensionUri);
  }

  saveAutoContinueConfigs() {
    return this.storage.update("codexAgent.autoContinueConfigs", this.autoContinueConfigs);
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

  async openLogFile(filePath) {
    if (!filePath) return;
    if (!fs.existsSync(filePath)) {
      vscode.window.showWarningMessage(`Codex-Managed-Agent: log file not found: ${filePath}`);
      return;
    }
    const uri = vscode.Uri.file(filePath);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: false });
    this.lastActionNotice = "Opened background log";
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 2200);
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

  async configureAutoContinue(threadId, currentPrompt = "") {
    if (!threadId) return;
    const countPick = await vscode.window.showQuickPick(
      [
        { label: "10 times", value: 10 },
        { label: "20 times", value: 20 },
        { label: "50 times", value: 50 },
        { label: "100 times", value: 100 },
        { label: "Custom", value: -1 },
      ],
      {
        title: "Auto continue loop",
        placeHolder: "Choose how many times to auto resume this thread after it stops",
        ignoreFocusOut: true,
      },
    );
    if (!countPick) return;
    let remaining = countPick.value;
    if (remaining < 0) {
      const customCount = await vscode.window.showInputBox({
        title: "Auto continue loop",
        prompt: "How many resume attempts should be allowed?",
        value: "10",
        ignoreFocusOut: true,
        validateInput: (value) => {
          const parsed = Number(String(value || "").trim());
          return Number.isInteger(parsed) && parsed > 0 ? undefined : "Enter a positive integer";
        },
      });
      if (customCount === undefined) return;
      remaining = Number(customCount);
    }
    const prompt = await vscode.window.showInputBox({
      title: "Auto continue loop",
      prompt: "Prompt to send when the thread stops",
      value: String(currentPrompt || "continue"),
      ignoreFocusOut: true,
      validateInput: (value) => String(value || "").trim() ? undefined : "Prompt cannot be empty",
    });
    if (prompt === undefined) return;
    this.autoContinueConfigs[threadId] = {
      prompt: String(prompt).trim(),
      remaining,
      total: remaining,
      active: true,
      lastTriggeredAt: 0,
      lastLaunchStatus: "armed",
      lastLogPath: "",
      lastError: "",
    };
    await this.saveAutoContinueConfigs();
    this.lastActionNotice = `Auto loop armed for ${remaining} run(s)`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 2800);
    await this.refresh({ silent: true });
  }

  async setAutoContinue(threadId, prompt, count) {
    if (!threadId) return;
    const nextPrompt = String(prompt || "").trim();
    const nextCount = Number(count);
    if (!nextPrompt || !Number.isInteger(nextCount) || nextCount <= 0) {
      vscode.window.showWarningMessage("Codex-Managed-Agent: auto loop needs a prompt and a positive count");
      return;
    }
    this.autoContinueConfigs[threadId] = {
      prompt: nextPrompt,
      remaining: nextCount,
      total: nextCount,
      active: true,
      lastTriggeredAt: 0,
      lastLaunchStatus: "armed",
      lastLogPath: "",
      lastError: "",
    };
    await this.saveAutoContinueConfigs();
    this.lastActionNotice = `Auto loop armed for ${nextCount} run(s)`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 2800);
    await this.refresh({ silent: true });
  }

  async clearAutoContinue(threadId) {
    if (!threadId || !this.autoContinueConfigs[threadId]) return;
    delete this.autoContinueConfigs[threadId];
    await this.saveAutoContinueConfigs();
    this.lastActionNotice = "Auto loop removed";
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 2200);
    await this.refresh({ silent: true });
  }

  findThreadContext(threadId) {
    const dashboard = this.lastPayload?.dashboard;
    const thread = dashboard?.threads?.find((item) => item.id === threadId)
      || dashboard?.runningThreads?.find((item) => item.id === threadId)
      || (this.lastPayload?.detail?.thread?.id === threadId ? this.lastPayload.detail.thread : undefined);
    return thread || {};
  }

  isProcessAlive(pid) {
    const value = Number(pid);
    if (!Number.isInteger(value) || value <= 0) return false;
    try {
      process.kill(value, 0);
      return true;
    } catch (error) {
      return false;
    }
  }

  inferAutoContinueResult(config) {
    if (!config) {
      return {
        state: "idle",
        label: "Idle",
        detail: "No background continue activity recorded yet.",
        tailLine: "",
      };
    }
    const pidAlive = this.isProcessAlive(config.lastPid);
    const tail = readFileTail(config.lastLogPath, 10000).trim();
    const tailLine = tail.split(/\n/).map((line) => line.trim()).filter(Boolean).slice(-1)[0] || "";
    if (config.lastLaunchStatus === "failed") {
      return {
        state: "failed",
        label: "Failed",
        detail: config.lastError || "Background continue failed to launch.",
        tailLine,
      };
    }
    if (pidAlive) {
      return {
        state: "running",
        label: "Still running",
        detail: "The detached Codex resume process is still active.",
        tailLine,
      };
    }
    const failedRe = /(error:|failed|panic|unexpected argument|no rollout found|refusing to start|not authorized|permission denied)/i;
    const successRe = /("task_complete"|"completed"|final_response|assistant_message|applied|done|finished successfully|patch applied)/i;
    if (failedRe.test(tail)) {
      return {
        state: "failed",
        label: "Failed",
        detail: shortText(tailLine || config.lastError || "Background continue failed.", 180),
        tailLine,
      };
    }
    if (successRe.test(tail)) {
      return {
        state: "success",
        label: "Succeeded",
        detail: "The last detached continue appears to have completed successfully.",
        tailLine,
      };
    }
    if (config.lastTriggeredAt) {
      return {
        state: "queued",
        label: "Queued",
        detail: "The last detached continue was queued; waiting for a clearer completion signal.",
        tailLine,
      };
    }
    return {
      state: "armed",
      label: "Armed",
      detail: "Auto loop is armed and waiting for a real stop signal.",
      tailLine,
    };
  }

  enrichAutoContinueConfigs() {
    const result = {};
    Object.entries(this.autoContinueConfigs || {}).forEach(([threadId, config]) => {
      const inferred = this.inferAutoContinueResult(config);
      result[threadId] = {
        ...config,
        lastResult: inferred,
      };
    });
    return result;
  }

  launchCodexExecResume(threadId, prompt, cwd, reason = "manual") {
    const logsDir = ensureDirSync(path.join(os.homedir(), ".codex-managed-agent", "logs"));
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logPath = path.join(logsDir, `${safeFileSlug(threadId)}-${safeFileSlug(reason)}-${stamp}.log`);
    const out = fs.openSync(logPath, "a");
    const child = childProcess.spawn(
      "codex",
      ["exec", "resume", threadId, prompt, "--skip-git-repo-check", "--json"],
      {
        cwd,
        detached: true,
        stdio: ["ignore", out, out],
        env: { ...process.env, TERM: process.env.TERM || "xterm-256color" },
      },
    );
    child.unref();
    return { pid: child.pid, logPath };
  }

  async sendPromptToThread(threadId, prompt) {
    if (!threadId) return;
    const nextPrompt = String(prompt || "").trim();
    if (!nextPrompt) {
      vscode.window.showWarningMessage("Codex-Managed-Agent: prompt cannot be empty");
      return;
    }

    const thread = this.findThreadContext(threadId);
    const fallbackCwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir();
    const cwd = thread.cwd || fallbackCwd;
    try {
      const launched = this.launchCodexExecResume(threadId, nextPrompt, cwd, "manual");
      this.lastActionNotice = `Prompt queued in background · ${thread.title || threadId}`;
      vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 2600);
      await this.refresh({ silent: true });
      return launched;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Codex-Managed-Agent: Failed to send prompt in background: ${detail}`);
      throw error;
    }
  }

  async triggerAutoContinue(threadId, config) {
    if (!threadId || !config || !config.active || config.remaining <= 0) return false;
    const now = Date.now();
    if (config.lastTriggeredAt && now - config.lastTriggeredAt < 8000) {
      return false;
    }
    const prompt = String(config.prompt || "continue").trim();
    const thread = this.findThreadContext(threadId);
    const fallbackCwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir();
    const cwd = thread.cwd || fallbackCwd;
    try {
      const launched = this.launchCodexExecResume(threadId, prompt, cwd, "auto-loop");
      config.lastLaunchStatus = "queued";
      config.lastLogPath = launched.logPath || "";
      config.lastPid = launched.pid || 0;
      config.lastError = "";
    } catch (error) {
      config.lastLaunchStatus = "failed";
      config.lastError = error instanceof Error ? error.message : String(error);
      await this.saveAutoContinueConfigs();
      this.lastActionNotice = `Auto loop failed to queue`;
      vscode.window.showWarningMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`);
      return false;
    }
    config.remaining -= 1;
    config.lastTriggeredAt = now;
    config.lastPrompt = prompt;
    if (config.remaining <= 0) {
      config.active = false;
    }
    await this.saveAutoContinueConfigs();
    this.lastActionNotice = `Auto loop queued in background · ${config.remaining} left`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 3200);
    return true;
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

  getThreadLogCorpus(thread) {
    const logs = Array.isArray(thread?.preview_logs) ? thread.preview_logs : [];
    return logs
      .map((item) => [item?.target || "", item?.message || ""].filter(Boolean).join(" "))
      .join("\n")
      .toLowerCase();
  }

  isPassiveLinkedThread(thread, codexLinkState = this.getCodexLinkState()) {
    if (!thread || String(thread.status || "").toLowerCase() !== "running") return false;
    const threadId = String(thread.id || "");
    if (!threadId) return false;
    const openThreadIds = new Set(codexLinkState?.openThreadIds || []);
    const focusedThreadId = codexLinkState?.focusedThreadId;
    const linked = openThreadIds.has(threadId) || focusedThreadId === threadId;
    if (!linked) return false;

    const corpus = this.getThreadLogCorpus(thread);
    if (!corpus) return false;
    const passiveRe = /(responses_websocket|sse::responses|stream_events_utils|trace_safe|log_only|tools::registry|op\.dispatch\.user_input|session_task\.turn|rpc\.method=\"thread\/resume\")/i;
    const activeRe = /(apply_patch|update file|write file|create file|delete file|move to|pytest|npm run|build|compile|tool call|spawn|shell_snapshot|terminal|uvicorn|codex resume|search_query|web search|patch|refactor|implement|edit code)/i;
    return passiveRe.test(corpus) && !activeRe.test(corpus);
  }

  isEffectivelyRunningThread(thread, codexLinkState = this.getCodexLinkState()) {
    if (!thread || String(thread.status || "").toLowerCase() !== "running") return false;
    return !this.isPassiveLinkedThread(thread, codexLinkState);
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
      const codexLinkState = this.getCodexLinkState();
      const currentThreads = Array.isArray(dashboard.threads) ? dashboard.threads : [];
      const effectiveRunningThreads = (dashboard.runningThreads || []).filter((thread) =>
        this.isEffectivelyRunningThread(thread, codexLinkState),
      );
      const nextRunningIds = new Set(effectiveRunningThreads.map((thread) => thread.id));
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
      for (const item of completedEvents) {
        const loopConfig = this.autoContinueConfigs[item.threadId];
        if (loopConfig && loopConfig.active && loopConfig.remaining > 0) {
          await this.triggerAutoContinue(item.threadId, loopConfig);
        }
      }
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
        effectiveRunningThreadIds: [...nextRunningIds],
        selectedThreadId: this.selectedThreadId,
        detail,
        recentCompletions: this.recentCompletions,
        autoContinueConfigs: this.enrichAutoContinueConfigs(),
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
    const codexLinkState = this.getCodexLinkState();
    const enrichedPayload = {
      ...payload,
      codexLinkState,
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

function activate(context) {
  const provider = new CodexAgentPanel(context.extensionUri, context.workspaceState);

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
