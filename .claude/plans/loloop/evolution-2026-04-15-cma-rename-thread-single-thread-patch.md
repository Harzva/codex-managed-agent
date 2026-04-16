## What Changed

- Replaced the success-path full refresh after `renameThread()` with a bounded single-thread title patch.
- Host now patches the renamed thread into `panel.lastPayload` and sends a dedicated `threadTitlePatched` message.
- Webview now patches title state locally and syncs title slots in thread rows, spotlight, and running cards before falling back to full render.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cma-codex-communication-optimization-task-plan.md`
- Bounded target: replace `renameThread()` full refresh with a single-thread title update path only

## Validation

- `node --check src/host/lifecycle.js`
- `node --check src/webview-template.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Audit the next smallest refresh-heavy mutation after `renameThread()` without widening into batch lifecycle actions
