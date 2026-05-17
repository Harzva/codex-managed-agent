module.exports = `        display: grid;
        gap: 12px;
      }
      .running-board-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }
      .running-board-title {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .board-page-titlebar {
        display: grid;
        place-items: center;
        width: 100%;
        min-height: 34px;
        padding: 6px 14px;
        border-radius: 999px;
        border: 1px solid rgba(141, 216, 255, 0.16);
        background:
          radial-gradient(circle at 50% 0%, rgba(124, 157, 255, 0.12), transparent 48%),
          linear-gradient(180deg, rgba(12, 18, 30, 0.96), rgba(7, 10, 16, 0.88));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 12px 28px rgba(0,0,0,0.16);
      }
      .board-page-titlebar .section-title {
        margin: 0;
        font-size: 11px;
        letter-spacing: 0.14em;
      }
      .board-page-title {
        display: flex;
        gap: 10px;
        flex-wrap: nowrap;
        align-items: flex-start;
        min-width: 0;
        max-width: 760px;
        width: fit-content;
      }
      .board-page-title .board-icon {
        flex: 0 0 36px;
      }
      .board-page-title-copy {
        min-width: 0;
        flex: 1 1 auto;
      }
      .board-page-title-copy .section-title {
        white-space: nowrap;
      }
      .board-page-title-copy .chip-row {
        justify-content: center;
      }
      .board-local-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }
      .board-control-stack {
        display: grid;
        gap: 10px;
      }
      .board-action-row,
      .board-subview-row,
      .board-tab-group-row {
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,0.055);
        background: rgba(255,255,255,0.014);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.025);
      }
      .board-action-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        padding: 8px;
      }
      .board-action-status {
        color: var(--muted-soft);
        font-size: 11px;
        line-height: 1.4;
        text-align: right;
        max-width: 620px;
      }
      .board-subview-row {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding: 8px;
      }
      .board-tab-group-row {
        display: grid;
        gap: 8px;
        padding: 10px 12px;
      }
      .board-tab-group-kicker {
        color: var(--muted-soft);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .board-local-actions {
        display: inline-flex;
        align-items: center;
        justify-content: flex-start;
        gap: 8px;
        flex-wrap: wrap;
      }
      .board-local-tabs {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        flex-wrap: wrap;
        margin-left: auto;
      }
      .board-local-nav > .chip-row,
      .board-local-tabs > .chip-row {
        align-items: center;
        justify-content: flex-end;
      }
      .board-local-tabs #boardTabRailPrimary {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .board-icon {
        width: 36px;
        height: 36px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        font-size: 18px;
        background: linear-gradient(180deg, rgba(124,157,255,0.18), rgba(196,163,255,0.1));
        border: 1px solid rgba(255,255,255,0.08);
        color: #fff;
      }
      .board-icon img {
        width: 24px;
        height: 24px;
        object-fit: contain;
        filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.22));
      }
      .running-board-copy {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.45;
      }
      .intervention-dock {
        display: none;
        gap: 10px;
        padding: 10px;
        grid-template-rows: auto auto auto minmax(0, 1fr);
        border-radius: 18px;
        border: 1px solid rgba(255, 143, 159, 0.16);
        background: linear-gradient(180deg, rgba(122, 24, 40, 0.12), rgba(255,255,255,0.02));
        min-height: 160px;
        max-height: 56vh;
        overflow: hidden;
        resize: vertical;
      }
      .intervention-dock.visible {
        display: grid;
      }
      .intervention-dock.collapsed {
        resize: none;
        min-height: 0;
        max-height: none;
        overflow: hidden;
      }
      .intervention-dock.collapsed .intervention-dock-note,
      .intervention-dock.collapsed .intervention-dock-grid {
        display: none;
      }
      .intervention-dock-summary {
        display: none;
        color: #ffd7dd;
        font-size: 12px;
        line-height: 1.45;
      }
      .intervention-dock.collapsed .intervention-dock-summary {
        display: block;
      }
      .intervention-dock-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 12px;
        align-content: start;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: 6px;
        scrollbar-width: thin;
      }
      .intervention-dock-grid::-webkit-scrollbar {
        width: 8px;
      }
      .intervention-dock-grid::-webkit-scrollbar-thumb {
        border-radius: 999px;
        background: rgba(255, 143, 159, 0.25);
      }
      .intervention-dock-grid::-webkit-scrollbar-track {
        background: rgba(255,255,255,0.03);
      }
      .intervention-dock-note {
        color: #ffd7dd;
        font-size: 12px;
      }
      .intervention-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }
      .intervention-title {
        display: inline-flex;
        align-items: center;
        gap: 10px;
      }
      .intervention-actions {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .intervention-art {
        width: 28px;
        height: 28px;
        object-fit: contain;
        filter: drop-shadow(0 4px 12px rgba(255, 143, 159, 0.12));
        animation: chickBreathe 3.6s ease-in-out infinite;
      }
      @keyframes chickBreathe {
        0% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-1px) scale(1.04); }
        100% { transform: translateY(0) scale(1); }
      }
      .mini-thread.with-art {
        position: relative;
        padding-left: 72px;
        min-height: 72px;
        box-sizing: border-box;
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
      }
      .coordination-queue-section {
        display: grid;
        gap: 7px;
      }
      .coordination-queue-section + .coordination-queue-section {
        padding-top: 8px;
        border-top: 1px solid rgba(126, 231, 255, 0.07);
      }
      .coordination-queue-heading {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        color: var(--muted);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .coordination-queue-empty {
        color: var(--muted-soft);
        font-size: 11px;
        line-height: 1.35;
        padding: 2px 0 4px 0;
      }
      .coordination-queue-section .mini-thread {
        padding-top: 9px;
        padding-bottom: 9px;
      }
      .coordination-queue-section .mini-thread.with-art {
        padding-left: 60px;
        min-height: 60px;
      }
      .coordination-queue-section .mini-thread-art {
        width: 34px;
        height: 34px;
      }
      .coordination-queue-section .mini-thread-title {
        margin-top: 2px;
      }
      .coordination-queue-section .mini-thread-meta {
        margin-top: 4px;
      }
      .mini-thread-art {
        position: absolute;
        left: 16px;
        top: 12px;
        width: 42px;
        height: 42px;
        object-fit: contain;
        filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.26));
      }
      .board-view-shell {
        display: grid;
        gap: 12px;
      }
      .board-surface {
        position: relative;
        min-width: 0;
        overflow-x: scroll;
        overflow-y: hidden;
        padding-bottom: 12px;
        scrollbar-gutter: stable;
        scrollbar-width: thin;
        scrollbar-color: rgba(141, 216, 255, 0.38) rgba(255,255,255,0.035);
      }
      .board-surface::-webkit-scrollbar {
        height: 10px;
      }
      .board-surface::-webkit-scrollbar-track {
        background: rgba(255,255,255,0.035);
        border-radius: 999px;
      }
      .board-surface::-webkit-scrollbar-thumb {
        background: rgba(141, 216, 255, 0.34);
        border-radius: 999px;
      }
      .board-stage {
        min-height: 560px;
      }
      .board-stage .running-board-grid {
        min-height: 520px;
        max-height: calc(100vh - 220px);
      }
      .board-project-stack {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: auto;
        gap: 14px;
        width: max-content;
        min-width: 100%;
        height: calc(100vh - 220px);
        min-height: 520px;
        max-height: calc(100vh - 220px);
        overflow-x: visible;
        overflow-y: hidden;
        padding: 4px 10px 12px 4px;
        align-items: stretch;
        align-content: stretch;
      }
      .board-project-nav {
        position: sticky;
        left: 0;
        z-index: 3;
        display: grid;
        grid-template-rows: auto auto minmax(0, 1fr);
        gap: 10px;
        width: 220px;
        height: 100%;
        min-height: 520px;
        padding: 10px;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(8, 18, 34, 0.88);
        box-shadow: 14px 0 30px rgba(0,0,0,0.22);
      }
      .board-project-nav-head,
      .board-project-nav-actions,
      .board-project-nav-item,
      .board-project-actions {
        display: flex;
        align-items: center;
      }
      .board-project-nav-head {
        justify-content: space-between;
        color: var(--text-strong);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .board-project-nav-actions {
        gap: 6px;
        flex-wrap: wrap;
      }
      .board-project-nav-btn,
      .board-project-toggle {
        min-height: 24px;
        padding: 0 8px;
        border-radius: 999px;
        border: 1px solid rgba(126, 231, 255, 0.16);
        background: rgba(126, 231, 255, 0.06);
        color: var(--muted);
        font-size: 11px;
        cursor: pointer;
      }
      .board-project-nav-btn:hover,
      .board-project-toggle:hover,
      .board-project-nav-item:hover,
      .board-project-nav-item:focus-visible {
        color: var(--text-strong);
        border-color: rgba(126, 231, 255, 0.34);
        background: rgba(126, 231, 255, 0.12);
      }
      .board-project-nav-list {
        display: grid;
        align-content: start;
        gap: 7px;
        min-height: 0;
        overflow: auto;
        padding-right: 2px;
      }
      .board-project-nav-item {
        justify-content: space-between;
        gap: 8px;
        width: 100%;
        min-height: 30px;
        padding: 0 8px 0 10px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.07);
        background: rgba(255,255,255,0.035);
        color: var(--muted);
        cursor: pointer;
        text-align: left;
      }
      .board-project-nav-label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .board-project-stack > .running-card {
        min-height: 120px;
      }
      .board-project-section {
        --project-accent: rgba(126, 231, 255, 0.72);
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        gap: 10px;
        width: 340px;
        min-width: 0;
        height: 100%;
        min-height: 520px;
        max-height: 100%;
        padding: 10px 10px 12px 14px;
        border-radius: 20px;
        border: 1px solid color-mix(in srgb, var(--project-accent) 18%, rgba(255,255,255,0.06));
        background: color-mix(in srgb, var(--project-accent) 5%, rgba(255,255,255,0.012));
        position: relative;
        overflow: hidden;
      }
      .board-project-section::before {
        content: "";
        position: absolute;
        left: 2px;
        top: 10px;
        bottom: 10px;
        width: 3px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--project-accent) 78%, transparent);
        box-shadow: 0 0 12px color-mix(in srgb, var(--project-accent) 18%, transparent);
      }
      .board-project-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 32px;
        padding: 0 2px;
      }
      .board-project-actions {
        justify-content: flex-end;
        gap: 6px;
        flex: 0 0 auto;
      }
`;
