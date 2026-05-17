function getBootBoardBaseStyles() {
  return `        max-width: 620px;
        margin-top: 10px;
      }
      .boot-percent {
        min-width: 76px;
        text-align: right;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 24px;
        color: #caffea;
        text-shadow: 0 0 24px rgba(84, 242, 176, 0.2);
      }
      .boot-visual {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        flex: 0 0 auto;
      }
      .boot-status-icon {
        width: 72px;
        height: 72px;
        border-radius: 22px;
        border: 1px solid rgba(126, 231, 255, 0.13);
        background:
          radial-gradient(circle at 50% 50%, rgba(84, 242, 176, 0.12), transparent 42%),
          rgba(255,255,255,0.026);
        display: grid;
        place-items: center;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.035), 0 14px 32px rgba(0,0,0,0.18);
      }
      .boot-status-svg {
        width: 58px;
        height: 58px;
        overflow: visible;
      }
      .boot-status-svg * {
        vector-effect: non-scaling-stroke;
      }
      .boot-icon-track,
      .boot-icon-ring,
      .boot-icon-arc,
      .boot-icon-link,
      .boot-core-halo {
        fill: none;
      }
      .boot-icon-track {
        stroke: rgba(255,255,255,0.12);
        stroke-width: 1.5;
      }
      .boot-icon-ring {
        stroke: rgba(126, 231, 255, 0.62);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-dasharray: 24 76;
        transform-origin: 40px 40px;
        animation: bootIconRotate 2.8s linear infinite;
      }
      .boot-icon-arc {
        stroke: rgba(84, 242, 176, 0.85);
        stroke-width: 3;
        stroke-linecap: round;
        stroke-dasharray: 32 68;
        stroke-dashoffset: 0;
        transform-origin: 40px 40px;
        animation: bootArcFlow 1.55s ease-in-out infinite;
      }
      .boot-icon-link {
        stroke: rgba(156, 201, 255, 0.24);
        stroke-width: 1.3;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .boot-icon-orbit {
        transform-origin: 40px 40px;
        animation: bootOrbitSpin 4.8s linear infinite;
      }
      .boot-satellite {
        fill: #ffd66b;
        opacity: 0.9;
      }
      .boot-satellite.faint {
        fill: #7ee7ff;
        opacity: 0.56;
      }
      .boot-core-halo {
        stroke: rgba(84, 242, 176, 0.3);
        stroke-width: 1.5;
        transform-origin: 40px 40px;
        animation: bootCorePulse 1.8s ease-in-out infinite;
      }
      .boot-core {
        fill: #54f2b0;
        transform-origin: 40px 40px;
        animation: bootCoreGlow 1.8s ease-in-out infinite;
      }
      .boot-node {
        fill: rgba(173, 181, 197, 0.45);
        stroke: rgba(255,255,255,0.14);
        stroke-width: 1.2;
        transition: fill 260ms ease, opacity 260ms ease, stroke 260ms ease;
      }
      .running-animated-icon {
        display: inline-grid;
        place-items: center;
        flex: 0 0 auto;
        color: var(--green);
      }
      .running-animated-icon svg {
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      .running-animated-icon * {
        vector-effect: non-scaling-stroke;
      }
      .running-animated-icon .running-icon-track,
      .running-animated-icon .running-icon-ring,
      .running-animated-icon .running-icon-arc,
      .running-animated-icon .running-icon-link,
      .running-animated-icon .running-icon-halo {
        fill: none;
      }
      .running-animated-icon .running-icon-track {
        stroke: rgba(255,255,255,0.13);
        stroke-width: 1.5;
      }
      .running-animated-icon .running-icon-ring {
        stroke: rgba(126, 231, 255, 0.62);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-dasharray: 26 74;
        transform-origin: 40px 40px;
        animation: runningIconRotate 2.4s linear infinite;
      }
      .running-animated-icon .running-icon-arc {
        stroke: rgba(84, 242, 176, 0.9);
        stroke-width: 3;
        stroke-linecap: round;
        stroke-dasharray: 34 66;
        transform-origin: 40px 40px;
        animation: runningArcFlow 1.35s ease-in-out infinite;
      }
      .running-animated-icon .running-icon-link {
        stroke: rgba(202, 255, 234, 0.28);
        stroke-width: 1.3;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .running-animated-icon .running-icon-halo {
        stroke: rgba(84, 242, 176, 0.3);
        stroke-width: 1.4;
        transform-origin: 40px 40px;
        animation: runningCorePulse 1.55s ease-in-out infinite;
      }
      .running-animated-icon .running-icon-core {
        fill: #54f2b0;
        transform-origin: 40px 40px;
        animation: runningCoreGlow 1.55s ease-in-out infinite;
      }
      .running-animated-icon .running-icon-node {
        fill: #54f2b0;
        stroke: rgba(202, 255, 234, 0.72);
        stroke-width: 1.1;
        animation: runningNodeBlink 1.2s ease-in-out infinite;
      }
      .running-animated-icon .running-icon-node.node-b {
        animation-delay: 160ms;
      }
      .running-animated-icon .running-icon-node.node-c {
        animation-delay: 320ms;
      }
      .running-animated-icon .running-icon-satellite {
        fill: #ffd66b;
        opacity: 0.9;
        transform-origin: 40px 40px;
        animation: runningSatelliteOrbit 3.8s linear infinite;
      }
      .running-animated-icon.variant-mini {
        filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.26));
      }
      .running-animated-icon.variant-timeline {
        filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.22));
      }
      .running-animated-icon.variant-phase {
        filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.22));
      }
      .boot-loader[data-boot-stage="shell"] .node-shell,
      .boot-loader[data-boot-stage="bridge"] .node-shell,
      .boot-loader[data-boot-stage="bridge"] .node-bridge,
      .boot-loader[data-boot-stage="state"] .node-shell,
      .boot-loader[data-boot-stage="state"] .node-bridge,
      .boot-loader[data-boot-stage="state"] .node-state,
      .boot-loader[data-boot-stage="hydrate"] .node-shell,
      .boot-loader[data-boot-stage="hydrate"] .node-bridge,
      .boot-loader[data-boot-stage="hydrate"] .node-state,
      .boot-loader[data-boot-stage="hydrate"] .node-hydrate {
        fill: #54f2b0;
        stroke: rgba(202, 255, 234, 0.75);
      }
      .boot-loader[data-boot-stage="shell"] .node-shell,
      .boot-loader[data-boot-stage="bridge"] .node-bridge,
      .boot-loader[data-boot-stage="state"] .node-state,
      .boot-loader[data-boot-stage="hydrate"] .node-hydrate {
        animation: bootNodePulse 1.2s ease-in-out infinite;
      }
      .boot-progress {
        height: 12px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(0, 0, 0, 0.28);
        overflow: hidden;
        position: relative;
        z-index: 1;
      }
      .boot-progress-bar {
        height: 100%;
        width: 12%;
        min-width: 24px;
        border-radius: inherit;
        background: linear-gradient(90deg, #7ee7ff, #54f2b0, #ffd66b);
        box-shadow: 0 0 22px rgba(84, 242, 176, 0.22);
        transition: width 420ms ease;
        position: relative;
      }
      .boot-progress-bar::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.42), transparent);
        animation: bootBarSweep 1.4s ease-in-out infinite;
      }
      .boot-stage-row {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
        position: relative;
        z-index: 1;
      }
      .boot-stage {
        min-height: 44px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.07);
        background: rgba(255,255,255,0.026);
        padding: 9px 10px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--muted);
        font-size: 12px;
      }
      .boot-stage::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: rgba(173, 181, 197, 0.5);
        box-shadow: 0 0 0 0 rgba(126, 231, 255, 0);
        flex: 0 0 auto;
      }
      .boot-stage.active {
        color: var(--text);
        border-color: rgba(126, 231, 255, 0.22);
        background: rgba(37, 83, 120, 0.14);
      }
      .boot-stage.active::before {
        background: #7ee7ff;
        animation: bootDotPulse 1.2s ease-in-out infinite;
      }
      .boot-stage.done {
        color: #caffea;
        border-color: rgba(84, 242, 176, 0.18);
        background: rgba(18, 73, 53, 0.13);
      }
      .boot-stage.done::before {
        background: #54f2b0;
      }
      .boot-loader-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
        position: relative;
        z-index: 1;
      }
      .boot-loader-note {
        color: var(--muted);
        font-size: 12px;
      }
      .boot-loader.failed {
        border-color: rgba(255, 124, 136, 0.22);
        background:
          radial-gradient(circle at 82% 12%, rgba(255, 124, 136, 0.12), transparent 32%),
          linear-gradient(180deg, rgba(35, 13, 22, 0.94), rgba(7, 10, 16, 0.96));
      }
      .boot-loader.failed .boot-progress-bar {
        background: linear-gradient(90deg, #ff7c88, #ffd66b);
      }
      .boot-loader.failed .boot-status-icon {
        border-color: rgba(255, 124, 136, 0.2);
        background:
          radial-gradient(circle at 50% 50%, rgba(255, 124, 136, 0.12), transparent 42%),
          rgba(255,255,255,0.024);
      }
      .boot-loader.failed .boot-icon-ring,
      .boot-loader.failed .boot-icon-arc {
        stroke: rgba(255, 124, 136, 0.82);
        animation-duration: 4.2s;
      }
      .boot-loader.failed .boot-core {
        fill: #ffd66b;
      }
      .boot-loader.failed .boot-core-halo {
        stroke: rgba(255, 214, 107, 0.28);
      }
      .boot-loader.failed .boot-node {
        fill: rgba(255, 214, 107, 0.78);
        stroke: rgba(255, 214, 107, 0.55);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .service-banner {
        color: #354258;
        border-color: color-mix(in srgb, var(--gold) 22%, var(--line));
        background: linear-gradient(180deg, color-mix(in srgb, var(--gold) 5%, #ffffff), #ffffff);
        box-shadow: 0 14px 30px rgba(72, 88, 112, 0.08);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .service-banner.hydrating {
        color: #315064;
        border-color: color-mix(in srgb, var(--blue) 18%, var(--line));
        background: linear-gradient(180deg, color-mix(in srgb, var(--blue) 4%, #ffffff), #ffffff);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-loader {
        color: #151c2b;
        border-color: color-mix(in srgb, var(--blue) 18%, var(--line));
        background:
          radial-gradient(circle at 82% 12%, color-mix(in srgb, var(--green) 8%, transparent), transparent 32%),
          radial-gradient(circle at 8% 0%, color-mix(in srgb, var(--blue) 10%, transparent), transparent 34%),
          linear-gradient(180deg, #ffffff, color-mix(in srgb, var(--bg) 54%, #ffffff));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.78), 0 16px 34px rgba(52, 72, 98, 0.09);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-loader.failed {
        border-color: color-mix(in srgb, var(--gold) 28%, var(--line));
        background:
          radial-gradient(circle at 82% 12%, color-mix(in srgb, var(--red) 7%, transparent), transparent 32%),
          radial-gradient(circle at 8% 0%, color-mix(in srgb, var(--gold) 12%, transparent), transparent 34%),
          linear-gradient(180deg, #ffffff, color-mix(in srgb, var(--gold) 4%, #ffffff));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-loader::before {
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-kicker {
        color: #315ba1;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-copy,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-loader-note {
        color: #667085;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-percent {
        color: #1f7a5f;
        text-shadow: none;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-status-icon {
        border-color: color-mix(in srgb, var(--blue) 16%, var(--line));
        background: #ffffff;
        box-shadow: 0 10px 24px rgba(65, 86, 112, 0.12);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-progress {
        border-color: color-mix(in srgb, var(--blue) 14%, var(--line));
        background: color-mix(in srgb, var(--blue) 6%, #ffffff);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-loader.failed .boot-progress-bar {
        background: linear-gradient(90deg, #ff7c88, #ffd66b);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-stage {
        color: #667085;
        border-color: color-mix(in srgb, var(--blue) 10%, var(--line));
        background: rgba(255,255,255,0.72);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-stage.active {
        color: #315064;
        border-color: color-mix(in srgb, var(--blue) 24%, var(--line));
        background: color-mix(in srgb, var(--blue) 7%, #ffffff);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-stage.done {
        color: #1f7a5f;
        border-color: color-mix(in srgb, var(--green) 24%, var(--line));
        background: color-mix(in srgb, var(--green) 7%, #ffffff);
      }
      @keyframes bootShimmer {
        0% { transform: translateX(-100%); opacity: 0; }
        35% { opacity: 1; }
        70%, 100% { transform: translateX(100%); opacity: 0; }
      }
      @keyframes bootIconRotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes runningIconRotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes runningSatelliteOrbit {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(-360deg); }
      }
      @keyframes runningArcFlow {
        0%, 100% {
          stroke-dashoffset: 0;
          transform: rotate(-12deg);
        }
        50% {
          stroke-dashoffset: -48;
          transform: rotate(26deg);
        }
      }
      @keyframes runningCorePulse {
        0%, 100% { opacity: 0.42; transform: scale(0.88); }
        50% { opacity: 0.95; transform: scale(1.1); }
      }
      @keyframes runningCoreGlow {
        0%, 100% { opacity: 0.76; transform: scale(0.92); }
        50% { opacity: 1; transform: scale(1.08); }
      }
      @keyframes runningNodeBlink {
        0%, 100% { opacity: 0.55; }
        50% { opacity: 1; }
      }
      @keyframes bootOrbitSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(-360deg); }
      }
      @keyframes bootArcFlow {
        0%, 100% {
          stroke-dashoffset: 0;
          transform: rotate(-16deg);
        }
        50% {
          stroke-dashoffset: -46;
          transform: rotate(22deg);
        }
      }
      @keyframes bootCorePulse {
        0%, 100% { opacity: 0.44; transform: scale(0.86); }
        50% { opacity: 0.92; transform: scale(1.08); }
      }
      @keyframes bootCoreGlow {
        0%, 100% { opacity: 0.76; transform: scale(0.92); }
        50% { opacity: 1; transform: scale(1.08); }
      }
      @keyframes bootNodePulse {
        0%, 100% { opacity: 0.72; }
        50% { opacity: 1; }
      }
      @keyframes bootBarSweep {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      @keyframes bootDotPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(126, 231, 255, 0.0); }
        50% { box-shadow: 0 0 0 5px rgba(126, 231, 255, 0.12); }
      }
      @media (prefers-reduced-motion: reduce) {
        .boot-loader::before,
        .boot-progress-bar::after,
        .boot-icon-ring,
        .boot-icon-arc,
        .boot-icon-orbit,
        .boot-core,
        .boot-core-halo,
        .boot-node,
        .running-animated-icon .running-icon-ring,
        .running-animated-icon .running-icon-arc,
        .running-animated-icon .running-icon-halo,
        .running-animated-icon .running-icon-core,
        .running-animated-icon .running-icon-node,
        .running-animated-icon .running-icon-satellite {
          animation: none !important;
          transition: none !important;
        }
      }
      .completion-rail {
        display: none;
        gap: 10px;
        overflow: auto;
        padding-bottom: 2px;
      }
      .completion-rail.visible {
        display: flex;
      }
      .completion-card {
        min-width: 240px;
        max-width: 320px;
        padding: 12px 14px;
        border-radius: 16px;
        border: 1px solid rgba(75, 255, 181, 0.16);
        background: linear-gradient(180deg, rgba(8, 18, 20, 0.98), rgba(2, 7, 10, 0.98));
        box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);
        animation: completionPulse 2.4s ease-in-out infinite;
      }
      @keyframes completionPulse {
        0%, 100% { box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18); transform: translateY(0); }
        50% { box-shadow: 0 16px 34px rgba(33, 180, 123, 0.16); transform: translateY(-1px); }
      }
      .completion-head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
        margin-bottom: 8px;
      }
      .completion-title {
        font-size: 13px;
        font-weight: 700;
        line-height: 1.35;
      }
      .completion-meta {
        color: var(--muted);
        font-size: 11px;
      }
      .workspace-pane {
        display: none;
        padding-bottom: 56px;
      }
      .workspace-pane.active {
        display: block;
        animation: pane-enter 150ms ease-out both;
      }
      @keyframes pane-enter {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .board-subtabs {
        display: flex;
        gap: 10px;
        margin: 0;
        flex-wrap: wrap;
      }
      .board-subtab {
        border: 1px solid rgba(112, 181, 255, 0.18);
        background: rgba(14, 18, 26, 0.92);
        color: var(--text-soft);
        border-radius: 999px;
        padding: 10px 16px;
        font: inherit;
        cursor: pointer;
        transition: border-color .16s ease, color .16s ease, background .16s ease;
      }
      .board-subtab.active {
        color: var(--text);
        border-color: rgba(112, 181, 255, 0.55);
        background: rgba(29, 55, 92, 0.55);
        box-shadow: inset 0 0 0 1px rgba(120, 180, 255, 0.22);
      }
      .board-subpane {
        display: none;
      }
      .board-subpane.active {
        display: block;
      }
      .board-human-pane {
        padding-top: 4px;
      }
      .board-tab-rail {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 0;
      }
      .board-tab-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 34px;
        padding: 0 14px;
        border-radius: 999px;
        border: 1px solid rgba(122, 170, 255, 0.22);
        background: rgba(12, 16, 24, 0.94);
        color: rgba(236, 242, 255, 0.92);
        font: inherit;
        font-size: 12px;
        cursor: pointer;
        transition: background .16s ease, border-color .16s ease, color .16s ease, transform .16s ease, box-shadow .16s ease;
      }
      .board-tab-chip.active {
        border-color: rgba(122, 170, 255, 0.46);
        background: rgba(29, 55, 92, 0.56);
        color: var(--text-strong);
        box-shadow: inset 0 0 0 1px rgba(120, 180, 255, 0.18);
      }
      .board-tab-chip:hover {
        transform: translateY(-1px);
      }
      .board-tab-chip.add {
        border-style: dashed;
        color: rgba(196, 222, 255, 0.92);
      }
      .board-tab-chip-count {
        padding: 2px 7px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.07);
        color: rgba(255, 255, 255, 0.82);
        font-size: 11px;
      }
      .board-tab-helper {
        margin-top: 8px;
        color: var(--muted-soft);
        font-size: 11px;
        line-height: 1.45;
        max-width: 760px;
      }
      .board-tab-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        justify-content: center;
        min-height: 24px;
        padding: 0 9px;
        box-sizing: border-box;
        border-radius: 12px;
        border: 1px solid rgba(141, 216, 255, 0.3);
        background: rgba(14, 28, 34, 0.88);
        color: #f4fbff;
        font-size: 11px;
        line-height: 1;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.03);
      }
      .board-tab-pill::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: currentColor;
        opacity: 0.92;
      }
      .board-tab-pill strong,
      .board-tab-chip strong {
        font-weight: 700;
      }
      .board-todo-shell,
      .board-play-shell {
        display: grid;
        gap: 12px;
      }
      .board-todo-hero,
      .board-play-hero,
      .board-play-prompt,
      .board-todo-grid > article {
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        background: linear-gradient(180deg, rgba(10, 15, 24, 0.98), rgba(6, 8, 14, 0.98));
        padding: 18px;
      }
      .board-todo-hero,
      .board-play-hero,
      .board-play-prompt {
        display: grid;
        gap: 10px;
      }
      .board-todo-kicker,
      .board-play-kicker {
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: rgba(198, 214, 245, 0.7);
      }
      .board-todo-title,
      .board-play-title {
        font-size: 24px;
        line-height: 1.05;
        font-weight: 850;
        letter-spacing: -0.04em;
      }
      .board-todo-copy,
      .board-play-copy {
        color: var(--muted);
        line-height: 1.65;
        max-width: 860px;
      }
      .board-todo-grid,
      .board-play-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 12px;
      }
      .board-todo-grid article,
      .board-play-card {
        display: grid;
        gap: 12px;
      }
      .board-play-card {
        border-radius: 18px;
        border: 1px solid rgba(141, 216, 255, 0.09);
        background:
          radial-gradient(circle at top right, rgba(98, 255, 166, 0.08), transparent 34%),
          linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012));
        padding: 16px;
      }
      .board-todo-section-title,
      .board-play-section-title {
        font-size: 14px;
        font-weight: 800;
        letter-spacing: 0.02em;
      }
      .board-todo-list,
      .board-play-list {
        display: grid;
        gap: 8px;
        color: var(--text);
      }
      .board-todo-item,
      .board-play-item {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 10px;
        align-items: start;
      }
      .board-todo-item .meta-pill,
      .board-play-item .meta-pill {
        min-width: 66px;
        justify-content: center;
      }
      .board-play-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .board-play-prompt code {
        display: block;
        white-space: pre-wrap;
        line-height: 1.55;
        color: rgba(222, 235, 255, 0.9);
      }
      .main-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.18fr) minmax(320px, 0.82fr);
        gap: 14px;
      }
      .overview-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
        gap: 14px;
      }
      .thread-overview-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(320px, 0.76fr);
        gap: 14px;
      }
      .overview-digest {
        display: grid;
        grid-template-columns: 1fr;
        gap: 14px;
        padding-bottom: 132px;
      }
      .overview-local-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
        padding: 10px 12px;
        border: 1px solid var(--line);
        border-radius: var(--radius-panel);
        background: var(--panel);
        box-shadow: var(--shadow-soft);
        backdrop-filter: blur(12px);
      }
      .overview-local-title {
        display: grid;
        gap: 2px;
        min-width: 0;
      }
      .overview-local-kicker {
        color: var(--text-strong);
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .overview-local-copy {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.35;
      }
      .overview-subtabs {
        display: inline-flex;
        align-items: center;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 6px;
        padding: 4px;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: color-mix(in srgb, var(--panel-soft) 86%, transparent);
      }
      .overview-subtab {
        min-height: 30px;
        padding: 0 12px;
        flex: 0 0 auto;
        border: 1px solid transparent;
        border-radius: var(--radius-control);
        background: transparent;
        color: var(--muted);
        font: inherit;
        font-size: 12px;
        font-weight: 750;
        cursor: pointer;
      }
      .overview-subtab:hover {
        color: var(--text);
        background: color-mix(in srgb, var(--panel-elevated) 76%, transparent);
      }
      .overview-subtab.active {
        color: var(--text-strong);
        border-color: color-mix(in srgb, var(--blue) 36%, var(--line-strong));
        background: color-mix(in srgb, var(--blue) 16%, var(--panel-elevated));
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--blue) 16%, transparent);
      }
      .overview-subpane {
        display: none;
        padding-bottom: 132px;
      }
      .overview-subpane.active {
        display: block;
        animation: pane-enter 150ms ease-out both;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .overview-local-nav {
        background: color-mix(in srgb, var(--panel-elevated) 92%, transparent);
        box-shadow: var(--shadow-soft);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .overview-subtabs {
        background: color-mix(in srgb, var(--panel-elevated) 82%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .overview-subtab.active {
        background: color-mix(in srgb, var(--blue) 10%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .overview-section {
        border-color: color-mix(in srgb, var(--overview-accent) 22%, var(--line));
        background:
          linear-gradient(180deg, color-mix(in srgb, var(--overview-accent) 5%, #ffffff), #ffffff 72%),
          #ffffff;
        box-shadow: 0 18px 42px rgba(53, 72, 98, 0.09);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .overview-section > .running-board-toolbar {
        border-bottom-color: color-mix(in srgb, var(--overview-accent) 16%, var(--line));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .agent-task-summary-card {
        border-color: color-mix(in srgb, var(--summary-accent) 18%, var(--line));
        background:
          linear-gradient(180deg, color-mix(in srgb, var(--summary-accent) 5%, #ffffff), #ffffff 74%),
          #ffffff;
        box-shadow: 0 10px 24px rgba(53, 72, 98, 0.055);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .agent-task-summary-card .drawer-stat {
        border-color: color-mix(in srgb, var(--summary-accent) 14%, var(--line));
        background: color-mix(in srgb, var(--summary-accent) 3%, var(--panel-elevated));
      }
      .insights-dashboard-shell {
        display: grid;`;
}

module.exports = {
  getBootBoardBaseStyles,
};
