const vscode = require("vscode");
const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

const {
  getConfig,
  serviceMetadataFromPayload,
  summarizeServiceState,
  fetchDashboardState,
  fetchRunningThreadsState,
  fetchThreadsByIds,
  fetchThreadDetail,
  probeServer,
  startServer,
} = require("./server");
const { readFileTail } = require("./auto-continue");
const { readTeamCoordination, pathsForWorkspace } = require("./team-coordination");
const { resolveTracePath, summarizeTrace, tailTrace, writeThreadTrace } = require("./trace-core");
const { buildTraceDashboardPayload } = require("./trace-dashboard");
const { ingestKnownCliUsageLogs, readLatestThreadUsageEvent } = require("./usage-ledger");
const { buildThreadInsight } = require("./thread-insight");
const {
  resolveCodexHome,
  bundledSkillState,
  listBundledSkillStates,
} = require("./bundled-skills");
const { listAllSkillStates, getSkillDetailForPayload } = require("./skill-manager");
const { scanAllMemory } = require("./memory-manager");
const { readAccountsForPayload } = require("./account-manager");
const {
  parseRootModelProviderFromToml,
  readCodexConfigFiles,
  readProviderSyncPreview,
  applyProviderSync,
  readOpenAiSidebarLimitPatchPreview,
  applyOpenAiSidebarLimitPatch,
  readProviderVisibilityHealth,
} = require("./provider-visibility");

const AUTO_START_RETRY_COOLDOWN_MS = 20000;

async function ensureServerInternal(panel, options = {}) {
  const config = getConfig();
  const probe = await probeServer(config.baseUrl);
  if (probe.ok) {
    const serviceMetadata = serviceMetadataFromPayload(probe.payload);
    panel.lastAutoStartFailureAt = 0;
    panel.autoStartRetryAt = 0;
    panel.lastAutoStartLogPath = "";
    panel.lastAutoStartErrorMessage = "";
    panel.lastAutoStartInstallCommand = "";
    return summarizeServiceState(true, {
      baseUrl: config.baseUrl,
      autoStarted: false,
      message: "Connected",
      ...serviceMetadata,
    });
  }

  if (!options.forceStart) {
    const now = Date.now();
    if (panel.autoStartRetryAt && panel.autoStartRetryAt > now) {
      const retryInSeconds = Math.max(1, Math.ceil((panel.autoStartRetryAt - now) / 1000));
      const baseMessage = panel.lastAutoStartErrorMessage || "Server not reachable";
      return summarizeServiceState(false, {
        baseUrl: config.baseUrl,
        autoStarted: false,
        message: `${baseMessage} Auto-start retry in ${retryInSeconds}s.`,
        logPath: panel.lastAutoStartLogPath || undefined,
        installCommand: panel.lastAutoStartInstallCommand || undefined,
      });
    }
  }

  const start = await startServer(panel.extensionUri);
  if (!start.ok) {
    panel.lastAutoStartFailureAt = Date.now();
    panel.autoStartRetryAt = panel.lastAutoStartFailureAt + AUTO_START_RETRY_COOLDOWN_MS;
    panel.lastAutoStartLogPath = start.logPath || "";
    panel.lastAutoStartErrorMessage = start.error || "Failed to start server";
    panel.lastAutoStartInstallCommand = start.installCommand || "";
    return summarizeServiceState(false, {
      baseUrl: config.baseUrl,
      autoStarted: true,
      message: panel.lastAutoStartErrorMessage,
      logPath: start.logPath,
      installCommand: panel.lastAutoStartInstallCommand || undefined,
    });
  }

  panel.lastAutoStartFailureAt = 0;
  panel.autoStartRetryAt = 0;
  panel.lastAutoStartLogPath = start.logPath || "";
  panel.lastAutoStartErrorMessage = "";
  panel.lastAutoStartInstallCommand = "";
  return summarizeServiceState(true, {
    baseUrl: start.baseUrl || config.baseUrl,
    autoStarted: true,
    message: start.message || (start.fallback ? `Server started on ${start.baseUrl}` : "Server started"),
    logPath: start.logPath,
    backendMode: start.backendMode,
    backendSource: start.backendSource,
    readOnly: start.readOnly,
    capabilities: start.capabilities,
  });
}

async function ensureServer(panel, options = {}) {
  if (panel.ensureServerInFlight) {
    return panel.ensureServerInFlight;
  }
  const job = ensureServerInternal(panel, options);
  panel.ensureServerInFlight = job;
  try {
    return await job;
  } finally {
    if (panel.ensureServerInFlight === job) {
      panel.ensureServerInFlight = undefined;
    }
  }
}

