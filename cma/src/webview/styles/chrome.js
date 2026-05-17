function getChromeStyles() {
  return `        gap: 12px;
        position: relative;
        z-index: 80;
        transition: padding-bottom 140ms ease;
      }
      .topbar:has(.surface-menu[open]) {
        padding-bottom: 190px;
      }
      .topbar:has(.service-menu[open]) {
        padding-bottom: 150px;
      }
      .topbar:has(.more-menu[open]) {
        padding-bottom: 96px;
      }
      .topbar.mode-collapsed .hero-stage,
      .topbar.mode-collapsed .sub {
        display: none;
      }
      .topbar.mode-collapsed .ascii-shell {
        display: none;
      }
      .topbar.mode-collapsed .title-stack {
        display: grid;
      }
      .topbar.mode-collapsed .topbar-nav {
        padding-top: 0;
        border-top: none;
      }
      .topbar.mode-collapsed .topbar-head {
        gap: 8px;
      }
      .topbar.mode-collapsed .panel-density-note {
        display: none;
      }
      .topbar.mode-ultra {
        gap: 8px;
      }
      .topbar.mode-ultra .topbar-head {
        display: flex;
        justify-content: flex-end;
      }
      .topbar.mode-ultra .brand-cluster,
      .topbar.mode-ultra #soundToggle {
        display: none;
      }
      .topbar.mode-ultra .topbar-nav {
        padding-top: 0;
        border-top: none;
      }
      .topbar.mode-ultra .workspace-tabs {
        gap: 6px;
      }
      .topbar.mode-ultra .workspace-tab {
        min-height: 30px;
        padding: 0 12px;
        font-size: 11px;
      }
      .topbar-status-row {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: nowrap;
        justify-content: flex-start;
        overflow: hidden;
        min-width: 0;
      }
      .topbar-status-left {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: nowrap;
        min-width: 0;
        width: 100%;
      }
      .topbar-status-left #heroSummary {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .topbar-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: nowrap;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        position: relative;
        z-index: 85;
        overflow: visible;
      }
      .brand-cluster {
        display: grid;
        gap: 10px;
      }
      .brand-line {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        flex-wrap: wrap;
      }
      .title-banner {
        display: grid;
        gap: 6px;
        min-width: min(100%, 780px);
      }
      .ascii-shell {
        padding: 10px 14px;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background:
          radial-gradient(circle at top left, rgba(124, 157, 255, 0.14), transparent 32%),
          radial-gradient(circle at bottom right, rgba(255, 214, 107, 0.12), transparent 28%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.012));
        box-shadow:
          inset 0 0 0 1px rgba(255, 255, 255, 0.03),
          0 16px 34px rgba(0, 0, 0, 0.24);
      }
      .ascii-title {
        margin: 0;
        overflow-x: auto;
        overflow-y: hidden;
        font-size: 11px;
        line-height: 1;
        font-weight: 800;
        letter-spacing: -0.04em;
        white-space: pre;
        font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
        color: transparent;
        background-image: linear-gradient(90deg, #9ee7ff 0%, #ffffff 24%, #ffd36c 50%, #9cffbb 76%, #7dbdff 100%);
        -webkit-background-clip: text;
        background-clip: text;
        text-shadow:
          0 0 14px rgba(124, 157, 255, 0.12),
          0 0 28px rgba(255, 214, 107, 0.08);
      }
      .title-stack {
        display: none;
        gap: 2px;
      }
      .title {
        display: inline-flex;
        align-items: baseline;
        gap: 0;
        font-size: 22px;
        font-weight: 900;
        line-height: 1.05;
        letter-spacing: -0.04em;
        font-family: "Avenir Next Condensed", "DIN Alternate", "SF Pro Display", "Segoe UI", sans-serif;
        color: var(--text-strong);
        text-shadow:
          0 1px 0 rgba(255, 255, 255, 0.08),
          0 0 18px rgba(124, 157, 255, 0.12);
      }
      .title-seg {
        display: inline-block;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .title-seg.codex {
        background-image: linear-gradient(135deg, #9ee7ff 0%, #d7f2ff 46%, #7dbdff 100%);
      }
      .title-seg.managed {
        background-image: linear-gradient(135deg, #ffd36c 0%, #fff1b7 46%, #ff9d5c 100%);
      }
      .title-seg.agent {
        background-image: linear-gradient(135deg, #9cffbb 0%, #d6ffe7 44%, #61ffc0 100%);
      }
      .title-hyphen {
        color: rgba(255, 255, 255, 0.36);
        margin: 0 -1px;
      }
      .title-strip {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        color: rgba(210, 231, 255, 0.62);
        font-size: 10px;
        line-height: 1.2;
        font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      .title-strip::before,
      .title-strip::after {
        content: "";
        width: 22px;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(126, 231, 255, 0.5));
      }
      .title-strip::after {
        background: linear-gradient(90deg, rgba(255, 214, 107, 0.5), transparent);
      }
      .brand-cycle-button {
        width: 100%;
        border: 0;
        padding: 0;
        margin: 0;
        background: transparent;
        color: inherit;
        text-align: left;
        cursor: pointer;
      }
      .brand-cycle-button:focus-visible {
        outline: 2px solid rgba(126, 231, 255, 0.5);
        outline-offset: 6px;
        border-radius: 18px;
      }
      .overview-brand-footer.is-font-0 .title {
        font-family: "Avenir Next Condensed", "DIN Alternate", "SF Pro Display", "Segoe UI", sans-serif;
        letter-spacing: -0.045em;
        text-transform: uppercase;
      }
      .overview-brand-footer.is-font-1 .title {
        font-family: "Bebas Neue", "Arial Narrow", "DIN Alternate", sans-serif;
        letter-spacing: 0.01em;
        text-transform: uppercase;
      }
      .overview-brand-footer.is-font-2 .title {
        font-family: "Futura", "Trebuchet MS", "Segoe UI", sans-serif;
        letter-spacing: -0.03em;
      }
      .overview-brand-footer.is-font-3 .title {
        font-family: "Georgia", "Times New Roman", serif;
        letter-spacing: -0.035em;
      }
      .sub {
        color: var(--muted);
        margin-top: 4px;
        line-height: 1.45;
        font-size: 12px;
      }
      .hero-stage {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .mascot-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 30px;
        padding: 0 12px 0 8px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.026);
        color: var(--muted);
        font-size: 11px;
        letter-spacing: 0.04em;
      }
      .mascot-art {
        width: 26px;
        height: 26px;
        object-fit: contain;
        filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.26));
        flex: 0 0 auto;
      }
      .theme-bar {
        --bar-a: rgba(126, 231, 255, 0.95);
        --bar-b: rgba(124, 157, 255, 0.8);
        display: inline-block;
        flex: 0 0 auto;
        border-radius: 999px;
        background: linear-gradient(135deg, var(--bar-a), var(--bar-b));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 16px rgba(0,0,0,0.14);
      }
      .theme-bar.phase-planning {
        --bar-a: rgba(126, 231, 255, 0.95);
        --bar-b: rgba(124, 157, 255, 0.82);
      }
      .theme-bar.phase-tooling {
        --bar-a: rgba(255, 214, 107, 0.95);
        --bar-b: rgba(255, 157, 92, 0.82);
      }
      .theme-bar.phase-editing {
        --bar-a: rgba(84, 242, 176, 0.95);
        --bar-b: rgba(121, 237, 210, 0.82);
      }
      .theme-bar.phase-testing {
        --bar-a: rgba(196, 163, 255, 0.95);
        --bar-b: rgba(140, 127, 255, 0.82);
      }
      .theme-bar.phase-waiting {
        --bar-a: rgba(173, 181, 197, 0.92);
        --bar-b: rgba(124, 157, 255, 0.58);
      }
      .theme-bar.variant-hero {
        width: 22px;
        height: 22px;
        border-radius: 8px;
      }
      .theme-bar.variant-summary,
      .theme-bar.variant-metric {
        width: 28px;
        height: 28px;
        border-radius: 10px;
      }
      .theme-bar.variant-empty {
        width: 38px;
        height: 12px;
        border-radius: 999px;
        margin-bottom: 8px;
      }
      .theme-bar.variant-phase,
      .theme-bar.variant-mini,
      .theme-bar.variant-intervention {
        width: 18px;
        height: 18px;
        border-radius: 7px;
      }
      .theme-bar.variant-phase-chip {
        width: 12px;
        height: 12px;
      }
      .theme-bar.variant-timeline {
        width: 18px;
        height: 18px;
        border-radius: 6px;
      }
      .theme-mode-pure .theme-is-optional {
        display: none !important;
      }
      .theme-mode-vivid .hero-art-clean,
      .theme-mode-vivid .board-icon-clean {
        display: none !important;
      }
      .theme-mode-clean .hero-art-vivid,
      .theme-mode-clean .board-icon-vivid {
        display: none !important;
      }
      .theme-mode-pure .hero-art-vivid,
      .theme-mode-pure .hero-art-clean,
      .theme-mode-pure .board-icon-vivid,
      .theme-mode-pure .board-icon-clean {
        display: none !important;
      }
      .mascot-face {
        display: grid;
        place-items: center;
        width: 24px;
        height: 24px;
        border-radius: 9px;
        background: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05));
        color: var(--text-strong);
        font-size: 14px;
      }
      .mascot-chip strong {
        color: var(--text);
        font-weight: 700;
      }
      .hero-kicker {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 22px;
        padding: 0 9px;
        border-radius: 999px;
        border: 1px solid rgba(126, 231, 255, 0.18);
        background: rgba(255, 255, 255, 0.024);
        color: var(--cyan);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin: 0;
      }
      .hero-meta {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .hero-pill {
        display: inline-flex;
        align-items: center;
        min-height: 26px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.026);
        color: var(--muted);
        font-size: 11px;
      }
      .hero-pill .health-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        display: inline-block;
        margin-right: 8px;
        flex: 0 0 auto;
        box-shadow: 0 0 0 1px rgba(255,255,255,0.08);
      }
      .hero-pill .health-dot.ok {
        background: var(--green);
        box-shadow: 0 0 0 1px rgba(75, 255, 181, 0.12), 0 0 10px rgba(75, 255, 181, 0.22);
      }
      .hero-pill .health-dot.bad {
        background: var(--red);
        box-shadow: 0 0 0 1px rgba(255, 120, 120, 0.12), 0 0 10px rgba(255, 120, 120, 0.22);
      }
      .actions {
        display: flex;
        gap: 6px;
        flex-wrap: nowrap;
        justify-content: flex-end;
      }
      .collapse-btn {
        min-width: 126px;
        padding: 0 12px;
      }
      .header-control {
        min-height: 34px;
        min-width: 126px;
        padding: 0 12px;
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        text-align: left;
      }
      .header-control-label {
        color: var(--muted);
        font-size: 11px;
      }
      .header-control-value {
        color: var(--text);
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
      }
      .header-toggle-btn {
        min-width: 118px;
        justify-content: center;
        text-align: center;
      }
      .alert-toggle-btn {
        min-width: 148px !important;
        font-weight: 700;
        letter-spacing: 0.01em;
        color: #fff2c8;
        border-color: rgba(255, 214, 107, 0.16);
        background: linear-gradient(180deg, rgba(86, 60, 12, 0.22), rgba(34, 23, 6, 0.28));
      }
      .alert-toggle-btn.active {
        border-color: rgba(255, 214, 107, 0.34);
        background: linear-gradient(180deg, rgba(110, 79, 18, 0.34), rgba(51, 34, 8, 0.34));
        color: #fff7dd;
      }
      .floating-utility-bar {
        position: fixed;
        left: 50%;
        bottom: 12px;
        transform: translateX(-50%);
        z-index: 180;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(8, 14, 26, 0.82);
        box-shadow: 0 18px 38px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04);
        backdrop-filter: blur(18px);
      }
      .floating-utility-bar .header-toggle-btn {
        min-width: 108px;
        min-height: 30px;
      }
      .floating-utility-bar #followThemeToggle {
        min-width: 150px;
      }
      .floating-utility-bar #colorThemeToggle {
        min-width: 122px;
      }
      .topbar-nav-left,
      .topbar-nav-right {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: nowrap;
        position: relative;
        overflow: visible;
      }
      .switcher {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .surface-menu {
        position: relative;
        z-index: 96;
      }
      .surface-menu summary {
        list-style: none;
      }
      .surface-menu summary::-webkit-details-marker {
        display: none;
      }
      .surface-panel {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        right: auto;
        min-width: 220px;
        padding: 10px;
        display: grid;
        gap: 8px;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(9, 17, 31, 0.96);
        box-shadow: 0 18px 40px rgba(0,0,0,0.34);
        z-index: 120;
      }
      .surface-panel .menu-option {
        width: 100%;
      }
      .surface-summary {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        justify-content: space-between;
      }
      .surface-summary-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .surface-toggle-group {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .service-summary {
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .menu-option {
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.03);
        color: var(--text);
        cursor: pointer;
        transition: border-color 140ms ease, background 140ms ease, transform 140ms ease;
      }
      .menu-option:hover,
      .menu-option:focus-visible {
        border-color: rgba(120, 170, 255, 0.22);
        background: rgba(16, 29, 50, 0.86);
        transform: translateY(-1px);
        outline: none;
      }
      .menu-option.active {
        border-color: rgba(126, 231, 255, 0.24);
        background: rgba(18, 52, 80, 0.42);
      }
      .menu-option-copy {
        display: grid;
        gap: 2px;
        min-width: 0;
      }
      .menu-option-title {
        font-size: 12px;
        font-weight: 700;
      }
      .menu-option-note {
        color: var(--muted);
        font-size: 11px;
      }
      .more-menu {
        position: relative;
        z-index: 96;
      }
      .more-menu summary {
        list-style: none;
      }
      .more-menu summary::-webkit-details-marker {
        display: none;
      }
      .more-trigger {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .more-panel {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        min-width: 168px;
        padding: 10px;
        display: grid;
        gap: 8px;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(9, 17, 31, 0.96);
        box-shadow: 0 18px 40px rgba(0,0,0,0.34);
        z-index: 120;
      }
      .more-panel .chip {
        width: 100%;
        justify-content: flex-start;
      }
      .more-panel .mini-action-btn {
        width: 100%;
        justify-content: flex-start;
        border-radius: 10px;
      }
      .mini-action-btn.more-btn {
        min-width: 32px;
        padding: 0 6px;
        letter-spacing: 2px;
      }
      .service-menu {
        position: relative;
        z-index: 96;
      }
      .service-menu summary {
        list-style: none;
      }
      .service-menu summary::-webkit-details-marker {
        display: none;
      }
      .service-panel {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        min-width: 180px;
        padding: 10px;
        display: grid;
        gap: 8px;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(9, 17, 31, 0.96);
        box-shadow: 0 18px 40px rgba(0,0,0,0.34);
        z-index: 120;
      }
      .service-panel button,
      .service-panel a {
        width: 100%;
        justify-content: flex-start;
        text-decoration: none;
      }
      .workspace-tabs {
        display: flex;
        gap: 8px;
        flex-wrap: nowrap;
        min-width: max-content;
      }
      .workspace-tab {
        min-height: 34px;
        padding: 0 14px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.03);
        color: var(--muted);
      }
      .workspace-tab:hover {
        color: var(--text);
      }
      .workspace-tab.active {
        color: var(--text);
        border-color: rgba(124, 157, 255, 0.28);
        background: linear-gradient(180deg, rgba(44, 60, 110, 0.48), rgba(24, 31, 56, 0.46));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
      }
      button {
        min-height: 30px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid rgba(126, 231, 255, 0.24);
        background: rgba(17, 95, 177, 0.14);
        color: var(--text);
        cursor: pointer;
        font-size: 12px;
        transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
      }
      button:hover {
        border-color: rgba(126, 231, 255, 0.36);
        transform: translateY(-1px);
        box-shadow: 0 10px 22px rgba(0, 0, 0, 0.14);
      }
      .switch-btn.active {
        border-color: rgba(75, 255, 181, 0.45);
        box-shadow: inset 0 0 0 1px rgba(75, 255, 181, 0.18);
        background: rgba(29, 130, 92, 0.24);
        color: var(--green);
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }
      .metric {
        --metric-border: rgba(255,255,255,0.06);
        --metric-bg: rgba(255,255,255,0.038);
        --metric-glow: rgba(255,255,255,0.04);
        --metric-band: linear-gradient(90deg, var(--blue), rgba(196,163,255,0.82));
        border-radius: 18px;
        padding: 14px 14px 12px 14px;
        background:
          radial-gradient(circle at top right, var(--metric-glow), transparent 36%),
          linear-gradient(180deg, var(--metric-bg), rgba(255,255,255,0.014));
        border: 1px solid var(--metric-border);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
        position: relative;
        overflow: hidden;
        display: grid;
        gap: 8px;
      }
      .metric::before {
        content: "";
        position: absolute;
        top: 0;
        left: 18px;
        width: 42px;
        height: 3px;
        border-radius: 999px;
        background: var(--metric-band);
      }
      .metric.phase-planning {
        --metric-border: rgba(126, 231, 255, 0.16);
        --metric-bg: rgba(36, 89, 122, 0.14);
        --metric-glow: rgba(126, 231, 255, 0.08);
        --metric-band: linear-gradient(90deg, rgba(126, 231, 255, 0.95), rgba(124, 157, 255, 0.82));
      }
      .metric.phase-tooling {
        --metric-border: rgba(255, 214, 107, 0.16);
        --metric-bg: rgba(120, 76, 9, 0.14);
        --metric-glow: rgba(255, 214, 107, 0.08);
        --metric-band: linear-gradient(90deg, rgba(255, 214, 107, 0.95), rgba(255, 157, 92, 0.82));
      }
      .metric.phase-editing {
        --metric-border: rgba(84, 242, 176, 0.16);
        --metric-bg: rgba(18, 73, 53, 0.14);
        --metric-glow: rgba(84, 242, 176, 0.08);
        --metric-band: linear-gradient(90deg, rgba(84, 242, 176, 0.95), rgba(121, 237, 210, 0.82));
      }
      .metric.phase-waiting {
        --metric-border: rgba(173, 181, 197, 0.16);
        --metric-bg: rgba(58, 66, 80, 0.14);
        --metric-glow: rgba(173, 181, 197, 0.08);
        --metric-band: linear-gradient(90deg, rgba(173, 181, 197, 0.9), rgba(124, 157, 255, 0.58));
      }
      .metric-head {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .metric-art {
        width: 28px;
        height: 28px;
        object-fit: contain;
        flex: 0 0 auto;
        filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.22));
      }
      .metric-head-copy {
        min-width: 0;
      }
      .metric-label {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .metric-value {
        margin-top: 6px;
        font-size: 28px;
        font-weight: 700;
        letter-spacing: -0.03em;
      }
      .toolbar {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        margin-bottom: 12px;
      }
      .search {
        width: 100%;
        min-height: 34px;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.028);
        color: var(--text);
        padding: 0 12px;
        outline: none;
      }
      .search::placeholder { color: #6982a6; }
      .chip-row {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .chip {
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.025);
        color: var(--muted);
        cursor: pointer;
        font-size: 11px;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
      }
      .chip.active {
        background: rgba(124, 157, 255, 0.18);
        color: var(--text-strong);
        border-color: rgba(124, 157, 255, 0.34);
      }
      .chip:hover {
        border-color: rgba(126, 231, 255, 0.26);
        color: var(--text);
      }
      .chip-loading::before {
        content: "";
        width: 12px;
        height: 12px;
        margin-right: 6px;
        border: 2px solid color-mix(in srgb, var(--accent) 30%, transparent);
        border-top-color: var(--accent);
        border-radius: 999px;
        animation: chipSpin 0.8s linear infinite;
        flex-shrink: 0;
      }
      @keyframes chipSpin {
        to { transform: rotate(360deg); }
      }
      .sort-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .thread-toolbar-actions {
        display: inline-flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-end;
      }
      .thread-explorer-panel {
        overflow: hidden;`;
}

module.exports = {
  getChromeStyles,
};
