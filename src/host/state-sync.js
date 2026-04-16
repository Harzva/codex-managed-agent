const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const {
  getConfig,
  summarizeServiceState,
  fetchDashboardState,
  fetchThreadDetail,
  probeServer,
  startServer,
} = require("./server");
const { readFileTail } = require("./auto-continue");
const { readTeamCoordination } = require("./team-coordination");
const { ingestKnownCliUsageLogs, readLatestThreadUsageEvent } = require("./usage-ledger");
const { buildThreadInsight } = require("./thread-insight");

async function ensureServer(panel, options = {}) {
  const config = getConfig();
  const probe = await probeServer(config.baseUrl);
  if (probe.ok) {
    return summarizeServiceState(true, {
      baseUrl: config.baseUrl,
      autoStarted: false,
      message: "Connected",
    });
  }

  if (!config.autoStartServer && !options.forceStart) {
    return summarizeServiceState(false, {
      baseUrl: config.baseUrl,
      autoStarted: false,
      message: probe.error || "Server not reachable",
    });
  }

  const start = await startServer(panel.extensionUri);
  if (!start.ok) {
    return summarizeServiceState(false, {
      baseUrl: config.baseUrl,
      autoStarted: true,
      message: start.error || "Failed to start server",
      logPath: start.logPath,
    });
  }

  return summarizeServiceState(true, {
    baseUrl: config.baseUrl,
    autoStarted: true,
    message: "Server started",
    logPath: start.logPath,
  });
}

async function openExternal(panel) {
  const config = getConfig();
  const target = await vscode.env.asExternalUri(vscode.Uri.parse(config.baseUrl));
  await vscode.env.openExternal(target);
}

function isPidRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function readTextFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return "";
    return fs.readFileSync(filePath, "utf8").trim();
  } catch {
    return "";
  }
}

function shortText(value, max = 120) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function extractHeading(text) {
  const lines = String(text || "").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) {
      return trimmed.replace(/^#+\s*/, "").trim();
    }
  }
  return "";
}

function extractSummaryLine(text) {
  const lines = String(text || "").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    return shortText(trimmed, 140);
  }
  return "";
}

function readMemoryCardSources(panel) {
  const sources = [
    {
      kind: "prompt",
      filePath: path.join(panel.extensionUri.fsPath, ".codex-loop", "prompt.md"),
      fallbackTitle: "Prompt Card",
      fallbackCopy: "Link a reusable working prompt beside live agent activity.",
      actionLabel: "Open Prompt",
    },
    {
      kind: "rule",
      filePath: path.join(panel.extensionUri.fsPath, "ROADMAP.md"),
      fallbackTitle: "Rule Card",
      fallbackCopy: "Surface durable guardrails and roadmap rules without burying them in tabs.",
      actionLabel: "Open ROADMAP",
    },
    {
      kind: "memo",
      filePath: path.join(panel.extensionUri.fsPath, ".claude", "plans", "ACTIVE_PLAN.md"),
      fallbackTitle: "Memo Card",
      fallbackCopy: "Keep the active plan and latest reminders visible as working memory.",
      actionLabel: "Open Active Plan",
    },
  ];
  return sources.map((source) => {
    const exists = fs.existsSync(source.filePath);
    const content = exists ? fs.readFileSync(source.filePath, "utf8") : "";
    return {
      kind: source.kind,
      title: extractHeading(content) || path.basename(source.filePath) || source.fallbackTitle,
      copy: extractSummaryLine(content) || source.fallbackCopy,
      sourcePath: path.relative(panel.extensionUri.fsPath, source.filePath).replace(/\\/g, "/") || undefined,
      actionLabel: source.actionLabel,
      linked: exists,
    };
  });
}

function coordinationCorpus(thread) {
  const previewLogs = Array.isArray(thread?.preview_logs) ? thread.preview_logs : [];
  const history = Array.isArray(thread?.history) ? thread.history : [];
  return [
    ...previewLogs.map((item) => item && (item.message || item.target || "")).filter(Boolean),
    ...history.map((item) => item && item.text).filter(Boolean),
  ].join(" \n").toLowerCase();
}

