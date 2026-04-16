## What Changed

- Added one bounded host-side handoff path that writes `.codex-loop/state/thread_id.txt` from the extension.
- Added one card-level entrypoint in the selected-agent spotlight so a thread can be handed off into loop management without leaving the managed surface.
- Kept scope out of interval presets, custom interval input, and runtime loop actions.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/codex-loop-control-surface-task-plan.md`
- Bounded target: close the first per-card enablement slice with one `thread_id.txt` handoff path and one UI entrypoint

## Validation

- `node --check src/host/lifecycle.js`
- `node --check src/host/panel-view.js`
- `node --check src/panel.js`
- `node --check src/webview-template.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Audit the smallest interval-preset gap next
