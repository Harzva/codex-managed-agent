const vscode = require("vscode");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { openNewCodexThread } = require("./codex-link");
const {
  IS_WINDOWS,
  quotePowerShell,
  tailFileCommand,
} = require("./platform-runtime");

const DEFAULT_LOOP_ATTACH_INTERVAL_MINUTES = 1;

function shellQuote(value) {
  return "'" + String(value || "").replace(/'/g, "'\"'\"'") + "'";
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
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + "\n", "utf8");
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

function loopStatePid(stateDir) {
  const pid = Number.parseInt(readTextIfExists(path.join(stateDir, "daemon.pid")).trim(), 10);
  return Number.isInteger(pid) && pid > 0 ? pid : undefined;
}

function initializeLoopWorkspace(workspacePath, title, threadId, intervalMinutes = 1, maxTicks) {
  const loopRoot = workspaceLoopRoot(workspacePath);
  const stateDir = workspaceLoopStateDir(workspacePath);
  const promptPath = path.join(loopRoot, "prompt.md");
  const activePlanPath = path.join(workspacePath, ".claude", "plans", "ACTIVE_PLAN.md");
  const roadmapPath = path.join(workspacePath, "ROADMAP.md");
  const nowIso = new Date().toISOString();

  fs.mkdirSync(path.join(stateDir, "logs"), { recursive: true });
  try {
    fs.rmSync(path.join(stateDir, "daemon.pid"), { force: true });
  } catch {
    // Best-effort stale PID cleanup for stopped attach placeholders.
  }
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
    max_ticks: maxTicks || null,
  });
  writeJson(path.join(stateDir, "daemon_heartbeat.json"), {
    phase: "stopped",
    interval_minutes: intervalMinutes,
    max_ticks: maxTicks || null,
    completed_ticks: 0,
    remaining_ticks: maxTicks || null,
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
    max_ticks: maxTicks || null,
    completed_ticks: 0,
    remaining_ticks: maxTicks || null,
  });
  return {
    stateDir,
    promptPath,
    activePlanPath,
    roadmapPath,
    intervalMinutes,
  };
}

function collectKnownThreads(panel) {
  const payload = panel.lastPayload || {};
  const dashboard = payload.dashboard || {};
  return []
    .concat(Array.isArray(dashboard.threads) ? dashboard.threads : [])
    .concat(Array.isArray(dashboard.runningThreads) ? dashboard.runningThreads : [])
    .concat(payload.detail && payload.detail.thread ? [payload.detail.thread] : []);
}

function findKnownThread(panel, threadId) {
  const nextThreadId = String(threadId || "").trim();
  if (!nextThreadId) return undefined;
  return collectKnownThreads(panel).find((thread) => thread && String(thread.id || "").trim() === nextThreadId);
}

function displayTitleForThread(thread, threadId) {
  const title = thread && (
    thread.title
      || thread.db_title
      || thread.label
      || thread.summary
      || thread.cwd
  );
  return String(title || threadId || "Codex thread").trim();
}

function existingLoopIntervalMinutes(stateDir) {
  const heartbeat = readJsonIfExists(path.join(stateDir, "daemon_heartbeat.json")) || {};
  return parseLoopIntervalMinutes(heartbeat.interval_minutes || heartbeat.intervalMinutes);
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

function resolveCodexLoopStartScript() {
  return path.join(resolveCodexHome(), "skills", "codex-loop", "scripts", "start_codex_loop.sh");
}

function resolveCodexLoopAutomationScript() {
  return path.join(resolveCodexHome(), "skills", "codex-loop", "scripts", "codex_loop_automation.py");
}

function resolveCodexHome() {
  return process.env.CODEX_HOME
    ? path.resolve(process.env.CODEX_HOME)
    : path.join(os.homedir(), ".codex");
}

function resolveCodexLoopSkillDir() {
  return path.join(resolveCodexHome(), "skills", "codex-loop");
}

function resolveBundledCodexLoopSkillDir(panel) {
  return path.join(panel.extensionUri.fsPath, "bundled-skills", "codex-loop");
}

function copyDirectoryContents(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (entry.name === "__pycache__" || entry.name.endsWith(".pyc")) continue;
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryContents(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
      try {
        fs.chmodSync(targetPath, fs.statSync(sourcePath).mode);
      } catch {
        // chmod is best-effort on remote/non-POSIX filesystems.
      }
    }
  }
}

