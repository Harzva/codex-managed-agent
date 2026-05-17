module.exports = `        100% { opacity: 0.7; transform: scaleX(1); }
      }
      .running-card-top,
      .running-card-actions,
      .running-card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .running-card-top {
        align-items: flex-start;
      }
      .running-card-title {
        font-size: 14px;
        font-weight: 800;
        line-height: 1.4;
        color: var(--text-strong);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .running-card-subtitle,
      .running-card-note {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.5;
      }
      .running-card-body {
        display: grid;
        gap: 10px;
        align-content: start;
      }
      .running-card-path-row {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .board-lifecycle-strip {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        flex-wrap: wrap;
      }
      .board-lifecycle-badge {
        display: inline-flex;
        align-items: center;
        min-height: 22px;
        padding: 0 9px;
        border-radius: 999px;
        border: 1px solid rgba(141, 216, 255, 0.14);
        background: rgba(141, 216, 255, 0.07);
        color: var(--text);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .board-lifecycle-strip.lifecycle-completed .board-lifecycle-badge {
        border-color: rgba(98, 255, 166, 0.18);
        background: rgba(98, 255, 166, 0.08);
        color: #d8ffe4;
      }
      .board-lifecycle-strip.lifecycle-running .board-lifecycle-badge,
      .board-lifecycle-strip.lifecycle-queued .board-lifecycle-badge {
        border-color: rgba(124, 157, 255, 0.18);
        background: rgba(124, 157, 255, 0.08);
        color: #dee7ff;
      }
      .board-lifecycle-strip.lifecycle-needs_attention .board-lifecycle-badge,
      .board-lifecycle-strip.lifecycle-aborted .board-lifecycle-badge {
        border-color: rgba(255, 167, 106, 0.2);
        background: rgba(255, 167, 106, 0.09);
        color: #ffe2c6;
      }
      .board-lifecycle-reason {
        flex: 1 1 160px;
        min-width: 0;
        color: var(--muted);
        font-size: 11px;
        line-height: 1.45;
      }
      .board-lifecycle-tools {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
      }
      .board-lifecycle-tool {
        display: inline-flex;
        align-items: center;
        max-width: 112px;
        min-height: 20px;
        padding: 0 7px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.035);
        color: var(--muted-soft);
        font-size: 10px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .thread-lifecycle-state,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-lifecycle-badge {
        color: #17617b;
        border-color: rgba(20, 122, 159, 0.2);
        background: rgba(20, 122, 159, 0.08);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .thread-lifecycle-line.lifecycle-unknown .thread-lifecycle-state,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-lifecycle-strip.lifecycle-unknown .board-lifecycle-badge {
        color: #4b5a70;
        border-color: rgba(89, 105, 127, 0.2);
        background: rgba(89, 105, 127, 0.1);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .thread-lifecycle-line.lifecycle-completed .thread-lifecycle-state,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-lifecycle-strip.lifecycle-completed .board-lifecycle-badge {
        color: #086148;
        border-color: rgba(8, 122, 90, 0.22);
        background: rgba(8, 122, 90, 0.1);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .thread-lifecycle-line.lifecycle-running .thread-lifecycle-state,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .thread-lifecycle-line.lifecycle-queued .thread-lifecycle-state,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-lifecycle-strip.lifecycle-running .board-lifecycle-badge,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-lifecycle-strip.lifecycle-queued .board-lifecycle-badge {
        color: #7a5200;
        border-color: rgba(154, 100, 0, 0.22);
        background: rgba(255, 214, 107, 0.16);
      }
      .size-switch {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px;
        border-radius: 999px;
        background: rgba(255,255,255,0.035);
        border: 1px solid rgba(255,255,255,0.08);
      }
      .size-chip {
        min-height: 22px;
        min-width: 22px;
        padding: 0 8px;
        border-radius: 999px;
        border: none;
        background: transparent;
        color: var(--muted);
        font-size: 10px;
        box-shadow: none;
        transform: none;
      }
      .size-chip.active {
        background: rgba(124, 157, 255, 0.2);
        color: var(--text-strong);
      }
      .size-chip:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
      .board-card-size-actions {
        display: inline-flex;
        align-items: center;
        justify-content: flex-start;
        gap: 6px;
        max-width: 100%;
        width: 100%;
        min-width: 0;
        flex-wrap: wrap;
        justify-self: stretch;
        margin: 0 0 2px;
        padding: 0 0 7px;
        border-radius: 0;
        border: none;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        background: transparent;
        box-shadow: none;
      }
      .running-card-badges {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .running-card-control {
        display: grid;
        gap: 8px;
      }
      .control-label {
        color: var(--muted-soft);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        text-align: right;
      }
      .control-label.left {
        text-align: left;
      }
      .running-card-footer {
        padding-top: 6px;
        border-top: 1px solid rgba(255,255,255,0.06);
        align-items: flex-end;
        gap: 6px;
      }
      .running-action-rail {
        display: flex;
        align-items: center;
        gap: 5px;
        flex-wrap: wrap;
      }
      .tool-btn {
        min-height: 22px;
        padding: 0 7px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.03);
        color: var(--muted);
        font-size: 10px;
        font-weight: 600;
        box-shadow: none;
        transform: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .tool-btn:hover {
        color: var(--text-strong);
        border-color: rgba(124, 157, 255, 0.26);
        background: rgba(124, 157, 255, 0.12);
        box-shadow: none;
      }
      .tool-btn.primary {
        color: #d8e5ff;
        border-color: rgba(124, 157, 255, 0.22);
        background: rgba(124, 157, 255, 0.16);
      }
      .tool-btn.git-action {
        color: #c8f5de;
        border-color: rgba(84, 242, 176, 0.18);
        background: rgba(18, 73, 53, 0.1);
      }
      .tool-btn.git-push {
        color: #d8e5ff;
        border-color: rgba(124, 157, 255, 0.22);
        background: rgba(54, 78, 138, 0.12);
      }
      .tool-btn.codex-link,
      .tool-btn.board-codex-shortcut {
        color: #e7dcff;
        border-color: rgba(173, 143, 255, 0.28);
        background: rgba(173, 143, 255, 0.12);
      }
      .tool-btn.board-codex-shortcut {
        flex: 0 0 auto;
        min-width: max-content;
      }
      .tool-btn.board-codex-shortcut span {
        display: inline;
      }
      .tool-btn.pin {
        color: var(--gold);
        border-color: rgba(255, 212, 121, 0.24);
        background: rgba(255, 212, 121, 0.08);
      }
      .tool-btn.board {
        color: #f2c27b;
        border-color: rgba(242, 194, 123, 0.22);
        background: rgba(116, 78, 22, 0.12);
      }
      .tool-btn.board.attached {
        color: #ffe7bb;
        border-color: rgba(242, 194, 123, 0.34);
        background: rgba(116, 78, 22, 0.22);
      }
      .tool-btn.loop {
        color: #b9f6dc;
        border-color: rgba(84, 242, 176, 0.2);
        background: rgba(18, 73, 53, 0.12);
      }
      .tool-btn.loop.attached {
        color: #d6ffef;
        border-color: rgba(84, 242, 176, 0.34);
        background: rgba(18, 73, 53, 0.22);
      }
      .tool-id {
        display: inline-flex;
        align-items: center;
        min-height: 22px;
        padding: 0 8px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.06);
        background: rgba(255,255,255,0.02);
        color: var(--muted-soft);
        font-size: 10px;
        letter-spacing: 0.04em;
      }
      .tool-icon {
        display: inline-grid;
        place-items: center;
        width: 13px;
        height: 13px;
        color: currentColor;
        opacity: 0.92;
        line-height: 0;
      }
      .tool-icon svg {
        width: 13px;
        height: 13px;
        stroke: currentColor;
        fill: none;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-card-size-actions {
        border: none;
        border-bottom: 1px solid color-mix(in srgb, var(--muted-soft) 12%, var(--line));
        background: transparent;
        box-shadow: none;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .running-card.project-card,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .running-card.board-attached {
        border-color: color-mix(in srgb, var(--muted-soft) 18%, var(--line));
        background: linear-gradient(180deg, color-mix(in srgb, var(--panel-elevated) 98%, transparent), color-mix(in srgb, var(--panel-soft) 96%, transparent));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-lifecycle-strip.lifecycle-running .board-lifecycle-badge,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-lifecycle-strip.lifecycle-queued .board-lifecycle-badge {
        color: color-mix(in srgb, var(--blue) 70%, var(--text));
        border-color: color-mix(in srgb, var(--blue) 18%, var(--line));
        background: color-mix(in srgb, var(--blue) 5%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-lifecycle-strip.lifecycle-unknown .board-lifecycle-badge {
        color: var(--muted);
        border-color: color-mix(in srgb, var(--muted-soft) 16%, var(--line));
        background: color-mix(in srgb, var(--panel-soft) 68%, transparent);
      }
      .thread-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 6px;
      }
      .card-usage-meta {
        margin-top: 8px;
        gap: 6px;
      }
      .phase-chip {
        --phase-chip-border: rgba(255,255,255,0.08);
        --phase-chip-bg: rgba(255,255,255,0.03);
        --phase-chip-text: var(--text);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 24px;
        padding: 0 9px;
        box-sizing: border-box;
        border-radius: 999px;
        border: 1px solid var(--phase-chip-border);
        background: var(--phase-chip-bg);
        color: var(--phase-chip-text);
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
      }
      .phase-chip-art {
        width: 15px;
        height: 15px;
        object-fit: contain;
        filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.2));
      }
      .phase-chip.phase-planning {
        --phase-chip-border: rgba(126, 231, 255, 0.16);
        --phase-chip-bg: rgba(36, 89, 122, 0.16);
        --phase-chip-text: #d7f2ff;
      }
      .phase-chip.phase-tooling {
        --phase-chip-border: rgba(255, 214, 107, 0.18);
        --phase-chip-bg: rgba(120, 76, 9, 0.16);
        --phase-chip-text: #ffeab0;
      }
      .phase-chip.phase-editing {
        --phase-chip-border: rgba(84, 242, 176, 0.18);
        --phase-chip-bg: rgba(18, 73, 53, 0.16);
        --phase-chip-text: #caffea;
      }
      .phase-chip.phase-testing {
        --phase-chip-border: rgba(196, 163, 255, 0.18);
        --phase-chip-bg: rgba(66, 43, 109, 0.16);
        --phase-chip-text: #eadcff;
      }
      .phase-chip.phase-waiting {
        --phase-chip-border: rgba(173, 181, 197, 0.16);
        --phase-chip-bg: rgba(58, 66, 80, 0.16);
        --phase-chip-text: #d9dee8;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .phase-chip {
        --phase-chip-border: var(--line);
        --phase-chip-bg: color-mix(in srgb, var(--panel-soft) 84%, transparent);
        --phase-chip-text: var(--text);
        color: var(--phase-chip-text);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .phase-chip.phase-planning {
        --phase-chip-border: rgba(20, 122, 159, 0.18);
        --phase-chip-bg: rgba(20, 122, 159, 0.08);
        --phase-chip-text: #17617b;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .phase-chip.phase-tooling {
        --phase-chip-border: rgba(154, 100, 0, 0.22);
        --phase-chip-bg: rgba(255, 214, 107, 0.18);
        --phase-chip-text: #7a5200;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .phase-chip.phase-editing {
        --phase-chip-border: rgba(8, 122, 90, 0.22);
        --phase-chip-bg: rgba(8, 122, 90, 0.1);
        --phase-chip-text: #086148;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .phase-chip.phase-testing {
        --phase-chip-border: rgba(107, 90, 181, 0.22);
        --phase-chip-bg: rgba(107, 90, 181, 0.1);
        --phase-chip-text: #5a3ea6;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .phase-chip.phase-waiting {
        --phase-chip-border: rgba(89, 105, 127, 0.18);
        --phase-chip-bg: rgba(89, 105, 127, 0.12);
        --phase-chip-text: #4b5a70;
      }
      .meta-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 24px;
        box-sizing: border-box;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 999px;
        padding: 0 9px;
        color: var(--muted);
        font-size: 11px;
        line-height: 1;
      }
      .meta-pill-model {
        color: var(--text);
        border-color: rgba(126, 231, 255, 0.16);
        background: rgba(126, 231, 255, 0.06);
      }
      .meta-pill-cmd {
        color: #e9dcff;
        border-color: rgba(196, 163, 255, 0.28);
        background: rgba(80, 54, 138, 0.15);
        font-weight: 600;
      }
      .meta-pill-cmp {
        color: #b9f6dc;
        border-color: rgba(84, 242, 176, 0.2);
        background: rgba(84, 242, 176, 0.06);
        font-weight: 600;
      }
      .meta-pill-token {
        color: var(--muted);
        border-color: rgba(84, 242, 176, 0.14);
        background: rgba(84, 242, 176, 0.045);
      }
      .meta-pill-human {
        color: #ffeab0;
        border-color: rgba(255, 214, 107, 0.2);
        background: rgba(255, 214, 107, 0.07);
      }
      .meta-pill-git {
        color: #caffea;
        border-color: rgba(84, 242, 176, 0.22);
        background: rgba(18, 73, 53, 0.14);
      }
      .meta-pill-git.missing {
        color: var(--muted-soft);
        border-color: rgba(173, 181, 197, 0.12);
        background: rgba(58, 66, 80, 0.12);
      }
      .meta-pill-git.detached {
`;
