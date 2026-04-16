# Evolution Note — Milestone 2 Needs Human Auto Expand

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 2 — Board Interaction Quality`
- bounded target: improve `Needs Human` occupancy/collapse behavior so new urgent cards do not stay hidden behind a persisted collapsed state

## Completed

- Audited `Needs Human` dock state around `interventionCollapsed` and `interventionThreads`
- Added a transient intervention-count tracker in `src/webview-template.js`
- Updated the board render path so the dock auto-expands when urgent intervention cards appear after previously having none
- Kept the change scoped to the `0 -> >0` transition instead of forcing the dock open on every render
- Validated the edited file with `node --check src/webview-template.js`
- Packaged the extension successfully with `npm run package`

## Failed or Deferred

- The collapsed state still hides the dock body completely once the user re-collapses it
- No browser-driven interaction test was added; validation remained syntax plus package-build level

## Decisions

- Treated newly appearing urgent cards as a stronger signal than remembered collapse preference
- Kept the fix transient and minimal rather than redesigning the `Needs Human` dock structure in the same pass

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 2. Do one minimal slice only: keep a collapsed `Needs Human` summary visible so the urgent count remains legible without reopening the compact dock, then validate packaging, sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`, update the active plan, and append a new evolution note.
```
