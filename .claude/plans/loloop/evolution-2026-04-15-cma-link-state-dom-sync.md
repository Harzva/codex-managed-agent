## What Changed

- Added a local DOM sync path for `codexLinkStatePatched` so the webview no longer defaults to `render(state.payload)` for link-state-only messages.
- Added stable DOM slots for thread-row status/link badges, spotlight Codex link indicators, and running-card link/status surfaces, then patched those slots directly from the updated `codexLinkState`.
- Kept a bounded fallback: if the expected DOM slots are unavailable, the webview still falls back to full render instead of dropping the update.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cma-codex-communication-optimization-task-plan.md`
- Bounded target: complete the second Task 2 slice by scoping link-state patch updates to local DOM sync

## Validation

- `node --check src/webview-template.js`
- `node --check src/host/state-sync.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Review only the remaining board/thread-list consistency behavior for link-state patches before deciding whether Task 2 can close
