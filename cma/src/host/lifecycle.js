const vscode = require("vscode");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { getConfig, postLifecycleAction } = require("./server");
const { openInCodexEditor } = require("./codex-link");
const { getServiceCapabilityBlockReason } = require("./service-capabilities");
const {
  BUNDLED_SKILLS,
  resolveSkillsRoot,
  installBundledSkill: installBundledSkillContents,
} = require("./bundled-skills");
const { writeTraceReport } = require("./trace-report");
const { createLifecycleBoardTabs } = require("./lifecycle-board-tabs");
const {
  createLoopThread,
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
  installBundledCodexLoopSkill,
  installBundledSkill,
  openCodexSkillsFolder,
  syncBundledSkills,
} = require("./lifecycle-loop");
const { createThread } = require("./lifecycle-new-agent");

function loopStateDir(panel) {
  return path.join(panel.extensionUri.fsPath, ".codex-loop", "state");
}

function parseLoopIntervalMinutes(value) {
  const interval = Number.parseFloat(String(value || "").trim());
  return Number.isFinite(interval) && interval > 0 ? interval : undefined;
}

function parseLoopMaxTicks(value) {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  const maxTicks = Number.parseInt(raw, 10);
  return Number.isInteger(maxTicks) && maxTicks > 0 ? maxTicks : undefined;
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

function readJsonIfExists(filePath) {
  try {
    return filePath && fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : undefined;
  } catch {
    return undefined;
  }
}

function readTextIfExists(filePath) {
  try {
    return filePath && fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  } catch {
    return "";
  }
}

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace("T", "-");
}

function clipText(value, maxChars = 4000) {
  const text = String(value || "").trim();
  if (!text || text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[truncated ${text.length - maxChars} chars]`;
}

function readClippedFile(filePath, maxChars = 4000) {
  const text = readTextIfExists(filePath);
  return text ? clipText(text, maxChars) : "";
}

function inferWorkspaceFromLoopStateDir(stateDir) {
  const normalized = String(stateDir || "").trim();
  if (!normalized) return "";
  const parent = path.basename(normalized) === "state"
    ? path.dirname(path.dirname(normalized))
    : path.dirname(path.dirname(normalized));
  return parent && parent !== "." ? parent : "";
}

function resolveLoopStartOptions(panel, options = {}) {
  const stateDir = String(options.stateDir || "").trim() || loopStateDir(panel);
  const launcherInfo = readJsonIfExists(path.join(stateDir, "daemon_launcher.json")) || {};
  const status = readJsonIfExists(path.join(stateDir, "status.json")) || {};
  const heartbeat = readJsonIfExists(path.join(stateDir, "daemon_heartbeat.json")) || {};
  const workspacePath = String(
    options.workspacePath
      || options.workspace
      || launcherInfo.workspace
      || status.workspace
      || inferWorkspaceFromLoopStateDir(stateDir)
      || "",
  ).trim();
  const promptPath = String(
    options.promptPath
      || options.promptFile
      || launcherInfo.prompt_file
      || launcherInfo.promptFile
      || status.prompt_file
      || (workspacePath ? path.join(workspacePath, ".codex-loop", "prompt.md") : "")
      || "",
  ).trim();
  const threadId = String(
    options.threadId
      || readTextIfExists(path.join(stateDir, "thread_id.txt")).trim()
      || status.thread_id
      || "",
  ).trim();
  const intervalMinutes = parseLoopIntervalMinutes(
    options.intervalMinutes
      || heartbeat.interval_minutes
      || heartbeat.intervalMinutes,
  );
  const maxTicks = parseLoopMaxTicks(
    options.maxTicks
      || options.max_ticks
      || launcherInfo.max_ticks
      || launcherInfo.maxTicks
      || status.max_ticks
      || status.maxTicks
      || heartbeat.max_ticks
      || heartbeat.maxTicks,
  );
  return {
    stateDir,
    workspacePath,
    promptPath,
    threadId,
    intervalMinutes,
    maxTicks,
  };
}

function collectPlanFiles(rootDir, matcher, limit = 20) {
  const results = [];
  const walk = (dir, depth = 0) => {
    if (!dir || depth > 3 || !fs.existsSync(dir)) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.forEach((entry) => {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(filePath, depth + 1);
        return;
      }
      if (!entry.isFile() || !matcher(entry.name, filePath)) return;
      try {
        const stat = fs.statSync(filePath);
        results.push({ filePath, mtimeMs: stat.mtimeMs });
      } catch {
        // Ignore unreadable plan files.
      }
    });
  };
  walk(rootDir);
  return results
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, limit)
    .map((item) => item.filePath);
}

function gitStatusForWorkspace(workspacePath) {
  if (!workspacePath || !fs.existsSync(workspacePath)) return "Workspace unavailable.";
  try {
    const result = childProcess.spawnSync("git", ["status", "--short"], {
      cwd: workspacePath,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });
    if (result.error) return `git status unavailable: ${result.error.message}`;
    const output = String(result.stdout || "").trim();
    return output || "clean";
  } catch (error) {
    return `git status unavailable: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function extractMarkdownChecklist(markdown, checked) {
  const target = checked ? "x" : " ";
  const seen = new Set();
  return String(markdown || "")
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+?)\s*$/);
      if (!match || match[1].toLowerCase() !== target) return "";
      return shortTextForPrompt(match[2], 180);
    })
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