function serviceMetadataFromService(service) {
  return serviceMetadataFromPayload(service);
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

function detectUsageLimit(text) {
  const raw = String(text || "");
  if (!raw) return "";
  if (/you(?:'|’)ve hit your usage limit/i.test(raw)) {
    return "Codex usage limit reached. Retry after the account limit resets or adjust usage.";
  }
  if (/usage limit/i.test(raw)) {
    return "Codex usage limit reached.";
  }
  if (/purchase more credits/i.test(raw)) {
    return "Codex credits or usage quota are exhausted.";
  }
  return "";
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

function detectTraceFileSignals(text) {
  const source = String(text || "");
  if (!source) return [];
  const matches = source.match(/[A-Za-z0-9_./-]+\.(js|ts|tsx|jsx|py|md|json|css|html|yml|yaml|sh)/g) || [];
  return [...new Set(matches)];
}

function threadHistoryText(item) {
  return String(item?.text || item?.content || item?.message || "").trim();
}

function threadTraceEventKey(kind, timestamp, extra = "") {
  return [String(kind || ""), String(timestamp || ""), String(extra || "")].join("|");
}

function recordedThreadTraceEventKey(entry) {
  const kind = String(entry?.kind || "");
  const timestamp = String(entry?.ts || "");
  if (kind === "thread.message_observed") {
    return threadTraceEventKey(kind, timestamp, `${entry?.summary || ""}|${entry?.payload?.role || ""}`);
  }
  if (kind === "thread.file_observed") {
    return threadTraceEventKey(kind, timestamp, String(entry?.payload?.path || entry?.evidence?.path || entry?.summary || ""));
  }
  if (kind === "thread.command_observed") {
    return threadTraceEventKey(kind, timestamp, String(entry?.payload?.command_key || entry?.payload?.command || entry?.summary || ""));
  }
  if (kind === "thread.check_observed") {
    return threadTraceEventKey(kind, timestamp, String(entry?.payload?.check_key || entry?.summary || ""));
  }
  if (kind === "thread.error_observed") {
    return threadTraceEventKey(kind, timestamp, String(entry?.payload?.error_key || entry?.summary || ""));
  }
  if (kind === "thread.checkpoint_captured") {
    return threadTraceEventKey(kind, timestamp, `${entry?.summary || ""}|${entry?.status || ""}`);
  }
  return threadTraceEventKey(kind, timestamp, entry?.summary || "");
}

function collectThreadTraceFileEvents(traceLane, limit = 6) {
  const filePath = String(traceLane && traceLane.filePath || "").trim();
  if (!filePath) return [];
  const tail = tailTrace(filePath, 64);
  const seen = new Set();
  return tail
    .filter((entry) => String(entry?.kind || "") === "thread.file_observed")
    .slice()
    .reverse()
    .filter((entry) => {
      const nextPath = String(entry?.payload?.path || entry?.evidence?.path || "").trim();
      if (!nextPath || seen.has(nextPath)) return false;
      seen.add(nextPath);
      return true;
    })
    .slice(0, Math.max(1, Number(limit) || 6))
    .reverse()
    .map((entry) => ({
      path: String(entry?.payload?.path || entry?.evidence?.path || "").trim(),
      timestamp: String(entry?.ts || ""),
      summary: String(entry?.summary || "").trim(),
      source: String(entry?.payload?.source || entry?.evidence?.source || "trace").trim() || "trace",
    }));
}

function collectThreadTraceCommandEvents(traceLane, limit = 6) {
  const filePath = String(traceLane && traceLane.filePath || "").trim();
  if (!filePath) return [];
  const tail = tailTrace(filePath, 64);
  const seen = new Set();
  return tail
    .filter((entry) => String(entry?.kind || "") === "thread.command_observed")
    .slice()
    .reverse()
    .filter((entry) => {
      const commandKey = String(entry?.payload?.command_key || entry?.payload?.command || entry?.summary || "").trim();
      if (!commandKey || seen.has(commandKey)) return false;
      seen.add(commandKey);
      return true;
    })
    .slice(0, Math.max(1, Number(limit) || 6))
    .reverse()
    .map((entry) => ({
      label: String(entry?.payload?.label || entry?.evidence?.label || entry?.payload?.command_name || "command").trim() || "command",
      command: String(entry?.payload?.command || "").trim(),
      timestamp: String(entry?.ts || ""),
      summary: String(entry?.summary || "").trim(),
      source: String(entry?.payload?.source || entry?.evidence?.source || "trace").trim() || "trace",
      count: Math.max(0, Number(entry?.payload?.count || entry?.evidence?.count || 0)),
    }));
}

function collectThreadTraceChecks(traceLane, limit = 6) {
  const filePath = String(traceLane && traceLane.filePath || "").trim();
  if (!filePath) return [];
  return tailTrace(filePath, 64)
    .filter((entry) => String(entry?.kind || "") === "thread.check_observed")
    .slice(-Math.max(1, Number(limit) || 6))
    .map((entry) => ({
      summary: String(entry?.summary || "").trim(),
      timestamp: String(entry?.ts || ""),
      source: String(entry?.payload?.source || entry?.evidence?.source || "trace").trim() || "trace",
      level: String(entry?.evidence?.level || "").trim(),
    }));
}

function collectThreadTraceErrors(traceLane, limit = 6) {
  const filePath = String(traceLane && traceLane.filePath || "").trim();
  if (!filePath) return [];
  return tailTrace(filePath, 64)
    .filter((entry) => String(entry?.kind || "") === "thread.error_observed")
    .slice(-Math.max(1, Number(limit) || 6))
    .map((entry) => ({
      summary: String(entry?.summary || "").trim(),
      timestamp: String(entry?.ts || ""),
      source: String(entry?.payload?.source || entry?.evidence?.source || "trace").trim() || "trace",
      level: String(entry?.evidence?.level || "").trim(),
    }));
}

function syncThreadTraceLane(detail, summary = {}) {
  const thread = detail && detail.thread && typeof detail.thread === "object" ? detail.thread : {};
  const threadId = String(thread.id || "").trim();
  const workspacePath = normalizeWorkspacePath(thread.cwd || summary.cwd || "");
  if (!threadId || !workspacePath) {
    return { filePath: "", appended: 0, summary: null };
  }
  const paths = pathsForWorkspace(workspacePath);
  if (!paths.threadTracesDir) {
    return { filePath: "", appended: 0, summary: null };
  }
  fs.mkdirSync(paths.threadTracesDir, { recursive: true });
  const filePath = resolveTracePath(paths, { scope: "thread", thread_id: threadId });
  if (!filePath) {
    return { filePath: "", appended: 0, summary: null };
  }
  const recent = tailTrace(filePath, 64);
  const existingKeys = new Set(recent.map((entry) => recordedThreadTraceEventKey(entry)));
  let appended = 0;
  const history = Array.isArray(thread.history) ? thread.history : [];
  history.slice(-8).forEach((item) => {
    const text = threadHistoryText(item);
    const role = String(item?.role || "unknown").toLowerCase() || "unknown";
    const timestamp = String(item?.ts || item?.ts_iso || thread.updated_at_iso || "");
    if (!text || !timestamp) return;
    const summaryText = `${role === "user" ? "User" : (role === "assistant" ? "Assistant" : "Thread")} message observed: ${shortText(text, 120)}`;
    const key = threadTraceEventKey("thread.message_observed", timestamp, `${summaryText}|${role}`);
    if (existingKeys.has(key)) return;
    writeThreadTrace(paths, {
      kind: "thread.message_observed",
      ts: timestamp,
      thread_id: threadId,
      status: String(thread.status || "").trim() || undefined,
      summary: summaryText,
      evidence: {
        role,
        text_length: text.length,
      },
      payload: {
        role,
        text_excerpt: shortText(text, 240),
      },
    });
    existingKeys.add(key);
    appended += 1;
  });
  const liveLogs = Array.isArray(detail?.logs) ? detail.logs : [];
  const previewLogs = Array.isArray(summary?.preview_logs) ? summary.preview_logs : [];
  const activeLogs = liveLogs.length ? liveLogs : previewLogs;
  activeLogs.slice(-12).forEach((log) => {
    const timestamp = String(log?.ts_iso || log?.ts || thread.updated_at_iso || "");
    if (!timestamp) return;
    const signalSource = String(log?.message || log?.target || "").trim();
    const signalPaths = detectTraceFileSignals(signalSource);
    signalPaths.forEach((signalPath) => {
      const normalizedPath = String(signalPath || "").trim();
      if (!normalizedPath) return;
      const fileSummary = `File observed in thread activity: ${normalizedPath}`;
      const fileKey = threadTraceEventKey("thread.file_observed", timestamp, normalizedPath);
      if (existingKeys.has(fileKey)) return;
      writeThreadTrace(paths, {
        kind: "thread.file_observed",
        ts: timestamp,
        thread_id: threadId,
        status: String(thread.status || "").trim() || undefined,
        summary: fileSummary,
        evidence: {
          path: normalizedPath,
          source: "log",
          level: String(log?.level || "").trim() || undefined,
        },
        payload: {
          path: normalizedPath,
          source: "log",
          log_excerpt: shortText(signalSource, 240),
        },
      });
      existingKeys.add(fileKey);
      appended += 1;
    });
    if (/check|test|lint|build|verify|passed|failed/i.test(signalSource)) {
      const checkSummary = `Check observed in thread activity: ${shortText(signalSource, 140)}`;
      const checkKey = threadTraceEventKey("thread.check_observed", timestamp, checkSummary);
      if (!existingKeys.has(checkKey)) {
        writeThreadTrace(paths, {
          kind: "thread.check_observed",
          ts: timestamp,
          thread_id: threadId,
          status: String(thread.status || "").trim() || undefined,
          summary: checkSummary,
          evidence: {
            source: "log",
            level: String(log?.level || "").trim() || undefined,
          },
          payload: {
            source: "log",
            check_key: checkSummary,
            log_excerpt: shortText(signalSource, 240),
          },
        });
        existingKeys.add(checkKey);
        appended += 1;
      }
    }
    if (/error|failed|panic|blocked|exception/i.test(signalSource)) {
      const errorSummary = `Error observed in thread activity: ${shortText(signalSource, 140)}`;
      const errorKey = threadTraceEventKey("thread.error_observed", timestamp, errorSummary);
      if (!existingKeys.has(errorKey)) {
        writeThreadTrace(paths, {
          kind: "thread.error_observed",
          ts: timestamp,
          thread_id: threadId,
          status: String(thread.status || "").trim() || undefined,
          summary: errorSummary,
          evidence: {
            source: "log",
            level: String(log?.level || "").trim() || undefined,
          },
          payload: {
            source: "log",
            error_key: errorSummary,
            log_excerpt: shortText(signalSource, 240),
          },
        });
        existingKeys.add(errorKey);
        appended += 1;
      }
    }
  });
  const toolCallCounts = Array.isArray(thread.tool_call_counts)
    ? thread.tool_call_counts
    : (Array.isArray(summary.tool_call_counts) ? summary.tool_call_counts : []);
  toolCallCounts.slice(0, 8).forEach((item) => {
    const timestamp = String(thread.updated_at_iso || summary.updated_at_iso || thread.created_at_iso || "");
    const commandName = String(item?.name || item?.kind || "").trim();
    const count = Math.max(0, Number(item?.count || 0));
    if (!timestamp || !commandName || count <= 0) return;
    const commandKey = `tool:${commandName}:${count}`;
    const commandSummary = `Command activity observed: ${commandName} x${count}`;
    if (existingKeys.has(threadTraceEventKey("thread.command_observed", timestamp, commandKey))) return;
    writeThreadTrace(paths, {
      kind: "thread.command_observed",
      ts: timestamp,
      thread_id: threadId,
      status: String(thread.status || "").trim() || undefined,
      summary: commandSummary,
      evidence: {
        source: "tool_call_counts",
        label: commandName,
        count,
      },
      payload: {
        source: "tool_call_counts",
        label: commandName,
        command_name: commandName,
        command_key: commandKey,
        count,
      },
    });
    existingKeys.add(threadTraceEventKey("thread.command_observed", timestamp, commandKey));
    appended += 1;
  });
  const hintCommands = [
    { label: "Resume", command: detail?.hint_commands?.resume || "" },
    { label: "Fork", command: detail?.hint_commands?.fork || "" },
  ];
  hintCommands.forEach((item) => {
    const timestamp = String(thread.updated_at_iso || summary.updated_at_iso || thread.created_at_iso || "");
    const commandText = String(item.command || "").trim();
    if (!timestamp || !commandText) return;
    const commandKey = `hint:${item.label.toLowerCase()}:${commandText}`;
    const commandSummary = `${item.label} command available: ${shortText(commandText, 140)}`;
    if (existingKeys.has(threadTraceEventKey("thread.command_observed", timestamp, commandKey))) return;
    writeThreadTrace(paths, {
      kind: "thread.command_observed",
      ts: timestamp,
      thread_id: threadId,
      status: String(thread.status || "").trim() || undefined,
      summary: commandSummary,
      evidence: {
        source: "hint_command",
        label: item.label,
      },
      payload: {
        source: "hint_command",
        label: item.label,
        command: commandText,
        command_key: commandKey,
      },
    });
    existingKeys.add(threadTraceEventKey("thread.command_observed", timestamp, commandKey));
    appended += 1;
  });
  const checkpointTs = String(thread.updated_at_iso || summary.updated_at_iso || thread.created_at_iso || "");
  const checkpointStatus = String(thread.status || "").trim() || "idle";
  const processSummary = String((summary && summary.process && summary.process.summary) || thread.process?.summary || "").trim();
  if (checkpointTs) {
    const checkpointSummary = processSummary
      ? `Thread checkpoint captured: ${shortText(processSummary, 120)}`
      : `Thread checkpoint captured while ${checkpointStatus}.`;
    const checkpointKey = threadTraceEventKey("thread.checkpoint_captured", checkpointTs, `${checkpointSummary}|${checkpointStatus}`);
    if (!existingKeys.has(checkpointKey)) {
      writeThreadTrace(paths, {
        kind: "thread.checkpoint_captured",
        ts: checkpointTs,
        thread_id: threadId,
        status: checkpointStatus,
        summary: checkpointSummary,
        evidence: {
          status: checkpointStatus,
          log_count: Math.max(0, Number(thread.log_count || 0)),
          command_count: Math.max(0, Number(summary.tool_call_count || thread.tool_call_count || 0)),
        },
        payload: {
          process_summary: processSummary,
          updated_at: checkpointTs,
          model: thread.model || "",
        },
      });
      existingKeys.add(checkpointKey);
      appended += 1;
    }
  }
  return {
    filePath,
    appended,
    summary: summarizeTrace(filePath, 8),
  };
}

function buildThreadTracePreview(detail, summary = {}, traceLane = null) {
  const thread = detail && detail.thread && typeof detail.thread === "object" ? detail.thread : {};
  const logs = Array.isArray(detail && detail.logs) ? detail.logs : [];
  const history = Array.isArray(thread.history) ? thread.history : [];
  const previewLogs = Array.isArray(summary && summary.preview_logs) ? summary.preview_logs : [];
  const activeLogs = logs.length ? logs : previewLogs;
  const traceFileEvents = collectThreadTraceFileEvents(traceLane, 6);
  const traceCommandEvents = collectThreadTraceCommandEvents(traceLane, 6);
  const traceCheckEvents = collectThreadTraceChecks(traceLane, 6);
  const traceErrorEvents = collectThreadTraceErrors(traceLane, 6);
  const fallbackCommandCount = Array.isArray(summary && summary.commands)
    ? summary.commands.length
    : Math.max(0, Number(summary.tool_call_count || thread.tool_call_count || 0));
  const commandCount = traceCommandEvents.length || fallbackCommandCount;
  const errorLogs = activeLogs.filter((log) => /error|failed|panic|blocked|exception/i.test(String(log?.message || log?.target || "")));
  const checkLogs = activeLogs.filter((log) => /check|test|lint|build|verify|passed|failed/i.test(String(log?.message || log?.target || "")));
  const fileSignals = [...new Set(activeLogs.flatMap((log) => detectTraceFileSignals(log?.message || log?.target || "")))];
  const timeline = [];
  function pushEvent(timestamp, title, copy, tone = "live", weight = 0) {
    timeline.push({
      timestamp: String(timestamp || ""),
      title,
      copy: String(copy || ""),
      tone,
      weight,
    });
  }
  history.slice(0, 4).forEach((item, index) => {
    const role = String(item?.role || "").toLowerCase();
    const title = role === "user"
      ? "User message observed"
      : (role === "assistant" ? "Assistant reply observed" : "Thread message observed");
    pushEvent(item?.ts || item?.ts_iso || "", title, threadHistoryText(item) || "Message content unavailable.", "live", 10 + index);
  });
  activeLogs.slice(0, 6).forEach((log, index) => {
    const message = String(log?.message || log?.target || "").trim();
    if (!message) return;
    const tone = /error|failed|panic|blocked|exception/i.test(message) ? "warn" : "live";
    pushEvent(log?.ts_iso || log?.ts || "", String(log?.level || "Log") + " log observed", message, tone, 30 + index);
  });
  if (detail && detail.hint_commands && detail.hint_commands.resume) {
    pushEvent(thread.updated_at_iso || "", "Resume command available", String(detail.hint_commands.resume), "live", 60);
  }
  if (commandCount > 0) {
    pushEvent(
      thread.updated_at_iso || "",
      "Command activity observed",
      traceCommandEvents.length
        ? `${commandCount} structured command signal${commandCount === 1 ? "" : "s"} visible from the current thread trace.`
        : `${commandCount} command signal${commandCount === 1 ? "" : "s"} visible from current thread metadata.`,
      "live",
      70,
    );
  }
  if (fileSignals.length) {
    pushEvent(thread.updated_at_iso || "", "File signals detected", fileSignals.slice(0, 3).join(", "), "live", 80);
  }
  if (errorLogs.length) {
    pushEvent(thread.updated_at_iso || "", "Errors detected", `${errorLogs.length} error signal${errorLogs.length === 1 ? "" : "s"} surfaced in recent logs.`, "warn", 90);
  }
  const events = timeline
    .filter((item) => item.copy)
    .sort((a, b) => {
      const timeA = Date.parse(a.timestamp || "") || 0;
      const timeB = Date.parse(b.timestamp || "") || 0;
      if (timeA !== timeB) return timeA - timeB;
      return Number(a.weight || 0) - Number(b.weight || 0);
    })
    .slice(-8)
    .map(({ weight, ...item }) => item);
  return {
    events,
    counts: {
      timeline: events.length,
      files: traceFileEvents.length || fileSignals.length,
      commands: commandCount,
      checks: traceCheckEvents.length || checkLogs.length,
      errors: traceErrorEvents.length || errorLogs.length,
      raw_jsonl: Math.max(0, Number(traceLane && traceLane.summary && traceLane.summary.event_count || 0)),
      messages: history.length,
      logs: activeLogs.length,
    },
    file_events: traceFileEvents,
    command_events: traceCommandEvents,
    check_events: traceCheckEvents,
    error_events: traceErrorEvents,
    source_summary: {
      process: String((summary && summary.process && summary.process.summary) || "No live process"),
      updated: String(summary.updated_age || thread.updated_at_iso || ""),
      thread_id: String(thread.id || ""),
      trace_lane: traceLane && traceLane.filePath ? traceLane.filePath : "",
    },
  };
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

function smartModeEnabled() {
  try {
    return Boolean(getConfig().smartMode);
  } catch {
    return false;
  }
}

function externalClaudeDaemonDetectionEnabled() {
  try {
    return Boolean(vscode.workspace.getConfiguration("codexAgent").get("showExternalClaudeDaemons"));
  } catch {
    return false;
  }
}

function readCodexLoopDaemonStateFromDir(stateDir, options = {}) {
  if (!fs.existsSync(stateDir)) {
    return {
      available: false,
      running: false,
      label: "Unavailable",
      detail: "No local codex-loop state directory found.",
    };
  }
  const heartbeat = readJsonFile(path.join(stateDir, "daemon_heartbeat.json")) || {};
  const pidText = readTextFile(path.join(stateDir, "daemon.pid"));
  const pidFromFile = Number.parseInt(pidText, 10);
  const pidFromHeartbeat = Number.parseInt(String(heartbeat.pid || ""), 10);
  const pid = Number.isInteger(pidFromFile) && pidFromFile > 0
    ? pidFromFile
    : pidFromHeartbeat;
  const launcherInfo = readJsonFile(path.join(stateDir, "daemon_launcher.json")) || {};
  const status = readJsonFile(path.join(stateDir, "status.json")) || {};
  const rotation = readJsonFile(path.join(stateDir, "rotation.json")) || {};
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
  const maxTicks = Number(heartbeat.max_ticks || heartbeat.maxTicks || status.max_ticks || status.maxTicks || launcherInfo.max_ticks || launcherInfo.maxTicks || 0) || 0;
  const completedTicks = Number(heartbeat.completed_ticks || heartbeat.completedTicks || status.completed_ticks || status.completedTicks || 0) || 0;
  const remainingTicks = maxTicks > 0 ? Math.max(0, Number(heartbeat.remaining_ticks || heartbeat.remainingTicks || status.remaining_ticks || status.remainingTicks || (maxTicks - completedTicks)) || 0) : undefined;
  const stopReason = heartbeat.stop_reason || heartbeat.stopReason || status.stop_reason || status.stopReason || "";
  const exitedUnexpectedly = !running && Number.isInteger(pid) && pid > 0 && heartbeatPhase && !["stopped", "completed"].includes(String(heartbeatPhase));
  const lastSummary = shortText(status.last_message_preview || "", 140);
  const tokenSummary = Number(status.last_total_tokens || 0) > 0
    ? `Tokens ${status.last_total_tokens} (${status.last_input_tokens || 0}/${status.last_output_tokens || 0})`
    : "";
  const rawLogPath = shortText(status.raw_log_path || "", 120);
  const daemonTail = readFileTail(daemonStdoutPath, 6000).trim();
  const tail = readFileTail(status.raw_log_path, 6000).trim();
  const tailLine = shortText(
    tail.split(/\n/).map((line) => line.trim()).filter(Boolean).slice(-1)[0] || "",
    180,
  );
  const rawUsageLimitMessage = detectUsageLimit([
    status.last_message_preview || "",
    tail,
    daemonTail,
  ].join("\n"));
  const showSmartStatus = options.smartMode !== undefined ? Boolean(options.smartMode) : smartModeEnabled();
  const usageLimitMessage = showSmartStatus ? rawUsageLimitMessage : "";
  const metadataParts = [
    threadId ? `Thread ${threadId.slice(0, 12)}` : "",
    launcher ? `Launcher ${launcher}` : "",
    usageLimitMessage ? "Usage limit detected" : "",
    exitedUnexpectedly ? "Exited unexpectedly" : "",
    heartbeatPhase ? `${exitedUnexpectedly ? "Last heartbeat" : "Heartbeat"} ${heartbeatPhase}` : "",
    interval ? `${interval} min interval` : "",
    maxTicks ? `Ticks ${completedTicks}/${maxTicks}` : "",
    rotation.last_handoff_at ? `Handoff ${rotation.last_handoff_at}` : "",
    stopReason ? `Stop reason ${stopReason}` : "",
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
    maxTicks: maxTicks || undefined,
    completedTicks: maxTicks ? completedTicks : undefined,
    remainingTicks,
    stopReason: stopReason || undefined,
    lastHandoffPath: rotation.last_handoff_path || undefined,
    lastHandoffAt: rotation.last_handoff_at || undefined,
    rotationGeneration: Number(rotation.generation || 0) || undefined,
    rotationReason: rotation.rotation_reason || undefined,
    parentThreadId: rotation.parent_thread_id || undefined,
    lastInputTokens: Number(status.last_input_tokens || 0) || undefined,
    lastOutputTokens: Number(status.last_output_tokens || 0) || undefined,
    lastTotalTokens: Number(status.last_total_tokens || 0) || undefined,
    rawLogPath: status.raw_log_path || undefined,
    tailLine: tailLine || undefined,
    usageLimited: Boolean(usageLimitMessage),
    usageLimitMessage: usageLimitMessage || undefined,
    usageLimitSuppressed: Boolean(rawUsageLimitMessage && !showSmartStatus),
    smartMode: showSmartStatus,
    label: usageLimitMessage ? "Usage Limit" : (running ? "Running" : (stopReason === "max_ticks_reached" ? "Completed" : (exitedUnexpectedly ? "Exited Unexpectedly" : "Stopped Cleanly"))),
    detail: usageLimitMessage
      ? `${usageLimitMessage}${metadataParts.length ? ` · ${metadataParts.join(" · ")}` : ""}`
      : (metadataParts.length
      ? metadataParts.join(" · ")
      : (running
        ? (interval ? `Heartbeat active · ${interval} min interval` : "Heartbeat active")
        : (exitedUnexpectedly ? "Exited unexpectedly" : (status.phase ? `Last status: ${status.phase}` : "No active daemon heartbeat")))),
  };
}

function readCodexLoopDaemonState(panel) {
  const stateDir = path.join(panel.extensionUri.fsPath, ".codex-loop", "state");
  return readCodexLoopDaemonStateFromDir(stateDir, { smartMode: smartModeEnabled() });
}

function readProcessRows() {
  try {
    const output = childProcess.execFileSync("ps", ["-eo", "pid=,ppid=,etimes=,command="], {
      encoding: "utf8",
      timeout: 1500,
      maxBuffer: 1024 * 1024 * 2,
    });
    return output.split(/\r?\n/).map((line) => {
      const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+([\s\S]*)$/);
      if (!match) return null;
      return {
        pid: Number(match[1]),
        ppid: Number(match[2]),
        etimes: Number(match[3]),
        command: match[4] || "",
      };
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function extractShellToken(command, name) {
  const pattern = new RegExp(`${name}=('([^']*)'|"([^"]*)"|([^\\s]+))`);
  const match = String(command || "").match(pattern);
  return match ? (match[2] || match[3] || match[4] || "") : "";
}

function newestFileInDir(dirPath, predicate = () => true) {
  try {
    if (!dirPath || !fs.existsSync(dirPath)) return "";
    return fs.readdirSync(dirPath)
      .map((name) => path.join(dirPath, name))
      .filter((filePath) => {
        try {
          return fs.statSync(filePath).isFile() && predicate(filePath);
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        try {
          return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs;
        } catch {
          return 0;
        }
      })[0] || "";
  } catch {
    return "";
  }
}

function collectClaudeLoopWorkspacesFromProcesses(processRows) {
  const workspaces = new Set();
  for (const row of processRows || []) {
    const command = String(row.command || "");
    if (!/claude-loop|run_daemon\.py|run_daemon\.sh/.test(command)) continue;
    const workspaceFromEnv = extractShellToken(command, "WORKSPACE");
    if (workspaceFromEnv) workspaces.add(normalizeWorkspacePath(workspaceFromEnv));
    const localSkillMatch = command.match(/([^\s'"]+?)\/\.claude\/skills\/claude-loop\/scripts\/run_daemon\.py/);
    if (localSkillMatch) workspaces.add(normalizeWorkspacePath(localSkillMatch[1]));
    const localSkillShMatch = command.match(/([^\s'"]+?)\/\.claude\/skills\/claude-loop\/scripts\/run_daemon\.sh/);
    if (localSkillShMatch) workspaces.add(normalizeWorkspacePath(localSkillShMatch[1]));
  }
  return [...workspaces].filter(Boolean);
}

function collectClaudeLoopStateDirsFromProcesses(processRows) {
  const dirs = new Set();
  const workspaces = collectClaudeLoopWorkspacesFromProcesses(processRows);
  for (const workspace of workspaces) {
    const stateRoot = path.join(workspace, ".claude-loop", "state");
    try {
      if (!fs.existsSync(stateRoot)) continue;
      fs.readdirSync(stateRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .forEach((entry) => {
          const stateDir = path.join(stateRoot, entry.name);
          if (fs.existsSync(path.join(stateDir, "daemon.pid")) || fs.existsSync(path.join(stateDir, "active_task.json"))) {
            dirs.add(stateDir);
          }
        });
    } catch {
    }
  }
  for (const row of processRows || []) {
    const command = String(row.command || "");
    if (!/run_daemon\.sh|run_daemon\.py|claude-loop/.test(command)) continue;
    const workspace = normalizeWorkspacePath(extractShellToken(command, "WORKSPACE"));
    const loopName = extractShellToken(command, "LOOP_NAME") || (command.match(/run_daemon\.sh['"]?\s+([^\s'"<>]+)/) || [])[1] || "";
    if (workspace && loopName) dirs.add(path.join(workspace, ".claude-loop", "state", loopName));
  }
  return [...dirs];
}

function readClaudeLoopDaemonStateFromDir(stateDir, processRows = []) {
  if (!fs.existsSync(stateDir)) return null;
  const pidText = readTextFile(path.join(stateDir, "daemon.pid"));
  const pidFromFile = Number.parseInt(pidText, 10);
  const pid = Number.isInteger(pidFromFile) && pidFromFile > 0 ? pidFromFile : undefined;
  const loopName = path.basename(stateDir);
  const workspace = path.dirname(path.dirname(path.dirname(stateDir)));
  const processRow = processRows.find((row) => row.pid === pid)
    || processRows.find((row) => /run_daemon\.py|run_daemon\.sh/.test(String(row.command || "")) && String(row.command || "").includes(loopName));
  const running = Boolean(pid && isPidRunning(pid)) || Boolean(processRow);
  const activeTask = readJsonFile(path.join(stateDir, "active_task.json")) || {};
  const lastMode = readTextFile(path.join(stateDir, "last_mode.txt")).trim();
  const promptFile = ["prompt_optimize.txt", "prompt_check.txt", `${loopName}.md`]
    .map((name) => path.join(stateDir, name))
    .find((filePath) => fs.existsSync(filePath)) || "";
  const daemonLogPath = newestFileInDir(path.join(stateDir, "logs"), (filePath) => /\.log$/.test(filePath));
  const dispatchLogPath = newestFileInDir(path.join(stateDir, "dispatch_logs"), (filePath) => /\.log$/.test(filePath));
  const logPath = daemonLogPath || dispatchLogPath;
  const tail = readFileTail(logPath, 5000).trim();
  const tailLine = shortText(tail.split(/\n/).map((line) => line.trim()).filter(Boolean).slice(-1)[0] || "", 180);
  const interval = Number(extractShellToken(processRow && processRow.command, "INTERVAL") || 0) || undefined;
  const uptimeMinutes = processRow && Number.isFinite(processRow.etimes) ? Math.max(1, Math.round(processRow.etimes / 60)) : undefined;
  const taskTitle = activeTask.title || activeTask.task || activeTask.goal || "";
  const detailParts = [
    "Detected from process table",
    lastMode ? `Mode ${lastMode}` : "",
    taskTitle ? `Task ${shortText(taskTitle, 80)}` : "",
    tailLine ? `Last log ${tailLine}` : "",
  ].filter(Boolean);
  return {
    available: true,
    running,
    external: true,
    source: "claude-loop",
    pid: pid || (processRow && processRow.pid) || undefined,
    workspace,
    workspaceLabel: loopName,
    stateDir,
    promptFile: promptFile || undefined,
    promptFileLabel: promptFile ? path.basename(promptFile) : undefined,
    daemonStdoutPath: logPath || undefined,
    rawLogPath: dispatchLogPath || undefined,
    launcher: "claude-loop",
    intervalMinutes: interval,
    heartbeatAt: logPath ? fs.statSync(logPath).mtime.toISOString() : undefined,
    tailLine: tailLine || undefined,
    label: running ? "Running" : "Stopped",
    detail: detailParts.join(" · ") || "Detected external claude-loop daemon.",
    uptimeMinutes,
  };
}

function collectLoopStateDirs(panel, dashboard, workspaceRoots, detail) {
  const candidates = new Set();
  const addStateDir = (stateDir) => {
    const normalized = normalizeWorkspacePath(stateDir);
    if (!normalized) return;
    candidates.add(normalized);
  };
  const addWorkspace = (workspacePath) => {
    const normalized = normalizeWorkspacePath(workspacePath);
    if (!normalized) return;
    candidates.add(path.join(normalized, ".codex-loop", "state"));
  };

  addWorkspace(panel.extensionUri.fsPath);
  (panel.knownLoopStateDirs || []).forEach(addStateDir);
  (workspaceRoots || []).forEach((root) => addWorkspace(root && (root.path || root.rootKey)));
  const previousLoopDaemons = []
    .concat(Array.isArray(panel.lastPayload?.loopDaemons) ? panel.lastPayload.loopDaemons : [])
    .concat(panel.lastPayload?.loopDaemon ? [panel.lastPayload.loopDaemon] : []);
  previousLoopDaemons.forEach((daemon) => addStateDir(daemon && daemon.stateDir));
  const threadPools = []
    .concat(Array.isArray(dashboard?.threads) ? dashboard.threads : [])
    .concat(Array.isArray(dashboard?.runningThreads) ? dashboard.runningThreads : []);
  threadPools.forEach((thread) => addWorkspace(thread && thread.cwd));
  if (detail && detail.thread) addWorkspace(detail.thread.cwd);
  return [...candidates];
}

function readCodexLoopDaemonStates(panel, dashboard, workspaceRoots, detail) {
  const smartMode = smartModeEnabled();
  const states = collectLoopStateDirs(panel, dashboard, workspaceRoots, detail)
    .map((stateDir) => readCodexLoopDaemonStateFromDir(stateDir, { smartMode }))
    .filter((item) => item && item.available);
  if (externalClaudeDaemonDetectionEnabled()) {
    const processRows = readProcessRows();
    const seenStateDirs = new Set(states.map((state) => normalizeWorkspacePath(state.stateDir)));
    collectClaudeLoopStateDirsFromProcesses(processRows).forEach((stateDir) => {
      const normalized = normalizeWorkspacePath(stateDir);
      if (!normalized || seenStateDirs.has(normalized)) return;
      const state = readClaudeLoopDaemonStateFromDir(normalized, processRows);
      if (!state || !state.available) return;
      seenStateDirs.add(normalized);
      states.push(state);
    });
  }
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
  const codexHome = resolveCodexHome();
  const state = bundledSkillState(panel, "codex-loop");
  const skillPath = state.skillPath;
  const scriptPath = path.join(skillPath, "scripts", "codex_loop_automation.py");
  const bundledSkillPath = state.bundledSkillPath;
  const bundledScriptPath = path.join(bundledSkillPath, "scripts", "codex_loop_automation.py");
  return {
    available: fs.existsSync(scriptPath),
    scriptPath,
    skillPath,
    codexHome,
    bundledAvailable: state.bundledAvailable && fs.existsSync(bundledScriptPath),
    bundledSkillPath,
    bundledScriptPath,
    installable: state.installable,
    updateAvailable: state.updateAvailable,
    installedVersion: state.installedVersion,
    bundledVersion: state.bundledVersion,
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
  const codexPluginIntegration = typeof panel.getCodexPluginIntegrationState === "function"
    ? panel.getCodexPluginIntegrationState()
    : undefined;
  const enrichedPayload = {
    ...payload,
    codexLinkState,
    codexPluginIntegration,
    networkProbeResults: payload.networkProbeResults || (
      typeof panel.getNetworkProbeResults === "function" ? panel.getNetworkProbeResults() : {}
    ),
    clashProxyState: payload.clashProxyState || panel.clashProxyState || null,
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
  const codexPluginIntegration = typeof panel.getCodexPluginIntegrationState === "function"
    ? panel.getCodexPluginIntegrationState()
    : undefined;
  panel.lastPayload = {
    ...panel.lastPayload,
    codexLinkState,
    codexPluginIntegration,
  };
  postMessage(panel, {
    type: "codexLinkStatePatched",
    codexLinkState,
    codexPluginIntegration,
  });
}

function mergeLoopDaemonState(currentList, nextDaemon) {
  if (!nextDaemon || !nextDaemon.available) return currentList || [];
  const nextList = Array.isArray(currentList) ? currentList : [];
  const withoutDuplicate = nextList.filter((item) => item && item.stateDir !== nextDaemon.stateDir);
  const merged = [nextDaemon, ...withoutDuplicate];
  merged.sort((a, b) => {
    const runningDelta = Number(Boolean(b.running)) - Number(Boolean(a.running));
    if (runningDelta) return runningDelta;
    const labelA = String(a.workspaceLabel || a.workspace || "");
    const labelB = String(b.workspaceLabel || b.workspace || "");
    return labelA.localeCompare(labelB);
  });
  return merged;
}

function patchLoopDaemonState(panel, stateDir) {
  const nextDaemon = readCodexLoopDaemonStateFromDir(stateDir, { smartMode: smartModeEnabled() });
  if (!nextDaemon || !nextDaemon.available) return false;
  const payload = panel.lastPayload || {};
  const loopDaemons = mergeLoopDaemonState(payload.loopDaemons, nextDaemon);
  const loopDaemon = loopDaemons.find((item) => item.running) || loopDaemons[0] || nextDaemon;
  panel.lastPayload = {
    ...payload,
    loopDaemon,
    loopDaemons,
    loopSupport: payload.loopSupport || readCodexLoopSupport(panel),
    actionNotice: panel.lastActionNotice,
    lastSuccessfulRefreshAt: payload.lastSuccessfulRefreshAt || panel.lastSuccessfulRefreshAt,
  };
  panel.broadcastState(panel.lastPayload);
  return true;
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

function createPartialDashboard(message, scope = "live") {
  const now = new Date().toISOString();
  return {
    threads: [],
    runningThreads: [],
    threadsMeta: {
      counts: { running: 0, active: 0, recent: 0, idle: 0, archived: 0 },
      total: 0,
      limit: 0,
      offset: 0,
      scope,
      partial: true,
      refreshError: message,
      now_iso: now,
    },
    runningMeta: { partial: true },
    insights: null,
    refreshWarnings: [`Dashboard refresh failed: ${message}`],
    partial: true,
  };
}

function truthyKeys(value) {
  return Object.entries(value && typeof value === "object" ? value : {})
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => String(key || "").trim())
    .filter(Boolean);
}

function collectHotThreadIds(panel, dashboard, runningThreads = []) {
  const persisted = Object.assign({}, panel.storage.get("codexAgent.persistedUiState", {}));
  const ids = new Set();
  const add = (threadId) => {
    const normalized = String(threadId || "").trim();
    if (!normalized || normalized.startsWith("pending-new-agent-")) return;
    ids.add(normalized);
  };
  add(panel.selectedThreadId);
  (runningThreads || []).forEach((thread) => add(thread && thread.id));
  [...(panel.previousRunningIds || [])].forEach(add);
  truthyKeys(persisted.pinned).forEach(add);
  truthyKeys(persisted.boardAttached).forEach(add);
  Object.entries(panel.autoContinueConfigs || {}).forEach(([threadId, config]) => {
    if (config && config.active) add(threadId);
  });
  const loopSources = []
    .concat(Array.isArray(panel.lastPayload?.loopDaemons) ? panel.lastPayload.loopDaemons : [])
    .concat(Array.isArray(panel.lastPayload?.loopDaemon) ? panel.lastPayload.loopDaemon : [panel.lastPayload?.loopDaemon])
    .filter(Boolean);
  loopSources.forEach((daemon) => add(daemon.threadId));
  (dashboard?.runningThreads || []).forEach((thread) => add(thread && thread.id));
  return [...ids].slice(0, 80);
}

function mergeThreadLists(baseThreads, updatedThreads) {
  const updates = new Map((updatedThreads || []).filter((thread) => thread && thread.id).map((thread) => [thread.id, thread]));
  const seen = new Set();
  const merged = (baseThreads || []).map((thread) => {
    if (!thread || !thread.id) return thread;
    const next = updates.get(thread.id);
    if (next) {
      seen.add(thread.id);
      return {
        ...thread,
        ...next,
      };
    }
    return thread;
  });
  (updatedThreads || []).forEach((thread) => {
    if (thread && thread.id && !seen.has(thread.id) && !String(thread.id).startsWith("pending-new-agent-")) {
      merged.unshift(thread);
      seen.add(thread.id);
    }
  });
  return merged;
}

async function fetchHotDashboardState(panel, baseUrl) {
  const warnings = [];
  const baseDashboard = panel.lastSuccessfulDashboardPayload || panel.lastPayload?.dashboard;
  if (!baseDashboard) return fetchDashboardState(baseUrl, { scope: panel.threadListScope || "live" });

  const runningResult = await fetchRunningThreadsState(baseUrl)
    .then((payload) => ({ ok: true, payload }))
    .catch((error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  const runningThreads = runningResult.ok ? runningResult.payload.runningThreads : (baseDashboard.runningThreads || []);
  const hotThreadIds = collectHotThreadIds(panel, baseDashboard, runningThreads);
  const hotResult = hotThreadIds.length
    ? await fetchThreadsByIds(baseUrl, hotThreadIds, { includeLogs: false, previewLimit: 2, includeHistory: false, scope: "all" })
      .then((payload) => ({ ok: true, payload }))
      .catch((error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) }))
    : { ok: true, payload: { threads: [], threadsMeta: { ids: [] } } };

  const hotThreads = hotResult.ok ? hotResult.payload.threads : [];
  const retainedWarnings = (baseDashboard.refreshWarnings || []).filter((item) => {
    const text = String(item || "");
    return !text.includes("hot refresh") && !text.includes("Hot thread cards unavailable");
  });
  return {
    ...baseDashboard,
    threads: mergeThreadLists(baseDashboard.threads || [], hotThreads),
    threadsMeta: {
      ...(baseDashboard.threadsMeta || {}),
      hotRefresh: true,
      hotThreadCount: hotThreadIds.length,
      lastHotRefreshAt: new Date().toISOString(),
    },
    runningThreads,
    runningMeta: {
      ...(baseDashboard.runningMeta || {}),
      ...(runningResult.ok ? runningResult.payload.runningMeta || {} : {}),
      hotRefresh: true,
      partial: !runningResult.ok,
    },
    refreshWarnings: [
      ...retainedWarnings,
      ...warnings,
    ],
    partial: Boolean(retainedWarnings.length || warnings.length),
  };
}

async function refresh(panel, options = {}) {
  if (panel.refreshInFlight) {
    const mode = String(options.mode || "full");
    if (mode !== "hot") panel.pendingFullRefresh = true;
    return;
  }
  panel.refreshInFlight = true;
  try {
    await refreshOnce(panel, options);
  } finally {
    panel.refreshInFlight = false;
    if (panel.pendingFullRefresh) {
      panel.pendingFullRefresh = false;
      setTimeout(() => panel.refresh({ silent: true, mode: "full" }), 0);
    }
  }
}

function buildTokenMaintenancePayload(panel) {
  const intervalMs = Number(panel.authMaintenanceIntervalMs || 60 * 60 * 1000);
  const lastRunAt = panel.lastAuthMaintenanceAt || "";
  const lastRunMs = Date.parse(lastRunAt || "");
  const nextRunAt = panel.authMaintenanceEnabled === false || !Number.isFinite(lastRunMs)
    ? ""
    : new Date(lastRunMs + intervalMs).toISOString();
  return {
    enabled: panel.authMaintenanceEnabled !== false,
    running: Boolean(panel.authMaintenanceInFlight),
    intervalMs,
    intervalMinutes: Math.round(intervalMs / 60000),
    lastRunAt,
    nextRunAt,
    lastResults: Array.isArray(panel.lastAuthMaintenanceResults) ? panel.lastAuthMaintenanceResults : [],
    lastError: panel.lastAuthMaintenanceError || "",
  };
}

async function refreshOnce(panel, options = {}) {
  if (!panel.hasSurface()) return;
  try {
    ingestKnownCliUsageLogs();
  } catch {
    // Keep hydration resilient even if local usage logs are unreadable.
  }

  let workspaceRoots = [];
  let memoryCards = [];
  try {
    workspaceRoots = readActiveWorkspaceRoots();
  } catch {
    workspaceRoots = [];
  }
  try {
    memoryCards = readMemoryCardSources(panel);
  } catch {
    memoryCards = [];
  }
  const codexConfigFiles = readCodexConfigFiles(workspaceRoots);
  const providerVisibilityHealth = readProviderVisibilityHealth();
  const codexAutoState = readAccountsForPayload();
  codexAutoState.tokenMaintenance = buildTokenMaintenancePayload(panel);

  let service;
  try {
    service = await ensureServer(panel);
  } catch (error) {
    let baseUrl = "http://127.0.0.1:8787/";
    try {
      baseUrl = getConfig().baseUrl || baseUrl;
    } catch {
      // Keep fallback base URL if workspace config itself is malformed.
    }
    const message = error instanceof Error ? error.message : String(error);
    broadcastState(panel, {
      type: "state",
      service: summarizeServiceState(false, {
        baseUrl,
        autoStarted: false,
        message,
        logPath: panel.lastAutoStartLogPath || undefined,
        installCommand: panel.lastAutoStartInstallCommand || undefined,
      }),
      dashboard: null,
      memoryCards,
      workspaceRoots,
      codexConfigFiles,
      providerVisibilityHealth,
      providerSyncState: panel.providerSyncState || null,
      codexAutoState,
      selectedThreadId: panel.selectedThreadId,
      actionNotice: panel.lastActionNotice,
      lastSuccessfulRefreshAt: panel.lastSuccessfulRefreshAt,
    });
    if (!options.silent) {
      vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${message}`, 2500);
    }
    return;
  }

  if (!service.ok) {
    broadcastState(panel, {
      type: "state",
      service,
      dashboard: null,
      memoryCards,
      workspaceRoots,
      codexConfigFiles,
      providerVisibilityHealth,
      providerSyncState: panel.providerSyncState || null,
      codexAutoState,
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
    const refreshMode = String(options.mode || "full");
    const isHotRefresh = refreshMode === "hot" && Boolean(panel.lastSuccessfulDashboardPayload || panel.lastPayload?.dashboard);
    const rawDashboard = isHotRefresh
      ? await fetchHotDashboardState(panel, service.baseUrl)
      : await fetchDashboardState(service.baseUrl, { scope: options.scope || panel.threadListScope || "live" });
    const dashboard = mergePendingNewAgentCards(panel, enrichDashboardRootIdentity(rawDashboard));
    const rawDetail = panel.selectedThreadId
      ? enrichDetailRootIdentity(await fetchThreadDetail(service.baseUrl, panel.selectedThreadId).catch(() => null))
      : null;
    const selectedSummary = rawDetail && rawDetail.thread
      ? (Array.isArray(dashboard.threads) ? dashboard.threads.find((thread) => thread && thread.id === rawDetail.thread.id) || {} : {})
      : {};
    const traceLane = rawDetail?.thread ? syncThreadTraceLane(rawDetail, selectedSummary) : null;
    const detail = rawDetail?.thread
      ? {
          ...rawDetail,
          tokenUsage: readLatestThreadUsageEvent(rawDetail.thread.id),
          threadInsight: buildThreadInsight(panel, rawDetail),
          thread_trace_preview: buildThreadTracePreview(rawDetail, selectedSummary, traceLane),
        }
      : rawDetail;
    const loopDaemons = readCodexLoopDaemonStates(panel, dashboard, workspaceRoots, detail);
    const loopDaemon = loopDaemons.find((item) => item.running) || loopDaemons[0] || readCodexLoopDaemonState(panel);
    const loopSupport = readCodexLoopSupport(panel);
    const bundledSkills = listBundledSkillStates(panel);
    const teamCoordination = readTeamCoordination(panel, dashboard, detail);
    const traceDashboard = buildTraceDashboardPayload({
      dashboard,
      detail,
      selectedThreadId: panel.selectedThreadId,
      teamCoordination,
      includeSessionReplay: Boolean(options.includeSessionReplay),
    });
    const codexLinkState = panel.getCodexLinkState();
    const currentThreads = Array.isArray(dashboard.threads) ? dashboard.threads : [];
    const effectiveRunningThreads = (dashboard.runningThreads || []).filter((thread) =>
      panel.isEffectivelyRunningThread(thread, codexLinkState),
    );
    const nextRunningIds = new Set(effectiveRunningThreads.map((thread) => thread.id));
    const stoppedEvents = [...panel.previousRunningIds]
      .filter((threadId) => !nextRunningIds.has(threadId))
      .map((threadId) => {
        const thread = currentThreads.find((item) => item.id === threadId) || {};
        return {
          id: `${threadId}:${Date.now()}`,
          threadId,
          title: thread.title || threadId,
          status: "stopped",
          updatedAt: thread.updated_at_iso || "",
        };
      });
    for (const item of stoppedEvents) {
      const loopConfig = panel.autoContinueConfigs[item.threadId];
      if (loopConfig && loopConfig.active && loopConfig.remaining > 0) {
        await panel.triggerAutoContinue(item.threadId, loopConfig);
      }
    }
    if (stoppedEvents.length) {
      panel.recentCompletions = [...stoppedEvents, ...panel.recentCompletions].slice(0, 8);
      const label = stoppedEvents.length === 1
        ? stoppedEvents[0].title
        : `${stoppedEvents.length} threads`;
      vscode.window.showInformationMessage(`Codex-Managed-Agent: stopped ${label}`);
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
    if (!isHotRefresh) {
      panel.lastFullRefreshAt = Date.now();
    }
    panel.lastSuccessfulDashboardPayload = dashboard;
    panel.lastSuccessfulDetailPayload = detail;

    broadcastState(panel, {
      type: "state",
      service,
      dashboard,
      memoryCards,
      workspaceRoots,
      codexConfigFiles,
      providerVisibilityHealth,
      providerSyncState: panel.providerSyncState || null,
      codexAutoState,
      effectiveRunningThreadIds: [...nextRunningIds],
      selectedThreadId: panel.selectedThreadId,
      detail,
      recentCompletions: panel.recentCompletions,
      loopDaemon,
      loopDaemons,
      loopSupport,
      traceDashboard,
      bundledSkills,
      skills: listAllSkillStates(panel).map(getSkillDetailForPayload),
      memoryData: scanAllMemory(panel.workspacePath || ""),
      teamCoordination,
      autoContinueConfigs: panel.enrichAutoContinueConfigs(),
      optimisticQueuedPrompts: panel.optimisticQueuedPrompts,
      actionNotice: panel.lastActionNotice,
      lastSuccessfulRefreshAt: panel.lastSuccessfulRefreshAt,
      refreshWarnings: Array.isArray(rawDashboard.refreshWarnings) ? rawDashboard.refreshWarnings : [],
      partialRefresh: Boolean(rawDashboard.partial),
      refreshMode: isHotRefresh ? "hot" : refreshMode,
    });
    if (!options.silent) {
      vscode.window.setStatusBarMessage("Codex-Managed-Agent ready", 1800);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const staleDashboard = panel.lastSuccessfulDashboardPayload;
    if (staleDashboard) {
      const probe = await probeServer(service.baseUrl).catch(() => ({ ok: false }));
      if (probe.ok) {
        const dashboard = staleDashboard;
        const detail = panel.lastSuccessfulDetailPayload || null;
        const loopDaemons = readCodexLoopDaemonStates(panel, dashboard, workspaceRoots, detail);
        const loopDaemon = loopDaemons.find((item) => item.running) || loopDaemons[0] || readCodexLoopDaemonState(panel);
        const loopSupport = readCodexLoopSupport(panel);
        const bundledSkills = listBundledSkillStates(panel);
        const teamCoordination = readTeamCoordination(panel, dashboard, detail);
        const traceDashboard = buildTraceDashboardPayload({
          dashboard,
          detail,
          selectedThreadId: panel.selectedThreadId,
          teamCoordination,
          includeSessionReplay: Boolean(options.includeSessionReplay),
        });
        const codexLinkState = panel.getCodexLinkState();
        const effectiveRunningThreads = (dashboard.runningThreads || []).filter((thread) =>
          panel.isEffectivelyRunningThread(thread, codexLinkState),
        );
        const nextRunningIds = new Set(effectiveRunningThreads.map((thread) => thread.id));
        reconcileOptimisticQueuedPrompts(panel, dashboard, nextRunningIds, detail);
        broadcastState(panel, {
          type: "state",
          service: summarizeServiceState(true, {
            baseUrl: service.baseUrl,
            autoStarted: service.autoStarted,
            message: "Connected with stale dashboard data",
            logPath: service.logPath,
            ...serviceMetadataFromService(service),
            stale: true,
            refreshError: message,
          }),
          dashboard,
          memoryCards,
          workspaceRoots,
          codexConfigFiles,
          providerVisibilityHealth,
          providerSyncState: panel.providerSyncState || null,
          codexAutoState,
          effectiveRunningThreadIds: [...nextRunningIds],
          selectedThreadId: panel.selectedThreadId,
          detail,
          recentCompletions: panel.recentCompletions,
          loopDaemon,
          loopDaemons,
          loopSupport,
          traceDashboard,
          bundledSkills,
          skills: listAllSkillStates(panel).map(getSkillDetailForPayload),
          teamCoordination,
          autoContinueConfigs: panel.enrichAutoContinueConfigs(),
          optimisticQueuedPrompts: panel.optimisticQueuedPrompts,
          actionNotice: panel.lastActionNotice,
          lastSuccessfulRefreshAt: panel.lastSuccessfulRefreshAt,
          stale: true,
          refreshError: message,
          refreshWarnings: [`Dashboard refresh failed: ${message}`],
          partialRefresh: true,
        });
        if (!options.silent) {
          vscode.window.setStatusBarMessage("Codex-Managed-Agent: showing stale data after refresh timeout", 2600);
        }
        return;
      }
    }
    const probe = await probeServer(service.baseUrl).catch(() => ({ ok: false }));
    if (probe.ok) {
      const dashboard = createPartialDashboard(message, options.scope || panel.threadListScope || "live");
      const detail = null;
      const loopDaemons = readCodexLoopDaemonStates(panel, dashboard, workspaceRoots, detail);
      const loopDaemon = loopDaemons.find((item) => item.running) || loopDaemons[0] || readCodexLoopDaemonState(panel);
      const loopSupport = readCodexLoopSupport(panel);
      const bundledSkills = listBundledSkillStates(panel);
      const teamCoordination = readTeamCoordination(panel, dashboard, detail);
      broadcastState(panel, {
        type: "state",
        service: summarizeServiceState(true, {
          baseUrl: service.baseUrl,
          autoStarted: service.autoStarted,
          message: "Connected with partial dashboard data",
          logPath: service.logPath,
          ...serviceMetadataFromService(service),
          stale: true,
          refreshError: message,
        }),
        dashboard,
        memoryCards,
        workspaceRoots,
        codexConfigFiles,
        providerVisibilityHealth,
        providerSyncState: panel.providerSyncState || null,
        codexAutoState,
        effectiveRunningThreadIds: [],
        selectedThreadId: panel.selectedThreadId,
        detail,
        recentCompletions: panel.recentCompletions,
        loopDaemon,
        loopDaemons,
        loopSupport,
        bundledSkills,
        skills: listAllSkillStates(panel).map(getSkillDetailForPayload),
        teamCoordination,
        autoContinueConfigs: panel.enrichAutoContinueConfigs(),
        optimisticQueuedPrompts: panel.optimisticQueuedPrompts,
        actionNotice: panel.lastActionNotice,
        lastSuccessfulRefreshAt: panel.lastSuccessfulRefreshAt,
        stale: true,
        refreshError: message,
        refreshWarnings: dashboard.refreshWarnings,
        partialRefresh: true,
      });
      if (!options.silent) {
        vscode.window.setStatusBarMessage("Codex-Managed-Agent: connected, dashboard data is still loading", 2600);
      }
      return;
    }
    broadcastState(panel, {
      type: "state",
      service: summarizeServiceState(false, {
        baseUrl: service.baseUrl,
        autoStarted: service.autoStarted,
        message,
        logPath: service.logPath,
      }),
      dashboard: null,
      memoryCards,
      workspaceRoots,
      codexConfigFiles,
      providerVisibilityHealth,
      providerSyncState: panel.providerSyncState || null,
      codexAutoState,
      selectedThreadId: panel.selectedThreadId,
      actionNotice: panel.lastActionNotice,
      lastSuccessfulRefreshAt: panel.lastSuccessfulRefreshAt,
    });
  }
}

module.exports = {
  buildThreadTracePreview,
  ensureServer,
  openExternal,
  postMessage,
  broadcastState,
  broadcastLinkState,
  patchLoopDaemonState,
  parseRootModelProviderFromToml,
  applyProviderSync,
  readProviderSyncPreview,
  applyOpenAiSidebarLimitPatch,
  readOpenAiSidebarLimitPatchPreview,
  readProviderVisibilityHealth,
  readAccountsForPayload,
  refresh,
  syncThreadTraceLane,
};
