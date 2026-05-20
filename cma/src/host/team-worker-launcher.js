function createTeamWorkerLauncher(deps = {}) {
  const {
    resolveExecutablePath,
  } = require("./platform-runtime");
  const {
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
  } = deps;

  function teamReflectiveSkillInstalled() {
    const codexHome = process.env.CODEX_HOME
      ? path.resolve(process.env.CODEX_HOME)
      : path.join(os.homedir(), ".codex");
    return fs.existsSync(path.join(codexHome, "skills", "team-reflective-loop", "SKILL.md"));
  }

  function configuredCodexModel() {
    try {
      return String(vscode.workspace.getConfiguration("codexAgent").get("defaultCodexModel") || "").trim();
    } catch {
      return "";
    }
  }

  function validateCodexModelName(model) {
    const nextModel = String(model || "").trim();
    if (!nextModel) return "";
    if (/\s/.test(nextModel)) {
      throw new Error("codexAgent.defaultCodexModel must be a single model name without spaces");
    }
    return nextModel;
  }

  function preflightCodexCli(model = "") {
    validateCodexModelName(model);
    const codexPath = resolveExecutablePath("codex", { extraDirs: [path.resolve(__dirname, "..", "..", "node_modules", ".bin")] });
    const versionProbe = childProcess.spawnSync(codexPath || "codex", ["--version"], {
      encoding: "utf8",
      timeout: 2500,
    });
    if (versionProbe.error) throw versionProbe.error;
    if (versionProbe.status !== 0) {
      throw new Error((versionProbe.stderr || versionProbe.stdout || "codex CLI is not available").trim());
    }
    const execProbe = childProcess.spawnSync(codexPath || "codex", ["exec", "--help"], {
      encoding: "utf8",
      timeout: 2500,
    });
    if (execProbe.error) throw execProbe.error;
    if (execProbe.status !== 0) {
      throw new Error((execProbe.stderr || execProbe.stdout || "codex exec is not available").trim());
    }
    return String(versionProbe.stdout || versionProbe.stderr || "").trim();
  }

  function classifyTeamDispatchFailure(error) {
    const detail = error instanceof Error ? error.message : String(error || "");
    const code = error && typeof error === "object" ? String(error.code || "") : "";
    if (/defaultCodexModel/i.test(detail)) {
      return {
        kind: "model_misconfigured",
        action: "Set codexAgent.defaultCodexModel to a single model name, or clear it to use the Codex CLI default.",
      };
    }
    if (/(no workspace available|workspace missing|No workspace path available|workspace path is required)/i.test(detail)) {
      return {
        kind: "workspace_missing",
        action: "Open a folder or select a Codex thread with a valid cwd, then retry the Team Space.",
      };
    }
    if (code === "ENOENT" || /(ENOENT|not found|command not found|codex CLI is not available)/i.test(detail)) {
      return {
        kind: "codex_cli_missing",
        action: "Install or authenticate Codex CLI, then retry with a new worker.",
      };
    }
    if (/codex exec/i.test(detail)) {
      return {
        kind: "codex_exec_unavailable",
        action: "Update Codex CLI or verify that `codex exec` is available, then retry.",
      };
    }
    return {
      kind: "dispatch_failed",
      action: "Open the run log or retry after checking the failure details.",
    };
  }

  function buildTeamDispatchFailurePatch(error, context = {}) {
    const detail = error instanceof Error ? error.message : String(error || "");
    const classified = classifyTeamDispatchFailure(error);
    return {
      command_kind: context.commandKind || "codex.exec.resume",
      retry_mode: context.retryMode || "",
      error: detail,
      preflight_kind: classified.kind,
      preflight_detail: detail,
      preflight_action: classified.action,
      preflight: {
        kind: classified.kind,
        detail,
        action: classified.action,
      },
    };
  }

  function compileTeamWorkerPrompt(task, options = {}) {
    const nextTask = task && typeof task === "object" ? task : {};
    const rawPrompt = String(options.rawPrompt || "").trim();
    const workspace = String(options.workspace || "").trim();
    const skillInstalled = Boolean(options.skillInstalled);
    const rolePrompt = String(options.rolePrompt || defaultAgentRolePrompt(nextTask.owner || "")).trim();
    const criteria = Array.isArray(nextTask.acceptance_criteria) ? nextTask.acceptance_criteria : [];
    return [
      "You are working inside Codex-Managed-Agent Team Core.",
      "",
      "Team Core is built into the VS Code extension. Do not require any local Codex skill to follow these rules.",
      skillInstalled
        ? "Optional enhancement available: ~/.codex/skills/team-reflective-loop. You may use it for mailbox inspection or reflective handoff guidance."
        : "Optional team-reflective-loop skill is not installed. Use this built-in team protocol instead.",
      "",
      "Workspace:",
      workspace || "-",
      "",
      "Role:",
      rolePrompt,
      "",
      "Assigned task:",
      JSON.stringify({
        task_id: nextTask.task_id || "",
        title: nextTask.title || "",
        owner: nextTask.owner || "",
        goal: nextTask.goal || "",
        acceptance_criteria: criteria,
        priority: nextTask.priority || "",
      }, null, 2),
      "",
      "Mailbox protocol:",
      "- Treat .codex-team/tasks/*.json, .codex-team/agents/*.json, .codex-team/events/events.jsonl, and .codex-team/inbox/*.jsonl as the structured coordination source.",
      "- Do not edit other agents' task files.",
      "- Keep changes scoped to this task and avoid unrelated refactors.",
      "- If blocked, stop and report the blocking reason plus the handoff needed.",
      "",
      "Inbox reporting (MANDATORY before finishing):",
      "1. When you complete this task, append ONE line to .codex-team/inbox/supervisor.jsonl:",
      "   {\"type\":\"task.completed\",\"task_id\":\"YOUR_TASK_ID\",\"agent_id\":\"YOUR_AGENT_ID\",\"payload\":{\"summary\":\"...\",\"outputs\":[],\"checks_run\":[],\"open_risks\":[],\"next_request\":\"\"}}",
      "2. If you become blocked, append ONE line to .codex-team/inbox/supervisor.jsonl:",
      "   {\"type\":\"handoff.requested\",\"task_id\":\"YOUR_TASK_ID\",\"agent_id\":\"YOUR_AGENT_ID\",\"payload\":{\"reason\":\"...\"}}",
      "3. After heartbeat-worthy progress, you may optionally append a progress line to your own inbox .codex-team/inbox/YOUR_AGENT_ID.jsonl.",
      "",
      "User task prompt:",
      rawPrompt || "(No extra prompt supplied.)",
      "",
      "Result envelope required in your final response:",
      JSON.stringify({
        summary: "",
        outputs: [],
        checks_run: [],
        open_risks: [],
        next_request: "",
      }, null, 2),
    ].join("\n");
  }

  function launchDedicatedTeamWorker(agentId, prompt, workspace, options = {}) {
    const nextAgentId = safeFileSlug(agentId || "team-worker", "team-worker");
    const nextPrompt = String(prompt || "").trim();
    const cwd = String(workspace || "").trim() || os.homedir();
    if (!nextPrompt) throw new Error("Team task prompt cannot be empty");
    const model = validateCodexModelName(options.model || configuredCodexModel());
    const codexVersion = preflightCodexCli(model);
    const logsDir = path.join(os.homedir(), ".codex-managed-agent", "logs");
    fs.mkdirSync(logsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logPath = path.join(logsDir, `${nextAgentId}-team-new-${stamp}.log`);
    const metaPath = `${logPath}.meta.json`;
    const out = fs.openSync(logPath, "a");
    const args = ["exec", "--skip-git-repo-check", "--json", "--yolo"];
    if (model) args.push("--model", model);
    args.push(nextPrompt);
    writeJson(metaPath, {
      source: "team_core",
      thread_id: "",
      agent_id: nextAgentId,
      workspace: cwd,
      started_at: toIso(),
      command_kind: "codex.exec.new",
      model,
      model_explicit: Boolean(model),
      codex_version: codexVersion,
      log_path: logPath,
    });
    let child;
    try {
      const codexPath = resolveExecutablePath("codex", { extraDirs: [path.resolve(__dirname, "..", "..", "node_modules", ".bin")] });
      child = childProcess.spawn(codexPath || "codex", args, {
        cwd,
        detached: true,
        stdio: ["ignore", out, out],
        env: { ...process.env, TERM: process.env.TERM || "xterm-256color" },
      });
    } finally {
      try {
        fs.closeSync(out);
      } catch {
        // Ignore close failure; the child has already inherited the descriptor.
      }
    }
    if (!child.pid) throw new Error("codex exec did not start a dedicated Team worker");
    child.once("error", (error) => {
      const message = error instanceof Error ? error.message : String(error);
      fs.appendFile(logPath, `\n[codex-managed-agent] spawn error: ${message}\n`, () => {});
    });
    child.unref();
    return {
      pid: child.pid,
      logPath,
      metaPath,
      model,
      codexVersion,
    };
  }

  function isTeamAccountBlockingTokenHealth(state) {
    return state === "invalid" || state === "expired" || state === "refresh_failed" || state === "rate_limited";
  }

  function makeTeamPreflightError(kind, detail, context = {}) {
    const error = new Error(String(detail || "Team worker preflight failed"));
    error.kind = kind;
    if (context && typeof context === "object") {
      const nextContext = context;
      Object.keys(nextContext).forEach((key) => {
        error[key] = nextContext[key];
      });
    }
    return error;
  }

  function assessTeamWorkerPreflight(input = {}) {
    const workspace = String(input.workspace || "").trim();
    const provider = String(input.provider || "").trim() || WORKER_PROVIDER_CODEX;
    const accountProfileId = String(input.accountProfileId || "").trim();
    const accountDetails = input.accountDetails && typeof input.accountDetails === "object" ? input.accountDetails : {};

    if (!workspace) {
      return makeTeamPreflightError("team_workspace_missing", "Team worker launch requires a workspace path.");
    }
    try {
      if (!fs.existsSync(workspace) || !fs.statSync(workspace).isDirectory()) {
        return makeTeamPreflightError("team_workspace_invalid", `Workspace path is not a directory: ${workspace}`);
      }
    } catch {
      return makeTeamPreflightError("team_workspace_invalid", `Workspace path is not available: ${workspace}`);
    }

    if (provider !== WORKER_PROVIDER_CODEX || !accountProfileId) {
      return null;
    }

    const details = accountDetails[accountProfileId];
    if (!details) {
      return makeTeamPreflightError("team_account_profile_not_found", `Selected account profile not found: ${accountProfileId}`);
    }

    const tokenHealth = String(details.tokenHealth || "unknown").trim();
    if (isTeamAccountBlockingTokenHealth(tokenHealth)) {
      return makeTeamPreflightError(
        "team_account_token_blocked",
        `Account profile ${accountProfileId} is not launch-safe (token health: ${tokenHealth || "unknown"}).`,
      );
    }

    return null;
  }

  function preflightGeminiCli() {
    const geminiPath = resolveExecutablePath("gemini");
    const probe = childProcess.spawnSync(geminiPath || "gemini", ["--version"], {
      encoding: "utf8",
      timeout: 8000,
    });
    if (probe.error) throw probe.error;
    if (probe.status !== 0) {
      throw new Error((probe.stderr || probe.stdout || "gemini CLI is not available").trim());
    }
    return String(probe.stdout || probe.stderr || "").trim();
  }

  function launchGeminiCliTeamWorker(agentId, prompt, workspace, options = {}) {
    const nextAgentId = safeFileSlug(agentId || "gemini-worker", "gemini-worker");
    const nextPrompt = String(prompt || "").trim();
    const cwd = String(workspace || "").trim() || os.homedir();
    if (!nextPrompt) throw new Error("Gemini Team worker prompt cannot be empty");
    const requestedModel = String(options.model || "").trim();
    const modelPriority = requestedModel && requestedModel !== DEFAULT_GEMINI_CLI_MODEL
      ? [requestedModel]
      : GEMINI_CLI_MODEL_PRIORITY.slice();
    const model = modelPriority[0] || DEFAULT_GEMINI_CLI_MODEL;
    const geminiVersion = preflightGeminiCli();
    const logsDir = path.join(os.homedir(), ".codex-managed-agent", "logs");
    fs.mkdirSync(logsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logPath = path.join(logsDir, `${nextAgentId}-gemini-cli-${stamp}.log`);
    const metaPath = `${logPath}.meta.json`;
    const promptPath = `${logPath}.prompt.txt`;
    const rawPath = `${logPath}.raw.txt`;
    fs.writeFileSync(promptPath, nextPrompt, "utf8");
    writeJson(metaPath, {
      source: "team_core",
      provider: WORKER_PROVIDER_GEMINI,
      thread_id: "",
      agent_id: nextAgentId,
      workspace: cwd,
      started_at: toIso(),
      command_kind: "gemini.cli.auxiliary",
      model,
      model_priority: modelPriority,
      model_explicit: Boolean(model),
      gemini_version: geminiVersion,
      log_path: logPath,
      prompt_path: promptPath,
      raw_path: rawPath,
    });
    const runnerPath = path.join(__dirname, "gemini-cli-runner.js");
    const childEnv = {
      ...process.env,
      CMA_LOG_PATH: logPath,
      CMA_PROMPT_PATH: promptPath,
      CMA_RAW_PATH: rawPath,
      CMA_MODEL: model || "",
      CMA_MODEL_PRIORITY: modelPriority.join("\n"),
    };
    if (process.versions && process.versions.electron) {
      childEnv.ELECTRON_RUN_AS_NODE = "1";
    }
    const child = childProcess.spawn(process.execPath, [runnerPath], {
      cwd,
      detached: true,
      stdio: "ignore",
      env: childEnv,
    });
    if (!child.pid) throw new Error("gemini CLI did not start a Team worker");
    child.unref();
    return {
      pid: child.pid,
      logPath,
      metaPath,
      promptPath,
      rawPath,
      provider: WORKER_PROVIDER_GEMINI,
      model,
      geminiVersion,
    };
  }

  return {
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
  };
}

module.exports = {
  createTeamWorkerLauncher,
};
