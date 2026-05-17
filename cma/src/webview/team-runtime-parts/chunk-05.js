module.exports = `                '<select class="team-definition-input" data-team-orchestration-field="organization_template_id">' +
                  '<option value="">Manual / none</option>' +
                  organizationTemplates.map((template) => {
                    const templateId = organizationTemplateId(template && template.template_id);
                    if (!templateId) return "";
                    const selected = selectedOrganizationTemplateId === templateId ? " selected" : "";
                    return '<option value="' + esc(templateId) + '"' + selected + '>' + esc(organizationTemplateLabel(template)) + '</option>';
                  }).filter(Boolean).join("") +
                '</select>' +
                '<h4 class="section-heading">Default model</h4>' +
                '<input class="team-definition-input" data-team-orchestration-field="worker_model" value="' + esc(workerModel) + '" />' +
                '<h4 class="section-heading">Agent count</h4>' +
                '<input class="team-definition-input" data-team-orchestration-field="worker_count" value="' + esc(String(workers.length || 3)) + '" />' +
                '<div class="team-row-actions"><button class="chip" data-team-orchestration-add-worker type="button">Add Agent</button></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="team-wizard-step' + (step === 2 ? ' active' : '') + '" data-team-wizard-step="2">' +
            '<div class="team-agent-thread-grid">' + workerRows + '</div>' +
          '</div>' +
          '<div class="team-wizard-step' + (step === 3 ? ' active' : '') + '" data-team-wizard-step="3">' +
            '<div class="team-row-actions">' +
              '<button class="chip primary" data-team-orchestration-generate type="button">Generate Orchestration Draft</button>' +
              '<button class="chip" data-team-orchestration-save type="button"' + (draft && draft.dagRun ? '' : ' disabled') + '>Save Draft as Team Space</button>' +
              '<span class="meta-pill">' + esc(draft && draft.dagRun ? "Draft ready" : "Waiting for draft") + '</span>' +
            '</div>' +
            '<div class="team-agent-thread-grid">' +
              '<section class="team-agent-thread-card"><div class="team-space-kicker">Schedule</div>' + renderScheduleExplanation(draft.scheduleExplanation) + '</section>' +
            '</div>' +
          '</div>' +
        '</section>';
      }

      function workerStatusPercent(status) {
        const s = String(status || "pending").toLowerCase();
        if (["completed", "done", "success"].includes(s)) return { percent: 100, tone: "complete" };
        if (["running", "dispatched", "active", "in_progress"].includes(s)) return { percent: 60, tone: "running" };
        if (["review"].includes(s)) return { percent: 92, tone: "review" };
        if (["blocked", "failed", "error", "stale"].includes(s)) return { percent: 100, tone: "warn" };
        if (["queued", "ready", "draft"].includes(s)) return { percent: 8, tone: "pending" };
        return { percent: 4, tone: "pending" };
      }

      function renderWorkerMiniProgress(status) {
        const meta = workerStatusPercent(status);
        const pulseClass = meta.tone === "running" ? " worker-progress-pulse" : "";
        return '<div class="worker-mini-progress">' +
          '<div class="worker-mini-progress-track">' +
            '<div class="worker-mini-progress-bar tone-' + esc(meta.tone) + esc(pulseClass) + '" style="width:' + esc(String(meta.percent)) + '%"></div>' +
          '</div>' +
          '<span class="worker-mini-progress-label">' + esc(String(status || "pending").toUpperCase()) + '</span>' +
        '</div>';
      }

      function renderMiniDagGraph(dagNodes) {
        const nodes = Array.isArray(dagNodes) ? dagNodes.slice(0, 10) : [];
        if (nodes.length < 2) return "";
        const byId = new Map(nodes.map((n) => [String(n.node_id || ""), n]));
        const edges = [];
        nodes.forEach((node) => {
          const deps = Array.isArray(node.depends_on) ? node.depends_on : [];
          deps.forEach((depId) => {
            if (byId.has(String(depId))) edges.push({ from: String(depId), to: String(node.node_id || "") });
          });
        });
        const nodeIds = nodes.map((n) => String(n.node_id || ""));
        const depthMap = new Map(nodeIds.map((id) => [id, 0]));
        let changed = true;
        while (changed) {
          changed = false;
          edges.forEach((e) => {
            const d = (depthMap.get(e.from) || 0) + 1;
            if (d > (depthMap.get(e.to) || 0)) {
              depthMap.set(e.to, d);
              changed = true;
            }
          });
        }
        const maxDepth = Math.max(0, ...depthMap.values());
        const layers = [];
        for (let d = 0; d <= maxDepth; d++) layers.push([]);
        nodeIds.forEach((id) => {
          const d = Math.min(maxDepth, depthMap.get(id) || 0);
          layers[d].push(id);
        });
        const width = 280;
        const height = 100;
        const padX = 18;
        const padY = 14;
        const usableW = width - padX * 2;
        const usableH = height - padY * 2;
        const pos = new Map();
        layers.forEach((layer, d) => {
          const count = layer.length || 1;
          const step = usableW / Math.max(1, count);
          layer.forEach((id, i) => {
            const x = padX + step * i + step / 2;
            const y = maxDepth === 0 ? height / 2 : padY + (usableH * d) / maxDepth;
            pos.set(id, { x, y });
          });
        });
        const nodeR = 6;
        let svg = '<svg class="mini-dag-graph" viewBox="0 0 ' + width + " " + height + '" xmlns="http://www.w3.org/2000/svg">';
        svg += '<defs><marker id="mini-dag-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 L1.5,3 Z" fill="rgba(255,255,255,0.25)"/></marker></defs>';
        edges.forEach((e) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) return;
          svg += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="rgba(255,255,255,0.18)" stroke-width="1.2" marker-end="url(#mini-dag-arrow)"/>';
        });
        nodes.forEach((node) => {
          const id = String(node.node_id || "");
          const p = pos.get(id);
          if (!p) return;
          const st = String(node.status || "pending").toLowerCase();
          let fill = "#6b7280";
          if (["completed", "done", "success"].includes(st)) fill = "#54f2b0";
          else if (["running", "dispatched", "active", "in_progress"].includes(st)) fill = "#8dd8ff";
          else if (["blocked", "failed", "error", "stale"].includes(st)) fill = "#ff8f9f";
          else if (["review"].includes(st)) fill = "#ffd479";
          svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + nodeR + '" fill="' + fill + '" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>';
          svg += '<text x="' + p.x + '" y="' + (p.y + nodeR + 10) + '" text-anchor="middle" font-size="9" fill="var(--muted)" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif">' + esc(short(id, 10)) + '</text>';
        });
        svg += "</svg>";
        return svg;
      }

      function renderTeamOrchestrationSummary(task) {
        const orchestration = task && task.orchestration && typeof task.orchestration === "object" ? task.orchestration : null;
        if (!orchestration) return "";
        const supervisor = orchestration.supervisor || {};
        const workers = Array.isArray(orchestration.workers) ? orchestration.workers : [];
        const dagRun = orchestration.dagRun || orchestration.dag_run || {};
        const dagNodes = Array.isArray(dagRun.nodes) ? dagRun.nodes : [];
        const blackboard = Array.isArray(orchestration.blackboard)
          ? orchestration.blackboard
          : (Array.isArray(dagRun.blackboard) ? dagRun.blackboard : []);
        const rolePluginTemplates = rolePluginTemplatesFromState();
        const schedule = orchestration.schedule_explanation || orchestration.scheduleExplanation || {};
        const scheduleRows = Array.isArray(schedule.node_explanations) ? schedule.node_explanations : [];
        const nodeById = new Map(dagNodes.map((node) => [String(node.node_id || ""), node]));
        const statusCounts = dagNodes.reduce((counts, node) => {
          const status = String(node.status || "pending").toLowerCase();
          counts[status] = (counts[status] || 0) + 1;
          return counts;
        }, {});
        const workerCards = workers.map((worker, index) => {
          const nodeId = String(worker.node_id || "");
          const node = nodeById.get(nodeId) || {};
          const runtime = node.runtime && typeof node.runtime === "object" ? node.runtime : {};
          const status = String(node.status || worker.status || "draft");
          const scheduleRow = scheduleRows.find((item) => item && String(item.node_id || "") === nodeId) || {};
          const conflict = scheduleRow.conflict && typeof scheduleRow.conflict === "object" ? scheduleRow.conflict : null;
          const writePaths = Array.isArray(worker.write_paths)
            ? worker.write_paths
            : (node.ownership && Array.isArray(node.ownership.write_paths) ? node.ownership.write_paths : []);
          const expectedOutputs = Array.isArray(worker.expected_outputs)
            ? worker.expected_outputs
            : (node.ownership && Array.isArray(node.ownership.expected_outputs) ? node.ownership.expected_outputs : []);
          const workerRoleId = normalizeRoleTemplateId(worker.role_id || worker.roleId);
          const workerIconUrl = getRoleTemplateIconUrl(workerRoleId, rolePluginTemplates);
          const workerIconHtml = workerIconUrl ? '<img class="team-role-icon" src="' + esc(workerIconUrl) + '" alt="" />' : '<div class="team-role-icon"></div>';
          return '<div class="team-agent-thread-card team-role-card">' +
            '<div class="team-role-card-header">' +
              workerIconHtml +
              '<div class="team-role-header-body">' +
                '<div class="team-role-header-top">' +
                  '<span class="team-role-badge">A' + esc(String(index + 1)) + '</span>' +
                  '<strong style="font-size:12px;">' + esc(worker.title || node.title || nodeId || "Worker") + '</strong>' +
                '</div>' +
                '<div style="color:var(--muted);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;">' + esc(status.toUpperCase()) + '</div>' +
              '</div>' +
            '</div>' +
            renderWorkerMiniProgress(status) +
            '<div class="team-agent-thread-rows">' +
              '<div class="team-agent-thread-row"><span>Model</span><strong>' + esc(worker.model || node.model || orchestration.worker_model || "-") + '</strong></div>' +
              '<div class="team-agent-thread-row"><span>Role</span><strong title="' + esc(worker.role || node.role || "") + '">' + esc(short(worker.role || node.role || "-", 96)) + '</strong></div>' +
              '<div class="team-agent-thread-row"><span>Thread</span><strong>' + esc(runtime.thread_id || node.worker_thread_id || "-") + '</strong></div>' +
              '<div class="team-agent-thread-row"><span>Write</span><strong title="' + esc(writePaths.join(", ")) + '">' + esc(short(writePaths.length ? writePaths.join(", ") : "-", 96)) + '</strong></div>' +
              '<div class="team-agent-thread-row"><span>Outputs</span><strong title="' + esc(expectedOutputs.join(", ")) + '">' + esc(short(expectedOutputs.length ? expectedOutputs.join(", ") : "-", 96)) + '</strong></div>' +
              '<div class="team-agent-thread-row"><span>Schedule</span><strong title="' + esc(scheduleRow.reason || "") + '">' + esc((scheduleRow.decision || "not evaluated") + (scheduleRow.reason ? " · " + scheduleRow.reason : "")) + '</strong></div>' +
              (conflict ? '<div class="team-agent-thread-row"><span>Conflict</span><strong title="' + esc(JSON.stringify(conflict)) + '">' + esc(short((conflict.kind || "conflict") + " · " + (conflict.path || "") + " vs " + (conflict.other_path || ""), 96)) + '</strong></div>' : '') +
            '</div>' +
          '</div>';
        }).join("");
        const blackboardRows = blackboard.slice(-5).map((entry) => {
          const kind = String(entry.kind || entry.type || "entry");
          const source = String(entry.source_node_id || entry.node_id || entry.source || "global");
          const summary = String(entry.summary || entry.message || JSON.stringify(entry.payload || {}));
          return '<div class="team-agent-thread-row"><span>' + esc(kind + " · " + source) + '</span><strong title="' + esc(summary) + '">' + esc(short(summary, 120)) + '</strong></div>';
        }).join("");
        return '<section class="panel team-panel-card wide">' +
          '<div class="section-title">Orchestration</div>' +
          '<div class="drawer-summary">' +
            drawerStat("Supervisor", supervisor.model || "-") +
            drawerStat("Worker Model", orchestration.worker_model || "-") +
            drawerStat("Agents", String(workers.length)) +
            drawerStat("DAG", orchestration.dag_run_id || dagRun.run_id || "-") +
            drawerStat("Running", String(statusCounts.running || 0)) +
            drawerStat("Blocked", String(statusCounts.blocked || 0)) +
            drawerStat("Completed", String(statusCounts.completed || 0)) +
            drawerStat("Blackboard", String(blackboard.length || 0)) +
          '</div>' +
          (dagNodes.length >= 2 ? '<div class="mini-dag-wrap">' + renderMiniDagGraph(dagNodes) + '</div>' : '') +
          '<div class="team-agent-thread-grid">' + workerCards + '</div>' +
          '<div class="team-agent-thread-grid">' +
            '<section class="team-agent-thread-card"><div class="team-space-kicker">Schedule Explanation</div>' + renderScheduleExplanation(schedule) + '</section>' +
            '<section class="team-agent-thread-card"><div class="team-space-kicker">Blackboard Highlights</div>' +
              (blackboardRows ? '<div class="team-agent-thread-rows">' + blackboardRows + '</div>' : '<div class="team-lane-empty">📋 Blackboard is empty. Agent results and handoffs will appear here as they run.</div>') +
            '</section>' +
          '</div>' +
          '<div class="team-row-actions"><button class="chip" data-team-workspace-page="' + esc((task && task.workspace_id) || "") + '" type="button">Edit Orchestration</button></div>' +
        '</section>';
      }

      function renderTeamWorkspaceHome(teamCoordination, dashboard) {
        const workspaces = Array.isArray(teamCoordination && teamCoordination.workspaces) ? teamCoordination.workspaces : [];
        const tasks = Array.isArray(teamCoordination && teamCoordination.tasks) ? teamCoordination.tasks : [];
        const agents = Array.isArray(teamCoordination && teamCoordination.agents) ? teamCoordination.agents : [];
        const events = Array.isArray(teamCoordination && teamCoordination.recentEvents) ? teamCoordination.recentEvents : [];
        const summary = teamCoordination.summary || {};
        const lanes = buildTeamDirectoryLanes(tasks, agents, dashboard);
        const laneMarkup = lanes.length
          ? lanes.map((lane, index) => renderTeamDirectoryLane(lane, dashboard, index, teamCoordination)).join("")
          : '<div class="team-lane-empty">🔕 No runtime activity yet. Launch a Team run to see live agent signals.</div>';
        return '<div class="panel team-panel-card wide team-workspace-home">' +
          '<div class="team-workspace-home-head">' +
            '<div>' +
              '<div class="section-title">Team Workspaces</div>' +
              '<div class="section-note">' + esc(teamCoordination.workspace || "Workspace mailbox") + '</div>' +
            '</div>' +
            '<div class="chip-row">' +
              '<button class="chip primary" data-team-action="new_workspace" type="button">New Team Workspace</button>' +
              '<button class="chip" data-team-action="new_workspace_template" data-team-template="feature" type="button">Feature</button>' +
              '<button class="chip" data-team-action="new_workspace_template" data-team-template="bugfix" type="button">Bugfix</button>' +
              '<button class="chip" data-team-action="new_workspace_template" data-team-template="review" type="button">Review</button>' +
              '<button class="chip" data-team-action="new_workspace_template" data-team-template="demo" type="button">Demo</button>' +
              '<button class="chip" data-team-action="open_brief" type="button">Open team.md</button>' +
              '<button class="chip" data-team-action="mark_stale" type="button">Mark Stale</button>' +
            '</div>' +
          '</div>' +
          '<div class="drawer-summary team-workspace-stat-strip">' +
            drawerStat("Workspaces", String(summary.workspaceCount || workspaces.length || 0)) +
            drawerStat("Running", String(summary.runningCount || 0)) +
            drawerStat("Blocked", String(summary.blockedCount || 0)) +
            drawerStat("Agents", String(summary.agentCount || 0)) +
            drawerStat("Mailbox", (teamCoordination.validation && teamCoordination.validation.ok === false) ? "Issues" : "OK") +
          '</div>' +
          renderTeamWorkspaceGroups(workspaces, dashboard) +
        '</div>' +
        renderTeamOrchestrationPanel(teamCoordination) +
        '<details class="panel team-panel-card wide team-diagnostics">' +
          '<summary>Activity / Diagnostics</summary>' +
          '<div class="section-note">Low-level lanes are kept for debugging only. The primary Team workflow is the workspace list above.</div>' +
          '<div class="team-board-surface board-surface"><div class="team-board-stack board-project-stack">' + laneMarkup + renderTeamEventsLane(events) + '</div></div>' +
        '</details>';
      }

      function bundledSkillByName(bundledSkills, skillName) {
        return (Array.isArray(bundledSkills) ? bundledSkills : []).find((skill) => skill && skill.name === skillName) || null;
      }

      function renderTeamSkillCard(bundledSkills) {
        const skill = bundledSkillByName(bundledSkills, "team-reflective-loop");
        const installed = Boolean(skill && skill.installed);
        const updateAvailable = Boolean(skill && skill.updateAvailable);
        const label = updateAvailable ? "Update Team Skill" : (installed ? "Team Skill Installed" : "Install Team Skill");
        const status = updateAvailable ? "Update available" : (installed ? "Installed" : "Optional");
        const openAttr = (!installed || updateAvailable) ? ' open' : '';
        const detail = skill
          ? (installed
              ? ("Installed in " + (skill.skillPath || "~/.codex/skills/team-reflective-loop") + (updateAvailable ? " · bundled " + (skill.bundledVersion || "") + " available" : ""))
              : ("Bundled copy ready: " + (skill.bundledSkillPath || "bundled-skills/team-reflective-loop")))
          : "Bundled skill metadata is unavailable until the next host refresh.";
        return '<details class="panel team-panel-card wide team-optional-skill"' + openAttr + '>' +
          '<summary>' +
            '<span class="team-optional-skill-title">Optional Reflective Skill</span>' +
            '<span class="team-optional-skill-meta">' + esc(status) + (skill && skill.installedVersion ? ' · ' + esc(skill.installedVersion) : '') + '</span>' +
          '</summary>' +
          '<div class="section-note">Team Core is built in. This add-on only adds reflective mailbox guidance and validation helpers.</div>' +
          '<div class="drawer-summary">' +
            drawerStat("Status", updateAvailable ? "Update" : (installed ? "Installed" : "Optional")) +
            drawerStat("Bundled", skill && skill.bundledVersion ? skill.bundledVersion : "-") +
            drawerStat("Installed", skill && skill.installedVersion ? skill.installedVersion : "-") +
          '</div>' +
          '<div class="team-row-copy">' + esc(detail) + '</div>' +
          '<div class="chip-row">' +
            '<button class="chip' + (!installed || updateAvailable ? ' primary' : '') + '" data-bundled-skill="team-reflective-loop" type="button">' + esc(label) + '</button>' +
            '<button class="chip" data-sync-bundled-skills type="button">Sync Bundled Skills</button>' +
            '<button class="chip" data-open-codex-skills-folder type="button">Open ~/.codex/skills</button>' +
          '</div>' +
        '</details>';
      }

      function renderTeamSnakeDemoCard(dashboard) {
        const targetLabel = "Dedicated Codex worker";
        const prompt = [
          "You are a worker in a Codex-Managed-Agent team space.",
          "",
          "Team task: build a small playable Snake game demo in this workspace.",
          "",
          "Requirements:",
          "- Inspect the repository first and choose the smallest appropriate place for a demo.",
          "- Create a playable browser-based Snake game with keyboard controls, score, restart, and game-over state.",
          "- Keep it lightweight and self-contained. Prefer plain HTML/CSS/JS unless the repo clearly has an app framework already.",
          "- Add or update a short README note explaining how to run the demo.",
          "- Run a basic verification command that fits the repo, or explain why no automated check is available.",
          "- When finished, report a result envelope with summary, outputs, checks_run, open_risks, and next_request.",
          "",
          "Boundaries:",
          "- Do not delete existing source files.",
          "- Do not change package metadata unless it is required to run the demo.",
          "- Keep the implementation scoped to this demo."
        ].join("\\n");
        return '<div class="panel team-panel-card wide">' +
          '<div class="section-title">Team Run</div>' +
          '<div class="section-note">Sample workflow · creates a real Team task, starts a dedicated Codex worker, and resolves the thread id from the run log.</div>' +
          '<div class="drawer-summary">' +
            drawerStat("Type", "Demo") +
            drawerStat("Target", targetLabel) +
            drawerStat("Protocol", "Built-in") +
            drawerStat("Model", "CLI default") +
            drawerStat("Mode", "Background") +
          '</div>' +
          '<textarea class="loop-input" data-team-snake-prompt rows="10">' + esc(prompt) + '</textarea>' +
          '<div class="chip-row">' +
            '<button class="chip primary" data-team-run-snake-demo data-team-thread="" type="button">Run</button>' +
            '<button class="chip" data-copy-team-snake-prompt type="button">Copy Prompt</button>' +
            '<span class="meta-pill" data-team-run-feedback>Ready</span>' +
          '</div>' +
        '</div>';
      }

      function renderTeamPanel(teamCoordination, dashboard, bundledSkills = [], serviceMetadata = null) {
        if (!teamCoordination || !teamCoordination.available) {
          return renderTeamReadinessCard(teamCoordination, bundledSkills, serviceMetadata) +
            '<div class="panel team-panel-card wide">' +
              '<div class="section-title">Team Board</div>' +
              '<div class="section-note">Team mode is here, but this workspace has not created its <code>.codex-team</code> mailbox yet.</div>' +
              '<div class="chip-row"><button class="chip primary" data-team-action="initialize" type="button">Initialize Team</button><button class="chip" data-team-action="open_brief" type="button">Create/Open team.md</button></div>' +
            '</div>' +
            '<div class="team-board-surface board-surface">' +
              '<div class="team-board-stack board-project-stack">' +
                '<section class="board-project-section team-board-lane" style="--project-accent: rgba(126, 231, 255, 0.72)" data-team-board-lane="active-preview">' +
                  '<div class="board-project-head"><div class="board-project-title"><span class="board-project-dot"></span><span>Active Tasks</span></div><span class="board-project-count">0</span></div>' +
                  '<div class="running-board-grid team-board-lane-grid"><div class="team-lane-empty">Initialize Team to assign selected Codex threads into shared tasks.</div></div>' +
                '</section>' +
                '<section class="board-project-section team-board-lane" style="--project-accent: rgba(255, 180, 105, 0.72)" data-team-board-lane="handoff-preview">' +
                  '<div class="board-project-head"><div class="board-project-title"><span class="board-project-dot"></span><span>Blocked / Handoff</span></div><span class="board-project-count">0</span></div>' +
                  '<div class="running-board-grid team-board-lane-grid"><div class="team-lane-empty">Blocked work and supervisor handoffs will appear here.</div></div>' +
                '</section>' +
                '<section class="board-project-section team-board-lane" style="--project-accent: rgba(84, 242, 176, 0.72)" data-team-board-lane="agents-preview">' +
                  '<div class="board-project-head"><div class="board-project-title"><span class="board-project-dot"></span><span>Agents</span></div><span class="board-project-count">0</span></div>' +
                  '<div class="running-board-grid team-board-lane-grid"><div class="team-lane-empty">Supervisor and worker agent records will appear here.</div></div>' +
                '</section>' +
                '<section class="board-project-section team-board-lane team-events-lane" style="--project-accent: rgba(196, 163, 255, 0.76)" data-team-board-lane="events-preview">' +
                  '<div class="board-project-head"><div class="board-project-title"><span class="board-project-dot"></span><span>Recent Events</span></div><span class="board-project-count">0</span></div>' +
                  '<div class="running-board-grid team-board-lane-grid"><div class="team-lane-empty">Mailbox events will appear after initialization.</div></div>' +
                '</section>' +
              '</div>' +
            '</div>' +
            renderTeamSkillCard(bundledSkills) +
            renderTeamSnakeDemoCard(dashboard);
        }
        const tasks = Array.isArray(teamCoordination.tasks) ? teamCoordination.tasks : [];
        const agents = Array.isArray(teamCoordination.agents) ? teamCoordination.agents : [];
        const workspaces = Array.isArray(teamCoordination.workspaces) ? teamCoordination.workspaces : [];
        if (teamCoordination.openWorkspaceId) {
          state.ui.teamWorkspacePageId = String(teamCoordination.openWorkspaceId || "");
        }
        const selectedTask = findTeamTaskById(teamCoordination, state.ui.teamTaskPageId);
        const selectedWorkspace = findTeamWorkspaceById(teamCoordination, state.ui.teamWorkspacePageId);
        if (state.ui.teamTaskPageId && !selectedTask) {
          state.ui.teamTaskPageId = undefined;
        }
        if (state.ui.teamWorkspacePageId && !selectedWorkspace) {
          state.ui.teamWorkspacePageId = undefined;
        }
        if (selectedWorkspace) {
          return renderTeamWorkspacePage(teamCoordination, dashboard, selectedWorkspace);
        }
        if (selectedTask) {
          return renderTeamTaskWorkspace(teamCoordination, dashboard, selectedTask);
        }
        return renderTeamReadinessCard(teamCoordination, bundledSkills, serviceMetadata) +
          renderTeamWorkspaceHome(teamCoordination, dashboard) +
          renderTeamSkillCard(bundledSkills);
      }
`;
