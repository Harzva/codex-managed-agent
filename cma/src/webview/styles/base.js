function getBaseStyles() {
  return `      :root {
        --bg: #000000;
        --bg-top: #000000;
        --panel: rgba(255, 255, 255, 0.028);
        --panel-soft: rgba(255, 255, 255, 0.02);
        --panel-elevated: rgba(255, 255, 255, 0.042);
        --line: rgba(255, 255, 255, 0.06);
        --line-strong: rgba(255, 255, 255, 0.14);
        --text: #f8fafc;
        --text-strong: #ffffff;
        --muted: #a7b0c0;
        --muted-soft: #6b7280;
        --cyan: #8dd8ff;
        --green: #54f2b0;
        --gold: #ffd479;
        --red: #ff8f9f;
        --blue: #7c9dff;
        --purple: #c4a3ff;
        --shadow-lg: 0 24px 60px rgba(0, 0, 0, 0.48);
        --shadow-soft: 0 16px 38px rgba(0, 0, 0, 0.3);
        --radius-panel: 18px;
        --radius-card: 10px;
        --radius-control: 8px;
        --code-bg: rgba(3, 8, 17, 0.92);
      }
      body.color-theme-system.vscode-light,
      body.color-theme-system:not(.vscode-dark):not(.vscode-high-contrast) {
        --bg: var(--vscode-editor-background, #f7f9fc);
        --bg-top: color-mix(in srgb, var(--vscode-editor-background, #f7f9fc) 88%, #dbe7f4);
        --panel: color-mix(in srgb, var(--vscode-editorWidget-background, #ffffff) 92%, transparent);
        --panel-soft: color-mix(in srgb, var(--vscode-sideBar-background, #f3f6fb) 84%, transparent);
        --panel-elevated: color-mix(in srgb, var(--vscode-editorWidget-background, #ffffff) 97%, transparent);
        --line: color-mix(in srgb, var(--vscode-foreground, #1f2937) 12%, transparent);
        --line-strong: color-mix(in srgb, var(--vscode-foreground, #1f2937) 22%, transparent);
        --text: var(--vscode-foreground, #243247);
        --text-strong: var(--vscode-editor-foreground, #111827);
        --muted: color-mix(in srgb, var(--vscode-foreground, #243247) 68%, transparent);
        --muted-soft: color-mix(in srgb, var(--vscode-foreground, #243247) 48%, transparent);
        --cyan: var(--vscode-textLink-foreground, #087ea4);
        --green: #087a5a;
        --gold: #936408;
        --red: var(--vscode-errorForeground, #b4233a);
        --blue: var(--vscode-button-background, #315fdc);
        --purple: #7654c9;
        --shadow-lg: 0 18px 46px rgba(43, 58, 78, 0.14);
        --shadow-soft: 0 10px 28px rgba(43, 58, 78, 0.08);
        --code-bg: #f4f7fb;
      }
      body.color-theme-light {
        --bg: #f4f6f8;
        --bg-top: #eef2f6;
        --panel: rgba(255, 255, 255, 0.88);
        --panel-soft: rgba(247, 249, 252, 0.86);
        --panel-elevated: rgba(255, 255, 255, 0.94);
        --line: rgba(42, 55, 76, 0.12);
        --line-strong: rgba(42, 55, 76, 0.18);
        --text: #243247;
        --text-strong: #0f172a;
        --muted: #59697f;
        --muted-soft: #7a8798;
        --cyan: #176b87;
        --green: #0a775a;
        --gold: #8a620a;
        --red: #b4233a;
        --blue: #315f9f;
        --purple: #6352a8;
        --shadow-lg: 0 16px 36px rgba(57, 68, 84, 0.1);
        --shadow-soft: 0 9px 22px rgba(57, 68, 84, 0.07);
        --code-bg: #f5f7fb;
      }
      body.color-theme-light-warm {
        --bg: #f6f7f5;
        --bg-top: #eef1f2;
        --panel: rgba(255, 255, 252, 0.92);
        --panel-soft: rgba(246, 248, 247, 0.9);
        --panel-elevated: rgba(255, 255, 252, 0.98);
        --line: rgba(48, 60, 72, 0.12);
        --line-strong: rgba(48, 60, 72, 0.2);
        --text: #29313a;
        --text-strong: #111820;
        --muted: #5f6872;
        --muted-soft: #818891;
        --cyan: #2e6f88;
        --green: #3d7764;
        --gold: #80621f;
        --red: #9f3340;
        --blue: #4b67a8;
        --purple: #6768a8;
        --shadow-lg: 0 18px 44px rgba(54, 62, 72, 0.12);
        --shadow-soft: 0 9px 22px rgba(54, 62, 72, 0.07);
        --code-bg: #f5f7f8;
      }
      body.color-theme-light-mint {
        --bg: #f3fbf8;
        --bg-top: #e6f5ef;
        --panel: rgba(252, 255, 254, 0.9);
        --panel-soft: rgba(239, 250, 246, 0.84);
        --panel-elevated: rgba(255, 255, 255, 0.96);
        --line: rgba(20, 83, 70, 0.12);
        --line-strong: rgba(20, 83, 70, 0.22);
        --text: #18332e;
        --text-strong: #08231e;
        --muted: #4e6a63;
        --muted-soft: #70847f;
        --cyan: #0b8194;
        --green: #087a5a;
        --gold: #916b00;
        --red: #b03145;
        --blue: #3568d4;
        --purple: #7a59bf;
        --shadow-lg: 0 20px 52px rgba(27, 91, 76, 0.15);
        --shadow-soft: 0 10px 24px rgba(27, 91, 76, 0.08);
        --code-bg: #f1f8f5;
      }
      body.color-theme-system.vscode-dark,
      body.color-theme-system.vscode-high-contrast {
        --bg: var(--vscode-editor-background, #000000);
        --bg-top: var(--vscode-editor-background, #000000);
        --panel: color-mix(in srgb, var(--vscode-editorWidget-background, #111827) 34%, transparent);
        --panel-soft: color-mix(in srgb, var(--vscode-sideBar-background, #0b1019) 26%, transparent);
        --panel-elevated: color-mix(in srgb, var(--vscode-editorWidget-background, #172033) 44%, transparent);
        --line: color-mix(in srgb, var(--vscode-foreground, #f8fafc) 8%, transparent);
        --line-strong: color-mix(in srgb, var(--vscode-foreground, #f8fafc) 16%, transparent);
        --text: var(--vscode-foreground, #f8fafc);
        --text-strong: var(--vscode-editor-foreground, #ffffff);
        --muted: color-mix(in srgb, var(--vscode-foreground, #f8fafc) 68%, transparent);
        --muted-soft: color-mix(in srgb, var(--vscode-foreground, #f8fafc) 42%, transparent);
        --cyan: var(--vscode-textLink-foreground, #8dd8ff);
        --green: #54f2b0;
        --gold: #ffd479;
        --red: var(--vscode-errorForeground, #ff8f9f);
        --blue: var(--vscode-button-background, #7c9dff);
        --purple: #c4a3ff;
        --shadow-lg: 0 24px 60px rgba(0, 0, 0, 0.48);
        --shadow-soft: 0 16px 38px rgba(0, 0, 0, 0.3);
        --code-bg: rgba(3, 8, 17, 0.92);
      }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        height: 100%;
      }
      body {
        background: linear-gradient(180deg, var(--bg-top), var(--bg));
      }
      body.color-theme-dark,
      body.color-theme-system.vscode-dark,
      body.color-theme-system.vscode-high-contrast {
        background: #000;
      }
      html:has(body.color-theme-light),
      html:has(body.color-theme-light-warm),
      html:has(body.color-theme-light-mint),
      html:has(body.color-theme-system.vscode-light),
      html:has(body.color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) {
        background: var(--bg);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) {
        background-color: var(--bg);
        background: linear-gradient(180deg, var(--bg-top), var(--bg) 420px, var(--bg));
      }
      body { padding: 12px 12px 276px 12px; }
      .shell { display: grid; gap: 12px; max-width: 1720px; margin: 0 auto; padding-bottom: 72px; }
      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: var(--radius-panel);
        padding: 16px;
        box-shadow: var(--shadow-soft);
        backdrop-filter: blur(12px);
        position: relative;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .panel {
        background: var(--panel);
        box-shadow: var(--shadow-soft);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .topbar-nav,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .drawer-log {
        border-color: var(--line);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .chip,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .workspace-tab,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .switch-btn,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .collapse-btn,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .mini-action-btn,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .tool-btn,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .action-btn,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-subtab,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-tab-chip {
        color: var(--text);
        border-color: var(--line-strong);
        background: color-mix(in srgb, var(--panel-elevated) 78%, transparent);
        box-shadow: 0 4px 12px rgba(65, 86, 112, 0.045);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .chip.active,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .workspace-tab.active,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .switch-btn.active,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .collapse-btn.active,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-subtab.active,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-tab-chip.active {
        color: var(--text-strong);
        border-color: color-mix(in srgb, var(--blue) 34%, var(--line-strong));
        background: color-mix(in srgb, var(--blue) 12%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .search,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) input,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) textarea,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) select,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .loop-input {
        color: var(--text);
        border-color: var(--line-strong);
        background: rgba(255, 255, 255, 0.72);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .running-board-grid > .empty-state.cute {
        color: var(--muted);
        border-color: color-mix(in srgb, var(--line-strong) 76%, transparent);
        background:
          radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--green) 10%, transparent), transparent 42%),
          color-mix(in srgb, var(--panel-elevated) 86%, transparent);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.72), 0 14px 32px rgba(65, 86, 112, 0.08);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .running-board-grid > .empty-state.cute .empty-state-art {
        filter: drop-shadow(0 10px 18px rgba(45, 114, 89, 0.14));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .codex-config-card {
        border-color: color-mix(in srgb, var(--config-accent) 16%, var(--line));
        background:
          linear-gradient(90deg, color-mix(in srgb, var(--config-accent) 6%, #ffffff), #ffffff 36%),
          #ffffff;
        box-shadow: none;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .codex-config-pre {
        color: #233047;
        border-color: color-mix(in srgb, var(--blue) 12%, var(--line));
        background: var(--code-bg);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .codex-config-empty {
        border-color: var(--line);
        background: color-mix(in srgb, var(--panel-soft) 78%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .codex-config-pre code {
        color: inherit;
        background: transparent;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .codex-sidecar-hero,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .codex-sidecar-summary-item,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .codex-sidecar-action-card,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .codex-sidecar-card {
        border-color: color-mix(in srgb, var(--green) 16%, var(--line));
        background:
          linear-gradient(90deg, color-mix(in srgb, var(--green) 5%, #ffffff), #ffffff 42%),
          #ffffff;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .provider-health-hero,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .provider-health-summary-item,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .provider-health-action-card,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .provider-health-card {
        border-color: color-mix(in srgb, var(--purple) 16%, var(--line));
        background:
          linear-gradient(90deg, color-mix(in srgb, var(--purple) 5%, #ffffff), #ffffff 42%),
          #ffffff;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .codex-sidecar-hero,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .codex-sidecar-summary-item,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .codex-sidecar-action-card,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .codex-sidecar-card {
        color: var(--text);
        border-color: var(--line);
        background: color-mix(in srgb, var(--panel-elevated) 88%, transparent);
        box-shadow: none;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .codex-sidecar-hero.warn {
        border-color: rgba(154, 100, 0, 0.2);
        background: color-mix(in srgb, var(--gold) 8%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .codex-sidecar-action-card.warn {
        border-color: rgba(154, 100, 0, 0.2);
        background: color-mix(in srgb, var(--gold) 6%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .codex-sidecar-pill {
        color: var(--text);
        border-color: var(--line);
        background: color-mix(in srgb, var(--panel-soft) 82%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .codex-sidecar-status.ok {
        color: #086148;
        border-color: rgba(8, 122, 90, 0.22);
        background: rgba(8, 122, 90, 0.1);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .codex-sidecar-status.warn {
        color: #7a5200;
        border-color: rgba(154, 100, 0, 0.22);
        background: rgba(255, 214, 107, 0.18);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .codex-sidecar-note {
        border-color: var(--line);
        background: color-mix(in srgb, var(--panel-soft) 78%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .provider-health-hero,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .provider-health-summary-item,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .provider-health-action-card,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .provider-health-card {
        color: var(--text);
        border-color: var(--line);
        background: color-mix(in srgb, var(--panel-elevated) 88%, transparent);
        box-shadow: none;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .provider-health-hero.warn {
        border-color: rgba(154, 100, 0, 0.2);
        background: color-mix(in srgb, var(--gold) 8%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .provider-health-action-card.warn {
        border-color: rgba(154, 100, 0, 0.2);
        background: color-mix(in srgb, var(--gold) 6%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .provider-health-provider-pill {
        color: var(--text);
        border-color: var(--line);
        background: color-mix(in srgb, var(--panel-soft) 82%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .provider-health-provider-pill.is-warning {
        color: #7a5200;
        border-color: rgba(154, 100, 0, 0.22);
        background: rgba(255, 214, 107, 0.18);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .provider-health-progress {
        color: var(--text);
        border-color: color-mix(in srgb, var(--blue) 22%, var(--line));
        background: color-mix(in srgb, var(--blue) 8%, #ffffff);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .provider-health-sqlite-row {
        border-color: var(--line);
        background: color-mix(in srgb, var(--panel-soft) 82%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .provider-health-sqlite-file {
        color: var(--text);
        border-color: var(--line);
        background: color-mix(in srgb, var(--panel-elevated) 78%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .provider-health-sqlite-file.kind-wal {
        border-color: rgba(154, 100, 0, 0.2);
        background: rgba(255, 214, 107, 0.14);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .provider-health-sqlite-file.kind-shm {
        border-color: rgba(8, 122, 90, 0.18);
        background: rgba(8, 122, 90, 0.08);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .provider-health-status.ok {
        color: #086148;
        border-color: rgba(8, 122, 90, 0.22);
        background: rgba(8, 122, 90, 0.1);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .provider-health-status.warn {
        color: #7a5200;
        border-color: rgba(154, 100, 0, 0.22);
        background: rgba(255, 214, 107, 0.18);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .meta-pill {
        color: var(--muted);
        border-color: var(--line);
        background: color-mix(in srgb, var(--panel-soft) 78%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .meta-pill-human,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .meta-pill-git.detached {
        color: #7a5200;
        border-color: rgba(154, 100, 0, 0.2);
        background: rgba(255, 214, 107, 0.16);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .meta-pill-git {
        color: #086148;
        border-color: rgba(8, 122, 90, 0.2);
        background: rgba(8, 122, 90, 0.09);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .meta-pill-model {
        color: #244f9d;
        border-color: rgba(49, 95, 220, 0.18);
        background: rgba(49, 95, 220, 0.08);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .usage-date-input {
        color: var(--text);
        border-color: var(--line-strong);
        background: color-mix(in srgb, var(--panel-elevated) 90%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .thread-row,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .running-row,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .mini-thread,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .summary-card,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .insight-card,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .timeline-card,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .completion-card,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .group-block,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .page-summary-card,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .spotlight-stat,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .spotlight-log-cue,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .cmd-card,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .loop-daemon-card {
        color: var(--text);
        border-color: var(--line);
        background: color-mix(in srgb, var(--panel-elevated) 74%, transparent);
        box-shadow: 0 10px 26px rgba(65, 86, 112, 0.08);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .running-card {
        color: var(--text);
        border-color: color-mix(in srgb, var(--muted-soft) 18%, var(--line));
        background:
          linear-gradient(180deg, color-mix(in srgb, var(--panel-elevated) 98%, transparent), color-mix(in srgb, var(--panel-soft) 96%, transparent));
        box-shadow: 0 10px 22px rgba(52, 67, 89, 0.08);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-project-section {
        background: color-mix(in srgb, var(--project-accent) 4%, var(--panel-soft));
        border-color: color-mix(in srgb, var(--project-accent) 18%, var(--line));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-project-nav {
        color: var(--text);
        border-color: var(--line);
        background: color-mix(in srgb, var(--panel-elevated) 92%, transparent);
        box-shadow: 12px 0 24px rgba(65, 86, 112, 0.12);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-project-nav-btn,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-project-toggle {
        color: var(--text);
        border-color: color-mix(in srgb, var(--blue) 18%, var(--line));
        background: color-mix(in srgb, var(--blue) 7%, #ffffff);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-project-nav-item {
        color: var(--text);
        border-color: var(--line);
        background: color-mix(in srgb, var(--panel-soft) 82%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-project-nav-btn:hover,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-project-toggle:hover,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-project-nav-item:hover,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-project-nav-item:focus-visible {
        color: var(--text-strong);
        border-color: color-mix(in srgb, var(--blue) 30%, var(--line));
        background: color-mix(in srgb, var(--blue) 10%, #ffffff);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .code-line,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .loop-tail {
        color: var(--text);
        border-color: var(--line);
        background: rgba(247, 250, 253, 0.78);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .service-banner,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .drawer-shell,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .floating-utility-bar {
        color: var(--text);
        border-color: var(--line-strong);
        background: color-mix(in srgb, var(--panel-elevated) 88%, transparent);
        box-shadow: var(--shadow-lg);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .overview-brand-footer {
        border-color: var(--line);
        background:
          radial-gradient(circle at top left, rgba(49, 95, 220, 0.08), transparent 34%),
          radial-gradient(circle at bottom right, rgba(255, 214, 107, 0.12), transparent 30%),
          color-mix(in srgb, var(--panel-elevated) 78%, transparent);
        box-shadow: 0 10px 24px rgba(65, 86, 112, 0.1);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .overview-brand-footer .title {
        text-shadow: none;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .overview-brand-footer .title-seg.codex {
        background-image: linear-gradient(135deg, #245ba7 0%, #147a9f 100%);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .overview-brand-footer .title-seg.managed {
        background-image: linear-gradient(135deg, #8a5d00 0%, #bd6b13 100%);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .overview-brand-footer .title-seg.agent {
        background-image: linear-gradient(135deg, #087a5a 0%, #147a9f 100%);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .overview-brand-footer .title-hyphen,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .overview-brand-footer .title-strip {
        color: color-mix(in srgb, var(--muted) 74%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .summary-tail {
        color: var(--muted);
        border-left-color: rgba(154, 100, 0, 0.22);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .thread-explorer-titlebar {
        background:
          radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--blue) 7%, transparent), transparent 48%),
          linear-gradient(180deg, color-mix(in srgb, var(--panel-elevated) 98%, transparent), color-mix(in srgb, var(--panel-soft) 92%, transparent));
        border-color: var(--line-strong);
        box-shadow: 0 10px 24px rgba(65, 86, 112, 0.08);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-page-titlebar {
        background:
          radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--blue) 7%, transparent), transparent 48%),
          linear-gradient(180deg, color-mix(in srgb, var(--panel-elevated) 98%, transparent), color-mix(in srgb, var(--panel-soft) 92%, transparent));
        border-color: var(--line-strong);
        box-shadow: 0 10px 24px rgba(65, 86, 112, 0.08);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .thread-toolbar-primary,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .batch-bar {
        color: var(--text);
        border-color: var(--line-strong);
        background: color-mix(in srgb, var(--panel-elevated) 82%, transparent);
        box-shadow: 0 10px 24px rgba(65, 86, 112, 0.08);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .batch-bar.confirm {
        border-color: color-mix(in srgb, var(--gold) 28%, var(--line));
        background: color-mix(in srgb, var(--gold) 10%, var(--panel-elevated));
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold) 8%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .batch-bar.confirm.danger {
        border-color: color-mix(in srgb, var(--red) 28%, var(--line));
        background: color-mix(in srgb, var(--red) 9%, var(--panel-elevated));
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--red) 8%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .drawer-stat {
        color: var(--text);
        border-color: var(--line);
        background: color-mix(in srgb, var(--panel-elevated) 78%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .drawer {
        color: var(--text);
        border-color: var(--line-strong);
        background:
          radial-gradient(circle at top right, color-mix(in srgb, var(--blue) 8%, transparent), transparent 30%),
          linear-gradient(180deg, color-mix(in srgb, var(--panel-elevated) 98%, transparent), color-mix(in srgb, var(--panel-soft) 96%, transparent));
        box-shadow: -18px 0 42px rgba(65, 86, 112, 0.18);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .drawer-backdrop {
        background: rgba(40, 48, 58, 0.34);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .drawer-head,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .action-rail {
        border-color: var(--line);
        background: color-mix(in srgb, var(--panel-elevated) 72%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .drawer-kicker {
        color: color-mix(in srgb, var(--blue) 70%, var(--text));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .drawer-section,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .cmd-card,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .team-drawer-action-group {
        color: var(--text);
        border-color: var(--line);
        background: color-mix(in srgb, var(--panel-elevated) 88%, transparent);
        box-shadow: 0 8px 20px rgba(65, 86, 112, 0.07);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .cmd-card:hover {
        border-color: color-mix(in srgb, var(--blue) 24%, var(--line));
        background: color-mix(in srgb, var(--blue) 7%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .action-btn.secondary,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .drawer-close,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .cmd-card .chip {
        color: var(--text);
        border-color: var(--line-strong);
        background: color-mix(in srgb, var(--panel-elevated) 88%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .action-btn.warn {
        color: #7a5200;
        border-color: color-mix(in srgb, var(--gold) 28%, var(--line));
        background: color-mix(in srgb, var(--gold) 10%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .icon-badge {
        color: color-mix(in srgb, var(--blue) 72%, var(--text-strong));
        border-color: color-mix(in srgb, var(--blue) 24%, var(--line));
        background: color-mix(in srgb, var(--blue) 8%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .code-line,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .cmd-feedback {
        color: var(--text);
        border-color: var(--line);
        background: color-mix(in srgb, var(--panel-soft) 84%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .conversation-locator,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .conversation-locator-item,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .chat {
        color: var(--text);
        border-color: var(--line);
        background: color-mix(in srgb, var(--panel-elevated) 84%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .conversation-locator-search {
        color: var(--text);
        border-color: var(--line-strong);
        background: color-mix(in srgb, var(--panel-elevated) 94%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .conversation-locator-item:hover,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .conversation-locator-item:focus-visible {
        border-color: color-mix(in srgb, var(--blue) 30%, var(--line));
        background: color-mix(in srgb, var(--blue) 8%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .conversation-locator-index {
        color: color-mix(in srgb, var(--green) 78%, var(--text-strong));
        background: color-mix(in srgb, var(--green) 10%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-loader {
        border-color: color-mix(in srgb, var(--blue) 22%, var(--line-strong));
        background:
          radial-gradient(circle at 82% 12%, color-mix(in srgb, var(--green) 10%, transparent), transparent 32%),
          radial-gradient(circle at 8% 0%, color-mix(in srgb, var(--blue) 14%, transparent), transparent 34%),
          linear-gradient(180deg, color-mix(in srgb, var(--panel-elevated) 96%, transparent), color-mix(in srgb, var(--panel-soft) 94%, transparent));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), 0 14px 34px rgba(52, 72, 98, 0.1);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-progress {
        border-color: rgba(0,0,0,0.08);
        background: rgba(0, 0, 0, 0.08);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-stage {
        border-color: rgba(0,0,0,0.06);
        background: rgba(255,255,255,0.35);
        color: var(--muted);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-stage.active {
        color: var(--text);
        border-color: color-mix(in srgb, var(--blue) 30%, var(--line));
        background: color-mix(in srgb, var(--blue) 8%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-stage.done {
        color: var(--green);
        border-color: color-mix(in srgb, var(--green) 24%, var(--line));
        background: color-mix(in srgb, var(--green) 6%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-kicker {
        color: color-mix(in srgb, var(--blue) 70%, var(--text));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-percent {
        color: var(--green);
        text-shadow: none;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-title {
        color: var(--text-strong);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .boot-status-icon {
        border-color: color-mix(in srgb, var(--blue) 18%, var(--line));
        background: color-mix(in srgb, var(--panel-elevated) 80%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .service-restart {
        border-color: color-mix(in srgb, var(--red) 24%, var(--line));
        background: color-mix(in srgb, var(--red) 8%, var(--panel-elevated));
        color: var(--red);
      }
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .surface-panel,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .more-panel,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .service-panel {
        color: var(--text);
        border-color: var(--line-strong);
        background: color-mix(in srgb, var(--panel-elevated) 96%, transparent);
        box-shadow: var(--shadow-lg);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .group-board-btn {
        color: var(--green);
        border-color: color-mix(in srgb, var(--green) 24%, var(--line));
        background: color-mix(in srgb, var(--green) 8%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .group-board-btn.active {
        color: var(--gold);
        border-color: color-mix(in srgb, var(--gold) 30%, var(--line));
        background: color-mix(in srgb, var(--gold) 10%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .insights-panel,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .token-trend-card,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .insight-horizontal-bar-card,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .token-ranking-card,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .weekly-hero,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .weekly-stat,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .weekly-highlight {
        color: var(--text);
        border-color: var(--line);
        background: color-mix(in srgb, var(--panel-elevated) 90%, transparent);
        box-shadow: 0 10px 24px rgba(65, 86, 112, 0.07);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .summary-card {
        --summary-border: var(--line);
        --summary-bg: rgba(255, 255, 255, 0.9);
        --summary-glow: transparent;
        box-shadow: 0 8px 20px rgba(65, 86, 112, 0.06);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .page-summary-card,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .thread-toolbar-primary,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .thread-sort-row,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .batch-bar {
        border-color: color-mix(in srgb, var(--line-strong) 74%, transparent);
        background: color-mix(in srgb, var(--panel-elevated) 90%, var(--panel-soft));
        box-shadow: 0 8px 22px rgba(50, 60, 72, 0.06);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .drawer-stat {
        border-color: color-mix(in srgb, var(--line) 84%, transparent);
        background: color-mix(in srgb, var(--panel-elevated) 86%, transparent);
        box-shadow: none;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .search {
        border-color: color-mix(in srgb, var(--blue) 20%, var(--line));
        background: color-mix(in srgb, var(--panel-elevated) 96%, transparent);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.76);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .chip,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .mini-action-btn,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .pin-btn {
        color: var(--text);
        border-color: color-mix(in srgb, var(--line-strong) 78%, transparent);
        background: color-mix(in srgb, var(--panel-elevated) 88%, transparent);
        box-shadow: 0 5px 12px rgba(50, 60, 72, 0.045);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .thread-tab-actions {
        border-top-color: color-mix(in srgb, var(--line) 82%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .thread-tab-action {
        color: var(--text);
        border-color: color-mix(in srgb, var(--line-strong) 78%, transparent);
        background: color-mix(in srgb, var(--panel-elevated) 88%, transparent);
        box-shadow: 0 5px 12px rgba(50, 60, 72, 0.045);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .thread-tab-action:hover,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .thread-tab-action.active {
        color: color-mix(in srgb, var(--blue) 72%, var(--text-strong));
        border-color: color-mix(in srgb, var(--blue) 36%, var(--line));
        background: color-mix(in srgb, var(--blue) 10%, var(--panel-elevated));
        box-shadow: none;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .thread-quick-action {
        color: var(--text);
        border-color: color-mix(in srgb, var(--line-strong) 76%, transparent);
        background: color-mix(in srgb, var(--panel-elevated) 88%, transparent);
        box-shadow: 0 4px 10px rgba(50, 60, 72, 0.04);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .thread-quick-action.git-action {
        color: color-mix(in srgb, var(--green) 70%, var(--text-strong));
        border-color: color-mix(in srgb, var(--green) 22%, var(--line));
        background: color-mix(in srgb, var(--green) 6%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .chip.active,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .thread-sort-row .chip.active {
        color: color-mix(in srgb, var(--blue) 72%, var(--text-strong));
        border-color: color-mix(in srgb, var(--blue) 36%, var(--line));
        background: color-mix(in srgb, var(--blue) 10%, var(--panel-elevated));
        box-shadow: none;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .thread-tab-filter .chip.active,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .filter-select-shell.active {
        color: color-mix(in srgb, var(--blue) 70%, var(--text-strong));
        border-color: color-mix(in srgb, var(--blue) 30%, var(--line));
        background: color-mix(in srgb, var(--blue) 8%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .new-thread-chip,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .group-board-btn {
        color: color-mix(in srgb, var(--green) 72%, var(--text-strong));
        border-color: color-mix(in srgb, var(--green) 24%, var(--line));
        background: color-mix(in srgb, var(--green) 7%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .mini-action-btn.terminal-resume,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .mini-action-btn.locate,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .codex-sidebar-chip {
        color: color-mix(in srgb, var(--blue) 70%, var(--text-strong));
        border-color: color-mix(in srgb, var(--blue) 26%, var(--line));
        background: color-mix(in srgb, var(--blue) 7%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .mini-action-btn.attach-board,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .pin-btn.pinned {
        color: color-mix(in srgb, var(--gold) 72%, var(--text-strong));
        border-color: color-mix(in srgb, var(--gold) 24%, var(--line));
        background: color-mix(in srgb, var(--gold) 7%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .mini-action-btn.attach-loop,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .mini-action-btn.git-action {
        color: color-mix(in srgb, var(--green) 70%, var(--text-strong));
        border-color: color-mix(in srgb, var(--green) 22%, var(--line));
        background: color-mix(in srgb, var(--green) 6%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .thread-row {
        border-color: color-mix(in srgb, var(--line) 90%, transparent);
        background: linear-gradient(180deg, color-mix(in srgb, var(--panel-elevated) 98%, transparent), color-mix(in srgb, var(--panel-elevated) 90%, var(--panel-soft)));
        box-shadow: 0 8px 20px rgba(46, 54, 64, 0.055);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .thread-row:hover {
        border-color: color-mix(in srgb, var(--blue) 22%, var(--line));
        background: color-mix(in srgb, var(--panel-elevated) 96%, transparent);
        box-shadow: 0 12px 26px rgba(46, 54, 64, 0.09);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .thread-title {
        color: var(--text-strong);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .group-block {
        border-color: color-mix(in srgb, var(--group-accent) 14%, var(--line));
        background: color-mix(in srgb, var(--panel-elevated) 78%, transparent);
        box-shadow: 0 10px 26px rgba(46, 54, 64, 0.06);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .group-block[data-group="pinned"] {
        --group-accent: #7d6834;
        border-color: color-mix(in srgb, var(--group-accent) 18%, var(--line));
        background: color-mix(in srgb, var(--panel-elevated) 82%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .group-count {
        color: var(--muted);
        border-color: color-mix(in srgb, var(--line-strong) 70%, transparent);
        background: color-mix(in srgb, var(--panel-soft) 82%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .badge {
        color: var(--muted);
        border-color: color-mix(in srgb, var(--line-strong) 70%, transparent);
        background: color-mix(in srgb, var(--panel-soft) 62%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .badge-running {
        color: color-mix(in srgb, var(--green) 74%, var(--text-strong));
        border-color: color-mix(in srgb, var(--green) 24%, var(--line));
        background: color-mix(in srgb, var(--green) 7%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .badge-recent,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .badge-attached,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .badge-board {
        color: color-mix(in srgb, var(--gold) 70%, var(--text-strong));
        border-color: color-mix(in srgb, var(--gold) 20%, var(--line));
        background: color-mix(in srgb, var(--gold) 6%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .badge-linked,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .badge-codex-open,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .badge-codex-sidebar,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .badge-codex-focused {
        color: color-mix(in srgb, var(--blue) 70%, var(--text-strong));
        border-color: color-mix(in srgb, var(--blue) 22%, var(--line));
        background: color-mix(in srgb, var(--blue) 7%, var(--panel-elevated));
        box-shadow: none;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .badge-needs-human,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .badge-intervention {
        color: color-mix(in srgb, var(--red) 70%, var(--text-strong));
        border-color: color-mix(in srgb, var(--red) 24%, var(--line));
        background: color-mix(in srgb, var(--red) 7%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) [data-workspace-pane="threads"] .board-tab-pill {
        color: var(--text) !important;
        box-shadow: none !important;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .running-card:hover {
        border-color: color-mix(in srgb, var(--blue) 18%, var(--line));
        background: linear-gradient(180deg, var(--panel-elevated), var(--panel-soft));
        box-shadow: 0 14px 28px rgba(52, 67, 89, 0.11);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .running-card-topbar {
        box-shadow: none;
        opacity: 0.42;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .tool-btn,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .tool-id {
        color: var(--text);
        border-color: color-mix(in srgb, var(--muted-soft) 18%, var(--line));
        background: color-mix(in srgb, var(--panel-elevated) 74%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .tool-btn.primary,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .tool-btn.git-push {
        color: var(--blue);
        border-color: color-mix(in srgb, var(--blue) 22%, var(--line));
        background: color-mix(in srgb, var(--blue) 5%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .tool-btn.git-action,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .tool-btn.loop,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .tool-btn.loop.attached {
        color: color-mix(in srgb, var(--green) 72%, var(--text));
        border-color: color-mix(in srgb, var(--green) 18%, var(--line));
        background: color-mix(in srgb, var(--green) 4%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .tool-btn.codex-link,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .tool-btn.board-codex-shortcut {
        color: color-mix(in srgb, var(--purple) 70%, var(--text));
        border-color: color-mix(in srgb, var(--purple) 18%, var(--line));
        background: color-mix(in srgb, var(--purple) 4%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .tool-btn.board,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .tool-btn.board.attached,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .tool-btn.pin {
        color: color-mix(in srgb, var(--gold) 70%, var(--text));
        border-color: color-mix(in srgb, var(--gold) 20%, var(--line));
        background: color-mix(in srgb, var(--gold) 5%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .board-card-size-actions,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .size-switch {
        border-color: color-mix(in srgb, var(--muted-soft) 14%, var(--line));
        background: color-mix(in srgb, var(--panel-elevated) 68%, transparent);
        box-shadow: none;
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .size-chip {
        color: var(--muted);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .size-chip.active {
        color: var(--blue);
        background: color-mix(in srgb, var(--blue) 10%, var(--panel-elevated));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .insight-horizontal-bar-track,
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .token-ranking-bar {
        background: color-mix(in srgb, var(--muted-soft) 12%, transparent);
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .insight-horizontal-bar-fill {
        background: linear-gradient(90deg, color-mix(in srgb, var(--cyan) 72%, white), color-mix(in srgb, var(--green) 68%, white));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .token-ranking-fill {
        background: linear-gradient(90deg, color-mix(in srgb, var(--cyan) 68%, white), color-mix(in srgb, var(--gold) 62%, white));
      }
      body:is(.color-theme-light, .color-theme-light-warm, .color-theme-light-mint, .color-theme-system.vscode-light, .color-theme-system:not(.vscode-dark):not(.vscode-high-contrast)) .word-cloud-token {
        color: var(--text);
        background: color-mix(in srgb, var(--cyan) 8%, var(--panel-elevated));
        border: 1px solid color-mix(in srgb, var(--cyan) 14%, var(--line));
      }
      .topbar {
        display: grid;`;
}

module.exports = {
  getBaseStyles,
};
