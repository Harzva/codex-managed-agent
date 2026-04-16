## What Changed

- Audited the first smallest per-card enablement gap after loop-managed identity became visible.
- Confirmed the missing piece is a bounded host-side write path: the extension can read daemon state, but it still cannot steer which thread the daemon should manage.
- Inference: `thread_mode: "forced_thread"` plus `.codex-loop/state/thread_id.txt` suggests the smallest enablement bridge is to let one card hand off its thread id into that state file before adding interval presets or custom input.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/codex-loop-control-surface-task-plan.md`
- Bounded target: add one managed-thread handoff path via `.codex-loop/state/thread_id.txt`

## Validation

- Review-only slice; no code changes and no package run needed

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Patch one managed-thread handoff path only
