# Evolution Note: 2026-05-07 (CMA Phase 6)

## Plan used
- `codex-loop`
- CMA roadmap phase iteration (Phase 6: Team Worker Account Profiles)
- Active subtask JSON: `task-plans/subtask_json/cma-reference-phase-06-team-worker-account-profiles.json`

## Bounded target
- Fix one regression-scope gap in Phase 6 profile propagation: ensure `account_profile_id` is present in the scheduler launch payload at top-level (`payload.account_profile_id`) as well as existing nested locations, so launch interceptors and runtime metadata capture remain deterministic.

## Files changed
- `src/host/moa-core.js`
- `task-plans/subtask_json/cma-reference-phase-06-team-worker-account-profiles.json`
- `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`

## Tests / checks run
- `node --test src/host/team-coordination.test.js --test-name-pattern "persists account profile id on launched Team workers for draft-bound workers"`
- `node --check src/host/moa-core.js`
- `node --check src/host/team-coordination.js`

## Risks / deferrals
- The existing 01-profile-selector task is fixed but the remaining Phase 6 tasks (`02-preflight`, `03-run-metadata`, `04-recovery-guard`, `05-trace-evidence`) are still TODO and remain for the next slice.
- No UI behavior changes were included in this slice.

## Next handoff
- Continue with Phase 6 in `task-plans/subtask_json/cma-reference-phase-06-team-worker-account-profiles.json`, targeting task `02-preflight`.
