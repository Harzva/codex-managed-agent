## What Changed

- Audited the next smallest rerender-heavy mutation after the auto-loop DOM sync.
- Confirmed the next bounded gap is `threadRemoved`: it only removes one thread from local payload state, but it still triggers unconditional `render(state.payload)`.
- Rejected widening into `threadsRemoved` or broader render-reduction work because single-thread removal is the smaller structural DOM path.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cma-codex-communication-optimization-task-plan.md`
- Bounded target: replace full rerender for `threadRemoved` with a bounded local DOM removal path only

## Validation

- Review-only slice; no code changes and no package run needed

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Patch `threadRemoved` only and keep `threadsRemoved` plus broader render-reduction work out of scope
