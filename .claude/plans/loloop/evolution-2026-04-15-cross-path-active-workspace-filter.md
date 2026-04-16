## What Changed

- Added one bounded active-workspace filter entrypoint in the thread summary controls, backed by the emitted `workspaceRoots` metadata.
- Kept the slice compatible with existing root, topic, search, and pinned-thread matching by composing it inside `threadMatches`.
- Left Task 2 open and narrowed the next step to an audit of the smallest remaining filtering gap.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cross-path-unified-management-task-plan.md`
- Bounded target: add one active-workspace filter entrypoint

## Validation

- `node --check src/webview-template.js`
- `node --check src/host/state-sync.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Audit the smallest remaining Task 2 filtering gap
