## What Changed

- Added a lightweight `autoContinueConfigPatched` host-to-webview path so arming, queueing, failing, and clearing auto-continue no longer need an immediate full dashboard refresh to show updated state.
- Reused the existing local patch model in the webview so loop badges and running cards read optimistic auto-continue state from a small local map before the next normal poll arrives.
- Kept the slice bounded to Task 1 by only touching queued-state feedback and existing loop status surfaces.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cma-codex-communication-optimization-task-plan.md`
- Bounded target: add optimistic queued-state feedback for `auto-continue` without widening into Task 2 refresh-path work

## Validation

- `node --check src/webview-template.js`
- `node --check src/host/auto-continue.js`
- `node --check src/panel.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Review Task 1 first; only patch the smallest remaining optimistic-state gap before opening the Codex link-sync work
