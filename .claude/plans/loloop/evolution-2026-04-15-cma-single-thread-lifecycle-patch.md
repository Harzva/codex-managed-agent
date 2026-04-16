## What Changed

- Replaced the full refresh in the single-thread branch of `runLifecycleAction()` with bounded local thread updates.
- One-thread archive/unarchive/soft-delete/restore actions now send `threadPatched`; one-thread hard-delete now sends `threadRemoved`.
- Batch lifecycle behavior remains unchanged, and the webview only rerenders locally when a removed thread must be taken out of the current payload.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cma-codex-communication-optimization-task-plan.md`
- Bounded target: replace full refresh in the single-thread branch of `runLifecycleAction()` with a bounded thread patch path only

## Validation

- `node --check src/host/lifecycle.js`
- `node --check src/webview-template.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Audit the next smallest refresh-heavy mutation after the single-thread lifecycle patch without widening into broader render-reduction work
