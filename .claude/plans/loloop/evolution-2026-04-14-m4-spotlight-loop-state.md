# Evolution Note — Milestone 4 Spotlight Loop State

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 4 — Operational Reliability`
- bounded target: add one compact auto-loop state metric to the spotlight surface

## Completed

- Extracted the existing auto-loop state label logic into a shared helper for compact surfaces
- Added an `Auto Loop` metric to the selected-thread spotlight surface
- Kept the metric compact and reused the same `Off / Armed / Queued / Running / Failed / Succeeded` semantics already used elsewhere
- Validated the edited file with `node --check src/webview-template.js`
- Packaged the extension successfully with `npm run package`

## Failed or Deferred

- No drawer-level loop-state metric was added
- No host-side loop-state inference logic changed in this slice

## Decisions

- Used a compact spotlight metric instead of duplicating the richer board-card loop panel
- Left broader inspector-level status review for the next bounded slice

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 4. Do one minimal slice only: run a spotlight loop-state exit review to decide whether this inspector-level status path is now good enough to move on to the next operational reliability gap, then update the active plan, append a new evolution note, and sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`.
```
