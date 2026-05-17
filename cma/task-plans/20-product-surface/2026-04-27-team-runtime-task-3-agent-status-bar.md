# Task 3 — Persistent Agent Status Bar

## Status

- [x] Complete (2026-05-07)

Completion note:
- Implemented `renderAgentStatusBar(teamCoordination, task)` in `src/webview-template.js`.
- Team Task Workspace renders sticky `.team-agent-status-bar` only when agents are available.
- Agent pill click handling is wired through existing `[data-agent-pill]` event binding.
- Dark/light theme styles, horizontal overflow, pulse animation, and reduced-motion handling live in `src/webview/styles.js`.
- Regression coverage is anchored in `src/webview/render-detail-regression.test.js`.

## Parent

[`2026-04-27-team-runtime-visualization-roadmap.md`](./2026-04-27-team-runtime-visualization-roadmap.md)

## Objective

Add a fixed bottom bar to the Team Task Workspace that shows every agent/worker as a compact pill.

## Why

When a user scrolls through a long Team Task Workspace, the worker cards scroll out of view. A persistent status bar keeps agent states visible at all times, similar to Kimi's bottom agent pills (`01 Completed`, `02 Completed`).

## Visual Design

```text
┌──────────────────────────────────────────────────────────────┐
│  Team Task Workspace content...                              │
│  ...                                                         │
│  ...                                                         │
├──────────────────────────────────────────────────────────────┤  ← fixed bottom bar
│  🤖 Supervisor · idle    🤖 Worker-01 · Running · 62%        │
│  🤖 Worker-02 · Completed    🤖 Worker-03 · Blocked          │
└──────────────────────────────────────────────────────────────┘
```

## Data Source

The status bar consumes `teamCoordination.agents` and the selected `task`.

For each agent pill:
- **Name**: `agent.agent_id` or `agent.name`
- **Status**: derived from `agent.state` or matched via `task` + `teamCoordination`
- **Percent**: if the agent owns the current task, show `teamTaskCardProgress(task).percent`

Status tone mapping:

| Agent state | Pill tone | Visual |
|-------------|-----------|--------|
| `idle` | `idle` | Gray text, no pulse |
| `running`, `active`, `dispatched` | `running` | Blue text, subtle pulse dot |
| `completed`, `done`, `success` | `complete` | Green text, check icon |
| `blocked`, `failed`, `error` | `warn` | Red text, alert icon |
| `queued`, `pending`, `draft` | `pending` | Muted text, clock icon |

## Files to Modify

### `src/webview-template.js`

1. **Add `renderAgentStatusBar(teamCoordination, task)`** helper:

```javascript
function renderAgentStatusBar(teamCoordination, task) {
  const agents = Array.isArray(teamCoordination && teamCoordination.agents) ? teamCoordination.agents : [];
  const taskId = String((task && task.task_id) || "");
  const owner = String((task && task.owner) || "");

  if (!agents.length) return "";

  const pills = agents.map((agent) => {
    const agentId = String((agent && agent.agent_id) || "");
    const state = String((agent && agent.state) || "idle").toLowerCase();
    const isOwner = agentId === owner;
    const progress = isOwner ? teamTaskCardProgress(task) : null;

    let tone = "pending";
    let icon = "🤖";
    if (["completed", "done", "success"].includes(state)) { tone = "complete"; icon = "✅"; }
    else if (["running", "active", "dispatched", "in_progress"].includes(state)) { tone = "running"; icon = "🟢"; }
    else if (["blocked", "failed", "error", "stale"].includes(state)) { tone = "warn"; icon = "⚠️"; }
    else if (state === "idle") { tone = "idle"; icon = "🤖"; }

    const percentText = (progress && progress.percent !== undefined) ? (" · " + progress.percent + "%") : "";

    return '<button class="agent-status-pill tone-' + esc(tone) + '" data-agent-pill="' + esc(agentId) + '" type="button">' +
      '<span class="agent-pill-icon">' + icon + '</span>' +
      '<span class="agent-pill-name">' + esc(agentId) + '</span>' +
      '<span class="agent-pill-sep">·</span>' +
      '<span class="agent-pill-state">' + esc(state.toUpperCase()) + '</span>' +
      esc(percentText) +
    '</button>';
  }).join("");

  return '<div class="team-agent-status-bar">' + pills + '</div>';
}
```

