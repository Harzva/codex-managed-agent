const vscode = require("vscode");
const fs = require("fs");

const { registerCommands } = require("./host/commands");
const {
  closeNodeBackendServer,
  getConfig,
  postWatchAutoContinue,
  postWatchControl,
  postScanCodexSessions,
} = require("./host/server");
const {
  runLifecycleAction,
  copyText,
  openLocalFile,
  openLogFile,
  exportTraceReport,
  openRepoFile,
  openSessionToolDiff,
  createThread,
  createLoopThread,
  showThreadInCodex,
  editCardLabel,
  setCardLabel,
  chooseBoardTab,
  createBoardTab,
  batchSetBoardTab,
  setLoopManagedThread,
  runLoopIntervalPreset,
  promptLoopIntervalPreset,
  stopLoopDaemon,
  startLoopDaemon,
  restartLoopDaemon,
  stopLoopDaemonAt,
  startLoopDaemonAt,
  restartLoopDaemonAt,
  installBundledCodexLoopSkill,
  installBundledSkill,
  openCodexSkillsFolder,
  syncBundledSkills,
  revealInExplorer,
  generateLoopRotationPrompt,
  copyLoopRotationPrompt,
  attachLoopTmux,
  tailLoopLog,
} = require("./host/lifecycle");
const {
  openInCodexEditor,
  revealInCodexSidebar,
  getCodexLinkState,
  getCodexPluginIntegrationState,
  isPassiveLinkedThread,
  isEffectivelyRunningThread,
} = require("./host/codex-link");
const { generateThreadVibeAdvice, generateThreadEvidenceReview } = require("./host/thread-insight");
const {
  listAccounts,
  addAccount,
  removeAccount,
  setCurrentAccount,
  bootstrapDefaultAccount,
  importCurrentAuthAsProfile,
  importAuthFileAsProfile,
  prepareAccountLogin,
  activateAccountForCodex,
} = require("./host/account-manager");
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
  clashConfigSummary,
  getNetworkProbeResults,
  refreshClashProxyState,
  runNetworkProbe,
  switchClashProxy,
} = require("./host/network-tools");
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
  IS_WINDOWS,
  managedTerminalOptions,
  quoteForTerminal,
  terminalEnvSet,
} = require("./host/platform-runtime");
const {
  ensureServer,
  openExternal,
  postMessage,
  broadcastState,
  broadcastLinkState,
  patchLoopDaemonState,
  refresh,
  readProviderSyncPreview,
  applyProviderSync,
  readOpenAiSidebarLimitPatchPreview,
  applyOpenAiSidebarLimitPatch,
} = require("./host/state-sync");
const {
  ingestKnownCliUsageLogs,
  rebuildPersistedUsageReport,
} = require("./host/usage-ledger");
const { getServiceCapabilityBlockReason } = require("./host/service-capabilities");
const {
  initializeTeamSpace,
  openTeamBrief,
  assignTaskToThread,
  claimTaskForThread,
  heartbeatThread,
  blockTaskForThread,
  completeTaskForThread,
  markStaleTeamTasks,
  updateAgentRolePrompt,
  createSnakeDemoTeamTask,
  createTeamWorkspace,
  generateTeamOrchestrationDraft,
  saveTeamOrchestrationDraft,
  prepareTeamWorkspaceRun,
  launchTeamWorkspaceOrchestration,
  launchDedicatedTeamWorker,
  buildTeamDispatchFailurePatch,
  updateTeamTaskDispatch,
  updateTeamTaskDefinition,
  prepareTeamTaskRetry,
  deleteTeamTask,
  deleteTeamWorkspace,
} = require("./host/team-coordination");

