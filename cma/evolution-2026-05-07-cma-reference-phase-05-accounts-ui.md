# Evolution Note: `cma-reference-phase-05-accounts-ui`

Date: 2026-05-07

Plan used:
- `$codex-loop` manual iteration loop anchored to `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- Bounded slice: `03-accounts-ui` in `task-plans/subtask_json/cma-reference-phase-05-quota-rate-limit-awareness.json`
- Scope constrained to Accounts UI rendering and webview regression coverage

Bounded target:
- Make rate-limit state in Accounts list more explicit and user-visible by showing retry timing text from `retryAvailabilityByAccount` for each rate-limited profile.
- Preserve existing rate-limited badge behavior and add a targeted regression test.

Files changed:
- `src/webview-template.js`
- `src/webview/render-detail-regression.test.js`
- `task-plans/subtask_json/cma-reference-phase-05-quota-rate-limit-awareness.json`
- `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`

Tests or checks run:
- `node --check src/webview-template.js`
- `node --check src/webview/render-detail-regression.test.js`
- `node --test src/webview/render-detail-regression.test.js` *(fails with existing webview inline-script parser error in the harness; not introduced by this slice)*

Risks or deferrals:
- `Retry in` formatting relies on `availableAt`/`displayText` from backend and can still be ambiguous when backend-provided windows use uncommon units.
- Phase 5 card-level blockers (`04-card-warning`) and explicit switch recommendations (`05-switch-recommended`) remain untouched by this slice.
- No behavior change was made to token-invalid detection or auto-switch flow in this pass.

Next handoff:
- Continue with `cma-reference-phase-05-quota-rate-limit-awareness` task `04-card-warning`.
- Add blocking warning state on relevant cards when bound work is rate-limited.
