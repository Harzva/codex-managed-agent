## What Changed

- Audited the first smallest runtime control gap after Task 3 closed.
- Confirmed that `stop` is the narrowest next runtime action because the daemon script already honors `.codex-loop/state/stop.flag`.
- Rejected jumping straight to `start` or `restart` because those paths are broader than the existing stop-flag contract.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/codex-loop-control-surface-task-plan.md`
- Bounded target: add one stop-loop control path on top of the existing stop-flag contract

## Validation

- Review-only slice; no code changes and no package run needed

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Patch one stop-loop control path only
