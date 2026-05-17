function getSkillsMemoryStyles() {
  return `        font-size: 14px;
        font-weight: 800;
        line-height: 1.2;
      }
      .drawer-close {
        min-height: 24px;
        padding: 0 8px;
      }
      .drawer-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .drawer-summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
      }
      #accountSummaryContent.drawer-summary {
        grid-template-columns: minmax(0, 1fr);
        align-items: start;
      }
      #accountSummaryContent > * {
        min-width: 0;
      }
      .codex-account-summary-head {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        margin-bottom: 2px;
        flex-wrap: wrap;
      }
      .codex-account-summary-head strong {
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .codex-account-summary-head .codex-auto-plan-badge,
      .codex-account-summary-head .codex-auto-badge {
        flex: 0 0 auto;
        font-size: 10px;
      }
      .codex-account-summary-token {
        display: flex;
        align-items: baseline;
        gap: 6px;
        min-width: 0;
        color: var(--muted);
        font-size: 11px;
        line-height: 1.35;
        opacity: 0.86;
        overflow-wrap: anywhere;
      }
      .codex-account-summary-token span:last-child {
        min-width: 0;
      }
      .codex-account-summary-token-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        flex: 0 0 auto;
        transform: translateY(1px);
        background: var(--green);
      }
      .codex-account-summary-token-dot.warning {
        background: var(--gold);
      }
      .codex-account-summary-token-dot.expired {
        background: var(--red);
      }
      .codex-account-summary-count {
        color: var(--muted);
        font-size: 11px;
        line-height: 1.35;
        opacity: 0.68;
      }
      #accountSummaryContent .codex-auto-duplicate-warning,
      #accountSummaryContent .codex-auto-account-state,
      #accountSummaryContent .codex-auto-source-path {
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      .drawer-stat {
        border: 1px solid rgba(126, 231, 255, 0.08);
        border-radius: 12px;
        background: rgba(8, 15, 28, 0.7);
        padding: 8px;
      }
      .drawer-stat-label {
        color: var(--muted);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .drawer-stat-value {
        margin-top: 4px;
        font-size: 12px;
        font-weight: 700;
      }
      .action-rail {
        padding: 10px 14px;
        border-bottom: 1px solid rgba(126, 231, 255, 0.08);
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }
      .team-drawer-action-rail {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 10px;
        align-items: start;
      }
      .team-drawer-action-group {
        display: grid;
        gap: 8px;
        min-width: 0;
        padding: 8px 10px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.06);
        background: rgba(255,255,255,0.025);
      }
      .team-drawer-action-label {
        color: var(--muted);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .team-drawer-action-buttons {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }
      .action-rail.confirm {
        background:
          linear-gradient(180deg, rgba(30, 20, 5, 0.26), rgba(9, 16, 29, 0.02)),
          rgba(8, 15, 28, 0.32);
        box-shadow: inset 0 -1px 0 rgba(255, 214, 107, 0.08);
      }
      .action-rail.confirm.danger {
        background:
          linear-gradient(180deg, rgba(47, 11, 17, 0.3), rgba(9, 16, 29, 0.02)),
          rgba(8, 15, 28, 0.32);
        box-shadow: inset 0 -1px 0 rgba(255, 124, 136, 0.1);
      }
      .action-btn {
        min-height: 30px;
        padding: 0 12px;
        transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease, background 120ms ease;
      }
      .action-btn.with-icon {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .action-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.16);
      }
      .action-btn:active {
        transform: translateY(0);
        box-shadow: inset 0 0 0 1px rgba(126, 231, 255, 0.08);
      }
      .action-btn:hover .icon-badge {
        border-color: rgba(126, 231, 255, 0.28);
      }
      .action-btn.warn:hover .icon-badge.warn {
        border-color: rgba(255, 214, 107, 0.34);
      }
      .action-btn.danger:hover .icon-badge.danger {
        border-color: rgba(255, 124, 136, 0.34);
      }
      .action-btn.secondary {
        background: rgba(15, 24, 39, 0.86);
      }
      .action-btn.danger {
        border-color: rgba(255, 124, 136, 0.26);
        background: rgba(122, 24, 40, 0.2);
        color: #ffd9dd;
      }
      .action-btn.warn {
        border-color: rgba(255, 214, 107, 0.28);
        background: rgba(120, 76, 9, 0.18);
        color: #ffeab0;
      }
      .action-status {
        color: var(--muted);
        font-size: 12px;
        margin-left: auto;
      }
      .icon-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        border-radius: 999px;
        border: 1px solid rgba(126, 231, 255, 0.16);
        background: rgba(10, 20, 36, 0.9);
        color: #9dc4ff;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.06em;
        line-height: 1;
        box-shadow: inset 0 0 0 1px rgba(126, 231, 255, 0.04);
        transition: border-color 120ms ease, background 120ms ease, transform 120ms ease;
      }
      .icon-badge.warn {
        border-color: rgba(255, 214, 107, 0.24);
        background: rgba(120, 76, 9, 0.18);
        color: #ffeab0;
      }
      .icon-badge.danger {
        border-color: rgba(255, 124, 136, 0.24);
        background: rgba(122, 24, 40, 0.18);
        color: #ffd9dd;
      }
      .cmd-grid {
        display: grid;
        gap: 10px;
      }
      .cmd-card {
        border: 1px solid rgba(126, 231, 255, 0.08);
        border-radius: 12px;
        background: rgba(5, 13, 25, 0.42);
        padding: 10px;
        transition: border-color 140ms ease, transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
      }
      .cmd-card.unavailable {
        border-style: dashed;
        background: rgba(7, 14, 26, 0.38);
      }
      .cmd-card:hover {
        border-color: rgba(120, 170, 255, 0.18);
        background: rgba(8, 18, 34, 0.72);
        transform: translateY(-1px);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.16);
      }
      .cmd-card:active {
        transform: translateY(0);
        box-shadow: inset 0 0 0 1px rgba(126, 231, 255, 0.06);
      }
      .cmd-card:hover .icon-badge {
        transform: translateY(-1px);
      }
      .cmd-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      .cmd-headline {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .cmd-name {
        font-size: 12px;
        font-weight: 700;
      }
      .cmd-subhead {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 8px;
      }
      .cmd-hint {
        color: var(--muted);
        font-size: 11px;
      }
      .cmd-feedback {
        border-radius: 999px;
        border: 1px solid rgba(126, 231, 255, 0.14);
        background: rgba(10, 20, 36, 0.7);
        color: #a5c6f7;
        padding: 2px 8px;
        font-size: 11px;
        letter-spacing: 0.04em;
      }
      .cmd-feedback.success {
        border-color: rgba(75, 255, 181, 0.2);
        background: rgba(18, 73, 53, 0.24);
        color: #b8ffde;
      }
      .cmd-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 8px;
      }
      .drawer-scroll {
        overflow: auto;
        padding: 14px 18px 24px 18px;
        display: grid;
        gap: 14px;
      }
      .drawer-section {
        border: 1px solid rgba(126, 231, 255, 0.08);
        background: rgba(9, 17, 31, 0.78);
        border-radius: 16px;
        padding: 14px;
      }
      .drawer-section h4 {
        margin: 0 0 8px 0;
      }
      .section-heading {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }
      .kv-grid {
        display: grid;
        gap: 8px;
      }
      .kv {
        display: grid;
        gap: 4px;
      }
      .kv-label {
        color: var(--muted);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .kv-value {
        color: var(--text);
        font-size: 12px;
        line-height: 1.45;
        word-break: break-word;
      }
      .code-line {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
        color: var(--text);
        background: rgba(5, 13, 25, 0.8);
        border: 1px solid rgba(126, 231, 255, 0.08);
        border-radius: 10px;
        padding: 10px;
        word-break: break-all;
        transition: border-color 140ms ease, background 140ms ease;
      }
      .code-line.empty {
        color: #6e87aa;
        border-style: dashed;
      }
      .cmd-card:hover .code-line {
        border-color: rgba(120, 170, 255, 0.18);
        background: rgba(6, 15, 28, 0.92);
      }
      .cmd-card button[disabled] {
        opacity: 0.45;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
      .drawer-log {
        border-top: 1px solid rgba(126, 231, 255, 0.06);
        padding: 8px 0;
      }
      .drawer-log:first-child { border-top: none; padding-top: 0; }
      @media (max-width: 960px) {
        .meta-grid, .main-grid, .overview-grid, .overview-digest, .split-grid, .spotlight-metrics, .summary-deck {
          grid-template-columns: 1fr;
        }
        .boot-stage-row {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .thread-overview-grid {
          grid-template-columns: 1fr;
        }
        .trace-hero,
        .trace-two-column,
        .trace-session-grid,
        .trace-section-head,
        .trace-thread-row {
          grid-template-columns: 1fr;
        }
        .trace-action-column,
        .trace-thread-meta {
          justify-content: flex-start;
          max-width: 100%;
        }
        .trace-metric-row,
        .trace-lane-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .trace-evidence-row {
          grid-template-columns: 1fr;
        }
        .agent-task-summary-grid {
          grid-template-columns: 1fr;
          grid-template-areas:
            "thread"
            "board"
            "tabs"
            "coordination";
        }
        .team-panel-grid {
          grid-template-columns: 1fr;
        }
        .coordination-summary-card .digest-rail {
          grid-template-columns: 1fr;
        }
        .toolbar {
          grid-template-columns: 1fr;
        }
        .thread-explorer-head {
          grid-template-columns: 1fr;
          grid-template-areas:
            "search"
            "actions";
          align-items: start;
        }
        .thread-explorer-search {
          justify-self: stretch;
          max-width: 100%;
        }
        .thread-search-sort-row {
          flex-direction: column;
          align-items: stretch;
        }
        .thread-search-sort-row .thread-explorer-search {
          flex-basis: auto;
          max-width: 100%;
        }
        .thread-toolbar-primary {
          justify-self: start;
        }
        .thread-toolbar-actions {
          justify-content: flex-start;
        }
        .thread-control-row {
          grid-template-columns: 1fr;
        }
        .thread-control-row .batch-bar {
          justify-content: flex-start;
          border-radius: 14px;
        }
        .board-action-row {
          align-items: flex-start;
        }
        .board-action-status {
          text-align: left;
          max-width: 100%;
        }
        .thread-topline {
          grid-template-columns: 1fr;
        }
        .thread-actions-inline {
          justify-content: flex-start;
          max-width: 100%;
        }
        .spotlight-grid {
          grid-template-columns: 1fr;
        }
        .topbar-nav {
          align-items: center;
          flex-wrap: wrap;
        }
        .topbar-status-row,
        .topbar-status-left,
        .topbar-nav-left,
        .topbar-nav-right,
        .actions,
        .workspace-tabs {
          flex-wrap: wrap;
          min-width: 0;
        }
        .running-board-grid {
          grid-template-columns: repeat(6, minmax(0, 1fr));
        }
        .running-board-grid.board-project-stack {
          grid-template-columns: none;
          grid-auto-flow: column;
          grid-auto-columns: minmax(260px, 82vw);
        }
        .running-card,
        .running-card.size-s,
        .running-card.size-tiny,
        .running-card.size-m,
        .running-card.size-l {
          grid-column: span 3;
        }
      }
      @media (max-width: 680px) {
        body { padding: 10px 10px 236px 10px; }
        .team-row-head {
          align-items: flex-start;
          flex-direction: column;
        }
        .team-row-title {
          white-space: normal;
        }
        .boot-loader-head {
          display: grid;
        }
        .boot-visual {
          justify-content: flex-start;
        }
        .boot-percent {
          text-align: left;
        }
        .boot-stage-row {
          grid-template-columns: 1fr;
        }
        .running-board-grid {
          grid-template-columns: 1fr;
        }
        .running-board-grid.board-project-stack {
          grid-template-columns: 1fr;
          grid-auto-flow: column;
          grid-auto-columns: minmax(240px, 78vw);
          overflow-x: visible;
          overflow-y: hidden;
        }
        .board-project-section {
          width: 78vw;
        }
        .board-project-section .running-card.size-l .running-card-body {
          grid-template-columns: minmax(0, 1fr);
        }
        .running-card,
        .running-card.size-s,
        .running-card.size-tiny,
        .running-card.size-m,
        .running-card.size-l {
          grid-column: span 1;
        }
      }

      .skill-section { margin-bottom: 24px; }
      .skill-toolbar { display: flex; align-items: center; gap: 10px; margin: 0 0 16px; }
      .skill-search-label { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.02em; }
      .skill-search-input { min-width: 220px; flex: 1; max-width: 460px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--text); padding: 7px 10px; font-size: 13px; outline: none; }
      .skill-search-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 2px rgba(52, 211, 235, 0.14); }
      .skill-search-count { font-size: 12px; color: var(--muted-soft); background: var(--panel-soft); border: 1px solid var(--line); border-radius: 999px; padding: 3px 8px; }
      .skill-section-header { font-size: 13px; font-weight: 600; color: var(--text-strong); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; letter-spacing: 0.02em; text-transform: uppercase; }
      .skill-section-icon { opacity: 0.8; }
      .skill-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
      .skill-card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 14px; cursor: pointer; transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease; }
      .skill-card:hover { transform: translateY(-1px); box-shadow: var(--shadow-lg); border-color: var(--line-strong); }
      .skill-card:focus { outline: 2px solid var(--cyan); outline-offset: 2px; }
      .skill-card-top { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
      .skill-card-icon { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, var(--cyan), var(--blue)); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; flex-shrink: 0; }
      .skill-card-headline { min-width: 0; }
      .skill-card-title { font-size: 14px; font-weight: 600; color: var(--text-strong); display: flex; align-items: center; gap: 8px; }
      .skill-card-version { font-size: 11px; font-weight: 500; color: var(--muted-soft); background: var(--panel-soft); padding: 1px 6px; border-radius: 6px; }
      .skill-card-desc { font-size: 12px; color: var(--muted); margin-top: 4px; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .skill-card-bottom { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
      .skill-badge { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; }
      .skill-badge-installed { background: rgba(84, 242, 176, 0.12); color: var(--green); }
      .skill-badge-update { background: rgba(124, 157, 255, 0.12); color: var(--blue); }
      .skill-badge-bundled { background: var(--panel-soft); color: var(--muted); }
      .skill-badge-external { background: rgba(255, 212, 121, 0.14); color: var(--gold); }
      .skill-tag-pill { font-size: 11px; color: var(--muted-soft); background: var(--panel-soft); padding: 2px 7px; border-radius: 6px; border: 1px solid var(--line); }
      .skill-card-tags { display: flex; gap: 6px; flex-wrap: wrap; }
      .skill-empty-state { text-align: center; padding: 48px 20px; color: var(--muted); }
      .skill-empty-icon { font-size: 32px; margin-bottom: 10px; }
      .skill-empty-title { font-size: 15px; font-weight: 600; color: var(--text-strong); margin-bottom: 6px; }
      .skill-empty-copy { font-size: 13px; }
      .skill-drawer-overlay { position: fixed; inset: 0; z-index: 60; display: flex; justify-content: flex-end; background: rgba(0,0,0,0.35); }
      .skill-drawer { width: 520px; max-width: 92vw; height: 100%; background: var(--bg); border-left: 1px solid var(--line-strong); display: flex; flex-direction: column; }
      .skill-drawer-head { padding: 16px 18px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; }
      .skill-drawer-title { font-size: 15px; font-weight: 700; color: var(--text-strong); }
      .skill-drawer-close { background: var(--panel); border: 1px solid var(--line); color: var(--text); padding: 5px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; }
      .skill-drawer-close:hover { background: var(--panel-elevated); }
      .skill-drawer-tabs { display: flex; gap: 4px; padding: 10px 14px; border-bottom: 1px solid var(--line); }
      .skill-drawer-tab { background: transparent; border: 1px solid transparent; color: var(--muted); padding: 5px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; }
      .skill-drawer-tab:hover { color: var(--text); }
      .skill-drawer-tab.active { background: var(--panel); border-color: var(--line-strong); color: var(--text-strong); font-weight: 600; }
      .skill-drawer-body { flex: 1; overflow-y: auto; padding: 16px 18px; font-size: 13px; line-height: 1.6; color: var(--text); }
      .skill-drawer-actions { padding: 12px 18px; border-top: 1px solid var(--line); display: flex; gap: 8px; flex-wrap: wrap; }
      .skill-md-h3 { font-size: 15px; font-weight: 700; color: var(--text-strong); margin: 18px 0 8px; }
      .skill-md-h4 { font-size: 13px; font-weight: 700; color: var(--text-strong); margin: 14px 0 6px; }
      .skill-md-pre { background: var(--panel-soft); border: 1px solid var(--line); border-radius: 10px; padding: 12px; overflow-x: auto; font-size: 12px; line-height: 1.5; }
      .skill-drawer-json { background: var(--panel-soft); border: 1px solid var(--line); border-radius: 10px; padding: 12px; overflow-x: auto; font-size: 12px; line-height: 1.5; color: var(--text); }
      .skill-tree-folder { font-weight: 600; color: var(--text-strong); margin: 8px 0 4px; display: flex; align-items: center; gap: 6px; }
      .skill-tree-file { color: var(--muted); padding-left: 20px; display: flex; align-items: center; gap: 6px; font-size: 12px; }
      .skill-drawer-empty { color: var(--muted); font-style: italic; padding: 24px 0; }
      @media (max-width: 860px) { .skill-card-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); } }
      @media (max-width: 680px) { .skill-card-grid { grid-template-columns: 1fr; } .skill-toolbar { align-items: stretch; flex-direction: column; } .skill-search-input { max-width: none; width: 100%; } .skill-drawer { width: 100%; max-width: 100%; } }

      .memory-page { display: grid; gap: 14px; padding-bottom: 72px; }
      .memory-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
      .memory-hero {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        border: 1px solid color-mix(in srgb, var(--cyan) 20%, var(--line));
        border-left: 4px solid color-mix(in srgb, var(--cyan) 72%, var(--line));
        border-radius: var(--radius-card);
        background:
          linear-gradient(135deg, color-mix(in srgb, var(--cyan) 9%, transparent), transparent 48%),
          color-mix(in srgb, var(--panel-elevated) 52%, transparent);
        padding: 16px;
      }
      .memory-hero.warn {
        border-color: color-mix(in srgb, var(--gold) 24%, var(--line));
        border-left-color: color-mix(in srgb, var(--gold) 78%, var(--line));
        background:
          linear-gradient(135deg, color-mix(in srgb, var(--gold) 10%, transparent), transparent 48%),
          color-mix(in srgb, var(--panel-elevated) 56%, transparent);
      }
      .memory-kicker,
      .memory-scope-label {
        color: var(--muted);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .memory-title { color: var(--text-strong); font-size: clamp(22px, 2vw, 30px); font-weight: 900; line-height: 1.05; margin: 4px 0 0; }
      .memory-hero-copy { margin-top: 7px; color: var(--muted); font-size: 12px; line-height: 1.45; max-width: 680px; }
      .memory-hero-actions { flex: 0 0 auto; justify-content: flex-end; }
      .memory-scope-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
      .memory-scope-tile {
        min-width: 0;
        border: 1px solid color-mix(in srgb, var(--cyan) 14%, var(--line));
        border-radius: 14px;
        background: color-mix(in srgb, var(--panel-elevated) 44%, transparent);
        padding: 12px;
      }
      .memory-scope-value { margin-top: 8px; color: var(--text-strong); font-size: 20px; font-weight: 900; line-height: 1; }
      .memory-scope-path { margin-top: 8px; color: var(--muted); font-size: 11px; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; }
      .memory-primary-section {
        display: grid;
        gap: 10px;
        border: 1px solid color-mix(in srgb, var(--cyan) 18%, var(--line));
        border-radius: var(--radius-card);
        background: color-mix(in srgb, var(--panel-elevated) 34%, transparent);
        padding: 12px;
      }
      .memory-primary-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
      .memory-focus-pill {
        display: inline-flex;
        align-items: center;
        min-height: 26px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid currentColor;
        color: var(--gold);
        font-size: 11px;
        font-weight: 900;
        white-space: nowrap;
      }
      .memory-focus-pill.ok { color: var(--green); }
      .memory-section { border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: color-mix(in srgb, var(--panel-soft) 52%, transparent); }
      .memory-section-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px; background: color-mix(in srgb, var(--panel-elevated) 46%, transparent); cursor: pointer; }
      .memory-section-head:hover { background: var(--panel-elevated); }
      .memory-section-title { font-size: 12px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; }
      .memory-section-count { color: var(--muted); font-weight: 700; }
      .memory-section-path { color: var(--muted-soft); font-size: 11px; font-family: monospace; }
      .memory-section-body { padding: 8px 16px 16px; }
      .memory-row { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
      .memory-row:last-child { border-bottom: none; }
      .memory-row.missing { opacity: 0.6; }
      .memory-row-icon { font-size: 18px; line-height: 1; margin-top: 2px; }
      .memory-row-body { flex: 1; min-width: 0; }
      .memory-row-name { font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
      .memory-row-status { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--muted); }
      .memory-row-meta { font-size: 11px; color: var(--muted-soft); margin-top: 2px; }
      .memory-row-actions { display: flex; gap: 6px; flex-shrink: 0; }
      .memory-stats { display: flex; gap: 16px; padding: 10px 16px; font-size: 11px; color: var(--muted); border-top: 1px solid var(--line); }
      @media (max-width: 900px) {
        .memory-hero,
        .memory-primary-head {
          display: grid;
        }
        .memory-hero-actions {
          justify-content: flex-start;
        }
        .memory-scope-strip {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 620px) {
        .memory-scope-strip {
          grid-template-columns: 1fr;
        }
        .memory-row {
          display: grid;
        }
        .memory-row-actions {
          justify-content: flex-start;
          flex-wrap: wrap;
        }
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .memory-hero,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .memory-scope-tile,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .memory-primary-section {
        border-color: var(--line);
        background: color-mix(in srgb, var(--panel-elevated) 88%, transparent);
        box-shadow: none;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .memory-hero.warn {
        border-color: rgba(154, 100, 0, 0.2);
        background: color-mix(in srgb, var(--gold) 6%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .memory-section { border-color: var(--line); }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .memory-section-head { background: var(--panel-elevated); }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .memory-section-head:hover { background: color-mix(in srgb, var(--panel-elevated) 92%, var(--cyan)); }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .memory-row { border-color: var(--line); }
      .memory-editor-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.48); z-index: 200; display: flex; justify-content: flex-end; }
      .memory-editor-drawer { width: 640px; max-width: 90vw; height: 100%; background: var(--bg); border-left: 1px solid var(--line); display: grid; grid-template-rows: auto auto 1fr auto; }
      .memory-editor-head { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
      .memory-editor-title { font-size: 14px; font-weight: 800; }
      .memory-editor-path { color: var(--muted-soft); font-size: 11px; font-family: monospace; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
      .memory-editor-tabs { display: flex; border-bottom: 1px solid var(--line); }
      .memory-editor-tab { flex: 1; padding: 10px; text-align: center; font-size: 12px; font-weight: 700; color: var(--muted); cursor: pointer; border-bottom: 2px solid transparent; background: none; border: none; }
      .memory-editor-tab.active { color: var(--text); border-bottom-color: var(--cyan); }
      .memory-editor-body { overflow-y: auto; padding: 16px 18px; }
      .memory-editor-body.hidden { display: none; }
      .memory-editor-textarea { width: 100%; height: 100%; min-height: 400px; background: var(--panel); color: var(--text); border: 1px solid var(--line); border-radius: 8px; padding: 12px; font-family: monospace; font-size: 13px; line-height: 1.6; resize: vertical; }
      .memory-editor-readonly { width: 100%; min-height: 400px; background: var(--panel); color: var(--text); border: 1px solid var(--line); border-radius: 8px; padding: 12px; font-family: monospace; font-size: 13px; line-height: 1.6; overflow-x: auto; margin: 0; }
      .memory-editor-readonly-note { font-size: 12px; color: var(--muted); margin-bottom: 10px; padding: 8px 12px; background: var(--panel); border-radius: 6px; border: 1px solid var(--line); }
      .memory-editor-preview { font-size: 13px; line-height: 1.6; }
      .memory-editor-preview h1 { font-size: 18px; margin: 16px 0 8px; }
      .memory-editor-preview h2 { font-size: 15px; margin: 14px 0 6px; }
      .memory-editor-preview h3 { font-size: 13px; margin: 12px 0 4px; }
      .memory-editor-preview code { background: var(--panel); padding: 2px 5px; border-radius: 4px; font-size: 12px; }
      .memory-editor-preview pre { background: var(--panel); padding: 12px; border-radius: 8px; overflow-x: auto; }
      .memory-editor-preview pre code { background: none; padding: 0; }
      .memory-editor-preview ul { padding-left: 20px; }
      .memory-editor-preview a { color: var(--cyan); }
      .memory-editor-actions { display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-top: 1px solid var(--line); background: var(--panel); }
      .memory-editor-status { font-size: 11px; color: var(--muted); margin-left: auto; }
      .memory-editor-status.ok { color: var(--green); }
      .memory-editor-status.err { color: var(--red); }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .memory-editor-overlay { background: rgba(0,0,0,0.28); }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .memory-editor-drawer { background: var(--bg); border-color: var(--line); }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .memory-editor-textarea { background: var(--panel-elevated); color: var(--text); border-color: var(--line); }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .memory-editor-readonly { background: var(--panel-elevated); color: var(--text); border-color: var(--line); }
      .memory-creator-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 250; display: flex; align-items: center; justify-content: center; }
      .memory-creator-modal { width: 480px; max-width: 92vw; background: var(--bg); border: 1px solid var(--line); border-radius: 16px; padding: 24px; display: grid; gap: 16px; }
      .memory-creator-title { font-size: 16px; font-weight: 800; margin: 0; }
      .memory-creator-desc { color: var(--muted); font-size: 13px; margin: 0; }
      .memory-creator-options { display: grid; gap: 10px; }
      .memory-creator-option { display: grid; gap: 4px; padding: 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); cursor: pointer; text-align: left; }
      .memory-creator-option:hover { border-color: var(--cyan); background: var(--panel-elevated); }
      .memory-creator-option strong { font-size: 13px; }
      .memory-creator-option span { font-size: 12px; color: var(--muted); }
      .memory-creator-actions { display: flex; justify-content: flex-end; padding-top: 8px; }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .memory-creator-overlay { background: rgba(0,0,0,0.32); }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .memory-creator-modal { background: var(--bg); border-color: var(--line); }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .memory-creator-option { background: var(--panel-elevated); border-color: var(--line); }
      .history-viewer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.48); z-index: 200; display: flex; justify-content: flex-end; }
      .history-viewer-drawer { width: 640px; max-width: 90vw; height: 100%; background: var(--bg); border-left: 1px solid var(--line); display: grid; grid-template-rows: auto 1fr; }
      .history-viewer-head { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
      .history-viewer-title { font-size: 14px; font-weight: 800; }
      .history-viewer-meta { color: var(--muted); font-size: 11px; flex: 1; }
      .history-viewer-body { overflow-y: auto; padding: 16px 18px; display: grid; gap: 12px; }
      .history-turn { padding: 12px 14px; border-radius: 10px; border: 1px solid var(--line); background: var(--panel); }
      .history-turn.role-user { border-left: 3px solid var(--cyan); }
      .history-turn.role-assistant { border-left: 3px solid var(--green); }
      .history-turn.role-tool { border-left: 3px solid var(--gold); }
      .history-turn-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
      .history-turn-icon { font-size: 14px; }
      .history-turn-role { font-size: 10px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; }
      .history-turn-time { color: var(--muted-soft); font-size: 10px; margin-left: auto; }
      .history-turn-content { font-size: 12px; line-height: 1.5; color: var(--text); white-space: pre-wrap; word-break: break-word; }
      .history-empty { color: var(--muted); font-size: 13px; text-align: center; padding: 40px 0; }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .history-viewer-overlay { background: rgba(0,0,0,0.28); }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .history-viewer-drawer { background: var(--bg); border-color: var(--line); }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .history-turn { background: var(--panel-elevated); border-color: var(--line); }
`;
}

module.exports = {
  getSkillsMemoryStyles,
};
