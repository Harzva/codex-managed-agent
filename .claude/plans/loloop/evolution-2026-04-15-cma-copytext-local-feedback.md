## What Changed

- Removed the unnecessary silent dashboard refresh from `copyText()`.
- Clipboard actions now stay local: they update the clipboard and status message only, without forcing a background refresh for a non-mutating path.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cma-codex-communication-optimization-task-plan.md`
- Bounded target: eliminate the refresh from `copyText()` only

## Validation

- `node --check src/host/lifecycle.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Audit the next smallest refresh-heavy local action after `copyText()` without widening into server-backed lifecycle work
