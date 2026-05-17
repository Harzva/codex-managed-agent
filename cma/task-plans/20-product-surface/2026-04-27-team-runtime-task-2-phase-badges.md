# Task 2 — Phase Badges

## Status

- [x] Complete (2026-05-07)

Completion note:
- Implemented `inferTaskPhase(task, logs)` in `src/webview-template.js`.
- Team task rows, workspace cards, and task workspace headers render `.team-phase-badge`.
- Dark/light theme badge tones live in `src/webview/styles.js`.
- Regression coverage is anchored in `src/webview/render-detail-regression.test.js`.

## Parent

[`2026-04-27-team-runtime-visualization-roadmap.md`](./2026-04-27-team-runtime-visualization-roadmap.md)

## Objective

Add a Phase label above the task-level progress bar. Phases are inferred from evidence state, not declared by the user.

## Why

Today users see "Commands completed 68%" but have no sense of **which stage** the task is in. A Phase badge answers "Are we still scaffolding, or already integrating?" at a glance.

## Phase Mapping

Phases are heuristically inferred. The mapping below is a starting point; the implementation should check conditions **in order** and return the first match.

| Phase | Evidence trigger | Progress range | Tone |
|-------|-----------------|----------------|------|
| Planning | Task created, no dispatch evidence yet | 0–15% | `muted` |
| Scaffold | First file/dir creations, no multi-file edits yet | 15–35% | `cyan` |
| Core Implementation | Active file edits, command executions, log lines growing | 35–65% | `blue` |
| Integration | Multiple file changes, cross-module references, blackboard updates | 65–85% | `purple` |
| Review & Result | Result envelope exists, checks run, outputs recorded | 85–100% | `green` |
| Failed | `status === "failed"` or `status === "blocked"` | — | `red` |

### Inference Logic (`inferTaskPhase`)

```javascript
function inferTaskPhase(task, logs) {
  const status = String((task && task.status) || "").toLowerCase();
  const runtime = task && task.runtime && typeof task.runtime === "object" ? task.runtime : {};
  const result = task && task.result && typeof task.result === "object" ? task.result : {};
  const evidence = collectTeamTaskEvidence(task, logs); // existing helper

  if (["failed", "blocked", "error"].includes(status)) {
    return { label: "Failed", tone: "warn", percentRange: null };
  }

  if (String(result.summary || "").trim() || (evidence.items[6] && evidence.items[6].state === "done")) {
    return { label: "Review & Result", tone: "complete", percentRange: "85–100%" };
  }

  const fileSignals = Number(runtime.file_change_count || 0);
  const commandSignals = Number(runtime.command_completed_count || 0);
  const logSignals = Number(runtime.log_line_count || 0);
  const bbLength = Array.isArray(task.orchestration && task.orchestration.blackboard) ? task.orchestration.blackboard.length : 0;

  if (fileSignals >= 3 || bbLength >= 2 || (fileSignals >= 1 && commandSignals >= 1)) {
    return { label: "Integration", tone: "integration", percentRange: "65–85%" };
  }

  if (commandSignals >= 1 || logSignals >= 10 || fileSignals >= 1) {
    return { label: "Core Implementation", tone: "running", percentRange: "35–65%" };
  }

  if (fileSignals >= 1 || (logs && logs.some((l) => /create|mkdir|scaffold/i.test(String(l.type || ""))))) {
    return { label: "Scaffold", tone: "scaffold", percentRange: "15–35%" };
  }

  return { label: "Planning", tone: "planning", percentRange: "0–15%" };
}
```

> **Note:** The thresholds above (`fileSignals >= 3`, `logSignals >= 10`) are starting heuristics. Tune them based on real task traces after shipping.

## Files to Modify

### `src/webview-template.js`

1. **Add `inferTaskPhase(task, logs)`** near `teamTaskCardProgress` or `summarizeTeamTaskIssue`.

2. **Insert badge rendering** into:
   - `renderTeamTaskCard` (team directory card)
   - `renderTeamTaskWorkspace` (task workspace header)

   Badge HTML:
   ```html
   <span class="team-phase-badge tone-${esc(phase.tone)}">${esc(phase.label.toUpperCase())}</span>
   ```

3. **Update `teamTaskCardProgress`** to align its milestone labels with phase names (optional but recommended):
   - Keep existing percent thresholds
   - Add phase hint to progress label: e.g., `"Scaffold · File changes seen"`

### `src/webview/styles.js`

Add `.team-phase-badge` and tone variants:

```css
.team-phase-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}
.team-phase-badge.tone-planning { color: var(--muted); background: var(--panel); border: 1px solid var(--line); }
.team-phase-badge.tone-scaffold { color: var(--cyan); background: color-mix(in srgb, var(--cyan) 12%, transparent); border: 1px solid color-mix(in srgb, var(--cyan) 30%, var(--line)); }
.team-phase-badge.tone-running  { color: var(--blue); background: color-mix(in srgb, var(--blue) 12%, transparent); border: 1px solid color-mix(in srgb, var(--blue) 30%, var(--line)); }
.team-phase-badge.tone-integration { color: var(--purple); background: color-mix(in srgb, var(--purple) 12%, transparent); border: 1px solid color-mix(in srgb, var(--purple) 30%, var(--line)); }
.team-phase-badge.tone-complete { color: var(--green); background: color-mix(in srgb, var(--green) 12%, transparent); border: 1px solid color-mix(in srgb, var(--green) 30%, var(--line)); }
.team-phase-badge.tone-warn     { color: var(--red); background: color-mix(in srgb, var(--red) 12%, transparent); border: 1px solid color-mix(in srgb, var(--red) 30%, var(--line)); }
```

**Light-theme overrides:**

```css
body:is(.color-theme-light, ...) .team-phase-badge.tone-scaffold { background: color-mix(in srgb, var(--cyan) 9%, var(--panel-elevated)); }
body:is(.color-theme-light, ...) .team-phase-badge.tone-running  { background: color-mix(in srgb, var(--blue) 9%, var(--panel-elevated)); }
body:is(.color-theme-light, ...) .team-phase-badge.tone-integration { background: color-mix(in srgb, var(--purple) 9%, var(--panel-elevated)); }
body:is(.color-theme-light, ...) .team-phase-badge.tone-complete { background: color-mix(in srgb, var(--green) 9%, var(--panel-elevated)); }
body:is(.color-theme-light, ...) .team-phase-badge.tone-warn     { background: color-mix(in srgb, var(--red) 9%, var(--panel-elevated)); }
```

## Acceptance

- [x] A running task shows its current Phase label next to the status badge
- [x] Phase changes as evidence accumulates (no manual input needed)
- [x] Phase badge color uses semantic tone classes
- [x] Failed tasks show `"FAILED"` badge in red instead of a phase
- [x] Badge renders correctly in light theme
- [x] Badge does not overlap or push other header elements out of layout
