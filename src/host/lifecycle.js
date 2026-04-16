const vscode = require("vscode");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { getConfig, postLifecycleAction, postRenameThread, postScanCodexSessions } = require("./server");
const { openInCodexEditor, openNewCodexThread } = require("./codex-link");

const DEFAULT_NEW_AGENT_PROMPT = "创建一个新agent。你是一个专业的agent，听从用户指令，先等待用户的具体任务，并保持简洁汇报。";

function shellQuote(value) {
  return `'${String(value || "").replace(/'/g, `'\"'\"'`)}'`;
}

function loopStateDir(panel) {
  return path.join(panel.extensionUri.fsPath, ".codex-loop", "state");
}

function workspaceLoopRoot(workspacePath) {
  return path.join(workspacePath, ".codex-loop");
}

function workspaceLoopStateDir(workspacePath) {
  return path.join(workspaceLoopRoot(workspacePath), "state");
}

function pickWorkspacePath(panel) {
  const selectedThread = panel.lastPayload
    && panel.lastPayload.dashboard
    && Array.isArray(panel.lastPayload.dashboard.threads)
    ? panel.lastPayload.dashboard.threads.find((thread) => thread && thread.id === panel.selectedThreadId)
    : undefined;
  if (selectedThread && selectedThread.cwd && fs.existsSync(selectedThread.cwd)) {
    return selectedThread.cwd;
  }
  const firstFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
  if (firstFolder && firstFolder.uri && firstFolder.uri.fsPath) {
    return firstFolder.uri.fsPath;
  }
  return "";
}

function ensureFile(filePath, content) {
  if (fs.existsSync(filePath)) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function safeFileSlug(value, fallback = "agent") {
  return String(value || fallback).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || fallback;
}

function newAgentWorkspacePath() {
  const firstFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
  if (firstFolder && firstFolder.uri && firstFolder.uri.fsPath) {
    return firstFolder.uri.fsPath;
  }
  return os.homedir();
}

function readTextIfExists(filePath) {
  try {
    return filePath && fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  } catch {
    return "";
  }
}

function extractCodexSessionId(text) {
  const raw = String(text || "");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const event = JSON.parse(trimmed);
      const payload = event && event.payload;
      if (event && event.type === "session_meta" && payload && payload.id) {
        return String(payload.id);
      }
      if (payload && payload.type === "session_meta" && payload.id) {
        return String(payload.id);
      }
    } catch {
      // Fall back to text matching below.
    }
  }
  const match = raw.match(/session id:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
    || raw.match(/"id"\s*:\s*"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"/i);
  return match ? match[1] : "";
}

function writeNewAgentMeta(metaPath, meta) {
  writeJson(metaPath, meta);
}

async function pinThreadInPersistedUi(panel, threadId) {
  const nextThreadId = String(threadId || "").trim();
  if (!nextThreadId) return;
  const persisted = getPersistedUiState(panel);
  await savePersistedUiState(panel, Object.assign({}, persisted, {
    pinned: Object.assign({}, persisted.pinned || {}, {
      [nextThreadId]: true,
    }),
    boardAttached: Object.assign({}, persisted.boardAttached || {}, {
      [nextThreadId]: true,
    }),
  }));
}

async function replacePinnedThreadInPersistedUi(panel, previousThreadId, nextThreadId) {
  const previous = String(previousThreadId || "").trim();
  const next = String(nextThreadId || "").trim();
  const persisted = getPersistedUiState(panel);
  const pinned = Object.assign({}, persisted.pinned || {});
  const boardAttached = Object.assign({}, persisted.boardAttached || {});
  if (previous) delete pinned[previous];
  if (previous) delete boardAttached[previous];
  if (next) pinned[next] = true;
  if (next) boardAttached[next] = true;
  await savePersistedUiState(panel, Object.assign({}, persisted, { pinned, boardAttached }));
}

function createPendingNewAgentCard(prompt, cwd, launch) {
  const createdAt = Math.floor(Date.now() / 1000);
  const id = `pending-new-agent-${createdAt}-${Math.random().toString(16).slice(2, 8)}`;
  return {
    id,
    title: `Creating Codex agent · ${String(prompt || "default agent").slice(0, 90)}`,
    db_title: "Creating Codex agent",
    cwd,
    archived: 0,
    status: "recent",
    created_at: createdAt,
    updated_at: createdAt,
    created_at_iso: new Date(createdAt * 1000).toISOString(),
    updated_at_iso: new Date(createdAt * 1000).toISOString(),
    updated_age: "now",
    last_log_ts: createdAt,
    last_log_iso: new Date(createdAt * 1000).toISOString(),
    log_age: "now",
    log_count: 0,
    tokens_used: 0,
    storage_bytes: 0,
    storage_label: "0 B",
    source: "codex.exec.new",
    rollout_path: "",
    process: { pid: launch.pid || null, alive: true, summary: "Codex CLI session is starting. This placeholder will become the real thread after session import." },
    preview_logs: [],
    soft_deleted: false,
    history: [],
    compaction_count: 0,
    user_command_count: 0,
    assistant_message_count: 0,
    rollout_user_message_count: 0,
    pending_new_agent: true,
    pending_log_path: launch.logPath,
  };
}

async function addPendingNewAgentCard(panel, card) {
  if (!card || !card.id) return;
  panel.pendingNewAgentCards = [card, ...(panel.pendingNewAgentCards || []).filter((item) => item && item.id !== card.id)].slice(0, 8);
  await pinThreadInPersistedUi(panel, card.id);
  panel.selectedThreadId = card.id;
  await panel.refresh({ silent: true });
}

async function resolvePendingNewAgentCard(panel, pendingId, threadId) {
  const nextThreadId = String(threadId || "").trim();
  const previousId = String(pendingId || "").trim();
  if (previousId) {
    panel.pendingNewAgentCards = (panel.pendingNewAgentCards || []).filter((item) => item && item.id !== previousId);
  }
  await replacePinnedThreadInPersistedUi(panel, previousId, nextThreadId);
}

