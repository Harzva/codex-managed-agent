## What Changed

- Audited the next smallest rerender-heavy mutation after the bounded `threadsRemoved` local DOM removal path.
- Confirmed the next bounded gap is `threadsPatched`: host already sends a narrow batch patch message, but webview still responds with unconditional `render(state.payload)`.
- Rejected widening into broader render-reduction work because batch patching is the closest remaining lifecycle path.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cma-codex-communication-optimization-task-plan.md`
- Bounded target: replace full rerender for `threadsPatched` with a bounded local DOM sync path only

## Validation

- Review-only slice; no code changes and no package run needed

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Patch `threadsPatched` only and keep broader render-reduction work out of scope
