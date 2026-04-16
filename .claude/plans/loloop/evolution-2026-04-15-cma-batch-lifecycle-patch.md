## What Changed

- Replaced the full refresh in the batch branch of `runLifecycleAction()` with bounded local batch updates.
- Batch archive/unarchive/soft-delete/restore actions now send `threadsPatched`; batch hard-delete now sends `threadsRemoved`.
- The webview applies those batch payload changes locally and rerenders once, while the batch failure path still keeps silent refresh recovery.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cma-codex-communication-optimization-task-plan.md`
- Bounded target: reduce full refresh in the batch branch of `runLifecycleAction()` with a bounded batch patch path only

## Validation

- `node --check src/host/lifecycle.js`
- `node --check src/webview-template.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Audit the next smallest refresh-heavy mutation after the batch lifecycle patch without widening into broader render-reduction work
