function createTeamActions(deps = {}) {
  const {
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
  } = deps;

  async function createSnakeDemoTeamTask(panel, threadId = "", prompt = SNAKE_DEMO_PROMPT) {
    const workspacePath = promptForWorkspace(panel);
    if (!workspacePath) {
      vscode.window.showWarningMessage("Codex-Managed-Agent: no workspace available for team demo");
      return null;
    }
    const paths = pathsForWorkspace(workspacePath);
    if (!fs.existsSync(paths.root)) {
      await initializeTeamSpace(panel);
    }
    const nowMs = Date.now();
    const now = toIso(nowMs);
    const pendingWorkerId = `pending-team-worker-${nowMs}-${crypto.randomBytes(3).toString("hex")}`;
    const nextThreadId = pendingWorkerId;
    const dedicatedWorker = true;
    const taskId = reserveTaskId(paths, makeTaskId(nextThreadId, "Snake game demo", now));
    const rawPrompt = String(prompt || SNAKE_DEMO_PROMPT).trim() || SNAKE_DEMO_PROMPT;
    const task = {
      task_id: taskId,
      title: "Snake game demo",
      owner: nextThreadId,
      status: TASK_STATES.RUNNING,
      priority: "demo",
      dependencies: [],
      inputs: [
        {
          type: "prompt",
          value: rawPrompt,
        },
      ],
      goal: "Build a small playable Snake game demo and verify it enough for a user to try.",
      acceptance_criteria: [
        "A user can open or run the demo from the workspace.",
        "The Snake game supports keyboard movement, score, restart, and game-over state.",
        "The worker reports changed files and checks_run in the result envelope.",
      ],
      artifacts: [],
      local_patches: [
        {
          type: "scope_patch",
          message: "Keep the demo lightweight and avoid unrelated refactors.",
        },
        {
          type: "check_patch",
          message: "Run one appropriate verification command or record why no automated check exists.",
        },
      ],
      lease_until: toIso(nowMs + (30 * 60 * 1000)),
      created_at: now,
      updated_at: now,
    };
    const nextPrompt = compileTeamWorkerPrompt(task, {
      rawPrompt,
      workspace: workspacePath,
      skillInstalled: teamReflectiveSkillInstalled(),
    });
    task.inputs.push({
      type: "compiled_prompt",
      value: nextPrompt,
    });
    writeTask(paths, task);
    appendEvent(paths, teamEvent("task.created", {
      task_id: taskId,
      agent_id: "supervisor",
      workspace: workspacePath,
      payload: { title: task.title, owner: nextThreadId, demo: "snake", dedicated_worker: dedicatedWorker },
    }));
    writeTeamTrace(paths, {
      kind: "task.created",
      ts: now,
      task_id: taskId,
      thread_id: nextThreadId,
      agent_id: "supervisor",
      status: TASK_STATES.RUNNING,
      summary: "Snake demo Team task created and queued for worker dispatch.",
      evidence: {},
      payload: {
        title: task.title,
        owner: nextThreadId,
        demo: "snake",
        dedicated_worker: dedicatedWorker,
      },
    });
    appendEvent(paths, teamEvent("task.claimed", {
      task_id: taskId,
      agent_id: nextThreadId,
      workspace: workspacePath,
      payload: { lease_until: task.lease_until, demo: "snake" },
    }));
    appendInbox(paths, nextThreadId, {
      type: "task.assigned",
      task_id: taskId,
      agent_id: "supervisor",
      payload: { title: task.title, goal: task.goal, prompt: nextPrompt },
    });
    ensureAgentRecord(paths, nextThreadId, {
      state: "running",
      current_task_id: taskId,
      heartbeat_at: now,
      updated_at: now,
      last_error: "",
    });
    return {
      task,
      prompt: nextPrompt,
      thread: {
        id: nextThreadId,
        cwd: workspacePath,
        title: "Dedicated Team Worker",
        pending_team_worker: dedicatedWorker,
      },
      workspace: workspacePath,
      dispatchKind: dedicatedWorker ? "codex.exec.new" : "codex.exec.resume",
    };
  }

  async function createTeamWorkspace(panel, options = {}) {
    const workspacePath = promptForWorkspace(panel);
    if (!workspacePath) {
      vscode.window.showWarningMessage("Codex-Managed-Agent: no workspace available for team workspace");
      return null;
    }
    const paths = pathsForWorkspace(workspacePath);
    if (!fs.existsSync(paths.root)) {
      await initializeTeamSpace(panel);
    }
    const quickCreate = options.quick !== false && !options.title && !options.prompt;
    const defaultTitle = `Team Space ${new Date().toLocaleString("sv-SE").replace("T", " ").slice(0, 16)}`;
    const titleInput = quickCreate ? defaultTitle : (options.title || await vscode.window.showInputBox({
      title: "New Team Workspace",
      prompt: "Name this Team workspace",
      value: defaultTitle,
      ignoreFocusOut: true,
      validateInput: (value) => String(value || "").trim() ? undefined : "Workspace title cannot be empty",
    }));
    if (titleInput === undefined) return null;
    const defaultPrompt = [
      "Team task:",
      "- Describe the work for this Team Space.",
      "- Keep all runtime notes, trace evidence, logs, and result in this workspace.",
      "- When finished, report summary, outputs, checks_run, open_risks, and next_request.",
    ].join("\n");
    const promptInput = quickCreate ? defaultPrompt : (options.prompt || await vscode.window.showInputBox({
      title: "Team Workspace Prompt",
      prompt: "Describe the task this workspace should run",
      value: defaultPrompt,
      ignoreFocusOut: true,
      validateInput: (value) => String(value || "").trim() ? undefined : "Workspace prompt cannot be empty",
    }));
    if (promptInput === undefined) return null;
    const requestedThreadId = String(options.threadId || panel.selectedThreadId || "").trim();
    const selectedThread = requestedThreadId && !requestedThreadId.startsWith("pending-new-agent-")
      ? resolveLiveThread(panel, requestedThreadId)
      : undefined;
    const now = toIso();
    const owner = selectedThread && selectedThread.id ? selectedThread.id : "supervisor";
    const taskId = reserveTaskId(paths, makeTaskId(owner, titleInput, now));
    const rawPrompt = String(promptInput || "").trim();
    const task = {
      task_id: taskId,
      workspace_id: teamWorkspaceIdForTaskId(taskId),
      title: String(titleInput || "").trim(),
      owner,
      status: selectedThread ? TASK_STATES.ASSIGNED : TASK_STATES.QUEUED,
      priority: "normal",
      dependencies: [],
      inputs: [
        {
          type: "prompt",
          value: rawPrompt,
        },
      ],
      goal: rawPrompt.split(/\r?\n/).find((line) => line.trim()) || String(titleInput || "").trim(),
      acceptance_criteria: [],
      artifacts: [],
      lease_until: "",
      created_at: now,
      updated_at: now,
    };
    const compiledPrompt = compileTeamWorkerPrompt(task, {
      rawPrompt,
      workspace: workspacePath,
      skillInstalled: teamReflectiveSkillInstalled(),
    });
    task.inputs.push({ type: "compiled_prompt", value: compiledPrompt });
    writeTask(paths, task);
    appendEvent(paths, teamEvent("workspace.created", {
      task_id: task.task_id,
      agent_id: "supervisor",
      workspace: workspacePath,
      payload: { workspace_id: task.workspace_id, title: task.title, owner },
    }));
    appendEvent(paths, teamEvent("task.created", {
      task_id: task.task_id,
      agent_id: "supervisor",
      workspace: workspacePath,
      payload: { workspace_id: task.workspace_id, title: task.title, owner },
    }));
    writeTeamTrace(paths, {
      kind: "workspace.created",
      ts: now,
      task_id: task.task_id,
      thread_id: owner,
      agent_id: "supervisor",
      status: task.status,
      summary: `Team workspace created for ${task.title}.`,
      evidence: {},
      payload: { workspace_id: task.workspace_id, title: task.title, owner },
    });
    if (selectedThread) {
      appendInbox(paths, selectedThread.id, {
        type: "task.assigned",
        task_id: task.task_id,
        agent_id: "supervisor",
        payload: { title: task.title, goal: task.goal, prompt: compiledPrompt },
      });
      ensureAgentRecord(paths, selectedThread.id, {
        state: "assigned",
        current_task_id: task.task_id,
        updated_at: now,
      });
    }
    panel.lastActionNotice = `Created Team workspace · ${task.title}`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
    await panel.refresh({ silent: true });
    return { workspace_id: task.workspace_id, task, prompt: compiledPrompt, workspace: workspacePath };
  }

  function generateTeamOrchestrationDraft(panel, payload = {}) {
    const goal = String((payload && payload.goal) || "").trim();
    const draft = applyBuiltInRoleOrganizationTemplateToDraft({
      ...payload,
      goal,
    });
    panel.lastTeamOrchestrationDraft = draft;
    return draft;
  }

  async function saveTeamOrchestrationDraft(panel, payload = {}) {
    const workspacePath = promptForWorkspace(panel);
    if (!workspacePath) {
      vscode.window.showWarningMessage("Codex-Managed-Agent: no workspace available for orchestration draft");
      return null;
    }
    const paths = pathsForWorkspace(workspacePath);
    if (!fs.existsSync(paths.root)) {
      await initializeTeamSpace(panel);
    }
    const draft = applyBuiltInRoleOrganizationTemplateToDraft(payload && payload.draft ? payload.draft : payload);
    const goal = String(draft.goal || "").trim();
    if (!goal) {
      vscode.window.showWarningMessage("Codex-Managed-Agent: orchestration goal is required");
      return null;
    }
    const now = toIso();
    const owner = "supervisor";
    const title = String(draft.title || goal.split(/\r?\n/)[0] || "Planned Team Run").trim();
    const taskId = reserveTaskId(paths, makeTaskId(owner, title, now));
    const workspaceId = teamWorkspaceIdForTaskId(taskId);
    const dagRunInput = {
      ...draft.dagRun,
      run_id: draft.dagRun && draft.dagRun.run_id ? draft.dagRun.run_id : makeId("dag"),
      team_space_id: workspaceId,
      supervisor_thread_id: owner,
      status: "draft",
      blackboard: Array.isArray(draft.blackboard) ? draft.blackboard : [],
    };
    const savedDag = writeDagRun(workspacePath, dagRunInput);
    const scheduleExplanation = draft.scheduleExplanation || explainDagSchedule(savedDag.dagRun, {
      maxParallel: Array.isArray(draft.workers) ? draft.workers.length : 1,
    });
    const selectedNodeIds = Array.isArray(scheduleExplanation.selected_node_ids)
      ? scheduleExplanation.selected_node_ids
      : [];
    const workerPromptPreviews = selectedNodeIds
      .map((nodeId) => {
        const node = Array.isArray(savedDag.dagRun.nodes)
          ? savedDag.dagRun.nodes.find((item) => item && item.node_id === nodeId)
          : null;
        if (!node) return null;
        const workerProvider = normalizeWorkerProvider(node.provider, node.model || "gpt-5.3-codex");
        const workerModel = workerProvider === WORKER_PROVIDER_GEMINI
          ? String(node.model || DEFAULT_GEMINI_CLI_MODEL).trim()
          : "gpt-5.3-codex";
        const compiledPrompt = compileWorkerPrompt({
          workspace: workspacePath,
          task: {
            task_id: taskId,
            title,
            goal,
            acceptance_criteria: [
              "Review the orchestration draft before launching workers.",
              "Keep worker edits inside their ownership paths.",
            ],
            workspace: workspacePath,
          },
          dagRun: savedDag.dagRun,
          node_id: node.node_id,
          provider: workerProvider,
          worker_model: workerModel,
        });
        persistWorkerPromptSnapshot(workspacePath, {
          dagRun: savedDag.dagRun,
          node_id: node.node_id,
          provider: workerProvider,
          worker_model: workerModel,
          prompt: compiledPrompt,
        });
        return {
          node_id: node.node_id,
          provider: workerProvider,
          model: workerModel,
          prompt: compiledPrompt,
        };
      })
      .filter(Boolean);
    const supervisorPrompt = compileSupervisorPrompt({
      task: {
        task_id: taskId,
        title,
        goal,
        acceptance_criteria: [
          "Review the orchestration draft before launching workers.",
          "Keep worker edits inside their ownership paths.",
        ],
        workspace: workspacePath,
      },
      dagRun: savedDag.dagRun,
      blackboard: draft.blackboard,
      maxParallel: Array.isArray(draft.workers) ? draft.workers.length : 1,
      modelPolicy: {
        supervisor: draft.supervisor && draft.supervisor.model ? draft.supervisor.model : "gpt-5.4",
        worker: draft.worker_model || "gpt-5.3-codex",
      },
    });
    const task = {
      task_id: taskId,
      workspace_id: workspaceId,
      title,
      owner,
      status: TASK_STATES.QUEUED,
      priority: "normal",
      dependencies: [],
      inputs: [
        { type: "prompt", value: goal },
        { type: "orchestration_draft", value: JSON.stringify(draft, null, 2) },
        { type: "supervisor_prompt", value: supervisorPrompt },
      ],
      goal,
      acceptance_criteria: [
        "Review the orchestration draft before launching workers.",
        "Keep worker edits inside their ownership paths.",
      ],
      artifacts: [],
      orchestration: {
        goal,
        supervisor: draft.supervisor,
        worker_model: draft.worker_model,
        workers: draft.workers,
        organization_template_id: String(draft.organization_template_id || "").trim(),
        organization_template_name: String(draft.organization_template_name || "").trim(),
        organization_template_source: String(draft.organization_template_source || "").trim(),
        organization_template_version: Number.parseInt(draft.organization_template_version, 10) || 0,
        dag_run_id: savedDag.dagRun.run_id,
        schedule_explanation: scheduleExplanation,
        worker_prompt_previews: workerPromptPreviews,
      },
      runtime: {
        state: "draft",
        dag_run_id: savedDag.dagRun.run_id,
        model: draft.supervisor && draft.supervisor.model ? draft.supervisor.model : "gpt-5.4",
      },
      lease_until: "",
      created_at: now,
      updated_at: now,
    };
    writeTask(paths, task);
    appendEvent(paths, teamEvent("orchestration.draft.saved", {
      task_id: task.task_id,
      agent_id: "supervisor",
      workspace: workspacePath,
      payload: { workspace_id: workspaceId, dag_run_id: savedDag.dagRun.run_id, title },
    }));
    writeTeamTrace(paths, {
      kind: "orchestration.draft.saved",
      ts: now,
      task_id: task.task_id,
      thread_id: owner,
      agent_id: "supervisor",
      status: task.status,
      summary: `Saved orchestration draft for ${title}.`,
      evidence: { dag_run_id: savedDag.dagRun.run_id },
      payload: { workspace_id: workspaceId, workers: draft.workers },
    });
    panel.pendingTeamWorkspacePageId = workspaceId;
    panel.lastActionNotice = `Saved orchestration draft · ${title}`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
    await panel.refresh({ silent: true });
    return { workspace_id: workspaceId, task, draft, dagRun: savedDag.dagRun, workspace: workspacePath };
  }

  function updateTeamTaskDispatch(panel, taskId, owner, patch = {}) {
    const nextTaskId = String(taskId || "").trim();
    const nextOwner = String(owner || "").trim();
    if (!nextTaskId) return null;
    const workspacePath = promptForWorkspace(panel);
    const paths = pathsForWorkspace(workspacePath);
    const task = findTaskById(paths, nextTaskId);
    if (!task) return null;
    const now = toIso();
    const previousRuntime = task.runtime && typeof task.runtime === "object" ? task.runtime : {};
    const previousRunId = String(previousRuntime.run_id || "").trim();
    const runId = String(patch.run_id || previousRunId || makeId("run")).trim();
    const runtime = {
      ...previousRuntime,
      ...patch,
      run_id: runId,
      started_at: patch.state === "dispatched" ? now : (previousRuntime.started_at || now),
      updated_at: now,
    };
    const runtimeTrace = readRuntimeTraceState(runtime);
    runtime.trace = {
      ...runtimeTrace,
      last_process_state: String(runtime.state || runtimeTrace.last_process_state || ""),
      last_log_line_count: patch.state === "dispatched" ? 0 : Math.max(Number(runtimeTrace.last_log_line_count || 0), 0),
      last_command_completed_count: patch.state === "dispatched" ? 0 : Math.max(Number(runtimeTrace.last_command_completed_count || 0), 0),
      last_file_change_count: patch.state === "dispatched" ? 0 : Math.max(Number(runtimeTrace.last_file_change_count || 0), 0),
    };
    task.runtime = runtime;
    task.updated_at = now;
    if (patch.state === "blocked") {
      task.status = TASK_STATES.BLOCKED;
      task.lease_until = "";
    }
    if (patch.state === "failed") {
      task.status = TASK_STATES.FAILED;
      task.lease_until = "";
    }
    writeTask(paths, task);
    const dispatchEventType = ["blocked", "failed"].includes(String(patch.state || ""))
      ? "task.dispatch_failed"
      : "task.dispatch_started";
    appendEvent(paths, teamEvent(dispatchEventType, {
      task_id: nextTaskId,
      agent_id: nextOwner || task.owner || "",
      workspace: workspacePath,
      payload: runtime,
    }));
    if (nextOwner || task.owner) {
      ensureAgentRecord(paths, nextOwner || task.owner, {
        state: ["blocked", "failed"].includes(String(patch.state || "")) ? "blocked" : "running",
        current_task_id: nextTaskId,
        heartbeat_at: ["blocked", "failed"].includes(String(patch.state || "")) ? "" : now,
        updated_at: now,
        last_error: patch.error || "",
      });
    }
    const traceThreadId = resolveTraceThreadId(runtime.thread_id || nextOwner || task.owner || "");
    if (String(patch.state || "") === "dispatched") {
      writeTeamTrace(paths, {
        kind: "run.dispatch_started",
        ts: now,
        task_id: nextTaskId,
        thread_id: traceThreadId,
        run_id: runId,
        agent_id: nextOwner || task.owner || "",
        status: "dispatched",
        summary: runtime.retry_mode
          ? `Retry dispatch started in ${runtime.retry_mode === "new" ? "a new worker" : "the same thread"}.`
          : "Team worker dispatch started.",
        evidence: {
          pid: Number(runtime.pid || 0) > 0 ? Number(runtime.pid) : undefined,
          log_path: runtime.log_path || undefined,
        },
        payload: {
          command_kind: runtime.command_kind || "",
          retry_mode: runtime.retry_mode || "",
          previous_run_id: previousRunId || undefined,
          owner: nextOwner || task.owner || "",
        },
      });
      if (Number(runtime.pid || 0) > 0) {
        writeTeamTrace(paths, {
          kind: "run.pid_recorded",
          ts: now,
          task_id: nextTaskId,
          thread_id: traceThreadId,
          run_id: runId,
          agent_id: nextOwner || task.owner || "",
          status: "dispatched",
          summary: `Worker PID recorded: ${String(runtime.pid)}.`,
          evidence: {
            pid: Number(runtime.pid),
            log_path: runtime.log_path || undefined,
          },
          payload: {
            command_kind: runtime.command_kind || "",
            retry_mode: runtime.retry_mode || "",
          },
        });
      }
      if (runtime.retry_mode) {
        writeTeamTrace(paths, {
          kind: "task.retry_started",
          ts: now,
          task_id: nextTaskId,
          thread_id: traceThreadId,
          run_id: runId,
          agent_id: nextOwner || task.owner || "",
          status: taskStatus(task, ""),
          summary: runtime.retry_mode === "new"
            ? "Retry started in a fresh Team worker."
            : "Retry started in the existing Team thread.",
          evidence: {
            pid: Number(runtime.pid || 0) > 0 ? Number(runtime.pid) : undefined,
          },
          payload: {
            retry_mode: runtime.retry_mode,
            previous_run_id: previousRunId || undefined,
          },
        });
      }
    }
    if (String(patch.state || "") === "failed") {
      writeTeamTrace(paths, {
        kind: "task.failed",
        ts: now,
        task_id: nextTaskId,
        thread_id: traceThreadId,
        run_id: runId,
        agent_id: nextOwner || task.owner || "",
        status: TASK_STATES.FAILED,
        summary: patch.error
          ? `Task dispatch failed: ${String(patch.error).slice(0, 160)}`
          : "Task dispatch failed before worker evidence was observed.",
        evidence: {
          pid: Number(runtime.pid || 0) > 0 ? Number(runtime.pid) : undefined,
          log_path: runtime.log_path || undefined,
        },
        payload: {
          command_kind: runtime.command_kind || "",
          retry_mode: runtime.retry_mode || "",
          error: patch.error || "",
          previous_run_id: previousRunId || undefined,
        },
      });
    }
    return task;
  }

  function prepareTeamTaskRetry(panel, taskId, mode = "same") {
    const nextTaskId = String(taskId || "").trim();
    const retryMode = String(mode || "same");
    const workspacePath = promptForWorkspace(panel);
    const paths = pathsForWorkspace(workspacePath);
    const task = findTaskById(paths, nextTaskId);
    if (!task) {
      vscode.window.showWarningMessage("Codex-Managed-Agent: team task not found for retry");
      return null;
    }
    const dashboardThreads = panel.lastPayload
      && panel.lastPayload.dashboard
      && Array.isArray(panel.lastPayload.dashboard.threads)
      ? panel.lastPayload.dashboard.threads
      : [];
    const owner = String(task.owner || "").trim();
    const runtime = task.runtime && typeof task.runtime === "object" ? task.runtime : {};
    const runtimeSessionBinding = runtime.session_binding && typeof runtime.session_binding === "object"
      ? runtime.session_binding
      : {};
    const launchedWorkers = Array.isArray(runtime.launched_workers) ? runtime.launched_workers : [];
    const boundWorker = launchedWorkers.find((worker) => (
      worker
      && worker.session_binding
      && typeof worker.session_binding === "object"
      && String(worker.session_binding.worker_thread_id || worker.worker_thread_id || "").trim()
    )) || null;
    const boundSessionId = String(
      runtimeSessionBinding.worker_thread_id
      || (boundWorker && boundWorker.session_binding && boundWorker.session_binding.worker_thread_id)
      || (boundWorker && boundWorker.worker_thread_id)
      || "",
    ).trim();
    const targetThread = retryMode === "new"
      ? {
        id: `pending-team-worker-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        cwd: workspacePath,
        title: "Dedicated Team Retry Worker",
        pending_team_worker: true,
      }
      : dashboardThreads.find((thread) => {
        if (!thread || String(thread.id).startsWith("pending-new-agent-")) return false;
        const threadId = String(thread.id || "").trim();
        if (boundSessionId) return threadId === boundSessionId;
        return threadId === owner;
      });
    if (!targetThread) {
      const detail = retryMode === "new"
        ? "Could not create a dedicated retry worker."
        : boundSessionId
          ? `Bound worker session is not available for retry: ${boundSessionId}.`
        : "Original task owner thread is not available for retry.";
      updateTeamTaskDispatch(panel, task.task_id, owner, {
        state: "failed",
        command_kind: retryMode === "new" ? "codex.exec.new" : "codex.exec.resume",
        retry_mode: retryMode,
        error: detail,
      });
      vscode.window.showWarningMessage(retryMode === "new"
        ? "Codex-Managed-Agent: could not create a dedicated retry worker"
        : "Codex-Managed-Agent: original task owner thread is not available for retry");
      return null;
    }
    const now = toIso();
    task.owner = targetThread.id;
    task.status = TASK_STATES.RUNNING;
    task.lease_until = toIso(Date.now() + (30 * 60 * 1000));
    task.updated_at = now;
    task.runtime = {
      state: "retrying",
      retry_mode: retryMode,
      previous_runtime: runtime,
      thread_id: retryMode === "same" ? String(targetThread.id || "").trim() : "",
      session_binding: retryMode === "same"
        ? {
          ...runtimeSessionBinding,
          worker_thread_id: String(targetThread.id || "").trim(),
        }
        : runtimeSessionBinding,
      updated_at: now,
    };
    const rawPrompt = String(((task.inputs || []).find((item) => item && item.type === "prompt") || {}).value || task.goal || "").trim();
    const compiledPrompt = compileTeamWorkerPrompt(task, {
      rawPrompt,
      workspace: workspacePath,
      skillInstalled: teamReflectiveSkillInstalled(),
    });
    task.inputs = (Array.isArray(task.inputs) ? task.inputs : []).filter((item) => item && item.type !== "compiled_prompt");
    task.inputs.push({ type: "compiled_prompt", value: compiledPrompt });
    writeTask(paths, task);
    appendEvent(paths, teamEvent("task.retry_requested", {
      task_id: task.task_id,
      agent_id: targetThread.id,
      workspace: workspacePath,
      payload: { mode: retryMode, previous_owner: owner },
    }));
    writeTeamTrace(paths, {
      kind: "task.retry_requested",
      ts: now,
      task_id: task.task_id,
      thread_id: targetThread.id,
      run_id: String((task.runtime && task.runtime.previous_runtime && task.runtime.previous_runtime.run_id) || ""),
      agent_id: targetThread.id,
      status: TASK_STATES.RUNNING,
      summary: retryMode === "new"
        ? "Retry requested in a new Team worker."
        : "Retry requested in the same Team thread.",
      evidence: {},
      payload: {
        retry_mode: retryMode,
        previous_owner: owner,
        previous_run_id: String((task.runtime && task.runtime.previous_runtime && task.runtime.previous_runtime.run_id) || ""),
        bound_session_id: boundSessionId || undefined,
      },
    });
    appendInbox(paths, targetThread.id, {
      type: "task.retry_assigned",
      task_id: task.task_id,
      agent_id: "supervisor",
      payload: { title: task.title, goal: task.goal, prompt: compiledPrompt, mode: retryMode },
    });
    ensureAgentRecord(paths, targetThread.id, {
      state: "running",
      current_task_id: task.task_id,
      heartbeat_at: now,
      updated_at: now,
      last_error: "",
    });
    return {
      task,
      prompt: compiledPrompt,
      thread: targetThread,
      workspace: workspacePath,
      dispatchKind: retryMode === "new" ? "codex.exec.new" : "codex.exec.resume",
    };
  }

  async function deleteTeamTask(panel, taskId) {
    const nextTaskId = String(taskId || "").trim();
    if (!nextTaskId) {
      vscode.window.showWarningMessage("Codex-Managed-Agent: no team task selected for deletion");
      return false;
    }
    const workspacePath = promptForWorkspace(panel);
    const paths = pathsForWorkspace(workspacePath);
    const task = findTaskById(paths, nextTaskId);
    if (!task) {
      vscode.window.showWarningMessage("Codex-Managed-Agent: team task not found for deletion");
      return false;
    }
    const choice = await vscode.window.showWarningMessage(
      `Delete Team task "${task.title || task.task_id}"? This removes the task record but keeps trace/run files for audit.`,
      { modal: true },
      "Delete Task",
    );
    if (choice !== "Delete Task") return false;
    const now = toIso();
    const owner = String(task.owner || "").trim();
    const taskPath = path.join(paths.tasksDir, `${safeName(nextTaskId, "")}.json`);
    writeTeamTrace(paths, {
      kind: "task.deleted",
      ts: now,
      task_id: task.task_id,
      thread_id: resolveTraceThreadId((task.runtime && task.runtime.thread_id) || owner || ""),
      run_id: String((task.runtime && task.runtime.run_id) || ""),
      agent_id: owner || "",
      status: "deleted",
      summary: "Team task record deleted by user action.",
      evidence: {},
      payload: { title: task.title || "", owner },
    });
    appendEvent(paths, teamEvent("task.deleted", {
      task_id: task.task_id,
      agent_id: owner || "supervisor",
      workspace: workspacePath,
      payload: { title: task.title || "", owner },
    }));
    if (fs.existsSync(taskPath)) {
      fs.unlinkSync(taskPath);
    }
    const workspacePaths = teamWorkspacePaths(paths, task.workspace_id || teamWorkspaceIdForTaskId(task.task_id));
    try {
      fs.mkdirSync(paths.archivedWorkspacesDir, { recursive: true });
      if (workspacePaths.dir && fs.existsSync(workspacePaths.dir)) {
        fs.renameSync(workspacePaths.dir, path.join(paths.archivedWorkspacesDir, `${workspacePaths.id}-${Date.now()}`));
      }
    } catch {
      if (workspacePaths.dir && fs.existsSync(workspacePaths.dir)) {
        fs.rmSync(workspacePaths.dir, { recursive: true, force: true });
      }
    }
    readAgentRecords(paths).forEach((agent) => {
      if (String(agent.current_task_id || "") === nextTaskId) {
        ensureAgentRecord(paths, agent.agent_id, {
          state: "idle",
          current_task_id: "",
          updated_at: now,
          last_error: "",
        });
      }
    });
    panel.lastActionNotice = `Deleted team task · ${nextTaskId}`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
    await panel.refresh({ silent: true });
    return true;
  }

  async function deleteTeamWorkspace(panel, workspaceId) {
    const nextWorkspaceId = safeName(workspaceId || "", "");
    if (!nextWorkspaceId) {
      vscode.window.showWarningMessage("Codex-Managed-Agent: no Team workspace selected for deletion");
      return false;
    }
    const workspacePath = promptForWorkspace(panel);
    const paths = pathsForWorkspace(workspacePath);
    const workspacePaths = teamWorkspacePaths(paths, nextWorkspaceId);
    const workspaceRecord = readJson(workspacePaths.workspaceJson, {});
    const task = readJson(workspacePaths.taskJson, null) || findTaskById(paths, workspaceRecord.task_id || "");
    if (!task || !task.task_id) {
      vscode.window.showWarningMessage("Codex-Managed-Agent: Team workspace not found");
      return false;
    }
    const choice = await vscode.window.showWarningMessage(
      `Archive Team workspace "${workspaceRecord.title || task.title || task.task_id}"? This removes it from the active Team view and keeps workspace files, trace files, and run files under workspaces-archive for audit.`,
      { modal: true },
      "Archive Workspace",
    );
    if (choice !== "Archive Workspace") return false;
    const now = toIso();
    const owner = String(task.owner || "").trim();
    writeTeamTrace(paths, {
      kind: "workspace.archived",
      ts: now,
      task_id: task.task_id,
      thread_id: resolveTraceThreadId((task.runtime && task.runtime.thread_id) || owner || ""),
      run_id: String((task.runtime && task.runtime.run_id) || ""),
      agent_id: owner || "",
      status: "archived",
      summary: "Team workspace archived by user action.",
      evidence: {},
      payload: { workspace_id: nextWorkspaceId, title: workspaceRecord.title || task.title || "", owner },
    });
    appendEvent(paths, teamEvent("workspace.archived", {
      task_id: task.task_id,
      agent_id: owner || "supervisor",
      workspace: workspacePath,
      payload: { workspace_id: nextWorkspaceId, title: workspaceRecord.title || task.title || "", owner },
    }));
    const taskPath = path.join(paths.tasksDir, `${safeName(task.task_id, "")}.json`);
    if (fs.existsSync(taskPath)) fs.unlinkSync(taskPath);
    readAgentRecords(paths).forEach((agent) => {
      if (String(agent.current_task_id || "") === String(task.task_id || "")) {
        ensureAgentRecord(paths, agent.agent_id, {
          state: "idle",
          current_task_id: "",
          updated_at: now,
          last_error: "",
        });
      }
    });
    try {
      fs.mkdirSync(paths.archivedWorkspacesDir, { recursive: true });
      const archivePath = path.join(paths.archivedWorkspacesDir, `${nextWorkspaceId}-${Date.now()}`);
      if (workspacePaths.dir && fs.existsSync(workspacePaths.dir)) {
        fs.renameSync(workspacePaths.dir, archivePath);
      }
    } catch {
      if (workspacePaths.dir && fs.existsSync(workspacePaths.dir)) {
        fs.rmSync(workspacePaths.dir, { recursive: true, force: true });
      }
    }
    panel.lastActionNotice = `Archived Team workspace · ${nextWorkspaceId}`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
    await panel.refresh({ silent: true });
    return true;
  }

  return {
    createSnakeDemoTeamTask,
    createTeamWorkspace,
    generateTeamOrchestrationDraft,
    saveTeamOrchestrationDraft,
    updateTeamTaskDispatch,
    prepareTeamTaskRetry,
    deleteTeamTask,
    deleteTeamWorkspace,
  };
}

module.exports = {
  createTeamActions,
};
