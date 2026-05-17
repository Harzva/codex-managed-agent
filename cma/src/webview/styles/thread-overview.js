function getThreadOverviewStyles() {
  return `      }
      .thread-explorer-head {
        display: grid;
        grid-template-columns: minmax(280px, 1fr);
        grid-template-areas:
          "search"
          "actions";
        align-items: center;
        gap: 8px 12px;
      }
      .thread-explorer-titlebar {
        display: grid;
        place-items: center;
        gap: 4px;
        width: 100%;
        margin-bottom: 12px;
        padding: 13px 18px;
        border-radius: 18px;
        border: 1px solid rgba(141, 216, 255, 0.16);
        background:
          radial-gradient(circle at 50% 0%, rgba(124, 157, 255, 0.12), transparent 48%),
          linear-gradient(180deg, rgba(12, 18, 30, 0.96), rgba(7, 10, 16, 0.88));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 12px 28px rgba(0,0,0,0.16);
        text-align: center;
      }
      .thread-explorer-titlebar .section-title {
        margin-bottom: 0;
      }
      .thread-explorer-titlebar .section-note {
        max-width: 560px;
        margin: 0;
        color: var(--muted-soft);
      }
      .page-summary-card {
        margin-bottom: 12px;
        padding: 12px;
        border-radius: 18px;
        border: 1px solid rgba(141, 216, 255, 0.1);
        background:
          radial-gradient(circle at 100% 0%, rgba(124, 157, 255, 0.08), transparent 34%),
          rgba(255, 255, 255, 0.018);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
      }
      .page-summary-card .section-title {
        margin-bottom: 8px;
      }
      .thread-toolbar-primary {
        grid-area: actions;
        justify-self: start;
        justify-content: flex-start;
        max-width: 100%;
        padding: 4px;
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.07);
        background: rgba(255, 255, 255, 0.018);
      }
      .thread-toolbar-primary .chip {
        min-height: 30px;
      }
      .thread-explorer-search {
        grid-area: search;
        justify-self: start;
        width: 100%;
        max-width: 420px;
      }
      .thread-search-sort-row {
        grid-area: search;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        width: 100%;
      }
      .thread-search-sort-row .thread-explorer-search {
        grid-area: auto;
        flex: 0 1 360px;
        min-width: 180px;
        max-width: 360px;
      }
      .new-thread-chip {
        color: #caffea;
        border-color: rgba(84, 242, 176, 0.22);
        background: rgba(18, 73, 53, 0.16);
        font-weight: 700;
      }
      .codex-sidebar-chip {
        color: #d9e5ff;
        border-color: rgba(124, 157, 255, 0.24);
        background: rgba(40, 77, 134, 0.16);
      }
      .thread-filter-row {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        align-items: center;
        margin-top: 8px;
        padding-top: 10px;
        border-top: 1px solid rgba(126, 231, 255, 0.06);
      }
      .thread-directory-filter-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: flex-start;
        margin-top: 10px;
        padding: 0;
        border: 0;
        background: transparent;
      }
      .thread-directory-filter-row .thread-tab-filter {
        min-width: 0;
      }
      .thread-directory-filter-row .chip {
        min-height: 30px;
      }
      .directory-picker {
        position: relative;
        display: inline-flex;
        align-items: flex-start;
        max-width: min(380px, 100%);
      }
      .directory-picker-trigger {
        max-width: min(360px, 100%);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .directory-picker-menu {
        position: absolute;
        z-index: 30;
        top: calc(100% + 6px);
        left: 0;
        width: min(360px, 78vw);
        max-height: 300px;
        overflow: hidden;
        display: grid;
        gap: 6px;
        padding: 8px;
        border: 1px solid rgba(126, 231, 255, 0.16);
        border-radius: 12px;
        background: rgba(12, 16, 24, 0.98);
        box-shadow: 0 18px 46px rgba(0, 0, 0, 0.36);
      }
      .directory-picker-search {
        width: 100%;
        min-height: 30px;
        border-radius: 9px;
        border: 1px solid rgba(126, 231, 255, 0.12);
        background: rgba(255,255,255,0.035);
        color: var(--text);
        padding: 0 9px;
        outline: none;
      }
      .directory-picker-search:focus {
        border-color: rgba(126, 231, 255, 0.36);
      }
      .directory-picker-options {
        display: grid;
        gap: 5px;
        max-height: 220px;
        overflow-y: auto;
        padding-right: 2px;
      }
      .directory-picker-option {
        justify-content: flex-start;
        width: 100%;
        min-width: 0;
      }
      .directory-picker-option .directory-option-label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .git-picker {
        max-width: 150px;
      }
      .git-picker .directory-picker-trigger {
        max-width: 140px;
      }
      .git-picker .directory-picker-menu {
        width: 148px;
      }
      .git-picker .directory-picker-options {
        max-height: 150px;
      }
      .filter-select-shell {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 30px;
        padding: 0 9px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.024);
        color: var(--muted);
        font-size: 12px;
      }
      .filter-select-shell.active {
        border-color: rgba(84, 242, 176, 0.3);
        background: rgba(18, 73, 53, 0.16);
        color: #caffea;
      }
      .filter-select-shell select {
        max-width: 112px;
        border: 0;
        outline: none;
        color: var(--text);
        background: transparent;
        font: inherit;
      }
      .thread-tab-filter {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .thread-tab-filter .chip.active {
        border-color: rgba(84, 242, 176, 0.3);
        background: rgba(18, 73, 53, 0.18);
        color: #caffea;
      }
      .thread-tab-menu {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.024);
      }
      .thread-tab-empty {
        min-height: 24px;
        display: inline-flex;
        align-items: center;
        padding: 0 9px;
        color: var(--muted-soft);
        font-size: 11px;
      }
      .thread-root-menu {
        max-width: min(720px, 100%);
        overflow-x: auto;
      }
      .thread-root-menu .chip {
        max-width: min(620px, 82vw);
        justify-content: flex-start;
        white-space: normal;
        line-height: 1.25;
        text-align: left;
      }
      .thread-sort-row {
        display: inline-flex;
        align-items: center;
        gap: 0;
        width: fit-content;
        max-width: 100%;
        padding: 3px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.025);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.025);
        margin-top: 8px;
      }
      .thread-search-sort-row .thread-sort-row {
        flex: 0 1 auto;
        margin-top: 0;
        overflow-x: auto;
      }
      .thread-control-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        align-items: center;
        gap: 10px;
        margin-top: 8px;
      }
      .thread-control-row .thread-sort-row {
        margin-top: 0;
      }
      .thread-control-row .batch-bar {
        margin-bottom: 0;
        min-height: 30px;
        padding: 3px;
        border-radius: 999px;
        justify-content: flex-end;
      }
      .thread-control-row .batch-bar .chip {
        min-height: 24px;
        padding: 0 9px;
      }
      .thread-control-row .batch-bar .action-status {
        padding: 0 8px;
        white-space: nowrap;
      }
      .thread-sort-row .sort-label {
        padding: 0 8px;
      }
      .thread-sort-row .chip {
        min-height: 24px;
        padding: 0 9px;
        border-color: transparent;
        background: transparent;
      }
      .thread-sort-row .chip.active {
        background: rgba(124, 157, 255, 0.22);
        border-color: rgba(124, 157, 255, 0.32);
      }
      .overview-section {
        --overview-accent: var(--blue);
        --overview-tint: color-mix(in srgb, var(--overview-accent) 5%, transparent);
        display: grid;
        gap: 14px;
        overflow: hidden;
        border-color: color-mix(in srgb, var(--overview-accent) 18%, var(--line));
        background:
          linear-gradient(180deg, var(--overview-tint), color-mix(in srgb, var(--panel) 96%, transparent)),
          var(--panel);
        box-shadow: 0 18px 46px rgba(0, 0, 0, 0.26), inset 0 1px 0 rgba(255,255,255,0.035);
        content-visibility: auto;
        contain-intrinsic-size: auto 420px;
      }
      .overview-section::before {
        content: "";
        position: absolute;
        inset: 0 auto 0 0;
        width: 5px;
        border-radius: var(--radius-panel) 0 0 var(--radius-panel);
        background: color-mix(in srgb, var(--overview-accent) 74%, transparent);
        pointer-events: none;
      }
      .overview-section > .running-board-toolbar {
        padding: 2px 0 12px 0;
        border-bottom: 1px solid color-mix(in srgb, var(--overview-accent) 13%, var(--line));
      }
      .overview-section-agent {
        --overview-accent: var(--blue);
      }
      .overview-section-config {
        --overview-accent: var(--gold);
      }
      .overview-section-sidecar {
        --overview-accent: var(--green);
      }
      .overview-section-provider {
        --overview-accent: var(--purple);
      }
      .overview-section-accounts {
        --overview-accent: var(--teal);
      }
      .overview-section-snapshot {
        --overview-accent: var(--cyan);
      }
      .agent-task-summary-panel {
        overflow: hidden;
      }
      .team-health-badge {
        display: inline-flex;`;
}

module.exports = {
  getThreadOverviewStyles,
};