function deriveCoordinationState(thread) {
  const status = String(thread?.status || "").trim().toLowerCase();
  const corpus = coordinationCorpus(thread);
  const needsHandoff = /need your|need you|your input|user input|human|manual|approval|approve|confirm|please provide|please choose|upload|login|sign in|token|pat|credential|blocked|waiting for user|intervention/.test(corpus);
  if (needsHandoff) {
    return {
      key: "handoff",
      label: "Handoff",
      reason: "Needs input, approval, or another thread to take over.",
    };
  }
  if (status === "running") {
    return {
      key: "owner",
      label: "Owner",
      reason: "Active executor for the current slice.",
    };
  }
  return {
    key: "waiting",
    label: "Waiting",
    reason: "Ready for a follow-up assignment or baton pass.",
  };
}

function normalizeWorkspacePath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const normalized = raw.replace(/\\/g, "/").replace(/\/+$/, "");
  return normalized || raw;
}

function deriveRootIdentity(cwd) {
  const rootKey = normalizeWorkspacePath(cwd);
  if (!rootKey) {
    return {
      rootKey: undefined,
      rootLabel: undefined,
    };
  }
  const parts = rootKey.split("/").filter(Boolean);
  return {
    rootKey,
    rootLabel: parts[parts.length - 1] || rootKey,
  };
}

function enrichThreadRootIdentity(thread) {
  if (!thread || typeof thread !== "object") return thread;
  const cwd = normalizeWorkspacePath(thread.cwd);
  const identity = deriveRootIdentity(cwd);
  return {
    ...thread,
    cwd: cwd || thread.cwd,
    rootKey: identity.rootKey,
    rootLabel: identity.rootLabel,
    coordinationState: deriveCoordinationState(thread),
  };
}

function enrichDashboardRootIdentity(dashboard) {
  const nextDashboard = dashboard && typeof dashboard === "object" ? dashboard : {};
  return {
    ...nextDashboard,
    threads: Array.isArray(nextDashboard.threads) ? nextDashboard.threads.map(enrichThreadRootIdentity) : [],
    runningThreads: Array.isArray(nextDashboard.runningThreads) ? nextDashboard.runningThreads.map(enrichThreadRootIdentity) : [],
  };
}

function enrichDetailRootIdentity(detail) {
  if (!detail || typeof detail !== "object") return detail;
  return detail.thread
    ? {
        ...detail,
        thread: enrichThreadRootIdentity(detail.thread),
      }
    : detail;
}

function readActiveWorkspaceRoots() {
  const folders = vscode.workspace.workspaceFolders || [];
  const seen = new Set();
  return folders.map((folder) => {
    const fsPath = normalizeWorkspacePath(folder?.uri?.fsPath || "");
    const identity = deriveRootIdentity(fsPath);
    return {
      path: fsPath || undefined,
      rootKey: identity.rootKey,
      rootLabel: identity.rootLabel,
      name: String(folder?.name || identity.rootLabel || "").trim() || undefined,
    };
  }).filter((root) => {
    if (!root.rootKey || seen.has(root.rootKey)) return false;
    seen.add(root.rootKey);
    return true;
  });
}

