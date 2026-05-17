module.exports = `          || { agent_id: owner || "pending", state: task && task.status ? task.status : "queued", current_task_id: taskId };
        const helperAgents = agents.filter((agent) =>
          agent
          && String(agent.agent_id || "") !== "supervisor"
          && String(agent.agent_id || "") !== String(worker.agent_id || "")
          && String(agent.current_task_id || "") === taskId);
        const runtimeChain = collectTeamTaskRuntimeChain(runtime);
        const relatedThreadIds = new Set([
          owner,
          runtime.thread_id,
          runtime.owner_resolved_from,
          ...runtimeChain.map((item) => item && item.thread_id),
          ...runtimeChain.map((item) => item && item.owner_resolved_from),
        ].map((value) => String(value || "").trim()).filter(Boolean));
        const primaryThreadId = String(runtime.thread_id || owner || "").trim();
        const liveThreadIds = new Set(threads.map((thread) => String((thread && thread.id) || "")));
        const threadActions = primaryThreadId && liveThreadIds.has(primaryThreadId)
          ? '<button class="chip" data-focus-thread="' + esc(primaryThreadId) + '" type="button">Thread Detail</button>' +
            '<button class="chip" data-codex-thread="' + esc(primaryThreadId) + '" type="button">Codex</button>' +
            '<button class="chip" data-open-codex-editor="' + esc(primaryThreadId) + '" type="button">Editor</button>'
          : "";
        const runRows = renderTeamRunHistoryTimeline(runtimeChain);
        return '<section class="panel team-panel-card wide">' +
          '<div class="section-title">Agents & Threads</div>' +
          '<div class="section-note">This Team Space keeps one task, one supervisor, one primary worker, plus any retry/review threads and run history.</div>' +
          '<div class="team-agent-thread-grid">' +
            renderTeamAgentThreadCard("Supervisor Agent", [
              agentThreadRow("Agent", String(supervisor.agent_id || "supervisor"), true),
              agentThreadRow("State", String(supervisor.state || "idle")),
              agentThreadRow("Heartbeat", supervisor.heartbeat_at ? formatTimestamp(supervisor.heartbeat_at) : "-"),
            ]) +
            renderTeamAgentThreadCard("Primary Worker Agent", [
              agentThreadRow("Agent", String(worker.agent_id || owner || "-"), true),
              agentThreadRow("State", String(worker.state || task.status || "-")),
              agentThreadRow("Task", String(worker.current_task_id || taskId || "-"), true),
              agentThreadRow("Heartbeat", worker.heartbeat_at ? formatTimestamp(worker.heartbeat_at) : "-"),
            ]) +
            renderTeamAgentThreadCard("Primary Thread", [
              agentThreadRow("Thread", primaryThreadId || "resolving", true),
              agentThreadRow("Live", primaryThreadId && liveThreadIds.has(primaryThreadId) ? "yes" : (primaryThreadId ? "not in board" : "pending")),
              agentThreadRow("Owner", teamThreadLabel(owner, dashboard) || owner || "-"),
            ], threadActions) +
            renderTeamAgentThreadCard("Related Threads", [
              agentThreadRow("Count", String(relatedThreadIds.size)),
              agentThreadRow("Threads", [...relatedThreadIds].join(", ") || "-", true),
              helperAgents.length ? agentThreadRow("Helpers", helperAgents.map((agent) => agent.agent_id).join(", "), true) : "",
            ]) +
            runRows +
          '</div>' +
        '</section>';
      }

      function renderTeamWorkspaceCard(workspace, dashboard) {
        const task = workspace && workspace.task ? workspace.task : workspace;
        const workspaceId = String((workspace && workspace.workspace_id) || (task && task.workspace_id) || "");
        const taskId = String((workspace && workspace.task_id) || (task && task.task_id) || "");
        const owner = String((task && task.owner) || (workspace && workspace.owner) || "");
        const runtime = task && task.runtime && typeof task.runtime === "object" ? task.runtime : ((workspace && workspace.runtime) || {});
        const logs = Array.isArray(workspace && workspace.logs) ? workspace.logs : [];
        const progress = teamTaskCardProgress(task, logs);
        const phase = inferTaskPhase(task, logs);
        const status = String((task && task.status) || (workspace && workspace.status) || "queued");
        const ownerCanOpen = Boolean(owner && owner !== "supervisor" && !owner.startsWith("pending-team-worker-"));
        const isFailed = teamWorkspaceStatusGroup(workspace) === "failed";
        const failureRecovery = renderTeamWorkspaceFailureRecovery(task, logs, workspaceId, ownerCanOpen);
        return '<article class="team-workspace-card">' +
          '<div class="team-space-kicker">Team Space</div>' +
          '<div class="team-row-head">' +
            '<div class="team-row-title" title="' + esc((workspace && workspace.title) || (task && task.title) || taskId) + '">' + esc(short((workspace && workspace.title) || (task && task.title) || "Team Workspace", 80)) + '</div>' +
            '<span class="team-phase-badge tone-' + esc(phase.tone) + '">' + esc(phase.label.toUpperCase()) + '</span>' +
            '<span class="badge ' + esc((status === "blocked" || status === "failed") ? "badge-recent" : status === "running" ? "badge-running" : "badge-linked") + '">' + esc(status.toUpperCase()) + '</span>' +
          '</div>' +
          '<div class="team-row-meta">' +
            '<span class="meta-pill mono">Workspace ' + esc(short(workspaceId, 22)) + '</span>' +
            '<span class="meta-pill mono">Task ' + esc(short(taskId, 22)) + '</span>' +
            (owner ? '<span class="meta-pill mono" title="' + esc(owner) + '">Thread ' + esc(short(owner, 28)) + '</span>' : '') +
            (runtime.pid ? '<span class="meta-pill mono">PID ' + esc(String(runtime.pid)) + '</span>' : '') +
            (runtime.state ? '<span class="meta-pill">Runtime ' + esc(String(runtime.state)) + '</span>' : '') +
            (runtime.pid_running !== undefined ? '<span class="meta-pill">Process ' + esc(runtime.pid_running ? "alive" : "exited") + '</span>' : '') +
          '</div>' +
          '<div class="team-progress">' +
            '<div class="team-progress-head"><span>' + esc(progress.label) + '</span><span>' + esc(progress.value) + '</span></div>' +
            '<div class="team-progress-track"><span style="width: ' + esc(String(Math.max(0, Math.min(100, progress.percent)))) + '%"></span></div>' +
          '</div>' +
          '<div class="team-row-copy">' + esc(short((task && task.goal) || (task && task.result && task.result.summary) || "No task prompt recorded yet.", 180)) + '</div>' +
          (isFailed ? failureRecovery : renderTeamMiniLogs(logs, "No workspace events yet.")) +
          '<div class="team-row-actions">' +
            '<button class="chip primary" data-team-workspace-page="' + esc(workspaceId) + '" type="button">Open Team Space</button>' +
            (isFailed ? '' : '<button class="chip" data-team-run-workspace="' + esc(workspaceId) + '" type="button">' + esc(teamRunActionLabel(status)) + '</button>') +
            (ownerCanOpen ? '<button class="chip" data-codex-thread="' + esc(owner) + '" type="button">Codex</button>' : '') +
            (ownerCanOpen ? '<button class="chip" data-open-codex-editor="' + esc(owner) + '" type="button">Editor</button>' : '') +
            (isFailed ? '' : '<button class="chip" data-team-delete-workspace="' + esc(workspaceId) + '" type="button">Archive</button>') +
          '</div>' +
        '</article>';
      }

      function teamWorkspaceStatusGroup(workspace) {
        const task = workspace && workspace.task ? workspace.task : workspace;
        const runtime = task && task.runtime && typeof task.runtime === "object" ? task.runtime : ((workspace && workspace.runtime) || {});
        const status = String((task && task.status) || (workspace && workspace.status) || runtime.state || "queued").toLowerCase();
        if (workspace && (workspace.archived || workspace.deleted_at || workspace.archived_at)) return "archived";
        if (["archived", "deleted"].includes(status)) return "archived";
        if (["failed", "blocked", "error", "stale"].includes(status) || ["failed", "error"].includes(String(runtime.state || "").toLowerCase())) return "failed";
        if (["review", "completed", "done"].includes(status)) return "review";
        if (["running", "dispatched", "active", "in_progress"].includes(status) || runtime.pid_running === true) return "running";
        return "draft";
      }

      function isTeamLegacyDemoWorkspace(workspace) {
        const task = workspace && workspace.task ? workspace.task : workspace;
        const title = String((workspace && workspace.title) || (task && task.title) || "").toLowerCase();
        const priority = String((task && task.priority) || (workspace && workspace.priority) || "").toLowerCase();
        const workspaceId = String((workspace && workspace.workspace_id) || (task && task.workspace_id) || "").toLowerCase();
        const migrated = String((workspace && workspace.migrated_from) || "").toLowerCase();
        return priority === "demo"
          || title.includes("snake game demo")
          || workspaceId.includes("snake-game-demo")
          || migrated === "tasks";
      }

      function renderTeamWorkspaceGroups(workspaces, dashboard) {
        if (!workspaces.length) {
          return renderTeamWorkspaceOnboarding();
        }
        const primaryWorkspaces = workspaces.filter((workspace) => !isTeamLegacyDemoWorkspace(workspace));
        const legacyDemoWorkspaces = workspaces.filter((workspace) => isTeamLegacyDemoWorkspace(workspace));
        const groups = [
          ["running", "Running"],
          ["review", "Review"],
          ["failed", "Failed"],
          ["draft", "Draft"],
          ["archived", "Archived"],
        ].map(([key, label]) => ({ key, label, items: [] }));
        const byKey = new Map(groups.map((group) => [group.key, group]));
        primaryWorkspaces.forEach((workspace) => {
          const group = byKey.get(teamWorkspaceStatusGroup(workspace)) || byKey.get("draft");
          group.items.push(workspace);
        });
        return '<div class="team-workspace-status-groups">' +
          (primaryWorkspaces.length ? groups.map((group) =>
            '<section class="team-workspace-status-section" data-team-workspace-group="' + esc(group.key) + '">' +
              '<div class="team-lane-heading"><span>' + esc(group.label) + '</span><span class="meta-pill">' + esc(String(group.items.length)) + '</span></div>' +
              (group.items.length
                ? '<div class="team-workspace-grid">' + group.items.map((workspace) => renderTeamWorkspaceCard(workspace, dashboard)).join("") + '</div>'
                : '<div class="team-lane-empty">No ' + esc(group.label.toLowerCase()) + ' Team Spaces.</div>') +
            '</section>').join("") : '<div class="team-lane-empty">🏗️ No Team workspaces yet. <strong>Create one</strong> or choose a template above to get started.</div>') +
          (legacyDemoWorkspaces.length ? '<details class="team-legacy-demo" data-team-legacy-demo>' +
            '<summary>Legacy / Demo Spaces <span class="meta-pill">' + esc(String(legacyDemoWorkspaces.length)) + '</span></summary>' +
            '<div class="section-note">Older migrated tasks and sample demo spaces stay available here without crowding current Team work.</div>' +
            '<div class="team-workspace-grid">' + legacyDemoWorkspaces.map((workspace) => renderTeamWorkspaceCard(workspace, dashboard)).join("") + '</div>' +
          '</details>' : '') +
        '</div>';
      }

      function renderTeamWorkspaceOnboarding() {
        return '<section class="team-lane-empty team-workspace-onboarding">' +
          '<div class="section-title">Create your first Team Space</div>' +
          '<div class="section-note">A Team Space keeps one task, one Codex worker, one thread/run/result chain, and the evidence needed to recover or archive the work.</div>' +
          '<div class="chip-row">' +
            '<button class="chip primary" data-team-action="new_workspace" type="button">Create Team Space</button>' +
            '<button class="chip" data-team-action="new_workspace_template" data-team-template="feature" type="button">Feature</button>' +
            '<button class="chip" data-team-action="new_workspace_template" data-team-template="bugfix" type="button">Bugfix</button>' +
            '<button class="chip" data-team-action="new_workspace_template" data-team-template="review" type="button">Review</button>' +
            '<button class="chip" data-team-action="new_workspace_template" data-team-template="demo" type="button">Demo</button>' +
            '<button class="chip" data-copy-text="docs/team-workspace.md" data-copy-label="Team Workspace docs path" type="button">docs/team-workspace.md</button>' +
          '</div>' +
        '</section>';
      }

      function renderTeamWorkspacePage(teamCoordination, dashboard, workspace) {
        const task = workspace && workspace.task ? workspace.task : workspace;
        if (!task || !task.task_id) return '<div class="panel team-panel-card wide"><div class="section-title">Team Workspace</div><div class="section-note">Workspace task record is missing.</div></div>';
        const workspaceId = String((workspace && workspace.workspace_id) || task.workspace_id || "");
        const taskSpace = renderTeamTaskWorkspace(teamCoordination, dashboard, task).replace(
          '<button class="chip" data-team-task-page-back type="button">Back to Team</button>',
          '<button class="chip" data-team-workspace-page-back type="button">Back to Workspaces</button>' +
          '<button class="chip primary" data-team-run-workspace="' + esc(workspaceId) + '" type="button">' + esc(teamRunActionLabel(task.status)) + '</button>' +
          '<button class="chip" data-team-delete-workspace="' + esc(workspaceId) + '" type="button">Archive Workspace</button>',
        );
        return '<div class="team-space-page-banner">' +
          '<div>' +
            '<div class="team-space-kicker">Independent Team Space</div>' +
            '<div class="section-title">' + esc((workspace && workspace.title) || task.title || "Team Space") + '</div>' +
            '<div class="section-note">This page is scoped to one task only. Runtime, logs, trace, prompt, result, and worker actions all belong to this Team Space.</div>' +
          '</div>' +
          '<span class="meta-pill mono">Workspace ' + esc(short(workspaceId, 34)) + '</span>' +
        '</div>' + taskSpace;
      }

      function normalizeDraftWorkers(draft) {
        return Array.isArray(draft && draft.workers) ? draft.workers : [];
      }

      function renderScheduleExplanation(explanation) {
        const rows = Array.isArray(explanation && explanation.node_explanations) ? explanation.node_explanations : [];
        if (!rows.length) return '<div class="team-lane-empty">⏱️ No schedule yet. Generate an orchestration draft to see how agents will run.</div>';
        return '<div class="team-agent-thread-rows">' + rows.map((item) => {
          const decision = String(item.decision || "pending");
          const reason = String(item.reason || "");
          return '<div class="team-agent-thread-row"><span>' + esc(String(item.node_id || "node")) + '</span><strong title="' + esc(reason) + '">' + esc(decision + (reason ? " · " + reason : "")) + '</strong></div>';
        }).join("") + '</div>';
      }

      function splitDraftLines(value) {
        return String(value || "").split(/\\r?\\n|,/).map((item) => item.trim()).filter(Boolean);
      }

      function readOptionalBooleanField(source, snakeCaseKey, camelCaseKey) {
        const input = source && typeof source === "object" ? source : {};
        if (input[snakeCaseKey] !== undefined) return Boolean(input[snakeCaseKey]);
        if (input[camelCaseKey] !== undefined) return Boolean(input[camelCaseKey]);
        return undefined;
      }

      function normalizeRoleTemplateId(value) {
        return String(value || "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }

      function roleTemplateLabel(template) {
        const roleName = String(template && template.role_name || "").trim();
        const roleId = normalizeRoleTemplateId(template && template.role_id);
        if (roleName) return roleName;
        if (!roleId) return "Custom";
        return roleId.split("-").map((part) => part ? (part[0].toUpperCase() + part.slice(1)) : "").join(" ");
      }

      function getRoleTemplateIconUrl(roleId, templates) {
        const template = findRoleTemplateById(roleId, templates);
        const iconName = template && template.icon_svg;
        const iconKey = String(iconName || "").split(/[\\/]/).pop();
        const map = MEDIA && (MEDIA.roleAvatar || MEDIA.agentRobot);
        if (iconName && map && map[iconName]) return map[iconName];
        if (iconKey && map && map[iconKey]) return map[iconKey];
        return map && map["default"] || "";
      }

      function rolePluginTemplatesFromState() {
        const teamCoordination = state && state.payload && state.payload.teamCoordination;
        if (!Array.isArray(teamCoordination && teamCoordination.rolePlugins && teamCoordination.rolePlugins.templates)) {
          return [];
        }
        return teamCoordination.rolePlugins.templates;
      }

      function organizationTemplateId(value) {
        return normalizeRoleTemplateId(value);
      }

      function organizationTemplateLabel(template) {
        const displayName = String(template && template.display_name || "").trim();
        if (displayName) return displayName;
        const templateId = organizationTemplateId(template && template.template_id);
        if (!templateId) return "Manual";
        return templateId.split("-").map((part) => part ? (part[0].toUpperCase() + part.slice(1)) : "").join(" ");
      }

      function organizationTemplatesFromState() {
        const teamCoordination = state && state.payload && state.payload.teamCoordination;
        if (!Array.isArray(teamCoordination && teamCoordination.organizationTemplates && teamCoordination.organizationTemplates.templates)) {
          return [];
        }
        return teamCoordination.organizationTemplates.templates;
      }

      function findRoleTemplateById(roleId, templates) {
        const target = normalizeRoleTemplateId(roleId);
        if (!target) return null;
        const list = Array.isArray(templates) ? templates : [];
        for (let index = 0; index < list.length; index += 1) {
          const template = list[index];
          const templateRoleId = normalizeRoleTemplateId(template && template.role_id);
          if (templateRoleId && templateRoleId === target) return template;
        }
        return null;
      }

      function applyRoleTemplateToDraftWorker(worker, templates, defaultWorkerModel) {
        const source = worker && typeof worker === "object" ? worker : {};
        const selectedRoleId = normalizeRoleTemplateId(source.role_id || source.roleId);
        const template = findRoleTemplateById(selectedRoleId, templates);
        const explicitRole = String(source.role || "").trim();
        const explicitModel = String(source.model || "").trim();
        const readPaths = Array.isArray(source.read_paths) ? source.read_paths.filter(Boolean) : [];
        const writePaths = Array.isArray(source.write_paths) ? source.write_paths.filter(Boolean) : [];
        const expectedOutputs = Array.isArray(source.expected_outputs) ? source.expected_outputs.filter(Boolean) : [];
        const explicitPromptContract = Array.isArray(source.prompt_contract) ? source.prompt_contract.filter(Boolean) : [];
        const explicitResultEnvelope = Array.isArray(source.result_envelope) ? source.result_envelope.filter(Boolean) : [];
        const explicitWritesBlackboard = readOptionalBooleanField(source, "writes_blackboard", "writesBlackboard");
        const explicitCanEditCode = readOptionalBooleanField(source, "can_edit_code", "canEditCode");
        const templateRoleName = String(template && (template.role_name || template.display_name) || "").trim();
        const templateRoleText = String(template && (template.role_prompt || template.description) || "").trim();
        const templateModel = String(template && template.default_model || "").trim();
        const templateReadPaths = splitDraftLines(template && template.default_read_paths);
        const templateWritePaths = splitDraftLines(template && template.default_write_paths);
        const templateExpectedOutputs = splitDraftLines(
          template && (
            template.default_expected_outputs !== undefined
              ? template.default_expected_outputs
              : template.expected_outputs
          ),
        );
        const templatePromptContract = splitDraftLines(template && template.prompt_contract);
        const templateResultEnvelope = splitDraftLines(template && template.result_envelope);
        const templateRoleTemplateSource = String(template && template.role_template_source || "").trim();
        const templateRoleTemplateVersion = Number.parseInt(template && template.role_template_version, 10) || 0;
        const explicitRoleTemplateSource = String(source.role_template_source || source.roleTemplateSource || "").trim();
        const explicitRoleTemplateVersion = Number.parseInt(
          source.role_template_version || source.roleTemplateVersion || "",
          10,
        ) || 0;
        return {
          ...source,
          role_id: selectedRoleId,
          role_name: templateRoleName || String(source.role_name || "").trim(),
          display_name: String(source.display_name || template && template.display_name || templateRoleName || "").trim(),
          role_template_source: explicitRoleTemplateSource || templateRoleTemplateSource,
          role_template_version: explicitRoleTemplateVersion || templateRoleTemplateVersion,
          role: explicitRole || templateRoleText,
          model: explicitModel || templateModel || String(defaultWorkerModel || "gpt-5.3-codex"),
          read_paths: readPaths.length ? readPaths : templateReadPaths,
          write_paths: writePaths.length ? writePaths : templateWritePaths,
          expected_outputs: expectedOutputs.length ? expectedOutputs : templateExpectedOutputs,
          prompt_contract: explicitPromptContract.length ? explicitPromptContract : templatePromptContract,
          result_envelope: explicitResultEnvelope.length
            ? explicitResultEnvelope
            : (templateResultEnvelope.length ? templateResultEnvelope : [
              "summary",
              "changed_files",
              "checks_run",
              "open_risks",
              "blackboard_updates",
              "next_request",
            ]),
          writes_blackboard: explicitWritesBlackboard !== undefined
            ? explicitWritesBlackboard
            : Boolean(template ? template.writes_blackboard : true),
          can_edit_code: explicitCanEditCode !== undefined
            ? explicitCanEditCode
            : Boolean(template ? template.can_edit_code : false),
        };
      }

      function readTeamOrchestrationDraftFromDom() {
        const field = (name) => {
          const node = document.querySelector('[data-team-orchestration-field="' + name + '"]');
          return node && "value" in node ? node.value : "";
        };
        const workerNodes = Array.from(document.querySelectorAll("[data-team-orchestration-worker]"));
        const defaultWorkerModel = field("worker_model") || "gpt-5.3-codex";
        const templates = rolePluginTemplatesFromState();
        const workers = workerNodes.map((node, index) => {
          const workerField = (name) => {
            const fieldNode = node.querySelector('[data-team-orchestration-worker-field="' + name + '"]');
            return fieldNode && "value" in fieldNode ? fieldNode.value : "";
          };
          const title = workerField("title") || ("Agent " + String(index + 1));
          return applyRoleTemplateToDraftWorker({
            node_id: "node-" + String(index + 1) + "-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24),
            title,
            role_id: workerField("role_id"),
            role: workerField("role"),
            provider: workerField("provider"),
            model: workerField("model"),
            write_paths: splitDraftLines(workerField("write_paths")),
            expected_outputs: splitDraftLines(workerField("expected_outputs")),
          }, templates, defaultWorkerModel);
        });
        const workerCount = Number.parseInt(field("worker_count") || String(workers.length || 3), 10) || workers.length || 3;
        return {
          goal: field("goal"),
          supervisorModel: field("supervisor_model") || "gpt-5.4",
          supervisorInstructions: field("supervisor_instructions"),
          organizationTemplateId: field("organization_template_id"),
          workerModel: defaultWorkerModel,
          workerCount,
          workers,
        };
      }

      function renderTeamOrchestrationPanel(teamCoordination) {
        const draft = state.ui.teamOrchestrationDraft || {};
        const workers = normalizeDraftWorkers(draft);
        const goal = String(draft.goal || "");
        const supervisor = draft.supervisor || {};
        const supervisorModel = String(supervisor.model || "gpt-5.4");
        const workerModel = String(draft.worker_model || "gpt-5.3-codex");
        const step = Math.max(1, Math.min(3, Number(state.ui.teamOrchestrationStep) || 1));
        const selectedOrganizationTemplateId = organizationTemplateId(
          draft.organization_template_id
          || draft.organizationTemplateId
          || "",
        );
        const supervisorInstructions = String(supervisor.instructions || "Analyze the user goal, maintain the DAG plan, assign bounded worker nodes, review results, and update the blackboard.");
        const rolePluginTemplates = rolePluginTemplatesFromState();
        const organizationTemplates = organizationTemplatesFromState();
        const workerRows = (workers.length ? workers : [
          { title: "Planning and contract worker", role: "Refine the implementation contract and acceptance checks.", model: workerModel, write_paths: ["task-plans"], expected_outputs: ["updated task plan"] },
          { title: "Host/runtime worker", role: "Implement host-side state and persistence.", model: workerModel, write_paths: ["src/host"], expected_outputs: ["host code and tests"] },
          { title: "Team UI worker", role: "Implement Team webview controls and rendering.", model: workerModel, write_paths: ["src/webview-template.js"], expected_outputs: ["webview regression tests"] },
        ]).map((worker, index) => {
          const nodeId = String(worker.node_id || ("node-" + String(index + 1)));
          const selectedRoleId = normalizeRoleTemplateId(worker.role_id || worker.roleId);
          const roleTemplateOptions = rolePluginTemplates.map((template) => {
            const roleId = normalizeRoleTemplateId(template && template.role_id);
            if (!roleId) return "";
            const selected = selectedRoleId === roleId ? " selected" : "";
            return '<option value="' + esc(roleId) + '"' + selected + '>' + esc(roleTemplateLabel(template)) + '</option>';
          }).filter(Boolean).join("");
          const iconUrl = getRoleTemplateIconUrl(selectedRoleId, rolePluginTemplates);
          const iconHtml = iconUrl ? '<img class="team-role-icon" src="' + esc(iconUrl) + '" alt="" />' : '<div class="team-role-icon"></div>';
          return '<div class="team-agent-thread-card team-role-card" data-team-orchestration-worker="' + esc(String(index)) + '">' +
            '<div class="team-role-card-header">' +
              iconHtml +
              '<div class="team-role-header-body">' +
                '<div class="team-role-header-top">' +
                  '<span class="team-role-badge">A' + esc(String(index + 1)) + '</span>' +
                  '<input class="team-definition-input team-role-name" data-team-orchestration-worker-field="title" data-team-worker-index="' + esc(String(index)) + '" value="' + esc(worker.title || nodeId) + '" />' +
                '</div>' +
                '<select class="team-definition-input team-role-template-select" data-team-orchestration-worker-field="role_id" data-team-worker-index="' + esc(String(index)) + '">' +
                  '<option value="">Manual / custom</option>' +
                  roleTemplateOptions +
                '</select>' +
              '</div>' +
            '</div>' +
            '<div class="team-role-body">' +
              '<div class="team-role-field-row">' +
                '<label>Model</label>' +
                '<input class="team-definition-input" data-team-orchestration-worker-field="model" data-team-worker-index="' + esc(String(index)) + '" value="' + esc(worker.model || workerModel) + '" />' +
              '</div>' +
              '<div class="team-role-field-row">' +
                '<label>Role</label>' +
                '<textarea class="team-definition-textarea compact" data-team-orchestration-worker-field="role" data-team-worker-index="' + esc(String(index)) + '" rows="2">' + esc(worker.role || "") + '</textarea>' +
              '</div>' +
              '<div class="team-role-field-row">' +
                '<label>Write paths</label>' +
                '<textarea class="team-definition-textarea compact" data-team-orchestration-worker-field="write_paths" data-team-worker-index="' + esc(String(index)) + '" rows="2">' + esc(Array.isArray(worker.write_paths) ? worker.write_paths.join("\\n") : String(worker.write_paths || "")) + '</textarea>' +
              '</div>' +
              '<div class="team-role-field-row">' +
                '<label>Expected outputs</label>' +
                '<textarea class="team-definition-textarea compact" data-team-orchestration-worker-field="expected_outputs" data-team-worker-index="' + esc(String(index)) + '" rows="2">' + esc(Array.isArray(worker.expected_outputs) ? worker.expected_outputs.join("\\n") : String(worker.expected_outputs || "")) + '</textarea>' +
              '</div>' +
            '</div>' +
            '<div class="team-role-footer"><button class="chip" data-team-orchestration-remove-worker="' + esc(String(index)) + '" type="button">Remove</button></div>' +
          '</div>';
        }).join("");
        return '<section class="team-panel-card wide team-orchestration-panel">' +
          '<div class="team-workspace-home-head">' +
            '<div>' +
              '<div class="section-title">Plan Team Run</div>' +
              '<div class="section-note">Draft a supervisor-led multi-agent run first. Review and save the plan before launching workers.</div>' +
            '</div>' +
            '<span class="meta-pill">Draft only</span>' +
          '</div>' +
          '<div class="team-wizard-nav">' +
            '<button class="chip" data-team-wizard-prev type="button"' + (step <= 1 ? ' disabled' : '') + '>Previous</button>' +
            '<div class="team-wizard-dots">' +
              '<span class="team-wizard-dot' + (step === 1 ? ' active' : '') + '">1 Goal</span>' +
              '<span class="team-wizard-dot' + (step === 2 ? ' active' : '') + '">2 Agents</span>' +
              '<span class="team-wizard-dot' + (step === 3 ? ' active' : '') + '">3 Review</span>' +
            '</div>' +
            '<button class="chip primary" data-team-wizard-next type="button"' + (step >= 3 ? ' disabled' : '') + '>Next</button>' +
          '</div>' +
          '<div class="team-wizard-step' + (step === 1 ? ' active' : '') + '" data-team-wizard-step="1">' +
            '<h4 class="section-heading">User goal</h4>' +
            '<textarea class="team-definition-textarea" data-team-orchestration-field="goal" rows="4">' + esc(goal || "Build a focused Team run with safe parallel workers.") + '</textarea>' +
            '<div class="team-run-form-grid">' +
              '<div class="team-run-form-column">' +
                '<div class="team-space-kicker">Supervisor</div>' +
                '<h4 class="section-heading">Model</h4>' +
                '<input class="team-definition-input" data-team-orchestration-field="supervisor_model" value="' + esc(supervisorModel) + '" />' +
                '<h4 class="section-heading">Instructions</h4>' +
                '<textarea class="team-definition-textarea compact" data-team-orchestration-field="supervisor_instructions" rows="5">' + esc(supervisorInstructions) + '</textarea>' +
              '</div>' +
              '<div class="team-run-form-column">' +
                '<div class="team-space-kicker">Workers</div>' +
                '<h4 class="section-heading">Organization template</h4>' +
`;
