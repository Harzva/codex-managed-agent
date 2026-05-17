# Codex Memory Manager — Roadmap

## Status

- [x] Complete (implemented and verified)

## Date

2026-04-27

## Objective

Build a first-class memory management surface inside CMA for discovering, reading, editing, and initializing Codex memory files. Skill Manager answers "What can the Agent do?" Memory Manager answers "What does the Agent remember?"

Every repository can have its own memory. If none exists, the user can create one from a template.

## Why This Matters

Today CMA has no visibility into Codex's memory layer:
- Users don't know if their project has an `AGENTS.md`
- Users can't edit `config.toml` without leaving VS Code
- Users can't see how global memory (`~/.codex/`) interacts with project memory (`<project>/.codex/`)
- Conversation history (`history.jsonl`) is buried in the filesystem

Claude Code solves this with `CLAUDE.md` (project) + `~/.claude/CLAUDE.md` (global) + in-app memory cards. CMA needs an equivalent for the Codex ecosystem.

## Codex Memory Model

Codex uses a layered configuration and memory system:

```text
/etc/codex/config.toml          ← system-wide (optional, admin)
~/.codex/config.toml            ← user/global (model, API key, default preferences)
~/.codex/AGENTS.md              ← global agent instructions
<project>/.codex/config.toml    ← project/local-to-repo (overrides global)
<project>/.codex/AGENTS.md      ← project agent instructions (overrides global)
<project>/.codex/history.jsonl  ← conversation history (read-only archive)
<project>/.codex-team/          ← CMA team space state (DAG runs, blackboard)
```

Precedence (highest wins):
```
project config.toml > global config.toml > system config.toml
project AGENTS.md   > global AGENTS.md
```

## Claude Code ↔ Codex Mapping

| Claude Code | Codex Equivalent | CMA Memory Manager Role |
|-------------|------------------|------------------------|
| `~/.claude/CLAUDE.md` | `~/.codex/AGENTS.md` | Browse / edit global instructions |
| `项目/CLAUDE.md` | `项目/.codex/AGENTS.md` | Browse / edit project instructions |
| `.claude/settings.json` | `~/.codex/config.toml` | Browse / edit config (read-only first) |
| Claude memory/notes | `AGENTS.md` + `history.jsonl` + local state | Unified memory surface |

## Target Architecture

```text
┌─ Memory Tab ───────────────────────────────────────────────────┐
│  [Search memory...]  [+ Create Project Memory]  [Refresh]     │
├─────────────────────────────────────────────────────────────────┤
│  ▼ PROJECT MEMORY (cwd: /workspace/my-project)                  │
│    📄 .codex/AGENTS.md        ✅ exists  [Edit] [View]         │
│    ⚙️  .codex/config.toml     ❌ missing [Create from global]  │
│    📜 .codex/history.jsonl    ✅ exists  [Browse]             │
│    📁 .codex-team/            ✅ exists  [Open Team Space]    │
├─────────────────────────────────────────────────────────────────┤
│  ▼ GLOBAL MEMORY (~/.codex)                                    │
│    📄 AGENTS.md               ✅ exists  [Edit] [View]         │
│    ⚙️  config.toml            ✅ exists  [View]               │
│    📁 skills/                 ✅ exists  [Open Skill Manager] │
│    📁 sessions/               ✅ exists  [Browse]             │
├─────────────────────────────────────────────────────────────────┤
│  ▼ SYSTEM MEMORY (/etc/codex)                                  │
│    ⚙️  config.toml            ❌ missing (admin only)          │
├─────────────────────────────────────────────────────────────────┤
│  📊 Memory Stats                                               │
│  Project tokens: 1,240  |  Global tokens: 890  |  Total: 2,130 │
└─────────────────────────────────────────────────────────────────┘
```

## Memory File Types

| File | Format | Editable | Description |
|------|--------|----------|-------------|
| `AGENTS.md` | Markdown | ✅ Yes | Agent instructions, rules, architecture notes |
| `config.toml` | TOML | ⚠️ Read-only v1 | Model, API endpoint, default preferences |
| `history.jsonl` | JSON Lines | ❌ No | Conversation archive (browse only) |
| `.codex-team/` | JSON/Dir | ⚠️ Via Team tab | CMA team space state |

