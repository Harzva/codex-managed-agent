function createTeamOrchestrationLauncher(deps = {}) {
  const {
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
  } = deps;

  function taskIdForWorkspace(paths, workspaceId) {
    const workspace = readJson(teamWorkspacePaths(paths, workspaceId).workspaceJson, {});
    if (workspace && workspace.task_id) return String(workspace.task_id);
    const task = readJson(teamWorkspaceTaskPath(paths, workspaceId), {});
    return String((task && task.task_id) || "");
  }

  function prepareTeamWorkspaceRun(panel, workspaceId) {
    const workspacePath = promptForWorkspace(panel);
    const paths = pathsForWorkspace(workspacePath);
    const taskId = taskIdForWorkspace(paths, workspaceId);
    const task = findTaskById(paths, taskId);
    if (!task) {
      vscode.window.showWarningMessage("Codex-Managed-Agent: Team workspace task not found");
      return null;
    }
    const owner = String(task.owner || "");
    const dashboardThreads = panel.lastPayload
      && panel.lastPayload.dashboard
      && Array.isArray(panel.lastPayload.dashboard.threads)
      ? panel.lastPayload.dashboard.threads
      : [];
    const liveOwner = dashboardThreads.find((thread) => thread && thread.id === owner && !String(thread.id).startsWith("pending-new-agent-"));
    if (liveOwner && !owner.startsWith("pending-team-worker-") && owner !== "supervisor") {
      return prepareTeamTaskRetry(panel, task.task_id, "same");
    }
    return prepareTeamTaskRetry(panel, task.task_id, "new");
  }

  function launchTeamWorkspaceOrchestration(panel, workspaceId, options = {}) {
    const nextWorkspaceId = safeName(workspaceId || "", "");
    if (!nextWorkspaceId) return null;
    const workspacePath = promptForWorkspace(panel);
    const accountsState = accountManager && typeof accountManager.readAccountsForPayload === "function"
      ? accountManager.readAccountsForPayload()
      : {};
    const accountDetails = accountsState && typeof accountsState === "object"
      ? accountsState.accountDetails || accountsState.accountsByName || {}
      : {};
    let preflightCodexVersion;
    const paths = pathsForWorkspace(workspacePath);
    const taskId = taskIdForWorkspace(paths, nextWorkspaceId);
    const task = findTaskById(paths, taskId);
    if (!task || !task.task_id) return null;
    const dagRunId = String(
      (task.orchestration && task.orchestration.dag_run_id)
      || (task.runtime && task.runtime.dag_run_id)
      || "",
    ).trim();
    if (!dagRunId) return null;
    const dagRun = readDagRun(workspacePath, dagRunId);
    if (!dagRun || !dagRun.run_id) {
      throw new Error(`DAG run not found for Team workspace: ${nextWorkspaceId}`);
    }
    const baseLaunchWorker = typeof options.launchWorker === "function"
      ? options.launchWorker
      : (payload) => {
        const threadId = `pending-team-worker-${safeName(payload.node && payload.node.node_id, "node")}-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
        const provider = normalizeWorkerProvider(payload.provider || (payload.node && payload.node.provider), payload.model);
        const preflight = assessTeamWorkerPreflight({
          workspace: payload.workspace || workspacePath,
          provider,
          accountProfileId: payload.account_profile_id,
          accountDetails,
        });
        if (preflight) {
          throw preflight;
        }
        if (provider === WORKER_PROVIDER_CODEX && preflightCodexVersion === undefined) {
          preflightCodexVersion = preflightCodexCli(payload.model || "");
        }
        const launched = provider === WORKER_PROVIDER_GEMINI
          ? launchGeminiCliTeamWorker(threadId, payload.prompt, payload.workspace || workspacePath, {
            reason: options.reason || "team-workspace-dag-run",
            model: payload.model || DEFAULT_GEMINI_CLI_MODEL,
          })
          : launchDedicatedTeamWorker(threadId, payload.prompt, payload.workspace || workspacePath, {
            reason: options.reason || "team-workspace-dag-run",
            model: payload.model || "gpt-5.3-codex",
          });
        return {
          worker_thread_id: threadId,
          pid: launched.pid || "",
          log_path: launched.logPath || "",
          provider,
          account_profile_id: String(payload.node && payload.node.account_profile_id || "").trim(),
          model: launched.model || payload.model || (provider === WORKER_PROVIDER_GEMINI ? DEFAULT_GEMINI_CLI_MODEL : "gpt-5.3-codex"),
          started_at: toIso(),
        };
      };
    const launchWorker = (payload) => {
      const provider = normalizeWorkerProvider(
        payload.provider || (payload.node && payload.node.provider),
        payload.model,
      );
      const preflight = assessTeamWorkerPreflight({
        workspace: payload.workspace || workspacePath,
        provider,
        accountProfileId: payload.account_profile_id,
        accountDetails,
      });
      if (preflight) {
        throw preflight;
      }
      const launched = baseLaunchWorker(payload) || {};
      const accountProfileId = String(
        payload.account_profile_id
        || launched.account_profile_id
        || launched.accountProfileId
        || "",
      ).trim();
      const details = accountProfileId ? (accountDetails[accountProfileId] || null) : null;
      const authSourcePath = String(
        details && (
          details.normalizedSourceAuthPath
          || details.sourceAuthPath
          || details.managedAuthPath
        ) || "",
      ).trim();
      const tokenHealth = String(details && details.tokenHealth || "unknown").trim() || "unknown";
      const workerThreadId = String(
        launched.worker_thread_id
        || launched.thread_id
        || `pending-team-worker-${safeName(payload.node && payload.node.node_id, "node")}`,
      ).trim();
      const startedAt = String(launched.started_at || launched.startedAt || toIso()).trim();
      const launchedProvider = normalizeWorkerProvider(
        launched.provider || payload.provider || (payload.node && payload.node.provider),
        launched.model || payload.model,
      );
      return {
        ...launched,
        worker_thread_id: workerThreadId,
        account_profile_id: accountProfileId,
        account_auth_source_path: authSourcePath,
        account_token_health: tokenHealth,
        started_at: startedAt,
        session_binding: launched.session_binding && typeof launched.session_binding === "object"
          ? launched.session_binding
          : {
            run_id: String(payload.run_id || "").trim(),
            node_id: String(payload.node && payload.node.node_id || "").trim(),
            worker_thread_id: workerThreadId,
            account_profile_id: accountProfileId,
            provider: launchedProvider,
            started_at: startedAt,
          },
      };
    };
    let launched;
    try {
      launched = runLaunchSchedulerTick(workspacePath, dagRun, {
        maxParallel: Number.parseInt(options.maxParallel || 2, 10) || 2,
        worker_model: "gpt-5.3-codex",
        launchWorker,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error || "unknown launch error");
      const failedTask = updateTeamTaskDispatch(panel, task.task_id, task.owner || "supervisor", {
        state: "failed",
        command_kind: "codex.exec.new.batch",
        run_id: dagRunId,
        dag_run_id: dagRunId,
        launched_workers: [],
        error: detail,
      });
      const now = toIso();
      const traceThreadId = resolveTraceThreadId(task.owner || "supervisor");
      writeTeamTrace(paths, {
        kind: "orchestration.launch_failed",
        ts: now,
        task_id: task.task_id,
        thread_id: traceThreadId,
        run_id: dagRunId,
        agent_id: "supervisor",
        status: TASK_STATES.FAILED,
        summary: `DAG worker launch failed for run ${dagRunId}: ${detail.slice(0, 160)}`,
        evidence: {
          workspace_id: nextWorkspaceId,
          dag_run_id: dagRunId,
        },
        payload: {
          error: detail,
        },
      });
      appendEvent(paths, teamEvent("orchestration.launch_failed", {
        task_id: task.task_id,
        agent_id: "supervisor",
        workspace: workspacePath,
        payload: {
          workspace_id: nextWorkspaceId,
          dag_run_id: dagRunId,
          error: detail,
        },
      }));
      return {
        task: failedTask || findTaskById(paths, task.task_id),
        dag_run_id: dagRunId,
        launched: null,
        error: detail,
      };
    }
    const launchedWorkers = Array.isArray(launched.launched)
      ? launched.launched.map((item) => {
        const node = Array.isArray(launched.dagRun && launched.dagRun.nodes)
          ? launched.dagRun.nodes.find((candidate) => candidate && candidate.node_id === item.node_id)
          : null;
        const nodeRuntime = node && node.worker_runtime && typeof node.worker_runtime === "object"
          ? node.worker_runtime
          : null;
        const accountProfileId = String(
          item && item.account_profile_id
          || item && item.accountProfileId
          || (nodeRuntime && (nodeRuntime.account_profile_id || nodeRuntime.accountProfileId))
          || "",
        ).trim();
        return {
          ...item,
          account_profile_id: accountProfileId,
          account_auth_source_path: String(
            item && item.account_auth_source_path
            || item && item.accountAuthSourcePath
            || (nodeRuntime && (nodeRuntime.account_auth_source_path || nodeRuntime.accountAuthSourcePath))
            || "",
          ).trim(),
          account_token_health: String(
            item && item.account_token_health
            || item && item.accountTokenHealth
            || (nodeRuntime && (nodeRuntime.account_token_health || nodeRuntime.accountTokenHealth))
            || "unknown",
          ).trim() || "unknown",
          session_binding: item && item.session_binding
            ? item.session_binding
            : (nodeRuntime && nodeRuntime.session_binding) || null,
        };
      })
      : [];
    const primary = launchedWorkers[0] || {};
    const hasLaunched = launchedWorkers.length > 0;
    const nextTask = updateTeamTaskDispatch(panel, task.task_id, task.owner || "supervisor", hasLaunched
      ? {
        state: "dispatched",
        command_kind: "codex.exec.new.batch",
        run_id: dagRunId,
        pid: primary.pid || 0,
        log_path: primary.log_path || "",
        provider: primary.provider || "codex-cli",
        model: primary.model || "gpt-5.3-codex",
        model_explicit: true,
        dag_run_id: dagRunId,
        dag_tick_id: launched.tick_id || "",
        dag_selected_node_ids: launched.selected_node_ids || [],
        dag_blocked_node_ids: launched.blocked_node_ids || [],
        dag_blocked: launched.blocked || [],
        launched_workers: launchedWorkers,
      }
      : {
        state: "blocked",
        command_kind: "codex.exec.new.batch",
        run_id: dagRunId,
        dag_run_id: dagRunId,
        dag_tick_id: launched.tick_id || "",
        dag_selected_node_ids: launched.selected_node_ids || [],
        dag_blocked_node_ids: launched.blocked_node_ids || [],
        dag_blocked: launched.blocked || [],
        launched_workers: [],
        error: "No schedulable non-conflicting DAG nodes were selected in this tick.",
      });
    const now = toIso();
    const traceThreadId = resolveTraceThreadId(task.owner || "supervisor");
    launchedWorkers.forEach((worker) => {
      const accountProfileId = String(worker && worker.account_profile_id || "").trim();
      if (!accountProfileId) return;
      writeTeamTrace(paths, {
        kind: "orchestration.account_profile_bound",
        ts: now,
        task_id: task.task_id,
        thread_id: resolveTraceThreadId(String(worker.worker_thread_id || traceThreadId || "")),
        run_id: dagRunId,
        agent_id: "supervisor",
        status: TASK_STATES.RUNNING,
        summary: `Bound Team worker ${String(worker.node_id || "").trim() || "node"} to account profile ${accountProfileId}.`,
        evidence: {
          node_id: String(worker.node_id || "").trim() || undefined,
          worker_thread_id: String(worker.worker_thread_id || "").trim() || undefined,
          account_profile_id: accountProfileId,
          account_auth_source_path: String(worker.account_auth_source_path || "").trim() || undefined,
        },
        payload: {
          dag_run_id: dagRunId,
          node_id: String(worker.node_id || "").trim() || "",
          worker_thread_id: String(worker.worker_thread_id || "").trim() || "",
          account_profile_id: accountProfileId,
          account_auth_source_path: String(worker.account_auth_source_path || "").trim() || "",
          account_token_health: String(worker.account_token_health || "unknown").trim() || "unknown",
          session_binding: worker.session_binding || null,
        },
      });
    });
    const blockedNodesById = new Map(
      Array.isArray(launched.dagRun && launched.dagRun.nodes)
        ? launched.dagRun.nodes
          .filter((node) => node && node.node_id)
          .map((node) => [String(node.node_id), node])
        : [],
    );
    const profileBlockedReasons = new Set([
      "team_account_profile_not_found",
      "team_account_token_blocked",
    ]);
    (Array.isArray(launched.blocked) ? launched.blocked : []).forEach((entry) => {
      const reason = String(entry && entry.reason || "").trim();
      if (!profileBlockedReasons.has(reason)) return;
      const nodeId = String(entry && entry.node_id || "").trim();
      const node = blockedNodesById.get(nodeId) || {};
      const accountProfileId = String(
        (entry && entry.account_profile_id)
        || node.account_profile_id
        || node.accountProfileId
        || "",
      ).trim();
      writeTeamTrace(paths, {
        kind: "orchestration.account_profile_launch_blocked",
        ts: now,
        task_id: task.task_id,
        thread_id: traceThreadId,
        run_id: dagRunId,
        agent_id: "supervisor",
        status: TASK_STATES.BLOCKED,
        summary: `Blocked Team worker ${nodeId || "node"} for account profile ${accountProfileId || "unknown"}: ${reason}.`,
        evidence: {
          node_id: nodeId || undefined,
          account_profile_id: accountProfileId || undefined,
          reason,
        },
        payload: {
          dag_run_id: dagRunId,
          node_id: nodeId,
          account_profile_id: accountProfileId,
          reason,
          details: String(entry && entry.details || "").trim(),
        },
      });
    });
    writeTeamTrace(paths, {
      kind: hasLaunched ? "orchestration.workers_launched" : "orchestration.launch_blocked",
      ts: now,
      task_id: task.task_id,
      thread_id: traceThreadId,
      run_id: dagRunId,
      agent_id: "supervisor",
      status: hasLaunched ? TASK_STATES.RUNNING : TASK_STATES.BLOCKED,
      summary: hasLaunched
        ? `Launched ${launched.launched.length} DAG worker(s) for run ${dagRunId}.`
        : `No schedulable DAG workers were launched for run ${dagRunId}.`,
      evidence: {
        launched_workers: launchedWorkers,
        blocked: launched.blocked || [],
      },
      payload: {
        workspace_id: nextWorkspaceId,
        dag_run_id: dagRunId,
        selected_node_ids: launched.selected_node_ids || [],
        blocked_node_ids: launched.blocked_node_ids || [],
        tick_id: launched.tick_id || "",
      },
    });
    appendEvent(paths, teamEvent(hasLaunched ? "orchestration.workers_launched" : "orchestration.launch_blocked", {
      task_id: task.task_id,
      agent_id: "supervisor",
      workspace: workspacePath,
      payload: {
        workspace_id: nextWorkspaceId,
        dag_run_id: dagRunId,
        selected_node_ids: launched.selected_node_ids || [],
        blocked_node_ids: launched.blocked_node_ids || [],
        launched_count: launchedWorkers.length,
        tick_id: launched.tick_id || "",
      },
    }));
    launchedWorkers.forEach((worker) => {
      const workerId = String(worker.worker_thread_id || "").trim();
      if (!workerId) return;
      ensureAgentRecord(paths, workerId, {
        state: "running",
        current_task_id: task.task_id,
        heartbeat_at: now,
        updated_at: now,
        last_error: "",
      });
    });
    return {
      task: nextTask || findTaskById(paths, task.task_id),
      dag_run_id: dagRunId,
      launched,
    };
  }

  return {
    taskIdForWorkspace,
    prepareTeamWorkspaceRun,
    launchTeamWorkspaceOrchestration,
  };
}

module.exports = {
  createTeamOrchestrationLauncher,
};
