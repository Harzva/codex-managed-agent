const vscode = require("vscode");

const { registerCommands } = require("./host/commands");
const {
  getConfig,
  summarizeServiceState,
  fetchDashboardState,
  fetchThreadDetail,
  probeServer,
  startServer,
} = require("./host/server");
const {
  runLifecycleAction,
  copyText,
  openLogFile,
  renameThread,
} = require("./host/lifecycle");
const {
  openInCodexEditor,
  revealInCodexSidebar,
  getCodexLinkState,
  isPassiveLinkedThread,
  isEffectivelyRunningThread,
} = require("./host/codex-link");
const {
  saveAutoContinueConfigs,
  configureAutoContinue,
  setAutoContinue,
  clearAutoContinue,
  inferAutoContinueResult,
  enrichAutoContinueConfigs,
  sendPromptToThread,
  triggerAutoContinue,
} = require("./host/auto-continue");
const {
  hasSurface,
  ensureRefreshLoop,
  attachWebview,
  resolveSidebarView,
  resolveBottomView,
  createOrShow,
  focus,
  openBeside,
  showSidebar,
  showBottomPanel,
  moveToNewWindow,
  maximizeDashboard,
  CodexAgentSidebarProvider,
  CodexAgentBottomProvider,
} = require("./host/panel-view");

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
    return ensureRefreshLoop(this);
  }

  hasSurface() {
    return hasSurface(this);
  }

  attachWebview(webview) {
    return attachWebview(this, webview);
  }

  saveAutoContinueConfigs() {
    return saveAutoContinueConfigs(this);
  }

  resolveSidebarView(webviewView) {
    return resolveSidebarView(this, webviewView);
  }

  resolveBottomView(webviewView) {
    return resolveBottomView(this, webviewView);
  }

  createOrShow(viewColumn = vscode.ViewColumn.One) {
    return createOrShow(this, viewColumn);
  }

  async focus() {
    return focus(this);
  }

  async openBeside() {
    return openBeside(this);
  }

  async showSidebar() {
    return showSidebar(this);
  }

  async showBottomPanel() {
    return showBottomPanel(this);
  }

  async moveToNewWindow() {
    return moveToNewWindow(this);
  }

  async maximizeDashboard() {
    return maximizeDashboard(this);
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
    return runLifecycleAction(this, action, threadIdsOrOne);
  }

  async copyText(text, label = "Copied") {
    return copyText(this, text, label);
  }

  async openLogFile(filePath) {
    return openLogFile(this, filePath);
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
    return renameThread(this, threadId, currentTitle);
  }

  async configureAutoContinue(threadId, currentPrompt = "") {
    return configureAutoContinue(this, threadId, currentPrompt);
  }

  async setAutoContinue(threadId, prompt, count) {
    return setAutoContinue(this, threadId, prompt, count);
  }

  async clearAutoContinue(threadId) {
    return clearAutoContinue(this, threadId);
  }

  inferAutoContinueResult(config) {
    return inferAutoContinueResult(config);
  }

  enrichAutoContinueConfigs() {
    return enrichAutoContinueConfigs(this);
  }

  async sendPromptToThread(threadId, prompt) {
    return sendPromptToThread(this, threadId, prompt);
  }

  async triggerAutoContinue(threadId, config) {
    return triggerAutoContinue(this, threadId, config);
  }

  async openInCodexEditor(threadId) {
    if (!threadId) return;
    try {
      await openInCodexEditor(threadId);
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
      await revealInCodexSidebar(threadId);
      this.lastActionNotice = "Requested Codex sidebar route switch";
      vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 2400);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      vscode.window.showWarningMessage(`Codex-Managed-Agent: Could not steer Codex sidebar: ${detail}`);
    }
  }

  getCodexLinkState() {
    return getCodexLinkState();
  }

  isPassiveLinkedThread(thread, codexLinkState = this.getCodexLinkState()) {
    return isPassiveLinkedThread(thread, codexLinkState);
  }

  isEffectivelyRunningThread(thread, codexLinkState = this.getCodexLinkState()) {
    return isEffectivelyRunningThread(thread, codexLinkState);
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
  registerCommands(context, provider);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
