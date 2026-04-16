# Evolution Note — Milestone 4 Degraded Log Action

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 4 — Operational Reliability`
- bounded target: add one direct service-log open action in degraded-state UI

## Completed

- Reused the existing `data-open-log` path in the degraded `serviceBanner`
- Added an `Open Service Log` action when the service exposes a `logPath` during degraded state
- Kept the change scoped to degraded-state recovery UI without altering status-line semantics or server launch logic
- Validated the edited file with `node --check src/webview-template.js`
- Packaged the extension successfully with `npm run package`

## Failed or Deferred

- No status-line log action was added
- No restart flow or server lifecycle behavior changed in this slice

## Decisions

- Used the degraded banner as the smallest recovery-oriented place for direct service-log access
- Left broader degraded-state review for the next bounded slice

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 4. Do one minimal slice only: run a degraded-state log-action exit review to decide whether this recovery path is now good enough to move on to the next operational reliability gap, then update the active plan, append a new evolution note, and sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`.
```
