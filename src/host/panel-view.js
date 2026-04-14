const vscode = require("vscode");

const { getWebviewHtml } = require("../webview-template");

function hasSurface(panel) {
  return Boolean(panel.panel || panel.sidebarView || panel.bottomView);
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
    if (message.type === "openPanel") {
      await panel.focus();
    }
    if (message.type === "openBeside") {
      panel.editorSurface = "editor";
      createOrShow(panel, vscode.ViewColumn.Beside);
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
    if (message.type === "openLogFile") {
      await panel.openLogFile(message.path);
    }
  });
  webview.html = getWebviewHtml(webview, panel.extensionUri);
}

function resolveSidebarView(panel, webviewView) {
  panel.sidebarView = webviewView;
  attachWebview(panel, webviewView.webview);
  ensureRefreshLoop(panel);
  panel.refresh({ silent: true });
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
  await panel.refresh({ silent: true });
}

async function openBeside(panel) {
  panel.editorSurface = "editor";
  createOrShow(panel, vscode.ViewColumn.Beside);
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
  await vscode.commands.executeCommand("workbench.action.moveEditorToNewWindow");
  await panel.refresh({ silent: true });
}

async function maximizeDashboard(panel) {
  panel.editorSurface = "fullscreen";
  createOrShow(panel);
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
