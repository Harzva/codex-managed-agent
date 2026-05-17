# Task 2 — AGENTS.md Editor

## Parent

[`2026-04-27-codex-memory-manager-roadmap.md`](./2026-04-27-codex-memory-manager-roadmap.md)

## Objective

Allow users to view and edit `AGENTS.md` files (both project-level and global) directly inside the CMA webview.

## Why

AGENTS.md is the primary memory vehicle for Codex. Users need to iterate on it frequently (add new commands, update architecture notes, refine rules). Leaving VS Code to edit it in an external editor breaks flow.

## Files to Modify

### `src/webview-template.js` — Editor UI

1. **Add `renderMemoryEditor(filePath, content)`** helper:

```javascript
function renderMemoryEditor(filePath, content) {
  const isAgentsMd = filePath.endsWith("AGENTS.md");
  const isConfig = filePath.endsWith("config.toml");
  const title = path.basename(filePath);

  return '<div class="memory-editor-overlay">' +
    '<div class="memory-editor-drawer">' +
      '<div class="memory-editor-head">' +
        '<span class="memory-editor-title">' + esc(title) + '</span>' +
        '<span class="memory-editor-path">' + esc(filePath) + '</span>' +
        '<button class="chip" data-memory-editor-close type="button">Close</button>' +
      '</div>' +
      '<div class="memory-editor-tabs">' +
        '<button class="memory-editor-tab active" data-editor-tab="edit" type="button">Edit</button>' +
        '<button class="memory-editor-tab" data-editor-tab="preview" type="button">Preview</button>' +
      '</div>' +
      '<div class="memory-editor-body" data-editor-pane="edit">' +
        '<textarea class="memory-editor-textarea" data-memory-textarea>' + esc(content) + '</textarea>' +
      '</div>' +
      '<div class="memory-editor-body hidden" data-editor-pane="preview">' +
        '<div class="memory-editor-preview">' + renderMarkdownPreview(content) + '</div>' +
      '</div>' +
      '<div class="memory-editor-actions">' +
        '<button class="chip primary" data-memory-save="' + esc(filePath) + '" type="button">Save</button>' +
        '<button class="chip" data-memory-editor-close type="button">Cancel</button>' +
        '<span class="memory-editor-status" data-editor-status></span>' +
      '</div>' +
    '</div>' +
  '</div>';
}
```

2. **Markdown preview renderer** (simple, no external lib):

```javascript
function renderMarkdownPreview(md) {
  // Simple regex-based Markdown → HTML
  // Supports: headers, bold, italic, code blocks, inline code, lists, links
  let html = esc(md)
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  return html;
}
```

3. **Event wiring**:
   - `data-memory-edit` → open editor drawer with file content
   - `data-memory-save` → postMessage `{ type: "saveMemoryFile", filePath, content }`
   - `data-editor-tab="edit/preview"` → toggle pane visibility
   - `data-memory-editor-close` → close drawer
   - Textarea `input` event → debounced preview refresh

### `src/host/` — Save handler

In `src/host/memory-manager.js`, add:

```javascript
function saveMemoryFile(filePath, content) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
    return { ok: true, filePath };
  } catch (err) {
    return { ok: false, filePath, error: err.message };
  }
}

module.exports = { ..., saveMemoryFile };
```

In host message routing:

```javascript
case "saveMemoryFile": {
  const { filePath, content } = message;
  const result = saveMemoryFile(filePath, content);
  panel.webview.postMessage({ type: "memoryFileSaved", payload: result });
  break;
}
```

### `src/webview/styles.js` — Editor CSS

```css
.memory-editor-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.48); z-index: 200; display: flex; justify-content: flex-end; }
.memory-editor-drawer { width: 640px; max-width: 90vw; height: 100%; background: var(--bg); border-left: 1px solid var(--line); display: grid; grid-template-rows: auto auto 1fr auto; }
.memory-editor-head { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.memory-editor-title { font-size: 14px; font-weight: 800; }
.memory-editor-path { color: var(--muted-soft); font-size: 11px; font-family: monospace; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.memory-editor-tabs { display: flex; border-bottom: 1px solid var(--line); }
.memory-editor-tab { flex: 1; padding: 10px; text-align: center; font-size: 12px; font-weight: 700; color: var(--muted); cursor: pointer; border-bottom: 2px solid transparent; background: none; border: none; border-bottom: 2px solid transparent; }
.memory-editor-tab.active { color: var(--text); border-bottom-color: var(--cyan); }
.memory-editor-body { overflow-y: auto; padding: 16px 18px; }
.memory-editor-body.hidden { display: none; }
.memory-editor-textarea { width: 100%; height: 100%; min-height: 400px; background: var(--panel); color: var(--text); border: 1px solid var(--line); border-radius: 8px; padding: 12px; font-family: monospace; font-size: 13px; line-height: 1.6; resize: vertical; }
.memory-editor-preview { font-size: 13px; line-height: 1.6; }
.memory-editor-preview h1 { font-size: 18px; margin: 16px 0 8px; }
.memory-editor-preview h2 { font-size: 15px; margin: 14px 0 6px; }
.memory-editor-preview h3 { font-size: 13px; margin: 12px 0 4px; }
.memory-editor-preview code { background: var(--panel); padding: 2px 5px; border-radius: 4px; font-size: 12px; }
.memory-editor-preview pre { background: var(--panel); padding: 12px; border-radius: 8px; overflow-x: auto; }
.memory-editor-preview pre code { background: none; padding: 0; }
.memory-editor-preview ul { padding-left: 20px; }
.memory-editor-preview a { color: var(--cyan); }
.memory-editor-actions { display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-top: 1px solid var(--line); background: var(--panel); }
.memory-editor-status { font-size: 11px; color: var(--muted); margin-left: auto; }
.memory-editor-status.ok { color: var(--green); }
.memory-editor-status.err { color: var(--red); }
```

**Light theme overrides:**
```css
body:is(.color-theme-light, ...) .memory-editor-overlay { background: rgba(0,0,0,0.28); }
body:is(.color-theme-light, ...) .memory-editor-drawer { background: var(--bg); border-color: var(--line); }
body:is(.color-theme-light, ...) .memory-editor-textarea { background: var(--panel-elevated); color: var(--text); border-color: var(--line); }
```

## Security Note

- `config.toml` contains API keys. **Do not make it editable in v1.**
  - Render config.toml in a read-only `<pre>` block
  - Mask any value that looks like an API key (`sk-...`, `Bearer ...`)
  - Show a note: "Config editing coming in a future release"

## Acceptance

- [x] Clicking "Edit" on an AGENTS.md opens the editor drawer
- [x] Edit tab shows a textarea with the file content
- [x] Preview tab shows rendered Markdown (headers, lists, code blocks, links)
- [x] Tab switching works instantly
- [x] Save button writes to disk and shows "Saved" confirmation
- [x] Cancel / Close button dismisses the drawer
- [x] config.toml opens in read-only mode with masked API keys
- [x] Drawer is scrollable for long files
- [x] Light theme renders correctly
- [x] Edit → Save → Refresh memory list shows updated line count / tokens

2026-05-07 verification: editor/view/save message handlers are wired in `src/host/panel-view.js`; rendering, preview, masking, and drawer states live in `src/webview-template.js`; save behavior is covered by `src/host/memory-manager.test.js`.
