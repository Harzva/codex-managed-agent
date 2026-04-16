const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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

function safeName(value, fallback = "workspace") {
  const text = String(value || "").trim();
  const next = text.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
  return next || fallback;
}

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
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

function reserveTaskId(paths, baseTaskId) {
  const base = safeName(baseTaskId || "task", "task");
  let taskId = base;
  let suffix = 2;
  while (fs.existsSync(path.join(paths.tasksDir, `${taskId}.json`))) {
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

function taskStatus(task, fallback = TASK_STATES.QUEUED) {
  return String((task && task.status) || fallback);
}

function taskHasStatus(task, states) {
  return states.has(taskStatus(task, ""));
}

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
    tasksDir: root ? path.join(root, "tasks") : "",
    eventsDir: root ? path.join(root, "events") : "",
    inboxDir: root ? path.join(root, "inbox") : "",
    agentsDir: root ? path.join(root, "agents") : "",
    viewsDir: root ? path.join(root, "views") : "",
    teamBriefPath: root ? path.join(root, "team.md") : "",
    metaPath: root ? path.join(root, "team-space.json") : "",
    eventsLogPath: root ? path.join(root, "events", "events.jsonl") : "",
  };
}

function buildTeamBrief(workspacePath) {
  const label = path.basename(workspacePath || "") || "workspace";
  return `# Team Brief

Workspace: ${label}

## Shared Goal
- Keep multiple Codex threads aligned inside one shared task space.

## Operating Rules
- Treat this file as the human-readable operating brief.
- Treat \`tasks/*.json\`, \`events/*.jsonl\`, and \`agents/*.json\` as the structured coordination source.
- Do not use this file as the only source of task truth.

## Shared Context
- Add durable links, constraints, and review notes here.

## Active Focus
- Keep the current milestone and handoff notes concise and current.
`;
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

function ensureAgentRecord(paths, agentId, patch = {}) {
  const nextAgentId = safeName(agentId || "supervisor", "supervisor");
  const filePath = path.join(paths.agentsDir, `${nextAgentId}.json`);
  const current = readJson(filePath, {});
  const next = {
    state: current.state || "idle",
    current_task_id: current.current_task_id || "",
    heartbeat_at: current.heartbeat_at || "",
    last_error: current.last_error || "",
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
  return listJsonFiles(paths.tasksDir)
    .map((filePath) => readTaskRecordFile(filePath))
    .filter(Boolean)
    .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
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
  return task && task.task_id ? task : null;
}

function writeTask(paths, task) {
  const taskId = String((task && task.task_id) || "").trim();
  const fileTaskId = safeName(taskId, "");
  if (!taskId || fileTaskId !== taskId) return false;
  writeJson(path.join(paths.tasksDir, `${fileTaskId}.json`), task);
  return true;
}

function isEventEnvelope(event) {
  return Boolean(
    event
    && String(event.event_id || "").trim()
    && String(event.type || "").trim()
    && String(event.timestamp || "").trim()
  );
}

function appendEvent(paths, event) {
  if (!isEventEnvelope(event)) return false;
  appendJsonl(paths.eventsLogPath, event);
  return true;
}

function isInboxEnvelope(message) {
  return Boolean(
    message
    && String(message.message_id || "").trim()
    && String(message.target_agent_id || "").trim()
    && String(message.created_at || "").trim()
  );
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

function eventTail(paths, limit = 8) {
  try {
    if (!fs.existsSync(paths.eventsLogPath)) return [];
    const lines = fs.readFileSync(paths.eventsLogPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-limit);
    return lines.map((line) => parseEventLine(line)).filter(Boolean).reverse();
  } catch {
    return [];
  }
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
    return {
      available: false,
      workspace: paths.workspace || undefined,
      workspaceLabel: path.basename(paths.workspace || "") || undefined,
      root: paths.root || undefined,
      teamBriefPath: paths.teamBriefPath || undefined,
      tasks: [],
      agents: [],
      recentEvents: [],
      summary: {
        taskCount: 0,
        blockedCount: 0,
        runningCount: 0,
        assignedCount: 0,
        completedCount: 0,
        staleCount: 0,
        agentCount: 0,
      },
    };
  }
  const tasks = readTaskRecords(paths);
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
  return {
    available: true,
    workspace: paths.workspace,
    workspaceLabel: path.basename(paths.workspace || "") || paths.workspace || undefined,
    root: paths.root,
    teamBriefPath: paths.teamBriefPath,
    tasks,
    agents,
    recentEvents: eventTail(paths),
    summary: counts,
  };
}

async function initializeTeamSpace(panel) {
  const workspacePath = promptForWorkspace(panel);
  if (!workspacePath) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: no workspace available for team space");
    return;
  }
  const paths = pathsForWorkspace(workspacePath);
  fs.mkdirSync(paths.tasksDir, { recursive: true });
  fs.mkdirSync(paths.eventsDir, { recursive: true });
  fs.mkdirSync(paths.inboxDir, { recursive: true });
  fs.mkdirSync(paths.agentsDir, { recursive: true });
  fs.mkdirSync(paths.viewsDir, { recursive: true });
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
  });
  panel.lastActionNotice = `Marked ${staleTasks.length} team task${staleTasks.length === 1 ? "" : "s"} stale`;
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
  await panel.refresh({ silent: true });
}

function readTeamCoordination(panel, dashboard, detail) {
  const workspacePath = promptForWorkspace(panel);
  const teamState = readTeamSpace(workspacePath);
  if (!detail || !detail.thread) return teamState;
  return {
    ...teamState,
    threadState: deriveThreadCoordination(detail.thread.id, teamState),
  };
}

module.exports = {
  readTeamCoordination,
  initializeTeamSpace,
  openTeamBrief,
  assignTaskToThread,
  claimTaskForThread,
  heartbeatThread,
  blockTaskForThread,
  completeTaskForThread,
  markStaleTeamTasks,
};