function readCodexLoopDaemonStateFromDir(stateDir) {
  if (!fs.existsSync(stateDir)) {
    return {
      available: false,
      running: false,
      label: "Unavailable",
      detail: "No local codex-loop state directory found.",
    };
  }
  const pidText = readTextFile(path.join(stateDir, "daemon.pid"));
  const pid = Number.parseInt(pidText, 10);
  const heartbeat = readJsonFile(path.join(stateDir, "daemon_heartbeat.json")) || {};
  const launcherInfo = readJsonFile(path.join(stateDir, "daemon_launcher.json")) || {};
  const status = readJsonFile(path.join(stateDir, "status.json")) || {};
  const daemonStdoutPath = path.join(stateDir, "logs", "daemon_stdout.log");
  const promptFile = launcherInfo.prompt_file || launcherInfo.promptFile || status.prompt_file || "";
  const threadId = readTextFile(path.join(stateDir, "thread_id.txt")) || status.thread_id || "";
  const workspace = launcherInfo.workspace || status.workspace || path.dirname(path.dirname(stateDir));
  const roadmapPath = workspace ? path.join(workspace, "ROADMAP.md") : "";
  const running = isPidRunning(pid);
  const interval = heartbeat.interval_minutes || heartbeat.intervalMinutes;
  const launcher = launcherInfo.launcher || "unknown";
  const tmuxSession = launcherInfo.tmux_session || launcherInfo.tmuxSession || "";
  const heartbeatPhase = heartbeat.phase || status.phase || "";
  const heartbeatAt = heartbeat.stopped_at || heartbeat.last_sleep_started_at || heartbeat.last_loop_started_at || heartbeat.updated_at || status.finished_at || status.started_at || "";
  const latestStatus = status.phase || "";
  const exitedUnexpectedly = !running && Number.isInteger(pid) && pid > 0 && heartbeatPhase && heartbeatPhase !== "stopped";
  const lastSummary = shortText(status.last_message_preview || "", 140);
  const tokenSummary = Number(status.last_total_tokens || 0) > 0
    ? `Tokens ${status.last_total_tokens} (${status.last_input_tokens || 0}/${status.last_output_tokens || 0})`
    : "";
  const rawLogPath = shortText(status.raw_log_path || "", 120);
  const tail = readFileTail(status.raw_log_path, 6000).trim();
  const tailLine = shortText(
    tail.split(/\n/).map((line) => line.trim()).filter(Boolean).slice(-1)[0] || "",
    180,
  );
  const metadataParts = [
    threadId ? `Thread ${threadId.slice(0, 12)}` : "",
    launcher ? `Launcher ${launcher}` : "",
    exitedUnexpectedly ? "Exited unexpectedly" : "",
    heartbeatPhase ? `${exitedUnexpectedly ? "Last heartbeat" : "Heartbeat"} ${heartbeatPhase}` : "",
    interval ? `${interval} min interval` : "",
    latestStatus ? `${exitedUnexpectedly ? "Last status" : "Status"} ${latestStatus}` : "",
    tokenSummary,
    rawLogPath ? `Log ${rawLogPath}` : "",
    lastSummary ? `Last tick ${lastSummary}` : "",
  ].filter(Boolean);
  return {
    available: true,
    running,
    pid: Number.isInteger(pid) ? pid : undefined,
    threadId: threadId || undefined,
    workspace: workspace || undefined,
    workspaceLabel: path.basename(workspace || "") || workspace || undefined,
    stateDir,
    promptFile: promptFile || undefined,
    promptFileLabel: promptFile ? path.basename(promptFile) : undefined,
    roadmapPath: roadmapPath && fs.existsSync(roadmapPath) ? roadmapPath : undefined,
    daemonStdoutPath: fs.existsSync(daemonStdoutPath) ? daemonStdoutPath : undefined,
    launcher,
    tmuxSession: tmuxSession || undefined,
    heartbeatPhase: heartbeatPhase || undefined,
    heartbeatAt: heartbeatAt || undefined,
    intervalMinutes: interval || undefined,
    lastInputTokens: Number(status.last_input_tokens || 0) || undefined,
    lastOutputTokens: Number(status.last_output_tokens || 0) || undefined,
    lastTotalTokens: Number(status.last_total_tokens || 0) || undefined,
    rawLogPath: status.raw_log_path || undefined,
    tailLine: tailLine || undefined,
    label: running ? "Running" : (exitedUnexpectedly ? "Exited Unexpectedly" : "Stopped Cleanly"),
    detail: metadataParts.length
      ? metadataParts.join(" · ")
      : (running
        ? (interval ? `Heartbeat active · ${interval} min interval` : "Heartbeat active")
        : (exitedUnexpectedly ? "Exited unexpectedly" : (status.phase ? `Last status: ${status.phase}` : "No active daemon heartbeat"))),
  };
}

