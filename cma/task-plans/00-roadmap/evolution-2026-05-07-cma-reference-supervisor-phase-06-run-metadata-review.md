# CMA reference roadmap supervisor note - Phase 6 run metadata review

Date: 2026-05-07
Role: GPT-5.5 supervisor

## Current state

- Phase 5 is now completed, and the previously disputed usage-limit detector gap is fixed.
- Phase 6 is in progress with `01-profile-selector`, `02-preflight`, and `03-run-metadata` marked `done`.
- Phase 6 still has `04-recovery-guard` and `05-trace-evidence` as `todo`.
- Phase 7 remains planned.
- Spark recovered from the prior Spark quota issue by running the worker loop with `gpt-5.4`; the current worker tick is active with a legitimate lock.

## Supervisor review

Targeted detector smoke now passes for the previously failing phrase:

- `detectRateLimitSignal('You have reached your usage limit. Upgrade your plan.')` now returns `quota_quota_exhausted`.
- Ordinary non-matches still return `null`.
- Invalid token detection remains separate from quota/rate-limit detection.

The Phase 6 `03-run-metadata` slice is directionally aligned with the roadmap. Runtime metadata now carries account profile id, auth source path, token health, and a `session_binding` object through DAG worker runtime and Team task launched-worker records.

The main routing risk is diff size and scope. The current dirty diff around `src/host/team-coordination.js` and `src/host/team-coordination.test.js` is already large, so the remaining Phase 6 slices should avoid broad refactors.

## Routing instruction for next Spark tick

Continue Phase 6 in order, but keep the next slice tightly bounded:

1. Implement `04-recovery-guard` only.
2. Enforce recovery against the stored `session_binding` and bound session id.
3. Do not infer recovery from newest session when a binding exists.
4. Add focused regression tests for:
   - recovery succeeds only for the bound session id.
   - mismatched/newest session is rejected or blocked with a clear reason.
   - missing binding falls back only to the existing safe behavior expected by current tests.
5. Defer trace event additions to `05-trace-evidence`.

Do not touch `.codex/auth.json`, and do not add account switching behavior in Phase 6 recovery.

## Supervisor actions

- Reviewed roadmap, subtask JSON statuses, latest evolution notes, worker status, and latest worker last-message summary.
- Re-ran targeted detector smoke for quota, usage-limit, billing, ordinary non-match, and invalid-token cases.
- Ran syntax checks for recent Phase 5/6 files; `node --check` passed.
- Did not read or write `.codex/auth.json`.
- Did not remove the current Spark lock because an active worker `codex exec` process is running.
- Did not create a stop flag because Phase 6 and Phase 7 remain incomplete.
