## What Changed

- Added one bounded restart-loop path by replaying the current daemon thread and interval after stop.
- The loop daemon summary card now exposes a `Restart Loop` action, and the host side fulfills it by waiting on the stop-flag shutdown and then reissuing the daemon command with the current thread and interval.
- Closed only the restart portion of Task 4; fresh start and unexpected-exit consistency remain open.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/codex-loop-control-surface-task-plan.md`
- Bounded target: land one restart-loop path and then audit the smallest remaining runtime control gap

## Validation

- `node --check src/host/lifecycle.js`
- `node --check src/host/panel-view.js`
- `node --check src/panel.js`
- `node --check src/webview-template.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Audit the next smallest runtime control gap
