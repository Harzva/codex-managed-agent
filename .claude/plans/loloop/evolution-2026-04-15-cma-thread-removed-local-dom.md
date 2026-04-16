## What Changed

- Replaced the unconditional full rerender for `threadRemoved` with a bounded local DOM removal path when the deleted thread only affects explorer rows.
- Kept explicit fallbacks for selected, pinned, board-attached, running, or spotlight-linked threads so structural surfaces still rerender safely when needed.
- Left `threadsRemoved` and broader render-reduction work out of scope.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cma-codex-communication-optimization-task-plan.md`
- Bounded target: replace full rerender for `threadRemoved` with a bounded local DOM removal path only

## Validation

- `node --check src/webview-template.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Audit the next smallest rerender-heavy mutation after the bounded `threadRemoved` local DOM removal path
