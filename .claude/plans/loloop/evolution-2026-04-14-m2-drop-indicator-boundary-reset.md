# Evolution Note — Milestone 2 Drop Indicator Boundary Reset

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 2 — Board Interaction Quality`
- bounded target: make the board drop preview clear reliably when drag leaves card and board boundaries

## Completed

- Audited running-card and board-level `dragleave` handling in `src/webview-template.js`
- Added a board-boundary pointer check so indicator clearing follows actual board exit instead of the old thread-based drop indicator shape
- Added a small reset helper that immediately clears the pending/scheduled drop indicator and syncs the overlay DOM
- Updated card-level `dragleave` to clear stale board preview only when the pointer has actually left the board region
- Updated board-level `dragleave` to use pointer bounds instead of `relatedTarget`, which is unreliable for drag events
- Validated the edited file with `node --check src/webview-template.js`
- Packaged the extension successfully with `npm run package`

## Failed or Deferred

- `T / S / M / L` density semantics are still not normalized in this slice
- No browser-driven interaction test was added; validation remained syntax plus package-build level

## Decisions

- Kept this pass focused on stale indicator clearing rather than changing drag placement math
- Treated pointer-in-board detection as the minimal reliable signal for nested dragleave handling

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 2. Do one minimal slice only: normalize one concrete `T / S / M / L` density rule in the board cards so one size tier clearly hides or reveals a specific information block, then validate packaging, sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`, update the active plan, and append a new evolution note.
```
