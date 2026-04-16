## What Changed

- Replaced host-side full-payload link-state replay with a dedicated `codexLinkStatePatched` message so Codex tab watcher changes no longer call `broadcastState(panel.lastPayload)` just to update `open / focused / linked` state.
- Added a bounded webview patch path that merges only `codexLinkState` into the current payload before rerendering.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cma-codex-communication-optimization-task-plan.md`
- Bounded target: finish the first Task 2 slice by moving Codex link-state sync off the host full-payload replay path

## Validation

- `node --check src/host/state-sync.js`
- `node --check src/webview-template.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Review only the remaining webview rerender cost for link-state patches before attempting broader render-reduction work
