const vscode = require("vscode");

const { registerCommands } = require("./host/commands");
const {
  getConfig,
} = require("./host/server");
const {
  runLifecycleAction,
  copyText,
  openLogFile,
  openRepoFile,
  renameThread,
  showThreadInCodex,
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
const {
  ensureServer,
  openExternal,
  postMessage,
  broadcastState,
  broadcastLinkState,
  refresh,
} = require("./host/state-sync");

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
    return ensureServer(this, options);
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

  async openRepoFile(relativePath) {
    return openRepoFile(this, relativePath);
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

  async showThreadInCodex(threadId, preferredTitle = "") {
    return showThreadInCodex(this, threadId, preferredTitle);
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
    return broadcastLinkState(this);
  }

  async refresh(options = {}) {
    return refresh(this, options);
  }

  async openExternal() {
    return openExternal(this);
  }

  postMessage(payload) {
    return postMessage(this, payload);
  }

  broadcastState(payload) {
    return broadcastState(this, payload);
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