async function installBundledCodexLoopSkill(panel) {
  return installBundledSkill(panel, "codex-loop");
}

async function installBundledSkill(panel, skillName, options = {}) {
  const nextSkillName = String(skillName || "").trim();
  if (!nextSkillName) return false;
  let result = installBundledSkillContents(panel, nextSkillName, options);
  if (result.needsConfirmation) {
    const picked = await vscode.window.showWarningMessage(
      `Codex-Managed-Agent: ${nextSkillName} already exists in ~/.codex/skills and was not installed by CMA. Overwrite it?`,
      { modal: true },
      "Overwrite",
      "Cancel",
    );
    if (picked !== "Overwrite") {
      panel.lastActionNotice = `Skipped ${nextSkillName} install`;
      vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2200);
      await panel.refresh({ silent: true });
      return false;
    }
    result = installBundledSkillContents(panel, nextSkillName, { force: true });
  }
  if (result.unchanged) {
    panel.lastActionNotice = `${nextSkillName} skill is already installed`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
    await panel.refresh({ silent: true });
    return true;
  }
  if (!result.ok) {
    panel.lastActionNotice = `${nextSkillName} install failed: ${result.reason || "unknown error"}`;
    vscode.window.showErrorMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`);
    await panel.refresh({ silent: true });
    return false;
  }
  const targetDir = result.state && result.state.skillPath ? result.state.skillPath : "";
  panel.lastActionNotice = `Installed ${nextSkillName} skill${targetDir ? ` to ${targetDir}` : ""}`;
  vscode.window.showInformationMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`);
  await panel.refresh({ silent: true });
  return true;
}

async function openCodexSkillsFolder(panel) {
  const skillsRoot = resolveSkillsRoot();
  fs.mkdirSync(skillsRoot, { recursive: true });
  try {
    await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(skillsRoot));
  } catch (error) {
    await vscode.env.openExternal(vscode.Uri.file(skillsRoot));
  }
  panel.lastActionNotice = "Opened Codex skills folder";
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2200);
}

async function syncBundledSkills(panel) {
  let installed = 0;
  let unchanged = 0;
  let skipped = 0;
  const failures = [];
  for (const skill of BUNDLED_SKILLS) {
    const result = installBundledSkillContents(panel, skill.name);
    if (result.needsConfirmation) {
      skipped += 1;
    } else if (result.ok && result.unchanged) {
      unchanged += 1;
    } else if (result.ok) {
      installed += 1;
    } else {
      failures.push(`${skill.name}: ${result.reason || "unknown error"}`);
    }
  }
  if (failures.length) {
    panel.lastActionNotice = `Skill sync finished with ${failures.length} failure${failures.length === 1 ? "" : "s"}`;
    vscode.window.showWarningMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}: ${failures.join("; ")}`);
  } else {
    panel.lastActionNotice = `Synced bundled skills: ${installed} installed/updated, ${unchanged} unchanged${skipped ? `, ${skipped} skipped` : ""}`;
    vscode.window.showInformationMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`);
  }
  await panel.refresh({ silent: true });
  return !failures.length;
}

