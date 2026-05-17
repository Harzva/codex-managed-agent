const vscode = require("vscode");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const {
  resolveTracePath,
  resolveTraceThreadId,
  summarizeTrace,
  writeTeamTrace,
} = require("./trace-core");
const { createTeamRecordValidation } = require("./team-record-validation");
const { createTeamRuntimeReconciliation } = require("./team-runtime-reconciliation");
const { createTeamWorkerLauncher } = require("./team-worker-launcher");
const { createTeamOrchestrationLauncher } = require("./team-orchestration-launch");
const { SNAKE_DEMO_PROMPT } = require("./team-demo-prompts");
const { buildTeamBrief } = require("./team-brief");
const { createTeamActions } = require("./team-actions");
const accountManager = require("./account-manager");
const {
  DAG_NODE_STATES,
  DEFAULT_GEMINI_CLI_MODEL,
  GEMINI_CLI_MODEL_PRIORITY,
  WORKER_PROVIDER_GEMINI,
  WORKER_PROVIDER_CODEX,
  applyBuiltInRoleOrganizationTemplateToDraft,
  buildRolePluginCatalog: buildLocalRolePluginCatalog,
  buildBuiltInRoleOrganizationTemplateCatalog,
  compileWorkerPrompt,
  compileSupervisorPrompt,
  explainDagSchedule,
  ingestWorkerResultEnvelope,
  persistWorkerResultIngestFailureMetadata,
  persistWorkerPromptSnapshot,
  readDagRun,
  runLaunchSchedulerTick,
  normalizeWorkerProvider,
  writeDagRun,
} = require("./moa-core");

function normalizePath(value) {
  return String(value || "").trim().replace(/\\/g, "/").replace(/\/+$/, "");
}

function toIso(value = Date.now()) {
  return new Date(value).toISOString();
}

