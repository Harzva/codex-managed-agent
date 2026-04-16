## What Changed

- Replaced the full rerender for `promptQueued` / `promptQueueFailed` with a local pending-prompt DOM sync path.
- Thread rows, spotlight, and running cards now expose stable pending-prompt slots so queued and failed prompt cues update in place.
- The change stayed scoped to pending-prompt cues and did not widen into `autoContinueConfigPatched`.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cma-codex-communication-optimization-task-plan.md`
- Bounded target: replace full rerender for `promptQueued` / `promptQueueFailed` with a local pending-prompt DOM sync path only

## Validation

- `node --check src/webview-template.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Audit the next smallest rerender-heavy mutation after the pending-prompt DOM sync without widening into broader render-reduction work
