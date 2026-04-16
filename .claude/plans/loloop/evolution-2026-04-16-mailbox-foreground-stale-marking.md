## Loop Type
- type: execution

## What Changed
- Added a foreground supervisor stale-marking action in `src/host/team-coordination.js`.
- The action marks only expired `running` task leases as `stale`, preserves owner/result data, appends `task.stale`, and refreshes mailbox state.
- Wired the action through the panel method and webview message dispatch without adding background reclamation or changing dashboard layout.
- Recorded the hardening slice in `task-plans/codex-team-mailbox-loop-task-plan.md`.

## Plan
- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/codex-team-mailbox-loop-task-plan.md`
- Bounded target: foreground supervisor stale marking

## Validation
- `node --check src/host/team-coordination.js`
- `node --check src/panel.js`
- `node --check src/host/panel-view.js`
- `npm run package`
- Result: passed; package output was 86 files, 389.86 KB.

## Next Handoff
- Follow `.claude/plans/ACTIVE_PLAN.md`.
- Audit the stale-marking action before adding any new mailbox behavior or delivery-hygiene slice.
