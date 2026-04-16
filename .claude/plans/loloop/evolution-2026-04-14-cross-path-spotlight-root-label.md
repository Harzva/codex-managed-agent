# Evolution Note — Cross-Path Spotlight Root Label

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 3 — Insight and Guidance Layer (complete)`
- bounded target: add the same compact root-identity label to the spotlight surface after thread-row visibility

## Completed

- Reused `renderRootIdentityPill()` in the spotlight surface so the selected-thread inspector now shows the same compact root identity as thread rows
- Kept the full path in the spotlight copy while adding a scan-friendly root label above it
- Kept the slice bounded to one second-surface parity fix without introducing cross-path filtering or grouping logic
- Validated the edited file with `node --check src/webview-template.js` and `npm run package`
- Narrowed the next slice to a Task 1 review for whether path-origin visibility is now sufficient to move into filtering work

## Failed or Deferred

- No cross-path filtering or grouping logic was added in this slice
- No browser-driven UI test was added; validation remained syntax plus package-build level
- Deferred deciding on any third-surface parity until one explicit review pass

## Decisions

- Use the spotlight as the second path-identity surface because it is the next most important inspection surface after thread rows
- Stop at second-surface parity for now and use the next slice to decide whether Task 1 is sufficiently advanced

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on the cross-path unified management track and do one Task 1 review to decide whether path-origin visibility is now sufficient to move from path labeling into cross-path filtering, then update the active plan, append a new evolution note, validate packaging if code changed, and sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`.
```
