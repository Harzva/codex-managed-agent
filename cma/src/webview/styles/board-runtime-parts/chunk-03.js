module.exports = `        white-space: nowrap;
        font-size: 10px;
        line-height: 1.4;
      }
      .running-card.compact-card .board-lifecycle-tool {
        max-width: 92px;
        min-height: 18px;
        padding: 0 6px;
        font-size: 9px;
      }
      .intervention-group-grid .running-card.compact-card .compact-card-titlebar {
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
      }
      .intervention-group-grid .running-card.compact-card .compact-card-actions {
        gap: 8px;
      }
      .intervention-group-grid .running-card.compact-card .compact-card-title {
        -webkit-line-clamp: 2;
      }
      .running-card.compact-card .compact-card-titlebar .tool-btn {
        flex: 0 0 auto;
        min-height: 24px;
        padding: 0 8px;
      }
      .running-card.compact-card .compact-card-titlebar .tool-btn span {
        display: inline;
      }
      .running-card.compact-card .running-card-body .running-card-title,
      .running-card.compact-card .running-card-footer {
        display: none;
      }
      .inline-card-label {
        cursor: text;
        position: relative;
      }
      .inline-card-label:hover {
        color: #ffffff;
      }
      .inline-card-label.is-editing {
        cursor: default;
      }
      .inline-card-label-input {
        width: 100%;
        min-height: 32px;
        border-radius: 10px;
        border: 1px solid rgba(124, 157, 255, 0.34);
        background: rgba(10, 14, 22, 0.96);
        color: var(--text-strong);
        font: inherit;
        font-size: inherit;
        font-weight: inherit;
        line-height: inherit;
        padding: 0 10px;
        outline: none;
        box-shadow: inset 0 0 0 1px rgba(124, 157, 255, 0.14);
      }
      .inline-card-label-input:focus {
        border-color: rgba(124, 157, 255, 0.5);
        box-shadow: 0 0 0 3px rgba(124, 157, 255, 0.14);
      }
      .editable-card-name {
        display: inline-flex;
        align-items: center;
        width: fit-content;
        max-width: min(100%, 320px);
        min-height: 24px;
        padding: 0 9px;
        border-radius: 999px;
        border: 1px solid rgba(255, 214, 107, 0.18);
        background: rgba(120, 76, 9, 0.1);
        color: #ffe5a6;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.01em;
        cursor: text;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .editable-card-name.empty {
        border-style: dashed;
        color: var(--muted);
        background: rgba(255,255,255,0.018);
        font-weight: 600;
      }
      .editable-card-name:hover,
      .editable-card-name:focus-visible {
        color: #fff6d8;
        border-color: rgba(255, 214, 107, 0.36);
        outline: none;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .editable-card-name {
        color: #6f4a00;
        border-color: rgba(154, 100, 0, 0.22);
        background: rgba(255, 214, 107, 0.18);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .editable-card-name.empty {
        color: #566274;
        border-color: rgba(89, 105, 127, 0.24);
        background: rgba(89, 105, 127, 0.08);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .editable-card-name:hover,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .editable-card-name:focus-visible {
        color: #4f3500;
        border-color: rgba(154, 100, 0, 0.36);
        background: rgba(255, 214, 107, 0.28);
      }
      .editable-card-name .inline-card-label-input {
        min-width: 148px;
        width: min(260px, 100%);
        min-height: 24px;
        border-radius: 999px;
        padding: 0 8px;
      }
      .running-card-card-name {
        margin-top: 6px;
      }
      .running-card.size-tiny.fixed-tiny .running-card-top {
        align-items: start;
        grid-template-columns: 1fr;
        gap: 8px;
      }
      .running-card.size-tiny.fixed-tiny .running-card-body {
        gap: 6px;
      }
      .running-card.size-tiny.fixed-tiny .running-card-subtitle,
      .running-card.size-tiny.fixed-tiny .preview,
      .running-card.size-tiny.fixed-tiny .phase-panel,
      .running-card.size-tiny.fixed-tiny .progress-head,
      .running-card.size-tiny.fixed-tiny .progress-track,
      .running-card.size-tiny.fixed-tiny .running-card-note,
      .running-card.size-tiny.fixed-tiny .meta-pill {
        display: none;
      }
      .running-card.size-tiny.fixed-tiny .copy-thread-id {
        display: inline-flex;
        max-width: 84px;
      }
      .running-card.size-tiny.fixed-tiny .running-card-footer {
        padding-top: 0;
        border-top: none;
      }
      .running-card.size-tiny.fixed-tiny .running-card-control {
        width: 100%;
      }
      .running-card.size-tiny.fixed-tiny .control-label,
      .running-card.size-tiny.fixed-tiny .tool-id {
        display: none;
      }
      .running-card.size-tiny.fixed-tiny .size-switch {
        display: inline-flex;
        width: 100%;
        justify-content: space-between;
        gap: 4px;
        padding: 3px;
      }
      .running-card.size-tiny.fixed-tiny .board-card-size-actions {
        width: auto;
        max-width: 100%;
        margin-top: -7px;
      }
      .running-card.size-tiny.fixed-tiny .board-card-size-actions .size-switch {
        flex: 0 1 auto;
      }
      .running-card.size-tiny.fixed-tiny .tool-btn.board-codex-shortcut {
        flex: 0 0 auto;
        padding: 0 8px;
      }
      .running-card.size-tiny.fixed-tiny .running-action-rail {
        width: 100%;
        justify-content: stretch;
        gap: 4px;
      }
      .running-card.size-tiny.fixed-tiny .tool-btn {
        min-width: 0;
        flex: 1 1 0;
        justify-content: center;
      }
      .running-card.size-tiny.fixed-tiny .tool-btn span {
        display: inline;
      }
      .tiny-composer {
        display: grid;
        gap: 6px;
        margin-top: 6px;
      }
      .tiny-composer-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        gap: 6px;
        align-items: center;
      }
      .tiny-composer .loop-input {
        min-height: 28px;
        font-size: 11px;
      }
      .tool-btn.send {
        color: #d8e5ff;
        border-color: rgba(124, 157, 255, 0.22);
        background: rgba(124, 157, 255, 0.16);
      }
      .running-card.size-tiny .running-card-title {
        font-size: 13px;
        line-height: 1.34;
      }
      .running-card.size-tiny .running-card-subtitle,
      .running-card.size-tiny .running-card-note,
      .running-card.size-tiny .preview {
        font-size: 11px;
      }
      .running-card.size-tiny .tool-btn {
        min-height: 28px;
        padding: 0 10px;
        font-size: 11px;
      }
      .running-card.size-tiny .tool-btn span {
        display: none;
      }
      .running-card.size-tiny .tool-btn.board-codex-shortcut span {
        display: inline;
      }
      .running-card.size-tiny .control-label {
        font-size: 9px;
      }
      .running-card.size-tiny.fixed-tiny .running-card-badges {
        gap: 4px;
      }
      .running-card.size-tiny.fixed-tiny .badge {
        min-height: 19px;
        padding: 0 8px;
        font-size: 10px;
      }
      .running-card.size-tiny.fixed-tiny .running-card-title {
        font-size: 13px;
        line-height: 1.35;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .running-card.size-tiny.fixed-tiny .board-lifecycle-reason {
        font-size: 10px;
        line-height: 1.35;
      }
      .running-card.size-tiny.fixed-tiny .tool-btn {
        min-height: 24px;
        padding: 0 7px;
        border-radius: 10px;
        font-size: 10px;
      }
      .running-card.size-tiny.fixed-tiny .tool-btn .tool-icon {
        width: 11px;
        height: 11px;
      }
      .running-card.size-tiny.fixed-tiny .size-chip {
        min-width: 0;
        flex: 1 1 0;
        min-height: 24px;
        padding: 0 4px;
        border-radius: 9px;
        font-size: 10px;
      }
      .running-card.compact-card .size-switch,
      .running-card.compact-card .control-label,
      .running-card.compact-card .tool-id {
        display: none;
      }
      .resize-handle {
        position: absolute;
        width: 14px;
        height: 14px;
        border-radius: 999px;
        border: 1px solid rgba(141, 216, 255, 0.32);
        background: rgba(9, 13, 20, 0.88);
        box-shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 8px 18px rgba(0,0,0,0.28);
        opacity: 0;
        transition: opacity 120ms ease, transform 120ms ease;
        z-index: 4;
      }
      .resize-handle.nw { top: 6px; left: 6px; cursor: nwse-resize; }
      .resize-handle.ne { top: 6px; right: 6px; cursor: nesw-resize; }
      .resize-handle.sw { bottom: 6px; left: 6px; cursor: nesw-resize; }
      .resize-handle.se { bottom: 6px; right: 6px; cursor: nwse-resize; }
      .resize-handle.e,
      .resize-handle.w {
        top: 50%;
        transform: translateY(-50%);
        width: 12px;
        height: 34px;
        border-radius: 999px;
        cursor: ew-resize;
      }
      .resize-handle.e { right: 4px; }
      .resize-handle.w { left: 4px; }
      .resize-handle.n,
      .resize-handle.s {
        left: 50%;
        transform: translateX(-50%);
        width: 34px;
        height: 12px;
        border-radius: 999px;
        cursor: ns-resize;
      }
      .resize-handle.n { top: 4px; }
      .resize-handle.s { bottom: 4px; }
      .running-card:hover .resize-handle,
      .running-card.resizing .resize-handle {
        opacity: 1;
      }
      .running-card.size-tiny.fixed-tiny .resize-handle {
        width: 12px;
        height: 12px;
      }
      .running-card.size-s {
        grid-column: span 4;
        min-height: 300px;
        height: 300px;
      }
      .running-card.size-s .running-card-title {
        font-size: 17px;
        line-height: 1.25;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        white-space: normal;
        overflow: hidden;
      }
      .running-card.size-s .running-card-subtitle {
        font-size: 12px;
      }
      .running-card.size-s .preview {
        font-size: 12px;
        line-height: 1.45;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .running-card.size-s .progress-head,
      .running-card.size-s .progress-track,
      .running-card.size-s .running-card-note,
      .running-card.size-s .phase-panel {
        display: none;
      }
      .running-card.size-m { grid-column: span 4; min-height: 300px; height: 300px; }
      .running-card.size-m .running-card-title {
        font-size: 20px;
        line-height: 1.2;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        white-space: normal;
        overflow: hidden;
      }
      .running-card.size-m .preview {
        font-size: 13px;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 4;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .running-card.size-l {
        grid-column: 1 / -1;
        min-height: 320px;
        height: 320px;
        grid-template-columns: minmax(0, 1.15fr) minmax(260px, 0.85fr);
        grid-template-rows: auto 1fr auto;
        gap: 14px 18px;
      }
      .running-card.size-l .running-card-top,
      .running-card.size-l .running-card-footer {
        grid-column: 1 / -1;
      }
      .running-card.size-l .running-card-body {
        display: grid;
        grid-template-columns: minmax(0, 1.1fr) minmax(260px, 0.9fr);
        gap: 14px 18px;
        align-content: start;
      }
      .running-card.size-l .running-card-copy {
        display: grid;
        gap: 10px;
        min-width: 0;
      }
      .running-card.size-l .running-card-side {
        display: grid;
        gap: 10px;
        align-content: start;
        min-width: 0;
      }
      .running-card.size-l .running-card-title {
        font-size: 23px;
        line-height: 1.18;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        white-space: normal;
        overflow: hidden;
      }
      .running-card.size-l .running-card-subtitle {
        font-size: 13px;
      }
      .running-card.size-l .preview {
        font-size: 14px;
        line-height: 1.56;
        display: -webkit-box;
        -webkit-line-clamp: 5;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .running-card.size-l .phase-panel,
      .running-card.size-l .progress-head,
      .running-card.size-l .progress-track,
      .running-card.size-l .running-card-note {
        margin-top: 0;
      }
      .running-card.size-l .phase-panel,
      .running-card.size-l .progress-track,
      .running-card.size-l .running-card-note {
        width: 100%;
        box-sizing: border-box;
      }
      .phase-panel {
        --phase-border: rgba(255,255,255,0.06);
        --phase-bg: rgba(255,255,255,0.025);
        --phase-glow: rgba(255,255,255,0.04);
        display: grid;
        gap: 6px;
        margin-top: 2px;
        padding: 10px;
        border-radius: 14px;
        border: 1px solid var(--phase-border);
        background:
          linear-gradient(180deg, var(--phase-bg), rgba(255,255,255,0.01));
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02), 0 0 0 1px rgba(0,0,0,0.04);
      }
      .phase-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .phase-title {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .phase-art {
        width: 22px;
        height: 22px;
        object-fit: contain;
        flex: 0 0 auto;
        filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.22));
      }
      .phase-label {
        font-size: 11px;
        font-weight: 700;
        color: var(--text-strong);
      }
      .phase-copy {
        color: var(--muted);
        font-size: 11px;
        line-height: 1.45;
      }
      .running-card.phase-planning .phase-panel {
        --phase-border: rgba(126, 231, 255, 0.14);
        --phase-bg: rgba(36, 89, 122, 0.16);
      }
      .running-card.phase-tooling .phase-panel {
        --phase-border: rgba(255, 214, 107, 0.14);
        --phase-bg: rgba(120, 76, 9, 0.14);
      }
      .running-card.phase-editing .phase-panel {
        --phase-border: rgba(84, 242, 176, 0.14);
        --phase-bg: rgba(18, 73, 53, 0.15);
      }
      .running-card.phase-testing .phase-panel {
`;
