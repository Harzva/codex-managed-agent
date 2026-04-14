const vscode = require("vscode");
const fs = require("fs");

const { getConfig, postLifecycleAction, postRenameThread } = require("./server");
const { openInCodexEditor } = require("./codex-link");

async function runLifecycleAction(panel, action, threadIdsOrOne) {
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
    panel.lastActionNotice = `${action}: updated ${updatedCount}${deletedCount ? `, deleted ${deletedCount}` : ""}${skippedCount ? `, skipped ${skippedCount}` : ""}`;
    const stillExists = action !== "hard_delete";
    if (!stillExists && ids.includes(panel.selectedThreadId)) {
      panel.selectedThreadId = undefined;
    }
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 3200);
    await panel.refresh();
  } catch (error) {
    panel.lastActionNotice = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`);
    await panel.refresh({ silent: true });
  }
}

async function copyText(panel, text, label = "Copied") {
  if (!text) return;
  await vscode.env.clipboard.writeText(String(text));
  panel.lastActionNotice = `${label} copied`;
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2400);
  await panel.refresh({ silent: true });
}

async function openLogFile(panel, filePath) {
  if (!filePath) return;
  if (!fs.existsSync(filePath)) {
    vscode.window.showWarningMessage(`Codex-Managed-Agent: log file not found: ${filePath}`);
    return;
  }
  const uri = vscode.Uri.file(filePath);
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: false });
  panel.lastActionNotice = "Opened background log";
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2200);
}

async function openRepoFile(panel, relativePath) {
  const nextPath = String(relativePath || "").trim();
  if (!nextPath) return;
  const uri = vscode.Uri.joinPath(panel.extensionUri, nextPath);
  if (!fs.existsSync(uri.fsPath)) {
    vscode.window.showWarningMessage(`Codex-Managed-Agent: repo file not found: ${nextPath}`);
    return;
  }
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: false });
  panel.lastActionNotice = `Opened ${nextPath}`;
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2200);
}

async function renameThread(panel, threadId, currentTitle = "") {
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
    panel.lastActionNotice = `Renamed thread to ${title}`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
    await panel.refresh();
  } catch (error) {
    panel.lastActionNotice = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`);
    await panel.refresh({ silent: true });
  }
}

async function showThreadInCodex(panel, threadId, preferredTitle = "") {
  if (!threadId) return;
  const config = getConfig();
  const title = String(preferredTitle || "").trim();
  try {
    if (title) {
      await postRenameThread(config.baseUrl, threadId, title);
    }
    await postLifecycleAction(config.baseUrl, "unarchive", [threadId], true);
    await openInCodexEditor(threadId);
    panel.lastActionNotice = "Showed thread in Codex";
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
    await panel.refresh();
  } catch (error) {
    panel.lastActionNotice = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`);
    await panel.refresh({ silent: true });
  }
}

module.exports = {
  runLifecycleAction,
  copyText,
  openLogFile,
  openRepoFile,
  renameThread,
  showThreadInCodex,
};