class CodexAgentPanel {
  constructor(extensionUri, storage) {
    this.extensionUri = extensionUri;
    this.storage = storage;
    this.panel = undefined;
    this.sidebarView = undefined;
    this.bottomView = undefined;
    this.refreshTimer = undefined;
    this.authMaintenanceTimer = undefined;
    this.authMaintenanceInFlight = false;
    this.authMaintenanceEnabled = this.storage.get("codexAgent.authMaintenanceEnabled", true) !== false;
    this.authMaintenanceIntervalMs = 60 * 60 * 1000;
    this.lastAuthMaintenanceAt = "";
    this.lastAuthMaintenanceResults = [];
    this.lastAuthMaintenanceError = "";
    this.lastPayload = undefined;
    this.selectedThreadId = undefined;
    this.editorSurface = "editor";
    this.lastActionNotice = "";
    this.lastSuccessfulRefreshAt = "";
    this.lastAutoStartFailureAt = 0;
    this.autoStartRetryAt = 0;
    this.lastAutoStartLogPath = "";
    this.lastAutoStartErrorMessage = "";
    this.lastAutoStartInstallCommand = "";
    this.ensureServerInFlight = undefined;
    this.threadListScope = "all";
    this.previousRunningIds = new Set();
    this.recentCompletions = [];
    this.pendingNewAgentCards = [];
    this.knownLoopStateDirs = [];
    this.optimisticQueuedPrompts = {};
    this.networkProbeResults = {};
    this.clashProxyState = clashConfigSummary();
    this.providerSyncState = null;
    this.providerSyncOutputChannel = vscode.window.createOutputChannel("Codex Provider Sync");
    this.autoContinueConfigs = this.storage.get("codexAgent.autoContinueConfigs", {});
    this.threadInsightJobs = {};
    this.threadEvidenceReviewJobs = {};
    this.sidebarRedirectInFlight = false;
    this.sidebarLinkedThreadId = undefined;
    this.sidebarLinkedAt = "";
    this.adviceOutputChannel = vscode.window.createOutputChannel("Codex-Managed-Agent Advice");
    this.codexTabWatcher = vscode.window.tabGroups.onDidChangeTabs(() => {
      this.broadcastLinkState();
    });
    this.codexTabGroupWatcher = vscode.window.tabGroups.onDidChangeTabGroups(() => {
      this.broadcastLinkState();
    });
    this.configWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration("codexAgent.baseUrl") ||
        event.affectsConfiguration("codexAgent.smartMode") ||
        event.affectsConfiguration("codexAgent.clashControllerUrl") ||
        event.affectsConfiguration("codexAgent.clashSecret")
      ) {
        if (event.affectsConfiguration("codexAgent.clashControllerUrl") || event.affectsConfiguration("codexAgent.clashSecret")) {
          this.clashProxyState = clashConfigSummary();
        }
        this.refresh();
      }
    });
  }

  dispose() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = undefined;
    if (this.authMaintenanceTimer) clearInterval(this.authMaintenanceTimer);
    this.authMaintenanceTimer = undefined;
    void closeNodeBackendServer();
    this.codexTabWatcher?.dispose();
    this.codexTabGroupWatcher?.dispose();
    this.configWatcher?.dispose();
    this.providerSyncOutputChannel?.dispose();
    this.adviceOutputChannel?.dispose();
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

  async exportTraceReport(payload = {}) {
    return exportTraceReport(this, payload);
  }

  async openLocalFile(filePath, label = "Opened file") {
    return openLocalFile(this, filePath, label);
  }

  async openRepoFile(relativePath) {
    return openRepoFile(this, relativePath);
  }

  async openSessionToolDiff(payload = {}) {
    return openSessionToolDiff(this, payload);
  }

  async openExternalUrl(url) {
    const target = String(url || "").trim();
    if (!target) return;
    await vscode.env.openExternal(vscode.Uri.parse(target));
  }

  async runCommandInTerminal(command, label = "Command", cwd = "") {
    if (!command) return;
    const terminalOptions = { name: "Codex-Managed-Agent" };
    const terminalCwd = String(cwd || "").trim();
    let cwdSkipped = false;
    if (terminalCwd) {
      try {
        if (fs.statSync(terminalCwd).isDirectory()) {
          terminalOptions.cwd = terminalCwd;
        } else {
          cwdSkipped = true;
        }
      } catch (error) {
        cwdSkipped = true;
      }
    }
    const terminal = vscode.window.createTerminal(managedTerminalOptions(terminalOptions));
    terminal.show(true);
    terminal.sendText(normalizeTerminalCommand(String(command)), true);
    this.lastActionNotice = cwdSkipped
      ? `${label} sent to terminal; skipped missing cwd`
      : `${label} sent to terminal`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 2600);
  }

  async editCardLabel(threadId, currentLabel = "", currentTitle = "", suggestedLabel = "") {
    return editCardLabel(this, threadId, currentLabel, currentTitle, suggestedLabel);
  }

  async setCardLabel(threadId, label = "") {
    return setCardLabel(this, threadId, label);
  }

  async chooseBoardTab(threadId, currentBoardTab = "", boardTabOrder = [], activeBoardTab = "all") {
    return chooseBoardTab(this, threadId, currentBoardTab, boardTabOrder, activeBoardTab);
  }

  async createBoardTab(boardTabOrder = [], activeBoardTab = "all") {
    return createBoardTab(this, boardTabOrder, activeBoardTab);
  }

  async batchSetBoardTab(threadIds = [], activeBoardTab = "all", boardTabOrder = []) {
    return batchSetBoardTab(this, threadIds, activeBoardTab, boardTabOrder);
  }

  async createThread() {
    return createThread(this);
  }

  async createLoopThread() {
    return createLoopThread(this);
  }

  async showThreadInCodex(threadId, preferredTitle = "") {
    return showThreadInCodex(this, threadId, preferredTitle);
  }

  async setLoopManagedThread(threadId) {
    return setLoopManagedThread(this, threadId);
  }

  async runLoopIntervalPreset(threadId, intervalMinutes, maxTicks) {
    return runLoopIntervalPreset(this, threadId, intervalMinutes, maxTicks);
  }

  async promptLoopIntervalPreset(threadId) {
    return promptLoopIntervalPreset(this, threadId);
  }

  async stopLoopDaemon() {
    return stopLoopDaemon(this);
  }

  async startLoopDaemon() {
    return startLoopDaemon(this);
  }

  async restartLoopDaemon() {
    return restartLoopDaemon(this);
  }

  async stopLoopDaemonAt(stateDir) {
    return stopLoopDaemonAt(this, stateDir);
  }

  async startLoopDaemonAt(options) {
    return startLoopDaemonAt(this, options);
  }

  async restartLoopDaemonAt(options) {
    return restartLoopDaemonAt(this, options);
  }

  async installBundledCodexLoopSkill() {
    return installBundledCodexLoopSkill(this);
  }

  async installBundledSkill(skillName) {
    return installBundledSkill(this, skillName);
  }

  async openCodexSkillsFolder() {
    return openCodexSkillsFolder(this);
  }

  async syncBundledSkills() {
    return syncBundledSkills(this);
  }

  async revealInExplorer(folderPath) {
    return revealInExplorer(this, folderPath);
  }

  async generateLoopRotationPrompt(stateDir) {
    return generateLoopRotationPrompt(this, stateDir);
  }

  async copyLoopRotationPrompt(stateDir) {
    return copyLoopRotationPrompt(this, stateDir);
  }

  async attachLoopTmux(sessionName) {
    return attachLoopTmux(this, sessionName);
  }

  async tailLoopLog(filePath) {
    return tailLoopLog(this, filePath);
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

  async setWatchAutoContinue(threadId, prompt, count) {
    const id = String(threadId || "").trim();
    const nextPrompt = String(prompt || "").trim();
    const nextCount = Number(count);
    if (!id || !nextPrompt || !Number.isInteger(nextCount) || nextCount <= 0) {
      vscode.window.showWarningMessage("Codex-Managed-Agent: watch auto-continue needs a thread, prompt, and positive count");
      return;
    }
    const config = getConfig();
    const result = await postWatchAutoContinue(config.baseUrl, {
      thread_id: id,
      prompt: nextPrompt,
      max_count: nextCount,
      enabled: true,
    });
    const auto = result && result.item && result.item.auto_continue;
    this.lastActionNotice = `Watch auto-continue armed for ${auto && auto.remaining_count ? auto.remaining_count : nextCount} run(s)`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 2800);
    await this.refresh({ silent: true, mode: "full" });
  }

  async controlWatchThread(threadId, action, reason = "") {
    const id = String(threadId || "").trim();
    const nextAction = String(action || "").trim();
    if (!id || !["stop", "resume"].includes(nextAction)) return;
    const config = getConfig();
    const result = await postWatchControl(config.baseUrl, {
      thread_id: id,
      action: nextAction,
      reason: String(reason || "webview").trim() || "webview",
    });
    this.lastActionNotice = `Watch ${nextAction}: ${id}${result && result.item && result.item.stopped ? " (stopped)" : ""}`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 2500);
    await this.refresh({ silent: true, mode: "full" });
  }

  inferAutoContinueResult(config) {
    return inferAutoContinueResult(config);
  }

  enrichAutoContinueConfigs() {
    return enrichAutoContinueConfigs(this);
  }

  async sendPromptToThread(threadId, prompt, options = {}) {
    return sendPromptToThread(this, threadId, prompt, options);
  }

  getNetworkProbeResults() {
    return getNetworkProbeResults(this);
  }

  async runNetworkProbe(probeId) {
    return runNetworkProbe(this, probeId);
  }

  async refreshClashProxyState() {
    return refreshClashProxyState(this);
  }

  async switchClashProxy(groupName, proxyName) {
    return switchClashProxy(this, groupName, proxyName);
  }

  async generateThreadVibeAdvice(threadId, force = false) {
    try {
      this.lastActionNotice = "Generating vibe advice...";
      this.adviceOutputChannel?.show(true);
      this.adviceOutputChannel?.appendLine(`\n[${new Date().toISOString()}] Requested Generate Vibe Advice for ${threadId}`);
      vscode.window.setStatusBarMessage("Codex-Managed-Agent: Generating vibe advice...", 2500);
      await generateThreadVibeAdvice(this, threadId, force);
      vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice || "Vibe advice updated"}`, 2600);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      vscode.window.showWarningMessage(`Codex-Managed-Agent: Failed to generate vibe advice: ${detail}`);
    }
  }

  async generateThreadEvidenceReview(threadId, force = false) {
    try {
      this.lastActionNotice = "Generating thread evidence review...";
      this.adviceOutputChannel?.show(true);
      this.adviceOutputChannel?.appendLine(`\n[${new Date().toISOString()}] Requested Thread Evidence Review for ${threadId}`);
      vscode.window.setStatusBarMessage("Codex-Managed-Agent: Generating thread evidence review...", 2500);
      await generateThreadEvidenceReview(this, threadId, force);
      vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice || "Thread evidence review updated"}`, 2600);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      vscode.window.showWarningMessage(`Codex-Managed-Agent: Failed to generate thread evidence review: ${detail}`);
    }
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
      this.broadcastLinkState();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Codex-Managed-Agent: Failed to open Codex editor: ${detail}`);
    }
  }

  async revealInCodexSidebar(threadId) {
    try {
      await revealInCodexSidebar(threadId);
      if (threadId) {
        this.sidebarLinkedThreadId = threadId;
        this.sidebarLinkedAt = new Date().toISOString();
      }
      this.lastActionNotice = threadId ? "Requested Codex sidebar route switch" : "Opened Codex sidebar";
      vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 2400);
      this.broadcastLinkState();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      vscode.window.showWarningMessage(`Codex-Managed-Agent: Could not steer Codex sidebar: ${detail}`);
    }
  }

  getCodexLinkState() {
    const linkState = getCodexLinkState();
    const openThreadIds = new Set(linkState.openThreadIds || []);
    if (this.sidebarLinkedThreadId) openThreadIds.add(this.sidebarLinkedThreadId);
    return {
      ...linkState,
      openThreadIds: [...openThreadIds],
      sidebarThreadId: this.sidebarLinkedThreadId,
      sidebarLinkedAt: this.sidebarLinkedAt,
    };
  }

  getCodexPluginIntegrationState() {
    return getCodexPluginIntegrationState(this.getCodexLinkState());
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

  async initializeTeamSpace() {
    return initializeTeamSpace(this);
  }

  async openTeamBrief() {
    return openTeamBrief(this);
  }

  async assignTaskToThread(threadId, suggestedTitle = "") {
    return assignTaskToThread(this, threadId, suggestedTitle);
  }

  async claimTaskForThread(threadId) {
    return claimTaskForThread(this, threadId);
  }

  async heartbeatThread(threadId) {
    return heartbeatThread(this, threadId);
  }

  async blockTaskForThread(threadId) {
    return blockTaskForThread(this, threadId);
  }

  async completeTaskForThread(threadId) {
    return completeTaskForThread(this, threadId);
  }

  async markStaleTeamTasks() {
    return markStaleTeamTasks(this);
  }

  async updateAgentRolePrompt(agentId) {
    return updateAgentRolePrompt(this, agentId);
  }

  async runTeamSnakeDemo(threadId = "", prompt = "") {
    const created = await createSnakeDemoTeamTask(this, threadId, prompt);
    if (!created) return;
    try {
      const launched = created.dispatchKind === "codex.exec.new"
        ? launchDedicatedTeamWorker(created.thread.id, created.prompt, created.workspace)
        : await this.sendPromptToThread(created.thread.id, created.prompt);
      updateTeamTaskDispatch(this, created.task.task_id, created.thread.id, {
        state: "dispatched",
        command_kind: created.dispatchKind || "codex.exec.resume",
        pid: launched && launched.pid ? launched.pid : 0,
        log_path: launched && launched.logPath ? launched.logPath : "",
        model: launched && launched.model ? launched.model : "",
        model_explicit: Boolean(launched && launched.model),
        codex_version: launched && launched.codexVersion ? launched.codexVersion : "",
      });
      this.lastActionNotice = `Team run success · ${created.task.task_id}`;
      vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 3200);
      await this.refresh({ silent: true });
    } catch (error) {
      const failurePatch = buildTeamDispatchFailurePatch(error, {
        commandKind: created.dispatchKind || "codex.exec.resume",
      });
      updateTeamTaskDispatch(this, created.task.task_id, created.thread.id, {
        state: "failed",
        ...failurePatch,
      });
      this.lastActionNotice = `Team run task created, but background prompt failed: ${failurePatch.error}`;
      vscode.window.showWarningMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`);
      await this.refresh({ silent: true });
    }
  }

  async retryTeamTask(taskId = "", mode = "same") {
    const prepared = prepareTeamTaskRetry(this, taskId, mode);
    if (!prepared) return;
    try {
      const launched = prepared.dispatchKind === "codex.exec.new"
        ? launchDedicatedTeamWorker(prepared.thread.id, prepared.prompt, prepared.workspace, { reason: "team-retry-new" })
        : await this.sendPromptToThread(prepared.thread.id, prepared.prompt, { reason: "team-retry" });
      updateTeamTaskDispatch(this, prepared.task.task_id, prepared.thread.id, {
        state: "dispatched",
        command_kind: prepared.dispatchKind || "codex.exec.resume",
        retry_mode: mode,
        pid: launched && launched.pid ? launched.pid : 0,
        log_path: launched && launched.logPath ? launched.logPath : "",
        model: launched && launched.model ? launched.model : "",
        model_explicit: Boolean(launched && launched.model),
        codex_version: launched && launched.codexVersion ? launched.codexVersion : "",
      });
      this.lastActionNotice = `Retried team task · ${prepared.task.task_id}`;
      vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 3200);
      await this.refresh({ silent: true });
    } catch (error) {
      const failurePatch = buildTeamDispatchFailurePatch(error, {
        commandKind: prepared.dispatchKind || "codex.exec.resume",
        retryMode: mode,
      });
      updateTeamTaskDispatch(this, prepared.task.task_id, prepared.thread.id, {
        state: "failed",
        ...failurePatch,
      });
      vscode.window.showWarningMessage(`Codex-Managed-Agent: Retry failed: ${failurePatch.error}`);
      await this.refresh({ silent: true });
    }
  }

  async restartTeamTask(taskId = "") {
    return this.retryTeamTask(taskId, "new");
  }

  async deleteTeamTask(taskId = "") {
    return deleteTeamTask(this, taskId);
  }

  teamWorkspaceTemplateOptions(template = "blank") {
    const kind = String(template || "blank").trim().toLowerCase();
    const templates = {
      feature: {
        title: "Feature Team Space",
        prompt: [
          "Team task: implement a focused feature.",
          "- Define the user-facing behavior and acceptance criteria before editing.",
          "- Keep changes scoped and record files changed, checks_run, open_risks, and next_request in the result.",
        ].join("\n"),
      },
      bugfix: {
        title: "Bugfix Team Space",
        prompt: [
          "Team task: investigate and fix a reported bug.",
          "- Reproduce or explain the failure evidence first.",
          "- Patch the smallest responsible area and report root_cause, fix, checks_run, open_risks, and next_request.",
        ].join("\n"),
      },
      review: {
        title: "Review Team Space",
        prompt: [
          "Team task: review a focused change or area.",
          "- Prioritize correctness, regression risk, missing tests, and confusing user behavior.",
          "- Return findings with file/line evidence, checks_run, residual_risk, and next_request.",
        ].join("\n"),
      },
      demo: {
        title: "Demo Team Space",
        prompt: [
          "Team task: create a small credible demo path.",
          "- Prefer a minimal runnable proof over broad feature work.",
          "- Record how to run it, visible output, checks_run, open_risks, and next_request.",
        ].join("\n"),
      },
    };
    return templates[kind] ? templates[kind] : { quick: true };
  }

  async createTeamWorkspace(template = "blank") {
    const created = await createTeamWorkspace(this, this.teamWorkspaceTemplateOptions(template));
    if (created && created.workspace_id) {
      this.pendingTeamWorkspacePageId = created.workspace_id;
    }
    return created;
  }

  async generateTeamOrchestrationDraft(payload = {}) {
    const draft = generateTeamOrchestrationDraft(this, payload);
    this.postMessage({ type: "teamOrchestrationDraftGenerated", draft });
    return draft;
  }

  async saveTeamOrchestrationDraft(payload = {}) {
    const saved = await saveTeamOrchestrationDraft(this, payload);
    if (saved) {
      this.postMessage({ type: "teamOrchestrationDraftSaved", workspaceId: saved.workspace_id });
    }
    return saved;
  }

  async runTeamWorkspace(workspaceId = "") {
    const orchestrationLaunch = launchTeamWorkspaceOrchestration(this, workspaceId, {
      reason: "team-workspace-run",
    });
    if (orchestrationLaunch) {
      const launchedCount = Array.isArray(orchestrationLaunch.launched && orchestrationLaunch.launched.launched)
        ? orchestrationLaunch.launched.launched.length
        : 0;
      this.lastActionNotice = launchedCount > 0
        ? `Launched ${launchedCount} orchestration worker${launchedCount === 1 ? "" : "s"}`
        : "Orchestration launch blocked; no schedulable DAG workers";
      vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 3200);
      await this.refresh({ silent: true });
      return;
    }
    const prepared = prepareTeamWorkspaceRun(this, workspaceId);
    if (!prepared) return;
    try {
      const launched = prepared.dispatchKind === "codex.exec.new"
        ? launchDedicatedTeamWorker(prepared.thread.id, prepared.prompt, prepared.workspace, { reason: "team-workspace-run" })
        : await this.sendPromptToThread(prepared.thread.id, prepared.prompt, { reason: "team-workspace-run" });
      updateTeamTaskDispatch(this, prepared.task.task_id, prepared.thread.id, {
        state: "dispatched",
        command_kind: prepared.dispatchKind || "codex.exec.resume",
        retry_mode: prepared.dispatchKind === "codex.exec.new" ? "new" : "same",
        pid: launched && launched.pid ? launched.pid : 0,
        log_path: launched && launched.logPath ? launched.logPath : "",
        model: launched && launched.model ? launched.model : "",
        model_explicit: Boolean(launched && launched.model),
        codex_version: launched && launched.codexVersion ? launched.codexVersion : "",
      });
      this.lastActionNotice = `Run success · ${prepared.task.title || prepared.task.task_id}`;
      vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 3200);
      await this.refresh({ silent: true });
    } catch (error) {
      const failurePatch = buildTeamDispatchFailurePatch(error, {
        commandKind: prepared.dispatchKind || "codex.exec.resume",
        retryMode: prepared.dispatchKind === "codex.exec.new" ? "new" : "same",
      });
      updateTeamTaskDispatch(this, prepared.task.task_id, prepared.thread.id, {
        state: "failed",
        ...failurePatch,
      });
      vscode.window.showWarningMessage(`Codex-Managed-Agent: Team workspace run failed: ${failurePatch.error}`);
      await this.refresh({ silent: true });
    }
  }

  async deleteTeamWorkspace(workspaceId = "") {
    return deleteTeamWorkspace(this, workspaceId);
  }

  async updateTeamTaskDefinition(payload = {}) {
    const updated = updateTeamTaskDefinition(this, payload);
    if (updated) {
      await this.refresh({ silent: true });
    }
    return updated;
  }

  async generateUsageInsights() {
    try {
      this.lastActionNotice = "Generating usage insights...";
      vscode.window.setStatusBarMessage("Codex-Managed-Agent: Generating usage insights...", 2200);
      ingestKnownCliUsageLogs();
      rebuildPersistedUsageReport();
      this.lastActionNotice = "Usage insights regenerated";
      await this.refresh({ silent: true });
      vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 2600);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      vscode.window.showWarningMessage(`Codex-Managed-Agent: Failed to generate usage insights: ${detail}`);
    }
  }

  async scanCodexSessions() {
    try {
      const blockReason = getServiceCapabilityBlockReason(this.lastPayload?.service, "scanSessions", "scan Codex sessions");
      if (blockReason) {
        this.lastActionNotice = blockReason;
        vscode.window.showWarningMessage(`Codex-Managed-Agent: ${blockReason}`);
        return;
      }
      this.lastActionNotice = "Scanning Codex sessions...";
      vscode.window.setStatusBarMessage("Codex-Managed-Agent: Scanning Codex sessions...", 2200);
      const service = await this.ensureServer({ forceStart: true });
      if (!service.ok) {
        throw new Error(service.message || "Server not reachable");
      }
      const result = await postScanCodexSessions(service.baseUrl, 1000);
      const imported = Number(result?.summary?.imported || 0);
      this.lastActionNotice = imported
        ? `Imported ${imported} Codex session${imported === 1 ? "" : "s"}`
        : "No new Codex sessions found";
      await this.refresh({ silent: true });
      vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 3000);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      vscode.window.showWarningMessage(`Codex-Managed-Agent: Failed to scan Codex sessions: ${detail}`);
    }
  }

  async previewProviderSync() {
    const startedAt = new Date().toISOString();
    this.providerSyncState = {
      mode: "preview",
      busy: true,
      message: "Previewing provider sync...",
      startedAt,
    };
    this.lastActionNotice = "Provider sync preview running...";
    this.providerSyncOutputChannel.appendLine(`[${startedAt}] Preview Sync started`);
    this.providerSyncOutputChannel.show(true);
    this.broadcastState({ ...(this.lastPayload || {}), providerSyncState: this.providerSyncState, actionNotice: this.lastActionNotice });
    const result = readProviderSyncPreview();
    this.providerSyncState = { ...result, busy: false, finishedAt: new Date().toISOString() };
    this.lastActionNotice = result.canApply
      ? `Provider sync preview: ${result.plannedRows} SQLite row${result.plannedRows === 1 ? "" : "s"} and ${result.plannedSessionFiles || 0} session file${Number(result.plannedSessionFiles || 0) === 1 ? "" : "s"} can be updated`
      : result.message;
    this.providerSyncOutputChannel.appendLine(`[${this.providerSyncState.finishedAt}] ${this.lastActionNotice}`);
    this.providerSyncOutputChannel.appendLine(`Target provider: ${result.targetProvider || "openai"}`);
    this.providerSyncOutputChannel.appendLine(`Planned SQLite rows: ${result.plannedRows || 0}`);
    this.providerSyncOutputChannel.appendLine(`Planned rollout session files: ${result.plannedSessionFiles || 0}`);
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 3200);
    await this.refresh({ silent: true });
    return result;
  }

  async applyProviderSync() {
    const startedAt = new Date().toISOString();
    this.providerSyncState = {
      ...(this.providerSyncState || {}),
      mode: "apply",
      busy: true,
      message: "Applying provider sync...",
      startedAt,
    };
    this.lastActionNotice = "Provider sync apply running...";
    this.providerSyncOutputChannel.appendLine(`[${startedAt}] Apply Sync started`);
    this.providerSyncOutputChannel.appendLine("Creating backup, rewriting rollout session metadata, and updating SQLite provider rows.");
    this.providerSyncOutputChannel.show(true);
    this.broadcastState({ ...(this.lastPayload || {}), providerSyncState: this.providerSyncState, actionNotice: this.lastActionNotice });
    const result = applyProviderSync();
    this.providerSyncState = { ...result, busy: false, finishedAt: new Date().toISOString() };
    this.lastActionNotice = result.applied
      ? `Provider sync applied: ${result.updatedRows} SQLite row${result.updatedRows === 1 ? "" : "s"} and ${result.updatedSessionFiles || 0} session file${Number(result.updatedSessionFiles || 0) === 1 ? "" : "s"} updated`
      : result.message;
    this.providerSyncOutputChannel.appendLine(`[${this.providerSyncState.finishedAt}] ${this.lastActionNotice}`);
    if (result.backupDir) this.providerSyncOutputChannel.appendLine(`Backup: ${result.backupDir}`);
    if (result.sessionBackupPath) this.providerSyncOutputChannel.appendLine(`Session manifest: ${result.sessionBackupPath}`);
    if (Array.isArray(result.skippedSessionFiles) && result.skippedSessionFiles.length) {
      this.providerSyncOutputChannel.appendLine(`Skipped rollout files: ${result.skippedSessionFiles.length}`);
      result.skippedSessionFiles.slice(0, 20).forEach((filePath) => this.providerSyncOutputChannel.appendLine(`  ${filePath}`));
    }
    if (result.ok) {
      vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 4200);
    } else {
      vscode.window.showWarningMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`);
    }
    await this.refresh({ silent: true, mode: "full", scope: "all" });
    return result;
  }

  async previewOpenAiSidebarLimitPatch() {
    const startedAt = new Date().toISOString();
    this.providerSyncState = {
      ...(this.providerSyncState || {}),
      sidebarLimit: {
        mode: "openai-sidebar-limit-preview",
        busy: true,
        message: "Checking OpenAI sidebar thread limit...",
        startedAt,
      },
    };
    this.lastActionNotice = "Checking OpenAI sidebar thread limit...";
    this.providerSyncOutputChannel.appendLine(`[${startedAt}] OpenAI sidebar limit preview started`);
    this.providerSyncOutputChannel.show(true);
    this.broadcastState({ ...(this.lastPayload || {}), providerSyncState: this.providerSyncState, actionNotice: this.lastActionNotice });
    const result = readOpenAiSidebarLimitPatchPreview({ targetLimit: 200 });
    this.providerSyncState = {
      ...(this.providerSyncState || {}),
      sidebarLimit: { ...result, busy: false, finishedAt: new Date().toISOString() },
    };
    this.lastActionNotice = result.message;
    this.providerSyncOutputChannel.appendLine(`[${this.providerSyncState.sidebarLimit.finishedAt}] ${this.lastActionNotice}`);
    if (result.extensionJsPath) this.providerSyncOutputChannel.appendLine(`OpenAI extension: ${result.extensionJsPath}`);
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`, 3600);
    await this.refresh({ silent: true });
    return result;
  }

  async applyOpenAiSidebarLimitPatch() {
    const startedAt = new Date().toISOString();
    this.providerSyncState = {
      ...(this.providerSyncState || {}),
      sidebarLimit: {
        ...((this.providerSyncState && this.providerSyncState.sidebarLimit) || {}),
        mode: "openai-sidebar-limit-apply",
        busy: true,
        message: "Patching OpenAI sidebar thread limit...",
        startedAt,
      },
    };
    this.lastActionNotice = "Patching OpenAI sidebar thread limit...";
    this.providerSyncOutputChannel.appendLine(`[${startedAt}] OpenAI sidebar limit apply started`);
    this.providerSyncOutputChannel.show(true);
    this.broadcastState({ ...(this.lastPayload || {}), providerSyncState: this.providerSyncState, actionNotice: this.lastActionNotice });
    const result = applyOpenAiSidebarLimitPatch({ targetLimit: 200 });
    this.providerSyncState = {
      ...(this.providerSyncState || {}),
      sidebarLimit: { ...result, busy: false, finishedAt: new Date().toISOString() },
    };
    this.lastActionNotice = result.message;
    this.providerSyncOutputChannel.appendLine(`[${this.providerSyncState.sidebarLimit.finishedAt}] ${this.lastActionNotice}`);
    if (result.backupPath) this.providerSyncOutputChannel.appendLine(`Backup: ${result.backupPath}`);
    if (result.extensionJsPath) this.providerSyncOutputChannel.appendLine(`Patched extension: ${result.extensionJsPath}`);
    if (result.ok) {
      vscode.window.showInformationMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`);
    } else {
      vscode.window.showWarningMessage(`Codex-Managed-Agent: ${this.lastActionNotice}`);
    }
    await this.refresh({ silent: true });
    return result;
  }

  postMessage(payload) {
    return postMessage(this, payload);
  }

  broadcastState(payload) {
    return broadcastState(this, payload);
  }

  patchLoopDaemonState(stateDir) {
    return patchLoopDaemonState(this, stateDir);
  }

  listManagedAccounts() {
    return listAccounts();
  }

  addManagedAccount(name, options) {
    return addAccount(name, options || {});
  }

  removeManagedAccount(name) {
    return removeAccount(name);
  }

  setCurrentManagedAccount(name) {
    return setCurrentAccount(name);
  }

  bootstrapManagedAccounts() {
    return bootstrapDefaultAccount();
  }

  importCurrentAuthToProfile(name) {
    const normalized = typeof name === "string" ? name.trim() : "";
    if (normalized) {
      return importCurrentAuthAsProfile(normalized);
    }
    return bootstrapDefaultAccount();
  }

  importAuthFileToProfile(name, authPath, configTomlPath) {
    const normalized = typeof name === "string" ? name.trim() : "";
    if (!normalized) {
      return { ok: false, error: "Account name is required." };
    }
    if (typeof authPath !== "string" || !authPath.trim()) {
      return { ok: false, error: "Auth file path is required." };
    }
    return importAuthFileAsProfile(normalized, {
      authPath: authPath.trim(),
      configTomlPath: typeof configTomlPath === "string" && configTomlPath.trim() ? configTomlPath.trim() : undefined,
    });
  }

  async activateManagedAccount(name) {
    return await activateAccountForCodex(name);
  }

  startManagedAccountLogin(name) {
    const result = prepareAccountLogin(name);
    if (!result.ok) return result;
    const doneMessage = "Login finished. Return to Codex-Managed-Agent and click Validate or Refresh Usage for " + name + ".";
    const command = IS_WINDOWS
      ? [
          terminalEnvSet("CODEX_HOME", result.codexHome),
          "codex login --device-auth",
          "Write-Host ''",
          "Write-Host " + quoteForTerminal(doneMessage),
        ].join("; ")
      : [
          terminalEnvSet("CODEX_HOME", result.codexHome),
          "codex login --device-auth",
          "echo",
          "echo " + quoteForTerminal(doneMessage),
        ].join(" && ");
    const terminal = vscode.window.createTerminal(managedTerminalOptions({
      name: "Codex Login: " + name,
      cwd: result.codexHome,
      env: {
        CODEX_HOME: result.codexHome,
      },
    }));
    terminal.show(true);
    terminal.sendText(command, true);
    return result;
  }
}

function shellQuote(value) {
  return "'" + String(value || "").replace(/'/g, "'\"'\"'") + "'";
}

function normalizeTerminalCommand(command) {
  const nextCommand = String(command || "");
  if (!IS_WINDOWS) return nextCommand;
  return nextCommand.replace(/\s+&&\s+/g, "; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ");
}

function activate(context) {
  try {
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
  } catch (err) {
    console.error("CMA activation failed:", err);
    vscode.window.showErrorMessage(
      "Codex-Managed-Agent failed to activate. Check the Output panel for details."
    );
    throw err;
  }
}

function deactivate() {
  try {
    return closeNodeBackendServer();
  } catch (err) {
    console.error("CMA deactivate error:", err);
  }
}

module.exports = {
  activate,
  deactivate,
};
