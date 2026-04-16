## What Changed

- Added one bounded stop-loop control path on top of the existing daemon stop-flag contract.
- The loop daemon summary card now exposes a `Stop Loop` action, and the host side fulfills it by writing `.codex-loop/state/stop.flag` and refreshing state.
- Closed only the stop portion of Task 4; start, restart, and unexpected-exit handling remain open.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/codex-loop-control-surface-task-plan.md`
- Bounded target: land one stop-loop control path and then audit the smallest remaining runtime control gap

## Validation

- `node --check src/host/lifecycle.js`
- `node --check src/host/panel-view.js`
- `node --check src/panel.js`
- `node --check src/webview-template.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Audit the next smallest runtime control gap
