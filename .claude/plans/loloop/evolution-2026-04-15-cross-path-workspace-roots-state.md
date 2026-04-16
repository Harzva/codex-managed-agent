## What Changed

- Added `workspaceRoots` to host state so the extension payload now carries normalized active-workspace root metadata alongside dashboard threads.
- Kept the slice bounded to state emission only; no filtering UI changed in this pass.
- Narrowed the next step to a single active-workspace filter entrypoint built on top of `workspaceRoots`.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cross-path-unified-management-task-plan.md`
- Bounded target: emit active-workspace roots into host state

## Validation

- `node --check src/host/state-sync.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Add one bounded active-workspace filter entrypoint
