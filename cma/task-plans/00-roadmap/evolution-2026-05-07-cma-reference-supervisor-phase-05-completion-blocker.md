# CMA reference roadmap supervisor note - Phase 5 completion blocker

Date: 2026-05-07
Role: GPT-5.5 supervisor

## Current state

- Phase 1, Phase 2, Phase 8, Phase 3, and Phase 4 are completed.
- Phase 5 has all listed tasks marked `done`, but the phase itself remains `in_progress`.
- Phase 6 is still `in_progress` with `01-profile-selector` complete and `02-preflight` pending/running in the worker thread.
- Phase 7 remains planned.
- Spark is currently running on the active worker thread.

## Supervisor review

The worker followed the previous ordering note in part by returning to Phase 5 and completing the remaining listed tasks:

- `05-switch-recommended`
- `06-token-invalid-detector`
- `07-switch-action`

The latest Phase 5 switch action note reports a targeted passing webview test for `Overview accounts show switch recommendation`, which reduces the earlier concern about relying only on the broad failing webview harness.

However, Phase 5 should not be marked `completed` yet because one acceptance-level detector gap still reproduces:

- `detectRateLimitSignal('You have reached your usage limit. Upgrade your plan.')` returns `null`.

That wording is directly within the Phase 5 task scope: "common Codex quota, upgrade, purchase, retry, and rate-limit messages." Leaving it unmatched weakens the quota/switch recommendation chain, because the UI and retry state depend on structured rate-limit/quota evidence.

## Routing instruction for next Spark tick

Before marking Phase 5 completed or continuing Phase 6 preflight:

1. Add focused coverage for `You have reached your usage limit. Upgrade your plan.`.
2. Patch `detectRateLimitSignal` so usage-limit plus upgrade-plan phrasing maps to quota/rate-limit evidence.
3. Re-run the focused detector smoke with both positive and negative cases.
4. Only then mark Phase 5 `status` as `completed`.
5. Resume Phase 6 `02-preflight` after Phase 5 is genuinely completed.

Keep token invalidation separate from quota detection. The invalid-token helper can remain separate; do not solve this by routing usage-limit wording through invalid-token state.

## Supervisor actions

- Reviewed roadmap, subtask index/statuses, latest root evolution notes, latest roadmap supervisor notes, worker status, and worker log tail.
- Ran targeted syntax checks for Phase 5 touched files; `node --check` passed.
- Ran targeted detector smoke; the usage-limit/upgrade-plan false negative still reproduces.
- Did not mark Phase 5 completed because acceptance is not satisfied.
- Did not read or write `.codex/auth.json`.
- Did not create a stop flag because Phase 5, Phase 6, and Phase 7 are not all completed.
