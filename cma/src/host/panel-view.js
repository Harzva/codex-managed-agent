const vscode = require("vscode");

const { getWebviewHtml } = require("../webview-template");
const { openNewCodexThread } = require("./codex-link");

const TOKEN_MAINTENANCE_INTERVAL_MS = 60 * 60 * 1000;

function hasSurface(panel) {
  return Boolean(panel.panel || panel.sidebarView || panel.bottomView);
}

async function collapseSidebarIfNeeded(panel) {
  if (!panel.sidebarView) return;
  try {
    await vscode.commands.executeCommand("workbench.action.closeSidebar");
  } catch {
    // ignore if the host cannot close the sidebar in the current layout
  }
}

async function redirectSidebarToPreferredSurface(panel) {
  if (panel.sidebarRedirectInFlight) return;
  const preferred = String(vscode.workspace.getConfiguration("codexAgent").get("defaultSurface") || "fullscreen");
  if (preferred === "left") return;
  panel.sidebarRedirectInFlight = true;
  try {
    if (preferred === "bottom") {
      await showBottomPanel(panel);
      await collapseSidebarIfNeeded(panel);
      return;
    }
    if (preferred === "editor") {
      await focus(panel);
      return;
    }
    await maximizeDashboard(panel);
  } finally {
    panel.sidebarRedirectInFlight = false;
  }
}

function ensureRefreshLoop(panel) {
  if (panel.refreshTimer) return;
  panel.refreshTimer = setInterval(() => {
    const lastFullRefreshAt = Number(panel.lastFullRefreshAt || 0);
    const needsColdRefresh = !panel.lastPayload || !lastFullRefreshAt || (Date.now() - lastFullRefreshAt) >= 60000;
    panel.refresh({ silent: true, mode: needsColdRefresh ? "cold" : "hot" });
  }, 4000);
}

async function runTokenMaintenance(panel) {
  if (panel.authMaintenanceEnabled === false) return;
  if (panel.authMaintenanceInFlight) return;
  panel.authMaintenanceInFlight = true;
  try {
    const { refreshAllOfficialTokens } = require("./account-manager");
    const results = await refreshAllOfficialTokens();
    panel.lastAuthMaintenanceAt = new Date().toISOString();
    panel.lastAuthMaintenanceResults = results;
    const changed = results.some(function (result) {
      return (result && result.ok && !result.skipped) || (result && !result.ok);
    });
    if (changed) {
      await panel.refresh({ silent: true });
    }
  } catch (error) {
    panel.lastAuthMaintenanceError = error instanceof Error ? error.message : String(error);
  } finally {
    panel.authMaintenanceInFlight = false;
  }
}

async function runTokenMaintenanceNow(panel, options = {}) {
  if (panel.authMaintenanceInFlight) {
    return { ok: false, error: "Token maintenance is already running." };
  }
  panel.authMaintenanceInFlight = true;
  try {
    const { refreshAllOfficialTokens } = require("./account-manager");
    const results = await refreshAllOfficialTokens({ force: Boolean(options.force) });
    panel.lastAuthMaintenanceAt = new Date().toISOString();
    panel.lastAuthMaintenanceResults = results;
    panel.lastAuthMaintenanceError = "";
    return { ok: true, force: Boolean(options.force), results };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    panel.lastAuthMaintenanceError = message;
    return { ok: false, force: Boolean(options.force), error: message };
  } finally {
    panel.authMaintenanceInFlight = false;
  }
}

function ensureTokenMaintenanceLoop(panel) {
  if (panel.authMaintenanceEnabled === false) return;
  if (panel.authMaintenanceTimer) return;
  setTimeout(function () {
    runTokenMaintenance(panel).catch(function () {});
  }, 500);
  panel.authMaintenanceTimer = setInterval(function () {
    runTokenMaintenance(panel).catch(function () {});
  }, TOKEN_MAINTENANCE_INTERVAL_MS);
}

function setTokenMaintenanceEnabled(panel, enabled) {
  panel.authMaintenanceEnabled = Boolean(enabled);
  try {
    panel.storage.update("codexAgent.authMaintenanceEnabled", panel.authMaintenanceEnabled);
  } catch {}
  if (!panel.authMaintenanceEnabled && panel.authMaintenanceTimer) {
    clearInterval(panel.authMaintenanceTimer);
    panel.authMaintenanceTimer = undefined;
    return;
  }
  if (panel.authMaintenanceEnabled) ensureTokenMaintenanceLoop(panel);
}

