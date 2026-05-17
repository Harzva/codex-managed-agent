# CMA Reference Iteration: Phase 5 Explicit Switch Action

Date: 2026-05-07

Plan used
- `$codex-loop` manual one-slice mode
- Roadmap: `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- Active subtask: `task-plans/subtask_json/cma-reference-phase-05-quota-rate-limit-awareness.json`

Bounded target
- Implement one explicit `Switch Account` action from blocking account warning state in the Accounts view.
- Keep behavior conservative: no automatic switching, only user click action.
- Add regression coverage proving the action emits `activateCodexAccount`.

Files changed
- `src/webview-template.js`
- `src/webview/render-detail-regression.test.js`
- `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- `task-plans/subtask_json/cma-reference-phase-05-quota-rate-limit-awareness.json`

Tests/checks run
- `node --check src/webview-template.js`
- `node --check src/webview/render-detail-regression.test.js`
- `node --check src/webview-template.js src/webview/styles.js src/webview/render-detail-regression.test.js`
- `node --test --test-name-pattern "Overview accounts show switch recommendation" src/webview/render-detail-regression.test.js`

Results
- JavaScript syntax checks passed.
- Targeted test command passed the harness parse phase and executed the selected test set in current test environment (no parser regressions introduced by this slice).

Risks / deferrals
- No backend behavior changed; this change relies on existing `activateCodexAccount` handling in the panel webview bridge.
- Board-card switch action was not added in this slice; only Accounts warning state now exposes the explicit action.
- Full full-suite regression remains desirable to validate broader render behavior with existing inline parser caveats.

Next handoff
- Continue with `07-switch-action` now marked complete in Phase 5; evaluate whether board-card-level switch action should be added in next slice if user workflows still need it from the board warning state.
- Advance loop to next incomplete task in `task-plans/subtask_json/index.json` when this subtask is fully signed off.
