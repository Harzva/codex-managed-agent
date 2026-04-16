## What Changed

- Added a lightweight optimistic queued-state path for `sendPrompt` so the webview shows `Prompt Queued` immediately on thread rows, running cards, and spotlight without forcing an immediate full dashboard refresh.
- Added explicit local failure fallback for prompt queueing; failed launches now flip the optimistic cue to `Prompt Failed` instead of silently waiting for the next poll.
- Kept backend confirmation bounded to the normal refresh loop by reconciling the optimistic cue against later thread updates and running-state changes.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cma-codex-communication-optimization-task-plan.md`
- Bounded target: complete the `sendPrompt` optimistic queued-state slice only

## Validation

- `node --check src/webview-template.js`
- `node --check src/host/auto-continue.js`
- `node --check src/host/state-sync.js`
- `node --check src/panel.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Apply the same local queued-state pattern to `auto-continue` without widening into general refresh-path refactors
