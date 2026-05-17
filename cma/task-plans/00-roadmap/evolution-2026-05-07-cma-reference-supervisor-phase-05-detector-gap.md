# CMA reference roadmap supervisor note - Phase 5 detector gap

Date: 2026-05-07
Role: GPT-5.5 supervisor

## Current state

- Phase 1, Phase 2, Phase 8, Phase 3, and Phase 4 are completed.
- Phase 5 is in progress.
- Phase 5 task `01-rate-limit-detector` is marked `done`.
- Phase 5 task `02-retry-state` is still `todo`.
- A fresh Spark worker thread was recovered after the earlier context-window exhaustion, and the latest worker status is idle after completing the detector slice.

## Supervisor review

The worker's Phase 5 detector slice is directionally correct, and the touched `src/host/account-manager.js` file passes syntax checks. JSON parsing for the roadmap subtask files also passes.

However, a targeted detector smoke check exposed a coverage gap:

- `detectRateLimitSignal('HTTP 429: rate limit exceeded, retry after 60 seconds')` returns a rate-limit signal.
- `detectRateLimitSignal('You have reached your usage limit. Upgrade your plan.')` returns `null`.

That second phrase is a common quota/plan-limit shape and should be covered before Phase 5 proceeds into retry-state behavior. This is not a syntax or JSON blocker, so the supervisor did not make a product-code patch.

## Routing instruction for next Spark tick

Before starting Phase 5 task `02-retry-state`, revisit `01-rate-limit-detector` and harden the detector with focused tests/smokes for:

- HTTP 429 variants.
- `retry-after` / retry later wording.
- quota exceeded wording.
- usage limit wording.
- upgrade plan / purchase / billing phrasing.
- explicit non-matches so ordinary errors are not misclassified.

Keep token invalidation detection separate from rate-limit/quota detection. Do not broaden this into token-invalid routing yet.

## Supervisor actions

- Removed a stale Spark `tick.lock` after confirming the worker status was idle and no Spark child process was active.
- No `.codex/auth.json` read or write was performed.
- No product implementation was changed by the supervisor.
- No stop flag was written because subtasks remain incomplete.