function parseIsoTime(value) {
  const timestamp = Date.parse(String(value || "").trim());
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isPidRunning(pid) {
  const value = Number(pid);
  if (!Number.isInteger(value) || value <= 0) return false;
  try {
    process.kill(value, 0);
    return true;
  } catch {
    return false;
  }
}

function safeName(value, fallback = "workspace") {
  const text = String(value || "").trim();
  const next = text.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
  return next || fallback;
}

function safeFileSlug(value, fallback = "team-worker") {
  return safeName(value || fallback, fallback).slice(0, 48) || fallback;
}

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function readTextTail(filePath, maxBytes = 8192) {
  try {
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
  } catch {
    return "";
  }
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function appendJsonl(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function readJsonl(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function ensureFile(filePath, content) {
  if (fs.existsSync(filePath)) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

function makeTaskId(owner, title, createdAt) {
  const label = safeName(title || "task", "task").slice(0, 32);
  const seed = JSON.stringify({
    owner: String(owner || ""),
    title: String(title || ""),
    created_at: String(createdAt || ""),
  });
  const digest = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 12);
  return `task-${label}-${digest}`;
}

function buildRolePluginCatalog(workspacePath = "") {
  return buildLocalRolePluginCatalog({ workspacePath });
}

function buildRoleOrganizationTemplateCatalog() {
  return buildBuiltInRoleOrganizationTemplateCatalog();
}

function reserveTaskId(paths, baseTaskId) {
  const base = safeName(baseTaskId || "task", "task");
  let taskId = base;
  let suffix = 2;
  while (fs.existsSync(path.join(paths.tasksDir, `${taskId}.json`)) || fs.existsSync(teamWorkspaceTaskPath(paths, teamWorkspaceIdForTaskId(taskId)))) {
    taskId = `${base}-${suffix}`;
    suffix += 1;
  }
  return taskId;
}

const TASK_STATES = Object.freeze({
  QUEUED: "queued",
  ASSIGNED: "assigned",
  RUNNING: "running",
  BLOCKED: "blocked",
  REVIEW: "review",
  COMPLETED: "completed",
  FAILED: "failed",
  STALE: "stale",
});

const THREAD_ACTIVE_TASK_STATES = new Set([
  TASK_STATES.RUNNING,
  TASK_STATES.ASSIGNED,
  TASK_STATES.BLOCKED,
  TASK_STATES.REVIEW,
]);

const CLAIMABLE_TASK_STATES = new Set([
  TASK_STATES.ASSIGNED,
  TASK_STATES.QUEUED,
  TASK_STATES.STALE,
]);

const BLOCKABLE_TASK_STATES = new Set([
  TASK_STATES.RUNNING,
  TASK_STATES.ASSIGNED,
]);

const COMPLETABLE_TASK_STATES = new Set([
  TASK_STATES.RUNNING,
  TASK_STATES.ASSIGNED,
  TASK_STATES.REVIEW,
]);

const {
  taskStatus,
  taskHasStatus,
  isPlainObject,
  validateTeamTaskRecord,
  validateTeamAgentRecord,
  isEventEnvelope,
  validateTeamEventRecord,
  isInboxEnvelope,
  validateTeamInboxRecord,
} = createTeamRecordValidation({
  TASK_STATES,
  parseIsoTime,
  safeName,
});

const {
  markCompletedTaskPlansInRoadmapIndex,
  readRuntimeTraceState,
  traceFileInfo,
  taskTraceFiles,
  readTracePreview,
  taskTracePreview,
  parseRuntimeLogSummary,
  moveAgentRecord,
  runtimeProgressFromSummary,
  resolveDagWorkerForRuntime,
  ingestDagWorkerResultEnvelope,
  ingestCompletedLaunchedWorkerEnvelopes,
  summarizeLaunchedWorkerBatch,
  reconcileTeamTaskRuntimes,
} = createTeamRuntimeReconciliation({
  fs,
  path,
  DAG_NODE_STATES,
  TASK_STATES,
  normalizePath,
  safeName,
  toIso,
  readJson,
  readTextTail,
  writeTeamTrace,
  resolveTraceThreadId,
  resolveTracePath,
  summarizeTrace,
  readDagRun,
  ingestWorkerResultEnvelope,
  persistWorkerResultIngestFailureMetadata,
  appendEvent,
  teamEvent,
  ensureAgentRecord,
  listJsonFiles,
  readTaskRecordFile,
  isPidRunning,
  taskStatus,
  writeTask,
});

const {
  teamReflectiveSkillInstalled,
  configuredCodexModel,
  validateCodexModelName,
  preflightCodexCli,
  classifyTeamDispatchFailure,
  buildTeamDispatchFailurePatch,
  compileTeamWorkerPrompt,
  launchDedicatedTeamWorker,
  isTeamAccountBlockingTokenHealth,
  makeTeamPreflightError,
  assessTeamWorkerPreflight,
  preflightGeminiCli,
  launchGeminiCliTeamWorker,
} = createTeamWorkerLauncher({
  vscode,
  childProcess,
  fs,
  os,
  path,
  DEFAULT_GEMINI_CLI_MODEL,
  GEMINI_CLI_MODEL_PRIORITY,
  WORKER_PROVIDER_CODEX,
  WORKER_PROVIDER_GEMINI,
  defaultAgentRolePrompt,
  safeFileSlug,
  writeJson,
  toIso,
});

function promptForWorkspace(panel) {
  const selectedThread = panel.lastPayload
    && panel.lastPayload.dashboard
    && Array.isArray(panel.lastPayload.dashboard.threads)
    ? panel.lastPayload.dashboard.threads.find((thread) => thread && thread.id === panel.selectedThreadId)
    : undefined;
  if (selectedThread && selectedThread.cwd && fs.existsSync(selectedThread.cwd)) {
    return normalizePath(selectedThread.cwd);
  }
  const firstFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
  if (firstFolder && firstFolder.uri && firstFolder.uri.fsPath) {
    return normalizePath(firstFolder.uri.fsPath);
  }
  return "";
}

function resolveLiveThread(panel, threadId) {
  const nextThreadId = String(threadId || "").trim();
  if (!nextThreadId) return undefined;
  const threads = panel.lastPayload
    && panel.lastPayload.dashboard
    && Array.isArray(panel.lastPayload.dashboard.threads)
    ? panel.lastPayload.dashboard.threads
    : [];
  const thread = threads.find((item) => item && item.id === nextThreadId);
  if (thread) return thread;
  vscode.window.showWarningMessage("Codex-Managed-Agent: refresh the dashboard before writing mailbox state for this thread");
  return undefined;
}

function teamRootForWorkspace(workspacePath) {
  const nextWorkspace = normalizePath(workspacePath);
  return nextWorkspace ? path.join(nextWorkspace, ".codex-team") : "";
}

function pathsForWorkspace(workspacePath) {
  const workspace = normalizePath(workspacePath);
  const root = teamRootForWorkspace(workspace);
  return {
    workspace,
    root,
    workspacesDir: root ? path.join(root, "workspaces") : "",
    archivedWorkspacesDir: root ? path.join(root, "workspaces-archive") : "",
    tasksDir: root ? path.join(root, "tasks") : "",
    eventsDir: root ? path.join(root, "events") : "",
    inboxDir: root ? path.join(root, "inbox") : "",
    agentsDir: root ? path.join(root, "agents") : "",
    viewsDir: root ? path.join(root, "views") : "",
    tracesDir: root ? path.join(root, "traces") : "",
    taskTracesDir: root ? path.join(root, "traces", "tasks") : "",
    threadTracesDir: root ? path.join(root, "traces", "threads") : "",
    runsDir: root ? path.join(root, "runs") : "",
    teamBriefPath: root ? path.join(root, "team.md") : "",
    metaPath: root ? path.join(root, "team-space.json") : "",
    eventsLogPath: root ? path.join(root, "events", "events.jsonl") : "",
  };
}

function teamWorkspaceIdForTaskId(taskId) {
  return safeName(taskId || "team-workspace", "team-workspace");
}

function teamWorkspaceDir(paths, workspaceId) {
  const nextWorkspaceId = safeName(workspaceId || "", "");
  return paths.workspacesDir && nextWorkspaceId ? path.join(paths.workspacesDir, nextWorkspaceId) : "";
}

function teamWorkspaceTaskPath(paths, workspaceId) {
  const dirPath = teamWorkspaceDir(paths, workspaceId);
  return dirPath ? path.join(dirPath, "task.json") : "";
}

function teamWorkspacePaths(paths, workspaceId) {
  const dirPath = teamWorkspaceDir(paths, workspaceId);
  return {
    id: safeName(workspaceId || "", ""),
    dir: dirPath,
    workspaceJson: dirPath ? path.join(dirPath, "workspace.json") : "",
    taskJson: dirPath ? path.join(dirPath, "task.json") : "",
    eventsJsonl: dirPath ? path.join(dirPath, "events.jsonl") : "",
    runtimeJson: dirPath ? path.join(dirPath, "runtime.json") : "",
    traceJsonl: dirPath ? path.join(dirPath, "trace.jsonl") : "",
    resultJson: dirPath ? path.join(dirPath, "result.json") : "",
  };
}

function teamEvent(type, payload = {}) {
  return {
    event_id: makeId("event"),
    type,
    timestamp: toIso(),
    ...payload,
  };
}

function inboxMessage(targetAgentId, payload = {}) {
  return {
    message_id: makeId("msg"),
    target_agent_id: String(targetAgentId || "").trim(),
    created_at: toIso(),
    ...payload,
  };
}

function defaultAgentRolePrompt(agentId) {
  const nextAgentId = String(agentId || "").trim();
  if (nextAgentId === "supervisor") {
    return "你是 Team Supervisor，负责发布任务、维护依赖、处理 blocked/handoff、检查 lease/heartbeat，并保持 team.md 只作为人类可读面板。";
  }
  return "你是 Team Worker Agent。只消费结构化 team task，按 acceptance criteria 执行，定期 heartbeat，遇到阻塞发 blocked/handoff，完成后提交 result envelope。";
}

function ensureAgentRecord(paths, agentId, patch = {}) {
  const nextAgentId = safeName(agentId || "supervisor", "supervisor");
  const filePath = path.join(paths.agentsDir, `${nextAgentId}.json`);
  const current = readJson(filePath, {});
  const next = {
    state: current.state || "idle",
    current_task_id: current.current_task_id || "",
    heartbeat_at: current.heartbeat_at || "",
    last_error: current.last_error || "",
    role_prompt: defaultAgentRolePrompt(nextAgentId),
    updated_at: current.updated_at || "",
    ...current,
    ...patch,
    agent_id: nextAgentId,
  };
  writeJson(filePath, next);
  return next;
}

function listJsonFiles(dirPath) {
  try {
    if (!dirPath || !fs.existsSync(dirPath)) return [];
    return fs.readdirSync(dirPath)
      .filter((name) => name.endsWith(".json"))
      .map((name) => path.join(dirPath, name));
  } catch {
    return [];
  }
}

function readTaskRecordFile(filePath) {
  const task = readJson(filePath);
  const taskId = String((task && task.task_id) || "").trim();
  const fileTaskId = path.basename(filePath, ".json");
  if (!taskId || safeName(taskId, "") !== taskId || fileTaskId !== taskId) return null;
  return task;
}

function readTaskRecords(paths) {
  const legacyTasks = listJsonFiles(paths.tasksDir)
    .map((filePath) => readTaskRecordFile(filePath))
    .filter(Boolean);
  const workspaceTasks = readWorkspaceTaskRecords(paths);
  const byId = new Map();
  [...legacyTasks, ...workspaceTasks].forEach((task) => {
    const taskId = String((task && task.task_id) || "").trim();
    if (!taskId) return;
    const current = byId.get(taskId);
    if (!current || String(task.updated_at || "").localeCompare(String(current.updated_at || "")) >= 0) {
      byId.set(taskId, task);
    }
  });
  return [...byId.values()]
    .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
}

function readWorkspaceTaskRecords(paths) {
  try {
    if (!paths.workspacesDir || !fs.existsSync(paths.workspacesDir)) return [];
    return fs.readdirSync(paths.workspacesDir)
      .map((name) => teamWorkspaceTaskPath(paths, name))
      .filter((filePath) => filePath && fs.existsSync(filePath))
      .map((filePath) => readJson(filePath))
      .filter((task) => task && task.task_id);
  } catch {
    return [];
  }
}

function readAgentRecordFile(filePath) {
  const agent = readJson(filePath);
  const agentId = String((agent && agent.agent_id) || "").trim();
  const fileAgentId = path.basename(filePath, ".json");
  if (!agentId || safeName(agentId, "") !== agentId || fileAgentId !== agentId) return null;
  return agent;
}

function readAgentRecords(paths) {
  return listJsonFiles(paths.agentsDir)
    .map((filePath) => readAgentRecordFile(filePath))
    .filter(Boolean)
    .sort((a, b) => String(a.agent_id).localeCompare(String(b.agent_id)));
}

function findTaskById(paths, taskId) {
  const nextTaskId = String(taskId || "").trim();
  if (!nextTaskId) return null;
  const filePath = path.join(paths.tasksDir, `${nextTaskId}.json`);
  const task = readJson(filePath);
  if (task && task.task_id) return task;
  const workspaceTask = readJson(teamWorkspaceTaskPath(paths, teamWorkspaceIdForTaskId(nextTaskId)));
  return workspaceTask && workspaceTask.task_id ? workspaceTask : null;
}

function writeTask(paths, task) {
  const taskId = String((task && task.task_id) || "").trim();
  const fileTaskId = safeName(taskId, "");
  if (!taskId || fileTaskId !== taskId) return false;
  const nextTask = {
    ...task,
    workspace_id: task.workspace_id || teamWorkspaceIdForTaskId(taskId),
  };
  writeJson(path.join(paths.tasksDir, `${fileTaskId}.json`), nextTask);
  syncTaskWorkspace(paths, nextTask);
  return true;
}

function setTeamTaskInput(task, type, value) {
  const nextType = String(type || "").trim();
  if (!task || !nextType) return;
  const inputs = Array.isArray(task.inputs) ? [...task.inputs] : [];
  const index = inputs.findIndex((item) => item && item.type === nextType);
  const nextInput = { type: nextType, value: String(value || "") };
  if (index >= 0) {
    inputs[index] = { ...inputs[index], ...nextInput };
  } else {
    inputs.push(nextInput);
  }
  task.inputs = inputs;
}

function parseAcceptanceCriteriaInput(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
}

function updateTeamTaskDefinition(panel, payload = {}) {
  const workspacePath = promptForWorkspace(panel);
  const paths = pathsForWorkspace(workspacePath);
  const taskId = String((payload && payload.taskId) || "").trim();
  const task = findTaskById(paths, taskId);
  if (!task || !task.task_id) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: Team task definition was not found");
    return null;
  }
  const title = String((payload && payload.title) || "").trim();
  const prompt = String((payload && payload.prompt) || "").trim();
  if (!title || !prompt) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: Team task title and prompt are required");
    return null;
  }
  const now = toIso();
  const nextTask = {
    ...task,
    title,
    goal: String((payload && payload.goal) || task.goal || "").trim() || task.goal,
    acceptance_criteria: parseAcceptanceCriteriaInput(payload.acceptanceCriteria),
    updated_at: now,
  };
  setTeamTaskInput(nextTask, "prompt", prompt);
  writeTask(paths, nextTask);
  syncTaskWorkspace(paths, nextTask, {
    workspacePatch: {
      title: nextTask.title,
      updated_at: now,
    },
  });
  writeTeamTrace(paths, {
    kind: "task.definition_updated",
    ts: now,
    task_id: nextTask.task_id,
    thread_id: resolveTraceThreadId((nextTask.runtime && nextTask.runtime.thread_id) || nextTask.owner || ""),
    run_id: String((nextTask.runtime && nextTask.runtime.run_id) || ""),
    agent_id: "supervisor",
    status: nextTask.status || TASK_STATES.QUEUED,
    summary: "Team task definition updated by user action.",
    evidence: {},
    payload: {
      title: nextTask.title,
      acceptance_criteria_count: nextTask.acceptance_criteria.length,
    },
  });
  appendEvent(paths, teamEvent("task.definition_updated", {
    task_id: nextTask.task_id,
    agent_id: "supervisor",
    workspace: workspacePath,
    payload: {
      title: nextTask.title,
      acceptance_criteria_count: nextTask.acceptance_criteria.length,
    },
  }));
  panel.lastActionNotice = `Saved Team task definition · ${nextTask.task_id}`;
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
  return nextTask;
}

function eventMatchesTask(event, taskId) {
  const payload = event && event.payload && typeof event.payload === "object" ? event.payload : {};
  return String((event && event.task_id) || payload.task_id || "") === String(taskId || "");
}

function workspaceRecordForTask(paths, task, patch = {}) {
  const taskId = String((task && task.task_id) || "").trim();
  const workspaceId = safeName((task && task.workspace_id) || teamWorkspaceIdForTaskId(taskId), "team-workspace");
  const runtime = task && task.runtime && typeof task.runtime === "object" ? task.runtime : {};
  const traceFiles = taskTraceFiles(paths, task);
  return {
    workspace_id: workspaceId,
    task_id: taskId,
    title: String((task && task.title) || taskId || "Team Workspace"),
    status: taskStatus(task, TASK_STATES.QUEUED),
    owner: String((task && task.owner) || ""),
    thread_id: String(runtime.thread_id || (task && task.owner) || ""),
    pid: runtime.pid || 0,
    pid_running: runtime.pid_running,
    runtime_state: String(runtime.state || ""),
    created_at: String((task && task.created_at) || toIso()),
    updated_at: String((task && task.updated_at) || toIso()),
    source: "task",
    trace_files: traceFiles,
    ...patch,
  };
}

function copyFileIfExists(sourcePath, targetPath) {
  try {
    if (!sourcePath || !targetPath || !fs.existsSync(sourcePath)) return false;
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
    return true;
  } catch {
    return false;
  }
}

function syncTaskWorkspace(paths, task, options = {}) {
  if (!paths.workspacesDir || !task || !task.task_id) return null;
  const workspaceId = safeName(task.workspace_id || teamWorkspaceIdForTaskId(task.task_id), "team-workspace");
  const workspacePaths = teamWorkspacePaths(paths, workspaceId);
  if (!workspacePaths.dir) return null;
  fs.mkdirSync(workspacePaths.dir, { recursive: true });
  const current = readJson(workspacePaths.workspaceJson, {});
  const nextTask = {
    ...task,
    workspace_id: workspaceId,
  };
  const nextWorkspace = workspaceRecordForTask(paths, nextTask, {
    ...current,
    ...options.workspacePatch,
    workspace_id: workspaceId,
    task_id: nextTask.task_id,
    title: (options.workspacePatch && options.workspacePatch.title) || current.title || nextTask.title || nextTask.task_id,
    status: taskStatus(nextTask, current.status || TASK_STATES.QUEUED),
    owner: String(nextTask.owner || current.owner || ""),
    updated_at: String(nextTask.updated_at || current.updated_at || toIso()),
  });
  writeJson(workspacePaths.workspaceJson, nextWorkspace);
  writeJson(workspacePaths.taskJson, nextTask);
  writeJson(workspacePaths.runtimeJson, nextTask.runtime && typeof nextTask.runtime === "object" ? nextTask.runtime : {});
  writeJson(workspacePaths.resultJson, nextTask.result && typeof nextTask.result === "object" ? nextTask.result : {});
  const traceSource = resolveTracePath(paths, { scope: "task", task_id: nextTask.task_id });
  copyFileIfExists(traceSource, workspacePaths.traceJsonl);
  return nextWorkspace;
}

function syncWorkspaceEvents(paths, task) {
  const workspaceId = safeName((task && task.workspace_id) || teamWorkspaceIdForTaskId(task && task.task_id), "");
  const workspacePaths = teamWorkspacePaths(paths, workspaceId);
  if (!workspacePaths.eventsJsonl || !task || !task.task_id) return;
  const events = readJsonl(paths.eventsLogPath).filter((event) => eventMatchesTask(event, task.task_id));
  if (!events.length) {
    ensureFile(workspacePaths.eventsJsonl, "");
    return;
  }
  fs.mkdirSync(path.dirname(workspacePaths.eventsJsonl), { recursive: true });
  fs.writeFileSync(workspacePaths.eventsJsonl, `${events.map((event) => JSON.stringify(event)).join("\n")}\n`, "utf8");
}

function migrateLegacyTeamTasksToWorkspaces(paths) {
  const tasks = listJsonFiles(paths.tasksDir)
    .map((filePath) => readTaskRecordFile(filePath))
    .filter(Boolean);
  let migratedCount = 0;
  tasks.forEach((task) => {
    const workspaceId = safeName(task.workspace_id || teamWorkspaceIdForTaskId(task.task_id), "team-workspace");
    const workspacePaths = teamWorkspacePaths(paths, workspaceId);
    const existed = workspacePaths.workspaceJson && fs.existsSync(workspacePaths.workspaceJson);
    const nextTask = {
      ...task,
      workspace_id: workspaceId,
    };
    syncTaskWorkspace(paths, nextTask, {
      workspacePatch: {
        migrated_from: "tasks",
        migrated_at: existed ? undefined : toIso(),
      },
    });
    syncWorkspaceEvents(paths, nextTask);
    if (!task.workspace_id) {
      writeJson(path.join(paths.tasksDir, `${safeName(task.task_id, "")}.json`), nextTask);
    }
    if (!existed) migratedCount += 1;
  });
  return migratedCount;
}

function readTeamWorkspaces(paths, tasks = [], logIndexes = {}) {
  const workspaceTasks = new Map((tasks || []).map((task) => [String(task.task_id || ""), task]));
  try {
    if (!paths.workspacesDir || !fs.existsSync(paths.workspacesDir)) return [];
    return fs.readdirSync(paths.workspacesDir)
      .map((workspaceId) => {
        const workspacePaths = teamWorkspacePaths(paths, workspaceId);
        const record = readJson(workspacePaths.workspaceJson, null);
        const task = readJson(workspacePaths.taskJson, null) || workspaceTasks.get(String(record && record.task_id || ""));
        if (!record || !record.workspace_id || !task || !task.task_id) return null;
        const runtime = task.runtime && typeof task.runtime === "object" ? task.runtime : readJson(workspacePaths.runtimeJson, {});
        const events = readJsonl(workspacePaths.eventsJsonl).slice(-8).reverse();
        const logs = (logIndexes.taskLogs && logIndexes.taskLogs[task.task_id]) || [];
        return {
          ...record,
          status: taskStatus(task, record.status || TASK_STATES.QUEUED),
          title: record.title || task.title || task.task_id,
          owner: task.owner || record.owner || "",
          thread_id: runtime.thread_id || task.owner || record.thread_id || "",
          pid: runtime.pid || 0,
          pid_running: runtime.pid_running,
          runtime_state: runtime.state || record.runtime_state || "",
          updated_at: task.updated_at || record.updated_at || "",
          task,
          runtime,
          events,
          logs,
          paths: workspacePaths,
        };
      })
      .filter(Boolean)
      .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
  } catch {
    return [];
  }
}

function appendEvent(paths, event) {
  if (!isEventEnvelope(event)) return false;
  appendJsonl(paths.eventsLogPath, event);
  const taskId = String(event.task_id || (event.payload && event.payload.task_id) || "").trim();
  if (taskId) {
    const task = findTaskById(paths, taskId);
    if (task) syncWorkspaceEvents(paths, task);
  }
  return true;
}

function appendInbox(paths, agentId, payload) {
  const nextAgentId = safeName(agentId || "supervisor", "supervisor");
  const message = inboxMessage(nextAgentId, payload);
  if (!isInboxEnvelope(message)) return false;
  appendJsonl(path.join(paths.inboxDir, `${nextAgentId}.jsonl`), message);
  return true;
}

function parseEventLine(line) {
  try {
    const event = JSON.parse(line);
    return isEventEnvelope(event) ? event : null;
  } catch {
    return null;
  }
}

function parseInboxLine(line) {
  try {
    const message = JSON.parse(line);
    return isInboxEnvelope(message) ? message : null;
  } catch {
    return null;
  }
}

function readJsonlTail(filePath, parser, limit = 20) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-limit)
      .map((line) => parser(line))
      .filter(Boolean)
      .reverse();
  } catch {
    return [];
  }
}

