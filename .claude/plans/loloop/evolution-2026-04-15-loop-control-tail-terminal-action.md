## What Changed

- Added one `Tail in Terminal` action to the loop daemon summary card by reusing the existing `runCommandInTerminal` message path.
- Shell-quoted the log path before building `tail -f ...` so paths with spaces or quotes stay valid in the launched terminal command.
- With `Open Latest Log` and `Tail in Terminal` both present, the quick watch/tail action step is now covered without adding embedded tail UI.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/codex-loop-control-surface-task-plan.md`
- Bounded target: finish the terminal tail bridge, then audit the compact recent-log tail gap

## Validation

- `node --check src/webview-template.js`
- `node --check src/host/state-sync.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Audit the smallest compact recent-log tail gap
