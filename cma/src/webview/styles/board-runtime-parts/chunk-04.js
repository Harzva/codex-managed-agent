module.exports = `        --phase-border: rgba(196, 163, 255, 0.16);
        --phase-bg: rgba(66, 43, 109, 0.16);
      }
      .running-card.phase-waiting .phase-panel {
        --phase-border: rgba(173, 181, 197, 0.14);
        --phase-bg: rgba(58, 66, 80, 0.14);
      }
      .running-card.phase-planning {
        box-shadow: 0 18px 40px rgba(0,0,0,0.26), 0 0 0 1px rgba(126, 231, 255, 0.04);
      }
      .running-card.phase-tooling {
        box-shadow: 0 18px 40px rgba(0,0,0,0.26), 0 0 0 1px rgba(255, 214, 107, 0.04);
      }
      .running-card.phase-editing {
        box-shadow: 0 18px 40px rgba(0,0,0,0.26), 0 0 0 1px rgba(84, 242, 176, 0.04);
      }
      .running-card.phase-testing {
        box-shadow: 0 18px 40px rgba(0,0,0,0.26), 0 0 0 1px rgba(196, 163, 255, 0.04);
      }
      .running-card.phase-waiting {
        box-shadow: 0 18px 40px rgba(0,0,0,0.26), 0 0 0 1px rgba(173, 181, 197, 0.04);
      }
      .phase-panel.phase-planning {
        --phase-border: rgba(126, 231, 255, 0.14);
        --phase-bg: rgba(36, 89, 122, 0.16);
      }
      .phase-panel.phase-tooling {
        --phase-border: rgba(255, 214, 107, 0.14);
        --phase-bg: rgba(120, 76, 9, 0.14);
      }
      .phase-panel.phase-editing {
        --phase-border: rgba(84, 242, 176, 0.14);
        --phase-bg: rgba(18, 73, 53, 0.15);
      }
      .phase-panel.phase-testing {
        --phase-border: rgba(196, 163, 255, 0.16);
        --phase-bg: rgba(66, 43, 109, 0.16);
      }
      .phase-panel.phase-waiting {
        --phase-border: rgba(173, 181, 197, 0.14);
        --phase-bg: rgba(58, 66, 80, 0.14);
      }
      @keyframes focusFloat {
        0% { transform: translateY(0); }
        50% { transform: translateY(-2px); }
        100% { transform: translateY(0); }
      }
      .loop-panel {
        display: grid;
        gap: 8px;
        margin-top: 8px;
        padding: 10px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.07);
        background: rgba(255,255,255,0.028);
      }
      .loop-status-card {
        display: grid;
        gap: 8px;
        margin-top: 8px;
        padding: 10px 12px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.07);
        background: rgba(255,255,255,0.026);
      }
      .loop-status-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .loop-status-title {
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted-soft);
      }
      .loop-status-badge {
        display: inline-flex;
        align-items: center;
        min-height: 22px;
        padding: 0 9px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.04);
        font-size: 11px;
        font-weight: 700;
      }
      .loop-status-badge.queued {
        border-color: rgba(84, 242, 176, 0.2);
        background: rgba(18, 73, 53, 0.2);
        color: #b8ffde;
      }
      .loop-status-badge.armed {
        border-color: rgba(124, 157, 255, 0.18);
        background: rgba(38, 58, 98, 0.18);
        color: #cfe0ff;
      }
      .loop-status-badge.failed {
        border-color: rgba(255, 124, 136, 0.2);
        background: rgba(122, 24, 40, 0.18);
        color: #ffd9dd;
      }
      .loop-status-badge.running {
        border-color: rgba(84, 242, 176, 0.2);
        background: rgba(16, 58, 45, 0.24);
        color: #b8ffde;
      }
      .loop-status-badge.success {
        border-color: rgba(126, 231, 255, 0.2);
        background: rgba(26, 73, 98, 0.22);
        color: #d7f8ff;
      }
      .loop-status-badge.managed {
        border-color: rgba(255, 214, 107, 0.22);
        background: rgba(120, 76, 9, 0.2);
        color: #ffe9ad;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .loop-status-badge {
        color: var(--muted);
        border-color: var(--line);
        background: color-mix(in srgb, var(--panel-soft) 82%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .loop-status-badge.queued,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .loop-status-badge.running {
        color: #086148;
        border-color: rgba(8, 122, 90, 0.2);
        background: rgba(8, 122, 90, 0.09);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .loop-status-badge.armed,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .loop-status-badge.success {
        color: #244f9d;
        border-color: rgba(49, 95, 220, 0.18);
        background: rgba(49, 95, 220, 0.08);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .loop-status-badge.failed {
        color: #9f2638;
        border-color: rgba(180, 35, 58, 0.18);
        background: rgba(180, 35, 58, 0.08);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .loop-status-badge.managed {
        color: #7a5200;
        border-color: rgba(154, 100, 0, 0.22);
        background: rgba(255, 214, 107, 0.18);
      }
      .thread-row .loop-status-badge {
        min-height: 20px;
        padding: 0 7px;
        font-size: 10px;
        white-space: nowrap;
      }
      .loop-status-grid {
        display: grid;
        gap: 6px;
      }
      .loop-status-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .loop-status-actions .chip {
        min-height: 28px;
      }
      .loop-status-row {
        display: flex;
        gap: 8px;
        align-items: flex-start;
      }
      .loop-status-label {
        width: 108px;
        flex: 0 0 108px;
        color: var(--muted);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .loop-status-value {
        min-width: 0;
        color: var(--text);
        font-size: 12px;
        line-height: 1.45;
      }
      .loop-status-value.mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 11px;
        word-break: break-all;
      }
      .loop-status-result {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .loop-result-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: rgba(124, 157, 255, 0.72);
        box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 0 14px rgba(124, 157, 255, 0.18);
        flex: 0 0 auto;
      }
      .loop-result-dot.running,
      .loop-result-dot.queued {
        background: rgba(84, 242, 176, 0.9);
        box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 0 14px rgba(84, 242, 176, 0.2);
      }
      .loop-result-dot.success {
        background: rgba(126, 231, 255, 0.92);
        box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 0 14px rgba(126, 231, 255, 0.22);
      }
      .loop-result-dot.failed {
        background: rgba(255, 124, 136, 0.92);
        box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 0 14px rgba(255, 124, 136, 0.22);
      }
      .loop-tail {
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.06);
        background: rgba(255,255,255,0.02);
        color: var(--muted);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 11px;
        line-height: 1.45;
        word-break: break-word;
      }
      .loop-presets {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .loop-mini-inputs {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 90px auto;
        gap: 8px;
        align-items: center;
      }
      .loop-input {
        width: 100%;
        min-height: 30px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.03);
        color: var(--text);
        padding: 0 10px;
        outline: none;
      }
      .running-card::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background:
          radial-gradient(circle at top right, var(--card-active-glow), transparent 42%),
          radial-gradient(circle at bottom left, rgba(255,255,255,0.022), transparent 32%);
        opacity: 0.88;
        pointer-events: none;
      }
      .running-card-topbar {
        position: absolute;
        top: 0;
        left: 14px;
        right: 14px;
        height: 3px;
        border-radius: 0 0 999px 999px;
        background: var(--card-band);
        opacity: 0.72;
        box-shadow: 0 0 18px var(--card-band-glow);
        transition: opacity 160ms ease, transform 160ms ease, box-shadow 160ms ease;
        z-index: 1;
        pointer-events: none;
      }
      .running-card.drop-before::before,
      .running-card.drop-after::before {
        content: "";
        position: absolute;
        top: 16px;
        bottom: 16px;
        width: 3px;
        border-radius: 999px;
        background: linear-gradient(180deg, rgba(98,255,166,0.08), rgba(98,255,166,0.95), rgba(98,255,166,0.08));
        box-shadow: 0 0 0 1px rgba(98,255,166,0.08), 0 0 18px rgba(98,255,166,0.22);
        z-index: 2;
      }
      .running-card.drop-before::before {
        left: 8px;
      }
      .running-card.drop-after::before {
        right: 8px;
      }
      .drop-slot {
        position: absolute;
        top: 50%;
        width: var(--drop-preview-width, 118px);
        height: var(--drop-preview-height, 132px);
        border-radius: 20px;
        border: 2px solid rgba(98, 255, 166, 0.9);
        background: linear-gradient(180deg, rgba(98,255,166,0.14), rgba(98,255,166,0.05));
        box-shadow:
          inset 0 0 0 1px rgba(255,255,255,0.05),
          0 0 0 1px rgba(98,255,166,0.18),
          0 0 24px rgba(98,255,166,0.16);
        opacity: 0;
        pointer-events: none;
        transition: opacity 120ms ease, transform 120ms ease, box-shadow 120ms ease;
        z-index: 1;
      }
      .drop-slot.left {
        left: calc(var(--drop-preview-width, 118px) * -0.28);
        transform: translate(-8%, -50%);
      }
      .drop-slot.right {
        right: calc(var(--drop-preview-width, 118px) * -0.28);
        transform: translate(8%, -50%);
      }
      .running-card.drop-before .drop-slot.left,
      .running-card.drop-after .drop-slot.right {
        opacity: 1;
        transform: translate(0, -50%);
      }
      .running-card.drop-target {
        border-color: rgba(98,255,166,0.34);
        box-shadow:
          inset 0 0 0 1px rgba(98,255,166,0.12),
          0 18px 42px rgba(0,0,0,0.26),
          0 0 32px rgba(98,255,166,0.08);
      }
      .running-card-bottom-line {
        position: absolute;
        inset: auto 14px 0 14px;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
        pointer-events: none;
      }
      .running-card:hover {
        transform: translateY(-3px) scale(1.004);
        border-color: var(--card-accent-border);
        background:
          radial-gradient(circle at top right, rgba(124, 157, 255, 0.18), transparent 34%),
          linear-gradient(180deg, rgba(255,255,255,0.065), rgba(255,255,255,0.024));
        box-shadow:
          0 28px 54px rgba(0,0,0,0.38),
          0 0 0 1px rgba(255,255,255,0.02),
          0 0 34px var(--card-active-glow);
      }
      .running-card:hover .running-card-topbar {
        opacity: 1;
        transform: scaleX(1.02);
        box-shadow: 0 0 24px rgba(255,255,255,0.08), 0 0 24px var(--card-band-glow);
      }
      .running-card.dragging {
        opacity: 1;
        transform: none;
        border-style: dashed;
        border-color: rgba(141, 216, 255, 0.24);
        background: transparent;
        box-shadow: inset 0 0 0 1px rgba(141, 216, 255, 0.08);
        cursor: grabbing;
      }
      .running-card.dragging > * {
        opacity: 0;
      }
      .running-card.dragging::after {
        opacity: 0;
      }
      .running-card.drag-over {
        border-color: rgba(141, 216, 255, 0.32);
        box-shadow: inset 0 0 0 1px rgba(141, 216, 255, 0.16);
      }
      .running-card.resizing {
        transition: none;
        user-select: none;
      }
      .running-card.resizing::after,
      .running-card.resizing .running-card-topbar {
        opacity: 0.44;
        box-shadow: none;
      }
      .running-card.board-attached {
        background:
          linear-gradient(180deg, rgba(255,255,255,0.052), rgba(255,255,255,0.02));
      }
      .running-card.pinned-card {
        border-color: rgba(255, 212, 121, 0.26);
        background:
          radial-gradient(circle at top right, rgba(255, 212, 121, 0.14), transparent 34%),
          linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.018));
      }
      .running-card.running-live {
        --card-band: linear-gradient(90deg, rgba(84, 242, 176, 0.72), rgba(121, 237, 210, 0.58), rgba(141, 216, 255, 0.46));
        --card-band-glow: rgba(84, 242, 176, 0.18);
        --card-accent-border: rgba(95, 219, 175, 0.22);
        --card-active-glow: rgba(84, 242, 176, 0.08);
      }
      .running-card.needs-attention-card {
        --card-band: linear-gradient(90deg, rgba(255, 167, 106, 0.92), rgba(255, 184, 156, 0.82), rgba(255, 221, 177, 0.72));
        --card-band-glow: rgba(255, 143, 106, 0.18);
        --card-accent-border: rgba(255, 167, 106, 0.3);
        --card-active-glow: rgba(255, 167, 106, 0.12);
        border-color: rgba(255, 167, 106, 0.3);
        box-shadow:
          inset 0 0 0 1px rgba(255, 167, 106, 0.16),
          0 20px 42px rgba(0,0,0,0.34),
          0 0 20px rgba(255, 167, 106, 0.09);
      }
      .running-card.needs-attention-card .running-card-topbar {
        box-shadow: 0 0 18px rgba(255, 167, 106, 0.16);
      }
      .running-card.board-attached {
        --card-band: linear-gradient(90deg, rgba(141, 216, 255, 0.54), rgba(124, 157, 255, 0.34));
        --card-band-glow: rgba(124, 157, 255, 0.1);
        --card-accent-border: rgba(124, 157, 255, 0.18);
        --card-active-glow: rgba(124, 157, 255, 0.05);
      }
      .running-card.pinned-card .running-card-topbar {
        box-shadow: 0 0 20px rgba(255, 212, 121, 0.18);
      }
      .running-card.codex-card-focused {
        --card-band: linear-gradient(90deg, rgba(196, 163, 255, 0.92), rgba(222, 202, 255, 0.8), rgba(141, 216, 255, 0.68));
        --card-band-glow: rgba(196, 163, 255, 0.2);
        --card-accent-border: rgba(196, 163, 255, 0.28);
        --card-active-glow: rgba(196, 163, 255, 0.1);
        border-color: rgba(196, 163, 255, 0.3);
        box-shadow:
          inset 0 0 0 1px rgba(196, 163, 255, 0.14),
          0 24px 44px rgba(0,0,0,0.34),
          0 0 36px rgba(196, 163, 255, 0.1);
      }
      .running-card.codex-card-open {
        --card-band: linear-gradient(90deg, rgba(126, 231, 255, 0.78), rgba(141, 216, 255, 0.66), rgba(124, 157, 255, 0.58));
        --card-band-glow: rgba(126, 231, 255, 0.16);
        --card-accent-border: rgba(126, 231, 255, 0.22);
        --card-active-glow: rgba(126, 231, 255, 0.08);
        border-color: rgba(126, 231, 255, 0.22);
        box-shadow:
          inset 0 0 0 1px rgba(126, 231, 255, 0.1),
          0 20px 38px rgba(0,0,0,0.3),
          0 0 28px rgba(126, 231, 255, 0.08);
      }
      .running-card.project-card {
        --card-band: linear-gradient(90deg, color-mix(in srgb, var(--project-accent) 56%, transparent), rgba(141, 216, 255, 0.36));
        --card-band-glow: color-mix(in srgb, var(--project-accent) 14%, transparent);
        --card-accent-border: color-mix(in srgb, var(--project-accent) 22%, rgba(255,255,255,0.08));
        --card-active-glow: color-mix(in srgb, var(--project-accent) 6%, transparent);
        border-color: color-mix(in srgb, var(--project-accent) 16%, rgba(255,255,255,0.07));
      }
      .running-card.codex-card-focused .running-card-topbar {
        animation: focusedPulse 2.6s ease-in-out infinite;
      }
      .running-card.codex-card-focused .phase-art,
      .running-card.intervention-card .phase-art {
        animation: focusFloat 2.8s ease-in-out infinite;
      }
      .running-card.intervention-card {
        --card-band: linear-gradient(90deg, rgba(255, 143, 159, 0.92), rgba(255, 184, 156, 0.82), rgba(255, 221, 177, 0.72));
        --card-band-glow: rgba(255, 143, 159, 0.2);
        --card-accent-border: rgba(255, 143, 159, 0.28);
        --card-active-glow: rgba(255, 143, 159, 0.11);
        animation: interventionCardPulse 1.9s ease-in-out infinite;
        box-shadow:
          inset 0 0 0 1px rgba(255, 143, 159, 0.14),
          0 22px 42px rgba(0,0,0,0.34),
          0 0 28px rgba(255, 143, 159, 0.08);
      }
      .intervention-dock .running-card.intervention-card {
        animation: none;
        box-shadow:
          inset 0 0 0 1px rgba(255, 143, 159, 0.12),
          0 12px 22px rgba(0,0,0,0.24);
      }
      .intervention-dock .running-card.intervention-card .phase-art {
        animation: none;
      }
      @keyframes interventionCardPulse {
        0% { transform: translateY(0) scale(1); box-shadow: inset 0 0 0 1px rgba(255, 143, 159, 0.12), 0 18px 36px rgba(0,0,0,0.3), 0 0 20px rgba(255, 143, 159, 0.04); }
        50% { transform: translateY(-1px) scale(1.006); box-shadow: inset 0 0 0 1px rgba(255, 143, 159, 0.18), 0 24px 44px rgba(0,0,0,0.34), 0 0 36px rgba(255, 143, 159, 0.12); }
        100% { transform: translateY(0) scale(1); box-shadow: inset 0 0 0 1px rgba(255, 143, 159, 0.12), 0 18px 36px rgba(0,0,0,0.3), 0 0 20px rgba(255, 143, 159, 0.04); }
      }
      @keyframes focusedPulse {
        0% { opacity: 0.7; transform: scaleX(1); }
        50% { opacity: 1; transform: scaleX(1.04); }
`;
