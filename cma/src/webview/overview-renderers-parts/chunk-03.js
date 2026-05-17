module.exports = `          "npm config set prefix ~/.local",
          "npm install -g @openai/codex@latest",
          "hash -r",
          "codex --version"
        ];
        const guidanceRows = upgradeGuidance
          .map((item) => '<div class="summary-copy mono">' + esc(String(item)) + "</div>")
          .join("");
        const guidanceCopy = '<div class="summary-copy">Safe user-level upgrade path:</div>'
          + guidanceRows
          + '<div class="summary-copy">Run these in your terminal when this terminal is using the same shell profile as this VS Code session.</div>';

        return renderSummaryCard(
          "Codex CLI",
          activeCodex && activeCodex.ok ? (activeVersion || "unknown") : "Unknown",
          activeCodex && activeCodex.ok
            ? (activePath ? "Active: " + activePath : "No active path reported") + " · " + activeSource
            : "Unable to resolve active Codex.",
          activeCodex && activeCodex.ok ? "Tooling" : "Waiting",
          MEDIA.tooling,
          "",
          (items.length
            ? (
                '<div class="summary-copy">Discovered executables:</div>' +
                discoveredRows +
                (hiddenRows ? '<div class="summary-copy">+' + esc(String(hiddenRows)) + ' more</div>' : '') +
                '<div class="summary-copy">' + esc(conflictText) + '</div>' +
                guidanceCopy
              )
            : '<div class="summary-copy">No executable inventory available yet.</div>'
          ),
          activeCodex && activeCodex.ok ? "Active" : "Unknown"
        );
      }

      function loopDaemonSummary(loopDaemon, payload) {
        if (!loopDaemon || !loopDaemon.available) {
          return {
            value: "Unavailable",
            copy: "No loop daemon detected.",
            phase: "Waiting",
            art: MEDIA.waiting,
          };
        }
        if (loopDaemon.running) {
          return {
            value: "Running",
            copy: (loopDaemon.intervalMinutes
              ? ("Heartbeat every " + String(loopDaemon.intervalMinutes) + " min.")
              : "Loop daemon is alive.") + (loopDaemon.maxTicks ? (" · ticks " + String(loopDaemon.completedTicks || 0) + "/" + String(loopDaemon.maxTicks)) : ""),
            phase: "Tooling",
            art: MEDIA.timeline,
          };
        }
        return {
          value: loopDaemon.label || "Stopped",
          copy: payload && payload.lastSuccessfulRefreshAt
            ? ("Last refresh " + formatTimestamp(payload.lastSuccessfulRefreshAt))
            : "Loop daemon is idle.",
          phase: "Waiting",
          art: MEDIA.waiting,
        };
      }

      function renderLoopDaemonCard(daemon) {
        const statusLabelValue = String(daemon.label || "");
        const statusKey = daemon.usageLimited
          ? "limited"
          : (daemon.running ? "running" : (statusLabelValue.toLowerCase().includes("exited") ? "exited" : "stopped"));
        const pending = state.ui.pendingLoopActions && daemon.stateDir ? state.ui.pendingLoopActions[daemon.stateDir] : undefined;
        const stopPending = pending && pending.action === "stop";
        const startPending = pending && pending.action === "start";
        const restartPending = pending && pending.action === "restart";
        const statusLabel = restartPending ? "RESTARTING" : stopPending ? "STOPPING" : startPending ? "STARTING" : undefined;
        const stableBadge = daemon.running
          ? '<span class="badge badge-running">RUNNING</span>'
          : '<span class="badge ' + (statusKey === "exited" || statusKey === "limited" ? 'badge-recent' : 'badge-linked') + '">' + esc((statusLabelValue || "Stopped Cleanly").toUpperCase()) + '</span>';
        const externalBadge = daemon.external ? '<span class="badge badge-linked">EXTERNAL</span>' : '';
        const actions = [
          daemon.threadId ? '<button class="chip" data-codex-thread="' + esc(daemon.threadId) + '" type="button">Codex</button>' : "",
          daemon.daemonStdoutPath ? '<button class="chip" data-open-log="' + esc(daemon.daemonStdoutPath) + '" type="button">Open daemon log</button>' : "",
          daemon.daemonStdoutPath ? '<button class="chip" data-tail-loop-log="' + esc(daemon.daemonStdoutPath) + '" type="button">Tail daemon log</button>' : "",
          daemon.rawLogPath ? '<button class="chip" data-open-log="' + esc(daemon.rawLogPath) + '" type="button">Open tick log</button>' : "",
          daemon.tmuxSession ? '<button class="chip" data-attach-loop-tmux="' + esc(daemon.tmuxSession) + '" type="button">Attach tmux</button>' : "",
          daemon.promptFile ? '<button class="chip" data-open-log="' + esc(daemon.promptFile) + '" type="button">Open prompt.md</button>' : "",
          daemon.roadmapPath ? '<button class="chip" data-open-log="' + esc(daemon.roadmapPath) + '" type="button">Open ROADMAP.md</button>' : "",
          daemon.stateDir ? '<button class="chip" data-generate-loop-rotation="' + esc(daemon.stateDir || "") + '" type="button">Generate Rotation Prompt</button>' : "",
          daemon.lastHandoffPath ? '<button class="chip" data-copy-loop-rotation="' + esc(daemon.stateDir || "") + '" type="button">Copy Rotation Prompt</button>' : "",
          daemon.lastHandoffPath ? '<button class="chip" data-open-log="' + esc(daemon.lastHandoffPath) + '" type="button">Open Handoff</button>' : "",
          daemon.running && !daemon.external ? '<button class="chip warn-chip" data-stop-loop-at="' + esc(daemon.stateDir || "") + '" type="button"' + (pending ? ' disabled' : '') + '>' + esc(stopPending ? "Stopping…" : "Stop") + '</button>' : "",
          !daemon.running && !daemon.external ? '<button class="chip" data-start-loop-at="' + esc(daemon.stateDir || "") + '" data-loop-workspace="' + esc(daemon.workspace || "") + '" data-loop-prompt-file="' + esc(daemon.promptFile || "") + '" data-loop-thread-id="' + esc(daemon.threadId || "") + '" data-loop-interval-minutes="' + esc(String(daemon.intervalMinutes || "")) + '" data-loop-max-ticks="' + esc(String(daemon.maxTicks || "")) + '" type="button"' + (pending ? ' disabled' : '') + '>' + esc(startPending ? "Starting…" : "Start") + '</button>' : "",
          daemon.threadId && daemon.intervalMinutes && !daemon.external ? '<button class="chip" data-restart-loop-at="' + esc(daemon.stateDir || "") + '" data-loop-workspace="' + esc(daemon.workspace || "") + '" data-loop-prompt-file="' + esc(daemon.promptFile || "") + '" data-loop-thread-id="' + esc(daemon.threadId || "") + '" data-loop-interval-minutes="' + esc(String(daemon.intervalMinutes || "")) + '" data-loop-max-ticks="' + esc(String(daemon.maxTicks || "")) + '" type="button"' + (pending ? ' disabled' : '') + '>' + esc(restartPending ? "Restarting…" : "Restart") + '</button>' : ""
        ].filter(Boolean).join("");
        return '<div class="loop-daemon-card ' + esc(statusKey) + '" data-loop-thread-card="' + esc(daemon.threadId || "") + '">' +
          '<div class="loop-daemon-head">' +
            '<div class="loop-daemon-title-wrap">' +
              '<div class="loop-daemon-title">' + esc(daemon.workspaceLabel || daemon.workspace || "codex-loop") + '</div>' +
              '<div class="loop-daemon-subtitle">' + esc(daemon.workspace || "No workspace path recorded") + '</div>' +
            '</div>' +
            '<span class="loop-daemon-badges">' + externalBadge + (statusLabel ? '<span class="badge badge-linked">' + esc(statusLabel) + '</span>' : stableBadge) + '</span>' +
          '</div>' +
          '<div class="loop-daemon-meta">' +
            (daemon.external ? '<span class="meta-pill">External diagnostics</span>' : '') +
            (daemon.pid ? '<span class="meta-pill">PID ' + esc(String(daemon.pid)) + '</span>' : '') +
            (daemon.intervalMinutes ? '<span class="meta-pill">' + esc(String(daemon.intervalMinutes)) + ' min</span>' : '') +
            (daemon.uptimeMinutes ? '<span class="meta-pill">Uptime ' + esc(String(daemon.uptimeMinutes)) + ' min</span>' : '') +
            (daemon.maxTicks ? '<span class="meta-pill">Ticks ' + esc(String(daemon.completedTicks || 0)) + '/' + esc(String(daemon.maxTicks)) + '</span>' : '') +
            (daemon.stopReason ? '<span class="meta-pill">' + esc(short(daemon.stopReason, 24)) + '</span>' : '') +
            (daemon.heartbeatAt ? '<span class="meta-pill">Last heartbeat ' + esc(formatTimestamp(daemon.heartbeatAt)) + '</span>' : '') +
            (daemon.threadId ? '<span class="meta-pill">Thread ' + esc(short(daemon.threadId, 16)) + '</span>' : '') +
            (daemon.tmuxSession ? '<span class="meta-pill">tmux ' + esc(short(daemon.tmuxSession, 28)) + '</span>' : '') +
            (daemon.launcher ? '<span class="meta-pill">' + esc(daemon.launcher) + '</span>' : '') +
            (daemon.source && daemon.source !== daemon.launcher ? '<span class="meta-pill">' + esc(daemon.source) + '</span>' : '') +
            (daemon.promptFileLabel ? '<span class="meta-pill">Context ' + esc(daemon.promptFileLabel) + '</span>' : '') +
            (daemon.roadmapPath ? '<span class="meta-pill">ROADMAP</span>' : '') +
            (daemon.lastHandoffAt ? '<span class="meta-pill">Handoff ' + esc(formatTimestamp(daemon.lastHandoffAt)) + '</span>' : '') +
            (daemon.rotationGeneration ? '<span class="meta-pill">Rotation #' + esc(String(daemon.rotationGeneration)) + '</span>' : '') +
          '</div>' +
          '<div class="loop-daemon-detail">' + esc(daemon.detail || daemon.tailLine || "No loop daemon detail yet.") + '</div>' +
          '<div class="loop-daemon-actions">' + actions + '</div>' +
        '</div>';
      }

      function renderLoopDaemonDashboard(loopDaemons, loopDaemon, loopSupport) {
        if (!loopSupport || !loopSupport.available) {
          const canInstallBundled = Boolean(loopSupport && loopSupport.installable);
          return '<div class="loop-install-card">' +
            '<div class="section-title">codex-loop Required</div>' +
            '<div class="section-note">Loop controls need the local codex-loop skill. This machine is missing the automation script, so start/restart actions cannot run yet.' + (canInstallBundled ? ' Install the bundled copy from this VSIX to enable Loop without downloading anything.' : '') + '</div>' +
            '<div class="loop-daemon-detail">Expected script: ' + esc((loopSupport && loopSupport.scriptPath) || "~/.codex/skills/codex-loop/scripts/codex_loop_automation.py") + '</div>' +
            (loopSupport && loopSupport.bundledSkillPath ? '<div class="loop-daemon-detail">Bundled skill: ' + esc(loopSupport.bundledSkillPath) + '</div>' : '') +
            '<div class="loop-daemon-actions">' +
              (canInstallBundled ? '<button class="chip primary" data-install-codex-loop-skill type="button">Install bundled codex-loop</button>' : '') +
              '<button class="chip" data-open-external-url="' + esc((loopSupport && loopSupport.installUrl) || "https://github.com/Harzva/codex-managed-agent") + '" type="button">Open GitHub Install Guide</button>' +
              '<button class="chip" data-copy-text="' + esc((loopSupport && loopSupport.scriptPath) || "~/.codex/skills/codex-loop/scripts/codex_loop_automation.py") + '" data-copy-label="Loop script path" type="button">Copy expected path</button>' +
            '</div>' +
          '</div>';
        }
        const items = Array.isArray(loopDaemons) && loopDaemons.length
          ? loopDaemons
          : (loopDaemon && loopDaemon.available ? [loopDaemon] : []);
        if (!items.length) {
          return '<div class="panel loop-daemon-empty">' +
            renderCuteEmpty("No loop daemon detected", "When a codex-loop daemon writes its local state, this page will surface it here with direct log and tmux shortcuts.", MEDIA.waiting) +
          '</div>';
        }
        const ownedItems = items.filter((daemon) => daemon && !daemon.external);
        const externalItems = items.filter((daemon) => daemon && daemon.external);
        const sections = [];
        if (ownedItems.length) {
          sections.push(
            '<div class="loop-daemon-scope">' +
              '<div class="team-lane-heading"><span>Codex / Team Core Runtime</span><span class="meta-pill">' + esc(String(ownedItems.length)) + '</span></div>' +
              '<div class="loop-daemon-list">' + ownedItems.map((daemon) => renderLoopDaemonCard(daemon)).join("") + '</div>' +
            '</div>'
          );
        }
        if (externalItems.length) {
          sections.push(
            '<div class="loop-daemon-scope">' +
              '<div class="team-lane-heading"><span>External Diagnostics</span><span class="meta-pill">' + esc(String(externalItems.length)) + '</span></div>' +
              '<div class="section-note">Shown because external Claude/claude-loop diagnostics are explicitly enabled. These rows are outside Codex / Team Core owned runtime.</div>' +
              '<div class="loop-daemon-list">' + externalItems.map((daemon) => renderLoopDaemonCard(daemon)).join("") + '</div>' +
            '</div>'
          );
        }
        return '<div class="loop-daemon-scope-stack">' + sections.join("") + '</div>';
      }

      function renderInsightCard(title, copy, meta) {
        return '<div class="insight-card">' +
          '<div class="insight-card-head">' +
            '<div class="insight-card-title">' + esc(title) + '</div>' +
            (meta ? '<span class="meta-pill">' + esc(meta) + '</span>' : '') +
          '</div>' +
          '<div class="insight-card-copy">' + esc(copy) + '</div>' +
        '</div>';
      }

      function renderMemoryShellCard(card) {
        const kind = String(card && card.kind || "memo");
        const kindLabel = kind === "prompt"
          ? "Prompt Card"
          : (kind === "rule" ? "Rule Card" : "Memo Card");
        const title = String(card && card.title || "");
        const copy = String(card && card.copy || "");
        const sourcePath = String(card && card.sourcePath || "");
        const actionLabel = String(card && card.actionLabel || "Open");
        const linked = Boolean(card && card.linked);
        const sourceAction = sourcePath
          ? '<button class="chip" data-open-repo-file="' + esc(sourcePath) + '" type="button">' + esc(actionLabel) + '</button>'
          : "";
        const sourceState = sourcePath
          ? (short(sourcePath, 32) + (linked ? " linked" : " missing"))
          : "No source linked yet";
        return '<div class="memory-shell-card type-' + esc(kind) + '">' +
          '<div class="memory-shell-head">' +
            '<span class="memory-shell-kicker">' + esc(kindLabel) + '</span>' +
            '<span class="meta-pill">' + esc(linked ? "File Linked" : "Missing") + '</span>' +
          '</div>' +
          '<div class="memory-shell-title">' + esc(title) + '</div>' +
          '<div class="memory-shell-copy">' + esc(copy) + '</div>' +
          '<div class="memory-shell-meta">' +
            '<span class="meta-pill">' + esc(kindLabel) + '</span>' +
            '<span class="meta-pill">' + esc(sourceState) + '</span>' +
          '</div>' +
          sourceAction +
        '</div>';
      }

      function renderMemoryShortcutRow() {
        return '<div class="chip-row">' +
          '<span class="meta-pill">Memory</span>' +
          '<button class="chip" data-open-repo-file=".codex-loop/prompt.md" type="button">Prompt</button>' +
          '<button class="chip" data-open-repo-file="ROADMAP.md" type="button">Rule</button>' +
          '<button class="chip" data-open-repo-file=".claude/plans/ACTIVE_PLAN.md" type="button">Memo</button>' +
        '</div>';
      }

      function renderMemoryShellGrid(payload = state.payload) {
        const cards = Array.isArray(payload && payload.memoryCards) && payload.memoryCards.length
          ? payload.memoryCards
          : [
              { kind: "prompt", title: "Prompt Card", copy: "Keep a reusable working prompt visible beside live agent activity.", sourcePath: ".codex-loop/prompt.md", actionLabel: "Open Prompt", linked: false },
              { kind: "rule", title: "Rule Card", copy: "Surface durable guardrails and loop rules without burying them in tabs.", sourcePath: "ROADMAP.md", actionLabel: "Open ROADMAP", linked: false },
              { kind: "memo", title: "Memo Card", copy: "Hold compact decisions and reminders that should persist across iterations.", sourcePath: ".claude/plans/ACTIVE_PLAN.md", actionLabel: "Open Active Plan", linked: false },
            ];
        return '<div class="memory-shell-grid">' +
          cards.map((card) => renderMemoryShellCard(card)).join("") +
        '</div>';
      }

      function renderCodexConfigOverview(configs = [], skills = []) {
        const rows = Array.isArray(configs) ? configs : [];
        const skillRows = Array.isArray(skills) ? skills : [];
        const installedSkillCount = skillRows.filter((skill) => skill && skill.installed).length;
        const bundledSkillCount = skillRows.filter((skill) => skill && skill.bundled && !skill.installed).length;
        const order = { system: 0, user: 1, project: 2 };
        const sorted = rows.slice().sort((a, b) => {
          const left = order[String(a && a.scope || "")] ?? 9;
          const right = order[String(b && b.scope || "")] ?? 9;
          return left - right;
        });
        const cards = sorted.map((item) => {
          const exists = Boolean(item && item.exists);
          const optional = Boolean(item && item.optional);
          const status = exists ? "Loaded" : (optional ? "Optional missing" : "Missing");
          const tone = exists ? "ok" : (optional ? "muted" : "warn");
          const rootLine = item && item.rootLabel
            ? '<div class="codex-config-root">' + esc(item.rootLabel) + '</div>'
            : "";
          const content = exists
            ? '<pre class="codex-config-pre"><code>' + esc(item.content || "# Empty config file") + '</code></pre>'
            : '<div class="codex-config-empty">' + esc(item && item.error ? item.error : "No config file at this scope.") + '</div>';
          return '<article class="codex-config-card ' + esc(tone) + '">' +
            '<div class="codex-config-head">' +
              '<div class="codex-config-identity">' +
                '<div class="codex-config-scope">' + esc((item && item.label) || "Config") + '</div>' +
                '<div class="codex-config-path mono">' + esc((item && item.path) || "-") + '</div>' +
                rootLine +
              '</div>' +
              '<span class="codex-config-status ' + esc(tone) + '">' + esc(status) + '</span>' +
            '</div>' +
            content +
          '</article>';
        }).join("");
        return '<div class="codex-config-summary">' +
            '<span class="meta-pill">Config scopes ' + esc(String(sorted.length || 0)) + '</span>' +
            '<span class="meta-pill">Installed skills ' + esc(String(installedSkillCount)) + '</span>' +
            '<span class="meta-pill">Bundled-only skills ' + esc(String(bundledSkillCount)) + '</span>' +
          '</div>' +
          '<div class="codex-config-card-grid">' +
            (cards || '<div class="codex-config-empty">No Codex config paths reported yet.</div>') +
          '</div>';
      }

      function renderProviderCountPills(counts = {}) {
        const entries = Object.keys(counts || {})
          .filter((key) => Number(counts[key] || 0) > 0)
          .sort((a, b) => Number(counts[b] || 0) - Number(counts[a] || 0) || a.localeCompare(b));
        if (!entries.length) return '<span class="meta-pill">No provider metadata</span>';
        return entries.map((key) => {
          const modifier = String(key).toLowerCase() === "unknown" ? " is-warning" : "";
          return '<span class="provider-health-provider-pill' + modifier + '"><span>' + esc(key) + '</span><strong>' + esc(String(counts[key] || 0)) + '</strong></span>';
        }).join("");
      }

      function providerCountTotal(counts = {}) {
        return Object.keys(counts || {}).reduce((sum, key) => sum + Number(counts[key] || 0), 0);
      }

      function dominantProviderLabel(counts = {}) {
        const entries = Object.keys(counts || {})
          .filter((key) => Number(counts[key] || 0) > 0)
          .sort((a, b) => Number(counts[b] || 0) - Number(counts[a] || 0) || a.localeCompare(b));
        if (!entries.length) return "None";
        const top = entries[0];
        return top + " " + String(counts[top] || 0);
      }

      function renderSqliteInventory(inventory = {}) {
        const item = inventory && typeof inventory === "object" ? inventory : {};
        const databases = Array.isArray(item.databases) ? item.databases : [];
        const extraFiles = Array.isArray(item.extraFiles) ? item.extraFiles.filter((file) => file && file.exists) : [];
        const renderFileChip = (file) => {
          const kind = String(file.kind || "sqlite").toUpperCase();
          const name = file.name || String(file.path || "sqlite-file").split(/[\\\\/]/).pop();
          return '<span class="provider-health-sqlite-file kind-' + esc(String(file.kind || "sqlite")) + '">' +
            '<span>' + esc(name) + '</span>' +
            '<strong>' + esc(kind) + ' · ' + esc(formatBytes(file.size || 0)) + '</strong>' +
          '</span>';
        };
        const renderExtraFiles = () => {
          if (!extraFiles.length) return "";
          return '<div class="provider-health-sqlite-row provider-health-sqlite-extra">' +
            '<div class="provider-health-sqlite-main">' +
              '<span class="provider-health-sqlite-name">Extra SQLite-related files</span>' +
              '<span class="provider-health-card-label">No matching main database in this scan</span>' +
            '</div>' +
            '<div class="provider-health-sqlite-files">' + extraFiles.map(renderFileChip).join("") + '</div>' +
          '</div>';
        };
        if (!databases.length) {
          return '<div class="provider-health-sqlite-list">' +
            '<div class="provider-health-path mono">No main SQLite databases found in ' + esc(item.root || "~/.codex") + '</div>' +
            renderExtraFiles() +
          '</div>';
        }
        return '<div class="provider-health-sqlite-list">' + databases.map((db) => {
          const companions = Array.isArray(db.companions) ? db.companions.filter((part) => part && part.exists) : [];
          const files = Array.isArray(db.files) ? db.files.filter((file) => file && file.exists) : [];
          const companionLabel = companions.length
            ? companions.map((part) => (part.name || String(part.kind || "").toUpperCase()) + " " + formatBytes(part.size)).join(" · ")
            : "No WAL/SHM companions";
          return '<div class="provider-health-sqlite-row">' +
            '<div class="provider-health-sqlite-main">' +
              '<span class="provider-health-sqlite-name">' + esc(db.name || "database.sqlite") + '</span>' +
              '<span class="provider-health-card-label">' + esc(db.label || "SQLite database") + '</span>' +
            '</div>' +
            '<div class="provider-health-sqlite-meta mono">' +
              '<span>' + esc(formatBytes(db.size || 0)) + '</span>' +
              '<span>' + esc(companionLabel) + '</span>' +
            '</div>' +
            (files.length ? ('<div class="provider-health-sqlite-files">' + files.map(renderFileChip).join("") + '</div>') : "") +
          '</div>';
        }).join("") + renderExtraFiles() + '</div>';
      }

      function renderSqliteSchemaMap(schema = {}) {
        const item = schema && typeof schema === "object" ? schema : {};
        if (!item.available) {
          return '<div class="provider-health-path mono">Schema unavailable: ' + esc(item.reason || "sqlite3 schema query has not returned data.") + '</div>';
        }
        const tables = Array.isArray(item.tables) ? item.tables : [];
        const summary = String(item.tableCount || 0) + ' table' + (Number(item.tableCount || 0) === 1 ? '' : 's') +
          ' · ' + String(item.indexCount || 0) + ' index' + (Number(item.indexCount || 0) === 1 ? '' : 'es') +
          ' · ' + String(item.viewCount || 0) + ' view' + (Number(item.viewCount || 0) === 1 ? '' : 's') +
          ' · ' + String(item.triggerCount || 0) + ' trigger' + (Number(item.triggerCount || 0) === 1 ? '' : 's');
        if (!tables.length) {
          return '<div class="provider-health-path mono">' + esc(summary) + '</div>';
        }
        return '<div class="provider-health-schema-map">' +
          '<div class="provider-health-path mono">' + esc(summary) + (item.truncated ? ' · showing first ' + esc(String(tables.length)) + ' tables' : '') + '</div>' +
          '<div class="provider-health-schema-grid">' +
            tables.map((table) => {
              const columns = Array.isArray(table.columns) ? table.columns : [];
              return '<article class="provider-health-schema-table">' +
                '<div class="provider-health-schema-head">' +
                  '<span class="provider-health-sqlite-name">' + esc(table.name || "table") + '</span>' +
                  '<span class="provider-health-card-label">' + esc(table.rowCount === null || table.rowCount === undefined ? "rows ?" : String(table.rowCount) + " rows") + '</span>' +
                '</div>' +
                '<div class="provider-health-schema-columns">' +
                  (columns.length
                    ? columns.map((column) => '<span class="provider-health-schema-column' + (column.pk ? ' pk' : '') + '" title="' + esc((column.name || "") + " " + (column.type || "") + (column.pk ? " primary key" : "")) + '">' +
                      '<strong>' + esc(short(column.name || "column", 24)) + '</strong>' +
                      '<em>' + esc(short(column.type || "value", 18)) + (column.pk ? ' · PK' : '') + '</em>' +
                    '</span>').join("")
                    : '<span class="provider-health-path mono">No columns reported.</span>') +
                '</div>' +
              '</article>';
            }).join("") +
          '</div>' +
        '</div>';
      }

      function providerHealthTone(health = {}) {
        const status = String(health.sqliteStatus || "");
        if (health.mismatch) return "warn";
        if (Number(health.sqliteMissingProviderCount || 0) > 0) return "warn";
        if (["missing", "unreadable", "no_sqlite3", "query_failed", "no_provider_metadata"].includes(status)) return "muted";
        return "ok";
      }

      function providerHealthLabel(health = {}) {
        if (health.mismatch) return "CMA visible, Desktop may differ";
        if (Number(health.sqliteMissingProviderCount || 0) > 0) return "SQLite metadata incomplete";
        const status = String(health.sqliteStatus || "");
        if (status === "missing") return "SQLite unavailable";
        if (status === "unreadable") return "SQLite unreadable";
        if (status === "no_sqlite3") return "SQLite CLI unavailable";
        if (status === "query_failed") return "SQLite query warning";
        if (status === "no_provider_metadata") return "No SQLite provider metadata";
        return "Aligned";
      }

      function renderProviderSyncSummary(syncState = {}) {
        const item = syncState && typeof syncState === "object" ? syncState : {};
        if (!item.mode) {
          return '<div class="provider-health-path mono">Preview first: no SQLite or rollout session metadata will be changed until Apply is pressed.</div>';
        }
        const planned = Number(item.plannedRows || 0);
        const updated = Number(item.updatedRows || 0);
        const plannedSessionFiles = Number(item.plannedSessionFiles || 0);
        const updatedSessionFiles = Number(item.updatedSessionFiles || 0);
        const byProvider = renderProviderCountPills(item.plannedByProvider || {});
        const backup = item.backupDir ? ('<div class="provider-health-path mono">Backup: ' + esc(item.backupDir) + '</div>') : '';
        const busy = item.busy ? '<div class="provider-health-progress"><span></span><strong>Working</strong></div>' : '';
        return busy +
          '<div class="provider-health-path mono">' +
            esc(item.message || (item.mode === "apply" ? "Provider sync finished." : "Provider sync preview ready.")) +
          '</div>' +
          '<div class="provider-health-provider-row">' + byProvider + '</div>' +
          '<div class="provider-health-path mono">' +
            esc(String(planned)) + ' planned · ' +
            esc(String(item.plannedActiveRows || 0)) + ' active · ' +
            esc(String(item.plannedArchivedRows || 0)) + ' archived' +
            ' · ' + esc(String(plannedSessionFiles)) + ' session file' + (plannedSessionFiles === 1 ? '' : 's') +
            (item.mode === "apply" ? (' · ' + esc(String(updated)) + ' SQLite updated · ' + esc(String(updatedSessionFiles)) + ' session file' + (updatedSessionFiles === 1 ? '' : 's') + ' updated') : '') +
          '</div>' +
          backup;
      }

      function renderOpenAiSidebarLimitSummary(limitState = {}) {
        const item = limitState && typeof limitState === "object" ? limitState : {};
        if (!item.mode) {
          return '<div class="provider-health-path mono">Preview first: CMA will only patch the installed OpenAI extension after Apply is pressed.</div>';
        }
        const busy = item.busy ? '<div class="provider-health-progress"><span></span><strong>Working</strong></div>' : '';
        const backup = item.backupPath ? ('<div class="provider-health-path mono">Backup: ' + esc(item.backupPath) + '</div>') : '';
        const extensionPath = item.extensionJsPath ? ('<div class="provider-health-path mono">Extension: ' + esc(item.extensionJsPath) + '</div>') : '';
        return busy +
          '<div class="provider-health-path mono">' + esc(item.message || "OpenAI sidebar limit check finished.") + '</div>' +
          '<div class="provider-health-path mono">' +
            'Current ' + esc(String(item.currentLimit || 0)) +
            ' · target ' + esc(String(item.targetLimit || 200)) +
            ' · matches ' + esc(String(item.matchCount || 0)) +
          '</div>' +
          extensionPath +
          backup;
      }

      function renderProviderVisibilityHealth(health = {}, syncState = {}) {
        const item = health && typeof health === "object" ? health : {};
        const tone = providerHealthTone(item);
        const sqliteDetail = item.sqliteExists
          ? (item.sqliteReadable ? ('Status ' + (item.sqliteStatus || 'present')) : 'File exists but is not readable')
          : 'No state_5.sqlite file found';
        const rolloutActiveCounts = item.rolloutProviderCountsActive || {};
        const rolloutArchivedCounts = item.rolloutProviderCountsArchived || {};
        const sqliteActiveCounts = item.sqliteProviderCountsActive || {};
        const sqliteArchivedCounts = item.sqliteProviderCountsArchived || {};
        const sqliteTotals = item.sqliteProviderTotals || {};
        const sqliteMissingProvider = Number(item.sqliteMissingProviderCount || 0);
        const sqliteMissingActive = Number(sqliteTotals.missingProviderActive || 0);
        const sqliteMissingArchived = Number(sqliteTotals.missingProviderArchived || 0);
        const sqliteTotal = Number(sqliteTotals.all || 0);
        const sqliteActiveTotal = Number(sqliteTotals.active || 0);
        const sqliteArchivedTotal = Number(sqliteTotals.archived || 0);
        const rolloutActiveScanned = Number(item.rolloutScannedActiveFiles || 0);
        const rolloutArchivedScanned = Number(item.rolloutScannedArchivedFiles || 0);
        const rolloutKnownTotal = providerCountTotal(rolloutActiveCounts) + providerCountTotal(rolloutArchivedCounts);
        const sqliteKnownTotal = providerCountTotal(sqliteActiveCounts) + providerCountTotal(sqliteArchivedCounts);
        const sqliteInventory = item.sqliteInventory && typeof item.sqliteInventory === "object" ? item.sqliteInventory : {};
        const sqliteSchema = item.sqliteSchema && typeof item.sqliteSchema === "object" ? item.sqliteSchema : {};
        const sqliteDatabaseCount = Number(sqliteInventory.databaseCount || 0);
        const sqliteCompanionCount = Number(sqliteInventory.companionCount || 0);
        const sqliteFileCount = Number(sqliteInventory.sqliteFileCount || sqliteDatabaseCount + sqliteCompanionCount || 0);
        const statusLabel = item.mismatch ? "Needs sync review" : (tone === "ok" ? "Provider metadata aligned" : "Provider metadata diagnostic");
        const syncBusy = Boolean(syncState && syncState.busy);
        const actionCopy = item.mismatch
          ? "Preview the sync, then apply only if the planned SQLite rows and rollout session files match the current Codex provider."
          : "No mismatch is visible from the current scan. Preview remains available for audit.";
        return '<div class="provider-health-hero ' + esc(tone) + '">' +
            '<div class="provider-health-status-block">' +
              '<span class="provider-health-kicker">Codex Provider Sync</span>' +
              '<div class="provider-health-title">' + esc(statusLabel) + '</div>' +
              '<div class="provider-health-copy">' + esc(item.message || "CMA can read rollout JSONL, while the desktop app depends on SQLite provider metadata.") + '</div>' +
            '</div>' +
            '<div class="provider-health-hero-side">' +
              '<span class="provider-health-status ' + esc(tone) + '">' + esc(item.mismatch ? "Mismatch" : (tone === "ok" ? "Healthy" : "Diagnostic")) + '</span>' +
              '<div class="provider-health-provider-now">' + esc(item.currentProvider || "openai") + '</div>' +
              '<div class="provider-health-card-label">Current config</div>' +
            '</div>' +
          '</div>' +
          '<div class="provider-health-summary-strip">' +
            '<article class="provider-health-summary-item">' +
              '<div class="provider-health-card-label">Config source</div>' +
              '<div class="provider-health-card-value">' + esc(item.currentProvider || "openai") + '</div>' +
              '<div class="provider-health-path mono">' + esc(item.configPath || "~/.codex/config.toml") + '</div>' +
`;
