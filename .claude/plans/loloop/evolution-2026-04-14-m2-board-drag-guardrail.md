# Evolution Note — Milestone 2 Board Drag Guardrail

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 2 — Board Interaction Quality`
- bounded target: add one board interaction guardrail that reduces accidental layout edits without weakening the main board workflow

## Completed

- Audited board-card dragstart handling in `src/webview-template.js`
- Added a dragstart guardrail that cancels board dragging when the gesture begins on a button, input, select, textarea, or resize handle inside the card
- Kept regular board dragging intact when the gesture starts on the card body itself
- Validated the edited file with `node --check src/webview-template.js`
- Packaged the extension successfully with `npm run package`

## Failed or Deferred

- No drag-threshold or pointer-smoothing change was added in this slice
- No browser-driven interaction test was added; validation remained syntax plus package-build level

## Decisions

- Put the guardrail at dragstart time so existing layout mechanics remain unchanged once a real drag begins
- Chose interactive child controls as the smallest high-value place to prevent accidental layout edits

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 2. Do one minimal slice only: make one drag smoothness micro-polish improvement without changing board semantics or adding new surfaces, then validate packaging, sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`, update the active plan, and append a new evolution note.
```