function readCodexLoopDaemonState(panel) {
  const stateDir = path.join(panel.extensionUri.fsPath, ".codex-loop", "state");
  return readCodexLoopDaemonStateFromDir(stateDir);
}

function collectLoopStateDirs(panel, dashboard, workspaceRoots, detail) {
  const candidates = new Set();
  const addWorkspace = (workspacePath) => {
    const normalized = normalizeWorkspacePath(workspacePath);
    if (!normalized) return;
    candidates.add(path.join(normalized, ".codex-loop", "state"));
  };

  addWorkspace(panel.extensionUri.fsPath);
  (workspaceRoots || []).forEach((root) => addWorkspace(root && (root.path || root.rootKey)));
  const threadPools = []
    .concat(Array.isArray(dashboard?.threads) ? dashboard.threads : [])
    .concat(Array.isArray(dashboard?.runningThreads) ? dashboard.runningThreads : []);
  threadPools.forEach((thread) => addWorkspace(thread && thread.cwd));
  if (detail && detail.thread) addWorkspace(detail.thread.cwd);
  return [...candidates];
}

function readCodexLoopDaemonStates(panel, dashboard, workspaceRoots, detail) {
  const states = collectLoopStateDirs(panel, dashboard, workspaceRoots, detail)
    .map((stateDir) => readCodexLoopDaemonStateFromDir(stateDir))
    .filter((item) => item && item.available);
  states.sort((a, b) => {
    const runningDelta = Number(Boolean(b.running)) - Number(Boolean(a.running));
    if (runningDelta) return runningDelta;
    const labelA = String(a.workspaceLabel || a.workspace || "");
    const labelB = String(b.workspaceLabel || b.workspace || "");
    return labelA.localeCompare(labelB);
  });
  return states;
}

function readCodexLoopSupport(panel) {
  const scriptPath = path.join(
    process.env.CODEX_HOME ? path.resolve(process.env.CODEX_HOME) : path.join(require("os").homedir(), ".codex"),
    "skills",
    "codex-loop",
    "scripts",
    "codex_loop_automation.py",
  );
  return {
    available: fs.existsSync(scriptPath),
    scriptPath,
    installUrl: "https://github.com/Harzva/codex-managed-agent",
  };
}

function postMessage(panel, payload) {
  if (panel.panel) panel.panel.webview.postMessage(payload);
  if (panel.sidebarView) panel.sidebarView.webview.postMessage(payload);
  if (panel.bottomView) panel.bottomView.webview.postMessage(payload);
}

function broadcastState(panel, payload) {
  const codexLinkState = panel.getCodexLinkState();
  const enrichedPayload = {
    ...payload,
    codexLinkState,
  };
  panel.lastPayload = enrichedPayload;
  if (panel.panel) {
    panel.panel.webview.postMessage({
      ...enrichedPayload,
      currentSurface: panel.editorSurface,
    });
  }
  if (panel.sidebarView) {
    panel.sidebarView.webview.postMessage({
      ...enrichedPayload,
      currentSurface: "left",
    });
  }
  if (panel.bottomView) {
    panel.bottomView.webview.postMessage({
      ...enrichedPayload,
      currentSurface: "bottom",
    });
  }
}

function broadcastLinkState(panel) {
  if (!panel.hasSurface() || !panel.lastPayload) return;
  const codexLinkState = panel.getCodexLinkState();
  panel.lastPayload = {
    ...panel.lastPayload,
    codexLinkState,
  };
  postMessage(panel, {
    type: "codexLinkStatePatched",
    codexLinkState,
  });
}