function shortTextForPrompt(value, maxChars = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text || text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 14)).trim()}... [truncated]`;
}

function formatPromptBullets(items, emptyText, limit = 10) {
  const values = Array.isArray(items) ? items.filter(Boolean).slice(0, limit) : [];
  if (!values.length) return `- ${emptyText}`;
  const extra = Array.isArray(items) && items.length > limit ? [`...and ${items.length - limit} more.`] : [];
  return values.concat(extra).map((item) => `- ${item}`).join("\n");
}

function buildTaskContinuationTriage(activePlanBlock, longPlanBlock) {
  const activeTodo = extractMarkdownChecklist(activePlanBlock, false);
  const activeDone = extractMarkdownChecklist(activePlanBlock, true);
  const longTodo = extractMarkdownChecklist(longPlanBlock, false);
  const longDone = extractMarkdownChecklist(longPlanBlock, true);
  const continueItems = activeTodo.length
    ? activeTodo
    : longTodo.slice(0, 8);
  const completedItems = activeDone.concat(longDone);
  return `## Task Continuation Triage

Use this section to decide what the new thread should continue and what it should not repeat.

### Continue In The New Thread

${formatPromptBullets(continueItems, "No unchecked plan item was detected; do an analysis/hardening pass before expanding scope.")}

### Do Not Continue Unless The User Reopens It

${formatPromptBullets(completedItems, "No completed checklist items were detected; rely on evolution notes to avoid repeating finished work.")}

### Explicitly Avoid For This Rotation

- Do not automatically create or migrate a Codex thread.
- Do not rewrite \`thread_id.txt\` or claim the old daemon has moved.
- Do not start, stop, or restart daemon processes unless the user asks.
- Do not change runtime backend behavior while only preparing or consuming a rotation handoff.
- Do not force existing non-team workflows into Team/Supervisor/Mailbox mode.
`;
}

