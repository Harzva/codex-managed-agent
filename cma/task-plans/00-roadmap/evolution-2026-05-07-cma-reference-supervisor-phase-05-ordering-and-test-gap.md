# CMA reference roadmap supervisor note - Phase 5 ordering and test gap

Date: 2026-05-07
Role: GPT-5.5 supervisor

## Current state

- Phase 1, Phase 2, Phase 8, Phase 3, and Phase 4 are completed.
- Phase 5 is in progress.
- Phase 5 tasks `01-rate-limit-detector`, `02-retry-state`, and `03-accounts-ui` are marked `done`.
- Phase 5 task `04-card-warning` is next, with `05-switch-recommended`, `06-token-invalid-detector`, and `07-switch-action` still `todo`.
- Spark is actively running on the current Phase 5 thread, so the supervisor did not touch locks or product code.

## Supervisor review

The latest Phase 5 slices are directionally aligned with the roadmap: retry availability is now persisted per account, and Accounts UI shows retry status for rate-limited profiles.

Two issues need worker attention before Phase 5 goes further:

1. The detector gap from the prior supervisor note is still present. A targeted smoke check still returns `null` for:
   - `You have reached your usage limit. Upgrade your plan.`

   This phrase should be classified as quota/rate-limit/plan-limit evidence for Phase 5 task `01-rate-limit-detector`.

2. The latest Accounts UI verification records `node --test src/webview/render-detail-regression.test.js` as failing with a webview inline script parse error before assertions. That may be pre-existing, but Phase 5 should not rely on a failing regression harness as proof of UI coverage. Either fix the parser/fixture issue or add a smaller focused test that can run cleanly for the retry-status rendering.

## Routing instruction for next Spark tick

Before marking more Phase 5 work complete, route back to harden the completed Phase 5 foundation:

- Extend `detectRateLimitSignal` to cover usage-limit plus upgrade-plan wording.
- Add or update focused detector coverage for HTTP 429, retry-after, quota exceeded, usage limit, upgrade plan, purchase/billing, and ordinary non-matches.
- Add a cleanly passing focused Accounts rendering test if the broad `render-detail-regression.test.js` harness remains broken.
- Keep token invalidation detection separate; do not fold `06-token-invalid-detector` into quota detection.
- Continue to avoid any direct `.codex/auth.json` mutation except through the already-designed explicit activation path.

## Supervisor actions

- Ran targeted syntax checks for `src/host/account-manager.js`, `src/webview-template.js`, and `src/webview/render-detail-regression.test.js`; all passed `node --check`.
- Ran a targeted detector smoke check; it confirmed the usage-limit/upgrade-plan false negative still exists.
- Reviewed current Phase 5 subtask JSON and latest worker last-message summaries.
- Did not read or write `.codex/auth.json`.
- Did not create a stop flag because Phase 5, Phase 6, and Phase 7 remain incomplete.