function promptQueueConfirmed(entry, thread, effectiveRunningIds, detailThread) {
  if (!entry) return false;
  if (effectiveRunningIds.has(entry.threadId)) return true;
  const queuedAtMs = Date.parse(entry.queuedAt || "");
  if (!Number.isFinite(queuedAtMs)) return false;
  const candidates = [thread, detailThread];
  return candidates.some((item) => {
    if (!item) return false;
    const updatedAtMs = Date.parse(item.updated_at_iso || item.updatedAt || "");
    if (Number.isFinite(updatedAtMs) && updatedAtMs >= queuedAtMs - 1000) {
      return true;
    }
    const previewLogs = Array.isArray(item.preview_logs) ? item.preview_logs : [];
    return previewLogs.some((log) => {
      const logTsMs = Date.parse(log.ts_iso || "");
      return Number.isFinite(logTsMs) && logTsMs >= queuedAtMs - 1000;
    });
  });
}

function reconcileOptimisticQueuedPrompts(panel, dashboard, effectiveRunningIds, detail) {
  const pending = panel.optimisticQueuedPrompts || {};
  const threads = Array.isArray(dashboard?.threads) ? dashboard.threads : [];
  const next = {};
  Object.entries(pending).forEach(([threadId, entry]) => {
    const thread = threads.find((item) => item.id === threadId);
    const detailThread = detail && detail.thread && detail.thread.id === threadId ? detail.thread : undefined;
    if (!promptQueueConfirmed(entry, thread, effectiveRunningIds, detailThread)) {
      next[threadId] = entry;
    }
  });
  panel.optimisticQueuedPrompts = next;
}

function mergePendingNewAgentCards(panel, dashboard) {
  const pendingCards = Array.isArray(panel.pendingNewAgentCards) ? panel.pendingNewAgentCards : [];
  if (!pendingCards.length || !dashboard || !Array.isArray(dashboard.threads)) return dashboard;
  const realIds = new Set(dashboard.threads.map((thread) => thread && thread.id).filter(Boolean));
  const freshPending = pendingCards.filter((thread) => {
    if (!thread || !thread.id || realIds.has(thread.id)) return false;
    const createdMs = Number(thread.created_at || 0) * 1000;
    return !createdMs || (Date.now() - createdMs) < 30 * 60 * 1000;
  });
  panel.pendingNewAgentCards = freshPending;
  if (!freshPending.length) return dashboard;
  return {
    ...dashboard,
    threads: [...freshPending, ...dashboard.threads],
    threadsMeta: dashboard.threadsMeta
      ? {
          ...dashboard.threadsMeta,
          total: Number(dashboard.threadsMeta.total || dashboard.threads.length) + freshPending.length,
        }
      : dashboard.threadsMeta,
  };
}

