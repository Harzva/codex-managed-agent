# Evolution Note — Milestone 2 Needs Human Compact Header

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 2 — Board Interaction Quality`
- bounded target: make compact `Needs Human` cards keep the title and `Codex` action visible without expanding scope beyond Task 4 compactness

## Completed

- Re-anchored the loop from closed Milestone 5 work back to Milestone 2 because `ROADMAP.md` still points to board interaction as the immediate focus
- Updated compact `Needs Human` cards so the title moves into a dedicated header area instead of remaining buried in the card body
- Forced the compact header `Codex` button label to stay visible, which keeps the jump-to-thread action usable in tiny compact cards
- Kept the duplicate body title hidden so the compact layout spends its space on readable title plus direct action instead of repeating content
- Validated the slice with `node --check src/webview-template.js` and `npm run package`

## Failed or Deferred

- No broader redesign of compact `Needs Human` controls was added in this slice
- No browser-driven UI test was added; validation remained syntax plus package-build level
- Deferred deciding whether Task 4 is fully closed until one explicit exit review pass

## Decisions

- Treat this as a Task 4 readability fix, not a new surface or a general board-card redesign
- Put title and `Codex` action in the compact header because that is the minimum change that restores both scanability and direct thread access

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on the current slice only: do one Task 4 exit review for `Needs Human` compactness after the compact-card header/action visibility fix, then update the active plan, append a new evolution note, and sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`.
```