function launchCodexExecNewAgent(prompt, cwd) {
  const logsDir = path.join(os.homedir(), ".codex-managed-agent", "logs");
  fs.mkdirSync(logsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logPath = path.join(logsDir, `new-agent-${stamp}.log`);
  const metaPath = `${logPath}.meta.json`;
  const startedAt = new Date().toISOString();
  const meta = {
    source: "manual_cli",
    thread_id: "",
    workspace: cwd,
    started_at: startedAt,
    command_kind: "codex.exec.new",
    log_path: logPath,
  };
  writeNewAgentMeta(metaPath, meta);
  const out = fs.openSync(logPath, "a");
  let child;
  try {
    child = childProcess.spawn(
      "codex",
      ["exec", "--skip-git-repo-check", "--json", "--yolo", prompt],
      {
        cwd,
        detached: true,
        stdio: ["ignore", out, out],
        env: { ...process.env, TERM: process.env.TERM || "xterm-256color" },
      },
    );
  } finally {
    try {
      fs.closeSync(out);
    } catch {
      // ignore close failure
    }
  }
  child.once("error", (error) => {
    const message = error instanceof Error ? error.message : String(error);
    fs.appendFile(logPath, `\n[codex-managed-agent] spawn error: ${message}\n`, () => {});
  });
  child.unref();
  return { pid: child.pid, child, logPath, metaPath, meta };
}

async function importNewAgentSession(panel, launch, attempt = 1) {
  const logText = readTextIfExists(launch.logPath);
  const parsedThreadId = extractCodexSessionId(logText);
  const meta = Object.assign({}, launch.meta, {
    thread_id: parsedThreadId || launch.meta.thread_id || "",
    updated_at: new Date().toISOString(),
  });
  writeNewAgentMeta(launch.metaPath, meta);

  const service = await panel.ensureServer({ forceStart: true });
  if (!service.ok) {
    throw new Error(service.message || "Server not reachable");
  }
  const result = await postScanCodexSessions(service.baseUrl, 5);
  const imported = Array.isArray(result && result.imported) ? result.imported : [];
  const importedId = imported.length ? String(imported[0].id || "") : "";
  const threadId = parsedThreadId || importedId;
  if (threadId) {
    await resolvePendingNewAgentCard(panel, launch.pendingCardId, threadId);
    panel.selectedThreadId = threadId;
  }
  await panel.refresh({ silent: true });
  panel.lastActionNotice = threadId
    ? "Codex agent created, pinned, and imported"
    : (attempt < 2 ? "Codex agent started; waiting for session import" : "Codex agent started; no new session found yet");
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 3200);
  if (!threadId && attempt < 2) {
    setTimeout(() => {
      importNewAgentSession(panel, launch, attempt + 1).catch((error) => {
        const detail = error instanceof Error ? error.message : String(error);
        vscode.window.showWarningMessage(`Codex-Managed-Agent: Failed to import Codex agent session: ${detail}`);
      });
    }, 6000);
  }
}

function buildLoopPromptTemplate(title, threadId) {
  return `# Codex Loop Prompt

Continue the loop thread for this workspace.

Thread ID: ${threadId}
Primary thread title: ${title}

On each tick:
1. Read \`.claude/plans/ACTIVE_PLAN.md\`.
2. Read \`ROADMAP.md\` if it exists.
3. Inspect the current repository state before changing anything.
4. Execute one bounded next step only.
5. Leave the workspace in a clean, inspectable state.
6. Record the next handoff clearly in the active plan or a nearby evolution note.

Keep iterations small, concrete, and safe.
`;
}

function buildActivePlanTemplate(title, threadId) {
  return `# ACTIVE PLAN

## Loop Thread
- Title: ${title}
- Thread ID: ${threadId}

## Current Goal
- Define the next bounded milestone for this loop thread.

## Next Slice
- [ ] Inspect the current workspace state
- [ ] Choose one small concrete step
- [ ] Execute and verify that step
- [ ] Leave a clear handoff for the next tick
`;
}

function buildRoadmapTemplate(title) {
  return `# ROADMAP

## Project
- Primary loop thread: ${title}

## Guardrails
- Keep iterations small and verifiable.
- Prefer updating existing context files over scattering state.
- Leave a clear next handoff after every pass.
`;
}

function initializeLoopWorkspace(workspacePath, title, threadId, intervalMinutes = 1) {
  const loopRoot = workspaceLoopRoot(workspacePath);
  const stateDir = workspaceLoopStateDir(workspacePath);
  const promptPath = path.join(loopRoot, "prompt.md");
  const activePlanPath = path.join(workspacePath, ".claude", "plans", "ACTIVE_PLAN.md");
  const roadmapPath = path.join(workspacePath, "ROADMAP.md");
  const nowIso = new Date().toISOString();

  fs.mkdirSync(path.join(stateDir, "logs"), { recursive: true });
  ensureFile(promptPath, buildLoopPromptTemplate(title, threadId));
  ensureFile(activePlanPath, buildActivePlanTemplate(title, threadId));
  ensureFile(roadmapPath, buildRoadmapTemplate(title));
  fs.writeFileSync(path.join(stateDir, "thread_id.txt"), `${threadId}\n`, "utf8");
  writeJson(path.join(stateDir, "daemon_launcher.json"), {
    workspace: workspacePath,
    prompt_file: promptPath,
    launcher: "initialized",
    initialized_at: nowIso,
    title,
  });
  writeJson(path.join(stateDir, "daemon_heartbeat.json"), {
    phase: "stopped",
    interval_minutes: intervalMinutes,
    updated_at: nowIso,
    stopped_at: nowIso,
  });
  writeJson(path.join(stateDir, "status.json"), {
    phase: "stopped",
    thread_id: threadId,
    workspace: workspacePath,
    prompt_file: promptPath,
    started_at: nowIso,
    finished_at: nowIso,
    last_message_preview: `Loop workspace initialized for ${title}`,
    raw_log_path: "",
  });
  return {
    stateDir,
    promptPath,
    activePlanPath,
    roadmapPath,
    intervalMinutes,
  };
}

