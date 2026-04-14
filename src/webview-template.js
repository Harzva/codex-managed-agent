const vscode = require("vscode");
const { renderBoardPane } = require("./webview/board");
const { renderInsightsSections } = require("./webview/insights");
const { renderDrawerShell } = require("./webview/drawer");

function getWebviewHtml(webview, extensionUri) {
  const nonce = String(Date.now());
  const mediaRoot = vscode.Uri.joinPath(extensionUri, "media");
  const media = {
    hero: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "home-runing.svg")).toString(),
    board: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "卡通形象.svg")).toString(),
    intervention: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "小鸡 动物 鸟.svg")).toString(),
    spotlight: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "live照片.svg")).toString(),
    timeline: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "toruning.svg")).toString(),
    rest: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "婴儿枕头.svg")).toString(),
    planning: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "createtask.svg")).toString(),
    tooling: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "卡通手表.svg")).toString(),
    editing: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "edit.svg")).toString(),
    testing: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "runing.svg")).toString(),
    waiting: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "卡通绵羊-copy.svg")).toString(),
  };
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
      body { padding: 12px; }
      .shell { display: grid; gap: 12px; max-width: 1720px; margin: 0 auto; }
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
      }
      .topbar {
        display: grid;
        gap: 12px;
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
      .topbar.mode-ultra .topbar-nav-right,
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
      .topbar-head {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 16px;
        align-items: start;
      }
      .topbar-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
      }
      .brand-cluster {
        display: grid;
        gap: 8px;
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
      .actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      .collapse-btn {
        min-width: 34px;
        padding: 0 10px;
      }
      .topbar-nav-left,
      .topbar-nav-right {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .switcher {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .workspace-tabs {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
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
      .service-banner .chip {
        margin-top: 8px;
      }
      .service-restart {
        border-color: rgba(255, 124, 136, 0.26);
        background: rgba(122, 24, 40, 0.2);
        color: #ffd9dd;
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
      }
      .workspace-pane.active {
        display: block;
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
      .overview-digest {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 14px;
      }
      .summary-deck {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
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
        padding: 14px;
        display: grid;
        gap: 8px;
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
      .summary-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }
      .summary-value {
        margin-top: 8px;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      .summary-copy {
        margin-top: 6px;
        color: var(--muted-soft);
        font-size: 12px;
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
      }
      .mini-thread-title {
        margin-top: 6px;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.35;
      }
      .mini-thread-meta {
        margin-top: 6px;
        color: var(--muted);
        font-size: 11px;
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
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 14px;
        align-items: start;
      }
      .spotlight-title {
        margin-top: 8px;
        font-size: 22px;
        font-weight: 800;
        line-height: 1.2;
        letter-spacing: -0.03em;
      }
      .spotlight-copy {
        color: var(--muted);
        margin-top: 6px;
        line-height: 1.55;
      }
      .spotlight-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-self: center;
      }
      .spotlight-metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-top: 14px;
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
        border-color: rgba(124, 157, 255, 0.34);
        box-shadow: inset 0 0 0 1px rgba(124, 157, 255, 0.16);
      }
      .thread-row.codex-open,
      .running-row.codex-open {
        box-shadow: inset 0 0 0 1px rgba(120, 170, 255, 0.08);
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
        box-shadow: inset 0 0 0 1px rgba(255, 214, 107, 0.14);
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
        min-height: 24px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid rgba(126, 231, 255, 0.16);
        color: var(--cyan);
        font-size: 11px;
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
      }
      .thread-topline {
        display: grid;
        grid-template-columns: auto auto 1fr auto auto auto auto auto;
        gap: 8px;
        align-items: center;
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
        padding: 0 8px;
        font-size: 11px;
        background: transparent;
        border-color: rgba(126, 231, 255, 0.1);
        color: var(--muted);
      }
      .mini-action-btn {
        min-height: 24px;
        padding: 0 8px;
        font-size: 11px;
        background: transparent;
        border-color: rgba(126, 231, 255, 0.1);
        color: var(--muted);
      }
      .mini-action-btn:hover,
      .pin-btn:hover {
        color: var(--text);
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
        margin-top: 8px;
        border-top: 1px solid rgba(126, 231, 255, 0.08);
        padding-top: 8px;
      }
      .group-block:first-child {
        margin-top: 0;
        border-top: none;
        padding-top: 0;
      }
      .group-summary {
        list-style: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        color: var(--muted);
        padding: 4px 0 8px 0;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .group-summary::-webkit-details-marker { display: none; }
      .group-count {
        font-size: 11px;
        color: #6e87aa;
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
        border-radius: 18px;
        border: 1px solid rgba(255, 143, 159, 0.16);
        background: linear-gradient(180deg, rgba(122, 24, 40, 0.12), rgba(255,255,255,0.02));
        min-height: 160px;
        max-height: 44vh;
        overflow: auto;
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
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 10px;
        align-content: start;
        min-height: 0;
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
      .motion-reduced .ascii-title,
      .motion-reduced .completion-rail,
      .motion-reduced .completion-card,
      .motion-reduced .intervention-art,
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
        min-height: 156px;
      }
      .running-card.compact-card .compact-card-titlebar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
        padding: 2px 0 4px;
        margin-bottom: 2px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .running-card.compact-card .compact-card-title {
        font-size: 14px;
        font-weight: 800;
        line-height: 1.35;
        color: var(--text-strong);
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .running-card.compact-card .compact-card-titlebar .tool-btn {
        flex: 0 0 auto;
        min-height: 28px;
        padding: 0 10px;
      }
      .running-card.compact-card .compact-card-titlebar .tool-btn span {
        display: inline;
      }
      .running-card.compact-card .running-card-body .running-card-title,
      .running-card.compact-card .running-card-footer {
        display: none;
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
      .running-card.size-tiny.fixed-tiny .running-action-rail {
        width: 100%;
        justify-content: stretch;
        gap: 6px;
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
        min-height: 28px;
        padding: 0 10px;
        border-radius: 10px;
        font-size: 11px;
      }
      .running-card.size-tiny.fixed-tiny .tool-btn .tool-icon {
        width: 12px;
        height: 12px;
      }
      .running-card.size-tiny.fixed-tiny .tool-btn.codex-link {
        border-color: rgba(173, 143, 255, 0.28);
        background: rgba(173, 143, 255, 0.12);
        color: #e7dcff;
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
        padding-top: 10px;
        border-top: 1px solid rgba(255,255,255,0.06);
        align-items: flex-end;
      }
      .running-action-rail {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .tool-btn {
        min-height: 28px;
        padding: 0 10px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.03);
        color: var(--muted);
        font-size: 11px;
        font-weight: 600;
        box-shadow: none;
        transform: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
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
        min-height: 28px;
        padding: 0 10px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.06);
        background: rgba(255,255,255,0.02);
        color: var(--muted-soft);
        font-size: 10px;
        letter-spacing: 0.04em;
      }
      .tool-icon {
        display: inline-grid;
        place-items: center;
        width: 15px;
        height: 15px;
        color: currentColor;
        opacity: 0.92;
        line-height: 0;
      }
      .tool-icon svg {
        width: 15px;
        height: 15px;
        stroke: currentColor;
        fill: none;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .thread-meta {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 6px;
      }
      .phase-chip {
        --phase-chip-border: rgba(255,255,255,0.08);
        --phase-chip-bg: rgba(255,255,255,0.03);
        --phase-chip-text: var(--text);
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 26px;
        padding: 0 10px 0 8px;
        border-radius: 999px;
        border: 1px solid var(--phase-chip-border);
        background: var(--phase-chip-bg);
        color: var(--phase-chip-text);
        font-size: 11px;
        font-weight: 600;
      }
      .phase-chip-art {
        width: 16px;
        height: 16px;
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
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 999px;
        padding: 2px 8px;
        color: var(--muted);
        font-size: 11px;
      }
      button.meta-pill {
        appearance: none;
        background: rgba(255,255,255,0.04);
        cursor: pointer;
        font: inherit;
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
        padding: 18px 18px 14px 18px;
        border-bottom: 1px solid rgba(126, 231, 255, 0.08);
        display: grid;
        gap: 12px;
      }
      .drawer-kicker {
        color: #6f8fba;
        font-size: 11px;
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
        font-size: 16px;
        font-weight: 800;
        line-height: 1.35;
      }
      .drawer-close {
        min-height: 28px;
        padding: 0 10px;
      }
      .drawer-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .drawer-summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }
      .drawer-stat {
        border: 1px solid rgba(126, 231, 255, 0.08);
        border-radius: 12px;
        background: rgba(8, 15, 28, 0.7);
        padding: 10px;
      }
      .drawer-stat-label {
        color: var(--muted);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .drawer-stat-value {
        margin-top: 6px;
        font-size: 13px;
        font-weight: 700;
      }
      .action-rail {
        padding: 12px 18px;
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
        .toolbar {
          grid-template-columns: 1fr;
        }
        .topbar-head, .spotlight-grid {
          grid-template-columns: 1fr;
        }
        .topbar-nav {
          align-items: flex-start;
        }
        .ascii-shell {
          display: none;
        }
        .title-stack {
          display: grid;
        }
        .title {
          font-size: 18px;
        }
        .title-strip {
          font-size: 9px;
          letter-spacing: 0.12em;
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
        body { padding: 10px; }
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
          <div class="topbar-head">
            <div class="brand-cluster">
              <div class="brand-line">
                <div class="hero-kicker">Agent Control Surface</div>
                <div class="title-banner">
                  <div class="ascii-shell">
                    <pre class="ascii-title">  ____          _             __  __                                                   _                    _     _                      
 / ___|___   __| | _____  __ |  \\/  | __ _ _ __   __ _  __ _  ___  __| |       /\\      __ _  ___ _ __ | |_  | |   ___   __ _ _ __  
| |   / _ \\ / _\` |/ _ \\ \\/ / | |\\/| |/ _\` | '_ \\ / _\` |/ _\` |/ _ \\/ _\` |      /  \\    / _\` |/ _ \\ '_ \\| __| | |  / _ \\ / _\` | '_ \\ 
| |__| (_) | (_| |  __/>  <  | |  | | (_| | | | | (_| | (_| |  __/ (_| |     / /\\ \\  | (_| |  __/ | | | |_  | | | (_) | (_| | |_) |
 \\____\\___/ \\__,_|\\___/_/\\_\\ |_|  |_|\\__,_|_| |_|\\__,_|\\__, |\\___|\\__,_|    /_/  \\_\\  \\__, |\\___|_| |_|\\__| |_|  \\___/ \\__,_| .__/ 
                                                       |___/                            |___/                               |_|    </pre>
                  </div>
                  <div class="title-stack">
                    <div class="title">
                      <span class="title-seg codex">Codex</span>
                      <span class="title-hyphen">-</span>
                      <span class="title-seg managed">Managed</span>
                      <span class="title-hyphen">-</span>
                      <span class="title-seg agent">Agent</span>
                    </div>
                    <div class="title-strip">Control Surface Signature</div>
                  </div>
                </div>
                <span class="hero-pill mono" id="serviceMeta">Service: -</span>
                <span class="hero-pill mono" id="surfaceLabel">Position: -</span>
              </div>
              <div class="sub" id="heroSummary">Code thread workspace inside VS Code.</div>
              <div class="hero-stage">
                <span class="mascot-chip"><img class="mascot-art hero-art-vivid theme-is-optional" src="${media.hero}" alt="" /><span class="theme-bar hero-art-clean variant-hero phase-planning" aria-hidden="true"></span><strong>Night Ops</strong> calmer layout and softer chrome</span>
                <span class="mascot-chip"><img class="mascot-art hero-art-vivid theme-is-optional" src="${media.board}" alt="" /><span class="theme-bar hero-art-clean variant-hero phase-tooling" aria-hidden="true"></span><strong>Board View</strong> attach important agents to a card wall</span>
              </div>
            </div>
            <div class="actions">
              <button id="toggleHeaderCollapse" class="collapse-btn" type="button">Collapse</button>
              <button id="reload" type="button">Reload</button>
              <button id="startServer" type="button">Start 8787</button>
              <button id="restartServer" class="service-restart" type="button" hidden>Restart 8787</button>
              <button id="external" type="button">Open Browser</button>
            </div>
          </div>
          <div class="topbar-nav">
            <div class="topbar-nav-left">
              <div class="workspace-tabs">
                <button class="workspace-tab" data-view="overview" type="button">Overview</button>
                <button class="workspace-tab" data-view="threads" type="button">Threads</button>
                <button class="workspace-tab" data-view="board" type="button">Board</button>
                <button class="workspace-tab" data-view="live" type="button">Live</button>
                <button class="workspace-tab" data-view="inspector" type="button">Inspector</button>
              </div>
              <button class="chip" id="themeToggle" type="button">Theme</button>
              <button class="chip" id="motionToggle" type="button">Motion</button>
              <button class="chip" id="soundToggle" type="button">Alert Sound</button>
            </div>
            <div class="topbar-nav-right">
              <div class="switcher">
                <button class="switch-btn" id="posLeft" type="button">Left</button>
                <button class="switch-btn" id="posBottom" type="button">Bottom</button>
                <button class="switch-btn" id="posEditor" type="button">Editor</button>
                <button class="switch-btn" id="posFullscreen" type="button">Fullscreen</button>
              </div>
            </div>
          </div>
        </div>
        <div id="serviceBanner" class="service-banner"></div>
      </section>
      <section id="completionRail" class="completion-rail"></section>

      <section class="workspace-pane" data-workspace-pane="overview">
        <section class="overview-digest">
          <div class="panel">
            <div class="section-title">Overview Snapshot</div>
            <div class="section-note">A denser workspace summary inspired by command palettes and inspector-first tools.</div>
            <div class="summary-deck" id="overviewDigest"></div>
          </div>
          <div class="panel">
            <div class="section-title">Focus Queue</div>
            <div class="section-note">Pinned and running agents stay visible here for quick context switching.</div>
            <div class="digest-rail" id="overviewRail"></div>
          </div>
        </section>
        ${renderInsightsSections()}
        <section class="meta-grid" id="metrics"></section>
        <section class="overview-grid">
          <div class="stack">
            <div class="panel">
              <div class="section-title">Running Agents</div>
              <div class="section-note" id="runningSummary">Recent live agents and process status.</div>
              <div id="runningList"></div>
            </div>
            <div class="panel">
              <div class="section-title">Threads</div>
              <div class="toolbar">
                <input id="threadSearch" class="search" type="search" placeholder="Search title, id, cwd" />
                <div class="chip-row">
                  <button class="chip" data-filter="all" type="button">All</button>
                  <button class="chip" data-filter="running" type="button">Running</button>
                  <button class="chip" data-filter="recent" type="button">Recent</button>
                  <button class="chip" data-filter="idle" type="button">Idle</button>
                  <button class="chip" data-filter="needs_human" type="button">Needs Human</button>
                  <button class="chip" data-filter="archived" type="button">Archived</button>
                  <button class="chip" data-filter="soft_deleted" type="button">Deleted</button>
                  <button class="chip" data-toggle="pinned" type="button">Pinned</button>
                  <span class="sort-row">
                    <span class="sort-label">Sort</span>
                    <button class="chip" data-sort="updated" type="button">Updated</button>
                    <button class="chip" data-sort="created" type="button">Created</button>
                    <button class="chip" data-sort="log" type="button">Log</button>
                  </span>
                </div>
              </div>
              <div class="section-note" id="threadSummary">Showing running and recent threads first.</div>
              <div id="batchBar" class="batch-bar"></div>
              <div id="threadList" class="thread-list-compact"></div>
            </div>
          </div>
          <div class="stack">
            <div class="panel right-panel" id="rightPanel">
              <div class="subtabs" id="detailTabs">
                <button class="subtab" data-subtab="console" type="button">Console</button>
                <button class="subtab" data-subtab="history" type="button">History</button>
                <button class="subtab" data-subtab="connection" type="button">Connection</button>
              </div>
              <div class="subpane-wrap">
                <section class="subpane" data-pane="console">
                  <div class="section-title">Live Console</div>
                  <div class="section-note">Switch between running threads without leaving the inspector lane.</div>
                  <div class="tabs" id="runningTabs"></div>
                  <div class="terminal" id="terminal"></div>
                </section>
                <section class="subpane" data-pane="history">
                  <div class="section-title">Conversation History</div>
                  <div class="section-note" id="historySummary">Select a thread to inspect its chat history.</div>
                  <div id="chatWindow" class="chat-window"></div>
                </section>
                <section class="subpane" data-pane="connection">
                  <div class="section-title">Connection Details</div>
                  <div class="section-note">Local service, refresh state, and degraded-mode status.</div>
                  <div class="connection-card">
                    <div class="sub mono" id="baseUrl">Base URL: -</div>
                    <div class="connection-grid">
                      <div class="footer-note" id="statusLine">Waiting for data...</div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>
      </section>

      <section class="workspace-pane" data-workspace-pane="threads">
        <section class="single-grid">
          <div class="panel">
            <div class="running-board-shell board-summary-shell">
              <div class="running-board-toolbar">
                <div class="running-board-title">
                  <div class="board-icon"><img class="board-icon-vivid theme-is-optional" src="${media.board}" alt="" /><span class="theme-bar board-icon-clean variant-hero phase-tooling" aria-hidden="true"></span></div>
                  <div>
                    <div class="section-title">Board Summary</div>
                    <div class="running-board-copy" id="runningBoardMeta">Open the dedicated Board workspace for drag, resize, and card layout.</div>
                  </div>
                </div>
                <div class="chip-row">
                  <button class="chip" data-open-board-view="true" type="button">Open Board</button>
                </div>
              </div>
              <div class="overview-grid">
                <div class="panel">
                  <div class="section-title">Board Status</div>
                  <div class="section-note" id="boardSummaryHeadline">No cards yet.</div>
                  <div id="boardSummaryStats" class="drawer-summary"></div>
                </div>
                <div class="panel">
                  <div class="section-title">Needs Human</div>
                  <div class="section-note" id="boardSummaryNeedsHuman">No urgent cards right now.</div>
                  <div id="boardSummaryQueue" class="digest-rail"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="panel">
            <div class="section-title">Thread Explorer</div>
            <div class="section-note">Search, filter, pin, sort, and batch-manage the full workspace.</div>
            <div class="toolbar">
              <input id="threadSearchMirror" class="search" type="search" placeholder="Search title, id, cwd" />
              <div class="chip-row">
                <button class="chip" data-filter-mirror="all" type="button">All</button>
                <button class="chip" data-filter-mirror="running" type="button">Running</button>
                <button class="chip" data-filter-mirror="recent" type="button">Recent</button>
                <button class="chip" data-filter-mirror="idle" type="button">Idle</button>
                <button class="chip" data-filter-mirror="needs_human" type="button">Needs Human</button>
                <button class="chip" data-filter-mirror="archived" type="button">Archived</button>
                <button class="chip" data-filter-mirror="soft_deleted" type="button">Deleted</button>
                <button class="chip" data-toggle-mirror="pinned" type="button">Pinned</button>
              </div>
            </div>
            <div class="section-note" id="threadSummaryMirror">Showing running and recent threads first.</div>
            <div id="batchBarMirror" class="batch-bar"></div>
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

      <section class="workspace-pane" data-workspace-pane="inspector">
        <section class="single-grid">
          <div class="panel">
            <div class="section-title">Selected Agent Spotlight</div>
            <div class="section-note">Keep the current thread in focus while the drawer handles deep inspection and lifecycle actions.</div>
            <div id="spotlightPanel"></div>
          </div>
          <div class="panel">
            <div class="section-title">Working Memory Cards</div>
            <div class="section-note">Prompt, rule, and memo cards will live here as first-class memory objects instead of blending into agent cards.</div>
            <div id="memoryCardsPanel"></div>
          </div>
        </section>
      </section>
${renderDrawerShell()}    </div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      let bootRetryTimer;
      let bootRetryCount = 0;
      const MEDIA = ${JSON.stringify(media)};
      const persisted = vscode.getState() || {};
      const state = {
        selectedThreadId: undefined,
        payload: undefined,
        currentSurface: "editor",
        lastAutoScrolledFocusedThreadId: undefined,
        pendingScrollThreadId: undefined,
        draggedRunningThreadId: undefined,
        activeBoardId: undefined,
        dragPreviewEl: undefined,
        resizingRunningCard: undefined,
        runningDropIndicator: undefined,
        pendingDragIndicator: undefined,
        dragRaf: 0,
        resizeRaf: 0,
        pendingResizeEvent: undefined,
        lastInterventionCount: 0,
        lastInsightsSnapshot: undefined,
        lastInsightsSource: "live",
        lastInsightsCapturedAt: undefined,
        seenCompletionIds: persisted.seenCompletionIds || {},
        ui: {
          currentView: persisted.currentView || "overview",
          headerMode: persisted.headerMode || (persisted.headerCollapsed ? "collapsed" : "expanded"),
          themeMode: persisted.themeMode || "vivid",
          search: persisted.search || "",
          topicFocus: persisted.topicFocus || null,
          rootFilter: persisted.rootFilter || null,
          filter: persisted.filter || "all",
          sort: persisted.sort || "updated",
          pinnedOnly: Boolean(persisted.pinnedOnly),
          soundEnabled: persisted.soundEnabled !== false,
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
          pendingDrawerAction: undefined,
          pendingCodexLink: {},
          commandFeedback: {},
          rightPaneTab: persisted.rightPaneTab || "console",
          drawerOpen: persisted.drawerOpen !== false,
          groups: Object.assign({
            needs_human: true,
            running: true,
            recent: true,
            idle: false,
            archived: false,
            soft_deleted: false
          }, persisted.groups || {}),
          loopPanelThreadId: undefined,
          loopDraftPrompt: "continue",
          loopDraftCount: "10",
          quickComposerThreadId: undefined,
          quickComposerDrafts: {}
        }
      };

      function persistUi() {
        vscode.setState({
          seenCompletionIds: state.seenCompletionIds,
          currentView: state.ui.currentView,
          headerMode: state.ui.headerMode,
          themeMode: state.ui.themeMode,
          search: state.ui.search,
          topicFocus: state.ui.topicFocus,
          rootFilter: state.ui.rootFilter,
          filter: state.ui.filter,
          sort: state.ui.sort,
          pinnedOnly: state.ui.pinnedOnly,
          soundEnabled: state.ui.soundEnabled,
          motionEnabled: state.ui.motionEnabled,
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
          rightPaneTab: state.ui.rightPaneTab,
          groups: state.ui.groups
        });
      }

      function notifyReady() {
        vscode.postMessage({ type: "ready" });
      }

      function startBootRetryLoop() {
        stopBootRetryLoop();
        bootRetryCount = 0;
        bootRetryTimer = window.setInterval(() => {
          if (state.payload || bootRetryCount >= 6) {
            stopBootRetryLoop();
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
        if (key === "planning") return " phase-planning";
        if (key === "tooling") return " phase-tooling";
        if (key === "editing") return " phase-editing";
        if (key === "testing") return " phase-testing";
        return " phase-waiting";
      }

      function themeMode() {
        return state.ui.themeMode || "vivid";
      }

      function renderThemeVisual(src, imgClass, phaseLabel = "Waiting", variant = "phase") {
        const mode = themeMode();
        const phaseClass = phaseClassFor(phaseLabel).trim() || "phase-waiting";
        if (mode === "pure") return "";
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

      function renderSummaryCard(label, value, copy, phaseLabel, art) {
        const phaseClass = phaseClassFor(phaseLabel).trim();
        return '<div class="summary-card ' + esc(phaseClass) + '">' +
          '<div class="summary-head">' +
            renderThemeVisual(art || phaseArtFor(phaseLabel), "summary-art", phaseLabel, "summary") +
            '<div class="summary-head-copy">' +
              '<div class="summary-label">' + esc(label) + '</div>' +
              renderPhaseChip({ label: phaseLabel }) +
            '</div>' +
          '</div>' +
          '<div class="summary-value">' + esc(value) + '</div>' +
          '<div class="summary-copy">' + esc(copy) + '</div>' +
        '</div>';
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

      function renderMemoryShellCard(kind, title, copy) {
        const sourceAction = kind === "prompt"
          ? '<button class="chip" data-open-repo-file="plan.md" type="button">Open Plan</button>'
          : (kind === "rule"
          ? '<button class="chip" data-open-repo-file="ROADMAP.md" type="button">Open ROADMAP</button>'
          : (kind === "memo"
            ? '<button class="chip" data-open-repo-file=".claude/plans/ACTIVE_PLAN.md" type="button">Open Active Plan</button>'
            : ''));
        const sourceState = kind === "prompt"
          ? "plan.md linked"
          : (kind === "rule"
          ? "ROADMAP linked"
          : (kind === "memo" ? "ACTIVE_PLAN linked" : "No source linked yet"));
        return '<div class="memory-shell-card type-' + esc(kind) + '">' +
          '<div class="memory-shell-head">' +
            '<span class="memory-shell-kicker">' + esc(kind) + '</span>' +
            '<span class="meta-pill">Shell Only</span>' +
          '</div>' +
          '<div class="memory-shell-title">' + esc(title) + '</div>' +
          '<div class="memory-shell-copy">' + esc(copy) + '</div>' +
          '<div class="memory-shell-meta">' +
            '<span class="meta-pill">Task 1</span>' +
            '<span class="meta-pill">' + esc(sourceState) + '</span>' +
          '</div>' +
          sourceAction +
        '</div>';
      }

      function renderMemoryShellGrid() {
        return '<div class="memory-shell-grid">' +
          renderMemoryShellCard("prompt", "Prompt Card", "Keep a reusable working prompt visible beside live agent activity.") +
          renderMemoryShellCard("rule", "Rule Card", "Surface durable guardrails and loop rules without burying them in tabs.") +
          renderMemoryShellCard("memo", "Memo Card", "Hold compact decisions and reminders that should persist across iterations.") +
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

      function renderWeeklyShift(insights) {
        const report = insights && insights.weekly_report;
        if (!report) {
          return renderInsightCard("Weekly change pending", "Need a little more local history before we can compare this week to the previous one.", "Weekly");
        }
        const highlights = Array.isArray(report.highlights) ? report.highlights : [];
        const shifts = Array.isArray(report.shifts) ? report.shifts : [];
        const leadShift = shifts.slice().sort((left, right) => Math.abs(Number(right.delta || 0)) - Math.abs(Number(left.delta || 0)))[0];
        const leadShiftLabel = (leadShift && leadShift.label) ? leadShift.label : "this workflow signal";
        const leadShiftDelta = Math.round(Math.abs(Number((leadShift && leadShift.delta) || 0)) * 100);
        const nextAction = leadShift
          ? (
              leadShift.direction === "up"
                ? ("Keep leaning into " + leadShiftLabel + "; it climbed " + leadShiftDelta + "% this week.")
                : leadShift.direction === "down"
                  ? ("Check whether " + leadShiftLabel + " needs a rebound next week; it fell " + leadShiftDelta + "% this week.")
                  : ("Keep " + leadShiftLabel + " steady next week while the rest of the pattern settles.")
            )
          : (highlights[0] || "Keep next week consistent and watch for a clearer weekly pattern.");
        return [
          renderInsightCard(
            "Week-on-week persona",
            ((report.current_persona || ["均衡型"]).join(" · ")) + " · " + report.current_window + " / " + String(report.current_inputs || 0) + " inputs",
            ((report.previous_persona || ["基线不足"]).join(" · ")) + " · " + report.previous_window
          ),
          renderInsightCard("Next action", nextAction, "Weekly"),
          highlights.map((line, index) => renderInsightCard("Shift " + (index + 1), line, "Delta")).join(""),
          shifts.length ? '<div class="shift-chip-row">' + shifts.slice(0, 5).map((item) => {
            const deltaPct = Math.round(Math.abs(Number(item.delta || 0)) * 100);
            return '<span class="shift-chip ' + esc(item.direction || "flat") + '">' +
              '<strong>' + esc(item.label || "") + '</strong>' +
              '<span>' + (item.direction === "up" ? "↑" : item.direction === "down" ? "↓" : "•") + ' ' + esc(String(deltaPct)) + '%</span>' +
            '</span>';
          }).join("") + '</div>' : ""
        ].join("");
      }

      function renderWordCloud(items) {
        if (!Array.isArray(items) || !items.length) {
          return '<div class="sub">暂无关键词数据</div>';
        }
        const maxCount = Math.max(...items.map((item) => Number(item.count || 0)), 1);
        return items.slice(0, 18).map((item) => {
          const ratio = Number(item.count || 0) / maxCount;
          const bucket = ratio >= 0.85 ? 5 : ratio >= 0.65 ? 4 : ratio >= 0.45 ? 3 : ratio >= 0.25 ? 2 : 1;
          const keyword = item.keyword || "";
          return '<button class="word-cloud-token weight-' + bucket + '" type="button" data-topic-node="true" data-topic-group="keyword" data-topic-label="' + esc(keyword) + '" data-topic-focus="' + esc(keyword) + '">' + esc(keyword) + '</button>';
        }).join("");
      }

      function topicNodeMatchesFocus(node, focus) {
        if (!node || !focus) return false;
        if ((focus.group || "") === "thread") {
          return node.group === "thread" && String(node.thread_id || "") === String(focus.threadId || "");
        }
        return node.group === focus.group && String(node.focus_value || node.label || "") === String(focus.value || "");
      }

      function renderTopicMap(map, focus) {
        if (!map || !Array.isArray(map.nodes) || !map.nodes.length) {
          return renderCuteEmpty("Topic map pending", "As more threads and prompts accumulate, we will connect your hot topics here.", MEDIA.board);
        }
        const center = map.nodes.find((node) => node.id === "center") || { id: "center", label: "Codex Workbench", group: "center" };
        const styles = map.nodes.filter((node) => node.group === "style");
        const keywords = map.nodes.filter((node) => node.group === "keyword");
        const threads = map.nodes.filter((node) => node.group === "thread");
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

        const edges = (map.edges || []).map((edge) => {
          const from = positions[edge.from];
          const to = positions[edge.to];
          if (!from || !to) return "";
          return '<line class="topic-edge" x1="' + from.x + '" y1="' + from.y + '" x2="' + to.x + '" y2="' + to.y + '"></line>';
        }).join("");
        const nodes = map.nodes.map((node) => {
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

      function renderThreadSummaryMarkup(visibleCount, totalCount, topicFocus, sort, rootFilter) {
        const summaryText = visibleCount
          ? (
              topicFocus
                ? ("Showing " + visibleCount + " linked threads from topic map · " + (topicFocus.group === "thread" ? "focused thread" : (topicFocus.value || topicFocus.group)))
                : rootFilter
                  ? ("Showing " + visibleCount + " of " + totalCount + " loaded threads · root " + rootFilter + " · sorted by " + sort)
                : ("Showing " + visibleCount + " of " + totalCount + " loaded threads · sorted by " + sort)
            )
          : (topicFocus ? "No threads match the current topic-map focus." : (rootFilter ? "No threads match the current root filter." : "No threads match the current search/filter."));
        const actions = [];
        if (topicFocus) actions.push('<button class="chip" data-clear-topic-focus="true" type="button">Clear topic focus</button>');
        if (rootFilter) actions.push('<button class="chip" data-clear-root-filter="true" type="button">Clear root filter</button>');
        if (!actions.length) return esc(summaryText);
        return '<span>' + esc(summaryText) + '</span> ' + actions.join(" ");
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

      function compactRootIdentity(cwd) {
        const raw = String(cwd || "").trim();
        if (!raw) return "-";
        const normalized = raw.replace(/\\/g, "/").replace(/\/+$/, "");
        if (!normalized) return raw;
        const parts = normalized.split("/").filter(Boolean);
        if (!parts.length) return raw;
        return parts[parts.length - 1] || raw;
      }

      function renderRootIdentityPill(cwd, options = {}) {
        const fullPath = String(cwd || "").trim();
        const root = compactRootIdentity(fullPath);
        if (!options.interactive) {
          return '<span class="meta-pill mono" title="' + esc(fullPath || "-") + '">Root ' + esc(short(root, 20)) + '</span>';
        }
        const active = state.ui.rootFilter && state.ui.rootFilter === root;
        return '<button class="meta-pill mono' + (active ? ' active' : '') + '" type="button" data-root-filter="' + esc(root) + '" title="' + esc(fullPath || "-") + '">Root ' + esc(short(root, 20)) + '</button>';
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
        const focusedThreadId = payload && payload.codexLinkState && payload.codexLinkState.focusedThreadId;
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
        const focusedThreadId = payload && payload.codexLinkState && payload.codexLinkState.focusedThreadId;
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

      function setWorkspaceView(view) {
        state.ui.currentView = view;
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

      function toggleSound() {
        state.ui.soundEnabled = !state.ui.soundEnabled;
        persistUi();
        render(state.payload);
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
        }
        persistUi();
        render(state.payload);
      }

      function getBoardThreads(dashboard, payload = state.payload) {
        const threadMap = new Map(((dashboard && dashboard.threads) || []).map((thread) => [thread.id, thread]));
        const boardMap = new Map();
        const effectiveRunning = effectiveRunningIdSet(payload);
        ((dashboard && dashboard.runningThreads) || []).forEach((thread) => {
          const source = effectiveRunning.has(thread.id) ? "running" : "linked";
          boardMap.set(thread.id, Object.assign({}, threadMap.get(thread.id) || {}, thread, { board_source: source }));
        });
        Object.keys(state.ui.boardAttached).forEach((threadId) => {
          if (!state.ui.boardAttached[threadId]) return;
          const thread = threadMap.get(threadId);
          if (!thread) return;
          const existing = boardMap.get(threadId);
          boardMap.set(threadId, Object.assign({}, thread, existing || {}, {
            board_source: existing ? "running" : "attached",
          }));
        });
        return Array.from(boardMap.values());
      }

      function getRunningCardSize(threadId) {
        const size = state.ui.runningCardSizes[threadId];
        return size === "tiny" || size === "m" || size === "l" ? size : "s";
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
        const nextSize = size === "tiny" || size === "m" || size === "l" ? size : "s";
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

      function pointerToBoardCell(board, clientX, clientY, draggedId) {
        const metrics = boardGridMetrics(board);
        const rect = board.getBoundingClientRect();
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

      function scheduleDragIndicator(indicator, boardId) {
        state.pendingDragIndicator = indicator;
        state.activeBoardId = boardId || state.activeBoardId;
        if (state.dragRaf) return;
        state.dragRaf = window.requestAnimationFrame(() => {
          state.dragRaf = 0;
          state.runningDropIndicator = state.pendingDragIndicator;
          syncDragBoardState();
          syncRunningDropIndicatorDom();
        });
      }

      function cancelScheduledDragIndicator() {
        if (state.dragRaf) {
          window.cancelAnimationFrame(state.dragRaf);
          state.dragRaf = 0;
        }
        state.pendingDragIndicator = undefined;
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

      function dropPreviewMetrics(board, draggedId = state.draggedRunningThreadId) {
        if (!draggedId) {
          return { width: 120, height: 132 };
        }
        const size = getRunningCardSize(draggedId);
        const layout = getRunningCardLayout(draggedId, size);
        const metrics = boardGridMetrics(board);
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

      function resetRunningDropIndicator(boardId) {
        cancelScheduledDragIndicator();
        clearRunningDropIndicator();
        if (boardId !== undefined) {
          state.activeBoardId = boardId;
        }
        syncDragBoardState();
        syncRunningDropIndicatorDom();
      }

      function syncRunningDropIndicatorDom() {
        const board = document.getElementById(state.activeBoardId || "runningBoardPrimary");
        const overlay = document.getElementById("boardDropOverlayPrimary");
        if (!board || !overlay) return;
        if (board.id !== "runningBoardPrimary") {
          overlay.classList.remove("visible");
          return;
        }
        if (state.runningDropIndicator && state.runningDropIndicator.col && state.runningDropIndicator.row) {
          const metrics = boardGridMetrics(board);
          const preview = dropPreviewMetrics(board);
          const left = metrics.paddingLeft + (state.runningDropIndicator.col - 1) * (metrics.width + metrics.gap);
          const top = metrics.paddingTop + (state.runningDropIndicator.row - 1) * (metrics.rowHeight + metrics.gap);
          overlay.style.transform = "translate(" + String(left) + "px, " + String(top) + "px)";
          overlay.style.width = String(preview.width) + "px";
          overlay.style.height = String(preview.height) + "px";
          overlay.classList.add("visible");
        } else {
          overlay.classList.remove("visible");
        }
      }

      function toggleLayoutLock() {
        state.ui.layoutLocked = !state.ui.layoutLocked;
        persistUi();
        render(state.payload);
      }

      function toggleMotion() {
        state.ui.motionEnabled = !state.ui.motionEnabled;
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

      function threadMatches(thread) {
        const query = normalize(state.ui.search).trim();
        const haystack = [
          thread.title,
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
        const matchesRoot = !state.ui.rootFilter || compactRootIdentity(thread.cwd) === state.ui.rootFilter;
        const matchesFilter =
          state.ui.filter === "all" ||
          (state.ui.filter === "running" && running) ||
          (state.ui.filter === "recent" && (recent || linked)) ||
          (state.ui.filter === "idle" && idle) ||
          (state.ui.filter === "needs_human" && needsHumanIntervention(thread)) ||
          (state.ui.filter === "archived" && archived) ||
          (state.ui.filter === "soft_deleted" && softDeleted);
        const matchesPinned = !state.ui.pinnedOnly || isPinned(thread.id);
        return matchesQuery && matchesTopic && matchesRoot && matchesFilter && matchesPinned;
      }

      function sortThreads(threads) {
        return [...threads].sort((a, b) => {
          const aPinned = isPinned(a.id) ? 1 : 0;
          const bPinned = isPinned(b.id) ? 1 : 0;
          if (aPinned !== bPinned) return bPinned - aPinned;
          if (state.ui.sort === "created") {
            return (Number(b.created_at || 0) - Number(a.created_at || 0))
              || (Number(b.updated_at || 0) - Number(a.updated_at || 0));
          }
          if (state.ui.sort === "log") {
            return (Number(b.last_log_ts || 0) - Number(a.last_log_ts || 0))
              || (Number(b.updated_at || 0) - Number(a.updated_at || 0));
          }
          return (Number(b.updated_at || 0) - Number(a.updated_at || 0))
            || (Number(b.last_log_ts || 0) - Number(a.last_log_ts || 0));
        });
      }

      function buildGroups(threads) {
        const groups = {
          running: [],
          linked: [],
          recent: [],
          needs_human: [],
          idle: [],
          archived: [],
          soft_deleted: []
        };
        for (const thread of sortThreads(threads)) {
          const status = effectiveThreadStatus(thread);
          const archived = Boolean(thread.archived) || status === "archived";
          if (thread.soft_deleted) groups.soft_deleted.push(thread);
          else if (archived) groups.archived.push(thread);
          else if (needsHumanIntervention(thread)) groups.needs_human.push(thread);
          else if (status === "running") groups.running.push(thread);
          else if (status === "linked") groups.linked.push(thread);
          else if (status === "recent") groups.recent.push(thread);
          else groups.idle.push(thread);
        }
        return groups;
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
        const logMessages = (thread.preview_logs || []).map((item) => item.message || item.target || "").filter(Boolean);
        const historyTexts = (thread.history || []).map((item) => item.text || "").filter(Boolean);
        const corpus = [...logMessages, ...historyTexts].join(" \\n").toLowerCase();
        return /need your|need you|your input|user input|human|manual|approval|approve|confirm|please provide|please choose|upload|login|sign in|token|pat|credential|blocked|waiting for user|intervention/.test(corpus);
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
        const linkState = (payload && payload.codexLinkState) || {};
        const openThreadIds = Array.isArray(linkState.openThreadIds) ? linkState.openThreadIds : [];
        const isFocused = Boolean(threadId) && linkState.focusedThreadId === threadId;
        const isOpen = Boolean(threadId) && openThreadIds.includes(threadId);
        if (isOpen || isFocused) {
          delete state.ui.pendingCodexLink[threadId];
        }
        const pending = Boolean(threadId) ? state.ui.pendingCodexLink[threadId] : undefined;
        return { isOpen, isFocused, pending };
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
        if (link.isOpen) {
          return '<span class="badge badge-codex-open">Codex Open</span>';
        }
        if (link.pending) {
          return '<span class="badge badge-codex-linking">Linking...</span>';
        }
        return "";
      }

      function playCompletionTone() {
        if (!state.ui.soundEnabled) return;
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
        return '<details class="group-block"' + openAttr + ' data-group="' + esc(groupKey) + '">' +
          '<summary class="group-summary"><span>' + esc(label) + '</span><span class="group-count">' + esc(String(threads.length)) + '</span></summary>' +
          threads.map(renderThreadRow).join("") +
        '</details>';
      }

      function autoLoopStateMeta(threadId) {
        const autoLoop = ((state.payload && state.payload.autoContinueConfigs) || {})[threadId];
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
            '<button class="select-btn' + (isSelected(thread.id) ? ' selected' : '') + '" data-select-thread="' + esc(thread.id) + '" type="button">' + (isSelected(thread.id) ? '✓' : '') + '</button>' +
            statusBadge(status) +
            renderThreadAutoLoopBadge(thread.id) +
            '<span class="mono muted">' + esc(thread.updated_at_iso || "") + '</span>' +
            '<button class="mini-action-btn" data-rename-thread="' + esc(thread.id) + '" data-current-title="' + esc(thread.title || "") + '" type="button">Rename</button>' +
            '<button class="mini-action-btn" data-board-attach="' + esc(thread.id) + '" type="button">' + (isBoardAttached(thread.id) ? 'Attached' : 'Board') + '</button>' +
            '<button class="mini-action-btn" data-codex-thread="' + esc(thread.id) + '" type="button">Codex</button>' +
            linkBadge +
            '<button class="pin-btn' + pinnedClass + '" data-pin-thread="' + esc(thread.id) + '" type="button">' + (isPinned(thread.id) ? "Pinned" : "Pin") + '</button>' +
          '</div>' +
          '<div class="thread-title">' + esc(short(thread.title || "(no title)", 110)) + '</div>' +
          '<div class="thread-meta">' +
            renderRootIdentityPill(thread.cwd, { interactive: true }) +
            renderPhaseChip(phase) +
            renderThreadVisibilityPill(thread) +
            '<span class="meta-pill">Cmd ' + esc(String(thread.user_command_count || 0)) + '</span>' +
            '<span class="meta-pill">Cmp ' + esc(String(thread.compaction_count || 0)) + '</span>' +
            '<span class="meta-pill">' + esc(thread.soft_deleted ? "soft-deleted" : (thread.archived ? "archived" : status)) + '</span>' +
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
        const linkLabel = linkMeta.isFocused ? "Focused in Codex" : (linkMeta.isOpen ? "Open in Codex" : (linkMeta.pending ? "Linking to Codex" : "Not linked"));
        const loopMeta = autoLoopStateMeta(merged.id);
        const autoLoop = loopMeta.autoLoop;
        const memoryShortcutRow = '<div class="chip-row">' +
          '<span class="meta-pill">Memory</span>' +
          '<button class="chip" data-open-repo-file="plan.md" type="button">Prompt</button>' +
          '<button class="chip" data-open-repo-file="ROADMAP.md" type="button">Rule</button>' +
          '<button class="chip" data-open-repo-file=".claude/plans/ACTIVE_PLAN.md" type="button">Memo</button>' +
        '</div>';
        return '<div class="spotlight-grid">' +
          '<div>' +
            statusBadge(status) +
            codexLinkBadge(merged.id) +
            renderRootIdentityPill(merged.cwd) +
            '<div class="spotlight-title">' + esc(short(merged.title || merged.id || "Selected agent", 120)) + '</div>' +
            '<div class="spotlight-copy">' + esc(short(merged.cwd || "No workspace path available.", 140)) + '</div>' +
          '</div>' +
          '<div class="spotlight-actions">' +
            '<button class="chip" data-open-drawer="true" type="button">Open Drawer</button>' +
            '<button class="chip" data-rename-thread="' + esc(merged.id || "") + '" data-current-title="' + esc(merged.title || "") + '" type="button">Rename</button>' +
            '<button class="chip" data-open-codex-editor="' + esc(merged.id || "") + '" type="button">Open in Editor</button>' +
            '<button class="chip" data-codex-thread="' + esc(merged.id || "") + '" type="button">Sidebar Codex</button>' +
            (autoLoop && autoLoop.lastLogPath ? '<button class="chip" data-open-log="' + esc(autoLoop.lastLogPath) + '" type="button">Loop Log</button>' : '') +
            '<button class="chip" data-subtab-shortcut="history" type="button">History</button>' +
            '<button class="chip" data-subtab-shortcut="console" type="button">Console</button>' +
          '</div>' +
        '</div>' +
        memoryShortcutRow +
        '<div class="spotlight-metrics">' +
          '<div class="spotlight-stat"><div class="spotlight-stat-label">Updated</div><div class="spotlight-stat-value">' + esc(merged.updated_at_iso || merged.updated_age || "-") + '</div></div>' +
          '<div class="spotlight-stat"><div class="spotlight-stat-label">Progress</div><div class="spotlight-stat-value">' + esc(progress.percent !== undefined ? (String(progress.percent) + "%") : progress.label) + '</div></div>' +
          '<div class="spotlight-stat"><div class="spotlight-stat-label">Codex Link</div><div class="spotlight-stat-value">' + esc(linkLabel) + '</div></div>' +
          '<div class="spotlight-stat"><div class="spotlight-stat-label">Process</div><div class="spotlight-stat-value">' + esc((merged.process && merged.process.summary) || "No live process") + '</div></div>' +
          '<div class="spotlight-stat"><div class="spotlight-stat-label">Auto Loop</div><div class="spotlight-stat-value">' + esc(loopMeta.label) + '</div></div>' +
          '<div class="spotlight-stat"><div class="spotlight-stat-label">Commands</div><div class="spotlight-stat-value">' + esc(String(merged.user_command_count || 0)) + '</div></div>' +
          '<div class="spotlight-stat"><div class="spotlight-stat-label">Compactions</div><div class="spotlight-stat-value">' + esc(String(merged.compaction_count || 0)) + '</div></div>' +
        '</div>' +
        '<div class="spotlight-log-cue">' +
          '<div class="spotlight-log-head"><span class="spotlight-log-title">Recent Log</span><span class="spotlight-log-meta">' + esc(latestLog ? ((latestLog.level || "INFO") + " · " + (latestLog.ts_iso || "now")) : "No preview log yet") + '</span></div>' +
          '<div class="spotlight-log-copy">' + esc(latestLog ? short(latestLog.message || latestLog.target || "Recent log event", 180) : "Use Console for the full live stream when this thread starts emitting logs.") + '</div>' +
        '</div>' +
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
          const phaseClass = phaseClassFor(phase.label).trim();
          const status = effectiveThreadStatus(thread);
          const logs = (thread.preview_logs || []).slice(0, 4);
          cards.push(
            '<div class="timeline-card ' + esc(phaseClass) + '">' +
              '<div class="timeline-header"><div class="timeline-title-wrap">' + renderThemeVisual(phaseArtFor(phase.label), "timeline-phase-art", phase.label, "timeline") + '<div class="timeline-title">' + esc(short(thread.title || thread.id || "Running thread", 56)) + '</div></div>' + statusBadge(status) + '</div>' +
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

      function renderInterventionDock(threads) {
        if (!threads.length) return "";
        const summary = threads.length === 1
          ? "1 urgent card is waiting for input while the dock stays collapsed."
          : (threads.length + " urgent cards are waiting for input while the dock stays collapsed.");
        return '<div class="intervention-head"><div class="intervention-title">' + renderThemeVisual(MEDIA.intervention, "intervention-art", "Testing", "intervention") + '<div class="phase-head"><span class="phase-label">Needs Human</span><span class="meta-pill">' + esc(String(threads.length)) + ' urgent</span></div></div><div class="intervention-actions"><button class="chip" data-toggle-intervention="true" type="button">' + esc(state.ui.interventionCollapsed ? "Expand" : "Collapse") + '</button></div></div>' +
          '<div class="intervention-dock-summary">' + esc(summary) + '</div>' +
          '<div class="intervention-dock-note">These cards need input, approval, login, credentials, or another manual step.</div>' +
          '<div class="intervention-dock-grid">' + renderRunningBoard(threads, { locked: true, compact: true }) + '</div>';
      }

      function renderRunningBoard(boardThreads, options = {}) {
        const placementState = buildBoardPlacements(boardThreads, options);
        const ordered = placementState.ordered;
        return ordered.map((thread) => {
          const progress = extractThreadProgress(thread);
          const phase = inferCodexPhase(thread);
          const intervention = needsHumanIntervention(thread);
          const linkMeta = codexLinkMeta(thread.id);
          const linkBadge = codexLinkBadge(thread.id);
          const autoLoop = ((state.payload && state.payload.autoContinueConfigs) || {})[thread.id];
          const savedSize = getRunningCardSize(thread.id);
          const size = options.compact ? "tiny" : savedSize;
          const isLoopPanelOpen = state.ui.loopPanelThreadId === thread.id;
          const isTiny = !options.compact && size === "tiny";
          const isCompactTiny = options.compact && size === "tiny";
          const quickPrompt = state.ui.quickComposerDrafts[thread.id] || "continue";
          const isQuickComposerOpen = state.ui.quickComposerThreadId === thread.id;
          const status = effectiveThreadStatus(thread);
          const lastResult = autoLoop && autoLoop.lastResult ? autoLoop.lastResult : undefined;
          const loopStatusCard = autoLoop && (size === "m" || size === "l")
            ? (
                '<div class="loop-status-card">' +
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
                '</div>'
              )
            : "";
          const codexClass = linkMeta.isFocused ? " codex-card-focused" : "";
          const interventionClass = intervention ? " intervention-card" : "";
          const pinnedClass = isPinned(thread.id) ? " pinned-card" : "";
          const runningClass = status === "running" ? " running-live" : "";
          const attachedClass = (thread.board_source === "attached" || thread.board_source === "linked" || status === "attached" || status === "linked") && !runningClass ? " board-attached" : "";
          const phaseClass = phaseClassFor(phase.label);
          const dropClass = state.runningDropIndicator && state.runningDropIndicator.threadId === thread.id
            ? (state.runningDropIndicator.position === "after" ? " drop-after" : " drop-before")
            : "";
          const draggable = options.locked || options.compact || state.ui.layoutLocked ? "false" : "true";
          const placement = options.compact ? undefined : placementState.placements.get(thread.id);
          const layout = options.compact ? { cols: 1, height: 156 } : getRunningCardLayout(thread.id, size);
          const cardStyle = options.compact
            ? ' style="grid-column: span ' + esc(String(layout.cols)) + '; min-height:' + esc(String(layout.height)) + 'px; height:auto;"'
            : ' style="grid-column: ' + esc(String((placement && placement.col) || 1)) + ' / span ' + esc(String((placement && placement.cols) || layout.cols)) + '; grid-row: ' + esc(String((placement && placement.row) || 1)) + ' / span ' + esc(String((placement && placement.rows) || layoutHeightToRows(layout.height, { gap: 12, rowHeight: 18 }))) + '; min-height:' + esc(String((placement && placement.height) || layout.height)) + 'px; height:' + esc(String((placement && placement.height) || layout.height)) + 'px;"';
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
          const titleMax = size === "l" ? 120 : size === "m" ? 88 : size === "s" ? 58 : 34;
          const showRichPhase = size === "m" || size === "l";
          const showProgress = size !== "tiny";
          const showPreview = size === "m" || size === "l";
          const rootCue = thread.cwd
            ? '<div class="running-card-path-row">' + renderRootIdentityPill(thread.cwd) + '</div>'
            : '';
          const compactTitlebar = options.compact
            ? (
                '<div class="compact-card-titlebar">' +
                  '<div class="compact-card-title">' + esc(short(thread.title || thread.id || "Running agent", 96)) + '</div>' +
                  '<button class="tool-btn' + (isQuickComposerOpen ? ' primary' : '') + '" data-open-composer="' + esc(thread.id) + '" data-current-prompt="' + esc(quickPrompt) + '" type="button">' + renderToolIcon('prompt') + '<span>Prompt</span></button>' +
                  '<button class="tool-btn codex-link primary" data-codex-thread="' + esc(thread.id) + '" type="button">' + renderToolIcon('codex') + '<span>Codex</span></button>' +
                '</div>'
              )
            : '';
          const conversationStats = (size === "m" || size === "l")
            ? '<div class="running-card-note">Commands ' + esc(String(thread.user_command_count || 0)) + ' · Compactions ' + esc(String(thread.compaction_count || 0)) + '</div>'
            : '';
          const bodyInner = size === "l"
            ? (
                '<div class="running-card-copy">' +
                  '<div class="running-card-title">' + esc(short(thread.title || thread.id || "Running agent", titleMax)) + '</div>' +
                  rootCue +
                  '<div class="running-card-subtitle">' + esc(subtitle) + '</div>' +
                  '<div class="preview">' + esc(preview) + '</div>' +
                  conversationStats +
                  loopStatusCard +
                '</div>' +
                '<div class="running-card-side">' +
                  '<div class="phase-panel"><div class="phase-head"><span class="phase-title">' + renderThemeVisual(phaseArtFor(phase.label), "phase-art", phase.label, "phase") + '<span class="phase-label">' + esc(phase.label) + '</span></span><span class="meta-pill">' + esc(linkMeta.isFocused ? "Focused" : (linkMeta.isOpen ? "Linked" : "Inferred")) + '</span></div><div class="phase-copy">' + esc(phase.copy) + '</div></div>' +
                  '<div class="progress-head"><span class="progress-label">' + esc(progress.label) + '</span><span class="progress-value">' + esc(progress.percent !== undefined ? (String(progress.percent) + "%") : status) + '</span></div>' +
                  '<div class="progress-track"><div class="progress-bar" style="width:' + esc(String(progress.percent !== undefined ? progress.percent : 18)) + '%"></div></div>' +
                  '<div class="running-card-note">' + esc(progress.note) + '</div>' +
                '</div>'
              )
            : (
                '<div class="running-card-title">' + esc(short(thread.title || thread.id || "Running agent", titleMax)) + '</div>' +
                rootCue +
                '<div class="running-card-subtitle">' + esc(subtitle) + '</div>' +
                (showPreview ? '<div class="preview">' + esc(preview) + '</div>' : '') +
                conversationStats +
                (showRichPhase
                  ? '<div class="phase-panel"><div class="phase-head"><span class="phase-title">' + renderThemeVisual(phaseArtFor(phase.label), "phase-art", phase.label, "phase") + '<span class="phase-label">' + esc(phase.label) + '</span></span><span class="meta-pill">' + esc(linkMeta.isFocused ? "Focused" : (linkMeta.isOpen ? "Linked" : "Inferred")) + '</span></div><div class="phase-copy">' + esc(phase.copy) + '</div></div>'
                  : '') +
                loopStatusCard +
                (showProgress
                  ? '<div class="progress-head"><span class="progress-label">' + esc(progress.label) + '</span><span class="progress-value">' + esc(progress.percent !== undefined ? (String(progress.percent) + "%") : status) + '</span></div>' +
                    '<div class="progress-track"><div class="progress-bar" style="width:' + esc(String(progress.percent !== undefined ? progress.percent : 18)) + '%"></div></div>' +
                    '<div class="running-card-note">' + esc(progress.note) + '</div>'
                  : '')
              );
          return '<article class="running-card size-' + esc(size) + (size === "tiny" ? ' fixed-tiny' : '') + (options.compact ? ' compact-card' : '') + runningClass + codexClass + interventionClass + pinnedClass + attachedClass + phaseClass + dropClass + '" data-running-card="' + esc(thread.id) + '" data-grid-col="' + esc(String((placement && placement.col) || 1)) + '" data-grid-row="' + esc(String((placement && placement.row) || 1)) + '" draggable="' + esc(draggable) + '"' + cardStyle + '>' +
            '<div class="running-card-topbar"></div>' +
            '<div class="running-card-bottom-line"></div>' +
            '<div class="drop-slot left"></div>' +
            '<div class="drop-slot right"></div>' +
            (!options.compact ? '<div class="resize-handle nw" data-resize-card="' + esc(thread.id) + '" data-resize-corner="nw"></div><div class="resize-handle ne" data-resize-card="' + esc(thread.id) + '" data-resize-corner="ne"></div><div class="resize-handle sw" data-resize-card="' + esc(thread.id) + '" data-resize-corner="sw"></div><div class="resize-handle se" data-resize-card="' + esc(thread.id) + '" data-resize-corner="se"></div><div class="resize-handle e" data-resize-card="' + esc(thread.id) + '" data-resize-corner="e"></div><div class="resize-handle w" data-resize-card="' + esc(thread.id) + '" data-resize-corner="w"></div><div class="resize-handle n" data-resize-card="' + esc(thread.id) + '" data-resize-corner="n"></div><div class="resize-handle s" data-resize-card="' + esc(thread.id) + '" data-resize-corner="s"></div>' : '') +
            compactTitlebar +
            '<div class="running-card-top">' +
              '<div class="running-card-control">' +
                '<div class="control-label left">Status</div>' +
                '<div class="running-card-badges">' +
                  statusBadge(status) +
                  boardBadge(thread) +
                  (intervention ? '<span class="badge badge-intervention">Needs Input</span>' : '') +
                  linkBadge +
                '</div>' +
              '</div>' +
              '<div class="running-card-control">' +
                '<div class="control-label">Card Size</div>' +
                '<div class="size-switch">' +
                  '<button class="size-chip' + (size === "tiny" ? ' active' : '') + '" data-card-size="' + esc(thread.id) + '" data-card-size-value="tiny" type="button"' + (state.ui.layoutLocked ? ' disabled' : '') + '>T</button>' +
                  '<button class="size-chip' + (size === "s" ? ' active' : '') + '" data-card-size="' + esc(thread.id) + '" data-card-size-value="s" type="button"' + (state.ui.layoutLocked ? ' disabled' : '') + '>S</button>' +
                  '<button class="size-chip' + (size === "m" ? ' active' : '') + '" data-card-size="' + esc(thread.id) + '" data-card-size-value="m" type="button"' + (state.ui.layoutLocked ? ' disabled' : '') + '>M</button>' +
                  '<button class="size-chip' + (size === "l" ? ' active' : '') + '" data-card-size="' + esc(thread.id) + '" data-card-size-value="l" type="button"' + (state.ui.layoutLocked ? ' disabled' : '') + '>L</button>' +
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
              (autoLoop
                ? '<div class="meta-pill">Auto ' + esc(String(autoLoop.remaining)) + '/' + esc(String(autoLoop.total || autoLoop.remaining)) + ' · ' + esc(short(autoLoop.prompt || "continue", 18)) + '</div>'
                : '') +
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
                        '<button class="tool-btn codex-link primary" data-codex-thread="' + esc(thread.id) + '" type="button">' + renderToolIcon('codex') + '<span>Codex</span></button>'
                      )
                    : (
                        '<button class="tool-btn" data-rename-thread="' + esc(thread.id) + '" data-current-title="' + esc(thread.title || "") + '" type="button">' + renderToolIcon('rename') + '<span>Rename</span></button>' +
                        '<button class="tool-btn primary" data-open-codex-editor="' + esc(thread.id) + '" type="button">' + renderToolIcon('open') + '<span>Editor</span></button>' +
                        '<button class="tool-btn' + (isQuickComposerOpen ? ' primary' : '') + '" data-open-composer="' + esc(thread.id) + '" data-current-prompt="' + esc(quickPrompt) + '" type="button">' + renderToolIcon('prompt') + '<span>Prompt</span></button>' +
                        '<button class="tool-btn" data-codex-thread="' + esc(thread.id) + '" type="button">' + renderToolIcon('codex') + '<span>Codex</span></button>' +
                        '<button class="tool-btn board' + (isBoardAttached(thread.id) ? ' attached' : '') + '" data-board-attach="' + esc(thread.id) + '" type="button">' + renderToolIcon('board') + '<span>' + (isBoardAttached(thread.id) ? 'Attached' : 'Board') + '</span></button>' +
                        '<button class="tool-btn' + (autoLoop ? ' primary' : '') + '" data-auto-loop="' + esc(thread.id) + '" data-auto-prompt="' + esc((autoLoop && autoLoop.prompt) || "continue") + '" data-auto-count="' + esc(String((autoLoop && autoLoop.remaining) || 10)) + '" type="button">' + renderToolIcon('codex') + '<span>' + (autoLoop ? ('Loop ' + autoLoop.remaining) : 'Loop') + '</span></button>' +
                        '<button class="tool-btn pin' + (isPinned(thread.id) ? ' pinned' : '') + '" data-pin-thread="' + esc(thread.id) + '" type="button">' + renderToolIcon('pin', isPinned(thread.id)) + '<span>' + (isPinned(thread.id) ? 'Pinned' : 'Pin') + '</span></button>' +
                        (autoLoop ? '<button class="tool-btn" data-clear-auto-loop="' + esc(thread.id) + '" type="button">Stop Loop</button>' : '')
                      )) +
                '</div>' +
              '</div>' +
              ((isTiny || isCompactTiny) ? '' : (
                '<div class="running-card-control">' +
                  '<div class="control-label">Thread Id</div>' +
                  '<span class="tool-id mono">' + esc(short(thread.id, 24)) + '</span>' +
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
        const linkLabel = linkMeta.isFocused ? "Focused in Codex" : (linkMeta.isOpen ? "Open in Codex" : (linkMeta.pending ? "Linking to Codex" : "Not linked"));
        const visibilityLabel = codexVisibilityLabel(Object.assign({}, summary, thread), payload);
        const phase = inferCodexPhase(Object.assign({}, summary, thread));
        const phaseClass = phaseClassFor(phase.label).trim();
        const pendingDrawerAction = state.ui.pendingDrawerAction && state.ui.pendingDrawerAction.threadId === (thread.id || "")
          ? state.ui.pendingDrawerAction
          : undefined;
        if (state.ui.pendingDrawerAction && !pendingDrawerAction) {
          clearPendingDrawerAction();
        }
        const confirmMeta = pendingDrawerAction ? getDrawerConfirmMeta(pendingDrawerAction.action) : undefined;
        drawer.classList.add("open");
        backdrop.classList.add("open");
        title.textContent = thread.title || thread.id || "Thread detail";
        meta.innerHTML = [
          statusBadge(summary.status || thread.status || "idle"),
          renderPhaseChip(phase),
          codexLinkBadge(thread.id, payload),
          '<span class="meta-pill mono">' + esc(thread.id || "") + '</span>',
          (thread.model || summary.model) ? '<span class="meta-pill">' + esc(thread.model || summary.model) + '</span>' : '',
          (thread.reasoning_effort || summary.reasoning_effort) ? '<span class="meta-pill">' + esc(thread.reasoning_effort || summary.reasoning_effort) + '</span>' : ''
        ].join("");
        summaryNode.innerHTML = [
          drawerStat("Updated", summary.updated_age || thread.updated_at_iso || "-"),
          drawerStat("Last Log", summary.log_age || (logs[0] && logs[0].age) || "-"),
          drawerStat("Phase", phase.label),
          drawerStat("Visibility", visibilityLabel),
          drawerStat("Codex Link", linkLabel),
          drawerStat("Process", processText),
          drawerStat("Commands", String(thread.user_command_count || summary.user_command_count || 0)),
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
                    renderQuickActionButton("rename", "Rename", "secondary", thread.id || "", thread.title || ""),
                    renderQuickActionButton("open_editor", "Open in Editor", "secondary", thread.id || "", ""),
                    renderQuickActionButton("sidebar", "Sidebar Codex", "secondary", thread.id || "", ""),
                    renderActionButton("restore", "Restore", "secondary", "RS", thread.id || ""),
                    renderActionButton("hard_delete", "Hard Delete", "danger", "HD", thread.id || ""),
                    '<span class="action-status">' + esc(actionNotice || '') + '</span>'
                  ]
                : [
                    renderQuickActionButton("rename", "Rename", "secondary", thread.id || "", thread.title || ""),
                    renderQuickActionButton("show_in_codex", "Show in Editor", "secondary", thread.id || "", thread.title || ""),
                    renderQuickActionButton("sidebar", "Sidebar Codex", "secondary", thread.id || "", ""),
                    renderActionButton(isArchived ? "unarchive" : "archive", isArchived ? "Unarchive" : "Hide from Codex", "secondary", isArchived ? "UA" : "AR", thread.id || ""),
                    renderActionButton("soft_delete", "Soft Delete", "warn", "SD", thread.id || ""),
                    renderActionButton("hard_delete", "Hard Delete", "danger", "HD", thread.id || ""),
                    '<span class="action-status">' + esc(actionNotice || '') + '</span>'
                  ]
            ).join("");
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
              kv("Commands", String(thread.user_command_count || summary.user_command_count || 0)) +
              kv("Compactions", String(thread.compaction_count || summary.compaction_count || 0)) +
              kv("Provider", thread.model_provider || summary.model_provider || "-") +
              kv("CLI", thread.cli_version || summary.cli_version || "-") +
              kv("Tokens", String(summary.tokens_used || thread.tokens_used || 0)) +
              kv("Approval", thread.approval_mode || summary.approval_mode || "-") +
            '</div>' +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Commands", "CM") +
            '<div class="cmd-grid">' +
              renderCommandCard("Resume in Terminal", resumeCommand, "Resume", thread.id || "") +
              renderCommandCard("Fork in Terminal", forkCommand, "Fork", thread.id || "") +
            '</div>' +
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
            if (action === "rename") {
              vscode.postMessage({ type: "renameThread", threadId, currentTitle: node.dataset.quickTitle || "" });
              return;
            }
            if (action === "open_editor") {
              markCodexLinking(threadId, "editor");
              render(state.payload);
              vscode.postMessage({ type: "openInCodexEditor", threadId });
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

      function renderCommandCard(label, command, commandLabel, threadId) {
        const available = Boolean(command);
        const feedback = state.ui.commandFeedback[commandFeedbackKey(threadId, commandLabel)];
        return '<div class="cmd-card' + (available ? '' : ' unavailable') + '">' +
          '<div class="cmd-head"><span class="cmd-headline">' + renderIconBadge(commandLabel === "Resume" ? "RS" : "FK") + '<span class="cmd-name">' + esc(label) + '</span></span><span class="meta-pill mono">' + esc(commandLabel) + '</span></div>' +
          '<div class="cmd-subhead"><span class="cmd-hint">' + esc(available ? 'Ready for terminal or clipboard' : 'Unavailable for this thread') + '</span>' +
            (feedback ? '<span class="cmd-feedback' + (feedback.tone === "success" ? ' success' : '') + '">' + esc(feedback.message) + '</span>' : '') +
          '</div>' +
          '<div class="code-line' + (available ? '' : ' empty') + '">' + esc(command || "No command available.") + '</div>' +
          '<div class="cmd-actions">' +
            '<button class="action-btn secondary" data-run-command="' + esc(command || "") + '" data-command-label="' + esc(commandLabel) + '" data-command-thread="' + esc(threadId || "") + '" type="button"' + (available ? '' : ' disabled') + '>Run in Terminal</button>' +
            '<button class="action-btn secondary" data-copy-command="' + esc(command || "") + '" data-command-label="' + esc(commandLabel) + '" data-command-thread="' + esc(threadId || "") + '" type="button"' + (available ? '' : ' disabled') + '>Copy Command</button>' +
          '</div>' +
        '</div>';
      }

      function render(payload) {
        if (!payload) return;
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
        document.body.classList.toggle("motion-reduced", !state.ui.motionEnabled);
        document.body.classList.remove("theme-mode-pure", "theme-mode-clean", "theme-mode-vivid");
        document.body.classList.add("theme-mode-" + themeMode());

        document.getElementById("baseUrl").textContent = "Base URL: " + (service.baseUrl || "-");
        const topbar = document.querySelector(".topbar");
        topbar.classList.remove("mode-expanded", "mode-collapsed", "mode-ultra");
        topbar.classList.add("mode-" + (state.ui.headerMode || "expanded"));
        document.getElementById("surfaceLabel").textContent = "Position: " + ({
          left: "Left",
          bottom: "Bottom",
          editor: "Editor",
          fullscreen: "Fullscreen"
        }[state.currentSurface] || "Editor");
        document.getElementById("serviceMeta").textContent =
          "Service: " + (!service.ok ? "Degraded" : (service.autoStarted ? "Auto-started" : "Connected")) +
          " · Last refresh: " + formatTimestamp(payload.lastSuccessfulRefreshAt);
        const threadCount = (dashboard.threads || []).length;
        const effectiveRunningThreads = (dashboard.runningThreads || []).filter((thread) => effectiveThreadStatus(thread, payload) === "running");
        const runningCount = effectiveRunningThreads.length;
        const boardThreads = getBoardThreads(dashboard, payload);
        const interventionThreads = boardThreads.filter((thread) => needsHumanIntervention(thread));
        if (interventionThreads.length && state.lastInterventionCount === 0 && state.ui.interventionCollapsed) {
          state.ui.interventionCollapsed = false;
          persistUi();
        }
        state.lastInterventionCount = interventionThreads.length;
        const regularBoardThreads = boardThreads.filter((thread) => !needsHumanIntervention(thread));
        const attachedOnlyCount = boardThreads.filter((thread) => ["attached", "linked"].includes(thread.board_source || "") && effectiveThreadStatus(thread, payload) !== "running").length;
        const serviceBanner = document.getElementById("serviceBanner");
        const restartButton = document.getElementById("restartServer");
        document.getElementById("heroSummary").textContent =
          !service.ok
            ? "Local service unavailable. The panel is in degraded mode until the server recovers."
            : threadCount
              ? (threadCount + " threads loaded" + (runningCount ? " · " + runningCount + " running" : ""))
              : "Connected to the local service, but no threads were returned yet.";
        serviceBanner.className = "service-banner" + (service.ok ? "" : " visible");
        serviceBanner.innerHTML = service.ok
          ? ""
          : (
              'Degraded state: ' + esc(service.message || "Server not reachable") + '. Use Restart 8787 to retry loading thread data.' +
              (service.logPath ? (' <button class="chip" data-open-log="' + esc(service.logPath) + '" type="button">Open Service Log</button>') : '')
            );
        restartButton.hidden = service.ok;
        restartButton.disabled = service.ok;

        [
          ["posLeft", "left"],
          ["posBottom", "bottom"],
          ["posEditor", "editor"],
          ["posFullscreen", "fullscreen"]
        ].forEach(([id, surface]) => {
          document.getElementById(id).classList.toggle("active", state.currentSurface === surface);
        });
        document.querySelectorAll("[data-view]").forEach((node) => {
          node.classList.toggle("active", node.dataset.view === state.ui.currentView);
        });
        document.querySelectorAll("[data-workspace-pane]").forEach((node) => {
          node.classList.toggle("active", node.dataset.workspacePane === state.ui.currentView);
        });
        const soundToggle = document.getElementById("soundToggle");
        soundToggle.classList.toggle("active", state.ui.soundEnabled);
        soundToggle.textContent = state.ui.soundEnabled ? "Alert Sound On" : "Alert Sound Off";
        const themeToggle = document.getElementById("themeToggle");
        themeToggle.classList.add("active");
        themeToggle.textContent = "Theme: " + ({
          pure: "Pure",
          clean: "Clean",
          vivid: "Vivid"
        }[themeMode()] || "Vivid");
        const motionToggle = document.getElementById("motionToggle");
        motionToggle.classList.toggle("active", state.ui.motionEnabled);
        motionToggle.textContent = state.ui.motionEnabled ? "Motion On" : "Motion Off";
        document.getElementById("toggleHeaderCollapse").textContent =
          state.ui.headerMode === "expanded"
            ? "Compact"
            : state.ui.headerMode === "collapsed"
              ? "Ultra"
              : "Expand";

        const searchInput = document.getElementById("threadSearch");
        if (searchInput.value !== state.ui.search) searchInput.value = state.ui.search;
        const searchMirror = document.getElementById("threadSearchMirror");
        if (searchMirror.value !== state.ui.search) searchMirror.value = state.ui.search;
        document.querySelectorAll("[data-filter]").forEach((node) => {
          node.classList.toggle("active", node.dataset.filter === state.ui.filter);
        });
        document.querySelectorAll("[data-filter-mirror]").forEach((node) => {
          node.classList.toggle("active", node.dataset.filterMirror === state.ui.filter);
        });
        document.querySelectorAll("[data-sort]").forEach((node) => {
          node.classList.toggle("active", node.dataset.sort === state.ui.sort);
        });
        document.querySelectorAll("[data-toggle='pinned']").forEach((node) => {
          node.classList.toggle("active", state.ui.pinnedOnly);
        });
        document.querySelectorAll("[data-toggle-mirror='pinned']").forEach((node) => {
          node.classList.toggle("active", state.ui.pinnedOnly);
        });

        document.getElementById("statusLine").innerHTML =
          '<span class="' + (service.ok ? 'service-ok' : 'service-bad') + '">' +
          esc(service.ok ? (service.autoStarted ? 'Connected · auto-started' : 'Connected') : 'Disconnected') +
          "</span>" +
          " · " + esc(service.message || "") +
          (service.logPath ? " · log: " + esc(service.logPath) : "");

        const counts = (dashboard.threadsMeta && dashboard.threadsMeta.counts) || {};
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
        const existingIds = new Set((dashboard.threads || []).map((thread) => thread.id));
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
        document.getElementById("metrics").innerHTML = [
          metric("Visible", visibleCount, freshestThread ? inferCodexPhase(freshestThread).label : "Waiting", freshestThread ? phaseArtFor(inferCodexPhase(freshestThread).label) : MEDIA.hero),
          metric("Running", runningCount || 0, runningCount ? "Editing" : "Waiting", runningCount ? MEDIA.timeline : MEDIA.rest),
          metric("Archived", counts.archived || 0, "Tooling", MEDIA.board),
          metric("Soft Deleted", (dashboard.threadsMeta && dashboard.threadsMeta.soft_deleted_total) || 0, "Waiting", MEDIA.rest)
        ].join("");
        document.getElementById("overviewDigest").innerHTML = [
          renderSummaryCard(
            "Newest Activity",
            short((freshestThread && freshestThread.title) || "No visible thread", 48),
            (freshestThread && freshestThread.updated_at_iso) || "Waiting for thread activity",
            freshestThread ? inferCodexPhase(freshestThread).label : "Waiting",
            freshestThread ? phaseArtFor(inferCodexPhase(freshestThread).label) : MEDIA.rest
          ),
          renderSummaryCard(
            "Board Focus",
            String(boardThreads.length || 0),
            boardThreads.length ? (attachedOnlyCount ? attachedOnlyCount + " attached · " : "") + runningCount + " live cards on the board." : "Attach important agents to keep them visible.",
            "Planning",
            MEDIA.board
          ),
          renderSummaryCard(
            "Live Health",
            runningCount ? (String(runningCount) + " active") : "Quiet",
            runningCount ? "Live pane tracks progress, timeline, and completion alerts." : "No active agents right now.",
            runningCount ? "Tooling" : "Waiting",
            runningCount ? MEDIA.timeline : MEDIA.rest
          )
        ].join("");
        document.getElementById("usageSummary").innerHTML = insights ? [
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
        ].join("") : renderCuteEmpty("Usage report unavailable", "The dashboard can still work without the persisted report, but the summary will appear after the insights endpoint responds.", MEDIA.rest);
        document.getElementById("usageReportNote").textContent =
          insightsSource === "persisted"
            ? ("Showing the persisted local report from " + formatFreshnessTimestamp(insights && insights.report_persisted_at) + " while the live insights endpoint is unavailable." + persistedFallbackStaleSuffix)
            : insightsSource === "session-cache"
              ? ("Showing the last usable report from this session, captured " + formatFreshnessTimestamp(state.lastInsightsCapturedAt) + ", while the current refresh is missing insights data." + persistedFallbackStaleSuffix)
              : "A persisted local reading of your thread habits, pacing, and workflow style.";
        document.getElementById("usageKeywords").innerHTML = insights && Array.isArray(insights.keywords) && insights.keywords.length
          ? insights.keywords.slice(0, 8).map((item) => renderKeywordChip(item)).join("")
          : '<span class="sub">暂无高频关键词</span>';
        document.getElementById("vibeAdviceNote").textContent = renderVibeAdviceEvidence(insights);
        document.getElementById("vibeAdvice").innerHTML = insights && insights.guidance && Array.isArray(insights.guidance.vibe_coding_suggestions)
          ? insights.guidance.vibe_coding_suggestions.map((item, index) => renderInsightCard("Advice " + (index + 1), item, "Vibe Coding")).join("")
          : renderInsightCard("Advice", "还没有生成个性化建议，等本地报告生成后这里会显示。", "Pending");
        document.getElementById("analysisViews").innerHTML = insights && Array.isArray(insights.analysis_views)
          ? insights.analysis_views.slice(0, 4).map((item) => renderInsightCard(item.title || "Analysis", item.description || "", item.signal || "")).join("")
          : "";
        document.getElementById("weeklyShift").innerHTML = renderWeeklyShift(insights);
        document.getElementById("wordCloud").innerHTML = renderWordCloud(insights && insights.word_cloud);
        document.getElementById("topicMap").innerHTML = renderTopicMap(insights && insights.topic_map, topicFocus);
        document.getElementById("overviewRail").innerHTML = (pinnedThreads.length ? pinnedThreads : effectiveRunningThreads.slice(0, 2)).map((thread) => {
          const status = effectiveThreadStatus(thread, payload);
          return '<div class="mini-thread with-art">' +
            renderThemeVisual(MEDIA.hero, "mini-thread-art", "Planning", "mini") +
            statusBadge(status) +
            '<div class="mini-thread-title">' + esc(short(thread.title || thread.id || "Thread", 56)) + '</div>' +
            '<div class="mini-thread-meta">' + esc(short(thread.cwd || "-", 64)) + '</div>' +
          '</div>';
        }).join("") || renderCuteEmpty("No spotlight yet", "Pin a thread or let one start running and it will show up here.", MEDIA.hero);
        const completionRail = document.getElementById("completionRail");
        completionRail.className = "completion-rail" + (recentCompletions.length ? " visible" : "");
        completionRail.innerHTML = recentCompletions.map((item) => {
          return '<div class="completion-card">' +
            '<div class="completion-head">' +
              '<span class="badge badge-running">Completed</span>' +
              '<span class="completion-meta">' + esc(item.updatedAt || "") + '</span>' +
            '</div>' +
            '<div class="completion-title">' + esc(short(item.title || item.threadId || "Thread complete", 68)) + '</div>' +
            '<div class="completion-meta">' + esc(item.status || "recent") + ' · click the thread list to inspect details</div>' +
          '</div>';
        }).join("");
        document.getElementById("runningSummary").textContent =
          effectiveRunningThreads.length
            ? (effectiveRunningThreads.length + " active thread" + (effectiveRunningThreads.length > 1 ? "s" : ""))
            : "No live agents currently running.";
        document.getElementById("runningSummaryMirror").textContent = document.getElementById("runningSummary").textContent;
        const boardSizeGuide = "Size guide: T focus, S progress, M preview, L full detail.";
        const boardMetaText = boardThreads.length
          ? ("Dedicated board · " + boardThreads.length + " card" + (boardThreads.length > 1 ? "s" : "") + " · " + runningCount + " running · " + attachedOnlyCount + " attached · " + interventionThreads.length + " needs human" + (state.ui.layoutLocked ? " · layout locked" : "") + " · " + boardSizeGuide)
          : ("No cards yet. Attach threads from the explorer, or wait for a running agent to appear automatically. " + boardSizeGuide);
        document.getElementById("runningBoardMeta").textContent = boardMetaText;
        document.getElementById("runningBoardMetaPrimary").textContent = boardMetaText;
        const lockButtonPrimary = document.getElementById("toggleLayoutLockPrimary");
        lockButtonPrimary.classList.toggle("active", state.ui.layoutLocked);
        lockButtonPrimary.textContent = state.ui.layoutLocked ? "Unlock Layout" : "Lock Layout";
        document.getElementById("boardSummaryHeadline").textContent = boardThreads.length
          ? (boardThreads.length + " cards live on the dedicated board")
          : "No cards on the board yet.";
        document.getElementById("boardSummaryStats").innerHTML = [
          drawerStat("Cards", String(boardThreads.length || 0)),
          drawerStat("Running", String(runningCount || 0)),
          drawerStat("Attached", String(attachedOnlyCount || 0)),
          drawerStat("Needs Human", String(interventionThreads.length || 0)),
          drawerStat("Layout", state.ui.layoutLocked ? "Locked" : "Editable")
        ].join("");
        document.getElementById("boardSummaryNeedsHuman").textContent = interventionThreads.length
          ? (interventionThreads.length + " urgent card" + (interventionThreads.length > 1 ? "s need" : " needs") + " attention.")
          : "No urgent cards right now.";
        document.getElementById("boardSummaryQueue").innerHTML = interventionThreads.slice(0, 4).map((thread) => {
          return '<div class="mini-thread with-art">' +
            renderThemeVisual(MEDIA.intervention, "mini-thread-art", "Testing", "mini") +
            statusBadge(effectiveThreadStatus(thread, payload)) +
            '<div class="mini-thread-title">' + esc(short(thread.title || thread.id || "Thread", 44)) + '</div>' +
            '<div class="mini-thread-meta">' + esc(short(thread.cwd || "-", 52)) + '</div>' +
          '</div>';
        }).join("") || renderCuteEmpty("No urgent cards", "Needs Human threads will surface here while layout stays focused in the Board workspace.", MEDIA.rest);
        const threadSummaryMarkup = renderThreadSummaryMarkup(visibleCount, (dashboard.threads || []).length, topicFocus, state.ui.sort, state.ui.rootFilter);
        document.getElementById("threadSummary").innerHTML = threadSummaryMarkup;
        document.getElementById("threadSummaryMirror").innerHTML = threadSummaryMarkup;
        scrollPendingThreadIntoView();
        const batchBar = document.getElementById("batchBar");
        const pendingMeta = pendingBatch ? getBatchActionMeta(pendingBatch.action) : undefined;
        const batchToneClass = pendingMeta && pendingMeta.tone === "danger" ? " danger" : "";
        batchBar.className = "batch-bar" + (filteredThreads.length ? " visible" : "") + (pendingBatch ? " confirm" + batchToneClass : "");
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
                '<button class="chip" data-batch-clear="true" type="button">Clear</button>',
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
        batchBar.innerHTML = batchMarkup;
        document.getElementById("batchBarMirror").className = batchBar.className;
        document.getElementById("batchBarMirror").innerHTML = batchMarkup;

        const runningMarkup = effectiveRunningThreads.map((thread) => {
          const progress = extractThreadProgress(thread);
          const linkMeta = codexLinkMeta(thread.id);
          const linkBadge = codexLinkBadge(thread.id);
          const status = effectiveThreadStatus(thread, payload);
          const codexClass = linkMeta.isFocused ? " codex-focused" : (linkMeta.isOpen ? " codex-open" : "");
          return '<div class="running-row' + codexClass + '">' +
            '<div class="row-head">' +
              '<span>' + statusBadge(status) + '</span>' +
              '<span style="display:flex; gap:8px; align-items:center;"><button class="mini-action-btn" data-rename-thread="' + esc(thread.id) + '" data-current-title="' + esc(thread.title || "") + '" type="button">Rename</button><button class="mini-action-btn" data-codex-thread="' + esc(thread.id) + '" type="button">Codex</button>' + linkBadge + '<span class="mono muted">' + esc(thread.id) + '</span></span>' +
            '</div>' +
            '<div class="thread-title">' + esc(short(thread.title || "(no title)", 100)) + '</div>' +
            '<div class="preview">' + esc(short((thread.process && thread.process.summary) || "no live pid", 120)) + '</div>' +
            '<div class="progress-head"><span class="progress-label">' + esc(progress.label) + '</span><span class="progress-value">' + esc(progress.percent !== undefined ? (String(progress.percent) + "%") : status) + '</span></div>' +
            '<div class="progress-track"><div class="progress-bar" style="width:' + esc(String(progress.percent !== undefined ? progress.percent : 18)) + '%"></div></div>' +
            '<div class="progress-note">' + esc(progress.note) + '</div>' +
          '</div>';
        }).join("") || '<div class="empty">No running agents right now.</div>';
        document.getElementById("runningList").innerHTML = runningMarkup;
        document.getElementById("runningListMirror").innerHTML = runningMarkup;
        const runningBoardHtml = renderRunningBoard(regularBoardThreads);
        const interventionHtml = renderInterventionDock(interventionThreads);
        document.getElementById("runningBoardPrimary").innerHTML = runningBoardHtml;
        document.getElementById("interventionDockPrimary").classList.toggle("visible", Boolean(interventionThreads.length));
        document.getElementById("interventionDockPrimary").classList.toggle("collapsed", Boolean(state.ui.interventionCollapsed));
        document.getElementById("interventionDockPrimary").innerHTML = interventionHtml;
        syncRunningDropIndicatorDom();
        document.getElementById("liveTimeline").innerHTML = renderLiveTimeline(effectiveRunningThreads, recentCompletions);
        document.getElementById("memoryCardsPanel").innerHTML = renderMemoryShellGrid();

        const threadMarkup = [
          renderGroup("needs_human", "Needs Human", groups.needs_human),
          renderGroup("running", "Running", groups.running),
          renderGroup("linked", "Linked", groups.linked),
          renderGroup("recent", "Recent", groups.recent),
          renderGroup("idle", "Idle", groups.idle),
          renderGroup("archived", "Archived", groups.archived),
          renderGroup("soft_deleted", "Soft Deleted", groups.soft_deleted)
        ].join("") || '<div class="empty">No threads loaded.</div>';
        document.getElementById("threadList").innerHTML = threadMarkup;
        document.getElementById("threadListMirror").innerHTML = threadMarkup;
        scrollFocusedCodexThreadIntoView(payload);

        document.querySelectorAll("[data-thread-id]").forEach((node) => {
          node.addEventListener("click", () => {
            setSelectedThread(node.dataset.threadId, { openDrawer: true });
            vscode.postMessage({ type: "selectThread", threadId: node.dataset.threadId });
          });
        });
        document.querySelectorAll("[data-select-thread]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleSelected(node.dataset.selectThread);
          });
        });
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
          node.addEventListener("dragstart", (event) => {
            if (event.target && event.target.closest("button, input, textarea, select, [data-resize-card]")) {
              event.preventDefault();
              return;
            }
            if (state.ui.layoutLocked) {
              event.preventDefault();
              return;
            }
            state.draggedRunningThreadId = node.dataset.runningCard;
            state.activeBoardId = node.closest(".running-board-grid")?.id;
            node.classList.add("dragging");
            syncDragBoardState();
            if (event.dataTransfer) {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", state.draggedRunningThreadId || "");
              const preview = createDragPreview(node, state.draggedRunningThreadId);
              event.dataTransfer.setDragImage(preview, 18, 18);
            }
            scheduleDragIndicator(undefined, state.activeBoardId);
          });
          node.addEventListener("dragover", (event) => {
            event.preventDefault();
            if (!state.draggedRunningThreadId || state.draggedRunningThreadId === node.dataset.runningCard) return;
            const board = node.closest(".running-board-grid");
            const target = pointerToBoardCell(board, event.clientX, event.clientY, state.draggedRunningThreadId);
            scheduleDragIndicator(target, board?.id);
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
          });
          node.addEventListener("dragleave", (event) => {
            const board = node.closest(".running-board-grid");
            if (boardContainsPointer(board, event.clientX, event.clientY)) return;
            resetRunningDropIndicator(board?.id);
          });
          node.addEventListener("drop", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const draggedId = state.draggedRunningThreadId || (event.dataTransfer && event.dataTransfer.getData("text/plain")) || "";
            if (!draggedId) return;
            const target = state.runningDropIndicator || pointerToBoardCell(node.closest(".running-board-grid"), event.clientX, event.clientY, draggedId);
            cancelScheduledDragIndicator();
            clearRunningDropIndicator();
            state.draggedRunningThreadId = undefined;
            state.activeBoardId = undefined;
            if (target && target.col && target.row) {
              setRunningCardPosition(draggedId, target.col, target.row);
              render(state.payload);
            }
          });
          node.addEventListener("dragend", () => {
            cancelScheduledDragIndicator();
            cleanupDragPreview();
            state.draggedRunningThreadId = undefined;
            state.activeBoardId = undefined;
            clearRunningDropIndicator();
            document.querySelectorAll("[data-running-card]").forEach((card) => {
              card.classList.remove("dragging");
            });
            document.querySelectorAll(".running-board-grid").forEach((board) => board.classList.remove("drag-over", "drag-end", "drag-active"));
            syncRunningDropIndicatorDom();
          });
        });
        document.querySelectorAll(".running-board-grid").forEach((runningBoard) => {
          runningBoard.addEventListener("dragover", (event) => {
            if (state.ui.layoutLocked) return;
            event.preventDefault();
            const draggedId = state.draggedRunningThreadId || (event.dataTransfer && event.dataTransfer.getData("text/plain")) || "";
            if (!draggedId) return;
            runningBoard.classList.add("drag-over");
            const target = pointerToBoardCell(runningBoard, event.clientX, event.clientY, draggedId);
            scheduleDragIndicator(target, runningBoard.id);
            document.querySelectorAll(".running-board-grid").forEach((board) => {
              if (board !== runningBoard) board.classList.remove("drag-over");
            });
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
          });
          runningBoard.addEventListener("dragleave", (event) => {
            if (boardContainsPointer(runningBoard, event.clientX, event.clientY)) return;
            runningBoard.classList.remove("drag-over", "drag-end");
            resetRunningDropIndicator(runningBoard.id);
          });
          runningBoard.addEventListener("drop", (event) => {
            if (state.ui.layoutLocked) return;
            event.preventDefault();
            const draggedId = state.draggedRunningThreadId || (event.dataTransfer && event.dataTransfer.getData("text/plain")) || "";
            const target = state.runningDropIndicator || pointerToBoardCell(runningBoard, event.clientX, event.clientY, draggedId);
            cancelScheduledDragIndicator();
            cleanupDragPreview();
            document.querySelectorAll(".running-board-grid").forEach((board) => board.classList.remove("drag-over", "drag-end", "drag-active"));
            if (!draggedId) return;
            clearRunningDropIndicator();
            state.draggedRunningThreadId = undefined;
            state.activeBoardId = undefined;
            if (target && target.col && target.row) {
              setRunningCardPosition(draggedId, target.col, target.row);
              render(state.payload);
              return;
            }
            moveRunningCard(draggedId);
          });
        });
        document.querySelectorAll("[data-rename-thread]").forEach((node) => {
          node.addEventListener("click", (event) => {
            event.stopPropagation();
            vscode.postMessage({
              type: "renameThread",
              threadId: node.dataset.renameThread,
              currentTitle: node.dataset.currentTitle || "",
            });
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
        document.getElementById("runningTabs").innerHTML = [
          '<button class="tab ' + (state.selectedThreadId ? '' : 'active') + '" data-running-thread="">Overview</button>',
          ...runningThreads.map((thread) => '<button class="tab ' + (state.selectedThreadId === thread.id ? 'active' : '') + '" data-running-thread="' + esc(thread.id) + '">' + esc(short(thread.title || thread.id, 28)) + '</button>')
        ].join("");

        document.querySelectorAll("[data-running-thread]").forEach((node) => {
          node.addEventListener("click", () => {
            const threadId = node.dataset.runningThread || undefined;
            vscode.postMessage({ type: "selectThread", threadId });
          });
        });

        const selected = (dashboard.threads || []).find((thread) => thread.id === state.selectedThreadId) || filteredThreads[0] || runningThreads[0] || dashboard.threads[0];
        const terminalLogs = selected ? (selected.preview_logs || []) : [];
        document.getElementById("terminal").innerHTML = terminalLogs.map((log) => {
          return '<div class="terminal-line"><span class="muted">' + esc(log.ts_iso || "") + '</span> ' +
            '<strong>' + esc(log.level || "INFO") + '</strong> ' +
            esc(log.message || log.target || "log event") + '</div>';
        }).join("") || '<div class="empty-state">No recent log preview available.</div>';

        const detailThread = (payload.detail && payload.detail.thread) || {};
        const history = (detailThread.id && detailThread.id === (selected && selected.id) ? (detailThread.history || []) : []) || (selected ? (selected.history || []) : []);
        document.getElementById("historySummary").textContent =
          history.length
            ? ("Showing " + history.length + " messages for " + short((selected && selected.title) || detailThread.title || "selected thread", 48))
            : "Select a thread to inspect its chat history.";
        document.getElementById("chatWindow").innerHTML = history.map((item) => {
          return '<div class="chat ' + esc(item.role || "assistant") + '">' +
            '<div class="chat-head"><span>' + esc(item.role || "assistant") + '</span><span>' + esc(item.ts || "") + '</span></div>' +
            '<div>' + esc(item.text || "") + '</div>' +
          '</div>';
        }).join("") || '<div class="empty-state">Select a thread to inspect its chat history.</div>';
        document.getElementById("spotlightPanel").innerHTML = renderSpotlight(selected, payload.detail);
        document.querySelectorAll("[data-open-drawer]").forEach((node) => {
          node.addEventListener("click", () => {
            state.ui.drawerOpen = true;
            persistUi();
            render(state.payload);
          });
        });
        document.querySelectorAll("[data-subtab-shortcut]").forEach((node) => {
          node.addEventListener("click", () => {
            state.ui.currentView = "overview";
            state.ui.rightPaneTab = node.dataset.subtabShortcut;
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

      function bindChromeDelegation() {
        document.addEventListener("click", (event) => {
          const target = event.target.closest("button, [data-view], [data-subtab], [data-topic-node]");
          if (!target) return;

          if (target.id === "reload") {
            vscode.postMessage({ type: "reload" });
            return;
          }
          if (target.id === "soundToggle") {
            toggleSound();
            return;
          }
          if (target.id === "themeToggle") {
            toggleThemeMode();
            return;
          }
          if (target.id === "motionToggle") {
            toggleMotion();
            return;
          }
          if (target.id === "startServer") {
            vscode.postMessage({ type: "startServer" });
            return;
          }
          if (target.id === "restartServer") {
            vscode.postMessage({ type: "restartServer" });
            return;
          }
          if (target.id === "external") {
            vscode.postMessage({ type: "openExternal" });
            return;
          }
          if (target.id === "toggleHeaderCollapse") {
            toggleHeaderCollapsed();
            return;
          }
          if (target.id === "posLeft") {
            vscode.postMessage({ type: "showSidebar" });
            return;
          }
          if (target.id === "posBottom") {
            vscode.postMessage({ type: "showBottomPanel" });
            return;
          }
          if (target.id === "posEditor") {
            vscode.postMessage({ type: "openPanel" });
            return;
          }
          if (target.id === "posFullscreen") {
            vscode.postMessage({ type: "maximizeDashboard" });
            return;
          }
          if (target.dataset.view) {
            setWorkspaceView(target.dataset.view);
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

      bindChromeDelegation();
      document.addEventListener("pointermove", (event) => {
        scheduleResizeUpdate(event);
      });
      document.addEventListener("pointerup", (event) => {
        finishRunningCardResize(event);
      });
      document.addEventListener("pointercancel", (event) => {
        finishRunningCardResize(event);
      });
      notifyReady();
      startBootRetryLoop();
      window.addEventListener("message", (event) => {
        if (event.data && event.data.type === "state") {
          stopBootRetryLoop();
          render(event.data);
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

      document.getElementById("threadSearch").addEventListener("input", (event) => {
        state.ui.search = event.target.value || "";
        state.ui.topicFocus = null;
        persistUi();
        render(state.payload);
      });
      document.getElementById("threadSearchMirror").addEventListener("input", (event) => {
        state.ui.search = event.target.value || "";
        state.ui.topicFocus = null;
        persistUi();
        render(state.payload);
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
      document.getElementById("toggleLayoutLockPrimary").addEventListener("click", () => {
        toggleLayoutLock();
      });
      document.getElementById("resetRunningLayoutPrimary").addEventListener("click", () => {
        resetRunningLayout();
      });
      document.querySelectorAll("[data-open-board-view]").forEach((node) => {
        node.addEventListener("click", () => {
          setWorkspaceView("board");
        });
      });
      document.getElementById("drawerClose").addEventListener("click", () => {
        clearPendingDrawerAction();
        state.ui.drawerOpen = false;
        persistUi();
        render(state.payload);
      });
      document.getElementById("drawerBackdrop").addEventListener("click", () => {
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
