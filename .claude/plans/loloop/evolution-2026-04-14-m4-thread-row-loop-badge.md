# Evolution Note — Milestone 4 Thread Row Loop Badge

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 4 — Operational Reliability`
- bounded target: add one compact auto-loop state badge to thread rows so loop status is scannable outside the board card

## Completed

- Added a compact loop-state badge renderer that reuses the existing auto-loop state machine from `autoContinueConfigs`
- Exposed `Loop Armed / Queued / Running / Failed / Succeeded` directly in thread-row toplines
- Reused the existing loop-status color semantics with only a small compact-thread-row sizing adjustment
- Kept the change scoped to the compact scanning surface without altering the richer board-card loop panel
- Validated the edited file with `node --check src/webview-template.js`
- Packaged the extension successfully with `npm run package`

## Failed or Deferred

- No spotlight or drawer-level compact loop badge was added
- No detached-launch or log-tail behavior changed in this slice

## Decisions

- Fixed the first scanning-surface visibility gap before changing any host-side loop orchestration
- Left broader loop-status semantics review for the next bounded slice

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 4. Do one minimal slice only: run a thread-row loop-status scanning exit review to decide whether this visibility path is now good enough to move on to the next operational reliability gap, then update the active plan, append a new evolution note, and sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`.
```
