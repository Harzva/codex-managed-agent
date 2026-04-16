## What Changed

- Tightened loop-daemon status rendering so an exited daemon no longer keeps presenting stale live-heartbeat semantics.
- When the pid is dead but the last heartbeat was not cleanly stopped, the daemon surface now resolves to an explicit exited state instead of looking like an active loop.
- Closed the unexpected-exit consistency portion of Task 4 and narrowed the remaining work to fresh-start control only.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/codex-loop-control-surface-task-plan.md`
- Bounded target: finish the unexpected-exit consistency patch and then audit the smallest remaining fresh-start gap

## Validation

- `node --check src/host/state-sync.js`
- `node --check src/webview-template.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Audit the smallest fresh-start gap next
