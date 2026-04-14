const vscode = require("vscode");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

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

function saveAutoContinueConfigs(panel) {
  return panel.storage.update("codexAgent.autoContinueConfigs", panel.autoContinueConfigs);
}

async function configureAutoContinue(panel, threadId, currentPrompt = "") {
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
  panel.autoContinueConfigs[threadId] = {
    prompt: String(prompt).trim(),
    remaining,
    total: remaining,
    active: true,
    lastTriggeredAt: 0,
    lastLaunchStatus: "armed",
    lastLogPath: "",
    lastError: "",
  };
  await saveAutoContinueConfigs(panel);
  panel.lastActionNotice = `Auto loop armed for ${remaining} run(s)`;
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2800);
  await panel.refresh({ silent: true });
}

async function setAutoContinue(panel, threadId, prompt, count) {
  if (!threadId) return;
  const nextPrompt = String(prompt || "").trim();
  const nextCount = Number(count);
  if (!nextPrompt || !Number.isInteger(nextCount) || nextCount <= 0) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: auto loop needs a prompt and a positive count");
    return;
  }
  panel.autoContinueConfigs[threadId] = {
    prompt: nextPrompt,
    remaining: nextCount,
    total: nextCount,
    active: true,
    lastTriggeredAt: 0,
    lastLaunchStatus: "armed",
    lastLogPath: "",
    lastError: "",
  };
  await saveAutoContinueConfigs(panel);
  panel.lastActionNotice = `Auto loop armed for ${nextCount} run(s)`;
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2800);
  await panel.refresh({ silent: true });
}

async function clearAutoContinue(panel, threadId) {
  if (!threadId || !panel.autoContinueConfigs[threadId]) return;
  delete panel.autoContinueConfigs[threadId];
  await saveAutoContinueConfigs(panel);
  panel.lastActionNotice = "Auto loop removed";
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2200);
  await panel.refresh({ silent: true });
}

function findThreadContext(panel, threadId) {
  const dashboard = panel.lastPayload?.dashboard;
  const thread = dashboard?.threads?.find((item) => item.id === threadId)
    || dashboard?.runningThreads?.find((item) => item.id === threadId)
    || (panel.lastPayload?.detail?.thread?.id === threadId ? panel.lastPayload.detail.thread : undefined);
  return thread || {};
}

function isProcessAlive(pid) {
  const value = Number(pid);
  if (!Number.isInteger(value) || value <= 0) return false;
  try {
    process.kill(value, 0);
    return true;
  } catch {
    return false;
  }
}

function inferAutoContinueResult(config) {
  if (!config) {
    return {
      state: "idle",
      label: "Idle",
      detail: "No background continue activity recorded yet.",
      tailLine: "",
    };
  }
  const pidAlive = isProcessAlive(config.lastPid);
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

function enrichAutoContinueConfigs(panel) {
  const result = {};
  Object.entries(panel.autoContinueConfigs || {}).forEach(([threadId, config]) => {
    const inferred = inferAutoContinueResult(config);
    result[threadId] = {
      ...config,
      lastResult: inferred,
    };
  });
  return result;
}

function launchCodexExecResume(threadId, prompt, cwd, reason = "manual") {
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

async function sendPromptToThread(panel, threadId, prompt) {
  if (!threadId) return;
  const nextPrompt = String(prompt || "").trim();
  if (!nextPrompt) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: prompt cannot be empty");
    return;
  }

  const thread = findThreadContext(panel, threadId);
  const fallbackCwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir();
  const cwd = thread.cwd || fallbackCwd;
  try {
    const launched = launchCodexExecResume(threadId, nextPrompt, cwd, "manual");
    panel.lastActionNotice = `Prompt queued in background · ${thread.title || threadId}`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
    await panel.refresh({ silent: true });
    return launched;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Codex-Managed-Agent: Failed to send prompt in background: ${detail}`);
    throw error;
  }
}

async function triggerAutoContinue(panel, threadId, config) {
  if (!threadId || !config || !config.active || config.remaining <= 0) return false;
  const now = Date.now();
  if (config.lastTriggeredAt && now - config.lastTriggeredAt < 8000) {
    return false;
  }
  const prompt = String(config.prompt || "continue").trim();
  const thread = findThreadContext(panel, threadId);
  const fallbackCwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir();
  const cwd = thread.cwd || fallbackCwd;
  try {
    const launched = launchCodexExecResume(threadId, prompt, cwd, "auto-loop");
    config.lastLaunchStatus = "queued";
    config.lastLogPath = launched.logPath || "";
    config.lastPid = launched.pid || 0;
    config.lastError = "";
  } catch (error) {
    config.lastLaunchStatus = "failed";
    config.lastError = error instanceof Error ? error.message : String(error);
    await saveAutoContinueConfigs(panel);
    panel.lastActionNotice = "Auto loop failed to queue";
    vscode.window.showWarningMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`);
    return false;
  }
  config.remaining -= 1;
  config.lastTriggeredAt = now;
  config.lastPrompt = prompt;
  if (config.remaining <= 0) {
    config.active = false;
  }
  await saveAutoContinueConfigs(panel);
  panel.lastActionNotice = `Auto loop queued in background · ${config.remaining} left`;
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 3200);
  return true;
}

module.exports = {
  saveAutoContinueConfigs,
  configureAutoContinue,
  setAutoContinue,
  clearAutoContinue,
  inferAutoContinueResult,
  enrichAutoContinueConfigs,
  launchCodexExecResume,
  sendPromptToThread,
  triggerAutoContinue,
};
