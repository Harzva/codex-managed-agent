## What Changed

- Added host-side root identity normalization so dashboard threads now carry stable `rootKey` and compact `rootLabel` metadata derived from normalized workspace paths.
- Updated the existing root pill and root filter logic to read that host metadata instead of relying only on the last `cwd` segment inside the webview.
- Marked the path-normalization item complete and narrowed the next slice to grouping by stable root identity.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cross-path-unified-management-task-plan.md`
- Bounded target: land the first Task 1 path-model slice with host-side root identity

## Validation

- `node --check src/host/state-sync.js`
- `node --check src/webview-template.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Build the next bounded Task 1 slice on top of `rootKey` and `rootLabel`