function eventTail(paths, limit = 8) {
  return readJsonlTail(paths.eventsLogPath, parseEventLine, limit);
}

function inboxTail(paths, agentId, limit = 8) {
  const nextAgentId = safeName(agentId || "supervisor", "supervisor");
  return readJsonlTail(path.join(paths.inboxDir, `${nextAgentId}.jsonl`), parseInboxLine, limit);
}

function buildTeamLogIndexes(paths, tasks, agents) {
  const events = eventTail(paths, 80);
  const taskLogs = {};
  const agentLogs = {};
  function pushLog(map, key, item) {
    const nextKey = String(key || "").trim();
    if (!nextKey) return;
    if (!map[nextKey]) map[nextKey] = [];
    map[nextKey].push(item);
  }
  events.forEach((event) => {
    const payload = event.payload && typeof event.payload === "object" ? event.payload : {};
    const item = {
      source: "event",
      type: String(event.type || "event"),
      timestamp: String(event.timestamp || ""),
      task_id: String(event.task_id || payload.task_id || ""),
      agent_id: String(event.agent_id || payload.agent_id || ""),
      summary: String(payload.summary || payload.reason || payload.title || payload.kind || ""),
    };
    pushLog(taskLogs, item.task_id, item);
    pushLog(agentLogs, item.agent_id, item);
  });
  (agents || []).forEach((agent) => {
    const agentId = String((agent && agent.agent_id) || "").trim();
    inboxTail(paths, agentId, 12).forEach((message) => {
      const payload = message.payload && typeof message.payload === "object" ? message.payload : {};
      const item = {
        source: "inbox",
        type: String(message.type || "message"),
        timestamp: String(message.created_at || ""),
        task_id: String(message.task_id || payload.task_id || ""),
        agent_id: agentId,
        summary: String(payload.summary || payload.reason || payload.title || payload.kind || ""),
      };
      pushLog(agentLogs, agentId, item);
      pushLog(taskLogs, item.task_id, item);
    });
  });
  Object.keys(taskLogs).forEach((key) => taskLogs[key].sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || ""))).splice(8));
  Object.keys(agentLogs).forEach((key) => agentLogs[key].sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || ""))).splice(8));
  return { taskLogs, agentLogs, events };
}