## Sub-Tasks

| # | Task | Est. | Detail Doc |
|---|------|------|------------|
| 1 | Memory Discovery & Browser | 1–2 hr | [`2026-04-27-codex-memory-task-1-discovery.md`](./2026-04-27-codex-memory-task-1-discovery.md) |
| 2 | AGENTS.md Editor | 2–3 hr | [`2026-04-27-codex-memory-task-2-agents-editor.md`](./2026-04-27-codex-memory-task-2-agents-editor.md) |
| 3 | Memory Creator & Templates | 1 hr | [`2026-04-27-codex-memory-task-3-creator.md`](./2026-04-27-codex-memory-task-3-creator.md) |
| 4 | History Browser | 1–2 hr | [`2026-04-27-codex-memory-task-4-history.md`](./2026-04-27-codex-memory-task-4-history.md) |

### Execution Order

1. **Task 1** — Discovery is foundational; everything else depends on knowing what files exist.
2. **Task 2** — Editor is the highest-value feature; users will spend most time here.
3. **Task 3** — Creator lowers the barrier to entry for new projects.
4. **Task 4** — History is nice-to-have; can be deferred if needed.

## Data Contracts

### Memory File Entry

```javascript
{
  kind: "agents-md",      // "agents-md" | "config-toml" | "history-jsonl" | "team-state"
  scope: "project",       // "system" | "global" | "project"
  filePath: "/workspace/my-project/.codex/AGENTS.md",
  exists: true,
  size: 1240,             // bytes
  lineCount: 45,
  lastModified: "2026-04-27T10:00:00Z",
  editable: true,
  preview: "# Project Instructions\n\n## Commands...",
  tokens: 240,            // rough token count (chars / 4)
}
```

### Memory Scan Result

```javascript
{
  project: {
    cwd: "/workspace/my-project",
    files: [ /* MemoryFileEntry[] */ ],
  },
  global: {
    home: "/home/user",
    files: [ /* MemoryFileEntry[] */ ],
  },
  system: {
    files: [ /* MemoryFileEntry[] */ ],
  },
}
```

## UI Surface Decision

The Memory Manager lives as a **new top-level tab** in the CMA dashboard: `Memory`

Alternative: integrate as a section inside the `Team` tab. Decision: **separate tab** because memory is relevant even when no team space is active.

Layout: Accordion sections (inspired by VS Code TreeView skill panel):
- `PROJECT MEMORY` — files in `<cwd>/.codex/` and `<cwd>/.codex-team/`
- `GLOBAL MEMORY` — files in `~/.codex/`
- `SYSTEM MEMORY` — files in `/etc/codex/` (optional, usually empty)
- `MEMORY STATS` — token counts, file counts, last update

## Dependencies

- `vscode.workspace.workspaceFolders` — for project root detection
- `fs` module — for file scanning
- `os.homedir()` — for global path resolution
- Existing CMA webview rendering pipeline
- Existing Markdown renderer (if any; otherwise plain text preview)

## Exit Criteria (per Phase)

| Phase | Exit Criteria |
|-------|---------------|
| 1 | User can open Memory tab, see all discovered memory files, and view previews |
| 2 | User can edit AGENTS.md in a webview text area and save changes |
| 3 | User can create a new project AGENTS.md from a template |
| 4 | User can browse conversation history entries (read-only) |

## Completion Note

2026-05-07: Implemented in `src/host/memory-manager.js`, `src/host/panel-view.js`, `src/webview-template.js`, and `src/webview/styles.js`. Added regression coverage in `src/host/memory-manager.test.js` for discovery, template creation/fallback, save behavior, and history JSONL parsing.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| `config.toml` contains API keys | Never render raw API keys in webview; mask them or make config read-only |
| Editing `AGENTS.md` while Codex is running | Codex reads AGENTS.md at session start; edits apply to next session. Document this. |
| Large `history.jsonl` (100MB+) | Cap preview to last 1000 lines; show total size |
| No workspace open | Show Global memory only; disable Project memory section |