2. **Insert into `renderTeamTaskWorkspace`**:
   - Add `renderAgentStatusBar(teamCoordination, task)` at the **end** of the returned HTML string
   - The bar is rendered as the last child of the workspace container

3. **Add click handler** (in the existing event wiring section of `webview-template.js`):
   ```javascript
   document.querySelectorAll("[data-agent-pill]").forEach((pill) => {
     pill.addEventListener("click", () => {
       const agentId = pill.dataset.agentPill;
       const target = document.querySelector('[data-team-agent="' + CSS.escape(agentId) + '"]');
       if (target) {
         target.scrollIntoView({ behavior: "smooth", block: "center" });
         target.style.outline = "2px solid var(--cyan)";
         setTimeout(() => { target.style.outline = ""; }, 1500);
       }
     });
   });
   ```

### `src/webview/styles.js`

Add status bar and pill styles:

```css
.team-agent-status-bar {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--line);
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg) 90%, transparent), var(--bg));
  backdrop-filter: blur(8px);
  z-index: 50;
  overflow-x: auto;
  flex-wrap: nowrap;
}
.agent-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--panel);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.agent-status-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.16);
}
.agent-status-pill.tone-idle     { color: var(--muted); border-color: var(--line); }
.agent-status-pill.tone-pending  { color: var(--muted-soft); border-color: var(--line); }
.agent-status-pill.tone-running  { color: var(--cyan); border-color: color-mix(in srgb, var(--cyan) 40%, var(--line)); background: color-mix(in srgb, var(--cyan) 8%, var(--panel)); }
.agent-status-pill.tone-complete { color: var(--green); border-color: color-mix(in srgb, var(--green) 40%, var(--line)); background: color-mix(in srgb, var(--green) 8%, var(--panel)); }
.agent-status-pill.tone-warn     { color: var(--red); border-color: color-mix(in srgb, var(--red) 40%, var(--line)); background: color-mix(in srgb, var(--red) 8%, var(--panel)); }

.agent-pill-icon { font-size: 13px; line-height: 1; }
.agent-pill-name { max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
.agent-pill-sep  { opacity: 0.4; margin: 0 1px; }
.agent-pill-state { font-size: 9px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.9; }
```

**Running pulse indicator** (optional but recommended):

```css
.agent-status-pill.tone-running .agent-pill-icon {
  animation: pillPulse 2s ease-in-out infinite;
}
@keyframes pillPulse {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.15); }
}
@media (prefers-reduced-motion: reduce) {
  .agent-status-pill.tone-running .agent-pill-icon { animation: none; }
}
```

**Light-theme overrides:**

```css
body:is(.color-theme-light, ...) .team-agent-status-bar {
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg) 92%, transparent), var(--bg));
  border-top-color: var(--line);
}
body:is(.color-theme-light, ...) .agent-status-pill {
  background: var(--panel-elevated);
  border-color: var(--line);
}
body:is(.color-theme-light, ...) .agent-status-pill.tone-running  { background: color-mix(in srgb, var(--cyan) 7%, var(--panel-elevated)); }
body:is(.color-theme-light, ...) .agent-status-pill.tone-complete { background: color-mix(in srgb, var(--green) 7%, var(--panel-elevated)); }
body:is(.color-theme-light, ...) .agent-status-pill.tone-warn     { background: color-mix(in srgb, var(--red) 7%, var(--panel-elevated)); }
```

**Prevent overlap with bottom content**:

Add padding to the workspace container that hosts the status bar:

```css
.team-task-workspace-grid {
  padding-bottom: 72px; /* make room for sticky status bar */
}
```

## Acceptance

- [x] Status bar renders at the bottom of Team Task Workspace when ≥1 agent exists
- [x] Pills update on every `render()` tick (no stale states)
- [x] Clicking a pill scrolls to and highlights the corresponding worker card
- [x] Highlight outline disappears after 1.5s
- [x] Bar does not overlap critical bottom content (workspace has bottom padding)
- [x] Bar is horizontally scrollable when pills exceed viewport width
- [x] Running pills have a subtle pulse animation (respects `prefers-reduced-motion`)
- [x] Bar renders correctly in light theme
- [x] Bar does not appear on non-Team views
- [x] `npm run validate:moa-dag` and `npm run validate:role-plugins` pass
