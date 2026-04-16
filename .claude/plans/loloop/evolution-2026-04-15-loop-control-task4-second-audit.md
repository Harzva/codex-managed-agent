## What Changed

- Audited the next smallest runtime control gap after the bounded stop-loop path landed.
- Confirmed that `restart` is narrower than `start` because the current daemon state already exposes the active thread and interval needed to replay the launch.
- Narrowed the next slice to one bounded restart-loop path instead of opening a broader fresh-start flow.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/codex-loop-control-surface-task-plan.md`
- Bounded target: add one restart-loop path by replaying the current daemon config

## Validation

- Review-only slice; no code changes and no package run needed

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Patch one restart-loop path only
