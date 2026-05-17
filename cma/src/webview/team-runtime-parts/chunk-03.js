module.exports = `        return "teamBoardLane_" + String(index) + "_" + safe;
      }

      function teamThreadForOwner(owner, dashboard) {
        const id = String(owner || "").trim();
        if (!id) return undefined;
        return ((dashboard && dashboard.threads) || []).find((thread) => thread && thread.id === id);
      }

      function teamLaneKeyForOwner(owner, dashboard) {
        const id = String(owner || "").trim();
        if (id.startsWith("pending-team-worker-")) {
          return {
            key: "team:starting",
            label: "Starting Workers",
            title: "Dedicated workers waiting for Codex session id",
            note: "Dedicated workers launched from Team tasks before their live Codex thread id resolves.",
          };
        }
        const thread = teamThreadForOwner(owner, dashboard);
        if (!thread) {
          return {
            key: "team:unassigned",
            label: "Unassigned",
            title: "No matching workspace thread",
            note: "Mailbox records that do not currently map to a live thread in this board.",
          };
        }
        const key = threadRootKey(thread) || thread.cwd || "team:workspace";
        return {
          key,
          label: threadRootLabel(thread) || key,
          title: threadRootKey(thread) || key,
        };
      }

      function buildTeamDirectoryLanes(tasks, agents, dashboard) {
        const lanes = new Map();
        function ensureLane(meta) {
          const key = meta && meta.key ? String(meta.key) : "team:unassigned";
          if (!lanes.has(key)) {
            lanes.set(key, {
              key,
              label: (meta && meta.label) || "Unassigned",
              title: (meta && meta.title) || key,
              note: (meta && meta.note) || "",
              activeTasks: [],
              blockedTasks: [],
              agents: [],
            });
          }
          return lanes.get(key);
        }
        (tasks || []).forEach((task) => {
          const status = String((task && task.status) || "");
          const lane = ensureLane(teamLaneKeyForOwner(task && task.owner, dashboard));
          if (status === "blocked" || status === "failed") lane.blockedTasks.push(task);
          else if (["assigned", "running", "review", "queued", "stale"].includes(status)) lane.activeTasks.push(task);
        });
        (agents || []).forEach((agent) => {
          const lane = ensureLane(teamLaneKeyForOwner(agent && agent.agent_id, dashboard));
          lane.agents.push(agent);
        });
        return [...lanes.values()].sort((a, b) =>
          String(a.label || "").localeCompare(String(b.label || ""), undefined, { sensitivity: "base", numeric: true })
          || String(a.title || "").localeCompare(String(b.title || "")));
      }

      function renderTeamLaneSection(label, rows, emptyText) {
        return '<div class="team-lane-section">' +
          '<div class="team-lane-heading"><span>' + esc(label) + '</span><span class="meta-pill">' + esc(String((rows || []).length)) + '</span></div>' +
          ((rows || []).length ? rows.join("") : '<div class="team-lane-empty">' + esc(emptyText) + '</div>') +
        '</div>';
      }

      function renderTeamDirectoryLane(lane, dashboard, index, teamCoordination) {
        const accent = projectGroupAccent(lane.key);
        const count = (lane.activeTasks || []).length + (lane.blockedTasks || []).length + (lane.agents || []).length;
        const laneId = teamLaneDomId(lane.key, index);
        const logOptions = {
          taskLogs: (teamCoordination && teamCoordination.taskLogs) || {},
          agentLogs: (teamCoordination && teamCoordination.agentLogs) || {},
        };
        const activeRows = (lane.activeTasks || []).map((task) => renderTeamTaskRow(task, dashboard, { ...logOptions, copyLength: 130 }));
        const blockedRows = (lane.blockedTasks || []).map((task) => renderTeamTaskRow(task, dashboard, { ...logOptions, copyLength: 130 }));
        const agentRows = (lane.agents || []).map((agent) => renderTeamAgentRow(agent, dashboard, logOptions));
        return '<section class="board-project-section team-board-lane" style="--project-accent: ' + esc(accent) + '" data-team-board-lane="' + esc(lane.key) + '">' +
          '<div class="board-project-head">' +
            '<div class="board-project-title-stack">' +
              '<div class="board-project-title"><span class="board-project-dot"></span><span title="' + esc(lane.title || lane.label || "-") + '">' + esc(short(lane.label || lane.title || "-", 52)) + '</span></div>' +
              (lane.note ? '<div class="board-project-note">' + esc(lane.note) + '</div>' : '') +
            '</div>' +
            '<span class="board-project-count">' + esc(String(count)) + '</span>' +
          '</div>' +
          '<div id="' + esc(laneId) + '" class="running-board-grid team-board-lane-grid">' +
            renderTeamLaneSection("Active Tasks", activeRows, "No active tasks in this directory.") +
            renderTeamLaneSection("Blocked / Handoff", blockedRows, "No blocked tasks in this directory.") +
            renderTeamLaneSection("Agents", agentRows, "No agent records in this directory.") +
          '</div>' +
        '</section>';
      }

      function renderTeamEventsLane(events) {
        const seen = new Set();
        const recentEvents = [];
        (events || []).forEach((event) => {
          if (!event) return;
          const type = String(event.type || "event");
          const payload = event.payload && typeof event.payload === "object" ? event.payload : {};
          const dedupeKey = type === "team.initialized"
            ? "team.initialized"
            : [type, event.task_id || "", event.agent_id || "", payload.reason || payload.summary || payload.title || payload.kind || ""].join("|");
          if (seen.has(dedupeKey)) return;
          seen.add(dedupeKey);
          recentEvents.push(event);
        });
        recentEvents.splice(8);
        const rows = recentEvents.map((event) => renderTeamEventRow(event));
        return '<section class="board-project-section team-board-lane team-events-lane" style="--project-accent: rgba(196, 163, 255, 0.76)" data-team-board-lane="recent-events">' +
          '<div class="board-project-head">' +
            '<div class="board-project-title-stack">' +
              '<div class="board-project-title"><span class="board-project-dot"></span><span>Recent Events</span></div>' +
              '<div class="board-project-note">Mailbox history only. This lane does not accept task actions.</div>' +
            '</div>' +
            '<span class="board-project-count">' + esc(String(recentEvents.length)) + '</span>' +
          '</div>' +
          '<div class="running-board-grid team-board-lane-grid">' +
            renderTeamLaneSection("Latest Mailbox Events", rows, "No events yet.") +
          '</div>' +
        '</section>';
      }

      function findTeamTaskById(teamCoordination, taskId) {
        const id = String(taskId || "").trim();
        if (!id) return null;
        return (Array.isArray(teamCoordination && teamCoordination.tasks) ? teamCoordination.tasks : [])
          .find((task) => task && String(task.task_id || "") === id) || null;
      }

      function renderTeamTaskDefinition(task, originalPrompt) {
        const taskId = String((task && task.task_id) || "");
        const criteria = Array.isArray(task && task.acceptance_criteria)
          ? task.acceptance_criteria
          : (Array.isArray(task && task.acceptanceCriteria) ? task.acceptanceCriteria : []);
        const criteriaText = criteria.map((item) => String(item || "").trim()).filter(Boolean).join("\\n");
        return '<section class="panel team-panel-card wide">' +
          '<div class="section-title">Task Definition</div>' +
          '<h4 class="section-heading">Title</h4>' +
          '<input class="team-definition-input" data-team-definition-field="title" data-team-task-id="' + esc(taskId) + '" value="' + esc((task && task.title) || "Untitled Team task") + '" />' +
          '<h4 class="section-heading">Prompt</h4>' +
          '<textarea class="team-definition-textarea" data-team-definition-field="prompt" data-team-task-id="' + esc(taskId) + '" rows="7">' + esc(originalPrompt || "") + '</textarea>' +
          '<h4 class="section-heading">Acceptance Criteria</h4>' +
          '<textarea class="team-definition-textarea compact" data-team-definition-field="criteria" data-team-task-id="' + esc(taskId) + '" rows="4">' + esc(criteriaText) + '</textarea>' +
          '<div class="team-row-actions">' +
            '<button class="chip primary" data-team-definition-save="' + esc(taskId) + '" type="button">Save Definition</button>' +
            '<button class="chip" data-team-definition-cancel="' + esc(taskId) + '" type="button">Cancel</button>' +
            '<span class="meta-pill" data-team-definition-feedback="' + esc(taskId) + '">Ready</span>' +
          '</div>' +
        '</section>';
      }

      function teamResultItems(value) {
        if (Array.isArray(value)) {
          return value.map((item) => {
            if (item && typeof item === "object") return JSON.stringify(item);
            return String(item || "").trim();
          }).filter(Boolean);
        }
        const text = String(value || "").trim();
        return text ? [text] : [];
      }

      function renderTeamResultCard(title, items, emptyText) {
        const values = teamResultItems(items);
        return '<div class="team-agent-thread-card">' +
          '<div class="team-space-kicker">' + esc(title) + '</div>' +
          '<div class="team-agent-thread-rows">' +
            (values.length
              ? values.map((item, index) => '<div class="team-agent-thread-row"><span>' + esc(values.length > 1 ? ("#" + String(index + 1)) : "Value") + '</span><strong title="' + esc(item) + '">' + esc(short(item, 96)) + '</strong></div>').join("")
              : '<div class="team-lane-empty">' + esc(emptyText || "None reported.") + '</div>') +
          '</div>' +
        '</div>';
      }

      function renderTeamResultEnvelope(result) {
        if (!result || typeof result !== "object" || !Object.keys(result).length) {
          return '<div class="team-lane-empty">No result envelope recorded yet.</div>';
        }
        const summary = String(result.summary || result.message || result.status || "").trim();
        return '<div class="team-agent-thread-grid team-result-envelope">' +
          renderTeamResultCard("Summary", summary || "Result envelope recorded.", "No summary reported.") +
          renderTeamResultCard("Outputs", result.outputs, "No outputs reported.") +
          renderTeamResultCard("Checks run", result.checks_run || result.checksRun, "No checks reported.") +
          renderTeamResultCard("Open risks", result.open_risks || result.openRisks, "No open risks reported.") +
          renderTeamResultCard("Next request", result.next_request || result.nextRequest, "No next request reported.") +
        '</div>';
      }

      function renderAgentStatusBar(teamCoordination, task) {
        const agents = Array.isArray(teamCoordination && teamCoordination.agents) ? teamCoordination.agents : [];
        const taskId = String((task && task.task_id) || "");
        const owner = String((task && task.owner) || "");
        if (!agents.length) return "";
        const pills = agents.map((agent) => {
          const agentId = String((agent && agent.agent_id) || "");
          const state = String((agent && agent.state) || "idle").toLowerCase();
          const isOwner = agentId === owner;
          const progress = isOwner ? teamTaskCardProgress(task) : null;
          let tone = "pending";
          let icon = "\uD83E\uDD16";
          if (["completed", "done", "success"].includes(state)) { tone = "complete"; icon = "\u2705"; }
          else if (["running", "active", "dispatched", "in_progress"].includes(state)) { tone = "running"; icon = "\uD83D\uDFE2"; }
          else if (["blocked", "failed", "error", "stale"].includes(state)) { tone = "warn"; icon = "\u26A0\uFE0F"; }
          else if (state === "idle") { tone = "idle"; icon = "\uD83E\uDD16"; }
          const percentText = (progress && progress.percent !== undefined) ? (" \u00B7 " + progress.percent + "%") : "";
          return '<button class="agent-status-pill tone-' + esc(tone) + '" data-agent-pill="' + esc(agentId) + '" type="button">' +
            '<span class="agent-pill-icon">' + icon + '</span>' +
            '<span class="agent-pill-name">' + esc(agentId) + '</span>' +
            '<span class="agent-pill-sep">\u00B7</span>' +
            '<span class="agent-pill-state">' + esc(state.toUpperCase()) + '</span>' +
            esc(percentText) +
          '</button>';
        }).join("");
        return '<div class="team-agent-status-bar">' + pills + '</div>';
      }

      function renderTeamTaskWorkspace(teamCoordination, dashboard, task) {
        const taskId = String((task && task.task_id) || "");
        const owner = String((task && task.owner) || "");
        const status = String((task && task.status) || "queued");
        const runtime = task && task.runtime && typeof task.runtime === "object" ? task.runtime : {};
        const logs = teamCoordination && teamCoordination.taskLogs && taskId ? (teamCoordination.taskLogs[taskId] || []) : [];
        const originalPrompt = teamTaskInputValue(task, "prompt");
        const compiledPrompt = teamTaskInputValue(task, "compiled_prompt");
        const resultText = task && task.result ? JSON.stringify(task.result, null, 2) : "";
        const progress = teamTaskCardProgress(task, logs);
        const phase = inferTaskPhase(task, logs);
        const ownerCanOpen = Boolean(owner && !owner.startsWith("pending-team-worker-"));
        const actions = [
          '<button class="chip" data-team-task-page-back type="button">Back to Team</button>',
          '<button class="chip" data-team-task-detail="' + esc(taskId) + '" type="button">Details</button>',
          ownerCanOpen ? '<button class="chip" data-focus-thread="' + esc(owner) + '" type="button">Thread Detail</button>' : '',
          ownerCanOpen ? '<button class="chip" data-codex-thread="' + esc(owner) + '" type="button">Codex</button>' : '',
          ownerCanOpen ? '<button class="chip" data-open-codex-editor="' + esc(owner) + '" type="button">Editor</button>' : '',
          runtime.log_path ? '<button class="chip" data-open-log="' + esc(runtime.log_path) + '" type="button">Run Log</button>' : '',
          status !== "completed" ? '<button class="chip warn-chip" data-team-restart-task="' + esc(taskId) + '" type="button">' + esc(teamRunActionLabel(status)) + '</button>' : '',
          '<button class="chip" data-team-delete-task="' + esc(taskId) + '" type="button">Archive</button>',
        ].filter(Boolean).join("");
        return '<div class="team-task-workspace">' +
          '<div class="team-task-workspace-head">' +
            '<div>' +
              '<div class="section-title">' + esc((task && task.title) || "Team task") + ' <span class="team-phase-badge tone-' + esc(phase.tone) + '">' + esc(phase.label.toUpperCase()) + '</span></div>' +
              '<div class="section-note">' + esc(short((task && task.goal) || "No goal recorded.", 220)) + '</div>' +
            '</div>' +
            '<div class="chip-row">' + actions + '</div>' +
          '</div>' +
          '<div class="drawer-summary">' +
            drawerStat("Status", status.toUpperCase()) +
            drawerStat("Progress", progress.label) +
            drawerStat("Evidence", progress.value) +
            drawerStat("Owner", teamThreadLabel(owner, dashboard) || "-") +
            drawerStat("PID", runtime.pid ? String(runtime.pid) : "-") +
            drawerStat("Process", runtime.pid_running === undefined ? "-" : (runtime.pid_running ? "alive" : "exited")) +
          '</div>' +
          renderTeamStatusChain(teamCoordination, dashboard, task) +
          '<div class="team-task-workspace-grid">' +
            renderTeamAgentsThreads(teamCoordination, dashboard, task) +
            '<section class="panel team-panel-card">' +
              '<div class="section-title">Run Evidence</div>' +
              '<div class="team-progress">' +
                '<div class="team-progress-head"><span>' + esc(progress.label) + '</span><span>' + esc(progress.value) + '</span></div>' +
                '<div class="team-progress-track"><span style="width: ' + esc(String(Math.max(0, Math.min(100, progress.percent)))) + '%"></span></div>' +
              '</div>' +
              renderTeamRuntimeSignalSummary(task, logs) +
              renderTeamEvidenceChecklist(task, logs) +
              renderTeamTaskIssueSummary(task, logs) +
            '</section>' +
            '<section class="panel team-panel-card">' +
              '<div class="section-title">Task Timeline</div>' +
              renderTeamTaskTimeline(task, logs) +
            '</section>' +
            '<section class="panel team-panel-card">' +
              '<div class="section-title">Trace</div>' +
              renderTeamTraceEvidence(task) +
            '</section>' +
            '<section class="panel team-panel-card">' +
              '<div class="section-title">Recent Log</div>' +
              renderTeamMiniLogs(logs, "No task events or inbox messages yet.") +
            '</section>' +
            renderTeamTaskDefinition(task, originalPrompt) +
            renderTeamOrchestrationSummary(task) +
            '<section class="panel team-panel-card wide">' +
              '<div class="section-title">Result</div>' +
              renderTeamResultEnvelope(task && task.result) +
            '</section>' +
            '<details class="panel team-panel-card wide team-diagnostics">' +
              '<summary>Advanced</summary>' +
              '<div class="section-note">Raw runtime and compiled prompt are kept here for audit/debugging without crowding the default Team Space view.</div>' +
              '<h4 class="section-heading">Runtime JSON</h4>' +
              '<pre class="team-drawer-pre tall">' + esc(JSON.stringify(runtime || {}, null, 2)) + '</pre>' +
              (resultText ? '<h4 class="section-heading">Raw Result JSON</h4><pre class="team-drawer-pre tall">' + esc(resultText) + '</pre>' : '') +
              (compiledPrompt ? '<h4 class="section-heading">Compiled Prompt</h4><pre class="team-drawer-pre tall">' + esc(compiledPrompt) + '</pre>' : '') +
            '</details>' +
          '</div>' +
          renderAgentStatusBar(teamCoordination, task) +
        '</div>';
      }

      function findTeamWorkspaceById(teamCoordination, workspaceId) {
        const id = String(workspaceId || "").trim();
        if (!id) return null;
        return (Array.isArray(teamCoordination && teamCoordination.workspaces) ? teamCoordination.workspaces : [])
          .find((workspace) => workspace && String(workspace.workspace_id || "") === id) || null;
      }

      function collectTeamTaskRuntimeChain(runtime) {
        const chain = [];
        let current = runtime && typeof runtime === "object" ? runtime : null;
        const seen = new Set();
        while (current && typeof current === "object" && chain.length < 6) {
          const runId = String(current.run_id || "");
          const key = runId || JSON.stringify({
            state: current.state || "",
            pid: current.pid || "",
            log_path: current.log_path || "",
            updated_at: current.updated_at || "",
          });
          if (seen.has(key)) break;
          seen.add(key);
          chain.push(current);
          current = current.previous_runtime && typeof current.previous_runtime === "object" ? current.previous_runtime : null;
        }
        return chain;
      }

      function teamStatusChainStepClass(state) {
        const normalized = String(state || "").toLowerCase();
        if (["completed", "done", "ok", "alive"].includes(normalized)) return "done";
        if (["running", "in_progress", "active"].includes(normalized)) return "running";
        if (["failed", "blocked", "error", "exited"].includes(normalized)) return "warn";
        return "pending";
      }

      function renderTeamStatusChain(teamCoordination, dashboard, task) {
        const taskId = String((task && task.task_id) || "");
        const owner = String((task && task.owner) || "");
        const runtime = task && task.runtime && typeof task.runtime === "object" ? task.runtime : {};
        const tracePreview = teamTracePreview(task);
        const traceEvents = Array.isArray(tracePreview && tracePreview.events) ? tracePreview.events : [];
        const traceFiles = teamTraceFiles(task);
        const traceFileCount = [traceFiles.task, traceFiles.run, traceFiles.thread].filter((entry) => entry && entry.exists).length;
        const traceSeen = traceEvents.length > 0 || traceFileCount > 0;
        const agents = Array.isArray(teamCoordination && teamCoordination.agents) ? teamCoordination.agents : [];
        const threads = Array.isArray(dashboard && dashboard.threads) ? dashboard.threads : [];
        const worker = agents.find((agent) => agent && String(agent.agent_id || "") === owner)
          || agents.find((agent) => agent && String(agent.current_task_id || "") === taskId && String(agent.agent_id || "") !== "supervisor")
          || null;
        const threadId = String(runtime.thread_id || owner || "").trim();
        const liveThread = threadId && threads.some((thread) => String((thread && thread.id) || "") === threadId);
        const hasResult = Boolean(task && task.result && typeof task.result === "object" && Object.keys(task.result).length);
        const resultState = hasResult ? String((task.result && (task.result.status || task.result.state)) || "completed") : "";
        const resultSummary = hasResult
          ? short(String((task.result && (task.result.summary || task.result.message || task.result.status)) || "Result envelope recorded"), 70)
          : (String((task && task.status) || "") === "completed" ? "Completed without result envelope" : "Waiting for worker result");
        const runState = String(runtime.state || (runtime.run_id ? "recorded" : "pending"));
        const steps = [
          {
            label: "Task",
            state: String((task && task.status) || "queued"),
            value: short((task && task.title) || taskId || "Untitled task", 70),
            detail: taskId || "No task id",
          },
          {
            label: "Worker",
            state: String((worker && worker.state) || (owner ? "assigned" : "pending")),
            value: worker ? String(worker.agent_id || owner) : (owner || "Pending worker"),
            detail: worker && worker.heartbeat_at ? "Heartbeat " + formatTimestamp(worker.heartbeat_at) : "No heartbeat evidence yet",
          },
          {
            label: "Thread",
            state: liveThread ? "alive" : (threadId ? "linked" : "pending"),
            value: threadId || "Resolving thread",
            detail: liveThread ? "Visible in thread board" : (threadId ? "Thread id recorded" : "No thread evidence yet"),
          },
          {
            label: "Run",
            state: runState,
            value: runtime.run_id ? String(runtime.run_id) : "No run yet",
            detail: runtime.pid ? ("PID " + String(runtime.pid) + (runtime.pid_running === undefined ? "" : runtime.pid_running ? " alive" : " exited")) : "No process evidence yet",
          },
          {
            label: "Trace",
            state: traceSeen ? "completed" : "pending",
            value: traceEvents.length
              ? (String(traceEvents.length) + " trace events")
              : (traceFileCount ? (String(traceFileCount) + " trace files") : "No trace evidence yet"),
            detail: traceEvents.length
              ? ("Preview lane " + String(tracePreview.lane || "task"))
              : (traceFileCount ? "Trace files recorded" : "Trace will appear after run activity"),
          },
          {
            label: "Result",
            state: resultState || String((task && task.status) || "pending"),
            value: resultSummary,
            detail: hasResult ? "Result envelope recorded" : "No result envelope yet",
          },
        ];
        return '<section class="team-status-chain" aria-label="Team Space status chain">' +
          steps.map((step) => '<div class="team-status-step ' + esc(teamStatusChainStepClass(step.state)) + '">' +
            '<div class="team-status-step-head">' +
              '<span class="team-status-dot"></span>' +
              '<span class="team-status-label">' + esc(step.label) + '</span>' +
              '<span class="team-status-state">' + esc(String(step.state || "pending").toUpperCase()) + '</span>' +
            '</div>' +
            '<div class="team-status-value" title="' + esc(step.value || "-") + '">' + esc(short(step.value || "-", 48)) + '</div>' +
            '<div class="team-status-detail">' + esc(step.detail || "-") + '</div>' +
          '</div>').join("") +
        '</section>';
      }

      function renderTeamAgentThreadCard(title, rows, actions = "") {
        return '<div class="team-agent-thread-card">' +
          '<div class="team-space-kicker">' + esc(title) + '</div>' +
          '<div class="team-agent-thread-rows">' + rows.filter(Boolean).join("") + '</div>' +
          (actions ? '<div class="team-row-actions">' + actions + '</div>' : '') +
        '</div>';
      }

      function agentThreadRow(label, value, mono = false) {
        return '<div class="team-agent-thread-row">' +
          '<span>' + esc(label) + '</span>' +
          '<strong' + (mono ? ' class="mono"' : '') + ' title="' + esc(value || "-") + '">' + esc(short(value || "-", 54)) + '</strong>' +
        '</div>';
      }

      function renderTeamRunHistoryTimeline(runtimeChain) {
        const runs = Array.isArray(runtimeChain) ? runtimeChain : [];
        if (!runs.length) {
          return renderTeamAgentThreadCard("Run History", [agentThreadRow("Run", "No run recorded yet")]);
        }
        return '<div class="team-agent-thread-card team-run-history">' +
          '<div class="team-space-kicker">Run History</div>' +
          '<div class="team-agent-thread-rows">' +
            runs.map((item, index) => {
              const label = index === 0 ? "Latest Run" : ("Previous Run " + String(index));
              const startedText = item.started_at || "-";
              const updatedText = item.updated_at || "-";
              const pidText = item.pid ? String(item.pid) : "-";
              const processText = item.pid_running === true
                ? "alive"
                : item.pid_running === false
                  ? "exited"
                  : (item.state ? String(item.state) : "-");
              const modelText = item.model || (item.model_explicit === false ? "CLI default model" : "-");
              const summaryText = item.error || item.last_error || item.preflight_detail || item.result_summary || "-";
              return '<div class="team-run-history-row ' + esc(teamStatusChainStepClass(item.state)) + '">' +
                '<div class="team-agent-thread-row"><span>' + esc(label) + '</span><strong class="mono" title="' + esc(item.run_id || "-") + '">' + esc(short(item.run_id || "-", 54)) + '</strong></div>' +
                agentThreadRow("State", String(item.state || "-")) +
                agentThreadRow("Started", String(startedText)) +
                agentThreadRow("Updated", String(updatedText)) +
                agentThreadRow("PID", pidText) +
                agentThreadRow("Process", processText) +
                agentThreadRow("Model", modelText) +
                agentThreadRow("Summary", summaryText) +
                (item.log_path ? '<div class="team-row-actions"><button class="chip" data-open-log="' + esc(item.log_path) + '" type="button">Run Log</button></div>' : '') +
              '</div>';
            }).join("") +
          '</div>' +
        '</div>';
      }

      function renderTeamAgentsThreads(teamCoordination, dashboard, task) {
        const taskId = String((task && task.task_id) || "");
        const owner = String((task && task.owner) || "");
        const runtime = task && task.runtime && typeof task.runtime === "object" ? task.runtime : {};
        const agents = Array.isArray(teamCoordination && teamCoordination.agents) ? teamCoordination.agents : [];
        const threads = Array.isArray(dashboard && dashboard.threads) ? dashboard.threads : [];
        const supervisor = agents.find((agent) => agent && agent.agent_id === "supervisor") || { agent_id: "supervisor", state: "idle" };
        const worker = agents.find((agent) => agent && String(agent.agent_id || "") === owner)
          || agents.find((agent) => agent && String(agent.current_task_id || "") === taskId && String(agent.agent_id || "") !== "supervisor")
`;