function readJsonlValidation(filePath, validator) {
  const result = {
    count: 0,
    invalidCount: 0,
    errors: [],
    warnings: [],
  };
  try {
    if (!filePath || !fs.existsSync(filePath)) return result;
    fs.readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line, index) => {
        result.count += 1;
        let parsed = null;
        try {
          parsed = JSON.parse(line);
        } catch {
          result.invalidCount += 1;
          result.errors.push(`${path.basename(filePath)}:${index + 1} invalid json`);
          return;
        }
        const validation = validator(parsed);
        if (!validation.ok) {
          result.invalidCount += 1;
          validation.errors.forEach((error) => result.errors.push(`${path.basename(filePath)}:${index + 1} ${error}`));
        }
        validation.warnings.forEach((warning) => result.warnings.push(`${path.basename(filePath)}:${index + 1} ${warning}`));
      });
  } catch {
    result.invalidCount += 1;
    result.errors.push(`${path.basename(filePath || "jsonl")} unreadable`);
  }
  return result;
}

function validateTeamSpaceFiles(paths) {
  const validation = {
    ok: true,
    taskCount: 0,
    invalidTaskCount: 0,
    agentCount: 0,
    invalidAgentCount: 0,
    eventCount: 0,
    invalidEventCount: 0,
    inboxMessageCount: 0,
    invalidInboxMessageCount: 0,
    errors: [],
    warnings: [],
  };
  listJsonFiles(paths.tasksDir).forEach((filePath) => {
    validation.taskCount += 1;
    const fileTaskId = path.basename(filePath, ".json");
    const result = validateTeamTaskRecord(readJson(filePath), { fileTaskId });
    if (!result.ok) {
      validation.invalidTaskCount += 1;
      result.errors.forEach((error) => validation.errors.push(`tasks/${path.basename(filePath)} ${error}`));
    }
    result.warnings.forEach((warning) => validation.warnings.push(`tasks/${path.basename(filePath)} ${warning}`));
  });
  listJsonFiles(paths.agentsDir).forEach((filePath) => {
    validation.agentCount += 1;
    const fileAgentId = path.basename(filePath, ".json");
    const result = validateTeamAgentRecord(readJson(filePath), { fileAgentId });
    if (!result.ok) {
      validation.invalidAgentCount += 1;
      result.errors.forEach((error) => validation.errors.push(`agents/${path.basename(filePath)} ${error}`));
    }
    result.warnings.forEach((warning) => validation.warnings.push(`agents/${path.basename(filePath)} ${warning}`));
  });
  const eventValidation = readJsonlValidation(paths.eventsLogPath, validateTeamEventRecord);
  validation.eventCount = eventValidation.count;
  validation.invalidEventCount = eventValidation.invalidCount;
  validation.errors.push(...eventValidation.errors);
  validation.warnings.push(...eventValidation.warnings);
  try {
    if (paths.inboxDir && fs.existsSync(paths.inboxDir)) {
      fs.readdirSync(paths.inboxDir)
        .filter((name) => name.endsWith(".jsonl"))
        .forEach((name) => {
          const inboxValidation = readJsonlValidation(path.join(paths.inboxDir, name), validateTeamInboxRecord);
          validation.inboxMessageCount += inboxValidation.count;
          validation.invalidInboxMessageCount += inboxValidation.invalidCount;
          validation.errors.push(...inboxValidation.errors.map((error) => `inbox/${name} ${error}`));
          validation.warnings.push(...inboxValidation.warnings.map((warning) => `inbox/${name} ${warning}`));
        });
    }
  } catch {
    validation.invalidInboxMessageCount += 1;
    validation.errors.push("inbox directory unreadable");
  }
  validation.ok = !validation.invalidTaskCount
    && !validation.invalidAgentCount
    && !validation.invalidEventCount
    && !validation.invalidInboxMessageCount;
  return validation;
}

