## What Changed

- Audited the next smallest rerender-heavy mutation after the batch lifecycle patch.
- Confirmed the next bounded gap is `promptQueued` / `promptQueueFailed`: both only change pending-prompt cues but still trigger `render(state.payload)` on arrival.
- Rejected widening to `autoContinueConfigPatched` because its affected surfaces are broader; pending-prompt cues are the smaller, reviewable cut.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cma-codex-communication-optimization-task-plan.md`
- Bounded target: replace full rerender for `promptQueued` / `promptQueueFailed` with a local pending-prompt DOM sync path only

## Validation

- Review-only slice; no code changes and no package run needed

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Patch `promptQueued` / `promptQueueFailed` only and keep `autoContinueConfigPatched` out of scope