function attachWebview(panel, webview) {
  webview.options = {
    enableScripts: true,
    localResourceRoots: [vscode.Uri.joinPath(panel.extensionUri, "media")],
  };
  webview.onDidReceiveMessage(async (message) => {
    if (message.type === "ready") {
      const readyFilter = String(message.filter || "");
      if ((readyFilter === "all" || readyFilter === "running" || readyFilter === "archived" || readyFilter === "soft_deleted") && panel.threadListScope !== "all") {
        panel.threadListScope = "all";
        await panel.refresh({ silent: true, mode: "full", scope: "all" });
        return;
      }
      if (panel.lastPayload) {
        panel.broadcastState(panel.lastPayload);
      } else {
        await panel.refresh({ silent: true });
      }
      ensureTokenMaintenanceLoop(panel);
    }
    if (message.type === "bootError") {
      const detail = message.error || "Unknown webview boot error";
      panel.lastActionNotice = `Webview boot issue: ${detail}`;
      vscode.window.showErrorMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`);
    }
    if (message.type === "reload") {
      panel.threadListScope = "all";
      await panel.refresh({ mode: "full", scope: "all" });
    }
    if (message.type === "threadFilterChanged") {
      const filter = String(message.filter || "all");
      const needsArchiveScope = filter === "all" || filter === "running" || filter === "archived" || filter === "soft_deleted";
      const nextScope = needsArchiveScope ? "all" : "live";
      if (panel.threadListScope !== nextScope || needsArchiveScope) {
        panel.threadListScope = nextScope;
        await panel.refresh({ silent: true, mode: "full", scope: nextScope });
      }
    }
    if (message.type === "scanCodexSessions") {
      await panel.scanCodexSessions();
    }
    if (message.type === "previewProviderSync") {
      await panel.previewProviderSync();
    }
    if (message.type === "applyProviderSync") {
      await panel.applyProviderSync();
    }
    if (message.type === "previewOpenAiSidebarLimitPatch") {
      await panel.previewOpenAiSidebarLimitPatch();
    }
    if (message.type === "applyOpenAiSidebarLimitPatch") {
      await panel.applyOpenAiSidebarLimitPatch();
    }
    if (message.type === "addCodexAccount") {
      const result = panel.addManagedAccount(message.accountName, {});
      if (result.ok) {
        const loginResult = panel.startManagedAccountLogin
          ? panel.startManagedAccountLogin(message.accountName)
          : { ok: false, error: "Login action is not available." };
        if (loginResult.ok) {
          vscode.window.setStatusBarMessage(
            "Codex-Managed-Agent: added account \"" + message.accountName + "\" and opened login terminal",
            3000,
          );
        } else {
          vscode.window.showWarningMessage(
            "Codex-Managed-Agent: added account \"" + message.accountName + "\" but failed to start login - " + (loginResult.error || "Unknown error"),
          );
        }
      } else {
        vscode.window.showWarningMessage("Codex-Managed-Agent: " + (result.error || "Failed to add account"));
      }
      await panel.refresh({ silent: true });
    }
    if (message.type === "removeCodexAccount") {
      const result = panel.removeManagedAccount(message.accountName);
      if (result.ok) {
        vscode.window.setStatusBarMessage("Codex-Managed-Agent: removed account \"" + message.accountName + "\"", 3000);
      } else {
        vscode.window.showWarningMessage("Codex-Managed-Agent: " + (result.error || "Failed to remove account"));
      }
      await panel.refresh({ silent: true });
    }
    if (message.type === "setCodexAccount") {
      const result = panel.setCurrentManagedAccount(message.accountName);
      if (result.ok) {
        vscode.window.setStatusBarMessage("Codex-Managed-Agent: switched to account \"" + message.accountName + "\"", 3000);
      } else {
        vscode.window.showWarningMessage("Codex-Managed-Agent: " + (result.error || "Failed to set account"));
      }
      await panel.refresh({ silent: true });
    }
    if (message.type === "activateCodexAccount") {
      const result = await panel.activateManagedAccount(message.accountName);
      if (result.ok) {
        vscode.window.setStatusBarMessage("Codex-Managed-Agent: activated account \"" + message.accountName + "\" for codex CLI", 3000);
      } else {
        const recommendation = result.recommendation && String(result.recommendation).trim()
          ? " " + String(result.recommendation).trim()
          : "";
        vscode.window.showWarningMessage(
          "Codex-Managed-Agent: " + (result.error || "Failed to activate account") + recommendation
        );
      }
      await panel.refresh({ silent: true });
    }
    if (message.type === "loginCodexAccount") {
      const result = panel.startManagedAccountLogin
        ? panel.startManagedAccountLogin(message.accountName)
        : { ok: false, error: "Login action is not available." };
      if (result.ok) {
        vscode.window.setStatusBarMessage(
          "Codex-Managed-Agent: opened login terminal for \"" + message.accountName + "\"",
          3000,
        );
      } else {
        vscode.window.showWarningMessage("Codex-Managed-Agent: " + (result.error || "Failed to start login"));
      }
      await panel.refresh({ silent: true });
    }
    if (message.type === "importCodexAccount") {
      const result = panel.importCurrentAuthToProfile ? panel.importCurrentAuthToProfile(message.accountName) : panel.bootstrapManagedAccounts();
      if (result.ok) {
        if (typeof message.accountName === "string" && message.accountName.trim()) {
          vscode.window.setStatusBarMessage(
            "Codex-Managed-Agent: imported Codex auth as account \"" + message.accountName.trim() + "\"",
            3000,
          );
        } else {
          vscode.window.setStatusBarMessage("Codex-Managed-Agent: imported Codex auth as default account", 3000);
        }
      }
      await panel.refresh({ silent: true });
    }
    if (message.type === "importCodexAccountFromFile") {
      const result = panel.importAuthFileToProfile
        ? panel.importAuthFileToProfile(message.accountName, message.authPath, message.configTomlPath)
        : { ok: false, error: "Import from file action is not available." };
      if (result.ok) {
        const nameSuffix = typeof message.accountName === "string" && message.accountName.trim()
          ? message.accountName.trim()
          : "unnamed";
        vscode.window.setStatusBarMessage(
          "Codex-Managed-Agent: imported auth file as account \"" + nameSuffix + "\"",
          3000,
        );
      } else {
        vscode.window.showWarningMessage("Codex-Managed-Agent: " + (result.error || "Failed to import auth file"));
      }
      await panel.refresh({ silent: true });
    }
    if (message.type === "addRelayCodexAccount") {
      const result = panel.addManagedAccount(message.accountName, {
        authPath: message.authPath,
        configTomlPath: message.configTomlPath,
      });
      if (result.ok) {
        const typeLabel = result.type === "relay" ? "relay" : "account";
        vscode.window.setStatusBarMessage('Codex-Managed-Agent: added ' + typeLabel + ' "' + message.accountName + '"', 3000);
      } else {
        vscode.window.showWarningMessage("Codex-Managed-Agent: " + (result.error || "Failed to add relay account"));
      }
      await panel.refresh({ silent: true });
    }
    if (message.type === "refreshCodexAccountToken") {
      const { refreshAccountToken } = require("./account-manager");
      try {
        const result = await refreshAccountToken(message.accountName, { force: true });
        try {
          await panel.webview.postMessage({
            type: "refreshCodexAccountTokenResult",
            accountName: message.accountName,
            result: {
              ok: result.ok,
              skipped: Boolean(result.skipped),
              reason: result.reason || null,
              error: result.error || null,
              tokenInfo: result.tokenInfo || null,
            },
          });
        } catch {}
        if (result.ok && !result.skipped) {
          vscode.window.setStatusBarMessage('Codex-Managed-Agent: refreshed token for "' + message.accountName + '"', 3000);
        } else if (result.ok && result.skipped) {
          vscode.window.setStatusBarMessage('Codex-Managed-Agent: token for "' + message.accountName + '" still fresh', 2000);
        } else {
          vscode.window.showWarningMessage("Codex-Managed-Agent: token refresh failed - " + (result.error || "Unknown error"));
        }
      } catch (err) {
        try {
          await panel.webview.postMessage({
            type: "refreshCodexAccountTokenResult",
            accountName: message.accountName,
            result: { ok: false, error: String(err) },
          });
        } catch {}
        vscode.window.showWarningMessage("Codex-Managed-Agent: token refresh error - " + String(err));
      }
      await panel.refresh({ silent: true });
    }
    if (message.type === "runCodexTokenMaintenance") {
      const result = await runTokenMaintenanceNow(panel, { force: false });
      try {
        await panel.webview.postMessage({
          type: "codexTokenMaintenanceResult",
          result,
        });
      } catch {}
      const refreshed = result.ok ? (result.results || []).filter((item) => item.ok && !item.skipped).length : 0;
      if (result.ok) {
        vscode.window.setStatusBarMessage("Codex-Managed-Agent: checked account tokens" + (refreshed ? " · refreshed " + refreshed : ""), 3000);
      } else {
        vscode.window.showWarningMessage("Codex-Managed-Agent: token maintenance failed - " + (result.error || "Unknown error"));
      }
      await panel.refresh({ silent: true });
    }
    if (message.type === "forceRefreshAllCodexTokens") {
      const result = await runTokenMaintenanceNow(panel, { force: true });
      try {
        await panel.webview.postMessage({
          type: "codexTokenMaintenanceResult",
          result,
        });
      } catch {}
      const refreshed = result.ok ? (result.results || []).filter((item) => item.ok && !item.skipped).length : 0;
      if (result.ok) {
        vscode.window.setStatusBarMessage("Codex-Managed-Agent: force refreshed account tokens · " + refreshed, 3000);
      } else {
        vscode.window.showWarningMessage("Codex-Managed-Agent: force refresh failed - " + (result.error || "Unknown error"));
      }
      await panel.refresh({ silent: true });
    }
    if (message.type === "setCodexTokenMaintenanceEnabled") {
      setTokenMaintenanceEnabled(panel, Boolean(message.enabled));
      await panel.refresh({ silent: true });
    }
    if (message.type === "probeCodexAccount") {
      const { probeAccountCredentials } = require("./account-manager");
      try {
        const result = await probeAccountCredentials(message.accountName);
        try {
          await panel.webview.postMessage({
            type: "probeCodexAccountResult",
            accountName: message.accountName,
            result: { ok: result.ok, status: result.status, data: result.data || null, error: result.error || null },
          });
        } catch {}
        await panel.refresh({ silent: true });
      } catch (err) {
        try {
          await panel.webview.postMessage({
            type: "probeCodexAccountResult",
            accountName: message.accountName,
            result: { ok: false, error: String(err) },
          });
        } catch {}
      }
    }
    if (message.type === "fetchCodexAccountUsage") {
      const { fetchAccountUsage } = require("./account-manager");
      try {
        const result = await fetchAccountUsage(message.accountName);
        try {
          await panel.webview.postMessage({
            type: "fetchCodexAccountUsageResult",
            accountName: message.accountName,
            result: {
              ok: result.ok,
              status: result.status || null,
              source: result.source || null,
              count: Array.isArray(result.rateLimits) ? result.rateLimits.length : 0,
              error: result.error || null,
              note: result.note || null,
            },
          });
        } catch {}
        if (result.ok) {
          vscode.window.setStatusBarMessage('Codex-Managed-Agent: refreshed usage for "' + message.accountName + '"', 2500);
        } else {
          vscode.window.showWarningMessage("Codex-Managed-Agent: usage refresh failed - " + (result.error || "Unknown error"));
        }
        await panel.refresh({ silent: true });
      } catch (err) {
        try {
          await panel.webview.postMessage({
            type: "fetchCodexAccountUsageResult",
            accountName: message.accountName,
            result: { ok: false, error: String(err) },
          });
        } catch {}
      }
    }
    if (message.type === "startServer") {
      await panel.ensureServer({ forceStart: true });
      await panel.refresh();
    }
    if (message.type === "restartServer") {
      await panel.ensureServer({ forceStart: true });
      await panel.refresh();
    }
    if (message.type === "openExternal") {
      await panel.openExternal();
    }
    if (message.type === "runNetworkProbe") {
      await panel.runNetworkProbe(message.probeId || "");
    }
    if (message.type === "refreshClashProxies") {
      await panel.refreshClashProxyState();
    }
    if (message.type === "openNetworkSettings") {
      await vscode.commands.executeCommand("workbench.action.openSettings", "codexAgent.clashControllerUrl");
    }
    if (message.type === "switchClashProxy") {
      await panel.switchClashProxy(message.groupName || "", message.proxyName || "");
    }
    if (message.type === "newThreadInCodexSidebar") {
      const result = await openNewCodexThread();
      if (result?.ok) {
        panel.lastActionNotice = `Opened Codex sidebar via ${result.command}`;
        vscode.window.setStatusBarMessage("Codex-Managed-Agent: opened new Codex sidebar thread", 3000);
        await panel.refresh({ silent: true });
      } else {
        const detail = result?.error || "Codex sidebar command is not available.";
        panel.lastActionNotice = `Could not open Codex sidebar thread: ${detail}`;
        vscode.window.showWarningMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`);
        await panel.refresh({ silent: true });
      }
    }
    if (message.type === "initializeTeamSpace") {
      await panel.initializeTeamSpace();
    }
    if (message.type === "openTeamBrief") {
      await panel.openTeamBrief();
    }
    if (message.type === "openPanel") {
      await panel.focus();
    }
    if (message.type === "openBeside") {
      panel.editorSurface = "editor";
      await panel.openBeside();
    }
    if (message.type === "moveToNewWindow") {
      await panel.moveToNewWindow();
    }
    if (message.type === "showSidebar") {
      await panel.showSidebar();
    }
    if (message.type === "showBottomPanel") {
      await panel.showBottomPanel();
    }
    if (message.type === "maximizeDashboard") {
      await panel.maximizeDashboard();
    }
    if (message.type === "selectThread") {
      panel.selectedThreadId = message.threadId || undefined;
      await panel.refresh({ silent: true });
    }
    if (message.type === "requestTraceSessionReplay") {
      const requested = String(message.threadId || "").trim();
      if (requested) panel.selectedThreadId = requested;
      await panel.refresh({ silent: true, mode: "hot", includeSessionReplay: true });
    }
    if (message.type === "lifecycle") {
      await panel.runLifecycleAction(message.action, message.threadId);
    }
    if (message.type === "lifecycleBatch") {
      await panel.runLifecycleAction(message.action, Array.isArray(message.threadIds) ? message.threadIds : []);
    }
    if (message.type === "copyText") {
      await panel.copyText(message.text, message.label);
    }
    if (message.type === "runCommand") {
      await panel.runCommandInTerminal(message.command, message.label, message.cwd);
    }
    if (message.type === "editCardLabel") {
      await panel.editCardLabel(
        message.threadId,
        message.currentLabel || "",
        message.currentTitle || "",
        message.suggestedLabel || "",
      );
    }
    if (message.type === "setCardLabel") {
      await panel.setCardLabel(message.threadId, message.label || "");
    }
    if (message.type === "chooseBoardTab") {
      await panel.chooseBoardTab(
        message.threadId,
        message.currentBoardTab || "",
        Array.isArray(message.boardTabOrder) ? message.boardTabOrder : [],
        message.activeBoardTab || "all",
      );
    }
    if (message.type === "createBoardTab") {
      await panel.createBoardTab(
        Array.isArray(message.boardTabOrder) ? message.boardTabOrder : [],
        message.activeBoardTab || "all",
      );
    }
    if (message.type === "batchSetBoardTab") {
      await panel.batchSetBoardTab(
        Array.isArray(message.threadIds) ? message.threadIds : [],
        message.activeBoardTab || "all",
        Array.isArray(message.boardTabOrder) ? message.boardTabOrder : [],
      );
    }
    if (message.type === "createThread") {
      await panel.createThread();
    }
    if (message.type === "createLoopThread") {
      await panel.createLoopThread();
    }
    if (message.type === "showThreadInCodex") {
      await panel.showThreadInCodex(message.threadId, message.preferredTitle || "");
    }
    if (message.type === "assignTeamTask") {
      await panel.assignTaskToThread(message.threadId, message.suggestedTitle || "");
    }
    if (message.type === "claimTeamTask") {
      await panel.claimTaskForThread(message.threadId);
    }
    if (message.type === "heartbeatTeamTask") {
      await panel.heartbeatThread(message.threadId);
    }
    if (message.type === "blockTeamTask") {
      await panel.blockTaskForThread(message.threadId);
    }
    if (message.type === "completeTeamTask") {
      await panel.completeTaskForThread(message.threadId);
    }
    if (message.type === "markStaleTeamTasks") {
      await panel.markStaleTeamTasks();
    }
    if (message.type === "updateTeamAgentRolePrompt") {
      await panel.updateAgentRolePrompt(message.agentId || "");
    }
    if (message.type === "updateTeamTaskDefinition") {
      await panel.updateTeamTaskDefinition(message.payload || {});
    }
    if (message.type === "runTeamSnakeDemo") {
      await panel.runTeamSnakeDemo(message.threadId || "", message.prompt || "");
    }
    if (message.type === "createTeamWorkspace") {
      await panel.createTeamWorkspace(message.template || "blank");
    }
    if (message.type === "generateTeamOrchestrationDraft") {
      await panel.generateTeamOrchestrationDraft(message.payload || {});
    }
    if (message.type === "saveTeamOrchestrationDraft") {
      await panel.saveTeamOrchestrationDraft(message.payload || {});
    }
    if (message.type === "updateTeamOrchestrationDraft") {
      await panel.generateTeamOrchestrationDraft(message.payload || {});
    }
    if (message.type === "runTeamWorkspace") {
      await panel.runTeamWorkspace(message.workspaceId || "");
    }
    if (message.type === "deleteTeamWorkspace") {
      await panel.deleteTeamWorkspace(message.workspaceId || "");
    }
    if (message.type === "retryTeamTask") {
      await panel.retryTeamTask(message.taskId || "", message.mode || "same");
    }
    if (message.type === "restartTeamTask") {
      await panel.restartTeamTask(message.taskId || "");
    }
    if (message.type === "deleteTeamTask") {
      await panel.deleteTeamTask(message.taskId || "");
    }
    if (message.type === "setLoopManagedThread") {
      await panel.setLoopManagedThread(message.threadId);
    }
    if (message.type === "runLoopIntervalPreset") {
      await panel.runLoopIntervalPreset(message.threadId, message.intervalMinutes, message.maxTicks);
    }
    if (message.type === "promptLoopIntervalPreset") {
      await panel.promptLoopIntervalPreset(message.threadId);
    }
    if (message.type === "stopLoopDaemon") {
      await panel.stopLoopDaemon();
    }
    if (message.type === "startLoopDaemon") {
      await panel.startLoopDaemon();
    }
    if (message.type === "restartLoopDaemon") {
      await panel.restartLoopDaemon();
    }
    if (message.type === "stopLoopDaemonAt") {
      await panel.stopLoopDaemonAt(message.stateDir);
    }
    if (message.type === "startLoopDaemonAt") {
      await panel.startLoopDaemonAt(message);
    }
    if (message.type === "restartLoopDaemonAt") {
      await panel.restartLoopDaemonAt(message);
    }
    if (message.type === "installBundledCodexLoopSkill") {
      await panel.installBundledCodexLoopSkill();
    }
    if (message.type === "installBundledSkill") {
      await panel.installBundledSkill(message.skillName || "");
    }
    if (message.type === "openCodexSkillsFolder") {
      await panel.openCodexSkillsFolder();
    }
    if (message.type === "syncBundledSkills") {
      await panel.syncBundledSkills();
    }
    if (message.type === "generateLoopRotationPrompt") {
      await panel.generateLoopRotationPrompt(message.stateDir);
    }
    if (message.type === "copyLoopRotationPrompt") {
      await panel.copyLoopRotationPrompt(message.stateDir);
    }
    if (message.type === "attachLoopTmux") {
      await panel.attachLoopTmux(message.sessionName);
    }
    if (message.type === "tailLoopLog") {
      await panel.tailLoopLog(message.path);
    }
    if (message.type === "openInCodexEditor") {
      await panel.openInCodexEditor(message.threadId);
    }
    if (message.type === "revealInCodexSidebar") {
      await panel.revealInCodexSidebar(message.threadId);
    }
    if (message.type === "configureAutoContinue") {
      await panel.configureAutoContinue(message.threadId, message.currentPrompt || "");
    }
    if (message.type === "setAutoContinue") {
      await panel.setAutoContinue(message.threadId, message.prompt, message.count);
    }
    if (message.type === "clearAutoContinue") {
      await panel.clearAutoContinue(message.threadId);
    }
    if (message.type === "setWatchAutoContinue") {
      await panel.setWatchAutoContinue(message.threadId, message.prompt, message.count);
    }
    if (message.type === "watchControl") {
      await panel.controlWatchThread(message.threadId, message.action, message.reason || "webview");
    }
    if (message.type === "sendPromptToThread") {
      await panel.sendPromptToThread(message.threadId, message.prompt, { model: message.model || "" });
    }
    if (message.type === "generateThreadVibeAdvice") {
      await panel.generateThreadVibeAdvice(message.threadId, Boolean(message.force));
    }
    if (message.type === "generateThreadEvidenceReview") {
      await panel.generateThreadEvidenceReview(message.threadId, Boolean(message.force));
    }
    if (message.type === "openLogFile") {
      await panel.openLogFile(message.path);
    }
    if (message.type === "exportTraceReport") {
      await panel.exportTraceReport({
        ...panel.lastPayload,
        detail: panel.lastPayload?.detail,
        threadId: message.threadId || panel.selectedThreadId || panel.lastPayload?.detail?.thread?.id || "",
      });
    }
    if (message.type === "openSessionToolDiff") {
      await panel.openSessionToolDiff(message);
    }
    if (message.type === "openLocalFile") {
      await panel.openLocalFile(message.path, message.label || "Opened file");
    }
    if (message.type === "revealInExplorer") {
      await panel.revealInExplorer(message.path);
    }
    if (message.type === "openRepoFile") {
      await panel.openRepoFile(message.path);
    }
    if (message.type === "openExternalUrl") {
      await panel.openExternalUrl(message.url);
    }
    if (message.type === "generateUsageInsights") {
      await panel.generateUsageInsights();
    }
    if (message.type === "refreshMemory") {
      const { scanAllMemory } = require("./memory-manager");
      const memoryData = scanAllMemory(panel.workspacePath || "");
      webview.postMessage({ type: "memoryData", payload: memoryData });
    }
    if (message.type === "readMemoryFile") {
      const fs = require("fs");
      try {
        const content = fs.readFileSync(message.filePath, "utf8");
        webview.postMessage({ type: "memoryFileContent", payload: { filePath: message.filePath, content, mode: message.mode || "view" } });
      } catch (err) {
        webview.postMessage({ type: "memoryFileError", payload: { filePath: message.filePath, error: err.message } });
      }
    }
    if (message.type === "createMemoryFile") {
      const fs = require("fs");
      const path = require("path");
      const workspacePath = panel.workspacePath || "";
      const targetPath = message.filePath === "AGENTS.md" ? path.join(workspacePath, ".codex", "AGENTS.md") : message.filePath;
      try {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, "# AGENTS.md\n\n", "utf8");
        const { scanAllMemory } = require("./memory-manager");
        const memoryData = scanAllMemory(workspacePath);
        webview.postMessage({ type: "memoryData", payload: memoryData });
      } catch (err) {
        webview.postMessage({ type: "memoryFileError", payload: { filePath: targetPath, error: err.message } });
      }
    }
    if (message.type === "saveMemoryFile") {
      const { saveMemoryFile } = require("./memory-manager");
      const result = saveMemoryFile(message.filePath, message.content);
      if (result.ok) {
        const { scanAllMemory } = require("./memory-manager");
        const memoryData = scanAllMemory(panel.workspacePath || "");
        webview.postMessage({ type: "memoryData", payload: memoryData });
      }
      webview.postMessage({ type: "memoryFileSaved", payload: result });
    }
    if (message.type === "createAgentsMdFromTemplate") {
      const { createAgentsMdFromTemplate, scanAllMemory } = require("./memory-manager");
      const workspacePath = panel.workspacePath || "";
      const targetPath = message.filePath === "AGENTS.md" ? require("path").join(workspacePath, ".codex", "AGENTS.md") : message.filePath;
      const result = createAgentsMdFromTemplate(message.templateKey || "minimal", targetPath);
      if (result.ok) {
        const memoryData = scanAllMemory(workspacePath);
        webview.postMessage({ type: "memoryData", payload: memoryData });
      }
      webview.postMessage({ type: "memoryFileCreated", payload: result });
    }
    if (message.type === "readHistoryJsonl") {
      const { readHistoryJsonl } = require("./memory-manager");
      const historyData = readHistoryJsonl(message.filePath);
      webview.postMessage({ type: "historyData", payload: historyData });
    }
    if (message.type === "persistUiState") {
      await panel.storage.update("codexAgent.persistedUiState", message.state || {});
    }
  });
  webview.html = getWebviewHtml(
    webview,
    panel.extensionUri,
    panel.storage.get("codexAgent.persistedUiState", {}),
  );
}

function lightweightSidebarHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      margin: 0;
      padding: 12px;
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      font: 12px var(--vscode-font-family);
    }
    .hint {
      opacity: 0.72;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="hint">Opening Codex dashboard...</div>
</body>
</html>`;
}

function resolveSidebarView(panel, webviewView) {
  panel.sidebarView = webviewView;
  const preferred = String(vscode.workspace.getConfiguration("codexAgent").get("defaultSurface") || "fullscreen");
  if (preferred !== "left") {
    webviewView.webview.options = {
      enableScripts: false,
      localResourceRoots: [vscode.Uri.joinPath(panel.extensionUri, "media")],
    };
    webviewView.webview.html = lightweightSidebarHtml();
    setTimeout(() => {
      redirectSidebarToPreferredSurface(panel);
    }, 0);
    webviewView.onDidDispose(() => {
      if (panel.sidebarView === webviewView) panel.sidebarView = undefined;
    });
    return;
  }
  attachWebview(panel, webviewView.webview);
  ensureRefreshLoop(panel);
  panel.refresh({ silent: true });
  setTimeout(() => {
    redirectSidebarToPreferredSurface(panel);
  }, 0);
  webviewView.onDidDispose(() => {
    if (panel.sidebarView === webviewView) panel.sidebarView = undefined;
  });
}

function resolveBottomView(panel, webviewView) {
  panel.bottomView = webviewView;
  attachWebview(panel, webviewView.webview);
  ensureRefreshLoop(panel);
  panel.refresh({ silent: true });
  webviewView.onDidDispose(() => {
    if (panel.bottomView === webviewView) panel.bottomView = undefined;
  });
}

function createOrShow(panel, viewColumn = vscode.ViewColumn.One) {
  if (panel.panel) {
    panel.panel.reveal(viewColumn);
    return panel.panel;
  }

  panel.panel = vscode.window.createWebviewPanel(
    "codexManagedAgent.dashboard",
    "Codex-Managed-Agent",
    { viewColumn, preserveFocus: false },
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  );

  attachWebview(panel, panel.panel.webview);
  ensureRefreshLoop(panel);
  panel.refresh();

  panel.panel.onDidDispose(() => {
    panel.panel = undefined;
    if (!hasSurface(panel) && panel.refreshTimer) {
      clearInterval(panel.refreshTimer);
      panel.refreshTimer = undefined;
    }
    if (!hasSurface(panel) && panel.authMaintenanceTimer) {
      clearInterval(panel.authMaintenanceTimer);
      panel.authMaintenanceTimer = undefined;
    }
  });

  return panel.panel;
}

async function focus(panel) {
  panel.editorSurface = "editor";
  createOrShow(panel);
  await collapseSidebarIfNeeded(panel);
  await panel.refresh({ silent: true });
}

async function openBeside(panel) {
  panel.editorSurface = "right";
  createOrShow(panel, vscode.ViewColumn.Beside);
  await collapseSidebarIfNeeded(panel);
  await panel.refresh({ silent: true });
}

async function showSidebar(panel) {
  await vscode.commands.executeCommand("workbench.view.extension.codexManagedAgentSidebar");
  await panel.refresh({ silent: true });
}

async function showBottomPanel(panel) {
  await vscode.commands.executeCommand("workbench.view.extension.codexManagedAgentPanel");
  await panel.refresh({ silent: true });
}

async function moveToNewWindow(panel) {
  panel.editorSurface = "editor";
  createOrShow(panel);
  await collapseSidebarIfNeeded(panel);
  await vscode.commands.executeCommand("workbench.action.moveEditorToNewWindow");
  await panel.refresh({ silent: true });
}

async function maximizeDashboard(panel) {
  panel.editorSurface = "fullscreen";
  createOrShow(panel);
  await collapseSidebarIfNeeded(panel);
  await vscode.commands.executeCommand("workbench.action.maximizeEditor");
  await panel.refresh({ silent: true });
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

module.exports = {
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
};
