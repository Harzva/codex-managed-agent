const vscode = require("vscode");

async function openInCodexEditor(threadId) {
  if (!threadId) return;
  const uri = vscode.Uri.file(`/local/${threadId}`).with({ scheme: "openai-codex", authority: "route" });
  await vscode.commands.executeCommand("vscode.openWith", uri, "chatgpt.conversationEditor");
}

async function openNewCodexThread() {
  let sidebarOpened = false;
  let lastError;
  try {
    await vscode.commands.executeCommand("chatgpt.newChat");
    return { ok: true, command: "chatgpt.newChat" };
  } catch (error) {
    lastError = error;
  }
  try {
    await vscode.commands.executeCommand("chatgpt.openSidebar");
    sidebarOpened = true;
  } catch (error) {
    lastError = error;
  }
  if (sidebarOpened) {
    return { ok: true, command: "chatgpt.openSidebar" };
  }
  return {
    ok: false,
    command: undefined,
    error: lastError instanceof Error ? lastError.message : String(lastError || "Failed to open Codex sidebar"),
  };
}

async function revealInCodexSidebar(threadId) {
  await vscode.commands.executeCommand("chatgpt.openSidebar");
  if (!threadId) return;
  const routeUri = vscode.Uri.parse(`vscode://openai.chatgpt/local/${encodeURIComponent(threadId)}`);
  await vscode.env.openExternal(routeUri);
}

function extractCodexThreadIdFromUri(uri) {
  if (!uri || uri.scheme !== "openai-codex" || uri.authority !== "route") return undefined;
  const match = String(uri.path || "").match(/^\/local\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

function extractCodexThreadIdFromTab(tab) {
  if (!tab || !tab.input) return undefined;
  const input = tab.input;
  try {
    if (input instanceof vscode.TabInputCustom) {
      if (input.viewType !== "chatgpt.conversationEditor") return undefined;
      return extractCodexThreadIdFromUri(input.uri);
    }
  } catch (error) {
  }
  if (input.viewType === "chatgpt.conversationEditor" && input.uri) {
    return extractCodexThreadIdFromUri(input.uri);
  }
  return undefined;
}

function getCodexLinkState() {
  const openThreadIds = new Set();
  let focusedThreadId;
  for (const group of vscode.window.tabGroups.all || []) {
    for (const tab of group.tabs || []) {
      const threadId = extractCodexThreadIdFromTab(tab);
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

function getThreadLogCorpus(thread) {
  const logs = Array.isArray(thread?.preview_logs) ? thread.preview_logs : [];
  return logs
    .map((item) => [item?.target || "", item?.message || ""].filter(Boolean).join(" "))
    .join("\n")
    .toLowerCase();
}

function isPassiveLinkedThread(thread, codexLinkState = getCodexLinkState()) {
  if (!thread || String(thread.status || "").toLowerCase() !== "running") return false;
  const threadId = String(thread.id || "");
  if (!threadId) return false;
  const openThreadIds = new Set(codexLinkState?.openThreadIds || []);
  const focusedThreadId = codexLinkState?.focusedThreadId;
  const sidebarThreadId = codexLinkState?.sidebarThreadId;
  const linked = openThreadIds.has(threadId) || focusedThreadId === threadId || sidebarThreadId === threadId;
  if (!linked) return false;

  const corpus = getThreadLogCorpus(thread);
  const activeRe = /(apply_patch|exec_command|write_stdin|update file|write file|create file|delete file|move to|pytest|npm run|node --check|python3?|git |rg |sed |cat |build|compile|tool call|spawn|shell_snapshot|terminal|tmux|uvicorn|codex resume|search_query|web search|patch|refactor|implement|edit code)/i;
  return !corpus || !activeRe.test(corpus);
}

function isEffectivelyRunningThread(thread, codexLinkState = getCodexLinkState()) {
  if (!thread || String(thread.status || "").toLowerCase() !== "running") return false;
  return !isPassiveLinkedThread(thread, codexLinkState);
}

module.exports = {
  openInCodexEditor,
  openNewCodexThread,
  revealInCodexSidebar,
  extractCodexThreadIdFromUri,
  extractCodexThreadIdFromTab,
  getCodexLinkState,
  getThreadLogCorpus,
  isPassiveLinkedThread,
  isEffectivelyRunningThread,
};