function writeLoopManagedThread(panel, threadId, stateDir = loopStateDir(panel)) {
  const nextThreadId = String(threadId || "").trim();
  if (!nextThreadId) return false;
  if (!fs.existsSync(stateDir)) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: codex-loop state directory not found");
    return false;
  }
  fs.writeFileSync(path.join(stateDir, "thread_id.txt"), `${nextThreadId}\n`, "utf8");
  return true;
}

function resolveCodexLoopAutomationScript() {
  const codexHome = process.env.CODEX_HOME
    ? path.resolve(process.env.CODEX_HOME)
    : path.join(os.homedir(), ".codex");
  return path.join(codexHome, "skills", "codex-loop", "scripts", "codex_loop_automation.py");
}

function buildLoopDaemonCommandForStateDir(panel, stateDir, workspacePath, promptPath, threadId, intervalMinutes) {
  const nextThreadId = String(threadId || "").trim();
  const nextInterval = Number.parseInt(String(intervalMinutes || "").trim(), 10);
  if (!nextThreadId || !Number.isInteger(nextInterval) || nextInterval <= 0) return "";
  const scriptPath = resolveCodexLoopAutomationScript();
  if (!fs.existsSync(scriptPath)) {
    vscode.window.showWarningMessage(`Codex-Managed-Agent: codex-loop automation script not found: ${scriptPath}`);
    return "";
  }
  const nextPromptPath = String(promptPath || "").trim();
  if (!nextPromptPath || !fs.existsSync(nextPromptPath)) {
    vscode.window.showWarningMessage(`Codex-Managed-Agent: codex-loop prompt file not found: ${promptPath}`);
    return "";
  }
  const nextWorkspace = String(workspacePath || "").trim();
  if (!nextWorkspace) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: missing loop workspace path");
    return "";
  }
  return [
    "python3",
    shellQuote(scriptPath),
    "daemon",
    "--workspace",
    shellQuote(nextWorkspace),
    "--prompt-file",
    shellQuote(nextPromptPath),
    "--state-dir",
    shellQuote(stateDir),
    "--thread-id",
    shellQuote(nextThreadId),
    "--interval-minutes",
    String(nextInterval),
    "--dangerous",
  ].join(" ");
}

function buildLoopDaemonCommand(panel, threadId, intervalMinutes) {
  return buildLoopDaemonCommandForStateDir(
    panel,
    loopStateDir(panel),
    panel.extensionUri.fsPath,
    path.join(panel.extensionUri.fsPath, ".codex-loop", "prompt.md"),
    threadId,
    intervalMinutes,
  );
}

async function stopLoopDaemon(panel) {
  const stateDir = loopStateDir(panel);
  if (!fs.existsSync(stateDir)) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: codex-loop state directory not found");
    return;
  }
  fs.writeFileSync(path.join(stateDir, "stop.flag"), "stop\n", "utf8");
  panel.lastActionNotice = "Loop stop requested";
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
  await panel.refresh({ silent: true });
}

async function startLoopDaemon(panel) {
  const loopDaemon = panel.lastPayload && panel.lastPayload.loopDaemon ? panel.lastPayload.loopDaemon : {};
  if (loopDaemon.running) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: codex-loop daemon is already running");
    return;
  }
  const nextThreadId = String(loopDaemon.threadId || "").trim();
  const nextInterval = Number.parseInt(String(loopDaemon.intervalMinutes || "").trim(), 10);
  if (!nextThreadId || !Number.isInteger(nextInterval) || nextInterval <= 0) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: missing loop thread or interval for start");
    return;
  }
  if (!writeLoopManagedThread(panel, nextThreadId)) return;
  await panel.refresh({ silent: true });
  const command = buildLoopDaemonCommand(panel, nextThreadId, nextInterval);
  if (!command) return;
  await panel.runCommandInTerminal(command, "Loop start");
}

async function startLoopDaemonAt(panel, options = {}) {
  const stateDir = String(options.stateDir || "").trim();
  const workspacePath = String(options.workspace || "").trim();
  const promptPath = String(options.promptFile || "").trim();
  const threadId = String(options.threadId || "").trim();
  const intervalMinutes = Number.parseInt(String(options.intervalMinutes || "").trim(), 10);
  if (!stateDir || !workspacePath || !promptPath || !threadId || !Number.isInteger(intervalMinutes) || intervalMinutes <= 0) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: missing loop daemon metadata for start");
    return;
  }
  if (!writeLoopManagedThread(panel, threadId, stateDir)) return;
  const command = buildLoopDaemonCommandForStateDir(panel, stateDir, workspacePath, promptPath, threadId, intervalMinutes);
  if (!command) return;
  await panel.runCommandInTerminal(command, "Loop start");
}

function patchThreadInPayload(panel, threadId, updates) {
  if (!panel.lastPayload || !threadId) return;
  const nextUpdates = updates || {};
  const patch = (thread) => {
    if (!thread || thread.id !== threadId) return thread;
    return {
      ...thread,
      ...nextUpdates,
      db_title: nextUpdates.title !== undefined ? nextUpdates.title : thread.db_title,
    };
  };
  const dashboard = panel.lastPayload.dashboard || {};
  panel.lastPayload = {
    ...panel.lastPayload,
    dashboard: {
      ...dashboard,
      threads: Array.isArray(dashboard.threads) ? dashboard.threads.map(patch) : dashboard.threads,
      runningThreads: Array.isArray(dashboard.runningThreads) ? dashboard.runningThreads.map(patch) : dashboard.runningThreads,
    },
    detail: panel.lastPayload.detail && panel.lastPayload.detail.thread && panel.lastPayload.detail.thread.id === threadId
      ? {
          ...panel.lastPayload.detail,
          thread: patch(panel.lastPayload.detail.thread),
        }
      : panel.lastPayload.detail,
  };
}

