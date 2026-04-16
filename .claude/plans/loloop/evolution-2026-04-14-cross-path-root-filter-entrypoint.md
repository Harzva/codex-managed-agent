# Evolution Note — Cross-Path Root Filter Entrypoint

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 3 — Insight and Guidance Layer (complete)`
- bounded target: make the existing thread-row root-identity pill drive a dedicated root-filter state that remains compatible with topic focus and pins

## Completed

- Added persisted `rootFilter` state to the webview UI model
- Updated thread matching so root filtering composes with the existing query, topic focus, status filter, and pin-only filter instead of replacing them
- Turned the thread-row `Root <name>` pill into an interactive button that toggles the dedicated root filter and reflects active state
- Kept the slice bounded to one root-filter entry point without redesigning the toolbar or cross-path board actions
- Validated the edited file with `node --check src/webview-template.js` and `npm run package`
- Narrowed the next slice to a Task 2 review for whether one explicit clear/reset affordance is needed

## Failed or Deferred

- No toolbar-level path filter UI was added in this slice
- No browser-driven UI test was added; validation remained syntax plus package-build level
- Deferred broader cross-path filtering design until after reviewing the entry-point ergonomics

## Decisions

- Start Task 2 with a click-through root filter because it reuses the new path identity surface and keeps the filtering model small
- Use toggle behavior on the same root pill first, and review later whether an explicit clear/reset control is also necessary

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on the cross-path unified management track and do one Task 2 review to decide whether the new root-filter entry point needs one explicit clear/reset affordance before broader cross-path filtering work, then update the active plan, append a new evolution note, validate packaging if code changed, and sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`.
```