function readinessCheck(id, label, ok, detail, level = "required") {
  return {
    id,
    label,
    ok: Boolean(ok),
    detail: String(detail || ""),
    level,
  };
}

function buildTeamReadiness(paths, teamState = {}) {
  const validation = teamState.validation || {
    ok: true,
    errors: [],
    warnings: [],
  };
  const tasks = Array.isArray(teamState.tasks) ? teamState.tasks : [];
  const agents = Array.isArray(teamState.agents) ? teamState.agents : [];
  const summary = teamState.summary || {};
  const requiredDirs = [paths.workspacesDir, paths.tasksDir, paths.agentsDir, paths.eventsDir, paths.inboxDir];
  const supervisor = agents.find((agent) => agent && agent.agent_id === "supervisor");
  const workerCount = agents.filter((agent) => agent && agent.agent_id !== "supervisor").length;
  const activeTaskCount = tasks.filter((task) => taskHasStatus(task, THREAD_ACTIVE_TASK_STATES)).length;
  const required = [
    readinessCheck("workspace", "Workspace resolved", Boolean(paths.workspace), paths.workspace || "No workspace path available."),
    readinessCheck("mailbox", ".codex-team exists", Boolean(paths.root && fs.existsSync(paths.root)), paths.root || "Mailbox root is unavailable."),
    readinessCheck("metadata", "team-space.json", Boolean(paths.metaPath && fs.existsSync(paths.metaPath)), paths.metaPath || "Missing metadata path."),
    readinessCheck("directories", "Required folders", requiredDirs.every((dirPath) => dirPath && fs.existsSync(dirPath)), "workspaces, tasks, agents, events, inbox"),
    readinessCheck("brief", "team.md brief", Boolean(paths.teamBriefPath && fs.existsSync(paths.teamBriefPath)), paths.teamBriefPath || "Missing team brief path."),
    readinessCheck("records", "Mailbox records valid", validation.ok !== false, `${(validation.errors || []).length} errors · ${(validation.warnings || []).length} warnings`),
  ];
  const operational = [
    readinessCheck("supervisor", "Supervisor agent", Boolean(supervisor), supervisor ? "supervisor.json is present." : "Initialize Team to create supervisor.json.", "operational"),
    readinessCheck("worker", "Worker agent", workerCount > 0, workerCount ? `${workerCount} worker agent${workerCount === 1 ? "" : "s"} registered.` : "Assign or run a demo task to register a worker.", "operational"),
    readinessCheck("active-task", "Runnable task", activeTaskCount > 0, activeTaskCount ? `${activeTaskCount} active task${activeTaskCount === 1 ? "" : "s"} in flight.` : "No running/assigned/review task yet.", "operational"),
    readinessCheck("blocked", "No blocked work", Number(summary.blockedCount || 0) === 0, `${Number(summary.blockedCount || 0)} blocked`, "operational"),
    readinessCheck("stale", "No stale leases", Number(summary.staleCount || 0) === 0, `${Number(summary.staleCount || 0)} stale`, "operational"),
  ];
  const requiredOk = required.every((item) => item.ok);
  const operationalOk = operational.every((item) => item.ok);
  const checks = [...required, ...operational];
  return {
    ok: requiredOk,
    operational: requiredOk && operationalOk,
    requiredOk,
    operationalOk,
    requiredCount: required.length,
    requiredPassed: required.filter((item) => item.ok).length,
    operationalCount: operational.length,
    operationalPassed: operational.filter((item) => item.ok).length,
    checks,
  };
}

function deriveThreadCoordination(threadId, teamState) {
  const nextThreadId = String(threadId || "").trim();
  if (!nextThreadId || !teamState || !teamState.available) {
    return {
      teamEnabled: Boolean(teamState && teamState.available),
      assignedCount: 0,
      activeTask: null,
    };
  }
  const owned = (teamState.tasks || []).filter((task) => task.owner === nextThreadId);
  const activeTask = owned.find((task) => taskHasStatus(task, THREAD_ACTIVE_TASK_STATES)) || null;
  return {
    teamEnabled: true,
    assignedCount: owned.length,
    activeTask,
  };
}