function buildLoopDaemonCommandForStateDir(panel, stateDir, workspacePath, promptPath, threadId, intervalMinutes, maxTicks) {
  const nextThreadId = String(threadId || "").trim();
  const nextInterval = parseLoopIntervalMinutes(intervalMinutes);
  const nextMaxTicks = parseLoopMaxTicks(maxTicks);
  if (!nextThreadId || !nextInterval) return "";
  if (IS_WINDOWS) {
    return buildWindowsLoopDaemonCommand(nextThreadId, promptPath, workspacePath, stateDir, nextInterval, nextMaxTicks);
  }
  const startScriptPath = resolveCodexLoopStartScript();
  if (!fs.existsSync(startScriptPath)) {
    vscode.window.showWarningMessage(`Codex-Managed-Agent: codex-loop start script not found: ${startScriptPath}`);
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
  const commandParts = [
    "CODEX_LOOP_WORKSPACE=" + shellQuote(nextWorkspace),
    "CODEX_LOOP_PROMPT_FILE=" + shellQuote(nextPromptPath),
    "CODEX_LOOP_STATE_DIR=" + shellQuote(stateDir),
    "CODEX_LOOP_FORCE_THREAD_ID=" + shellQuote(nextThreadId),
    "CODEX_LOOP_INTERVAL_MINUTES=" + shellQuote(String(nextInterval)),
    "CODEX_LOOP_LAUNCHER=auto",
    "CODEX_LOOP_REUSE_CURRENT_THREAD=0",
    "CODEX_LOOP_PYTHON_BIN=python3",
    "bash",
    shellQuote(startScriptPath),
    "--dangerous",
  ];
  if (nextMaxTicks) {
    commandParts.splice(5, 0, "CODEX_LOOP_MAX_TICKS=" + shellQuote(String(nextMaxTicks)));
  }
  return commandParts.join(" ");
}

function buildWindowsLoopDaemonCommand(threadId, promptPath, workspacePath, stateDir, intervalMinutes, maxTicks) {
  const scriptPath = resolveCodexLoopAutomationScript();
  if (!fs.existsSync(scriptPath)) {
    vscode.window.showWarningMessage(`Codex-Managed-Agent: codex-loop Python script not found: ${scriptPath}`);
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
  const logDir = path.join(stateDir, "logs");
  const stdoutPath = path.join(logDir, "daemon_stdout.log");
  const stderrPath = path.join(logDir, "daemon_stderr.log");
  const pidPath = path.join(stateDir, "daemon.pid");
  const args = [
    scriptPath,
    "daemon",
    "--workspace", nextWorkspace,
    "--prompt-file", nextPromptPath,
    "--state-dir", stateDir,
    "--interval-minutes", String(intervalMinutes),
    "--thread-id", threadId,
    "--dangerous",
  ];
  if (maxTicks) args.splice(args.length - 1, 0, "--max-ticks", String(maxTicks));
  const psArgs = "@(" + args.map(quotePowerShell).join(", ") + ")";
  return [
    `New-Item -ItemType Directory -Force -Path ${quotePowerShell(logDir)} | Out-Null`,
    `Start-Process -WindowStyle Hidden -FilePath ${quotePowerShell("python")} -ArgumentList ${psArgs} -WorkingDirectory ${quotePowerShell(nextWorkspace)} -RedirectStandardOutput ${quotePowerShell(stdoutPath)} -RedirectStandardError ${quotePowerShell(stderrPath)}`,
    "Start-Sleep -Seconds 1",
    `Get-Content -LiteralPath ${quotePowerShell(pidPath)} -ErrorAction SilentlyContinue`,
  ].join("; ");
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function readFileTail(filePath, maxBytes = 4000) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return "";
    const stat = fs.statSync(filePath);
    const start = Math.max(0, stat.size - maxBytes);
    const fd = fs.openSync(filePath, "r");
    try {
      const buffer = Buffer.alloc(stat.size - start);
      fs.readSync(fd, buffer, 0, buffer.length, start);
      return buffer.toString("utf8");
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return "";
  }
}

function readLoopDaemonPid(stateDir) {
  try {
    const pidPath = path.join(stateDir, "daemon.pid");
    if (!fs.existsSync(pidPath)) return undefined;
    const pid = Number.parseInt(fs.readFileSync(pidPath, "utf8").trim(), 10);
    return Number.isInteger(pid) && pid > 0 ? pid : undefined;
  } catch {
    return undefined;
  }
}

async function waitForLoopDaemonPid(stateDir, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const pid = readLoopDaemonPid(stateDir);
    if (pid && isPidRunning(pid)) return pid;
    await delay(250);
  }
  return undefined;
}

async function waitForLoopDaemonStop(stateDir, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const pid = readLoopDaemonPid(stateDir);
    if (!pid || !isPidRunning(pid)) return true;
    await delay(300);
  }
  return false;
}

