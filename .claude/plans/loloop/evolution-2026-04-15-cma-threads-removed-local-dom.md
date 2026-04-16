## What Changed

- Replaced the unconditional full rerender for `threadsRemoved` with a bounded local DOM removal path when every deleted thread only affects explorer rows.
- Reused the same safety guard as `threadRemoved`, so batch removal still falls back to full rerender when selected, pinned, board-attached, running, or spotlight-linked threads are involved.
- Left `threadsPatched` and broader render-reduction work out of scope.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cma-codex-communication-optimization-task-plan.md`
- Bounded target: replace full rerender for `threadsRemoved` with a bounded local DOM removal path only

## Validation

- `node --check src/webview-template.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Audit the next smallest rerender-heavy mutation after the bounded `threadsRemoved` local DOM removal path
