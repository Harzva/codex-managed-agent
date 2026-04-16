# Evolution Note — Milestone 2 Needs Human Compact Tone Down

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 2 — Board Interaction Quality`
- bounded target: reduce compact `Needs Human` visual competition so urgent cards remain visible without overpowering the main board

## Completed

- Audited intervention-card styling shared by the main board and compact `Needs Human` dock
- Added compact-dock-specific CSS overrides for intervention cards in `src/webview-template.js`
- Disabled the intervention pulse animation inside the compact `Needs Human` dock
- Reduced the compact intervention-card shadow so the dock stays readable without stealing focus from the main board
- Validated the edited file with `node --check src/webview-template.js`
- Packaged the extension successfully with `npm run package`

## Failed or Deferred

- No new board-level interaction guardrail was added in this slice
- No browser-driven interaction test was added; validation remained syntax plus package-build level

## Decisions

- Limited the change to compact-dock CSS so main-board intervention emphasis stays intact
- Treated motion and heavy glow as the smallest removable source of visual competition

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 2. Do one minimal slice only: add one board interaction guardrail that reduces accidental layout edits without weakening the main board workflow, then validate packaging, sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`, update the active plan, and append a new evolution note.
```
