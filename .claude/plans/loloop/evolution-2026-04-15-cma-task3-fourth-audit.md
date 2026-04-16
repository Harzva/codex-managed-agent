## What Changed

- Audited the next smallest refresh-heavy mutation after `showThreadInCodex()`.
- Confirmed the remaining bounded gap is the single-thread branch of `runLifecycleAction()`: one-thread archive/unarchive/delete-style mutations still force a full refresh even though the next step does not need batch-wide recomputation.
- Rejected widening into batch lifecycle work because the smaller, reviewable cut is still available inside the one-thread path.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cma-codex-communication-optimization-task-plan.md`
- Bounded target: replace full refresh in the single-thread branch of `runLifecycleAction()` with a bounded thread patch path only

## Validation

- Review-only slice; no code changes and no package run needed

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Patch the single-thread branch of `runLifecycleAction()` only and keep batch lifecycle behavior unchanged
