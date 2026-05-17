# CMA reference roadmap supervisor note - Phase 6 ordering hold

Date: 2026-05-07
Role: GPT-5.5 supervisor

## Current state

- Phase 1, Phase 2, Phase 8, Phase 3, and Phase 4 are completed.
- Phase 5 is still `in_progress`.
- Phase 5 tasks `01-rate-limit-detector`, `02-retry-state`, `03-accounts-ui`, and `04-card-warning` are marked `done`.
- Phase 5 tasks `05-switch-recommended`, `06-token-invalid-detector`, and `07-switch-action` remain `todo`.
- Phase 6 is now `in_progress` with `01-profile-selector` marked `done`, even though Phase 6 depends on Phase 5.
- Spark finished during this supervisor pass; the supervisor removed a stale Spark `tick.lock` after confirming no Spark `codex exec` child was active.

## Supervisor review

The Phase 5 card-warning slice is aligned with the roadmap at a high level: board cards now have a quota/rate-limit warning path. The Phase 6 profile-selector slice also appears useful, and its focused Team coordination test passed after the worker corrected the launch payload contract.

However, there is now task-ordering drift:

- Phase 6 started before Phase 5 completed.
- Phase 6 `02-preflight` should not proceed while Phase 5 still lacks switch recommendation, token-invalid detection, and explicit Switch Account action.
- The prior detector gap still exists: `detectRateLimitSignal('You have reached your usage limit. Upgrade your plan.')` returns no match.
- The webview regression harness issue remains unresolved, so broad UI coverage for Phase 5 card/account rendering is still weak.

The supervisor treats this as routing drift, not a product-code blocker. No corrective product patch was made.

## Routing instruction for next Spark tick

After the current Spark tick settles, hold Phase 6 and return to Phase 5 until it is complete:

1. Patch `detectRateLimitSignal` and focused coverage so usage-limit plus upgrade-plan wording is classified as quota/rate-limit evidence.
2. Finish Phase 5 task `05-switch-recommended`: recommend a valid profile without auto-switching.
3. Finish Phase 5 task `06-token-invalid-detector`: keep invalid-token detection separate from quota/rate-limit state.
4. Finish Phase 5 task `07-switch-action`: expose explicit Switch Account action from blocking states with exact target profile.
5. Only resume Phase 6 `02-preflight` after Phase 5 is marked completed and its acceptance criteria are satisfied.

Keep future webview edits narrow. The current `src/webview-template.js` diff is already large in the dirty worktree, so additional Phase 5 UI work should prefer focused helper-level changes and focused tests over broader template churn.

## Supervisor actions

- Reviewed latest roadmap checklist, Phase 5 and Phase 6 subtask JSON statuses, root and roadmap evolution notes, and worker log tail.
- Ran targeted detector smoke; the usage-limit/upgrade-plan false negative still reproduces.
- Ran targeted syntax checks for touched Phase 5 files; `node --check` passed.
- Confirmed the Phase 6 focused Team coordination test passed in the worker log.
- Removed a stale Spark `tick.lock` after the worker status turned idle and no Spark child process was active.
- Did not read or write `.codex/auth.json`.
- Did not create a stop flag because Phase 5, Phase 6, and Phase 7 remain incomplete.
