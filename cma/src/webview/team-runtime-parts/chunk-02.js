module.exports = `          };
        }
        if (taskCreated) {
          return {
            label: "Task created",
            value: "queued for worker",
            percent: 8,
          };
        }
        return {
          label: "Queued",
          value: "no runtime evidence",
          percent: 4,
        };
      }

      function renderTeamMiniLogs(logs, emptyText) {
        const allLogs = Array.isArray(logs) ? logs : [];
        const rows = allLogs.slice(0, 3).map((log) => {
          const kind = String((log && log.source) || "event");
          const type = String((log && log.type) || "event");
          const summary = String((log && log.summary) || "");
          const time = String((log && log.timestamp) || "");
          return '<div class="team-log-row">' +
            '<span class="team-log-kind"><span class="team-log-icon">' + eventTypeIcon(type) + '</span>' + esc(kind) + '</span>' +
            '<span class="team-log-main">' +
              '<span class="team-log-title">' + esc(short(type, 42)) + '</span>' +
              (summary ? '<span class="team-log-copy">' + esc(short(summary, 82)) + '</span>' : '') +
            '</span>' +
            '<span class="team-log-time">' + esc(time ? formatTimestamp(time) : "-") + '</span>' +
          '</div>';
        });
        return '<div class="team-mini-log">' +
          '<div class="team-mini-log-head"><span>Recent log</span><span class="meta-pill">' + esc(String(allLogs.length)) + '</span></div>' +
          (rows.length ? rows.join("") : '<div class="team-lane-empty">' + esc(emptyText || "No log entries yet.") + '</div>') +
        '</div>';
      }

      function humanizeTeamTimelineType(type) {
        return String(type || "event")
          .replace(/^task\./, "")
          .replace(/^run\./, "")
          .replace(/^thread\./, "")
          .replace(/^trace\./, "")
          .replace(/^codex\./, "")
          .split(/[._-]+/)
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ") || "Event";
      }

      function teamTracePreview(task) {
        const preview = task && task.trace_preview && typeof task.trace_preview === "object" ? task.trace_preview : {};
        return {
          lane: String(preview.lane || ""),
          events: Array.isArray(preview.events) ? preview.events : [],
        };
      }

      function teamTraceTone(kind, status) {
        const nextKind = String(kind || "");
        const nextStatus = String(status || "");
        if (nextKind === "task.failed") return "warn";
        if (nextKind === "run.result_captured") return "complete";
        if (nextKind === "run.process_state_changed" && /failed|blocked|exited/i.test(nextStatus)) return "warn";
        if (nextKind === "run.process_state_changed" && /completed|review/i.test(nextStatus)) return "complete";
        return "live";
      }

      function humanizeTeamTraceTitle(kind, status) {
        const nextKind = String(kind || "");
        const nextStatus = String(status || "");
        if (nextKind === "run.pid_recorded") return "PID recorded";
        if (nextKind === "run.log_activity") return "Log activity detected";
        if (nextKind === "run.result_captured") return "Result captured";
        if (nextKind === "thread.resolved") return "Thread resolved";
        if (nextKind === "task.retry_requested") return "Retry requested";
        if (nextKind === "task.retry_started") return "Retry started";
        if (nextKind === "task.failed") return "Task failed";
        if (nextKind === "run.process_state_changed" && nextStatus) {
          return "Process " + nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1);
        }
        return humanizeTeamTimelineType(nextKind);
      }

      function teamTimelineHasTraceEquivalent(traceKinds, eventType) {
        const equivalents = {
          "task.created": ["task.created"],
          "task.dispatch_started": ["run.dispatch_started"],
          "task.thread_resolved": ["thread.resolved"],
          "task.dispatch_completed": ["run.result_captured", "run.process_state_changed"],
          "task.dispatch_failed": ["task.failed", "run.process_state_changed"],
          "task.dispatch_exited": ["run.process_state_changed", "task.failed"],
          "task.retry_requested": ["task.retry_requested"],
          "task.retry_assigned": ["task.retry_started"],
          "task.completed": ["run.result_captured"],
        };
        const candidates = equivalents[String(eventType || "")] || [];
        return candidates.some((kind) => traceKinds.has(kind));
      }

      function buildTeamTaskTimelineEvents(task, logs) {
        const runtime = task && task.runtime && typeof task.runtime === "object" ? task.runtime : {};
        const result = task && task.result && typeof task.result === "object" ? task.result : {};
        const tracePreview = teamTracePreview(task);
        const traceEvents = Array.isArray(tracePreview.events) ? tracePreview.events : [];
        const traceKinds = new Set(traceEvents.map((entry) => String((entry && entry.kind) || "").trim()).filter(Boolean));
        const allLogs = Array.isArray(logs) ? logs.slice() : [];
        const seenTypes = new Set(allLogs.map((entry) => String((entry && entry.type) || "").trim()).filter(Boolean));
        const items = [];
        function push(timestamp, title, copy, tone = "live", weight = 0) {
          items.push({
            timestamp: String(timestamp || ""),
            title,
            copy,
            tone,
            weight,
          });
        }
        traceEvents.forEach((entry) => {
          const kind = String((entry && entry.kind) || "");
          push(
            entry && entry.timestamp,
            humanizeTeamTraceTitle(kind, entry && entry.status),
            String((entry && entry.summary) || "").trim() || "Trace evidence recorded for this task.",
            teamTraceTone(kind, entry && entry.status),
            45,
          );
        });
        if (task && task.created_at && !seenTypes.has("task.created") && !traceKinds.has("task.created")) {
          push(task.created_at, "Task created", "Supervisor recorded the task and prepared it for dispatch.", "live", 10);
        }
        if (runtime.started_at && !seenTypes.has("task.dispatch_started") && !traceKinds.has("run.dispatch_started")) {
          push(runtime.started_at, "Dispatch started", runtime.pid ? ("Background Codex worker launched with PID " + String(runtime.pid) + ".") : "Background Codex worker launched for this task.", "live", 20);
        }
        if (runtime.thread_id && !seenTypes.has("task.thread_resolved") && !traceKinds.has("thread.resolved")) {
          push(runtime.updated_at || task.updated_at || "", "Thread resolved", "Pending team worker linked to Codex thread " + short(runtime.thread_id, 18) + ".", "live", 30);
        }
        if (runtime.last_error && !seenTypes.has("task.dispatch_failed") && !seenTypes.has("task.dispatch_exited") && !traceKinds.has("task.failed")) {
          push(runtime.updated_at || task.updated_at || "", "Runtime error surfaced", short(runtime.last_error, 180), "warn", 80);
        }
        if (String(result.summary || "").trim() && !seenTypes.has("task.completed") && !traceKinds.has("run.result_captured")) {
          push(task.updated_at || "", "Result captured", short(result.summary, 180), "complete", 90);
        }
        allLogs.forEach((log) => {
          const type = String((log && log.type) || "event");
          if (teamTimelineHasTraceEquivalent(traceKinds, type)) return;
          const summary = String((log && log.summary) || "").trim();
          let title = humanizeTeamTimelineType(type);
          let copy = summary || "Runtime evidence recorded for this task.";
          let tone = "live";
          if (type === "task.created") {
            title = "Task created";
            copy = summary || "Supervisor recorded the task and queued it for Team Core.";
          } else if (type === "task.claimed") {
            title = "Worker claimed task";
            copy = summary || "A worker accepted the lease and became the active owner.";
          } else if (type === "task.assigned") {
            title = "Worker assigned";
            copy = summary || "Task prompt was delivered to the worker inbox.";
          } else if (type === "task.dispatch_started") {
            title = "Dispatch started";
            copy = summary || (runtime.pid ? ("Background Codex worker started with PID " + String(runtime.pid) + ".") : "Background Codex worker started for this task.");
          } else if (type === "task.thread_resolved") {
            title = "Thread resolved";
            copy = summary || "Pending team worker linked to a real Codex thread.";
          } else if (type === "task.dispatch_completed") {
            title = "Dispatch completed";
            copy = summary || "Worker finished the current dispatch turn.";
            tone = "complete";
          } else if (type === "task.dispatch_failed") {
            title = "Dispatch failed";
            copy = summary || runtime.last_error || "Worker reported a runtime failure.";
            tone = "warn";
          } else if (type === "task.dispatch_exited") {
            title = "Process exited early";
            copy = summary || runtime.last_error || "Background process exited before turn.completed.";
            tone = "warn";
          } else if (type === "task.retry_requested") {
            title = "Retry requested";
            copy = summary || "Supervisor requested another attempt for this task.";
          } else if (type === "task.retry_assigned") {
            title = "Retry assigned";
            copy = summary || "A fresh retry prompt was delivered to the worker.";
          } else if (type === "task.completed") {
            title = "Result captured";
            copy = summary || String(result.summary || "").trim() || "A result envelope was recorded for review.";
            tone = "complete";
          }
          push(log && log.timestamp, title, copy, tone, 50);
        });
        return items
          .sort((a, b) => {
            const timeA = Date.parse(a.timestamp || "") || 0;
            const timeB = Date.parse(b.timestamp || "") || 0;
            if (timeA !== timeB) return timeA - timeB;
            return Number(a.weight || 0) - Number(b.weight || 0);
          })
          .slice(-8);
      }

      function renderTeamTaskTimeline(task, logs) {
        const items = buildTeamTaskTimelineEvents(task, logs);
        const tracePreview = teamTracePreview(task);
        const traceNote = tracePreview.events.length
          ? '<span class="meta-pill">Trace-backed · ' + esc(tracePreview.lane || "task") + '</span>'
          : '<span class="meta-pill">Fallback timeline</span>';
        return '<div class="timeline-card phase-planning team-drawer-timeline">' +
          '<div class="timeline-header"><div class="timeline-title">Task Timeline</div><span>' + traceNote + '<span class="meta-pill">' + esc(String(items.length)) + '</span></span></div>' +
          '<div class="timeline-events">' +
            (items.length
              ? items.map((item) => renderTimelineEvent(item.title, item.timestamp ? formatTimestamp(item.timestamp) : "", item.copy, item.tone)).join("")
              : renderTimelineEvent("Waiting for runtime evidence", "", "No task events, runtime markers, or result signals are available yet.")) +
          '</div>' +
        '</div>';
      }

      function summarizeTeamTaskIssue(task, logs) {
        const status = String((task && task.status) || "");
        const runtime = task && task.runtime && typeof task.runtime === "object" ? task.runtime : {};
        const allLogs = Array.isArray(logs) ? logs : [];
        const blockedLog = allLogs.find((entry) => String((entry && entry.type) || "") === "task.blocked");
        const failedLog = allLogs.find((entry) => String((entry && entry.type) || "") === "task.dispatch_failed");
        const exitedLog = allLogs.find((entry) => String((entry && entry.type) || "") === "task.dispatch_exited");
        const errorText = String(
          runtime.last_error
          || runtime.error
          || (blockedLog && blockedLog.summary)
          || (failedLog && failedLog.summary)
          || (exitedLog && exitedLog.summary)
          || ""
        ).trim();
        const preflightKind = String(runtime.preflight_kind || (runtime.preflight && runtime.preflight.kind) || "").trim();
        const preflightDetail = String(runtime.preflight_detail || (runtime.preflight && runtime.preflight.detail) || errorText || "").trim();
        const preflightAction = String(runtime.preflight_action || (runtime.preflight && runtime.preflight.action) || "").trim();
        if ((status === "failed" || String(runtime.state || "") === "failed") && preflightKind) {
          const preflightTitle = preflightKind === "codex_cli_missing"
            ? "Preflight: Codex CLI missing"
            : preflightKind === "model_misconfigured"
              ? "Preflight: model misconfigured"
              : preflightKind === "codex_exec_unavailable"
                ? "Preflight: codex exec unavailable"
                : preflightKind === "workspace_missing"
                  ? "Preflight: workspace missing"
                  : "Preflight failed";
          return {
            tone: "warn",
            title: preflightTitle,
            detail: short(preflightDetail || "Dispatch preflight failed before worker evidence was available.", 180),
            action: preflightAction || "Fix the preflight issue, then retry in a new worker.",
          };
        }

        if (status === "blocked" && blockedLog) {
          return {
            tone: "warn",
            title: "Blocked: handoff needed",
            detail: short(blockedLog.summary || errorText || "The worker reported a blocker and needs a supervisor decision.", 180),
            action: "Review the blocker, then retry or hand off the next step.",
          };
        }
        if ((status === "blocked" || String(runtime.state || "") === "exited") && /before turn\.completed/i.test(errorText)) {
          return {
            tone: "warn",
            title: "Worker exited before finishing",
            detail: short(errorText || "Background Codex process exited before turn.completed.", 180),
            action: "Open Run Log, then retry in a new worker if the process does not recover.",
          };
        }
        if (status === "failed" && /(spawn error|ENOENT|not start|command not found|codex exec did not start)/i.test(errorText)) {
          return {
            tone: "warn",
            title: "Codex worker could not start",
            detail: short(errorText, 180),
            action: "Verify Codex CLI/runtime availability, then retry in a new worker.",
          };
        }
        if (status === "failed" && errorText) {
          return {
            tone: "warn",
            title: "Worker reported a runtime error",
            detail: short(errorText, 180),
            action: "Open Run Log, inspect the failing step, then retry.",
          };
        }
        if (status === "blocked" && errorText) {
          return {
            tone: "warn",
            title: "Task is blocked",
            detail: short(errorText, 180),
            action: "Review the blocker and decide whether to retry or hand off.",
          };
        }
        return null;
      }

      function renderTeamTaskIssueSummary(task, logs) {
        const issue = summarizeTeamTaskIssue(task, logs);
        if (!issue) return "";
        return '<div class="team-runtime-alert ' + esc(issue.tone || "warn") + '">' +
          '<div class="team-runtime-alert-head"><span class="team-role-label">Actionable Runtime Error</span><span class="meta-pill">' + esc(issue.title) + '</span></div>' +
          '<div class="team-runtime-alert-copy">' + esc(issue.detail) + '</div>' +
          '<div class="team-runtime-alert-action">' + esc(issue.action) + '</div>' +
        '</div>';
      }

      function renderTeamRuntimeSignalSummary(task, logs) {
        const runtime = task && task.runtime && typeof task.runtime === "object" ? task.runtime : {};
        const result = task && task.result && typeof task.result === "object" ? task.result : {};
        const tracePreview = teamTracePreview(task);
        const traceEvents = Array.isArray(tracePreview.events) ? tracePreview.events : [];
        const checksRun = Array.isArray(result.checks_run)
          ? result.checks_run
          : (Array.isArray(result.checksRun) ? result.checksRun : []);
        const traceFileSignals = traceEvents.filter((entry) => /file/i.test(String((entry && entry.kind) || ""))).length;
        const traceCommandSignals = traceEvents.filter((entry) => /command/i.test(String((entry && entry.kind) || ""))).length;
        const fileSignals = Math.max(Number(runtime.file_change_count || 0), traceFileSignals);
        const commandSignals = Math.max(Number(runtime.command_completed_count || 0), traceCommandSignals);
        const issue = summarizeTeamTaskIssue(task, logs);
        const lastError = String(
          runtime.last_error
          || runtime.error
          || (runtime.previous_runtime && runtime.previous_runtime.error)
          || runtime.preflight_detail
          || ""
        ).trim();
        return renderTeamAgentThreadCard("Runtime Signals", [
          agentThreadRow("Files", fileSignals > 0 ? String(fileSignals) : "none"),
          agentThreadRow("Commands", commandSignals > 0 ? String(commandSignals) : "none"),
          agentThreadRow("Checks", checksRun.length ? String(checksRun.length) : "none"),
          agentThreadRow("Last Error", lastError || (issue ? "See actionable error summary" : "none")),
        ]);
      }

      function renderTeamWorkspaceFailureRecovery(task, logs, workspaceId, ownerCanOpen) {
        const status = String((task && task.status) || "").toLowerCase();
        const runtime = task && task.runtime && typeof task.runtime === "object" ? task.runtime : {};
        const traces = teamTraceFiles(task);
        const tracePath = traces.run.path || traces.task.path || traces.thread.path || "";
        if (!["failed", "blocked"].includes(status) && !["failed", "error"].includes(String(runtime.state || "").toLowerCase())) return "";
        const taskId = String((task && task.task_id) || "");
        const originalPrompt = teamTaskInputValue(task, "prompt");
        const latestLog = Array.isArray(logs) && logs.length ? logs[0] : null;
        const latestLogText = String(
          runtime.log_tail
          || runtime.last_error
          || runtime.error
          || (latestLog && (latestLog.summary || latestLog.message || latestLog.type))
          || "No log tail captured yet."
        ).trim();
        const failurePrompt = [runtime.last_error || runtime.error || latestLogText, originalPrompt].filter(Boolean).join("\\n\\n");
        const actions = [
          '<button class="chip" data-team-workspace-page="' + esc(workspaceId) + '" type="button">Edit Task Definition</button>',
          ownerCanOpen ? '<button class="chip warn-chip" data-team-retry-task="' + esc(taskId) + '" data-team-retry-mode="same" type="button">Retry Same Thread</button>' : '',
          '<button class="chip warn-chip" data-team-retry-task="' + esc(taskId) + '" data-team-retry-mode="new" type="button">Retry New Worker</button>',
          runtime.log_path ? '<button class="chip" data-open-log="' + esc(runtime.log_path) + '" type="button">Open Run Log</button>' : '',
          tracePath ? '<button class="chip" data-open-log="' + esc(tracePath) + '" type="button">Open Trace</button>' : '',
          failurePrompt ? '<button class="chip" data-copy-text="' + esc(failurePrompt) + '" data-copy-label="Failure prompt" type="button">Copy Failure Prompt</button>' : '',
          '<button class="chip" data-team-delete-workspace="' + esc(workspaceId) + '" type="button">Archive</button>',
        ].filter(Boolean).join("");
        return renderTeamTaskIssueSummary(task, logs) +
          '<div class="team-row-copy"><span class="team-role-label">Latest Log</span><br />' + esc(short(latestLogText, 220)) + '</div>' +
          '<div class="team-row-actions">' + actions + '</div>';
      }

      function renderTeamTaskRow(task, dashboard, options = {}) {
        const status = String((task && task.status) || "queued");
        const owner = String((task && task.owner) || "");
        const ownerIsPendingTeamWorker = owner.startsWith("pending-team-worker-");
        const ownerCanOpen = Boolean(owner && !ownerIsPendingTeamWorker);
        const taskId = String((task && task.task_id) || "");
        const ownerLabel = teamThreadLabel(owner, dashboard);
        const logs = (options.taskLogs && taskId) ? (options.taskLogs[taskId] || []) : [];
        const cardProgress = teamTaskCardProgress(task, logs);
        const phase = inferTaskPhase(task, logs);
        const runtime = task && task.runtime && typeof task.runtime === "object" ? task.runtime : {};
        const retryState = describeTeamRetryState(runtime);
        const originalPrompt = String((((task && task.inputs) || []).find((item) => item && item.type === "prompt") || {}).value || "");
        const actions = owner ? [
          '<button class="chip primary" data-team-task-page="' + esc(taskId) + '" type="button">Open Task</button>',
          '<button class="chip" data-team-task-detail="' + esc(taskId) + '" type="button">Details</button>',
          (ownerCanOpen ? '<button class="chip" data-focus-thread="' + esc(owner) + '" type="button">Select</button>' : ''),
          (ownerCanOpen ? '<button class="chip" data-codex-thread="' + esc(owner) + '" type="button">Codex</button>' : ''),
          (ownerCanOpen ? '<button class="chip" data-open-codex-editor="' + esc(owner) + '" type="button">Editor</button>' : ''),
          (ownerCanOpen ? '<button class="chip" data-team-thread-action="claim" data-team-thread="' + esc(owner) + '" type="button">Claim</button>' : ''),
          (ownerCanOpen ? '<button class="chip" data-team-thread-action="heartbeat" data-team-thread="' + esc(owner) + '" type="button">Heartbeat</button>' : ''),
          (ownerCanOpen ? '<button class="chip warn-chip" data-team-thread-action="block" data-team-thread="' + esc(owner) + '" type="button">Block</button>' : ''),
          (ownerCanOpen ? '<button class="chip" data-team-thread-action="complete" data-team-thread="' + esc(owner) + '" type="button">Complete</button>' : ''),
          (runtime.log_path ? '<button class="chip" data-open-log="' + esc(runtime.log_path) + '" type="button">Run Log</button>' : ''),
          ((ownerCanOpen && (status === "failed" || status === "blocked")) ? '<button class="chip warn-chip" data-team-retry-task="' + esc(taskId) + '" data-team-retry-mode="same" type="button">Retry Same Thread</button>' : ''),
          (status === "failed" || status === "blocked" ? '<button class="chip" data-team-retry-task="' + esc(taskId) + '" data-team-retry-mode="new" type="button">Retry in New Worker</button>' : ''),
          (status !== "completed" ? '<button class="chip warn-chip" data-team-restart-task="' + esc(taskId) + '" type="button">' + esc(teamRunActionLabel(status)) + '</button>' : ''),
          '<button class="chip" data-team-delete-task="' + esc(taskId) + '" type="button">Archive</button>',
          (runtime.last_error ? '<button class="chip" data-copy-text="' + esc((runtime.last_error || "") + "\\n\\n" + originalPrompt) + '" data-copy-label="Failure prompt + original task prompt" type="button">Copy Failure + Prompt</button>' : '')
        ].join("") : "";
        return '<div class="team-row">' +
          '<div class="team-row-head">' +
            '<div class="team-row-title" title="' + esc((task && task.title) || taskId) + '">' + esc(short((task && task.title) || taskId || "Team task", 72)) + '</div>' +
            '<span class="team-phase-badge tone-' + esc(phase.tone) + '">' + esc(phase.label.toUpperCase()) + '</span>' +
            '<span class="badge ' + esc((status === "blocked" || status === "failed") ? "badge-recent" : status === "running" ? "badge-running" : "badge-linked") + '">' + esc(status.toUpperCase()) + '</span>' +
          '</div>' +
          '<div class="team-row-meta">' +
            '<span class="meta-pill mono">Task ' + esc(short(taskId, 16)) + '</span>' +
            '<span class="meta-pill">Owner ' + esc(ownerLabel || "-") + '</span>' +
            (ownerIsPendingTeamWorker ? '<span class="meta-pill">Thread resolving</span>' : (owner ? '<span class="meta-pill mono" title="' + esc(owner) + '">Thread ' + esc(short(owner, 28)) + '</span>' : '')) +
            (runtime.pid ? '<span class="meta-pill mono">PID ' + esc(String(runtime.pid)) + '</span>' : '') +
            (runtime.state ? '<span class="meta-pill">Dispatch ' + esc(String(runtime.state)) + '</span>' : '') +
            (runtime.model ? '<span class="meta-pill">Model ' + esc(short(runtime.model, 24)) + '</span>' : '') +
            (runtime.model_explicit === false ? '<span class="meta-pill">CLI default model</span>' : '') +
            (runtime.pid_running !== undefined ? '<span class="meta-pill">Process ' + esc(runtime.pid_running ? "alive" : "exited") + '</span>' : '') +
            (retryState.modeLabel ? '<span class="meta-pill">' + esc(retryState.modeLabel) + '</span>' : '') +
            (retryState.dispatchLabel ? '<span class="meta-pill">' + esc(retryState.dispatchLabel) + '</span>' : '') +
            ((task && task.lease_until) ? '<span class="meta-pill">Lease ' + esc(formatTimestamp(task.lease_until)) + '</span>' : '') +
          '</div>' +
          '<div class="team-progress">' +
            '<div class="team-progress-head"><span>' + esc(cardProgress.label) + '</span><span>' + esc(cardProgress.value) + '</span></div>' +
            '<div class="team-progress-track"><span style="width: ' + esc(String(Math.max(0, Math.min(100, cardProgress.percent)))) + '%"></span></div>' +
          '</div>' +
          '<div class="team-row-copy">' + esc(short((task && task.goal) || (task && task.result && task.result.summary) || "No goal recorded.", options.copyLength || 160)) + '</div>' +
          renderTeamTaskIssueSummary(task, logs) +
          renderTeamEvidenceChecklist(task, logs) +
          renderTeamMiniLogs(logs, "No task events or inbox messages yet.") +
          (actions ? '<div class="team-row-actions">' + actions + '</div>' : '') +
        '</div>';
      }

      function renderTeamAgentRow(agent, dashboard, options = {}) {
        const agentId = String((agent && agent.agent_id) || "agent");
        const agentIsPendingTeamWorker = agentId.startsWith("pending-team-worker-");
        const agentRuntime = (agent && agent.runtime && typeof agent.runtime === "object") ? agent.runtime : {};
        const candidateThreadIds = [
          agent && agent.thread_id,
          agent && agent.codex_thread_id,
          agentRuntime.thread_id,
          agentId,
        ].map((value) => String(value || "").trim()).filter(Boolean);
        const threadIds = new Set(((dashboard && dashboard.threads) || []).map((thread) => String((thread && thread.id) || "").trim()).filter(Boolean));
        const resolvedThreadId = candidateThreadIds.find((threadId) => threadIds.has(threadId)) || "";
        const rolePrompt = String((agent && (agent.role_prompt || agent.system_prompt || agent.prompt)) || "No role prompt set yet. Click Edit Role to describe this agent's function.");
        const hasThread = Boolean(resolvedThreadId);
        const logs = (options.agentLogs && agentId) ? (options.agentLogs[agentId] || []) : [];
        return '<div class="team-row">' +
          '<div class="team-row-head">' +
            '<div class="team-row-title">' + esc(short(agentId, 54)) + '</div>' +
            '<span class="badge badge-linked">' + esc(String((agent && agent.state) || "idle").toUpperCase()) + '</span>' +
          '</div>' +
          '<div class="team-row-meta">' +
            (agentIsPendingTeamWorker && !resolvedThreadId ? '<span class="meta-pill">Thread resolving</span>' : '<span class="meta-pill mono" title="' + esc(resolvedThreadId || agentId) + '">Thread ' + esc(short(resolvedThreadId || agentId, 28)) + '</span>') +
            (resolvedThreadId && resolvedThreadId !== agentId ? '<span class="meta-pill mono" title="' + esc(agentId) + '">Agent ' + esc(short(agentId, 22)) + '</span>' : '') +
            '<span class="meta-pill mono">Task ' + esc(short((agent && agent.current_task_id) || "-", 22)) + '</span>' +
            '<span class="meta-pill">Heartbeat ' + esc((agent && agent.heartbeat_at) ? formatTimestamp(agent.heartbeat_at) : "-") + '</span>' +
          '</div>' +
          '<div class="team-row-copy" title="' + esc(rolePrompt) + '"><span class="team-role-label">Role Prompt</span><br />' + esc(short(rolePrompt, 220)) + '</div>' +
          ((agent && agent.last_error) ? '<div class="team-row-copy"><span class="team-role-label">Last Error</span><br />' + esc(short(agent.last_error, 160)) + '</div>' : '') +
          renderTeamMiniLogs(logs, "No agent log entries yet.") +
          '<div class="team-row-actions">' +
            (hasThread ? '<button class="chip primary" data-focus-thread="' + esc(resolvedThreadId) + '" type="button">Agent Detail</button><button class="chip" data-codex-thread="' + esc(resolvedThreadId) + '" type="button">Codex</button><button class="chip" data-open-codex-editor="' + esc(resolvedThreadId) + '" type="button">Editor</button>' : '') +
            '<button class="chip" data-team-agent-action="edit_role" data-team-agent="' + esc(agentId) + '" type="button">Edit Role</button>' +
          '</div>' +
        '</div>';
      }

      function renderTeamEventRow(event) {
        const payload = event && event.payload && typeof event.payload === "object" ? event.payload : {};
        const reason = payload.reason || payload.summary || payload.title || payload.kind || "";
        return '<div class="team-row">' +
          '<div class="team-row-head">' +
            '<div class="team-row-title">' + esc(short((event && event.type) || "event", 54)) + '</div>' +
            '<span class="meta-pill">' + esc((event && event.timestamp) ? formatTimestamp(event.timestamp) : "-") + '</span>' +
          '</div>' +
          '<div class="team-row-meta">' +
            '<span class="meta-pill mono">Task ' + esc(short((event && event.task_id) || "-", 22)) + '</span>' +
            '<span class="meta-pill">Agent ' + esc(short((event && event.agent_id) || "-", 22)) + '</span>' +
          '</div>' +
          (reason ? '<div class="team-row-copy">' + esc(short(reason, 160)) + '</div>' : '') +
        '</div>';
      }

      function teamLaneDomId(rootKey, index) {
        const safe = String(rootKey || "team").replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "team";
`;
