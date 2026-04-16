const vscode = require("vscode");
const { renderInsightsSections } = require("./webview/insights");
const { renderBoardPane } = require("./webview/board");
const { renderDrawerShell } = require("./webview/drawer");

function getWebviewHtml(webview, extensionUri, initialPersistedState = {}) {
  const nonce = String(Date.now());
  const mediaRoot = vscode.Uri.joinPath(extensionUri, "media");
  const media = {
    hero: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "home-runing.svg")).toString(),
    board: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "board-hero.svg")).toString(),
    intervention: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "intervention-bird.svg")).toString(),
    spotlight: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "spotlight-live-photo.svg")).toString(),
    timeline: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "toruning.svg")).toString(),
    rest: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "cartoon-sheep-copy.svg")).toString(),
    planning: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "createtask.svg")).toString(),
    tooling: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "tooling-watch.svg")).toString(),
    editing: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "edit.svg")).toString(),
    testing: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "runing.svg")).toString(),
    waiting: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "waiting-sheep.svg")).toString(),
    alertPlink: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "Small object dropping into water with a distinct plink sound.mp3")).toString(),
    alertSplashes: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "Multiple small items falling into water, light and scattered splashes.mp3")).toString(),
    alertNature: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "nature ambience.mp3")).toString(),
    alertFnaf: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "fnaf 2 ambience.mp3")).toString(),
  };
  const renderBootAnimatedIcon = () => `
    <div class="boot-status-icon" aria-hidden="true">
      <svg class="boot-status-svg" viewBox="0 0 80 80" focusable="false">
        <circle class="boot-icon-track" cx="40" cy="40" r="30"></circle>
        <circle class="boot-icon-ring" cx="40" cy="40" r="30" pathLength="100"></circle>
        <circle class="boot-icon-arc" cx="40" cy="40" r="22" pathLength="100"></circle>
        <path class="boot-icon-link" d="M22 58 L40 22 L58 58"></path>
        <g class="boot-icon-orbit">
          <circle class="boot-satellite" cx="40" cy="10" r="3"></circle>
          <circle class="boot-satellite faint" cx="66" cy="40" r="2"></circle>
        </g>
        <circle class="boot-core-halo" cx="40" cy="40" r="14"></circle>
        <circle class="boot-core" cx="40" cy="40" r="7"></circle>
        <g class="boot-node-group">
          <circle class="boot-node node-shell" cx="22" cy="58" r="4"></circle>
          <circle class="boot-node node-bridge" cx="40" cy="22" r="4"></circle>
          <circle class="boot-node node-state" cx="58" cy="58" r="4"></circle>
          <circle class="boot-node node-hydrate" cx="40" cy="66" r="4"></circle>
        </g>
      </svg>
    </div>`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${webview.cspSource} data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"
    />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Codex-Managed-Agent</title>
    <style>
      :root {
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
      }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        background: #000;
        color: var(--text);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        height: 100%;
      }
      body { padding: 12px 12px 276px 12px; }
      .shell { display: grid; gap: 12px; max-width: 1720px; margin: 0 auto; padding-bottom: 72px; }
      .panel {
        background:
          radial-gradient(circle at top right, rgba(124, 157, 255, 0.08), transparent 28%),
          radial-gradient(circle at bottom left, rgba(196, 163, 255, 0.05), transparent 26%),
          var(--panel);
        border: 1px solid var(--line);
        border-radius: 24px;
        padding: 14px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.46);
        backdrop-filter: blur(14px);
        position: relative;
      }
      .topbar {
        display: grid;
        gap: 12px;
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
        overflow: auto hidden;
      }
      .topbar-status-left {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: nowrap;
        min-width: max-content;
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
        overflow: hidden;
      }
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
      .agent-task-summary-panel {
        overflow: hidden;
      }
      .agent-task-summary-panel .board-icon-clean {
        display: none !important;
      }
      .agent-task-summary-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
        grid-template-areas:
          "thread board tabs"
          "coordination coordination coordination";
        gap: 12px;
        align-items: stretch;
      }
      .agent-task-summary-card {
        min-width: 0;
        box-shadow: none;
        background:
          radial-gradient(circle at top right, rgba(126, 231, 255, 0.045), transparent 32%),
          rgba(255,255,255,0.018);
      }
      .agent-task-summary-card .drawer-summary {
        margin-top: 8px;
      }
      .thread-summary-card {
        grid-area: thread;
      }
      .board-summary-card {
        grid-area: board;
      }
      .tab-management-card .chip-row {
        margin-top: 8px;
        gap: 6px;
      }
      .tab-management-card {
        grid-area: tabs;
      }
      .tab-management-card .drawer-summary {
        gap: 6px;
      }
      .tab-management-card .drawer-stat {
        min-height: 42px;
        padding: 7px 8px;
      }
      .coordination-summary-card {
        grid-area: coordination;
      }
      .coordination-summary-card .digest-rail {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        align-items: start;
      }
      .tab-management-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }
      .tab-management-chip {
        appearance: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 26px;
        max-width: 180px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.07);
        background: rgba(255,255,255,0.025);
        color: var(--text);
        padding: 0 7px 0 9px;
        cursor: pointer;
        font: inherit;
      }
      .tab-management-chip:hover,
      .tab-management-chip:focus-visible {
        border-color: rgba(126, 231, 255, 0.28);
        outline: none;
      }
      .tab-management-chip.active {
        border-color: rgba(84, 242, 176, 0.3);
        background: rgba(18, 73, 53, 0.18);
      }
      .tab-management-name {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 11px;
        font-weight: 800;
      }
      .sort-label {
        color: var(--muted);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      details.fold {
        border-radius: 16px;
        background: rgba(8, 18, 34, 0.58);
        border: 1px solid rgba(126, 231, 255, 0.08);
      }
      details.fold > summary {
        list-style: none;
        cursor: pointer;
        padding: 12px;
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        user-select: none;
      }
      details.fold > summary::-webkit-details-marker { display: none; }
      .fold-body { padding: 0 12px 12px 12px; }
      .service-ok { color: var(--green); }
      .service-bad { color: var(--red); }
      .service-banner {
        display: none;
        margin-top: 12px;
        border-radius: 14px;
        border: 1px solid rgba(255, 124, 136, 0.14);
        background: rgba(60, 18, 28, 0.24);
        color: #ffd5da;
        padding: 10px 12px;
        font-size: 12px;
        line-height: 1.45;
      }
      .service-banner.visible {
        display: block;
      }
      .service-banner.hydrating {
        border-color: rgba(126, 231, 255, 0.16);
        background: rgba(18, 42, 68, 0.18);
        color: #d9e8ff;
      }
      .service-banner .chip {
        margin-top: 8px;
      }
      .service-restart {
        border-color: rgba(255, 124, 136, 0.26);
        background: rgba(122, 24, 40, 0.2);
        color: #ffd9dd;
      }
      .boot-loader {
        grid-column: 1 / -1;
        min-height: 210px;
        border-radius: 18px;
        border: 1px solid rgba(126, 231, 255, 0.12);
        background:
          radial-gradient(circle at 82% 12%, rgba(84, 242, 176, 0.12), transparent 32%),
          radial-gradient(circle at 8% 0%, rgba(124, 157, 255, 0.18), transparent 34%),
          linear-gradient(180deg, rgba(13, 20, 33, 0.94), rgba(7, 10, 16, 0.96));
        padding: 18px;
        display: grid;
        gap: 16px;
        position: relative;
        overflow: hidden;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 22px 46px rgba(0,0,0,0.22);
      }
      .boot-loader::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(90deg, transparent, rgba(255,255,255,0.055), transparent);
        transform: translateX(-100%);
        animation: bootShimmer 2.6s ease-in-out infinite;
        pointer-events: none;
      }
      .boot-loader-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        position: relative;
        z-index: 1;
      }
      .boot-kicker {
        color: #9cc9ff;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        margin-bottom: 8px;
      }
      .boot-title {
        font-size: clamp(26px, 4.5vw, 46px);
        line-height: 1;
        font-weight: 800;
        letter-spacing: -0.03em;
      }
      .boot-copy {
        color: var(--muted-soft);
        line-height: 1.5;
        max-width: 620px;
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
        gap: 14px;
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
        gap: 14px;
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
      .insights-dashboard-shell {
        display: grid;
        gap: 14px;
      }
      .loop-dashboard-shell {
        display: grid;
        gap: 14px;
      }
      .loop-daemon-list {
        display: grid;
        gap: 14px;
      }
      .loop-daemon-card {
        display: grid;
        gap: 12px;
        padding: 16px;
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        background: linear-gradient(180deg, rgba(10, 16, 27, 0.96), rgba(5, 9, 15, 0.98));
      }
      .loop-daemon-card.running {
        border-color: rgba(95, 255, 191, 0.18);
        box-shadow: inset 0 1px 0 rgba(95, 255, 191, 0.05);
      }
      .loop-daemon-card.exited {
        border-color: rgba(255, 196, 92, 0.18);
      }
      .loop-daemon-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: start;
      }
      .loop-daemon-title-wrap {
        min-width: 0;
        display: grid;
        gap: 6px;
      }
      .loop-daemon-title {
        font-size: 18px;
        font-weight: 800;
        letter-spacing: -0.03em;
      }
      .loop-daemon-subtitle {
        color: var(--muted);
        line-height: 1.45;
        word-break: break-word;
      }
      .loop-daemon-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .loop-daemon-detail {
        color: var(--muted-soft);
        line-height: 1.5;
      }
      .loop-daemon-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .loop-daemon-empty {
        min-height: 220px;
        display: grid;
        place-items: center;
      }
      .loop-install-card {
        display: grid;
        gap: 10px;
        padding: 16px;
        border-radius: 18px;
        border: 1px solid rgba(255, 196, 92, 0.18);
        background: linear-gradient(180deg, rgba(63, 45, 10, 0.18), rgba(18, 13, 6, 0.92));
      }
      .insights-dashboard-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
        grid-template-areas:
          "usage usage"
          "topic advice"
          "weekly advice"
          "patterns heatmap"
          "wordcloud heatmap";
        gap: 14px;
        align-items: start;
      }
      .insights-panel {
        position: relative;
        overflow: hidden;
      }
      .insights-panel::before {
        content: "";
        position: absolute;
        inset: 0 0 auto 0;
        height: 3px;
        opacity: 0.85;
        pointer-events: none;
      }
      .insights-panel-usage::before,
      .insights-panel-topic::before {
        background: linear-gradient(90deg, rgba(126,231,255,0.9), rgba(120,180,255,0.18));
      }
      .insights-panel-advice::before,
      .insights-panel-patterns::before,
      .insights-panel-weekly::before,
      .insights-panel-wordcloud::before {
        background: linear-gradient(90deg, rgba(255,214,107,0.88), rgba(255,119,198,0.18));
      }
      .summary-deck-insights {
        grid-template-columns: repeat(2, minmax(220px, 1fr));
        gap: 8px;
      }
      .insights-panel-usage .summary-card {
        grid-template-columns: minmax(118px, 0.42fr) minmax(0, 1fr);
        align-items: center;
        min-height: 92px;
        height: auto;
        padding: 10px 12px;
        gap: 10px;
        border-radius: 15px;
      }
      .insights-panel-usage .summary-head {
        gap: 8px;
      }
      .insights-panel-usage .summary-art {
        width: 22px;
        height: 22px;
      }
      .insights-panel-usage .summary-label {
        font-size: 10px;
        letter-spacing: 0.07em;
      }
      .insights-panel-usage .summary-body {
        gap: 4px;
        align-content: start;
      }
      .insights-panel-usage .summary-value {
        font-size: clamp(22px, 3vw, 30px);
        line-height: 1;
        word-break: keep-all;
        overflow-wrap: anywhere;
      }
      .insights-panel-usage .summary-copy {
        -webkit-line-clamp: 1;
        font-size: 10px;
        line-height: 1.25;
      }
      .insights-panel-usage .phase-chip {
        min-height: 20px;
        padding: 0 8px;
        font-size: 10px;
      }
      .insight-list-dense {
        gap: 8px;
      }
      .insights-panel-usage { grid-area: usage; }
      .insights-panel-topic { grid-area: topic; }
      .insights-panel-advice { grid-area: advice; }
      .insights-panel-patterns { grid-area: patterns; }
      .insights-panel-heatmap { grid-area: heatmap; }
      .insights-panel-weekly { grid-area: weekly; }
      .insights-panel-wordcloud { grid-area: wordcloud; }
      .topic-map-board {
        min-height: 320px;
      }
      .topic-map-board svg {
        height: 320px;
      }
      .word-cloud-board {
        min-height: 120px;
        align-content: start;
        padding-top: 8px;
      }
      .insights-panel-topic {
        min-height: 392px;
      }
      .insights-panel-wordcloud {
        min-height: 232px;
      }
      .insights-panel-weekly {
        min-height: 272px;
      }
      .insights-panel-advice {
        min-height: 300px;
      }
      .insights-panel-patterns {
        min-height: 232px;
      }
      .insights-panel-heatmap {
        min-height: 344px;
      }
      .insights-panel-wordcloud .section-note {
        max-width: 72ch;
      }
      .token-trend-shell,
      .token-thread-ranking-shell {
        display: grid;
        gap: 10px;
        margin-top: 10px;
      }
      .token-trend-card,
      .token-ranking-card {
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 18px;
        padding: 12px;
        background: linear-gradient(180deg, rgba(255,255,255,0.028), rgba(255,255,255,0.012));
      }
      .token-trend-head,
      .token-ranking-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 10px;
      }
      .token-chart {
        width: 100%;
        height: 170px;
        overflow: visible;
      }
      .token-chart-grid {
        stroke: rgba(255,255,255,0.06);
        stroke-width: 1;
      }
      .token-chart-area {
        fill: rgba(126, 231, 255, 0.12);
      }
      .token-chart-line {
        fill: none;
        stroke: #7ee7ff;
        stroke-width: 3;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .token-chart-bar {
        fill: url(#tokenBarGradient);
        opacity: 0.9;
      }
      .token-chart-point {
        fill: #dff9ff;
        stroke: rgba(20, 90, 120, 0.9);
        stroke-width: 2;
      }
      .token-axis {
        fill: var(--muted);
        font-size: 10px;
      }
      .token-ranking-list {
        display: grid;
        gap: 8px;
      }
      .token-ranking-row {
        display: grid;
        grid-template-columns: 26px minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
      }
      .token-ranking-rank {
        color: var(--gold);
        font-weight: 800;
        font-size: 12px;
      }
      .token-ranking-title {
        color: var(--text);
        font-size: 12px;
        font-weight: 700;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .token-ranking-bar {
        position: relative;
        height: 8px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(255,255,255,0.05);
        margin-top: 5px;
      }
      .token-ranking-fill {
        position: absolute;
        inset: 0 auto 0 0;
        border-radius: inherit;
        background: linear-gradient(90deg, rgba(126,231,255,0.88), rgba(255,214,107,0.86));
      }
      .token-ranking-value {
        color: var(--muted);
        font-size: 11px;
        white-space: nowrap;
      }
      .interaction-heatmap-shell {
        display: grid;
        gap: 12px;
        align-content: start;
      }
      .interaction-heatmap-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .interaction-heatmap-board {
        display: grid;
        gap: 10px;
        padding: 14px;
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,0.06);
        background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015));
      }
      .interaction-heatmap-months {
        display: grid;
        grid-template-columns: 42px 1fr;
        gap: 10px;
        align-items: end;
      }
      .interaction-heatmap-month-track {
        position: relative;
        height: 16px;
      }
      .interaction-heatmap-month-label {
        position: absolute;
        top: 0;
        font-size: 11px;
        color: var(--muted);
        transform: translateX(-2px);
      }
      .interaction-heatmap-grid-wrap {
        display: grid;
        grid-template-columns: 42px 1fr;
        gap: 10px;
        align-items: start;
      }
      .interaction-heatmap-weekdays {
        display: grid;
        grid-template-rows: repeat(7, 12px);
        gap: 5px;
        padding-top: 1px;
      }
      .interaction-heatmap-weekdays span {
        font-size: 11px;
        color: var(--muted);
        line-height: 12px;
      }
      .interaction-heatmap-grid {
        display: grid;
        grid-auto-flow: column;
        grid-template-rows: repeat(7, 12px);
        grid-auto-columns: 12px;
        gap: 5px;
      }
      .interaction-cell {
        width: 12px;
        height: 12px;
        border-radius: 4px;
        border: 1px solid rgba(255,255,255,0.06);
        background: rgba(255,255,255,0.04);
      }
      .interaction-cell.level-1 { background: rgba(128, 255, 169, 0.26); border-color: rgba(128, 255, 169, 0.18); }
      .interaction-cell.level-2 { background: rgba(104, 232, 134, 0.48); border-color: rgba(104, 232, 134, 0.26); }
      .interaction-cell.level-3 { background: rgba(72, 201, 108, 0.72); border-color: rgba(72, 201, 108, 0.3); }
      .interaction-cell.level-4 { background: rgba(43, 143, 73, 0.92); border-color: rgba(67, 194, 103, 0.34); }
      .interaction-heatmap-legend {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        align-items: center;
      }
      .interaction-heatmap-legend-scale {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--muted);
        font-size: 12px;
      }
      .interaction-heatmap-legend-scale .interaction-cell {
        width: 10px;
        height: 10px;
        border-radius: 3px;
      }
      @media (max-width: 980px) {
        .insights-dashboard-grid {
          grid-template-columns: 1fr;
          grid-template-areas:
            "usage"
            "topic"
            "advice"
            "weekly"
            "patterns"
            "heatmap"
            "wordcloud";
        }
        .summary-deck-insights {
          grid-template-columns: 1fr;
        }
        .topic-map-board,
        .topic-map-board svg {
          min-height: 280px;
          height: 280px;
        }
      }
      .weekly-report-shell {
        display: grid;
        gap: 12px;
      }
      .weekly-hero {
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,0.08);
        background: linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02));
        padding: 14px;
        display: grid;
        gap: 10px;
      }
      .weekly-hero-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }
      .weekly-kicker {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }
      .weekly-hero-title {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      .weekly-hero-copy {
        color: var(--muted-soft);
        font-size: 12px;
        line-height: 1.55;
      }
      .weekly-stat-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      .weekly-stat {
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.06);
        background: rgba(255,255,255,0.03);
        padding: 10px 12px;
        display: grid;
        gap: 4px;
      }
      .weekly-stat-label {
        color: var(--muted);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .weekly-stat-value {
        font-size: 14px;
        font-weight: 700;
      }
      .weekly-highlight-list {
        display: grid;
        gap: 8px;
      }
      .weekly-highlight {
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.06);
        background: rgba(255,255,255,0.025);
        padding: 10px 12px;
        color: var(--muted-soft);
        font-size: 12px;
        line-height: 1.5;
      }
      .summary-deck {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .summary-card {
        --summary-border: rgba(255, 255, 255, 0.06);
        --summary-bg: rgba(255,255,255,0.035);
        --summary-glow: rgba(255,255,255,0.04);
        border-radius: 18px;
        border: 1px solid var(--summary-border);
        background:
          radial-gradient(circle at top right, var(--summary-glow), transparent 34%),
          linear-gradient(180deg, var(--summary-bg), rgba(255,255,255,0.015));
        padding: 12px;
        display: grid;
        grid-template-columns: minmax(0, 220px) minmax(0, 1fr);
        gap: 14px;
        align-items: center;
        min-height: 0;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
      }
      .summary-card.phase-planning {
        --summary-border: rgba(126, 231, 255, 0.16);
        --summary-bg: rgba(36, 89, 122, 0.14);
        --summary-glow: rgba(126, 231, 255, 0.08);
      }
      .summary-card.phase-tooling {
        --summary-border: rgba(255, 214, 107, 0.16);
        --summary-bg: rgba(120, 76, 9, 0.14);
        --summary-glow: rgba(255, 214, 107, 0.08);
      }
      .summary-card.phase-waiting {
        --summary-border: rgba(173, 181, 197, 0.16);
        --summary-bg: rgba(58, 66, 80, 0.14);
        --summary-glow: rgba(173, 181, 197, 0.08);
      }
      .summary-head {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .summary-art {
        width: 28px;
        height: 28px;
        object-fit: contain;
        filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.22));
        flex: 0 0 auto;
      }
      .summary-head-copy {
        min-width: 0;
      }
      .summary-body {
        min-width: 0;
        display: grid;
        gap: 6px;
        align-content: center;
      }
      .summary-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }
      .summary-value {
        font-size: 16px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.15;
        word-break: break-word;
      }
      .summary-copy {
        color: var(--muted-soft);
        font-size: 11px;
        line-height: 1.45;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .summary-card .summary-actions {
        margin-top: 2px;
      }
      @media (max-width: 860px) {
        .summary-card {
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .summary-body {
          gap: 4px;
        }
      }
      .overview-brand-footer {
        position: fixed;
        left: 50%;
        right: auto;
        transform: translateX(-50%);
        width: min(calc(100vw - 36px), 880px);
        bottom: 54px;
        margin-top: 0;
        padding: 12px 20px;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        background:
          radial-gradient(circle at top left, rgba(124, 157, 255, 0.18), transparent 30%),
          radial-gradient(circle at bottom right, rgba(255, 214, 107, 0.16), transparent 26%),
          linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.018));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 14px 28px rgba(0,0,0,0.16);
        z-index: 140;
      }
      .overview-brand-footer .title-stack {
        display: grid;
        gap: 4px;
      }
      .overview-brand-footer .title {
        font-size: clamp(22px, 3.4vw, 38px);
        line-height: 0.92;
        transition: font-family 180ms ease, letter-spacing 180ms ease, transform 180ms ease;
      }
      .summary-tail {
        margin-top: 2px;
        border-left: 2px solid rgba(255, 214, 107, 0.28);
        padding-left: 10px;
        color: rgba(255, 242, 214, 0.86);
        font-size: 11px;
        line-height: 1.45;
      }
      .digest-rail {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .mini-thread {
        padding: 12px 14px;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.06);
        background: rgba(255,255,255,0.025);
        box-sizing: border-box;
        min-width: 0;
        max-width: 100%;
      }
      .mini-thread-title {
        margin-top: 6px;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.35;
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .mini-thread-meta {
        margin-top: 6px;
        color: var(--muted);
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
      }
      .mini-thread-meta .meta-pill {
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .mini-thread-topmeta {
        margin-top: 0;
        flex-wrap: nowrap;
      }
      .insight-list {
        display: grid;
        gap: 10px;
      }
      .insight-card {
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.06);
        background: rgba(255,255,255,0.025);
        padding: 12px 14px;
        display: grid;
        gap: 6px;
      }
      .insight-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .insight-card-title {
        font-size: 13px;
        font-weight: 700;
      }
      .insight-card-copy {
        color: var(--muted-soft);
        font-size: 12px;
        line-height: 1.5;
      }
      .insight-chip-list {
        margin-top: 12px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .keyword-chip {
        appearance: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(126, 231, 255, 0.12);
        background: rgba(126, 231, 255, 0.06);
        font-size: 11px;
        color: var(--fg);
        cursor: pointer;
        font: inherit;
        transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
      }
      .keyword-chip:hover,
      .keyword-chip:focus-visible {
        background: rgba(126, 231, 255, 0.12);
        border-color: rgba(126, 231, 255, 0.24);
        transform: translateY(-1px);
        outline: none;
      }
      .keyword-chip .count {
        color: var(--muted);
      }
      .topic-map {
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,0.06);
        background: rgba(255,255,255,0.02);
        min-height: 320px;
        overflow: hidden;
      }
      .topic-map svg {
        display: block;
        width: 100%;
        height: 320px;
      }
      .topic-edge {
        stroke: rgba(126, 231, 255, 0.32);
        stroke-width: 1.4;
      }
      .topic-node rect {
        fill: rgba(18, 20, 28, 0.92);
        stroke: rgba(255,255,255,0.08);
      }
      .topic-node.center rect {
        fill: rgba(126, 231, 255, 0.12);
        stroke: rgba(126, 231, 255, 0.22);
      }
      .topic-node.style rect {
        fill: rgba(126, 231, 255, 0.09);
        stroke: rgba(126, 231, 255, 0.18);
      }
      .topic-node.keyword rect {
        fill: rgba(255, 214, 107, 0.08);
        stroke: rgba(255, 214, 107, 0.18);
      }
      .topic-node.thread rect {
        fill: rgba(191, 155, 255, 0.08);
        stroke: rgba(191, 155, 255, 0.18);
      }
      .topic-node text {
        fill: rgba(255,255,255,0.92);
        font-size: 11px;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        pointer-events: none;
      }
      .topic-node.interactive {
        cursor: pointer;
      }
      .topic-node.interactive rect {
        transition: transform 120ms ease, stroke-color 120ms ease, fill 120ms ease;
      }
      .topic-node.interactive:hover rect {
        stroke: rgba(100, 255, 186, 0.45);
        fill: rgba(100, 255, 186, 0.12);
      }
      .topic-node.active rect {
        stroke: rgba(100, 255, 186, 0.72);
        stroke-width: 2;
        fill: rgba(100, 255, 186, 0.16);
      }
      .topic-node.active text {
        fill: rgba(219, 255, 240, 0.98);
        font-weight: 700;
      }
      .compact-title {
        margin-top: 14px;
      }
      .shift-chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .shift-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 7px 10px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.03);
        font-size: 11px;
      }
      .shift-chip.up {
        border-color: rgba(100, 255, 186, 0.22);
        background: rgba(100, 255, 186, 0.08);
      }
      .shift-chip.down {
        border-color: rgba(255, 142, 167, 0.22);
        background: rgba(255, 142, 167, 0.08);
      }
      .shift-chip.flat {
        border-color: rgba(173,181,197,0.18);
        background: rgba(173,181,197,0.07);
      }
      .word-cloud {
        display: flex;
        flex-wrap: wrap;
        gap: 10px 12px;
        align-items: center;
        padding: 10px 4px 2px;
      }
      .word-cloud-token {
        appearance: none;
        border: 0;
        background: rgba(255,255,255,0.04);
        cursor: pointer;
        font: inherit;
        line-height: 1;
        color: rgba(255,255,255,0.9);
        padding: 4px 6px;
        border-radius: 10px;
        transition: transform 120ms ease, background 120ms ease, color 120ms ease;
      }
      .word-cloud-token:hover,
      .word-cloud-token:focus-visible {
        background: rgba(126, 231, 255, 0.12);
        color: rgba(219,255,240,0.98);
        transform: translateY(-1px);
        outline: none;
      }
      .word-cloud-token.weight-1 { font-size: 12px; opacity: 0.66; }
      .word-cloud-token.weight-2 { font-size: 14px; opacity: 0.74; }
      .word-cloud-token.weight-3 { font-size: 16px; opacity: 0.82; }
      .word-cloud-token.weight-4 { font-size: 20px; opacity: 0.9; }
      .word-cloud-token.weight-5 { font-size: 24px; opacity: 1; }
      .intervention-group-stack {
        display: grid;
        gap: 12px;
      }
      .intervention-group {
        display: grid;
        gap: 10px;
      }
      .intervention-group-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }
      .intervention-group-title {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }
      .intervention-group-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }
      .intervention-group-grid .running-board-grid {
        grid-template-columns: 1fr !important;
        max-height: none;
      }
      .intervention-group-grid .running-card,
      .intervention-group-grid .running-card.size-s,
      .intervention-group-grid .running-card.size-tiny,
      .intervention-group-grid .running-card.size-m,
      .intervention-group-grid .running-card.size-l {
        grid-column: span 1 !important;
        min-height: 148px !important;
        height: 148px !important;
      }
      .single-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 14px;
      }
      .timeline-stack {
        display: grid;
        gap: 12px;
      }
      .timeline-card {
        --timeline-border: rgba(255,255,255,0.06);
        --timeline-bg: rgba(255,255,255,0.032);
        --timeline-dot: rgba(126, 231, 255, 0.95);
        --timeline-dot-glow: rgba(126, 231, 255, 0.08);
        border-radius: 18px;
        border: 1px solid var(--timeline-border);
        background: linear-gradient(180deg, var(--timeline-bg), rgba(255,255,255,0.014));
        padding: 14px;
      }
      .timeline-card.phase-planning {
        --timeline-border: rgba(126, 231, 255, 0.14);
        --timeline-bg: rgba(36, 89, 122, 0.14);
        --timeline-dot: rgba(126, 231, 255, 0.95);
        --timeline-dot-glow: rgba(126, 231, 255, 0.08);
      }
      .timeline-card.phase-tooling {
        --timeline-border: rgba(255, 214, 107, 0.14);
        --timeline-bg: rgba(120, 76, 9, 0.14);
        --timeline-dot: rgba(255, 214, 107, 0.95);
        --timeline-dot-glow: rgba(255, 214, 107, 0.08);
      }
      .timeline-card.phase-editing {
        --timeline-border: rgba(84, 242, 176, 0.14);
        --timeline-bg: rgba(18, 73, 53, 0.14);
        --timeline-dot: rgba(84, 242, 176, 0.95);
        --timeline-dot-glow: rgba(84, 242, 176, 0.08);
      }
      .timeline-card.phase-testing {
        --timeline-border: rgba(196, 163, 255, 0.16);
        --timeline-bg: rgba(66, 43, 109, 0.14);
        --timeline-dot: rgba(196, 163, 255, 0.95);
        --timeline-dot-glow: rgba(196, 163, 255, 0.08);
      }
      .timeline-card.phase-waiting {
        --timeline-border: rgba(173, 181, 197, 0.16);
        --timeline-bg: rgba(58, 66, 80, 0.14);
        --timeline-dot: rgba(173, 181, 197, 0.95);
        --timeline-dot-glow: rgba(173, 181, 197, 0.08);
      }
      .timeline-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        margin-bottom: 10px;
      }
      .timeline-title-wrap {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .timeline-phase-art {
        width: 18px;
        height: 18px;
        object-fit: contain;
        flex: 0 0 auto;
        filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.22));
      }
      .timeline-title {
        font-size: 14px;
        font-weight: 700;
      }
      .timeline-events {
        display: grid;
        gap: 10px;
      }
      .timeline-event {
        display: grid;
        grid-template-columns: 16px minmax(0, 1fr);
        gap: 10px;
        align-items: start;
      }
      .timeline-dot {
        width: 10px;
        height: 10px;
        margin-top: 4px;
        border-radius: 999px;
        background: var(--timeline-dot);
        box-shadow: 0 0 0 4px var(--timeline-dot-glow);
      }
      .timeline-dot.complete {
        background: rgba(75, 255, 181, 0.95);
        box-shadow: 0 0 0 4px rgba(75, 255, 181, 0.08);
      }
      .timeline-event-body {
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(126, 231, 255, 0.06);
      }
      .timeline-event:last-child .timeline-event-body {
        border-bottom: none;
        padding-bottom: 0;
      }
      .timeline-event-head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
        margin-bottom: 4px;
      }
      .timeline-event-title {
        font-size: 12px;
        font-weight: 700;
      }
      .timeline-event-copy {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.45;
      }
      .split-grid {
        display: grid;
        grid-template-columns: minmax(320px, 0.92fr) minmax(0, 1.08fr);
        gap: 14px;
      }
      .right-panel {
        padding: 0;
        overflow: hidden;
      }
      .subtabs {
        display: flex;
        gap: 8px;
        padding: 14px 14px 0 14px;
        border-bottom: 1px solid rgba(126, 231, 255, 0.08);
        background: linear-gradient(180deg, rgba(12, 23, 40, 0.5), rgba(10, 18, 32, 0));
      }
      .subtab {
        min-height: 34px;
        padding: 0 12px;
        border-radius: 12px 12px 0 0;
        border: 1px solid transparent;
        border-bottom-color: transparent;
        background: transparent;
        color: var(--muted);
        box-shadow: none;
        transform: none;
      }
      .subtab:hover {
        color: var(--text);
        background: rgba(16, 28, 48, 0.52);
        box-shadow: none;
      }
      .subtab.active {
        background: rgba(13, 24, 42, 0.9);
        color: var(--text);
        border-color: rgba(126, 231, 255, 0.1);
      }
      .subpane-wrap {
        padding: 14px;
      }
      .spotlight-grid {
        display: grid;
        gap: 14px;
      }
      .spotlight-hero {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
        gap: 16px;
        padding: 16px;
        border-radius: 18px;
        border: 1px solid rgba(126, 231, 255, 0.08);
        background: linear-gradient(180deg, rgba(9, 17, 28, 0.96), rgba(4, 8, 14, 0.98));
      }
      .spotlight-summary {
        display: grid;
        gap: 14px;
        min-width: 0;
      }
      .spotlight-action-panel {
        display: grid;
        align-content: start;
        gap: 10px;
        padding: 14px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        background: rgba(255, 255, 255, 0.025);
      }
      .spotlight-action-title {
        color: var(--muted);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .spotlight-action-group {
        display: grid;
        gap: 8px;
      }
      .spotlight-action-group + .spotlight-action-group {
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
      }
      .spotlight-action-group-title {
        color: var(--muted-soft);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      .spotlight-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }
      .spotlight-head {
        display: grid;
        gap: 8px;
        min-width: 0;
      }
      .spotlight-title {
        margin: 0;
        font-size: clamp(24px, 3vw, 34px);
        font-weight: 800;
        line-height: 1.08;
        letter-spacing: -0.035em;
        word-break: break-word;
      }
      .spotlight-copy {
        color: var(--muted);
        line-height: 1.55;
        word-break: break-word;
      }
      .spotlight-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
        align-content: flex-start;
      }
      .spotlight-actions .chip {
        white-space: nowrap;
      }
      .spotlight-metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      .spotlight-stat {
        border-radius: 14px;
        border: 1px solid rgba(126, 231, 255, 0.08);
        background: rgba(3, 7, 13, 0.98);
        padding: 12px;
      }
      .spotlight-stat-label {
        color: var(--muted);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .spotlight-stat-value {
        margin-top: 6px;
        font-size: 15px;
        font-weight: 700;
      }
      .spotlight-log-cue {
        margin-top: 12px;
        padding: 12px;
        border-radius: 14px;
        border: 1px solid rgba(126, 231, 255, 0.08);
        background: rgba(3, 7, 13, 0.98);
        display: grid;
        gap: 6px;
      }
      .spotlight-log-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      }
      .spotlight-log-title {
        color: var(--text);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .spotlight-log-meta {
        color: var(--muted);
        font-size: 11px;
      }
      .spotlight-log-copy {
        color: var(--muted-soft);
        font-size: 12px;
        line-height: 1.45;
      }
      @media (max-width: 860px) {
        .spotlight-hero {
          grid-template-columns: 1fr;
        }
        .spotlight-metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 620px) {
        .spotlight-metrics {
          grid-template-columns: 1fr;
        }
      }
      .memory-shell-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
      }
      .memory-shell-card {
        --memory-border: rgba(255,255,255,0.08);
        --memory-bg: rgba(255,255,255,0.03);
        --memory-pill: rgba(255,255,255,0.08);
        border: 1px solid var(--memory-border);
        border-radius: 18px;
        background: linear-gradient(180deg, var(--memory-bg), rgba(255,255,255,0.018));
        padding: 14px;
        display: grid;
        gap: 10px;
      }
      .memory-shell-card.type-prompt {
        --memory-border: rgba(126, 231, 255, 0.16);
        --memory-bg: rgba(36, 89, 122, 0.14);
        --memory-pill: rgba(126, 231, 255, 0.16);
      }
      .memory-shell-card.type-rule {
        --memory-border: rgba(255, 214, 107, 0.16);
        --memory-bg: rgba(120, 76, 9, 0.14);
        --memory-pill: rgba(255, 214, 107, 0.16);
      }
      .memory-shell-card.type-memo {
        --memory-border: rgba(84, 242, 176, 0.16);
        --memory-bg: rgba(18, 73, 53, 0.14);
        --memory-pill: rgba(84, 242, 176, 0.16);
      }
      .memory-shell-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .memory-shell-kicker {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        padding: 0 8px;
        border-radius: 999px;
        background: var(--memory-pill);
        color: var(--text-strong);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .memory-shell-title {
        font-size: 14px;
        font-weight: 800;
        color: var(--text-strong);
      }
      .memory-shell-copy {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.55;
      }
      .memory-shell-meta {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .subpane {
        display: none;
        animation: fadePane 160ms ease;
      }
      .subpane.active {
        display: block;
      }
      @keyframes fadePane {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .section-title {
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }
      .running-row, .thread-row {
        padding: 10px;
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,0.06);
        background: rgba(255,255,255,0.024);
        margin-bottom: 8px;
        transition: border-color 140ms ease, background 140ms ease, transform 140ms ease, box-shadow 140ms ease;
      }
      .running-row:hover, .thread-row:hover {
        border-color: rgba(124, 157, 255, 0.22);
        background: rgba(255,255,255,0.042);
        transform: translateY(-1px);
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.2);
      }
      .running-row {
        position: relative;
        overflow: hidden;
      }
      .running-row::after {
        content: "";
        position: absolute;
        left: 14px;
        right: 14px;
        bottom: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(126, 231, 255, 0.28), transparent);
      }
      .thread-row.active {
        border-color: rgba(255,255,255,0.06);
        box-shadow: none;
      }
      .thread-row.codex-open,
      .running-row.codex-open {
        border-color: rgba(126, 231, 255, 0.2);
        background:
          radial-gradient(circle at 96% 20%, rgba(126, 231, 255, 0.08), transparent 32%),
          rgba(255,255,255,0.032);
        box-shadow: inset 0 0 0 1px rgba(120, 170, 255, 0.1), -3px 0 0 rgba(126, 231, 255, 0.36);
      }
      .thread-row.codex-focused,
      .running-row.codex-focused {
        border-color: rgba(185, 152, 255, 0.24);
        box-shadow:
          inset 0 0 0 1px rgba(185, 152, 255, 0.12),
          0 0 0 1px rgba(185, 152, 255, 0.05);
      }
      .thread-row.selected {
        border-color: rgba(255, 214, 107, 0.3);
        box-shadow: inset 0 0 0 1px rgba(255, 214, 107, 0.14), -3px 0 0 rgba(255, 214, 107, 0.52);
      }
      .progress-head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
        margin-top: 10px;
      }
      .progress-label {
        color: var(--muted);
        font-size: 11px;
      }
      .progress-value {
        color: var(--text);
        font-size: 11px;
        font-weight: 700;
      }
      .progress-track {
        margin-top: 6px;
        height: 7px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.05);
        overflow: hidden;
      }
      .progress-bar {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, rgba(126, 231, 255, 0.92), rgba(75, 255, 181, 0.92));
        position: relative;
        overflow: hidden;
      }
      .running-card .progress-bar {
        background: var(--card-band);
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
        transition: width 220ms ease, background 220ms ease;
      }
      .progress-bar::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent);
        animation: progressSweep 1.8s linear infinite;
      }
      @keyframes progressSweep {
        from { transform: translateX(-100%); }
        to { transform: translateX(220%); }
      }
      .progress-note {
        margin-top: 8px;
        color: var(--muted-soft);
        font-size: 11px;
        line-height: 1.4;
      }
      .row-head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 24px;
        padding: 0 10px;
        box-sizing: border-box;
        border-radius: 999px;
        border: 1px solid rgba(126, 231, 255, 0.16);
        color: var(--cyan);
        font-size: 11px;
        line-height: 1;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .badge-running { color: var(--green); border-color: rgba(75, 255, 181, 0.18); }
      .badge-recent { color: var(--gold); border-color: rgba(255, 214, 107, 0.18); }
      .badge-linked {
        color: #b7d6ff;
        border-color: rgba(120, 170, 255, 0.24);
        background: rgba(40, 77, 134, 0.12);
      }
      .badge-attached {
        color: #f2c27b;
        border-color: rgba(242, 194, 123, 0.22);
        background: rgba(116, 78, 22, 0.16);
      }
      .badge-board {
        color: #f2c27b;
        border-color: rgba(242, 194, 123, 0.22);
        background: rgba(116, 78, 22, 0.16);
      }
      .running-card .badge {
        border-color: var(--card-accent-border);
        color: var(--text-strong);
        background: rgba(255, 255, 255, 0.04);
      }
      .running-card .badge-running {
        color: #d6ffee;
        background: rgba(84, 242, 176, 0.08);
      }
      .running-card.running-live .badge-running {
        animation: runningBadgePulse 1.45s ease-in-out infinite;
        box-shadow: 0 0 0 1px rgba(84, 242, 176, 0.12), 0 0 14px rgba(84, 242, 176, 0.12);
      }
      .running-card .badge-recent {
        color: #ffe6b3;
        background: rgba(255, 214, 107, 0.08);
      }
      .running-card .badge-linked {
        color: #d7e6ff;
        background: rgba(80, 110, 180, 0.14);
      }
      .running-card .badge-attached {
        color: #ffe0a8;
        background: rgba(116, 78, 22, 0.18);
      }
      .badge-intervention {
        color: #ffd7dd;
        border-color: rgba(255, 143, 159, 0.26);
        background: rgba(122, 24, 40, 0.18);
      }
      @keyframes runningBadgePulse {
        0% { opacity: 0.72; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.04); }
        100% { opacity: 0.72; transform: scale(1); }
      }
      .badge-codex-open {
        color: var(--blue);
        border-color: rgba(120, 170, 255, 0.24);
        background: rgba(40, 77, 134, 0.16);
      }
      .badge-codex-sidebar {
        color: #c9f7ff;
        border-color: rgba(126, 231, 255, 0.28);
        background: rgba(21, 74, 96, 0.2);
        box-shadow: inset 0 0 0 1px rgba(126, 231, 255, 0.08);
      }
      .badge-codex-focused {
        color: #d8c4ff;
        border-color: rgba(185, 152, 255, 0.34);
        background: rgba(80, 54, 138, 0.22);
        box-shadow: inset 0 0 0 1px rgba(185, 152, 255, 0.12);
      }
      .badge-codex-linking {
        color: #aee9ff;
        border-color: rgba(126, 231, 255, 0.3);
        background: rgba(30, 90, 120, 0.18);
      }
      .thread-title {
        margin-top: 6px;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.35;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .thread-topline {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        align-items: start;
      }
      .thread-status-cluster {
        min-width: 0;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }
      .thread-actions-inline {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
        justify-content: flex-end;
        max-width: min(100%, 520px);
      }
      .thread-updated {
        min-height: 24px;
        display: inline-flex;
        align-items: center;
        color: var(--muted-soft);
        white-space: nowrap;
        font-size: 11px;
      }
      .select-btn {
        min-height: 24px;
        min-width: 24px;
        padding: 0;
        border-radius: 8px;
        font-size: 11px;
        background: rgba(8, 18, 34, 0.7);
        border-color: rgba(126, 231, 255, 0.12);
        color: var(--muted);
      }
      .select-btn.selected {
        color: var(--gold);
        border-color: rgba(255, 214, 107, 0.32);
        background: rgba(255, 214, 107, 0.08);
      }
      .pin-btn {
        min-height: 24px;
        min-width: 48px;
        padding: 0 8px;
        font-size: 11px;
        background: transparent;
        border-color: rgba(126, 231, 255, 0.1);
        color: var(--muted);
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .mini-action-btn {
        min-height: 24px;
        min-width: 48px;
        padding: 0 9px;
        font-size: 11px;
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
      .mini-action-btn.inspector {
        color: #e9dcff;
        border-color: rgba(196, 163, 255, 0.36);
        background: rgba(80, 54, 138, 0.22);
        font-weight: 700;
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
      .group-label-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--group-accent) 72%, transparent);
        box-shadow: 0 0 10px color-mix(in srgb, var(--group-accent) 16%, transparent);
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
      }
      .chat.user {
        border-color: rgba(255, 214, 107, 0.16);
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
      .footer-note {
        color: var(--muted);
        font-size: 12px;
      }
      .thread-list-compact .thread-row { cursor: pointer; }
      .running-board-shell {
        display: grid;
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
      }
      .board-stage {
        min-height: 560px;
      }
      .board-stage .running-board-grid {
        min-height: 520px;
        max-height: calc(100vh - 220px);
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
        gap: 10px;
        padding: 14px;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.07);
        background:
          radial-gradient(circle at top right, rgba(124, 157, 255, 0.14), transparent 34%),
          linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.018));
        box-shadow: 0 18px 40px rgba(0,0,0,0.26);
        transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease, background 140ms ease;
        cursor: pointer;
        overflow: hidden;
        position: relative;
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
        min-width: max-content;
      }
      .running-card.compact-card .compact-card-title {
        font-size: 16px;
        font-weight: 800;
        line-height: 1.35;
        color: var(--text-strong);
        display: -webkit-box;
        -webkit-line-clamp: 4;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .running-card.compact-card .running-card-top {
        grid-template-columns: 1fr;
        gap: 6px;
      }
      .running-card.compact-card .running-card-top .running-card-control:last-child {
        display: none;
      }
      .running-card.compact-card .running-card-body {
        gap: 6px;
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
        min-height: 214px;
      }
      .running-card.size-s .running-card-title {
        font-size: 18px;
        line-height: 1.28;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
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
      .running-card.size-m { grid-column: span 7; min-height: 242px; }
      .running-card.size-m .running-card-title {
        font-size: 22px;
        line-height: 1.2;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
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
        min-height: 282px;
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
        font-size: 28px;
        line-height: 1.12;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
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
        --phase-border: rgba(196, 163, 255, 0.16);
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
        left: 18px;
        right: 18px;
        height: 4px;
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
          radial-gradient(circle at top right, rgba(242, 194, 123, 0.12), transparent 34%),
          linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.018));
      }
      .running-card.pinned-card {
        border-color: rgba(255, 212, 121, 0.26);
        background:
          radial-gradient(circle at top right, rgba(255, 212, 121, 0.14), transparent 34%),
          linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.018));
      }
      .running-card.running-live {
        --card-band: linear-gradient(90deg, rgba(84, 242, 176, 0.92), rgba(121, 237, 210, 0.82), rgba(141, 216, 255, 0.72));
        --card-band-glow: rgba(84, 242, 176, 0.18);
        --card-accent-border: rgba(95, 219, 175, 0.22);
        --card-active-glow: rgba(84, 242, 176, 0.08);
      }
      .running-card.board-attached {
        --card-band: linear-gradient(90deg, rgba(242, 194, 123, 0.92), rgba(255, 225, 171, 0.84), rgba(222, 186, 133, 0.7));
        --card-band-glow: rgba(242, 194, 123, 0.16);
        --card-accent-border: rgba(242, 194, 123, 0.22);
        --card-active-glow: rgba(242, 194, 123, 0.07);
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
        100% { opacity: 0.7; transform: scaleX(1); }
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
        justify-content: flex-end;
        gap: 6px;
        max-width: 100%;
        min-width: 0;
        flex-wrap: nowrap;
        justify-self: end;
        margin: -8px 0 -2px auto;
        padding: 3px;
        border-radius: 999px;
        border: 1px solid rgba(141, 216, 255, 0.14);
        background:
          linear-gradient(180deg, rgba(13, 20, 31, 0.94), rgba(7, 10, 16, 0.9));
        box-shadow: 0 10px 22px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.04);
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
        min-height: 24px;
        padding: 0 8px;
        border-radius: 10px;
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
      .tool-id {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        padding: 0 8px;
        border-radius: 10px;
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
      button.meta-pill {
        appearance: none;
        background: rgba(255,255,255,0.04);
        cursor: pointer;
        font: inherit;
        line-height: 1;
      }
      button.meta-pill:hover,
      button.meta-pill:focus-visible {
        border-color: rgba(126, 231, 255, 0.26);
        color: var(--text);
        outline: none;
      }
      button.meta-pill.active {
        border-color: rgba(126, 231, 255, 0.34);
        background: rgba(126, 231, 255, 0.12);
        color: rgba(219,255,240,0.98);
      }
      .copy-thread-id {
        max-width: 220px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        cursor: copy;
        border-color: rgba(126, 231, 255, 0.14);
        background: rgba(126, 231, 255, 0.055);
        color: #b8d9e8;
      }
      .copy-thread-id:hover,
      .copy-thread-id:focus-visible {
        border-color: rgba(126, 231, 255, 0.34);
        background: rgba(126, 231, 255, 0.12);
        color: var(--text-strong);
      }
      .copy-thread-id.tool-id {
        justify-content: center;
        font: inherit;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .drawer-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(4, 10, 20, 0.56);
        opacity: 0;
        pointer-events: none;
        transition: opacity 160ms ease;
      }
      .drawer-backdrop.open {
        opacity: 1;
        pointer-events: auto;
      }
      .drawer {
        position: fixed;
        top: 0;
        right: 0;
        width: min(500px, 94vw);
        height: 100vh;
        background:
          radial-gradient(circle at top right, rgba(120, 170, 255, 0.08), transparent 28%),
          linear-gradient(180deg, rgba(9, 16, 29, 0.98), rgba(6, 12, 23, 0.99));
        border-left: 1px solid rgba(126, 231, 255, 0.12);
        box-shadow: -20px 0 60px rgba(0, 0, 0, 0.32);
        transform: translateX(100%);
        transition: transform 180ms ease;
        display: grid;
        grid-template-rows: auto auto 1fr;
        z-index: 40;
      }
      .drawer.open { transform: translateX(0); }
      .drawer-head {
        padding: 12px 14px 10px 14px;
        border-bottom: 1px solid rgba(126, 231, 255, 0.08);
        display: grid;
        gap: 8px;
      }
      .drawer-kicker {
        color: #6f8fba;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      .drawer-topline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .drawer-title {
        font-size: 14px;
        font-weight: 800;
        line-height: 1.2;
      }
      .drawer-close {
        min-height: 24px;
        padding: 0 8px;
      }
      .drawer-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .drawer-summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
      }
      .drawer-stat {
        border: 1px solid rgba(126, 231, 255, 0.08);
        border-radius: 12px;
        background: rgba(8, 15, 28, 0.7);
        padding: 8px;
      }
      .drawer-stat-label {
        color: var(--muted);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .drawer-stat-value {
        margin-top: 4px;
        font-size: 12px;
        font-weight: 700;
      }
      .action-rail {
        padding: 10px 14px;
        border-bottom: 1px solid rgba(126, 231, 255, 0.08);
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }
      .action-rail.confirm {
        background:
          linear-gradient(180deg, rgba(30, 20, 5, 0.26), rgba(9, 16, 29, 0.02)),
          rgba(8, 15, 28, 0.32);
        box-shadow: inset 0 -1px 0 rgba(255, 214, 107, 0.08);
      }
      .action-rail.confirm.danger {
        background:
          linear-gradient(180deg, rgba(47, 11, 17, 0.3), rgba(9, 16, 29, 0.02)),
          rgba(8, 15, 28, 0.32);
        box-shadow: inset 0 -1px 0 rgba(255, 124, 136, 0.1);
      }
      .action-btn {
        min-height: 30px;
        padding: 0 12px;
        transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease, background 120ms ease;
      }
      .action-btn.with-icon {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .action-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.16);
      }
      .action-btn:active {
        transform: translateY(0);
        box-shadow: inset 0 0 0 1px rgba(126, 231, 255, 0.08);
      }
      .action-btn:hover .icon-badge {
        border-color: rgba(126, 231, 255, 0.28);
      }
      .action-btn.warn:hover .icon-badge.warn {
        border-color: rgba(255, 214, 107, 0.34);
      }
      .action-btn.danger:hover .icon-badge.danger {
        border-color: rgba(255, 124, 136, 0.34);
      }
      .action-btn.secondary {
        background: rgba(15, 24, 39, 0.86);
      }
      .action-btn.danger {
        border-color: rgba(255, 124, 136, 0.26);
        background: rgba(122, 24, 40, 0.2);
        color: #ffd9dd;
      }
      .action-btn.warn {
        border-color: rgba(255, 214, 107, 0.28);
        background: rgba(120, 76, 9, 0.18);
        color: #ffeab0;
      }
      .action-status {
        color: var(--muted);
        font-size: 12px;
        margin-left: auto;
      }
      .icon-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        border-radius: 999px;
        border: 1px solid rgba(126, 231, 255, 0.16);
        background: rgba(10, 20, 36, 0.9);
        color: #9dc4ff;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.06em;
        line-height: 1;
        box-shadow: inset 0 0 0 1px rgba(126, 231, 255, 0.04);
        transition: border-color 120ms ease, background 120ms ease, transform 120ms ease;
      }
      .icon-badge.warn {
        border-color: rgba(255, 214, 107, 0.24);
        background: rgba(120, 76, 9, 0.18);
        color: #ffeab0;
      }
      .icon-badge.danger {
        border-color: rgba(255, 124, 136, 0.24);
        background: rgba(122, 24, 40, 0.18);
        color: #ffd9dd;
      }
      .cmd-grid {
        display: grid;
        gap: 10px;
      }
      .cmd-card {
        border: 1px solid rgba(126, 231, 255, 0.08);
        border-radius: 12px;
        background: rgba(5, 13, 25, 0.42);
        padding: 10px;
        transition: border-color 140ms ease, transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
      }
      .cmd-card.unavailable {
        border-style: dashed;
        background: rgba(7, 14, 26, 0.38);
      }
      .cmd-card:hover {
        border-color: rgba(120, 170, 255, 0.18);
        background: rgba(8, 18, 34, 0.72);
        transform: translateY(-1px);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.16);
      }
      .cmd-card:active {
        transform: translateY(0);
        box-shadow: inset 0 0 0 1px rgba(126, 231, 255, 0.06);
      }
      .cmd-card:hover .icon-badge {
        transform: translateY(-1px);
      }
      .cmd-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      .cmd-headline {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .cmd-name {
        font-size: 12px;
        font-weight: 700;
      }
      .cmd-subhead {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 8px;
      }
      .cmd-hint {
        color: var(--muted);
        font-size: 11px;
      }
      .cmd-feedback {
        border-radius: 999px;
        border: 1px solid rgba(126, 231, 255, 0.14);
        background: rgba(10, 20, 36, 0.7);
        color: #a5c6f7;
        padding: 2px 8px;
        font-size: 11px;
        letter-spacing: 0.04em;
      }
      .cmd-feedback.success {
        border-color: rgba(75, 255, 181, 0.2);
        background: rgba(18, 73, 53, 0.24);
        color: #b8ffde;
      }
      .cmd-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 8px;
      }
      .drawer-scroll {
        overflow: auto;
        padding: 14px 18px 24px 18px;
        display: grid;
        gap: 14px;
      }
      .drawer-section {
        border: 1px solid rgba(126, 231, 255, 0.08);
        background: rgba(9, 17, 31, 0.78);
        border-radius: 16px;
        padding: 14px;
      }
      .drawer-section h4 {
        margin: 0 0 8px 0;
      }
      .section-heading {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }
      .kv-grid {
        display: grid;
        gap: 8px;
      }
      .kv {
        display: grid;
        gap: 4px;
      }
      .kv-label {
        color: var(--muted);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .kv-value {
        color: var(--text);
        font-size: 12px;
        line-height: 1.45;
        word-break: break-word;
      }
      .code-line {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
        color: var(--text);
        background: rgba(5, 13, 25, 0.8);
        border: 1px solid rgba(126, 231, 255, 0.08);
        border-radius: 10px;
        padding: 10px;
        word-break: break-all;
        transition: border-color 140ms ease, background 140ms ease;
      }
      .code-line.empty {
        color: #6e87aa;
        border-style: dashed;
      }
      .cmd-card:hover .code-line {
        border-color: rgba(120, 170, 255, 0.18);
        background: rgba(6, 15, 28, 0.92);
      }
      .cmd-card button[disabled] {
        opacity: 0.45;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
      .drawer-log {
        border-top: 1px solid rgba(126, 231, 255, 0.06);
        padding: 8px 0;
      }
      .drawer-log:first-child { border-top: none; padding-top: 0; }
      @media (max-width: 960px) {
        .meta-grid, .main-grid, .overview-grid, .overview-digest, .split-grid, .spotlight-metrics, .summary-deck {
          grid-template-columns: 1fr;
        }
        .boot-stage-row {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .thread-overview-grid {
          grid-template-columns: 1fr;
        }
        .agent-task-summary-grid {
          grid-template-columns: 1fr;
          grid-template-areas:
            "thread"
            "board"
            "tabs"
            "coordination";
        }
        .coordination-summary-card .digest-rail {
          grid-template-columns: 1fr;
        }
        .toolbar {
          grid-template-columns: 1fr;
        }
        .thread-explorer-head {
          grid-template-columns: 1fr;
          grid-template-areas:
            "search"
            "actions";
          align-items: start;
        }
        .thread-explorer-search {
          justify-self: stretch;
          max-width: 100%;
        }
        .thread-search-sort-row {
          flex-direction: column;
          align-items: stretch;
        }
        .thread-search-sort-row .thread-explorer-search {
          flex-basis: auto;
          max-width: 100%;
        }
        .thread-toolbar-primary {
          justify-self: start;
        }
        .thread-toolbar-actions {
          justify-content: flex-start;
        }
        .thread-control-row {
          grid-template-columns: 1fr;
        }
        .thread-control-row .batch-bar {
          justify-content: flex-start;
          border-radius: 14px;
        }
        .board-action-row {
          align-items: flex-start;
        }
        .board-action-status {
          text-align: left;
          max-width: 100%;
        }
        .thread-topline {
          grid-template-columns: 1fr;
        }
        .thread-actions-inline {
          justify-content: flex-start;
          max-width: 100%;
        }
        .spotlight-grid {
          grid-template-columns: 1fr;
        }
        .topbar-nav {
          align-items: center;
          flex-wrap: wrap;
        }
        .topbar-status-row,
        .topbar-status-left,
        .topbar-nav-left,
        .topbar-nav-right,
        .actions,
        .workspace-tabs {
          flex-wrap: wrap;
          min-width: 0;
        }
        .running-board-grid {
          grid-template-columns: repeat(6, minmax(0, 1fr));
        }
        .running-card,
        .running-card.size-s,
        .running-card.size-tiny,
        .running-card.size-m,
        .running-card.size-l {
          grid-column: span 3;
        }
      }
      @media (max-width: 680px) {
        body { padding: 10px 10px 236px 10px; }
        .boot-loader-head {
          display: grid;
        }
        .boot-visual {
          justify-content: flex-start;
        }
        .boot-percent {
          text-align: left;
        }
        .boot-stage-row {
          grid-template-columns: 1fr;
        }
        .running-board-grid {
          grid-template-columns: 1fr;
        }
        .running-card,
        .running-card.size-s,
        .running-card.size-tiny,
        .running-card.size-m,
        .running-card.size-l {
          grid-column: span 1;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <section class="panel">
        <div class="topbar">
          <div class="topbar-status-row">
            <div class="topbar-status-left">
              <div class="hero-kicker">Agent Control Surface</div>
              <span class="hero-pill mono" id="serviceMeta">Hydrating dashboard…</span>
              <div class="sub" id="heroSummary">Loading the Codex-Managed-Agent workspace state inside VS Code.</div>
            </div>
          </div>
          <div class="topbar-nav">
            <div class="topbar-nav-left">
              <div class="workspace-tabs">
                <button class="workspace-tab active" data-view="overview" type="button">Overview</button>
                <button class="workspace-tab" data-view="threads" type="button">Threads</button>
                <button class="workspace-tab" data-view="board" type="button">Board</button>
                <button class="workspace-tab" data-view="loop" type="button">Loop</button>
                <button class="workspace-tab" data-view="insights" type="button">Insights</button>
                <button class="workspace-tab" data-view="live" type="button">Live</button>
              </div>
            </div>
            <div class="topbar-nav-right actions">
              <div class="surface-toggle-group header-control">
                <span class="header-control-label">Open</span>
                <div class="chip-row">
                  <a class="chip" data-command-direct="true" href="command:codexAgent.openPanel">Open Editor</a>
                </div>
              </div>
              <details class="service-menu" id="serviceMenu">
                <summary class="chip service-summary header-control"><span class="header-control-label">Service</span><span class="header-control-value">Actions</span></summary>
                <div class="service-panel">
                  <a id="reloadLink" class="chip" data-close-chrome-menu="serviceMenu" data-command-direct="true" href="command:codexAgent.refreshPanel">Reload</a>
                  <a id="startServerLink" class="chip" data-close-chrome-menu="serviceMenu" data-command-direct="true" href="command:codexAgent.startServer">Start Server</a>
                  <a id="restartServerLink" class="chip service-restart" data-close-chrome-menu="serviceMenu" data-command-direct="true" href="command:codexAgent.restartServer" hidden>Restart Server</a>
                  <a id="externalLink" class="chip" data-close-chrome-menu="serviceMenu" data-command-direct="true" href="command:codexAgent.openExternal">Open Browser</a>
                </div>
              </details>
            </div>
          </div>
        </div>
        <div id="serviceBanner" class="service-banner visible hydrating">Hydrating dashboard. Progress is estimated until the first workspace payload arrives. <a class="chip" data-command-direct="true" href="command:codexAgent.refreshPanel">Reload</a> <a class="chip service-restart" data-command-direct="true" href="command:codexAgent.restartServer">Restart Server</a></div>
      </section>
      <section id="completionRail" class="completion-rail"></section>

      <section class="workspace-pane active" data-workspace-pane="overview">
        <section class="overview-digest">
          <div class="panel agent-task-summary-panel">
            <div class="running-board-toolbar">
              <div class="running-board-title">
                <div class="board-icon"><img class="board-icon-vivid theme-is-optional" src="${media.board}" alt="" /><span class="theme-bar board-icon-clean variant-hero phase-tooling" aria-hidden="true"></span></div>
                <div>
                  <div class="section-title">Agent Task Summary</div>
                  <div class="running-board-copy" id="runningBoardMeta">Thread, board, and coordination signals stay visible before you dive into the explorer.</div>
                </div>
              </div>
              <div class="chip-row">
                <button class="chip" data-open-board-view="true" type="button">Open Board</button>
                <button class="chip" id="saveLayoutPrimary" type="button">Save Layout</button>
                <span class="action-status" id="saveLayoutStatus"></span>
              </div>
            </div>
            <div class="agent-task-summary-grid">
              <div class="panel agent-task-summary-card thread-summary-card">
                <div class="section-title">Thread Summary</div>
                <div id="threadCountSummaryStats" class="drawer-summary"></div>
              </div>
              <div class="panel agent-task-summary-card board-summary-card">
                <div class="section-title">Board Summary</div>
                <div class="section-note" id="boardSummaryHeadline">No cards yet.</div>
                <div id="boardSummaryStats" class="drawer-summary"></div>
              </div>
              <div class="panel agent-task-summary-card tab-management-card">
                <div class="section-title">Tab Management</div>
                <div class="section-note" id="tabManagementHeadline">Manual thread groups for board tabs.</div>
                <div id="tabManagementStats" class="drawer-summary"></div>
                <div id="tabManagementList" class="tab-management-list"></div>
                <div class="chip-row">
                  <button class="chip" data-create-board-tab="true" type="button">New Tab</button>
                  <button class="chip" data-open-board-view="true" type="button">Open Board</button>
                  <button class="chip" data-clear-thread-tab-filter="true" type="button">Clear Filter</button>
                </div>
              </div>
              <div class="panel agent-task-summary-card coordination-summary-card">
                <div class="section-title">Coordination Queue</div>
                <div class="section-note" id="boardSummaryNeedsHuman">No active handoffs right now.</div>
                <div id="boardSummaryQueue" class="digest-rail"></div>
              </div>
            </div>
          </div>
          <div class="panel">
            <div class="section-title">Overview Snapshot</div>
            <div class="section-note">Only the short headline for each workspace topic lives here, so this page stays lightweight.</div>
            <div class="summary-deck" id="overviewDigest">
              <div class="boot-loader" id="hydrationLoader" data-boot-stage="shell">
                <div class="boot-loader-head">
                  <div>
                    <div class="boot-kicker">Workspace hydrate</div>
                    <div class="boot-title" id="bootTitle">Connecting workspace</div>
                    <div class="boot-copy" id="bootCopy">Preparing the VS Code bridge and requesting the Codex-Managed-Agent dashboard state.</div>
                  </div>
                  <div class="boot-visual">
                    ${renderBootAnimatedIcon()}
                    <div class="boot-percent" id="bootPercent">12%</div>
                  </div>
                </div>
                <div class="boot-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="12" aria-label="Dashboard hydration progress">
                  <div class="boot-progress-bar" id="bootProgressBar" style="width: 12%"></div>
                </div>
                <div class="boot-stage-row">
                  <div class="boot-stage active" data-boot-stage="shell">Load shell</div>
                  <div class="boot-stage" data-boot-stage="bridge">Bind VS Code bridge</div>
                  <div class="boot-stage" data-boot-stage="state">Request host state</div>
                  <div class="boot-stage" data-boot-stage="hydrate">Hydrate dashboard</div>
                </div>
                <div class="boot-loader-actions">
                  <span class="boot-loader-note" id="bootNote">This progress is estimated until the host returns the first state payload.</span>
                  <span class="chip-row">
                    <a class="chip" data-command-direct="true" href="command:codexAgent.refreshPanel">Reload</a>
                    <a class="chip service-restart" data-command-direct="true" href="command:codexAgent.restartServer">Restart Server</a>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>


      <section class="workspace-pane" data-workspace-pane="threads">
        <section class="single-grid">
          <div class="panel thread-explorer-panel">
            <div class="thread-explorer-titlebar">
              <div class="section-title">Thread Explorer</div>
              <div class="section-note">Search, filter, pin, sort, and batch-manage the full workspace.</div>
            </div>
            <div class="page-summary-card thread-page-summary-card">
              <div class="section-title">Thread Summary</div>
              <div id="threadPageSummaryStats" class="drawer-summary"></div>
            </div>
            <div class="thread-explorer-head">
              <div class="thread-search-sort-row">
                <input id="threadSearchMirror" class="search thread-explorer-search" type="search" placeholder="Search title, id, cwd" />
                <div class="thread-sort-row" aria-label="Thread sort order">
                  <span class="sort-label">Sort</span>
                  <button class="chip" data-sort-mirror="updated" type="button">Updated</button>
                  <button class="chip" data-sort-mirror="oldest" type="button">Oldest</button>
                  <button class="chip" data-sort-mirror="created" type="button">Created</button>
                  <button class="chip" data-sort-mirror="name_asc" type="button">Name A-Z</button>
                  <button class="chip" data-sort-mirror="name_desc" type="button">Name Z-A</button>
                  <button class="chip" data-sort-mirror="tokens_desc" type="button">Tokens</button>
                </div>
              </div>
              <div class="thread-toolbar-actions thread-toolbar-primary">
                <button class="chip codex-sidebar-chip" id="codexSidebarButton" type="button">Codex</button>
                <button class="chip new-thread-chip" id="createThreadButton" type="button">New Thread</button>
                <button class="chip" id="refreshThreadsMirror" type="button">Refresh</button>
                <button class="chip" id="scanCodexSessionsMirror" type="button">Scan Sessions</button>
                <button class="chip" id="toggleThreadGroupsMirror" type="button">Collapse Groups</button>
              </div>
            </div>
            <div class="thread-filter-row">
                <button class="chip" data-filter-mirror="all" type="button">All</button>
                <button class="chip" data-filter-mirror="running" type="button">Running</button>
                <button class="chip" data-filter-mirror="recent" type="button">Recent</button>
                <button class="chip" data-filter-mirror="idle" type="button">Idle</button>
                <button class="chip" data-filter-mirror="needs_human" type="button">Needs Human</button>
                <button class="chip" data-filter-mirror="archived" type="button">Archived</button>
                <button class="chip" data-filter-mirror="soft_deleted" type="button">Deleted</button>
                <button class="chip" data-toggle-mirror="pinned" type="button">Pinned</button>
                <span id="threadTabFilterControl"></span>
            </div>
            <div class="thread-control-row">
              <div id="batchBarMirror" class="batch-bar"></div>
            </div>
            <div class="section-note" id="threadSummaryMirror">Showing running and recent threads first.</div>
            <div id="threadListMirror" class="thread-list-compact"></div>
          </div>
        </section>
      </section>

      ${renderBoardPane(media)}

      <section class="workspace-pane" data-workspace-pane="live">
        <section class="single-grid">
          <div class="panel">
            <div class="section-title">Live Agent Watch</div>
            <div class="section-note" id="runningSummaryMirror">Recent live agents and process status.</div>
            <div id="runningListMirror"></div>
          </div>
          <div class="panel">
            <div class="section-title">Live Timeline</div>
            <div class="section-note">Timeline of current log activity plus just-finished agents.</div>
            <div id="liveTimeline" class="timeline-stack"></div>
          </div>
        </section>
      </section>

      <section class="workspace-pane" data-workspace-pane="loop">
        <section class="loop-dashboard-shell">
          <div class="panel">
            <div class="section-title">Loop Daemons</div>
            <div class="section-note">See discovered codex-loop daemons across the current workspaces, then jump straight into logs or tmux without leaving the dashboard.</div>
            <div id="loopDaemonPage"></div>
          </div>
        </section>
      </section>

      <section class="workspace-pane" data-workspace-pane="insights">
        ${renderInsightsSections()}
      </section>
${renderDrawerShell()}
      <div class="overview-brand-footer is-font-0" id="overviewBrandFooter">
        <button class="brand-cycle-button" data-brand-cycle="true" type="button" aria-label="Cycle brand signature font">
          <div class="title-stack">
            <div class="title">
              <span class="title-seg codex">Codex</span>
              <span class="title-seg managed">Managed</span>
              <span class="title-seg agent">Agent</span>
              <span class="title-seg codex">Lab</span>
            </div>
            <div class="title-strip">Control Surface Signature</div>
          </div>
        </button>
      </div>
      <div class="floating-utility-bar" aria-label="Dashboard display controls">
        <button id="themeToggle" class="collapse-btn header-control header-toggle-btn" type="button">Theme: Vivid</button>
        <button id="motionToggle" class="collapse-btn header-control header-toggle-btn" type="button">Motion Off</button>
        <button id="soundToggle" class="collapse-btn header-control header-toggle-btn alert-toggle-btn" type="button">Alert: Plink</button>
      </div>
    </div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      let bootRetryTimer;
      let bootProgressTimer;
      let bootRetryCount = 0;
      const bootStartedAt = Date.now();
      const MEDIA = ${JSON.stringify(media)};
      const persisted = Object.assign({}, vscode.getState() || {}, ${JSON.stringify(initialPersistedState)});
      const state = {
        selectedThreadId: undefined,
        payload: undefined,
        currentSurface: "editor",
        debugStatus: "booting",
        bridgeBoundAt: undefined,
        stateReceivedAt: undefined,
        lastAutoScrolledFocusedThreadId: undefined,
        pendingScrollThreadId: undefined,
        draggedRunningThreadId: undefined,
        activeBoardId: undefined,
        dragPreviewEl: undefined,
        boardDragGhostEl: undefined,
        pointerBoardDrag: undefined,
        pendingBoardDragPointer: undefined,
        resizingRunningCard: undefined,
        runningDropIndicator: undefined,
        pendingDragIndicator: undefined,
        pendingDragPointer: undefined,
        dragMetricCache: undefined,
        lastDropOverlayKey: "",
        boardDragRaf: 0,
        dragRaf: 0,
        resizeRaf: 0,
        pendingResizeEvent: undefined,
        lastInterventionCount: 0,
        lastInsightsSnapshot: persisted.lastInsightsSnapshot || undefined,
        lastInsightsSource: persisted.lastInsightsSource || "live",
        lastInsightsCapturedAt: persisted.lastInsightsCapturedAt || undefined,
        seenCompletionIds: persisted.seenCompletionIds || {},
        ui: {
          currentView: persisted.currentView || "overview",
          boardSubView: persisted.boardSubView || "canvas",
          headerMode: persisted.headerMode || (persisted.headerCollapsed ? "collapsed" : "expanded"),
          themeMode: persisted.themeMode || "vivid",
          search: persisted.search || "",
          topicFocus: persisted.topicFocus || null,
          rootFilter: persisted.rootFilter || null,
          workspaceFilter: Boolean(persisted.workspaceFilter),
          threadTabFilter: normalizeBoardTabName(persisted.threadTabFilter) || "all",
          filter: persisted.filter || "all",
          sort: ["updated", "oldest", "created", "name_asc", "name_desc", "tokens_desc"].includes(persisted.sort) ? persisted.sort : "updated",
          pinnedOnly: Boolean(persisted.pinnedOnly),
          cardLabels: persisted.cardLabels || {},
          boardTabAssignments: persisted.boardTabAssignments || {},
          boardTabOrder: Array.isArray(persisted.boardTabOrder) ? persisted.boardTabOrder : [],
          activeBoardTab: persisted.activeBoardTab || "all",
          soundEnabled: persisted.soundEnabled !== false,
          soundStyle: persisted.soundStyle || "plink",
          motionMode: persisted.motionMode || (persisted.motionEnabled === true ? "full" : "quiet"),
          motionEnabled: persisted.motionEnabled === true,
          pinned: persisted.pinned || {},
          boardAttached: persisted.boardAttached || {},
          runningCardSizes: persisted.runningCardSizes || {},
          runningCardLayout: persisted.runningCardLayout || {},
          runningCardPositions: persisted.runningCardPositions || {},
          runningCardOrder: Array.isArray(persisted.runningCardOrder) ? persisted.runningCardOrder : [],
          layoutLocked: Boolean(persisted.layoutLocked),
          interventionCollapsed: Boolean(persisted.interventionCollapsed),
          selected: persisted.selected || {},
          pendingBatch: undefined,
          threadTabFilterMenuOpen: false,
          pendingDrawerAction: undefined,
          pendingCodexLink: {},
          commandFeedback: {},
          rightPaneTab: persisted.rightPaneTab || "console",
          drawerOpen: persisted.drawerOpen !== false,
          brandFontIndex: Number.isFinite(Number(persisted.brandFontIndex)) ? Math.max(0, Number(persisted.brandFontIndex) % 4) : 0,
          optimisticAutoContinueConfigs: {},
          groups: Object.assign({
            pinned: true,
            running: true,
            needs_human: true,
            linked: true,
            recent: true,
            idle: false,
            archived: false,
            soft_deleted: false
          }, persisted.groups || {}),
          loopPanelThreadId: undefined,
          loopDraftPrompt: "continue",
          loopDraftCount: "10",
          quickComposerThreadId: undefined,
          quickComposerDrafts: {},
          pendingPromptState: {},
          pendingLoopActions: {}
        }
      };

      function persistUi() {
        const nextState = {
          seenCompletionIds: state.seenCompletionIds,
          currentView: state.ui.currentView,
          boardSubView: state.ui.boardSubView,
          headerMode: state.ui.headerMode,
          themeMode: state.ui.themeMode,
          search: state.ui.search,
          topicFocus: state.ui.topicFocus,
          rootFilter: state.ui.rootFilter,
          workspaceFilter: state.ui.workspaceFilter,
          threadTabFilter: state.ui.threadTabFilter,
          filter: state.ui.filter,
          sort: state.ui.sort,
          pinnedOnly: state.ui.pinnedOnly,
          cardLabels: state.ui.cardLabels,
          boardTabAssignments: state.ui.boardTabAssignments,
          boardTabOrder: state.ui.boardTabOrder,
          activeBoardTab: state.ui.activeBoardTab,
          soundEnabled: state.ui.soundEnabled,
          soundStyle: state.ui.soundStyle,
          motionMode: state.ui.motionMode,
          motionEnabled: state.ui.motionMode === "full",
          pinned: state.ui.pinned,
          boardAttached: state.ui.boardAttached,
          runningCardSizes: state.ui.runningCardSizes,
          runningCardLayout: state.ui.runningCardLayout,
          runningCardPositions: state.ui.runningCardPositions,
          runningCardOrder: state.ui.runningCardOrder,
          layoutLocked: state.ui.layoutLocked,
          interventionCollapsed: state.ui.interventionCollapsed,
          selected: state.ui.selected,
          drawerOpen: state.ui.drawerOpen,
          brandFontIndex: state.ui.brandFontIndex,
          rightPaneTab: state.ui.rightPaneTab,
          groups: state.ui.groups,
          lastInsightsSnapshot: state.lastInsightsSnapshot,
          lastInsightsSource: state.lastInsightsSource,
          lastInsightsCapturedAt: state.lastInsightsCapturedAt
        };
        vscode.setState(nextState);
        vscode.postMessage({ type: "persistUiState", state: nextState });
      }

      function saveLayoutNow() {
        persistUi();
        setNodeText("saveLayoutStatus", "Saved " + formatTimestamp(new Date().toISOString()));
      }

      function notifyReady() {
        vscode.postMessage({ type: "ready" });
      }

      function setDebugStatus(nextStatus) {
        state.debugStatus = String(nextStatus || "booting");
      }

      function bootProgressMeta(failed = false) {
        if (failed) {
          return {
            percent: 92,
            activeStage: "hydrate",
            title: "Hydration needs attention",
            copy: "The webview is ready, but the host state has not arrived yet. Reload the panel or restart the local service.",
            note: "The progress bar pauses here because the first dashboard payload did not return.",
          };
        }
        const elapsedMs = Date.now() - bootStartedAt;
        const bridgeBound = Boolean(state.bridgeBoundAt);
        const retryProgress = Math.min(28, bootRetryCount * 6);
        const fastTimeProgress = Math.min(62, Math.floor(elapsedMs / 95));
        const slowTimeProgress = Math.min(12, Math.floor(Math.max(0, elapsedMs - 6000) / 900));
        const timeProgress = fastTimeProgress + slowTimeProgress;
        let percent = 18 + timeProgress + retryProgress;
        let activeStage = "shell";
        let title = "Loading control surface";
        let copy = "Building the dashboard shell inside VS Code.";
        let note = "This progress is estimated until the host returns the first state payload.";
        if (bridgeBound) {
          percent = Math.max(percent, 54);
          activeStage = "bridge";
          title = "Bridge connected";
          copy = "The webview bridge is live. Requesting workspace state from the extension host.";
        }
        if (bootRetryCount > 0) {
          percent = Math.max(percent, 78);
          activeStage = "state";
          title = "Requesting host state";
          copy = "Waiting for thread, board, and service data from Codex-Managed-Agent.";
          note = "Ready signal sent " + String(bootRetryCount) + " time" + (bootRetryCount === 1 ? "" : "s") + ".";
        }
        if (bootRetryCount >= 3) {
          percent = Math.max(percent, 88);
          activeStage = "hydrate";
          title = "Hydrating dashboard";
          copy = "Still waiting for the first state payload. Reload is available if this stalls.";
          note = "Keeping the UI responsive while the host finishes startup.";
        }
        return {
          percent: Math.min(94, percent),
          activeStage,
          title,
          copy,
          note,
        };
      }

      function updateBootProgress(failed = false) {
        const loader = byId("hydrationLoader");
        if (!loader || state.payload) return;
        const meta = bootProgressMeta(failed);
        applyBootProgressMeta(loader, meta, failed);
      }

      function applyBootProgressMeta(loader, meta, failed = false) {
        if (!loader || !meta) return;
        loader.classList.toggle("failed", Boolean(failed));
        loader.dataset.bootStage = meta.activeStage;
        setNodeText("bootTitle", meta.title);
        setNodeText("bootCopy", meta.copy);
        setNodeText("bootPercent", String(meta.percent) + "%");
        setNodeText("bootNote", meta.note);
        const bar = byId("bootProgressBar");
        if (bar) bar.style.width = String(meta.percent) + "%";
        const progress = loader.querySelector(".boot-progress");
        if (progress) progress.setAttribute("aria-valuenow", String(meta.percent));
        const stages = ["shell", "bridge", "state", "hydrate"];
        const activeIndex = stages.indexOf(meta.activeStage);
        loader.querySelectorAll(".boot-stage[data-boot-stage]").forEach((node) => {
          const index = stages.indexOf(node.dataset.bootStage || "");
          node.classList.toggle("done", index >= 0 && activeIndex >= 0 && index < activeIndex);
          node.classList.toggle("active", node.dataset.bootStage === meta.activeStage);
        });
      }

      function finishBootProgressBeforeRender() {
        const loader = byId("hydrationLoader");
        if (!loader) return;
        applyBootProgressMeta(loader, {
          percent: 96,
          activeStage: "hydrate",
          title: "Hydration complete",
          copy: "Workspace state received. Opening the dashboard.",
          note: "Rendering the live workspace view now.",
        }, false);
      }

      function startBootProgressLoop() {
        stopBootProgressLoop();
        updateBootProgress(false);
        bootProgressTimer = window.setInterval(() => updateBootProgress(false), 450);
      }

      function stopBootProgressLoop() {
        if (bootProgressTimer) {
          window.clearInterval(bootProgressTimer);
          bootProgressTimer = undefined;
        }
      }

      function showHydrationFailureNotice() {
        setDebugStatus("degraded");
        const bridgeBoundNote = state.bridgeBoundAt
          ? (' Last bridge bind: ' + formatTimestamp(state.bridgeBoundAt) + '.')
          : "";
        stopBootProgressLoop();
        updateBootProgress(true);
        setNodeHtml("serviceMeta",
          '<span class="health-dot bad"></span>' +
          esc("Hydration") +
          ' · ' +
          esc("Timed out"));
        setNodeText("heroSummary", "The webview loaded static HTML, but state hydration did not return." + bridgeBoundNote + " Use Reload or restart the local service to retry.");
        setNodeClassName("serviceBanner", "service-banner visible");
        setNodeHtml("serviceBanner",
          'Hydration failed: the panel did not receive state after repeated ready signals. ' +
          esc(bridgeBoundNote) +
          '<a class="chip" data-close-chrome-menu="serviceMenu" data-command-direct="true" href="command:codexAgent.refreshPanel">Reload</a> ' +
          '<a class="chip service-restart" data-close-chrome-menu="serviceMenu" data-command-direct="true" href="command:codexAgent.restartServer">Restart Server</a>');
      }

      function markPendingLoopAction(stateDir, action) {
        const key = String(stateDir || "").trim();
        if (!key) return;
        state.ui.pendingLoopActions[key] = {
          action: String(action || "").trim(),
          requestedAt: Date.now(),
        };
      }

      function reconcilePendingLoopActions(loopDaemons) {
        const next = {};
        const current = state.ui.pendingLoopActions || {};
        Object.entries(current).forEach(([stateDir, pending]) => {
          const daemon = (loopDaemons || []).find((item) => item && item.stateDir === stateDir);
          if (!daemon) return;
          const ageMs = Date.now() - Number(pending.requestedAt || 0);
          if (pending.action === "stop" && !daemon.running) return;
          if (pending.action === "start" && daemon.running) return;
          if (pending.action === "restart" && ageMs > 12000) return;
          next[stateDir] = pending;
        });
        state.ui.pendingLoopActions = next;
      }

      function applyBrandFooterStyle() {
        const footer = byId("overviewBrandFooter");
        if (!footer) return;
        const index = Number.isFinite(Number(state.ui.brandFontIndex)) ? Math.max(0, Number(state.ui.brandFontIndex) % 4) : 0;
        footer.classList.remove("is-font-0", "is-font-1", "is-font-2", "is-font-3");
        footer.classList.add("is-font-" + index);
      }

      function cycleBrandFooterStyle() {
        state.ui.brandFontIndex = (Number(state.ui.brandFontIndex) + 1) % 4;
        applyBrandFooterStyle();
        persistUi();
      }

      function pendingPromptMeta(threadId) {
        if (!threadId) return undefined;
        return state.ui.pendingPromptState[threadId];
      }

      function autoContinueConfigFor(threadId) {
        if (!threadId) return undefined;
        const optimistic = state.ui.optimisticAutoContinueConfigs[threadId];
        if (optimistic !== undefined) return optimistic || undefined;
        return ((state.payload && state.payload.autoContinueConfigs) || {})[threadId];
      }

      function syncOptimisticAutoContinueState(hostConfigs) {
        state.ui.optimisticAutoContinueConfigs = Object.assign({}, hostConfigs || {});
      }

      function patchAutoContinueState(threadId, config) {
        if (!threadId) return;
        if (!config) {
          delete state.ui.optimisticAutoContinueConfigs[threadId];
          return;
        }
        state.ui.optimisticAutoContinueConfigs[threadId] = config;
      }

      function patchCodexTabProjection(codexTabProjection) {
        if (!state.payload) return;
        state.payload = Object.assign({}, state.payload, {
          codexTabProjection: codexTabProjection || { openThreadIds: [], focusedThreadId: undefined, tabGroups: [] },
        });
      }

      function patchCodexLinkState(codexLinkState) {
        if (!state.payload) return;
        state.payload = Object.assign({}, state.payload, {
          codexLinkState: codexLinkState || { openThreadIds: [], focusedThreadId: undefined },
        });
      }

      function patchHandoffObjects(handoffObjects) {
        if (!state.payload) return;
        state.payload = Object.assign({}, state.payload, {
          handoffObjects: Object.assign({}, handoffObjects || {}),
        });
      }

      function cardLabelFor(threadId) {
        if (!threadId) return "";
        return String((state.ui.cardLabels && state.ui.cardLabels[threadId]) || "").trim();
      }

      function suggestedCardName(threadId) {
        const current = cardLabelFor(threadId);
        if (current) return current;
        const labels = Object.values(state.ui.cardLabels || {}).map((value) => String(value || "").trim());
        const used = new Set();
        labels.forEach((value) => {
          const match = value.match(/^card\s+(\d+)$/i);
          if (match) used.add(Number(match[1]));
        });
        let next = 1;
        while (used.has(next)) next += 1;
        return "Card " + String(next);
      }

      function displayThreadTitle(threadOrId, fallback = "Thread") {
        const thread = threadOrId && typeof threadOrId === "object"
          ? threadOrId
          : ((state.payload && state.payload.dashboard && Array.isArray(state.payload.dashboard.threads))
            ? state.payload.dashboard.threads.find((item) => item && item.id === threadOrId)
            : undefined);
        const threadId = thread && thread.id ? thread.id : String(threadOrId || "");
        return String((thread && (thread.title || thread.id)) || threadId || fallback);
      }

      function displayCardName(threadOrId) {
        const threadId = threadOrId && typeof threadOrId === "object" ? threadOrId.id : String(threadOrId || "");
        return cardLabelFor(threadId);
      }

      function compactTokenCount(value) {
        const num = Number(value || 0);
        if (!Number.isFinite(num) || num <= 0) return "0";
        if (num >= 1000000) return (num / 1000000).toFixed(num >= 10000000 ? 0 : 1).replace(/\.0$/, "") + "M";
        if (num >= 1000) return (num / 1000).toFixed(num >= 10000 ? 0 : 1).replace(/\.0$/, "") + "K";
        return String(Math.round(num));
      }

      function formatBytes(value) {
        const num = Number(value || 0);
        if (!Number.isFinite(num) || num <= 0) return "0 B";
        const units = ["B", "KB", "MB", "GB"];
        let size = num;
        let index = 0;
        while (size >= 1024 && index < units.length - 1) {
          size /= 1024;
          index += 1;
        }
        return (index === 0 ? String(Math.round(size)) : size.toFixed(size >= 10 ? 0 : 1).replace(/\.0$/, "")) + " " + units[index];
      }

      function renderThreadUsageMeta(thread) {
        const tokenLabel = compactTokenCount(thread && thread.tokens_used);
        const storageLabel = (thread && thread.storage_label) || formatBytes(thread && thread.storage_bytes);
        return '<span class="meta-pill">Tokens ' + esc(tokenLabel) + '</span>' +
          '<span class="meta-pill">Size ' + esc(storageLabel || "0 B") + '</span>';
      }

      function threadCommandCount(thread) {
        const rolloutCount = Number(thread && thread.rollout_user_message_count);
        if (Number.isFinite(rolloutCount) && rolloutCount > 0) return Math.round(rolloutCount);
        const userCommandCount = Number(thread && thread.user_command_count);
        if (Number.isFinite(userCommandCount) && userCommandCount > 0) return Math.round(userCommandCount);
        return 0;
      }

      function renderCopyableThreadId(threadOrId, options = {}) {
        const raw = threadOrId && typeof threadOrId === "object" ? threadOrId.id : threadOrId;
        const threadId = String(raw || "").trim();
        if (!threadId) return "";
        const maxLength = Number(options.maxLength || options.length || 18);
        const prefix = options.prefix === undefined ? "ID " : String(options.prefix || "");
        const label = options.full ? threadId : tailShort(threadId, maxLength);
        const extraClass = options.className ? " " + options.className : "";
        return '<button class="meta-pill mono copy-thread-id' + extraClass + '" type="button" data-copy-thread-id="' + esc(threadId) + '" title="Copy session/thread id: ' + esc(threadId) + '">' + esc(prefix + label) + '</button>';
      }

      function renderInlineCardTitle(thread, className, maxLength, fallback = "Thread") {
        const threadId = thread && thread.id ? thread.id : "";
        const fullTitle = displayThreadTitle(thread, fallback);
        const display = short(fullTitle, maxLength);
        return '<div class="' + esc(className) + '" data-thread-title-slot="' + esc(threadId) + '" data-title-max="' + esc(String(maxLength)) + '" title="' + esc(fullTitle) + '">' + esc(display) + '</div>';
      }

      function renderEditableCardName(threadOrId, options = {}) {
        const threadId = threadOrId && typeof threadOrId === "object" ? threadOrId.id : String(threadOrId || "");
        const label = displayCardName(threadId);
        const prefix = options.prefix === false ? "" : "Card: ";
        const placeholder = options.placeholder || "Card Name";
        const text = label ? (prefix + label) : placeholder;
        const extraClass = options.className ? " " + options.className : "";
        const max = Number(options.maxLength || 56);
        return '<span class="editable-card-name inline-card-label' + extraClass + (label ? '' : ' empty') + '" role="button" tabindex="0" data-edit-card-name="' + esc(threadId) + '" data-card-name-slot="' + esc(threadId) + '" data-card-prefix="' + esc(prefix) + '" data-card-placeholder="' + esc(placeholder) + '" data-title-max="' + esc(String(max)) + '">' + esc(short(text, max)) + '</span>';
      }

      function setCardLabel(threadId, label) {
        if (!threadId) return;
        vscode.postMessage({
          type: "setCardLabel",
          threadId,
          label: String(label || ""),
        });
      }

      function normalizeBoardTabName(value) {
        return String(value || "").trim().replace(/\s+/g, " ").slice(0, 36);
      }

      function boardTabTone(name) {
        const text = normalizeBoardTabName(name);
        let hash = 0;
        for (let index = 0; index < text.length; index += 1) {
          hash = ((hash << 5) - hash) + text.charCodeAt(index);
          hash |= 0;
        }
        const hue = Math.abs(hash % 360);
        return {
          border: 'hsla(' + hue + ', 78%, 72%, 0.54)',
          bg: 'linear-gradient(180deg, hsla(' + hue + ', 86%, 58%, 0.3), hsla(' + hue + ', 72%, 18%, 0.22))',
          fg: 'hsla(' + hue + ', 100%, 95%, 0.99)',
          glow: 'hsla(' + hue + ', 92%, 62%, 0.24)',
          countBg: 'hsla(' + hue + ', 80%, 18%, 0.58)',
        };
      }

      function boardTabStyle(name, active = false) {
        const tone = boardTabTone(name);
        return ' style="' +
          'border-color:' + tone.border + ';' +
          'background:' + tone.bg + ';' +
          'color:' + tone.fg + ';' +
          (active ? ('box-shadow: inset 0 0 0 1px ' + tone.border + ', 0 0 0 1px ' + tone.glow + ', 0 12px 28px ' + tone.glow + ';') : ('box-shadow: inset 0 0 0 1px rgba(255,255,255,0.03), 0 8px 18px rgba(0,0,0,0.16);')) +
        '"';
      }

      function boardTabCountStyle(name) {
        const tone = boardTabTone(name);
        return ' style="' +
          'background:' + tone.countBg + ';' +
          'border:1px solid ' + tone.border + ';' +
          'color:' + tone.fg + ';' +
        '"';
      }

      function boardTabOrderList() {
        const order = Array.isArray(state.ui.boardTabOrder) ? state.ui.boardTabOrder : [];
        return order
          .map(normalizeBoardTabName)
          .filter((name, index, list) => name && list.indexOf(name) === index);
      }

      function threadTabFilterOptions() {
        const seen = new Set();
        const names = [];
        const addName = (value) => {
          const name = normalizeBoardTabName(value);
          if (!name || seen.has(name)) return;
          seen.add(name);
          names.push(name);
        };
        boardTabOrderList().forEach(addName);
        Object.values(state.ui.boardTabAssignments || {}).forEach(addName);
        return names;
      }

      function activeThreadTabFilterKey() {
        const selected = normalizeBoardTabName(state.ui.threadTabFilter);
        if (!selected || selected === "all") return "all";
        return threadTabFilterOptions().includes(selected) ? selected : "all";
      }

      function setThreadTabFilter(name) {
        const next = normalizeBoardTabName(name);
        state.ui.threadTabFilter = next || "all";
        state.ui.threadTabFilterMenuOpen = false;
        state.ui.currentView = "threads";
        persistUi();
        render(state.payload);
      }

      function renderThreadTabFilterControl() {
        const active = activeThreadTabFilterKey();
        const tabs = threadTabFilterOptions();
        const label = active === "all" ? "Tab: All" : ("Tab: " + active);
        const menu = state.ui.threadTabFilterMenuOpen
          ? '<span class="thread-tab-menu">' +
              '<button class="chip' + (active === "all" ? ' active' : '') + '" data-thread-tab-filter-option="all" type="button">All</button>' +
              (tabs.length
                ? tabs.map((name) => '<button class="chip' + (active === name ? ' active' : '') + '" data-thread-tab-filter-option="' + esc(name) + '" type="button">' + esc(name) + '</button>').join("")
                : '<span class="thread-tab-empty">No tabs yet</span>') +
            '</span>'
          : '';
        return '<span class="thread-tab-filter">' +
          '<button class="chip' + (active !== "all" ? ' active' : '') + '" data-toggle-thread-tab-filter="true" type="button">' + esc(label) + '</button>' +
          menu +
        '</span>';
      }

      function ensureBoardTab(name) {
        const next = normalizeBoardTabName(name);
        if (!next) return "";
        const order = boardTabOrderList();
        if (!order.includes(next)) {
          order.push(next);
          state.ui.boardTabOrder = order;
        } else {
          state.ui.boardTabOrder = order;
        }
        return next;
      }

      function boardTabFor(threadId) {
        if (!threadId) return "";
        const current = normalizeBoardTabName((state.ui.boardTabAssignments || {})[threadId]);
        if (current) ensureBoardTab(current);
        return current;
      }

      function activeBoardTabKey() {
        return normalizeBoardTabName(state.ui.activeBoardTab) || "all";
      }

      function setActiveBoardTab(name) {
        const next = normalizeBoardTabName(name);
        state.ui.activeBoardTab = next || "all";
        persistUi();
        render(state.payload);
      }

      function setThreadBoardTab(threadId, preferredTab = "") {
        if (!threadId) return;
        vscode.postMessage({
          type: "chooseBoardTab",
          threadId,
          currentBoardTab: boardTabFor(threadId) || normalizeBoardTabName(preferredTab) || "",
          boardTabOrder: boardTabOrderList(),
          activeBoardTab: activeBoardTabKey(),
        });
      }

      function createBoardTab() {
        vscode.postMessage({
          type: "createBoardTab",
          boardTabOrder: boardTabOrderList(),
          activeBoardTab: activeBoardTabKey(),
        });
      }

      function applyCardLabelPatch(threadId, label) {
        if (!threadId) return;
        const trimmed = String(label || "").trim();
        if (!trimmed) {
          delete state.ui.cardLabels[threadId];
        } else {
          state.ui.cardLabels[threadId] = trimmed;
        }
        persistUi();
        render(state.payload);
      }

      function beginInlineCardLabelEdit(threadId, node) {
        if (!threadId || !node || node.classList.contains("is-editing")) return;
        const value = cardLabelFor(threadId);
        let finished = false;
        node.classList.add("is-editing");
        node.innerHTML = '<input class="inline-card-label-input" type="text" value="' + esc(value) + '" />';
        const input = node.querySelector("input");
        if (!input) return;
        const commit = () => {
          if (finished) return;
          finished = true;
          const trimmed = String(input.value || "").trim();
          applyCardLabelPatch(threadId, trimmed);
          setCardLabel(threadId, trimmed);
        };
        const cancel = () => {
          if (finished) return;
          finished = true;
          render(state.payload);
        };
        input.addEventListener("click", (event) => event.stopPropagation());
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            commit();
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            cancel();
          }
        });
        input.addEventListener("blur", () => {
          commit();
        });
        input.focus();
        input.select();
      }

      function applyBoardTabPatch(threadId, boardTab, boardTabOrder, activeBoardTab) {
        if (Array.isArray(boardTabOrder)) {
          state.ui.boardTabOrder = boardTabOrder.map(normalizeBoardTabName).filter((name, index, list) => name && list.indexOf(name) === index);
        }
        const trimmed = normalizeBoardTabName(boardTab);
        if (threadId) {
          if (!trimmed) {
            delete state.ui.boardTabAssignments[threadId];
          } else {
            ensureBoardTab(trimmed);
            state.ui.boardTabAssignments[threadId] = trimmed;
            state.ui.boardAttached[threadId] = true;
          }
        }
        state.ui.activeBoardTab = normalizeBoardTabName(activeBoardTab) || "all";
        persistUi();
        render(state.payload);
      }

      function patchThread(threadId, updates) {
        if (!state.payload || !threadId) return;
        const nextUpdates = updates || {};
        const patch = (thread) => {
          if (!thread || thread.id !== threadId) return thread;
          return Object.assign({}, thread, nextUpdates, {
            db_title: nextUpdates.title !== undefined ? nextUpdates.title : thread.db_title,
          });
        };
        const dashboard = state.payload.dashboard || {};
        state.payload = Object.assign({}, state.payload, {
          dashboard: Object.assign({}, dashboard, {
            threads: Array.isArray(dashboard.threads) ? dashboard.threads.map(patch) : dashboard.threads,
            runningThreads: Array.isArray(dashboard.runningThreads) ? dashboard.runningThreads.map(patch) : dashboard.runningThreads,
          }),
          detail: state.payload.detail && state.payload.detail.thread && state.payload.detail.thread.id === threadId
            ? Object.assign({}, state.payload.detail, { thread: patch(state.payload.detail.thread) })
            : state.payload.detail,
        });
      }

      function addThread(thread) {
        if (!state.payload || !thread || !thread.id) return;
        const dashboard = state.payload.dashboard || {};
        const currentThreads = Array.isArray(dashboard.threads) ? dashboard.threads : [];
        const withoutDuplicate = currentThreads.filter((item) => item && item.id !== thread.id);
        state.payload = Object.assign({}, state.payload, {
          dashboard: Object.assign({}, dashboard, {
            threads: [thread].concat(withoutDuplicate),
          }),
        });
      }

      function removeThread(threadId) {
        if (!state.payload || !threadId) return;
        const dashboard = state.payload.dashboard || {};
        state.payload = Object.assign({}, state.payload, {
          dashboard: Object.assign({}, dashboard, {
            threads: Array.isArray(dashboard.threads) ? dashboard.threads.filter((thread) => thread && thread.id !== threadId) : dashboard.threads,
            runningThreads: Array.isArray(dashboard.runningThreads) ? dashboard.runningThreads.filter((thread) => thread && thread.id !== threadId) : dashboard.runningThreads,
          }),
          detail: state.payload.detail && state.payload.detail.thread && state.payload.detail.thread.id === threadId
            ? Object.assign({}, state.payload.detail, { thread: undefined })
            : state.payload.detail,
        });
        if (state.selectedThreadId === threadId) {
          state.selectedThreadId = undefined;
        }
      }

      function patchThreads(threadIds, updates) {
        (threadIds || []).forEach((threadId) => patchThread(threadId, updates));
      }

      function removeThreads(threadIds) {
        (threadIds || []).forEach((threadId) => removeThread(threadId));
      }

      function findThreadInPayload(threadId, payload = state.payload) {
        if (!threadId || !payload) return undefined;
        const dashboard = payload.dashboard || {};
        return (dashboard.threads || []).find((thread) => thread.id === threadId)
          || (dashboard.runningThreads || []).find((thread) => thread.id === threadId)
          || ((payload.detail && payload.detail.thread && payload.detail.thread.id === threadId) ? payload.detail.thread : undefined);
      }

      function syncCodexTabProjectionDom() {
        if (!state.payload) return false;
        let synced = false;

        document.querySelectorAll("[data-thread-id]").forEach((node) => {
          const threadId = node.dataset.threadId;
          const thread = findThreadInPayload(threadId);
          if (!thread) return;
          const linkMeta = codexLinkMeta(threadId);
          const status = effectiveThreadStatus(thread);
          node.classList.toggle("codex-focused", Boolean(linkMeta.isFocused));
          node.classList.toggle("codex-open", !linkMeta.isFocused && Boolean(linkMeta.isOpen));
          const statusBadgeSlot = node.querySelector('[data-thread-status-badge="' + CSS.escape(threadId) + '"]');
          if (statusBadgeSlot) statusBadgeSlot.innerHTML = statusBadge(status);
          const linkBadgeSlot = node.querySelector('[data-thread-link-badge="' + CSS.escape(threadId) + '"]');
          if (linkBadgeSlot) linkBadgeSlot.innerHTML = codexLinkBadge(threadId);
          const visibilitySlot = node.querySelector('[data-thread-visibility-pill="' + CSS.escape(threadId) + '"]');
          if (visibilitySlot) visibilitySlot.innerHTML = renderThreadVisibilityPill(thread);
          const statusMetaSlot = node.querySelector('[data-thread-status-meta="' + CSS.escape(threadId) + '"]');
          if (statusMetaSlot) statusMetaSlot.textContent = thread.soft_deleted ? "soft-deleted" : (thread.archived ? "archived" : status);
          synced = true;
        });

        document.querySelectorAll("[data-running-card]").forEach((card) => {
          const threadId = card.dataset.runningCard;
          const thread = findThreadInPayload(threadId);
          if (!thread) return;
          const linkMeta = codexLinkMeta(threadId);
          const status = effectiveThreadStatus(thread);
          const attached = (thread.board_source === "attached" || thread.board_source === "linked" || status === "attached" || status === "linked") && status !== "running";
          card.classList.toggle("codex-card-focused", Boolean(linkMeta.isFocused));
          card.classList.toggle("codex-card-open", !linkMeta.isFocused && Boolean(linkMeta.isOpen));
          card.classList.toggle("running-live", status === "running");
          card.classList.toggle("board-attached", attached);
          const badgesSlot = card.querySelector('[data-running-status-badges="' + CSS.escape(threadId) + '"]');
          if (badgesSlot) {
            const compactId = (card.classList.contains("fixed-tiny") || card.classList.contains("compact-card"))
              ? renderCopyableThreadId(threadId, { maxLength: 10 })
              : "";
            badgesSlot.innerHTML = statusBadge(status) + boardBadge(thread) + renderBoardTabPill(thread) + renderLoopManagedBadge(threadId) + '<span data-running-pending-badge="' + esc(threadId) + '">' + renderPendingPromptBadge(threadId) + '</span>' + codexLinkBadge(threadId) + compactId;
          }
          const linkMetaSlot = card.querySelector('[data-running-link-meta="' + CSS.escape(threadId) + '"]');
          if (linkMetaSlot) linkMetaSlot.textContent = linkMeta.isFocused ? "Focused" : (linkMeta.isSidebar ? "Sidebar" : (linkMeta.isOpen ? "Linked" : "Inferred"));
          const progressValueSlot = card.querySelector('[data-running-progress-value="' + CSS.escape(threadId) + '"]');
          if (progressValueSlot) {
            const progress = extractThreadProgress(thread);
            progressValueSlot.textContent = progress.percent !== undefined ? (String(progress.percent) + "%") : status;
          }
          synced = true;
        });

        const spotlightThreadId = state.selectedThreadId || (state.payload && state.payload.selectedThreadId);
        const spotlightThread = findThreadInPayload(spotlightThreadId);
        if (spotlightThread) {
          const spotlightStatusSlot = document.querySelector('[data-spotlight-status-badge="' + CSS.escape(spotlightThread.id) + '"]');
          if (spotlightStatusSlot) spotlightStatusSlot.innerHTML = statusBadge(effectiveThreadStatus(spotlightThread));
          const spotlightLinkBadgeSlot = document.querySelector('[data-spotlight-link-badge="' + CSS.escape(spotlightThread.id) + '"]');
          if (spotlightLinkBadgeSlot) spotlightLinkBadgeSlot.innerHTML = codexLinkBadge(spotlightThread.id);
          const spotlightLinkValueSlot = document.querySelector('[data-spotlight-link-value="' + CSS.escape(spotlightThread.id) + '"]');
          if (spotlightLinkValueSlot) {
            const linkMeta = codexLinkMeta(spotlightThread.id);
            spotlightLinkValueSlot.textContent = linkMeta.isFocused ? "Focused in Codex" : (linkMeta.isSidebar ? "Shown in Codex Sidebar" : (linkMeta.isOpen ? "Open in Codex" : (linkMeta.pending ? "Linking to Codex" : "Not linked")));
          }
          synced = true;
        }

        return synced;
      }

      function syncThreadTitleDom(threadId, title) {
        if (!threadId) return false;
        let synced = false;
        document.querySelectorAll('[data-thread-title-slot="' + CSS.escape(threadId) + '"]').forEach((node) => {
          const max = Number(node.dataset.titleMax || 120);
          const fullTitle = displayThreadTitle(threadId, title || "(no title)");
          node.textContent = short(fullTitle, Number.isFinite(max) ? max : 120);
          node.setAttribute("title", fullTitle);
          synced = true;
        });
        return synced;
      }

      function syncPendingPromptState(hostPending) {
        const next = {};
        Object.entries(hostPending || {}).forEach(([threadId, entry]) => {
          next[threadId] = Object.assign({ state: "queued" }, entry || {});
        });
        const now = Date.now();
        Object.entries(state.ui.pendingPromptState || {}).forEach(([threadId, entry]) => {
          if (!entry || entry.state !== "failed") return;
          const updatedAtMs = Date.parse(entry.updatedAt || entry.queuedAt || "");
          if (!Number.isFinite(updatedAtMs) || now - updatedAtMs < 12000) {
            next[threadId] = entry;
          }
        });
        state.ui.pendingPromptState = next;
      }

      function queuePromptOptimistically(threadId, prompt) {
        if (!threadId) return;
        state.ui.pendingPromptState[threadId] = {
          state: "queued",
          prompt: String(prompt || "").trim() || "continue",
          queuedAt: new Date().toISOString(),
        };
      }

      function markPromptQueueFailed(threadId, prompt, message) {
        if (!threadId) return;
        state.ui.pendingPromptState[threadId] = {
          state: "failed",
          prompt: String(prompt || "").trim() || "continue",
          message: String(message || "Failed to queue prompt"),
          updatedAt: new Date().toISOString(),
        };
      }

      function startBootRetryLoop() {
        stopBootRetryLoop();
        bootRetryCount = 0;
        bootRetryTimer = window.setInterval(() => {
          if (state.payload) {
            stopBootRetryLoop();
            stopBootProgressLoop();
            return;
          }
          if (bootRetryCount >= 6) {
            stopBootRetryLoop();
            showHydrationFailureNotice();
            return;
          }
          bootRetryCount += 1;
          notifyReady();
        }, 900);
      }

      function stopBootRetryLoop() {
        if (bootRetryTimer) {
          window.clearInterval(bootRetryTimer);
          bootRetryTimer = undefined;
        }
      }

      function esc(value) {
        return (value ?? "").toString().replace(/[&<>"']/g, (ch) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "\\"": "&quot;",
          "'": "&#39;",
        }[ch]));
      }

      function shellQuote(value) {
        const text = String(value || "");
        if (!text) return "''";
        return "'" + text.replace(/'/g, "'\\\"'\\\"'") + "'";
      }

      function renderCuteEmpty(title, copy, art) {
        return '<div class="empty-state cute">' +
          '<div class="empty-state-inner">' +
            renderThemeVisual(art || MEDIA.rest, "empty-state-art", "Waiting", "empty") +
            '<div class="empty-state-title">' + esc(title) + '</div>' +
            '<div class="empty-state-copy">' + esc(copy) + '</div>' +
          '</div>' +
        '</div>';
      }

      function phaseArtFor(label) {
        const key = String(label || "").toLowerCase();
        if (key === "planning") return MEDIA.planning;
        if (key === "tooling") return MEDIA.tooling;
        if (key === "editing") return MEDIA.editing;
        if (key === "testing") return MEDIA.testing;
        return MEDIA.waiting;
      }

      function phaseClassFor(label) {
        const key = String(label || "").toLowerCase();
        if (key === "running") return " phase-tooling";
        if (key === "planning") return " phase-planning";
        if (key === "tooling") return " phase-tooling";
        if (key === "editing") return " phase-editing";
        if (key === "testing") return " phase-testing";
        return " phase-waiting";
      }

      function themeMode() {
        return state.ui.themeMode || "vivid";
      }

      function renderRunningAnimatedIcon(imgClass = "", label = "Running", variant = "phase") {
        return '<span class="' + esc(imgClass) + ' running-animated-icon theme-is-optional variant-' + esc(variant) + '" role="img" aria-label="' + esc(label || "Running") + '">' +
          '<svg viewBox="0 0 80 80" focusable="false">' +
            '<circle class="running-icon-track" cx="40" cy="40" r="29"></circle>' +
            '<circle class="running-icon-ring" cx="40" cy="40" r="29" pathLength="100"></circle>' +
            '<circle class="running-icon-arc" cx="40" cy="40" r="21" pathLength="100"></circle>' +
            '<path class="running-icon-link" d="M24 56 L40 24 L56 56"></path>' +
            '<circle class="running-icon-halo" cx="40" cy="40" r="13"></circle>' +
            '<circle class="running-icon-core" cx="40" cy="40" r="6"></circle>' +
            '<circle class="running-icon-node node-a" cx="24" cy="56" r="3.6"></circle>' +
            '<circle class="running-icon-node node-b" cx="40" cy="24" r="3.6"></circle>' +
            '<circle class="running-icon-node node-c" cx="56" cy="56" r="3.6"></circle>' +
            '<circle class="running-icon-satellite" cx="40" cy="11" r="2.8"></circle>' +
          '</svg>' +
        '</span>';
      }

      function renderThemeVisual(src, imgClass, phaseLabel = "Waiting", variant = "phase") {
        const mode = themeMode();
        const phaseClass = phaseClassFor(phaseLabel).trim() || "phase-waiting";
        if (mode === "pure") return "";
        if (String(phaseLabel || "").toLowerCase() === "running") {
          return renderRunningAnimatedIcon(imgClass, phaseLabel, variant);
        }
        if (mode === "clean") {
          return '<span class="theme-bar theme-is-optional variant-' + esc(variant) + ' ' + esc(phaseClass) + '" aria-hidden="true"></span>';
        }
        return '<img class="' + esc(imgClass) + ' theme-is-optional" src="' + esc(src || phaseArtFor(phaseLabel)) + '" alt="" />';
      }

      function renderPhaseChip(phase) {
        const phaseClass = phaseClassFor(phase.label).trim();
        return '<span class="phase-chip ' + esc(phaseClass) + '">' +
          renderThemeVisual(phaseArtFor(phase.label), "phase-chip-art", phase.label, "phase-chip") +
          '<span>' + esc(phase.label) + '</span>' +
        '</span>';
      }

      function renderSummaryCard(label, value, copy, phaseLabel, art, actionsHtml, extraHtml) {
        const phaseClass = phaseClassFor(phaseLabel).trim();
        return '<div class="summary-card ' + esc(phaseClass) + '">' +
          '<div class="summary-head">' +
            renderThemeVisual(art || phaseArtFor(phaseLabel), "summary-art", phaseLabel, "summary") +
            '<div class="summary-head-copy">' +
              '<div class="summary-label">' + esc(label) + '</div>' +
              renderPhaseChip({ label: phaseLabel }) +
            '</div>' +
          '</div>' +
          '<div class="summary-body">' +
            '<div class="summary-value">' + esc(value) + '</div>' +
            '<div class="summary-copy">' + esc(copy) + '</div>' +
            (extraHtml || '') +
            (actionsHtml ? '<div class="summary-actions">' + actionsHtml + '</div>' : '') +
          '</div>' +
        '</div>';
      }

      function loopDaemonSummary(loopDaemon, payload) {
        if (!loopDaemon || !loopDaemon.available) {
          return {
            value: "Unavailable",
            copy: "No loop daemon detected.",
            phase: "Waiting",
            art: MEDIA.waiting,
          };
        }
        if (loopDaemon.running) {
          return {
            value: "Running",
            copy: loopDaemon.intervalMinutes
              ? ("Heartbeat every " + String(loopDaemon.intervalMinutes) + " min.")
              : "Loop daemon is alive.",
            phase: "Tooling",
            art: MEDIA.timeline,
          };
        }
        return {
          value: loopDaemon.label || "Stopped",
          copy: payload && payload.lastSuccessfulRefreshAt
            ? ("Last refresh " + formatTimestamp(payload.lastSuccessfulRefreshAt))
            : "Loop daemon is idle.",
          phase: "Waiting",
          art: MEDIA.waiting,
        };
      }

      function renderLoopDaemonCard(daemon) {
        const statusLabelValue = String(daemon.label || "");
        const statusKey = daemon.running ? "running" : (statusLabelValue.toLowerCase().includes("exited") ? "exited" : "stopped");
        const pending = state.ui.pendingLoopActions && daemon.stateDir ? state.ui.pendingLoopActions[daemon.stateDir] : undefined;
        const stopPending = pending && pending.action === "stop";
        const startPending = pending && pending.action === "start";
        const restartPending = pending && pending.action === "restart";
        const statusLabel = restartPending ? "RESTARTING" : stopPending ? "STOPPING" : startPending ? "STARTING" : undefined;
        const stableBadge = daemon.running
          ? '<span class="badge badge-running">RUNNING</span>'
          : '<span class="badge ' + (statusKey === "exited" ? 'badge-recent' : 'badge-linked') + '">' + esc((statusLabelValue || "Stopped Cleanly").toUpperCase()) + '</span>';
        const actions = [
          daemon.threadId ? '<button class="chip" data-codex-thread="' + esc(daemon.threadId) + '" type="button">Codex</button>' : "",
          daemon.daemonStdoutPath ? '<button class="chip" data-open-log="' + esc(daemon.daemonStdoutPath) + '" type="button">Open daemon log</button>' : "",
          daemon.daemonStdoutPath ? '<button class="chip" data-tail-loop-log="' + esc(daemon.daemonStdoutPath) + '" type="button">Tail daemon log</button>' : "",
          daemon.rawLogPath ? '<button class="chip" data-open-log="' + esc(daemon.rawLogPath) + '" type="button">Open tick log</button>' : "",
          daemon.tmuxSession ? '<button class="chip" data-attach-loop-tmux="' + esc(daemon.tmuxSession) + '" type="button">Attach tmux</button>' : "",
          daemon.promptFile ? '<button class="chip" data-open-log="' + esc(daemon.promptFile) + '" type="button">Open prompt.md</button>' : "",
          daemon.roadmapPath ? '<button class="chip" data-open-log="' + esc(daemon.roadmapPath) + '" type="button">Open ROADMAP.md</button>' : "",
          daemon.running ? '<button class="chip warn-chip" data-stop-loop-at="' + esc(daemon.stateDir || "") + '" type="button"' + (pending ? ' disabled' : '') + '>' + esc(stopPending ? "Stopping…" : "Stop") + '</button>' : "",
          !daemon.running ? '<button class="chip" data-start-loop-at="' + esc(daemon.stateDir || "") + '" data-loop-workspace="' + esc(daemon.workspace || "") + '" data-loop-prompt-file="' + esc(daemon.promptFile || "") + '" data-loop-thread-id="' + esc(daemon.threadId || "") + '" data-loop-interval-minutes="' + esc(String(daemon.intervalMinutes || "")) + '" type="button"' + (pending ? ' disabled' : '') + '>' + esc(startPending ? "Starting…" : "Start") + '</button>' : "",
          daemon.threadId && daemon.intervalMinutes ? '<button class="chip" data-restart-loop-at="' + esc(daemon.stateDir || "") + '" data-loop-workspace="' + esc(daemon.workspace || "") + '" data-loop-prompt-file="' + esc(daemon.promptFile || "") + '" data-loop-thread-id="' + esc(daemon.threadId || "") + '" data-loop-interval-minutes="' + esc(String(daemon.intervalMinutes || "")) + '" type="button"' + (pending ? ' disabled' : '') + '>' + esc(restartPending ? "Restarting…" : "Restart") + '</button>' : ""
        ].filter(Boolean).join("");
        return '<div class="loop-daemon-card ' + esc(statusKey) + '">' +
          '<div class="loop-daemon-head">' +
            '<div class="loop-daemon-title-wrap">' +
              '<div class="loop-daemon-title">' + esc(daemon.workspaceLabel || daemon.workspace || "codex-loop") + '</div>' +
              '<div class="loop-daemon-subtitle">' + esc(daemon.workspace || "No workspace path recorded") + '</div>' +
            '</div>' +
            (statusLabel ? '<span class="badge badge-linked">' + esc(statusLabel) + '</span>' : stableBadge) +
          '</div>' +
          '<div class="loop-daemon-meta">' +
            (daemon.pid ? '<span class="meta-pill">PID ' + esc(String(daemon.pid)) + '</span>' : '') +
            (daemon.intervalMinutes ? '<span class="meta-pill">' + esc(String(daemon.intervalMinutes)) + ' min</span>' : '') +
            (daemon.heartbeatAt ? '<span class="meta-pill">Last heartbeat ' + esc(formatTimestamp(daemon.heartbeatAt)) + '</span>' : '') +
            (daemon.threadId ? '<span class="meta-pill">Thread ' + esc(short(daemon.threadId, 16)) + '</span>' : '') +
            (daemon.tmuxSession ? '<span class="meta-pill">tmux ' + esc(short(daemon.tmuxSession, 28)) + '</span>' : '') +
            (daemon.launcher ? '<span class="meta-pill">' + esc(daemon.launcher) + '</span>' : '') +
            (daemon.promptFileLabel ? '<span class="meta-pill">Context ' + esc(daemon.promptFileLabel) + '</span>' : '') +
            (daemon.roadmapPath ? '<span class="meta-pill">ROADMAP</span>' : '') +
          '</div>' +
          '<div class="loop-daemon-detail">' + esc(daemon.detail || daemon.tailLine || "No loop daemon detail yet.") + '</div>' +
          '<div class="loop-daemon-actions">' + actions + '</div>' +
        '</div>';
      }

      function renderLoopDaemonDashboard(loopDaemons, loopDaemon, loopSupport) {
        if (!loopSupport || !loopSupport.available) {
          return '<div class="loop-install-card">' +
            '<div class="section-title">codex-loop Required</div>' +
            '<div class="section-note">Loop controls need the local codex-loop skill. This machine is missing the automation script, so start/restart actions cannot run yet.</div>' +
            '<div class="loop-daemon-detail">Expected script: ' + esc((loopSupport && loopSupport.scriptPath) || "~/.codex/skills/codex-loop/scripts/codex_loop_automation.py") + '</div>' +
            '<div class="loop-daemon-actions">' +
              '<button class="chip" data-open-external-url="' + esc((loopSupport && loopSupport.installUrl) || "https://github.com/Harzva/codex-managed-agent") + '" type="button">Open GitHub Install Guide</button>' +
              '<button class="chip" data-copy-text="' + esc((loopSupport && loopSupport.scriptPath) || "~/.codex/skills/codex-loop/scripts/codex_loop_automation.py") + '" data-copy-label="Loop script path" type="button">Copy expected path</button>' +
            '</div>' +
          '</div>';
        }
        const items = Array.isArray(loopDaemons) && loopDaemons.length
          ? loopDaemons
          : (loopDaemon && loopDaemon.available ? [loopDaemon] : []);
        if (!items.length) {
          return '<div class="panel loop-daemon-empty">' +
            renderCuteEmpty("No loop daemon detected", "When a codex-loop daemon writes its local state, this page will surface it here with direct log and tmux shortcuts.", MEDIA.waiting) +
          '</div>';
        }
        return '<div class="loop-daemon-list">' + items.map((daemon) => renderLoopDaemonCard(daemon)).join("") + '</div>';
      }

      function renderInsightCard(title, copy, meta) {
        return '<div class="insight-card">' +
          '<div class="insight-card-head">' +
            '<div class="insight-card-title">' + esc(title) + '</div>' +
            (meta ? '<span class="meta-pill">' + esc(meta) + '</span>' : '') +
          '</div>' +
          '<div class="insight-card-copy">' + esc(copy) + '</div>' +
        '</div>';
      }

      function renderMemoryShellCard(card) {
        const kind = String(card && card.kind || "memo");
        const kindLabel = kind === "prompt"
          ? "Prompt Card"
          : (kind === "rule" ? "Rule Card" : "Memo Card");
        const title = String(card && card.title || "");
        const copy = String(card && card.copy || "");
        const sourcePath = String(card && card.sourcePath || "");
        const actionLabel = String(card && card.actionLabel || "Open");
        const linked = Boolean(card && card.linked);
        const sourceAction = sourcePath
          ? '<button class="chip" data-open-repo-file="' + esc(sourcePath) + '" type="button">' + esc(actionLabel) + '</button>'
          : "";
        const sourceState = sourcePath
          ? (short(sourcePath, 32) + (linked ? " linked" : " missing"))
          : "No source linked yet";
        return '<div class="memory-shell-card type-' + esc(kind) + '">' +
          '<div class="memory-shell-head">' +
            '<span class="memory-shell-kicker">' + esc(kindLabel) + '</span>' +
            '<span class="meta-pill">' + esc(linked ? "File Linked" : "Missing") + '</span>' +
          '</div>' +
          '<div class="memory-shell-title">' + esc(title) + '</div>' +
          '<div class="memory-shell-copy">' + esc(copy) + '</div>' +
          '<div class="memory-shell-meta">' +
            '<span class="meta-pill">' + esc(kindLabel) + '</span>' +
            '<span class="meta-pill">' + esc(sourceState) + '</span>' +
          '</div>' +
          sourceAction +
        '</div>';
      }

      function renderMemoryShortcutRow() {
        return '<div class="chip-row">' +
          '<span class="meta-pill">Memory</span>' +
          '<button class="chip" data-open-repo-file=".codex-loop/prompt.md" type="button">Prompt</button>' +
          '<button class="chip" data-open-repo-file="ROADMAP.md" type="button">Rule</button>' +
          '<button class="chip" data-open-repo-file=".claude/plans/ACTIVE_PLAN.md" type="button">Memo</button>' +
        '</div>';
      }

      function renderMemoryShellGrid(payload = state.payload) {
        const cards = Array.isArray(payload && payload.memoryCards) && payload.memoryCards.length
          ? payload.memoryCards
          : [
              { kind: "prompt", title: "Prompt Card", copy: "Keep a reusable working prompt visible beside live agent activity.", sourcePath: ".codex-loop/prompt.md", actionLabel: "Open Prompt", linked: false },
              { kind: "rule", title: "Rule Card", copy: "Surface durable guardrails and loop rules without burying them in tabs.", sourcePath: "ROADMAP.md", actionLabel: "Open ROADMAP", linked: false },
              { kind: "memo", title: "Memo Card", copy: "Hold compact decisions and reminders that should persist across iterations.", sourcePath: ".claude/plans/ACTIVE_PLAN.md", actionLabel: "Open Active Plan", linked: false },
            ];
        return '<div class="memory-shell-grid">' +
          cards.map((card) => renderMemoryShellCard(card)).join("") +
        '</div>';
      }

      function renderKeywordChip(item) {
        const keyword = item.keyword || "";
        return '<button class="keyword-chip" type="button" data-topic-node="true" data-topic-group="keyword" data-topic-label="' + esc(keyword) + '" data-topic-focus="' + esc(keyword) + '"><span>' + esc(keyword) + '</span><span class="count">×' + esc(String(item.count || 0)) + '</span></button>';
      }

      function renderVibeAdviceEvidence(insights) {
        if (!insights) {
          return "Suggestions grounded in simple stack, plan-first, stepwise verification, and modular context control.";
        }
        const persona = ((insights.guidance && insights.guidance.usage_persona) || ["均衡型"]).join(" · ");
        const shortPromptRatio = Math.round(Number(((insights.summary && insights.summary.short_prompt_ratio) || 0)) * 100);
        const compactions = Number((insights.summary && insights.summary.total_compactions) || 0);
        return "Grounded in current signals: persona " + persona + " · short prompts " + shortPromptRatio + "% · compactions " + compactions + ".";
      }

      function renderWeeklyHero(title, copy, metaLabel, stats, highlights) {
        const statItems = Array.isArray(stats) ? stats.filter(Boolean) : [];
        const highlightItems = Array.isArray(highlights) ? highlights.filter(Boolean) : [];
        return '<div class="weekly-report-shell">' +
          '<div class="weekly-hero">' +
            '<div class="weekly-hero-top">' +
              '<div><div class="weekly-kicker">Weekly Brief</div><div class="weekly-hero-title">' + esc(title) + '</div></div>' +
              (metaLabel ? '<span class="meta-pill">' + esc(metaLabel) + '</span>' : '') +
            '</div>' +
            '<div class="weekly-hero-copy">' + esc(copy) + '</div>' +
            (statItems.length ? '<div class="weekly-stat-row">' + statItems.map((item) =>
              '<div class="weekly-stat"><div class="weekly-stat-label">' + esc(item.label || '') + '</div><div class="weekly-stat-value">' + esc(item.value || '-') + '</div></div>'
            ).join('') + '</div>' : '') +
          '</div>' +
          (highlightItems.length ? '<div class="weekly-highlight-list">' + highlightItems.map((item) => '<div class="weekly-highlight">' + esc(item) + '</div>').join('') + '</div>' : '') +
        '</div>';
      }

      function renderWeeklyShift(insights) {
        const report = insights && insights.weekly_report;
        if (!report) {
          const style = insights && insights.style ? insights.style : {};
          const summary = insights && insights.summary ? insights.summary : {};
          const activity = insights && insights.activity ? insights.activity : {};
          const dominant = Array.isArray(style.dominant) ? style.dominant : [];
          const persona = dominant.length ? dominant.slice(0, 2).map((item) => item.label).join(" · ") : "均衡型";
          const topHour = Array.isArray(activity.top_hours) && activity.top_hours.length ? activity.top_hours[0] : null;
          const hourLabel = topHour ? (String(topHour.hour).padStart(2, "0") + ":00") : "Unknown";
          const inputCount = Number(summary.total_inputs || 0);
          const compactions = Number(summary.total_compactions || 0);
          const shortPrompts = Math.round(Number(summary.short_prompt_ratio || 0) * 100) + "%";
          return renderWeeklyHero(
            "Live Snapshot",
            "We do not have enough two-window history yet, so this snapshot summarizes the current working style and activity rhythm.",
            "Fallback",
            [
              { label: "Persona", value: persona },
              { label: "Peak Hour", value: hourLabel },
              { label: "Inputs", value: String(inputCount) },
            ],
            [
              "Context pressure is currently tracked at " + compactions + " compactions.",
              "Short prompt ratio sits around " + shortPrompts + ", which is a useful proxy for context switching pressure.",
              "As more local history accumulates, this panel will upgrade into a real week-on-week report automatically.",
            ]
          );
        }
        const highlights = Array.isArray(report.highlights) ? report.highlights : [];
        const shifts = Array.isArray(report.shifts) ? report.shifts : [];
        const leadShift = shifts.slice().sort((left, right) => Math.abs(Number(right.delta || 0)) - Math.abs(Number(left.delta || 0)))[0];
        const leadShiftLabel = (leadShift && leadShift.label) ? leadShift.label : "weekly rhythm";
        const leadShiftDelta = Math.round(Math.abs(Number((leadShift && leadShift.delta) || 0)) * 100);
        const headline = leadShift
          ? (leadShift.direction === "up"
              ? (leadShiftLabel + " is climbing this week")
              : leadShift.direction === "down"
                ? (leadShiftLabel + " is cooling this week")
                : (leadShiftLabel + " is staying stable"))
          : "Weekly rhythm is settling";
        const copy = leadShift
          ? (leadShift.direction === "up"
              ? ("Compared with the previous window, " + leadShiftLabel + " increased by about " + leadShiftDelta + "%, so the current workflow is leaning further in that direction.")
              : leadShift.direction === "down"
                ? ("Compared with the previous window, " + leadShiftLabel + " decreased by about " + leadShiftDelta + "%, which may be a signal to rebalance next week.")
                : ("Compared with the previous window, the strongest workflow signal stayed broadly flat."))
          : ((highlights[0]) || "We have enough data to compare windows, but no single behavior dominates the shift.");
        return renderWeeklyHero(
          headline,
          copy,
          (report.current_window || "Weekly"),
          [
            { label: "Current Persona", value: ((report.current_persona || ["均衡型"]).join(" · ")) },
            { label: "Previous", value: ((report.previous_persona || ["基线不足"]).join(" · ")) },
            { label: "Inputs", value: String(report.current_inputs || 0) },
          ],
          [
            ...highlights.slice(0, 2),
            ...(shifts.slice(0, 3).map((item) => {
              const deltaPct = Math.round(Math.abs(Number(item.delta || 0)) * 100);
              const arrow = item.direction === "up" ? "↑" : item.direction === "down" ? "↓" : "•";
              return arrow + " " + String(item.label || "Signal") + " " + deltaPct + "%";
            }))
          ]
        );
      }

      function synthTopicMap(insights) {

        if (!insights) return null;
        const keywords = Array.isArray(insights.keywords) ? insights.keywords : [];
        const topThreads = Array.isArray(insights.top_threads) ? insights.top_threads : [];
        const dominant = Array.isArray(insights.style && insights.style.dominant) ? insights.style.dominant : [];
        if (!keywords.length && !topThreads.length && !dominant.length) return null;
        const nodes = [{ id: "center", label: "Codex Workbench", group: "center", weight: 1 }];
        const edges = [];
        dominant.slice(0, 3).forEach((item, index) => {
          const nodeId = "style-" + (index + 1);
          nodes.push({
            id: nodeId,
            label: String(item.label || "风格"),
            group: "style",
            weight: 0.7,
            focus_value: String(item.label || "风格"),
          });
          edges.push({ from: "center", to: nodeId });
        });
        keywords.slice(0, 8).forEach((item, index) => {
          const nodeId = "keyword-" + (index + 1);
          nodes.push({
            id: nodeId,
            label: String(item.keyword || ""),
            group: "keyword",
            weight: 0.5,
            focus_value: String(item.keyword || ""),
          });
          edges.push({ from: dominant.length ? ("style-" + ((index % Math.min(dominant.length, 3)) + 1)) : "center", to: nodeId });
        });
        topThreads.slice(0, 4).forEach((item, index) => {
          const nodeId = "thread-" + (index + 1);
          nodes.push({
            id: nodeId,
            label: String(item.title || item.id || "Thread"),
            group: "thread",
            weight: 0.6,
            thread_id: String(item.id || ""),
          });
          edges.push({ from: "center", to: nodeId });
        });
        return { title: "话题地图", nodes, edges };
      }

      function renderWordCloud(items, insights) {
        const sourceItems = Array.isArray(items) && items.length
          ? items
          : (Array.isArray(insights && insights.keywords) ? insights.keywords : []);
        if (!sourceItems.length) {
          return '<div class="sub">暂无关键词数据</div>';
        }
        const maxCount = Math.max(...sourceItems.map((item) => Number(item.count || 0)), 1);
        return sourceItems.slice(0, 18).map((item) => {
          const ratio = Number(item.count || 0) / maxCount;
          const bucket = ratio >= 0.85 ? 5 : ratio >= 0.65 ? 4 : ratio >= 0.45 ? 3 : ratio >= 0.25 ? 2 : 1;
          const keyword = item.keyword || "";
          return '<button class="word-cloud-token weight-' + bucket + '" type="button" data-topic-node="true" data-topic-group="keyword" data-topic-label="' + esc(keyword) + '" data-topic-focus="' + esc(keyword) + '">' + esc(keyword) + '</button>';
        }).join("");
      }

      function renderInteractionHeatmap(insights) {
        const heatmap = insights && insights.interaction_heatmap;
        const days = Array.isArray(heatmap && heatmap.days) ? heatmap.days : [];
        if (!days.length) {
          return renderCuteEmpty("Interaction heatmap unavailable", "Once local user-input history accumulates, this panel will show a vibe-style contribution grid based only on direct prompts.", MEDIA.rest);
        }
        const monthLabels = Array.isArray(heatmap.month_labels) ? heatmap.month_labels : [];
        const weekdays = Array.isArray(heatmap.weekday_labels) ? heatmap.weekday_labels : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const maxCount = Number(heatmap.max_count || 0);
        const monthTrack = monthLabels.map((item) => {
          const left = Math.max(0, Number(item.week_index || 0)) * 17;
          return '<span class="interaction-heatmap-month-label" style="left:' + esc(String(left)) + 'px">' + esc(item.label || "") + '</span>';
        }).join("");
        const grid = days.map((item) => {
          const count = Number(item.count || 0);
          const level = Math.max(0, Math.min(4, Number(item.level || 0)));
          const title = (item.date || "") + " · " + String(count) + " user input" + (count === 1 ? "" : "s");
          return '<span class="interaction-cell level-' + esc(String(level)) + '" title="' + esc(title) + '"></span>';
        }).join("");
        let activeStreak = 0;
        let longestStreak = 0;
        let currentRun = 0;
        days.forEach((item) => {
          const count = Number(item.count || 0);
          if (count > 0) {
            currentRun += 1;
            longestStreak = Math.max(longestStreak, currentRun);
          } else {
            currentRun = 0;
          }
        });
        for (let index = days.length - 1; index >= 0; index -= 1) {
          if (Number(days[index].count || 0) > 0) activeStreak += 1;
          else break;
        }
        const weekdayLabels = weekdays.map((label, index) => '<span>' + esc(index % 2 === 0 ? label : "") + '</span>').join("");
        return '<div class="interaction-heatmap-shell">' +
          '<div class="interaction-heatmap-meta">' +
            '<span class="meta-pill">' + esc(String((heatmap.window_label) || "Recent weeks")) + '</span>' +
            '<span class="meta-pill">' + esc(String(heatmap.total_inputs || 0)) + ' inputs</span>' +
            '<span class="meta-pill">' + esc(String(heatmap.active_days || 0)) + ' active days</span>' +
            '<span class="meta-pill">active streak ' + esc(String(activeStreak)) + '</span>' +
            '<span class="meta-pill">longest ' + esc(String(longestStreak)) + '</span>' +
            (maxCount ? '<span class="meta-pill">peak ' + esc(String(maxCount)) + '/day</span>' : '') +
          '</div>' +
          '<div class="interaction-heatmap-board">' +
            '<div class="interaction-heatmap-months"><span></span><div class="interaction-heatmap-month-track">' + monthTrack + '</div></div>' +
            '<div class="interaction-heatmap-grid-wrap">' +
              '<div class="interaction-heatmap-weekdays">' + weekdayLabels + '</div>' +
              '<div class="interaction-heatmap-grid">' + grid + '</div>' +
            '</div>' +
            '<div class="interaction-heatmap-legend">' +
              '<span class="sub">' + esc((heatmap.basis) || "Only direct user inputs are counted here.") + '</span>' +
              '<span class="interaction-heatmap-legend-scale">Less <span class="interaction-cell level-0"></span><span class="interaction-cell level-1"></span><span class="interaction-cell level-2"></span><span class="interaction-cell level-3"></span><span class="interaction-cell level-4"></span> More</span>' +
            '</div>' +
          '</div>' +
        '</div>';
      }

      function parseIsoDayUtc(day) {
        const match = String(day || "").match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
        if (!match) return null;
        return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      }

      function formatIsoDayUtc(timeMs) {
        return new Date(timeMs).toISOString().slice(0, 10);
      }

      function normalizeDailyTokenBuckets(days, maxDays = 28) {
        const buckets = new Map();
        (Array.isArray(days) ? days : []).forEach((item) => {
          const day = String(item && item.day || "").slice(0, 10);
          if (!parseIsoDayUtc(day)) return;
          const current = buckets.get(day) || { day, total_tokens: 0, events: 0, thread_count: 0 };
          current.total_tokens += Number(item.total_tokens || 0);
          current.events += Number(item.events || 0);
          current.thread_count += Number(item.thread_count || 0);
          buckets.set(day, current);
        });
        const sortedDays = [...buckets.keys()].sort();
        if (!sortedDays.length) return [];
        const oneDayMs = 24 * 60 * 60 * 1000;
        const lastMs = parseIsoDayUtc(sortedDays[sortedDays.length - 1]);
        const firstRecordedMs = parseIsoDayUtc(sortedDays[0]);
        const startMs = Math.max(firstRecordedMs, lastMs - (Math.max(1, Number(maxDays || 28)) - 1) * oneDayMs);
        const normalized = [];
        for (let cursor = startMs; cursor <= lastMs; cursor += oneDayMs) {
          const day = formatIsoDayUtc(cursor);
          normalized.push(buckets.get(day) || { day, total_tokens: 0, events: 0 });
        }
        return normalized;
      }

      function tokenDayFromThread(thread) {
        const raw = (thread && (thread.updated_at_iso || thread.updated_at || thread.created_at_iso || thread.created_at)) || "";
        if (typeof raw === "number" || /^\\d+$/.test(String(raw))) {
          const num = Number(raw);
          if (Number.isFinite(num) && num > 0) {
            const ms = num > 1000000000000 ? num : num * 1000;
            return new Date(ms).toISOString().slice(0, 10);
          }
        }
        const parsed = Date.parse(String(raw || ""));
        if (Number.isFinite(parsed)) return new Date(parsed).toISOString().slice(0, 10);
        const textDay = String(raw || "").slice(0, 10);
        return parseIsoDayUtc(textDay) ? textDay : "";
      }

      function buildThreadTokenDays(threads) {
        const buckets = new Map();
        (Array.isArray(threads) ? threads : []).forEach((thread) => {
          const totalTokens = Number(thread && thread.tokens_used || 0);
          const day = tokenDayFromThread(thread);
          if (!day || !parseIsoDayUtc(day) || !Number.isFinite(totalTokens) || totalTokens <= 0) return;
          const current = buckets.get(day) || { day, total_tokens: 0, events: 0, thread_count: 0 };
          current.total_tokens += totalTokens;
          current.thread_count += 1;
          buckets.set(day, current);
        });
        return [...buckets.values()].sort((a, b) => String(a.day).localeCompare(String(b.day)));
      }

      function renderTokenTrend(insights, threads = []) {
        const threadDays = buildThreadTokenDays(threads);
        const ledgerDays = Array.isArray(insights && insights.activity && insights.activity.recent_token_days)
          ? insights.activity.recent_token_days.filter((item) => item && item.day)
          : [];
        const useThreadDays = threadDays.length > 0;
        const days = useThreadDays ? threadDays : ledgerDays;
        if (!days.length && insights && insights.summary && Number(insights.summary.total_tokens || 0) > 0) {
          const day = String(insights.summary.last_token_event_at || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
          days.push({ day, total_tokens: Number(insights.summary.total_tokens || 0), events: 1 });
        }
        if (!days.length) {
          return renderCuteEmpty("No token trend yet", "No thread token totals are available yet. Scan Codex sessions or generate token insights after CLI runs.", MEDIA.waiting);
        }
        const recent = normalizeDailyTokenBuckets(days, useThreadDays ? 84 : 28);
        if (!recent.length) {
          return renderCuteEmpty("No token trend yet", "Token data exists, but timestamps could not be grouped by day. Scan sessions or regenerate token insights after the next CLI run.", MEDIA.waiting);
        }
        const width = 720;
        const height = 170;
        const padX = 18;
        const padY = 18;
        const baseline = height - padY;
        const maxTokens = Math.max(...recent.map((item) => Number(item.total_tokens || 0)), 1);
        const slot = (width - padX * 2) / Math.max(recent.length, 1);
        const barWidth = Math.min(22, Math.max(4, slot * 0.52));
        const points = recent.map((item, index) => {
          const x = padX + (slot * index) + slot / 2;
          const y = baseline - ((Number(item.total_tokens || 0) / maxTokens) * (height - padY * 2));
          return { x, y, item };
        });
        const line = points.map((point) => point.x.toFixed(1) + "," + point.y.toFixed(1)).join(" ");
        const area = points.length
          ? (points[0].x.toFixed(1) + "," + baseline + " " + line + " " + (points[points.length - 1].x.toFixed(1)) + "," + baseline)
          : "";
        const total = recent.reduce((sum, item) => sum + Number(item.total_tokens || 0), 0);
        const barMarkup = points.map((point) => {
          const value = Number(point.item.total_tokens || 0);
          const barHeight = Math.max(value > 0 ? 2 : 0, baseline - point.y);
          const y = baseline - barHeight;
          const count = Number((useThreadDays ? point.item.thread_count : point.item.events) || 0);
          const unit = useThreadDays ? "thread" : "event";
          return '<rect class="token-chart-bar" x="' + esc((point.x - barWidth / 2).toFixed(1)) + '" y="' + esc(y.toFixed(1)) + '" width="' + esc(barWidth.toFixed(1)) + '" height="' + esc(barHeight.toFixed(1)) + '" rx="4"><title>' +
            esc(String(point.item.day) + " · " + compactTokenCount(value) + " tokens · " + String(count) + " " + unit + (count === 1 ? "" : "s")) +
          '</title></rect>';
        }).join("");
        const pointMarkup = points.map((point) =>
          '<circle class="token-chart-point" cx="' + esc(point.x.toFixed(1)) + '" cy="' + esc(point.y.toFixed(1)) + '" r="3"><title>' +
            esc(String(point.item.day) + " · " + compactTokenCount(point.item.total_tokens) + " tokens") +
          '</title></circle>'
        ).join("");
        const basis = useThreadDays
          ? "All loaded threads · grouped by last updated day"
          : "Known CLI token events · missing days filled as 0";
        return '<div class="token-trend-card">' +
          '<div class="token-trend-head"><div><strong>Token Trend</strong><div class="sub">Daily token usage · ' + esc(basis) + ' · last ' + esc(String(recent.length)) + ' day' + (recent.length === 1 ? "" : "s") + '</div></div><span class="meta-pill">' + esc(compactTokenCount(total)) + ' tokens</span></div>' +
          '<svg class="token-chart" viewBox="0 0 ' + esc(String(width)) + ' ' + esc(String(height)) + '" role="img" aria-label="Token trend chart">' +
            '<defs><linearGradient id="tokenBarGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#7ee7ff"></stop><stop offset="100%" stop-color="#ffd66b"></stop></linearGradient></defs>' +
            '<line class="token-chart-grid" x1="' + esc(String(padX)) + '" y1="' + esc(String(height - padY)) + '" x2="' + esc(String(width - padX)) + '" y2="' + esc(String(height - padY)) + '"></line>' +
            '<line class="token-chart-grid" x1="' + esc(String(padX)) + '" y1="' + esc(String(padY)) + '" x2="' + esc(String(width - padX)) + '" y2="' + esc(String(padY)) + '"></line>' +
            (area ? '<polygon class="token-chart-area" points="' + esc(area) + '"></polygon>' : '') +
            barMarkup +
            '<polyline class="token-chart-line" points="' + esc(line) + '"></polyline>' +
            pointMarkup +
            '<text class="token-axis" x="' + esc(String(padX)) + '" y="' + esc(String(height - 4)) + '">' + esc(recent[0].day || "") + '</text>' +
            '<text class="token-axis" text-anchor="end" x="' + esc(String(width - padX)) + '" y="' + esc(String(height - 4)) + '">' + esc(recent[recent.length - 1].day || "") + '</text>' +
          '</svg>' +
        '</div>';
      }

      function fallbackTokenRankingFromThreads(threads) {
        return (Array.isArray(threads) ? threads : [])
          .map((thread) => ({
            thread_id: thread.id,
            title: displayThreadTitle(thread, thread.id || "Thread"),
            total_tokens: Number(thread.tokens_used || 0),
            input_tokens: 0,
            output_tokens: 0,
            event_count: 0,
          }))
          .filter((item) => item.thread_id && item.total_tokens > 0)
          .sort((a, b) => b.total_tokens - a.total_tokens)
          .slice(0, 12)
          .map((item, index) => ({ ...item, rank: index + 1 }));
      }

      function looksLikeThreadId(value) {
        const text = String(value || "").trim();
        return /^0[0-9a-f]{2,}[-_][0-9a-f-]{10,}$/i.test(text) || /^[0-9a-f]{8,}-[0-9a-f-]{12,}$/i.test(text);
      }

      function resolveTokenThreadTitle(item, threadMap) {
        const threadId = String((item && item.thread_id) || "").trim();
        const thread = threadMap.get(threadId);
        if (thread) return displayThreadTitle(thread, "Thread");
        const candidate = String((item && item.title) || "").trim();
        if (candidate && candidate !== threadId && !looksLikeThreadId(candidate)) return candidate;
        return "Untitled Codex thread";
      }

      function renderTokenThreadRanking(insights, threads = []) {
        const rows = Array.isArray(insights && insights.token_top_threads) && insights.token_top_threads.length
          ? insights.token_top_threads
          : fallbackTokenRankingFromThreads(threads);
        if (!rows.length) {
          return renderCuteEmpty("No thread token ranking yet", "This ranking is pure local counting. It appears after token usage is present in the usage ledger or thread metadata.", MEDIA.rest);
        }
        const threadMap = new Map((Array.isArray(threads) ? threads : []).filter((thread) => thread && thread.id).map((thread) => [String(thread.id), thread]));
        const maxTokens = Math.max(...rows.map((item) => Number(item.total_tokens || 0)), 1);
        return '<div class="token-ranking-card">' +
          '<div class="token-ranking-head"><div><strong>Thread Token Ranking</strong><div class="sub">Ranked by known Codex CLI usage events</div></div><span class="meta-pill">Top ' + esc(String(Math.min(rows.length, 12))) + '</span></div>' +
          '<div class="token-ranking-list">' +
            rows.slice(0, 12).map((item, index) => {
              const total = Number(item.total_tokens || 0);
              const pct = Math.max(2, Math.min(100, (total / maxTokens) * 100));
              const title = resolveTokenThreadTitle(item, threadMap);
              return '<div class="token-ranking-row" title="' + esc(item.thread_id || "") + '">' +
                '<div class="token-ranking-rank">#' + esc(String(item.rank || index + 1)) + '</div>' +
                '<div><div class="token-ranking-title">' + esc(short(title, 54)) + '</div><div class="token-ranking-bar"><span class="token-ranking-fill" style="width:' + esc(pct.toFixed(1)) + '%"></span></div></div>' +
                '<div class="token-ranking-value">' + esc(compactTokenCount(total)) + '</div>' +
              '</div>';
            }).join("") +
          '</div>' +
        '</div>';
      }

      function topicNodeMatchesFocus(node, focus) {
        if (!node || !focus) return false;
        if ((focus.group || "") === "thread") {
          return node.group === "thread" && String(node.thread_id || "") === String(focus.threadId || "");
        }
        return node.group === focus.group && String(node.focus_value || node.label || "") === String(focus.value || "");
      }

      function renderTopicMap(map, focus, insights) {
        const resolvedMap = map && Array.isArray(map.nodes) && map.nodes.length ? map : synthTopicMap(insights);
        if (!resolvedMap || !Array.isArray(resolvedMap.nodes) || !resolvedMap.nodes.length) {
          return renderCuteEmpty("Topic map pending", "As more threads and prompts accumulate, we will connect your hot topics here.", MEDIA.board);
        }
        const center = resolvedMap.nodes.find((node) => node.id === "center") || { id: "center", label: "Codex Workbench", group: "center" };
        const styles = resolvedMap.nodes.filter((node) => node.group === "style");
        const keywords = resolvedMap.nodes.filter((node) => node.group === "keyword");
        const threads = resolvedMap.nodes.filter((node) => node.group === "thread");
        const positions = {};
        positions[center.id] = { x: 310, y: 160, w: 136, h: 40 };
        const placeRing = (items, radius, startAngle, key) => {
          items.forEach((item, index) => {
            const angle = startAngle + (Math.PI * 2 * index) / Math.max(items.length, 1);
            positions[item.id] = {
              x: 310 + Math.cos(angle) * radius,
              y: 160 + Math.sin(angle) * radius,
              w: key === "thread" ? 150 : 108,
              h: 34,
            };
          });
        };
        placeRing(styles, 92, -Math.PI / 2, "style");
        placeRing(keywords, 176, -Math.PI / 3, "keyword");
        placeRing(threads, 236, Math.PI / 5, "thread");

        const edges = (resolvedMap.edges || []).map((edge) => {
          const from = positions[edge.from];
          const to = positions[edge.to];
          if (!from || !to) return "";
          return '<line class="topic-edge" x1="' + from.x + '" y1="' + from.y + '" x2="' + to.x + '" y2="' + to.y + '"></line>';
        }).join("");
        const nodes = resolvedMap.nodes.map((node) => {
          const pos = positions[node.id];
          if (!pos) return "";
          const x = pos.x - pos.w / 2;
          const y = pos.y - pos.h / 2;
          const isActive = topicNodeMatchesFocus(node, focus);
          const attrs = [
            'class="topic-node interactive ' + esc(node.group || "keyword") + (isActive ? ' active' : '') + '"',
            'data-topic-node="true"',
            'data-topic-group="' + esc(node.group || "") + '"',
            'data-topic-label="' + esc(node.label || "") + '"',
            node.thread_id ? 'data-topic-thread="' + esc(node.thread_id) + '"' : '',
            node.focus_value ? 'data-topic-focus="' + esc(node.focus_value) + '"' : '',
          ].filter(Boolean).join(" ");
          return '<g ' + attrs + '>' +
            '<rect x="' + x + '" y="' + y + '" rx="12" ry="12" width="' + pos.w + '" height="' + pos.h + '"></rect>' +
            '<text x="' + pos.x + '" y="' + (pos.y + 4) + '" text-anchor="middle">' + esc(short(String(node.label || ""), node.group === "thread" ? 22 : 16)) + '</text>' +
          '</g>';
        }).join("");
        return '<svg viewBox="0 0 620 320" role="img" aria-label="topic map">' + edges + nodes + '</svg>';
      }

      function activeWorkspaceRootKeys(payload = state.payload) {
        const roots = Array.isArray(payload && payload.workspaceRoots) ? payload.workspaceRoots : [];
        return new Set(roots.map((item) => String(item && item.rootKey || "").trim()).filter(Boolean));
      }

      function renderThreadSummaryMarkup(visibleCount, totalCount, topicFocus, sort, rootFilter, workspaceFilter, threadTabFilter = activeThreadTabFilterKey()) {
        const rootLabel = rootFilter ? compactRootIdentity(rootFilter) : "";
        const tabLabel = threadTabFilter && threadTabFilter !== "all" ? threadTabFilter : "";
        const summaryText = visibleCount
          ? (
              topicFocus
                ? ("Showing " + visibleCount + " linked threads from topic map · " + (topicFocus.group === "thread" ? "focused thread" : (topicFocus.value || topicFocus.group)) + (tabLabel ? " · tab " + tabLabel : ""))
                : workspaceFilter && rootFilter
                  ? ("Showing " + visibleCount + " of " + totalCount + " loaded threads · active workspace · root " + rootLabel + (tabLabel ? " · tab " + tabLabel : "") + " · sorted by " + sort)
                : workspaceFilter
                  ? ("Showing " + visibleCount + " of " + totalCount + " loaded threads · active workspace" + (tabLabel ? " · tab " + tabLabel : "") + " · sorted by " + sort)
                : rootFilter
                  ? ("Showing " + visibleCount + " of " + totalCount + " loaded threads · root " + rootLabel + (tabLabel ? " · tab " + tabLabel : "") + " · sorted by " + sort)
                : ("Showing " + visibleCount + " of " + totalCount + " loaded threads" + (tabLabel ? " · tab " + tabLabel : "") + " · sorted by " + sort)
            )
          : (tabLabel ? ("No threads match tab " + tabLabel + " with the current filters.") : (topicFocus ? "No threads match the current topic-map focus." : (workspaceFilter ? "No threads match the active workspace filter." : (rootFilter ? "No threads match the current root filter." : "No threads match the current search/filter."))));
        const actions = [];
        const workspaceRoots = Array.isArray(state.payload && state.payload.workspaceRoots) ? state.payload.workspaceRoots : [];
        if (topicFocus) actions.push('<button class="chip" data-clear-topic-focus="true" type="button">Clear topic focus</button>');
        if (workspaceRoots.length) actions.push('<button class="chip' + (workspaceFilter ? ' active' : '') + '" data-toggle-workspace-filter="true" type="button">' + esc(workspaceFilter ? 'Show All Roots' : 'Active Workspace') + '</button>');
        if (rootFilter) actions.push('<button class="chip" data-clear-root-filter="true" type="button">Clear root filter</button>');
        if (tabLabel) actions.push('<button class="chip" data-clear-thread-tab-filter="true" type="button">Clear tab filter</button>');
        if (!actions.length) return esc(summaryText);
        return '<span>' + esc(summaryText) + '</span> ' + actions.join(" ");
      }

      function renderThreadCountSummaryStats(allThreads, visibleThreads, payload = state.payload) {
        const all = Array.isArray(allThreads) ? allThreads : [];
        const visible = Array.isArray(visibleThreads) ? visibleThreads : [];
        const dashboard = (payload && payload.dashboard) || {};
        const running = Array.isArray(dashboard.runningThreads)
          ? dashboard.runningThreads.filter((thread) => effectiveThreadStatus(thread, payload) === "running").length
          : all.filter((thread) => effectiveThreadStatus(thread, payload) === "running").length;
        const pinned = all.filter((thread) => isPinned(thread.id)).length;
        const needsHuman = all.filter((thread) => needsHumanIntervention(thread)).length;
        const archived = all.filter((thread) => Boolean(thread.archived) || effectiveThreadStatus(thread, payload) === "archived").length;
        const deleted = all.filter((thread) => Boolean(thread.soft_deleted)).length;
        return [
          drawerStat("Total", String(all.length || 0)),
          drawerStat("Visible", String(visible.length || 0)),
          drawerStat("Running", String(running || 0)),
          drawerStat("Pinned", String(pinned || 0)),
          drawerStat("Needs Human", String(needsHuman || 0)),
          drawerStat("Archived / Deleted", String(archived || 0) + " / " + String(deleted || 0))
        ].join("");
      }

      function tabManagementSummary(allThreads) {
        const all = Array.isArray(allThreads) ? allThreads : [];
        const order = boardTabOrderList();
        const counts = {};
        order.forEach((name) => {
          counts[name] = 0;
        });
        let assigned = 0;
        all.forEach((thread) => {
          const name = boardTabFor(thread && thread.id);
          if (!name) return;
          assigned += 1;
          if (!counts[name]) counts[name] = 0;
          counts[name] = (counts[name] || 0) + 1;
        });
        const extraNames = Object.keys(counts).filter((name) => !order.includes(name)).sort((a, b) => a.localeCompare(b));
        const tabs = order.concat(extraNames);
        return {
          tabs,
          counts,
          assigned,
          unassigned: Math.max(0, all.length - assigned),
          activeFilter: activeThreadTabFilterKey(),
          activeBoardTab: activeBoardTabKey(),
        };
      }

      function renderTabManagementStats(allThreads) {
        const summary = tabManagementSummary(allThreads);
        return [
          drawerStat("Tabs", String(summary.tabs.length || 0)),
          drawerStat("Assigned", String(summary.assigned || 0)),
          drawerStat("Unassigned", String(summary.unassigned || 0)),
          drawerStat("Filter", summary.activeFilter === "all" ? "All" : summary.activeFilter)
        ].join("");
      }

      function renderTabManagementList(allThreads) {
        const summary = tabManagementSummary(allThreads);
        if (!summary.tabs.length) {
          return '<div class="section-note">No tabs yet. Create one, then use Set to Tab on selected threads.</div>';
        }
        return summary.tabs.slice(0, 8).map((name) =>
          '<button class="tab-management-chip' + (summary.activeFilter === name ? ' active' : '') + '" data-thread-tab-filter-option="' + esc(name) + '" type="button">' +
            '<span class="tab-management-name"' + boardTabStyle(name, false) + '>' + esc(name) + '</span>' +
            '<span class="meta-pill">' + esc(String(summary.counts[name] || 0)) + '</span>' +
          '</button>'
        ).join("") +
        (summary.tabs.length > 8 ? '<span class="meta-pill">+' + esc(String(summary.tabs.length - 8)) + ' more</span>' : '');
      }

      function renderToolIcon(name, filled = false) {
        const icons = {
          rename: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 11.5V13h1.5L11.8 5.7 10.3 4.2 3 11.5Z"></path><path d="M9.8 4.7 11.3 3.2 12.8 4.7 11.3 6.2"></path></svg>',
          open: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4h6v6"></path><path d="M5 11 12 4"></path><path d="M12 9.5V12H4V4h2.5"></path></svg>',
          prompt: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3.5h10v7H7.5L5 13v-2.5H3z"></path><path d="M5.5 6.2h5"></path><path d="M5.5 8.4h3.8"></path></svg>',
          codex: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5 12.5 5v6L8 13.5 3.5 11V5L8 2.5Z"></path><path d="M5.5 6.2 8 7.7l2.5-1.5"></path><path d="M8 7.8V11"></path></svg>',
          board: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="3" width="11" height="10" rx="2"></rect><path d="M7.5 3v10"></path><path d="M2.5 7.8h11"></path></svg>',
          pin: filled
            ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2 10.2 6l3.6.6-2.5 2.5.5 3.7L8 11l-3.8 1.8.5-3.7L2.2 6.6 5.8 6 8 2.2Z" style="fill:currentColor;stroke:none"></path></svg>'
            : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2 10.2 6l3.6.6-2.5 2.5.5 3.7L8 11l-3.8 1.8.5-3.7L2.2 6.6 5.8 6 8 2.2Z"></path></svg>',
        };
        return '<span class="tool-icon">' + (icons[name] || '') + '</span>';
      }

      function short(value, len = 120) {
        if (!value) return "";
        return value.length > len ? value.slice(0, len) + "..." : value;
      }

      function tailShort(value, len = 18) {
        const text = String(value || "");
        const max = Number(len || 18);
        if (!text || text.length <= max) return text;
        return "…" + text.slice(Math.max(0, text.length - Math.max(1, max - 1)));
      }

      function byId(id) {
        return document.getElementById(id);
      }

      function setNodeText(id, value) {
        const node = byId(id);
        if (node) node.textContent = value;
        return node;
      }

      function setNodeHtml(id, value) {
        const node = byId(id);
        if (node) node.innerHTML = value;
        return node;
      }

      function setNodeClassName(id, value) {
        const node = byId(id);
        if (node) node.className = value;
        return node;
      }

      function setNodeActive(id, active) {
        const node = byId(id);
        if (node) node.classList.toggle("active", Boolean(active));
        return node;
      }

      function setInputValue(id, value) {
        const node = byId(id);
        if (node && node.value !== value) node.value = value;
        return node;
      }

      function bindIfPresent(id, eventName, handler) {
        const node = byId(id);
        if (node) {
          node.addEventListener(eventName, (event) => {
            try {
              handler(event);
            } catch (error) {
              const detail = error instanceof Error ? error.message : String(error || "Unknown bound-handler error");
              vscode.postMessage({
                type: "bootError",
                error: "Bound handler failed for " + id + " (" + eventName + "): " + detail,
              });
            }
          });
        }
        return node;
      }

      function compactRootIdentity(cwd) {
        const raw = String(cwd || "").trim();
        if (!raw) return "-";
        const normalized = raw.replace(/\\\\/g, "/").replace(/\\/+$/, "");
        if (!normalized) return raw;
        const parts = normalized.split("/").filter(Boolean);
        if (!parts.length) return raw;
        return parts[parts.length - 1] || raw;
      }

      function threadRootKey(thread) {
        if (!thread || typeof thread !== "object") return "";
        return String(thread.rootKey || thread.cwd || "").trim();
      }

      function threadRootLabel(thread) {
        if (!thread || typeof thread !== "object") return "-";
        return String(thread.rootLabel || compactRootIdentity(thread.rootKey || thread.cwd || "")).trim() || "-";
      }

      function renderRootIdentityPill(threadOrPath, options = {}) {
        const thread = threadOrPath && typeof threadOrPath === "object"
          ? threadOrPath
          : { cwd: threadOrPath };
        const fullPath = threadRootKey(thread);
        const root = threadRootLabel(thread);
        if (!options.interactive) {
          return '<span class="meta-pill mono" title="' + esc(fullPath || "-") + '">Root ' + esc(short(root, 20)) + '</span>';
        }
        const active = state.ui.rootFilter && (state.ui.rootFilter === fullPath || state.ui.rootFilter === root);
        return '<button class="meta-pill mono' + (active ? ' active' : '') + '" type="button" data-root-filter="' + esc(fullPath || root) + '" title="' + esc(fullPath || "-") + '">Root ' + esc(short(root, 20)) + '</button>';
      }

      function formatTimestamp(value) {
        if (!value) return "none";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      }

      function formatFreshnessTimestamp(value) {
        if (!value) return "unknown time";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString([], {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        });
      }

      function isOlderThanThreshold(value, thresholdMs) {
        if (!value) return false;
        const time = new Date(value).getTime();
        if (Number.isNaN(time)) return false;
        return (Date.now() - time) > thresholdMs;
      }

      function statusBadge(status) {
        return '<span class="badge badge-' + esc(status) + '">' + esc(status) + '</span>';
      }

      function effectiveRunningIdSet(payload = state.payload) {
        return new Set((payload && payload.effectiveRunningThreadIds) || []);
      }

      function tabProjectionFor(payload = state.payload) {
        return (payload && (payload.codexLinkState || payload.codexTabProjection)) || { openThreadIds: [], focusedThreadId: undefined, tabGroups: [] };
      }

      function coordinationTruthFor(thread) {
        const truth = thread && thread.coordinationTruth;
        if (truth && typeof truth === "object") return truth;
        const meta = thread && thread.coordinationState;
        return {
          key: (meta && meta.key) || "waiting",
          label: (meta && meta.label) || "Waiting",
          reason: (meta && meta.reason) || "Ready for a follow-up assignment or baton pass.",
          needsHuman: Boolean(meta && meta.key === "handoff"),
          bucket: (meta && meta.key === "handoff") ? "urgent" : "ready",
          source: "webview-fallback",
        };
      }

      function normalizeHandoffCueBucket(value) {
        const key = normalize(value);
        if (key === "blocked" || key === "waiting") return key;
        return "urgent";
      }

      function findThreadByReference(reference, payload = state.payload) {
        const raw = String(reference || "").trim();
        if (!raw) return undefined;
        const normalized = raw.toLowerCase();
        const threads = ((payload && payload.dashboard && payload.dashboard.threads) || []);
        return threads.find((thread) => String(thread.id || "") === raw)
          || threads.find((thread) => String(displayThreadTitle(thread, "") || "").trim().toLowerCase() === normalized)
          || threads.find((thread) => String(thread.title || "").trim().toLowerCase() === normalized);
      }

      function handoffObjectsFor(payload = state.payload) {
        return (payload && payload.handoffObjects) || {};
      }

      function handoffObjectFor(threadId, payload = state.payload) {
        if (!threadId) return undefined;
        const handoffObject = handoffObjectsFor(payload)[threadId];
        return handoffObject && handoffObject.active !== false ? handoffObject : undefined;
      }

      function handoffTargetLabel(handoffObject, payload = state.payload) {
        if (!handoffObject) return "";
        if (handoffObject.targetThreadId) {
          const target = findThreadInPayload(handoffObject.targetThreadId, payload);
          if (target) return displayThreadTitle(target, handoffObject.targetThreadId);
        }
        return String(handoffObject.targetLabel || "").trim();
      }

      function effectiveCoordinationTruth(thread, payload = state.payload) {
        const base = coordinationTruthFor(thread);
        const handoffObject = handoffObjectFor(thread && thread.id, payload);
        if (!handoffObject) return base;
        return {
          key: "handoff",
          label: "Handoff",
          reason: String(handoffObject.note || base.reason || "Explicit handoff cue").trim() || "Explicit handoff cue",
          needsHuman: true,
          bucket: normalizeHandoffCueBucket(handoffObject.bucket),
          source: handoffObject.source || "host-storage-v1",
          explicit: true,
          targetThreadId: handoffObject.targetThreadId || undefined,
          targetLabel: handoffTargetLabel(handoffObject, payload),
          updatedAt: handoffObject.updatedAt || handoffObject.createdAt || "",
        };
      }

      function upsertHandoffCue(threadId) {
        const thread = findThreadInPayload(threadId);
        if (!thread) return;
        const current = handoffObjectFor(threadId) || {};
        const targetPrompt = window.prompt(
          "Optional next owner thread id or exact title. Leave empty if the handoff is unassigned.",
          current.targetThreadId || current.targetLabel || "",
        );
        if (targetPrompt === null) return;
        const notePrompt = window.prompt(
          "What needs to happen next?",
          current.note || "Review the latest state and take over the next slice.",
        );
        if (notePrompt === null) return;
        const bucketPrompt = window.prompt(
          "Handoff bucket: urgent, blocked, or waiting",
          current.bucket || "urgent",
        );
        if (bucketPrompt === null) return;
        const target = findThreadByReference(targetPrompt);
        vscode.postMessage({
          type: "setHandoffObject",
          handoff: {
            threadId,
            note: String(notePrompt || "").trim() || "Explicit handoff cue",
            bucket: normalizeHandoffCueBucket(bucketPrompt),
            targetThreadId: target ? target.id : undefined,
            targetLabel: target ? displayThreadTitle(target, target.id) : String(targetPrompt || "").trim(),
          },
        });
      }

      function clearHandoffCue(threadId) {
        if (!threadId) return;
        vscode.postMessage({
          type: "clearHandoffObject",
          threadId,
        });
      }

      function effectiveThreadStatus(thread, payload = state.payload) {
        if (!thread) return "idle";
        const rawStatus = normalize(thread.status) || "idle";
        if (rawStatus !== "running") return rawStatus;
        if (effectiveRunningIdSet(payload).has(thread.id)) return "running";
        const link = codexLinkMeta(thread.id, payload);
        if (link.isFocused || link.isOpen || link.pending) return "linked";
        if ((thread.board_source || "") === "attached") return "attached";
        return "recent";
      }

      function prunePendingCodexLinks() {
        const now = Date.now();
        Object.keys(state.ui.pendingCodexLink).forEach((threadId) => {
          const entry = state.ui.pendingCodexLink[threadId];
          if (!entry || entry.expiresAt <= now) {
            delete state.ui.pendingCodexLink[threadId];
          }
        });
      }

      function setSelectedThread(threadId, options = {}) {
        if (!threadId) return;
        state.selectedThreadId = threadId;
        if (options.scrollIntoView) {
          state.pendingScrollThreadId = threadId;
        }
        if (options.openDrawer) {
          state.ui.drawerOpen = true;
        }
        if (options.view) {
          state.ui.currentView = options.view;
        }
        persistUi();
      }

      function markCodexLinking(threadId, mode = "sidebar") {
        if (!threadId) return;
        state.ui.pendingCodexLink[threadId] = {
          mode,
          expiresAt: Date.now() + 12000,
        };
        setSelectedThread(threadId);
      }

      function threadGroupKey(thread) {
        if (!thread) return "recent";
        const status = normalize(thread.status);
        const archived = Boolean(thread.archived) || status === "archived";
        if (thread.soft_deleted) return "soft_deleted";
        if (archived) return "archived";
        if (status === "running") return "running";
        if (status === "recent") return "recent";
        return "idle";
      }

      function scrollFocusedCodexThreadIntoView(payload) {
        const focusedThreadId = tabProjectionFor(payload).focusedThreadId;
        if (!focusedThreadId) {
          state.lastAutoScrolledFocusedThreadId = undefined;
          return;
        }
        if (state.lastAutoScrolledFocusedThreadId === focusedThreadId) {
          return;
        }
        state.lastAutoScrolledFocusedThreadId = focusedThreadId;
        window.requestAnimationFrame(() => {
          const targets = Array.from(document.querySelectorAll("[data-thread-id]"))
            .filter((node) => node.dataset.threadId === focusedThreadId);
          targets.forEach((node) => {
            const pane = node.closest(".workspace-pane");
            const visible = !pane || pane.classList.contains("active");
            if (visible || targets.length === 1) {
              node.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
            }
          });
        });
      }

      function scrollPendingThreadIntoView() {
        const threadId = state.pendingScrollThreadId;
        if (!threadId) return;
        window.requestAnimationFrame(() => {
          const targets = Array.from(document.querySelectorAll("[data-thread-id]"))
            .filter((node) => node.dataset.threadId === threadId);
          const preferred = targets.find((node) => {
            const pane = node.closest(".workspace-pane");
            return !pane || pane.classList.contains("active");
          }) || targets[0];
          if (preferred) {
            preferred.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
          }
          state.pendingScrollThreadId = undefined;
        });
      }

      function syncFocusedCodexGroup(payload) {
        const focusedThreadId = tabProjectionFor(payload).focusedThreadId;
        if (!focusedThreadId) return;
        const focusedThread = ((payload && payload.dashboard && payload.dashboard.threads) || []).find((thread) => thread.id === focusedThreadId);
        if (!focusedThread) return;
        const groupKey = threadGroupKey(focusedThread);
        if (!state.ui.groups[groupKey]) {
          state.ui.groups[groupKey] = true;
          persistUi();
        }
      }

      const BATCH_ACTIONS = {
        attach_board: { label: "Add to Board" },
        archive: { label: "Archive" },
        unarchive: { label: "Unarchive" },
        restore: { label: "Restore" },
        soft_delete: {
          label: "Soft Delete",
          intentLabel: "Confirm Soft Delete",
          summary: "Move the selected threads into the deleted bucket.",
          confirmLabel: "Confirm Soft Delete",
          tone: "warn",
          requiresConfirm: true,
        },
        hard_delete: {
          label: "Hard Delete",
          intentLabel: "Confirm Hard Delete",
          summary: "Permanently remove the selected threads and their logs.",
          confirmLabel: "Delete Permanently",
          tone: "danger",
          requiresConfirm: true,
        },
      };

      function normalize(value) {
        return (value || "").toString().toLowerCase();
      }

      function getBatchActionMeta(action) {
        return BATCH_ACTIONS[action] || { label: action || "Action" };
      }

      function sameIdSet(left, right) {
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
        const sortedLeft = [...left].sort();
        const sortedRight = [...right].sort();
        return sortedLeft.every((id, index) => id === sortedRight[index]);
      }

      function setPendingBatch(action, threadIds) {
        state.ui.pendingBatch = {
          action,
          threadIds: [...threadIds],
        };
      }

      function clearPendingBatch() {
        state.ui.pendingBatch = undefined;
      }

      function setRightPaneTab(tab) {
        state.ui.rightPaneTab = tab;
        persistUi();
        render(state.payload);
      }

      function setWorkspaceView(view, options = {}) {
        state.ui.currentView = view;
        if (view === "board") {
          state.ui.boardSubView = options.boardSubView || state.ui.boardSubView || "canvas";
        }
        persistUi();
        render(state.payload);
      }

      function toggleThemeMode() {
        const order = ["pure", "clean", "vivid"];
        const current = themeMode();
        const next = order[(order.indexOf(current) + 1) % order.length];
        state.ui.themeMode = next;
        persistUi();
        render(state.payload);
      }

      function toggleHeaderCollapsed() {
        const current = state.ui.headerMode || "expanded";
        state.ui.headerMode = current === "expanded"
          ? "collapsed"
          : current === "collapsed"
            ? "ultra"
            : "expanded";
        persistUi();
        render(state.payload);
      }

      function openLoopPanel(threadId, currentPrompt = "continue", currentCount = "10") {
        state.ui.loopPanelThreadId = threadId;
        state.ui.loopDraftPrompt = String(currentPrompt || "continue");
        state.ui.loopDraftCount = String(currentCount || "10");
        render(state.payload);
      }

      function closeLoopPanel() {
        state.ui.loopPanelThreadId = undefined;
        state.ui.loopDraftPrompt = "continue";
        state.ui.loopDraftCount = "10";
        render(state.payload);
      }

      function openQuickComposer(threadId, currentPrompt = "continue") {
        if (!threadId) return;
        state.ui.quickComposerThreadId = threadId;
        if (!state.ui.quickComposerDrafts[threadId]) {
          state.ui.quickComposerDrafts[threadId] = String(currentPrompt || "continue");
        }
        render(state.payload);
      }

      function closeQuickComposer(threadId) {
        if (!threadId || state.ui.quickComposerThreadId === threadId) {
          state.ui.quickComposerThreadId = undefined;
        }
        render(state.payload);
      }

      function setQuickComposerDraft(threadId, value) {
        if (!threadId) return;
        state.ui.quickComposerDrafts[threadId] = String(value || "");
      }

      function setLoopDraftCount(value) {
        state.ui.loopDraftCount = String(value || "");
      }

      function setLoopDraftPrompt(value) {
        state.ui.loopDraftPrompt = String(value || "");
      }

      function cycleSoundStyle() {
        const order = ["off", "plink", "splashes", "nature", "fnaf"];
        const current = state.ui.soundEnabled ? String(state.ui.soundStyle || "plink").toLowerCase() : "off";
        const index = order.indexOf(current);
        const next = order[(index + 1 + order.length) % order.length];
        state.ui.soundEnabled = next !== "off";
        if (next !== "off") {
          state.ui.soundStyle = next;
        }
        persistUi();
        render(state.payload);
        if (state.ui.soundEnabled) {
          window.setTimeout(() => playCompletionTone(), 40);
        }
      }

      function setPendingDrawerAction(threadId, action) {
        state.ui.pendingDrawerAction = { threadId, action };
      }

      function clearPendingDrawerAction() {
        state.ui.pendingDrawerAction = undefined;
      }

      function getDrawerConfirmMeta(action) {
        if (action === "hard_delete") {
          return {
            tone: "danger",
            intentLabel: "Confirm Hard Delete",
            summary: "Permanently remove this thread and its logs.",
            confirmLabel: "Delete Permanently",
          };
        }
        return {
          tone: "warn",
          intentLabel: "Confirm Soft Delete",
          summary: "Move this thread into the deleted bucket.",
          confirmLabel: "Confirm Soft Delete",
        };
      }

      function summarizeThreadSelection(threads, threadIds) {
        const picked = threads
          .filter((thread) => threadIds.includes(thread.id))
          .slice(0, 3)
          .map((thread) => short(thread.title || thread.id || "thread", 28));
        if (!picked.length) return "";
        const remainder = threadIds.length - picked.length;
        return picked.join(", ") + (remainder > 0 ? " +" + remainder + " more" : "");
      }

      function isPinned(threadId) {
        return Boolean(state.ui.pinned[threadId]);
      }

      function isBoardAttached(threadId) {
        return Boolean(state.ui.boardAttached[threadId]);
      }

      function togglePin(threadId) {
        if (state.ui.pinned[threadId]) {
          delete state.ui.pinned[threadId];
        } else {
          state.ui.pinned[threadId] = true;
          state.ui.boardAttached[threadId] = true;
          const activeTab = activeBoardTabKey();
          if (activeTab !== "all" && !boardTabFor(threadId)) {
            ensureBoardTab(activeTab);
            state.ui.boardTabAssignments[threadId] = activeTab;
          }
        }
        persistUi();
        render(state.payload);
      }

      function toggleBoardAttach(threadId) {
        if (!threadId) return;
        if (state.ui.boardAttached[threadId]) {
          delete state.ui.boardAttached[threadId];
        } else {
          state.ui.boardAttached[threadId] = true;
          const activeTab = activeBoardTabKey();
          if (activeTab !== "all" && !boardTabFor(threadId)) {
            state.ui.boardTabAssignments[threadId] = activeTab;
            ensureBoardTab(activeTab);
          }
        }
        persistUi();
        render(state.payload);
      }

      function attachThreadsToBoard(threadIds) {
        const ids = Array.isArray(threadIds) ? threadIds.filter(Boolean) : [];
        if (!ids.length) return;
        const activeTab = activeBoardTabKey();
        ids.forEach((threadId) => {
          state.ui.boardAttached[threadId] = true;
          if (activeTab !== "all") {
            ensureBoardTab(activeTab);
            state.ui.boardTabAssignments[threadId] = activeTab;
          }
        });
        persistUi();
        render(state.payload);
      }

      function getBoardThreads(dashboard, payload = state.payload) {
        const threadMap = new Map(((dashboard && dashboard.threads) || []).map((thread) => [thread.id, thread]));
        const boardMap = new Map();
        const effectiveRunning = effectiveRunningIdSet(payload);
        ((dashboard && dashboard.runningThreads) || []).forEach((thread) => {
          if (!effectiveRunning.has(thread.id)) return;
          boardMap.set(thread.id, Object.assign({}, threadMap.get(thread.id) || {}, thread, { board_source: "running" }));
        });
        Object.keys(state.ui.boardAttached).forEach((threadId) => {
          if (!state.ui.boardAttached[threadId]) return;
          const thread = threadMap.get(threadId);
          if (!thread) return;
          const existing = boardMap.get(threadId);
          boardMap.set(threadId, Object.assign({}, thread, existing || {}, {
            board_source: existing && effectiveRunning.has(threadId) ? "running" : "attached",
          }));
        });
        return Array.from(boardMap.values()).map((thread) => {
          const boardTab = boardTabFor(thread.id);
          return Object.assign({}, thread, {
            board_tab: boardTab || "",
          });
        });
      }

      function boardThreadsForActiveTab(boardThreads) {
        const active = activeBoardTabKey();
        if (active === "all") return boardThreads;
        return (boardThreads || []).filter((thread) => boardTabFor(thread.id) === active);
      }

      function boardTabCounts(boardThreads) {
        const counts = { all: (boardThreads || []).length };
        boardTabOrderList().forEach((name) => {
          counts[name] = 0;
        });
        (boardThreads || []).forEach((thread) => {
          const name = boardTabFor(thread.id);
          if (!name) return;
          counts[name] = (counts[name] || 0) + 1;
        });
        return counts;
      }

      function renderBoardTabRail(boardThreads) {
        const counts = boardTabCounts(boardThreads);
        const active = activeBoardTabKey();
        const chips = [
          '<button class="board-tab-chip' + (active === "all" ? ' active' : '') + '" data-board-tab="all" type="button"><span>All</span><span class="board-tab-chip-count">' + esc(String(counts.all || 0)) + '</span></button>'
        ];
        boardTabOrderList().forEach((name) => {
          chips.push(
            '<button class="board-tab-chip' + (active === name ? ' active' : '') + '" data-board-tab="' + esc(name) + '" type="button"' + boardTabStyle(name, active === name) + '><strong>' + esc(name) + '</strong><span class="board-tab-chip-count"' + boardTabCountStyle(name) + '>' + esc(String(counts[name] || 0)) + '</span></button>'
          );
        });
        chips.push('<button class="board-tab-chip add" data-create-board-tab="true" type="button">' + (boardTabOrderList().length ? '+ New Tab' : '+ Create First Tab') + '</button>');
        if (!boardTabOrderList().length) {
          return '<div class="board-tab-rail">' + chips.join("") + '</div>' +
            '<div class="board-tab-helper">No tab group yet. Create the first tab here, then click a card\\'s <strong>+ Tab</strong> button to put that card into a colored group.</div>';
        }
        return '<div class="board-tab-rail">' + chips.join("") + '</div>' +
          '<div class="board-tab-helper">Tab is a manual group for board cards. Different tabs show as different color blocks, and cards in the same tab can still be managed independently.</div>';
      }

      function renderBoardTabPill(thread) {
        const name = boardTabFor(thread && thread.id);
        if (!name) return "";
        return '<span class="board-tab-pill" title="Manual group"' + boardTabStyle(name, false) + '><strong>' + esc(name) + '</strong></span>';
      }

      function renderBoardTodoPane(boardThreads) {
        const tabNames = boardTabOrderList();
        return '<div class="board-todo-shell">' +
          '<section class="board-todo-hero">' +
            '<div class="board-todo-kicker">Board TODO</div>' +
            '<div class="board-todo-title">Team Collaboration Roadmap</div>' +
            '<div class="board-todo-copy">This page keeps the future team mode explicit: one shared task space, multiple Codex threads, and a common <code>team.md</code> that acts like the operating brief for the whole group.</div>' +
          '</section>' +
          '<div class="board-todo-grid">' +
            '<article>' +
              '<div class="board-todo-section-title">What Tab Means Right Now</div>' +
              '<div class="board-todo-list">' +
                '<div class="board-todo-item"><span class="meta-pill">Now</span><span>Tab equals manual group. It is not automatic routing and it does not change the underlying Codex thread.</span></div>' +
                '<div class="board-todo-item"><span class="meta-pill">Now</span><span>Cards in one tab can still have different Card Names and different loop behaviors.</span></div>' +
                '<div class="board-todo-item"><span class="meta-pill">Live</span><span>' + esc(String(boardThreads.length || 0)) + ' board cards are currently visible across ' + esc(String(tabNames.length || 0)) + ' custom tab group' + (tabNames.length === 1 ? '' : 's') + '.</span></div>' +
              '</div>' +
            '</article>' +
            '<article>' +
              '<div class="board-todo-section-title">Planned Team Space</div>' +
              '<div class="board-todo-list">' +
                '<div class="board-todo-item"><span class="meta-pill">Plan</span><span>Support multiple threads sharing one <code>team.md</code> so they operate in the same task space.</span></div>' +
                '<div class="board-todo-item"><span class="meta-pill">Plan</span><span>Make one team page show active plan, open blockers, owner threads, and shared context files.</span></div>' +
                '<div class="board-todo-item"><span class="meta-pill">Plan</span><span>Let loop daemons inherit the same team context so recurring work stays aligned.</span></div>' +
              '</div>' +
            '</article>' +
            '<article>' +
              '<div class="board-todo-section-title">Next Implementation Steps</div>' +
              '<div class="board-todo-list">' +
                '<div class="board-todo-item"><span class="meta-pill">1</span><span>Create a real team-space model that binds tabs, threads, and shared context files together.</span></div>' +
                '<div class="board-todo-item"><span class="meta-pill">2</span><span>Add a dedicated <code>team.md</code> opener/editor from inside the board.</span></div>' +
                '<div class="board-todo-item"><span class="meta-pill">3</span><span>Add task checklist sync so TODO is not just a note page but an actual operating surface.</span></div>' +
              '</div>' +
            '</article>' +
          '</div>' +
        '</div>';
      }

      function renderBoardPlayPane(boardThreads) {
        const visibleCards = (boardThreads || []).filter((thread) => thread && thread.id);
        const seedCards = visibleCards.slice(0, 3);
        const idLines = seedCards.map((thread, index) => String(index + 1) + ". " + thread.id);
        const idText = idLines.join("\\n");
        const titleLines = seedCards.map((thread, index) => {
          const label = thread.title || thread.db_title || thread.preview || thread.id;
          return String(index + 1) + ". " + short(label, 72) + " [" + thread.id + "]";
        });
        const forkPrompt = seedCards.length
          ? [
              "I want to fork working memory from these CMA/Codex board cards into this new session.",
              "",
              "Source card/session IDs:",
              idText,
              "",
              "Please treat them as prior working contexts, ask me before destructive changes, and first produce a compact synthesis:",
              "- shared goal",
              "- what each source session likely owns",
              "- conflicts or duplicated work",
              "- recommended next action for this new session",
            ].join("\\n")
          : "Add cards to the Board first, then return here to copy a multi-session fork prompt.";
        const disabled = seedCards.length ? "" : " disabled";
        const seedSummary = seedCards.length
          ? titleLines.map((line) => '<div class="board-play-item"><span class="meta-pill">ID</span><span>' + esc(line) + '</span></div>').join("")
          : '<div class="board-play-item"><span class="meta-pill">Empty</span><span>No visible board cards yet. Add or switch to a tab with cards, then use this play.</span></div>';
        return '<div class="board-play-shell">' +
          '<section class="board-play-hero">' +
            '<div class="board-play-kicker">New Play</div>' +
            '<div class="board-play-title">Tri-Fork Memory Handoff</div>' +
            '<div class="board-play-copy">A board play is a repeatable workflow. This one copies up to three visible card/session IDs and a ready prompt, then you paste it into a fresh Codex session so the new agent can inherit the shape of multiple prior threads.</div>' +
            '<div class="board-play-actions">' +
              '<button class="chip" data-copy-text="' + esc(idText) + '" data-copy-label="Board card IDs" type="button"' + disabled + '>Copy 3 Card IDs</button>' +
              '<button class="chip primary" data-copy-text="' + esc(forkPrompt) + '" data-copy-label="Tri-fork prompt" type="button"' + disabled + '>Copy Fork Prompt</button>' +
              '<button class="chip" data-create-thread-from-play="true" type="button">New Session</button>' +
            '</div>' +
          '</section>' +
          '<div class="board-play-grid">' +
            '<article class="board-play-card">' +
              '<div class="board-play-section-title">How To Run It</div>' +
              '<div class="board-play-list">' +
                '<div class="board-play-item"><span class="meta-pill">1</span><span>Put the source cards in the same Board tab, or stay on All if you want the first three visible cards.</span></div>' +
                '<div class="board-play-item"><span class="meta-pill">2</span><span>Click <strong>Copy Fork Prompt</strong>. It includes the card IDs and the instruction for the next session to synthesize them.</span></div>' +
                '<div class="board-play-item"><span class="meta-pill">3</span><span>Click <strong>New Session</strong>, paste the prompt into Codex, and let the new thread become the coordinator/fork.</span></div>' +
              '</div>' +
            '</article>' +
            '<article class="board-play-card">' +
              '<div class="board-play-section-title">Current Seeds</div>' +
              '<div class="board-play-list">' + seedSummary + '</div>' +
            '</article>' +
            '<article class="board-play-card">' +
              '<div class="board-play-section-title">Why It Works</div>' +
              '<div class="board-play-list">' +
                '<div class="board-play-item"><span class="meta-pill">Memory</span><span>The new session does not magically merge hidden state; it receives explicit session IDs and a clear instruction to reconstruct context.</span></div>' +
                '<div class="board-play-item"><span class="meta-pill">Safe</span><span>It starts with synthesis before edits, so the new agent can ask for confirmation if the three source threads disagree.</span></div>' +
              '</div>' +
            '</article>' +
          '</div>' +
          '<section class="board-play-prompt">' +
            '<div class="board-play-kicker">Prompt Preview</div>' +
            '<code>' + esc(forkPrompt) + '</code>' +
          '</section>' +
        '</div>';
      }

      function getRunningCardSize(threadId) {
        const size = state.ui.runningCardSizes[threadId];
        return size === "m" || size === "l" ? size : "s";
      }

      function getRunningCardLayout(threadId, size = getRunningCardSize(threadId)) {
        const saved = state.ui.runningCardLayout[threadId] || {};
        const defaultCols = size === "tiny" ? 2 : size === "s" ? 4 : size === "m" ? 7 : 15;
        const defaultHeight = size === "tiny" ? 116 : size === "s" ? 214 : size === "m" ? 242 : 282;
        return {
          cols: Math.max(1, Math.min(15, Number(saved.cols) || defaultCols)),
          height: Math.max(88, Math.min(520, Number(saved.height) || defaultHeight)),
        };
      }

      function getRunningCardPosition(threadId) {
        const saved = state.ui.runningCardPositions[threadId] || {};
        const col = Math.round(Number(saved.col) || 0);
        const row = Math.round(Number(saved.row) || 0);
        if (col < 1 || row < 1) return undefined;
        return { col, row };
      }

      function setRunningCardSize(threadId, size) {
        if (state.ui.layoutLocked) return;
        if (!threadId) return;
        const nextSize = size === "m" || size === "l" ? size : "s";
        state.ui.runningCardSizes[threadId] = nextSize;
        delete state.ui.runningCardLayout[threadId];
        persistUi();
        render(state.payload);
      }

      function setRunningCardLayout(threadId, cols, height) {
        if (state.ui.layoutLocked || !threadId) return;
        state.ui.runningCardLayout[threadId] = {
          cols: Math.max(1, Math.min(15, Math.round(Number(cols) || 1))),
          height: Math.max(88, Math.min(520, Math.round(Number(height) || 120))),
        };
        persistUi();
      }

      function setRunningCardPosition(threadId, col, row) {
        if (state.ui.layoutLocked || !threadId) return;
        state.ui.runningCardPositions[threadId] = {
          col: Math.max(1, Math.min(15, Math.round(Number(col) || 1))),
          row: Math.max(1, Math.min(999, Math.round(Number(row) || 1))),
        };
        persistUi();
      }

      function pruneRunningCardState(boardThreads) {
        const activeIds = new Set((boardThreads || []).map((thread) => thread.id));
        state.ui.runningCardOrder = state.ui.runningCardOrder.filter((threadId) => activeIds.has(threadId));
        Object.keys(state.ui.runningCardSizes).forEach((threadId) => {
          if (!activeIds.has(threadId)) {
            delete state.ui.runningCardSizes[threadId];
          }
        });
        Object.keys(state.ui.runningCardLayout).forEach((threadId) => {
          if (!activeIds.has(threadId)) {
            delete state.ui.runningCardLayout[threadId];
          }
        });
        Object.keys(state.ui.runningCardPositions).forEach((threadId) => {
          if (!activeIds.has(threadId)) {
            delete state.ui.runningCardPositions[threadId];
          }
        });
        Object.keys(state.ui.boardAttached).forEach((threadId) => {
          if (!activeIds.has(threadId) && !(((state.payload && state.payload.dashboard && state.payload.dashboard.threads) || []).some((thread) => thread.id === threadId))) {
            delete state.ui.boardAttached[threadId];
          }
        });
      }

      function orderRunningThreads(runningThreads) {
        const orderMap = new Map(state.ui.runningCardOrder.map((threadId, index) => [threadId, index]));
        return [...(runningThreads || [])].sort((a, b) => {
          const aOrder = orderMap.has(a.id) ? orderMap.get(a.id) : Number.POSITIVE_INFINITY;
          const bOrder = orderMap.has(b.id) ? orderMap.get(b.id) : Number.POSITIVE_INFINITY;
          if (aOrder !== bOrder) return aOrder - bOrder;
          const aPinned = isPinned(a.id) ? 1 : 0;
          const bPinned = isPinned(b.id) ? 1 : 0;
          if (aPinned !== bPinned) return bPinned - aPinned;
          return Number(b.updated_at || 0) - Number(a.updated_at || 0);
        });
      }

      function moveRunningCard(threadId, anchorThreadId, position = "before") {
        if (state.ui.layoutLocked) return;
        if (!threadId || threadId === anchorThreadId) return;
        const ordered = orderRunningThreads(getBoardThreads(state.payload && state.payload.dashboard)).map((thread) => thread.id);
        const withoutDragged = ordered.filter((id) => id !== threadId);
        const insertIndex = anchorThreadId ? withoutDragged.indexOf(anchorThreadId) : -1;
        if (insertIndex >= 0) {
          withoutDragged.splice(position === "after" ? insertIndex + 1 : insertIndex, 0, threadId);
        } else {
          withoutDragged.push(threadId);
        }
        state.ui.runningCardOrder = withoutDragged;
        persistUi();
        render(state.payload);
      }

      function boardGridMetrics(board) {
        if (!board) {
          return { columns: 15, gap: 12, width: 72, rowHeight: 18, paddingLeft: 4, paddingTop: 4 };
        }
        const styles = getComputedStyle(board);
        const columns = 15;
        const gap = parseFloat(styles.columnGap || styles.gap || "12") || 12;
        const rowHeight = parseFloat(styles.gridAutoRows || "18") || 18;
        const paddingLeft = parseFloat(styles.paddingLeft || "0") || 0;
        const paddingRight = parseFloat(styles.paddingRight || "0") || 0;
        const paddingTop = parseFloat(styles.paddingTop || "0") || 0;
        const innerWidth = Math.max(1, board.clientWidth - paddingLeft - paddingRight - gap * (columns - 1));
        return {
          columns,
          gap,
          width: innerWidth / columns,
          rowHeight,
          paddingLeft,
          paddingTop,
        };
      }

      function boardMetricSnapshot(board) {
        const fallbackRect = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
        return {
          metrics: boardGridMetrics(board),
          rect: board ? board.getBoundingClientRect() : fallbackRect,
        };
      }

      function cacheDragBoardMetrics() {
        state.dragMetricCache = {};
        dragBoards().forEach((board) => {
          if (!board || !board.id) return;
          state.dragMetricCache[board.id] = boardMetricSnapshot(board);
        });
      }

      function cachedBoardMetricSnapshot(board) {
        if (!board || !board.id) return boardMetricSnapshot(board);
        const cached = state.dragMetricCache && state.dragMetricCache[board.id];
        return cached || boardMetricSnapshot(board);
      }

      function layoutHeightToRows(height, metrics) {
        const gap = metrics && metrics.gap ? metrics.gap : 12;
        const rowHeight = metrics && metrics.rowHeight ? metrics.rowHeight : 18;
        return Math.max(4, Math.ceil((Math.max(88, height) + gap) / (rowHeight + gap)));
      }

      function layoutRowsToHeight(rows, metrics) {
        const gap = metrics && metrics.gap ? metrics.gap : 12;
        const rowHeight = metrics && metrics.rowHeight ? metrics.rowHeight : 18;
        return Math.max(88, rows * (rowHeight + gap) - gap);
      }

      function buildBoardPlacements(boardThreads, options = {}) {
        const ordered = orderRunningThreads(boardThreads);
        if (options.compact) {
          return { ordered, placements: new Map(), maxRow: 1 };
        }
        const columns = 15;
        const placements = new Map();
        const occupancy = new Map();
        function isBlocked(col, row) {
          return occupancy.get(String(row) + ":" + String(col)) === true;
        }
        function markOccupied(col, row, cols, rows) {
          for (let rowOffset = 0; rowOffset < rows; rowOffset += 1) {
            for (let colOffset = 0; colOffset < cols; colOffset += 1) {
              occupancy.set(String(row + rowOffset) + ":" + String(col + colOffset), true);
            }
          }
        }
        function canFit(col, row, cols, rows) {
          if (col < 1 || row < 1 || col + cols - 1 > columns) return false;
          for (let rowOffset = 0; rowOffset < rows; rowOffset += 1) {
            for (let colOffset = 0; colOffset < cols; colOffset += 1) {
              if (isBlocked(col + colOffset, row + rowOffset)) return false;
            }
          }
          return true;
        }
        function placeThread(thread, preferred) {
          const layout = getRunningCardLayout(thread.id, getRunningCardSize(thread.id));
          const rows = layoutHeightToRows(layout.height, { gap: 12, rowHeight: 18 });
          const cols = layout.cols;
          let col = preferred && preferred.col ? Math.max(1, Math.min(columns - cols + 1, preferred.col)) : 1;
          let row = preferred && preferred.row ? Math.max(1, preferred.row) : 1;
          let placed = false;
          for (let searchRow = row; searchRow < row + 180 && !placed; searchRow += 1) {
            for (let searchCol = searchRow === row ? col : 1; searchCol <= columns - cols + 1; searchCol += 1) {
              if (!canFit(searchCol, searchRow, cols, rows)) continue;
              col = searchCol;
              row = searchRow;
              placed = true;
              break;
            }
          }
          if (!placed) {
            let searchRow = 1;
            while (!placed && searchRow < 400) {
              for (let searchCol = 1; searchCol <= columns - cols + 1; searchCol += 1) {
                if (!canFit(searchCol, searchRow, cols, rows)) continue;
                col = searchCol;
                row = searchRow;
                placed = true;
                break;
              }
              searchRow += 1;
            }
          }
          markOccupied(col, row, cols, rows);
          placements.set(thread.id, { col, row, cols, rows, height: layout.height });
        }
        ordered.forEach((thread) => {
          const preferred = getRunningCardPosition(thread.id);
          if (preferred) placeThread(thread, preferred);
        });
        ordered.forEach((thread) => {
          if (!placements.has(thread.id)) placeThread(thread);
        });
        let maxRow = 1;
        placements.forEach((placement) => {
          maxRow = Math.max(maxRow, placement.row + placement.rows - 1);
        });
        return { ordered, placements, maxRow };
      }

      function pointerToBoardCell(board, clientX, clientY, draggedId, snapshot) {
        const boardSnapshot = snapshot || cachedBoardMetricSnapshot(board);
        const metrics = boardSnapshot.metrics;
        const rect = boardSnapshot.rect;
        const layout = getRunningCardLayout(draggedId, getRunningCardSize(draggedId));
        const rows = layoutHeightToRows(layout.height, metrics);
        const fullCellWidth = metrics.width + metrics.gap;
        const fullCellHeight = metrics.rowHeight + metrics.gap;
        const localX = clientX - rect.left - metrics.paddingLeft;
        const localY = clientY - rect.top - metrics.paddingTop;
        const col = Math.max(1, Math.min(metrics.columns - layout.cols + 1, Math.round(localX / fullCellWidth) + 1));
        const row = Math.max(1, Math.round(localY / fullCellHeight) + 1);
        return { col, row, cols: layout.cols, rows, height: layout.height };
      }

      function boardContainsPointer(board, clientX, clientY) {
        if (!board) return false;
        const rect = board.getBoundingClientRect();
        return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
      }

      function cleanupDragPreview() {
        if (state.dragPreviewEl && state.dragPreviewEl.parentNode) {
          state.dragPreviewEl.parentNode.removeChild(state.dragPreviewEl);
        }
        state.dragPreviewEl = undefined;
      }

      function cleanupBoardDragGhost() {
        if (state.boardDragGhostEl && state.boardDragGhostEl.parentNode) {
          state.boardDragGhostEl.parentNode.removeChild(state.boardDragGhostEl);
        }
        state.boardDragGhostEl = undefined;
      }

      function clearRunningDragPresentation() {
        cleanupDragPreview();
        cleanupBoardDragGhost();
        document.querySelectorAll("[data-running-card]").forEach((card) => {
          card.classList.remove("dragging", "pointer-dragging");
        });
        document.querySelectorAll(".running-board-grid").forEach((board) => {
          board.classList.remove("drag-over", "drag-end", "drag-active");
        });
        state.dragMetricCache = undefined;
        state.lastDropOverlayKey = "";
      }

      function createDragPreview(card, threadId) {
        cleanupDragPreview();
        const preview = document.createElement("div");
        preview.className = "drag-preview-card";
        const title = short(
          card.querySelector(".running-card-title")?.textContent || threadId || "Agent",
          48,
        );
        preview.innerHTML =
          '<div class="drag-preview-head"><span class="drag-preview-dot"></span><span class="drag-preview-label">Board Move</span></div>' +
          '<div class="drag-preview-title">' + esc(title) + '</div>';
        document.body.appendChild(preview);
        state.dragPreviewEl = preview;
        return preview;
      }

      function createBoardDragGhost(card, threadId, session) {
        cleanupBoardDragGhost();
        const ghost = document.createElement("div");
        ghost.className = "board-drag-ghost";
        const rect = card.getBoundingClientRect();
        const title = short(
          card.querySelector(".running-card-title")?.textContent || threadId || "Agent",
          56,
        );
        ghost.style.width = Math.max(128, Math.round(rect.width)) + "px";
        ghost.style.height = Math.max(88, Math.round(rect.height)) + "px";
        ghost.innerHTML =
          '<div class="drag-preview-head"><span class="drag-preview-dot"></span><span class="drag-preview-label">Board Move</span></div>' +
          '<div class="drag-preview-title">' + esc(title) + '</div>';
        document.body.appendChild(ghost);
        state.boardDragGhostEl = ghost;
        positionBoardDragGhost(session, session.lastClientX, session.lastClientY);
        return ghost;
      }

      function positionBoardDragGhost(session, clientX, clientY) {
        if (!state.boardDragGhostEl || !session) return;
        const nextX = Math.round(clientX - session.offsetX);
        const nextY = Math.round(clientY - session.offsetY);
        state.boardDragGhostEl.style.transform = "translate3d(" + nextX + "px, " + nextY + "px, 0)";
      }

      function isBoardPointerDragBlockedTarget(target) {
        return Boolean(target && target.closest(
          "button, input, textarea, select, a, [contenteditable='true'], [data-resize-card], [data-edit-card-name], [data-card-size], [data-open-composer], [data-codex-thread], [data-running-loop-card], .inline-card-label-input"
        ));
      }

      function dragBoards() {
        if (state.activeBoardId) {
          const active = document.getElementById(state.activeBoardId);
          return active ? [active] : [];
        }
        return Array.from(document.querySelectorAll(".running-board-grid"));
      }

      function syncDragBoardState() {
        document.querySelectorAll(".running-board-grid").forEach((board) => {
          const active = !state.activeBoardId || board.id === state.activeBoardId;
          board.classList.toggle("drag-active", Boolean(state.draggedRunningThreadId && active));
        });
      }

      function markDragBoardActive(boardId) {
        document.querySelectorAll(".running-board-grid").forEach((board) => {
          board.classList.toggle("drag-active", Boolean(boardId && board.id === boardId));
        });
      }

      function scheduleDragFrame() {
        if (state.dragRaf) return;
        state.dragRaf = window.requestAnimationFrame(() => {
          state.dragRaf = 0;
          if (state.pendingDragPointer) {
            const pointer = state.pendingDragPointer;
            const board = pointer.boardId ? document.getElementById(pointer.boardId) : undefined;
            state.activeBoardId = pointer.boardId || state.activeBoardId;
            state.runningDropIndicator = pointerToBoardCell(
              board,
              pointer.clientX,
              pointer.clientY,
              pointer.draggedId,
              board ? cachedBoardMetricSnapshot(board) : undefined,
            );
          } else {
            state.runningDropIndicator = state.pendingDragIndicator;
          }
          state.pendingDragPointer = undefined;
          state.pendingDragIndicator = undefined;
          syncRunningDropIndicatorDom();
        });
      }

      function scheduleDragIndicator(indicator, boardId) {
        state.pendingDragIndicator = indicator;
        state.pendingDragPointer = undefined;
        state.activeBoardId = boardId || state.activeBoardId;
        scheduleDragFrame();
      }

      function scheduleDragPointer(board, clientX, clientY, draggedId) {
        if (!board || !draggedId) return;
        state.pendingDragPointer = {
          boardId: board.id,
          clientX,
          clientY,
          draggedId,
        };
        state.pendingDragIndicator = undefined;
        state.activeBoardId = board.id || state.activeBoardId;
        scheduleDragFrame();
      }

      function cancelScheduledDragIndicator() {
        if (state.dragRaf) {
          window.cancelAnimationFrame(state.dragRaf);
          state.dragRaf = 0;
        }
        state.pendingDragIndicator = undefined;
        state.pendingDragPointer = undefined;
      }

      function beginBoardPointerDrag(threadId, event) {
        if (!threadId || state.ui.layoutLocked || event.button !== 0 || isBoardPointerDragBlockedTarget(event.target)) return;
        const card = event.currentTarget && event.currentTarget.closest("[data-running-card]");
        const board = card && card.closest(".running-board-grid");
        if (!card || !board || card.classList.contains("compact-card")) return;
        const rect = card.getBoundingClientRect();
        state.pointerBoardDrag = {
          threadId,
          boardId: board.id,
          card,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          lastClientX: event.clientX,
          lastClientY: event.clientY,
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top,
          started: false,
        };
        state.draggedRunningThreadId = threadId;
        state.activeBoardId = board.id;
        if (card.setPointerCapture) {
          try {
            card.setPointerCapture(event.pointerId);
          } catch (_) {}
        }
        event.preventDefault();
        event.stopPropagation();
      }

      function startBoardPointerDrag(session) {
        if (!session || session.started) return;
        session.started = true;
        cacheDragBoardMetrics();
        session.card.classList.add("dragging", "pointer-dragging");
        markDragBoardActive(session.boardId);
        createBoardDragGhost(session.card, session.threadId, session);
      }

      function updateBoardDragFrame() {
        state.boardDragRaf = 0;
        const session = state.pointerBoardDrag;
        const pointer = state.pendingBoardDragPointer;
        state.pendingBoardDragPointer = undefined;
        if (!session || !pointer) return;
        session.lastClientX = pointer.clientX;
        session.lastClientY = pointer.clientY;
        if (!session.started) {
          const distance = Math.hypot(pointer.clientX - session.startX, pointer.clientY - session.startY);
          if (distance < 5) return;
          startBoardPointerDrag(session);
        }
        positionBoardDragGhost(session, pointer.clientX, pointer.clientY);
        const board = document.getElementById(session.boardId);
        if (!board) return;
        state.activeBoardId = session.boardId;
        state.runningDropIndicator = pointerToBoardCell(
          board,
          pointer.clientX,
          pointer.clientY,
          session.threadId,
          cachedBoardMetricSnapshot(board),
        );
        syncRunningDropIndicatorDom();
      }

      function scheduleBoardPointerDragMove(event) {
        const session = state.pointerBoardDrag;
        if (!session || event.pointerId !== session.pointerId) return;
        state.pendingBoardDragPointer = {
          clientX: event.clientX,
          clientY: event.clientY,
        };
        if (state.boardDragRaf) return;
        state.boardDragRaf = window.requestAnimationFrame(updateBoardDragFrame);
      }

      function moveBoardPointerDrag(event) {
        const session = state.pointerBoardDrag;
        if (!session || event.pointerId !== session.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        scheduleBoardPointerDragMove(event);
      }

      function finishBoardPointerDrag(event) {
        const session = state.pointerBoardDrag;
        if (!session || event.pointerId !== session.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        if (state.boardDragRaf) {
          window.cancelAnimationFrame(state.boardDragRaf);
          state.boardDragRaf = 0;
        }
        const board = document.getElementById(session.boardId);
        const target = session.started && board
          ? pointerToBoardCell(board, event.clientX, event.clientY, session.threadId, cachedBoardMetricSnapshot(board))
          : undefined;
        if (session.card && session.card.releasePointerCapture) {
          try {
            session.card.releasePointerCapture(event.pointerId);
          } catch (_) {}
        }
        cancelScheduledDragIndicator();
        clearRunningDragPresentation();
        clearRunningDragState();
        if (target && target.col && target.row) {
          setRunningCardPosition(session.threadId, target.col, target.row);
          render(state.payload);
        }
      }

      function cancelBoardPointerDrag(event) {
        const session = state.pointerBoardDrag;
        if (!session) return;
        if (event && event.pointerId !== undefined && event.pointerId !== session.pointerId) return;
        const pointerId = event && event.pointerId !== undefined ? event.pointerId : session.pointerId;
        if (session.card && session.card.releasePointerCapture && pointerId !== undefined) {
          try {
            session.card.releasePointerCapture(pointerId);
          } catch (_) {}
        }
        if (state.boardDragRaf) {
          window.cancelAnimationFrame(state.boardDragRaf);
          state.boardDragRaf = 0;
        }
        cancelScheduledDragIndicator();
        clearRunningDragPresentation();
        clearRunningDragState();
      }

      function scheduleResizeUpdate(event) {
        state.pendingResizeEvent = {
          clientX: event.clientX,
          clientY: event.clientY,
        };
        if (state.resizeRaf) return;
        state.resizeRaf = window.requestAnimationFrame(() => {
          state.resizeRaf = 0;
          const nextEvent = state.pendingResizeEvent;
          state.pendingResizeEvent = undefined;
          if (nextEvent) updateRunningCardResize(nextEvent);
        });
      }

      function dropPreviewMetrics(board, draggedId = state.draggedRunningThreadId, metricsOverride) {
        if (!draggedId) {
          return { width: 120, height: 132 };
        }
        const size = getRunningCardSize(draggedId);
        const layout = getRunningCardLayout(draggedId, size);
        const metrics = metricsOverride || boardGridMetrics(board);
        return {
          width: Math.round(Math.max(96, layout.cols * metrics.width + Math.max(0, layout.cols - 1) * metrics.gap)),
          height: Math.max(92, layout.height),
        };
      }

      function nearestRunningDropTarget(board, draggedId, clientX, clientY, fallbackCard) {
        if (!board || !draggedId) return undefined;
        const cards = Array.from(board.querySelectorAll("[data-running-card]")).filter((card) => card.dataset.runningCard !== draggedId);
        const directCard = fallbackCard && fallbackCard.dataset && fallbackCard.dataset.runningCard !== draggedId ? fallbackCard : undefined;
        if (directCard) {
          const rect = directCard.getBoundingClientRect();
          return {
            threadId: directCard.dataset.runningCard,
            position: clientX > rect.left + (rect.width / 2) ? "after" : "before",
          };
        }
        let best = undefined;
        cards.forEach((card) => {
          const rect = card.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const distance = Math.hypot(clientX - centerX, clientY - centerY);
          if (!best || distance < best.distance) {
            best = { card, rect, distance };
          }
        });
        if (!best) return undefined;
        const threshold = Math.max(140, Math.min(320, Math.max(best.rect.width, best.rect.height) * 0.9));
        if (best.distance > threshold) return undefined;
        return {
          threadId: best.card.dataset.runningCard,
          position: clientX > best.rect.left + (best.rect.width / 2) ? "after" : "before",
        };
      }

      function beginRunningCardResize(threadId, corner, event) {
        if (state.ui.layoutLocked || !threadId) return;
        const card = event.currentTarget && event.currentTarget.closest("[data-running-card]");
        if (!card) return;
        const board = card.closest(".running-board-grid");
        const metrics = boardGridMetrics(board);
        const size = getRunningCardSize(threadId);
        const layout = getRunningCardLayout(threadId, size);
        const placement = getRunningCardPosition(threadId) || {
          col: Math.max(1, Number(card.dataset.gridCol) || 1),
          row: Math.max(1, Number(card.dataset.gridRow) || 1),
        };
        state.resizingRunningCard = {
          threadId,
          corner,
          startX: event.clientX,
          startY: event.clientY,
          startCols: layout.cols,
          startHeight: layout.height,
          startCol: placement.col,
          startRow: placement.row,
          startRows: layoutHeightToRows(layout.height, metrics),
          currentCols: layout.cols,
          currentHeight: layout.height,
          currentCol: placement.col,
          currentRow: placement.row,
        };
        card.classList.add("resizing");
        event.preventDefault();
        event.stopPropagation();
      }

      function updateRunningCardResize(event) {
        const session = state.resizingRunningCard;
        if (!session) return;
        const card = document.querySelector('[data-running-card="' + CSS.escape(session.threadId) + '"]');
        if (!card) return;
        const board = card.closest(".running-board-grid");
        const metrics = boardGridMetrics(board);
        const dx = event.clientX - session.startX;
        const dy = event.clientY - session.startY;
        const horizontalDirection = session.corner.includes("w") ? -1 : (session.corner.includes("e") ? 1 : 0);
        const verticalDirection = session.corner.includes("n") ? -1 : (session.corner.includes("s") ? 1 : 0);
        const colStep = Math.max(48, Math.round(metrics.width * 0.82));
        const horizontalDelta = horizontalDirection === 0 ? 0 : Math.round((dx * horizontalDirection) / colStep);
        const verticalDelta = verticalDirection === 0 ? 0 : Math.round((dy * verticalDirection) / 18);
        const startRightEdge = session.startCol + session.startCols - 1;
        const desiredCols = session.startCols + horizontalDelta;
        let nextCols;
        let nextCol = session.startCol;
        if (horizontalDirection < 0) {
          const maxCols = Math.max(1, Math.min(metrics.columns || 15, startRightEdge));
          nextCols = Math.max(1, Math.min(maxCols, desiredCols));
          nextCol = Math.max(1, startRightEdge - nextCols + 1);
        } else if (horizontalDirection > 0) {
          const maxCols = Math.max(1, (metrics.columns || 15) - session.startCol + 1);
          nextCols = Math.max(1, Math.min(maxCols, desiredCols));
        } else {
          nextCols = session.startCols;
        }
        let nextHeight = Math.max(88, Math.min(520, session.startHeight + verticalDelta * 18));
        let nextRows = layoutHeightToRows(nextHeight, metrics);
        let nextRow = session.startRow;
        if (verticalDirection < 0) {
          const startBottomEdge = session.startRow + session.startRows - 1;
          nextRow = Math.max(1, startBottomEdge - nextRows + 1);
          if (nextRow === 1) {
            nextRows = Math.max(session.startRows, startBottomEdge);
            nextHeight = Math.min(520, layoutRowsToHeight(nextRows, metrics));
          }
        }
        session.currentCols = nextCols;
        session.currentHeight = nextHeight;
        session.currentCol = nextCol;
        session.currentRow = nextRow;
        card.style.gridColumn = String(nextCol) + " / span " + nextCols;
        card.style.gridRow = String(nextRow) + " / span " + nextRows;
        card.style.minHeight = nextHeight + "px";
        card.style.height = nextHeight + "px";
      }

      function finishRunningCardResize(event) {
        const session = state.resizingRunningCard;
        if (!session) return;
        if (state.resizeRaf) {
          window.cancelAnimationFrame(state.resizeRaf);
          state.resizeRaf = 0;
        }
        const card = document.querySelector('[data-running-card="' + CSS.escape(session.threadId) + '"]');
        if (card) {
          card.classList.remove("resizing");
          setRunningCardLayout(session.threadId, session.currentCols || session.startCols, session.currentHeight || session.startHeight);
          setRunningCardPosition(session.threadId, session.currentCol || session.startCol, session.currentRow || session.startRow);
        }
        state.resizingRunningCard = undefined;
        state.pendingResizeEvent = undefined;
        render(state.payload);
      }

      function setRunningDropIndicator(indicatorOrThreadId, position) {
        if (typeof indicatorOrThreadId === "object" && indicatorOrThreadId) {
          state.runningDropIndicator = indicatorOrThreadId;
          return;
        }
        state.runningDropIndicator = indicatorOrThreadId && position ? { threadId: indicatorOrThreadId, position } : undefined;
      }

      function clearRunningDropIndicator() {
        state.runningDropIndicator = undefined;
      }

      function clearRunningDragState() {
        clearRunningDropIndicator();
        state.draggedRunningThreadId = undefined;
        state.activeBoardId = undefined;
        state.pointerBoardDrag = undefined;
        state.pendingBoardDragPointer = undefined;
        state.pendingDragPointer = undefined;
        state.pendingDragIndicator = undefined;
        state.dragMetricCache = undefined;
        state.lastDropOverlayKey = "";
        if (state.boardDragRaf) {
          window.cancelAnimationFrame(state.boardDragRaf);
          state.boardDragRaf = 0;
        }
        syncRunningDropIndicatorDom();
      }

      function resetRunningDropIndicator(boardId) {
        cancelScheduledDragIndicator();
        clearRunningDropIndicator();
        if (boardId !== undefined) {
          state.activeBoardId = boardId;
        }
        markDragBoardActive(state.draggedRunningThreadId ? state.activeBoardId : undefined);
        syncRunningDropIndicatorDom();
      }

      function syncRunningDropIndicatorDom() {
        const board = document.getElementById(state.activeBoardId || "runningBoardPrimary");
        const overlay = document.getElementById("boardDropOverlayPrimary");
        if (!overlay) return;
        if (!board) {
          overlay.style.transform = "";
          overlay.style.width = "";
          overlay.style.height = "";
          overlay.classList.remove("visible");
          state.lastDropOverlayKey = "";
          return;
        }
        if (board.id !== "runningBoardPrimary") {
          overlay.style.transform = "";
          overlay.style.width = "";
          overlay.style.height = "";
          overlay.classList.remove("visible");
          state.lastDropOverlayKey = "";
          return;
        }
        if (state.runningDropIndicator && state.runningDropIndicator.col && state.runningDropIndicator.row) {
          const snapshot = cachedBoardMetricSnapshot(board);
          const metrics = snapshot.metrics;
          const preview = dropPreviewMetrics(board, undefined, metrics);
          const left = metrics.paddingLeft + (state.runningDropIndicator.col - 1) * (metrics.width + metrics.gap);
          const top = metrics.paddingTop + (state.runningDropIndicator.row - 1) * (metrics.rowHeight + metrics.gap);
          const nextKey = [
            Math.round(left),
            Math.round(top),
            Math.round(preview.width),
            Math.round(preview.height),
          ].join(":");
          if (state.lastDropOverlayKey !== nextKey) {
            overlay.style.transform = "translate3d(" + String(Math.round(left)) + "px, " + String(Math.round(top)) + "px, 0)";
            overlay.style.width = String(Math.round(preview.width)) + "px";
            overlay.style.height = String(Math.round(preview.height)) + "px";
            state.lastDropOverlayKey = nextKey;
          }
          overlay.classList.add("visible");
        } else {
          overlay.style.transform = "";
          overlay.style.width = "";
          overlay.style.height = "";
          overlay.classList.remove("visible");
          state.lastDropOverlayKey = "";
        }
      }

      function toggleLayoutLock() {
        state.ui.layoutLocked = !state.ui.layoutLocked;
        persistUi();
        render(state.payload);
      }

      function motionModeKey() {
        return ["full", "quiet", "extreme"].includes(state.ui.motionMode) ? state.ui.motionMode : "quiet";
      }

      function toggleMotion() {
        const order = ["full", "quiet", "extreme"];
        const current = motionModeKey();
        const index = order.indexOf(current);
        state.ui.motionMode = order[(index + 1 + order.length) % order.length];
        state.ui.motionEnabled = state.ui.motionMode === "full";
        persistUi();
        render(state.payload);
      }

      function resetRunningLayout() {
        state.ui.runningCardOrder = [];
        state.ui.runningCardSizes = {};
        state.ui.runningCardLayout = {};
        state.ui.runningCardPositions = {};
        state.ui.layoutLocked = false;
        persistUi();
        render(state.payload);
      }

      function isSelected(threadId) {
        return Boolean(state.ui.selected[threadId]);
      }

      function toggleSelected(threadId) {
        clearPendingBatch();
        if (state.ui.selected[threadId]) {
          delete state.ui.selected[threadId];
        } else {
          state.ui.selected[threadId] = true;
        }
        persistUi();
        render(state.payload);
      }

      function parseGroupThreadIds(value) {
        try {
          const ids = JSON.parse(value || "[]");
          return Array.isArray(ids) ? ids.map((id) => String(id || "")).filter(Boolean) : [];
        } catch (error) {
          return [];
        }
      }

      function toggleGroupSelection(threadIds) {
        const ids = [...new Set((threadIds || []).map((id) => String(id || "")).filter(Boolean))];
        if (!ids.length) return;
        clearPendingBatch();
        const allSelected = ids.every((threadId) => isSelected(threadId));
        ids.forEach((threadId) => {
          if (allSelected) {
            delete state.ui.selected[threadId];
          } else {
            state.ui.selected[threadId] = true;
          }
        });
        persistUi();
        render(state.payload);
      }

      function clearSelection() {
        clearPendingBatch();
        state.ui.selected = {};
        persistUi();
        render(state.payload);
      }

      function topicFocusMatches(thread, focus) {
        if (!focus || !thread) return true;
        const title = normalize(thread.title);
        const cwd = normalize(thread.cwd);
        const haystack = [title, cwd, normalize(thread.id), normalize(thread.updated_at_iso)].join(" ");
        if (focus.group === "keyword") {
          return haystack.includes(normalize(focus.value));
        }
        if (focus.group === "thread") {
          return thread.id === focus.threadId;
        }
        if (focus.group === "style") {
          const styleMap = {
            "规划型": ["计划", "规划", "plan", "roadmap", "方案", "设计"],
            "执行型": ["fix", "实现", "run", "deploy", "build", "改", "修"],
            "探索型": ["分析", "analyze", "compare", "search", "inspect", "review"],
            "自动化型": ["loop", "auto", "daemon", "tmux", "nohup", "监控", "自动"],
            "界面型": ["ui", "theme", "layout", "board", "card", "界面", "布局", "主题"],
          };
          const tokens = styleMap[focus.value] || [focus.value];
          return tokens.some((token) => haystack.includes(normalize(token)));
        }
        return true;
      }

      function applyTopicFocus(focus) {
        state.ui.topicFocus = focus || null;
        state.ui.currentView = "threads";
        if (focus && focus.group === "keyword") {
          state.ui.search = focus.value || "";
          state.ui.filter = "all";
        } else if (focus && focus.group === "thread") {
          state.ui.search = "";
          state.ui.filter = "all";
          setSelectedThread(focus.threadId, { view: "threads", openDrawer: true, scrollIntoView: true });
        } else if (focus && focus.group === "style") {
          state.ui.search = "";
          state.ui.filter = "all";
        }
        persistUi();
        render(state.payload);
      }

      function applyRootFilter(root) {
        const nextRoot = root && state.ui.rootFilter === root ? null : (root || null);
        state.ui.rootFilter = nextRoot;
        state.ui.currentView = "threads";
        persistUi();
        render(state.payload);
      }

      function applyWorkspaceFilter() {
        state.ui.workspaceFilter = !state.ui.workspaceFilter;
        state.ui.currentView = "threads";
        persistUi();
        render(state.payload);
      }

      function setThreadGroupsExpanded(expanded) {
        const groupKeys = ["pinned", "running", "needs_human", "linked", "recent", "idle", "archived", "soft_deleted"];
        groupKeys.forEach((key) => {
          state.ui.groups[key] = expanded || key === "pinned";
        });
        persistUi();
        render(state.payload);
      }

      function areMostThreadGroupsExpanded() {
        const groupKeys = ["pinned", "running", "needs_human", "linked", "recent", "idle", "archived", "soft_deleted"];
        const expandedCount = groupKeys.filter((key) => state.ui.groups[key]).length;
        return expandedCount >= Math.ceil(groupKeys.length / 2);
      }

      function toggleThreadGroupsExpanded() {
        setThreadGroupsExpanded(!areMostThreadGroupsExpanded());
      }

      function threadMatches(thread) {
        const query = normalize(state.ui.search).trim();
        const haystack = [
          thread.title,
          thread.db_title,
          displayThreadTitle(thread, ""),
          cardLabelFor(thread.id),
          thread.id,
          thread.cwd,
          thread.updated_at_iso
        ].map(normalize).join(" ");

        const status = effectiveThreadStatus(thread);
        const archived = Boolean(thread.archived) || status === "archived";
        const softDeleted = Boolean(thread.soft_deleted);
        const running = status === "running";
        const recent = status === "recent";
        const linked = status === "linked";
        const idle = !running && !recent && !archived && !softDeleted;

        const matchesQuery = !query || haystack.includes(query);
        const matchesTopic = topicFocusMatches(thread, state.ui.topicFocus);
        const rootKey = threadRootKey(thread);
        const rootLabel = threadRootLabel(thread);
        const workspaceRoots = activeWorkspaceRootKeys();
        const matchesRoot = !state.ui.rootFilter
          || rootKey === state.ui.rootFilter
          || rootLabel === state.ui.rootFilter
          || compactRootIdentity(thread.cwd) === state.ui.rootFilter;
        const matchesWorkspace = !state.ui.workspaceFilter || !workspaceRoots.size || workspaceRoots.has(rootKey);
        const threadTabFilter = activeThreadTabFilterKey();
        const matchesThreadTab = threadTabFilter === "all" || boardTabFor(thread.id) === threadTabFilter;
        const matchesFilter =
          state.ui.filter === "all" ||
          (state.ui.filter === "running" && running) ||
          (state.ui.filter === "recent" && (recent || linked)) ||
          (state.ui.filter === "idle" && idle) ||
          (state.ui.filter === "needs_human" && needsHumanIntervention(thread)) ||
          (state.ui.filter === "archived" && archived) ||
          (state.ui.filter === "soft_deleted" && softDeleted);
        const matchesPinned = !state.ui.pinnedOnly || isPinned(thread.id);
        return matchesQuery && matchesTopic && matchesRoot && matchesWorkspace && matchesThreadTab && matchesFilter && matchesPinned;
      }

      function sortThreads(threads) {
        return [...threads].sort((a, b) => {
          const aPinned = isPinned(a.id) ? 1 : 0;
          const bPinned = isPinned(b.id) ? 1 : 0;
          if (aPinned !== bPinned) return bPinned - aPinned;
          if (state.ui.sort === "oldest") {
            return (Number(a.updated_at || 0) - Number(b.updated_at || 0))
              || (Number(a.created_at || 0) - Number(b.created_at || 0));
          }
          if (state.ui.sort === "created") {
            return (Number(b.created_at || 0) - Number(a.created_at || 0))
              || (Number(b.updated_at || 0) - Number(a.updated_at || 0));
          }
          if (state.ui.sort === "name_asc" || state.ui.sort === "name_desc") {
            const delta = displayThreadTitle(a, "").localeCompare(displayThreadTitle(b, ""), undefined, { sensitivity: "base", numeric: true })
              || String(a.id || "").localeCompare(String(b.id || ""));
            return state.ui.sort === "name_asc" ? delta : -delta;
          }
          if (state.ui.sort === "tokens_desc") {
            return (Number(b.tokens_used || 0) - Number(a.tokens_used || 0))
              || (Number(b.updated_at || 0) - Number(a.updated_at || 0));
          }
          return (Number(b.updated_at || 0) - Number(a.updated_at || 0))
            || (Number(b.last_log_ts || 0) - Number(a.last_log_ts || 0));
        });
      }

      function buildGroups(threads) {
        const groups = {
          pinned: [],
          running: [],
          linked: [],
          recent: [],
          needs_human: [],
          idle: [],
          archived: [],
          soft_deleted: []
        };
        for (const thread of sortThreads(threads)) {
          if (isPinned(thread.id)) {
            groups.pinned.push(thread);
            continue;
          }
          const status = effectiveThreadStatus(thread);
          const archived = Boolean(thread.archived) || status === "archived";
          if (thread.soft_deleted) groups.soft_deleted.push(thread);
          else if (archived) groups.archived.push(thread);
          else if (status === "running") groups.running.push(thread);
          else if (needsHumanIntervention(thread)) groups.needs_human.push(thread);
          else if (status === "linked") groups.linked.push(thread);
          else if (status === "recent") groups.recent.push(thread);
          else groups.idle.push(thread);
        }
        return groups;
      }

      function buildRootGroups(threads) {
        const groups = new Map();
        (threads || []).forEach((thread) => {
          const rootKey = threadRootKey(thread) || "-";
          const current = groups.get(rootKey);
          if (current) {
            current.threads.push(thread);
            return;
          }
          groups.set(rootKey, {
            rootKey,
            rootLabel: threadRootLabel(thread),
            threads: [thread],
          });
        });
        return [...groups.values()].sort((a, b) =>
          String(a.rootLabel || "").localeCompare(String(b.rootLabel || ""))
          || String(a.rootKey || "").localeCompare(String(b.rootKey || "")));
      }

      function renderRootSubgroup(rootGroup) {
        return '<div class="root-subgroup" data-root-group="' + esc(rootGroup.rootKey || "-") + '">' +
          '<div class="root-subgroup-head">' +
            '<span class="meta-pill mono" title="' + esc(rootGroup.rootKey || "-") + '">Root ' + esc(short(rootGroup.rootLabel || "-", 20)) + '</span>' +
            '<span class="group-count root-group-count">' + esc(String((rootGroup.threads || []).length)) + '</span>' +
          '</div>' +
          (rootGroup.threads || []).map(renderThreadRow).join("") +
        '</div>';
      }

      function extractThreadProgress(thread) {
        const messages = (thread.preview_logs || []).map((item) => item.message || item.target || "").filter(Boolean);
        for (const message of messages) {
          const pctMatch = message.match(/(?:^|\\b)(100|[1-9]?\\d)\\s?%/);
          if (pctMatch) {
            const percent = Math.max(0, Math.min(100, Number(pctMatch[1])));
            return {
              percent,
              label: percent >= 100 ? "Completed" : "Estimated progress",
              note: short(message, 120),
            };
          }
          const ratioMatch = message.match(/(\\d{1,4})\\s*\\/\\s*(\\d{1,4})/);
          if (ratioMatch) {
            const current = Number(ratioMatch[1]);
            const total = Number(ratioMatch[2]);
            if (Number.isFinite(current) && Number.isFinite(total) && total > 0) {
              const percent = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
              return {
                percent,
                label: "Estimated progress",
                note: short(message, 120),
              };
            }
          }
        }
        return {
          percent: undefined,
          label: "Live status",
          note: messages[0] ? short(messages[0], 120) : "No explicit progress marker found in recent logs yet.",
        };
      }

      function boardBadge(thread) {
        if ((thread.board_source || "") === "attached" && effectiveThreadStatus(thread) !== "running") {
          return '<span class="badge badge-board">Attached</span>';
        }
        if ((thread.board_source || "") === "linked") {
          return '<span class="badge badge-linked">Linked</span>';
        }
        return "";
      }

      function needsHumanIntervention(thread) {
        return Boolean(effectiveCoordinationTruth(thread).needsHuman);
      }

      function inferCodexPhase(thread) {
        const logMessages = (thread.preview_logs || []).map((item) => item.message || item.target || "").filter(Boolean);
        const historyTexts = (thread.history || []).map((item) => item.text || "").filter(Boolean);
        const corpus = [...logMessages, ...historyTexts].join(" \\n").toLowerCase();
        const latest = logMessages[0] || historyTexts[0] || "";
        const status = normalize(thread.status);
        if (!corpus && status !== "running") {
          return {
            label: "Waiting",
            copy: "Pinned on the board and ready to reopen when you need it.",
          };
        }

        const planningRe = /plan|planning|todo|next step|roadmap|slice|outline|proposal|strategy|break down|decompose|milestone|task list/;
        const toolingRe = /tool call|spawn|agent|terminal|shell|command|uvicorn|server|process|session|attach|resume|fork|openexternal|webview|panel|workspace|rg /;
        const editingRe = /patch|update file|write file|apply_patch|rename|create file|delete file|move to|refactor|implement|edit|change code|modify/;
        const testingRe = /pytest|npm run|package|build|compile|check|validate|test|lint|verify|vsce|py_compile|node --check/;
        const waitingRe = /waiting|idle|standby|queued|sleep|no live process|no explicit progress marker|ready to reopen|ready for inspection/;

        if (planningRe.test(corpus)) {
          return {
            label: "Planning",
            copy: short(latest || "The agent is likely outlining tasks or deciding the next step.", 120),
          };
        }
        if (toolingRe.test(corpus)) {
          return {
            label: "Tooling",
            copy: short(latest || "The agent is orchestrating tools, terminals, sessions, or environment setup.", 120),
          };
        }
        if (editingRe.test(corpus)) {
          return {
            label: "Editing",
            copy: short(latest || "The agent appears to be modifying files right now.", 120),
          };
        }
        if (testingRe.test(corpus)) {
          return {
            label: "Testing",
            copy: short(latest || "The agent is validating code or packaging output.", 120),
          };
        }
        if (/search|open|read|inspect|analy|trace|grep|find /.test(corpus)) {
          return {
            label: "Tooling",
            copy: short(latest || "The agent is reading project context and exploring state.", 120),
          };
        }
        if (waitingRe.test(corpus) || status === "recent") {
          return {
            label: "Waiting",
            copy: short(latest || "The agent has paused and is waiting for the next steer or follow-up.", 120),
          };
        }
        if (status === "running") {
          return {
            label: "Tooling",
            copy: short(latest || "The agent is active, but the current phase is inferred from limited logs.", 120),
          };
        }
        return {
          label: "Waiting",
          copy: short(latest || "Recent activity is available, but no stronger phase signal was found.", 120),
        };
      }

      function codexLinkMeta(threadId, payload = state.payload) {
        prunePendingCodexLinks();
        const projection = tabProjectionFor(payload);
        const openThreadIds = Array.isArray(projection.openThreadIds) ? projection.openThreadIds : [];
        const isFocused = Boolean(threadId) && projection.focusedThreadId === threadId;
        const isSidebar = Boolean(threadId) && projection.sidebarThreadId === threadId;
        const isOpen = Boolean(threadId) && (openThreadIds.includes(threadId) || isSidebar);
        if (isOpen || isFocused) {
          delete state.ui.pendingCodexLink[threadId];
        }
        const pending = Boolean(threadId) ? state.ui.pendingCodexLink[threadId] : undefined;
        return { isOpen, isFocused, isSidebar, pending };
      }

      function codexVisibilityLabel(thread, payload = state.payload) {
        const link = codexLinkMeta(thread && thread.id, payload);
        if (link.isFocused) return "Focused";
        if (link.isOpen || link.pending) return "Linked";
        const archived = Boolean(thread && (thread.archived || thread.status === "archived"));
        return archived ? "Hidden" : "Visible";
      }

      function codexLinkBadge(threadId, payload = state.payload) {
        const link = codexLinkMeta(threadId, payload);
        if (link.isFocused) {
          return '<span class="badge badge-codex-focused">Codex Focused</span>';
        }
        if (link.isSidebar) {
          return '<span class="badge badge-codex-sidebar">Codex Sidebar</span>';
        }
        if (link.isOpen) {
          return '<span class="badge badge-codex-open">Codex Open</span>';
        }
        if (link.pending) {
          return '<span class="badge badge-codex-linking">Linking...</span>';
        }
        return "";
      }

      function soundStyleMeta(style = state.ui.soundStyle) {
        const key = String(style || "plink").toLowerCase();
        const table = {
          plink: { key: "plink", label: "Plink", src: MEDIA.alertPlink },
          splashes: { key: "splashes", label: "Splashes", src: MEDIA.alertSplashes },
          nature: { key: "nature", label: "Nature", src: MEDIA.alertNature },
          fnaf: { key: "fnaf", label: "FNAF", src: MEDIA.alertFnaf },
        };
        return table[key] || table.plink;
      }

      function playCompletionTone() {
        if (!state.ui.soundEnabled) return;
        try {
          const sound = soundStyleMeta();
          if (sound && sound.src) {
            const player = new Audio(sound.src);
            player.volume = sound.key === "nature" || sound.key === "fnaf" ? 0.42 : 0.72;
            player.currentTime = 0;
            player.play().catch(() => {});
            return;
          }
        } catch (error) {
        }
        try {
          const Context = window.AudioContext || window.webkitAudioContext;
          if (!Context) return;
          const audio = new Context();
          const oscillator = audio.createOscillator();
          const gain = audio.createGain();
          oscillator.type = "triangle";
          oscillator.frequency.setValueAtTime(784, audio.currentTime);
          oscillator.frequency.linearRampToValueAtTime(988, audio.currentTime + 0.12);
          gain.gain.setValueAtTime(0.0001, audio.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.06, audio.currentTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.22);
          oscillator.connect(gain);
          gain.connect(audio.destination);
          oscillator.start();
          oscillator.stop(audio.currentTime + 0.24);
        } catch (error) {
        }
      }

      function renderGroup(groupKey, label, threads) {
        if (!threads.length) return "";
        const openAttr = state.ui.groups[groupKey] ? " open" : "";
        const groupThreadIds = threads.map((thread) => thread.id).filter(Boolean);
        const groupAllSelected = groupThreadIds.length && groupThreadIds.every((threadId) => isSelected(threadId));
        const groupSomeSelected = groupThreadIds.some((threadId) => isSelected(threadId));
        const groupSelectClass = groupAllSelected ? " selected" : (groupSomeSelected ? " partial" : "");
        const groupSelectMark = groupAllSelected ? "✓" : (groupSomeSelected ? "-" : "");
        const groupSelectLabel = (groupAllSelected ? "Deselect all " : "Select all ") + label + " threads";
        const rootMarkup = buildRootGroups(threads).map(renderRootSubgroup).join("");
        return '<details class="group-block group-' + esc(groupKey) + '"' + openAttr + ' data-group="' + esc(groupKey) + '">' +
          '<summary class="group-summary"><span class="group-title-cluster">' +
            '<button class="group-select-btn' + groupSelectClass + '" data-select-group="' + esc(groupKey) + '" data-group-thread-ids="' + esc(JSON.stringify(groupThreadIds)) + '" title="' + esc(groupSelectLabel) + '" aria-label="' + esc(groupSelectLabel) + '" type="button">' + groupSelectMark + '</button>' +
            '<span class="group-label-dot"></span><span>' + esc(label) + '</span>' +
          '</span><span class="group-count">' + esc(String(threads.length)) + '</span></summary>' +
          rootMarkup +
        '</details>';
      }

      function autoLoopStateMeta(threadId) {
        const autoLoop = autoContinueConfigFor(threadId);
        if (!autoLoop) return { autoLoop: undefined, stateKey: "off", label: "Off" };
        const lastResult = autoLoop.lastResult || {};
        const stateKey = lastResult.state || autoLoop.lastLaunchStatus || "armed";
        const label = lastResult.label
          || (stateKey === "queued" ? "Queued"
            : stateKey === "failed" ? "Failed"
            : stateKey === "running" ? "Running"
            : stateKey === "success" ? "Succeeded"
            : "Armed");
        return { autoLoop, stateKey, label };
      }

      function renderThreadAutoLoopBadge(threadId) {
        const loopMeta = autoLoopStateMeta(threadId);
        if (!loopMeta.autoLoop) return "";
        const { stateKey, label } = loopMeta;
        return '<span class="loop-status-badge ' + esc(stateKey) + '">' + esc("Loop " + label) + '</span>';
      }

      function renderLoopManagedBadge(threadId) {
        const loopDaemon = (state.payload && state.payload.loopDaemon) || {};
        if (!threadId || !loopDaemon.threadId || loopDaemon.threadId !== threadId) return "";
        return '<span class="loop-status-badge managed">Loop Managed</span>';
      }

      function isLoopManagedThread(threadId) {
        const loopDaemon = (state.payload && state.payload.loopDaemon) || {};
        return Boolean(threadId) && Boolean(loopDaemon.threadId) && loopDaemon.threadId === threadId;
      }

      function isLoopQueueThread(thread) {
        if (!thread || !thread.id) return false;
        const loopDaemon = (state.payload && state.payload.loopDaemon) || {};
        return Boolean(isLoopManagedThread(thread.id)
          || autoContinueConfigFor(thread.id)
          || (loopDaemon && loopDaemon.threadId && loopDaemon.threadId === thread.id));
      }

      function renderRunningAutoLoopMeta(autoLoop) {
        return autoLoop
          ? '<div class="meta-pill">Auto ' + esc(String(autoLoop.remaining)) + '/' + esc(String(autoLoop.total || autoLoop.remaining)) + ' · ' + esc(short(autoLoop.prompt || "continue", 18)) + '</div>'
          : "";
      }

      function renderRunningLoopStatusCard(thread, size, autoLoop) {
        if (!(thread && autoLoop && (size === "m" || size === "l"))) return "";
        const lastResult = autoLoop.lastResult ? autoLoop.lastResult : undefined;
        return '<div class="loop-status-card">' +
          '<div class="loop-status-head">' +
            '<span class="loop-status-title">Background Continue</span>' +
            '<span class="loop-status-badge ' + esc((lastResult && lastResult.state) || autoLoop.lastLaunchStatus || "armed") + '">' + esc((lastResult && lastResult.label) || (autoLoop.lastLaunchStatus === "queued" ? "Queued" : autoLoop.lastLaunchStatus === "failed" ? "Failed" : "Armed")) + '</span>' +
          '</div>' +
          '<div class="loop-status-grid">' +
            '<div class="loop-status-row"><span class="loop-status-label">Last Run</span><span class="loop-status-value">' + esc(autoLoop.lastTriggeredAt ? formatTimestamp(autoLoop.lastTriggeredAt) : "Waiting for first trigger") + '</span></div>' +
            '<div class="loop-status-row"><span class="loop-status-label">Prompt</span><span class="loop-status-value mono">' + esc(short(autoLoop.lastPrompt || autoLoop.prompt || "continue", size === "l" ? 72 : 40)) + '</span></div>' +
            '<div class="loop-status-row"><span class="loop-status-label">Log</span><span class="loop-status-value mono">' + esc(short(autoLoop.lastLogPath || "No background log yet", size === "l" ? 108 : 68)) + '</span></div>' +
            '<div class="loop-status-row"><span class="loop-status-label">Last Result</span><span class="loop-status-value"><span class="loop-status-result"><span class="loop-result-dot ' + esc((lastResult && lastResult.state) || "armed") + '"></span><span>' + esc((lastResult && lastResult.label) || "Armed") + '</span></span> · ' + esc((lastResult && lastResult.detail) || (autoLoop.lastError || "Auto loop is armed and waiting for a real stop signal.")) + '</span></div>' +
            ((lastResult && lastResult.tailLine)
              ? '<div class="loop-status-row"><span class="loop-status-label">Log Tail</span><span class="loop-status-value"><div class="loop-tail">' + esc(short(lastResult.tailLine, size === "l" ? 180 : 110)) + '</div></span></div>'
              : '') +
            (autoLoop.lastError && (!lastResult || lastResult.state !== "failed")
              ? '<div class="loop-status-row"><span class="loop-status-label">Error</span><span class="loop-status-value">' + esc(short(autoLoop.lastError, size === "l" ? 100 : 60)) + '</span></div>'
              : '') +
            (autoLoop.lastLogPath
              ? '<div class="loop-status-actions"><button class="chip" data-open-log="' + esc(autoLoop.lastLogPath) + '" type="button">Open Log</button></div>'
              : '') +
          '</div>' +
        '</div>';
      }

      function renderPendingPromptBadge(threadId, options = {}) {
        const pending = pendingPromptMeta(threadId);
        if (!pending) return "";
        const stateKey = pending.state === "failed" ? "failed" : "queued";
        const label = pending.state === "failed" ? "Prompt Failed" : "Prompt Queued";
        const title = pending.state === "failed"
          ? (pending.message || "Prompt queue failed")
          : ("Queued: " + (pending.prompt || "continue"));
        const className = options.compact ? "meta-pill" : "loop-status-badge " + stateKey;
        return '<span class="' + esc(className) + '" title="' + esc(title) + '">' + esc(options.compact ? label : label) + '</span>';
      }

      function renderPendingPromptMeta(threadId) {
        const pending = pendingPromptMeta(threadId);
        if (!pending) return "";
        return '<div class="meta-pill" title="' + esc(pending.state === "failed" ? (pending.message || "Prompt queue failed") : ("Queued: " + (pending.prompt || "continue"))) + '">' + esc(pending.state === "failed" ? "Prompt Failed" : "Prompt Queued") + '</div>';
      }

      function renderPendingPromptSpotlightCue(threadId) {
        const pending = pendingPromptMeta(threadId);
        if (!pending) return "";
        return '<div class="spotlight-log-cue">' +
          '<div class="spotlight-log-head"><span class="spotlight-log-title">Prompt Queue</span><span class="spotlight-log-meta">' + esc(pending.state === "failed" ? "Failed" : "Queued") + '</span></div>' +
          '<div class="spotlight-log-copy">' + esc(pending.state === "failed" ? (pending.message || "Prompt queue failed.") : ('Queued locally: ' + short(pending.prompt || "continue", 140))) + '</div>' +
        '</div>';
      }

      function syncPendingPromptDom(threadId) {
        if (!threadId) return false;
        let synced = false;
        document.querySelectorAll('[data-thread-pending-prompt="' + CSS.escape(threadId) + '"]').forEach((node) => {
          node.innerHTML = renderPendingPromptBadge(threadId);
          synced = true;
        });
        document.querySelectorAll('[data-spotlight-pending-prompt="' + CSS.escape(threadId) + '"]').forEach((node) => {
          node.innerHTML = renderPendingPromptBadge(threadId, { compact: true });
          synced = true;
        });
        document.querySelectorAll('[data-running-pending-badge="' + CSS.escape(threadId) + '"]').forEach((node) => {
          node.innerHTML = renderPendingPromptBadge(threadId);
          synced = true;
        });
        document.querySelectorAll('[data-running-pending-meta="' + CSS.escape(threadId) + '"]').forEach((node) => {
          node.innerHTML = renderPendingPromptMeta(threadId);
          synced = true;
        });
        document.querySelectorAll('[data-spotlight-pending-cue="' + CSS.escape(threadId) + '"]').forEach((node) => {
          node.innerHTML = renderPendingPromptSpotlightCue(threadId);
          synced = true;
        });
        return synced;
      }

      function syncAutoLoopDom(threadId) {
        if (!threadId) return false;
        let synced = false;
        document.querySelectorAll('[data-thread-auto-loop-badge="' + CSS.escape(threadId) + '"]').forEach((node) => {
          node.innerHTML = renderThreadAutoLoopBadge(threadId);
          synced = true;
        });
        document.querySelectorAll('[data-spotlight-auto-loop-value="' + CSS.escape(threadId) + '"]').forEach((node) => {
          node.textContent = autoLoopStateMeta(threadId).label;
          synced = true;
        });
        document.querySelectorAll('[data-running-loop-meta="' + CSS.escape(threadId) + '"]').forEach((node) => {
          node.innerHTML = renderRunningAutoLoopMeta(autoContinueConfigFor(threadId));
          synced = true;
        });
        document.querySelectorAll('[data-running-loop-card="' + CSS.escape(threadId) + '"]').forEach((node) => {
          const thread = findThreadInPayload(threadId);
          const card = node.closest("[data-running-card]");
          const size = card && card.classList.contains("size-l")
            ? "l"
            : card && card.classList.contains("size-m")
              ? "m"
              : card && card.classList.contains("size-s")
                ? "s"
                : "tiny";
          node.innerHTML = renderRunningLoopStatusCard(thread, size, autoContinueConfigFor(threadId));
          synced = true;
        });
        return synced;
      }

      function canSyncExplorerOnlyThreadDom(threadId) {
        if (!threadId || !state.payload) return false;
        if (state.selectedThreadId === threadId) return false;
        if (isSelected(threadId) || isPinned(threadId) || isBoardAttached(threadId)) return false;
        if (document.querySelector('[data-running-card="' + CSS.escape(threadId) + '"]')) return false;
        if (document.querySelector('[data-running-thread="' + CSS.escape(threadId) + '"]')) return false;
        if (document.querySelector('[data-spotlight-status-badge="' + CSS.escape(threadId) + '"]')) return false;
        return true;
      }

      function refreshThreadSummaryDom() {
        if (!state.payload) return;
        const dashboard = state.payload.dashboard || {};
        const filteredThreads = (dashboard.threads || []).filter(threadMatches);
        const visibleCount = filteredThreads.length;
        const threadSummaryMarkup = renderThreadSummaryMarkup(
          visibleCount,
          (dashboard.threads || []).length,
          state.ui.topicFocus,
          state.ui.sort,
          state.ui.rootFilter,
          state.ui.workspaceFilter
        );
        setNodeHtml("threadSummary", threadSummaryMarkup);
        setNodeHtml("threadSummaryMirror", threadSummaryMarkup);
      }

      function removeThreadRowDom(threadId) {
        let synced = false;
        document.querySelectorAll('[data-thread-id="' + CSS.escape(threadId) + '"]').forEach((node) => {
          const group = node.closest("[data-group]");
          const rootGroup = node.closest("[data-root-group]");
          node.remove();
          if (rootGroup) {
            const rootCountNode = rootGroup.querySelector(".root-group-count");
            const nextRootCount = rootGroup.querySelectorAll("[data-thread-id]").length;
            if (nextRootCount) {
              if (rootCountNode) rootCountNode.textContent = String(nextRootCount);
            } else {
              rootGroup.remove();
            }
          }
          if (group) {
            const countNode = group.querySelector(".group-count");
            const nextCount = group.querySelectorAll("[data-thread-id]").length;
            if (nextCount) {
              if (countNode) countNode.textContent = String(nextCount);
            } else {
              group.remove();
            }
          }
          synced = true;
        });
        return synced;
      }

      function bindCopyThreadIdActions(root = document) {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll("[data-copy-thread-id]").forEach((node) => {
          if (node.dataset.copyThreadIdBound === "true") return;
          node.dataset.copyThreadIdBound = "true";
          node.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const threadId = node.dataset.copyThreadId || "";
            if (!threadId) return;
            vscode.postMessage({
              type: "copyText",
              text: threadId,
              label: "Thread ID",
            });
          });
        });
      }

      function bindGroupSelectionActions(root = document) {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll("[data-select-group]").forEach((node) => {
          if (node.dataset.selectGroupBound === "true") return;
          node.dataset.selectGroupBound = "true";
          node.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleGroupSelection(parseGroupThreadIds(node.dataset.groupThreadIds));
          });
        });
      }

      function bindThreadListDom(container) {
        if (!container) return;
        bindCopyThreadIdActions(container);
        bindGroupSelectionActions(container);
        container.querySelectorAll("[data-thread-id]").forEach((node) => {
          node.addEventListener("click", () => {
            toggleSelected(node.dataset.threadId);
          });
        });
        container.querySelectorAll("[data-open-inspector]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            const threadId = node.dataset.openInspector;
            setSelectedThread(threadId, { openDrawer: true });
            vscode.postMessage({ type: "selectThread", threadId });
          });
        });
        container.querySelectorAll("[data-select-thread]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleSelected(node.dataset.selectThread);
          });
        });
        container.querySelectorAll("[data-pin-thread]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            togglePin(node.dataset.pinThread);
          });
        });
        container.querySelectorAll("[data-board-attach]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleBoardAttach(node.dataset.boardAttach);
          });
        });
        container.querySelectorAll("[data-edit-card-name]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            beginInlineCardLabelEdit(node.dataset.editCardName, node);
          });
          node.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            beginInlineCardLabelEdit(node.dataset.editCardName, node);
          });
        });
        container.querySelectorAll("[data-set-board-tab]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            setThreadBoardTab(node.dataset.setBoardTab, node.dataset.currentBoardTab || "");
          });
        });
        container.querySelectorAll("[data-codex-thread]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            markCodexLinking(node.dataset.codexThread, "sidebar");
            render(state.payload);
            vscode.postMessage({
              type: "revealInCodexSidebar",
              threadId: node.dataset.codexThread,
            });
          });
        });
      }

      function syncThreadExplorerDom() {
        if (!state.payload) return false;
        const dashboard = state.payload.dashboard || {};
        const filteredThreads = (dashboard.threads || []).filter(threadMatches);
        const groups = buildGroups(filteredThreads);
        const threadSummaryMarkup = renderThreadSummaryMarkup(
          filteredThreads.length,
          (dashboard.threads || []).length,
          state.ui.topicFocus,
          state.ui.sort,
          state.ui.rootFilter,
          state.ui.workspaceFilter
        );
        const threadMarkup = [
          renderGroup("pinned", "Pinned", groups.pinned),
          renderGroup("running", "Running", groups.running),
          renderGroup("needs_human", "Needs Human", groups.needs_human),
          renderGroup("linked", "Linked", groups.linked),
          renderGroup("recent", "Recent", groups.recent),
          renderGroup("idle", "Idle", groups.idle),
          renderGroup("archived", "Archived", groups.archived),
          renderGroup("soft_deleted", "Soft Deleted", groups.soft_deleted)
        ].join("") || '<div class="empty">No threads loaded.</div>';
        const threadSummary = setNodeHtml("threadSummary", threadSummaryMarkup);
        const threadSummaryMirror = setNodeHtml("threadSummaryMirror", threadSummaryMarkup);
        const threadTabFilter = setNodeHtml("threadTabFilterControl", renderThreadTabFilterControl());
        const threadCountSummaryMarkup = renderThreadCountSummaryStats(dashboard.threads || [], filteredThreads, state.payload);
        const threadCountSummary = setNodeHtml("threadCountSummaryStats", threadCountSummaryMarkup);
        const threadPageSummary = setNodeHtml("threadPageSummaryStats", threadCountSummaryMarkup);
        const threadList = setNodeHtml("threadList", threadMarkup);
        const threadListMirror = setNodeHtml("threadListMirror", threadMarkup);
        if (!(threadSummary || threadSummaryMirror || threadTabFilter || threadCountSummary || threadPageSummary || threadList || threadListMirror)) return false;
        bindThreadListDom(threadList);
        bindThreadListDom(threadListMirror);
        scrollFocusedCodexThreadIntoView(state.payload);
        return true;
      }

      function syncThreadRemovedDom(threadId) {
        if (!canSyncExplorerOnlyThreadDom(threadId)) return false;
        const synced = removeThreadRowDom(threadId);
        if (!synced) return false;
        refreshThreadSummaryDom();
        return true;
      }

      function syncThreadsRemovedDom(threadIds) {
        const ids = Array.isArray(threadIds) ? threadIds.filter(Boolean) : [];
        if (!ids.length) return false;
        if (ids.some((threadId) => !canSyncExplorerOnlyThreadDom(threadId))) return false;
        let synced = false;
        ids.forEach((threadId) => {
          synced = removeThreadRowDom(threadId) || synced;
        });
        if (!synced) return false;
        refreshThreadSummaryDom();
        return true;
      }

      function syncThreadsPatchedDom(threadIds) {
        const ids = Array.isArray(threadIds) ? threadIds.filter(Boolean) : [];
        if (!ids.length || state.ui.pendingBatch) return false;
        if (Object.keys(state.ui.selected || {}).some((threadId) => state.ui.selected[threadId])) return false;
        if (ids.some((threadId) => !canSyncExplorerOnlyThreadDom(threadId))) return false;
        return syncThreadExplorerDom();
      }

      function renderThreadVisibilityPill(thread, payload = state.payload) {
        const label = codexVisibilityLabel(thread, payload);
        if (label === "Visible") return "";
        return '<span class="meta-pill">Vis ' + esc(label) + '</span>';
      }

      function renderThreadRow(thread) {
        const active = state.selectedThreadId === thread.id ? " active" : "";
        const selectedClass = isSelected(thread.id) ? " selected" : "";
        const pinnedClass = isPinned(thread.id) ? " pinned" : "";
        const phase = inferCodexPhase(thread);
        const status = effectiveThreadStatus(thread);
        const linkMeta = codexLinkMeta(thread.id);
        const linkBadge = codexLinkBadge(thread.id);
        const codexClass = linkMeta.isFocused ? " codex-focused" : (linkMeta.isOpen ? " codex-open" : "");
        return '<div class="thread-row' + active + selectedClass + codexClass + '" data-thread-id="' + esc(thread.id) + '">' +
          '<div class="thread-topline">' +
            '<div class="thread-status-cluster">' +
              '<button class="select-btn' + (isSelected(thread.id) ? ' selected' : '') + '" data-select-thread="' + esc(thread.id) + '" type="button">' + (isSelected(thread.id) ? '✓' : '') + '</button>' +
              '<span data-thread-status-badge="' + esc(thread.id) + '">' + statusBadge(status) + '</span>' +
              renderEditableCardName(thread, { maxLength: 46 }) +
              '<span data-thread-loop-managed-badge="' + esc(thread.id) + '">' + renderLoopManagedBadge(thread.id) + '</span>' +
              '<span data-thread-auto-loop-badge="' + esc(thread.id) + '">' + renderThreadAutoLoopBadge(thread.id) + '</span>' +
              '<span data-thread-pending-prompt="' + esc(thread.id) + '">' + renderPendingPromptBadge(thread.id) + '</span>' +
              '<span data-thread-link-badge="' + esc(thread.id) + '">' + linkBadge + '</span>' +
            '</div>' +
            '<div class="thread-actions-inline">' +
              '<span class="thread-updated mono">' + esc(thread.updated_at_iso || "") + '</span>' +
              '<button class="mini-action-btn inspector" data-open-inspector="' + esc(thread.id) + '" type="button">Inspector</button>' +
              '<button class="mini-action-btn" data-set-board-tab="' + esc(thread.id) + '" data-current-board-tab="' + esc(boardTabFor(thread.id)) + '" type="button">' + esc(boardTabFor(thread.id) ? ('Tab: ' + boardTabFor(thread.id)) : '+ Tab') + '</button>' +
              '<button class="mini-action-btn" data-board-attach="' + esc(thread.id) + '" type="button">' + (isBoardAttached(thread.id) ? 'Attached' : 'Board') + '</button>' +
              '<button class="mini-action-btn" data-codex-thread="' + esc(thread.id) + '" type="button">Codex</button>' +
              '<button class="pin-btn' + pinnedClass + '" data-pin-thread="' + esc(thread.id) + '" type="button">' + (isPinned(thread.id) ? "Pinned" : "Pin") + '</button>' +
            '</div>' +
          '</div>' +
          renderInlineCardTitle(thread, "thread-title", 72, "(no title)") +
          '<div class="thread-meta">' +
            renderCopyableThreadId(thread.id, { maxLength: 20 }) +
            renderRootIdentityPill(thread, { interactive: true }) +
            renderBoardTabPill(thread) +
            (thread.pending_new_agent ? '<span class="meta-pill">Waiting for session import</span>' : '') +
            renderPhaseChip(phase) +
            '<span data-thread-visibility-pill="' + esc(thread.id) + '">' + renderThreadVisibilityPill(thread) + '</span>' +
            renderThreadUsageMeta(thread) +
            '<span class="meta-pill meta-pill-cmd">Cmd ' + esc(String(threadCommandCount(thread))) + '</span>' +
            '<span class="meta-pill meta-pill-cmp">Cmp ' + esc(String(thread.compaction_count || 0)) + '</span>' +
            '<span class="meta-pill" data-thread-status-meta="' + esc(thread.id) + '">' + esc(thread.soft_deleted ? "soft-deleted" : (thread.archived ? "archived" : status)) + '</span>' +
          '</div>' +
        '</div>';
      }

      function renderSpotlight(thread, detail) {
        if (!thread && !(detail && detail.thread)) {
          return renderCuteEmpty("Spotlight is waiting", "Select a thread to show the inspector spotlight and keep one cute helper nearby.", MEDIA.spotlight);
        }
        const merged = Object.assign({}, thread || {}, (detail && detail.thread) || {});
        const latestLog = Array.isArray(merged.preview_logs) && merged.preview_logs.length ? merged.preview_logs[0] : undefined;
        const progress = extractThreadProgress(merged);
        const status = effectiveThreadStatus(merged, state.payload);
        const linkMeta = codexLinkMeta(merged.id);
        const linkLabel = linkMeta.isFocused ? "Focused in Codex" : (linkMeta.isSidebar ? "Shown in Codex Sidebar" : (linkMeta.isOpen ? "Open in Codex" : (linkMeta.pending ? "Linking to Codex" : "Not linked")));
        const loopMeta = autoLoopStateMeta(merged.id);
        const autoLoop = loopMeta.autoLoop;
        const coordination = effectiveCoordinationTruth(merged);
        return '<div class="spotlight-grid">' +
          '<div class="spotlight-hero">' +
            '<div class="spotlight-summary">' +
              '<div class="spotlight-badges">' +
                '<span data-spotlight-status-badge="' + esc(merged.id) + '">' + statusBadge(status) + '</span>' +
                '<span data-spotlight-loop-managed-badge="' + esc(merged.id) + '">' + renderLoopManagedBadge(merged.id) + '</span>' +
                '<span data-spotlight-link-badge="' + esc(merged.id) + '">' + codexLinkBadge(merged.id) + '</span>' +
                '<span data-spotlight-pending-prompt="' + esc(merged.id) + '">' + renderPendingPromptBadge(merged.id, { compact: true }) + '</span>' +
                renderCopyableThreadId(merged.id, { maxLength: 20 }) +
                renderRootIdentityPill(merged) +
              '</div>' +
              '<div class="spotlight-head">' +
                renderInlineCardTitle(merged, "spotlight-title", 120, "Selected agent") +
                renderEditableCardName(merged, { maxLength: 72 }) +
                '<div class="spotlight-copy">' + esc(short(merged.cwd || "No workspace path available.", 160)) + '</div>' +
              '</div>' +
              renderMemoryShortcutRow() +
            '</div>' +
            '<div class="spotlight-action-panel">' +
              '<div class="spotlight-action-title">Actions</div>' +
              '<div class="spotlight-action-group">' +
                '<div class="spotlight-action-group-title">Inspect</div>' +
                '<div class="spotlight-actions">' +
                  '<button class="chip" data-open-drawer="true" type="button">Open Drawer</button>' +
                  '<button class="chip" data-subtab-shortcut="console" type="button">Console</button>' +
                  '<button class="chip" data-subtab-shortcut="history" type="button">History</button>' +
                  '<button class="chip" data-open-codex-editor="' + esc(merged.id || "") + '" type="button">Open in Editor</button>' +
                  '<button class="chip" data-codex-thread="' + esc(merged.id || "") + '" type="button">Sidebar Codex</button>' +
                '</div>' +
              '</div>' +
              '<div class="spotlight-action-group">' +
                '<div class="spotlight-action-group-title">Loop / Lifecycle</div>' +
                '<div class="spotlight-actions">' +
                  '<button class="chip"' + (isLoopManagedThread(merged.id) ? ' disabled' : ' data-set-loop-managed="' + esc(merged.id || "") + '"') + ' type="button">' + esc(isLoopManagedThread(merged.id) ? "Loop Managed" : "Manage Loop") + '</button>' +
                  '<button class="chip" data-run-loop-preset="' + esc(merged.id || "") + '" data-loop-interval="10" type="button">Loop 10m</button>' +
                  '<button class="chip" data-run-loop-preset="' + esc(merged.id || "") + '" data-loop-interval="20" type="button">Loop 20m</button>' +
                  '<button class="chip" data-run-loop-custom="' + esc(merged.id || "") + '" type="button">Custom Loop</button>' +
                  (autoLoop && autoLoop.lastLogPath ? '<button class="chip" data-open-log="' + esc(autoLoop.lastLogPath) + '" type="button">Loop Log</button>' : '') +
                '</div>' +
              '</div>' +
              '<div class="spotlight-action-group">' +
                '<div class="spotlight-action-group-title">Coordination</div>' +
                '<div class="spotlight-actions">' +
                  '<button class="chip" data-set-handoff="' + esc(merged.id || "") + '" type="button">' + esc(coordination.explicit ? "Edit Handoff Cue" : "Cue Handoff") + '</button>' +
                  (coordination.explicit ? '<button class="chip" data-clear-handoff="' + esc(merged.id || "") + '" type="button">Clear Cue</button>' : '') +
                  (coordination.targetThreadId ? '<button class="chip" data-focus-thread="' + esc(coordination.targetThreadId) + '" type="button">Focus Target</button>' : '') +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="spotlight-metrics">' +
          '<div class="spotlight-stat"><div class="spotlight-stat-label">Updated</div><div class="spotlight-stat-value">' + esc(merged.updated_at_iso || merged.updated_age || "-") + '</div></div>' +
          '<div class="spotlight-stat"><div class="spotlight-stat-label">Progress</div><div class="spotlight-stat-value">' + esc(progress.percent !== undefined ? (String(progress.percent) + "%") : progress.label) + '</div></div>' +
          '<div class="spotlight-stat"><div class="spotlight-stat-label">Codex Link</div><div class="spotlight-stat-value" data-spotlight-link-value="' + esc(merged.id) + '">' + esc(linkLabel) + '</div></div>' +
          '<div class="spotlight-stat"><div class="spotlight-stat-label">Process</div><div class="spotlight-stat-value">' + esc((merged.process && merged.process.summary) || "No live process") + '</div></div>' +
          '<div class="spotlight-stat"><div class="spotlight-stat-label">Coordination</div><div class="spotlight-stat-value">' + esc(coordination.label || "Waiting") + (coordination.explicit ? " · explicit" : "") + '</div></div>' +
          '<div class="spotlight-stat"><div class="spotlight-stat-label">Next Owner</div><div class="spotlight-stat-value">' + esc(coordination.targetLabel || "-") + '</div></div>' +
          '<div class="spotlight-stat"><div class="spotlight-stat-label">Auto Loop</div><div class="spotlight-stat-value" data-spotlight-auto-loop-value="' + esc(merged.id) + '">' + esc(loopMeta.label) + '</div></div>' +
          '<div class="spotlight-stat commands"><div class="spotlight-stat-label">Commands</div><div class="spotlight-stat-value">' + esc(String(threadCommandCount(merged))) + '</div></div>' +
          '<div class="spotlight-stat compactions"><div class="spotlight-stat-label">Compactions</div><div class="spotlight-stat-value">' + esc(String(merged.compaction_count || 0)) + '</div></div>' +
        '</div>' +
        '<div class="spotlight-log-cue">' +
          '<div class="spotlight-log-head"><span class="spotlight-log-title">Recent Log</span><span class="spotlight-log-meta">' + esc(latestLog ? ((latestLog.level || "INFO") + " · " + (latestLog.ts_iso || "now")) : "No preview log yet") + '</span></div>' +
          '<div class="spotlight-log-copy">' + esc(latestLog ? short(latestLog.message || latestLog.target || "Recent log event", 180) : "Use Console for the full live stream when this thread starts emitting logs.") + '</div>' +
        '</div>' +
        '<div data-spotlight-pending-cue="' + esc(merged.id) + '">' + renderPendingPromptSpotlightCue(merged.id) + '</div>' +
        '<div class="progress-head"><span class="progress-label">' + esc(progress.label) + '</span><span class="progress-value">' + esc(progress.percent !== undefined ? (String(progress.percent) + "%") : status) + '</span></div>' +
        '<div class="progress-track"><div class="progress-bar" style="width:' + esc(String(progress.percent !== undefined ? progress.percent : 18)) + '%"></div></div>' +
        '<div class="progress-note">' + esc(progress.note) + '</div>';
      }

      function renderTimelineEvent(title, ts, copy, tone = "live") {
        return '<div class="timeline-event">' +
          '<div class="timeline-dot' + (tone === "complete" ? ' complete' : '') + '"></div>' +
          '<div class="timeline-event-body">' +
            '<div class="timeline-event-head"><span class="timeline-event-title">' + esc(title) + '</span><span class="completion-meta">' + esc(ts || "") + '</span></div>' +
            '<div class="timeline-event-copy">' + esc(copy || "") + '</div>' +
          '</div>' +
        '</div>';
      }

      function renderLiveTimeline(runningThreads, recentCompletions) {
        const cards = [];
        (runningThreads || []).forEach((thread) => {
          const phase = inferCodexPhase(thread);
          const visualPhaseLabel = effectiveThreadStatus(thread) === "running" ? "Running" : phase.label;
          const phaseClass = phaseClassFor(phase.label).trim();
          const status = effectiveThreadStatus(thread);
          const logs = (thread.preview_logs || []).slice(0, 4);
          cards.push(
            '<div class="timeline-card ' + esc(phaseClass) + '">' +
              '<div class="timeline-header"><div class="timeline-title-wrap">' + renderThemeVisual(phaseArtFor(phase.label), "timeline-phase-art", visualPhaseLabel, "timeline") + '<div class="timeline-title">' + esc(short(displayThreadTitle(thread, "Running thread"), 56)) + '</div></div><span style="display:inline-flex; gap:6px; align-items:center; flex-wrap:wrap;">' + renderCopyableThreadId(thread.id, { maxLength: 12 }) + statusBadge(status) + '</span></div>' +
              '<div class="timeline-events">' +
                (logs.length
                  ? logs.map((log) => renderTimelineEvent(log.level || "Log", log.ts_iso || "", short(log.message || log.target || "log event", 140))).join("")
                  : renderTimelineEvent("Waiting for logs", "", "The agent is running but no preview log is available yet.")) +
              '</div>' +
            '</div>'
          );
        });
        if (recentCompletions && recentCompletions.length) {
          cards.push(
            '<div class="timeline-card">' +
              '<div class="timeline-header"><div class="timeline-title">Completion Feed</div><span class="badge badge-running">Done</span></div>' +
              '<div class="timeline-events">' +
                recentCompletions.slice(0, 6).map((item) => renderTimelineEvent(short(item.title || item.threadId || "Completed thread", 64), item.updatedAt || "", "Agent finished and is ready for inspection.", "complete")).join("") +
              '</div>' +
            '</div>'
          );
        }
        return cards.join("") || renderCuteEmpty("Timeline is quiet", "Start a running agent and this lane will animate with fresh events.", MEDIA.timeline);
      }


      function interventionBucket(thread) {
        const truth = effectiveCoordinationTruth(thread);
        if (!truth.needsHuman) return "urgent";
        return truth.bucket || "urgent";
      }

      function coordinationArtFor(key, bucket) {
        if (key === "owner") return MEDIA.timeline;
        if (key === "handoff") return bucket === "blocked" ? MEDIA.intervention : MEDIA.spotlight;
        return MEDIA.waiting;
      }

      function renderCoordinationQueueItem(thread, lane = "waiting") {
        const truth = effectiveCoordinationTruth(thread);
        const status = effectiveThreadStatus(thread);
        const art = lane === "running"
          ? MEDIA.timeline
          : lane === "handoff"
            ? MEDIA.intervention
            : lane === "loop"
              ? MEDIA.tooling
            : MEDIA.waiting;
        const label = lane === "running" ? "Running" : (lane === "loop" ? "Loop" : (truth.label || (lane === "handoff" ? "Handoff" : "Waiting")));
        return '<div class="mini-thread with-art" data-thread-id="' + esc(thread.id) + '">' +
          renderThemeVisual(art, "mini-thread-art", label, "mini") +
          '<div class="mini-thread-meta mini-thread-topmeta">' + statusBadge(status) + renderCopyableThreadId(thread.id, { maxLength: 14 }) + '</div>' +
          renderInlineCardTitle(thread, "mini-thread-title", 42, "Thread") +
          (lane === "loop" ? '<div class="mini-thread-meta">' + renderLoopManagedBadge(thread.id) + renderThreadAutoLoopBadge(thread.id) + '</div>' : '') +
          (truth.explicit ? '<div class="mini-thread-meta"><span class="meta-pill">Explicit Cue</span></div>' : '') +
          (truth.targetLabel ? '<div class="mini-thread-meta">Next owner: ' + esc(short(truth.targetLabel, 40)) + '</div>' : '') +
        '</div>';
      }

      function renderCoordinationQueueSection(label, threads, lane, emptyText) {
        const rows = (threads || []).slice(0, 3).map((thread) => renderCoordinationQueueItem(thread, lane)).join("");
        return '<div class="coordination-queue-section">' +
          '<div class="coordination-queue-heading"><span>' + esc(label) + '</span><span class="meta-pill">' + esc(String((threads || []).length)) + '</span></div>' +
          (rows || '<div class="coordination-queue-empty">' + esc(emptyText) + '</div>') +
        '</div>';
      }

      function renderCoordinationThreadRow(thread) {
        const truth = effectiveCoordinationTruth(thread);
        const phase = inferCodexPhase(thread);
        const bucket = truth.bucket || "ready";
        const bucketLabel = bucket === "blocked"
          ? "Blocked"
          : bucket === "waiting"
            ? "Waiting"
            : bucket === "active"
              ? "Active"
              : bucket === "ready"
                ? "Ready"
              : "Urgent";
        const title = displayThreadTitle(thread, "Thread");
        const targetLabel = truth.targetLabel || "";
        return '<div class="mini-thread with-art" data-thread-id="' + esc(thread.id) + '">' +
          renderThemeVisual(coordinationArtFor(truth.key, bucket), "mini-thread-art", truth.label || "Coordination", "mini") +
          '<div class="mini-thread-meta mini-thread-topmeta">' + statusBadge(effectiveThreadStatus(thread)) + renderCopyableThreadId(thread.id, { maxLength: 14 }) + '</div>' +
          renderInlineCardTitle(thread, "mini-thread-title", 42, title || "Thread") +
          (truth.explicit ? '<div class="mini-thread-meta"><span class="meta-pill">Explicit Cue</span></div>' : '') +
          (targetLabel ? '<div class="mini-thread-meta">Next owner: ' + esc(short(targetLabel, 52)) + '</div>' : '') +
          '<div class="mini-thread-meta">' + esc(short(truth.reason || phase.copy || "Coordination signal available.", 120)) + '</div>' +
          '<div class="chip-row"><button class="chip" data-open-codex-editor="' + esc(thread.id) + '" type="button">Editor</button><button class="chip" data-codex-thread="' + esc(thread.id) + '" type="button">Codex</button><button class="chip" data-set-handoff="' + esc(thread.id) + '" type="button">' + esc(truth.explicit ? "Edit Cue" : "Cue Handoff") + '</button>' + (truth.explicit ? '<button class="chip" data-clear-handoff="' + esc(thread.id) + '" type="button">Clear Cue</button>' : '') + (truth.targetThreadId ? '<button class="chip" data-focus-thread="' + esc(truth.targetThreadId) + '" type="button">Focus Target</button>' : '') + '</div>' +
        '</div>';
      }

      function renderCoordinationColumn(label, note, threads) {
        return '<div class="panel">' +
          '<div class="section-title">' + esc(label) + '</div>' +
          '<div class="section-note">' + esc(note) + '</div>' +
          '<div class="digest-rail">' +
            (threads.length
              ? threads.map((thread) => renderCoordinationThreadRow(thread)).join("")
              : renderCuteEmpty("No threads", "This coordination lane is quiet right now.", MEDIA.rest)) +
          '</div>' +
        '</div>';
      }

      function renderCoordinationPane(boardThreads) {
        const owners = (boardThreads || []).filter((thread) => effectiveCoordinationTruth(thread).key === "owner");
        const handoffs = (boardThreads || []).filter((thread) => effectiveCoordinationTruth(thread).key === "handoff");
        const waiting = (boardThreads || []).filter((thread) => effectiveCoordinationTruth(thread).key === "waiting");
        const blockedHandoffs = handoffs.filter((thread) => effectiveCoordinationTruth(thread).bucket === "blocked");
        const waitingHandoffs = handoffs.filter((thread) => effectiveCoordinationTruth(thread).bucket === "waiting");
        const explicitCues = handoffs.filter((thread) => effectiveCoordinationTruth(thread).explicit);
        const urgentHandoffs = handoffs.filter((thread) => {
          const bucket = effectiveCoordinationTruth(thread).bucket;
          return bucket !== "blocked" && bucket !== "waiting";
        });
        const headline = handoffs.length
          ? (handoffs.length + " handoff signal" + (handoffs.length > 1 ? "s are" : " is") + " active across this board tab.")
          : "No active handoff signals right now. The board canvas can stay focused on execution.";
        return '<div class="coordination-shell">' +
          '<div class="panel">' +
            '<div class="section-title">Coordination Control</div>' +
            '<div class="section-note">' + esc(headline) + ' Host-owned coordination truth is separated from card layout so baton passing does not hide inside board chrome.</div>' +
            '<div class="summary-deck">' +
              renderSummaryCard("Owners", String(owners.length), owners.length ? "Threads currently executing the active slice." : "No owner threads on this board tab.", owners.length ? "Tooling" : "Waiting", owners.length ? MEDIA.board : MEDIA.waiting) +
              renderSummaryCard("Handoffs", String(handoffs.length), handoffs.length ? "Threads asking for input, approval, or takeover." : "No handoff requests right now.", handoffs.length ? "Inspecting" : "Waiting", handoffs.length ? MEDIA.intervention : MEDIA.rest) +
              renderSummaryCard("Explicit Cues", String(explicitCues.length), explicitCues.length ? "User-declared baton passes with target owners or next-step notes." : "No explicit handoff cues on this board tab yet.", explicitCues.length ? "Planning" : "Waiting", explicitCues.length ? MEDIA.spotlight : MEDIA.rest) +
              renderSummaryCard("Waiting Pool", String(waiting.length), waiting.length ? "Threads ready for the next steer or reassignment." : "No waiting threads right now.", waiting.length ? "Planning" : "Waiting", waiting.length ? MEDIA.spotlight : MEDIA.rest) +
              renderSummaryCard("Blocked", String(blockedHandoffs.length), blockedHandoffs.length ? "Blocked handoffs are isolated here so they do not blur with normal waiting." : "No blocked handoffs on this board tab.", blockedHandoffs.length ? "Inspecting" : "Waiting", blockedHandoffs.length ? MEDIA.intervention : MEDIA.rest) +
            '</div>' +
          '</div>' +
          '<div class="overview-grid">' +
            renderCoordinationColumn("Handoff Queue", "Urgent, blocked, and waiting baton-passes stay here instead of pulsing on the canvas.", urgentHandoffs.concat(blockedHandoffs, waitingHandoffs)) +
            renderCoordinationColumn("Owner Threads", "These threads are the active executors for the current slice.", owners) +
            renderCoordinationColumn("Waiting Pool", "Ready-to-reopen threads stay visible without looking like board emergencies.", waiting) +
          '</div>' +
        '</div>';
      }

      function renderRunningBoard(boardThreads, options = {}) {
        const placementState = buildBoardPlacements(boardThreads, options);
        const ordered = placementState.ordered;
        return ordered.map((thread) => {
          const progress = extractThreadProgress(thread);
          const phase = inferCodexPhase(thread);
          const linkMeta = codexLinkMeta(thread.id);
          const linkBadge = codexLinkBadge(thread.id);
          const autoLoop = autoContinueConfigFor(thread.id);
          const savedSize = getRunningCardSize(thread.id);
          const size = options.compact ? "tiny" : savedSize;
          const isLoopPanelOpen = state.ui.loopPanelThreadId === thread.id;
          const isTiny = !options.compact && size === "tiny";
          const isCompactTiny = options.compact && size === "tiny";
          const quickPrompt = state.ui.quickComposerDrafts[thread.id] || "continue";
          const isQuickComposerOpen = state.ui.quickComposerThreadId === thread.id;
          const status = effectiveThreadStatus(thread);
          const pendingPrompt = pendingPromptMeta(thread.id);
          const loopStatusCard = renderRunningLoopStatusCard(thread, size, autoLoop);
          const codexClass = linkMeta.isFocused ? " codex-card-focused" : (linkMeta.isOpen ? " codex-card-open" : "");
          const pinnedClass = isPinned(thread.id) ? " pinned-card" : "";
          const runningClass = status === "running" ? " running-live" : "";
          const attachedClass = (thread.board_source === "attached" || thread.board_source === "linked" || status === "attached" || status === "linked") && !runningClass ? " board-attached" : "";
          const phaseClass = phaseClassFor(phase.label);
          const visualPhaseLabel = status === "running" ? "Running" : phase.label;
          const dropClass = state.runningDropIndicator && state.runningDropIndicator.threadId === thread.id
            ? (state.runningDropIndicator.position === "after" ? " drop-after" : " drop-before")
            : "";
          const draggable = "false";
          const placement = options.compact ? undefined : placementState.placements.get(thread.id);
          const layout = options.compact ? { cols: 1, height: 156 } : getRunningCardLayout(thread.id, size);
          const cardStyle = options.compact
            ? ' style="grid-column: span ' + esc(String(layout.cols)) + '; min-height:' + esc(String(layout.height)) + 'px; height:auto;"'
            : ' style="grid-column: ' + esc(String((placement && placement.col) || 1)) + ' / span ' + esc(String((placement && placement.cols) || layout.cols)) + '; grid-row: ' + esc(String((placement && placement.row) || 1)) + ' / span ' + esc(String((placement && placement.rows) || layoutHeightToRows(layout.height, { gap: 12, rowHeight: 18 }))) + '; min-height:' + esc(String((placement && placement.height) || layout.height)) + 'px; height:' + esc(String((placement && placement.height) || layout.height)) + 'px;"';
          const boardCardTopActions = options.compact
            ? ''
            : '<div class="board-card-size-actions">' +
                '<div class="size-switch">' +
                  '<button class="size-chip' + (size === "s" ? ' active' : '') + '" data-card-size="' + esc(thread.id) + '" data-card-size-value="s" type="button"' + (state.ui.layoutLocked ? ' disabled' : '') + '>S</button>' +
                  '<button class="size-chip' + (size === "m" ? ' active' : '') + '" data-card-size="' + esc(thread.id) + '" data-card-size-value="m" type="button"' + (state.ui.layoutLocked ? ' disabled' : '') + '>M</button>' +
                  '<button class="size-chip' + (size === "l" ? ' active' : '') + '" data-card-size="' + esc(thread.id) + '" data-card-size-value="l" type="button"' + (state.ui.layoutLocked ? ' disabled' : '') + '>L</button>' +
                '</div>' +
                '<button class="tool-btn board-codex-shortcut" data-codex-thread="' + esc(thread.id) + '" type="button">' + renderToolIcon('codex') + '<span>Codex</span></button>' +
              '</div>';
          const boardSourceLabel = thread.board_source === "attached" || status === "attached"
            ? "Attached to board"
            : thread.board_source === "linked" || status === "linked"
              ? "Linked on board"
              : "Running on board";
          const subtitle = short(
            thread.updated_at_iso
              ? (thread.updated_at_iso + " · " + boardSourceLabel)
              : boardSourceLabel,
            size === "l" ? 120 : size === "m" ? 88 : size === "s" ? 70 : 44
          );
          const preview = (thread.board_source === "attached" || status === "attached")
            ? short((thread.preview || thread.db_title || "Attached thread ready for quick access from the board."), size === "l" ? 180 : size === "m" ? 128 : size === "s" ? 92 : 52)
            : (thread.board_source === "linked" || status === "linked")
              ? short("This thread is open in Codex and linked on the board, but it is not currently treated as an actively running agent.", size === "l" ? 180 : size === "m" ? 128 : size === "s" ? 92 : 52)
            : short((thread.process && thread.process.summary) || "No live process detected", size === "l" ? 180 : size === "m" ? 128 : size === "s" ? 92 : 52);
          const titleMax = size === "l" ? 84 : size === "m" ? 68 : size === "s" ? 48 : 30;
          const showRichPhase = size === "m" || size === "l";
          const showProgress = size !== "tiny";
          const showPreview = size === "m" || size === "l";
          const rootCue = thread.cwd
            ? '<div class="running-card-path-row">' + renderRootIdentityPill(thread) + '</div>'
            : '';
          const compactTitlebar = options.compact
            ? (
                '<div class="compact-card-titlebar">' +
                  renderInlineCardTitle(thread, "compact-card-title", 72, "Running agent") +
                  renderEditableCardName(thread, { className: "running-card-card-name", maxLength: 46 }) +
                  '<div class="compact-card-actions">' +
                    '<button class="tool-btn' + (isQuickComposerOpen ? ' primary' : '') + '" data-open-composer="' + esc(thread.id) + '" data-current-prompt="' + esc(quickPrompt) + '" type="button">' + renderToolIcon('prompt') + '<span>Prompt</span></button>' +
                    '<button class="tool-btn codex-link primary" data-codex-thread="' + esc(thread.id) + '" type="button">' + renderToolIcon('codex') + '<span>Codex</span></button>' +
                  '</div>' +
                '</div>'
              )
            : '';
          const conversationStats = (size === "m" || size === "l")
            ? '<div class="running-card-note">Commands ' + esc(String(threadCommandCount(thread))) + ' · Compactions ' + esc(String(thread.compaction_count || 0)) + '</div>'
            : '';
          const cardUsageMeta = (!options.compact && size !== "tiny")
            ? '<div class="thread-meta card-usage-meta">' + renderCopyableThreadId(thread.id, { maxLength: 20 }) + renderThreadUsageMeta(thread) + '</div>'
            : '';
          const bodyInner = size === "l"
            ? (
                '<div class="running-card-copy">' +
                  renderInlineCardTitle(thread, "running-card-title", titleMax, "Running agent") +
                  renderEditableCardName(thread, { className: "running-card-card-name", maxLength: size === "l" ? 72 : 54 }) +
                  rootCue +
                  '<div class="running-card-subtitle">' + esc(subtitle) + '</div>' +
                  cardUsageMeta +
                  '<div class="preview">' + esc(preview) + '</div>' +
                  conversationStats +
                  '<div data-running-loop-card="' + esc(thread.id) + '">' + loopStatusCard + '</div>' +
                '</div>' +
                '<div class="running-card-side">' +
                  '<div class="phase-panel"><div class="phase-head"><span class="phase-title">' + renderThemeVisual(phaseArtFor(phase.label), "phase-art", visualPhaseLabel, "phase") + '<span class="phase-label">' + esc(phase.label) + '</span></span><span class="meta-pill" data-running-link-meta="' + esc(thread.id) + '">' + esc(linkMeta.isFocused ? "Focused" : (linkMeta.isSidebar ? "Sidebar" : (linkMeta.isOpen ? "Linked" : "Inferred"))) + '</span></div><div class="phase-copy">' + esc(phase.copy) + '</div></div>' +
                  '<div class="progress-head"><span class="progress-label">' + esc(progress.label) + '</span><span class="progress-value" data-running-progress-value="' + esc(thread.id) + '">' + esc(progress.percent !== undefined ? (String(progress.percent) + "%") : status) + '</span></div>' +
                  '<div class="progress-track"><div class="progress-bar" style="width:' + esc(String(progress.percent !== undefined ? progress.percent : 18)) + '%"></div></div>' +
                  '<div class="running-card-note">' + esc(progress.note) + '</div>' +
                '</div>'
              )
            : (
                renderInlineCardTitle(thread, "running-card-title", titleMax, "Running agent") +
                renderEditableCardName(thread, { className: "running-card-card-name", maxLength: size === "m" ? 58 : 42 }) +
                rootCue +
                '<div class="running-card-subtitle">' + esc(subtitle) + '</div>' +
                cardUsageMeta +
                (showPreview ? '<div class="preview">' + esc(preview) + '</div>' : '') +
                conversationStats +
                (showRichPhase
                  ? '<div class="phase-panel"><div class="phase-head"><span class="phase-title">' + renderThemeVisual(phaseArtFor(phase.label), "phase-art", visualPhaseLabel, "phase") + '<span class="phase-label">' + esc(phase.label) + '</span></span><span class="meta-pill" data-running-link-meta="' + esc(thread.id) + '">' + esc(linkMeta.isFocused ? "Focused" : (linkMeta.isSidebar ? "Sidebar" : (linkMeta.isOpen ? "Linked" : "Inferred"))) + '</span></div><div class="phase-copy">' + esc(phase.copy) + '</div></div>'
                  : '') +
                '<div data-running-loop-card="' + esc(thread.id) + '">' + loopStatusCard + '</div>' +
                (showProgress
                  ? '<div class="progress-head"><span class="progress-label">' + esc(progress.label) + '</span><span class="progress-value" data-running-progress-value="' + esc(thread.id) + '">' + esc(progress.percent !== undefined ? (String(progress.percent) + "%") : status) + '</span></div>' +
                    '<div class="progress-track"><div class="progress-bar" style="width:' + esc(String(progress.percent !== undefined ? progress.percent : 18)) + '%"></div></div>' +
                    '<div class="running-card-note">' + esc(progress.note) + '</div>'
                  : '')
              );
          return '<article class="running-card size-' + esc(size) + (size === "tiny" ? ' fixed-tiny' : '') + (options.compact ? ' compact-card' : '') + runningClass + codexClass + pinnedClass + attachedClass + phaseClass + dropClass + '" data-running-card="' + esc(thread.id) + '" data-grid-col="' + esc(String((placement && placement.col) || 1)) + '" data-grid-row="' + esc(String((placement && placement.row) || 1)) + '" draggable="' + esc(draggable) + '"' + cardStyle + '>' +
            '<div class="running-card-topbar"></div>' +
            '<div class="running-card-bottom-line"></div>' +
            '<div class="drop-slot left"></div>' +
            '<div class="drop-slot right"></div>' +
            (!options.compact ? '<div class="resize-handle nw" data-resize-card="' + esc(thread.id) + '" data-resize-corner="nw"></div><div class="resize-handle ne" data-resize-card="' + esc(thread.id) + '" data-resize-corner="ne"></div><div class="resize-handle sw" data-resize-card="' + esc(thread.id) + '" data-resize-corner="sw"></div><div class="resize-handle se" data-resize-card="' + esc(thread.id) + '" data-resize-corner="se"></div><div class="resize-handle e" data-resize-card="' + esc(thread.id) + '" data-resize-corner="e"></div><div class="resize-handle w" data-resize-card="' + esc(thread.id) + '" data-resize-corner="w"></div><div class="resize-handle n" data-resize-card="' + esc(thread.id) + '" data-resize-corner="n"></div><div class="resize-handle s" data-resize-card="' + esc(thread.id) + '" data-resize-corner="s"></div>' : '') +
            compactTitlebar +
            boardCardTopActions +
            '<div class="running-card-top">' +
              '<div class="running-card-control">' +
                '<div class="control-label left">Status</div>' +
                '<div class="running-card-badges" data-running-status-badges="' + esc(thread.id) + '">' +
                  statusBadge(status) +
                  boardBadge(thread) +
                  renderBoardTabPill(thread) +
                  renderLoopManagedBadge(thread.id) +
                  '<span data-running-pending-badge="' + esc(thread.id) + '">' + renderPendingPromptBadge(thread.id) + '</span>' +
                  linkBadge +
                  (size === "tiny" || options.compact ? renderCopyableThreadId(thread.id, { maxLength: 10 }) : '') +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="running-card-body">' +
              bodyInner +
              ((isTiny || isCompactTiny) && isQuickComposerOpen
                ? '<div class="tiny-composer">' +
                    '<div class="tiny-composer-row">' +
                      '<input class="loop-input" data-compose-prompt-input="' + esc(thread.id) + '" value="' + esc(quickPrompt) + '" placeholder="Prompt" />' +
                      '<button class="chip" data-send-thread-prompt="' + esc(thread.id) + '" type="button">Send</button>' +
                      '<button class="chip" data-close-composer="' + esc(thread.id) + '" type="button">×</button>' +
                    '</div>' +
                  '</div>'
                : '') +
              '<span data-running-loop-meta="' + esc(thread.id) + '">' + renderRunningAutoLoopMeta(autoLoop) + '</span>' +
              '<span data-running-pending-meta="' + esc(thread.id) + '">' + renderPendingPromptMeta(thread.id) + '</span>' +
              ((!options.compact && !isTiny && !isCompactTiny) ? renderMemoryShortcutRow() : '') +
              (isLoopPanelOpen
                ? '<div class="loop-panel">' +
                    '<div class="phase-head"><span class="phase-label">Auto loop</span><span class="meta-pill">Resume when stopped</span></div>' +
                    '<div class="loop-presets">' +
                      '<button class="chip" data-loop-preset="10" type="button">10</button>' +
                      '<button class="chip" data-loop-preset="50" type="button">50</button>' +
                      '<button class="chip" data-loop-preset="100" type="button">100</button>' +
                      '<button class="chip" data-loop-prompt-preset="continue" type="button">continue</button>' +
                      '<button class="chip" data-loop-prompt-preset="go on" type="button">go on</button>' +
                    '</div>' +
                    '<div class="loop-mini-inputs">' +
                      '<input class="loop-input" data-loop-prompt-input="' + esc(thread.id) + '" value="' + esc(state.ui.loopDraftPrompt || "continue") + '" placeholder="Prompt" />' +
                      '<input class="loop-input" data-loop-count-input="' + esc(thread.id) + '" value="' + esc(state.ui.loopDraftCount || "10") + '" placeholder="Count" />' +
                      '<button class="chip" data-loop-apply="' + esc(thread.id) + '" type="button">Apply</button>' +
                    '</div>' +
                    '<div class="loop-presets">' +
                      '<button class="chip" data-loop-close="' + esc(thread.id) + '" type="button">Close</button>' +
                      (autoLoop ? '<button class="chip danger-chip" data-clear-auto-loop="' + esc(thread.id) + '" type="button">Stop current</button>' : '') +
                    '</div>' +
                  '</div>'
                : '') +
            '</div>' +
            '<div class="running-card-footer">' +
              '<div class="running-card-control">' +
                '<div class="control-label left">Actions</div>' +
                '<div class="running-action-rail">' +
                  ((isTiny || isCompactTiny)
                    ? (
                        '<button class="tool-btn' + (isQuickComposerOpen ? ' primary' : '') + '" data-open-composer="' + esc(thread.id) + '" data-current-prompt="' + esc(quickPrompt) + '" type="button">' + renderToolIcon('prompt') + '<span>Prompt</span></button>' +
                        '<button class="tool-btn' + (isLoopManagedThread(thread.id) ? ' primary' : '') + '"' + (isLoopManagedThread(thread.id) ? ' disabled' : ' data-set-loop-managed="' + esc(thread.id) + '"') + ' type="button">' + renderToolIcon('board') + '<span>' + (isLoopManagedThread(thread.id) ? 'Loop Managed' : 'Manage Loop') + '</span></button>'
                      )
                    : (
                        '<button class="tool-btn" data-set-board-tab="' + esc(thread.id) + '" data-current-board-tab="' + esc(boardTabFor(thread.id)) + '" type="button">' + renderToolIcon('board') + '<span>' + esc(boardTabFor(thread.id) ? boardTabFor(thread.id) : '+ Tab') + '</span></button>' +
                        '<button class="tool-btn primary" data-open-codex-editor="' + esc(thread.id) + '" type="button">' + renderToolIcon('open') + '<span>Editor</span></button>' +
                        '<button class="tool-btn' + (isQuickComposerOpen ? ' primary' : '') + '" data-open-composer="' + esc(thread.id) + '" data-current-prompt="' + esc(quickPrompt) + '" type="button">' + renderToolIcon('prompt') + '<span>Prompt</span></button>' +
                        '<button class="tool-btn board' + (isBoardAttached(thread.id) ? ' attached' : '') + '" data-board-attach="' + esc(thread.id) + '" type="button">' + renderToolIcon('board') + '<span>' + (isBoardAttached(thread.id) ? 'Attached' : 'Board') + '</span></button>' +
                        '<button class="tool-btn' + (isLoopManagedThread(thread.id) ? ' primary' : '') + '"' + (isLoopManagedThread(thread.id) ? ' disabled' : ' data-set-loop-managed="' + esc(thread.id) + '"') + ' type="button">' + renderToolIcon('board') + '<span>' + (isLoopManagedThread(thread.id) ? 'Loop Managed' : 'Manage Loop') + '</span></button>' +
                        '<button class="tool-btn' + (autoLoop ? ' primary' : '') + '" data-auto-loop="' + esc(thread.id) + '" data-auto-prompt="' + esc((autoLoop && autoLoop.prompt) || "continue") + '" data-auto-count="' + esc(String((autoLoop && autoLoop.remaining) || 10)) + '" type="button">' + renderToolIcon('codex') + '<span>' + (autoLoop ? ('Loop ' + autoLoop.remaining) : 'Loop') + '</span></button>' +
                        '<button class="tool-btn pin' + (isPinned(thread.id) ? ' pinned' : '') + '" data-pin-thread="' + esc(thread.id) + '" type="button">' + renderToolIcon('pin', isPinned(thread.id)) + '<span>' + (isPinned(thread.id) ? 'Pinned' : 'Pin') + '</span></button>' +
                        (autoLoop ? '<button class="tool-btn" data-clear-auto-loop="' + esc(thread.id) + '" type="button">Stop Loop</button>' : '')
                      )) +
                '</div>' +
              '</div>' +
              ((isTiny || isCompactTiny) ? '' : (
                '<div class="running-card-control">' +
                  '<div class="control-label">Thread Id</div>' +
                  renderCopyableThreadId(thread.id, { prefix: "", maxLength: 24, className: "tool-id" }) +
                '</div>'
              )) +
            '</div>' +
          '</article>';
        }).join("") || renderCuteEmpty("Board is empty", "Attach threads from the explorer below, or wait for a running agent to appear automatically.", MEDIA.board);
      }

      function renderDetail(payload) {
        const detail = payload && payload.detail;
        const dashboard = (payload && payload.dashboard) || { threads: [] };
        const drawer = document.getElementById("threadDrawer");
        const backdrop = document.getElementById("drawerBackdrop");
        const title = document.getElementById("drawerTitle");
        const meta = document.getElementById("drawerMeta");
        const summaryNode = document.getElementById("drawerSummary");
        const actionsNode = document.getElementById("drawerActions");
        const body = document.getElementById("drawerBody");
        const actionNotice = payload && payload.actionNotice;
        if (!(drawer && backdrop && title && meta && summaryNode && actionsNode && body)) return;

        if (!state.ui.drawerOpen || !detail || !detail.thread) {
          clearPendingDrawerAction();
          drawer.classList.remove("open");
          backdrop.classList.remove("open");
          title.textContent = "Thread detail";
          meta.innerHTML = "";
          summaryNode.innerHTML = "";
          actionsNode.innerHTML = "";
          body.innerHTML = '<div class="drawer-section"><div class="empty">Select a thread to inspect details.</div></div>';
          return;
        }

        const thread = detail.thread || {};
        const summary = (dashboard.threads || []).find((item) => item.id === thread.id) || {};
        const logs = detail.logs || [];
        const history = thread.history || [];
        const isArchived = Boolean(thread.archived || summary.archived);
        const isSoftDeleted = Boolean(summary.soft_deleted || thread.soft_deleted);
        const processText = summary.process && summary.process.summary ? summary.process.summary : "No live process";
        const linkMeta = codexLinkMeta(thread.id, payload);
        const linkLabel = linkMeta.isFocused ? "Focused in Codex" : (linkMeta.isSidebar ? "Shown in Codex Sidebar" : (linkMeta.isOpen ? "Open in Codex" : (linkMeta.pending ? "Linking to Codex" : "Not linked")));
        const visibilityLabel = codexVisibilityLabel(Object.assign({}, summary, thread), payload);
        const phase = inferCodexPhase(Object.assign({}, summary, thread));
        const phaseClass = phaseClassFor(phase.label).trim();
        const coordination = effectiveCoordinationTruth(Object.assign({}, summary, thread), payload);
        const pendingDrawerAction = state.ui.pendingDrawerAction && state.ui.pendingDrawerAction.threadId === (thread.id || "")
          ? state.ui.pendingDrawerAction
          : undefined;
        if (state.ui.pendingDrawerAction && !pendingDrawerAction) {
          clearPendingDrawerAction();
        }
        const confirmMeta = pendingDrawerAction ? getDrawerConfirmMeta(pendingDrawerAction.action) : undefined;
        drawer.classList.add("open");
        backdrop.classList.add("open");
        title.textContent = displayThreadTitle(Object.assign({}, summary, thread), "Thread detail");
        meta.innerHTML = [
          statusBadge(summary.status || thread.status || "idle"),
          renderPhaseChip(phase),
          codexLinkBadge(thread.id, payload),
          renderCopyableThreadId(thread.id, { full: true }),
          (thread.model || summary.model) ? '<span class="meta-pill">' + esc(thread.model || summary.model) + '</span>' : '',
          (thread.reasoning_effort || summary.reasoning_effort) ? '<span class="meta-pill">' + esc(thread.reasoning_effort || summary.reasoning_effort) + '</span>' : ''
        ].join("");
        summaryNode.innerHTML = [
          drawerStat("Updated", summary.updated_age || thread.updated_at_iso || "-"),
          drawerStat("Last Log", summary.log_age || (logs[0] && logs[0].age) || "-"),
          drawerStat("Phase", phase.label),
          drawerStat("Coordination", coordination.label + (coordination.explicit ? " · explicit" : "")),
          drawerStat("Next Owner", coordination.targetLabel || "-"),
          drawerStat("Visibility", visibilityLabel),
          drawerStat("Codex Link", linkLabel),
          drawerStat("Process", processText),
          drawerStat("Commands", String(threadCommandCount(Object.assign({}, summary, thread)))),
          drawerStat("Compactions", String(thread.compaction_count || summary.compaction_count || 0))
        ].join("");
        actionsNode.className = "action-rail" + (pendingDrawerAction ? " confirm" + (confirmMeta.tone === "danger" ? " danger" : "") : "");
        actionsNode.innerHTML = pendingDrawerAction
          ? [
              '<span class="batch-intent' + (confirmMeta.tone === "danger" ? ' danger' : '') + '">' + esc(confirmMeta.intentLabel) + '</span>',
              '<span class="batch-preview">' + esc(confirmMeta.summary + " " + short(thread.title || thread.id || "thread", 52)) + '</span>',
              '<span class="batch-spacer"></span>',
              '<button class="action-btn secondary" data-drawer-cancel="true" type="button">Cancel</button>',
              '<button class="action-btn ' + esc(confirmMeta.tone) + '" data-drawer-confirm="' + esc(pendingDrawerAction.action) + '" data-drawer-thread="' + esc(thread.id || "") + '" type="button">' + esc(confirmMeta.confirmLabel) + '</button>'
            ].join("")
          : (
              isSoftDeleted
                ? [
                    renderQuickActionButton("open_editor", "Open in Editor", "secondary", thread.id || "", ""),
                    renderQuickActionButton("sidebar", "Sidebar Codex", "secondary", thread.id || "", ""),
                    renderQuickActionButton("set_handoff", coordination.explicit ? "Edit Handoff Cue" : "Cue Handoff", "secondary", thread.id || "", ""),
                    (coordination.explicit ? renderQuickActionButton("clear_handoff", "Clear Cue", "secondary", thread.id || "", "") : ""),
                    (coordination.targetThreadId ? renderQuickActionButton("focus_handoff_target", "Focus Target", "secondary", coordination.targetThreadId, "") : ""),
                    renderActionButton("restore", "Restore", "secondary", "RS", thread.id || ""),
                    renderActionButton("hard_delete", "Hard Delete", "danger", "HD", thread.id || ""),
                    '<span class="action-status">' + esc(actionNotice || '') + '</span>'
                  ]
                : [
                    renderQuickActionButton("show_in_codex", "Show in Editor", "secondary", thread.id || "", thread.title || ""),
                    renderQuickActionButton("sidebar", "Sidebar Codex", "secondary", thread.id || "", ""),
                    renderQuickActionButton("set_handoff", coordination.explicit ? "Edit Handoff Cue" : "Cue Handoff", "secondary", thread.id || "", ""),
                    (coordination.explicit ? renderQuickActionButton("clear_handoff", "Clear Cue", "secondary", thread.id || "", "") : ""),
                    (coordination.targetThreadId ? renderQuickActionButton("focus_handoff_target", "Focus Target", "secondary", coordination.targetThreadId, "") : ""),
                    renderActionButton(isArchived ? "unarchive" : "archive", isArchived ? "Unarchive" : "Hide from Codex", "secondary", isArchived ? "UA" : "AR", thread.id || ""),
                    renderActionButton("soft_delete", "Soft Delete", "warn", "SD", thread.id || ""),
                    renderActionButton("hard_delete", "Hard Delete", "danger", "HD", thread.id || ""),
                    '<span class="action-status">' + esc(actionNotice || '') + '</span>'
                  ]
            ).join("") + renderMemoryShortcutRow();
        const resumeCommand = (detail.hint_commands && detail.hint_commands.resume) || "";
        const forkCommand = (detail.hint_commands && detail.hint_commands.fork) || "";
        body.innerHTML = [
          '<div class="drawer-section">' +
            renderSectionHeading("Phase", "PH") +
            '<div class="phase-panel ' + esc(phaseClass) + '">' +
              '<div class="phase-head"><span class="phase-title">' + renderThemeVisual(phaseArtFor(phase.label), "phase-art", phase.label, "phase") + '<span class="phase-label">' + esc(phase.label) + '</span></span><span class="meta-pill">' + esc(summary.status || thread.status || "idle") + '</span></div>' +
              '<div class="phase-copy">' + esc(phase.copy) + '</div>' +
            '</div>' +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Overview", "OV") +
            '<div class="kv-grid">' +
              kv("Workspace", thread.cwd || summary.cwd || "-") +
              kv("Created", thread.created_at_iso || "-") +
              kv("Updated", thread.updated_at_iso || "-") +
              kv("Last Log", summary.last_log_iso || (logs[0] && logs[0].ts_iso) || "-") +
              kv("Commands", String(threadCommandCount(Object.assign({}, summary, thread)))) +
              kv("Compactions", String(thread.compaction_count || summary.compaction_count || 0)) +
              kv("Provider", thread.model_provider || summary.model_provider || "-") +
              kv("CLI", thread.cli_version || summary.cli_version || "-") +
              kv("Tokens", String(summary.tokens_used || thread.tokens_used || 0)) +
              kv("Approval", thread.approval_mode || summary.approval_mode || "-") +
            '</div>' +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Coordination", "CO") +
            '<div class="kv-grid">' +
              kv("State", coordination.label + (coordination.explicit ? " (explicit cue)" : "")) +
              kv("Bucket", coordination.bucket || "-") +
              kv("Next Owner", coordination.targetLabel || "-") +
              kv("Source", coordination.source || "-") +
            '</div>' +
            '<div class="sub">' + esc(coordination.reason || "No explicit handoff note available.") + '</div>' +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Commands", "CM") +
            '<div class="cmd-grid">' +
              renderCommandCard("Resume in Terminal", resumeCommand, "Resume", thread.id || "") +
              renderCommandCard("Fork in Terminal", forkCommand, "Fork", thread.id || "") +
            '</div>' +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Thread Insight", "TI") +
            renderThreadInsightPanel(thread.id || "", detail.threadInsight) +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Working Memory", "WM") +
            renderMemoryShellGrid(payload) +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Recent Logs", "LG") +
            (logs.length
              ? logs.slice(0, 12).map((log) =>
                  '<div class="drawer-log"><div class="chat-head"><span>' + esc(log.level || "INFO") + '</span><span>' + esc(log.ts_iso || "") + '</span></div><div class="kv-value">' + esc(log.message || "") + '</div></div>'
                ).join("")
              : '<div class="empty">No logs available.</div>') +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Conversation", "CV") +
            (history.length
              ? history.slice(0, 16).map((item) =>
                  '<div class="chat ' + esc(item.role || "assistant") + '"><div class="chat-head"><span>' + esc(item.role || "assistant") + '</span><span>' + esc(item.ts || "") + '</span></div><div>' + esc(item.text || "") + '</div></div>'
                ).join("")
              : '<div class="empty">No conversation history available.</div>') +
          '</div>'
        ].join("");
        document.querySelectorAll("[data-lifecycle-action]").forEach((node) => {
          node.addEventListener("click", () => {
            const action = node.dataset.lifecycleAction;
            const threadId = node.dataset.lifecycleThread;
            if (action === "hard_delete" || action === "soft_delete") {
              setPendingDrawerAction(threadId, action);
              render(state.payload);
              return;
            }
            vscode.postMessage({ type: "lifecycle", action, threadId });
          });
        });
        document.querySelectorAll("[data-quick-action]").forEach((node) => {
          node.addEventListener("click", () => {
            const action = node.dataset.quickAction;
            const threadId = node.dataset.quickThread;
            if (action === "open_editor") {
              markCodexLinking(threadId, "editor");
              render(state.payload);
              vscode.postMessage({ type: "openInCodexEditor", threadId });
              return;
            }
            if (action === "set_handoff") {
              upsertHandoffCue(threadId);
              return;
            }
            if (action === "clear_handoff") {
              clearHandoffCue(thread.id || "");
              return;
            }
            if (action === "focus_handoff_target") {
              setSelectedThread(threadId, { openDrawer: true });
              vscode.postMessage({ type: "selectThread", threadId });
              return;
            }
            if (action === "show_in_codex") {
              markCodexLinking(threadId, "editor");
              render(state.payload);
              vscode.postMessage({
                type: "showThreadInCodex",
                threadId,
                preferredTitle: node.dataset.quickTitle || "",
              });
              return;
            }
            if (action === "sidebar") {
              markCodexLinking(threadId, "sidebar");
              render(state.payload);
              vscode.postMessage({ type: "revealInCodexSidebar", threadId });
            }
          });
        });
        document.querySelectorAll("[data-drawer-cancel]").forEach((node) => {
          node.addEventListener("click", () => {
            clearPendingDrawerAction();
            render(state.payload);
          });
        });
        document.querySelectorAll("[data-drawer-confirm]").forEach((node) => {
          node.addEventListener("click", () => {
            const action = node.dataset.drawerConfirm;
            const threadId = node.dataset.drawerThread;
            clearPendingDrawerAction();
            render(state.payload);
            vscode.postMessage({ type: "lifecycle", action, threadId });
          });
        });
        document.querySelectorAll("[data-run-command]").forEach((node) => {
          node.addEventListener("click", () => {
            if (node.disabled) return;
            setCommandFeedback(node.dataset.commandThread, node.dataset.commandLabel || "Command", "Sent to terminal", "success");
            render(state.payload);
            vscode.postMessage({
              type: "runCommand",
              command: node.dataset.runCommand,
              label: node.dataset.commandLabel || "Command"
            });
          });
        });
        document.querySelectorAll("[data-copy-command]").forEach((node) => {
          node.addEventListener("click", () => {
            if (node.disabled) return;
            setCommandFeedback(node.dataset.commandThread, node.dataset.commandLabel || "Command", "Copied", "success");
            render(state.payload);
            vscode.postMessage({
              type: "copyText",
              text: node.dataset.copyCommand,
              label: node.dataset.commandLabel || "Command"
            });
          });
        });
        document.querySelectorAll("[data-generate-thread-advice]").forEach((node) => {
          node.addEventListener("click", () => {
            const threadId = node.dataset.generateThreadAdvice;
            if (!threadId || node.disabled) return;
            vscode.postMessage({
              type: "generateThreadVibeAdvice",
              threadId,
              force: true,
            });
          });
        });
      }

      function kv(label, value) {
        return '<div class="kv"><div class="kv-label">' + esc(label) + '</div><div class="kv-value">' + esc(value || "-") + '</div></div>';
      }

      function drawerStat(label, value) {
        return '<div class="drawer-stat"><div class="drawer-stat-label">' + esc(label) + '</div><div class="drawer-stat-value">' + esc(value || "-") + '</div></div>';
      }

      function renderIconBadge(code, tone = "default") {
        return '<span class="icon-badge' + (tone !== "default" ? ' ' + esc(tone) : '') + '">' + esc(code) + '</span>';
      }

      function commandFeedbackKey(threadId, commandLabel) {
        return (threadId || "thread") + ":" + (commandLabel || "command");
      }

      function setCommandFeedback(threadId, commandLabel, message, tone = "default") {
        state.ui.commandFeedback[commandFeedbackKey(threadId, commandLabel)] = { message, tone };
      }

      function renderSectionHeading(label, code) {
        return '<h4><span class="section-heading">' + renderIconBadge(code) + '<span>' + esc(label) + '</span></span></h4>';
      }

      function renderActionButton(action, label, tone, code, threadId) {
        const badgeTone = tone === "warn" || tone === "danger" ? tone : "default";
        return '<button class="action-btn ' + esc(tone) + ' with-icon" data-lifecycle-action="' + esc(action) + '" data-lifecycle-thread="' + esc(threadId) + '" type="button">' +
          renderIconBadge(code, badgeTone) +
          '<span>' + esc(label) + '</span>' +
        '</button>';
      }

      function renderQuickActionButton(action, label, tone, threadId, currentTitle) {
        return '<button class="action-btn ' + esc(tone) + '" data-quick-action="' + esc(action) + '" data-quick-thread="' + esc(threadId) + '" data-quick-title="' + esc(currentTitle || "") + '" type="button">' + esc(label) + '</button>';
      }

      function normalizeHintCommand(command) {
        if (!command) return "";
        return String(command)
          .replace(/\bcodex\s+resume\s+--id\s+/g, "codex resume ")
          .replace(/\bcodex\s+fork\s+--id\s+/g, "codex fork ")
          .replace(/\bcodex\s+resume\s+--id=/g, "codex resume ")
          .replace(/\bcodex\s+fork\s+--id=/g, "codex fork ")
          .trim();
      }

      function renderCommandCard(label, command, commandLabel, threadId) {
        const normalizedCommand = normalizeHintCommand(command);
        const available = Boolean(normalizedCommand);
        const feedback = state.ui.commandFeedback[commandFeedbackKey(threadId, commandLabel)];
        return '<div class="cmd-card' + (available ? '' : ' unavailable') + '">' +
          '<div class="cmd-head"><span class="cmd-headline">' + renderIconBadge(commandLabel === "Resume" ? "RS" : "FK") + '<span class="cmd-name">' + esc(label) + '</span></span><span class="meta-pill mono">' + esc(commandLabel) + '</span></div>' +
          '<div class="cmd-subhead"><span class="cmd-hint">' + esc(available ? 'Ready for terminal or clipboard' : 'Unavailable for this thread') + '</span>' +
            (feedback ? '<span class="cmd-feedback' + (feedback.tone === "success" ? ' success' : '') + '">' + esc(feedback.message) + '</span>' : '') +
          '</div>' +
          '<div class="code-line' + (available ? '' : ' empty') + '">' + esc(normalizedCommand || "No command available.") + '</div>' +
          '<div class="cmd-actions">' +
            '<button class="action-btn secondary" data-run-command="' + esc(normalizedCommand || "") + '" data-command-label="' + esc(commandLabel) + '" data-command-thread="' + esc(threadId || "") + '" type="button"' + (available ? '' : ' disabled') + '>Run in Terminal</button>' +
            '<button class="action-btn secondary" data-copy-command="' + esc(normalizedCommand || "") + '" data-command-label="' + esc(commandLabel) + '" data-command-thread="' + esc(threadId || "") + '" type="button"' + (available ? '' : ' disabled') + '>Copy Command</button>' +
          '</div>' +
        '</div>';
      }

      function renderThreadInsightPanel(threadId, insight) {
        const flowSteps = Array.isArray(insight && insight.flowSteps) ? insight.flowSteps : [];
        const advice = Array.isArray(insight && insight.vibeAdvice) ? insight.vibeAdvice : [];
        const stateKey = String((insight && insight.vibeAdviceState) || "idle");
        const stateLabel = stateKey === "loading"
          ? "Generating"
          : stateKey === "ready"
            ? (insight && insight.stale ? "Cached · stale" : "Cached")
            : stateKey === "error"
              ? "Error"
              : "Idle";
        const flowMarkup = flowSteps.length
          ? flowSteps.map((step, index) => (
              '<div class="cmd-card">' +
                '<div class="cmd-head"><span class="cmd-headline">' + renderIconBadge(String(index + 1).padStart(2, "0")) + '<span class="cmd-name">' + esc(step.title || "Flow step") + '</span></span><span class="meta-pill">' + esc(step.kind || "flow") + '</span></div>' +
                '<div class="cmd-hint">' + esc(step.meta || "") + '</div>' +
                '<div class="kv-value">' + esc(step.summary || "") + '</div>' +
              '</div>'
            )).join("")
          : '<div class="empty">Command flow will appear after this thread has user prompts, tool calls, or log events.</div>';
        const adviceMarkup = advice.length
          ? advice.map((item, index) => renderInsightCard("Vibe Advice " + (index + 1), item, stateLabel)).join("")
          : renderInsightCard("Vibe Advice", stateKey === "error" ? ((insight && insight.error) || "Could not generate advice.") : "No cached advice yet. Generate uses a compact thread-only prompt so it avoids oversized context.", stateLabel);
        return '<div class="cmd-grid">' +
          '<div class="cmd-card">' +
            '<div class="cmd-head"><span class="cmd-headline">' + renderIconBadge("VF") + '<span class="cmd-name">Command Flow</span></span><span class="meta-pill">' + esc(String(flowSteps.length)) + ' steps</span></div>' +
            '<div class="cmd-grid">' + flowMarkup + '</div>' +
          '</div>' +
          '<div class="cmd-card">' +
            '<div class="cmd-head"><span class="cmd-headline">' + renderIconBadge("VA") + '<span class="cmd-name">Thread Vibe Advice</span></span><span class="meta-pill">' + esc(stateLabel) + '</span></div>' +
            '<div class="cmd-actions"><button class="action-btn secondary" data-generate-thread-advice="' + esc(threadId || "") + '" type="button"' + (stateKey === "loading" ? " disabled" : "") + '>' + esc(stateKey === "loading" ? "Generating..." : "Generate Vibe Advice") + '</button></div>' +
            '<div class="insight-list insight-list-dense">' + adviceMarkup + '</div>' +
          '</div>' +
        '</div>';
      }

      function render(payload) {
        if (!payload) return;
        stopBootProgressLoop();
        if (state.ui.boardSubView === "insights" || state.ui.boardSubView === "needs-human") state.ui.boardSubView = "coordination";
        if (!["canvas", "coordination", "todo", "play"].includes(state.ui.boardSubView)) state.ui.boardSubView = "canvas";
        if (state.ui.currentView === "inspector") state.ui.currentView = "overview";
        state.payload = payload;
        const service = payload.service || {};
        const dashboard = payload.dashboard || { threads: [], runningThreads: [], threadsMeta: { counts: {} } };
        const freshInsights = dashboard.insights || null;
        if (freshInsights) {
          state.lastInsightsSnapshot = freshInsights;
          state.lastInsightsSource = freshInsights.report_source === "persisted" ? "persisted" : "live";
          state.lastInsightsCapturedAt =
            freshInsights.report_source === "persisted"
              ? (freshInsights.report_persisted_at || payload.lastSuccessfulRefreshAt || Date.now())
              : (payload.lastSuccessfulRefreshAt || Date.now());
          persistUi();
        }
        const insights = freshInsights || state.lastInsightsSnapshot || null;
        const insightsSource = freshInsights
          ? (freshInsights.report_source === "persisted" ? "persisted" : "live")
          : (state.lastInsightsSnapshot ? "session-cache" : "none");
        const persistedFallbackTimestamp = insightsSource === "persisted"
          ? (insights && insights.report_persisted_at)
          : state.lastInsightsCapturedAt;
        const persistedFallbackStale =
          (insightsSource === "persisted" || (insightsSource === "session-cache" && state.lastInsightsSource === "persisted")) &&
          isOlderThanThreshold(persistedFallbackTimestamp, 24 * 60 * 60 * 1000);
        const persistedFallbackStaleSuffix = persistedFallbackStale
          ? " This fallback is older than 24 hours and may be stale."
          : "";
        if (service.ok && state.ui.topicFocus && Array.isArray(dashboard.threads) && dashboard.threads.length) {
          const topicFocusStillValid = dashboard.threads.some((thread) => topicFocusMatches(thread, state.ui.topicFocus));
          if (!topicFocusStillValid) {
            state.ui.topicFocus = null;
            persistUi();
          }
        }
        state.selectedThreadId = payload.selectedThreadId;
        state.currentSurface = payload.currentSurface || "editor";
        document.body.classList.toggle("motion-reduced", motionModeKey() !== "full");
        document.body.classList.toggle("motion-extreme", motionModeKey() === "extreme");
        document.body.classList.remove("theme-mode-pure", "theme-mode-clean", "theme-mode-vivid");
        document.body.classList.add("theme-mode-" + themeMode());

        setNodeText("baseUrl", "Base URL: " + (service.baseUrl || "-"));
        const topbar = document.querySelector(".topbar");
        if (topbar) {
          topbar.classList.remove("mode-expanded", "mode-collapsed", "mode-ultra");
          topbar.classList.add("mode-" + (state.ui.headerMode || "expanded"));
        }
        setNodeText("surfaceLabel", "Position: " + ({
          left: "Left",
          bottom: "Bottom",
          editor: "Editor",
          fullscreen: "Fullscreen"
        }[state.currentSurface] || "Editor"));
        setNodeText("surfaceMenuLabel", ({
          left: "Left",
          bottom: "Bottom",
          editor: "Editor",
          fullscreen: "Fullscreen"
        }[state.currentSurface] || "Editor"));
        setNodeHtml("serviceMeta",
          '<span class="health-dot ' + (service.ok ? 'ok' : 'bad') + '"></span>' +
          esc(!service.ok ? "Unhealth" : "Health") +
          ' · ' +
          esc(!service.ok ? "Degraded" : (service.autoStarted ? "Auto-started" : "Connected")) +
          ' · Last refresh: ' +
          esc(formatTimestamp(payload.lastSuccessfulRefreshAt)));
        const threadCount = (dashboard.threads || []).length;
        const effectiveRunningThreads = (dashboard.runningThreads || []).filter((thread) => effectiveThreadStatus(thread, payload) === "running");
        const runningCount = effectiveRunningThreads.length;
        const boardThreads = getBoardThreads(dashboard, payload);
        const filteredBoardThreads = boardThreadsForActiveTab(boardThreads);
        const existingIds = new Set((dashboard.threads || []).map((thread) => thread.id));
        const coordinationThreads = filteredBoardThreads.filter((thread) => {
          const key = effectiveCoordinationTruth(thread).key;
          return key === "owner" || key === "handoff";
        });
        const handoffThreads = coordinationThreads.filter((thread) => effectiveCoordinationTruth(thread).key === "handoff");
        const runningQueueThreads = effectiveRunningThreads;
        const loopThreads = (dashboard.threads || []).filter((thread) => isLoopQueueThread(thread));
        state.lastInterventionCount = handoffThreads.length;
        const attachedOnlyCount = filteredBoardThreads.filter((thread) => ["attached", "linked"].includes(thread.board_source || "") && effectiveThreadStatus(thread, payload) !== "running").length;
        const serviceBanner = document.getElementById("serviceBanner");
        const restartButton = document.getElementById("restartServerLink");
        const lastWebviewAction = payload.lastWebviewAction || null;
        const lastWebviewActionSummary = lastWebviewAction && lastWebviewAction.type
          ? (" Last webview action: " + lastWebviewAction.type + (lastWebviewAction.receivedAt ? (" @ " + formatTimestamp(lastWebviewAction.receivedAt)) : "") + ".")
          : "";
        const debugStatusSummary = state.debugStatus
          ? (" Debug: " + state.debugStatus + ".")
          : "";
        const bridgeBoundSummary = state.bridgeBoundAt
          ? (" Last bridge bind: " + formatTimestamp(state.bridgeBoundAt) + ".")
          : "";
        setNodeText("heroSummary",
          !service.ok
            ? "Local service unavailable. The panel is in degraded mode until the server recovers."
            : threadCount
              ? (threadCount + " threads loaded" + (runningCount ? " · " + runningCount + " running" : ""))
              : "Connected to the local service, but no threads were returned yet.");
        setNodeHtml("boardTabRailPrimary", renderBoardTabRail(boardThreads));
        setNodeHtml("boardTodoPrimary", renderBoardTodoPane(boardThreads));
        setNodeHtml("boardPlayPrimary", renderBoardPlayPane(filteredBoardThreads));
        if (serviceBanner) {
          serviceBanner.className = "service-banner" + (service.ok ? "" : " visible");
          serviceBanner.innerHTML = service.ok
            ? ""
            : (
                'Degraded state: ' + esc(service.message || "Server not reachable") + '.' +
                esc(debugStatusSummary) +
                esc(bridgeBoundSummary) +
                esc(lastWebviewActionSummary) +
                ' Use Restart 8787 to retry loading thread data.' +
                (service.logPath ? (' <button class="chip" data-open-log="' + esc(service.logPath) + '" type="button">Open Service Log</button>') : '')
              );
        }
        if (restartButton) {
          restartButton.hidden = service.ok;
          restartButton.disabled = service.ok;
        }

        document.querySelectorAll("[data-surface-action]").forEach((node) => {
          node.classList.toggle("active", node.dataset.surfaceAction === state.currentSurface);
        });
        document.querySelectorAll("[data-view]").forEach((node) => {
          node.classList.toggle("active", node.dataset.view === state.ui.currentView);
        });
        document.querySelectorAll("[data-workspace-pane]").forEach((node) => {
          node.classList.toggle("active", node.dataset.workspacePane === state.ui.currentView);
        });
        const overviewBrandFooter = byId("overviewBrandFooter");
        if (overviewBrandFooter) {
          overviewBrandFooter.hidden = state.ui.currentView !== "overview";
        }
        document.querySelectorAll("[data-board-subview]").forEach((node) => {
          node.classList.toggle("active", node.dataset.boardSubview === state.ui.boardSubView);
        });
        document.querySelectorAll("[data-board-pane]").forEach((node) => {
          node.classList.toggle("active", node.dataset.boardPane === state.ui.boardSubView);
        });
        setNodeActive("soundToggle", state.ui.soundEnabled);
        setNodeText("soundToggle", state.ui.soundEnabled ? ("Alert: " + soundStyleMeta().label) : "Alert: Off");
        setNodeActive("themeToggle", true);
        setNodeText("themeToggle", "Theme: " + ({
          pure: "Pure",
          clean: "Clean",
          vivid: "Vivid"
        }[themeMode()] || "Vivid"));
        setNodeActive("motionToggle", motionModeKey() !== "quiet");
        setNodeText("motionToggle", "Motion: " + ({
          full: "Full",
          quiet: "Quiet",
          extreme: "Extreme"
        }[motionModeKey()] || "Quiet"));
        setNodeText("startServerLink", "Start Server");
        setNodeText("restartServerLink", "Restart Server");

        setInputValue("threadSearch", state.ui.search);
        setInputValue("threadSearchMirror", state.ui.search);
        document.querySelectorAll("[data-filter]").forEach((node) => {
          node.classList.toggle("active", node.dataset.filter === state.ui.filter);
        });
        document.querySelectorAll("[data-filter-mirror]").forEach((node) => {
          node.classList.toggle("active", node.dataset.filterMirror === state.ui.filter);
        });
        document.querySelectorAll("[data-sort]").forEach((node) => {
          node.classList.toggle("active", node.dataset.sort === state.ui.sort);
        });
        document.querySelectorAll("[data-sort-mirror]").forEach((node) => {
          node.classList.toggle("active", node.dataset.sortMirror === state.ui.sort);
        });
        document.querySelectorAll("[data-toggle='pinned']").forEach((node) => {
          node.classList.toggle("active", state.ui.pinnedOnly);
        });
        document.querySelectorAll("[data-toggle-mirror='pinned']").forEach((node) => {
          node.classList.toggle("active", state.ui.pinnedOnly);
        });
        setNodeText("toggleThreadGroupsMirror", areMostThreadGroupsExpanded() ? "Collapse Groups" : "Expand Groups");

        setNodeHtml("statusLine",
          '<span class="' + (service.ok ? 'service-ok' : 'service-bad') + '">' +
          esc(service.ok ? (service.autoStarted ? 'Connected · auto-started' : 'Connected') : 'Disconnected') +
          "</span>" +
          " · " + esc(service.message || "") +
          " · debug: " + esc(state.debugStatus || "booting") +
          (service.logPath ? " · log: " + esc(service.logPath) : ""));

        const counts = (dashboard.threadsMeta && dashboard.threadsMeta.counts) || {};
        const loopDaemon = payload.loopDaemon || { available: false, running: false, label: "Unavailable", detail: "No codex-loop daemon state yet." };
        const recentCompletions = Array.isArray(payload.recentCompletions) ? payload.recentCompletions : [];
        const freshCompletions = recentCompletions.filter((item) => item && item.id && !state.seenCompletionIds[item.id]);
        if (freshCompletions.length) {
          freshCompletions.forEach((item) => {
            state.seenCompletionIds[item.id] = true;
          });
          persistUi();
          playCompletionTone();
        }
        const filteredThreads = (dashboard.threads || []).filter(threadMatches);
        reconcilePendingLoopActions(payload.loopDaemons || []);
        Object.keys(state.ui.selected).forEach((id) => {
          if (!existingIds.has(id)) delete state.ui.selected[id];
        });
        pruneRunningCardState(boardThreads);
        syncFocusedCodexGroup(payload);
        const groups = buildGroups(filteredThreads);
        const visibleCount = filteredThreads.length;
        const selectedIds = filteredThreads.filter((thread) => isSelected(thread.id)).map((thread) => thread.id);
        const pendingBatch = state.ui.pendingBatch && sameIdSet(state.ui.pendingBatch.threadIds, selectedIds)
          ? state.ui.pendingBatch
          : undefined;
        if (state.ui.pendingBatch && !pendingBatch) {
          clearPendingBatch();
        }

        const pinnedThreads = filteredThreads.filter((thread) => isPinned(thread.id)).slice(0, 3);
        const topicFocus = state.ui.topicFocus;
        const freshestThread = filteredThreads[0];
        const loopDigest = loopDaemonSummary(loopDaemon, payload);
        setNodeHtml("loopDaemonPage", renderLoopDaemonDashboard(payload.loopDaemons || [], loopDaemon, payload.loopSupport || {}));
        setNodeHtml("overviewDigest", [
          renderSummaryCard(
            "Threads",
            String(visibleCount),
            freshestThread
              ? ("Latest: " + short(freshestThread.title || freshestThread.id || "thread", 44))
              : "No visible thread yet.",
            freshestThread ? inferCodexPhase(freshestThread).label : "Waiting",
            freshestThread ? phaseArtFor(inferCodexPhase(freshestThread).label) : MEDIA.rest
          ),
          renderSummaryCard(
            "Board",
            String(boardThreads.length || 0),
            boardThreads.length
              ? ((attachedOnlyCount ? attachedOnlyCount + " attached" : "No attached-only cards") + " · " + runningCount + " live")
              : "No cards on the board yet.",
            "Planning",
            MEDIA.board
          ),
          renderSummaryCard(
            "Live",
            runningCount ? (String(runningCount) + " active") : "Quiet",
            recentCompletions.length
              ? (String(recentCompletions.length) + " recent completion event" + (recentCompletions.length > 1 ? "s" : ""))
              : "No new live events right now.",
            runningCount ? "Tooling" : "Waiting",
            runningCount ? MEDIA.timeline : MEDIA.rest
          ),
          renderSummaryCard(
            "Inspector",
            state.selectedThreadId ? short((((dashboard.threads || []).find((thread) => thread.id === state.selectedThreadId) || {}).title || state.selectedThreadId), 34) : "No focus",
            state.selectedThreadId ? "A selected thread is ready for deeper inspection." : "Pick a thread when you want details here.",
            state.selectedThreadId ? "Inspecting" : "Waiting",
            state.selectedThreadId ? MEDIA.hero : MEDIA.rest
          ),
          renderSummaryCard(
            "Service",
            service.ok ? "Healthy" : "Degraded",
            service.ok
              ? ("Last refresh " + formatTimestamp(payload.lastSuccessfulRefreshAt))
              : (service.message || "Server not reachable."),
            service.ok ? "Tooling" : "Waiting",
            service.ok ? MEDIA.tooling : MEDIA.waiting
          ),
          renderSummaryCard(
            "Loop Daemon",
            loopDigest.value,
            loopDigest.copy,
            loopDigest.phase,
            loopDigest.art
          )
        ].join(""));
        setNodeHtml("usageSummary", insights ? [
          renderSummaryCard(
            "Total Tokens",
            compactTokenCount((insights.summary && insights.summary.total_tokens) || 0),
            "Manual " + compactTokenCount((insights.summary && insights.summary.manual_cli_tokens) || 0) + " · Loop " + compactTokenCount((insights.summary && insights.summary.loop_tokens) || 0) + " · Auto " + compactTokenCount((insights.summary && insights.summary.auto_continue_tokens) || 0),
            ((insights.summary && insights.summary.total_tokens) || 0) ? "Tooling" : "Waiting",
            MEDIA.tooling
          ),
          renderSummaryCard(
            "Last Token Event",
            (insights.summary && insights.summary.last_token_event_at) ? formatFreshnessTimestamp(insights.summary.last_token_event_at) : "Pending",
            (insights.summary && insights.summary.last_token_event_at) || "Click Generate Token Insights after a Codex CLI run.",
            (insights.summary && insights.summary.last_token_event_at) ? "Inspecting" : "Waiting",
            MEDIA.timeline
          ),
          renderSummaryCard(
            "Usage Persona",
            ((insights.guidance && insights.guidance.usage_persona) || ["均衡型"]).join(" · "),
            "基于历史输入的工作风格归纳，更偏使用画像，不做武断的人格结论。",
            "Planning",
            MEDIA.hero
          ),
          renderSummaryCard(
            "Prompt Rhythm",
            String((insights.summary && insights.summary.total_inputs) || 0),
            "平均长度 " + String((insights.summary && insights.summary.avg_prompt_length) || 0) + " · 短提示占比 " + Math.round(Number(((insights.summary && insights.summary.short_prompt_ratio) || 0)) * 100) + "%",
            "Editing",
            MEDIA.timeline
          ),
          renderSummaryCard(
            "Context Pressure",
            String((insights.summary && insights.summary.total_compactions) || 0),
            ((insights.summary && insights.summary.last_compacted_at) || "暂无压缩记录"),
            ((insights.summary && insights.summary.total_compactions) || 0) ? "Tooling" : "Waiting",
            MEDIA.board
          )
        ].join("") : renderCuteEmpty("Usage report unavailable", "The dashboard can still work without the persisted report, but the summary will appear after the insights endpoint responds.", MEDIA.rest));
        setNodeText("usageReportNote",
          insightsSource === "persisted"
            ? ("Showing the persisted local report from " + formatFreshnessTimestamp(insights && insights.report_persisted_at) + " while the live insights endpoint is unavailable." + persistedFallbackStaleSuffix)
            : insightsSource === "session-cache"
              ? ("Showing the last usable report from this session, captured " + formatFreshnessTimestamp(state.lastInsightsCapturedAt) + ", while the current refresh is missing insights data." + persistedFallbackStaleSuffix)
              : "A persisted local reading of your thread habits, pacing, and workflow style.");
        setNodeHtml("usageActions", '<button class="chip" data-generate-usage-insights="true" type="button">Generate Token Insights</button><span class="sub">Pure local rebuild: rescans known CLI logs and redraws token charts without a model call.</span>');
        setNodeHtml("tokenTrend", renderTokenTrend(insights, dashboard.threads || []));
        setNodeHtml("tokenThreadRanking", renderTokenThreadRanking(insights, dashboard.threads || []));
        setNodeHtml("usageKeywords", insights && Array.isArray(insights.keywords) && insights.keywords.length
          ? insights.keywords.slice(0, 8).map((item) => renderKeywordChip(item)).join("")
          : '<span class="sub">暂无高频关键词</span>');
        setNodeText("vibeAdviceNote", renderVibeAdviceEvidence(insights));
        setNodeHtml("vibeAdvice", insights && insights.guidance && Array.isArray(insights.guidance.vibe_coding_suggestions)
          ? insights.guidance.vibe_coding_suggestions.map((item, index) => renderInsightCard("Advice " + (index + 1), item, "Vibe Coding")).join("")
          : renderInsightCard("Advice", "还没有生成个性化建议，等本地报告生成后这里会显示。", "Pending"));
        setNodeHtml("analysisViews", insights && Array.isArray(insights.analysis_views)
          ? insights.analysis_views.slice(0, 4).map((item) => renderInsightCard(item.title || "Analysis", item.description || "", item.signal || "")).join("")
          : "");
        setNodeHtml("interactionHeatmap", renderInteractionHeatmap(insights));
        setNodeText("interactionHeatmapNote",
          insights && insights.interaction_heatmap && insights.interaction_heatmap.basis
            ? insights.interaction_heatmap.basis
            : "Only direct user inputs count here, so daemon runtime will not inflate the vibing signal.");
        setNodeHtml("weeklyShift", renderWeeklyShift(insights));
        setNodeHtml("wordCloud", renderWordCloud(insights && insights.word_cloud, insights));
        setNodeHtml("topicMap", renderTopicMap(insights && insights.topic_map, topicFocus, insights));
        const completionRailMarkup = recentCompletions.map((item) => {
          return '<div class="completion-card">' +
            '<div class="completion-head">' +
              '<span class="badge badge-running">Completed</span>' +
              '<span class="completion-meta">' + esc(item.updatedAt || "") + '</span>' +
            '</div>' +
            '<div class="completion-title">' + esc(short(item.title || item.threadId || "Thread complete", 68)) + '</div>' +
            '<div class="completion-meta">' + esc(item.status || "recent") + ' · click the thread list to inspect details</div>' +
          '</div>';
        }).join("");
        setNodeClassName("completionRail", "completion-rail" + (recentCompletions.length ? " visible" : ""));
        setNodeHtml("completionRail", completionRailMarkup);
        setNodeText("runningSummary",
          effectiveRunningThreads.length
            ? (effectiveRunningThreads.length + " active thread" + (effectiveRunningThreads.length > 1 ? "s" : ""))
            : "No live agents currently running.");
        setNodeText("runningSummaryMirror", (byId("runningSummary") && byId("runningSummary").textContent) || "");
        const boardSizeGuide = "Size guide: S progress, M preview, L full detail.";
        const boardMetaText = boardThreads.length
          ? ("Dedicated board · " + boardThreads.length + " card" + (boardThreads.length > 1 ? "s" : "") + " · " + runningCount + " running · " + attachedOnlyCount + " attached · " + handoffThreads.length + " handoff" + (handoffThreads.length === 1 ? "" : "s") + (state.ui.layoutLocked ? " · layout locked" : "") + " · " + boardSizeGuide)
          : ("No cards yet. Attach threads from the explorer, or wait for a running agent to appear automatically. " + boardSizeGuide);
        setNodeText("runningBoardMeta", boardMetaText);
        setNodeText("runningBoardMetaPrimary", boardMetaText);
        setNodeActive("toggleLayoutLockPrimary", state.ui.layoutLocked);
        setNodeText("toggleLayoutLockPrimary", state.ui.layoutLocked ? "Unlock Layout" : "Lock Layout");
        const boardSummaryHeadline = boardThreads.length
          ? (boardThreads.length + " cards live on the dedicated board")
          : "No cards on the board yet.";
        const boardSummaryStatsMarkup = [
          drawerStat("Cards", String(boardThreads.length || 0)),
          drawerStat("Running", String(runningCount || 0)),
          drawerStat("Attached", String(attachedOnlyCount || 0)),
          drawerStat("Handoffs", String(handoffThreads.length || 0)),
          drawerStat("Layout", state.ui.layoutLocked ? "Locked" : "Editable")
        ].join("");
        setNodeText("boardSummaryHeadline", boardSummaryHeadline);
        setNodeText("boardPageSummaryHeadline", boardSummaryHeadline);
        setNodeHtml("boardSummaryStats", boardSummaryStatsMarkup);
        setNodeHtml("boardPageSummaryStats", boardSummaryStatsMarkup);
        const tabSummary = tabManagementSummary(dashboard.threads || []);
        setNodeText("tabManagementHeadline", tabSummary.tabs.length
          ? (tabSummary.tabs.length + " tab group" + (tabSummary.tabs.length === 1 ? "" : "s") + " · " + tabSummary.assigned + " assigned threads")
          : "Create a tab group, then assign selected threads to it.");
        setNodeHtml("tabManagementStats", renderTabManagementStats(dashboard.threads || []));
        setNodeHtml("tabManagementList", renderTabManagementList(dashboard.threads || []));
        setNodeText("boardSummaryNeedsHuman", handoffThreads.length
          ? (handoffThreads.length + " handoff signal" + (handoffThreads.length > 1 ? "s need" : " needs") + " attention.")
          : (runningQueueThreads.length || loopThreads.length
            ? (runningQueueThreads.length + " global running · " + loopThreads.length + " loop-managed")
            : "No coordination signals active on this board tab."));
        setNodeHtml("boardSummaryQueue", [
          renderCoordinationQueueSection("Running", runningQueueThreads, "running", "No running threads globally."),
          renderCoordinationQueueSection("Handoff", handoffThreads, "handoff", "No handoff signals right now."),
          renderCoordinationQueueSection("Loop", loopThreads, "loop", "No loop-managed threads right now."),
        ].join(""));
        const threadSummaryMarkup = renderThreadSummaryMarkup(visibleCount, (dashboard.threads || []).length, topicFocus, state.ui.sort, state.ui.rootFilter, state.ui.workspaceFilter);
        const threadCountSummaryMarkup = renderThreadCountSummaryStats(dashboard.threads || [], filteredThreads, payload);
        setNodeHtml("threadCountSummaryStats", threadCountSummaryMarkup);
        setNodeHtml("threadPageSummaryStats", threadCountSummaryMarkup);
        setNodeHtml("threadSummary", threadSummaryMarkup);
        setNodeHtml("threadSummaryMirror", threadSummaryMarkup);
        setNodeHtml("threadTabFilterControl", renderThreadTabFilterControl());
        scrollPendingThreadIntoView();
        const pendingMeta = pendingBatch ? getBatchActionMeta(pendingBatch.action) : undefined;
        const batchToneClass = pendingMeta && pendingMeta.tone === "danger" ? " danger" : "";
        const batchBarClassName = "batch-bar" + (filteredThreads.length ? " visible" : "") + (pendingBatch ? " confirm" + batchToneClass : "");
        const batchMarkup = selectedIds.length
          ? (pendingBatch
            ? [
                '<span class="batch-count">' + esc(String(selectedIds.length)) + ' selected</span>',
                '<span class="batch-intent' + (pendingMeta.tone === "danger" ? ' danger' : '') + '">' + esc(pendingMeta.intentLabel || pendingMeta.label) + '</span>',
                '<span class="batch-preview">' + esc((pendingMeta.summary || "") + ' ' + summarizeThreadSelection(filteredThreads, selectedIds)).trim() + '</span>',
                '<span class="batch-spacer"></span>',
                '<button class="chip" data-batch-cancel="true" type="button">Cancel</button>',
                '<button class="chip ' + esc((pendingMeta.tone === "danger" ? "danger-chip" : "warn-chip")) + '" data-batch-confirm="true" type="button">' + esc(pendingMeta.confirmLabel || pendingMeta.label) + '</button>'
              ].join("")
            : [
                '<span class="batch-count">' + esc(String(selectedIds.length)) + ' selected</span>',
                '<button class="chip" data-batch-select="visible" type="button">Select Visible</button>',
                '<button class="chip" data-batch-clear="true" type="button">Deselect All</button>',
                '<button class="chip" data-batch-action="copy_ids" type="button">Copy IDs</button>',
                '<button class="chip" data-batch-action="attach_board" type="button">Add to Board</button>',
                '<button class="chip" data-batch-action="set_tab" type="button">Set to Tab</button>',
                '<button class="chip" data-batch-action="archive" type="button">Archive</button>',
                '<button class="chip" data-batch-action="unarchive" type="button">Unarchive</button>',
                '<button class="chip warn-chip" data-batch-action="soft_delete" type="button">Soft Delete</button>',
                '<button class="chip" data-batch-action="restore" type="button">Restore</button>',
                '<button class="chip danger-chip" data-batch-action="hard_delete" type="button">Hard Delete</button>',
                '<span class="batch-spacer"></span>',
                '<span class="action-status">' + esc((payload && payload.actionNotice) || '') + '</span>'
              ].join(""))
          : [
          '<button class="chip" data-batch-select="visible" type="button">Select Visible</button>',
          '<span class="action-status">Batch actions appear when threads are selected.</span>'
        ].join("");
        setNodeClassName("batchBar", batchBarClassName);
        setNodeHtml("batchBar", batchMarkup);
        setNodeClassName("batchBarMirror", batchBarClassName);
        setNodeHtml("batchBarMirror", batchMarkup);

        const runningMarkup = effectiveRunningThreads.map((thread) => {
          const progress = extractThreadProgress(thread);
          const linkMeta = codexLinkMeta(thread.id);
          const linkBadge = codexLinkBadge(thread.id);
          const status = effectiveThreadStatus(thread, payload);
          const codexClass = linkMeta.isFocused ? " codex-focused" : (linkMeta.isOpen ? " codex-open" : "");
          return '<div class="running-row' + codexClass + '">' +
            '<div class="row-head">' +
              '<span style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">' + statusBadge(status) + renderEditableCardName(thread, { maxLength: 46 }) + '</span>' +
              '<span style="display:flex; gap:8px; align-items:center;"><button class="mini-action-btn" data-codex-thread="' + esc(thread.id) + '" type="button">Codex</button>' + linkBadge + renderCopyableThreadId(thread.id, { maxLength: 20 }) + '</span>' +
            '</div>' +
            renderInlineCardTitle(thread, "thread-title", 72, "(no title)") +
            '<div class="mini-thread-meta">' + renderRootIdentityPill(thread) + '</div>' +
            '<div class="preview">' + esc(short((thread.process && thread.process.summary) || "no live pid", 120)) + '</div>' +
            '<div class="progress-head"><span class="progress-label">' + esc(progress.label) + '</span><span class="progress-value">' + esc(progress.percent !== undefined ? (String(progress.percent) + "%") : status) + '</span></div>' +
            '<div class="progress-track"><div class="progress-bar" style="width:' + esc(String(progress.percent !== undefined ? progress.percent : 18)) + '%"></div></div>' +
            '<div class="progress-note">' + esc(progress.note) + '</div>' +
          '</div>';
        }).join("") || '<div class="empty">No running agents right now.</div>';
        setNodeHtml("runningList", runningMarkup);
        setNodeHtml("runningListMirror", runningMarkup);
        const runningBoardHtml = renderRunningBoard(filteredBoardThreads);
        const coordinationHtml = renderCoordinationPane(filteredBoardThreads);
        setNodeHtml("runningBoardPrimary", runningBoardHtml);
        setNodeHtml("coordinationPrimary", coordinationHtml);
        syncRunningDropIndicatorDom();
        setNodeHtml("liveTimeline", renderLiveTimeline(effectiveRunningThreads, recentCompletions));

        const threadMarkup = [
          renderGroup("pinned", "Pinned", groups.pinned),
          renderGroup("running", "Running", groups.running),
          renderGroup("needs_human", "Needs Human", groups.needs_human),
          renderGroup("linked", "Linked", groups.linked),
          renderGroup("recent", "Recent", groups.recent),
          renderGroup("idle", "Idle", groups.idle),
          renderGroup("archived", "Archived", groups.archived),
          renderGroup("soft_deleted", "Soft Deleted", groups.soft_deleted)
        ].join("") || '<div class="empty">No threads loaded.</div>';
        setNodeHtml("threadList", threadMarkup);
        setNodeHtml("threadListMirror", threadMarkup);
        scrollFocusedCodexThreadIntoView(payload);

        document.querySelectorAll("[data-thread-id]").forEach((node) => {
          node.addEventListener("click", () => {
            toggleSelected(node.dataset.threadId);
          });
        });
        document.querySelectorAll("[data-open-inspector]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            const threadId = node.dataset.openInspector;
            setSelectedThread(threadId, { openDrawer: true });
            vscode.postMessage({ type: "selectThread", threadId });
          });
        });
        document.querySelectorAll("[data-select-thread]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleSelected(node.dataset.selectThread);
          });
        });
        bindGroupSelectionActions(document);
        document.querySelectorAll("[data-pin-thread]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            togglePin(node.dataset.pinThread);
          });
        });
        document.querySelectorAll("[data-board-attach]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleBoardAttach(node.dataset.boardAttach);
          });
        });
        document.querySelectorAll("[data-auto-loop]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            openLoopPanel(node.dataset.autoLoop, node.dataset.autoPrompt || "continue", node.dataset.autoCount || "10");
          });
        });
        document.querySelectorAll("[data-open-composer]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            openQuickComposer(node.dataset.openComposer, node.dataset.currentPrompt || "continue");
          });
        });
        document.querySelectorAll("[data-close-composer]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            closeQuickComposer(node.dataset.closeComposer);
          });
        });
        document.querySelectorAll("[data-compose-prompt-input]").forEach((node) => {
          node.addEventListener("input", (event) => {
            setQuickComposerDraft(node.dataset.composePromptInput, event.target.value || "");
          });
          node.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" || event.shiftKey) return;
            event.preventDefault();
            event.stopPropagation();
            const threadId = node.dataset.composePromptInput;
            const prompt = state.ui.quickComposerDrafts[threadId] || node.value || "continue";
            queuePromptOptimistically(threadId, prompt);
            render(state.payload);
            vscode.postMessage({
              type: "sendPromptToThread",
              threadId,
              prompt,
            });
            closeQuickComposer(threadId);
          });
        });
        document.querySelectorAll("[data-send-thread-prompt]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            const threadId = node.dataset.sendThreadPrompt;
            const prompt = state.ui.quickComposerDrafts[threadId] || "continue";
            queuePromptOptimistically(threadId, prompt);
            render(state.payload);
            vscode.postMessage({
              type: "sendPromptToThread",
              threadId,
              prompt,
            });
            closeQuickComposer(threadId);
          });
        });
        document.querySelectorAll("[data-open-log]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            vscode.postMessage({
              type: "openLogFile",
              path: node.dataset.openLog || "",
            });
          });
        });
        document.querySelectorAll("[data-set-loop-managed]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            vscode.postMessage({
              type: "setLoopManagedThread",
              threadId: node.dataset.setLoopManaged || "",
            });
          });
        });
        document.querySelectorAll("[data-run-loop-preset]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            vscode.postMessage({
              type: "runLoopIntervalPreset",
              threadId: node.dataset.runLoopPreset || "",
              intervalMinutes: node.dataset.loopInterval || "",
            });
          });
        });
        document.querySelectorAll("[data-run-loop-custom]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            vscode.postMessage({
              type: "promptLoopIntervalPreset",
              threadId: node.dataset.runLoopCustom || "",
            });
          });
        });
        document.querySelectorAll("[data-stop-loop]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            vscode.postMessage({ type: "stopLoopDaemon" });
          });
        });
        document.querySelectorAll("[data-stop-loop-at]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            markPendingLoopAction(node.dataset.stopLoopAt || "", "stop");
            render(state.payload);
            vscode.postMessage({
              type: "stopLoopDaemonAt",
              stateDir: node.dataset.stopLoopAt || "",
            });
          });
        });
        document.querySelectorAll("[data-start-loop]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            vscode.postMessage({ type: "startLoopDaemon" });
          });
        });
        document.querySelectorAll("[data-start-loop-at]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            markPendingLoopAction(node.dataset.startLoopAt || "", "start");
            render(state.payload);
            vscode.postMessage({
              type: "startLoopDaemonAt",
              stateDir: node.dataset.startLoopAt || "",
              workspace: node.dataset.loopWorkspace || "",
              promptFile: node.dataset.loopPromptFile || "",
              threadId: node.dataset.loopThreadId || "",
              intervalMinutes: node.dataset.loopIntervalMinutes || "",
            });
          });
        });
        document.querySelectorAll("[data-restart-loop]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            vscode.postMessage({ type: "restartLoopDaemon" });
          });
        });
        document.querySelectorAll("[data-restart-loop-at]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            markPendingLoopAction(node.dataset.restartLoopAt || "", "restart");
            render(state.payload);
            vscode.postMessage({
              type: "restartLoopDaemonAt",
              stateDir: node.dataset.restartLoopAt || "",
              workspace: node.dataset.loopWorkspace || "",
              promptFile: node.dataset.loopPromptFile || "",
              threadId: node.dataset.loopThreadId || "",
              intervalMinutes: node.dataset.loopIntervalMinutes || "",
            });
          });
        });
        document.querySelectorAll("[data-attach-loop-tmux]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            vscode.postMessage({
              type: "attachLoopTmux",
              sessionName: node.dataset.attachLoopTmux || "",
            });
          });
        });
        document.querySelectorAll("[data-tail-loop-log]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            vscode.postMessage({
              type: "tailLoopLog",
              path: node.dataset.tailLoopLog || "",
            });
          });
        });
        document.querySelectorAll("[data-open-external-url]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            vscode.postMessage({
              type: "openExternalUrl",
              url: node.dataset.openExternalUrl || "",
            });
          });
        });
        document.querySelectorAll("[data-copy-text]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            if (node.disabled) return;
            vscode.postMessage({
              type: "copyText",
              text: node.dataset.copyText || "",
              label: node.dataset.copyLabel || "Copied",
            });
          });
        });
        document.querySelectorAll("[data-create-thread-from-play]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            vscode.postMessage({ type: "createThread" });
          });
        });
        bindCopyThreadIdActions(document);
        document.querySelectorAll("[data-open-repo-file]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            vscode.postMessage({
              type: "openRepoFile",
              path: node.dataset.openRepoFile || "",
            });
          });
        });
        document.querySelectorAll("[data-toggle-intervention]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            state.ui.interventionCollapsed = !state.ui.interventionCollapsed;
            persistUi();
            render(state.payload);
          });
        });
        document.querySelectorAll("[data-clear-auto-loop]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            vscode.postMessage({
              type: "clearAutoContinue",
              threadId: node.dataset.clearAutoLoop,
            });
          });
        });
        document.querySelectorAll("[data-loop-preset]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            setLoopDraftCount(node.dataset.loopPreset || "10");
            render(state.payload);
          });
        });
        document.querySelectorAll("[data-loop-prompt-preset]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            setLoopDraftPrompt(node.dataset.loopPromptPreset || "continue");
            render(state.payload);
          });
        });
        document.querySelectorAll("[data-loop-prompt-input]").forEach((node) => {
          node.addEventListener("input", (event) => {
            setLoopDraftPrompt(event.target.value || "");
          });
        });
        document.querySelectorAll("[data-loop-count-input]").forEach((node) => {
          node.addEventListener("input", (event) => {
            setLoopDraftCount(event.target.value || "");
          });
        });
        document.querySelectorAll("[data-loop-close]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            closeLoopPanel();
          });
        });
        document.querySelectorAll("[data-loop-apply]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            vscode.postMessage({
              type: "setAutoContinue",
              threadId: node.dataset.loopApply,
              prompt: state.ui.loopDraftPrompt,
              count: Number(state.ui.loopDraftCount),
            });
            closeLoopPanel();
          });
        });
        document.querySelectorAll("[data-card-size]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            setRunningCardSize(node.dataset.cardSize, node.dataset.cardSizeValue);
          });
        });
        document.querySelectorAll("[data-resize-card]").forEach((node) => {
          node.addEventListener("pointerdown", (event) => {
            beginRunningCardResize(node.dataset.resizeCard, node.dataset.resizeCorner || "se", event);
          });
        });
        document.querySelectorAll("[data-running-card]").forEach((node) => {
          node.addEventListener("pointerdown", (event) => {
            beginBoardPointerDrag(node.dataset.runningCard, event);
          });
          node.addEventListener("lostpointercapture", (event) => {
            cancelBoardPointerDrag(event);
          });
        });
        document.querySelectorAll("[data-edit-card-name]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            beginInlineCardLabelEdit(node.dataset.editCardName, node);
          });
          node.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            beginInlineCardLabelEdit(node.dataset.editCardName, node);
          });
        });
        document.querySelectorAll("[data-set-board-tab]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            setThreadBoardTab(node.dataset.setBoardTab, node.dataset.currentBoardTab || "");
          });
        });
        document.querySelectorAll("[data-board-tab]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            setActiveBoardTab(node.dataset.boardTab || "all");
          });
        });
        document.querySelectorAll("[data-create-board-tab]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            createBoardTab();
          });
        });
        document.querySelectorAll("[data-clear-thread-tab-filter]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            setActiveBoardTab("all");
          });
        });
        document.querySelectorAll("[data-codex-thread]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            markCodexLinking(node.dataset.codexThread, "sidebar");
            render(state.payload);
            vscode.postMessage({
              type: "revealInCodexSidebar",
              threadId: node.dataset.codexThread,
            });
          });
        });
        document.querySelectorAll("[data-open-codex-editor]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            markCodexLinking(node.dataset.openCodexEditor, "editor");
            render(state.payload);
            vscode.postMessage({
              type: "openInCodexEditor",
              threadId: node.dataset.openCodexEditor,
            });
          });
        });
        document.querySelectorAll("[data-set-handoff]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            upsertHandoffCue(node.dataset.setHandoff);
          });
        });
        document.querySelectorAll("[data-clear-handoff]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            clearHandoffCue(node.dataset.clearHandoff);
          });
        });
        document.querySelectorAll("[data-focus-thread]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            const threadId = node.dataset.focusThread;
            if (!threadId) return;
            setSelectedThread(threadId, { openDrawer: true });
            vscode.postMessage({ type: "selectThread", threadId });
          });
        });
        document.querySelectorAll("[data-group]").forEach((node) => {
          node.addEventListener("toggle", () => {
            state.ui.groups[node.dataset.group] = node.open;
            persistUi();
          });
        });
        document.querySelectorAll("[data-batch-select]").forEach((node) => {
          node.addEventListener("click", () => {
            clearPendingBatch();
            filteredThreads.forEach((thread) => {
              state.ui.selected[thread.id] = true;
            });
            persistUi();
            render(state.payload);
          });
        });
        document.querySelectorAll("[data-batch-clear]").forEach((node) => {
          node.addEventListener("click", () => {
            clearSelection();
          });
        });
        document.querySelectorAll("[data-batch-action]").forEach((node) => {
          node.addEventListener("click", () => {
            const action = node.dataset.batchAction;
            const threadIds = filteredThreads.filter((thread) => isSelected(thread.id)).map((thread) => thread.id);
            if (!threadIds.length) return;
            if (action === "copy_ids") {
              vscode.postMessage({
                type: "copyText",
                text: threadIds.join("\\n"),
                label: "Thread IDs",
              });
              return;
            }
            if (action === "attach_board") {
              attachThreadsToBoard(threadIds);
              return;
            }
            if (action === "set_tab") {
              vscode.postMessage({
                type: "batchSetBoardTab",
                threadIds,
                activeBoardTab: state.ui.activeBoardTab || "all",
                boardTabOrder: state.ui.boardTabOrder || [],
              });
              return;
            }
            const meta = getBatchActionMeta(action);
            if (meta.requiresConfirm) {
              setPendingBatch(action, threadIds);
              render(state.payload);
              return;
            }
            vscode.postMessage({ type: "lifecycleBatch", action, threadIds });
          });
        });
        document.querySelectorAll("[data-batch-cancel]").forEach((node) => {
          node.addEventListener("click", () => {
            clearPendingBatch();
            render(state.payload);
          });
        });
        document.querySelectorAll("[data-batch-confirm]").forEach((node) => {
          node.addEventListener("click", () => {
            if (!state.ui.pendingBatch || !state.ui.pendingBatch.threadIds.length) return;
            const { action, threadIds } = state.ui.pendingBatch;
            clearPendingBatch();
            render(state.payload);
            vscode.postMessage({ type: "lifecycleBatch", action, threadIds });
          });
        });

        const runningThreads = effectiveRunningThreads;
        document.querySelectorAll("[data-subtab]").forEach((node) => {
          node.classList.toggle("active", node.dataset.subtab === state.ui.rightPaneTab);
        });
        document.querySelectorAll("[data-pane]").forEach((node) => {
          node.classList.toggle("active", node.dataset.pane === state.ui.rightPaneTab);
        });
        setNodeHtml("runningTabs", [
          '<button class="tab ' + (state.selectedThreadId ? '' : 'active') + '" data-running-thread="">Overview</button>',
          ...runningThreads.map((thread) => '<button class="tab ' + (state.selectedThreadId === thread.id ? 'active' : '') + '" data-running-thread="' + esc(thread.id) + '">' + esc(short(displayThreadTitle(thread, thread.id), 28)) + '</button>')
        ].join(""));

        document.querySelectorAll("[data-running-thread]").forEach((node) => {
          node.addEventListener("click", () => {
            const threadId = node.dataset.runningThread || undefined;
            vscode.postMessage({ type: "selectThread", threadId });
          });
        });

        const selected = (dashboard.threads || []).find((thread) => thread.id === state.selectedThreadId) || filteredThreads[0] || runningThreads[0] || dashboard.threads[0];
        const terminalLogs = selected ? (selected.preview_logs || []) : [];
        setNodeHtml("terminal", terminalLogs.map((log) => {
          return '<div class="terminal-line"><span class="muted">' + esc(log.ts_iso || "") + '</span> ' +
            '<strong>' + esc(log.level || "INFO") + '</strong> ' +
            esc(log.message || log.target || "log event") + '</div>';
        }).join("") || '<div class="empty-state">No recent log preview available.</div>');

        const detailThread = (payload.detail && payload.detail.thread) || {};
        const history = (detailThread.id && detailThread.id === (selected && selected.id) ? (detailThread.history || []) : []) || (selected ? (selected.history || []) : []);
        setNodeText("historySummary",
          history.length
            ? ("Showing " + history.length + " messages for " + short((selected && selected.title) || detailThread.title || "selected thread", 48))
            : "Select a thread to inspect its chat history.");
        setNodeHtml("chatWindow", history.map((item) => {
          return '<div class="chat ' + esc(item.role || "assistant") + '">' +
            '<div class="chat-head"><span>' + esc(item.role || "assistant") + '</span><span>' + esc(item.ts || "") + '</span></div>' +
            '<div>' + esc(item.text || "") + '</div>' +
          '</div>';
        }).join("") || '<div class="empty-state">Select a thread to inspect its chat history.</div>');
        document.querySelectorAll("[data-open-drawer]").forEach((node) => {
          node.addEventListener("click", () => {
            state.ui.drawerOpen = true;
            persistUi();
            render(state.payload);
          });
        });
        document.querySelectorAll("[data-subtab-shortcut]").forEach((node) => {
          node.addEventListener("click", () => {
            state.ui.rightPaneTab = node.dataset.subtabShortcut;
            state.ui.drawerOpen = true;
            persistUi();
            render(state.payload);
          });
        });

        renderDetail(payload);
      }

      function metric(label, value, phaseLabel = "Waiting", art) {
        const phaseClass = phaseClassFor(phaseLabel).trim();
        return '<div class="metric compact ' + esc(phaseClass) + '">' +
          '<div class="metric-head">' +
            renderThemeVisual(art || phaseArtFor(phaseLabel), "metric-art", phaseLabel, "metric") +
            '<div class="metric-head-copy">' +
              '<div class="metric-label">' + esc(label) + '</div>' +
              renderPhaseChip({ label: phaseLabel }) +
            '</div>' +
          '</div>' +
          '<div class="metric-value">' + esc(String(value)) + '</div>' +
        '</div>';
      }

      function closeChromeMenus(exceptId) {
        ["surfaceMenu", "serviceMenu", "moreMenu"].forEach((id) => {
          if (id === exceptId) return;
          const node = document.getElementById(id);
          if (node) node.open = false;
        });
      }

      function bindChromeDelegation() {
        document.addEventListener("click", (event) => {
          const eventTarget = event.target instanceof Element
            ? event.target
            : (event.target && event.target.parentElement ? event.target.parentElement : null);
          if (!eventTarget) {
            closeChromeMenus();
            return;
          }
          const insideMenu = eventTarget.closest("#surfaceMenu, #serviceMenu, #moreMenu");
          if (!insideMenu) {
            closeChromeMenus();
          } else if (insideMenu.id) {
            closeChromeMenus(insideMenu.id);
          }
          const commandLink = eventTarget.closest('a[data-command-direct="true"]');
          if (commandLink) {
            const menuId = commandLink.dataset.closeChromeMenu;
            if (menuId) {
              const menuNode = document.getElementById(menuId);
              if (menuNode) menuNode.open = false;
            }
            return;
          }
          const target = eventTarget.closest("button, [data-view], [data-subtab], [data-topic-node]");
          if (!target) return;
          if (target.id === "soundToggle") {
            cycleSoundStyle();
            const more = document.getElementById("moreMenu"); if (more) more.open = false;
            return;
          }
          if (target.id === "themeToggle") {
            toggleThemeMode();
            const more = document.getElementById("moreMenu"); if (more) more.open = false;
            return;
          }
          if (target.id === "motionToggle") {
            toggleMotion();
            const more = document.getElementById("moreMenu"); if (more) more.open = false;
            return;
          }
          if (target.dataset.brandCycle) {
            cycleBrandFooterStyle();
            return;
          }
          if (target.dataset.generateUsageInsights) {
            vscode.postMessage({ type: "generateUsageInsights" });
            return;
          }
          if (target.dataset.surfaceAction === "left") {
            closeChromeMenus();
            vscode.postMessage({ type: "showSidebar" });
            return;
          }
          if (target.dataset.surfaceAction === "bottom") {
            closeChromeMenus();
            vscode.postMessage({ type: "showBottomPanel" });
            return;
          }
          if (target.dataset.surfaceAction === "editor") {
            closeChromeMenus();
            vscode.postMessage({ type: "openPanel" });
            return;
          }
          if (target.dataset.surfaceAction === "fullscreen") {
            closeChromeMenus();
            vscode.postMessage({ type: "maximizeDashboard" });
            return;
          }
          if (target.dataset.view) {
            setWorkspaceView(target.dataset.view, { boardSubView: target.dataset.boardWorkspace || undefined });
            return;
          }
          if (target.dataset.boardSubview) {
            state.ui.currentView = "board";
            state.ui.boardSubView = target.dataset.boardSubview || "canvas";
            persistUi();
            render(state.payload);
            return;
          }
          if (target.dataset.clearTopicFocus) {
            applyTopicFocus(null);
            return;
          }
          if (target.dataset.clearRootFilter) {
            applyRootFilter(null);
            return;
          }
          if (target.dataset.clearThreadTabFilter) {
            setThreadTabFilter("all");
            return;
          }
          if (target.dataset.toggleThreadTabFilter) {
            state.ui.threadTabFilterMenuOpen = !state.ui.threadTabFilterMenuOpen;
            render(state.payload);
            return;
          }
          if (target.dataset.threadTabFilterOption !== undefined) {
            setThreadTabFilter(target.dataset.threadTabFilterOption || "all");
            return;
          }
          if (target.dataset.toggleWorkspaceFilter) {
            applyWorkspaceFilter();
            return;
          }
          if (target.dataset.rootFilter !== undefined) {
            applyRootFilter(target.dataset.rootFilter || null);
            return;
          }
          if (target.dataset.topicNode) {
            const group = target.dataset.topicGroup || "keyword";
            if (group === "thread") {
              applyTopicFocus({
                group,
                threadId: target.dataset.topicThread || "",
                value: target.dataset.topicLabel || "",
              });
            } else {
              applyTopicFocus({
                group,
                value: target.dataset.topicFocus || target.dataset.topicLabel || "",
              });
            }
            return;
          }
          if (target.dataset.subtab) {
            setRightPaneTab(target.dataset.subtab);
          }
        });
      }

      window.addEventListener("message", (event) => {
        if (event.data && event.data.type === "state") {
          state.stateReceivedAt = new Date().toISOString();
          setDebugStatus(event.data.service && event.data.service.ok ? "state received" : "degraded");
          stopBootRetryLoop();
          stopBootProgressLoop();
          finishBootProgressBeforeRender();
          syncOptimisticAutoContinueState(event.data.autoContinueConfigs || {});
          syncPendingPromptState(event.data.optimisticQueuedPrompts || {});
          render(event.data);
          return;
        }
        if (event.data && event.data.type === "autoContinueConfigPatched") {
          patchAutoContinueState(event.data.threadId, event.data.config || null);
          if (!syncAutoLoopDom(event.data.threadId)) {
            render(state.payload);
          }
          return;
        }
        if (event.data && event.data.type === "codexTabProjectionPatched") {
          patchCodexTabProjection(event.data.codexTabProjection || {});
          if (!syncCodexTabProjectionDom()) {
            render(state.payload);
          }
          return;
        }
        if (event.data && event.data.type === "codexLinkStatePatched") {
          patchCodexLinkState(event.data.codexLinkState || {});
          if (!syncCodexTabProjectionDom()) {
            render(state.payload);
          }
          return;
        }
        if (event.data && event.data.type === "handoffObjectsPatched") {
          patchHandoffObjects(event.data.handoffObjects || {});
          render(state.payload);
          return;
        }
        if (event.data && event.data.type === "threadPatched") {
          const patch = event.data.patch || {};
          patchThread(event.data.threadId, patch);
          const titleSynced = Object.prototype.hasOwnProperty.call(patch, "title")
            ? syncThreadTitleDom(event.data.threadId, patch.title || "")
            : false;
          const statusSynced = syncCodexTabProjectionDom();
          if (!(titleSynced || statusSynced)) {
            render(state.payload);
          }
          return;
        }
        if (event.data && event.data.type === "threadCreated") {
          addThread(event.data.thread || {});
          if (event.data.selectThreadId) {
            state.selectedThreadId = event.data.selectThreadId;
          }
          render(state.payload);
          return;
        }
        if (event.data && event.data.type === "cardLabelPatched") {
          applyCardLabelPatch(event.data.threadId, event.data.label || "");
          return;
        }
        if (event.data && event.data.type === "boardTabPatched") {
          applyBoardTabPatch(
            event.data.threadId || "",
            event.data.boardTab || "",
            Array.isArray(event.data.boardTabOrder) ? event.data.boardTabOrder : undefined,
            event.data.activeBoardTab || state.ui.activeBoardTab || "all"
          );
          return;
        }
        if (event.data && event.data.type === "threadInsightPatched") {
          if (state.payload && state.payload.detail && state.payload.detail.thread && state.payload.detail.thread.id === event.data.threadId) {
            state.payload = Object.assign({}, state.payload, {
              detail: Object.assign({}, state.payload.detail, {
                threadInsight: event.data.threadInsight || null,
              }),
            });
          }
          render(state.payload);
          return;
        }
        if (event.data && event.data.type === "threadRemoved") {
          removeThread(event.data.threadId);
          if (!syncThreadRemovedDom(event.data.threadId)) {
            render(state.payload);
          }
          return;
        }
        if (event.data && event.data.type === "threadsPatched") {
          const threadIds = Array.isArray(event.data.threadIds) ? event.data.threadIds : [];
          patchThreads(threadIds, event.data.patch || {});
          if (!syncThreadsPatchedDom(threadIds)) {
            render(state.payload);
          }
          return;
        }
        if (event.data && event.data.type === "threadsRemoved") {
          removeThreads(Array.isArray(event.data.threadIds) ? event.data.threadIds : []);
          if (!syncThreadsRemovedDom(Array.isArray(event.data.threadIds) ? event.data.threadIds : [])) {
            render(state.payload);
          }
          return;
        }
        if (event.data && event.data.type === "promptQueued") {
          queuePromptOptimistically(event.data.threadId, event.data.prompt || "continue");
          if (!syncPendingPromptDom(event.data.threadId)) {
            render(state.payload);
          }
          return;
        }
        if (event.data && event.data.type === "promptQueueFailed") {
          markPromptQueueFailed(event.data.threadId, event.data.prompt || "continue", event.data.message || "Failed to queue prompt");
          if (!syncPendingPromptDom(event.data.threadId)) {
            render(state.payload);
          }
        }
      });

      window.addEventListener("error", (event) => {
        vscode.postMessage({
          type: "bootError",
          error: event && event.message ? event.message : "Unknown runtime error",
        });
      });
      window.addEventListener("unhandledrejection", (event) => {
        const reason = event && event.reason;
        const detail = reason instanceof Error ? reason.message : String(reason || "Unknown promise rejection");
        vscode.postMessage({
          type: "bootError",
          error: detail,
        });
      });

      try {
        bindChromeDelegation();
        state.bridgeBoundAt = new Date().toISOString();
        setDebugStatus("bridge bound");
        applyBrandFooterStyle();
        startBootProgressLoop();
        document.addEventListener("pointermove", (event) => {
          moveBoardPointerDrag(event);
          scheduleResizeUpdate(event);
        });
        document.addEventListener("pointerup", (event) => {
          finishBoardPointerDrag(event);
          finishRunningCardResize(event);
        });
        document.addEventListener("pointercancel", (event) => {
          cancelBoardPointerDrag(event);
          finishRunningCardResize(event);
        });
        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape" && state.pointerBoardDrag) {
            cancelBoardPointerDrag();
          }
        });
        notifyReady();
        setDebugStatus("boot ok");
        startBootRetryLoop();
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error || "Unknown startup error");
        vscode.postMessage({
          type: "bootError",
          error: detail,
        });
      }

      bindIfPresent("threadSearch", "input", (event) => {
        state.ui.search = event.target.value || "";
        state.ui.topicFocus = null;
        persistUi();
        render(state.payload);
      });
      bindIfPresent("threadSearchMirror", "input", (event) => {
        state.ui.search = event.target.value || "";
        state.ui.topicFocus = null;
        persistUi();
        render(state.payload);
      });
      bindIfPresent("createThreadButton", "click", () => {
        vscode.postMessage({ type: "createThread" });
      });
      bindIfPresent("codexSidebarButton", "click", () => {
        vscode.postMessage({ type: "revealInCodexSidebar" });
      });
      bindIfPresent("refreshThreadsMirror", "click", () => {
        vscode.postMessage({ type: "reload" });
      });
      bindIfPresent("scanCodexSessionsMirror", "click", () => {
        vscode.postMessage({ type: "scanCodexSessions" });
      });
      bindIfPresent("toggleThreadGroupsMirror", "click", () => {
        toggleThreadGroupsExpanded();
      });
      document.querySelectorAll("[data-filter]").forEach((node) => {
        node.addEventListener("click", () => {
          state.ui.filter = node.dataset.filter;
          persistUi();
          render(state.payload);
        });
      });
      document.querySelectorAll("[data-filter-mirror]").forEach((node) => {
        node.addEventListener("click", () => {
          state.ui.filter = node.dataset.filterMirror;
          persistUi();
          render(state.payload);
        });
      });
      document.querySelectorAll("[data-sort]").forEach((node) => {
        node.addEventListener("click", () => {
          state.ui.sort = node.dataset.sort;
          persistUi();
          render(state.payload);
        });
      });
      document.querySelectorAll("[data-sort-mirror]").forEach((node) => {
        node.addEventListener("click", () => {
          state.ui.sort = node.dataset.sortMirror;
          persistUi();
          render(state.payload);
        });
      });
      document.querySelectorAll("[data-toggle='pinned']").forEach((node) => {
        node.addEventListener("click", () => {
          state.ui.pinnedOnly = !state.ui.pinnedOnly;
          persistUi();
          render(state.payload);
        });
      });
      document.querySelectorAll("[data-toggle-mirror='pinned']").forEach((node) => {
        node.addEventListener("click", () => {
          state.ui.pinnedOnly = !state.ui.pinnedOnly;
          persistUi();
          render(state.payload);
        });
      });
      bindIfPresent("toggleLayoutLockPrimary", "click", () => {
        toggleLayoutLock();
      });
      bindIfPresent("resetRunningLayoutPrimary", "click", () => {
        resetRunningLayout();
      });
      bindIfPresent("saveLayoutPrimary", "click", () => {
        saveLayoutNow();
      });
      document.querySelectorAll("[data-open-board-view]").forEach((node) => {
        node.addEventListener("click", () => {
          setWorkspaceView("board");
        });
      });
      bindIfPresent("drawerClose", "click", () => {
        clearPendingDrawerAction();
        state.ui.drawerOpen = false;
        persistUi();
        render(state.payload);
      });
      bindIfPresent("drawerBackdrop", "click", () => {
        clearPendingDrawerAction();
        state.ui.drawerOpen = false;
        persistUi();
        render(state.payload);
      });
    </script>
  </body>
</html>`;
}

module.exports = {
  getWebviewHtml,
};
