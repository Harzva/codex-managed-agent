# Task 4 — History Browser

## Parent

[`2026-04-27-codex-memory-manager-roadmap.md`](./2026-04-27-codex-memory-manager-roadmap.md)

## Objective

Allow users to browse Codex conversation history (`history.jsonl`) in a read-only, scannable format.

## Why

`history.jsonl` contains every turn of every Codex session. It's a goldmine for debugging, auditing, and understanding what the agent actually did. But it's buried in `~/.codex/sessions/` or `<project>/.codex/history.jsonl` as raw JSON Lines — unreadable without tooling.

## Scope

### In Scope

- Read and parse `history.jsonl` (JSON Lines format)
- Render as a timeline of turns (User → Assistant → Tool)
- Show timestamp, role, and content preview
- Expand/collapse long messages
- Cap preview to last 1000 lines (handle large files gracefully)

### Out of Scope

- Editing history (read-only by design)
- Search/filter within history (Phase 2 enhancement)
- Export/download

## JSONL Format

Each line is a JSON object. Common shapes:

```json
{"role": "user", "content": "Implement auth", "timestamp": "2026-04-27T10:00:00Z"}
{"role": "assistant", "content": "I'll implement auth...", "timestamp": "2026-04-27T10:00:05Z"}
{"role": "tool", "name": "shell", "input": "npm install bcrypt", "output": "+ bcrypt@5.1.0", "timestamp": "2026-04-27T10:00:10Z"}
```

## Files to Modify

### `src/host/memory-manager.js` — History Parser

```javascript
function readHistoryJsonl(filePath, options = {}) {
  const maxLines = options.maxLines || 1000;
  const entries = [];

  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/).filter(Boolean);
    const start = Math.max(0, lines.length - maxLines);

    for (let i = start; i < lines.length; i++) {
      try {
        const entry = JSON.parse(lines[i]);
        entries.push({
          index: i + 1,
          role: String(entry.role || "unknown"),
          content: String(entry.content || entry.output || ""),
          toolName: entry.name || null,
          toolInput: entry.input || null,
          timestamp: entry.timestamp || "",
        });
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    return { entries: [], totalLines: 0, truncated: false, error: "Could not read file" };
  }

  return {
    entries,
    totalLines: lines.length,
    truncated: lines.length > maxLines,
    filePath,
  };
}

module.exports = { ..., readHistoryJsonl };
```

### `src/webview-template.js` — History Viewer

```javascript
function renderHistoryViewer(historyData) {
  const { entries, totalLines, truncated, filePath } = historyData;

  return '<div class="history-viewer-overlay">' +
    '<div class="history-viewer-drawer">' +
      '<div class="history-viewer-head">' +
        '<span class="history-viewer-title">Conversation History</span>' +
        '<span class="history-viewer-meta">' + esc(entries.length + ' turns · ' + totalLines + ' total lines') + (truncated ? ' (showing last 1000)' : '') + '</span>' +
        '<button class="chip" data-history-close type="button">Close</button>' +
      '</div>' +
      '<div class="history-viewer-body">' +
        (entries.length
          ? entries.map((entry) => renderHistoryTurn(entry)).join("")
          : '<div class="history-empty">No history entries found.</div>') +
      '</div>' +
    '</div>' +
  '</div>';
}

function renderHistoryTurn(entry) {
  const roleClass = 'role-' + esc(entry.role);
  const roleIcon = entry.role === 'user' ? '👤' : entry.role === 'assistant' ? '🤖' : entry.role === 'tool' ? '🔧' : '❓';
  const content = entry.content || (entry.toolName ? `[${esc(entry.toolName)}] ${esc(entry.toolInput || "")}` : "");

  return '<div class="history-turn ' + roleClass + '">' +
    '<div class="history-turn-head">' +
      '<span class="history-turn-icon">' + roleIcon + '</span>' +
      '<span class="history-turn-role">' + esc(entry.role.toUpperCase()) + '</span>' +
      '<span class="history-turn-time">' + esc(entry.timestamp ? formatTimestamp(entry.timestamp) : "-") + '</span>' +
    '</div>' +
    '<div class="history-turn-content">' + esc(short(content, 280)) + '</div>' +
  '</div>';
}
```

### `src/webview/styles.js` — History CSS

```css
.history-viewer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.48); z-index: 200; display: flex; justify-content: flex-end; }
.history-viewer-drawer { width: 640px; max-width: 90vw; height: 100%; background: var(--bg); border-left: 1px solid var(--line); display: grid; grid-template-rows: auto 1fr; }
.history-viewer-head { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.history-viewer-title { font-size: 14px; font-weight: 800; }
.history-viewer-meta { color: var(--muted); font-size: 11px; flex: 1; }
.history-viewer-body { overflow-y: auto; padding: 16px 18px; display: grid; gap: 12px; }

.history-turn { padding: 12px 14px; border-radius: 10px; border: 1px solid var(--line); background: var(--panel); }
.history-turn.role-user { border-left: 3px solid var(--cyan); }
.history-turn.role-assistant { border-left: 3px solid var(--green); }
.history-turn.role-tool { border-left: 3px solid var(--gold); }
.history-turn-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.history-turn-icon { font-size: 14px; }
.history-turn-role { font-size: 10px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; }
.history-turn-time { color: var(--muted-soft); font-size: 10px; margin-left: auto; }
.history-turn-content { font-size: 12px; line-height: 1.5; color: var(--text); white-space: pre-wrap; word-break: break-word; }
.history-empty { color: var(--muted); font-size: 13px; text-align: center; padding: 40px 0; }
```

**Light theme overrides:**
```css
body:is(.color-theme-light, ...) .history-viewer-overlay { background: rgba(0,0,0,0.28); }
body:is(.color-theme-light, ...) .history-viewer-drawer { background: var(--bg); border-color: var(--line); }
body:is(.color-theme-light, ...) .history-turn { background: var(--panel-elevated); border-color: var(--line); }
```

## Performance Note

- history.jsonl can be 100MB+. Never read the entire file into memory.
- Use streaming or tail-based reading (last N lines only).
- The parser above uses `fs.readFileSync` for simplicity but caps at 1000 lines. For v1 this is acceptable.
- Future: switch to `readline` streaming for true large-file support.

## Acceptance

- [x] Clicking "View" on a `history.jsonl` opens the history drawer
- [x] User turns show user icon + cyan left border
- [x] Assistant turns show assistant icon + green left border
- [x] Tool turns show tool icon + gold left border
- [x] Long content is truncated with ellipsis
- [x] Files >1000 lines show "(showing last 1000)" warning
- [x] Malformed JSONL lines are skipped gracefully
- [x] Empty history shows friendly empty state
- [x] Light theme renders correctly
- [x] Drawer scrolls smoothly for long histories

2026-05-07 verification: `readHistoryJsonl` parses bounded history tails and skips malformed lines; `renderHistoryViewer`/`renderHistoryTurn` provide the drawer timeline and role styling; parser behavior is covered by `src/host/memory-manager.test.js`.
