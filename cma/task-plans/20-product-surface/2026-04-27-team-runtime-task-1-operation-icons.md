# Task 1 — Operation Type Icons

## Status

- [x] Complete (2026-05-07)

Completion note:
- Implemented `eventTypeIcon()` in `src/webview-template.js`.
- Timeline events render `.timeline-event-icon`.
- Team mini logs render `.team-log-icon`.
- Styles live in `src/webview/styles.js`.
- Regression coverage is anchored in `src/webview/render-detail-regression.test.js`.

## Parent

[`2026-04-27-team-runtime-visualization-roadmap.md`](./2026-04-27-team-runtime-visualization-roadmap.md)

## Objective

Map common runtime event types to emoji/icon glyphs, then render them in `renderTeamMiniLogs` and `renderTimelineEvent`.

## Why

Today timeline events and mini logs are plain text. Users cannot distinguish a terminal command from a file read from a planning step without reading the full label. Icons provide instant scannability.

## Icon Mapping

| Event type prefix | Icon | Example events |
|-------------------|------|----------------|
| `run.terminal` | 🖥️ | `run.terminal`, `command.exec` |
| `file.read`, `read` | 📄 | `file.read`, `read_document` |
| `file.create`, `file.write` | 📁 | `file.create`, `file.write`, `save` |
| `thinking`, `plan`, `reasoning` | 💡 | `thinking`, `plan`, `reasoning_step` |
| `task.plan`, `todo`, `schedule` | 📝 | `task.plan`, `todo.create`, `schedule.update` |
| `agent.create`, `spawn`, `worker` | 👤 | `agent.create`, `spawn_worker`, `worker.start` |
| `trace.*` | 🔍 | `trace.event`, `trace.record` |
| `blackboard.*` | 📋 | `blackboard.write`, `blackboard.update` |
| `result.*`, `complete`, `done` | ✅ | `result.captured`, `task.completed`, `run.done` |
| `error.*`, `fail`, `blocked` | ❌ | `error.runtime`, `task.failed`, `run.blocked` |
| (fallback) | ● | Any unmatched type |

Matching rule: case-insensitive prefix match on the event `type` or `kind` field. Longest prefix wins (e.g., `file.create` matches `📁` before `file.*` matches anything else).

## Files to Modify

### `src/webview-template.js`

1. **Add `eventTypeIcon(type)` helper** (near `humanizeTeamTimelineType` or other timeline helpers):

```javascript
function eventTypeIcon(type) {
  const t = String(type || "").toLowerCase();
  const table = [
    { prefix: "run.terminal", icon: "🖥️" },
    { prefix: "file.create", icon: "📁" },
    { prefix: "file.write", icon: "📁" },
    { prefix: "file.read", icon: "📄" },
    { prefix: "read", icon: "📄" },
    { prefix: "thinking", icon: "💡" },
    { prefix: "plan", icon: "💡" },
    { prefix: "reasoning", icon: "💡" },
    { prefix: "task.plan", icon: "📝" },
    { prefix: "todo", icon: "📝" },
    { prefix: "schedule", icon: "📝" },
    { prefix: "agent.create", icon: "👤" },
    { prefix: "spawn", icon: "👤" },
    { prefix: "worker", icon: "👤" },
    { prefix: "trace", icon: "🔍" },
    { prefix: "blackboard", icon: "📋" },
    { prefix: "result", icon: "✅" },
    { prefix: "complete", icon: "✅" },
    { prefix: "done", icon: "✅" },
    { prefix: "error", icon: "❌" },
    { prefix: "fail", icon: "❌" },
    { prefix: "blocked", icon: "❌" },
  ];
  for (const entry of table) {
    if (t.startsWith(entry.prefix)) return entry.icon;
  }
  return "●";
}
```

2. **Insert icon into `renderTimelineEvent`**:
   - Add `<span class="timeline-event-icon">` + `eventTypeIcon(tone || title)` + `</span>` before the title
   - The icon sits inside `.timeline-event-head`, left of the title

3. **Insert icon into `renderTeamMiniLogs`**:
   - Add icon span inside `.team-log-kind` or as a sibling before `.team-log-main`
   - Example: `<span class="team-log-icon">${eventTypeIcon(type)}</span>`

### `src/webview/styles.js`

Add near existing `.timeline-event` or `.team-mini-log` styles:

```css
.timeline-event-icon {
  font-size: 14px;
  line-height: 1;
  margin-right: 6px;
  flex-shrink: 0;
  opacity: 0.9;
}
.team-log-icon {
  font-size: 13px;
  line-height: 1;
  margin-right: 6px;
  flex-shrink: 0;
  opacity: 0.85;
}
```

No light-theme override needed (emoji/icons render the same on all backgrounds).

## Acceptance

- [x] Timeline events show a left-aligned icon
- [x] Mini log rows show an icon in the `team-log-kind` slot or equivalent
- [x] Unknown types fall back to `●`
- [x] Icons do not wrap or clip at narrow widths (`flex-shrink: 0`)
- [x] Existing `render-detail-regression.test.js` passes
