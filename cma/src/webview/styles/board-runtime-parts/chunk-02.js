module.exports = `      .board-project-title-stack {
        display: grid;
        gap: 4px;
        min-width: 0;
      }
      .board-project-title {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        color: var(--text-strong);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .board-project-title span:last-child {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .board-project-note {
        min-width: 0;
        color: var(--muted-soft);
        font-size: 11px;
        line-height: 1.35;
      }
      .board-project-dot {
        width: 8px;
        height: 8px;
        flex: 0 0 auto;
        border-radius: 999px;
        background: color-mix(in srgb, var(--project-accent) 80%, transparent);
        box-shadow: 0 0 10px color-mix(in srgb, var(--project-accent) 22%, transparent);
      }
      .board-project-count {
        min-height: 22px;
        min-width: 30px;
        padding: 0 8px;
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, var(--project-accent) 28%, rgba(255,255,255,0.08));
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--muted);
        font-size: 11px;
      }
      .board-project-section .running-board-grid {
        grid-template-columns: minmax(0, 1fr);
        grid-auto-flow: row;
        grid-auto-rows: auto;
        min-height: 0;
        height: 100%;
        max-height: none;
        overflow-x: hidden;
        overflow-y: scroll;
        overscroll-behavior: contain;
        scrollbar-gutter: stable;
        scrollbar-width: thin;
        scrollbar-color: color-mix(in srgb, var(--project-accent) 52%, rgba(255,255,255,0.22)) rgba(255,255,255,0.035);
        padding: 0 10px 6px 0;
        align-content: start;
      }
      .board-project-section.collapsed {
        width: 250px;
        min-width: 250px;
        grid-template-rows: auto;
      }
      .board-project-section.collapsed .running-board-grid {
        display: none;
      }
      .board-project-section .running-board-grid::-webkit-scrollbar {
        width: 8px;
      }
      .board-project-section .running-board-grid::-webkit-scrollbar-track {
        background: rgba(255,255,255,0.035);
        border-radius: 999px;
      }
      .board-project-section .running-board-grid::-webkit-scrollbar-thumb {
        background: color-mix(in srgb, var(--project-accent) 52%, rgba(255,255,255,0.18));
        border-radius: 999px;
      }
      .board-project-section .running-card,
      .board-project-section .running-card.size-s,
      .board-project-section .running-card.size-tiny,
      .board-project-section .running-card.size-m,
      .board-project-section .running-card.size-l {
        grid-column: 1 / -1 !important;
        grid-row: auto !important;
        width: 100%;
        max-width: 100%;
        min-width: 0;
      }
      .board-project-section .running-card.size-l {
        min-height: 320px;
        height: 320px;
      }
      .board-project-section .running-card.size-l .running-card-body {
        grid-template-columns: minmax(0, 1.08fr) minmax(230px, 0.92fr);
      }
      .board-project-section .running-card.size-m {
        min-height: 300px;
        height: 300px;
      }
      .board-project-section .running-card.size-s {
        min-height: 300px;
        height: 300px;
      }
      .running-board-grid {
        display: grid;
        grid-template-columns: repeat(15, minmax(0, 1fr));
        grid-auto-flow: row dense;
        grid-auto-rows: 18px;
        gap: 12px;
        min-height: 120px;
        max-height: 56vh;
        overflow: auto;
        padding: 4px;
        padding-right: 10px;
        border-radius: 22px;
        transition: border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
        position: relative;
        align-content: start;
      }
      .running-board-grid > .empty-state.cute {
        grid-column: 1 / -1;
        grid-row: span 16;
        width: 100%;
        min-width: min(720px, calc(100vw - 72px));
        min-height: 280px;
        align-self: stretch;
        justify-self: stretch;
        box-sizing: border-box;
        border-radius: 20px;
      }
      .running-board-grid > .empty-state.cute .empty-state-inner {
        max-width: 360px;
      }
      .running-board-grid > .empty-state.cute .empty-state-art {
        width: 76px;
        height: 76px;
      }
      .running-board-grid.board-project-stack {
        grid-template-columns: none;
        grid-auto-flow: column;
        grid-auto-columns: minmax(280px, 360px);
        grid-auto-rows: auto;
        overflow-x: visible;
        overflow-y: hidden;
      }
      .running-board-grid.drag-over {
        border: 1px dashed rgba(141, 216, 255, 0.28);
        background: rgba(255,255,255,0.02);
        box-shadow: inset 0 0 0 1px rgba(141, 216, 255, 0.08);
      }
      .running-board-grid .running-card {
        touch-action: none;
      }
      .motion-reduced .ascii-title,
      .motion-reduced .completion-rail,
      .motion-reduced .completion-card,
      .motion-reduced .intervention-art,
      .motion-reduced .boot-loader::before,
      .motion-reduced .boot-progress-bar::after,
      .motion-reduced .boot-icon-ring,
      .motion-reduced .boot-icon-arc,
      .motion-reduced .boot-icon-orbit,
      .motion-reduced .boot-core,
      .motion-reduced .boot-core-halo,
      .motion-reduced .boot-node,
      .motion-reduced .running-animated-icon .running-icon-ring,
      .motion-reduced .running-animated-icon .running-icon-arc,
      .motion-reduced .running-animated-icon .running-icon-halo,
      .motion-reduced .running-animated-icon .running-icon-core,
      .motion-reduced .running-animated-icon .running-icon-node,
      .motion-reduced .running-animated-icon .running-icon-satellite,
      .motion-reduced .running-card,
      .motion-reduced .running-card::after,
      .motion-reduced .running-card-topbar,
      .motion-reduced .phase-art,
      .motion-reduced .progress-bar::after,
      .motion-reduced .badge-running,
      .motion-reduced .workspace-pane,
      .motion-reduced .overview-subpane,
      .motion-reduced .thread-row,
      .motion-reduced .timeline-card,
      .motion-reduced .tool-btn,
      .motion-reduced .chip,
      .motion-reduced .switch-btn,
      .motion-reduced .workspace-tab,
      .motion-reduced .mini-thread,
      .motion-reduced .drawer-shell {
        animation: none !important;
        transition: none !important;
      }
      .motion-reduced .running-card:hover,
      .motion-reduced .thread-row:hover,
      .motion-reduced .timeline-card:hover,
      .motion-reduced .tool-btn:hover,
      .motion-reduced .chip:hover,
      .motion-reduced .workspace-tab:hover,
      .motion-reduced .switch-btn:hover {
        transform: none !important;
        box-shadow: none !important;
      }
      .motion-reduced .running-card::after,
      .motion-reduced .running-card-topbar,
      .motion-reduced .intervention-art,
      .motion-reduced .phase-art {
        filter: none !important;
      }
      .motion-reduced .sub,
      .motion-reduced .section-note,
      .motion-reduced .summary-copy,
      .motion-reduced .insight-card-copy,
      .motion-reduced .loop-daemon-detail,
      .motion-reduced .loop-daemon-subtitle,
      .motion-reduced .empty-state-copy,
      .motion-reduced .running-board-copy,
      .motion-reduced .phase-copy,
      .motion-reduced .spotlight-copy,
      .motion-reduced .spotlight-log-copy,
      .motion-reduced .memory-shell-copy,
      .motion-reduced .progress-note,
      .motion-reduced .timeline-event-copy,
      .motion-reduced .weekly-hero-copy,
      .motion-reduced .metric-head-copy,
      .motion-reduced .completion-meta,
      .motion-reduced .running-card-copy {
        display: none !important;
      }
      .motion-reduced [data-workspace-pane="board"] .running-card.size-l .running-card-copy {
        display: grid !important;
      }
      .motion-extreme .thread-topline > .mono.muted,
      .motion-extreme .thread-meta,
      .motion-extreme .loop-daemon-meta,
      .motion-extreme .spotlight-metrics,
      .motion-extreme .spotlight-log-meta,
      .motion-extreme .mini-thread-meta,
      .motion-extreme .completion-meta,
      .motion-extreme .muted {
        display: none !important;
      }
      .motion-extreme .meta-pill-cmd,
      .motion-extreme .meta-pill-cmp,
      .motion-extreme .spotlight-stat.commands,
      .motion-extreme .spotlight-stat.compactions {
        display: none !important;
      }
      .motion-extreme [data-workspace-pane="board"] .section-note,
      .motion-extreme [data-workspace-pane="board"] .board-action-status,
      .motion-extreme [data-workspace-pane="board"] .board-tab-group-kicker,
      .motion-extreme [data-workspace-pane="board"] .board-tab-helper,
      .motion-extreme [data-workspace-pane="board"] .control-label,
      .motion-extreme [data-workspace-pane="board"] .running-card-subtitle,
      .motion-extreme [data-workspace-pane="board"] .running-card-note,
      .motion-extreme [data-workspace-pane="board"] .preview,
      .motion-extreme [data-workspace-pane="board"] .progress-head,
      .motion-extreme [data-workspace-pane="board"] .progress-track,
      .motion-extreme [data-workspace-pane="board"] .phase-panel {
        display: none !important;
      }
      .running-board-grid.drag-active .running-card {
        box-shadow: 0 10px 24px rgba(0,0,0,0.2);
      }
      .running-board-grid.drag-active .running-card::after,
      .running-board-grid.drag-active .running-card-topbar {
        opacity: 0.38;
        box-shadow: none;
      }
      .running-board-grid.drag-active .running-card:hover {
        transform: none;
      }
      .board-drop-overlay {
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        border-radius: 22px;
        border: 2px solid rgba(98, 255, 166, 0.92);
        background: linear-gradient(180deg, rgba(98,255,166,0.14), rgba(98,255,166,0.05));
        box-shadow:
          inset 0 0 0 1px rgba(255,255,255,0.06),
          0 0 0 1px rgba(98,255,166,0.18),
          0 0 28px rgba(98,255,166,0.2);
        pointer-events: none;
        opacity: 0;
        transition: opacity 90ms ease;
        will-change: transform, width, height;
        z-index: 5;
      }
      .board-drop-overlay.visible {
        opacity: 1;
      }
      .drag-preview-card {
        position: fixed;
        top: -1000px;
        left: -1000px;
        width: 172px;
        min-height: 86px;
        padding: 10px 12px;
        border-radius: 16px;
        border: 1px solid rgba(98,255,166,0.32);
        background:
          linear-gradient(180deg, rgba(12, 18, 24, 0.96), rgba(20, 26, 34, 0.94));
        box-shadow:
          inset 0 0 0 1px rgba(255,255,255,0.04),
          0 12px 28px rgba(0,0,0,0.24);
        color: var(--text-strong);
        pointer-events: none;
        z-index: 9999;
      }
      .board-drag-ghost {
        position: fixed;
        left: 0;
        top: 0;
        width: 180px;
        min-height: 96px;
        padding: 12px;
        border-radius: 18px;
        border: 1px solid rgba(98,255,166,0.34);
        background:
          radial-gradient(circle at top right, rgba(98,255,166,0.18), transparent 34%),
          linear-gradient(180deg, rgba(14, 20, 26, 0.96), rgba(18, 24, 31, 0.92));
        box-shadow:
          inset 0 0 0 1px rgba(255,255,255,0.05),
          0 22px 46px rgba(0,0,0,0.36),
          0 0 26px rgba(98,255,166,0.1);
        color: var(--text-strong);
        pointer-events: none;
        z-index: 10000;
        opacity: 0.92;
        will-change: transform;
        contain: layout paint style;
        box-sizing: border-box;
      }
      .board-drag-ghost .drag-preview-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .drag-preview-head {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      .drag-preview-dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: linear-gradient(180deg, rgba(98,255,166,0.98), rgba(98,255,166,0.74));
        box-shadow: 0 0 16px rgba(98,255,166,0.18);
        flex: 0 0 auto;
      }
      .drag-preview-label {
        font-size: 10px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted-soft);
      }
      .drag-preview-title {
        font-size: 12px;
        line-height: 1.35;
        font-weight: 700;
        color: var(--text-strong);
      }
      .running-card {
        --card-band: linear-gradient(90deg, rgba(124, 157, 255, 0.92), rgba(141, 216, 255, 0.82), rgba(196, 163, 255, 0.78));
        --card-band-glow: rgba(124, 157, 255, 0.16);
        --card-accent-border: rgba(150, 181, 255, 0.18);
        --card-active-glow: rgba(141, 216, 255, 0.08);
        grid-column: span 3;
        min-height: 208px;
        display: grid;
        grid-template-rows: auto auto 1fr auto;
        gap: 8px;
        padding: 13px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.07);
        background:
          radial-gradient(circle at top right, rgba(124, 157, 255, 0.14), transparent 34%),
          linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.018));
        box-shadow: 0 18px 40px rgba(0,0,0,0.26);
        transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease, background 140ms ease;
        cursor: pointer;
        overflow: hidden;
        position: relative;
        content-visibility: auto;
        contain-intrinsic-size: auto 300px;
      }
      .running-card.size-tiny {
        grid-column: span 2;
        min-height: 116px;
        gap: 8px;
        padding: 12px;
      }
      .running-card.size-tiny.fixed-tiny {
        min-height: 116px;
        grid-template-rows: auto 1fr auto;
        gap: 8px;
      }
      .running-card.compact-card {
        min-height: 148px;
      }
      .running-card.compact-card .compact-card-titlebar {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: start;
        gap: 8px;
        padding: 2px 0 4px;
        margin-bottom: 2px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .running-card.compact-card .compact-card-actions {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        min-width: 0;
        max-width: 100%;
        flex-wrap: wrap;
      }
      .running-card.compact-card .compact-card-title {
        font-size: 16px;
        font-weight: 800;
        line-height: 1.35;
        color: var(--text-strong);
        display: -webkit-box;
        -webkit-line-clamp: 5;
        -webkit-box-orient: vertical;
        overflow: hidden;
        min-width: 0;
        text-overflow: ellipsis;
        white-space: normal;
      }
      .running-card.compact-card .compact-card-titlebar {
        min-width: 0;
      }
      .running-card.compact-card .running-card-card-name {
        min-width: 0;
        display: inline-block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .running-card.compact-card .running-card-top {
        grid-template-columns: 1fr;
        gap: 6px;
      }
      .running-card.compact-card .running-card-top .running-card-control {
        min-width: 0;
      }
      .running-card.compact-card .running-card-top .running-card-badges,
      .running-card.compact-card .board-lifecycle-strip {
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
      }
      .running-card.compact-card .running-card-top .running-card-control:last-child {
        display: none;
      }
      .running-card.compact-card .running-card-body {
        gap: 6px;
      }
      .running-card.compact-card .board-lifecycle-strip {
        gap: 6px;
      }
      .running-card.compact-card .board-lifecycle-badge {
        min-height: 20px;
        padding: 0 8px;
        font-size: 9px;
      }
      .running-card.compact-card .board-lifecycle-reason {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
`;