async function refresh(panel, options = {}) {
  if (!panel.hasSurface()) return;
  ingestKnownCliUsageLogs();

  const service = await ensureServer(panel);
  const workspaceRoots = readActiveWorkspaceRoots();
  const memoryCards = readMemoryCardSources(panel);
  if (!service.ok) {
    broadcastState(panel, {
      type: "state",
      service,
      dashboard: null,
      memoryCards,
      workspaceRoots,
      selectedThreadId: panel.selectedThreadId,
      actionNotice: panel.lastActionNotice,
      lastSuccessfulRefreshAt: panel.lastSuccessfulRefreshAt,
    });
    if (!options.silent) {
      vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${service.message}`, 2500);
    }
    return;
  }

  try {
    const rawDashboard = await fetchDashboardState(service.baseUrl);
    const dashboard = mergePendingNewAgentCards(panel, enrichDashboardRootIdentity(rawDashboard));
    const rawDetail = panel.selectedThreadId
      ? enrichDetailRootIdentity(await fetchThreadDetail(service.baseUrl, panel.selectedThreadId).catch(() => null))
      : null;
    const detail = rawDetail?.thread
      ? {
          ...rawDetail,
          tokenUsage: readLatestThreadUsageEvent(rawDetail.thread.id),
          threadInsight: buildThreadInsight(panel, rawDetail),
        }
      : rawDetail;
    const loopDaemons = readCodexLoopDaemonStates(panel, dashboard, workspaceRoots, detail);
    const loopDaemon = loopDaemons.find((item) => item.running) || loopDaemons[0] || readCodexLoopDaemonState(panel);
    const loopSupport = readCodexLoopSupport(panel);
    const teamCoordination = readTeamCoordination(panel, dashboard, detail);
    const codexLinkState = panel.getCodexLinkState();
    const currentThreads = Array.isArray(dashboard.threads) ? dashboard.threads : [];
    const effectiveRunningThreads = (dashboard.runningThreads || []).filter((thread) =>
      panel.isEffectivelyRunningThread(thread, codexLinkState),
    );
    const nextRunningIds = new Set(effectiveRunningThreads.map((thread) => thread.id));
    const completedEvents = [...panel.previousRunningIds]
      .filter((threadId) => !nextRunningIds.has(threadId))
      .map((threadId) => {
        const thread = currentThreads.find((item) => item.id === threadId) || {};
        return {
          id: `${threadId}:${Date.now()}`,
          threadId,
          title: thread.title || threadId,
          status: thread.status || "completed",
          updatedAt: thread.updated_at_iso || "",
        };
      });
    for (const item of completedEvents) {
      const loopConfig = panel.autoContinueConfigs[item.threadId];
      if (loopConfig && loopConfig.active && loopConfig.remaining > 0) {
        await panel.triggerAutoContinue(item.threadId, loopConfig);
      }
    }
    if (completedEvents.length) {
      panel.recentCompletions = [...completedEvents, ...panel.recentCompletions].slice(0, 8);
      const label = completedEvents.length === 1
        ? completedEvents[0].title
        : `${completedEvents.length} threads`;
      vscode.window.showInformationMessage(`Codex-Managed-Agent: completed ${label}`);
    }
    panel.previousRunningIds = nextRunningIds;
    if (!panel.selectedThreadId && dashboard.threads.length) {
      panel.selectedThreadId = dashboard.threads[0].id;
    }
    const hasSelected = dashboard.threads.some((thread) => thread.id === panel.selectedThreadId);
    if (!hasSelected) {
      panel.selectedThreadId = dashboard.threads[0]?.id;
    }
    reconcileOptimisticQueuedPrompts(panel, dashboard, nextRunningIds, detail);
    panel.lastSuccessfulRefreshAt = new Date().toISOString();

    broadcastState(panel, {
      type: "state",
      service,
      dashboard,
      memoryCards,
      workspaceRoots,
      effectiveRunningThreadIds: [...nextRunningIds],
      selectedThreadId: panel.selectedThreadId,
      detail,
      recentCompletions: panel.recentCompletions,
      loopDaemon,
      loopDaemons,
      loopSupport,
      teamCoordination,
      autoContinueConfigs: panel.enrichAutoContinueConfigs(),
      optimisticQueuedPrompts: panel.optimisticQueuedPrompts,
      actionNotice: panel.lastActionNotice,
      lastSuccessfulRefreshAt: panel.lastSuccessfulRefreshAt,
    });
    if (!options.silent) {
      vscode.window.setStatusBarMessage("Codex-Managed-Agent ready", 1800);
    }
  } catch (error) {
    broadcastState(panel, {
      type: "state",
      service: summarizeServiceState(false, {
        baseUrl: service.baseUrl,
        autoStarted: service.autoStarted,
        message: error instanceof Error ? error.message : String(error),
        logPath: service.logPath,
      }),
      dashboard: null,
      memoryCards,
      workspaceRoots,
      selectedThreadId: panel.selectedThreadId,
      actionNotice: panel.lastActionNotice,
      lastSuccessfulRefreshAt: panel.lastSuccessfulRefreshAt,
    });
  }
}

module.exports = {
  ensureServer,
  openExternal,
  postMessage,
  broadcastState,
  broadcastLinkState,
  refresh,
};