function buildRotationPromptContent(panel, options = {}) {
  const stateDir = String(options.stateDir || "").trim() || loopStateDir(panel);
  const resolved = resolveLoopStartOptions(panel, { stateDir });
  const workspacePath = resolved.workspacePath || inferWorkspaceFromLoopStateDir(stateDir) || panel.extensionUri.fsPath;
  const plansDir = workspacePath ? path.join(workspacePath, ".claude", "plans") : "";
  const activePlanPath = plansDir ? path.join(plansDir, "ACTIVE_PLAN.md") : "";
  const longPlanPath = plansDir ? path.join(plansDir, "no-python-team-mode-longterm.md") : "";
  const promptPath = resolved.promptPath || "";
  const rotationPath = path.join(stateDir, "rotation.json");
  const previousRotation = readJsonIfExists(rotationPath) || {};
  const latestEvolutionNotes = collectPlanFiles(
    plansDir,
    (name) => /evolution/i.test(name) && /\.md$/i.test(name),
    3,
  );
  const status = readJsonIfExists(path.join(stateDir, "status.json")) || {};
  const heartbeat = readJsonIfExists(path.join(stateDir, "daemon_heartbeat.json")) || {};
  const launcherInfo = readJsonIfExists(path.join(stateDir, "daemon_launcher.json")) || {};
  const now = new Date();
  const generation = Number(previousRotation.generation || 0) + 1;
  const noteBlocks = latestEvolutionNotes.map((filePath, index) => {
    const rel = workspacePath ? path.relative(workspacePath, filePath) : filePath;
    return `### Recent Evolution Note ${index + 1}: ${rel}\n\n\`\`\`markdown\n${readClippedFile(filePath, 2200) || "(empty or unreadable)"}\n\`\`\``;
  }).join("\n\n");
  const activePlanBlock = readClippedFile(activePlanPath, 3200);
  const longPlanBlock = readClippedFile(longPlanPath, 2600);
  const promptBlock = readClippedFile(promptPath, 2200);
  const taskTriageBlock = buildTaskContinuationTriage(activePlanBlock, longPlanBlock);
  const stateSummary = {
    state_dir: stateDir,
    workspace: workspacePath || "",
    prompt_file: promptPath || "",
    current_thread_id: resolved.threadId || "",
    interval_minutes: resolved.intervalMinutes || "",
    max_ticks: resolved.maxTicks || "",
    completed_ticks: heartbeat.completed_ticks || heartbeat.completedTicks || status.completed_ticks || status.completedTicks || "",
    heartbeat_phase: heartbeat.phase || status.phase || "",
    stop_reason: heartbeat.stop_reason || heartbeat.stopReason || status.stop_reason || status.stopReason || "",
    launcher: launcherInfo.launcher || "",
    generated_at: now.toISOString(),
    rotation_generation: generation,
  };

  const content = `# Codex Loop Rotation Prompt

You are taking over a long-running Codex loop as the next worker thread. This is a manual context rotation: do not assume the previous chat context is available, and do not mutate loop thread identity unless the user explicitly asks.

## Operating Rules

- Complete one small, verifiable slice only.
- Read the active plan and the latest evolution notes before editing code.
- Protect existing features: Thread Explorer, Board, Codex sidebar, pin/layout persistence, usage charts, mailbox/team mode.
- The built-in Node backend is primary; backend work must stay non-destructive unless a plan explicitly allows it.
- Team/Supervisor/Mailbox remains sidecar and must not force old workflows into team mode.
- Every implementation pass must run relevant static checks and create a local git commit. Do not push.
- If this pass is an analysis/hardening round, focus on regression risk, plan drift, and version safety.

## Current Loop State

\`\`\`json
${JSON.stringify(stateSummary, null, 2)}
\`\`\`

## Git Status

\`\`\`text
${gitStatusForWorkspace(workspacePath)}
\`\`\`

${taskTriageBlock}

## Active Plan

Path: ${activePlanPath || "(not found)"}

\`\`\`markdown
${activePlanBlock || "(missing ACTIVE_PLAN.md)"}
\`\`\`

## Long-Term Plan

Path: ${longPlanPath || "(not found)"}

\`\`\`markdown
${longPlanBlock || "(missing no-python-team-mode-longterm.md)"}
\`\`\`

## Current Loop Prompt

Path: ${promptPath || "(not found)"}

\`\`\`markdown
${promptBlock || "(missing prompt.md)"}
\`\`\`

## Recent Evolution Notes

${noteBlocks || "(No recent evolution notes found.)"}

## Handoff Request

Continue from the plans above. Pick the smallest unfinished task that moves the current milestone forward, avoid runtime backend behavior changes unless the plan explicitly calls for them, update checkboxes only for work that is actually complete, write one new evolution note, run checks, and commit locally.
`;
  return {
    content,
    stateDir,
    workspacePath,
    threadId: resolved.threadId || "",
    generation,
  };
}