function removeThreadFromPayload(panel, threadId) {
  if (!panel.lastPayload || !threadId) return;
  const dashboard = panel.lastPayload.dashboard || {};
  panel.lastPayload = {
    ...panel.lastPayload,
    dashboard: {
      ...dashboard,
      threads: Array.isArray(dashboard.threads) ? dashboard.threads.filter((thread) => thread && thread.id !== threadId) : dashboard.threads,
      runningThreads: Array.isArray(dashboard.runningThreads) ? dashboard.runningThreads.filter((thread) => thread && thread.id !== threadId) : dashboard.runningThreads,
    },
    detail: panel.lastPayload.detail && panel.lastPayload.detail.thread && panel.lastPayload.detail.thread.id === threadId
      ? {
          ...panel.lastPayload.detail,
          thread: undefined,
        }
      : panel.lastPayload.detail,
  };
}

function patchThreadsInPayload(panel, threadIds, updates) {
  const ids = new Set((threadIds || []).filter(Boolean));
  if (!ids.size) return;
  ids.forEach((threadId) => patchThreadInPayload(panel, threadId, updates));
}

function addThreadToPayload(panel, thread) {
  if (!panel.lastPayload || !thread || !thread.id) return;
  const dashboard = panel.lastPayload.dashboard || {};
  const currentThreads = Array.isArray(dashboard.threads) ? dashboard.threads : [];
  const withoutDuplicate = currentThreads.filter((item) => item && item.id !== thread.id);
  panel.lastPayload = {
    ...panel.lastPayload,
    dashboard: {
      ...dashboard,
      threads: [thread, ...withoutDuplicate],
    },
  };
}

function removeThreadsFromPayload(panel, threadIds) {
  const ids = new Set((threadIds || []).filter(Boolean));
  if (!ids.size || !panel.lastPayload) return;
  const dashboard = panel.lastPayload.dashboard || {};
  panel.lastPayload = {
    ...panel.lastPayload,
    dashboard: {
      ...dashboard,
      threads: Array.isArray(dashboard.threads) ? dashboard.threads.filter((thread) => thread && !ids.has(thread.id)) : dashboard.threads,
      runningThreads: Array.isArray(dashboard.runningThreads) ? dashboard.runningThreads.filter((thread) => thread && !ids.has(thread.id)) : dashboard.runningThreads,
    },
    detail: panel.lastPayload.detail && panel.lastPayload.detail.thread && ids.has(panel.lastPayload.detail.thread.id)
      ? {
          ...panel.lastPayload.detail,
          thread: undefined,
        }
      : panel.lastPayload.detail,
  };
}

function lifecyclePatchForAction(action) {
  if (action === "archive") return { archived: true, soft_deleted: false };
  if (action === "unarchive") return { archived: false };
  if (action === "soft_delete") return { soft_deleted: true, archived: false };
  if (action === "restore") return { soft_deleted: false, archived: false };
  return undefined;
}

function normalizeLifecycleIds(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    if (!item) return "";
    if (typeof item === "string") return item.trim();
    if (typeof item === "object") return String(item.id || item.thread_id || item.threadId || "").trim();
    return String(item).trim();
  }).filter(Boolean);
}

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
    const skippedIds = new Set(normalizeLifecycleIds(result.skipped));
    if (!stillExists && ids.includes(panel.selectedThreadId)) {
      panel.selectedThreadId = undefined;
    }
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 3200);
    if (ids.length === 1) {
      const threadId = ids[0];
      const patch = lifecyclePatchForAction(action);
      if (action === "hard_delete") {
        removeThreadFromPayload(panel, threadId);
        panel.postMessage({
          type: "threadRemoved",
          threadId,
        });
        return;
      }
      if (patch) {
        patchThreadInPayload(panel, threadId, patch);
        panel.postMessage({
          type: "threadPatched",
          threadId,
          patch,
        });
        return;
      }
    }
    if (ids.length > 1) {
      const updatedIds = normalizeLifecycleIds(result.updated);
      const deletedIds = normalizeLifecycleIds(result.deleted);
      const fallbackChangedIds = ids.filter((id) => !skippedIds.has(id));
      const patch = lifecyclePatchForAction(action);
      if (action === "hard_delete") {
        const removedIds = deletedIds.length ? deletedIds : fallbackChangedIds;
        if (removedIds.length) {
          removeThreadsFromPayload(panel, removedIds);
          panel.postMessage({
            type: "threadsRemoved",
            threadIds: removedIds,
          });
          return;
        }
      }
      if (patch) {
        const patchedIds = updatedIds.length ? updatedIds : fallbackChangedIds;
        if (patchedIds.length) {
          patchThreadsInPayload(panel, patchedIds, patch);
          panel.postMessage({
            type: "threadsPatched",
            threadIds: patchedIds,
            patch,
          });
          return;
        }
      }
    }
    await panel.refresh();
  } catch (error) {
    panel.lastActionNotice = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`);
    if (ids.length === 1) return;
    await panel.refresh({ silent: true });
  }
}

async function copyText(panel, text, label = "Copied") {
  if (!text) return;
  await vscode.env.clipboard.writeText(String(text));
  panel.lastActionNotice = `${label} copied`;
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2400);
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
    patchThreadInPayload(panel, threadId, { title });
    panel.lastActionNotice = `Renamed thread to ${title}`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
    panel.postMessage({
      type: "threadPatched",
      threadId,
      patch: { title },
    });
  } catch (error) {
    panel.lastActionNotice = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`);
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
    const patch = Object.assign({ archived: false }, title ? { title } : {});
    patchThreadInPayload(panel, threadId, patch);
    await openInCodexEditor(threadId);
    panel.lastActionNotice = "Showed thread in Codex";
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
    panel.postMessage({
      type: "threadPatched",
      threadId,
      patch,
    });
  } catch (error) {
    panel.lastActionNotice = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`);
  }
}

async function createNewThread(panel) {
  const input = await vscode.window.showInputBox({
    title: "Create Codex Agent",
    prompt: "输入新 agent 的任务需求；留空创建默认专业 agent。",
    placeHolder: "输入新 agent 的任务需求；留空创建默认专业 agent",
    ignoreFocusOut: true,
  });
  if (input === undefined) return;
  const prompt = String(input || "").trim() || DEFAULT_NEW_AGENT_PROMPT;
  const cwd = newAgentWorkspacePath();
  let launch;
  let spawnFailed = false;
  try {
    launch = launchCodexExecNewAgent(prompt, cwd);
    launch.child.once("error", async (error) => {
      spawnFailed = true;
      await resolvePendingNewAgentCard(panel, launch.pendingCardId, "");
      await panel.refresh({ silent: true });
      const detail = error instanceof Error ? error.message : String(error);
      panel.lastActionNotice = "CLI agent creation failed; use Refresh or Scan Sessions after retrying";
      vscode.window.showWarningMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}: ${detail}`);
    });
    panel.lastActionNotice = "Creating Codex agent...";
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 3200);
    vscode.window.showInformationMessage(`Codex-Managed-Agent: Creating Codex agent in ${cwd}`);
    const pendingCard = createPendingNewAgentCard(prompt, cwd, launch);
    launch.pendingCardId = pendingCard.id;
    await addPendingNewAgentCard(panel, pendingCard);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    panel.lastActionNotice = "Failed to create Codex agent; use Refresh or Scan Sessions after retrying";
    vscode.window.showWarningMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}: ${detail}`);
    return;
  }

  setTimeout(() => {
    if (spawnFailed) return;
    importNewAgentSession(panel, launch).catch((error) => {
      const detail = error instanceof Error ? error.message : String(error);
      panel.lastActionNotice = "Codex agent started; import is still pending";
      vscode.window.showWarningMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}. Scan Sessions can import it later. ${detail}`);
    });
  }, 2500);
}

