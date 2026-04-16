## What Changed

- Added a bounded `Loop Managed` badge helper that lights up when a thread id matches the daemon-managed `loopDaemon.threadId`.
- Reused existing status-badge slots in thread rows, spotlight, and running cards instead of introducing a new control strip.
- This closes the card-identity bridge needed before per-card enablement controls can make sense.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/codex-loop-control-surface-task-plan.md`
- Bounded target: land loop-managed identity, then audit the first per-card enablement gap

## Validation

- `node --check src/webview-template.js`
- `node --check src/host/state-sync.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Audit the first per-card enablement gap