async function generateLoopRotationPrompt(panel, stateDir) {
  const built = buildRotationPromptContent(panel, { stateDir });
  fs.mkdirSync(path.join(built.stateDir, "handoffs"), { recursive: true });
  const handoffPath = path.join(built.stateDir, "handoffs", `handoff-${timestampForFile()}.md`);
  fs.writeFileSync(handoffPath, built.content, "utf8");
  writeJson(path.join(built.stateDir, "rotation.json"), {
    last_handoff_path: handoffPath,
    last_handoff_at: new Date().toISOString(),
    parent_thread_id: built.threadId || undefined,
    generation: built.generation,
    rotation_reason: "manual_prompt_generation",
    state_dir: built.stateDir,
    workspace: built.workspacePath || undefined,
  });
  await copyText(panel, built.content, "Rotation prompt");
  panel.lastActionNotice = "Rotation prompt generated and copied";
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 3200);
  await panel.refresh({ silent: true, mode: "full" });
  return handoffPath;
}

async function copyLoopRotationPrompt(panel, stateDir) {
  const normalizedStateDir = String(stateDir || "").trim() || loopStateDir(panel);
  const rotation = readJsonIfExists(path.join(normalizedStateDir, "rotation.json")) || {};
  const handoffPath = String(rotation.last_handoff_path || "").trim();
  const content = readTextIfExists(handoffPath);
  if (!content) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: no saved rotation prompt found. Generate one first.");
    return;
  }
  await copyText(panel, content, "Rotation prompt");
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

function warnIfServiceCapabilityBlocked(panel, capability, actionLabel) {
  const reason = getServiceCapabilityBlockReason(panel.lastPayload?.service, capability, actionLabel);
  if (!reason) return false;
  panel.lastActionNotice = reason;
  vscode.window.showWarningMessage(`Codex-Managed-Agent: ${reason}`);
  return true;
}

async function runLifecycleAction(panel, action, threadIdsOrOne) {
  const ids = Array.isArray(threadIdsOrOne)
    ? threadIdsOrOne.map((item) => String(item || "").trim()).filter(Boolean)
    : [String(threadIdsOrOne || "").trim()].filter(Boolean);
  if (!ids.length) return;
  if (warnIfServiceCapabilityBlocked(panel, "lifecycle", "lifecycle actions")) return;
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
        await panel.refresh({ silent: true, mode: "full" });
        return;
      }
      if (patch) {
        patchThreadInPayload(panel, threadId, patch);
        panel.postMessage({
          type: "threadPatched",
          threadId,
          patch,
        });
        await panel.refresh({ silent: true, mode: "full" });
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
          await panel.refresh({ silent: true, mode: "full" });
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
          await panel.refresh({ silent: true, mode: "full" });
          return;
        }
      }
    }
    await panel.refresh({ mode: "full" });
  } catch (error) {
    panel.lastActionNotice = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`);
    if (ids.length === 1) return;
    await panel.refresh({ silent: true, mode: "full" });
  }
}

async function copyText(panel, text, label = "Copied") {
  if (!text) return;
  await vscode.env.clipboard.writeText(String(text));
  panel.lastActionNotice = `${label} copied`;
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2400);
}

async function openLocalFile(panel, filePath, label = "Opened file") {
  const nextPath = String(filePath || "").trim();
  if (!nextPath) return;
  if (!fs.existsSync(nextPath)) {
    vscode.window.showWarningMessage(`Codex-Managed-Agent: file not found: ${nextPath}`);
    return;
  }
  const uri = vscode.Uri.file(nextPath);
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: false });
  panel.lastActionNotice = label;
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2200);
}

async function revealInExplorer(panel, folderPath) {
  const nextPath = String(folderPath || "").trim();
  if (!nextPath) return;
  if (!fs.existsSync(nextPath)) {
    vscode.window.showWarningMessage(`Codex-Managed-Agent: folder not found: ${nextPath}`);
    return;
  }
  const uri = vscode.Uri.file(nextPath);
  await vscode.commands.executeCommand("revealInExplorer", uri);
  panel.lastActionNotice = `Revealed ${path.basename(nextPath)}`;
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2200);
}

async function openLogFile(panel, filePath) {
  await openLocalFile(panel, filePath, "Opened background log");
}

async function exportTraceReport(panel, payload = {}) {
  const reportPath = writeTraceReport(payload);
  await openLocalFile(panel, reportPath, "Opened trace report");
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

function diffExcerptPairFromPreview(preview) {
  const before = [];
  const after = [];
  const text = String(preview || "");
  text.split(/\r?\n/).forEach((line) => {
    if (!line) {
      before.push("");
      after.push("");
      return;
    }
    if (/^(diff --git|index |\\ No newline|\*\*\* Begin Patch|\*\*\* End Patch)/.test(line)) return;
    const patchFile = line.match(/^\*\*\* (?:Add|Update|Delete) File:\s+(.+)$/);
    if (patchFile) {
      const marker = `# ${patchFile[1]}`;
      before.push(marker);
      after.push(marker);
      return;
    }
    if (/^(---|\+\+\+)\s+/.test(line)) return;
    if (line.startsWith("@@")) {
      before.push(line);
      after.push(line);
      return;
    }
    if (line.startsWith("-")) {
      before.push(line.slice(1));
      return;
    }
    if (line.startsWith("+")) {
      after.push(line.slice(1));
      return;
    }
    if (line.startsWith(" ")) {
      before.push(line.slice(1));
      after.push(line.slice(1));
      return;
    }
    before.push(line);
    after.push(line);
  });
  return {
    before: before.join("\n").trimEnd() || "(empty before excerpt)\n",
    after: after.join("\n").trimEnd() || "(empty after excerpt)\n",
  };
}