async function resumeThreadBySessionId(panel) {
  const suggestedSessionId = String(panel.selectedThreadId || "").startsWith("pending-new-agent-")
    ? ""
    : String(panel.selectedThreadId || "");
  const sessionIdInput = await vscode.window.showInputBox({
    title: "Resume Codex Session",
    prompt: "输入要 resume 的 Codex session id。",
    placeHolder: "019d91d7-6a82-7153-bd63-f8d04af74319",
    value: suggestedSessionId,
    ignoreFocusOut: true,
    validateInput: (value) => String(value || "").trim() ? undefined : "Session id cannot be empty",
  });
  if (sessionIdInput === undefined) return;
  const sessionId = String(sessionIdInput || "").trim();
  if (!sessionId) return;

  const cwd = pickWorkspacePath(panel) || newAgentWorkspacePath();
  const terminal = vscode.window.createTerminal({
    name: "Codex Resume",
    cwd,
  });
  terminal.show(true);
  terminal.sendText(`codex resume ${shellQuote(sessionId)}`, true);
  panel.selectedThreadId = sessionId;
  panel.lastActionNotice = `Resume command opened for ${sessionId}`;
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 3200);
  await panel.refresh({ silent: true });
}

async function createThread(panel) {
  const choice = await vscode.window.showQuickPick(
    [
      {
        label: "New",
        description: "Create a new Codex agent",
        detail: "输入新的任务需求，行为和之前的 New Thread 一样。",
        value: "new",
      },
      {
        label: "Resume",
        description: "Resume an existing Codex session",
        detail: "输入 session id，然后在终端运行 codex resume。",
        value: "resume",
      },
    ],
    {
      title: "New Thread",
      placeHolder: "Choose whether to create a new agent or resume an existing session",
      ignoreFocusOut: true,
    },
  );
  if (!choice) return;
  if (choice.value === "resume") {
    await resumeThreadBySessionId(panel);
    return;
  }
  await createNewThread(panel);
}

