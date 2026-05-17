module.exports = `        color: #ffeab0;
        border-color: rgba(255, 214, 107, 0.18);
        background: rgba(255, 214, 107, 0.07);
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
      .thread-base-directory {
        display: flex;
        gap: 6px;
        align-items: baseline;
        flex-wrap: wrap;
        margin-top: 7px;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.35;
      }
      .thread-base-directory .base-label {
        color: var(--muted-soft);
        font-weight: 700;
      }
      .thread-base-directory .base-path {
        min-width: 0;
        color: var(--text);
        overflow-wrap: anywhere;
      }
      .copy-thread-id.tool-id {
        justify-content: center;
        font: inherit;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .copy-thread-id.thread-top-id {
        max-width: 172px;
        color: var(--text);
        border-color: rgba(126, 231, 255, 0.22);
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
      .drawer-title {`;
