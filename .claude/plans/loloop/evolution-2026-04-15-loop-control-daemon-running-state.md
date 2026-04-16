## What Changed

- Added a minimal host-side `codex-loop` daemon state reader from `.codex-loop/state` and exposed its running/stopped state through the dashboard payload.
- Added a small `Loop Daemon` summary card in the extension overview so daemon presence is visible without opening a terminal.
- Kept the slice bounded: no thread id, launcher, heartbeat detail, watch/tail, or runtime controls yet.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/codex-loop-control-surface-task-plan.md`
- Bounded target: show `codex-loop` daemon running state in the extension before adding watch/tail or runtime controls

## Validation

- `node --check src/host/state-sync.js`
- `node --check src/webview-template.js`
- `npm run package` (first run hit a transient VSIX file-stream race while `.codex-loop/` changed; second run passed)

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Audit the next smallest loop-status metadata gap after daemon running-state visibility