async function createLoopThread(panel) {
  const created = await openNewCodexThread();
  if (!created.ok) {
    const detail = created.error || "Could not open the Codex sidebar";
    panel.lastActionNotice = "Failed to open Codex sidebar for a new loop thread";
    vscode.window.showErrorMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}: ${detail}`);
    return;
  }
  panel.lastActionNotice = "Codex sidebar opened. Send the first message, then return here and use Manage Loop on the real thread.";
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 4200);
  vscode.window.showInformationMessage("Codex-Managed-Agent: Codex sidebar opened. Send the first message, then use Manage Loop on the created thread.");
}

async function setLoopManagedThread(panel, threadId) {
  const nextThreadId = String(threadId || "").trim();
  if (!writeLoopManagedThread(panel, nextThreadId)) return;
  panel.lastActionNotice = "Loop target updated";
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
  await panel.refresh({ silent: true });
}

async function runLoopIntervalPreset(panel, threadId, intervalMinutes) {
  const nextThreadId = String(threadId || "").trim();
  const nextInterval = Number.parseInt(String(intervalMinutes || "").trim(), 10);
  if (!nextThreadId || !Number.isInteger(nextInterval) || nextInterval <= 0) return;
  if (!writeLoopManagedThread(panel, nextThreadId)) return;
  await panel.refresh({ silent: true });
  const command = buildLoopDaemonCommand(panel, nextThreadId, nextInterval);
  if (!command) return;
  await panel.runCommandInTerminal(command, `Loop ${nextInterval} min preset`);
}

async function promptLoopIntervalPreset(panel, threadId) {
  const nextThreadId = String(threadId || "").trim();
  if (!nextThreadId) return;
  const currentInterval = panel.lastPayload && panel.lastPayload.loopDaemon && panel.lastPayload.loopDaemon.intervalMinutes
    ? String(panel.lastPayload.loopDaemon.intervalMinutes)
    : "1";
  const input = await vscode.window.showInputBox({
    title: "Custom Codex Loop Interval",
    prompt: "Enter the loop interval in whole minutes",
    value: currentInterval,
    ignoreFocusOut: true,
    validateInput: (value) => {
      const next = Number.parseInt(String(value || "").trim(), 10);
      return Number.isInteger(next) && next > 0 ? undefined : "Enter a whole number of minutes greater than 0";
    },
  });
  if (input === undefined) return;
  await runLoopIntervalPreset(panel, nextThreadId, input);
}

async function restartLoopDaemon(panel) {
  const loopDaemon = panel.lastPayload && panel.lastPayload.loopDaemon ? panel.lastPayload.loopDaemon : {};
  if (!loopDaemon.running) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: no running codex-loop daemon to restart");
    return;
  }
  const nextThreadId = String(loopDaemon.threadId || "").trim();
  const nextInterval = Number.parseInt(String(loopDaemon.intervalMinutes || "").trim(), 10);
  if (!nextThreadId || !Number.isInteger(nextInterval) || nextInterval <= 0) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: missing loop thread or interval for restart");
    return;
  }
  if (!writeLoopManagedThread(panel, nextThreadId)) return;
  const stateDir = loopStateDir(panel);
  const startCommand = buildLoopDaemonCommand(panel, nextThreadId, nextInterval);
  if (!startCommand) return;
  const restartCommand = [
    "printf",
    shellQuote("stop\n"),
    ">",
    shellQuote(path.join(stateDir, "stop.flag")),
    "&&",
    "while",
    "[",
    "-f",
    shellQuote(path.join(stateDir, "daemon.pid")),
    "];",
    "do",
    "sleep",
    "1;",
    "done",
    "&&",
    startCommand,
  ].join(" ");
  await panel.runCommandInTerminal(restartCommand, "Loop restart");
  panel.lastActionNotice = "Loop restart requested";
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
  await panel.refresh({ silent: true });
}

async function restartLoopDaemonAt(panel, options = {}) {
  const stateDir = String(options.stateDir || "").trim();
  const workspacePath = String(options.workspace || "").trim();
  const promptPath = String(options.promptFile || "").trim();
  const threadId = String(options.threadId || "").trim();
  const intervalMinutes = Number.parseInt(String(options.intervalMinutes || "").trim(), 10);
  if (!stateDir || !workspacePath || !promptPath || !threadId || !Number.isInteger(intervalMinutes) || intervalMinutes <= 0) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: missing loop daemon metadata for restart");
    return;
  }
  if (!writeLoopManagedThread(panel, threadId, stateDir)) return;
  const startCommand = buildLoopDaemonCommandForStateDir(panel, stateDir, workspacePath, promptPath, threadId, intervalMinutes);
  if (!startCommand) return;
  const restartCommand = [
    "printf",
    shellQuote("stop\n"),
    ">",
    shellQuote(path.join(stateDir, "stop.flag")),
    "&&",
    "while",
    "[",
    "-f",
    shellQuote(path.join(stateDir, "daemon.pid")),
    "];",
    "do",
    "sleep",
    "1;",
    "done",
    "&&",
    startCommand,
  ].join(" ");
  await panel.runCommandInTerminal(restartCommand, "Loop restart");
}

async function stopLoopDaemonAt(panel, stateDir) {
  const nextStateDir = String(stateDir || "").trim();
  if (!nextStateDir || !fs.existsSync(nextStateDir)) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: codex-loop state directory not found");
    return;
  }
  fs.writeFileSync(path.join(nextStateDir, "stop.flag"), "stop\n", "utf8");
  panel.lastActionNotice = "Loop stop requested";
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
  await panel.refresh({ silent: true });
}

async function attachLoopTmux(panel, sessionName) {
  const nextSession = String(sessionName || "").trim();
  if (!nextSession) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: missing tmux session for loop daemon");
    return;
  }
  await panel.runCommandInTerminal(`tmux attach -t ${shellQuote(nextSession)}`, "Loop tmux attach");
}

async function tailLoopLog(panel, filePath) {
  const nextPath = String(filePath || "").trim();
  if (!nextPath) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: missing log path for loop daemon");
    return;
  }
  await panel.runCommandInTerminal(`tail -f ${shellQuote(nextPath)}`, "Loop log tail");
}

function getPersistedUiState(panel) {
  return Object.assign({}, panel.storage.get("codexAgent.persistedUiState", {}));
}

async function savePersistedUiState(panel, nextState) {
  await panel.storage.update("codexAgent.persistedUiState", nextState || {});
}

function nextSuggestedCardLabel(panel) {
  const persisted = getPersistedUiState(panel);
  const labels = Object.values((persisted && persisted.cardLabels) || {}).map((value) => String(value || "").trim());
  const used = new Set();
  labels.forEach((value) => {
    const match = value.match(/^card\s+(\d+)$/i);
    if (match) used.add(Number(match[1]));
  });
  let next = 1;
  while (used.has(next)) next += 1;
  return `Card ${next}`;
}

function normalizeBoardTabName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 36);
}

function normalizeBoardTabOrder(list = []) {
  return list
    .map(normalizeBoardTabName)
    .filter((name, index, arr) => name && arr.indexOf(name) === index);
}

function combinedBoardTabOrder(persistedState = {}, boardTabOrder = []) {
  return normalizeBoardTabOrder([
    ...(Array.isArray(persistedState.boardTabOrder) ? persistedState.boardTabOrder : []),
    ...boardTabOrder,
  ]);
}

async function editCardLabel(panel, threadId, currentLabel = "", currentTitle = "", suggestedLabel = "") {
  const nextThreadId = String(threadId || "").trim();
  if (!nextThreadId) return;
  const fallback = String(suggestedLabel || "").trim() || nextSuggestedCardLabel(panel);
  const value = String(currentLabel || "").trim() || fallback;
  const nextLabel = await vscode.window.showInputBox({
    title: "Set Card Name",
    prompt: "This is the card-local display name used inside Codex-Managed-Agent",
    value,
    ignoreFocusOut: true,
    validateInput: (input) => String(input || "").trim() ? undefined : "Card Name cannot be empty",
  });
  if (nextLabel === undefined) return;
  const trimmed = String(nextLabel || "").trim() || fallback;
  const persisted = getPersistedUiState(panel);
  const nextState = Object.assign({}, persisted, {
    cardLabels: Object.assign({}, persisted.cardLabels || {}, {
      [nextThreadId]: trimmed,
    }),
  });
  await savePersistedUiState(panel, nextState);
  panel.postMessage({
    type: "cardLabelPatched",
    threadId: nextThreadId,
    label: trimmed,
  });
  panel.lastActionNotice = `Card Name set to ${trimmed}`;
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2200);
}

async function setCardLabel(panel, threadId, label = "") {
  const nextThreadId = String(threadId || "").trim();
  if (!nextThreadId) return;
  const trimmed = String(label || "").trim();
  const persisted = getPersistedUiState(panel);
  const cardLabels = Object.assign({}, persisted.cardLabels || {});
  if (trimmed) {
    cardLabels[nextThreadId] = trimmed;
  } else {
    delete cardLabels[nextThreadId];
  }
  const nextState = Object.assign({}, persisted, { cardLabels });
  await savePersistedUiState(panel, nextState);
  panel.postMessage({
    type: "cardLabelPatched",
    threadId: nextThreadId,
    label: trimmed,
  });
  panel.lastActionNotice = trimmed ? `Card Name set to ${trimmed}` : "Card Name cleared";
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 1800);
}

async function chooseBoardTab(panel, threadId, currentBoardTab = "", boardTabOrder = [], activeBoardTab = "all") {
  const nextThreadId = String(threadId || "").trim();
  if (!nextThreadId) return;
  const current = normalizeBoardTabName(currentBoardTab);
  const persisted = getPersistedUiState(panel);
  const order = combinedBoardTabOrder(persisted, boardTabOrder);
  const picks = [];
  if (order.length) {
    picks.push(...order.map((name) => ({
      label: name,
      description: current === name ? "Current tab" : "",
      action: "select",
      value: name,
    })));
  }
  picks.push({
    label: "+ New Tab",
    description: "Create a new group and assign this card to it",
    action: "new",
  });
  if (current) {
    picks.push({
      label: "Remove from Tab",
      description: "Keep the card on Board but clear its tab group",
      action: "clear",
    });
  }
  const picked = await vscode.window.showQuickPick(picks, {
    title: "Choose Tab Group",
    placeHolder: current || "Select a tab for this card",
    ignoreFocusOut: true,
  });
  if (!picked) return;
  let nextTab = "";
  let nextOrder = [...order];
  let nextActiveBoardTab = normalizeBoardTabName(activeBoardTab) || normalizeBoardTabName(persisted.activeBoardTab) || "all";
  if (picked.action === "new") {
    const created = await vscode.window.showInputBox({
      title: "Create Tab Group",
      prompt: "Tab is the manual group used on the Board",
      value: "",
      ignoreFocusOut: true,
      validateInput: (input) => {
        const normalized = normalizeBoardTabName(input);
        if (!normalized) return "Tab name cannot be empty";
        if (normalized.toLowerCase() === "all") return "\"all\" is reserved";
        return undefined;
      },
    });
    if (created === undefined) return;
    nextTab = normalizeBoardTabName(created);
    if (!nextTab) {
      vscode.window.showWarningMessage("Codex-Managed-Agent: Tab name cannot be empty");
      return;
    }
    if (nextTab.toLowerCase() === "all") {
      vscode.window.showWarningMessage("Codex-Managed-Agent: \"all\" is reserved and cannot be used as a tab name");
      return;
    }
    if (nextOrder.includes(nextTab)) {
      nextActiveBoardTab = nextTab;
      vscode.window.showInformationMessage(`Codex-Managed-Agent: Switched to existing tab ${nextTab}`);
    } else {
      nextOrder = normalizeBoardTabOrder([...nextOrder, nextTab]);
      nextActiveBoardTab = nextTab;
    }
  } else if (picked.action === "clear") {
    nextTab = "";
  } else {
    nextTab = normalizeBoardTabName(picked.value || picked.label || "");
  }
  const nextAssignments = Object.assign({}, persisted.boardTabAssignments || {});
  if (nextTab) nextAssignments[nextThreadId] = nextTab;
  else delete nextAssignments[nextThreadId];
  const nextAttached = Object.assign({}, persisted.boardAttached || {});
  if (nextTab) nextAttached[nextThreadId] = true;
  const nextState = Object.assign({}, persisted, {
    boardTabAssignments: nextAssignments,
    boardTabOrder: nextOrder,
    boardAttached: nextAttached,
    activeBoardTab: nextActiveBoardTab,
  });
  await savePersistedUiState(panel, nextState);
  panel.postMessage({
    type: "boardTabPatched",
    threadId: nextThreadId,
    boardTab: nextTab,
    boardTabOrder: nextOrder,
    activeBoardTab: nextState.activeBoardTab,
  });
  panel.lastActionNotice = nextTab ? `Moved card into tab ${nextTab}` : "Cleared card tab";
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2200);
}

async function createBoardTab(panel, boardTabOrder = [], activeBoardTab = "all") {
  const created = await vscode.window.showInputBox({
    title: "Create Tab Group",
    prompt: "Create a new manual Board group",
    value: "",
    ignoreFocusOut: true,
    validateInput: (input) => {
      const normalized = normalizeBoardTabName(input);
      if (!normalized) return "Tab name cannot be empty";
      if (normalized.toLowerCase() === "all") return "\"all\" is reserved";
      return undefined;
    },
  });
  if (created === undefined) return;
  const nextTab = normalizeBoardTabName(created);
  const persisted = getPersistedUiState(panel);
  const baseOrder = combinedBoardTabOrder(persisted, boardTabOrder);
  if (!nextTab) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: Tab name cannot be empty");
    return;
  }
  if (nextTab.toLowerCase() === "all") {
    vscode.window.showWarningMessage("Codex-Managed-Agent: \"all\" is reserved and cannot be used as a tab name");
    return;
  }
  const exists = baseOrder.includes(nextTab);
  const nextOrder = exists ? baseOrder : normalizeBoardTabOrder([...baseOrder, nextTab]);
  const nextState = Object.assign({}, persisted, {
    boardTabOrder: nextOrder,
    activeBoardTab: nextTab || normalizeBoardTabName(activeBoardTab) || "all",
  });
  await savePersistedUiState(panel, nextState);
  panel.postMessage({
    type: "boardTabPatched",
    threadId: "",
    boardTab: "",
    boardTabOrder: nextOrder,
    activeBoardTab: nextState.activeBoardTab,
  });
  if (exists) {
    vscode.window.showInformationMessage(`Codex-Managed-Agent: Switched to existing tab ${nextTab}`);
  } else {
    vscode.window.showInformationMessage(`Codex-Managed-Agent: Created tab ${nextTab}`);
  }
  panel.lastActionNotice = exists ? `Switched to existing tab ${nextTab}` : `Created tab ${nextTab}`;
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2200);
}

async function batchSetBoardTab(panel, threadIds = [], activeBoardTab = "all", boardTabOrder = []) {
  const ids = Array.isArray(threadIds) ? threadIds.map((id) => String(id || "").trim()).filter(Boolean) : [];
  if (!ids.length) return;
  const persisted = getPersistedUiState(panel);
  let nextOrder = combinedBoardTabOrder(persisted, boardTabOrder);
  const picks = [];
  if (nextOrder.length) {
    picks.push(...nextOrder.map((name) => ({
      label: name,
      description: normalizeBoardTabName(activeBoardTab) === name ? "Current active tab" : "",
      action: "select",
      value: name,
    })));
  }
  picks.push({
    label: "+ New Tab",
    description: "Create a new tab and move all selected cards into it",
    action: "new",
  });
  const picked = await vscode.window.showQuickPick(picks, {
    title: "Set Selected Cards to Tab",
    placeHolder: ids.length === 1 ? "Choose a tab for the selected card" : `Choose a tab for ${ids.length} selected cards`,
    ignoreFocusOut: true,
  });
  if (!picked) return;
  let nextTab = "";
  if (picked.action === "new") {
    const created = await vscode.window.showInputBox({
      title: "Create Tab Group",
      prompt: "Create a new manual Board group for the selected cards",
      value: "",
      ignoreFocusOut: true,
      validateInput: (input) => {
        const normalized = normalizeBoardTabName(input);
        if (!normalized) return "Tab name cannot be empty";
        if (normalized.toLowerCase() === "all") return "\"all\" is reserved";
        return undefined;
      },
    });
    if (created === undefined) return;
    nextTab = normalizeBoardTabName(created);
    if (!nextTab) {
      vscode.window.showWarningMessage("Codex-Managed-Agent: Tab name cannot be empty");
      return;
    }
    if (nextTab.toLowerCase() === "all") {
      vscode.window.showWarningMessage("Codex-Managed-Agent: \"all\" is reserved and cannot be used as a tab name");
      return;
    }
    if (!nextOrder.includes(nextTab)) {
      nextOrder = normalizeBoardTabOrder([...nextOrder, nextTab]);
    }
  } else {
    nextTab = normalizeBoardTabName(picked.value || picked.label || "");
  }
  if (!nextTab || nextTab === "all") {
    vscode.window.showWarningMessage("Codex-Managed-Agent: choose a specific tab for batch assignment");
    return;
  }
  const nextAssignments = Object.assign({}, persisted.boardTabAssignments || {});
  const nextAttached = Object.assign({}, persisted.boardAttached || {});
  ids.forEach((threadId) => {
    nextAssignments[threadId] = nextTab;
    nextAttached[threadId] = true;
  });
  const nextState = Object.assign({}, persisted, {
    boardTabAssignments: nextAssignments,
    boardTabOrder: nextOrder,
    boardAttached: nextAttached,
    activeBoardTab: nextTab,
  });
  await savePersistedUiState(panel, nextState);
  panel.postMessage({
    type: "batchBoardTabPatched",
    threadIds: ids,
    boardTab: nextTab,
    boardTabOrder: nextOrder,
    activeBoardTab: nextState.activeBoardTab,
  });
  panel.lastActionNotice = `Moved ${ids.length} card${ids.length > 1 ? "s" : ""} into tab ${nextTab}`;
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2400);
}

module.exports = {
  runLifecycleAction,
  copyText,
  openLogFile,
  openRepoFile,
  createThread,
  createLoopThread,
  renameThread,
  showThreadInCodex,
  setLoopManagedThread,
  runLoopIntervalPreset,
  promptLoopIntervalPreset,
  stopLoopDaemon,
  startLoopDaemon,
  restartLoopDaemon,
  stopLoopDaemonAt,
  startLoopDaemonAt,
  restartLoopDaemonAt,
  attachLoopTmux,
  tailLoopLog,
  editCardLabel,
  setCardLabel,
  chooseBoardTab,
  createBoardTab,
  batchSetBoardTab,
};