function readTeamSpace(workspacePath) {
  const paths = pathsForWorkspace(workspacePath);
  if (!paths.root || !fs.existsSync(paths.root)) {
    const emptyState = {
      tasks: [],
      agents: [],
      validation: {
        ok: true,
        errors: [],
        warnings: [],
      },
      summary: {
        blockedCount: 0,
        staleCount: 0,
      },
    };
    return {
      available: false,
      workspace: paths.workspace || undefined,
      workspaceLabel: path.basename(paths.workspace || "") || undefined,
      root: paths.root || undefined,
      teamBriefPath: paths.teamBriefPath || undefined,
      tasks: [],
      agents: [],
      recentEvents: [],
      taskLogs: {},
      agentLogs: {},
      workspaces: [],
      legacyTaskCount: 0,
      validation: {
        ok: true,
        taskCount: 0,
        invalidTaskCount: 0,
        agentCount: 0,
        invalidAgentCount: 0,
        eventCount: 0,
        invalidEventCount: 0,
        inboxMessageCount: 0,
        invalidInboxMessageCount: 0,
        errors: [],
        warnings: [],
      },
      summary: {
        taskCount: 0,
        blockedCount: 0,
        runningCount: 0,
        assignedCount: 0,
        completedCount: 0,
        staleCount: 0,
        agentCount: 0,
      },
      readiness: buildTeamReadiness(paths, emptyState),
    };
  }
  reconcileTeamTaskRuntimes(paths);
  const migratedCount = migrateLegacyTeamTasksToWorkspaces(paths);
  const tasks = readTaskRecords(paths).map((task) => {
    const traceFiles = taskTraceFiles(paths, task);
    return {
      ...task,
      trace_files: traceFiles,
      trace_preview: taskTracePreview(traceFiles),
    };
  });
  const agents = readAgentRecords(paths);
  const counts = tasks.reduce((acc, task) => {
    const status = taskStatus(task);
    acc.taskCount += 1;
    if (status === TASK_STATES.BLOCKED) acc.blockedCount += 1;
    if (status === TASK_STATES.RUNNING) acc.runningCount += 1;
    if (status === TASK_STATES.ASSIGNED) acc.assignedCount += 1;
    if (status === TASK_STATES.COMPLETED) acc.completedCount += 1;
    if (status === TASK_STATES.STALE) acc.staleCount += 1;
    return acc;
  }, {
    taskCount: 0,
    blockedCount: 0,
    runningCount: 0,
    assignedCount: 0,
    completedCount: 0,
    staleCount: 0,
  });
  counts.agentCount = agents.length;
  const validation = validateTeamSpaceFiles(paths);
  const logIndexes = buildTeamLogIndexes(paths, tasks, agents);
  tasks.forEach((task) => {
    syncTaskWorkspace(paths, task);
    syncWorkspaceEvents(paths, task);
  });
  const workspaces = readTeamWorkspaces(paths, tasks, logIndexes);
  counts.workspaceCount = workspaces.length;
  const teamState = {
    tasks,
    agents,
    validation,
    summary: counts,
  };
  return {
    available: true,
    workspace: paths.workspace,
    workspaceLabel: path.basename(paths.workspace || "") || paths.workspace || undefined,
    root: paths.root,
    teamBriefPath: paths.teamBriefPath,
    tasks,
    agents,
    workspaces,
    legacyTaskCount: migratedCount,
    recentEvents: logIndexes.events.slice(0, 12),
    taskLogs: logIndexes.taskLogs,
    agentLogs: logIndexes.agentLogs,
    validation,
    summary: counts,
    readiness: buildTeamReadiness(paths, teamState),
  };
}

async function initializeTeamSpace(panel) {
  const workspacePath = promptForWorkspace(panel);
  if (!workspacePath) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: no workspace available for team space");
    return;
  }
  const paths = pathsForWorkspace(workspacePath);
  fs.mkdirSync(paths.workspacesDir, { recursive: true });
  fs.mkdirSync(paths.archivedWorkspacesDir, { recursive: true });
  fs.mkdirSync(paths.tasksDir, { recursive: true });
  fs.mkdirSync(paths.eventsDir, { recursive: true });
  fs.mkdirSync(paths.inboxDir, { recursive: true });
  fs.mkdirSync(paths.agentsDir, { recursive: true });
  fs.mkdirSync(paths.viewsDir, { recursive: true });
  fs.mkdirSync(paths.taskTracesDir, { recursive: true });
  fs.mkdirSync(paths.threadTracesDir, { recursive: true });
  fs.mkdirSync(paths.runsDir, { recursive: true });
  ensureFile(paths.teamBriefPath, buildTeamBrief(workspacePath));
  if (!fs.existsSync(paths.metaPath)) {
    writeJson(paths.metaPath, {
      team_id: safeName(path.basename(workspacePath || "") || "workspace"),
      workspace: workspacePath,
      created_at: toIso(),
      protocol_version: 1,
      mode: "mailbox",
    });
  }
  ensureAgentRecord(paths, "supervisor", {
    state: "idle",
    updated_at: toIso(),
  });
  appendEvent(paths, teamEvent("team.initialized", {
    agent_id: "supervisor",
    workspace: workspacePath,
  }));
  panel.lastActionNotice = "Team space initialized";
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2400);
  await panel.refresh({ silent: true });
}

async function openTeamBrief(panel) {
  const workspacePath = promptForWorkspace(panel);
  if (!workspacePath) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: no workspace available for team brief");
    return;
  }
  const paths = pathsForWorkspace(workspacePath);
  if (!fs.existsSync(paths.root)) {
    await initializeTeamSpace(panel);
  }
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(paths.teamBriefPath));
  await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: false });
  panel.lastActionNotice = "Opened team brief";
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2200);
}

async function assignTaskToThread(panel, threadId, suggestedTitle = "") {
  const liveThread = resolveLiveThread(panel, threadId);
  if (!liveThread) return;
  const nextThreadId = liveThread.id;
  const workspacePath = promptForWorkspace(panel);
  if (!workspacePath) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: no workspace available for team task");
    return;
  }
  const paths = pathsForWorkspace(workspacePath);
  if (!fs.existsSync(paths.root)) {
    await initializeTeamSpace(panel);
  }
  const titleInput = await vscode.window.showInputBox({
    title: "Create Team Task",
    prompt: "Enter a short title for the task assigned to this thread",
    value: String(suggestedTitle || "").trim() || "New team task",
    ignoreFocusOut: true,
    validateInput: (value) => String(value || "").trim() ? undefined : "Task title cannot be empty",
  });
  if (titleInput === undefined) return;
  const goalInput = await vscode.window.showInputBox({
    title: "Task Goal",
    prompt: "Describe what this thread should accomplish",
    value: String(titleInput || "").trim(),
    ignoreFocusOut: true,
    validateInput: (value) => String(value || "").trim() ? undefined : "Task goal cannot be empty",
  });
  if (goalInput === undefined) return;
  const now = toIso();
  const taskId = reserveTaskId(paths, makeTaskId(nextThreadId, titleInput, now));
  const task = {
    task_id: taskId,
    title: String(titleInput || "").trim(),
    owner: nextThreadId,
    status: TASK_STATES.ASSIGNED,
    priority: "normal",
    dependencies: [],
    inputs: [],
    goal: String(goalInput || "").trim(),
    acceptance_criteria: [],
    artifacts: [],
    lease_until: "",
    created_at: now,
    updated_at: now,
  };
  writeTask(paths, task);
  appendEvent(paths, teamEvent("task.created", {
    task_id: taskId,
    agent_id: "supervisor",
    payload: { title: task.title, owner: nextThreadId },
  }));
  writeTeamTrace(paths, {
    kind: "task.created",
    task_id: taskId,
    thread_id: nextThreadId,
    agent_id: "supervisor",
    status: TASK_STATES.ASSIGNED,
    summary: `Team task created for ${task.title}.`,
    evidence: {},
    payload: { title: task.title, owner: nextThreadId, goal: task.goal },
  });
  appendEvent(paths, teamEvent("task.assigned", {
    task_id: taskId,
    agent_id: "supervisor",
    payload: { owner: nextThreadId },
  }));
  appendInbox(paths, nextThreadId, {
    type: "task.assigned",
    task_id: taskId,
    payload: { title: task.title, goal: task.goal },
  });
  ensureAgentRecord(paths, nextThreadId, {
    state: "assigned",
    current_task_id: taskId,
    updated_at: now,
  });
  panel.lastActionNotice = `Assigned team task to ${nextThreadId.slice(0, 12)}`;
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
  await panel.refresh({ silent: true });
}

