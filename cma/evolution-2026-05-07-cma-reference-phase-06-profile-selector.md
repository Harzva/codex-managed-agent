# Evolution Note — 2026-05-07

- Phase: `cma-reference-phase-06-team-worker-account-profiles`
- Slice: `01-profile-selector`
- Scope: Allow Team orchestration workers to carry `account_profile_id` from draft into worker launch metadata.

## Plan used

- Preserve `account_profile_id` in worker draft normalization (`src/host/moa-core.js`).
- Forward the field into launch scheduling and persisted worker runtime metadata.
- Add regression test that verifies launch payload and runtime carry the bound account profile id.

## Bounded target

- One slice only: `01-profile-selector` on Phase 6.
- No UI rendering changes, no new preflight or recovery logic.

## Files changed

- `src/host/moa-core.js`
- `src/host/team-coordination.js`
- `src/host/team-coordination.test.js`
- `task-plans/subtask_json/cma-reference-phase-06-team-worker-account-profiles.json`
- `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`

## Checks run

- `node --check src/host/moa-core.js`
- `node --check src/host/team-coordination.js`
- `node --test src/host/team-coordination.test.js --test-name-pattern "persists account profile id on launched Team workers for draft-bound workers"`

## Risks / deferrals

- Did not add orchestration-level UI controls for selecting `account_profile_id`; slice currently relies on draft-provided values.
- Did not add recovery/preflight/trace-evidence tasks yet (remaining Phase 6 subtasks).
- Existing parser-level harness issue in `src/webview/render-detail-regression.test.js` is unrelated and remained unchanged.

## Next handoff

- Continue with `cma-reference-phase-06-team-worker-account-profiles` task `02-preflight` once a guarded profile validation path exists.
