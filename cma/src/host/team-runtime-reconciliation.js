function createTeamRuntimeReconciliation(deps = {}) {
  const {
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
  } = deps;

  function stripMarkdownAnchor(linkTarget) {
    return String(linkTarget || "").trim().replace(/#.*$/, "");
  }

  function isTaskPlanMarkedComplete(taskPlanPath) {
    try {
      if (!taskPlanPath || !fs.existsSync(taskPlanPath)) return false;
      const content = fs.readFileSync(taskPlanPath, "utf8");
      const statusMatch = content.match(/(^|\n)##\s+Status\b([\s\S]*?)(\n##\s+|\n#\s+|$)/i);
      const statusBlock = statusMatch ? String(statusMatch[2] || "") : "";
      if (statusBlock && /-\s*\[[xX]\]\s*Complete\b/.test(statusBlock)) return true;
      return false;
    } catch {
      return false;
    }
  }

  function markRoadmapIndexEntryComplete(roadmapPath, taskPlanRelativePath) {
    if (!roadmapPath || !fs.existsSync(roadmapPath)) {
      return { changed: false, alreadyChecked: false };
    }
    const targetPath = normalizePath(taskPlanRelativePath);
    const targetBase = path.posix.basename(targetPath);
    if (!targetBase) {
      return { changed: false, alreadyChecked: false };
    }
    const content = fs.readFileSync(roadmapPath, "utf8");
    const lines = content.split(/\r?\n/);
    let changed = false;
    let alreadyChecked = false;
    const nextLines = lines.map((line) => {
      const match = line.match(/^(\s*-\s*)\[([ xX])\](\s+.*\[[^\]]+\]\(([^)]+)\).*)$/);
      if (!match) return line;
      const linkTarget = normalizePath(stripMarkdownAnchor(match[4]).replace(/^\.\//, ""));
      const linkBase = path.posix.basename(linkTarget);
      const matchesPlan = linkBase === targetBase || linkTarget === targetPath;
      if (!matchesPlan) return line;
      if (String(match[2]).toLowerCase() === "x") {
        alreadyChecked = true;
        return line;
      }
      changed = true;
      return `${match[1]}[x]${match[3]}`;
    });
    if (changed) {
      fs.writeFileSync(roadmapPath, `${nextLines.join("\n")}\n`, "utf8");
    }
    return { changed, alreadyChecked };
  }

  function markCompletedTaskPlansInRoadmapIndex(paths, task, runtime, now, traceThreadId) {
    const dagRunId = String(
      (runtime && runtime.dag_run_id)
      || (task && task.orchestration && task.orchestration.dag_run_id)
      || "",
    ).trim();
    if (!dagRunId) return { checkedPlanPaths: [] };
    const dagRun = readDagRun(paths.workspace, dagRunId);
    if (!dagRun || !Array.isArray(dagRun.nodes)) return { checkedPlanPaths: [] };
    const candidatePlanPaths = new Set();
    dagRun.nodes.forEach((node) => {
      const result = node && node.result && typeof node.result === "object" ? node.result : {};
      const changedFiles = Array.isArray(result.changed_files) ? result.changed_files : [];
      changedFiles.forEach((filePath) => {
        const normalized = normalizePath(filePath);
        if (/^task-plans\/.+-task-plan\.md$/i.test(normalized)) {
          candidatePlanPaths.add(normalized);
        }
      });
    });
    if (!candidatePlanPaths.size) return { checkedPlanPaths: [] };
    const roadmapPath = path.join(paths.workspace, "task-plans", "00-roadmap", "remote-workflow-reference-roadmap.md");
    const checkedPlanPaths = [];
    candidatePlanPaths.forEach((relativeTaskPlanPath) => {
      const taskPlanPath = path.join(paths.workspace, relativeTaskPlanPath);
      if (!isTaskPlanMarkedComplete(taskPlanPath)) return;
      const marked = markRoadmapIndexEntryComplete(roadmapPath, relativeTaskPlanPath);
      if (!marked.changed) return;
      checkedPlanPaths.push(relativeTaskPlanPath);
      writeTeamTrace(paths, {
        kind: "orchestration.roadmap_index_checked",
        ts: now,
        task_id: task.task_id,
        thread_id: traceThreadId,
        run_id: dagRunId,
        agent_id: "supervisor",
        status: TASK_STATES.REVIEW,
        summary: `Checked roadmap index entry for completed task plan: ${relativeTaskPlanPath}.`,
        evidence: {
          roadmap_path: normalizePath(path.relative(paths.workspace, roadmapPath)),
          task_plan_path: relativeTaskPlanPath,
        },
        payload: {
          dag_run_id: dagRunId,
        },
      });
      appendEvent(paths, teamEvent("orchestration.roadmap_index_checked", {
        task_id: task.task_id,
        agent_id: "supervisor",
        workspace: paths.workspace,
        payload: {
          dag_run_id: dagRunId,
          roadmap_path: normalizePath(path.relative(paths.workspace, roadmapPath)),
          task_plan_path: relativeTaskPlanPath,
        },
      }));
    });
    return { checkedPlanPaths };
  }

  function readRuntimeTraceState(runtime) {
    return runtime && runtime.trace && typeof runtime.trace === "object"
      ? { ...runtime.trace }
      : {};
  }

  function traceFileInfo(filePath) {
    const summary = summarizeTrace(filePath, 1);
    return {
      path: summary.filePath,
      exists: summary.exists,
      event_count: summary.event_count,
    };
  }

  function taskTraceFiles(paths, task) {
    const nextTask = task && typeof task === "object" ? task : {};
    const runtime = nextTask.runtime && typeof nextTask.runtime === "object" ? nextTask.runtime : {};
    const taskId = safeName(nextTask.task_id || "", "");
    const runId = safeName(runtime.run_id || "", "");
    const threadId = resolveTraceThreadId(runtime.thread_id || nextTask.owner || "");
    return {
      task: traceFileInfo(resolveTracePath(paths, { scope: "task", task_id: taskId })),
      run: traceFileInfo(resolveTracePath(paths, { scope: "run", run_id: runId })),
      thread: traceFileInfo(resolveTracePath(paths, { scope: "thread", thread_id: threadId })),
    };
  }

  function readTracePreview(filePath, limit = 8) {
    return summarizeTrace(filePath, limit).events;
  }

  function taskTracePreview(traceFiles) {
    const files = traceFiles && typeof traceFiles === "object" ? traceFiles : {};
    const preferred = files.task && files.task.exists
      ? { lane: "task", filePath: files.task.path }
      : (files.run && files.run.exists ? { lane: "run", filePath: files.run.path } : null);
    if (!preferred || !preferred.filePath) {
      return { lane: "", events: [] };
    }
    return {
      lane: preferred.lane,
      events: readTracePreview(preferred.filePath, 8),
    };
  }

  function parseRuntimeLogSummary(logPath) {
    const summary = {
      exists: false,
      lineCount: 0,
      threadStarted: false,
      turnStarted: false,
      itemCompletedCount: 0,
      commandCompletedCount: 0,
      fileChangeCount: 0,
      turnCompleted: false,
      error: "",
      lastMessage: "",
      sessionId: "",
      commandSamples: [],
      fileSamples: [],
    };
    try {
      if (!logPath || !fs.existsSync(logPath)) return summary;
      summary.exists = true;
      fs.readFileSync(logPath, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
          summary.lineCount += 1;
          let payload = null;
          try {
            payload = JSON.parse(line);
          } catch {
            summary.lastMessage = line;
            return;
          }
          const type = String(payload.type || "");
          const sessionPayload = payload.payload && typeof payload.payload === "object" ? payload.payload : {};
          if (type === "session_meta" && sessionPayload.id) summary.sessionId = String(sessionPayload.id);
          if (sessionPayload.type === "session_meta" && sessionPayload.id) summary.sessionId = String(sessionPayload.id);
          if (type === "thread.started") summary.threadStarted = true;
          if (type === "turn.started") summary.turnStarted = true;
          if (type === "turn.completed") summary.turnCompleted = true;
          if (type === "error") summary.error = String(payload.message || "Runtime error");
          if (type === "item.completed") {
            summary.itemCompletedCount += 1;
            const itemType = String((payload.item && payload.item.type) || "");
            if (itemType === "command_execution") {
              summary.commandCompletedCount += 1;
              const commandText = String(
                (payload.item && (payload.item.command || payload.item.text || payload.item.title)) || "",
              ).trim();
              if (commandText && summary.commandSamples.length < 3) summary.commandSamples.push(commandText);
            }
            if (itemType === "file_change") {
              summary.fileChangeCount += 1;
              const fileText = String(
                (payload.item && (payload.item.path || payload.item.text || payload.item.title)) || "",
              ).trim();
              if (fileText && summary.fileSamples.length < 5) summary.fileSamples.push(fileText);
            }
            if (payload.item && payload.item.text) summary.lastMessage = String(payload.item.text);
          }
        });
    } catch (error) {
      summary.error = error instanceof Error ? error.message : String(error);
    }
    return summary;
  }

  function moveAgentRecord(paths, previousAgentId, nextAgentId) {
    const previous = safeName(previousAgentId || "", "");
    const next = safeName(nextAgentId || "", "");
    if (!previous || !next || previous === next) return;
    const previousPath = path.join(paths.agentsDir, `${previous}.json`);
    const current = readJson(previousPath, {});
    ensureAgentRecord(paths, next, {
      ...current,
      agent_id: next,
      updated_at: toIso(),
    });
    try {
      fs.rmSync(previousPath, { force: true });
    } catch {
      // Best-effort cleanup; stale records are surfaced by validation if they remain.
    }
  }

  function runtimeProgressFromSummary(summary, pidRunning) {
    if (!summary || !summary.exists) return pidRunning ? 25 : 10;
    if (summary.turnCompleted) return 100;
    if (summary.fileChangeCount > 0) return 88;
    if (summary.commandCompletedCount > 0) return 78;
    if (summary.itemCompletedCount > 0) return 68;
    if (summary.turnStarted) return 55;
    if (summary.threadStarted) return 35;
    return pidRunning ? 25 : 15;
  }

  function resolveDagWorkerForRuntime(task, runtime, logSummary) {
    const launchedWorkers = Array.isArray(runtime && runtime.launched_workers) ? runtime.launched_workers : [];
    if (!launchedWorkers.length) return null;
    const byNodeId = new Map(launchedWorkers
      .map((worker) => (worker && worker.node_id ? [String(worker.node_id), worker] : null))
      .filter(Boolean));
    const candidates = [
      String(logSummary && logSummary.sessionId || "").trim(),
      String(runtime && runtime.thread_id || "").trim(),
      String(task && task.owner || "").trim(),
    ].filter(Boolean);
    for (const candidate of candidates) {
      const matched = launchedWorkers.find((worker) => String(worker && worker.worker_thread_id || "").trim() === candidate);
      if (matched && matched.node_id) return matched;
    }
    const pid = String(runtime && runtime.pid || "").trim();
    if (pid) {
      const matchedByPid = launchedWorkers.find((worker) => String(worker && worker.pid || "").trim() === pid);
      if (matchedByPid && matchedByPid.node_id) return matchedByPid;
    }
    const logPath = normalizePath(runtime && runtime.log_path || "");
    if (logPath) {
      const matchedByLog = launchedWorkers.find((worker) => normalizePath(worker && worker.log_path || "") === logPath);
      if (matchedByLog && matchedByLog.node_id) return matchedByLog;
    }
    const selectedNodeIds = Array.isArray(runtime && runtime.dag_selected_node_ids)
      ? runtime.dag_selected_node_ids.map((value) => String(value || "").trim()).filter(Boolean)
      : [];
    for (const nodeId of selectedNodeIds) {
      const matched = byNodeId.get(nodeId);
      if (matched) return matched;
    }
    return null;
  }

  function ingestDagWorkerResultEnvelope(paths, task, runtime, traceState, logSummary, now) {
    const dagRunId = String(
      (runtime && runtime.dag_run_id)
      || (task && task.orchestration && task.orchestration.dag_run_id)
      || "",
    ).trim();
    const worker = resolveDagWorkerForRuntime(task, runtime, logSummary);
    const nodeId = String(worker && worker.node_id || "").trim();
    const resultText = String(logSummary && logSummary.lastMessage || "").trim();
    const ingestErrorTracePath = String(
      (worker && worker.trace_path)
      || (runtime && runtime.trace_path)
      || (dagRunId ? `.codex-team/dag-runs/${dagRunId}/trace.jsonl` : ""),
    ).trim();
    if (!dagRunId || !nodeId || !resultText) {
      return { runtimePatch: {}, tracePatch: {} };
    }
    const ingestedNodeIds = Array.isArray(traceState && traceState.ingested_worker_node_ids)
      ? traceState.ingested_worker_node_ids.map((value) => String(value || "").trim()).filter(Boolean)
      : [];
    const failedNodeIds = Array.isArray(traceState && traceState.failed_worker_node_ids)
      ? traceState.failed_worker_node_ids.map((value) => String(value || "").trim()).filter(Boolean)
      : [];
    if (ingestedNodeIds.includes(nodeId)) {
      return { runtimePatch: {}, tracePatch: {} };
    }
    if (failedNodeIds.includes(nodeId)) {
      return { runtimePatch: {}, tracePatch: {} };
    }

    const markWorkerIngestFailedPatch = (detail) => {
      const nextWorkers = Array.isArray(runtime && runtime.launched_workers)
        ? runtime.launched_workers.map((item) => {
          if (!item || String(item.node_id || "").trim() !== nodeId) return item;
          return {
            ...item,
            node_status: DAG_NODE_STATES.FAILED,
            result_ingest_failed_at: now,
            result_ingest_error: String(detail || "").trim(),
          };
        })
        : [];
      const nextFailedNodeIds = [...failedNodeIds, nodeId]
        .filter(Boolean)
        .filter((value, index, list) => list.indexOf(value) === index);
      return {
        runtimePatch: {
          launched_workers: nextWorkers,
        },
        tracePatch: {
          failed_worker_node_ids: nextFailedNodeIds,
        },
      };
    };
    try {
      const dagRun = readDagRun(paths.workspace, dagRunId);
      if (!dagRun || !dagRun.run_id || String(dagRun.run_id).trim() !== dagRunId) {
        writeTeamTrace(paths, {
          kind: "orchestration.worker_result_ingest_missing_dag_run",
          ts: now,
          task_id: task.task_id,
          thread_id: resolveTraceThreadId(String(logSummary.sessionId || runtime.thread_id || task.owner || "")),
          run_id: dagRunId,
          agent_id: task.owner || "",
          status: taskStatus(task, ""),
          summary: `Failed to ingest worker envelope for node ${nodeId}: DAG run not found (${dagRunId}).`,
          evidence: {
            dag_run_id: dagRunId,
            node_id: nodeId,
            trace_path: ingestErrorTracePath || undefined,
          },
        });
        return {
          runtimePatch: {
            ...markWorkerIngestFailedPatch(`DAG run not found: ${dagRunId}`).runtimePatch,
            dag_last_ingest_error: `DAG run not found: ${dagRunId}`,
            dag_last_ingest_error_at: now,
            dag_last_ingest_error_trace_path: ingestErrorTracePath,
          },
          tracePatch: {
            ...markWorkerIngestFailedPatch(`DAG run not found: ${dagRunId}`).tracePatch,
          },
        };
      }
      const ingested = ingestWorkerResultEnvelope(paths.workspace, dagRun, {
        node_id: nodeId,
        result: resultText,
        node_status: DAG_NODE_STATES.COMPLETED,
      });
      writeTeamTrace(paths, {
        kind: "orchestration.worker_result_envelope_ingested",
        ts: now,
        task_id: task.task_id,
        thread_id: resolveTraceThreadId(String(logSummary.sessionId || runtime.thread_id || task.owner || "")),
        run_id: dagRunId,
        agent_id: task.owner || "",
        status: taskStatus(task, ""),
        summary: `Ingested worker result envelope for node ${nodeId}.`,
        evidence: {
          dag_run_id: dagRunId,
          node_id: nodeId,
          summary: ingested && ingested.envelope ? ingested.envelope.summary : "",
        },
        payload: {
          changed_files: ingested && ingested.envelope ? ingested.envelope.changed_files : [],
          checks_run: ingested && ingested.envelope ? ingested.envelope.checks_run : [],
        },
      });
      const nextIngestedNodeIds = [...ingestedNodeIds, nodeId]
        .filter(Boolean)
        .filter((value, index, list) => list.indexOf(value) === index);
      const nextWorkers = Array.isArray(runtime && runtime.launched_workers)
        ? runtime.launched_workers.map((item) => {
          if (!item || String(item.node_id || "").trim() !== nodeId) return item;
          return {
            ...item,
            result_ingested_at: now,
            node_status: DAG_NODE_STATES.COMPLETED,
          };
        })
        : [];
      return {
        runtimePatch: {
          launched_workers: nextWorkers,
          dag_last_ingested_node_id: nodeId,
          dag_last_ingested_at: now,
          dag_last_ingested_summary: ingested && ingested.envelope ? ingested.envelope.summary : "",
          dag_last_ingest_error: "",
          dag_last_ingest_error_trace_path: "",
        },
        tracePatch: {
          ingested_worker_node_ids: nextIngestedNodeIds,
        },
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const dagRun = readDagRun(paths.workspace, dagRunId);
      if (dagRun && dagRun.run_id && String(dagRun.run_id).trim() === dagRunId) {
        try {
          persistWorkerResultIngestFailureMetadata(paths.workspace, dagRun, {
            node_id: nodeId,
            error: detail,
            failed_at: now,
          });
        } catch {
          // Preserve runtime diagnostics even if DAG persistence fails.
        }
      }
      writeTeamTrace(paths, {
        kind: "orchestration.worker_result_ingest_failed",
        ts: now,
        task_id: task.task_id,
        thread_id: resolveTraceThreadId(String(logSummary.sessionId || runtime.thread_id || task.owner || "")),
        run_id: dagRunId,
        agent_id: task.owner || "",
        status: taskStatus(task, ""),
        summary: `Failed to ingest worker envelope for node ${nodeId}: ${detail.slice(0, 160)}`,
        evidence: {
          dag_run_id: dagRunId,
          node_id: nodeId,
          trace_path: ingestErrorTracePath || undefined,
        },
        payload: {
          error: detail,
        },
      });
      return {
        runtimePatch: {
          ...markWorkerIngestFailedPatch(detail).runtimePatch,
          dag_last_ingest_error: detail,
          dag_last_ingest_error_at: now,
          dag_last_ingest_error_trace_path: ingestErrorTracePath,
        },
        tracePatch: {
          ...markWorkerIngestFailedPatch(detail).tracePatch,
        },
      };
    }
  }

  function ingestCompletedLaunchedWorkerEnvelopes(paths, task, runtime, traceState, now) {
    const launchedWorkers = Array.isArray(runtime && runtime.launched_workers) ? runtime.launched_workers : [];
    if (!launchedWorkers.length) {
      return { runtimePatch: {}, tracePatch: {} };
    }
    const terminalNodeStates = new Set(["completed", "failed", "skipped"]);
    let nextRuntimePatch = {};
    let nextTracePatch = {};
    const missingLogNodeIds = new Set(Array.isArray(traceState && traceState.missing_worker_log_node_ids)
      ? traceState.missing_worker_log_node_ids.map((value) => String(value || "").trim()).filter(Boolean)
      : []);
    launchedWorkers.forEach((worker) => {
      const nodeId = String(worker && worker.node_id || "").trim();
      const logPath = String(worker && worker.log_path || "").trim();
      const tracePath = String(worker && worker.trace_path || "").trim();
      if (!nodeId) return;
      if (terminalNodeStates.has(String(worker && worker.node_status || "").trim())) return;
      if (!logPath) {
        if (!missingLogNodeIds.has(nodeId)) {
          writeTeamTrace(paths, {
            kind: "orchestration.worker_log_missing",
            ts: now,
            task_id: task.task_id,
            thread_id: resolveTraceThreadId(String(worker && worker.worker_thread_id || runtime.thread_id || task.owner || "")),
            run_id: runtime.run_id,
            agent_id: task.owner || "",
            status: taskStatus(task, ""),
            summary: `Launched worker ${nodeId} is missing log_path; envelope ingestion is waiting for runtime log evidence.`,
            evidence: {
              dag_run_id: String(runtime && runtime.dag_run_id || task && task.orchestration && task.orchestration.dag_run_id || ""),
              node_id: nodeId,
              trace_path: tracePath || undefined,
            },
            payload: {
              worker_thread_id: String(worker && worker.worker_thread_id || "").trim(),
            },
          });
        }
        missingLogNodeIds.add(nodeId);
        nextRuntimePatch = {
          ...nextRuntimePatch,
          dag_last_ingest_error: `Worker log path missing for node ${nodeId}; waiting for runtime log evidence.`,
          dag_last_ingest_error_at: now,
          dag_last_ingest_error_trace_path: tracePath || "",
        };
        nextTracePatch = {
          ...nextTracePatch,
          missing_worker_log_node_ids: [...missingLogNodeIds],
        };
        return;
      }
      if (missingLogNodeIds.has(nodeId)) {
        missingLogNodeIds.delete(nodeId);
        nextTracePatch = {
          ...nextTracePatch,
          missing_worker_log_node_ids: [...missingLogNodeIds],
        };
      }
      const workerLogSummary = parseRuntimeLogSummary(logPath);
      if (!workerLogSummary.turnCompleted || !String(workerLogSummary.lastMessage || "").trim()) return;
      const runtimeForWorker = {
        ...(runtime && typeof runtime === "object" ? runtime : {}),
        ...nextRuntimePatch,
        thread_id: String(worker.worker_thread_id || workerLogSummary.sessionId || runtime.thread_id || "").trim(),
        pid: String(worker.pid || runtime.pid || "").trim(),
        log_path: logPath,
      };
      const traceForWorker = {
        ...(traceState && typeof traceState === "object" ? traceState : {}),
        ...nextTracePatch,
      };
      const ingestPatch = ingestDagWorkerResultEnvelope(
        paths,
        task,
        runtimeForWorker,
        traceForWorker,
        workerLogSummary,
        now,
      );
      if (ingestPatch && ingestPatch.runtimePatch && typeof ingestPatch.runtimePatch === "object") {
        nextRuntimePatch = { ...nextRuntimePatch, ...ingestPatch.runtimePatch };
      }
      if (ingestPatch && ingestPatch.tracePatch && typeof ingestPatch.tracePatch === "object") {
        nextTracePatch = { ...nextTracePatch, ...ingestPatch.tracePatch };
      }
    });
    return {
      runtimePatch: nextRuntimePatch,
      tracePatch: nextTracePatch,
    };
  }

  function summarizeLaunchedWorkerBatch(runtime, traceState) {
    const launchedWorkers = Array.isArray(runtime && runtime.launched_workers) ? runtime.launched_workers : [];
    if (!launchedWorkers.length) {
      return { hasBatch: false, allTerminal: true, pendingNodeIds: [] };
    }
    const ingestedNodeIds = new Set(Array.isArray(traceState && traceState.ingested_worker_node_ids)
      ? traceState.ingested_worker_node_ids.map((value) => String(value || "").trim()).filter(Boolean)
      : []);
    const terminalNodeStates = new Set(["completed", "failed", "skipped"]);
    const pendingNodeIds = launchedWorkers
      .map((worker) => {
        const nodeId = String(worker && worker.node_id || "").trim();
        if (!nodeId) return "";
        const state = String(worker && worker.node_status || "").trim();
        if (terminalNodeStates.has(state) || ingestedNodeIds.has(nodeId)) return "";
        return nodeId;
      })
      .filter(Boolean);
    return {
      hasBatch: true,
      allTerminal: pendingNodeIds.length === 0,
      pendingNodeIds,
    };
  }

  function reconcileTeamTaskRuntimes(paths) {
    listJsonFiles(paths.tasksDir).forEach((filePath) => {
      const task = readTaskRecordFile(filePath);
      if (!task || !task.runtime || typeof task.runtime !== "object") return;
      const runtime = task.runtime;
      const traceState = readRuntimeTraceState(runtime);
      const pid = Number(runtime.pid || 0);
      const logPath = String(runtime.log_path || "");
      const runtimeState = String(runtime.state || "");
      const previousTaskStatus = taskStatus(task, "");
      if (["completed", "failed"].includes(runtimeState)) return;
      const pidRunning = isPidRunning(pid);
      const logSummary = parseRuntimeLogSummary(logPath);
      const progressPercent = runtimeProgressFromSummary(logSummary, pidRunning);
      const now = toIso();
      const nextRuntime = {
        ...runtime,
        pid_running: pidRunning,
        progress_percent: progressPercent,
        log_line_count: logSummary.lineCount,
        item_completed_count: logSummary.itemCompletedCount,
        command_completed_count: logSummary.commandCompletedCount,
        file_change_count: logSummary.fileChangeCount,
        last_message: logSummary.lastMessage || runtime.last_message || "",
        last_error: logSummary.error || runtime.last_error || "",
        thread_id: logSummary.sessionId || runtime.thread_id || "",
        log_tail: readTextTail(logPath, 4000),
        updated_at: now,
      };
      const nextTraceState = {
        ...traceState,
        last_log_line_count: Math.max(Number(traceState.last_log_line_count || 0), 0),
        last_command_completed_count: Math.max(Number(traceState.last_command_completed_count || 0), 0),
        last_file_change_count: Math.max(Number(traceState.last_file_change_count || 0), 0),
        last_process_state: String(traceState.last_process_state || runtimeState || ""),
      };
      if (logSummary.sessionId && String(task.owner || "").startsWith("pending-team-worker-")) {
        const previousOwner = task.owner;
        task.owner = logSummary.sessionId;
        nextRuntime.owner_resolved_from = previousOwner;
        moveAgentRecord(paths, previousOwner, logSummary.sessionId);
        appendEvent(paths, teamEvent("task.thread_resolved", {
          task_id: task.task_id,
          agent_id: logSummary.sessionId,
          workspace: paths.workspace,
          payload: { previous_owner: previousOwner, thread_id: logSummary.sessionId },
        }));
      }
      const traceThreadId = resolveTraceThreadId(logSummary.sessionId || runtime.thread_id || task.owner || "");
      if (logSummary.sessionId && nextTraceState.resolved_thread_id !== logSummary.sessionId) {
        writeTeamTrace(paths, {
          kind: "thread.resolved",
          ts: now,
          task_id: task.task_id,
          thread_id: logSummary.sessionId,
          run_id: runtime.run_id,
          agent_id: task.owner || "",
          status: taskStatus(task, ""),
          summary: `Worker thread resolved to ${logSummary.sessionId}.`,
          evidence: {
            log_path: logPath || undefined,
            pid: pid > 0 ? pid : undefined,
          },
          payload: {
            previous_owner: nextRuntime.owner_resolved_from || "",
            resolution_source: "runtime_log.session_meta",
          },
        });
        nextTraceState.resolved_thread_id = logSummary.sessionId;
        nextTraceState.thread_resolved_at = now;
      }
      const logDelta = Math.max(0, logSummary.lineCount - Number(traceState.last_log_line_count || 0));
      const commandDelta = Math.max(0, logSummary.commandCompletedCount - Number(traceState.last_command_completed_count || 0));
      const fileDelta = Math.max(0, logSummary.fileChangeCount - Number(traceState.last_file_change_count || 0));
      if (logDelta > 0) {
        writeTeamTrace(paths, {
          kind: "run.log_activity",
          ts: now,
          task_id: task.task_id,
          thread_id: traceThreadId,
          run_id: runtime.run_id,
          agent_id: task.owner || "",
          status: runtimeState || taskStatus(task, ""),
          summary: commandDelta > 0 || fileDelta > 0
            ? `Run log activity observed: +${logDelta} lines, +${commandDelta} commands, +${fileDelta} file signals.`
            : `Run log activity observed: +${logDelta} lines.`,
          evidence: {
            pid: pid > 0 ? pid : undefined,
            log_path: logPath || undefined,
            log_line_count: logSummary.lineCount,
            log_line_delta: logDelta,
            command_count: logSummary.commandCompletedCount,
            file_count: logSummary.fileChangeCount,
            message_count: logSummary.itemCompletedCount,
          },
          payload: {
            last_message: logSummary.lastMessage || "",
            command_samples: logSummary.commandSamples,
            file_samples: logSummary.fileSamples,
          },
        });
        nextTraceState.last_log_line_count = logSummary.lineCount;
        nextTraceState.last_command_completed_count = logSummary.commandCompletedCount;
        nextTraceState.last_file_change_count = logSummary.fileChangeCount;
      }
      let eventType = "";
      if (logSummary.turnCompleted) {
        nextRuntime.state = "completed";
        task.status = TASK_STATES.REVIEW;
        task.lease_until = "";
        eventType = "task.dispatch_completed";
      } else if (!pidRunning && logSummary.error) {
        nextRuntime.state = "failed";
        nextRuntime.progress_percent = 100;
        task.status = TASK_STATES.FAILED;
        task.lease_until = "";
        eventType = "task.dispatch_failed";
      } else if (!pidRunning && runtimeState === "dispatched") {
        nextRuntime.state = "exited";
        nextRuntime.progress_percent = Math.max(nextRuntime.progress_percent || 0, 90);
        task.status = TASK_STATES.BLOCKED;
        task.lease_until = "";
        nextRuntime.last_error = nextRuntime.last_error || "Background codex process exited before turn.completed";
        eventType = "task.dispatch_exited";
      } else if (pidRunning) {
        nextRuntime.state = "running";
      }
      const nextProcessState = String(nextRuntime.state || runtimeState || "");
      if (runtime.run_id && nextProcessState && nextProcessState !== String(traceState.last_process_state || runtimeState || "")) {
        writeTeamTrace(paths, {
          kind: "run.process_state_changed",
          ts: now,
          task_id: task.task_id,
          thread_id: traceThreadId,
          run_id: runtime.run_id,
          agent_id: task.owner || "",
          status: nextProcessState,
          summary: `Run process state changed from ${String(traceState.last_process_state || runtimeState || "unknown")} to ${nextProcessState}.`,
          evidence: {
            pid: pid > 0 ? pid : undefined,
            log_path: logPath || undefined,
            process_alive: pidRunning,
          },
          payload: {
            from: String(traceState.last_process_state || runtimeState || "unknown"),
            to: nextProcessState,
          },
        });
      }
      nextTraceState.last_process_state = nextProcessState;
      if (logSummary.turnCompleted && !traceState.result_captured_at) {
        writeTeamTrace(paths, {
          kind: "run.result_captured",
          ts: now,
          task_id: task.task_id,
          thread_id: traceThreadId,
          run_id: runtime.run_id,
          agent_id: task.owner || "",
          status: nextProcessState || taskStatus(task, ""),
          summary: logSummary.lastMessage
            ? `Worker result captured: ${logSummary.lastMessage.slice(0, 140)}`
            : "Worker result captured from runtime log completion.",
          evidence: {
            pid: pid > 0 ? pid : undefined,
            log_path: logPath || undefined,
            log_line_count: logSummary.lineCount,
            command_count: logSummary.commandCompletedCount,
            file_count: logSummary.fileChangeCount,
          },
          payload: {
            last_message: logSummary.lastMessage || "",
            command_samples: logSummary.commandSamples,
            file_samples: logSummary.fileSamples,
          },
        });
        nextTraceState.result_captured_at = now;
      }
      if (logSummary.turnCompleted) {
        const ingestPatch = ingestDagWorkerResultEnvelope(paths, task, nextRuntime, nextTraceState, logSummary, now);
        if (ingestPatch && ingestPatch.runtimePatch && typeof ingestPatch.runtimePatch === "object") {
          Object.assign(nextRuntime, ingestPatch.runtimePatch);
        }
        if (ingestPatch && ingestPatch.tracePatch && typeof ingestPatch.tracePatch === "object") {
          Object.assign(nextTraceState, ingestPatch.tracePatch);
        }
      }
      const launchedWorkerIngest = ingestCompletedLaunchedWorkerEnvelopes(paths, task, nextRuntime, nextTraceState, now);
      if (launchedWorkerIngest && launchedWorkerIngest.runtimePatch && typeof launchedWorkerIngest.runtimePatch === "object") {
        Object.assign(nextRuntime, launchedWorkerIngest.runtimePatch);
      }
      if (launchedWorkerIngest && launchedWorkerIngest.tracePatch && typeof launchedWorkerIngest.tracePatch === "object") {
        Object.assign(nextTraceState, launchedWorkerIngest.tracePatch);
      }
      const launchedBatch = summarizeLaunchedWorkerBatch(nextRuntime, nextTraceState);
      if (launchedBatch.hasBatch && !launchedBatch.allTerminal && task.status !== TASK_STATES.FAILED) {
        nextRuntime.state = "running";
        task.status = TASK_STATES.RUNNING;
        task.lease_until = "";
        nextRuntime.awaiting_worker_node_ids = launchedBatch.pendingNodeIds;
        if (eventType === "task.dispatch_completed") {
          eventType = "";
        }
      }
      if (launchedBatch.hasBatch && launchedBatch.allTerminal && task.status !== TASK_STATES.FAILED) {
        nextRuntime.state = "completed";
        task.status = TASK_STATES.REVIEW;
        task.lease_until = "";
        nextRuntime.awaiting_worker_node_ids = [];
        eventType = "task.dispatch_completed";
        const roadmapIndexUpdate = markCompletedTaskPlansInRoadmapIndex(paths, task, nextRuntime, now, traceThreadId);
        if (Array.isArray(roadmapIndexUpdate.checkedPlanPaths) && roadmapIndexUpdate.checkedPlanPaths.length) {
          const priorPaths = Array.isArray(nextRuntime.roadmap_index_checked_plan_paths)
            ? nextRuntime.roadmap_index_checked_plan_paths.map((value) => normalizePath(value)).filter(Boolean)
            : [];
          const merged = [...new Set([...priorPaths, ...roadmapIndexUpdate.checkedPlanPaths])];
          nextRuntime.roadmap_index_checked_plan_paths = merged;
          nextRuntime.roadmap_index_checked_at = now;
        }
      }
      if (task.status === TASK_STATES.FAILED && previousTaskStatus !== TASK_STATES.FAILED) {
        writeTeamTrace(paths, {
          kind: "task.failed",
          ts: now,
          task_id: task.task_id,
          thread_id: traceThreadId,
          run_id: runtime.run_id,
          agent_id: task.owner || "",
          status: TASK_STATES.FAILED,
          summary: nextRuntime.last_error
            ? `Task failed: ${String(nextRuntime.last_error).slice(0, 160)}`
            : "Task failed during Team worker runtime reconciliation.",
          evidence: {
            pid: pid > 0 ? pid : undefined,
            log_path: logPath || undefined,
            process_alive: pidRunning,
          },
          payload: {
            reason: nextRuntime.last_error || logSummary.error || "",
            runtime_state: nextProcessState,
          },
        });
        nextTraceState.failed_at = now;
      }
      nextRuntime.trace = nextTraceState;
      task.runtime = nextRuntime;
      task.updated_at = now;
      writeTask(paths, task);
      if (eventType && runtimeState !== nextRuntime.state) {
        appendEvent(paths, teamEvent(eventType, {
          task_id: task.task_id,
          agent_id: task.owner || "",
          workspace: paths.workspace,
          payload: nextRuntime,
        }));
        ensureAgentRecord(paths, task.owner || "supervisor", {
          state: [TASK_STATES.BLOCKED, TASK_STATES.FAILED].includes(task.status) ? "blocked" : "running",
          current_task_id: task.task_id,
          heartbeat_at: [TASK_STATES.BLOCKED, TASK_STATES.FAILED].includes(task.status) ? "" : now,
          updated_at: now,
          last_error: nextRuntime.last_error || "",
        });
      }
    });
  }

  return {
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
  };
}

module.exports = {
  createTeamRuntimeReconciliation,
};
