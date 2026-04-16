## What Changed

- Audited the last remaining fresh-start gap after stop, restart, and unexpected-exit consistency landed.
- Confirmed that the smallest remaining path is not fresh thread selection; it is replaying the last-known daemon thread and interval when the daemon is stopped.
- Narrowed the next slice to one bounded start-loop action on top of the existing replayable daemon config.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/codex-loop-control-surface-task-plan.md`
- Bounded target: add one replay-based start-loop path using the last-known daemon config

## Validation

- Review-only slice; no code changes and no package run needed

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Patch one replay-based start-loop path only