async function claimTaskForThread(panel, threadId) {
  const liveThread = resolveLiveThread(panel, threadId);
  if (!liveThread) return;
  const nextThreadId = liveThread.id;
  const workspacePath = promptForWorkspace(panel);
  const teamState = readTeamSpace(workspacePath);
  if (!teamState.available) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: initialize team space before claiming tasks");
    return;
  }
  const paths = pathsForWorkspace(workspacePath);
  const now = Date.now();
  const task = (teamState.tasks || []).find((item) =>
    item && item.owner === nextThreadId && taskHasStatus(item, CLAIMABLE_TASK_STATES),
  );
  if (!task) {
    vscode.window.showInformationMessage("Codex-Managed-Agent: no assigned task is ready to claim for this thread");
    return;
  }
  task.status = TASK_STATES.RUNNING;
  task.lease_until = toIso(now + (30 * 60 * 1000));
  task.updated_at = toIso(now);
  writeTask(paths, task);
  appendEvent(paths, teamEvent("task.claimed", {
    task_id: task.task_id,
    agent_id: nextThreadId,
    payload: { lease_until: task.lease_until },
  }));
  ensureAgentRecord(paths, nextThreadId, {
    state: "running",
    current_task_id: task.task_id,
    heartbeat_at: toIso(now),
    updated_at: toIso(now),
    last_error: "",
  });
  panel.lastActionNotice = "Task claimed";
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2200);
  await panel.refresh({ silent: true });
}

async function heartbeatThread(panel, threadId) {
  const liveThread = resolveLiveThread(panel, threadId);
  if (!liveThread) return;
  const nextThreadId = liveThread.id;
  const workspacePath = promptForWorkspace(panel);
  const teamState = readTeamSpace(workspacePath);
  if (!teamState.available) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: initialize team space before sending heartbeat");
    return;
  }
  const paths = pathsForWorkspace(workspacePath);
  const now = Date.now();
  const task = (teamState.tasks || []).find((item) => item && item.owner === nextThreadId && taskStatus(item, "") === TASK_STATES.RUNNING);
  if (!task) {
    vscode.window.showInformationMessage("Codex-Managed-Agent: no running team task for this thread");
    return;
  }
  task.lease_until = toIso(now + (30 * 60 * 1000));
  task.updated_at = toIso(now);
  writeTask(paths, task);
  appendEvent(paths, teamEvent("task.progress", {
    task_id: task.task_id,
    agent_id: nextThreadId,
    payload: { lease_until: task.lease_until, kind: "heartbeat" },
  }));
  ensureAgentRecord(paths, nextThreadId, {
    state: "running",
    current_task_id: task.task_id,
    heartbeat_at: toIso(now),
    updated_at: toIso(now),
  });
  panel.lastActionNotice = "Heartbeat recorded";
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2200);
  await panel.refresh({ silent: true });
}

async function blockTaskForThread(panel, threadId) {
  const liveThread = resolveLiveThread(panel, threadId);
  if (!liveThread) return;
  const nextThreadId = liveThread.id;
  const workspacePath = promptForWorkspace(panel);
  const teamState = readTeamSpace(workspacePath);
  if (!teamState.available) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: initialize team space before blocking tasks");
    return;
  }
  const reason = await vscode.window.showInputBox({
    title: "Block Team Task",
    prompt: "Describe why this task is blocked or what handoff is needed",
    value: "",
    ignoreFocusOut: true,
    validateInput: (value) => String(value || "").trim() ? undefined : "Blocked reason cannot be empty",
  });
  if (reason === undefined) return;
  const paths = pathsForWorkspace(workspacePath);
  const task = (teamState.tasks || []).find((item) => item && item.owner === nextThreadId && taskHasStatus(item, BLOCKABLE_TASK_STATES));
  if (!task) {
    vscode.window.showInformationMessage("Codex-Managed-Agent: no active team task for this thread");
    return;
  }
  task.status = TASK_STATES.BLOCKED;
  task.updated_at = toIso();
  writeTask(paths, task);
  appendEvent(paths, teamEvent("task.blocked", {
    task_id: task.task_id,
    agent_id: nextThreadId,
    payload: { reason: String(reason || "").trim() },
  }));
  appendInbox(paths, "supervisor", {
    type: "handoff.requested",
    task_id: task.task_id,
    agent_id: nextThreadId,
    payload: { reason: String(reason || "").trim() },
  });
  ensureAgentRecord(paths, nextThreadId, {
    state: "blocked",
    current_task_id: task.task_id,
    updated_at: toIso(),
    last_error: String(reason || "").trim(),
  });
  panel.lastActionNotice = "Task marked blocked";
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2200);
  await panel.refresh({ silent: true });
}

async function completeTaskForThread(panel, threadId) {
  const liveThread = resolveLiveThread(panel, threadId);
  if (!liveThread) return;
  const nextThreadId = liveThread.id;
  const workspacePath = promptForWorkspace(panel);
  const teamState = readTeamSpace(workspacePath);
  if (!teamState.available) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: initialize team space before completing tasks");
    return;
  }
  const summary = await vscode.window.showInputBox({
    title: "Complete Team Task",
    prompt: "Enter a short result summary for the completed task",
    value: "",
    ignoreFocusOut: true,
    validateInput: (value) => String(value || "").trim() ? undefined : "Result summary cannot be empty",
  });
  if (summary === undefined) return;
  const paths = pathsForWorkspace(workspacePath);
  const task = (teamState.tasks || []).find((item) => item && item.owner === nextThreadId && taskHasStatus(item, COMPLETABLE_TASK_STATES));
  if (!task) {
    vscode.window.showInformationMessage("Codex-Managed-Agent: no completable team task for this thread");
    return;
  }
  const result = {
    summary: String(summary || "").trim(),
    outputs: [],
    checks_run: [],
    open_risks: [],
    next_request: "",
  };
  task.status = TASK_STATES.COMPLETED;
  task.lease_until = "";
  task.updated_at = toIso();
  task.result = result;
  writeTask(paths, task);
  appendEvent(paths, teamEvent("task.completed", {
    task_id: task.task_id,
    agent_id: nextThreadId,
    payload: result,
  }));
  appendInbox(paths, "supervisor", {
    type: "task.completed",
    task_id: task.task_id,
    agent_id: nextThreadId,
    payload: result,
  });
  ensureAgentRecord(paths, nextThreadId, {
    state: "idle",
    current_task_id: "",
    heartbeat_at: toIso(),
    updated_at: toIso(),
    last_error: "",
  });
  panel.lastActionNotice = "Task completed";
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2200);
  await panel.refresh({ silent: true });
}

