const vscode = require("vscode");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { postScanCodexSessions } = require("./server");

const DEFAULT_NEW_AGENT_PROMPT = "创建一个新agent。你是一个专业的agent，听从用户指令，先等待用户的具体任务，并保持简洁汇报。";

function shellQuote(value) {
  return "'" + String(value || "").replace(/'/g, "'\"'\"'") + "'";
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}

function readTextIfExists(filePath) {
  try {
    return filePath && fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  } catch {
    return "";
  }
}

function newAgentWorkspacePath() {
  const firstFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
  if (firstFolder && firstFolder.uri && firstFolder.uri.fsPath) {
    return firstFolder.uri.fsPath;
  }
  return os.homedir();
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

function getPersistedUiState(panel) {
  return Object.assign({}, panel.storage.get("codexAgent.persistedUiState", {}));
}

async function savePersistedUiState(panel, nextState) {
  await panel.storage.update("codexAgent.persistedUiState", nextState || {});
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


module.exports = {
  createThread,
};