function safeTempName(value, fallback = "tool-diff") {
  const text = String(value || fallback).trim().replace(/[^A-Za-z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "");
  return (text || fallback).slice(0, 64);
}

async function openSessionToolDiff(panel, payload = {}) {
  const diff = payload && payload.diff && typeof payload.diff === "object" ? payload.diff : {};
  const preview = String(diff.preview || payload.preview || "").trim();
  if (!preview) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: no session diff preview is available for this tool event.");
    return;
  }
  const pair = diffExcerptPairFromPreview(preview);
  const threadId = safeTempName(payload.threadId || "thread");
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const dir = path.join(os.tmpdir(), "codex-managed-agent", "session-tool-diffs", `${threadId}-${stamp}`);
  fs.mkdirSync(dir, { recursive: true });
  const beforePath = path.join(dir, "before.txt");
  const afterPath = path.join(dir, "after.txt");
  fs.writeFileSync(beforePath, pair.before, "utf8");
  fs.writeFileSync(afterPath, pair.after, "utf8");
  const title = String(payload.title || diff.summary || "Session Tool Diff").trim() || "Session Tool Diff";
  await vscode.commands.executeCommand(
    "vscode.diff",
    vscode.Uri.file(beforePath),
    vscode.Uri.file(afterPath),
    `${title} (tool excerpt)`,
  );
  panel.lastActionNotice = "Opened session tool diff";
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2200);
}

async function showThreadInCodex(panel, threadId, preferredTitle = "") {
  if (!threadId) return;
  const config = getConfig();
  try {
    await postLifecycleAction(config.baseUrl, "unarchive", [threadId], true);
    const patch = { archived: false };
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

const {
  editCardLabel,
  setCardLabel,
  chooseBoardTab,
  createBoardTab,
  batchSetBoardTab,
} = createLifecycleBoardTabs({ vscode });

module.exports = {
  runLifecycleAction,
  copyText,
  openLocalFile,
  revealInExplorer,
  openLogFile,
  exportTraceReport,
  openRepoFile,
  openSessionToolDiff,
  createThread,
  createLoopThread,
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
  installBundledCodexLoopSkill,
  installBundledSkill,
  openCodexSkillsFolder,
  syncBundledSkills,
  generateLoopRotationPrompt,
  copyLoopRotationPrompt,
  attachLoopTmux,
  tailLoopLog,
  editCardLabel,
  setCardLabel,
  chooseBoardTab,
  createBoardTab,
  batchSetBoardTab,
};
