# Evolution Note — Cross-Path Thread Row Root Label

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 3 — Insight and Guidance Layer (complete)`
- bounded target: add a compact root-identity label to thread rows so cross-path origin is visible without relying on the full `cwd` string

## Completed

- Added `compactRootIdentity()` and `renderRootIdentityPill()` so thread rows can derive a compact project/root label from the current `cwd`
- Replaced the raw full-path `cwd` pill in thread rows with a compact `Root <name>` label while keeping the full path in the hover title
- Kept the slice bounded to thread-row visibility only, without introducing path-aware filtering or cross-path board changes
- Validated the edited file with `node --check src/webview-template.js` and `npm run package`
- Narrowed the next slice to a Task 1 review for whether one more surface needs the same root identity

## Failed or Deferred

- No cross-path filtering or grouping logic was added in this slice
- No browser-driven UI test was added; validation remained syntax plus package-build level
- Deferred deciding on second-surface parity until one explicit review pass

## Decisions

- Start path identity with thread rows because they are the main scan surface for multi-root management
- Keep the full `cwd` as a hover detail so the UI gains compact identity without losing exact path access

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on the cross-path unified management track and do one Task 1 review to decide whether compact root identity also needs to appear in one more surface after thread-row visibility, then update the active plan, append a new evolution note, validate packaging if code changed, and sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`.
```