function removeLoopStartBlockers(stateDir) {
  for (const fileName of ["stop.flag"]) {
    try {
      fs.rmSync(path.join(stateDir, fileName), { force: true });
    } catch {
      // Best-effort cleanup; startup validation will report real failures.
    }
  }
}

function execLoopStartCommand(command, workspacePath) {
  return new Promise((resolve) => {
    childProcess.exec(
      command,
      {
        cwd: workspacePath || undefined,
        env: { ...process.env, TERM: process.env.TERM || "xterm-256color" },
        timeout: 10000,
        maxBuffer: 64 * 1024,
      },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          stdout: String(stdout || "").trim(),
          stderr: String(stderr || "").trim(),
          error: error ? (error.message || String(error)) : "",
        });
      },
    );
  });
}

function buildLoopStartFailureDetail(result, stateDir) {
  const daemonTail = readFileTail(path.join(stateDir, "logs", "daemon_stdout.log"), 3000).trim();
  return [
    result && result.error,
    result && result.stderr,
    result && result.stdout,
    daemonTail,
  ].filter(Boolean).join("\n").trim() || "daemon.pid was not created";
}

async function startLoopDaemonBackend(panel, options = {}) {
  const { stateDir, workspacePath, promptPath, threadId, intervalMinutes, maxTicks } = resolveLoopStartOptions(panel, options);
  const missing = [
    !stateDir ? "stateDir" : "",
    !workspacePath ? "workspace" : "",
    !promptPath ? "promptFile" : "",
    !threadId ? "threadId" : "",
    !intervalMinutes ? "intervalMinutes" : "",
  ].filter(Boolean);
  if (missing.length) {
    vscode.window.showWarningMessage(`Codex-Managed-Agent: missing loop daemon metadata for start (${missing.join(", ")})`);
    return false;
  }
  if (!writeLoopManagedThread(panel, threadId, stateDir)) return false;
  removeLoopStartBlockers(stateDir);
  const command = buildLoopDaemonCommandForStateDir(panel, stateDir, workspacePath, promptPath, threadId, intervalMinutes, maxTicks);
  if (!command) return false;
  const result = await execLoopStartCommand(command, workspacePath);
  const pid = await waitForLoopDaemonPid(stateDir, 4000);
  if (!pid) {
    const detail = buildLoopStartFailureDetail(result, stateDir);
    panel.lastActionNotice = `Loop start failed: ${detail.split(/\r?\n/)[0] || "daemon.pid was not created"}`;
    vscode.window.showWarningMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`);
    await panel.refresh({ silent: true });
    return false;
  }
  panel.lastActionNotice = `Loop daemon started (PID ${pid})`;
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
  await panel.refresh({ silent: true });
  return true;
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
  const nextInterval = parseLoopIntervalMinutes(loopDaemon.intervalMinutes);
  if (!nextThreadId || !nextInterval) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: missing loop thread or interval for start");
    return;
  }
  await startLoopDaemonBackend(panel, {
    stateDir: loopStateDir(panel),
    workspacePath: panel.extensionUri.fsPath,
    promptPath: path.join(panel.extensionUri.fsPath, ".codex-loop", "prompt.md"),
    threadId: nextThreadId,
    intervalMinutes: nextInterval,
    maxTicks: parseLoopMaxTicks(loopDaemon.maxTicks || loopDaemon.max_ticks),
  });
}

async function startLoopDaemonAt(panel, options = {}) {
  const { stateDir, workspacePath, promptPath, threadId, intervalMinutes, maxTicks } = resolveLoopStartOptions(panel, options);
  const missing = [
    !stateDir ? "stateDir" : "",
    !workspacePath ? "workspace" : "",
    !promptPath ? "promptFile" : "",
    !threadId ? "threadId" : "",
    !intervalMinutes ? "intervalMinutes" : "",
  ].filter(Boolean);
  if (missing.length) {
    vscode.window.showWarningMessage(`Codex-Managed-Agent: missing loop daemon metadata for start (${missing.join(", ")})`);
    return;
  }
  await startLoopDaemonBackend(panel, {
    stateDir,
    workspacePath,
    promptPath,
    threadId,
    intervalMinutes,
    maxTicks,
  });
}

async function createLoopThread(panel) {
  const created = await openNewCodexThread();
  if (!created.ok) {
    const detail = created.error || "Could not open the Codex sidebar";
    panel.lastActionNotice = "Failed to open Codex sidebar for a new loop thread";
    vscode.window.showErrorMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}: ${detail}`);
    return;
  }
  panel.lastActionNotice = "Codex sidebar opened. Send the first message, then return here and use Attach to Loop on the real thread.";
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 4200);
  vscode.window.showInformationMessage("Codex-Managed-Agent: Codex sidebar opened. Send the first message, then use Attach to Loop on the created thread.");
}