async function markStaleTeamTasks(panel) {
  const workspacePath = promptForWorkspace(panel);
  const teamState = readTeamSpace(workspacePath);
  if (!teamState.available) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: initialize team space before marking stale tasks");
    return;
  }
  const paths = pathsForWorkspace(workspacePath);
  const now = Date.now();
  const staleTasks = (teamState.tasks || []).filter((task) => {
    if (!task || taskStatus(task, "") !== TASK_STATES.RUNNING) return false;
    const leaseUntil = parseIsoTime(task.lease_until);
    return leaseUntil !== null && leaseUntil < now;
  });
  if (!staleTasks.length) {
    vscode.window.showInformationMessage("Codex-Managed-Agent: no expired running team leases found");
    return;
  }
  const updatedAt = toIso(now);
  staleTasks.forEach((task) => {
    const previousOwner = task.owner || "";
    task.status = TASK_STATES.STALE;
    task.updated_at = updatedAt;
    writeTask(paths, task);
    appendEvent(paths, teamEvent("task.stale", {
      task_id: task.task_id,
      agent_id: "supervisor",
      payload: {
        owner: previousOwner,
        lease_until: task.lease_until || "",
      },
    }));
    appendInbox(paths, "supervisor", {
      type: "task.stale",
      task_id: task.task_id,
      agent_id: previousOwner,
      payload: {
        reason: "Lease expired without heartbeat",
        lease_until: task.lease_until || "",
      },
    });
  });
  panel.lastActionNotice = `Marked ${staleTasks.length} team task${staleTasks.length === 1 ? "" : "s"} stale`;
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
  await panel.refresh({ silent: true });
}

async function updateAgentRolePrompt(panel, agentId) {
  const nextAgentId = safeName(agentId || "", "");
  if (!nextAgentId) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: no team agent selected");
    return;
  }
  const workspacePath = promptForWorkspace(panel);
  if (!workspacePath) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: no workspace available for team agent role prompt");
    return;
  }
  const paths = pathsForWorkspace(workspacePath);
  if (!fs.existsSync(paths.root)) {
    await initializeTeamSpace(panel);
  }
  const current = ensureAgentRecord(paths, nextAgentId, {
    updated_at: toIso(),
  });
  const roleInput = await vscode.window.showInputBox({
    title: "Edit Team Agent Role Prompt",
    prompt: "Describe this agent's role, responsibility boundary, and interaction style. This changes only CMA team metadata.",
    value: String(current.role_prompt || defaultAgentRolePrompt(nextAgentId)),
    ignoreFocusOut: true,
    validateInput: (value) => String(value || "").trim() ? undefined : "Role prompt cannot be empty",
  });
  if (roleInput === undefined) return;
  const now = toIso();
  ensureAgentRecord(paths, nextAgentId, {
    role_prompt: String(roleInput || "").trim(),
    updated_at: now,
  });
  appendEvent(paths, teamEvent("agent.role_prompt.updated", {
    agent_id: "supervisor",
    payload: { target_agent_id: nextAgentId },
  }));
  panel.lastActionNotice = `Updated role prompt for ${nextAgentId.slice(0, 12)}`;
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2400);
  await panel.refresh({ silent: true });
}

function resolveDemoThread(panel, threadId) {
  const requested = String(threadId || "").trim();
  if (requested && !requested.startsWith("pending-new-agent-")) return resolveLiveThread(panel, requested);
  const selectedId = String(panel.selectedThreadId || "");
  const selected = selectedId && !selectedId.startsWith("pending-new-agent-") ? resolveLiveThread(panel, selectedId) : undefined;
  if (selected) return selected;
  const threads = panel.lastPayload
    && panel.lastPayload.dashboard
    && Array.isArray(panel.lastPayload.dashboard.threads)
    ? panel.lastPayload.dashboard.threads
    : [];
  return threads.find((thread) => thread && thread.id && !String(thread.id || "").startsWith("pending-new-agent-"));
}

const {
  createSnakeDemoTeamTask,
  createTeamWorkspace,
  generateTeamOrchestrationDraft,
  saveTeamOrchestrationDraft,
  updateTeamTaskDispatch,
  prepareTeamTaskRetry,
  deleteTeamTask,
  deleteTeamWorkspace,
} = createTeamActions({
  vscode,
  fs,
  path,
  crypto,
  SNAKE_DEMO_PROMPT,
  TASK_STATES,
  WORKER_PROVIDER_GEMINI,
  DEFAULT_GEMINI_CLI_MODEL,
  normalizeWorkerProvider,
  promptForWorkspace,
  pathsForWorkspace,
  initializeTeamSpace,
  toIso,
  reserveTaskId,
  makeTaskId,
  makeId,
  readJson,
  writeTask,
  appendEvent,
  teamEvent,
  writeTeamTrace,
  appendInbox,
  ensureAgentRecord,
  compileTeamWorkerPrompt,
  teamReflectiveSkillInstalled,
  teamWorkspaceIdForTaskId,
  teamWorkspaceTaskPath,
  teamWorkspacePaths,
  resolveLiveThread,
  syncTaskWorkspace,
  applyBuiltInRoleOrganizationTemplateToDraft,
  writeDagRun,
  explainDagSchedule,
  compileWorkerPrompt,
  persistWorkerPromptSnapshot,
  compileSupervisorPrompt,
  taskStatus,
  readRuntimeTraceState,
  resolveTraceThreadId,
  findTaskById,
  readDagRun,
  readAgentRecords,
  safeName,
});

const {
  taskIdForWorkspace,
  prepareTeamWorkspaceRun,
  launchTeamWorkspaceOrchestration,
} = createTeamOrchestrationLauncher({
  vscode,
  crypto,
  fs,
  path,
  accountManager,
  DEFAULT_GEMINI_CLI_MODEL,
  WORKER_PROVIDER_CODEX,
  WORKER_PROVIDER_GEMINI,
  TASK_STATES,
  promptForWorkspace,
  pathsForWorkspace,
  safeName,
  teamWorkspacePaths,
  teamWorkspaceTaskPath,
  readJson,
  findTaskById,
  writeTask,
  appendEvent,
  teamEvent,
  writeTeamTrace,
  resolveTraceThreadId,
  taskStatus,
  toIso,
  readDagRun,
  explainDagSchedule,
  runLaunchSchedulerTick,
  normalizeWorkerProvider,
  assessTeamWorkerPreflight,
  preflightCodexCli,
  prepareTeamTaskRetry,
  updateTeamTaskDispatch,
  launchGeminiCliTeamWorker,
  launchDedicatedTeamWorker,
  ensureAgentRecord,
});

function readTeamCoordination(panel, dashboard, detail) {
  const workspacePath = promptForWorkspace(panel);
  const teamState = readTeamSpace(workspacePath);
  const rolePlugins = buildRolePluginCatalog(workspacePath);
  const organizationTemplates = buildRoleOrganizationTemplateCatalog();
  const openWorkspaceId = String((panel && panel.pendingTeamWorkspacePageId) || "");
  if (panel && openWorkspaceId) panel.pendingTeamWorkspacePageId = "";
  if (!detail || !detail.thread) {
    return {
      ...teamState,
      rolePlugins,
      organizationTemplates,
      openWorkspaceId,
    };
  }
  return {
    ...teamState,
    rolePlugins,
    organizationTemplates,
    openWorkspaceId,
    threadState: deriveThreadCoordination(detail.thread.id, teamState),
  };
}

module.exports = {
  readTeamCoordination,
  readTeamSpace,
  pathsForWorkspace,
  validateTeamTaskRecord,
  validateTeamAgentRecord,
  validateTeamEventRecord,
  validateTeamInboxRecord,
  validateTeamSpaceFiles,
  TASK_STATES,
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
  SNAKE_DEMO_PROMPT,
};
