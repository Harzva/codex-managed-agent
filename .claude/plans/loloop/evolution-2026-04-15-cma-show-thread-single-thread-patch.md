## What Changed

- Replaced the full refresh after `showThreadInCodex()` with a bounded single-thread patch.
- Host now patches the unarchived thread into `panel.lastPayload` and sends a dedicated `threadPatched` message.
- Webview now merges the thread patch locally, syncs title slots when needed, and reuses the existing status/link DOM sync path instead of forcing a full rerender.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cma-codex-communication-optimization-task-plan.md`
- Bounded target: replace `showThreadInCodex()` full refresh with a single-thread status/link update path only

## Validation

- `node --check src/host/lifecycle.js`
- `node --check src/webview-template.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Audit the next smallest refresh-heavy mutation after `showThreadInCodex()` without widening into batch lifecycle actions