async function setLoopManagedThread(panel, threadId) {
  const nextThreadId = String(threadId || "").trim();
  if (!nextThreadId) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: missing thread id for loop attach");
    return;
  }
  const thread = findKnownThread(panel, nextThreadId);
  const workspacePath = String(
    (thread && thread.cwd)
      || pickWorkspacePath(panel)
      || "",
  ).trim();
  if (!workspacePath || !fs.existsSync(workspacePath)) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: missing workspace path for loop attach");
    return;
  }
  const stateDir = workspaceLoopStateDir(workspacePath);
  const livePid = loopStatePid(stateDir);
  if (livePid && isPidRunning(livePid)) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: stop the running loop daemon before attaching a different thread");
    return;
  }
  const intervalMinutes = existingLoopIntervalMinutes(stateDir) || DEFAULT_LOOP_ATTACH_INTERVAL_MINUTES;
  initializeLoopWorkspace(
    workspacePath,
    displayTitleForThread(thread, nextThreadId),
    nextThreadId,
    intervalMinutes,
  );
  panel.knownLoopStateDirs = [
    stateDir,
    ...((panel.knownLoopStateDirs || []).filter((item) => item && item !== stateDir)),
  ].slice(0, 64);
  panel.lastActionNotice = "Thread attached to loop (not started)";
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
  if (!panel.patchLoopDaemonState(stateDir)) {
    await panel.refresh({ silent: true, mode: "hot" });
  }
}

async function runLoopIntervalPreset(panel, threadId, intervalMinutes, maxTicks) {
  const nextThreadId = String(threadId || "").trim();
  const nextInterval = parseLoopIntervalMinutes(intervalMinutes);
  const nextMaxTicks = parseLoopMaxTicks(maxTicks);
  if (!nextThreadId || !nextInterval) return;
  const thread = findKnownThread(panel, nextThreadId);
  const workspacePath = String(
    (thread && thread.cwd)
      || pickWorkspacePath(panel)
      || "",
  ).trim();
  if (!workspacePath || !fs.existsSync(workspacePath)) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: missing workspace path for loop start");
    return;
  }
  const stateDir = workspaceLoopStateDir(workspacePath);
  const livePid = loopStatePid(stateDir);
  if (livePid && isPidRunning(livePid)) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: codex-loop daemon is already running");
    return;
  }
  initializeLoopWorkspace(
    workspacePath,
    displayTitleForThread(thread, nextThreadId),
    nextThreadId,
    nextInterval,
    nextMaxTicks,
  );
  await startLoopDaemonBackend(panel, {
    stateDir,
    workspacePath,
    promptPath: path.join(workspacePath, ".codex-loop", "prompt.md"),
    threadId: nextThreadId,
    intervalMinutes: nextInterval,
    maxTicks: nextMaxTicks,
  });
}

