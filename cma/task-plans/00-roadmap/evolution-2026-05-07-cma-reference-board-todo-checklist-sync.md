# Evolution: Board TODO Checklist Sync

Date: 2026-05-07

## Scope

Turned the Board `TODO` page from a static note into a live roadmap checklist surface.

## Completed

- Added host-side reading for `task-plans/subtask_json/index.json`.
- Loaded each referenced subtask JSON and summarized:
  - total subtasks
  - completed subtasks
  - total checklist items
  - completed checklist items
  - open checklist items
- Included `roadmapChecklist` in the webview state payload across normal, degraded, stale, and partial refresh paths.
- Updated the Board `TODO` pane to render live checklist status instead of hardcoded next-step copy.
- When all referenced roadmap subtasks are complete, the TODO pane now says so and shifts to release/runtime verification guidance.

## Verification

- `node --check src/host/state-sync.js`
- `node --check src/webview-template.js`
