## What Changed

- Audited the next smallest rerender-heavy mutation after the bounded `threadRemoved` local DOM removal path.
- Confirmed the next bounded gap is `threadsRemoved`: it is the closest remaining structural removal path and still triggers unconditional `render(state.payload)`.
- Rejected widening into `threadsPatched` or broader render-reduction work because batch removal stays closer to the single-thread removal slice that just landed.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cma-codex-communication-optimization-task-plan.md`
- Bounded target: replace full rerender for `threadsRemoved` with a bounded local DOM removal path only

## Validation

- Review-only slice; no code changes and no package run needed

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Patch `threadsRemoved` only and keep `threadsPatched` plus broader render-reduction work out of scope
