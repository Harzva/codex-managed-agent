# Task 1 — Memory Discovery & Browser

## Parent

[`2026-04-27-codex-memory-manager-roadmap.md`](./2026-04-27-codex-memory-manager-roadmap.md)

## Objective

Scan the filesystem for Codex memory files at all three scopes (system, global, project) and render a browsable accordion list in the CMA webview.

## Why

You cannot manage what you cannot see. This task makes the invisible memory layer visible.

## Memory File Locations

| Scope | Directory | Files to scan |
|-------|-----------|---------------|
| Project | `vscode.workspace.workspaceFolders[0].uri.fsPath + "/.codex/"` | `AGENTS.md`, `config.toml`, `history.jsonl` |
| Project | `vscode.workspace.workspaceFolders[0].uri.fsPath + "/.codex-team/"` | `team-space.json`, `dag-runs/*.json` |
| Global | `os.homedir() + "/.codex/"` | `AGENTS.md`, `config.toml`, `skills/*/` |
| Global | `os.homedir() + "/.codex/sessions/"` | `**/*.jsonl` |
| System | `/etc/codex/` | `config.toml` |

## Files to Modify

### `src/host/` — New `memory-manager.js`

Create `src/host/memory-manager.js`:

```javascript
const fs = require("fs");
const path = require("path");
const os = require("os");

const MEMORY_FILE_NAMES = ["AGENTS.md", "config.toml", "history.jsonl"];

function resolveCodexHome() {
  return process.env.CODEX_HOME
    ? path.resolve(process.env.CODEX_HOME)
    : path.join(os.homedir(), ".codex");
}

function resolveSystemCodexDir() {
  return "/etc/codex";
}

function resolveProjectCodexDir(workspacePath) {
  return workspacePath ? path.join(workspacePath, ".codex") : "";
}

function resolveProjectTeamDir(workspacePath) {
  return workspacePath ? path.join(workspacePath, ".codex-team") : "";
}

function statMemoryFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, "utf8");
    return {
      filePath,
      exists: true,
      size: stat.size,
      lineCount: content.split(/\r?\n/).length,
      lastModified: stat.mtime.toISOString(),
      preview: content.slice(0, 800),
      tokens: Math.ceil(content.length / 4),
    };
  } catch {
    return { filePath, exists: false };
  }
}

function scanMemoryScope(scope, baseDir, options = {}) {
  const files = [];
  if (!baseDir || !fs.existsSync(baseDir)) return files;

  for (const name of MEMORY_FILE_NAMES) {
    const filePath = path.join(baseDir, name);
    const meta = statMemoryFile(filePath);
    if (meta.exists || options.includeMissing) {
      files.push({
        kind: name === "AGENTS.md" ? "agents-md" : name === "config.toml" ? "config-toml" : "history-jsonl",
        scope,
        name,
        ...meta,
        editable: name !== "history.jsonl",
      });
    }
  }

  // Special: .codex-team/ directory (not a file, but memory)
  if (options.includeTeamDir) {
    const teamDir = baseDir.replace(/\.codex$/, ".codex-team");
    if (fs.existsSync(teamDir)) {
      files.push({
        kind: "team-state",
        scope,
        name: ".codex-team/",
        filePath: teamDir,
        exists: true,
        isDirectory: true,
        editable: false,
      });
    }
  }

  return files;
}

function scanAllMemory(workspacePath) {
  return {
    project: {
      cwd: workspacePath || null,
      files: workspacePath
        ? scanMemoryScope("project", resolveProjectCodexDir(workspacePath), { includeMissing: true, includeTeamDir: true })
        : [],
    },
    global: {
      home: os.homedir(),
      files: scanMemoryScope("global", resolveCodexHome(), { includeMissing: true }),
    },
    system: {
      files: scanMemoryScope("system", resolveSystemCodexDir(), { includeMissing: true }),
    },
  };
}

module.exports = {
  scanAllMemory,
  statMemoryFile,
};
```

### `src/webview-template.js` — New `renderMemoryPage()`

1. Add `"memory"` to the top navigation tab enum.
2. Implement `renderMemoryPage()`:

```javascript
function renderMemoryPage() {
  const memory = state.memoryData || { project: { files: [] }, global: { files: [] }, system: { files: [] } };
  return '<div class="memory-page">' +
    '<div class="memory-header">' +
      '<h2 class="memory-title">Memory</h2>' +
      '<div class="chip-row">' +
        '<button class="chip" data-memory-refresh type="button">Refresh</button>' +
        '<button class="chip primary" data-memory-create-project type="button">+ Create Project Memory</button>' +
      '</div>' +
    '</div>' +
    renderMemoryAccordion("Project Memory", memory.project, memory.project?.cwd) +
    renderMemoryAccordion("Global Memory", memory.global, memory.global?.home) +
    renderMemoryAccordion("System Memory", memory.system, "/etc/codex") +
    renderMemoryStats(memory) +
    '</div>';
}

function renderMemoryAccordion(title, scopeData, pathLabel) {
  const files = scopeData?.files || [];
  const existsCount = files.filter((f) => f.exists).length;
  const rows = files.map((file) => {
    const statusIcon = file.exists ? '✅' : '❌';
    const statusText = file.exists ? 'exists' : 'missing';
    const actions = [];
    if (file.exists && file.editable) actions.push('<button class="chip" data-memory-edit="' + esc(file.filePath) + '" type="button">Edit</button>');
    if (file.exists) actions.push('<button class="chip" data-memory-view="' + esc(file.filePath) + '" type="button">View</button>');
    if (!file.exists && file.name === "AGENTS.md") actions.push('<button class="chip primary" data-memory-create="' + esc(file.filePath) + '" type="button">Create</button>');

    return '<div class="memory-row ' + (file.exists ? '' : 'missing') + '">' +
      '<div class="memory-row-icon">' + (file.kind === "agents-md" ? '📄' : file.kind === "config-toml" ? '⚙️' : file.kind === "history-jsonl" ? '📜' : '📁') + '</div>' +
      '<div class="memory-row-body">' +
        '<div class="memory-row-name">' + esc(file.name) + ' <span class="memory-row-status">' + statusIcon + ' ' + statusText + '</span></div>' +
        (file.exists ? '<div class="memory-row-meta">' + esc(file.lineCount + ' lines · ' + (file.tokens || 0) + ' tokens · ' + formatTimestamp(file.lastModified)) + '</div>' : '') +
      '</div>' +
      '<div class="memory-row-actions">' + actions.join("") + '</div>' +
    '</div>';
  }).join('');

  return '<div class="memory-section">' +
    '<div class="memory-section-head" data-memory-toggle>' +
      '<span class="memory-section-title">' + esc(title) + ' <span class="memory-section-count">(' + existsCount + '/' + files.length + ')</span></span>' +
      '<span class="memory-section-path">' + esc(pathLabel || "-") + '</span>' +
    '</div>' +
    '<div class="memory-section-body">' + rows + '</div>' +
  '</div>';
}

function renderMemoryStats(memory) {
  const allFiles = [
    ...(memory.project?.files || []),
    ...(memory.global?.files || []),
    ...(memory.system?.files || []),
  ].filter((f) => f.exists);
  const totalTokens = allFiles.reduce((sum, f) => sum + (f.tokens || 0), 0);
  return '<div class="memory-stats">' +
    '<span>Total files: ' + allFiles.length + '</span>' +
    '<span>Total tokens: ~' + totalTokens + '</span>' +
  '</div>';
}
```

3. Wire event listeners for `data-memory-refresh`, `data-memory-edit`, `data-memory-view`, `data-memory-create`.

### `src/webview/styles.js` — Memory CSS

```css
.memory-page { display: grid; gap: 16px; padding-bottom: 72px; }
.memory-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.memory-title { font-size: 18px; font-weight: 800; margin: 0; }

.memory-section { border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
.memory-section-head { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--panel); cursor: pointer; }
.memory-section-head:hover { background: var(--panel-elevated); }
.memory-section-title { font-size: 12px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; }
.memory-section-count { color: var(--muted); font-weight: 700; }
.memory-section-path { color: var(--muted-soft); font-size: 11px; font-family: monospace; }
.memory-section-body { padding: 8px 16px 16px; }

.memory-row { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
.memory-row:last-child { border-bottom: none; }
.memory-row.missing { opacity: 0.6; }
.memory-row-icon { font-size: 18px; line-height: 1; margin-top: 2px; }
.memory-row-body { flex: 1; min-width: 0; }
.memory-row-name { font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.memory-row-status { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--muted); }
.memory-row-meta { font-size: 11px; color: var(--muted-soft); margin-top: 2px; }
.memory-row-actions { display: flex; gap: 6px; flex-shrink: 0; }

.memory-stats { display: flex; gap: 16px; padding: 10px 16px; font-size: 11px; color: var(--muted); border-top: 1px solid var(--line); }
```

**Light theme overrides:**
```css
body:is(.color-theme-light, ...) .memory-section { border-color: var(--line); }
body:is(.color-theme-light, ...) .memory-section-head { background: var(--panel-elevated); }
body:is(.color-theme-light, ...) .memory-section-head:hover { background: color-mix(in srgb, var(--panel-elevated) 92%, var(--cyan)); }
body:is(.color-theme-light, ...) .memory-row { border-color: var(--line); }
```

## Host Message Routing

In `src/host/panel-view.js` or `extension.js`, add:

```javascript
// Refresh memory scan
case "refreshMemory": {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath || "";
  const memoryData = scanAllMemory(workspacePath);
  panel.webview.postMessage({ type: "memoryData", payload: memoryData });
  break;
}

// Read file content for view/edit
case "readMemoryFile": {
  const { filePath } = message;
  try {
    const content = fs.readFileSync(filePath, "utf8");
    panel.webview.postMessage({ type: "memoryFileContent", payload: { filePath, content } });
  } catch (err) {
    panel.webview.postMessage({ type: "memoryFileError", payload: { filePath, error: err.message } });
  }
  break;
}
```

## Acceptance

- [x] Memory tab is reachable from the dashboard top bar
- [x] Project memory section shows files in `<cwd>/.codex/` (exists vs missing)
- [x] Global memory section shows files in `~/.codex/`
- [x] System memory section shows files in `/etc/codex/` (usually missing, gracefully handled)
- [x] Each row shows: icon, filename, exists/missing status, line count, token estimate, last modified
- [x] Missing AGENTS.md shows a "Create" button
- [x] Existing editable files show "Edit" + "View" buttons
- [x] `history.jsonl` shows "View" only (no Edit)
- [x] Stats footer shows total files and total tokens
- [x] Refresh button rescans and updates the view
- [x] Light theme renders correctly
- [x] When no workspace is open, Project Memory section shows empty state: "Open a workspace to see project memory"

2026-05-07 verification: covered by `scanAllMemory` behavior in `src/host/memory-manager.js`, Memory Overview rendering in `src/webview-template.js`, light-theme styles in `src/webview/styles.js`, and `src/host/memory-manager.test.js`.
