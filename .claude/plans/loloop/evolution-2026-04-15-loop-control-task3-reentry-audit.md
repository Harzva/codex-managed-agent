## What Changed

- Audited the first smallest per-card loop-control gap after Task 2 watch/tail surfaces closed.
- Confirmed the smallest missing bridge is current loop-managed identity: the daemon state already exposes one managed `threadId`, but no thread row, spotlight, or running card shows which card is currently under `codex-loop` management.
- Rejected jumping straight to interval presets or custom input because those controls would land without a visible card-level anchor first.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/codex-loop-control-surface-task-plan.md`
- Bounded target: show which card is currently loop-managed

## Validation

- Review-only slice; no code changes and no package run needed

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Patch one loop-managed card indicator only
