function getThreadDetailStyles() {
  return `        font-size: 11px;
        background: transparent;
        border-color: rgba(126, 231, 255, 0.1);
        color: var(--muted);
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .mini-action-btn:hover,
      .pin-btn:hover {
        color: var(--text);
      }
      .mini-action-btn.attach-board {
        color: #f2c27b;
        border-color: rgba(242, 194, 123, 0.22);
        background: rgba(116, 78, 22, 0.12);
      }
      .thread-tab-actions {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 4px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid rgba(126, 231, 255, 0.08);
      }
      .thread-tab-action {
        min-height: 22px;
        min-width: 0;
        padding: 0 7px;
        border-radius: 8px;
        border: 1px solid rgba(126, 231, 255, 0.12);
        background: rgba(255,255,255,0.018);
        color: var(--muted);
        font-size: 10px;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .thread-tab-action:hover,
      .thread-tab-action.active {
        color: var(--text-strong);
        border-color: rgba(124, 157, 255, 0.3);
        background: rgba(124, 157, 255, 0.12);
      }
      .mini-action-btn.attach-loop {
        color: #b9f6dc;
        border-color: rgba(84, 242, 176, 0.2);
        background: rgba(18, 73, 53, 0.12);
      }
      .mini-action-btn.terminal-resume {
        color: #d8e5ff;
        border-color: rgba(124, 157, 255, 0.22);
        background: rgba(54, 78, 138, 0.12);
      }
      .mini-action-btn.git-action {
        color: #c8f5de;
        border-color: rgba(84, 242, 176, 0.18);
        background: rgba(18, 73, 53, 0.1);
      }
      .mini-action-btn.git-push {
        color: #d8e5ff;
        border-color: rgba(124, 157, 255, 0.22);
        background: rgba(54, 78, 138, 0.12);
      }
      .thread-quick-actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 7px;
      }
      .thread-lifecycle-line {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 7px;
        color: var(--muted);
        font-size: 11px;
        line-height: 1.35;
      }
      .thread-lifecycle-state {
        min-height: 20px;
        display: inline-flex;
        align-items: center;
        padding: 0 7px;
        border-radius: 999px;
        border: 1px solid rgba(126, 231, 255, 0.12);
        background: rgba(126, 231, 255, 0.045);
        color: #c9f7ff;
        font-weight: 700;
        text-transform: capitalize;
      }
      .thread-lifecycle-line.lifecycle-completed .thread-lifecycle-state {
        color: #caffea;
        border-color: rgba(84, 242, 176, 0.2);
        background: rgba(84, 242, 176, 0.06);
      }
      .thread-lifecycle-line.lifecycle-needs_attention .thread-lifecycle-state,
      .thread-lifecycle-line.lifecycle-aborted .thread-lifecycle-state {
        color: #ffd7dd;
        border-color: rgba(255, 143, 159, 0.24);
        background: rgba(122, 24, 40, 0.16);
      }
      .thread-lifecycle-line.lifecycle-running .thread-lifecycle-state,
      .thread-lifecycle-line.lifecycle-queued .thread-lifecycle-state {
        color: #ffeab0;
        border-color: rgba(255, 214, 107, 0.22);
        background: rgba(120, 76, 9, 0.12);
      }
      .thread-lifecycle-reason {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .thread-lifecycle-tools {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
      }
      .thread-lifecycle-tool {
        min-height: 20px;
        display: inline-flex;
        align-items: center;
        padding: 0 6px;
        border-radius: 7px;
        border: 1px solid rgba(255,255,255,0.07);
        background: rgba(255,255,255,0.025);
        color: var(--muted-soft);
        font-size: 10px;
        font-weight: 700;
      }
      .thread-quick-action {
        min-height: 22px;
        min-width: 0;
        padding: 0 8px;
        border-radius: 8px;
        border: 1px solid rgba(126, 231, 255, 0.1);
        background: rgba(255,255,255,0.018);
        color: var(--muted);
        font-size: 10px;
        font-weight: 700;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
      }
      .thread-quick-action:disabled {
        opacity: 1;
        cursor: default;
      }
      .thread-quick-action.git-action {
        color: #c8f5de;
        border-color: rgba(84, 242, 176, 0.18);
        background: rgba(18, 73, 53, 0.1);
      }
      .thread-quick-action.quick-cmd {
        color: #e9dcff;
        border-color: rgba(196, 163, 255, 0.28);
        background: rgba(80, 54, 138, 0.15);
      }
      .thread-quick-action.quick-cmp {
        color: #b9f6dc;
        border-color: rgba(84, 242, 176, 0.2);
        background: rgba(84, 242, 176, 0.06);
      }
      .thread-quick-action.git-push {
        color: #d8e5ff;
        border-color: rgba(124, 157, 255, 0.22);
        background: rgba(54, 78, 138, 0.12);
      }
      .mini-action-btn.attached {
        font-weight: 700;
      }
      .mini-action-btn.locate {
        color: #d8e5ff;
        border-color: rgba(124, 157, 255, 0.24);
        background: rgba(124, 157, 255, 0.12);
      }
      .mini-action-btn.locate:hover {
        color: var(--text-strong);
        border-color: rgba(124, 157, 255, 0.42);
        background: rgba(124, 157, 255, 0.2);
      }
      .pin-btn.pinned {
        color: var(--gold);
        border-color: rgba(255, 214, 107, 0.28);
        background: rgba(255, 214, 107, 0.08);
      }
      .mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .muted {
        color: var(--muted);
      }
      .preview {
        margin-top: 6px;
        color: var(--muted);
        line-height: 1.35;
        font-size: 12px;
      }
      .stack {
        display: grid;
        gap: 12px;
      }
      .group-block {
        --group-accent: rgba(92, 140, 160, 0.55);
        margin-top: 8px;
        border: 1px solid rgba(126, 231, 255, 0.08);
        border-radius: 18px;
        padding: 8px 8px 8px 14px;
        background: rgba(255,255,255,0.012);
        position: relative;
        overflow: hidden;
      }
      .group-block::before {
        content: "";
        position: absolute;
        left: 0;
        top: 10px;
        bottom: 10px;
        width: 3px;
        border-radius: 0 999px 999px 0;
        background: color-mix(in srgb, var(--group-accent) 62%, transparent);
        box-shadow: 0 0 10px color-mix(in srgb, var(--group-accent) 14%, transparent);
      }
      .group-block.project-group {
        --project-accent: rgba(126, 231, 255, 0.72);
        padding-left: 18px;
      }
      .group-block.project-group::after {
        content: "";
        position: absolute;
        left: 5px;
        top: 10px;
        bottom: 10px;
        width: 3px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--project-accent) 78%, transparent);
        box-shadow: 0 0 12px color-mix(in srgb, var(--project-accent) 20%, transparent);
      }
      .group-block:first-child {
        margin-top: 0;
      }
      .group-summary {
        list-style: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        color: var(--text);
        padding: 4px 4px 10px 4px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .group-title-cluster {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-weight: 800;
        min-width: 0;
      }
      .group-summary-actions {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex: 0 0 auto;
      }
      .group-board-btn {
        min-height: 24px;
        padding: 0 8px;
        border-radius: 999px;
        font-size: 11px;
        text-transform: none;
        letter-spacing: 0;
        color: #caffea;
        border-color: rgba(84, 242, 176, 0.22);
        background: rgba(18, 73, 53, 0.12);
      }
      .group-board-btn.active {
        color: #ffe7bb;
        border-color: rgba(242, 194, 123, 0.3);
        background: rgba(116, 78, 22, 0.18);
      }
      .group-select-btn {
        min-height: 22px;
        min-width: 22px;
        padding: 0;
        border-radius: 7px;
        font-size: 11px;
        line-height: 1;
        background: rgba(8, 18, 34, 0.72);
        border: 1px solid color-mix(in srgb, var(--group-accent) 32%, rgba(126, 231, 255, 0.12));
        color: var(--muted);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
      }
      .group-select-btn:hover,
      .group-select-btn:focus-visible {
        color: var(--text);
        border-color: color-mix(in srgb, var(--group-accent) 72%, rgba(126, 231, 255, 0.22));
        background: color-mix(in srgb, var(--group-accent) 16%, rgba(8, 18, 34, 0.72));
      }
      .group-select-btn.selected,
      .group-select-btn.partial {
        color: var(--gold);
        border-color: rgba(255, 214, 107, 0.34);
        background: rgba(255, 214, 107, 0.08);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .group-select-btn {
        color: var(--muted);
        border-color: color-mix(in srgb, var(--group-accent) 22%, var(--line));
        background: color-mix(in srgb, var(--panel-elevated) 86%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .group-select-btn:hover,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .group-select-btn:focus-visible {
        color: var(--text-strong);
        border-color: color-mix(in srgb, var(--group-accent) 46%, var(--line));
        background: color-mix(in srgb, var(--group-accent) 9%, #ffffff);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .group-select-btn.selected,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .group-select-btn.partial {
        color: #7a5200;
        border-color: rgba(154, 100, 0, 0.24);
        background: rgba(255, 214, 107, 0.18);
      }
      .group-label-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--group-accent) 72%, transparent);
        box-shadow: 0 0 10px color-mix(in srgb, var(--group-accent) 16%, transparent);
      }
      .group-block.project-group .group-label-dot {
        background: color-mix(in srgb, var(--project-accent) 74%, transparent);
        box-shadow: 0 0 10px color-mix(in srgb, var(--project-accent) 20%, transparent);
      }
      .group-block[data-group="pinned"] {
        --group-accent: #a98a38;
        border-color: rgba(255, 214, 107, 0.2);
        background: linear-gradient(180deg, rgba(120, 76, 9, 0.12), rgba(255,255,255,0.012));
      }
      .group-block[data-group="pinned"] .group-label-dot {
        background: color-mix(in srgb, var(--gold) 62%, transparent);
        box-shadow: 0 0 10px rgba(255, 214, 107, 0.12);
      }
      .group-block[data-group="needs_human"] {
        --group-accent: #a75e69;
      }
      .group-block[data-group="running"] {
        --group-accent: #3f9871;
      }
      .group-block[data-group="stopped"] {
        --group-accent: #536174;
      }
      .group-block[data-group="linked"] {
        --group-accent: #4f91a5;
      }
      .group-block[data-group="recent"] {
        --group-accent: #7967a5;
      }
      .group-block[data-group="idle"] {
        --group-accent: #536174;
      }
      .group-block[data-group="archived"] {
        --group-accent: #626977;
      }
      .group-block[data-group="soft_deleted"] {
        --group-accent: #a34c56;
      }
      .group-summary::-webkit-details-marker { display: none; }
      .group-count {
        font-size: 11px;
        color: var(--text);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 999px;
        padding: 1px 7px;
        background: rgba(255,255,255,0.04);
      }
      .root-subgroup {
        margin: 6px 0 10px;
      }
      .root-subgroup:last-child {
        margin-bottom: 0;
      }
      .root-subgroup-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 0 0 6px 0;
      }
      .root-subgroup .thread-row + .thread-row {
        margin-top: 6px;
      }
      .tabs {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }
      .tab {
        min-height: 36px;
        padding: 0 12px;
        border-radius: 12px;
        border: 1px solid rgba(126, 231, 255, 0.1);
        background: rgba(8, 18, 34, 0.84);
      }
      .tab.active {
        border-color: rgba(126, 231, 255, 0.24);
        background: linear-gradient(180deg, rgba(30, 83, 156, 0.28), rgba(12, 28, 52, 0.9));
      }
      .terminal {
        border-radius: 16px;
        border: 1px solid rgba(126, 231, 255, 0.08);
        background: linear-gradient(180deg, #07101d, #040a14);
        min-height: 320px;
        max-height: 420px;
        overflow: auto;
        padding: 12px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
      }
      .terminal-line {
        padding: 8px 0;
        border-bottom: 1px solid rgba(126, 231, 255, 0.06);
      }
      .chat-window {
        display: grid;
        gap: 10px;
        min-height: 320px;
        max-height: 520px;
        overflow: auto;
      }
      .connection-card {
        border-radius: 16px;
        border: 1px solid rgba(126, 231, 255, 0.08);
        background: linear-gradient(180deg, rgba(8, 18, 34, 0.82), rgba(6, 14, 25, 0.74));
        padding: 14px;
      }
      .connection-grid {
        display: grid;
        gap: 10px;
        margin-top: 10px;
      }
      .empty-state {
        min-height: 220px;
        display: grid;
        place-items: center;
        text-align: center;
        color: var(--muted-soft);
        border-radius: 16px;
        border: 1px dashed rgba(126, 231, 255, 0.08);
        background: rgba(7, 14, 26, 0.42);
        padding: 20px;
      }
      .empty-state.cute {
        padding: 22px 20px 18px;
      }
      .empty-state-inner {
        display: grid;
        justify-items: center;
        gap: 10px;
        max-width: 280px;
      }
      .empty-state-art {
        width: 68px;
        height: 68px;
        object-fit: contain;
        filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.3));
      }
      .empty-state-title {
        color: var(--text-strong);
        font-size: 13px;
        font-weight: 700;
      }
      .empty-state-copy {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.5;
      }
      .section-note {
        color: var(--muted);
        font-size: 12px;
        margin-bottom: 8px;
      }
      .batch-bar {
        display: none;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        border: 1px solid rgba(126, 231, 255, 0.08);
        background: rgba(8, 15, 28, 0.74);
        border-radius: 14px;
        padding: 10px;
        margin-bottom: 10px;
      }
      .batch-bar.visible {
        display: flex;
      }
      .batch-bar.confirm {
        border-color: rgba(255, 214, 107, 0.2);
        background:
          linear-gradient(180deg, rgba(30, 20, 5, 0.64), rgba(13, 10, 5, 0.8)),
          rgba(8, 15, 28, 0.74);
        box-shadow: inset 0 0 0 1px rgba(255, 214, 107, 0.06);
      }
      .batch-bar.confirm.danger {
        border-color: rgba(255, 124, 136, 0.24);
        background:
          linear-gradient(180deg, rgba(47, 11, 17, 0.64), rgba(18, 8, 11, 0.82)),
          rgba(8, 15, 28, 0.74);
        box-shadow: inset 0 0 0 1px rgba(255, 124, 136, 0.07);
      }
      .batch-count {
        color: var(--text);
        font-size: 12px;
        font-weight: 700;
        margin-right: 4px;
      }
      .batch-intent {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid rgba(255, 214, 107, 0.22);
        background: rgba(255, 214, 107, 0.08);
        color: #ffeab0;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .batch-intent.danger {
        border-color: rgba(255, 124, 136, 0.24);
        background: rgba(122, 24, 40, 0.18);
        color: #ffd9dd;
      }
      .batch-preview {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.45;
      }
      .batch-spacer {
        flex: 1 1 auto;
      }
      .chip.warn-chip {
        border-color: rgba(255, 214, 107, 0.28);
        background: rgba(120, 76, 9, 0.18);
        color: #ffeab0;
      }
      .chip.danger-chip {
        border-color: rgba(255, 124, 136, 0.28);
        background: rgba(122, 24, 40, 0.2);
        color: #ffd9dd;
      }
      .chat-window {
        display: grid;
        gap: 10px;
      }
      .chat {
        border-radius: 12px;
        padding: 10px;
        background: rgba(8, 18, 34, 0.72);
        border: 1px solid rgba(126, 231, 255, 0.08);
        display: grid;
        gap: 6px;
      }
      .chat-text {
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 12px;
        line-height: 1.6;
        color: var(--text);
        max-height: 320px;
        overflow-y: auto;
      }
      .chat.user {
        border-color: rgba(255, 214, 107, 0.16);
      }
      .chat.assistant {
        border-color: rgba(126, 231, 255, 0.12);
        background: rgba(12, 24, 40, 0.72);
      }
      .conversation-locator {
        display: grid;
        gap: 10px;
        margin-bottom: 12px;
        padding: 10px;
        border-radius: 12px;
        border: 1px solid rgba(126, 231, 255, 0.1);
        background: rgba(6, 14, 25, 0.58);
      }
      .conversation-locator-head {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 8px;
      }
      .conversation-locator-title {
        color: var(--text-strong);
        font-size: 12px;
        font-weight: 800;
      }
      .conversation-locator-search {
        width: 100%;
        min-height: 30px;
        border-radius: 8px;
        border: 1px solid rgba(126, 231, 255, 0.1);
        background: rgba(255, 255, 255, 0.03);
        color: var(--text);
        padding: 0 9px;
        outline: none;
      }
      .conversation-locator-list {
        display: grid;
        gap: 6px;
        max-height: 240px;
        overflow: auto;
        padding-right: 2px;
      }
      .conversation-locator-item {
        appearance: none;
        width: 100%;
        display: grid;
        grid-template-columns: 24px minmax(0, 1fr);
        gap: 8px;
        text-align: left;
        border-radius: 10px;
        border: 1px solid rgba(126, 231, 255, 0.08);
        background: rgba(255, 255, 255, 0.025);
        color: var(--text);
        padding: 8px;
        cursor: pointer;
      }
      .conversation-locator-item:hover,
      .conversation-locator-item:focus-visible {
        border-color: rgba(126, 231, 255, 0.24);
        background: rgba(126, 231, 255, 0.08);
        outline: none;
      }
      .conversation-locator-index {
        display: inline-grid;
        place-items: center;
        width: 22px;
        height: 22px;
        border-radius: 999px;
        color: #b8ffde;
        background: rgba(84, 242, 176, 0.1);
        font-size: 11px;
        font-weight: 800;
      }
      .conversation-locator-copy {
        min-width: 0;
        display: grid;
        gap: 3px;
      }
      .conversation-locator-prompt {
        color: var(--text-strong);
        font-size: 12px;
        font-weight: 700;
        line-height: 1.35;
      }
      .conversation-locator-preview {
        color: var(--muted);
        font-size: 11px;
        line-height: 1.35;
      }
      .conversation-turn-highlight {
        animation: conversationTurnFlash 1.8s ease-out;
      }
      @keyframes conversationTurnFlash {
        0% {
          border-color: rgba(84, 242, 176, 0.78);
          box-shadow: 0 0 0 3px rgba(84, 242, 176, 0.18);
        }
        100% {
          border-color: rgba(126, 231, 255, 0.08);
          box-shadow: none;
        }
      }
      .chat-head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 8px;
        color: var(--muted);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .empty {
        color: var(--muted);
        padding: 20px 0;
      }
      .thread-list-empty {
        display: grid;
        gap: 8px;
        justify-items: start;
        border: 1px dashed rgba(126, 231, 255, 0.12);
        border-radius: 12px;
        background: rgba(7, 14, 26, 0.38);
        padding: 16px;
      }
      .footer-note {
        color: var(--muted);
        font-size: 12px;
      }
      .panel-language-toggle {
        min-width: 76px;
        font-weight: 800;
      }
      .panel-language-toggle.active {
        color: var(--text-strong);
        border-color: color-mix(in srgb, var(--green) 28%, var(--line));
        background: color-mix(in srgb, var(--green) 10%, var(--panel-elevated));
      }
      .thread-list-compact .thread-row { cursor: pointer; }
      .running-board-shell {`;
}

module.exports = {
  getThreadDetailStyles,
};
