## What Changed

- Expanded the minimal `codex-loop` daemon payload so the existing loop daemon card now carries current thread id, launcher, and heartbeat metadata from `.codex-loop/state`.
- Kept the UI surface unchanged and bounded: the metadata is folded into the existing daemon card detail instead of introducing a new panel or controls.
- Left last tick summary, watch/tail, and runtime controls out of scope.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/codex-loop-control-surface-task-plan.md`
- Bounded target: add current thread id, launcher, and heartbeat metadata to the loop daemon surface

## Validation

- `node --check src/host/state-sync.js`
- `node --check src/webview-template.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Audit the next smallest loop-status gap after thread id, launcher, and heartbeat metadata
