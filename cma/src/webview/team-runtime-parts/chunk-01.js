module.exports = `      function renderTeamHealthBadge(teamCoordination) {
        if (!teamCoordination || !teamCoordination.available) {
          return '<span class="team-health-badge off" title="Team space is not initialized for this workspace."><span class="team-health-dot"></span><span>Team Off</span></span>';
        }
        const readiness = teamCoordination.readiness || {};
        if (readiness.ok === false) {
          const requiredPassed = Number(readiness.requiredPassed || 0);
          const requiredCount = Number(readiness.requiredCount || 0);
          return '<span class="team-health-badge warn" title="Team required checks are incomplete."><span class="team-health-dot"></span><span>Team Setup</span><span class="mono">' + esc(String(requiredPassed)) + '/' + esc(String(requiredCount)) + '</span></span>';
        }
        const validation = teamCoordination.validation || {};
        const invalidTasks = Number(validation.invalidTaskCount || 0);
        const invalidEvents = Number(validation.invalidEventCount || 0);
        const invalidInbox = Number(validation.invalidInboxMessageCount || 0);
        const invalidAgents = Number(validation.invalidAgentCount || 0);
        const issueCount = invalidTasks + invalidEvents + invalidInbox + invalidAgents;
        const title = [
          'Invalid tasks: ' + invalidTasks,
          'Invalid events: ' + invalidEvents,
          'Invalid inbox: ' + invalidInbox,
          'Invalid agents: ' + invalidAgents
        ].join(' · ');
        if (!issueCount && validation.ok !== false) {
          return '<span class="team-health-badge ok" title="' + esc(title) + '"><span class="team-health-dot"></span><span>Team OK</span><span class="mono">0 issues</span></span>';
        }
        return '<span class="team-health-badge warn" title="' + esc(title) + '"><span class="team-health-dot"></span><span>Team Issues</span><span class="mono">Task ' + esc(String(invalidTasks)) + '</span><span class="mono">Event ' + esc(String(invalidEvents)) + '</span><span class="mono">Inbox ' + esc(String(invalidInbox)) + '</span></span>';
      }

      function renderReadinessItem(check, options = {}) {
        const ok = Boolean(check && check.ok);
        const tone = ok ? "ok" : (options.required ? "warn" : "muted");
        const marker = ok ? "OK" : (options.required ? "Need" : "Later");
        return '<div class="team-readiness-item ' + esc(tone) + '">' +
          '<span class="team-readiness-marker">' + esc(marker) + '</span>' +
          '<span class="team-readiness-main">' +
            '<span class="team-readiness-label">' + esc((check && check.label) || "-") + '</span>' +
            '<span class="team-readiness-detail">' + esc((check && check.detail) || "") + '</span>' +
          '</span>' +
        '</div>';
      }

      function renderReadinessActionItem(check, index) {
        const label = String((check && check.label) || "Setup item");
        const detail = String((check && check.detail) || "Complete this setup step before running Team work.");
        return '<div class="team-readiness-action">' +
          '<span class="team-readiness-action-index">' + esc(String(index + 1)) + '</span>' +
          '<span class="team-readiness-main">' +
            '<span class="team-readiness-label">' + esc(label) + '</span>' +
            '<span class="team-readiness-detail">' + esc(detail) + '</span>' +
          '</span>' +
        '</div>';
      }

      function buildTeamTrustChecklist(teamCoordination, bundledSkills, serviceMetadata) {
        const readiness = (teamCoordination && teamCoordination.readiness) || {};
        const checks = Array.isArray(readiness.checks) ? readiness.checks : [];
        const checkMap = new Map(checks.map((check) => [check && check.id, check]));
        const tasks = Array.isArray(teamCoordination && teamCoordination.tasks) ? teamCoordination.tasks : [];
        const runtimeTasks = tasks
          .map((task) => task && task.runtime && typeof task.runtime === "object" ? task.runtime : null)
          .filter(Boolean);
        const requiredPassed = Number(readiness.requiredPassed || checks.filter((check) => check && check.level !== "operational" && check.ok).length);
        const requiredCount = Number(readiness.requiredCount || checks.filter((check) => check && check.level !== "operational").length);
        const skill = bundledSkillByName(bundledSkills, "team-reflective-loop");
        const skillInstalled = Boolean(skill && skill.installed);
        const skillUpdateAvailable = Boolean(skill && skill.updateAvailable);
        const explicitModel = runtimeTasks.find((runtime) => String(runtime.model || "").trim());
        const cliDefaultModel = runtimeTasks.find((runtime) => runtime.model_explicit === false);
        const cliBackedRuntime = runtimeTasks.find((runtime) => runtime.log_path || runtime.pid || runtime.command_kind);
        const backendReady = Boolean(serviceMetadata && serviceMetadata.ok && !serviceMetadata.readOnly && serviceMetadata.backendMode !== "unavailable");
        const workspaceReady = ["workspace", "mailbox", "metadata", "directories", "brief"].every((id) => {
          const check = checkMap.get(id);
          return Boolean(check && check.ok);
        });
        return [
          {
            label: "Team Core ready",
            ok: Boolean(readiness.ok),
            detail: readiness.ok
              ? (String(requiredPassed) + "/" + String(requiredCount) + " required checks passed.")
              : "Complete Team Core setup checks first.",
          },
          {
            label: "Codex CLI available",
            ok: Boolean(cliBackedRuntime || backendReady),
            detail: cliBackedRuntime
              ? "Seen in Team task runtime."
              : (backendReady ? "Backend connected; CLI-backed Team actions are available." : "No CLI-backed Team runtime confirmed yet."),
          },
          {
            label: "Workspace initialized",
            ok: workspaceReady,
            detail: workspaceReady
              ? "Mailbox, metadata, and required folders are present."
              : "Initialize Team mailbox files for this workspace.",
          },
          {
            label: "Model explicit or CLI default",
            ok: Boolean(explicitModel || cliDefaultModel || backendReady),
            detail: explicitModel
              ? ("Explicit model: " + explicitModel.model)
              : (cliDefaultModel
                  ? "CLI default model recorded in Team runtime."
                  : (backendReady ? "No explicit model recorded yet; Team will use CLI default." : "No model source confirmed yet.")),
          },
          {
            label: "Optional reflective skill",
            ok: skillInstalled,
            required: false,
            detail: skillInstalled
              ? ("Installed " + (skill.installedVersion || ""))
              : (skillUpdateAvailable ? "Bundled update available." : "Optional. Team Core still runs without it."),
          },
        ];
      }

      function renderTeamReadinessCard(teamCoordination, bundledSkills, serviceMetadata) {
        const readiness = (teamCoordination && teamCoordination.readiness) || {};
        const checks = Array.isArray(readiness.checks) ? readiness.checks : [];
        const requiredChecks = checks.filter((check) => check && check.level !== "operational");
        const operationalChecks = checks.filter((check) => check && check.level === "operational");
        const skill = bundledSkillByName(bundledSkills, "team-reflective-loop");
        const skillInstalled = Boolean(skill && skill.installed);
        const skillCheck = {
          label: "Optional reflective skill",
          ok: skillInstalled,
          detail: skillInstalled
            ? ("Installed " + (skill.installedVersion || ""))
            : "Not required. Built-in Team Core still handles tasks, workers, and retry flow.",
        };
        const usable = Boolean(readiness.ok);
        const runnable = usable && Boolean(readiness.operational);
        const title = runnable
          ? "Team Ready"
          : (usable ? "Team Usable" : "Team Setup Needed");
        const summary = runnable
          ? "Core, agents, and task flow are ready."
          : (usable ? "Core is ready. Add or claim a task to start work." : "Complete required Team Core checks first.");
        const requiredPassed = Number(readiness.requiredPassed || requiredChecks.filter((check) => check && check.ok).length);
        const requiredCount = Number(readiness.requiredCount || requiredChecks.length);
        const operationalPassed = Number(readiness.operationalPassed || operationalChecks.filter((check) => check && check.ok).length);
        const operationalCount = Number(readiness.operationalCount || operationalChecks.length);
        const trustChecklist = buildTeamTrustChecklist(teamCoordination, bundledSkills, serviceMetadata);
        const failedRequired = requiredChecks.filter((check) => check && !check.ok);
        const failedOperational = operationalChecks.filter((check) => check && !check.ok);
        const trustBlockers = trustChecklist.filter((check) => check && check.required !== false && !check.ok);
        const blockerKeys = new Set();
        const allBlockers = trustBlockers.concat(failedRequired, failedOperational).filter((check) => {
          const key = String((check && (check.id || check.label)) || "");
          if (!key || blockerKeys.has(key)) return false;
          blockerKeys.add(key);
          return true;
        });
        const visibleBlockers = allBlockers.slice(0, 4);
        const hiddenDetailCount = Math.max(0, allBlockers.length - visibleBlockers.length);
        const tone = runnable ? "ok" : (usable ? "warn" : "off");
        const primaryBlocker = visibleBlockers[0] || null;
        return '<div class="panel team-panel-card wide team-readiness-card">' +
          '<div class="team-readiness-head">' +
            '<div>' +
              '<div class="section-title">Team Readiness</div>' +
              '<div class="section-note">' + esc(summary) + '</div>' +
            '</div>' +
            '<span class="team-readiness-pill ' + esc(tone) + '">' + esc(title) + '</span>' +
          '</div>' +
          '<div class="team-readiness-focus ' + esc(tone) + '">' +
            '<div class="team-readiness-focus-main">' +
              '<div class="team-readiness-focus-kicker">Current focus</div>' +
              '<div class="team-readiness-focus-title">' + esc(title) + '</div>' +
              '<div class="team-readiness-focus-copy">' + esc(summary) + '</div>' +
            '</div>' +
            '<div class="team-readiness-focus-next">' +
              '<div class="team-readiness-focus-kicker">Next action</div>' +
              '<div class="team-readiness-focus-next-title">' + esc(primaryBlocker ? primaryBlocker.label : "Start or assign work") + '</div>' +
              '<div class="team-readiness-focus-copy">' + esc(primaryBlocker ? primaryBlocker.detail : "Team setup is clean enough for normal workspace flow.") + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="team-readiness-overview">' +
            '<div class="team-readiness-score ' + esc(requiredPassed >= requiredCount && requiredCount ? "ok" : "warn") + '">' +
              '<span>Required</span><strong>' + esc(String(requiredPassed)) + '/' + esc(String(requiredCount)) + '</strong>' +
            '</div>' +
            '<div class="team-readiness-score ' + esc(skillInstalled ? "ok" : "muted") + '">' +
              '<span>Reflective Skill</span><strong>' + esc(skillInstalled ? "Installed" : "Optional") + '</strong>' +
            '</div>' +
            '<div class="team-readiness-score ' + esc(operationalPassed >= operationalCount && operationalCount ? "ok" : "warn") + '">' +
              '<span>Operational</span><strong>' + esc(String(operationalPassed)) + '/' + esc(String(operationalCount)) + '</strong>' +
            '</div>' +
          '</div>' +
          '<div class="team-readiness-next">' +
            '<div class="team-lane-heading"><span>' + esc(visibleBlockers.length ? "Next Setup Actions" : "No Setup Actions") + '</span>' + (hiddenDetailCount ? '<span class="meta-pill">+' + esc(String(hiddenDetailCount)) + '</span>' : '') + '</div>' +
            '<div class="team-readiness-actions">' +
              (visibleBlockers.length ? visibleBlockers.map((check, index) => renderReadinessActionItem(check, index)).join("") : '<div class="team-lane-empty">Team setup is clean enough for normal work.</div>') +
            '</div>' +
          '</div>' +
          '<details class="team-readiness-details">' +
            '<summary><span>Setup details</span><span class="meta-pill">' + esc(String(checks.length + trustChecklist.length + 1)) + '</span></summary>' +
            '<div class="team-readiness-trust">' +
              '<div class="team-lane-heading"><span>Trust Checklist</span><span class="meta-pill">' + esc(String(trustChecklist.length)) + '</span></div>' +
              '<div class="team-readiness-trust-grid">' +
                trustChecklist.map((check) => renderReadinessItem(check, { required: check.required !== false })).join("") +
              '</div>' +
            '</div>' +
            '<div class="team-readiness-grid">' +
              '<div class="team-readiness-column">' +
                '<div class="team-lane-heading"><span>Required</span><span class="meta-pill">' + esc(String(requiredPassed)) + '/' + esc(String(requiredCount)) + '</span></div>' +
                (requiredChecks.length ? requiredChecks.map((check) => renderReadinessItem(check, { required: true })).join("") : '<div class="team-lane-empty">No required checks reported yet.</div>') +
              '</div>' +
              '<div class="team-readiness-column">' +
                '<div class="team-lane-heading"><span>Runtime</span><span class="meta-pill">' + esc(String(operationalPassed)) + '/' + esc(String(operationalCount)) + '</span></div>' +
                (operationalChecks.length ? operationalChecks.map((check) => renderReadinessItem(check, { required: false })).join("") : '<div class="team-lane-empty">Initialize Team to report operational signals.</div>') +
                renderReadinessItem(skillCheck, { required: false }) +
              '</div>' +
            '</div>' +
          '</details>' +
        '</div>';
      }

      function teamThreadLabel(threadId, dashboard) {
        const id = String(threadId || "");
        if (id.startsWith("pending-team-worker-")) return "Starting worker";
        const thread = ((dashboard && dashboard.threads) || []).find((item) => item && item.id === id);
        return thread ? short(thread.title || thread.id || id, 46) : short(id || "unassigned", 28);
      }

      function teamTaskProgress(task) {
        const status = String((task && task.status) || "queued");
        const result = task && task.result && typeof task.result === "object" ? task.result : null;
        const runtime = task && task.runtime && typeof task.runtime === "object" ? task.runtime : null;
        const runtimeProgress = runtime ? Number(runtime.progress_percent || 0) : 0;
        if (runtimeProgress > 0) {
          const runtimeState = String(runtime.state || status || "running");
          return { percent: Math.max(0, Math.min(100, runtimeProgress)), label: runtimeState.charAt(0).toUpperCase() + runtimeState.slice(1) };
        }
        if (status === "completed") return { percent: 100, label: "Completed" };
        if (status === "failed") return { percent: 100, label: "Failed" };
        if (status === "review") return { percent: 82, label: "Review" };
        if (status === "running") return { percent: result ? 72 : 55, label: result ? "Result reported" : "Running" };
        if (status === "blocked") return { percent: 42, label: "Blocked" };
        if (status === "assigned") return { percent: 28, label: "Assigned" };
        if (status === "stale") return { percent: 20, label: "Stale" };
        return { percent: 12, label: "Queued" };
      }

      function collectTeamTaskEvidence(task, logs) {
        const runtime = task && task.runtime && typeof task.runtime === "object" ? task.runtime : {};
        const result = task && task.result && typeof task.result === "object" ? task.result : {};
        const taskLogs = Array.isArray(logs) ? logs : [];
        const tracePreview = teamTracePreview(task);
        const traceEvents = Array.isArray(tracePreview.events) ? tracePreview.events : [];
        const traceKinds = new Set(traceEvents.map((entry) => String((entry && entry.kind) || "").trim()).filter(Boolean));
        const taskOwner = String((task && task.owner) || "");
        const taskStatus = String((task && task.status) || "");
        const runtimeState = String(runtime.state || "");
        const checksRun = Array.isArray(result.checks_run) ? result.checks_run : [];
        const outputs = Array.isArray(result.outputs) ? result.outputs : [];
        function hasTraceKind(kinds) {
          return (Array.isArray(kinds) ? kinds : []).some((kind) => traceKinds.has(String(kind || "")));
        }
        function latestTraceEvent(kinds) {
          const targets = new Set((Array.isArray(kinds) ? kinds : []).map((kind) => String(kind || "")));
          return traceEvents.slice().reverse().find((entry) => targets.has(String((entry && entry.kind) || ""))) || null;
        }
        const hasLogActivity = Number(runtime.log_line_count || 0) > 0
          || Number(runtime.item_completed_count || 0) > 0
          || Number(runtime.command_completed_count || 0) > 0
          || Number(runtime.file_change_count || 0) > 0
          || Boolean(String(runtime.last_message || "").trim())
          || taskLogs.some((entry) => String((entry && entry.type) || "").trim());
        const createdSeen = Boolean(task && task.created_at) || hasTraceKind(["task.created"]);
        const traceDispatchStarted = hasTraceKind(["run.dispatch_started", "task.retry_started"]);
        const dispatchStarted = traceDispatchStarted || Boolean(
          String(runtime.started_at || "").trim()
          || runtimeState
          || taskLogs.some((entry) => /^task\.(dispatch_|retry_)/.test(String((entry && entry.type) || "")))
        );
        const tracePidRecorded = hasTraceKind(["run.pid_recorded"]);
        const pidSeen = tracePidRecorded || Number(runtime.pid || 0) > 0;
        const traceThreadResolved = hasTraceKind(["thread.resolved"]);
        const threadResolved = traceThreadResolved || Boolean(
          String(runtime.thread_id || "").trim()
          || (taskOwner && !taskOwner.startsWith("pending-team-worker-"))
        );
        const traceProcessEvent = latestTraceEvent(["run.process_state_changed", "run.result_captured", "task.failed"]);
        const processState = runtime.pid_running === true
          ? "alive"
          : ((runtime.pid_running === false || ["completed", "failed", "exited", "blocked"].includes(runtimeState) || ["completed", "failed", "blocked", "review"].includes(taskStatus))
            ? "exited"
            : (traceProcessEvent
              ? (String((traceProcessEvent && traceProcessEvent.status) || "").trim()
                || (String((traceProcessEvent && traceProcessEvent.kind) || "") === "run.result_captured" ? "completed" : "trace"))
              : ""));
        const traceResultSeen = hasTraceKind(["run.result_captured", "task.failed"]);
        const resultSeen = traceResultSeen || Boolean(
          String(result.summary || "").trim()
          || checksRun.length
          || outputs.length
          || Number(runtime.file_change_count || 0) > 0
        );
        const activitySeen = resultSeen || hasLogActivity || traceEvents.length > 0;
        return {
          doneCount: [
            createdSeen,
            dispatchStarted,
            pidSeen,
            Boolean(processState),
            threadResolved,
            activitySeen,
          ].filter(Boolean).length,
          traceBacked: traceEvents.length > 0,
          traceLane: String(tracePreview.lane || ""),
          items: [
            {
              label: "Created",
              state: createdSeen ? "done" : "pending",
              detail: task && task.created_at ? "recorded" : (hasTraceKind(["task.created"]) ? "trace" : "missing"),
            },
            {
              label: "Dispatch",
              state: dispatchStarted ? "done" : "pending",
              detail: dispatchStarted ? (runtimeState || (traceDispatchStarted ? "trace" : "started")) : "waiting",
            },
            {
              label: "PID",
              state: pidSeen ? "done" : "pending",
              detail: Number(runtime.pid || 0) > 0 ? String(runtime.pid) : (tracePidRecorded ? "trace" : "pending"),
            },
            {
              label: "Process",
              state: processState ? "done" : "pending",
              detail: processState || "unknown",
            },
            {
              label: "Thread",
              state: threadResolved ? "done" : "pending",
              detail: threadResolved ? ((String(runtime.thread_id || "").trim() || (taskOwner && !taskOwner.startsWith("pending-team-worker-"))) ? "resolved" : "trace") : "resolving",
            },
            {
              label: resultSeen ? "Result" : "Activity",
              state: activitySeen ? "done" : "pending",
              detail: resultSeen
                ? ((String(result.summary || "").trim() || checksRun.length || outputs.length || Number(runtime.file_change_count || 0) > 0) ? "captured" : "trace")
                : (traceEvents.length > 0 ? "trace" : (hasLogActivity ? "seen" : "waiting")),
            },
          ],
          waitingForWorkerEvidence: !resultSeen && !hasLogActivity && !traceEvents.length,
        };
      }

      function renderTeamEvidenceChecklist(task, logs) {
        const evidence = collectTeamTaskEvidence(task, logs);
        return '<div class="team-evidence">' +
          '<div class="team-evidence-head"><span>' + esc(evidence.traceBacked ? "Trace-first evidence" : "Runtime evidence") + '</span><span><span class="meta-pill">' + esc(String(evidence.doneCount)) + '/6</span>' + (evidence.traceBacked ? '<span class="meta-pill">' + esc("Trace-backed · " + String(evidence.traceLane || "task")) + '</span>' : '') + '</span></div>' +
          '<div class="team-evidence-grid">' +
            evidence.items.map((item) => (
              '<div class="team-evidence-item ' + esc(item.state) + '">' +
                '<span class="team-evidence-label">' + esc(item.label) + '</span>' +
                '<span class="team-evidence-detail">' + esc(item.detail) + '</span>' +
              '</div>'
            )).join("") +
          '</div>' +
          (evidence.waitingForWorkerEvidence ? '<div class="team-evidence-empty">Waiting for worker evidence.</div>' : '') +
        '</div>';
      }

      function inferTaskPhase(task, logs) {
        const status = String((task && task.status) || "").toLowerCase();
        const runtime = task && task.runtime && typeof task.runtime === "object" ? task.runtime : {};
        const result = task && task.result && typeof task.result === "object" ? task.result : {};
        const evidence = collectTeamTaskEvidence(task, logs);
        if (["failed", "blocked", "error"].includes(status)) {
          return { label: "Failed", tone: "warn", percentRange: null };
        }
        if (String(result.summary || "").trim() || (evidence.items[6] && evidence.items[6].state === "done")) {
          return { label: "Review \u0026 Result", tone: "complete", percentRange: "85\u2013100%" };
        }
        const fileSignals = Number(runtime.file_change_count || 0);
        const commandSignals = Number(runtime.command_completed_count || 0);
        const logSignals = Number(runtime.log_line_count || 0);
        const bbLength = Array.isArray(task.orchestration && task.orchestration.blackboard) ? task.orchestration.blackboard.length : 0;
        if (fileSignals >= 3 || bbLength >= 2 || (fileSignals >= 1 && commandSignals >= 1)) {
          return { label: "Integration", tone: "integration", percentRange: "65\u201385%" };
        }
        if (commandSignals >= 1 || logSignals >= 10 || fileSignals >= 1) {
          return { label: "Core Implementation", tone: "running", percentRange: "35\u201365%" };
        }
        if (fileSignals >= 1 || (logs && logs.some((l) => /create|mkdir|scaffold/i.test(String(l.type || ""))))) {
          return { label: "Scaffold", tone: "scaffold", percentRange: "15\u201335%" };
        }
        return { label: "Planning", tone: "planning", percentRange: "0\u201315%" };
      }

      function teamTaskCardProgress(task, logs) {
        const runtime = task && task.runtime && typeof task.runtime === "object" ? task.runtime : {};
        const result = task && task.result && typeof task.result === "object" ? task.result : {};
        const evidence = collectTeamTaskEvidence(task, logs);
        const tracePreview = teamTracePreview(task);
        const traceEvents = Array.isArray(tracePreview.events) ? tracePreview.events : [];
        const traceKinds = new Set(traceEvents.map((entry) => String((entry && entry.kind) || "").trim()).filter(Boolean));
        const checksRun = Array.isArray(result.checks_run) ? result.checks_run : [];
        const outputs = Array.isArray(result.outputs) ? result.outputs : [];
        const fileSignals = Number(runtime.file_change_count || 0);
        const commandSignals = Number(runtime.command_completed_count || 0);
        const logSignals = Number(runtime.log_line_count || 0);
        const processAlive = runtime.pid_running === true;
        const threadResolved = evidence.items[4] && evidence.items[4].state === "done";
        const dispatchStarted = evidence.items[1] && evidence.items[1].state === "done";
        const taskCreated = evidence.items[0] && evidence.items[0].state === "done";
        const status = String((task && task.status) || "");
        const traceResultSeen = traceKinds.has("run.result_captured") || traceKinds.has("task.completed");
        const traceFileSignals = traceEvents.filter((entry) => /file/i.test(String((entry && entry.kind) || ""))).length;
        const traceCommandSignals = traceEvents.filter((entry) => /command/i.test(String((entry && entry.kind) || ""))).length;

        if (String(result.summary || "").trim() || checksRun.length || outputs.length || traceResultSeen) {
          return {
            label: "Result captured",
            value: checksRun.length ? (String(checksRun.length) + " checks") : (outputs.length ? (String(outputs.length) + " outputs") : (traceResultSeen ? "trace result" : "summary recorded")),
            percent: 100,
          };
        }
        if (status === "review") {
          return {
            label: "Ready for review",
            value: "result evidence pending",
            percent: 92,
          };
        }
        if (fileSignals > 0) {
          return {
            label: "File changes seen",
            value: String(fileSignals) + " file signals",
            percent: 84,
          };
        }
        if (traceFileSignals > 0) {
          return {
            label: "File changes seen",
            value: String(traceFileSignals) + " trace signals",
            percent: 84,
          };
        }
        if (commandSignals > 0) {
          return {
            label: "Commands completed",
            value: String(commandSignals) + " command signals",
            percent: 68,
          };
        }
        if (traceCommandSignals > 0) {
          return {
            label: "Commands observed",
            value: String(traceCommandSignals) + " trace signals",
            percent: 68,
          };
        }
        if (logSignals > 0 || String(runtime.last_message || "").trim()) {
          return {
            label: "Worker active",
            value: logSignals > 0 ? (String(logSignals) + " log lines") : "message seen",
            percent: 52,
          };
        }
        if (processAlive) {
          return {
            label: "Process alive",
            value: "awaiting worker evidence",
            percent: 36,
          };
        }
        if (threadResolved) {
          return {
            label: "Thread resolved",
            value: "waiting for runtime evidence",
            percent: 24,
          };
        }
        if (dispatchStarted) {
          return {
            label: "Dispatch started",
            value: String(runtime.state || "starting"),
            percent: 16,
`;