async function promptLoopIntervalPreset(panel, threadId) {
  const nextThreadId = String(threadId || "").trim();
  if (!nextThreadId) return;
  const currentInterval = panel.lastPayload && panel.lastPayload.loopDaemon && panel.lastPayload.loopDaemon.intervalMinutes
    ? String(panel.lastPayload.loopDaemon.intervalMinutes)
    : "1";
  const input = await vscode.window.showInputBox({
    title: "Custom Codex Loop Interval",
    prompt: "Enter the loop interval in minutes. Decimals like 0.5 are allowed.",
    value: currentInterval,
    ignoreFocusOut: true,
    validateInput: (value) => {
      return parseLoopIntervalMinutes(value) ? undefined : "Enter minutes greater than 0, for example 0.5 or 10";
    },
  });
  if (input === undefined) return;
  const countInput = await vscode.window.showInputBox({
    title: "Custom Codex Loop Count",
    prompt: "Optional: stop after this many loop ticks. Leave empty for unlimited.",
    value: "",
    ignoreFocusOut: true,
    validateInput: (value) => {
      return !String(value || "").trim() || parseLoopMaxTicks(value) ? undefined : "Enter a positive integer, or leave empty for unlimited";
    },
  });
  if (countInput === undefined) return;
  await runLoopIntervalPreset(panel, nextThreadId, input, countInput);
}

async function restartLoopDaemon(panel) {
  const loopDaemon = panel.lastPayload && panel.lastPayload.loopDaemon ? panel.lastPayload.loopDaemon : {};
  if (!loopDaemon.running) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: no running codex-loop daemon to restart");
    return;
  }
  const nextThreadId = String(loopDaemon.threadId || "").trim();
  const nextInterval = parseLoopIntervalMinutes(loopDaemon.intervalMinutes);
  if (!nextThreadId || !nextInterval) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: missing loop thread or interval for restart");
    return;
  }
  if (!writeLoopManagedThread(panel, nextThreadId)) return;
  const stateDir = loopStateDir(panel);
  fs.writeFileSync(path.join(stateDir, "stop.flag"), "stop\n", "utf8");
  const stopped = await waitForLoopDaemonStop(stateDir, 8000);
  if (!stopped) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: loop daemon did not stop before restart");
    return;
  }
  await startLoopDaemonBackend(panel, {
    stateDir,
    workspacePath: panel.extensionUri.fsPath,
    promptPath: path.join(panel.extensionUri.fsPath, ".codex-loop", "prompt.md"),
    threadId: nextThreadId,
    intervalMinutes: nextInterval,
    maxTicks: parseLoopMaxTicks(loopDaemon.maxTicks || loopDaemon.max_ticks),
  });
}

async function restartLoopDaemonAt(panel, options = {}) {
  const { stateDir, workspacePath, promptPath, threadId, intervalMinutes, maxTicks } = resolveLoopStartOptions(panel, options);
  const missing = [
    !stateDir ? "stateDir" : "",
    !workspacePath ? "workspace" : "",
    !promptPath ? "promptFile" : "",
    !threadId ? "threadId" : "",
    !intervalMinutes ? "intervalMinutes" : "",
  ].filter(Boolean);
  if (missing.length) {
    vscode.window.showWarningMessage(`Codex-Managed-Agent: missing loop daemon metadata for restart (${missing.join(", ")})`);
    return;
  }
  if (!writeLoopManagedThread(panel, threadId, stateDir)) return;
  fs.writeFileSync(path.join(stateDir, "stop.flag"), "stop\n", "utf8");
  const stopped = await waitForLoopDaemonStop(stateDir, 8000);
  if (!stopped) {
    vscode.window.showWarningMessage("Codex-Managed-Agent: loop daemon did not stop before restart");
    return;
  }
  await startLoopDaemonBackend(panel, {
    stateDir,
    workspacePath,
    promptPath,
    threadId,
    intervalMinutes,
    maxTicks,
  });
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
  if (IS_WINDOWS) {
    vscode.window.showInformationMessage("Codex-Managed-Agent: tmux attach is only available on Linux/macOS. Use Open Log on Windows.");
    return;
  }
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
  await panel.runCommandInTerminal(tailFileCommand(nextPath), "Loop log tail");
}

const lifecycleLoop = {
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
};

module.exports = lifecycleLoop;
