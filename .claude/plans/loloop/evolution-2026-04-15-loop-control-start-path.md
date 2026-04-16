## What Changed

- Added one bounded replay-based start-loop path using the last-known daemon thread and interval when the daemon is stopped.
- The loop daemon summary card now exposes a `Start Loop` action when replayable daemon config is available and no daemon is currently running.
- Closed the last remaining runtime-control item, which brings `task-plans/codex-loop-control-surface-task-plan.md` to completion pending exit review.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/codex-loop-control-surface-task-plan.md`
- Bounded target: land the last fresh-start path and then run a track exit review

## Validation

- `node --check src/host/lifecycle.js`
- `node --check src/host/panel-view.js`
- `node --check src/panel.js`
- `node --check src/webview-template.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Review whether the loop-control-surface track can now close
