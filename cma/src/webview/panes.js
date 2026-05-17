const { renderBoardPane } = require("./board");
const { renderBootAnimatedIcon } = require("./boot");
const { renderDrawerShell } = require("./drawer");
const { renderInsightsSections } = require("./insights");

function renderWorkspaceShell(media) {
  return `
    <div class="shell">
      <section class="panel">
        <div class="topbar">
          <div class="topbar-status-row">
            <div class="topbar-status-left">
              <div class="hero-kicker">Codex Managed Agent</div>
              <span class="hero-pill mono" id="serviceMeta">Hydrating dashboard…</span>
              <div class="sub" id="heroSummary">Loading local threads, configuration, team runtime, and Codex bridge state.</div>
            </div>
          </div>
          <div class="topbar-nav">
            <div class="topbar-nav-left">
              <div class="workspace-tabs">
                <button class="workspace-tab active" data-view="overview" type="button">Overview</button>
                <button class="workspace-tab" data-view="threads" type="button">Threads</button>
                <button class="workspace-tab" data-view="board" type="button">Board</button>
                <button class="workspace-tab" data-view="team" type="button">Team</button>
                <button class="workspace-tab" data-view="loop" type="button">Loop</button>
                <button class="workspace-tab" data-view="insights" type="button">Insights</button>
              </div>
            </div>
            <div class="topbar-nav-right actions">
              <div class="surface-toggle-group header-control">
                <span class="header-control-label">Open</span>
                <div class="chip-row">
                  <a class="chip" data-command-direct="true" href="command:codexAgent.openPanel">Open Editor</a>
                </div>
              </div>
              <details class="service-menu" id="serviceMenu">
                <summary class="chip service-summary header-control"><span class="header-control-label">Service</span><span class="header-control-value">Actions</span></summary>
                <div class="service-panel">
                  <a id="reloadLink" class="chip" data-close-chrome-menu="serviceMenu" data-command-direct="true" href="command:codexAgent.refreshPanel">Reload</a>
                  <a id="startServerLink" class="chip" data-close-chrome-menu="serviceMenu" data-command-direct="true" href="command:codexAgent.startServer">Start Backend</a>
                  <a id="restartServerLink" class="chip service-restart" data-close-chrome-menu="serviceMenu" data-command-direct="true" href="command:codexAgent.restartServer" hidden>Restart Backend</a>
                  <a id="externalLink" class="chip" data-close-chrome-menu="serviceMenu" data-command-direct="true" href="command:codexAgent.openExternal">Open Browser</a>
                </div>
              </details>
            </div>
          </div>
        </div>
        <div id="serviceBanner" class="service-banner visible hydrating">Hydrating dashboard. Progress is estimated until the first workspace payload arrives. <a class="chip" data-command-direct="true" href="command:codexAgent.refreshPanel">Reload</a> <a class="chip service-restart" data-command-direct="true" href="command:codexAgent.restartServer">Restart Backend</a></div>
      </section>
      <section id="completionRail" class="completion-rail"></section>

      <section class="workspace-pane active" data-workspace-pane="overview">
        <div class="overview-local-nav">
          <div class="overview-local-title">
            <span class="overview-local-kicker">Overview</span>
            <span class="overview-local-copy">Configuration, skills, and memory live together here.</span>
          </div>
          <div class="overview-subtabs" aria-label="Overview sections">
            <button class="overview-subtab active" data-overview-subview="dashboard" type="button">Dashboard</button>
            <button class="overview-subtab" data-overview-subview="config" type="button">Config</button>
            <button class="overview-subtab" data-overview-subview="skills" type="button">Skills</button>
            <button class="overview-subtab" data-overview-subview="memory" type="button">Memory</button>
            <button class="overview-subtab" data-overview-subview="sidecar" type="button">Sidecar</button>
            <button class="overview-subtab" data-overview-subview="provider" type="button">Provider</button>
            <button class="overview-subtab" data-overview-subview="network" type="button">Network</button>
            <button class="overview-subtab" data-overview-subview="accounts" type="button">Accounts</button>
            <button class="overview-subtab" data-overview-subview="watch" type="button">Watch</button>
          </div>
        </div>
        <section class="overview-digest overview-subpane active" data-overview-pane="dashboard">
          <div class="panel overview-section overview-section-agent agent-task-summary-panel">
            <div class="running-board-toolbar">
              <div class="running-board-title">
                <div class="board-icon"><img class="board-icon-vivid theme-is-optional" src="${media.board}" alt="" /><span class="theme-bar board-icon-clean variant-hero phase-tooling" aria-hidden="true"></span></div>
                <div>
                  <div class="section-title">Agent Task Summary</div>
                  <div class="running-board-copy" id="runningBoardMeta">Thread, board, and coordination signals stay visible before you dive into the explorer.</div>
                </div>
              </div>
              <div class="chip-row">
                <span id="teamHealthBadge" class="team-health-badge off"><span class="team-health-dot"></span><span>Team Off</span></span>
                <button class="chip" data-open-board-view="true" type="button">Open Board</button>
                <button class="chip" id="saveLayoutPrimary" type="button">Save Layout</button>
                <span class="action-status" id="saveLayoutStatus"></span>
              </div>
            </div>
            <div class="agent-task-summary-grid">
              <section class="agent-task-summary-card account-summary-card" id="accountSummaryCard">
                <div class="section-title">Codex Account</div>
                <div id="accountSummaryContent" class="drawer-summary">
                  <div class="section-note">Loading account info…</div>
                </div>
                <div class="chip-row" style="margin-top:8px">
                  <button class="chip" data-overview-subview="accounts" type="button">Manage Accounts</button>
                </div>
              </section>
              <section class="agent-task-summary-card thread-summary-card">
                <div class="section-title">Thread Summary</div>
                <div id="threadCountSummaryStats" class="drawer-summary"></div>
              </section>
              <section class="agent-task-summary-card board-summary-card">
                <div class="section-title">Board Summary</div>
                <div class="section-note" id="boardSummaryHeadline">No cards yet.</div>
                <div id="boardSummaryStats" class="drawer-summary"></div>
              </section>
              <section class="agent-task-summary-card tab-management-card">
                <div class="section-title">Tab Management</div>
                <div class="section-note" id="tabManagementHeadline">Manual thread groups for board tabs.</div>
                <div id="tabManagementStats" class="drawer-summary"></div>
                <div id="tabManagementList" class="tab-management-list"></div>
                <div class="chip-row">
                  <button class="chip" data-create-board-tab="true" type="button">New Tab</button>
                  <button class="chip" data-open-board-view="true" type="button">Open Board</button>
                  <button class="chip" data-clear-thread-tab-filter="true" type="button">Clear Filter</button>
                </div>
              </section>
              <section class="agent-task-summary-card coordination-summary-card">
                <div class="section-title">Coordination Queue</div>
                <div class="section-note" id="boardSummaryNeedsHuman">No active handoffs right now.</div>
                <div id="boardSummaryQueue" class="digest-rail"></div>
              </section>
            </div>
          </div>
          <div class="panel overview-section overview-section-snapshot">
            <div class="section-title">Overview Snapshot</div>
            <div class="section-note">Only the short headline for each workspace topic lives here, so this page stays lightweight.</div>
            <div class="summary-deck" id="overviewDigest">
              <div class="boot-loader" id="hydrationLoader" data-boot-stage="shell">
                <div class="boot-loader-head">
                  <div>
                    <div class="boot-kicker">Workspace hydrate</div>
                    <div class="boot-title" id="bootTitle">Connecting workspace</div>
                    <div class="boot-copy" id="bootCopy">Preparing the VS Code bridge and requesting the Codex-Managed-Agent dashboard state.</div>
                  </div>
                  <div class="boot-visual">
                    ${renderBootAnimatedIcon()}
                    <div class="boot-percent" id="bootPercent">12%</div>
                  </div>
                </div>
                <div class="boot-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="12" aria-label="Dashboard hydration progress">
                  <div class="boot-progress-bar" id="bootProgressBar" style="width: 12%"></div>
                </div>
                <div class="boot-stage-row">
                  <div class="boot-stage active" data-boot-stage="shell">Load shell</div>
                  <div class="boot-stage" data-boot-stage="bridge">Bind VS Code bridge</div>
                  <div class="boot-stage" data-boot-stage="state">Request host state</div>
                  <div class="boot-stage" data-boot-stage="hydrate">Hydrate dashboard</div>
                </div>
                <div class="boot-loader-actions">
                  <span class="boot-loader-note" id="bootNote">This progress is estimated until the host returns the first state payload.</span>
                  <span class="chip-row">
                    <a class="chip" data-command-direct="true" href="command:codexAgent.refreshPanel">Reload</a>
                    <a class="chip service-restart" data-command-direct="true" href="command:codexAgent.restartServer">Restart Backend</a>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section class="overview-subpane" data-overview-pane="config">
          <div class="panel overview-section overview-section-config codex-config-panel">
            <div class="running-board-toolbar">
              <div class="running-board-title">
                <div class="board-icon"><span class="theme-bar board-icon-clean variant-hero phase-planning" aria-hidden="true"></span></div>
                <div>
                  <div class="section-title">Codex Configuration</div>
                  <div class="running-board-copy">System, user/global, and project-local config scopes sit alongside Skills and Memory in Overview.</div>
                </div>
              </div>
              <div class="chip-row">
                <button class="chip" data-overview-subview="skills" type="button">Open Skills</button>
              </div>
            </div>
            <div id="codexConfigOverview" class="codex-config-grid"></div>
          </div>
        </section>
        <section class="overview-subpane" data-overview-pane="sidecar">
          <div class="panel overview-section overview-section-sidecar codex-sidecar-panel">
            <div class="running-board-toolbar">
              <div class="running-board-title">
                <div class="board-icon"><span class="theme-bar board-icon-clean variant-hero phase-integration" aria-hidden="true"></span></div>
                <div>
                  <div class="section-title">Codex Plugin Sidecar</div>
                  <div class="running-board-copy">Read-only bridge status for the official Codex VS Code extension.</div>
                </div>
              </div>
              <div class="chip-row">
                <button class="chip" data-open-new-codex-thread="true" type="button">New Codex Chat</button>
              </div>
            </div>
            <div id="codexSidecarIntegration" class="codex-sidecar-grid"></div>
          </div>
        </section>
        <section class="overview-subpane" data-overview-pane="provider">
          <div class="panel overview-section overview-section-provider provider-health-panel">
            <div class="running-board-toolbar">
              <div class="running-board-title">
                <div class="board-icon"><span class="theme-bar board-icon-clean variant-hero phase-testing" aria-hidden="true"></span></div>
                <div>
                  <div class="section-title">Codex Provider Sync</div>
                  <div class="running-board-copy">Audit and sync Codex config, rollout JSONL providers, and Desktop SQLite visibility metadata.</div>
                </div>
              </div>
            </div>
            <div id="providerVisibilityHealth" class="provider-health-grid"></div>
          </div>
        </section>
        <section class="overview-subpane" data-overview-pane="network">
          <div class="panel overview-section overview-section-network">
            <div class="running-board-toolbar">
              <div class="running-board-title">
                <div class="board-icon"><span class="theme-bar board-icon-clean variant-hero phase-testing" aria-hidden="true"></span></div>
                <div>
                  <div class="section-title">Network Tools</div>
                  <div class="running-board-copy">Run connectivity probes and switch Clash/Mihomo selector groups from inside CMA.</div>
                </div>
              </div>
              <div class="chip-row">
                <button class="chip" data-refresh-clash-proxies="true" type="button">Refresh Proxies</button>
              </div>
            </div>
            <div id="networkToolsPanel" class="codex-auto-accounts-grid"></div>
          </div>
        </section>
        <section class="overview-subpane" data-overview-pane="accounts">
          <div class="panel overview-section overview-section-accounts codex-auto-accounts-panel">
            <div class="running-board-toolbar">
              <div class="running-board-title">
                <div class="board-icon"><span class="theme-bar board-icon-clean variant-hero phase-integration" aria-hidden="true"></span></div>
                <div>
                  <div class="section-title">Codex Accounts</div>
                  <div class="running-board-copy">Managed Codex accounts: create isolated login slots, activate the global auth symlink, and keep import as a migration tool.</div>
                </div>
              </div>
              <div class="chip-row">
                <button class="chip" data-add-codex-account="true" type="button">Add Account</button>
                <button class="chip" data-add-relay-codex-account="true" type="button">Add Relay</button>
                <button class="chip" data-import-codex-account="true" type="button">Import from Codex</button>
              </div>
            </div>
            <div id="codexAutoAccounts" class="codex-auto-accounts-grid"></div>
          </div>
        </section>
        <section class="overview-subpane" data-overview-pane="watch">
          <div class="panel overview-section overview-section-watch">
            <div class="running-board-toolbar">
              <div class="running-board-title">
                <div class="board-icon"><span class="theme-bar board-icon-clean variant-hero phase-integration" aria-hidden="true"></span></div>
                <div>
                  <div class="section-title">Local Watch</div>
                  <div class="running-board-copy">Local thread watchlist for conservative auto-continue, explicit stop/resume controls, and launch blocking reasons.</div>
                </div>
              </div>
              <div class="chip-row">
                <button class="chip" data-refresh-thread-explorer="true" type="button">Refresh</button>
              </div>
            </div>
            <div id="watchSurface" class="watch-surface"></div>
          </div>
        </section>
        <section class="overview-subpane" data-overview-pane="skills">
          <div class="panel">
            <div class="running-board-toolbar">
              <div class="running-board-title">
                <div class="board-icon"><img class="board-icon-vivid theme-is-optional" src="${media.tooling}" alt="" /><span class="theme-bar board-icon-clean variant-hero phase-tooling" aria-hidden="true"></span></div>
                <div>
                  <div class="section-title">Skill Library</div>
                  <div class="running-board-copy" id="skillsPanelMeta">Installed and bundled Codex skills are configuration-level capabilities.</div>
                </div>
              </div>
              <div class="chip-row">
                <button class="chip" data-sync-bundled-skills type="button">Sync Skills</button>
                <button class="chip" data-open-codex-skills-folder type="button">Skills Folder</button>
              </div>
            </div>
            <div id="skillsPanel" class="skills-panel"></div>
          </div>
        </section>
        <section class="overview-subpane" data-overview-pane="memory">
          <div class="panel">
            <div id="memoryPanel" class="memory-page"></div>
          </div>
        </section>
      </section>

      <section class="workspace-pane" data-workspace-pane="team">
        <section class="single-grid">
          <div class="panel team-page-shell">
            <div class="running-board-toolbar">
              <div class="running-board-title">
                <div class="board-icon"><img class="board-icon-vivid theme-is-optional" src="${media.intervention}" alt="" /><span class="theme-bar board-icon-clean variant-hero phase-planning" aria-hidden="true"></span></div>
                <div>
                  <div class="section-title">Team Control Panel</div>
                  <div class="running-board-copy" id="teamPanelMeta">Mailbox state, agents, handoffs, and recent events in one supervisor-facing surface.</div>
                </div>
              </div>
              <div class="chip-row team-toolbar-actions">
                <span id="teamPanelHealthBadge" class="team-health-badge off"><span class="team-health-dot"></span><span>Team Off</span></span>
                <button class="chip primary" data-team-action="initialize" type="button">Initialize</button>
                <button class="chip" data-team-action="open_brief" type="button">team.md</button>
                <button class="chip" data-team-action="assign_selected" type="button">Assign</button>
                <details class="team-toolbar-more">
                  <summary class="chip">More</summary>
                  <div class="team-toolbar-menu">
                    <button class="chip" data-bundled-skill="team-reflective-loop" type="button">Team Skill</button>
                    <button class="chip" data-sync-bundled-skills type="button">Sync Skills</button>
                    <button class="chip" data-open-codex-skills-folder type="button">Skills Folder</button>
                    <button class="chip warn-chip" data-team-action="mark_stale" type="button">Mark Stale</button>
                  </div>
                </details>
              </div>
            </div>
            <div id="teamPanel" class="team-panel-grid"></div>
          </div>
        </section>
      </section>

      <section class="workspace-pane" data-workspace-pane="threads">
        <section class="single-grid">
          <div class="panel thread-explorer-panel">
            <div class="thread-explorer-titlebar">
              <div class="section-title">Thread Explorer</div>
              <div class="section-note">Search, filter, pin, sort, and batch-manage the full workspace.</div>
            </div>
            <div class="page-summary-card thread-page-summary-card">
              <div class="section-title">Thread Summary</div>
              <div id="threadPageSummaryStats" class="drawer-summary"></div>
            </div>
            <div class="thread-explorer-head">
              <div class="thread-search-sort-row">
                <input id="threadSearchMirror" class="search thread-explorer-search" type="search" placeholder="Search title, id, cwd" />
                <div class="thread-sort-row" aria-label="Thread sort order">
                  <span class="sort-label">Sort</span>
                  <button class="chip" data-sort-mirror="project" type="button">Project Directory</button>
                  <button class="chip" data-sort-mirror="updated" type="button">Updated Newest</button>
                  <button class="chip" data-sort-mirror="oldest" type="button">Updated Oldest</button>
                  <button class="chip" data-sort-mirror="created" type="button">Created Newest</button>
                  <button class="chip" data-sort-mirror="name_asc" type="button">Title A-Z</button>
                  <button class="chip" data-sort-mirror="name_desc" type="button">Title Z-A</button>
                  <button class="chip" data-sort-mirror="tokens_desc" type="button">Token Count</button>
                </div>
              </div>
              <div class="thread-toolbar-actions thread-toolbar-primary">
                <button class="chip codex-sidebar-chip" id="codexSidebarButton" type="button">Codex</button>
                <button class="chip new-thread-chip" id="createThreadButton" type="button">New Thread</button>
                <button class="chip" id="refreshThreadsMirror" type="button">Refresh</button>
                <button class="chip" id="scanCodexSessionsMirror" type="button">Scan Sessions</button>
                <button class="chip" id="toggleThreadGroupsMirror" type="button">Collapse Groups</button>
              </div>
            </div>
            <div class="thread-directory-filter-row">
              <span id="rootFilterControl"></span>
              <span id="gitFilterControl"></span>
            </div>
            <div class="thread-filter-row">
                <button class="chip" data-filter-mirror="all" type="button">All</button>
                <button class="chip" data-filter-mirror="running" type="button">Running</button>
                <button class="chip" data-filter-mirror="idle" type="button">Stopped</button>
                <button class="chip" data-filter-mirror="needs_human" type="button">Needs Human Attention</button>
                <button class="chip" data-filter-mirror="archived" type="button">Archived</button>
                <button class="chip" data-filter-mirror="soft_deleted" type="button">Soft Deleted</button>
                <button class="chip" data-toggle-mirror="pinned" type="button">Pinned</button>
                <span id="threadTabFilterControl"></span>
            </div>
            <div class="thread-control-row">
              <div id="batchBarMirror" class="batch-bar"></div>
            </div>
            <div class="section-note" id="threadSummaryMirror">Showing running and recent threads first.</div>
            <div id="threadListMirror" class="thread-list-compact"></div>
          </div>
        </section>
      </section>

      ${renderBoardPane(media)}

      <section class="workspace-pane" data-workspace-pane="loop">
        <section class="loop-dashboard-shell">
          <div class="panel">
            <div class="section-title">Loop Daemons</div>
            <div class="section-note">See discovered codex-loop daemons across the current workspaces, then jump straight into logs or tmux without leaving the dashboard.</div>
            <div id="loopDaemonPage"></div>
          </div>
        </section>
      </section>

      <section class="workspace-pane" data-workspace-pane="insights">
        ${renderInsightsSections()}
      </section>
${renderDrawerShell()}
      <div class="overview-brand-footer is-font-0" id="overviewBrandFooter">
        <button class="brand-cycle-button" data-brand-cycle="true" type="button" aria-label="Cycle brand signature font">
          <div class="title-stack">
            <div class="title">
              <span class="title-seg codex">Codex</span>
              <span class="title-seg managed">Managed</span>
              <span class="title-seg agent">Agent</span>
              <span class="title-seg codex">Lab</span>
            </div>
            <div class="title-strip">Control Surface Signature</div>
          </div>
        </button>
      </div>
      <div class="floating-utility-bar" aria-label="Dashboard display controls">
        <button id="panelLanguageToggle" class="collapse-btn header-control header-toggle-btn panel-language-toggle" data-panel-language-toggle="true" type="button">中文面板</button>
        <button id="followThemeToggle" class="collapse-btn header-control header-toggle-btn" type="button">Follow VS Code: On</button>
        <button id="colorThemeToggle" class="collapse-btn header-control header-toggle-btn" type="button">Theme: Light</button>
        <button id="themeToggle" class="collapse-btn header-control header-toggle-btn" type="button">Visual: Vivid</button>
        <button id="motionToggle" class="collapse-btn header-control header-toggle-btn" type="button">Motion Off</button>
        <button id="soundToggle" class="collapse-btn header-control header-toggle-btn alert-toggle-btn" type="button">Alert: Plink</button>
      </div>
      <div id="memoryEditorContainer"></div>
    </div>
`.trimEnd();
}

module.exports = {
  renderWorkspaceShell,
};
