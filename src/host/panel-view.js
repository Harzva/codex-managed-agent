const vscode = require("vscode");

const { getWebviewHtml } = require("../webview-template");
const { openNewCodexThread } = require("./codex-link");

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
    panel.refresh({ silent: true });
  }, 4000);
}

function attachWebview(panel, webview) {
  webview.options = {
    enableScripts: true,
    localResourceRoots: [vscode.Uri.joinPath(panel.extensionUri, "media")],
  };
  webview.onDidReceiveMessage(async (message) => {
    if (message.type === "ready") {
      if (panel.lastPayload) {
        panel.broadcastState(panel.lastPayload);
      } else {
        await panel.refresh({ silent: true });
      }
    }
    if (message.type === "bootError") {
      const detail = message.error || "Unknown webview boot error";
      panel.lastActionNotice = `Webview boot issue: ${detail}`;
      vscode.window.showErrorMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`);
    }
    if (message.type === "reload") {
      await panel.refresh();
    }
    if (message.type === "scanCodexSessions") {
      await panel.scanCodexSessions();
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
      await panel.runCommandInTerminal(message.command, message.label);
    }
    if (message.type === "renameThread") {
      await panel.renameThread(message.threadId, message.currentTitle);
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
    if (message.type === "setLoopManagedThread") {
      await panel.setLoopManagedThread(message.threadId);
    }
    if (message.type === "runLoopIntervalPreset") {
      await panel.runLoopIntervalPreset(message.threadId, message.intervalMinutes);
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
    if (message.type === "sendPromptToThread") {
      await panel.sendPromptToThread(message.threadId, message.prompt);
    }
    if (message.type === "generateThreadVibeAdvice") {
      await panel.generateThreadVibeAdvice(message.threadId, Boolean(message.force));
    }
    if (message.type === "openLogFile") {
      await panel.openLogFile(message.path);
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

function resolveSidebarView(panel, webviewView) {
  panel.sidebarView = webviewView;
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
