## What Changed

- Re-entered `task-plans/codex-loop-control-surface-task-plan.md` and audited the first smallest gap.
- Confirmed the minimum missing surface is daemon running-state visibility: there is no current host/UI path for `codex-loop` daemon status or `.codex-loop/state` metadata inside the extension.
- Rejected widening into watch/tail or runtime controls because they depend on first exposing whether the daemon is up at all.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/codex-loop-control-surface-task-plan.md`
- Bounded target: show `codex-loop` daemon running state in the extension before adding watch/tail or runtime controls

## Validation

- Review-only slice; no code changes and no package run needed

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Patch daemon running-state visibility only
