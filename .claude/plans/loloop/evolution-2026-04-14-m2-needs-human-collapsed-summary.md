# Evolution Note — Milestone 2 Needs Human Collapsed Summary

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 2 — Board Interaction Quality`
- bounded target: keep a collapsed `Needs Human` summary visible so urgent count stays legible without reopening the compact dock

## Completed

- Audited the collapsed `Needs Human` dock behavior in `src/webview-template.js`
- Added a dedicated `intervention-dock-summary` row to the dock markup
- Updated collapsed-state CSS so the summary stays visible while the detailed note and compact card grid remain hidden
- Kept the summary scoped to urgent-count legibility instead of reopening or redesigning the dock
- Validated the edited file with `node --check src/webview-template.js`
- Packaged the extension successfully with `npm run package`

## Failed or Deferred

- The compact intervention dock still uses the same animated intervention-card styling as the main board
- No browser-driven interaction test was added; validation remained syntax plus package-build level

## Decisions

- Preserved the user's collapsed state and surfaced only the minimum useful summary text
- Kept the change in the dock itself instead of duplicating more `Needs Human` state into other surfaces

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 2. Do one minimal slice only: reduce compact `Needs Human` visual competition so urgent cards remain visible without overpowering the main board, then validate packaging, sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`, update the active plan, and append a new evolution note.
```
